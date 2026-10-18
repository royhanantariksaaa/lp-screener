const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,50}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const previewCache = new Map();
const previewInFlight = new Map();
const usageEvents = [];

const withTimeout = async (url, init = {}, timeoutMs = 25000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};
const originFor = (req) => `${String(req.headers?.["x-forwarded-proto"] ?? "https").split(",")[0]}://${String(req.headers?.host ?? process.env.VERCEL_URL ?? "lp-screener-ivory.vercel.app")}`;
const usageSnapshot = () => {
  const now = Date.now();
  while (usageEvents.length && now - usageEvents[0].at > 60_000) usageEvents.shift();
  return { monthlyBudget: 100_000, creditsUsedEstimate: usageEvents.length, requestsLastMinute: usageEvents.length, rateLimitPerMinute: 30, source: "server-instance estimate", lastProvider: usageEvents.at(-1)?.source ?? "none" };
};
const callPreview = async (req, pool, token, dex, chain) => {
  const url = new URL(`${originFor(req)}/api/market`);
  url.search = new URLSearchParams({ kind: "ohlcv", pool, token, chain, dex, codex: "0", timeframe: "5m", limit: "24" }).toString();
  const response = await withTimeout(url.toString(), { headers: { accept: "application/json" } }, 25000);
  const source = response.headers.get("x-ohlcv-source") ?? "unknown";
  if (/dexpaprika/i.test(source)) usageEvents.push({ at: Date.now(), source });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body?.error ?? `preview (${response.status})`));
  const rows = Array.isArray(body?.data?.attributes?.ohlcv_list) ? body.data.attributes.ohlcv_list : [];
  return { candles: rows, source, timeframe: "5m" };
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const pools = String(req.query?.pools ?? "").split(",").map((value) => value.trim()).filter((value) => SOLANA_ADDRESS.test(value) || EVM_ADDRESS.test(value)).slice(0, 12);
  const dexes = String(req.query?.dexes ?? "").split(",");
  const chains = String(req.query?.chains ?? "").split(",").map((value) => value.trim().toLowerCase());
  if (!pools.length) return res.status(400).json({ error: "pools_required" });
  const previews = {};
  await Promise.all(pools.map(async (pool, index) => {
    const chain = chains[index] || (EVM_ADDRESS.test(pool) ? "ethereum" : "solana");
    const key = `${chain}:${pool}`;
    const cached = previewCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < 90_000) { previews[pool] = cached.body; return; }
    if (!previewInFlight.has(key)) {
      const promise = callPreview(req, pool, "", dexes[index] ?? "", chain).then((body) => { previewCache.set(key, { body, fetchedAt: Date.now() }); return body; }).finally(() => previewInFlight.delete(key));
      previewInFlight.set(key, promise);
    }
    try { previews[pool] = await previewInFlight.get(key); } catch { /* A preview is optional; keep the row lightweight if it fails. */ }
  }));
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=90");
  return res.status(200).json({ status: "LIVE", source: "Server chart previews · 5m", previews, usage: usageSnapshot() });
}
