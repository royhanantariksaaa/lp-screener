import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(root, "src", "data", "kol-wallets.json");
const statePath = path.join(root, "api", "solana-wallet-scan-state.json");
const snapshotPath = path.join(root, "api", "solana-wallet-clusters.json");
const endpoints = [process.env.SOLANA_RPC_URL, "https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"].filter(Boolean);
const signatureLimit = Math.max(1, Math.min(100, Number(process.env.SOLANA_SCAN_SIGNATURES ?? process.argv.find((arg) => arg.startsWith("--signatures="))?.split("=")[1] ?? 12)));
const rpcMinInterval = Math.max(100, Number(process.env.SOLANA_RPC_MIN_INTERVAL_MS ?? 250));
const walletConcurrency = Math.max(1, Math.min(6, Number(process.env.SOLANA_SCAN_CONCURRENCY ?? 4)));
const maxWallets = Number(process.env.SOLANA_SCAN_MAX ?? process.argv.find((arg) => arg.startsWith("--max="))?.split("=")[1] ?? 0);
const reset = process.argv.includes("--reset");

const isSolanaAddress = (value) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value ?? ""));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nextRequestAt = 0;

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rm(file, { force: true });
  await fs.rename(temporary, file);
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; }
}

async function rpc(method, params) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const wait = nextRequestAt - Date.now();
    if (wait > 0) await sleep(wait);
    nextRequestAt = Date.now() + rpcMinInterval;
    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.error) throw new Error(String(payload?.error?.message ?? `rpc ${response.status}`));
        return payload.result;
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }
    await sleep(Math.min(15_000, 500 * (2 ** attempt)));
  }
  throw lastError ?? new Error("solana rpc unavailable");
}

async function mapLimit(items, limit, worker) {
  const output = [];
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const value = await worker(items[index], index);
      if (value !== undefined) output.push(value);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

function collectWallets(dataset) {
  const byAddress = new Map();
  for (const profile of dataset.records ?? []) {
    for (const wallet of profile.wallets ?? []) {
      if (!wallet.chains?.includes("solana") || !isSolanaAddress(wallet.address)) continue;
      const row = byAddress.get(wallet.address) ?? { address: wallet.address, profiles: [] };
      if (!row.profiles.some((item) => item.handle === profile.handle)) row.profiles.push({ handle: profile.handle, name: profile.name, confidence: wallet.confidence });
      byAddress.set(wallet.address, row);
    }
  }
  return [...byAddress.values()].sort((a, b) => a.address.localeCompare(b.address));
}

function parseTransactions(address, usable, transactions) {
  const candidates = new Map();
  const addCandidate = (wallet, evidence, signature, slot, blockTime, direction, mint) => {
    if (!wallet || wallet === address || !isSolanaAddress(wallet)) return;
    const row = candidates.get(wallet) ?? { address: wallet, hits: 0, signatures: new Set(), evidence: new Set(), directions: new Set(), mints: new Set(), firstSlot: slot, lastSlot: slot, lastSeen: blockTime };
    row.hits += 1;
    if (signature) row.signatures.add(signature);
    if (evidence) row.evidence.add(evidence);
    if (direction) row.directions.add(direction);
    if (mint) row.mints.add(mint);
    if (Number.isFinite(slot)) {
      row.firstSlot = Math.min(row.firstSlot ?? slot, slot);
      row.lastSlot = Math.max(row.lastSlot ?? slot, slot);
    }
    if (Number.isFinite(blockTime)) row.lastSeen = Math.max(row.lastSeen ?? blockTime, blockTime);
    candidates.set(wallet, row);
  };
  for (const row of transactions) {
    const transaction = row.transaction;
    if (!transaction?.meta || transaction.meta.err) continue;
    const signature = row.item?.signature;
    const slot = row.item?.slot;
    const blockTime = row.item?.blockTime;
    const message = transaction.transaction?.message ?? {};
    const accountKeys = (message.accountKeys ?? []).map((key) => typeof key === "string" ? { pubkey: key, signer: false } : key).filter((key) => key?.pubkey);
    accountKeys.filter((key) => key.signer).map((key) => key.pubkey).filter((key) => key !== address).forEach((signer) => addCandidate(signer, "co-signed transaction", signature, slot, blockTime, "co-signed"));
    const tokenOwners = new Map();
    for (const balance of [...(transaction.meta.preTokenBalances ?? []), ...(transaction.meta.postTokenBalances ?? [])]) {
      const tokenAccount = accountKeys[Number(balance.accountIndex)]?.pubkey;
      if (tokenAccount && balance.owner && isSolanaAddress(balance.owner)) tokenOwners.set(tokenAccount, balance.owner);
    }
    const instructions = [...(message.instructions ?? []), ...(transaction.meta.innerInstructions ?? []).flatMap((group) => group.instructions ?? [])];
    for (const instruction of instructions) {
      const parsed = instruction?.parsed;
      const info = parsed?.info;
      if (!info || typeof info !== "object") continue;
      if (instruction.program === "system" && parsed.type === "transfer") {
        if (info.source === address && info.destination) addCandidate(info.destination, "direct SOL transfer", signature, slot, blockTime, "outbound");
        if (info.destination === address && info.source) addCandidate(info.source, "direct SOL transfer", signature, slot, blockTime, "inbound");
      } else if ((instruction.program === "spl-token" || instruction.program === "spl-token-2022") && ["transfer", "transferChecked"].includes(parsed.type)) {
        const sourceOwner = tokenOwners.get(info.source) ?? (info.authority === address ? address : undefined);
        const destinationOwner = tokenOwners.get(info.destination);
        if (sourceOwner === address && destinationOwner) addCandidate(destinationOwner, "SPL token transfer", signature, slot, blockTime, "outbound", info.mint);
        if (destinationOwner === address && sourceOwner) addCandidate(sourceOwner, "SPL token transfer", signature, slot, blockTime, "inbound", info.mint);
      }
    }
  }
  return [...candidates.values()].sort((a, b) => b.hits - a.hits || b.signatures.size - a.signatures.size || a.address.localeCompare(b.address)).slice(0, 50).map((row) => ({
    address: row.address,
    hits: row.hits,
    signatures: row.signatures.size,
    evidence: [...row.evidence],
    directions: [...row.directions],
    mints: row.mints.size,
    confidence: row.hits >= 3 ? "REPEATED" : row.hits >= 2 ? "OBSERVED" : "SINGLE",
    firstSlot: row.firstSlot,
    lastSlot: row.lastSlot,
    lastSeen: row.lastSeen,
  }));
}

async function scanWallet(wallet) {
  const signatures = await rpc("getSignaturesForAddress", [wallet.address, { limit: signatureLimit }]);
  const usable = (signatures ?? []).filter((item) => !item.err && item.signature);
  const transactions = await mapLimit(usable, 3, async (item, index) => {
    try { return { item, transaction: await rpc("getTransaction", [item.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 1 },], index + 1) }; } catch { return undefined; }
  });
  return {
    ...wallet,
    status: "LIVE",
    source: `Solana RPC · ${signatureLimit} recent signatures + transfer graph`,
    scannedSignatures: usable.length,
    scannedTransactions: transactions.length,
    relatedWallets: parseTransactions(wallet.address, usable, transactions),
    scannedAt: new Date().toISOString(),
  };
}

async function main() {
  const dataset = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const allWallets = collectWallets(dataset);
  const wallets = maxWallets > 0 ? allWallets.slice(0, maxWallets) : allWallets;
  const blank = { schemaVersion: 1, signatureLimit, source: "PublicNode Solana RPC", startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nextIndex: 0, walletsTotal: wallets.length, records: [] };
  const state = reset ? blank : await readJson(statePath, blank);
  if (!reset && state.signatureLimit !== signatureLimit) throw new Error(`Existing snapshot uses ${state.signatureLimit} signatures; rerun with --reset or use that limit.`);
  const records = new Map((state.records ?? []).map((record) => [record.address, record]));
  let completed = 0;
  for (let index = 0; index < wallets.length; index += 1) {
    const wallet = wallets[index];
    if (records.get(wallet.address)?.status === "LIVE") continue;
    try {
      records.set(wallet.address, await scanWallet(wallet));
      completed += 1;
      console.log(`[${index + 1}/${wallets.length}] ${wallet.address} · ${records.get(wallet.address).relatedWallets.length} links`);
    } catch (error) {
      records.set(wallet.address, { ...wallet, status: "ERROR", error: String(error), scannedAt: new Date().toISOString() });
      console.warn(`[${index + 1}/${wallets.length}] ${wallet.address} · ${String(error)}`);
    }
    const recordList = [...records.values()].sort((a, b) => a.address.localeCompare(b.address));
    const now = new Date().toISOString();
    await writeJsonAtomic(statePath, { ...state, updatedAt: now, nextIndex: index + 1, walletsTotal: wallets.length, records: recordList });
    await writeJsonAtomic(snapshotPath, { schemaVersion: 1, source: "PublicNode Solana RPC", signatureLimit, capturedAt: now, walletsTotal: wallets.length, walletsScanned: recordList.filter((record) => record.status === "LIVE").length, walletsWithErrors: recordList.filter((record) => record.status === "ERROR").length, records: recordList });
  }
  console.log(`Completed ${completed} new wallets; ${records.size}/${wallets.length} persisted.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
