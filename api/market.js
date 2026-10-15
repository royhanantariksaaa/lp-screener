const GECKO_OHLCV = "https://api.geckoterminal.com/api/v2/networks/solana/pools";
const SOLANA_RPCS = [process.env.SOLANA_RPC_URL, "https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"].filter(Boolean);
const LUNARCRUSH_API = "https://lunarcrush.com/api4";
const DEFILLAMA_API = "https://api.llama.fi";
const BIRDEYE_API = "https://public-api.birdeye.so";
const OCULA_FEED = "https://vwpzmuprmqwqwshqiyhl.supabase.co/functions/v1/codex-brewing";
const NANSEN_API = "https://api.nansen.ai/api/v1";

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

const walletSignal = async (pool, baseMint, limit) => {
  const signatures = await rpc("getSignaturesForAddress", [pool, { limit }]);
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

const tokenSignal = async (mint) => {
  const safeRpc = (method, params) => rpc(method, params).catch(() => undefined);
  const [account, supply, largest] = await Promise.all([
    safeRpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]),
    safeRpc("getTokenSupply", [mint]),
    safeRpc("getTokenLargestAccounts", [mint]),
  ]);
  const info = account?.value?.data?.parsed?.info ?? {};
  if (!account && !supply) throw new Error("token safety rpc unavailable");
  const totalAmount = Number(supply?.value?.amount ?? info.supply ?? 0);
  const largestRows = Array.isArray(largest?.value) ? largest.value : [];
  const top10Amount = largestRows.reduce((sum, row) => sum + Number(row?.amount ?? 0), 0);
  const holderTop10Pct = totalAmount > 0 && largestRows.length ? (top10Amount / totalAmount) * 100 : undefined;
  const mintAuthority = Boolean(info.mintAuthority);
  const freezeAuthority = Boolean(info.freezeAuthority);
  const holderProfile = await birdeyeHolderProfile(mint);
  return {
    status: "LIVE",
    source: "Solana RPC · mint + holder checks",
    mintAuthority,
    freezeAuthority,
    holderTop10Pct: Number.isFinite(holderTop10Pct) ? Number(holderTop10Pct.toFixed(2)) : undefined,
    decimals: Number(info.decimals ?? supply?.value?.decimals ?? 0),
    safety: !mintAuthority && !freezeAuthority && (holderTop10Pct === undefined || holderTop10Pct <= 45) ? "PASS" : "WARN",
    holderProfileStatus: holderProfile.status,
    holderProfileSource: holderProfile.source,
    holderCount: holderProfile.holderCount,
    holderTags: holderProfile.holderTags,
  };
};

const providerHealth = () => {
  const configured = (name) => Boolean(String(process.env[name] ?? "").trim());
  return {
    providers: [
      { key: "dexscreener", label: "Dexscreener", status: "LIVE", mode: "PUBLIC", source: "Live pair discovery + token profiles" },
      { key: "geckoterminal", label: "GeckoTerminal", status: "LIVE", mode: "PUBLIC", source: "15m OHLCV candles" },
      { key: "solana-rpc", label: "Solana RPC", status: "LIVE", mode: "PUBLIC", source: "Wallet activity + mint/freeze/holder checks" },
      { key: "defillama", label: "DeFiLlama", status: "LIVE", mode: "PUBLIC", source: "Chain TVL context" },
      { key: "lunarcrush", label: "LunarCrush", status: configured("LUNARCRUSH_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "KOL", source: "Topic mentions + creators" },
      { key: "birdeye", label: "Birdeye", status: configured("BIRDEYE_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "HOLDER_PROFILE", source: "Holder behavior enrichment" },
      { key: "nansen", label: "Nansen", status: configured("NANSEN_API_KEY") ? "LIVE" : "KEY_REQUIRED", mode: "SMART_MONEY", source: "Smart-money holders + 24h flow" },
      { key: "gmgn", label: "GMGN", status: configured("GMGN_API_KEY") ? "CONFIGURED" : "KEY_REQUIRED", mode: "LINK_ONLY", source: "On-chain trader context link" },
      { key: "ocula", label: "Ocula", status: "LIVE", mode: "PUBLIC", source: "Live Solana discovery + holder/social context" },
      { key: "bubblemaps", label: "Bubblemaps", status: configured("BUBBLEMAPS_API_KEY") ? "CONFIGURED" : "KEY_REQUIRED", mode: "LINK_ONLY", source: "Holder-cluster context link" },
      { key: "kaito", label: "Kaito", status: configured("KAITO_API_KEY") ? "CONFIGURED" : "KEY_REQUIRED", mode: "LINK_ONLY", source: "Attention context link" },
      { key: "cielo", label: "Cielo", status: configured("CIELO_API_KEY") ? "CONFIGURED" : "KEY_REQUIRED", mode: "LINK_ONLY", source: "Wallet context link" },
      { key: "moby", label: "Moby", status: configured("MOBY_API_KEY") ? "CONFIGURED" : "KEY_REQUIRED", mode: "LINK_ONLY", source: "Market context link" },
      { key: "artemis", label: "Artemis", status: configured("ARTEMIS_API_KEY") ? "CONFIGURED" : "KEY_REQUIRED", mode: "LINK_ONLY", source: "Fundamental context link" },
    ],
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
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(pool)) return res.status(400).json({ error: "invalid_pool" });
      const url = `${GECKO_OHLCV}/${encodeURIComponent(pool)}/ohlcv/minute?aggregate=15&limit=100`;
      const upstream = await withTimeout(url, { headers: { accept: "application/json" } }, 20000);
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
      return res.status(200).json(await kolSignal(symbol));
    }
    return res.status(400).json({ error: "unknown_kind" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upstream_unavailable";
    return res.status(502).json({ error: "upstream_unavailable", message });
  }
}

