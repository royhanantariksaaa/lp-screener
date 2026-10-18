const DEX_SEARCH = "https://api.dexscreener.com/latest/dex/search";
const DEX_TOKENS = "https://api.dexscreener.com/tokens/v1";
const DEXPAPRIKA_API = "https://api.dexpaprika.com";
const OCULA_FEED = "https://vwpzmuprmqwqwshqiyhl.supabase.co/functions/v1/codex-brewing";
const PAGE_SIZE_DEFAULT = 40;
const PAGE_SIZE_MAX = 50;
const CHAIN_CONFIG = {
  solana: { search: ["SOL", "USDC"], dexChain: "solana", ocula: true },
  ethereum: { search: ["ETH", "USDC", "USDT", "WETH", "DAI", "WBTC", "LINK", "UNI", "AAVE", "MKR", "TOSHI", "BRETT", "DEGEN"], dexChain: "ethereum", ocula: false },
  base: { search: ["ETH", "USDC", "USDT", "WETH", "DAI", "AERO", "BRETT", "DEGEN"], dexChain: "base", ocula: false },
  robinhood: { search: ["ETH", "USDC", "USDT", "WETH", "DAI", "MKR", "TOSHI", "DEGEN"], dexChain: "robinhood", ocula: false },
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
const dexPaprikaStatsCache = new Map();

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

const numberFrom = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
};

const tokenAddressFrom = (token) => {
  const values = [token?.address, token?.id, token?.explorer];
  for (const value of values) {
    const text = String(value ?? "");
    const evmAddress = text.match(/0x[a-fA-F0-9]{40}/)?.[0];
    if (evmAddress) return evmAddress;
  }
  return String(token?.address ?? token?.id ?? "");
};

const dexPaprikaPools = async (network, maxPages = 3) => {
  const apiKey = String(process.env.DEXPAPRIKA_API_KEY ?? "").trim().replace(/^Bearer\s+/i, "");
  if (!apiKey) return undefined;
  const rows = [];
  let cursor = "";
  let hasNextPage = false;
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ order_by: "volume_usd_24h", sort: "desc", limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const response = await withTimeout(`${DEXPAPRIKA_API}/networks/${encodeURIComponent(network)}/pools/search?${params.toString()}`, { headers: { accept: "application/json", authorization: apiKey } }, 20000);
    if (!response.ok) {
      if (rows.length) break;
      throw new Error(`dexpaprika feed (${response.status})`);
    }
    const payload = await response.json().catch(() => ({}));
    const pageRows = Array.isArray(payload?.results) ? payload.results : [];
    rows.push(...pageRows);
    hasNextPage = Boolean(payload?.has_next_page && payload?.next_cursor && pageRows.length);
    if (!hasNextPage) break;
    cursor = String(payload.next_cursor);
  }
  return { rows, hasNextPage };
};

const dexPaprikaNetworkStats = async (network) => {
  const cached = dexPaprikaStatsCache.get(network);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60_000) return cached.value;
  const apiKey = String(process.env.DEXPAPRIKA_API_KEY ?? "").trim().replace(/^Bearer\s+/i, "");
  if (!apiKey) return undefined;
  const response = await withTimeout(`${DEXPAPRIKA_API}/networks`, { headers: { accept: "application/json", authorization: apiKey } }, 15000);
  if (!response.ok) throw new Error(`dexpaprika network stats (${response.status})`);
  const payload = await response.json().catch(() => []);
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.networks) ? payload.networks : [];
  const row = rows.find((item) => String(item?.id ?? item?.network ?? "").toLowerCase() === network);
  const value = row ? { poolCount: Number(row?.pools_count ?? row?.pool_count ?? row?.pools ?? 0) || undefined } : undefined;
  dexPaprikaStatsCache.set(network, { value, fetchedAt: Date.now() });
  return value;
};

const dexPaprikaPair = (row, chainId, metadata) => {
  const tokens = Array.isArray(row?.tokens) ? row.tokens : [row?.token_0, row?.token_1].filter(Boolean);
  const baseRaw = tokens[0] ?? {};
  const quoteRaw = tokens[1] ?? {};
  const pairAddress = String(row?.id ?? row?.pool_address ?? row?.address ?? "");
  if (!pairAddress) return undefined;
  const baseAddress = tokenAddressFrom(baseRaw);
  const quoteAddress = tokenAddressFrom(quoteRaw);
  const match = metadata.find((pair) => String(pair?.pairAddress ?? "") === pairAddress)
    ?? metadata.find((pair) => {
      const pairBase = String(pair?.baseToken?.address ?? "").toLowerCase();
      const pairQuote = String(pair?.quoteToken?.address ?? "").toLowerCase();
      const base = baseAddress.toLowerCase();
      const quote = quoteAddress.toLowerCase();
      return (pairBase === base && pairQuote === quote) || (pairBase === quote && pairQuote === base);
    });
  const createdAt = row?.created_at ?? row?.createdAt ?? row?.creation_date;
  const createdMs = typeof createdAt === "number" ? (createdAt < 10_000_000_000 ? createdAt * 1000 : createdAt) : Date.parse(String(createdAt ?? ""));
  return {
    ...(match ?? {}),
    chainId,
    pairAddress,
    dexId: String(row?.dex_id ?? row?.dex_name ?? row?.dex ?? match?.dexId ?? "DEX"),
    baseToken: match?.baseToken ?? { address: baseAddress, symbol: String(baseRaw?.symbol ?? baseRaw?.ticker ?? "TOKEN"), name: String(baseRaw?.name ?? "") },
    quoteToken: match?.quoteToken ?? { address: quoteAddress, symbol: String(quoteRaw?.symbol ?? quoteRaw?.ticker ?? "USD"), name: String(quoteRaw?.name ?? "") },
    priceUsd: numberFrom(row?.price_usd, row?.priceUsd, match?.priceUsd),
    marketCap: numberFrom(row?.market_cap_usd, row?.marketCap, row?.fdv_usd, match?.marketCap),
    fdv: numberFrom(row?.fdv_usd, row?.fdv, match?.fdv),
    liquidity: { usd: numberFrom(row?.liquidity_usd, row?.liquidity?.usd, match?.liquidity?.usd) },
    volume: { h24: numberFrom(row?.volume_usd_24h, row?.volume?.h24, match?.volume?.h24) },
    priceChange: { h24: numberFrom(row?.price_change_percentage_24h, row?.priceChange?.h24, match?.priceChange?.h24) },
    pairCreatedAt: Number.isFinite(createdMs) && createdMs > 0 ? createdMs : match?.pairCreatedAt,
    url: match?.url ?? `https://dexscreener.com/${chainId}/${pairAddress}`,
  };
};

const buildFeed = async (chain) => {
  const config = CHAIN_CONFIG[chain] ?? CHAIN_CONFIG.solana;
  if (!config.ocula) {
    try {
      const paprika = await dexPaprikaPools(config.dexChain);
      if (paprika?.rows?.length) {
        const addresses = [...new Set(paprika.rows.flatMap((row) => (Array.isArray(row?.tokens) ? row.tokens : [row?.token_0, row?.token_1].filter(Boolean)).map(tokenAddressFrom).map((address) => String(address).trim()).filter(Boolean)))].slice(0, 150);
        const metadata = await fetchTokenPairs(config.dexChain, addresses);
        const pairs = paprika.rows.map((row) => dexPaprikaPair(row, config.dexChain, metadata)).filter(Boolean);
        const stats = await dexPaprikaNetworkStats(config.dexChain).catch(() => undefined);
        return { status: "LIVE", source: `Server feed · DexPaprika network pools + Dexscreener metadata · ${chain}`, chain, pairs, fetchedAt: new Date().toISOString(), discovery: "network-pool-search", discoveryHasMore: paprika.hasNextPage, totalAvailable: stats?.poolCount };
      }
    } catch {
      // Keep the public Dexscreener search fallback when the optional network index is unavailable.
    }
  }
  const [searchPairs, ocula] = await Promise.all([
    Promise.all(config.search.map((term) => fetchPairs(term, config.dexChain).catch(() => []))),
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
