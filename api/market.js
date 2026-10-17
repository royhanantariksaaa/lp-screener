import trackedWalletMap from "./wallet-map.json" with { type: "json" };
import solanaWalletClusters from "./solana-wallet-clusters.json" with { type: "json" };
import evmWalletClusters from "./evm-wallet-clusters.json" with { type: "json" };
import walletGraph from "./wallet-graph.json" with { type: "json" };
import { readFileSync } from "node:fs";

const GECKO_OHLCV = "https://api.geckoterminal.com/api/v2/networks/solana/pools";
const METEORA_DLMM_API = "https://dlmm.datapi.meteora.ag";
const DEXPAPRIKA_API = "https://api.dexpaprika.com";
const CODEX_API = "https://graph.codex.io/graphql";
const SOLANA_NETWORK_ID = 1399811149;
const SOLANA_RPCS = [process.env.SOLANA_RPC_URL, "https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"].filter(Boolean);
const LUNARCRUSH_API = "https://lunarcrush.com/api4";
const DEFILLAMA_API = "https://api.llama.fi";
const BIRDEYE_API = "https://public-api.birdeye.so";
const OCULA_FEED = "https://vwpzmuprmqwqwshqiyhl.supabase.co/functions/v1/codex-brewing";
const NANSEN_API = "https://api.nansen.ai/api/v1";
const KAITO_MCP = "https://bff.kaito.ai/api/mcp";
const X_API = "https://api.x.com/2";
const X_FEED_SNAPSHOT_URL = String(process.env.X_FEED_SNAPSHOT_URL ?? (process.env.VERCEL_URL && process.env.BLOB_READ_WRITE_TOKEN ? `https://${process.env.VERCEL_URL}/api/x-feed-snapshot` : "")).trim();
const X_FEED_SNAPSHOT_FILE = String(process.env.X_FEED_SNAPSHOT_FILE ?? "").trim();
const X_FEED_SNAPSHOT_TOKEN = String(process.env.X_FEED_SNAPSHOT_TOKEN ?? "").trim();
const MADEONSOL_API = "https://madeonsol.com/api/v1";
const RUGCHECK_API = "https://api.rugcheck.xyz/v1";
// MadeOnSol documents this read-only demo key for testing. Production deployments
// should set MADEONSOL_API_KEY to their own key; the demo feed is delayed and rate limited.
const MADEONSOL_DEMO_KEY = "msk_demo_try_the_solana_api_2026";

let madeOnSolFeedCache = { fetchedAt: 0, trades: [], delaySeconds: 0, asOf: undefined };
let madeOnSolFeedPromise;
const xFeedCache = new Map();
const xFeedInFlight = new Map();
const ohlcvCache = new Map();
const geckoPoolCache = new Map();
const trackedWalletIndex = new Map((Array.isArray(trackedWalletMap) ? trackedWalletMap : []).map((row) => [String(row.address ?? "").toLowerCase(), Array.isArray(row.matches) ? row.matches : []]));
const confidenceRank = (confidence) => confidence === "verified" ? 3 : confidence === "likely" ? 2 : 1;

const withTimeout = async (url, init = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// Meteora's public DLMM data API exposes native 5m candles at 30 RPS. We
// aggregate those venue-native bars into the 15m shape used by the screener.
// The API limits a single time range, so fetch adjacent windows and merge by
// bucket before returning the latest requested candles.
const meteoraOhlcv = async (pool, limit) => {
  const end = Math.floor(Date.now() / 1000 / 300) * 300;
  const targetSeconds = Math.max(4 * 60 * 60, limit * 15 * 60 + 15 * 60);
  const windowSeconds = 4 * 60 * 60;
  const windows = [];
  let cursor = end;
  const startTarget = end - targetSeconds;
  while (cursor > startTarget) {
    const start = Math.max(startTarget, cursor - windowSeconds);
    windows.push({ start, end: cursor });
    cursor = start - 300;
  }
  const payloads = await Promise.all(windows.map(async ({ start, end: windowEnd }) => {
    const query = new URLSearchParams({ timeframe: "5m", start_time: String(start), end_time: String(windowEnd) });
    const response = await withTimeout(`${METEORA_DLMM_API}/pools/${encodeURIComponent(pool)}/ohlcv?${query.toString()}`, { headers: { accept: "application/json" } }, 12000);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`meteora (${response.status})`);
    return Array.isArray(payload?.data) ? payload.data : [];
  }));
  const buckets = new Map();
  payloads.flat().forEach((row) => {
    const timestamp = Number(row?.timestamp ?? row?.time ?? 0);
    const open = Number(row?.open);
    const high = Number(row?.high);
    const low = Number(row?.low);
    const close = Number(row?.close);
    const volume = Number(row?.volume ?? 0);
    if (!timestamp || ![open, high, low, close].every(Number.isFinite)) return;
    const bucket = Math.floor(timestamp / 900) * 900;
    const prior = buckets.get(bucket);
    if (!prior) buckets.set(bucket, { time: bucket, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0, first: timestamp, last: timestamp });
    else {
      if (timestamp < prior.first) { prior.open = open; prior.first = timestamp; }
      if (timestamp > prior.last) { prior.close = close; prior.last = timestamp; }
      prior.high = Math.max(prior.high, high);
      prior.low = Math.min(prior.low, low);
      prior.volume += Number.isFinite(volume) ? volume : 0;
    }
  });
  const rows = [...buckets.values()].sort((a, b) => a.time - b.time).slice(-limit).map((row) => [row.time, row.open, row.high, row.low, row.close, row.volume]);
  if (!rows.length) throw new Error("meteora returned no 5m candles");
  return { body: { data: { attributes: { ohlcv_list: rows } } }, source: "meteora-dlmm" };
};

const dexPaprikaOhlcv = async (pool, apiKey, limit) => {
  const response = await withTimeout(`${DEXPAPRIKA_API}/networks/solana/pools/${encodeURIComponent(pool)}/ohlcv?start=-12h&interval=15m&limit=${limit}`, {
    headers: { accept: "application/json", authorization: apiKey },
  }, 15000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`dexpaprika (${response.status})`);
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  const ohlcvList = rows.map((row) => [
    Math.floor(Date.parse(String(row?.time_open ?? row?.timeOpen ?? "")) / 1000),
    Number(row?.open), Number(row?.high), Number(row?.low), Number(row?.close), Number(row?.volume ?? row?.volume_usd ?? 0),
  ]).filter((row) => row[0] > 0 && row.slice(1, 5).every(Number.isFinite));
  if (!ohlcvList.length) throw new Error("dexpaprika returned no 15m candles");
  return { data: { attributes: { ohlcv_list: ohlcvList } } };
};

// Defined's chart data is supplied by Codex. Keep the integration server-side so
// the API key never reaches the browser. Pair bars are preferred; token bars are
// a useful fallback when a pool has migrated or is not indexed yet.
const codexOhlcv = async (pool, token, apiKey, limit) => {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 12 * 60 * 60;
  const symbols = [...new Set([
    pool ? `${pool}:${SOLANA_NETWORK_ID}` : "",
    token ? `${token}:${SOLANA_NETWORK_ID}` : "",
  ].filter(Boolean))];
  let lastError;
  for (const symbol of symbols) {
    const query = `query GetBars($symbol: String!, $from: Int!, $to: Int!, $resolution: String!) {
      getBars(symbol: $symbol, from: $from, to: $to, resolution: $resolution, removeEmptyBars: true) { o h l c v t }
    }`;
    try {
      const response = await withTimeout(CODEX_API, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json", authorization: apiKey },
        body: JSON.stringify({ query, variables: { symbol, from, to: now, resolution: "15" } }),
      }, 15000);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`codex (${response.status})`);
      if (Array.isArray(payload?.errors) && payload.errors.length) throw new Error(`codex (${String(payload.errors[0]?.message ?? "query error")})`);
      const bars = payload?.data?.getBars ?? {};
      const rows = ["t", "o", "h", "l", "c", "v"].map((key) => Array.isArray(bars[key]) ? bars[key] : []);
      const count = Math.min(...rows.map((row) => row.length));
      const ohlcvList = Array.from({ length: count }, (_, index) => [
        Number(rows[0][index]), Number(rows[1][index]), Number(rows[2][index]), Number(rows[3][index]), Number(rows[4][index]), Number(rows[5][index] ?? 0),
      ]).filter((row) => row[0] > 0 && row.slice(1, 5).every(Number.isFinite)).slice(-limit);
      if (!ohlcvList.length) throw new Error("codex returned no 15m candles");
      return { body: { data: { attributes: { ohlcv_list: ohlcvList } } }, source: symbol.startsWith(`${pool}:`) ? "codex-pair" : "codex-token" };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("codex returned no 15m candles");
};

const geckoPoolForToken = async (token) => {
  const normalized = String(token ?? "").trim();
  if (!normalized) return undefined;
  const cached = geckoPoolCache.get(normalized);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60_000) return cached.pool;
  let pool;
  try {
    const response = await withTimeout(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(normalized)}`, { headers: { accept: "application/json" } }, 10000);
    if (!response.ok) throw new Error(`dexscreener token (${response.status})`);
    const payload = await response.json().catch(() => ({}));
    const rows = Array.isArray(payload?.pairs) ? payload.pairs : [];
    pool = rows.sort((a, b) => Number(b?.liquidity?.usd ?? 0) - Number(a?.liquidity?.usd ?? 0)).map((row) => String(row?.pairAddress ?? "")).find((address) => /^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(address));
  } catch {
    // Dexscreener is the primary public resolver; Gecko remains the secondary path.
  }
  if (!pool) {
    const response = await withTimeout(`${GECKO_OHLCV.replace(/\/pools$/, "")}/tokens/${encodeURIComponent(normalized)}/pools?page=1`, { headers: { accept: "application/json" } }, 12000);
    if (!response.ok) throw new Error(`gecko token pools (${response.status})`);
    const payload = await response.json().catch(() => ({}));
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    pool = rows.map((row) => String(row?.attributes?.address ?? row?.id ?? "").replace(/^solana_/, "")).find((address) => /^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(address));
  }
  if (pool) geckoPoolCache.set(normalized, { pool, fetchedAt: Date.now() });
  return pool;
};

const rpc = async (method, params, id = 1) => {
  let lastError;
  for (const endpoint of SOLANA_RPCS) {
    try {
      const response = await withTimeout(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      }, 6000);
      if (!response.ok) throw new Error(`solana rpc (${response.status})`);
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message || "solana rpc error");
      return payload.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("solana rpc unavailable");
};

const isSolanaAddress = (value) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value ?? ""));
const rpcMap = async (items, worker, concurrency = 4) => {
  const output = [];
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const value = await worker(items[index], index);
      if (value !== undefined) output.push(value);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return output;
};

const walletCluster = async (address, scanLimit = 60) => {
  const signatures = await rpc("getSignaturesForAddress", [address, { limit: scanLimit }]);
  const usable = (signatures ?? []).filter((item) => !item.err && item.signature);
  if (!usable.length) {
    return {
      status: "LIVE",
      source: "Solana RPC · no recent transaction history",
      address,
      scannedSignatures: 0,
      scannedTransactions: 0,
      relatedWallets: [],
      note: "No recent finalized signatures were returned for this address.",
    };
  }
  const transactions = await rpcMap(usable, async (item, index) => {
    try {
      return { item, transaction: await rpc("getTransaction", [item.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 1 }], index + 1) };
    } catch {
      return undefined;
    }
  }, 4);
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
    const signers = accountKeys.filter((key) => key.signer).map((key) => key.pubkey).filter((key) => key !== address);
    signers.forEach((signer) => addCandidate(signer, "co-signed transaction", signature, slot, blockTime, "co-signed"));
    const tokenOwners = new Map();
    for (const balance of [...(transaction.meta.preTokenBalances ?? []), ...(transaction.meta.postTokenBalances ?? [])]) {
      const tokenAccount = accountKeys[Number(balance.accountIndex)]?.pubkey;
      if (tokenAccount && balance.owner && isSolanaAddress(balance.owner)) tokenOwners.set(tokenAccount, balance.owner);
    }
    const instructions = [
      ...(message.instructions ?? []),
      ...(transaction.meta.innerInstructions ?? []).flatMap((group) => group.instructions ?? []),
    ];
    for (const instruction of instructions) {
      const parsed = instruction?.parsed;
      const info = parsed?.info;
      if (!info || typeof info !== "object") continue;
      if (instruction.program === "system" && parsed.type === "transfer") {
        if (info.source === address && info.destination) addCandidate(info.destination, "direct SOL transfer", signature, slot, blockTime, "outbound");
        if (info.destination === address && info.source) addCandidate(info.source, "direct SOL transfer", signature, slot, blockTime, "inbound");
        continue;
      }
      if ((instruction.program === "spl-token" || instruction.program === "spl-token-2022") && ["transfer", "transferChecked"].includes(parsed.type)) {
        const sourceOwner = tokenOwners.get(info.source) ?? (info.authority === address ? address : undefined);
        const destinationOwner = tokenOwners.get(info.destination);
        const mint = info.mint;
        if (sourceOwner === address && destinationOwner) addCandidate(destinationOwner, "SPL token transfer", signature, slot, blockTime, "outbound", mint);
        if (destinationOwner === address && sourceOwner) addCandidate(sourceOwner, "SPL token transfer", signature, slot, blockTime, "inbound", mint);
      }
    }
  }
  const relatedWallets = [...candidates.values()]
    .sort((a, b) => b.hits - a.hits || b.signatures.size - a.signatures.size || String(a.address).localeCompare(String(b.address)))
    .slice(0, 50)
    .map((row) => ({
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
  return {
    status: "LIVE",
    source: `Solana RPC · ${scanLimit} recent signatures + transfer graph`,
    address,
    scannedSignatures: usable.length,
    scannedTransactions: transactions.filter(Boolean).length,
    relatedWallets,
    note: "These are repeated on-chain counterparties or co-signers, not proof of common ownership. Token-account owners are resolved from transaction balance metadata.",
  };
};

const walletSignal = async (pool, baseMint, limit, scanLimit = 50) => {
  const signatures = await rpc("getSignaturesForAddress", [pool, { limit: scanLimit }]);
  const usable = (signatures ?? []).filter((item) => !item.err && item.signature);
  if (!usable.length) return { status: "LIVE", source: "Solana RPC · no recent swaps", smartWallets: 0, walletFlow: "MIXED", walletEvents: 0 };
  const transactions = await Promise.all(usable.map((item, index) => rpc("getTransaction", [item.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 1 }], index + 1)));
  const wallets = new Map();
  for (const transaction of transactions) {
    if (!transaction?.meta || transaction.meta.err) continue;
    const keys = transaction.transaction?.message?.accountKeys ?? [];
    const signer = keys.find((key) => key.signer)?.pubkey ?? keys.find((key) => typeof key === "string");
    if (!signer) continue;
    const balances = new Map();
    for (const entry of transaction.meta.preTokenBalances ?? []) {
      if (baseMint && entry.mint !== baseMint) continue;
      if (entry.owner !== signer) continue;
      const amount = Number(entry.uiTokenAmount?.uiAmount ?? 0);
      const key = `${entry.accountIndex}:${entry.mint}`;
      const existing = balances.get(key) ?? { pre: 0, post: 0 };
      existing.pre = amount;
      balances.set(key, existing);
    }
    for (const entry of transaction.meta.postTokenBalances ?? []) {
      if (baseMint && entry.mint !== baseMint) continue;
      if (entry.owner !== signer) continue;
      const amount = Number(entry.uiTokenAmount?.uiAmount ?? 0);
      const key = `${entry.accountIndex}:${entry.mint}`;
      const existing = balances.get(key) ?? { pre: 0, post: 0 };
      existing.post = amount;
      balances.set(key, existing);
    }
    const delta = [...balances.values()].reduce((sum, value) => sum + (value.post - value.pre), 0);
    const current = wallets.get(signer) ?? { inflow: 0, outflow: 0, events: 0 };
    current.events += 1;
    if (delta > 0) current.inflow += 1;
    if (delta < 0) current.outflow += 1;
    wallets.set(signer, current);
  }
  const totals = [...wallets.values()].reduce((summary, wallet) => ({ inflow: summary.inflow + wallet.inflow, outflow: summary.outflow + wallet.outflow, events: summary.events + wallet.events }), { inflow: 0, outflow: 0, events: 0 });
  const walletFlow = totals.inflow > totals.outflow ? "INFLOW" : totals.outflow > totals.inflow ? "OUTFLOW" : "MIXED";
  const tracked = new Map();
  for (const address of wallets.keys()) {
    for (const match of trackedWalletIndex.get(String(address).toLowerCase()) ?? []) {
      const prior = tracked.get(match.handle);
      if (!prior || confidenceRank(match.confidence) > confidenceRank(prior.confidence)) tracked.set(match.handle, match);
    }
  }
  const trackedRows = [...tracked.values()].sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence) || a.handle.localeCompare(b.handle));
  return { status: "LIVE", source: `Solana RPC · ${scanLimit} transaction history scan + captured wallet map`, smartWallets: wallets.size, walletFlow, walletEvents: totals.events, walletAddresses: [...wallets.keys()], trackedWalletHits: trackedRows.length, trackedWalletHandles: trackedRows.map((row) => `@${row.handle}`), trackedWalletConfidence: trackedRows[0]?.confidence, trackedWalletAddresses: trackedRows.flatMap((row) => [...trackedWalletIndex.entries()].filter(([, matches]) => matches.some((match) => match.handle === row.handle)).map(([address]) => address)) };
};

const lunarTopic = (value) => String(value ?? "").toLowerCase().trim().replace(/[^a-z0-9#$ ]/g, " ").replace(/\s+/g, " ").slice(0, 48);

const lunarJson = async (path, apiKey) => {
  const response = await withTimeout(`${LUNARCRUSH_API}${path}`, {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
  }, 15000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error || payload?.message || `lunarcrush (${response.status})`;
    throw new Error(String(detail));
  }
  return payload;
};

const birdeyeJson = async (path, apiKey) => {
  const response = await withTimeout(`${BIRDEYE_API}${path}`, {
    headers: { accept: "application/json", "X-API-KEY": apiKey, "x-chain": "solana" },
  }, 12000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.message || payload?.error || `birdeye (${response.status})`;
    throw new Error(String(detail));
  }
  return payload;
};

const rugcheckSummary = async (mint) => {
  try {
    const response = await withTimeout(`${RUGCHECK_API}/tokens/${encodeURIComponent(mint)}/report/summary`, { headers: { accept: "application/json" } }, 12000);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`rugcheck (${response.status})`);
    const score = Number(payload?.score_normalised ?? payload?.scoreNormalized ?? payload?.score);
    const risks = Array.isArray(payload?.risks) ? payload.risks : [];
    return {
      status: "LIVE",
      source: "RugCheck public summary",
      score: Number.isFinite(score) ? score : undefined,
      risk: risks.some((risk) => String(risk?.level ?? "").toLowerCase() === "danger") ? "DANGER" : risks.some((risk) => String(risk?.level ?? "").toLowerCase() === "warn") ? "WARN" : "CLEAR",
      risks: risks.slice(0, 4).map((risk) => String(risk?.name ?? risk?.description ?? "")).filter(Boolean),
      lpLockedPct: Number.isFinite(Number(payload?.lpLockedPct)) ? Number(payload.lpLockedPct) : undefined,
    };
  } catch {
    return { status: "UNAVAILABLE", source: "RugCheck unavailable" };
  }
};

const birdeyeHolderProfile = async (mint) => {
  const apiKey = String(process.env.BIRDEYE_API_KEY ?? "").trim();
  if (!apiKey) return { status: "UNAVAILABLE", source: "Birdeye key required" };
  try {
    const payload = await birdeyeJson(`/token/v1/holder-profile?token_address=${encodeURIComponent(mint)}&include_zero_balance=false`, apiKey);
    const data = payload?.data ?? {};
    const holderCount = Number(data.holder_count ?? data.holderCount ?? 0);
    return {
      status: "LIVE",
      source: "Birdeye · holder profile",
      holderCount: Number.isFinite(holderCount) && holderCount > 0 ? holderCount : undefined,
      holderTags: data.tags ?? data.holder_tags ?? data.profile ?? undefined,
    };
  } catch {
    return { status: "UNAVAILABLE", source: "Birdeye unavailable" };
  }
};

const nansenJson = async (path, body, apiKey) => {
  const response = await withTimeout(`${NANSEN_API}${path}`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", apiKey },
    body: JSON.stringify(body),
  }, 15000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.message || payload?.error || `nansen (${response.status})`;
    throw new Error(String(detail));
  }
  return payload;
};

const nansenSignal = async (mint) => {
  const apiKey = String(process.env.NANSEN_API_KEY ?? "").trim();
  if (!apiKey) return { status: "UNAVAILABLE", source: "Nansen key required", smartWallets: 0, walletFlow: "MIXED", walletEvents: 0 };
  try {
    const payload = await nansenJson("/tgm/holders", {
      chain: "solana",
      token_address: mint,
      aggregate_by_entity: false,
      label_type: "smart_money",
      pagination: { page: 1, per_page: 100 },
      filters: { include_smart_money_labels: ["Smart Trader", "Fund", "30D Smart Trader", "90D Smart Trader", "180D Smart Trader"] },
      order_by: [{ field: "value_usd", direction: "DESC" }],
    }, apiKey);
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const netChange = rows.reduce((sum, row) => sum + Number(row?.balance_change_24h ?? row?.total_inflow ?? 0) - Number(row?.total_outflow ?? 0), 0);
    const walletFlow = netChange > 0 ? "INFLOW" : netChange < 0 ? "OUTFLOW" : "MIXED";
    return {
      status: "LIVE",
      source: "Nansen API · smart-money holders",
      smartWallets: rows.filter((row) => row?.address).length,
      walletFlow,
      walletEvents: rows.length,
      walletAddresses: rows.filter((row) => row?.address).slice(0, 5).map((row) => row.address),
      smartMoneyLabels: [...new Set(rows.map((row) => row?.address_label).filter(Boolean))].slice(0, 5),
    };
  } catch {
    return { status: "UNAVAILABLE", source: "Nansen unavailable", smartWallets: 0, walletFlow: "MIXED", walletEvents: 0 };
  }
};

const ageLabel = (timestamp) => {
  const seconds = Number(timestamp ?? 0);
  if (!seconds) return "—";
  const minutes = Math.max(0, Math.round((Date.now() / 1000 - seconds) / 60));
  return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
};

const xJson = async (url, bearer) => {
  const response = await withTimeout(url, { headers: { accept: "application/json", authorization: `Bearer ${bearer}` } }, 15000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail || payload?.title || payload?.error || payload?.message || `x (${response.status})`;
    const error = new Error(String(detail));
    error.status = response.status;
    throw error;
  }
  return payload;
};

const safeXHandle = (value) => String(value ?? "").trim().replace(/^@+/, "").slice(0, 15);
const isSafeXHandle = (value) => /^[a-z0-9_]{1,15}$/i.test(String(value ?? ""));
const uniqueStrings = (values) => [...new Set(values.filter(Boolean).map((value) => String(value)))];
const xPostEvidence = (tweet, usersById) => {
  const user = usersById.get(String(tweet?.author_id ?? ""));
  const username = safeXHandle(user?.username);
  if (!username || !tweet?.id) return undefined;
  const text = String(tweet.text ?? "").trim();
  const solanaAddresses = text.match(/(?<![A-Za-z0-9])[1-9A-HJ-NP-Za-km-z]{32,44}(?![A-Za-z0-9])/g) ?? [];
  const evmAddresses = text.match(/(?<![A-Za-z0-9])0x[a-fA-F0-9]{40}(?![A-Za-z0-9])/g) ?? [];
  const cas = uniqueStrings([...solanaAddresses, ...evmAddresses]);
  const dollarMentions = text.match(/\$[A-Za-z][A-Za-z0-9_]{1,14}/g) ?? [];
  const hashMentions = text.match(/#[A-Za-z][A-Za-z0-9_]{1,14}/g) ?? [];
  const uppercaseMentions = text.match(/\b[A-Z][A-Z0-9_]{2,14}\b/g) ?? [];
  const stopwords = new Set(["THE", "AND", "FOR", "NOT", "THIS", "THAT", "WITH", "FROM", "JUST", "SOL", "USD", "USDC", "LFG", "DYOR", "ATH", "ATL", "CA"]);
  const tokenMentions = uniqueStrings([...dollarMentions, ...hashMentions, ...uppercaseMentions].map((value) => value.replace(/^[#$]/, "").toUpperCase()).filter((value) => !stopwords.has(value) && value.length >= 2));
  const metrics = tweet.public_metrics ?? {};
  const isReply = Boolean(tweet.in_reply_to_user_id || (tweet.referenced_tweets ?? []).some((item) => item?.type === "replied_to"));
  const createdAt = typeof tweet.created_at === "string" ? tweet.created_at : undefined;
  return {
    id: String(tweet.id),
    xHandle: username,
    url: `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(String(tweet.id))}`,
    text: text.slice(0, 560),
    createdAt,
    contractAddresses: uniqueStrings(cas),
    tokenMentions,
    isReply,
    replyToUserId: tweet.in_reply_to_user_id ? String(tweet.in_reply_to_user_id) : undefined,
    publicMetrics: {
      replies: Number(metrics.reply_count ?? 0),
      likes: Number(metrics.like_count ?? 0),
      reposts: Number(metrics.retweet_count ?? 0),
      quotes: Number(metrics.quote_count ?? 0),
    },
    authorConfidence: "EXACT",
  };
};

const isSnapshotPost = (post) => post && typeof post === "object" && String(post.id ?? "").trim() && String(post.xHandle ?? "").trim();
const snapshotPostForHandle = (post, handle) => String(post?.xHandle ?? "").toLowerCase() === String(handle ?? "").toLowerCase();
const snapshotSummary = (posts) => ({
  postCount: posts.length,
  replyCount: posts.filter((post) => post.isReply).length,
  contractCount: posts.reduce((total, post) => total + post.contractAddresses.length, 0),
  engagement: posts.reduce((total, post) => total + post.publicMetrics.replies + post.publicMetrics.likes + post.publicMetrics.reposts + post.publicMetrics.quotes, 0),
  latestAt: posts.map((post) => post.createdAt).filter(Boolean).sort().at(-1),
});
const normalizeSnapshotFeed = (payload, handles) => {
  const sourcePosts = Array.isArray(payload?.posts) ? payload.posts : [];
  const requested = new Set(handles.map((handle) => String(handle).toLowerCase()));
  const posts = sourcePosts.filter(isSnapshotPost).filter((post) => !requested.size || requested.has(String(post.xHandle).toLowerCase())).map((post) => ({
    id: String(post.id),
    xHandle: String(post.xHandle).replace(/^@+/, ""),
    url: String(post.url ?? `https://x.com/${encodeURIComponent(String(post.xHandle).replace(/^@+/, ""))}/status/${encodeURIComponent(String(post.id))}`),
    text: String(post.text ?? "").slice(0, 560),
    createdAt: post.createdAt ? String(post.createdAt) : undefined,
    contractAddresses: Array.isArray(post.contractAddresses) ? [...new Set(post.contractAddresses.map(String))].slice(0, 8) : [],
    tokenMentions: Array.isArray(post.tokenMentions) ? [...new Set(post.tokenMentions.map(String))].slice(0, 16) : [],
    isReply: Boolean(post.isReply),
    replyToUserId: post.replyToUserId ? String(post.replyToUserId) : undefined,
    publicMetrics: {
      replies: Number(post.publicMetrics?.replies ?? 0),
      likes: Number(post.publicMetrics?.likes ?? 0),
      reposts: Number(post.publicMetrics?.reposts ?? 0),
      quotes: Number(post.publicMetrics?.quotes ?? 0),
    },
    authorConfidence: "EXACT",
  }));
  const profileHandles = handles.length ? handles : [...new Set(posts.map((post) => post.xHandle))];
  const profiles = Object.fromEntries(profileHandles.map((handle) => {
    const profilePosts = posts.filter((post) => snapshotPostForHandle(post, handle)).sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return [String(handle).toLowerCase(), { xHandle: String(handle).replace(/^@+/, ""), posts: profilePosts, summary: snapshotSummary(profilePosts) }];
  }));
  return {
    status: "LIVE",
    source: String(payload?.source ?? "Authorized X snapshot bridge"),
    profiles,
    posts,
    fetchedAt: String(payload?.fetchedAt ?? payload?.capturedAt ?? new Date().toISOString()),
    window: String(payload?.window ?? "7d"),
    stale: Boolean(payload?.stale),
    note: payload?.note ? String(payload.note) : "Snapshot imported by a separate authorized collector.",
  };
};
const readSnapshotFile = () => {
  if (!X_FEED_SNAPSHOT_FILE) return undefined;
  try {
    return JSON.parse(readFileSync(X_FEED_SNAPSHOT_FILE, "utf8"));
  } catch {
    return undefined;
  }
};
const xSnapshotFeed = async (handles) => {
  let payload = readSnapshotFile();
  if (!payload && X_FEED_SNAPSHOT_URL) {
    try {
      const headers = { accept: "application/json" };
      if (X_FEED_SNAPSHOT_TOKEN) headers.authorization = `Bearer ${X_FEED_SNAPSHOT_TOKEN}`;
      const response = await withTimeout(X_FEED_SNAPSHOT_URL, { headers }, 10000);
      if (!response.ok) throw new Error(`snapshot (${response.status})`);
      payload = await response.json().catch(() => ({}));
    } catch {
      payload = undefined;
    }
  }
  return payload ? normalizeSnapshotFeed(payload, handles) : undefined;
};

const xRecentFeed = async (handles) => {
  const normalizedHandles = [...new Set(handles.map(safeXHandle).filter(isSafeXHandle))].slice(0, 10);
  const snapshot = await xSnapshotFeed(normalizedHandles);
  if (snapshot) return snapshot;
  if (!normalizedHandles.length) return { status: "LIVE", source: "Private X web-session snapshot", profiles: {}, posts: [], fetchedAt: new Date().toISOString() };
  return { status: "UNAVAILABLE", source: "Private X web-session snapshot", profiles: {}, posts: [], fetchedAt: new Date().toISOString(), note: "Run the local TypeScript cookie worker to publish a fresh X snapshot." };
};

const kaitoCall = async (name, args, apiKey) => {
  const response = await withTimeout(KAITO_MCP, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
  }, 15000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) throw new Error(String(payload?.error?.message ?? `kaito (${response.status})`));
  const blocks = Array.isArray(payload?.result?.content) ? payload.result.content : [];
  const text = blocks.filter((block) => block?.type === "text" && typeof block.text === "string").map((block) => block.text).join("\n");
  if (text) { try { return JSON.parse(text); } catch { return { text }; } }
  return payload?.result?.structuredContent ?? payload?.result ?? payload;
};

const kaitoSignal = async (symbol) => {
  const apiKey = String(process.env.KAITO_API_KEY ?? "").trim();
  if (!apiKey) return { status: "UNAVAILABLE", source: "Kaito key required", kolMentions: 0, kolRecency: "—", kolCreators: 0, kolPosts: 0 };
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  try {
    const payload = await kaitoCall("kaito_mentions", { token: symbol, start_date: start.toISOString(), end_date: now.toISOString() }, apiKey);
    const data = payload?.data ?? payload;
    const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.rows) ? data.rows : [];
    const mentions = rows.reduce((sum, row) => sum + Number(row?.mentions ?? row?.mention_count ?? row?.count ?? 0), 0) || Number(data?.total_mentions ?? data?.mentions ?? data?.mention_count ?? 0);
    return { status: "LIVE", source: "Kaito MCP · 24h mentions", kolMentions: Math.max(0, mentions), kolRecency: "24h", kolCreators: 0, kolPosts: Math.max(0, mentions) };
  } catch {
    return { status: "UNAVAILABLE", source: "Kaito unavailable", kolMentions: 0, kolRecency: "—", kolCreators: 0, kolPosts: 0 };
  }
};

const madeOnSolJson = async (path, apiKey) => {
  const response = await withTimeout(`${MADEONSOL_API}${path}`, {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
  }, 15000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.message || payload?.error || `madeonsol (${response.status})`;
    throw new Error(String(detail));
  }
  return payload;
};

const madeOnSolFeed = async () => {
  if (madeOnSolFeedCache.fetchedAt && Date.now() - madeOnSolFeedCache.fetchedAt < 5 * 60_000) return madeOnSolFeedCache;
  if (madeOnSolFeedPromise) return madeOnSolFeedPromise;
  const apiKey = String(process.env.MADEONSOL_API_KEY ?? MADEONSOL_DEMO_KEY).trim();
  madeOnSolFeedPromise = madeOnSolJson("/kol/feed?limit=100", apiKey)
    .then((payload) => {
      const trades = Array.isArray(payload?.trades) ? payload.trades : [];
      madeOnSolFeedCache = {
        fetchedAt: Date.now(),
        trades,
        delaySeconds: Number(payload?.delay_seconds ?? 0),
        asOf: payload?.as_of,
      };
      return madeOnSolFeedCache;
    })
    .finally(() => {
      madeOnSolFeedPromise = undefined;
    });
  return madeOnSolFeedPromise;
};

const madeOnSolSignal = async (mint, symbol) => {
  if (!mint) return { status: "UNAVAILABLE", source: "MadeOnSol mint required", kolMentions: 0, kolRecency: "—", kolCreators: 0, kolPosts: 0 };
  try {
    const snapshot = await madeOnSolFeed();
    const rows = snapshot.trades.filter((row) => String(row?.token_mint ?? "") === mint);
    const creators = new Set(rows.map((row) => String(row?.wallet_address ?? row?.kol_name ?? "")).filter(Boolean));
    const buys = rows.filter((row) => String(row?.action ?? "").toLowerCase() === "buy").length;
    const sells = rows.filter((row) => String(row?.action ?? "").toLowerCase() === "sell").length;
    const latest = rows.map((row) => Date.parse(String(row?.traded_at ?? ""))).filter(Number.isFinite).sort((a, b) => b - a)[0];
    const delay = snapshot.delaySeconds > 0 ? `${Math.max(1, Math.round(snapshot.delaySeconds / 60))}m delayed` : "live";
    return {
      status: "LIVE",
      source: `MadeOnSol KOL feed · ${delay}`,
      kolMentions: rows.length,
      kolRecency: latest ? ageLabel(Math.round(latest / 1000)) : "—",
      kolCreators: creators.size,
      kolPosts: rows.length,
      kolTrend: buys > sells ? "BUY_FLOW" : sells > buys ? "SELL_FLOW" : rows.length ? "MIXED_FLOW" : "NO_RECENT_FLOW",
      kolSentiment: undefined,
      tokenSymbol: symbol,
    };
  } catch {
    return { status: "UNAVAILABLE", source: "MadeOnSol unavailable", kolMentions: 0, kolRecency: "—", kolCreators: 0, kolPosts: 0 };
  }
};

const kolSignal = async (symbol, mint) => {
  const apiKey = String(process.env.LUNARCRUSH_API_KEY ?? "").trim();
  if (!apiKey && String(process.env.KAITO_API_KEY ?? "").trim()) return kaitoSignal(symbol);
  const topic = lunarTopic(symbol);
  if (!apiKey || !topic) return madeOnSolSignal(mint, symbol);
  try {
    const encoded = encodeURIComponent(topic);
    const [summary, creators] = await Promise.all([
      lunarJson(`/public/topic/${encoded}/v1`, apiKey),
      lunarJson(`/public/topic/${encoded}/creators/v1`, apiKey),
    ]);
    const data = summary?.data ?? {};
    const creatorRows = Array.isArray(creators?.data) ? creators.data : [];
    const creatorCount = creatorRows.filter((row) => row?.creator_id || row?.creator_name).length;
    const mentions = Number(data.num_posts ?? 0);
    const generated = Number(summary?.config?.generated ?? summary?.generated ?? 0);
    return { status: "LIVE", source: "LunarCrush API · 24h topic + creators", kolMentions: Math.max(0, mentions), kolRecency: ageLabel(generated), kolCreators: creatorCount, kolPosts: Math.max(0, mentions), kolTrend: typeof data.trend === "string" ? data.trend.toUpperCase() : undefined, kolSentiment: Number(data.types_sentiment?.tweet ?? data.types_sentiment?.["youtube-video"] ?? 0) || undefined };
  } catch {
    if (String(process.env.KAITO_API_KEY ?? "").trim()) return kaitoSignal(symbol);
    return madeOnSolSignal(mint, symbol);
  }
};

const tokenSignal = async (mint) => {
  const safeRpc = (method, params) => rpc(method, params).catch(() => undefined);
  const [account, supply, largest, rugcheck] = await Promise.all([
    safeRpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]),
    safeRpc("getTokenSupply", [mint]),
    safeRpc("getTokenLargestAccounts", [mint]),
    rugcheckSummary(mint),
  ]);
  const info = account?.value?.data?.parsed?.info ?? {};
  const hasRpc = Boolean(account?.value || supply?.value);
  if (!hasRpc && rugcheck?.status !== "LIVE") throw new Error("token safety sources unavailable");
  const totalAmount = Number(supply?.value?.amount ?? info.supply ?? 0);
  const largestRows = Array.isArray(largest?.value) ? largest.value : [];
  const top10Amount = largestRows.reduce((sum, row) => sum + Number(row?.amount ?? 0), 0);
  const holderTop10Pct = totalAmount > 0 && largestRows.length ? (top10Amount / totalAmount) * 100 : undefined;
  const mintAuthority = hasRpc ? Boolean(info.mintAuthority) : undefined;
  const freezeAuthority = hasRpc ? Boolean(info.freezeAuthority) : undefined;
  const holderProfile = await birdeyeHolderProfile(mint);
  const rpcSafety = mintAuthority === false && freezeAuthority === false && (holderTop10Pct === undefined || holderTop10Pct <= 45);
  const rugWarn = rugcheck?.status === "LIVE" && (rugcheck.risk === "DANGER" || Number(rugcheck.score ?? 0) >= 50);
  const sourceParts = [hasRpc ? "Solana RPC · mint + holder checks" : "", rugcheck?.status === "LIVE" ? rugcheck.source : ""].filter(Boolean);
  return {
    status: "LIVE",
    source: sourceParts.join(" + ") || "RugCheck public summary",
    mintAuthority,
    freezeAuthority,
    holderTop10Pct: Number.isFinite(holderTop10Pct) ? Number(holderTop10Pct.toFixed(2)) : undefined,
    decimals: Number(info.decimals ?? supply?.value?.decimals ?? 0),
    safety: rpcSafety && !rugWarn ? "PASS" : "WARN",
    rugCheckScore: rugcheck?.score,
    rugCheckRisk: rugcheck?.risk,
    rugCheckRisks: rugcheck?.risks,
    rugCheckLpLockedPct: rugcheck?.lpLockedPct,
    holderProfileStatus: holderProfile.status,
    holderProfileSource: holderProfile.source,
    holderCount: holderProfile.holderCount,
    holderTags: holderProfile.holderTags,
  };
};

const providerHealth = () => {
  const xSnapshotConfigured = Boolean(X_FEED_SNAPSHOT_URL || X_FEED_SNAPSHOT_FILE);
  const configured = (name) => Boolean(String(process.env[name] ?? "").trim());
  return {
    providers: [
      { key: "dexscreener", label: "Dexscreener", status: "LIVE", mode: "PUBLIC", source: "Live pair discovery + token profiles" },
      { key: "meteora-dlmm", label: "Meteora DLMM", status: "LIVE", mode: "15M_OHLCV", source: "Venue-native 5m OHLCV aggregated to 15m · public 30 RPS" },
      { key: "raydium", label: "Raydium", status: "LIVE", mode: "PUBLIC_METADATA", source: "Venue-native pool metadata · public API" },
      { key: "codex", label: "Codex · Defined data", status: configured("CODEX_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "15M_OHLCV", source: configured("CODEX_API_KEY") ? "Selected-pool pair/token 15m OHLCV · optional" : "Selected-pool Defined-style bars · server key required" },
      { key: "dexpaprika", label: "DexPaprika", status: configured("DEXPAPRIKA_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "15M_OHLCV", source: configured("DEXPAPRIKA_API_KEY") ? "Pool-specific 15m OHLCV · optional fallback" : "Pool-specific 15m OHLCV · server key required" },
      { key: "geckoterminal", label: "GeckoTerminal", status: "LIVE", mode: "FALLBACK", source: "15m OHLCV fallback · public rate limited" },
      { key: "solana-rpc", label: "Solana RPC", status: "LIVE", mode: "PUBLIC", source: "Wallet activity + token safety + on-demand related-wallet scans" },
      { key: "rugcheck", label: "RugCheck", status: "LIVE", mode: "TOKEN_SAFETY", source: "Public Solana token report summary" },
      { key: "blockscout", label: "Blockscout indexes", status: "LIVE", mode: "INDEXED_EVM", source: "Persisted Ethereum + Base + Robinhood wallet history · BNB key required" },
      { key: "defillama", label: "DeFiLlama", status: "LIVE", mode: "PUBLIC", source: "Chain TVL context" },
      { key: "lunarcrush", label: "LunarCrush", status: configured("LUNARCRUSH_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "KOL", source: "Topic mentions + creators" },
      { key: "x-api", label: "X API / snapshot bridge", status: configured("X_BEARER_TOKEN") || xSnapshotConfigured ? "LIVE" : "KEY_REQUIRED", mode: "X_THESIS", source: configured("X_BEARER_TOKEN") ? "Recent posts + replies + contract extraction" : xSnapshotConfigured ? "Authorized snapshot feed + contract extraction" : "Recent posts + replies · server key or snapshot bridge required" },
      { key: "birdeye", label: "Birdeye", status: configured("BIRDEYE_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "HOLDER_PROFILE", source: "Holder behavior enrichment" },
      { key: "nansen", label: "Nansen", status: configured("NANSEN_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "SMART_MONEY", source: "Smart-money holders + 24h flow" },
      { key: "gmgn", label: "GMGN", status: "LINK_ONLY", mode: "LINK_ONLY", source: "On-chain trader context link" },
      { key: "ocula", label: "Ocula", status: "LIVE", mode: "PUBLIC", source: "Live Solana discovery + holder/social context" },
      { key: "bubblemaps", label: "Bubblemaps", status: "LINK_ONLY", mode: "LINK_ONLY", source: "Holder-cluster context link" },
      { key: "kaito", label: "Kaito", status: configured("KAITO_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "KOL", source: "Kaito MCP · token mentions" },
      { key: "madeonsol", label: "MadeOnSol", status: "LIVE", mode: "KOL", source: configured("MADEONSOL_API_KEY") ? "KOL feed · configured key" : "KOL feed · public demo · 5m delayed" },
      { key: "cielo", label: "Cielo", status: "LINK_ONLY", mode: "LINK_ONLY", source: "Wallet context link" },
      { key: "moby", label: "Moby", status: "LINK_ONLY", mode: "LINK_ONLY", source: "Market context link" },
      { key: "artemis", label: "Artemis", status: "LINK_ONLY", mode: "LINK_ONLY", source: "Fundamental context link" },
    ],
  };
};

const persistedWalletCluster = (address, chain) => {
  const normalized = String(address ?? "").toLowerCase();
  const snapshot = chain === "solana" ? solanaWalletClusters : evmWalletClusters;
  const record = (snapshot.records ?? []).find((item) => String(item.address ?? "").toLowerCase() === normalized && (chain === "solana" || item.chain === chain));
  if (record) return { ...record, status: record.status === "LIVE" ? "LIVE" : record.status, snapshotCapturedAt: snapshot.capturedAt };
  if (chain === "bnb") return { status: "KEY_REQUIRED", source: "BNB Chain indexed history needs a BscScan/BSCTrace key", address, chain, relatedWallets: [], note: "No public BNB Blockscout index is configured." };
  return { status: "UNAVAILABLE", source: "No persisted indexed wallet snapshot", address, chain, relatedWallets: [], note: "Run the corresponding resumable scanner before using this evidence panel." };
};

const persistedWalletGraph = (handle, address, chain) => {
  const normalizedHandle = String(handle ?? "").trim().toLowerCase();
  const normalizedAddress = String(address ?? "").trim().toLowerCase();
  const profiles = Array.isArray(walletGraph.profiles) ? walletGraph.profiles : [];
  if (normalizedHandle || normalizedAddress) {
    const profile = profiles.find((item) => {
      if (normalizedHandle && String(item.handle ?? "").toLowerCase() === normalizedHandle) return true;
      if (!normalizedAddress) return false;
      return (item.wallets ?? []).some((wallet) => String(wallet.address ?? "").toLowerCase() === normalizedAddress && (!chain || String(wallet.chain ?? "").toLowerCase() === String(chain).toLowerCase()));
    });
    return profile
      ? { status: "LIVE", source: "Persisted wallet graph · PublicNode + Blockscout", capturedAt: walletGraph.capturedAt, methodology: walletGraph.methodology, summary: walletGraph.summary, profile }
      : { status: "UNAVAILABLE", source: "Persisted wallet graph", summary: walletGraph.summary, note: "No matching tracked profile or wallet was found in the captured graph." };
  }
  return {
    status: "LIVE",
    source: "Persisted wallet graph · PublicNode + Blockscout",
    capturedAt: walletGraph.capturedAt,
    methodology: walletGraph.methodology,
    summary: walletGraph.summary,
    clusters: (walletGraph.clusters ?? []).slice(0, 12).map((cluster) => ({ ...cluster, topLinks: (cluster.topLinks ?? []).slice(0, 6) })),
  };
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const kind = String(req.query?.kind ?? "feed");
  try {
    if (kind === "providers") {
      return res.status(200).json(providerHealth());
    }
    if (kind === "feed") {
      const term = String(req.query?.q ?? "SOL").trim().slice(0, 24);
      const upstream = await withTimeout(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(term)}`);
      const body = await upstream.text();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(upstream.status).send(body);
    }
    if (kind === "ocula") {
      const ageBucket = String(req.query?.ageBucket ?? "all").trim().slice(0, 16) || "all";
      const params = new URLSearchParams({ launchpad: "all", limit: "100", chain: "solana", ageBucket });
      const upstream = await withTimeout(`${OCULA_FEED}?${params.toString()}`, { headers: { accept: "application/json" } }, 15000);
      const body = await upstream.text();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(upstream.status).send(body);
    }
    if (kind === "chains") {
      const upstream = await withTimeout(`${DEFILLAMA_API}/v2/chains`, { headers: { accept: "application/json" } }, 12000);
      const body = await upstream.text();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(upstream.status).send(body);
    }
    if (kind === "ohlcv") {
      const pool = String(req.query?.pool ?? "");
      const token = String(req.query?.token ?? "");
      const dex = String(req.query?.dex ?? "").trim().toLowerCase();
      const allowCodex = String(req.query?.codex ?? "") === "1";
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(pool) && !/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(token)) return res.status(400).json({ error: "invalid_pool" });
      const codexKey = String(process.env.CODEX_API_KEY ?? "").trim();
      const dexPaprikaKey = String(process.env.DEXPAPRIKA_API_KEY ?? "").trim();
      const cachePrefix = allowCodex && codexKey ? "codex" : dexPaprikaKey ? "dexpaprika" : dex.includes("meteora") ? "meteora" : "gecko";
      const cacheKey = `${cachePrefix}:${pool || "token"}:${token}`;
      const cacheTtl = allowCodex && codexKey ? 60_000 : dexPaprikaKey ? 90_000 : dex.includes("meteora") ? 120_000 : 180_000;
      const cached = ohlcvCache.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < cacheTtl) {
        res.setHeader("Cache-Control", `s-maxage=${Math.round(cacheTtl / 1000)}, stale-while-revalidate=${Math.round(cacheTtl * 2 / 1000)}`);
        res.setHeader("X-OHLCV-Cache", "hit");
        res.setHeader("X-OHLCV-Source", cached.source ?? cachePrefix);
        return res.status(200).json(cached.body);
      }
      const limit = Math.max(24, Math.min(100, Number(req.query?.limit ?? 48)));
      if (dex.includes("meteora") && pool) {
        try {
          const result = await meteoraOhlcv(pool, limit);
          ohlcvCache.set(cacheKey, { body: result.body, fetchedAt: Date.now(), source: result.source });
          res.setHeader("Cache-Control", `s-maxage=${Math.round(cacheTtl / 1000)}, stale-while-revalidate=${Math.round(cacheTtl * 2 / 1000)}`);
          res.setHeader("X-OHLCV-Source", result.source);
          return res.status(200).json(result.body);
        } catch (error) {
          console.warn("Meteora native 15m candle request failed", pool, error);
        }
      }
      if (allowCodex && codexKey) {
        try {
          const result = await codexOhlcv(pool, token, codexKey, limit);
          ohlcvCache.set(cacheKey, { body: result.body, fetchedAt: Date.now(), source: result.source });
          res.setHeader("Cache-Control", `s-maxage=${Math.round(cacheTtl / 1000)}, stale-while-revalidate=${Math.round(cacheTtl * 2 / 1000)}`);
          res.setHeader("X-OHLCV-Source", result.source);
          return res.status(200).json(result.body);
        } catch (error) {
          console.warn("Codex 15m candle request failed", pool || token, error);
        }
      }
      if (dexPaprikaKey) {
        try {
          if (!pool) throw new Error("dexpaprika requires a pool address");
          const body = await dexPaprikaOhlcv(pool, dexPaprikaKey, limit);
          ohlcvCache.set(cacheKey, { body, fetchedAt: Date.now(), source: "dexpaprika" });
          res.setHeader("Cache-Control", `s-maxage=${Math.round(cacheTtl / 1000)}, stale-while-revalidate=${Math.round(cacheTtl * 2 / 1000)}`);
          res.setHeader("X-OHLCV-Source", "dexpaprika");
          return res.status(200).json(body);
        } catch (error) {
          console.warn("DexPaprika 15m candle request failed", pool || token, error);
        }
      }
      let geckoPool = pool;
      if (!geckoPool && token) {
        try { geckoPool = await geckoPoolForToken(token); } catch (error) { console.warn("Gecko token-to-pool lookup failed", token, error); }
      }
      if (!geckoPool) return res.status(404).json({ error: "pool_not_found_for_token" });
      const url = `${GECKO_OHLCV}/${encodeURIComponent(geckoPool)}/ohlcv/minute?aggregate=15&limit=${limit}`;
      const upstream = await withTimeout(url, { headers: { accept: "application/json" } }, 20000);
      const body = await upstream.text();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      if (upstream.ok) {
        try { ohlcvCache.set(cacheKey, { body: JSON.parse(body), fetchedAt: Date.now(), source: "gecko" }); } catch { /* Preserve the upstream response if it is not JSON. */ }
        res.setHeader("Cache-Control", `s-maxage=${Math.round(cacheTtl / 1000)}, stale-while-revalidate=${Math.round(cacheTtl * 2 / 1000)}`);
        res.setHeader("X-OHLCV-Source", "gecko");
      }
      if (upstream.status === 429 && cached?.body) {
        res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=300");
        res.setHeader("X-OHLCV-Cache", "stale");
        return res.status(200).json(cached.body);
      }
      return res.status(upstream.status).send(body);
    }
    if (kind === "wallet-cluster") {
      const address = String(req.query?.address ?? "").trim();
      const chain = String(req.query?.chain ?? "solana").trim().toLowerCase();
      const scanLimit = Math.max(10, Math.min(100, Number(req.query?.limit ?? 60)));
      if (chain !== "solana") return res.status(200).json({ status: "UNAVAILABLE", source: "Public RPC history scan is currently Solana-only", address, chain, relatedWallets: [], note: "EVM and Robinhood links require indexed Transfer logs or trace history; same-address chain reuse remains visible in the KOL evidence file." });
      if (!isSolanaAddress(address)) return res.status(400).json({ error: "invalid_solana_address" });
      return res.status(200).json(await walletCluster(address, scanLimit));
    }
    if (kind === "wallet-clusters") {
      const address = String(req.query?.address ?? "").trim();
      const chain = String(req.query?.chain ?? "solana").trim().toLowerCase();
      if (chain === "solana" && !isSolanaAddress(address)) return res.status(400).json({ error: "invalid_solana_address" });
      if (chain !== "solana" && !/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ error: "invalid_evm_address" });
      return res.status(200).json(persistedWalletCluster(address, chain));
    }
    if (kind === "wallet-graph") {
      const handle = String(req.query?.handle ?? "").trim().slice(0, 128);
      const address = String(req.query?.address ?? "").trim();
      const chain = String(req.query?.chain ?? "").trim().toLowerCase();
      if (address && !isSolanaAddress(address) && !/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ error: "invalid_wallet_address" });
      return res.status(200).json(persistedWalletGraph(handle, address, chain));
    }
    if (kind === "wallets") {
      const pool = String(req.query?.pool ?? "");
      const baseMint = String(req.query?.base ?? "");
      const limit = Math.max(3, Math.min(20, Number(req.query?.limit ?? 12)));
      const scanLimit = Math.max(limit, Math.min(100, Number(req.query?.scan ?? 50)));
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(pool) || !/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(baseMint)) return res.status(400).json({ error: "invalid_pool_or_mint" });
      return res.status(200).json(await walletSignal(pool, baseMint, limit, scanLimit));
    }
    if (kind === "nansen") {
      const mint = String(req.query?.mint ?? "");
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(mint)) return res.status(400).json({ error: "invalid_mint" });
      return res.status(200).json(await nansenSignal(mint));
    }
    if (kind === "token") {
      const mint = String(req.query?.mint ?? "");
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(mint)) return res.status(400).json({ error: "invalid_mint" });
      return res.status(200).json(await tokenSignal(mint));
    }
    if (kind === "kol") {
      const symbol = String(req.query?.symbol ?? "").trim().slice(0, 64);
      const mint = String(req.query?.mint ?? "").trim();
      if (mint && !/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(mint)) return res.status(400).json({ error: "invalid_mint" });
      return res.status(200).json(await kolSignal(symbol, mint));
    }
    if (kind === "kolfeed") {
      const snapshot = await madeOnSolFeed();
      const apiKey = String(process.env.MADEONSOL_API_KEY ?? "").trim();
      return res.status(200).json({
        status: "LIVE",
        source: apiKey ? "MadeOnSol KOL feed · configured key" : "MadeOnSol KOL feed · public demo · 5m delayed",
        trades: snapshot.trades.slice(0, 100),
        delaySeconds: snapshot.delaySeconds,
        asOf: snapshot.asOf,
      });
    }
    if (kind === "xfeed") {
      const rawHandles = String(req.query?.handles ?? req.query?.handle ?? "").split(/[;,\s]+/).map(safeXHandle).filter(isSafeXHandle).slice(0, 10);
      return res.status(200).json(await xRecentFeed(rawHandles));
    }
    return res.status(400).json({ error: "unknown_kind" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upstream_unavailable";
    return res.status(502).json({ error: "upstream_unavailable", message });
  }
}

