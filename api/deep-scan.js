const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,50}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const EVM_POOL = /^0x[0-9a-fA-F]{40,128}$/;
const CHAIN_CONFIG = {
  solana: { label: "Solana", token: SOLANA_ADDRESS, pool: SOLANA_ADDRESS, indexedWallets: true, tokenSafety: true },
  ethereum: { label: "Ethereum", token: EVM_ADDRESS, pool: EVM_POOL, indexedWallets: false, tokenSafety: false },
  base: { label: "Base", token: EVM_ADDRESS, pool: EVM_POOL, indexedWallets: false, tokenSafety: false },
  robinhood: { label: "Robinhood", token: EVM_ADDRESS, pool: EVM_POOL, indexedWallets: false, tokenSafety: false },
};
const DEEP_CACHE_TTL = 45_000;
const deepCache = new Map();
const deepInFlight = new Map();
const usageEvents = [];
let activeScans = 0;
const scanQueue = [];

const withTimeout = async (url, init = {}, timeoutMs = 25000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const originFor = (req) => {
  const protocol = String(req.headers?.["x-forwarded-proto"] ?? "https").split(",")[0];
  const host = String(req.headers?.host ?? process.env.VERCEL_URL ?? "lp-screener-ivory.vercel.app");
  return `${protocol}://${host}`;
};

const runWithLimit = (task) => new Promise((resolve, reject) => {
  scanQueue.push({ task, resolve, reject });
  const drain = () => {
    while (activeScans < 3 && scanQueue.length) {
      const item = scanQueue.shift();
      activeScans += 1;
      Promise.resolve().then(item.task).then(item.resolve, item.reject).finally(() => { activeScans -= 1; drain(); });
    }
  };
  drain();
});

const recordUsage = (source) => {
  const now = Date.now();
  usageEvents.push({ at: now, source });
  while (usageEvents.length && now - usageEvents[0].at > 60_000) usageEvents.shift();
};

const usageSnapshot = () => {
  const now = Date.now();
  while (usageEvents.length && now - usageEvents[0].at > 60_000) usageEvents.shift();
  return {
    monthlyBudget: 100_000,
    creditsUsedEstimate: usageEvents.length,
    requestsLastMinute: usageEvents.length,
    rateLimitPerMinute: 30,
    source: "server-instance estimate",
    lastProvider: usageEvents.at(-1)?.source ?? "none",
  };
};

const marketUrl = (req, kind, params) => {
  const url = new URL(`${originFor(req)}/api/market`);
  url.search = new URLSearchParams({ kind, ...params }).toString();
  return url.toString();
};

const callMarket = async (req, kind, params) => {
  const response = await withTimeout(marketUrl(req, kind, params), { headers: { accept: "application/json" } }, 30000);
  const source = response.headers.get("x-ohlcv-source") ?? "";
  if (kind === "ohlcv" && /dexpaprika/i.test(source)) recordUsage(source);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body?.error ?? `${kind} (${response.status})`));
  return { body, source };
};

const parseRows = (body) => {
  const rows = body?.data?.attributes?.ohlcv_list;
  return Array.isArray(rows) ? rows : [];
};

const choosePair = (payload, requestedToken, chain) => {
  const rows = Array.isArray(payload?.pairs) ? payload.pairs : [];
  return rows.filter((row) => String(row?.baseToken?.address ?? "").toLowerCase() === requestedToken.toLowerCase() && (!chain || row?.chainId === chain))
    .sort((a, b) => Number(b?.liquidity?.usd ?? 0) - Number(a?.liquidity?.usd ?? 0) || Number(b?.volume?.h24 ?? 0) - Number(a?.volume?.h24 ?? 0))[0];
};

const performDeepScan = async (req, token, requestedPool, chain) => {
  const scan = await callMarket(req, "scan", { token, chain });
  const pair = requestedPool
    ? (scan.body?.pairs ?? []).find((row) => String(row?.pairAddress ?? "") === requestedPool && row?.chainId === chain) ?? choosePair(scan.body, token, chain)
    : choosePair(scan.body, token, chain);
  if (!pair) throw new Error(`No indexed ${CHAIN_CONFIG[chain]?.label ?? chain} pool was found for that token.`);
  const pool = String(pair.pairAddress ?? "");
  const symbol = String(pair?.baseToken?.symbol ?? token).slice(0, 64);
  const isSolana = chain === "solana";
  const [ohlcv, wallet, safety, kol] = await Promise.allSettled([
    callMarket(req, "ohlcv", { pool, token, chain, dex: String(pair.dexId ?? ""), codex: "0", timeframe: "15m", limit: "48" }),
    isSolana ? callMarket(req, "wallets", { pool, base: token, chain, limit: "12", scan: "50" }) : Promise.resolve({ body: { status: "UNAVAILABLE", source: `${CHAIN_CONFIG[chain]?.label ?? chain} wallet indexing is on-demand only` }, source: "chain-indexer-unavailable" }),
    isSolana ? callMarket(req, "token", { mint: token, chain }) : Promise.resolve({ body: { status: "UNAVAILABLE", source: `${CHAIN_CONFIG[chain]?.label ?? chain} token safety adapter is not configured` }, source: "chain-safety-unavailable" }),
    callMarket(req, "kol", { symbol, mint: token, chain }),
  ]);
  const payload = {
    status: "LIVE",
    chain,
    source: "Server deep scan · bounded provider fan-out",
    capturedAt: new Date().toISOString(),
    pair,
    candles: ohlcv.status === "fulfilled" ? parseRows(ohlcv.value.body) : [],
    candleSource: ohlcv.status === "fulfilled" ? ohlcv.value.source : "unavailable",
    wallet: wallet.status === "fulfilled" ? wallet.value.body : { status: "UNAVAILABLE", source: wallet.reason?.message ?? "wallet scan unavailable" },
    token: safety.status === "fulfilled" ? safety.value.body : { status: "UNAVAILABLE", source: safety.reason?.message ?? "token safety unavailable" },
    kol: kol.status === "fulfilled" ? kol.value.body : { status: "UNAVAILABLE", source: kol.reason?.message ?? "KOL scan unavailable" },
    usage: usageSnapshot(),
  };
  const required = isSolana ? [payload.candles.length >= 2, payload.wallet?.status === "LIVE", payload.token?.status === "LIVE", payload.kol?.status === "LIVE"] : [payload.candles.length >= 2, payload.kol?.status === "LIVE"];
  payload.status = required.every(Boolean) ? "LIVE" : "PARTIAL";
  return payload;
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const token = String(req.query?.token ?? "").trim();
  const requestedPool = String(req.query?.pool ?? "").trim();
  const requestedChain = String(req.query?.chain ?? "").trim().toLowerCase();
  const chain = requestedChain || (EVM_ADDRESS.test(token) ? "ethereum" : "solana");
  const config = CHAIN_CONFIG[chain];
  if (!config) return res.status(400).json({ error: "unsupported_chain", chain, availableChains: Object.keys(CHAIN_CONFIG) });
  if (!config.token.test(token)) return res.status(400).json({ error: chain === "solana" ? "invalid_solana_token" : "invalid_evm_token", chain });
  if (requestedPool && !config.pool.test(requestedPool)) return res.status(400).json({ error: "invalid_pool", chain });
  const key = `${chain}:${token}:${requestedPool}`;
  const cached = deepCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < DEEP_CACHE_TTL) {
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=90");
    res.setHeader("X-Deep-Scan-Cache", "hit");
    return res.status(200).json(cached.body);
  }
  if (!deepInFlight.has(key)) {
    deepInFlight.set(key, runWithLimit(() => performDeepScan(req, token, requestedPool, chain)).then((body) => { deepCache.set(key, { body, fetchedAt: Date.now() }); return body; }).finally(() => deepInFlight.delete(key)));
  }
  try {
    const body = await deepInFlight.get(key);
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=90");
    res.setHeader("X-Deep-Scan-Cache", "miss");
    return res.status(200).json(body);
  } catch (error) {
    return res.status(502).json({ error: "deep_scan_unavailable", message: error instanceof Error ? error.message : "deep_scan_unavailable", usage: usageSnapshot() });
  }
}
