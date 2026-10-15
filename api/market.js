const GECKO_OHLCV = "https://api.geckoterminal.com/api/v2/networks/solana/pools";

const withTimeout = async (url, init = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
    if (kind === "feed") {
      const term = String(req.query?.q ?? "SOL").trim().slice(0, 24);
      const upstream = await withTimeout(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(term)}`);
      const body = await upstream.text();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(upstream.status).send(body);
    }
    if (kind === "ohlcv") {
      const pool = String(req.query?.pool ?? "");
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(pool)) return res.status(400).json({ error: "invalid_pool" });
      const url = `${GECKO_OHLCV}/${encodeURIComponent(pool)}/ohlcv/minute?aggregate=15&limit=100`;
      const upstream = await withTimeout(url, { headers: { accept: "application/json" } });
      const body = await upstream.text();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(upstream.status).send(body);
    }
    return res.status(400).json({ error: "unknown_kind" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upstream_unavailable";
    return res.status(502).json({ error: "upstream_unavailable", message });
  }
}

