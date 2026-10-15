import "./styles.css";
import { analyzeCandles, derivePlaybooks, evaluateEligibility, parseOhlcv, primaryPlaybook, type Candle, type EligibilityAnalysis, type PlaybookSignal, type TechnicalAnalysis } from "./market";

type LaunchObservation = {
  status: "OBSERVED" | "WATCHING" | "VETOED" | "UNAVAILABLE";
  score: number;
  source: string;
  firstSeenAt?: number;
  lastSeenAt?: number;
  sightings: number;
  nameReuse: number;
  publicLinks: number;
  vetoes: string[];
  tells: string[];
};

type Pool = {
  id?: string; pairAddress?: string; sourceUrl?: string; name: string; symbol: string; dex: string; address: string; price: number; liquidity: number; volume24h: number; ageDays: number; fee: number; tvl: number; change24h: number; risk: "LOW" | "MEDIUM" | "HIGH";
  marketCap?: number; createdAt?: number; quoteTokenAddress?: string; smartWallets?: number; walletFlow?: "INFLOW" | "OUTFLOW" | "MIXED" | "UNAVAILABLE"; walletIntelligence?: "DEMO" | "LIVE" | "UNAVAILABLE"; walletSource?: string; walletEvents?: number; walletAddresses?: string[]; smartMoneyLabels?: string[]; kolMentions?: number; kolRecency?: string; kolCreators?: number; kolPosts?: number; kolTrend?: string; kolSentiment?: number; kolIntelligence?: "DEMO" | "LIVE" | "UNAVAILABLE"; kolSource?: string; screenScore?: number; intelligence?: "DEMO" | "LIVE" | "UNAVAILABLE"; publicLinks?: number; profileUrl?: string; discovery?: string; launch?: LaunchObservation; oculaStatus?: "LIVE" | "UNAVAILABLE"; oculaSource?: string; oculaVolume1h?: number; oculaChange1h?: number; oculaHolders?: number; oculaBuyCount1h?: number; oculaSellCount1h?: number; oculaSocialLinks?: number; oculaSocialUrls?: string[]; tokenAddress?: string; tokenStatus?: "LIVE" | "UNAVAILABLE"; tokenSource?: string; tokenSafety?: "PASS" | "WARN" | "UNAVAILABLE"; mintAuthority?: boolean; freezeAuthority?: boolean; holderTop10Pct?: number; holderProfileStatus?: "LIVE" | "UNAVAILABLE"; holderProfileSource?: string; holderCount?: number; eligibility?: EligibilityAnalysis; candles?: Candle[]; technical?: TechnicalAnalysis; playbooks?: PlaybookSignal[]; primaryPlaybook?: PlaybookSignal;
};


type ProviderStatus = {
  key: string;
  label: string;
  status: "LIVE" | "CONFIGURED" | "KEY_REQUIRED" | "LINK_ONLY";
  mode: string;
  source: string;
};

type OculaToken = {
  token?: { name?: string; symbol?: string; address?: string; createdAt?: number; socialLinks?: Record<string, string | null>; launchpad?: { launchpadName?: string; graduationPercent?: number; migrated?: boolean } };
  priceUSD?: string | number; volume24?: string | number; volume1?: string | number; marketCap?: string | number; liquidity?: string | number; holders?: number; change24?: string | number; change1?: string | number; buyCount24?: number; sellCount24?: number;
};

const demoPools: Pool[] = [
  { name: "SOL / USDC", symbol: "SOL-USDC", dex: "Meteora DLMM", address: "7xKX...9mQp", price: 184.22, liquidity: 1250000, volume24h: 3180000, ageDays: 84, fee: 0.04, tvl: 8.2, change24h: 6.4, risk: "LOW" },
  { name: "JUP / SOL", symbol: "JUP-SOL", dex: "Meteora DAMM", address: "5HnA...W2eB", price: 1.12, liquidity: 482000, volume24h: 920000, ageDays: 41, fee: 0.12, tvl: 3.7, change24h: 11.8, risk: "MEDIUM" },
  { name: "BONK / SOL", symbol: "BONK-SOL", dex: "Meteora DLMM", address: "3FqV...g1Lt", price: 0.000028, liquidity: 214000, volume24h: 681000, ageDays: 126, fee: 0.08, tvl: 2.1, change24h: -2.7, risk: "MEDIUM" },
  { name: "PYTH / USDC", symbol: "PYTH-USDC", dex: "Meteora DLMM", address: "9KcL...a8Rx", price: 0.31, liquidity: 92000, volume24h: 131000, ageDays: 19, fee: 0.20, tvl: 1.3, change24h: 21.3, risk: "HIGH" },
  { name: "WIF / SOL", symbol: "WIF-SOL", dex: "Meteora DAMM", address: "4ZtM...k5Pd", price: 0.74, liquidity: 690000, volume24h: 1540000, ageDays: 68, fee: 0.06, tvl: 4.4, change24h: 8.9, risk: "LOW" },
  { name: "mSOL / SOL", symbol: "mSOL-SOL", dex: "Meteora DLMM", address: "8cVn...q7La", price: 193.14, liquidity: 830000, volume24h: 740000, ageDays: 212, fee: 0.03, tvl: 5.6, change24h: 1.8, risk: "LOW" },
  { name: "JTO / SOL", symbol: "JTO-SOL", dex: "Meteora DAMM", address: "2eRt...p6Kc", price: 2.18, liquidity: 341000, volume24h: 412000, ageDays: 33, fee: 0.10, tvl: 2.9, change24h: -4.4, risk: "MEDIUM" },
];

const signalPools: Pool[] = demoPools.map((pool, index) => ({ ...pool, smartWallets: [12, 7, 4, 2, 9, 6, 3][index], walletFlow: ["INFLOW", "INFLOW", "OUTFLOW", "MIXED", "INFLOW", "MIXED", "OUTFLOW"][index] as Pool["walletFlow"], walletIntelligence: "DEMO", walletSource: "Demo snapshot", kolMentions: [6, 3, 1, 4, 5, 1, 0][index], kolRecency: ["18m", "42m", "3h", "1h", "27m", "5h", "—"][index], kolIntelligence: "DEMO", kolSource: "Demo snapshot", publicLinks: [2, 1, 1, 2, 2, 1, 0][index], intelligence: "DEMO" }));

const readLocalList = (key: string) => { try { return JSON.parse(localStorage.getItem(key) ?? "[]") as string[]; } catch { return []; } };
type LaunchHistoryRecord = { name: string; symbol: string; firstSeenAt: number; lastSeenAt: number; sightings: number; nameReuse: number; publicLinks: number };
type LaunchHistoryStore = { records: Record<string, LaunchHistoryRecord>; names: Record<string, number> };
const readLaunchHistory = (): LaunchHistoryStore => { try { const value = JSON.parse(localStorage.getItem("lp-screener-launch-history-v1") ?? "{}"); return { records: value.records ?? {}, names: value.names ?? {} }; } catch { return { records: {}, names: {} }; } };
const state = { pools: signalPools, trackedWallets: readLocalList("lp-screener-wallets"), trackedKols: readLocalList("lp-screener-kols"), watchlist: readLocalList("lp-screener-watchlist"), sourcesOpen: false, query: "", minLiquidity: 5000, minVolume: 2000, maxAge: 365, top10: 15, source: "Loading live feed…", list: "eligible", lab: "spot", academy: "bins", walletFilter: "all", kolFilter: "all", scoreMin: 0, selectedPool: "", compareList: [] as string[], sort: "score", loading: true, lastUpdated: 0, liveError: "", liveReady: false, chainTvl: { Solana: 0, Ethereum: 0, Base: 0 }, providers: [] as ProviderStatus[] };
const money = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
const formatTvl = (n: number) => n >= 1_000_000_000 ? `${(n / 1_000_000_000).toFixed(1)}B` : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n > 0 ? `${Math.round(n / 1000)}K` : "—";
const providerStatusLabel = (status: ProviderStatus["status"]) => status === "LIVE" ? "LIVE" : status === "CONFIGURED" ? "CONFIGURED" : status === "LINK_ONLY" ? "LINK ONLY" : "KEY REQUIRED";
const launchKey = (pool: Pool) => String(pool.tokenAddress || pool.pairAddress || poolKey(pool));
const launchNameKey = (pool: Pool) => `${pool.name} ${pool.symbol}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const launchObservationScore = (pool: Pool, record: LaunchHistoryRecord, vetoes: string[]) => {
  const liquidity = pool.liquidity >= 100_000 ? 25 : pool.liquidity >= 25_000 ? 18 : pool.liquidity >= 5_000 ? 10 : 0;
  const volume = pool.volume24h >= 100_000 ? 25 : pool.volume24h >= 10_000 ? 18 : pool.volume24h >= 2_000 ? 10 : 0;
  const age = pool.ageDays >= 2 ? 10 : pool.ageDays >= 0.5 ? 6 : 0;
  const socials = record.publicLinks >= 2 ? 15 : record.publicLinks === 1 ? 8 : 0;
  const repeat = record.sightings >= 2 ? 10 : 0;
  const uniqueName = record.nameReuse <= 1 ? 5 : 0;
  const safety = pool.tokenSafety === "PASS" ? 15 : pool.tokenSafety === "WARN" ? 4 : 0;
  return Math.max(0, Math.min(100, liquidity + volume + age + socials + repeat + uniqueName + safety - Math.min(20, vetoes.length * 4)));
};
function recordLaunchObservations(pools: Pool[]) {
  const now = Date.now();
  const store = readLaunchHistory();
  const records = { ...store.records };
  const names = { ...store.names };
  const observed = pools.map((pool) => {
    const key = launchKey(pool);
    const nameKey = launchNameKey(pool);
    const prior = records[key];
    const withinWindow = Boolean(prior && now - prior.lastSeenAt < 5 * 60_000);
    if (!prior) names[nameKey] = (names[nameKey] ?? 0) + 1;
    const record: LaunchHistoryRecord = {
      name: pool.name,
      symbol: pool.symbol,
      firstSeenAt: prior?.firstSeenAt ?? now,
      lastSeenAt: now,
      sightings: prior ? prior.sightings + (withinWindow ? 0 : 1) : 1,
      nameReuse: names[nameKey] ?? 1,
      publicLinks: pool.publicLinks ?? 0,
    };
    records[key] = record;
    const vetoes: string[] = [];
    if (pool.liquidity < 5_000) vetoes.push("Liquidity is below the $5K observation floor.");
    if (pool.volume24h < 2_000) vetoes.push("24h volume is below the $2K observation floor.");
    if (pool.ageDays < 0.5) vetoes.push("Pool is younger than 12 hours.");
    if (record.publicLinks === 0) vetoes.push("No public links were observed.");
    if (record.nameReuse > 1) vetoes.push(`Name/symbol reuse observed ${record.nameReuse} times.`);
    const tells = [
      record.publicLinks > 0 ? `${record.publicLinks} public link${record.publicLinks === 1 ? "" : "s"}` : "no public links",
      record.sightings > 1 ? `${record.sightings} sightings` : "first local sighting",
      record.nameReuse <= 1 ? "unique local name" : "reused local name",
      pool.oculaStatus === "LIVE" ? "Ocula discovery context" : "Dexscreener market context",
    ];
    const score = launchObservationScore(pool, record, vetoes);
    const status: LaunchObservation["status"] = !pool.tokenAddress ? "UNAVAILABLE" : vetoes.some((reason) => reason.includes("below the $5K") || reason.includes("below the $2K")) ? "VETOED" : score >= 70 ? "OBSERVED" : "WATCHING";
    return { ...pool, launch: { status, score, source: "Local launch observation history", firstSeenAt: record.firstSeenAt, lastSeenAt: record.lastSeenAt, sightings: record.sightings, nameReuse: record.nameReuse, publicLinks: record.publicLinks, vetoes, tells } };
  });
  try {
    const trimmed = Object.fromEntries(Object.entries(records).slice(-500));
    localStorage.setItem("lp-screener-launch-history-v1", JSON.stringify({ records: trimmed, names }));
  } catch {
    // Local observation context is optional and never blocks live screening.
  }
  return observed;
}
const scoreBreakdown = (pool: Pool) => { const liquidity = Math.min(20, Math.round(pool.liquidity / 75000)); const volume = Math.min(15, Math.round(pool.volume24h / 200000)); const age = pool.ageDays <= 180 ? Math.max(0, 10 - Math.round(pool.ageDays / 30)) : 0; const technical = pool.technical?.available ? (pool.technical.trend === "BULLISH" ? (pool.technical.fresh ? 20 : 13) : 6) : 0; const wallets = pool.walletIntelligence === "UNAVAILABLE" ? 0 : Math.min(15, (pool.smartWallets ?? 0) * 1.5); const kol = pool.kolIntelligence === "UNAVAILABLE" ? 0 : Math.min(10, (pool.kolMentions ?? 0) * 2); const risk = pool.risk === "LOW" ? 10 : pool.risk === "MEDIUM" ? 6 : 2; return { liquidity, volume, age, technical, wallets, kol, risk, total: Math.round(liquidity + volume + age + technical + wallets + kol + risk) }; };
const scoreFor = (pool: Pool) => pool.intelligence === "LIVE" && typeof pool.screenScore === "number" && pool.screenScore > 0 ? pool.screenScore : scoreBreakdown(pool).total;
const poolKey = (pool: Pool) => pool.id ?? pool.symbol;
const poolByKey = (key: string) => state.pools.find((pool) => poolKey(pool) === key);
const statusLabel = (status?: PlaybookSignal["status"]) => status === "ENTRY_NOW" ? "ENTRY NOW" : status === "ARMED_WAIT" ? "ARMED · WAIT" : status === "UPDATING" ? "UPDATING" : status === "NOT_ELIGIBLE" ? "NOT ELIGIBLE" : "MONITOR";
const statusClass = (status?: PlaybookSignal["status"]) => String(status ?? "MONITOR").toLowerCase().replace("_", "-");
const timeAgo = (timestamp?: number) => { if (!timestamp) return "—"; const minutes = Math.max(0, Math.round((Date.now() / 1000 - timestamp) / 60)); return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`; };
const formatPrice = (price: number) => price < 0.01 ? price.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") : price.toFixed(2);
const filtered = () => state.pools.filter((p) => {
  const eligibleMatch = p.eligibility?.status === "OPEN_NOW" || p.eligibility?.status === "ELIGIBLE_WAIT";
  const listMatch = state.list === "all" || state.list === "eligible" && eligibleMatch || state.list === "open" && p.eligibility?.status === "OPEN_NOW" || state.list === "trending" && p.change24h > 5 || state.list === "new" && p.ageDays < 45 || state.list === "liquidity" && p.liquidity > 500000 || state.list === "watchlist" && state.watchlist.includes(poolKey(p)) || state.list === "smart" && (p.smartWallets ?? 0) > 0 || state.list === "kol" && (p.kolMentions ?? 0) >= 3;
  const walletMatch = state.walletFilter === "all" || state.walletFilter === "active" && (p.smartWallets ?? 0) >= 5 || state.walletFilter === "inflow" && p.walletFlow === "INFLOW";
  const kolMatch = state.kolFilter === "all" || state.kolFilter === "recent" && (p.kolMentions ?? 0) >= 3 || state.kolFilter === "visible" && (p.kolMentions ?? 0) > 0;
  return listMatch && walletMatch && kolMatch && scoreFor(p) >= state.scoreMin && p.liquidity >= state.minLiquidity && p.volume24h >= state.minVolume && p.ageDays <= state.maxAge && `${p.name} ${p.dex} ${p.symbol}`.toLowerCase().includes(state.query.toLowerCase());
}).sort((a, b) => state.sort === "liquidity" ? b.liquidity - a.liquidity : state.sort === "volume" ? b.volume24h - a.volume24h : state.sort === "wallets" ? (b.smartWallets ?? 0) - (a.smartWallets ?? 0) : state.sort === "kol" ? (b.kolMentions ?? 0) - (a.kolMentions ?? 0) : scoreFor(b) - scoreFor(a));
const route = () => location.hash.replace(/^#/, "") || "home";

function header() { return `<header class="topbar"><div class="brand"><a href="#home"><span class="brand-mark">≋</span><span>METEORA <small>LP SCREENER</small></span></a></div><nav><a class="${route() === "home" ? "active" : ""}" href="#home">HOME</a><a class="${route() === "discover" ? "active" : ""}" href="#discover">DISCOVER</a><a class="${route() === "playbooks" ? "active" : ""}" href="#playbooks">PLAYBOOKS</a><a class="${route() === "academy" ? "active" : ""}" href="#academy">ACADEMY</a></nav><div class="badges"><span class="pill green">● SOLANA</span><span class="pill">READ-ONLY</span></div></header>`; }
function renderLab() { const sweep = state.lab === "curve" ? { xs: "90;180;250;300;350;420;510;90", ys: "194;190;168;74;168;190;194;194" } : state.lab === "bidask" ? { xs: "90;180;250;300;350;420;510;90", ys: "198;194;187;178;187;194;198;198" } : { xs: "90;180;250;300;350;420;510;90", ys: "182;168;151;142;132;113;118;182" }; const mode = state.lab === "curve" ? { label: "Curve", eyebrow: "CONCENTRATED RANGE", copy: "Liquidity sits close to the current price. Capital is efficient while the market stays inside the active range.", metric: "Narrow range", fee: "Higher efficiency", className: "curve-lab" } : state.lab === "bidask" ? { label: "Bid–Ask", eyebrow: "TWO-SIDED RANGE", copy: "Liquidity is staged below and above the market so the position can buy lower and sell higher.", metric: "Two-sided", fee: "Directional", className: "bidask-lab" } : { label: "Spot", eyebrow: "FULL RANGE", copy: "Liquidity follows the market across a broad range. It is simple, resilient, and less concentrated.", metric: "Wide range", fee: "Steady capture", className: "spot-lab" }; return `<section class="liquidity-lab"><div class="section-head"><div><p class="eyebrow">LIQUIDITY SHAPES · IN MOTION</p><h2>Choose the shape that matches your view.</h2><p class="subhead">The same deposit behaves differently depending on where liquidity is placed.</p></div><span class="live"><span></span> Live explainer</span></div><div class="lab-grid"><div class="lab-nav"><p class="eyebrow">PLAYBOOK ANIMATION</p><button class="lab-tab ${state.lab === "spot" ? "selected" : ""}" data-lab="spot"><span class="tab-icon spot-icon">◌</span><span><b>Spot</b><small>Price moves through</small></span><i>→</i></button><button class="lab-tab ${state.lab === "curve" ? "selected" : ""}" data-lab="curve"><span class="tab-icon curve-icon">⌁</span><span><b>Curve</b><small>Price stays around here</small></span><i>→</i></button><button class="lab-tab ${state.lab === "bidask" ? "selected" : ""}" data-lab="bidask"><span class="tab-icon bid-icon">↔</span><span><b>Bid–Ask</b><small>Buy below · sell above</small></span><i>→</i></button><div class="lab-note"><span>●</span><p>Watch the moving price marker. It shows which part of the liquidity is active.</p></div></div><div class="lab-stage ${mode.className}"><div class="stage-copy"><p class="eyebrow">${mode.eyebrow}</p><h3>${mode.label}</h3><p>${mode.copy}</p><div class="metrics"><span><small>RANGE</small><b>${mode.metric}</b></span><span><small>FEE FLOW</small><b>${mode.fee}</b></span><span><small>MODE</small><b>Read-only</b></span></div></div><div class="graph"><div class="graph-label left">LOW</div><div class="graph-label center">CURRENT PRICE</div><div class="graph-label right">HIGH</div><svg viewBox="0 0 600 250" role="img" aria-label="Animated ${mode.label} liquidity shape"><defs><linearGradient id="fill-lab" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b7ff3c" stop-opacity=".33"/><stop offset="1" stop-color="#b7ff3c" stop-opacity="0"/></linearGradient><filter id="glow-lab"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><line x1="22" y1="205" x2="578" y2="205" class="axis"/><line x1="22" y1="25" x2="22" y2="205" class="axis"/><line x1="300" y1="25" x2="300" y2="205" class="price-line"/><g class="grid-lines"><line x1="115" y1="25" x2="115" y2="205"/><line x1="207" y1="25" x2="207" y2="205"/><line x1="393" y1="25" x2="393" y2="205"/><line x1="485" y1="25" x2="485" y2="205"/></g><path class="liquidity-fill" d="${state.lab === "spot" ? "M22 189 C95 180 132 157 185 170 S280 120 335 142 S450 94 578 115 L578 205 L22 205Z" : state.lab === "curve" ? "M22 199 C165 199 221 197 257 183 C278 171 286 74 300 52 C314 74 322 171 343 183 C379 197 435 199 578 199 L578 205 L22 205Z" : "M22 200 C118 198 174 192 225 185 C250 181 272 179 300 178 C328 179 350 181 375 185 C426 192 482 198 578 200 L578 205 L22 205Z"}"/><path class="liquidity-line" d="${state.lab === "spot" ? "M22 189 C95 180 132 157 185 170 S280 120 335 142 S450 94 578 115" : state.lab === "curve" ? "M22 199 C165 199 221 197 257 183 C278 171 286 74 300 52 C314 74 322 171 343 183 C379 197 435 199 578 199" : "M22 200 C118 198 174 192 225 185 C250 181 272 179 300 178 C328 179 350 181 375 185 C426 192 482 198 578 200"}"/><circle class="price-dot" cx="300" cy="${state.lab === "curve" ? "74" : state.lab === "bidask" ? "178" : "142"}" r="7" filter="url(#glow-lab)"/><circle class="price-dot-halo" cx="300" cy="${state.lab === "curve" ? "74" : state.lab === "bidask" ? "178" : "142"}" r="17"/><circle class="moving-price" cx="90" cy="190" r="5"><animate attributeName="cx" values="${sweep.xs}" dur="7s" repeatCount="indefinite"/><animate attributeName="cy" values="${sweep.ys}" dur="7s" repeatCount="indefinite"/></circle><circle class="flow-dot" cx="22" cy="205" r="3"><animate attributeName="cx" values="22;578;22" dur="5.5s" repeatCount="indefinite"/></circle><circle class="flow-dot secondary" cx="578" cy="205" r="3"><animate attributeName="cx" values="578;22;578" dur="7s" repeatCount="indefinite"/></circle></svg><div class="axis-labels"><span>PRICE RANGE</span><span>LIQUIDITY DEPTH</span></div></div></div></div><div class="lab-footer"><span>01 / 03</span><span>Drag your mental model across the range before choosing a strategy.</span><span class="lab-progress"><i></i><i></i><i></i></span></div></section>`; }
function renderHome() { return `<main class="page-home"><section class="hero"><div><p class="eyebrow">— LIQUIDITY INTELLIGENCE · LIVE FEED</p><h1>Find the pools<br/><em>worth a closer<br/>look.</em></h1><p class="lede">Strategy-aware discovery for Meteora DLMM and DAMM experiments. Scan the market, inspect the 15m setup, then verify the pool yourself.</p><a class="primary" href="#discover">Explore candidates <span>↓</span></a><span class="muted">No wallet connection · no trade execution</span></div><div class="orbital"><div class="orbit one"></div><div class="orbit two"></div><div class="core"><b>LP</b><small>SCAN</small></div><span class="tag top">15m</span><span class="tag left">DLMM</span><span class="tag right">DAMM</span></div></section>${renderLab()}<section class="home-cards"><article><p class="eyebrow">READ-ONLY BY DESIGN</p><h3>No wallet. No execution.</h3><p>Explore candidates without signing transactions or handing over custody.</p></article><article><p class="eyebrow">START WITH A LIST</p><h3>Open the screening workspace.</h3><p>Browse all pools, new launches, trend leaders, and high-liquidity setups.</p><a href="#discover" class="text-link">Open workspace →</a></article></section></main>`; }
const listCount = (kind: string) => kind === "eligible" ? state.pools.filter((p) => p.eligibility?.status === "OPEN_NOW" || p.eligibility?.status === "ELIGIBLE_WAIT").length : kind === "open" ? state.pools.filter((p) => p.eligibility?.status === "OPEN_NOW").length : kind === "all" ? state.pools.length : kind === "trending" ? state.pools.filter((p) => p.change24h > 5).length : kind === "new" ? state.pools.filter((p) => p.ageDays < 45).length : kind === "liquidity" ? state.pools.filter((p) => p.liquidity > 500000).length : kind === "smart" ? state.pools.filter((p) => (p.smartWallets ?? 0) > 0).length : kind === "kol" ? state.pools.filter((p) => (p.kolMentions ?? 0) >= 3).length : state.watchlist.length;
function listNav() { return `<aside class="list-sidebar"><p class="eyebrow">MARKET VIEWS</p><button class="list-link ${state.list === "eligible" ? "selected" : ""}" data-list="eligible"><span>✓</span>Eligible setups <b>${listCount("eligible")}</b></button><button class="list-link ${state.list === "open" ? "selected" : ""}" data-list="open"><span>↗</span>Open now <b>${listCount("open")}</b></button><button class="list-link ${state.list === "all" ? "selected" : ""}" data-list="all"><span>◎</span>All pools <b>${listCount("all")}</b></button><button class="list-link ${state.list === "trending" ? "selected" : ""}" data-list="trending"><span>↗</span>Trending <b>${listCount("trending")}</b></button><button class="list-link ${state.list === "new" ? "selected" : ""}" data-list="new"><span>✦</span>New pools <b>${listCount("new")}</b></button><button class="list-link ${state.list === "liquidity" ? "selected" : ""}" data-list="liquidity"><span>◉</span>High liquidity <b>${listCount("liquidity")}</b></button><button class="list-link ${state.list === "smart" ? "selected" : ""}" data-list="smart"><span>♢</span>Smart wallets <b>${listCount("smart")}</b></button><button class="list-link ${state.list === "kol" ? "selected" : ""}" data-list="kol"><span>✧</span>KOL flow <b>${listCount("kol")}</b></button><button class="list-link ${state.list === "watchlist" ? "selected" : ""}" data-list="watchlist"><span>☆</span>Watchlist <b>${listCount("watchlist")}</b></button><div class="chain-block"><p class="eyebrow">CHAINS</p><div class="chain selected"><span class="chain-dot"></span>Solana <b>${formatTvl(state.chainTvl.Solana)}</b></div><div class="chain muted-row"><span class="chain-dot eth"></span>Ethereum <b>${formatTvl(state.chainTvl.Ethereum)}</b></div><div class="chain muted-row"><span class="chain-dot base"></span>Base <b>${formatTvl(state.chainTvl.Base)}</b></div></div></aside>`; }
function comparePanel() { const pools = state.compareList.map((key) => poolByKey(key)).filter(Boolean) as Pool[]; if (!pools.length) return ""; return `<div class="compare-panel"><div class="compare-head"><div><p class="eyebrow">CANDIDATE COMPARISON</p><b>${pools.length} selected</b></div><button class="evidence-close" data-clear-compare>×</button></div><div class="compare-grid">${pools.map((pool) => { const breakdown = scoreBreakdown(pool); return `<div class="compare-card"><div class="compare-title"><strong>${pool.name}</strong><button class="row-compare active" data-compare="${poolKey(pool)}">✓</button></div><small>${pool.dex} · ${pool.risk} risk</small><div><span>Score <b>${scoreFor(pool)}</b></span><span>Liquidity <b>${money(pool.liquidity)}</b></span><span>15m <b>${pool.technical?.trend ?? "—"}</b></span><span>Wallets <b>${pool.walletIntelligence === "UNAVAILABLE" ? "?" : pool.smartWallets ?? 0}</b></span><span>KOL <b>${pool.kolIntelligence === "UNAVAILABLE" ? "?" : pool.kolMentions ?? 0}</b></span></div><i class="compare-bar"><em style="width:${scoreFor(pool)}%"></em></i></div>`; }).join("")}</div></div>`; }
function miniChart(pool: Pool) {
  const candles = (pool.candles ?? []).slice(-48);
  if (candles.length < 2) return `<div class="mini-chart empty">15m candle history unavailable for this pool.</div>`;
  const values = candles.map((candle) => candle.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(max * 0.01, 1);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${96 - ((value - min) / span) * 78}`).join(" ");
  const st = pool.technical?.supertrend;
  const stY = st === undefined ? undefined : 96 - ((st - min) / span) * 78;
  return `<div class="mini-chart"><div class="mini-chart-head"><span>15M CLOSE</span><span>${candles.length} candles · ${timeAgo(pool.technical?.latestTimestamp)}</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="15 minute close and Supertrend for ${pool.name}"><polyline points="${points}" class="close-line"/>${stY === undefined || stY < 0 || stY > 100 ? "" : `<line x1="0" x2="100" y1="${stY}" y2="${stY}" class="supertrend-line"/>`}</svg><div class="mini-chart-legend"><span><i class="close-key"></i>Close</span><span><i class="st-key"></i>Supertrend</span></div></div>`;
}

function poolEvidence() {
  const pool = poolByKey(state.selectedPool);
  if (!pool) return "";
  const live = pool.intelligence === "LIVE";
  const t = pool.technical;
  const walletLabel = pool.walletIntelligence === "UNAVAILABLE" ? "Unavailable" : pool.smartMoneyLabels?.length ? `${pool.smartWallets ?? 0} smart-money holders` : `${pool.smartWallets ?? 0} recent traders`;
  const walletDetail = pool.walletIntelligence === "UNAVAILABLE" ? "Waiting for on-chain pool transaction analysis." : `${pool.walletFlow ?? "MIXED"} · ${pool.walletSource ?? "observed in the current snapshot"}${pool.smartMoneyLabels?.length ? " · " + pool.smartMoneyLabels.join(", ") : " · RPC signers are recent-trader evidence, not a smart-money label"}`;
  const publicLabel = (pool.publicLinks ?? 0) > 0 ? `${pool.publicLinks} public links` : "No profile links";
  const publicDetail = pool.oculaStatus === "LIVE" ? `Ocula discovery · ${pool.oculaHolders ? pool.oculaHolders.toLocaleString() : "—"} holders · ${pool.oculaVolume1h ? money(pool.oculaVolume1h) : "—"} 1h volume` : pool.profileUrl ? "Profile data from Dexscreener" : "Attention context only; not KOL confirmation";
  const kolLabel = pool.kolIntelligence === "UNAVAILABLE" ? "Provider required" : `${pool.kolMentions ?? 0} public mentions · ${pool.kolCreators ?? pool.kolMentions ?? 0} creators`;
  const kolDetail = pool.kolIntelligence === "UNAVAILABLE" ? "Connect LunarCrush, Nansen, or an existing intelligence endpoint." : `${pool.kolSource ?? "Provider-backed activity"} · latest ${pool.kolRecency ?? "—"} ago`;
  const breakdown = scoreBreakdown(pool);
  const score = scoreFor(pool);
  const signal = pool.primaryPlaybook;
  const eligibility = pool.eligibility;
  const launch = pool.launch;
  const launchLabel = !launch || launch.status === "UNAVAILABLE" ? "Unavailable" : `${launch.status} · ${launch.score}/100`;
  const launchDetail = !launch || launch.status === "UNAVAILABLE" ? "Local launch history has not observed this token yet." : `${launch.sightings} sighting${launch.sightings === 1 ? "" : "s"} · ${launch.publicLinks} public link${launch.publicLinks === 1 ? "" : "s"}${launch.vetoes.length ? ` · ${launch.vetoes.slice(0, 2).join(" ")}` : ` · ${launch.tells.slice(0, 2).join(" · ")}`}`;
  const safetyLabel = pool.tokenStatus !== "LIVE" ? "Pending" : pool.tokenSafety === "PASS" ? "PASS" : "WARNING";
  const leadWallet = pool.walletAddresses?.[0];
  const socialTools = (pool.oculaSocialUrls ?? []).map((href, index) => [href.includes("x.com") ? "X social" : href.includes("t.me") || href.includes("telegram") ? "Telegram" : `Ocula social ${index + 1}`, href]);
  const researchTools = [["Ocula", "https://ocula.fun/explore"], ["GMGN", pool.tokenAddress ? `https://gmgn.ai/sol/token/${pool.tokenAddress}` : "https://gmgn.ai/"], ["Birdeye", pool.tokenAddress ? `https://birdeye.so/token/${pool.tokenAddress}?chain=solana` : "https://birdeye.so/"], ["Bubblemaps", pool.tokenAddress ? `https://v2.bubblemaps.io/map?chain=solana&address=${pool.tokenAddress}&partnerId=regular` : "https://v2.bubblemaps.io/"], ["DeFiLlama", "https://defillama.com/"], ["Kaito", "https://kaito.ai/"], ["MadeOnSol", "https://madeonsol.com/"], ["Cielo", leadWallet ? `https://app.cielo.finance/profile/${leadWallet}` : "https://cielo.finance/"], ["Moby", "https://mobyagent.com/"], ["Nansen", "https://www.nansen.ai/"], ["Artemis", "https://www.artemisanalytics.com/"], ...socialTools].map(([label, href]) => `<a href="${href}" target="_blank" rel="noreferrer">${label} ↗</a>`).join("");
  return `<aside class="evidence-panel"><div class="evidence-head"><div><p class="eyebrow">CANDIDATE EVIDENCE · ${live ? "LIVE PROVIDER" : pool.intelligence === "DEMO" ? "DEMO SNAPSHOT" : "LIVE MARKET · DATA GAP"}</p><h3>${pool.name} <span class="status-pill ${statusClass(signal?.status)}">${statusLabel(signal?.status)}</span></h3><p>${pool.dex} · ${pool.address}${pool.sourceUrl ? ` · <a href="${pool.sourceUrl}" target="_blank" rel="noreferrer">source ↗</a>` : ""}</p></div><div class="evidence-actions"><button class="watch-toggle ${state.watchlist.includes(poolKey(pool)) ? "active" : ""}" data-watch="${poolKey(pool)}">${state.watchlist.includes(poolKey(pool)) ? "★ Watching" : "☆ Watch"}</button><button class="evidence-close" data-close-evidence>×</button></div></div>${miniChart(pool)}<div class="indicator-grid"><div><span>15M TREND</span><b>${t?.trend ?? "UNAVAILABLE"}</b></div><div><span>RSI(2)</span><b>${t?.rsi2 === undefined ? "—" : t.rsi2.toFixed(1)}</b></div><div><span>SUPERTREND</span><b>${t?.supertrend === undefined ? "—" : formatPrice(t.supertrend)}</b></div><div><span>BOLLINGER WIDTH</span><b>${t?.bollinger ? `${t.bollinger.widthPct.toFixed(1)}%` : "—"}</b></div><div><span>HISTORY DRAWDOWN</span><b>${t?.drawdownPct === undefined ? "—" : `${t.drawdownPct.toFixed(1)}%`}</b></div><div><span>SIGNAL DATA</span><b>${t?.available ? (t.fresh ? "FRESH" : "STALE") : "PENDING"}</b></div></div><div class="evidence-grid"><div class="evidence-score"><span>SCREEN SCORE</span><strong>${score || "—"}</strong><small>triage only · technical + social evidence</small><div class="score-track"><i style="width:${score}%"></i></div></div><div class="evidence-item"><span class="evidence-icon wallet">♢</span><div><b>Smart-wallet activity</b><strong>${walletLabel}</strong><small>${walletDetail}</small></div></div><div class="evidence-item"><span class="evidence-icon kol">✧</span><div><b>KOL / public attention</b><strong>${kolLabel}</strong><small>${kolDetail}</small></div></div><div class="evidence-item"><span class="evidence-icon public">◎</span><div><b>Public profile context</b><strong>${publicLabel}</strong><small>${publicDetail}</small></div></div><div class="evidence-item"><span class="evidence-icon launch">◌</span><div><b>Launch observation</b><strong>${launchLabel}</strong><small>${launchDetail}</small></div></div><div class="evidence-item"><span class="evidence-icon score">✓</span><div><b>Eligibility gate</b><strong>${eligibilityLabel(eligibility?.status)}</strong><small>${eligibility?.reasons?.slice(0, 3).join(" ") ?? "Waiting for live screening gates."}</small></div></div><div class="evidence-item"><span class="evidence-icon risk">◈</span><div><b>Token safety</b><strong>${safetyLabel}</strong><small>${pool.tokenSource ?? "Waiting for Solana RPC mint checks."}${pool.holderTop10Pct === undefined ? "" : " · top 10 " + pool.holderTop10Pct.toFixed(1) + "%"}${pool.holderProfileStatus === "LIVE" ? " · " + (pool.holderProfileSource ?? "Birdeye holder profile") : ""}</small></div></div><div class="evidence-item"><span class="evidence-icon risk">!</span><div><b>Research gap</b><strong>${pool.walletIntelligence === "UNAVAILABLE" || pool.kolIntelligence === "UNAVAILABLE" || pool.tokenStatus !== "LIVE" ? "Some intelligence missing" : "Verify before entry"}</strong><small>Signals do not establish safety or profitability.</small></div></div></div><div class="playbook-stack"><div class="playbook-stack-head"><span>PLAYBOOK CHECKS</span><small>${signal?.reason ?? "Waiting for indicator data."}</small></div>${(pool.playbooks ?? []).map((item) => `<div class="playbook-check"><b>${item.name}</b><span class="status-pill ${statusClass(item.status)}">${statusLabel(item.status)}</span><small>${item.reason}</small></div>`).join("")}</div><div class="evidence-bars"><span>LIQUIDITY <b>${breakdown.liquidity} / 20</b><i style="width:${breakdown.liquidity * 5}%"></i></span><span>VOLUME <b>${breakdown.volume} / 15</b><i style="width:${breakdown.volume / 15 * 100}%"></i></span><span>AGE FIT <b>${breakdown.age} / 10</b><i style="width:${breakdown.age * 10}%"></i></span><span>15M TECHNICAL <b>${breakdown.technical} / 20</b><i style="width:${breakdown.technical * 5}%"></i></span><span>WALLETS <b>${breakdown.wallets} / 15</b><i style="width:${breakdown.wallets / 15 * 100}%"></i></span><span>KOL <b>${breakdown.kol} / 10</b><i style="width:${breakdown.kol * 10}%"></i></span></div><div class="research-stack"><span>RESEARCH STACK</span><div>${researchTools}</div><small>External surfaces are read-only context; eligibility still comes from this screener's live gates.</small></div><div class="evidence-footer"><span>Read-only evidence panel · ${t?.available ? `${t.candlesCount} 15m candles` : "indicator data pending"}</span><a href="#academy">Learn how to read signals →</a></div></aside>`;
}
function renderWorkspace() {
  const pools = filtered();
  const walletReady = state.pools.some((pool) => pool.walletIntelligence === "LIVE");
  const kolReady = state.pools.some((pool) => pool.kolIntelligence === "LIVE");
  const intelligenceReady = walletReady || kolReady;
  const heading = state.list === "eligible" ? "Eligible setups" : state.list === "open" ? "Open now" : state.list === "all" ? "All pools" : state.list === "trending" ? "Trending pools" : state.list === "new" ? "New pools" : state.list === "liquidity" ? "High liquidity" : state.list === "smart" ? "Smart-wallet activity" : state.list === "kol" ? "KOL flow" : "Your watchlist";
  const feedMessage = state.loading ? "Fetching market pairs and 15m candles…" : state.liveError ? state.liveError : state.lastUpdated ? `Updated ${timeAgo(Math.floor(state.lastUpdated / 1000))}` : "Demo data loaded";
  return `<main class="workspace-page"><div class="workspace-layout">${listNav()}<section class="workspace"><div class="section-head"><div><p class="eyebrow">SOLANA · METEORA · SIGNAL STACK</p><h2>${heading}</h2><p class="subhead">Pool quality, technical setup, wallet behavior, and public attention in one read-only screen.</p></div><div class="live ${state.loading ? "is-loading" : state.liveError ? "is-error" : ""}"><span></span> ${state.source}<small>${feedMessage}</small></div></div><div class="feed-notice ${state.liveError ? "error" : state.loading ? "loading" : "ready"}"><span>${state.loading ? "◌" : state.liveError ? "!" : "✓"}</span><p>${state.loading ? "Live discovery is loading market pairs, then calculating Supertrend, Bollinger Bands, RSI(2), and playbook states." : state.liveError ? state.liveError : "This view only shows pools that pass the microcap liquidity, activity, fresh 15m trend, live intelligence, and on-chain token-safety gates. Local launch observations add repeat-sighting, social-context, and veto explanations; they never bypass the eligibility gates. Use All pools to inspect excluded candidates."}</p><b>${state.loading ? "Loading" : state.liveError ? "Fallback" : state.liveReady ? "Live ready" : "Demo"}</b></div><div class="intelligence-strip"><div><span class="intel-icon wallet">♢</span><b>Smart wallets</b><small>${walletReady ? "Live Solana RPC activity" : state.liveReady ? "Analyzing recent traders" : "Demo intelligence loaded"}</small></div><div><span class="intel-icon kol">✧</span><b>KOL flow</b><small>${kolReady ? "Provider-backed mentions" : state.liveReady ? "Provider key required" : "Public mentions only"}</small></div><div><span class="intel-icon score">◎</span><b>Screen score</b><small>Technical + social weighting</small></div><p>Wallet and KOL signals are evidence, not endorsements.</p><button class="source-toggle" id="sourcesToggle">${state.sourcesOpen ? "Hide sources" : "Configure sources"} →</button></div><div class="preset-bar"><span class="eyebrow">QUICK RECIPES</span><button class="preset-btn" data-preset="conviction">High conviction</button><button class="preset-btn" data-preset="wallet">Smart-wallet flow</button><button class="preset-btn" data-preset="attention">KOL attention</button><button class="preset-btn" data-preset="liquidity">Liquidity first</button></div>${state.sourcesOpen ? `<div class="source-panel"><div><label>SMART WALLET WATCHLIST<small>One address per line or comma-separated</small><textarea id="walletSources">${state.trackedWallets.join("\n")}</textarea></label></div><div><label>KOL WATCHLIST<small>Handles or public profile URLs</small><textarea id="kolSources">${state.trackedKols.join("\n")}</textarea></label></div><div class="provider-health"><div class="provider-health-head"><span>PROVIDER HEALTH</span><small>Server-side keys stay private; only LIVE sources can satisfy eligibility.</small></div><div class="provider-health-grid">${state.providers.length ? state.providers.map((provider) => `<div class="provider-health-row"><b>${provider.label}</b><span class="provider-badge ${provider.status.toLowerCase().replace("_", "-")}">${providerStatusLabel(provider.status)}</span><small>${provider.source}</small></div>`).join("") : "<small>Loading provider health…</small>"}</div></div><div class="provider-note"><b>LunarCrush KOL adapter</b><p>Live creator and mention data requires a server-side <code>LUNARCRUSH_API_KEY</code> in Vercel. The key is never sent to the browser.</p><a href="https://lunarcrush.com/en/developers/keys" target="_blank" rel="noreferrer">Open LunarCrush API keys ↗</a></div><div class="provider-note"><b>Nansen smart-money adapter</b><p>Labeled smart-money holders and 24h flow require a server-side <code>NANSEN_API_KEY</code>. RPC recent traders remain separate evidence.</p><a href="https://docs.nansen.ai/v1-nansen-api/api/token-god-mode/holders" target="_blank" rel="noreferrer">Open Nansen holder API docs ↗</a></div><div class="provider-note"><b>Kaito attention adapter</b><p>Live token mentions require a server-side <code>KAITO_API_KEY</code>. Kaito is used only as a provider-backed attention signal.</p><a href="https://github.com/MetaSearch-IO/kaito-mcp-server" target="_blank" rel="noreferrer">Open Kaito API bridge ↗</a></div><div class="provider-note"><b>MadeOnSol free KOL adapter</b><p>When paid social keys are absent, the screener uses MadeOnSol’s public read-only KOL feed. The documented demo feed is delayed and rate limited; add <code>MADEONSOL_API_KEY</code> for the free 200-call/day tier.</p><a href="https://madeonsol.com/api-docs" target="_blank" rel="noreferrer">Open MadeOnSol API docs ↗</a></div><div class="source-panel-footer"><span>Saved locally · sent only to the configured intelligence provider.</span><button class="refresh" id="saveSources">Save watchlists</button></div></div>` : ""}<div class="controls" id="filters"><label>LIQUIDITY MINIMUM ($)<input id="minLiquidity" type="number" value="${state.minLiquidity}" step="10000"/></label><label>24H VOLUME MINIMUM ($)<input id="minVolume" type="number" value="${state.minVolume}" step="10000"/></label><label>MAX AGE (DAYS)<input id="maxAge" type="number" value="${state.maxAge}"/></label><label>MIN SCREEN SCORE<input id="scoreMin" type="number" min="0" max="100" value="${state.scoreMin}"/></label><label>SORT BY<select id="sort"><option value="score" ${state.sort === "score" ? "selected" : ""}>Screen score</option><option value="wallets" ${state.sort === "wallets" ? "selected" : ""}>Smart wallets</option><option value="kol" ${state.sort === "kol" ? "selected" : ""}>KOL mentions</option><option value="liquidity" ${state.sort === "liquidity" ? "selected" : ""}>Liquidity</option><option value="volume" ${state.sort === "volume" ? "selected" : ""}>24h volume</option></select></label><label>WALLET SIGNAL<select id="walletFilter"><option value="all" ${state.walletFilter === "all" ? "selected" : ""}>All wallet activity</option><option value="active" ${state.walletFilter === "active" ? "selected" : ""}>Active wallets</option><option value="inflow" ${state.walletFilter === "inflow" ? "selected" : ""}>Net inflow</option></select></label><label>KOL SIGNAL<select id="kolFilter"><option value="all" ${state.kolFilter === "all" ? "selected" : ""}>All KOL activity</option><option value="recent" ${state.kolFilter === "recent" ? "selected" : ""}>3+ mentions</option><option value="visible" ${state.kolFilter === "visible" ? "selected" : ""}>Any mention</option></select></label></div><div class="toolbar"><div class="search"><span>⌕</span><input id="query" placeholder="Search pools, tokens, or venues" value="${state.query}"/></div><button class="refresh" id="refresh" ${state.loading ? "disabled" : ""}>${state.loading ? "↻ Refreshing…" : "↻ Refresh feed"}</button><span class="count">${pools.length} candidates</span></div><div class="table-wrap"><table><thead><tr><th>POOL</th><th>VENUE</th><th>PRICE</th><th>LIQUIDITY</th><th>24H VOLUME</th><th>AGE</th><th>15M SETUP</th><th>SIGNAL STACK</th><th>SCORE</th></tr></thead><tbody>${pools.map(poolRow).join("") || `<tr><td colspan="9" class="empty">${state.loading ? "Waiting for the live feed…" : "No pools match these filters."}</td></tr>`}</tbody></table></div>${comparePanel()}${poolEvidence()}<div class="screen-method"><span>SCREEN METHOD</span><p>Score combines liquidity, volume, age fit, 15m technical state, wallet activity, KOL recency, and risk. Launch observation is visible context and never bypasses eligibility. It is a triage aid—not a recommendation.</p><a href="#academy">Learn the signals →</a></div><div class="pagination"><span>Showing ${pools.length} of ${state.pools.length} pools · ${state.liveReady ? "live source" : "fallback source"}</span><div><button disabled>←</button><button class="page-current">1</button><button disabled>→</button></div></div></section></div></main>`;
}
function academyLesson() { const lessons: Record<string, { label: string; title: string; copy: string; kicker: string; points: string[] }> = { bins: { label: "01 · BINS", title: "Liquidity lives in bins.", copy: "A DLMM turns the price range into discrete containers. Bin step controls the distance between neighboring prices, so a position can be narrow, wide, or stacked.", kicker: "FOUNDATIONS", points: ["Bins hold the liquidity", "Bin step sets price spacing", "Active bins are where swaps happen"] }, shapes: { label: "02 · SHAPES", title: "Shape the position around your view.", copy: "Spot, Curve, and Bid–Ask are starting points. The shape decides where capital sits and how the position responds when price moves.", kicker: "POSITION DESIGN", points: ["Spot follows a broad range", "Curve concentrates near price", "Bid–Ask stages below and above"] }, fees: { label: "03 · FEES", title: "Volume creates the fee stream.", copy: "Fees are earned when swaps cross your active liquidity. Dynamic fees respond to volatility, so the highest headline fee is not always the best setup.", kicker: "FEE MECHANICS", points: ["Volume is the input", "Active bins capture flow", "Volatility changes fee conditions"] }, risk: { label: "04 · RISK", title: "Price can leave your range.", copy: "Fees and token appreciation must be weighed against impermanent or divergent loss. A position needs a range, an invalidation rule, and a plan to manage it.", kicker: "RISK CONTROL", points: ["Track price against range", "Compare fees with divergence", "Exit or rebalance deliberately"] }, safety: { label: "05 · SAFETY", title: "Verify before you provide.", copy: "A beautiful chart is not enough. Check the token, contract, pool age, liquidity depth, volume quality, and concentration before committing capital.", kicker: "DUE DILIGENCE", points: ["Verify the contract", "Inspect liquidity and holders", "Treat signals as research"] }, opportunities: { label: "06 · OPPORTUNITIES", title: "Read the setup, not only the APY.", copy: "A useful candidate combines usable liquidity, real volume, a believable age, a fee tier that fits volatility, and a token you can verify.", kicker: "FINDING OPPORTUNITIES", points: ["Start with liquidity and volume", "Check age, volatility, and fees", "Validate the token before entry"] }, manage: { label: "07 · MANAGE", title: "A position is a process.", copy: "After entry, the job is observation: watch active bins, collect fees, compare price with the range, then rebalance or exit when the original thesis changes.", kicker: "POSITION MANAGEMENT", points: ["Monitor active bins", "Claim and record fees", "Rebalance or exit deliberately"] }, performance: { label: "08 · PERFORMANCE", title: "Separate fees from price change.", copy: "Review fee income, inventory change, and price movement as separate lines. A green fee number does not automatically mean the position won.", kicker: "P&L REVIEW", points: ["Track fees earned", "Track inventory and divergence", "Compare the result with holding spot"] } }; return lessons[state.academy] ?? lessons.bins; }
function academyVisual() { if (state.academy === "opportunities") return `<div class="tutorial-visual opportunity-visual"><div class="radar"><span class="radar-ring r1"></span><span class="radar-ring r2"></span><span class="radar-sweep"></span><i class="radar-dot d1"></i><i class="radar-dot d2"></i><i class="radar-dot d3"></i><b>POOL<br/>FIT</b></div><div class="opportunity-score"><span>SCREENING SCORE</span><strong>78 / 100</strong><div><i style="width:78%"></i></div><small>liquidity · volume · age · safety</small></div></div>`; if (state.academy === "manage") return `<div class="tutorial-visual manage-visual"><div class="manage-loop"><div><b>WATCH</b><small>active bins</small></div><span>→</span><div><b>COLLECT</b><small>fee flow</small></div><span>→</span><div><b>ADJUST</b><small>range thesis</small></div><span>↺</span></div><div class="manage-cursor"></div><p>MANAGEMENT LOOP · REPEAT WHILE THE THESIS HOLDS</p></div>`; if (state.academy === "performance") return `<div class="tutorial-visual performance-visual"><div class="perf-legend"><span><i class="fee-key"></i>FEES</span><span><i class="inventory-key"></i>INVENTORY</span><span><i class="spot-key"></i>HOLD SPOT</span></div><svg viewBox="0 0 500 220"><line x1="30" y1="185" x2="475" y2="185" class="perf-axis"/><line x1="30" y1="30" x2="30" y2="185" class="perf-axis"/><path class="perf-fee" d="M30 177 C90 169 111 160 151 148 S219 126 250 112 S337 81 475 48"/><path class="perf-inventory" d="M30 55 C95 61 125 75 166 91 S240 118 286 136 S370 151 475 163"/><path class="perf-spot" d="M30 169 C87 152 119 142 164 132 S260 98 310 79 S402 55 475 44"/><circle cx="250" cy="112" r="6" class="perf-dot"/></svg><div class="perf-labels"><span>ENTRY</span><span>REVIEW WINDOW</span><span>NOW</span></div></div>`; if (state.academy === "risk") return `<div class="tutorial-visual risk-visual"><div class="risk-range"><span>ACTIVE RANGE</span></div><div class="risk-price"></div><div class="risk-arrow">PRICE OUT OF RANGE ↗</div><div class="visual-axis"><span>LOW</span><span>ENTRY</span><span>HIGH</span></div></div>`; if (state.academy === "fees") return `<div class="tutorial-visual fees-visual"><div class="fee-pool"><span>POOL</span><b>DLMM</b></div><div class="fee-path p1"></div><div class="fee-path p2"></div><div class="fee-path p3"></div><div class="fee-particle f1">＋</div><div class="fee-particle f2">＋</div><div class="fee-particle f3">＋</div><div class="fee-caption">SWAP FLOW → ACTIVE BINS → FEE SHARE</div></div>`; if (state.academy === "shapes") return `<div class="tutorial-visual shapes-visual"><div class="mini-shape"><small>SPOT</small><span class="shape-line spot-line"></span></div><div class="mini-shape"><small>CURVE</small><span class="shape-line curve-line"></span></div><div class="mini-shape"><small>BID–ASK</small><span class="shape-line bid-line"></span></div></div>`; if (state.academy === "safety") return `<div class="tutorial-visual safety-visual"><div class="check-row"><span>✓</span><b>CONTRACT VERIFIED</b><small>address</small></div><div class="check-row"><span>✓</span><b>LIQUIDITY DEPTH</b><small>usable</small></div><div class="check-row warn"><span>!</span><b>CONCENTRATION</b><small>inspect</small></div><div class="check-row"><span>✓</span><b>VOLUME QUALITY</b><small>active</small></div></div>`; return `<div class="tutorial-visual bins-visual"><div class="bin-price">CURRENT PRICE</div><div class="bins"><i></i><i></i><i></i><i></i><i class="active"></i><i class="active"></i><i class="active"></i><i></i><i></i><i></i><i></i><i></i></div><div class="bin-labels"><span>LOW</span><span>ACTIVE BINS</span><span>HIGH</span></div><div class="bin-step">BIN STEP <b>25 bps</b></div></div>`; }
function renderAcademy() { const lesson = academyLesson(); return `<main class="academy-page"><div class="academy-intro"><div><p class="eyebrow">LP ACADEMY · RESEARCH FIRST</p><h1>Learn the mechanics<br/><em>before you choose.</em></h1><p class="lede">A compact learning path for reading DLMM pools, designing positions, and managing risk with a clear mental model.</p></div><div class="academy-progress"><span>LEARNING PATH</span><b>${String(Object.keys({bins:1,shapes:1,fees:1,risk:1,safety:1,opportunities:1,manage:1,performance:1}).indexOf(state.academy) + 1).padStart(2, "0")} / 08</b><div><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div><div class="academy-layout"><aside class="academy-nav"><p class="eyebrow">COURSE MODULES</p><button class="academy-tab ${state.academy === "bins" ? "selected" : ""}" data-academy="bins"><span>01</span><b>Bins & bin steps</b><small>Foundations</small></button><button class="academy-tab ${state.academy === "shapes" ? "selected" : ""}" data-academy="shapes"><span>02</span><b>Liquidity shapes</b><small>Position design</small></button><button class="academy-tab ${state.academy === "fees" ? "selected" : ""}" data-academy="fees"><span>03</span><b>Fees & flow</b><small>Fee mechanics</small></button><button class="academy-tab ${state.academy === "risk" ? "selected" : ""}" data-academy="risk"><span>04</span><b>Range risk</b><small>Risk control</small></button><button class="academy-tab ${state.academy === "safety" ? "selected" : ""}" data-academy="safety"><span>05</span><b>Pool safety</b><small>Due diligence</small></button><button class="academy-tab ${state.academy === "opportunities" ? "selected" : ""}" data-academy="opportunities"><span>06</span><b>Find opportunities</b><small>Screening lens</small></button><button class="academy-tab ${state.academy === "manage" ? "selected" : ""}" data-academy="manage"><span>07</span><b>Manage positions</b><small>Ongoing process</small></button><button class="academy-tab ${state.academy === "performance" ? "selected" : ""}" data-academy="performance"><span>08</span><b>Review performance</b><small>P&amp;L review</small></button><a class="academy-source" href="https://www.lparmy.com/academy" target="_blank" rel="noreferrer">Based on public LP education ↗</a></aside><section class="lesson-card"><div class="lesson-copy"><p class="eyebrow">${lesson.kicker} · ${lesson.label}</p><h2>${lesson.title}</h2><p>${lesson.copy}</p><ul>${lesson.points.map((point) => `<li><span>✓</span>${point}</li>`).join("")}</ul><div class="lesson-actions"><a class="primary" href="#discover">Apply in screener <span>→</span></a><button class="lesson-next" data-academy-next>Next lesson →</button></div></div>${academyVisual()}</section></div><section class="academy-note"><span>READ-ONLY EDUCATION</span><p>These lessons are a research aid, not financial advice. Always verify the pool, token, range, and market conditions yourself.</p></section></main>`; }
function renderPlaybooks() { return `<main class="playbooks-page"><div class="section-head"><div><p class="eyebrow">RESEARCH PLAYBOOKS</p><h1>Start with a repeatable lens.</h1><p class="subhead">These are saved ways to read the same live market. The home animation stays available independently.</p></div></div><div class="playbook-grid"><article><span class="playbook-num">01</span><h2>Balanced discovery</h2><p>Filter for usable liquidity, active volume, reasonable age, and a moderate fee tier.</p><a href="#discover">Open list →</a></article><article><span class="playbook-num">02</span><h2>Liquidity first</h2><p>Prioritize depth and volume so the candidate can absorb real market flow.</p><a href="#discover">Open list →</a></article><article><span class="playbook-num">03</span><h2>Momentum watch</h2><p>Surface pools with positive movement while keeping the risk context visible.</p><a href="#discover">Open list →</a></article></div></main>`; }
const eligibilityLabel = (status?: EligibilityAnalysis["status"]) => status === "OPEN_NOW" ? "OPEN NOW" : status === "ELIGIBLE_WAIT" ? "ELIGIBLE · WAIT" : status === "PENDING" ? "SCREENING" : "REJECTED";
const eligibilityClass = (status?: EligibilityAnalysis["status"]) => String(status ?? "PENDING").toLowerCase().replace("_", "-");

function poolRow(p: Pool) {
  const key = poolKey(p);
  const t = p.technical;
  const signal = p.primaryPlaybook;
  const eligibility = p.eligibility?.status;
  const wallets = p.walletIntelligence === "UNAVAILABLE" ? `<span class="stack-badge unavailable">WALLET ?</span>` : `<span class="stack-badge wallet-badge">♢ ${p.smartMoneyLabels?.length ? `${p.smartWallets ?? 0} smart` : `${p.smartWallets ?? 0} traders`}</span><span class="flow-badge ${String(p.walletFlow).toLowerCase()}">${p.walletFlow}</span>`;
  const publicSignal = (p.publicLinks ?? 0) > 0 ? `<span class="stack-badge public-badge">◎ ${p.publicLinks} links</span>` : "";
  const kol = p.kolIntelligence === "UNAVAILABLE" ? `<span class="stack-badge unavailable">KOL KEY</span>` : `<span class="stack-badge kol-badge">✧ ${p.kolCreators ?? p.kolMentions ?? 0} KOL</span><small class="recency">${p.kolMentions ?? 0} mentions · ${p.kolRecency ?? "—"}</small>`;
  const technical = t?.available ? `<span class="stack-badge trend-badge ${t.trend.toLowerCase()}">15m ${t.trend}</span><small class="recency">RSI ${t.rsi2 === undefined ? "—" : t.rsi2.toFixed(1)}</small>` : `<span class="stack-badge unavailable">15m PENDING</span>`;
  const launch = p.launch && p.launch.status !== "UNAVAILABLE" ? `<span class="stack-badge launch-badge">◎ ${p.launch.status} ${p.launch.score}</span><small class="recency">${p.launch.sightings} sighting${p.launch.sightings === 1 ? "" : "s"}</small>` : "";
  const eligibilitySignal = `<span class="status-pill ${eligibilityClass(eligibility)}">${eligibilityLabel(eligibility)}</span>`;
  const safety = p.tokenSafety === "PASS" ? `<span class="stack-badge public-badge">✓ SAFETY</span>` : p.tokenSafety === "WARN" ? `<span class="stack-badge unavailable">SAFETY WARN</span>` : "";
  return `<tr class="pool-row" data-pool="${key}"><td><div class="pool-name"><strong>${p.name}</strong><button class="row-watch ${state.watchlist.includes(key) ? "active" : ""}" data-watch="${key}" title="Toggle watchlist">${state.watchlist.includes(key) ? "★" : "☆"}</button><button class="row-compare ${state.compareList.includes(key) ? "active" : ""}" data-compare="${key}" title="Compare candidate">${state.compareList.includes(key) ? "✓" : "+"}</button></div><small>${p.symbol} · ${p.address}</small></td><td>${p.dex}</td><td>$${formatPrice(p.price)}</td><td>${money(p.liquidity)}</td><td>${money(p.volume24h)}</td><td>${p.ageDays}d</td><td><div class="signal-stack">${technical}${eligibilitySignal}<span class="status-pill ${statusClass(signal?.status)}">${statusLabel(signal?.status)}</span></div></td><td><div class="signal-stack">${wallets}${kol}${safety}${publicSignal}${launch}</div></td><td><span class="screen-score ${scoreFor(p) >= 75 ? "high" : scoreFor(p) >= 55 ? "mid" : "low"}">${scoreFor(p)}</span></td></tr>`;
}
function render() { const content = route() === "discover" ? renderWorkspace() : route() === "playbooks" ? renderPlaybooks() : route() === "academy" ? renderAcademy() : renderHome(); const footerUpdated = state.lastUpdated ? timeAgo(Math.floor(state.lastUpdated / 1000)) : "waiting for feed"; document.querySelector<HTMLDivElement>("#app")!.innerHTML = `<div class="shell">${header()}${content}<footer><span>METEORA LP SCREENER · SOLANA</span><span>LAST UPDATED <b>${footerUpdated}</b></span></footer></div>`; bind(); }
function bind() { document.querySelectorAll<HTMLButtonElement>("[data-academy]").forEach((button) => button.addEventListener("click", () => { state.academy = button.dataset.academy ?? "bins"; render(); })); document.querySelector<HTMLButtonElement>("[data-academy-next]")?.addEventListener("click", () => { const order = ["bins", "shapes", "fees", "risk", "safety", "opportunities", "manage", "performance"]; state.academy = order[(order.indexOf(state.academy) + 1) % order.length]; render(); }); document.querySelectorAll<HTMLButtonElement>("[data-lab]").forEach((button) => button.addEventListener("click", () => { state.lab = button.dataset.lab ?? "spot"; render(); })); document.querySelector<HTMLInputElement>("#query")?.addEventListener("input", (e) => { state.query = (e.target as HTMLInputElement).value; render(); document.querySelector<HTMLInputElement>("#query")?.focus(); }); (["minLiquidity", "minVolume", "maxAge", "scoreMin"] as const).forEach((id) => document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("change", (e) => { state[id] = Number((e.target as HTMLInputElement).value); render(); })); document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => button.addEventListener("click", () => { const preset = button.dataset.preset; if (preset === "conviction") { state.list = "eligible"; state.scoreMin = 75; state.walletFilter = "active"; state.kolFilter = "recent"; state.sort = "score"; } if (preset === "wallet") { state.list = "smart"; state.scoreMin = 0; state.walletFilter = "inflow"; state.kolFilter = "all"; state.sort = "wallets"; } if (preset === "attention") { state.list = "kol"; state.scoreMin = 0; state.walletFilter = "all"; state.kolFilter = "recent"; state.sort = "kol"; } if (preset === "liquidity") { state.list = "liquidity"; state.scoreMin = 50; state.walletFilter = "all"; state.kolFilter = "all"; state.sort = "liquidity"; } render(); })); document.querySelector<HTMLButtonElement>("#sourcesToggle")?.addEventListener("click", () => { state.sourcesOpen = !state.sourcesOpen; render(); }); document.querySelector<HTMLButtonElement>("#saveSources")?.addEventListener("click", () => { const parse = (id: string) => (document.querySelector<HTMLTextAreaElement>(id)?.value ?? "").split(/[\n,]/).map((value) => value.trim()).filter(Boolean); state.trackedWallets = parse("#walletSources"); state.trackedKols = parse("#kolSources"); localStorage.setItem("lp-screener-wallets", JSON.stringify(state.trackedWallets)); localStorage.setItem("lp-screener-kols", JSON.stringify(state.trackedKols)); state.sourcesOpen = false; render(); }); document.querySelector<HTMLSelectElement>("#sort")?.addEventListener("change", (e) => { state.sort = (e.target as HTMLSelectElement).value; render(); }); document.querySelector<HTMLSelectElement>("#walletFilter")?.addEventListener("change", (e) => { state.walletFilter = (e.target as HTMLSelectElement).value; render(); }); document.querySelector<HTMLSelectElement>("#kolFilter")?.addEventListener("change", (e) => { state.kolFilter = (e.target as HTMLSelectElement).value; render(); }); document.querySelectorAll<HTMLButtonElement>("[data-watch]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const symbol = button.dataset.watch ?? ""; state.watchlist = state.watchlist.includes(symbol) ? state.watchlist.filter((item) => item !== symbol) : [...state.watchlist, symbol]; localStorage.setItem("lp-screener-watchlist", JSON.stringify(state.watchlist)); render(); })); document.querySelectorAll<HTMLButtonElement>("[data-compare]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const symbol = button.dataset.compare ?? ""; state.compareList = state.compareList.includes(symbol) ? state.compareList.filter((item) => item !== symbol) : [...state.compareList, symbol].slice(-4); render(); })); document.querySelector<HTMLButtonElement>("[data-clear-compare]")?.addEventListener("click", () => { state.compareList = []; render(); }); document.querySelectorAll<HTMLTableRowElement>("[data-pool]").forEach((row) => row.addEventListener("click", () => { state.selectedPool = row.dataset.pool ?? ""; render(); })); document.querySelector<HTMLButtonElement>("[data-close-evidence]")?.addEventListener("click", () => { state.selectedPool = ""; render(); }); document.querySelectorAll<HTMLButtonElement>("[data-list]").forEach((button) => button.addEventListener("click", () => { state.list = button.dataset.list ?? "all"; render(); })); document.querySelector("#refresh")?.addEventListener("click", async (e) => { const button = e.currentTarget as HTMLButtonElement; button.disabled = true; button.textContent = "↻ Refreshing…"; await loadLive(); render(); }); }
async function loadChainContext() {
  try {
    const rows = await fetchJson<Array<{ name?: string; tvl?: number }>>(liveApi("chains"), 12000);
    const valueFor = (name: string) => Number(rows.find((row) => row.name?.toLowerCase() === name.toLowerCase())?.tvl ?? 0);
    state.chainTvl = { Solana: valueFor("Solana"), Ethereum: valueFor("Ethereum"), Base: valueFor("Base") };
    render();
  } catch {
    // Chain context is optional and never affects pool eligibility.
  }
}

async function loadProviderStatus() {
  try {
    const payload = await fetchJson<{ providers?: ProviderStatus[] }>(liveApi("providers"), 12000);
    state.providers = Array.isArray(payload.providers) ? payload.providers : [];
    render();
  } catch {
    // Provider health is informative and never affects pool eligibility.
  }
}

async function loadPublicProfiles() { try { const response = await fetch("https://api.dexscreener.com/token-profiles/latest/v1"); if (!response.ok) return; const profiles = await response.json() as Array<{ chainId?: string; tokenAddress?: string; url?: string; links?: Array<unknown> }>; const byAddress = new Map(profiles.filter((item) => item.chainId === "solana" && item.tokenAddress).map((item) => [item.tokenAddress!.toLowerCase(), item])); state.pools = state.pools.map((pool) => { const profile = pool.tokenAddress ? byAddress.get(pool.tokenAddress.toLowerCase()) : undefined; return profile ? { ...pool, publicLinks: Math.max(pool.publicLinks ?? 0, profile.links?.length ?? 0), profileUrl: profile.url } : pool; }); } catch { /* Public profile enrichment is optional. */ } }
async function loadTokenSafety() {
  const ranked = [...state.pools].sort((a, b) => b.volume24h - a.volume24h || b.liquidity - a.liquidity);
  const targets = [...new Map([...ranked.filter((pool) => (pool.kolMentions ?? 0) > 0).slice(0, 4), ...ranked.slice(0, 8)].map((pool) => [poolKey(pool), pool])).values()]
    .filter((pool) => pool.tokenStatus !== "LIVE" && pool.tokenAddress).slice(0, 12);
  const results = await mapConcurrent(targets, 4, async (pool) => {
    try {
      const payload = await fetchJson<{ status?: "LIVE" | "UNAVAILABLE"; source?: string; mintAuthority?: boolean; freezeAuthority?: boolean; holderTop10Pct?: number; safety?: "PASS" | "WARN"; holderProfileStatus?: "LIVE" | "UNAVAILABLE"; holderProfileSource?: string; holderCount?: number }>(liveApi("token", { mint: pool.tokenAddress! }), 20000);
      return payload.status === "LIVE" ? { key: poolKey(pool), payload } : undefined;
    } catch (error) {
      console.warn("token safety request failed", pool.tokenAddress, error);
      return undefined;
    }
  });
  if (!results.length) return;
  const byKey = new Map(results.map((result) => [result.key, result.payload]));
  state.pools = state.pools.map((pool) => {
    const payload = byKey.get(poolKey(pool));
    return payload ? { ...pool, tokenStatus: "LIVE", tokenSource: payload.source ?? "Solana RPC · mint + holder checks", tokenSafety: payload.safety ?? "WARN", mintAuthority: payload.mintAuthority, freezeAuthority: payload.freezeAuthority, holderTop10Pct: payload.holderTop10Pct, holderProfileStatus: payload.holderProfileStatus, holderProfileSource: payload.holderProfileSource, holderCount: payload.holderCount } : pool;
  });
  refreshEligibility();
}

function refreshEligibility() {
  state.pools = state.pools.map((pool) => ({
    ...pool,
    eligibility: evaluateEligibility(
      pool,
      pool.technical,
      {
        walletLive: pool.walletIntelligence === "LIVE",
        kolLive: pool.kolIntelligence === "LIVE",
        walletEvidence: Number(pool.smartWallets ?? 0) > 0 || Number(pool.walletEvents ?? 0) > 0,
        kolEvidence: Number(pool.kolMentions ?? 0) > 0,
      },
      pool.tokenStatus === "LIVE" ? { status: "LIVE", source: pool.tokenSource, mintAuthority: pool.mintAuthority, freezeAuthority: pool.freezeAuthority, holderTop10Pct: pool.holderTop10Pct } : undefined,
    ),
  }));
  render();
}

async function loadWalletIntelligence() {
  const ranked = [...state.pools].sort((a, b) => b.volume24h - a.volume24h || b.liquidity - a.liquidity);
  const targets = [...new Map([...ranked.filter((pool) => (pool.kolMentions ?? 0) > 0).slice(0, 4), ...ranked.slice(0, 8)].map((pool) => [poolKey(pool), pool])).values()]
    .filter((pool) => pool.walletIntelligence === "UNAVAILABLE" && pool.pairAddress && pool.tokenAddress).slice(0, 12);
  const results = await mapConcurrent(targets, 3, async (pool) => {
    try {
      const payload = await fetchJson<{ status?: string; source?: string; smartWallets?: number; walletFlow?: Pool["walletFlow"]; walletEvents?: number; walletAddresses?: string[] }>(liveApi("wallets", { pool: pool.pairAddress!, base: pool.tokenAddress!, limit: "6" }), 20000);
      return payload.status === "LIVE" ? { key: poolKey(pool), payload } : undefined;
    } catch (error) {
      console.warn("wallet activity request failed", pool.pairAddress, error);
      return undefined;
    }
  });
  if (!results.length) return;
  const byKey = new Map(results.map((result) => [result.key, result.payload]));
  state.pools = state.pools.map((pool) => {
    const payload = byKey.get(poolKey(pool));
    return payload ? { ...pool, smartWallets: Number(payload.smartWallets ?? 0), walletFlow: payload.walletFlow ?? "MIXED", walletEvents: Number(payload.walletEvents ?? 0), walletAddresses: payload.walletAddresses, walletIntelligence: "LIVE", walletSource: payload.source ?? "Solana RPC · recent pool traders", intelligence: "LIVE" } : pool;
  });
  state.source = state.source.includes("Ocula") ? `${state.source} + Solana RPC` : "LIVE · Dexscreener + Solana RPC";
  refreshEligibility();
}

async function loadNansenIntelligence() {
  const ranked = [...state.pools].sort((a, b) => b.volume24h - a.volume24h || b.liquidity - a.liquidity);
  const targets = [...new Map([...ranked.filter((pool) => (pool.kolMentions ?? 0) > 0).slice(0, 4), ...ranked.slice(0, 8)].map((pool) => [poolKey(pool), pool])).values()]
    .filter((pool) => pool.tokenAddress).slice(0, 12);
  const results = await mapConcurrent(targets, 2, async (pool) => {
    try {
      const payload = await fetchJson<{ status?: string; source?: string; smartWallets?: number; walletFlow?: Pool["walletFlow"]; walletEvents?: number; walletAddresses?: string[]; smartMoneyLabels?: string[] }>(liveApi("nansen", { mint: pool.tokenAddress! }), 20000);
      return payload.status === "LIVE" ? { key: poolKey(pool), payload } : undefined;
    } catch (error) {
      console.warn("Nansen smart-money request failed", pool.tokenAddress, error);
      return undefined;
    }
  });
  if (!results.length) return;
  const byKey = new Map(results.map((result) => [result.key, result.payload]));
  state.pools = state.pools.map((pool) => {
    const payload = byKey.get(poolKey(pool));
    if (!payload) return pool;
    const rpcCount = Number(pool.smartWallets ?? 0);
    const nansenCount = Number(payload.smartWallets ?? 0);
    const labels = Array.isArray(payload.smartMoneyLabels) ? payload.smartMoneyLabels : [];
    return {
      ...pool,
      smartWallets: Math.max(rpcCount, nansenCount),
      walletFlow: payload.walletFlow ?? pool.walletFlow ?? "MIXED",
      walletEvents: Math.max(Number(pool.walletEvents ?? 0), Number(payload.walletEvents ?? 0)),
      walletAddresses: payload.walletAddresses?.length ? payload.walletAddresses : pool.walletAddresses,
      smartMoneyLabels: labels.length ? labels : pool.smartMoneyLabels,
      walletIntelligence: "LIVE",
      walletSource: pool.walletSource && pool.walletSource !== "Pending Solana RPC analysis" ? `${pool.walletSource} + ${payload.source ?? "Nansen API"}` : payload.source ?? "Nansen API · smart-money holders",
      intelligence: "LIVE",
    };
  });
  state.source = state.source.includes("Nansen") ? state.source : `${state.source} + Nansen`;
  refreshEligibility();
}

async function loadKOLIntelligence() {
  const targets = [...state.pools].sort((a, b) => b.volume24h - a.volume24h || b.liquidity - a.liquidity).filter((pool) => pool.kolIntelligence === "UNAVAILABLE" && pool.symbol).slice(0, 8);
  const results = await mapConcurrent(targets, 2, async (pool) => {
    try {
      const symbol = pool.symbol.split("-")[0].trim();
      const params: Record<string, string> = { symbol };
      if (pool.tokenAddress) params.mint = pool.tokenAddress;
      const payload = await fetchJson<{ status?: string; source?: string; kolMentions?: number; kolRecency?: string; kolCreators?: number; kolPosts?: number; kolTrend?: string; kolSentiment?: number }>(liveApi("kol", params), 20000);
      return payload.status === "LIVE" ? { key: poolKey(pool), payload } : undefined;
    } catch (error) {
      console.warn("KOL activity request failed", pool.symbol, error);
      return undefined;
    }
  });
  if (!results.length) return;
  const byKey = new Map(results.map((result) => [result.key, result.payload]));
  state.pools = state.pools.map((pool) => {
    const payload = byKey.get(poolKey(pool));
    return payload ? { ...pool, kolMentions: Number(payload.kolMentions ?? 0), kolRecency: payload.kolRecency ?? "—", kolCreators: Number(payload.kolCreators ?? 0), kolPosts: Number(payload.kolPosts ?? 0), kolTrend: payload.kolTrend, kolSentiment: payload.kolSentiment, kolIntelligence: "LIVE", kolSource: payload.source ?? "LunarCrush API", intelligence: "LIVE" } : pool;
  });
  const kolSources = [...new Set(results.map((result) => String(result.payload.source ?? "KOL provider").split(" · ")[0]))];
  const kolSource = kolSources.join(" + ") || "KOL provider";
  state.source = state.source.includes(kolSource) ? state.source : `${state.source} + ${kolSource}`;
  refreshEligibility();
}

async function loadIntelligence() {
  const provider = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_INTELLIGENCE_API_URL;
  if (!provider || !state.pools.length) return;
  try {
    const symbols = state.pools.map((pool) => pool.symbol).join(",");
    const payload = await fetchJson<{ pools?: Array<Record<string, unknown>> }>(`${provider.replace(/\/$/, "")}?symbols=${encodeURIComponent(symbols)}`, 20000);
    const signals = Array.isArray(payload.pools) ? payload.pools : [];
    const bySymbol = new Map(signals.map((signal) => [String(signal.symbol ?? ""), signal]));
    state.pools = state.pools.map((pool) => {
      const signal = bySymbol.get(pool.symbol);
      if (!signal) return pool;
      const walletLive = signal.walletIntelligence === "LIVE" || typeof signal.smartWallets === "number";
      const kolLive = signal.kolIntelligence === "LIVE" || typeof signal.kolMentions === "number";
      return { ...pool, smartWallets: typeof signal.smartWallets === "number" ? signal.smartWallets : pool.smartWallets, walletFlow: typeof signal.walletFlow === "string" ? signal.walletFlow as Pool["walletFlow"] : pool.walletFlow, walletIntelligence: walletLive ? "LIVE" : pool.walletIntelligence, walletSource: walletLive ? String(signal.walletSource ?? "Configured intelligence provider") : pool.walletSource, walletEvents: typeof signal.walletEvents === "number" ? signal.walletEvents : pool.walletEvents, kolMentions: typeof signal.kolMentions === "number" ? signal.kolMentions : pool.kolMentions, kolRecency: typeof signal.kolRecency === "string" ? signal.kolRecency : pool.kolRecency, kolIntelligence: kolLive ? "LIVE" : pool.kolIntelligence, kolSource: kolLive ? String(signal.kolSource ?? "Configured intelligence provider") : pool.kolSource, screenScore: typeof signal.screenScore === "number" ? signal.screenScore : pool.screenScore, intelligence: signal.intelligence === "LIVE" || walletLive || kolLive ? "LIVE" : pool.intelligence };
    });
    state.source = "LIVE · Dexscreener + configured intelligence";
  } catch (error) {
    console.warn("configured intelligence provider unavailable", error);
  }
}
let refreshInFlight = false;
const candleCache = new Map<string, { candles?: Candle[]; fetchedAt: number; failedAt?: number }>();
const liveApi = (kind: string, params: Record<string, string> = {}) => { const query = new URLSearchParams({ kind, ...params }); return `/api/market?${query.toString()}`; };

async function fetchJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`request failed (${response.status})`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchFeed() {
  const terms = ["SOL", "USDC"];
  const results = await Promise.all(terms.map(async (term) => {
    try { return await fetchJson<{ pairs?: Array<Record<string, unknown>> }>(liveApi("feed", { q: term })); }
    catch { return await fetchJson<{ pairs?: Array<Record<string, unknown>> }>(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(term)}`); }
  }));
  const oculaByToken = new Map<string, OculaToken>();
  try {
    const ageBuckets = ["new", "brewing", "mid", "all"];
    const payloads = await Promise.all(ageBuckets.map(async (ageBucket) => {
      try { return await fetchJson<{ tokens?: OculaToken[] }>(liveApi("ocula", { ageBucket }), 15000); }
      catch { return undefined; }
    }));
    const rows = payloads.flatMap((payload) => Array.isArray(payload?.tokens) ? payload.tokens : []);
    rows.forEach((row) => {
      const address = String(row.token?.address ?? "").trim();
      if (address) oculaByToken.set(address.toLowerCase(), row);
    });
    const addresses = [...oculaByToken.keys()].slice(0, 100);
    const chunks = Array.from({ length: Math.ceil(addresses.length / 30) }, (_, index) => addresses.slice(index * 30, index * 30 + 30));
    const pairPayloads = await Promise.all(chunks.map(async (chunk) => {
      try {
        const pairPayload = await fetchJson<unknown>(`https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`, 15000);
        return Array.isArray(pairPayload) ? pairPayload as Array<Record<string, unknown>> : [];
      } catch {
        return [];
      }
    }));
    const pairs = pairPayloads.flat();
    if (pairs.length) results.push({ pairs });
  } catch {
    // Ocula is a public discovery expansion; Dexscreener remains the market-data source of record.
  }
  try {
    const profiles = await fetchJson<Array<{ chainId?: string; tokenAddress?: string }>>("https://api.dexscreener.com/token-profiles/latest/v1");
    const addresses = profiles.filter((profile) => profile.chainId === "solana" && profile.tokenAddress).slice(0, 12).map((profile) => profile.tokenAddress!);
    if (addresses.length) {
      const payload = await fetchJson<unknown>(`https://api.dexscreener.com/tokens/v1/solana/${addresses.join(",")}`);
      const pairs = Array.isArray(payload) ? payload as Array<Record<string, unknown>> : [];
      results.push({ pairs });
    }
  } catch {
    // The public profile feed is an optional discovery expansion.
  }
  try {
    const payload = await fetchJson<{ status?: string; source?: string; trades?: Array<Record<string, unknown>>; delaySeconds?: number }>(liveApi("kolfeed"), 15000);
    const trades = Array.isArray(payload.trades) ? payload.trades : [];
    const byMint = new Map<string, Array<Record<string, unknown>>>();
    trades.forEach((trade) => {
      const mint = String(trade.token_mint ?? "").trim().toLowerCase();
      if (!mint) return;
      const rows = byMint.get(mint) ?? [];
      rows.push(trade);
      byMint.set(mint, rows);
    });
    const addresses = [...byMint.keys()].slice(0, 100);
    const chunks = Array.from({ length: Math.ceil(addresses.length / 30) }, (_, index) => addresses.slice(index * 30, index * 30 + 30));
    const pairPayloads = await Promise.all(chunks.map(async (chunk) => {
      try {
        const pairPayload = await fetchJson<unknown>(`https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`, 15000);
        return Array.isArray(pairPayload) ? pairPayload as Array<Record<string, unknown>> : [];
      } catch {
        return [];
      }
    }));
    const pairs = pairPayloads.flat().map((pair) => {
      const base = pair.baseToken as { address?: string } | undefined;
      const rows = base?.address ? byMint.get(base.address.toLowerCase()) : undefined;
      if (!rows?.length) return pair;
      const creators = new Set(rows.map((row) => String(row.wallet_address ?? row.kol_name ?? "")).filter(Boolean));
      const buys = rows.filter((row) => String(row.action ?? "").toLowerCase() === "buy").length;
      const sells = rows.filter((row) => String(row.action ?? "").toLowerCase() === "sell").length;
      const latest = rows.map((row) => Date.parse(String(row.traded_at ?? ""))).filter(Number.isFinite).sort((a, b) => b - a)[0];
      const delay = Number(payload.delaySeconds ?? 0);
      return {
        ...pair,
        madeOnSol: {
          mentions: rows.length,
          creators: creators.size,
          recency: latest ? timeAgo(Math.round(latest / 1000)) : "—",
          trend: buys > sells ? "BUY_FLOW" : sells > buys ? "SELL_FLOW" : "MIXED_FLOW",
          source: payload.source ?? "MadeOnSol KOL feed",
          delay: delay > 0 ? `${Math.max(1, Math.round(delay / 60))}m delayed` : "live",
        },
      };
    });
    if (pairs.length) results.push({ pairs });
  } catch {
    // MadeOnSol is a bounded KOL discovery expansion; the main market feed remains authoritative.
  }
  const unique = new Map<string, Record<string, unknown>>();
  results.flatMap((result) => result.pairs ?? []).filter((pair) => pair.chainId === "solana").forEach((pair) => {
    const address = String(pair.pairAddress ?? "");
    const base = pair.baseToken as { address?: string } | undefined;
    const ocula = base?.address ? oculaByToken.get(base.address.toLowerCase()) : undefined;
    const enriched = ocula ? { ...pair, ocula } : pair;
    if (address && !unique.has(address)) unique.set(address, enriched);
  });
  return [...unique.values()].sort((a, b) => {
    const liquidity = (pair: Record<string, unknown>) => Number((pair.liquidity as { usd?: number } | undefined)?.usd ?? 0);
    const volume = (pair: Record<string, unknown>) => Number((pair.volume as { h24?: number } | undefined)?.h24 ?? 0);
    return (liquidity(b) + volume(b)) - (liquidity(a) + volume(a));
  }).slice(0, 90);
}

function mapLivePair(pair: Record<string, unknown>): Pool {
  const base = pair.baseToken as { symbol?: string; address?: string } | undefined;
  const quote = pair.quoteToken as { symbol?: string; address?: string } | undefined;
  const ocula = pair.ocula as OculaToken | undefined;
  const madeOnSol = pair.madeOnSol as { mentions?: number; creators?: number; recency?: string; trend?: string; source?: string; delay?: string } | undefined;
  const oculaLinks = Object.values(ocula?.token?.socialLinks ?? {}).filter(Boolean).length;
  const baseSymbol = String(base?.symbol ?? ocula?.token?.symbol ?? "TOKEN");
  const quoteSymbol = String(quote?.symbol ?? "SOL");
  const pairAddress = String(pair.pairAddress ?? "");
  const dexLiquidity = Number((pair.liquidity as { usd?: number } | undefined)?.usd ?? 0);
  const dexVolume24h = Number((pair.volume as { h24?: number } | undefined)?.h24 ?? 0);
  const oculaLiquidity = Number(ocula?.liquidity ?? 0);
  const oculaVolume24h = Number(ocula?.volume24 ?? 0);
  const liquidity = dexLiquidity || oculaLiquidity;
  const volume24h = dexVolume24h || oculaVolume24h;
  const oculaCreatedAt = Number(ocula?.token?.createdAt ?? 0) * 1000;
  const createdAt = Number(pair.pairCreatedAt ?? oculaCreatedAt);
  const ageDays = createdAt > 0 ? Math.max(0, Math.round((Date.now() - createdAt) / 86400000 * 10) / 10) : 0;
  const info = pair.info as { websites?: unknown[]; socials?: unknown[] } | undefined;
  const publicLinks = (info?.websites?.length ?? 0) + (info?.socials?.length ?? 0);
  const oculaPrice = Number(ocula?.priceUSD ?? 0);
  return {
    id: pairAddress || `${baseSymbol}-${quoteSymbol}-${String(pair.dexId ?? "dex")}`,
    pairAddress,
    sourceUrl: typeof pair.url === "string" ? pair.url : undefined,
    name: `${baseSymbol} / ${quoteSymbol}`,
    symbol: `${baseSymbol}-${quoteSymbol}`,
    dex: String(pair.dexId ?? "DEX"),
    address: pairAddress ? `${pairAddress.slice(0, 4)}…${pairAddress.slice(-4)}` : "unknown",
    tokenAddress: String(base?.address ?? ocula?.token?.address ?? ""),
    quoteTokenAddress: String(quote?.address ?? ""),
    tokenStatus: "UNAVAILABLE",
    tokenSource: "Pending Solana RPC safety checks",
    tokenSafety: "UNAVAILABLE",
    price: Number(pair.priceUsd ?? oculaPrice ?? 0),
    marketCap: Number(pair.marketCap ?? pair.fdv ?? ocula?.marketCap ?? 0),
    liquidity,
    volume24h,
    ageDays,
    createdAt,
    fee: 0.1,
    tvl: liquidity / 1_000_000,
    change24h: Number((pair.priceChange as { h24?: number } | undefined)?.h24 ?? ocula?.change24 ?? 0),
    risk: liquidity >= 1_000_000 ? "LOW" : liquidity >= 250_000 ? "MEDIUM" : "HIGH",
    smartWallets: 0,
    walletFlow: "UNAVAILABLE",
    walletIntelligence: "UNAVAILABLE",
    walletSource: "Pending Solana RPC analysis",
    walletEvents: 0,
    kolMentions: Number(madeOnSol?.mentions ?? 0),
    kolRecency: madeOnSol?.recency ?? "—",
    kolCreators: Number(madeOnSol?.creators ?? 0),
    kolPosts: Number(madeOnSol?.mentions ?? 0),
    kolTrend: madeOnSol?.trend,
    kolIntelligence: madeOnSol ? "LIVE" : "UNAVAILABLE",
    kolSource: madeOnSol?.source ?? "Provider key required",
    publicLinks: Math.max(publicLinks, oculaLinks),
    discovery: ocula ? "Ocula public feed + Dexscreener pair" : "Dexscreener market feed",
    oculaStatus: ocula ? "LIVE" : "UNAVAILABLE",
    oculaSource: ocula ? "Ocula public feed · holders + social links" : "Ocula discovery unavailable",
    oculaVolume1h: Number(ocula?.volume1 ?? 0) || undefined,
    oculaChange1h: Number(ocula?.change1 ?? 0) || undefined,
    oculaHolders: Number(ocula?.holders ?? 0) || undefined,
    oculaBuyCount1h: Number(ocula?.buyCount24 ?? 0) || undefined,
    oculaSellCount1h: Number(ocula?.sellCount24 ?? 0) || undefined,
    oculaSocialLinks: oculaLinks,
    oculaSocialUrls: Object.values(ocula?.token?.socialLinks ?? {}).filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, 4),
    screenScore: 0,
    intelligence: "UNAVAILABLE",
  };
}

async function mapConcurrent<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R | undefined>) {
  const output: R[] = [];
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      const value = await worker(item);
      if (value !== undefined) output.push(value);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

async function fetchCandles(pool: Pool) {
  if (!pool.pairAddress) return undefined;
  const cached = candleCache.get(pool.pairAddress);
  if (cached && cached.candles && Date.now() - cached.fetchedAt < 5 * 60_000) return cached.candles;
  if (cached?.failedAt && Date.now() - cached.failedAt < 60_000) return undefined;
  try {
    const payload = await fetchJson<unknown>(liveApi("ohlcv", { pool: pool.pairAddress }), 30000);
    const candles = parseOhlcv(payload);
    if (candles.length) { candleCache.set(pool.pairAddress, { candles, fetchedAt: Date.now() }); return candles; }
  } catch {
    try {
      const payload = await fetchJson<unknown>(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool.pairAddress)}/ohlcv/minute?aggregate=15&limit=100`, 30000);
      const candles = parseOhlcv(payload);
      if (candles.length) { candleCache.set(pool.pairAddress, { candles, fetchedAt: Date.now() }); return candles; }
    } catch (fallbackError) {
      console.warn("15m candle request failed", pool.pairAddress, fallbackError);
      candleCache.set(pool.pairAddress, { fetchedAt: Date.now(), failedAt: Date.now() });
    }
  }
  return undefined;
}

async function enrichTechnicalData(pools: Pool[]) {
  const ranked = [...pools].sort((a, b) => b.volume24h - a.volume24h || b.liquidity - a.liquidity);
  const targets = [...new Map([...ranked.filter((pool) => (pool.kolMentions ?? 0) > 0).slice(0, 4), ...ranked.slice(0, 6)].map((pool) => [poolKey(pool), pool])).values()]
    .filter((pool) => !candleCache.get(pool.pairAddress ?? "")?.candles).slice(0, 10);
  const results = await mapConcurrent(targets, 3, async (pool) => {
    const candles = await fetchCandles(pool);
    return candles ? { key: poolKey(pool), candles } : undefined;
  });
  const byKey = new Map(results.map((result) => [result.key, result.candles]));
  state.pools = state.pools.map((pool) => {
    const candles = byKey.get(poolKey(pool));
    if (!candles) { const technical = pool.technical ?? { available: false, candlesCount: 0, fresh: false, trend: "UNAVAILABLE" as const, bullishFlipWithin3: false, reclaimWithin3: false, trendSeries: [] }; const playbooks = derivePlaybooks(pool, technical); return { ...pool, technical, playbooks, primaryPlaybook: primaryPlaybook(playbooks) }; }
    const technical = analyzeCandles(candles);
    const playbooks = derivePlaybooks(pool, technical);
    return { ...pool, candles, technical, playbooks, primaryPlaybook: primaryPlaybook(playbooks) };
  });
  refreshEligibility();
}

async function loadLive() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  state.loading = true;
  state.liveError = "";
  render();
  try {
    const pairs = await fetchFeed();
    if (!pairs.length) throw new Error("No Solana pairs returned");
    state.pools = recordLaunchObservations(pairs.map(mapLivePair));
    state.liveReady = true;
    state.source = "LIVE · Dexscreener + Ocula discovery + local launch history";
    state.lastUpdated = Date.now();
    state.loading = false;
    render();
    await loadTokenSafety();
    await loadPublicProfiles();
    state.pools = recordLaunchObservations(state.pools);
    render();
    await enrichTechnicalData(state.pools);
    await loadWalletIntelligence();
    await loadNansenIntelligence();
    await loadKOLIntelligence();
    await loadIntelligence();
    state.lastUpdated = Date.now();
  } catch (error) {
    state.liveError = error instanceof Error ? `${error.message}. Showing the last available snapshot.` : "Live feed unavailable. Showing the last available snapshot.";
    if (!state.liveReady) state.source = "Demo snapshot · live feed unavailable";
  } finally {
    state.loading = false;
    refreshInFlight = false;
    render();
  }
}
window.addEventListener("hashchange", render);
render();
void loadLive();
void loadChainContext();
void loadProviderStatus();
window.setInterval(() => void loadLive(), 60_000);



