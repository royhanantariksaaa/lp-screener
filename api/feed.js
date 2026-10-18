const DEX_SEARCH = "https://api.dexscreener.com/latest/dex/search";
const DEX_TOKENS = "https://api.dexscreener.com/tokens/v1";
const OCULA_FEED = "https://vwpzmuprmqwqwshqiyhl.supabase.co/functions/v1/codex-brewing";
const PAGE_SIZE_DEFAULT = 40;
const PAGE_SIZE_MAX = 50;
const CHAIN_CONFIG = {
  solana: { search: ["SOL", "USDC"], dexChain: "solana", ocula: true },
  ethereum: { search: ["ETH", "USDC", "USDT", "WETH"], dexChain: "ethereum", ocula: false },
  base: { search: ["ETH", "USDC", "USDT", "WETH"], dexChain: "base", ocula: false },
  robinhood: { search: ["ETH", "USDC", "USDT", "WETH"], dexChain: "robinhood", ocula: false },
};
const AVAILABLE_CHAINS = Object.keys(CHAIN_CONFIG);

const withTimeout = async (url, init = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
};

const feedCache = new Map();
const feedInFlight = new Map();

const oculaRows = async () => {
  const buckets = ["new", "brewing", "mid", "all"];
  const payloads = await Promise.all(buckets.map(async (ageBucket) => {
    try {
      const params = new URLSearchParams({ launchpad: "all", limit: "100", chain: "solana", ageBucket });
      const response = await withTimeout(`${OCULA_FEED}?${params.toString()}`, { headers: { accept: "application/json" } }, 15000);
      if (!response.ok) return [];
      const payload = await response.json().catch(() => ({}));
      return Array.isArray(payload?.tokens) ? payload.tokens : [];
    } catch { return []; }
  }));
  return payloads.flat();
};

const fetchPairs = async (term, chainId) => {
  const response = await withTimeout(`${DEX_SEARCH}?q=${encodeURIComponent(term)}`, { headers: { accept: "application/json" } }, 12000);
  if (!response.ok) throw new Error(`dexscreener search (${response.status})`);
  const payload = await response.json().catch(() => ({}));
  return (Array.isArray(payload?.pairs) ? payload.pairs : []).filter((pair) => pair?.chainId === chainId);
};

const fetchTokenPairs = async (chainId, addresses) => {
  const chunks = Array.from({ length: Math.ceil(addresses.length / 30) }, (_, index) => addresses.slice(index * 30, index * 30 + 30));
  const payloads = await Promise.all(chunks.map(async (chunk) => {
    if (!chunk.length) return [];
    try {
      const response = await withTimeout(`${DEX_TOKENS}/${encodeURIComponent(chainId)}/${chunk.join(",")}`, { headers: { accept: "application/json" } }, 15000);
      if (!response.ok) return [];
      const payload = await response.json().catch(() => []);
      return Array.isArray(payload) ? payload : [];
    } catch { return []; }
  }));
  return payloads.flat();
};

const buildFeed = async (chain) => {
  const config = CHAIN_CONFIG[chain] ?? CHAIN_CONFIG.solana;
  const [searchPairs, ocula] = await Promise.all([
    Promise.all(config.search.map((term) => fetchPairs(term, config.dexChain))),
    config.ocula ? oculaRows() : Promise.resolve([]),
  ]);
  const byToken = new Map();
  ocula.forEach((row) => {
    const address = String(row?.token?.address ?? "").trim();
    if (address) byToken.set(address.toLowerCase(), { address, row });
  });
  const addresses = [...byToken.values()].map((item) => item.address).slice(0, 150);
  const expanded = config.ocula ? await fetchTokenPairs(config.dexChain, addresses) : [];
  const unique = new Map();
  [...searchPairs.flat(), ...expanded].filter((pair) => pair?.chainId === config.dexChain).forEach((pair) => {
    const pairAddress = String(pair?.pairAddress ?? "");
    if (!pairAddress || unique.has(pairAddress)) return;
    const tokenAddress = String(pair?.baseToken?.address ?? "").toLowerCase();
    const row = byToken.get(tokenAddress);
    unique.set(pairAddress, row ? { ...pair, ocula: row.row } : pair);
  });
  const pairs = [...unique.values()].sort((a, b) => {
    const liquidity = (pair) => Number(pair?.liquidity?.usd ?? 0);
    const volume = (pair) => Number(pair?.volume?.h24 ?? 0);
    return liquidity(b) + volume(b) - liquidity(a) - volume(a);
  });
  return { status: "LIVE", source: `Server feed · Dexscreener${config.ocula ? " + Ocula" : ""} · ${chain}`, chain, pairs, fetchedAt: new Date().toISOString() };
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const requestedChain = String(req.query?.chain ?? "solana").trim().toLowerCase();
  if (!CHAIN_CONFIG[requestedChain]) return res.status(400).json({ error: "unsupported_chain", chain: requestedChain, availableChains: AVAILABLE_CHAINS });
  const page = Math.max(1, Number(req.query?.page ?? 1) || 1);
  const pageSize = Math.max(10, Math.min(PAGE_SIZE_MAX, Number(req.query?.pageSize ?? PAGE_SIZE_DEFAULT) || PAGE_SIZE_DEFAULT));
  const now = Date.now();
  let cached = feedCache.get(requestedChain);
  if (!cached || now - cached.fetchedAt >= 15_000) {
    if (!feedInFlight.has(requestedChain)) feedInFlight.set(requestedChain, buildFeed(requestedChain).then((body) => { feedCache.set(requestedChain, { body, fetchedAt: Date.now() }); return body; }).finally(() => feedInFlight.delete(requestedChain)));
    try { cached = { body: await feedInFlight.get(requestedChain), fetchedAt: Date.now() }; }
    catch (error) { return res.status(502).json({ error: "feed_unavailable", message: error instanceof Error ? error.message : "feed_unavailable" }); }
  }
  const body = cached.body;
  const allPairs = Array.isArray(body?.pairs) ? body.pairs : [];
  const start = (page - 1) * pageSize;
  const pairs = allPairs.slice(start, start + pageSize);
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=60");
  res.setHeader("X-Feed-Cache", now - cached.fetchedAt < 1000 ? "miss" : "hit");
  return res.status(200).json({ ...body, pairs, page, pageSize, total: allPairs.length, hasMore: start + pairs.length < allPairs.length, nextPage: start + pairs.length < allPairs.length ? page + 1 : undefined, availableChains: AVAILABLE_CHAINS });
}
