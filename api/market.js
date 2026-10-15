const GECKO_OHLCV = "https://api.geckoterminal.com/api/v2/networks/solana/pools";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const LUNARCRUSH_API = "https://lunarcrush.com/api4";

const withTimeout = async (url, init = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const rpc = async (method, params, id = 1) => {
  const response = await withTimeout(SOLANA_RPC, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  }, 15000);
  if (!response.ok) throw new Error(`solana rpc (${response.status})`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "solana rpc error");
  return payload.result;
};

const rpcBatch = async (requests) => {
  const response = await withTimeout(SOLANA_RPC, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(requests),
  }, 20000);
  if (!response.ok) throw new Error(`solana rpc batch (${response.status})`);
  return response.json();
};

const walletSignal = async (pool, baseMint, limit) => {
  const signatures = await rpc("getSignaturesForAddress", [pool, { limit }]);
  const usable = (signatures ?? []).filter((item) => !item.err && item.signature);
  if (!usable.length) return { status: "LIVE", source: "Solana RPC · no recent swaps", smartWallets: 0, walletFlow: "MIXED", walletEvents: 0 };
  const requests = usable.map((item, index) => ({ jsonrpc: "2.0", id: index + 1, method: "getTransaction", params: [item.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }] }));
  const transactions = await rpcBatch(requests);
  const wallets = new Map();
  for (const response of transactions) {
    const transaction = response?.result;
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
  return { status: "LIVE", source: "Solana RPC · recent pool traders", smartWallets: wallets.size, walletFlow, walletEvents: totals.events, walletAddresses: [...wallets.entries()].sort((a, b) => b[1].events - a[1].events).slice(0, 3).map(([address]) => address) };
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

const ageLabel = (timestamp) => {
  const seconds = Number(timestamp ?? 0);
  if (!seconds) return "—";
  const minutes = Math.max(0, Math.round((Date.now() / 1000 - seconds) / 60));
  return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
};

const kolSignal = async (symbol) => {
  const apiKey = String(process.env.LUNARCRUSH_API_KEY ?? "").trim();
  if (!apiKey) return { status: "UNAVAILABLE", source: "LunarCrush key required", kolMentions: 0, kolRecency: "—", kolCreators: 0, kolPosts: 0 };
  const topic = lunarTopic(symbol);
  if (!topic) return { status: "UNAVAILABLE", source: "LunarCrush topic unavailable", kolMentions: 0, kolRecency: "—", kolCreators: 0, kolPosts: 0 };
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
  return {
    status: "LIVE",
    source: "LunarCrush API · 24h topic + creators",
    kolMentions: Math.max(0, mentions),
    kolRecency: ageLabel(generated),
    kolCreators: creatorCount,
    kolPosts: Math.max(0, mentions),
    kolTrend: typeof data.trend === "string" ? data.trend.toUpperCase() : undefined,
    kolSentiment: Number(data.types_sentiment?.tweet ?? data.types_sentiment?.["youtube-video"] ?? 0) || undefined,
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
    if (kind === "wallets") {
      const pool = String(req.query?.pool ?? "");
      const baseMint = String(req.query?.base ?? "");
      const limit = Math.max(3, Math.min(8, Number(req.query?.limit ?? 6)));
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(pool) || !/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(baseMint)) return res.status(400).json({ error: "invalid_pool_or_mint" });
      return res.status(200).json(await walletSignal(pool, baseMint, limit));
    }
    if (kind === "kol") {
      const symbol = String(req.query?.symbol ?? "").trim().slice(0, 64);
      return res.status(200).json(await kolSignal(symbol));
    }
    return res.status(400).json({ error: "unknown_kind" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upstream_unavailable";
    return res.status(502).json({ error: "upstream_unavailable", message });
  }
}

