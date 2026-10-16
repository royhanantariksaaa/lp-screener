import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(root, "src", "data", "kol-wallets.json");
const statePath = path.join(root, "api", "evm-wallet-scan-state.json");
const snapshotPath = path.join(root, "api", "evm-wallet-clusters.json");
const requestInterval = Math.max(250, Number(process.env.EVM_INDEXER_MIN_INTERVAL_MS ?? 750));
const pageLimit = Math.max(10, Math.min(100, Number(process.env.EVM_INDEXER_PAGE_SIZE ?? 50)));
const maxTasks = Number(process.env.EVM_INDEXER_MAX ?? process.argv.find((arg) => arg.startsWith("--max="))?.split("=")[1] ?? 0);
const reset = process.argv.includes("--reset");
const chainConfigs = {
  ethereum: { label: "Ethereum", base: "https://eth.blockscout.com/api/v2" },
  base: { label: "Base", base: "https://base.blockscout.com/api/v2" },
  robinhood: { label: "Robinhood Chain", base: "https://robinhoodchain.blockscout.com/api/v2" },
  bnb: { label: "BNB Chain", unavailable: "Public BNB mainnet history needs a BscScan/BSCTrace indexer key." },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nextRequestAt = 0;
async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rm(file, { force: true });
  await fs.rename(temporary, file);
}
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; } }

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const wait = nextRequestAt - Date.now();
    if (wait > 0) await sleep(wait);
    nextRequestAt = Date.now() + requestInterval;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`indexer ${response.status}`);
      return payload;
    } catch (error) {
      lastError = error;
      await sleep(Math.min(15_000, 500 * (2 ** attempt)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("EVM indexer unavailable");
}

async function fetchPages(base, pathName, maxPages = 2) {
  const items = [];
  let url = `${base}${pathName}?items_count=${pageLimit}`;
  for (let page = 0; page < maxPages && url; page += 1) {
    const payload = await fetchJson(url);
    if (Array.isArray(payload.items)) items.push(...payload.items);
    const next = payload.next_page_params;
    url = next ? `${base}${pathName}?${new URLSearchParams({ ...next, items_count: String(pageLimit) }).toString()}` : "";
  }
  return items;
}

async function fetchLegacy(base, address, action) {
  const origin = base.replace(/\/api\/v2$/, "");
  const url = `${origin}/api?module=account&action=${action}&address=${encodeURIComponent(address)}&page=1&offset=${pageLimit}&sort=desc`;
  const payload = await fetchJson(url);
  return Array.isArray(payload.result) ? payload.result : [];
}

function addressOf(value) { return typeof value === "string" ? value : String(value?.hash ?? value?.address_hash ?? ""); }
function isEvmAddress(value) { return /^0x[0-9a-fA-F]{40}$/.test(String(value ?? "")); }
function collectTasks(dataset) {
  const tasks = new Map();
  for (const profile of dataset.records ?? []) {
    for (const wallet of profile.wallets ?? []) {
      if (!isEvmAddress(wallet.address)) continue;
      for (const chain of wallet.chains ?? []) {
        if (!chainConfigs[chain]) continue;
        const key = `${chain}:${wallet.address.toLowerCase()}`;
        const task = tasks.get(key) ?? { key, chain, address: wallet.address, profiles: [] };
        if (!task.profiles.some((item) => item.handle === profile.handle)) task.profiles.push({ handle: profile.handle, name: profile.name, confidence: wallet.confidence });
        tasks.set(key, task);
      }
    }
  }
  return [...tasks.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function parseIndexedRows(task, transactions, transfers) {
  const candidates = new Map();
  const add = (wallet, evidence, hash, timestamp, direction, token) => {
    if (!isEvmAddress(wallet) || wallet.toLowerCase() === task.address.toLowerCase()) return;
    const key = wallet.toLowerCase();
    const row = candidates.get(key) ?? { address: wallet, hits: 0, signatures: new Set(), evidence: new Set(), directions: new Set(), tokens: new Set(), lastSeen: timestamp };
    row.hits += 1;
    if (hash) row.signatures.add(hash);
    if (evidence) row.evidence.add(evidence);
    if (direction) row.directions.add(direction);
    if (token) row.tokens.add(token);
    if (timestamp) row.lastSeen = String(timestamp) > String(row.lastSeen ?? "") ? timestamp : row.lastSeen;
    candidates.set(key, row);
  };
  for (const tx of transactions) {
    const from = addressOf(tx.from);
    const to = addressOf(tx.to);
    const hash = tx.hash ?? tx.transaction_hash;
    const timestamp = tx.timestamp;
    if (from.toLowerCase() === task.address.toLowerCase()) add(to, "native transaction", hash, timestamp, "outbound");
    if (to.toLowerCase() === task.address.toLowerCase()) add(from, "native transaction", hash, timestamp, "inbound");
  }
  for (const transfer of transfers) {
    const from = addressOf(transfer.from);
    const to = addressOf(transfer.to);
    const hash = transfer.transaction_hash ?? transfer.transaction_hashes?.[0];
    const token = transfer.token?.symbol ?? transfer.token?.name ?? transfer.token?.address_hash;
    const timestamp = transfer.timestamp;
    if (from.toLowerCase() === task.address.toLowerCase()) add(to, "indexed token transfer", hash, timestamp, "outbound", token);
    if (to.toLowerCase() === task.address.toLowerCase()) add(from, "indexed token transfer", hash, timestamp, "inbound", token);
  }
  return [...candidates.values()].sort((a, b) => b.hits - a.hits || b.signatures.size - a.signatures.size || a.address.localeCompare(b.address)).slice(0, 50).map((row) => ({
    address: row.address,
    hits: row.hits,
    signatures: row.signatures.size,
    evidence: [...row.evidence],
    directions: [...row.directions],
    tokens: [...row.tokens].slice(0, 8),
    confidence: row.hits >= 3 ? "REPEATED" : row.hits >= 2 ? "OBSERVED" : "SINGLE",
    lastSeen: row.lastSeen,
  }));
}

async function scanTask(task) {
  const config = chainConfigs[task.chain];
  if (config.unavailable) return { ...task, status: "KEY_REQUIRED", source: config.unavailable, relatedWallets: [], scannedTransactions: 0, scannedTransfers: 0, scannedAt: new Date().toISOString() };
  const encoded = encodeURIComponent(task.address);
  try {
    const [transactions, transfers] = await Promise.all([
      fetchPages(config.base, `/addresses/${encoded}/transactions`),
      fetchPages(config.base, `/addresses/${encoded}/token-transfers`),
    ]);
    return { ...task, status: "LIVE", source: `${config.label} Blockscout index`, scannedTransactions: transactions.length, scannedTransfers: transfers.length, relatedWallets: parseIndexedRows(task, transactions, transfers), scannedAt: new Date().toISOString() };
  } catch (restError) {
    const [transactions, transfers] = await Promise.all([
      fetchLegacy(config.base, task.address, "txlist"),
      fetchLegacy(config.base, task.address, "tokentx"),
    ]);
    return { ...task, status: "LIVE", source: `${config.label} Blockscout indexed API`, scannedTransactions: transactions.length, scannedTransfers: transfers.length, relatedWallets: parseIndexedRows(task, transactions, transfers), fallback: String(restError), scannedAt: new Date().toISOString() };
  }
}

async function main() {
  const dataset = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const allTasks = collectTasks(dataset);
  const tasks = maxTasks > 0 ? allTasks.slice(0, maxTasks) : allTasks;
  const blank = { schemaVersion: 1, source: "Blockscout indexed EVM history", startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nextIndex: 0, tasksTotal: tasks.length, records: [] };
  const state = reset ? blank : await readJson(statePath, blank);
  const records = new Map((state.records ?? []).map((record) => [record.key, record]));
  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    if (records.get(task.key)?.status === "LIVE" || records.get(task.key)?.status === "KEY_REQUIRED") continue;
    try {
      records.set(task.key, await scanTask(task));
      console.log(`[${index + 1}/${tasks.length}] ${task.chain} ${task.address} · ${records.get(task.key).relatedWallets.length} links`);
    } catch (error) {
      records.set(task.key, { ...task, status: "ERROR", source: "Blockscout index unavailable", error: String(error), relatedWallets: [], scannedAt: new Date().toISOString() });
      console.warn(`[${index + 1}/${tasks.length}] ${task.chain} ${task.address} · ${String(error)}`);
    }
    const recordList = [...records.values()].sort((a, b) => a.key.localeCompare(b.key));
    const now = new Date().toISOString();
    await writeJsonAtomic(statePath, { ...state, updatedAt: now, nextIndex: index + 1, tasksTotal: tasks.length, records: recordList });
    await writeJsonAtomic(snapshotPath, { schemaVersion: 1, source: "Blockscout indexed EVM history", capturedAt: now, tasksTotal: tasks.length, tasksScanned: recordList.filter((record) => ["LIVE", "KEY_REQUIRED"].includes(record.status)).length, tasksWithErrors: recordList.filter((record) => record.status === "ERROR").length, records: recordList });
  }
  console.log(`Completed ${records.size}/${tasks.length} indexed EVM tasks.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
