const DEX_SEARCH = "https://api.dexscreener.com/latest/dex/search";
const DEX_TOKENS = "https://api.dexscreener.com/tokens/v1/solana";
const OCULA_FEED = "https://vwpzmuprmqwqwshqiyhl.supabase.co/functions/v1/codex-brewing";

const withTimeout = async (url, init = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

let feedCache;
let feedInFlight;

const oculaRows = async () => {
  const buckets = ["new", "brewing", "mid", "all"];
  const payloads = await Promise.all(buckets.map(async (ageBucket) => {
    try {
      const params = new URLSearchParams({ launchpad: "all", limit: "100", chain: "solana", ageBucket });
      const response = await withTimeout(`${OCULA_FEED}?${params.toString()}`, { headers: { accept: "application/json" } }, 15000);
      if (!response.ok) return [];
      const payload = await response.json().catch(() => ({}));
      return Array.isArray(payload?.tokens) ? payload.tokens : [];
    } catch {
      return [];
    }
  }));
  return payloads.flat();
};

const fetchPairs = async (term) => {
  const response = await withTimeout(`${DEX_SEARCH}?q=${encodeURIComponent(term)}`, { headers: { accept: "application/json" } }, 12000);
  if (!response.ok) throw new Error(`dexscreener search (${response.status})`);
  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload?.pairs) ? payload.pairs : [];
};

const fetchTokenPairs = async (addresses) => {
  const chunks = Array.from({ length: Math.ceil(addresses.length / 30) }, (_, index) => addresses.slice(index * 30, index * 30 + 30));
  const payloads = await Promise.all(chunks.map(async (chunk) => {
    if (!chunk.length) return [];
    try {
      const response = await withTimeout(`${DEX_TOKENS}/${chunk.join(",")}`, { headers: { accept: "application/json" } }, 15000);
      if (!response.ok) return [];
      const payload = await response.json().catch(() => []);
      return Array.isArray(payload) ? payload : [];
    } catch {
      return [];
    }
  }));
  return payloads.flat();
};

const buildFeed = async () => {
  const [searchPairs, rows] = await Promise.all([
    Promise.all([fetchPairs("SOL"), fetchPairs("USDC")]),
    oculaRows(),
  ]);
  const byToken = new Map();
  rows.forEach((row) => {
    const address = String(row?.token?.address ?? "").trim();
    if (address) byToken.set(address.toLowerCase(), row);
  });
  const addresses = [...byToken.keys()].slice(0, 100);
  const expanded = await fetchTokenPairs(addresses);
  const unique = new Map();
  [...searchPairs.flat(), ...expanded].filter((pair) => pair?.chainId === "solana").forEach((pair) => {
    const pairAddress = String(pair?.pairAddress ?? "");
    if (!pairAddress || unique.has(pairAddress)) return;
    const tokenAddress = String(pair?.baseToken?.address ?? "").toLowerCase();
    const ocula = byToken.get(tokenAddress);
    unique.set(pairAddress, ocula ? { ...pair, ocula } : pair);
  });
  const pairs = [...unique.values()].sort((a, b) => {
    const liquidity = (pair) => Number(pair?.liquidity?.usd ?? 0);
    const volume = (pair) => Number(pair?.volume?.h24 ?? 0);
    return liquidity(b) + volume(b) - liquidity(a) - volume(a);
  }).slice(0, 90);
  return { status: "LIVE", source: "Server feed · Dexscreener + Ocula", pairs, fetchedAt: new Date().toISOString() };
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const now = Date.now();
  if (feedCache && now - feedCache.fetchedAt < 15_000) {
    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=60");
    res.setHeader("X-Feed-Cache", "hit");
    return res.status(200).json(feedCache.body);
  }
  if (!feedInFlight) {
    feedInFlight = buildFeed().then((body) => { feedCache = { body, fetchedAt: Date.now() }; return body; }).finally(() => { feedInFlight = undefined; });
  }
  try {
    const body = await feedInFlight;
    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=60");
    res.setHeader("X-Feed-Cache", "miss");
    return res.status(200).json(body);
  } catch (error) {
    return res.status(502).json({ error: "feed_unavailable", message: error instanceof Error ? error.message : "feed_unavailable" });
  }
}
