import "./styles.css";
import "./ui-overhaul.css";
import "./taste-rework.css";
import "./taste-system.css";
import "./taste-v2.css";
import kolData from "./data/kol-wallets.json";
import twitterReviewSeedsData from "./data/twitter-review-seeds.json";
import { analyzeCandles, computeScoreSnapshot, derivePlaybooks, evaluateEligibility, marketCapTier, marketCapTierLabel, parseOhlcv, primaryPlaybook, type Candle, type EligibilityAnalysis, type PlaybookSignal, type ScoreSnapshot, type TechnicalAnalysis } from "./market";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Copy,
  Droplets,
  ExternalLink,
  Megaphone,
  Menu,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  WalletCards,
  Waves,
  X,
  createIcons,
} from "lucide";

const uiIcons = {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Copy,
  Droplets,
  ExternalLink,
  Megaphone,
  Menu,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  WalletCards,
  Waves,
  X,
};

type UiIconName = keyof typeof uiIcons;
const uiIcon = (name: UiIconName, className = "") => `<i data-icon="${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, "")}" class="ui-icon ${className}" aria-hidden="true"></i>`;
const uiIconSlot = (name: UiIconName, className = "") => `<span class="icon-slot ${className}" aria-hidden="true">${uiIcon(name)}</span>`;
function renderUiIcons(root: ParentNode = document) {
  createIcons({ icons: uiIcons, nameAttr: "data-icon", attrs: { "stroke-width": 1.8 }, root: root as Document });
  root.querySelectorAll<SVGElement>("svg[data-icon]").forEach((svg) => svg.removeAttribute("data-icon"));
}

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

type ChainId = "solana" | "ethereum" | "base" | "robinhood";
type Pool = {
  id?: string; chain?: ChainId; pairAddress?: string; sourceUrl?: string; name: string; symbol: string; dex: string; address: string; price: number; liquidity: number; volume24h: number; ageDays: number; fee?: number; tvl: number; change24h: number; risk: "LOW" | "MEDIUM" | "HIGH";
  marketCap?: number; createdAt?: number; quoteTokenAddress?: string; imageUrl?: string; smartWallets?: number; trackedWalletHits?: number; trackedWalletHandles?: string[]; trackedWalletConfidence?: KolWallet["confidence"]; walletFlow?: "INFLOW" | "OUTFLOW" | "MIXED" | "UNAVAILABLE"; walletIntelligence?: "DEMO" | "LIVE" | "UNAVAILABLE"; walletSource?: string; walletEvents?: number; walletAddresses?: string[]; smartMoneyLabels?: string[]; kolMentions?: number; kolRecency?: string; kolCreators?: number; kolPosts?: number; kolTrend?: string; kolSentiment?: number; kolIntelligence?: "DEMO" | "LIVE" | "UNAVAILABLE"; kolSource?: string; screenScore?: number; intelligence?: "DEMO" | "LIVE" | "UNAVAILABLE"; publicLinks?: number; profileUrl?: string; discovery?: string; launch?: LaunchObservation; oculaStatus?: "LIVE" | "UNAVAILABLE"; oculaSource?: string; oculaVolume1h?: number; oculaChange1h?: number; oculaHolders?: number; oculaBuyCount1h?: number; oculaSellCount1h?: number; oculaSocialLinks?: number; oculaSocialUrls?: string[]; tokenAddress?: string; tokenStatus?: "LIVE" | "UNAVAILABLE"; tokenSource?: string; tokenSafety?: "PASS" | "WARN" | "UNAVAILABLE"; mintAuthority?: boolean; freezeAuthority?: boolean; holderTop10Pct?: number; rugCheckScore?: number; rugCheckRisk?: string; rugCheckRisks?: string[]; rugCheckLpLockedPct?: number; holderProfileStatus?: "LIVE" | "UNAVAILABLE"; holderProfileSource?: string; holderCount?: number; eligibility?: EligibilityAnalysis; scoreSnapshot?: ScoreSnapshot; candles?: Candle[]; previewCandles?: Candle[]; previewTimeframe?: "1m" | "5m"; previewSource?: string; technical?: TechnicalAnalysis; playbooks?: PlaybookSignal[]; primaryPlaybook?: PlaybookSignal; enrichmentLoading?: boolean;
};


type ProviderStatus = {
  key: string;
  label: string;
  status: "LIVE" | "CONFIGURED" | "KEY_REQUIRED" | "LINK_ONLY";
  mode: string;
  source: string;
};
type ProviderUsage = {
  monthlyBudget: number;
  creditsUsedEstimate: number;
  requestsLastMinute: number;
  rateLimitPerMinute: number;
  source: string;
  lastProvider?: string;
};

type WalletClusterLink = {
  address: string;
  hits: number;
  signatures: number;
  evidence: string[];
  directions: string[];
  mints: number;
  confidence: "REPEATED" | "OBSERVED" | "SINGLE";
  firstSlot?: number;
  lastSlot?: number;
  lastSeen?: number;
};
type WalletClusterPayload = {
  status: "LIVE" | "UNAVAILABLE" | "KEY_REQUIRED";
  source: string;
  address: string;
  chain?: string;
  scannedSignatures?: number;
  scannedTransactions?: number;
  scannedTransfers?: number;
  snapshotCapturedAt?: string;
  relatedWallets?: WalletClusterLink[];
  note?: string;
};
type WalletGraphSummary = { trackedProfiles: number; trackedWalletRows: number; uniqueTrackedAddresses: number; uniqueTrackedChainAddresses?: number; multiChainTrackedAddresses: number; chainCounts: Record<string, number>; scannedSourceWallets: number; directLinks: number; repeatedLinks: number; sharedCounterparties: number; sharedCounterpartyEdges: number; possibleSharedWalletLinks: number; highFanoutInfrastructure: number; crossChainCounterparties: number; trackedWalletMatches: number; graphClusters: number; bnbTasksKeyRequired: number };
type WalletGraphLink = { chain: string; address: string; hits: number; repeatedHits: number; signatures: number; confidence: string; classification: string; sourceCount: number; sourceProfiles: string[]; trackedMatches: Array<{ handle: string; name?: string; confidence?: string; address: string; chains: string[] }>; sameAddressChains: string[]; evidence: string[]; tokens: string[]; lastSeen?: string | number };
type WalletGraphProfile = { handle: string; name: string; wallets: Array<{ chain: string; address: string; confidence?: string; status?: string }>; clusters: string[]; summary: { directLinks: number; repeatedLinks: number; sharedCounterparties: number; trackedWalletMatches: number; crossChainCounterparties: number; infrastructureLike: number }; links: WalletGraphLink[] };
type WalletGraphCluster = { id: string; sourceWallets: Array<{ chain: string; address: string; profiles: string[] }>; profiles: string[]; chains: string[]; sharedLinks: number; repeatedLinks: number; topLinks: Array<Pick<WalletGraphLink, "chain" | "address" | "classification" | "sourceCount" | "sourceProfiles" | "hits" | "repeatedHits" | "confidence" | "evidence" | "sameAddressChains">> };
type WalletGraphPayload = { status: "LIVE" | "UNAVAILABLE"; source: string; capturedAt?: string; methodology?: string; summary: WalletGraphSummary; profile?: WalletGraphProfile; clusters?: WalletGraphCluster[]; note?: string };
type TwitterMatchConfidence = "EXACT" | "LIKELY" | "CANDIDATE" | "UNRESOLVED";
type TwitterMatchMethod = "seeded-source-trail" | "exact-handle-candidate" | "manual-override" | "unresolved";
type TwitterAutoMatch = { confidence: TwitterMatchConfidence; method: TwitterMatchMethod; sourceUrls: string[]; thesisSourceUrls: string[]; matchedAt: string };
type TwitterThesisMatch = { token: string; evidenceUrl: string; thesis: string; sourceUrls?: string[]; confidence?: TwitterMatchConfidence; updatedAt: string };
type TwitterReview = { xHandle: string; xUrl: string; status: "UNREVIEWED" | "CONFIRMED" | "LIKELY" | "NO_MATCH"; note: string; sourceUrls?: string[]; thesisMatches?: TwitterThesisMatch[]; autoMatch?: TwitterAutoMatch; updatedAt: string };
type XPostEvidence = { id: string; xHandle: string; url: string; text: string; createdAt?: string; contractAddresses: string[]; tokenMentions: string[]; isReply: boolean; replyToUserId?: string; publicMetrics: { replies: number; likes: number; reposts: number; quotes: number }; authorConfidence: "EXACT" };
type XProfileFeed = { status: "LIVE" | "KEY_REQUIRED" | "UNAVAILABLE" | "RATE_LIMITED"; source: string; profiles?: Record<string, { xHandle: string; posts: XPostEvidence[]; summary: { postCount: number; replyCount: number; contractCount: number; engagement: number; latestAt?: string } }>; posts?: XPostEvidence[]; fetchedAt?: string; window?: string; stale?: boolean; note?: string };

type OculaToken = {
  token?: { name?: string; symbol?: string; address?: string; createdAt?: number; socialLinks?: Record<string, string | null>; launchpad?: { launchpadName?: string; graduationPercent?: number; migrated?: boolean } };
  priceUSD?: string | number; volume24?: string | number; volume1?: string | number; marketCap?: string | number; liquidity?: string | number; holders?: number; change24?: string | number; change1?: string | number; buyCount24?: number; sellCount24?: number;
};

type KolWallet = { chains: string[]; address: string; confidence: "verified" | "likely" | "resolver"; sources: string[] };
type KolRecord = { handle: string; name: string; profileUrl: string; followers?: number; trades?: number; pnlUsd?: number; volumeUsd?: number; wallets: KolWallet[]; hasProvadata: boolean; hasResolver: boolean; indexedAt?: string; status: string };
type KolDataset = { capturedAt: string; coverage: { uniqueHandles: number; profilesWithWalletEvidence: number; profilesWithSolanaEvidence: number; profilesWithEvmEvidence: number; provadataProfiles: number; fomoResolverRecords: number; provadataExplicitMissing: number; fomoResolverErrors: number; statusCounts: Record<string, number> }; records: KolRecord[]; unresolvedHandles: string[] };
const kolDataset = kolData as KolDataset;

type TrackedWalletMatch = { handle: string; name: string; confidence: KolWallet["confidence"]; chains: string[] };
const trackedWalletIndex = new Map<string, TrackedWalletMatch[]>();
kolDataset.records.forEach((record) => record.wallets.forEach((wallet) => {
  const address = wallet.address.trim().toLowerCase();
  if (!address) return;
  const rows = trackedWalletIndex.get(address) ?? [];
  if (!rows.some((row) => row.handle === record.handle)) rows.push({ handle: record.handle, name: record.name, confidence: wallet.confidence, chains: wallet.chains });
  trackedWalletIndex.set(address, rows);
}));
const trackedWalletAddressCount = trackedWalletIndex.size;
const confidenceRank = (confidence: KolWallet["confidence"]) => confidence === "verified" ? 3 : confidence === "likely" ? 2 : 1;
const trackedWalletMatches = (addresses?: string[]) => {
  const matches = new Map<string, TrackedWalletMatch>();
  (addresses ?? []).forEach((address) => (trackedWalletIndex.get(address.trim().toLowerCase()) ?? []).forEach((match) => {
    const prior = matches.get(match.handle);
    if (!prior || confidenceRank(match.confidence) > confidenceRank(prior.confidence)) matches.set(match.handle, match);
  }));
  const rows = [...matches.values()].sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence) || a.handle.localeCompare(b.handle));
  return { hits: rows.length, handles: rows.map((row) => `@${row.handle}`), confidence: rows[0]?.confidence };
};
const tokenImageUrl = (address?: string, chain: ChainId = "solana") => address ? `https://dd.dexscreener.com/ds-data/tokens/${chain}/${encodeURIComponent(address)}.png` : undefined;
const tokenInitials = (pool: Pick<Pool, "name" | "symbol">) => {
  const words = `${pool.symbol || pool.name || "TK"}`.replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? "TK").slice(0, 2);
  return initials.toUpperCase();
};

const demoPools: Pool[] = [
  { name: "SOL / USDC", symbol: "SOL-USDC", dex: "Meteora DLMM", address: "7xKX...9mQp", price: 184.22, marketCap: 8_000_000_000, liquidity: 1250000, volume24h: 3180000, ageDays: 84, fee: 0.04, tvl: 8.2, change24h: 6.4, risk: "LOW" },
  { name: "JUP / SOL", symbol: "JUP-SOL", dex: "Meteora DAMM", address: "5HnA...W2eB", price: 1.12, marketCap: 45_000_000, liquidity: 482000, volume24h: 920000, ageDays: 41, fee: 0.12, tvl: 3.7, change24h: 11.8, risk: "MEDIUM" },
  { name: "BONK / SOL", symbol: "BONK-SOL", dex: "Meteora DLMM", address: "3FqV...g1Lt", price: 0.000028, marketCap: 900_000_000, liquidity: 214000, volume24h: 681000, ageDays: 126, fee: 0.08, tvl: 2.1, change24h: -2.7, risk: "MEDIUM" },
  { name: "PYTH / USDC", symbol: "PYTH-USDC", dex: "Meteora DLMM", address: "9KcL...a8Rx", price: 0.31, marketCap: 6_000_000, liquidity: 92000, volume24h: 131000, ageDays: 19, fee: 0.20, tvl: 1.3, change24h: 21.3, risk: "HIGH" },
  { name: "WIF / SOL", symbol: "WIF-SOL", dex: "Meteora DAMM", address: "4ZtM...k5Pd", price: 0.74, marketCap: 900_000, liquidity: 690000, volume24h: 1540000, ageDays: 68, fee: 0.06, tvl: 4.4, change24h: 8.9, risk: "LOW" },
  { name: "mSOL / SOL", symbol: "mSOL-SOL", dex: "Meteora DLMM", address: "8cVn...q7La", price: 193.14, marketCap: 2_000_000_000, liquidity: 830000, volume24h: 740000, ageDays: 212, fee: 0.03, tvl: 5.6, change24h: 1.8, risk: "LOW" },
  { name: "JTO / SOL", symbol: "JTO-SOL", dex: "Meteora DAMM", address: "2eRt...p6Kc", price: 2.18, marketCap: 70_000_000, liquidity: 341000, volume24h: 412000, ageDays: 33, fee: 0.10, tvl: 2.9, change24h: -4.4, risk: "MEDIUM" },
];

const signalPools: Pool[] = demoPools.map((pool, index) => ({ ...pool, smartWallets: [12, 7, 4, 2, 9, 6, 3][index], walletFlow: ["INFLOW", "INFLOW", "OUTFLOW", "MIXED", "INFLOW", "MIXED", "OUTFLOW"][index] as Pool["walletFlow"], walletIntelligence: "DEMO", walletSource: "Demo snapshot", kolMentions: [6, 3, 1, 4, 5, 1, 0][index], kolRecency: ["18m", "42m", "3h", "1h", "27m", "5h", "—"][index], kolIntelligence: "DEMO", kolSource: "Demo snapshot", publicLinks: [2, 1, 1, 2, 2, 1, 0][index], intelligence: "DEMO" }));

const twitterReviewSeeds = twitterReviewSeedsData as Record<string, TwitterReview>;
const uniqueUrls = (urls: Array<string | undefined>) => [...new Set(urls.filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url))))];
const validHandleCandidate = (value: string) => /^[a-z0-9_]{1,15}$/i.test(value.trim().replace(/^@+/, ""));
const thesisConfidence = (match: TwitterThesisMatch): TwitterMatchConfidence => {
  const sources = uniqueUrls([match.evidenceUrl, ...(match.sourceUrls ?? [])]);
  return sources.some((source) => /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\//i.test(source)) ? "LIKELY" : "CANDIDATE";
};
const normalizeThesisMatches = (matches: TwitterThesisMatch[] | undefined) => (matches ?? []).map((match) => ({ ...match, sourceUrls: uniqueUrls([match.evidenceUrl, ...(match.sourceUrls ?? [])]), confidence: match.confidence ?? thesisConfidence(match) }));
const automaticTwitterReview = (record: KolRecord, seed?: TwitterReview): TwitterReview => {
  const profileSource = record.profileUrl;
  if (seed?.xHandle) {
    const sourceUrls = uniqueUrls([profileSource, seed.xUrl, ...(seed.sourceUrls ?? [])]);
    const thesisMatches = normalizeThesisMatches(seed.thesisMatches);
    const thesisSourceUrls = uniqueUrls(thesisMatches.flatMap((match) => [match.evidenceUrl, ...(match.sourceUrls ?? [])]));
    const confidence: TwitterMatchConfidence = seed.status === "CONFIRMED" ? "EXACT" : seed.status === "LIKELY" ? "LIKELY" : seed.status === "NO_MATCH" ? "UNRESOLVED" : "CANDIDATE";
    return { ...seed, sourceUrls, thesisMatches, autoMatch: { confidence, method: "seeded-source-trail", sourceUrls, thesisSourceUrls, matchedAt: seed.updatedAt || kolDataset.capturedAt } };
  }
  const handle = record.handle.trim().replace(/^@+/, "");
  if (validHandleCandidate(handle)) {
    const sourceUrls = uniqueUrls([profileSource]);
    return { xHandle: handle, xUrl: `https://x.com/${encodeURIComponent(handle)}`, status: "UNREVIEWED", note: "Automatic candidate only: the X handle mirrors the FOMO handle. No independent X profile or wallet disclosure was captured yet. Review public proof before promoting this match.", sourceUrls, thesisMatches: [], autoMatch: { confidence: "CANDIDATE", method: "exact-handle-candidate", sourceUrls, thesisSourceUrls: [], matchedAt: kolDataset.capturedAt }, updatedAt: "" };
  }
  const sourceUrls = uniqueUrls([profileSource]);
  return { xHandle: "", xUrl: `https://x.com/search?q=%40${encodeURIComponent(handle)}&f=user`, status: "UNREVIEWED", note: "Automatic matching could not produce a safe X-handle candidate from this FOMO profile. Add public evidence manually.", sourceUrls, thesisMatches: [], autoMatch: { confidence: "UNRESOLVED", method: "unresolved", sourceUrls, thesisSourceUrls: [], matchedAt: kolDataset.capturedAt }, updatedAt: "" };
};
const readLocalList = (key: string) => { try { return JSON.parse(localStorage.getItem(key) ?? "[]") as string[]; } catch { return []; } };
const readTwitterReviews = (): Record<string, TwitterReview> => {
  let saved: Record<string, TwitterReview> = {};
  try { saved = JSON.parse(localStorage.getItem("lp-screener-twitter-reviews-v1") ?? "{}"); } catch { saved = {}; }
  return Object.fromEntries(kolDataset.records.map((record) => {
    const automatic = automaticTwitterReview(record, twitterReviewSeeds[record.handle]);
    const manual = saved[record.handle];
    if (!manual) return [record.handle, automatic];
    const sourceUrls = uniqueUrls([...(automatic.sourceUrls ?? []), ...(manual.sourceUrls ?? [])]);
    const thesisMatches = manual.thesisMatches?.length ? normalizeThesisMatches(manual.thesisMatches) : (automatic.thesisMatches ?? []);
    const thesisSourceUrls = uniqueUrls(thesisMatches.flatMap((match) => [match.evidenceUrl, ...(match.sourceUrls ?? [])]));
    return [record.handle, { ...automatic, ...manual, sourceUrls, thesisMatches, autoMatch: manual.autoMatch ?? { ...automatic.autoMatch!, sourceUrls, thesisSourceUrls, method: "manual-override", confidence: manual.status === "CONFIRMED" ? "EXACT" : manual.status === "LIKELY" ? "LIKELY" : manual.status === "NO_MATCH" ? "UNRESOLVED" : automatic.autoMatch?.confidence ?? "CANDIDATE" } }];
  }));
};
type LaunchHistoryRecord = { name: string; symbol: string; firstSeenAt: number; lastSeenAt: number; sightings: number; nameReuse: number; publicLinks: number };
type LaunchHistoryStore = { records: Record<string, LaunchHistoryRecord>; names: Record<string, number> };
const readLaunchHistory = (): LaunchHistoryStore => { try { const value = JSON.parse(localStorage.getItem("lp-screener-launch-history-v1") ?? "{}"); return { records: value.records ?? {}, names: value.names ?? {} }; } catch { return { records: {}, names: {} }; } };
const state = { pools: signalPools, chain: "solana" as ChainId, feedPage: 1, feedPageSize: 40, feedTotal: 0, feedAvailableTotal: 0, feedHasMore: false, feedLoadingMore: false, trackedWallets: readLocalList("lp-screener-wallets"), trackedKols: readLocalList("lp-screener-kols"), watchlist: readLocalList("lp-screener-watchlist"), kolWatchlist: readLocalList("lp-screener-kol-watchlist"), twitterReviews: readTwitterReviews(), xFeeds: {} as Record<string, XProfileFeed>, xSyncing: false, xLastSync: 0, sourcesOpen: false, mobileNavOpen: false, query: "", kolQuery: "", minLiquidity: 5000, minVolume: 2000, maxAge: 365, top10: 15, source: "Loading live feed…", list: "all", lab: "spot", academy: "bins", walletFilter: "all", kolFilter: "all", kolChain: "all", kolConfidence: "all", kolSort: "score", decisionFilter: "all", scoreMin: 0, metricMode: "price" as "price" | "mcap", selectedPool: "", selectedKol: "", compareList: [] as string[], sort: "score", sortDir: "desc" as "asc" | "desc", loading: true, lastUpdated: 0, liveError: "", liveReady: false, chainTvl: { Solana: 0, Ethereum: 0, Base: 0, Robinhood: 0 }, providers: [] as ProviderStatus[], providerUsage: { monthlyBudget: 100_000, creditsUsedEstimate: 0, requestsLastMinute: 0, rateLimitPerMinute: 30, source: "waiting for server-side scan" } as ProviderUsage, walletScan: { active: false, complete: 0, total: 0 }, tokenScan: { query: "", status: "idle" as "idle" | "scanning" | "ready" | "error", message: "Paste a token address for a deep scan." }, walletCluster: { address: "", chain: "solana", loading: false, error: "", result: undefined as WalletClusterPayload | undefined }, walletGraph: { scope: "overview" as "overview" | "profile", handle: "", loading: false, error: "", result: undefined as WalletGraphPayload | undefined } };
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
const scorePoolKey = (pool: Pool) => pool.pairAddress ?? pool.id ?? pool.symbol;
const scoreSnapshotFor = (pool: Pool) => pool.scoreSnapshot ?? computeScoreSnapshot(pool, 0, 0);
const runnerPotentialScore = (pool: Pool) => scoreSnapshotFor(pool).runnerPotential;
const runnerTierMax = (marketCap?: number) => marketCapTier(marketCap) === "NANO" || marketCapTier(marketCap) === "ULTRA_MICRO" ? 100 : 0;
const isRunnerTier = (marketCap?: number) => runnerTierMax(marketCap) > 0;
const runnerCandidateThreshold = (snapshot: ScoreSnapshot) => snapshot.evidenceConfidence < 70 ? 35 : 60;
const volumeUpsideScore = (pool: Pool) => scoreSnapshotFor(pool).flowUpside;
const feedLpGates = (pool: Pool) => pool.liquidity >= 5_000 && pool.volume24h >= 2_000 && pool.ageDays <= (pool.chain === "solana" ? 365 : 2_500) && Boolean(pool.pairAddress && pool.tokenAddress);
const evidenceRejected = (pool: Pool) => pool.eligibility?.status === "REJECTED" && (pool.technical?.available || pool.tokenStatus === "LIVE");
const scoreBreakdown = (pool: Pool) => {
  const snapshot = scoreSnapshotFor(pool);
  return {
    liquidity: snapshot.components.depth,
    volume: snapshot.components.volume,
    turnover: snapshot.components.turnover,
    fee: snapshot.components.fee,
    age: snapshot.components.age,
    technical: snapshot.components.range,
    safety: snapshot.components.safety,
    wallets: snapshot.components.wallet,
    kol: snapshot.components.attention,
    runner: snapshot.runnerPotential,
    flow: snapshot.flowUpside,
    total: snapshot.lpFit,
    confidence: snapshot.evidenceConfidence,
    pending: snapshot.pending,
    snapshotId: snapshot.snapshotId,
    capturedAt: snapshot.capturedAt,
  };
};
const scoreFor = (pool: Pool) => scoreSnapshotFor(pool).lpFit;
const poolDecision = (pool: Pool, displayedScore = scoreFor(pool)) => {
  const eligible = pool.eligibility?.status === "OPEN_NOW" || pool.eligibility?.status === "ELIGIBLE_WAIT";
  const snapshot = scoreSnapshotFor(pool);
  // The fast feed can nominate a pool before the selected-token deep scan
  // supplies candles, safety, wallet, and KOL evidence. Keep that distinction
  // visible in the confidence score and evidence panel.
  if (!evidenceRejected(pool) && isRunnerTier(pool.marketCap) && snapshot.runnerPotential >= runnerCandidateThreshold(snapshot)) return { label: "RUNNER CANDIDATE", className: "runner-candidate" };
  if (pool.eligibility?.status === "REJECTED") return { label: "REJECTED", className: "rejected" };
  if (!evidenceRejected(pool) && feedLpGates(pool) && displayedScore >= 70) return { label: "LP CANDIDATE", className: "lp-candidate" };
  if (eligible && displayedScore >= 70) return { label: "LP CANDIDATE", className: "lp-candidate" };
  if (eligible && displayedScore >= 55) return { label: "LP WATCH", className: "lp-watch" };
  if (isRunnerTier(pool.marketCap) && snapshot.runnerPotential >= runnerCandidateThreshold(snapshot)) return { label: "RUNNER CANDIDATE", className: "runner-candidate" };
  if (snapshot.flowUpside >= 60) return { label: "FLOW UPSIDE", className: "flow-upside" };
  return { label: "SCREENING", className: "screening" };
};
const poolKey = scorePoolKey;
const poolByKey = (key: string) => state.pools.find((pool) => poolKey(pool) === key);
const statusLabel = (status?: PlaybookSignal["status"]) => status === "ENTRY_NOW" ? "ENTRY NOW" : status === "ARMED_WAIT" ? "ARMED · WAIT" : status === "UPDATING" ? "UPDATING" : status === "NOT_ELIGIBLE" ? "NOT ELIGIBLE" : "MONITOR";
const statusClass = (status?: PlaybookSignal["status"]) => String(status ?? "MONITOR").toLowerCase().replace("_", "-");
const timeAgo = (timestamp?: number) => { if (!timestamp) return "—"; const minutes = Math.max(0, Math.round((Date.now() / 1000 - timestamp) / 60)); return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`; };
const formatPrice = (price: number) => price < 0.01 ? price.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") : price.toFixed(2);
const workspaceSortKeys = ["name", "venue", "price", "liquidity", "volume", "age", "wallets", "kol", "flow", "score"] as const;
type WorkspaceSort = typeof workspaceSortKeys[number];
const isWorkspaceSort = (value: string): value is WorkspaceSort => (workspaceSortKeys as readonly string[]).includes(value);
const workspaceSortIndicator = (key: WorkspaceSort) => state.sort === key ? (state.sortDir === "asc" ? uiIcon("ArrowUp", "sort-icon") : uiIcon("ArrowDown", "sort-icon")) : uiIcon("ArrowUpDown", "sort-icon");
function chooseWorkspaceSort(value: string) {
  if (!isWorkspaceSort(value)) return;
  if (state.sort === value) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  else { state.sort = value; state.sortDir = "desc"; }
  render();
}
const filtered = () => state.pools.filter((p) => {
  const eligibleMatch = p.eligibility?.status === "OPEN_NOW" || p.eligibility?.status === "ELIGIBLE_WAIT";
  const listMatch = state.list === "all" || state.list === "eligible" && eligibleMatch || state.list === "open" && p.eligibility?.status === "OPEN_NOW" || state.list === "trending" && p.change24h > 5 || state.list === "new" && p.ageDays < 45 || state.list === "liquidity" && p.liquidity > 500000 || state.list === "watchlist" && state.watchlist.includes(poolKey(p)) || state.list === "smart" && ((p.smartWallets ?? 0) > 0 || (p.trackedWalletHits ?? 0) > 0) || state.list === "kol" && (p.kolMentions ?? 0) >= 3;
  const walletMatch = state.walletFilter === "all" || state.walletFilter === "active" && ((p.smartWallets ?? 0) >= 5 || (p.trackedWalletHits ?? 0) > 0) || state.walletFilter === "inflow" && p.walletFlow === "INFLOW" || state.walletFilter === "tracked" && (p.trackedWalletHits ?? 0) > 0;
  const kolMatch = state.kolFilter === "all" || state.kolFilter === "recent" && (p.kolMentions ?? 0) >= 3 || state.kolFilter === "visible" && (p.kolMentions ?? 0) > 0;
  const decision = poolDecision(p, scoreFor(p));
  const decisionMatch = state.decisionFilter === "all" || state.decisionFilter === "lp" && decision.label === "LP CANDIDATE" || state.decisionFilter === "runner" && decision.label === "RUNNER CANDIDATE" || state.decisionFilter === "flow" && decision.label === "FLOW UPSIDE" || state.decisionFilter === "rejected" && decision.label === "REJECTED";
  return listMatch && walletMatch && kolMatch && decisionMatch && scoreFor(p) >= state.scoreMin && p.liquidity >= state.minLiquidity && p.volume24h >= state.minVolume && p.ageDays <= state.maxAge && `${p.name} ${p.dex} ${p.symbol}`.toLowerCase().includes(state.query.toLowerCase());
}).sort((a, b) => {
  const direction = state.sortDir === "asc" ? 1 : -1;
  const value = state.sort === "name" ? a.name.localeCompare(b.name) : state.sort === "venue" ? a.dex.localeCompare(b.dex) : state.sort === "price" ? a.price - b.price : state.sort === "liquidity" ? a.liquidity - b.liquidity : state.sort === "volume" ? a.volume24h - b.volume24h : state.sort === "age" ? a.ageDays - b.ageDays : state.sort === "wallets" ? ((a.smartWallets ?? 0) + (a.trackedWalletHits ?? 0) * 100) - ((b.smartWallets ?? 0) + (b.trackedWalletHits ?? 0) * 100) : state.sort === "kol" ? (a.kolMentions ?? 0) - (b.kolMentions ?? 0) : state.sort === "flow" ? volumeUpsideScore(a) - volumeUpsideScore(b) : scoreFor(a) - scoreFor(b);
  return value * direction || a.name.localeCompare(b.name);
});
const route = () => location.hash.replace(/^#/, "") || "home";
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character] ?? character));
const kolMoney = (value?: number) => typeof value !== "number" || !Number.isFinite(value) ? "—" : value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `$${Math.round(value / 1_000)}K` : `$${Math.round(value)}`;
const kolCount = (value?: number) => typeof value !== "number" || !Number.isFinite(value) ? "—" : value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K` : String(Math.round(value));
const chainLabel = (chain: string) => ({ solana: "Solana", evm: "EVM", robinhood: "Robinhood", ethereum: "Ethereum", base: "Base", bnb: "BNB" }[chain] ?? chain.toUpperCase());
const isEvmAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);
const chainForAddress = (value: string): ChainId => isEvmAddress(value) ? (state.chain === "base" || state.chain === "robinhood" || state.chain === "ethereum" ? state.chain : "ethereum") : "solana";
const defaultMinLiquidityForChain = (chain: ChainId) => chain === "solana" ? 5000 : 0;
const defaultMinVolumeForChain = (chain: ChainId) => chain === "solana" ? 2000 : 0;
const defaultMaxAgeForChain = (chain: ChainId) => chain === "solana" ? 365 : 2500;
const chainClass = (chain: string) => chain.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
const shortAddress = (address: string) => address.length > 18 ? `${address.slice(0, 7)}…${address.slice(-7)}` : address;
const confidenceLabel = (confidence: KolWallet["confidence"]) => confidence === "verified" ? "VERIFIED" : confidence === "likely" ? "LIKELY" : "RESOLVER";
const kolScore = (record: KolRecord) => {
  const confidence = record.wallets.some((wallet) => wallet.confidence === "verified") ? 34 : record.wallets.some((wallet) => wallet.confidence === "likely") ? 25 : 16;
  const audience = record.followers ? Math.min(24, Math.round(Math.log10(record.followers + 1) * 8)) : 0;
  const activity = record.trades ? Math.min(18, Math.round(Math.log10(record.trades + 1) * 6)) : 0;
  const pnl = record.pnlUsd ? Math.min(14, Math.round(Math.log10(Math.max(1, record.pnlUsd)) * 2.2)) : 0;
  const breadth = Math.min(10, record.wallets.length * 3 + (record.hasProvadata && record.hasResolver ? 2 : 0));
  return Math.min(100, confidence + audience + activity + pnl + breadth);
};
const filteredKols = () => {
  const query = state.kolQuery.trim().toLowerCase();
  return kolDataset.records.filter((record) => {
    const queryMatch = !query || `${record.handle} ${record.name} ${record.wallets.map((wallet) => wallet.address).join(" ")}`.toLowerCase().includes(query);
    const chainMatch = state.kolChain === "all" || record.wallets.some((wallet) => wallet.chains.includes(state.kolChain));
    const confidenceMatch = state.kolConfidence === "all" || record.wallets.some((wallet) => wallet.confidence === state.kolConfidence);
    return queryMatch && chainMatch && confidenceMatch;
  }).sort((a, b) => state.kolSort === "followers" ? (b.followers ?? 0) - (a.followers ?? 0) : state.kolSort === "pnl" ? (b.pnlUsd ?? 0) - (a.pnlUsd ?? 0) : state.kolSort === "wallets" ? b.wallets.length - a.wallets.length : kolScore(b) - kolScore(a));
};
const explorerUrl = (wallet: KolWallet) => wallet.chains.includes("solana") ? `https://solscan.io/account/${encodeURIComponent(wallet.address)}` : `https://gmgn.ai/eth/address/${encodeURIComponent(wallet.address)}`;
const kolEvidenceText = (record: KolRecord) => record.wallets.some((wallet) => wallet.confidence === "verified") ? "Provider verified wallet link" : record.wallets.some((wallet) => wallet.confidence === "likely") ? "Provider likely wallet link" : "Resolver-reported wallet link";
const twitterMatchLabel = (review?: TwitterReview) => review?.autoMatch?.confidence === "EXACT" ? "EXACT X MATCH" : review?.autoMatch?.confidence === "LIKELY" ? "LIKELY X MATCH" : review?.autoMatch?.confidence === "CANDIDATE" ? "X CANDIDATE" : "UNRESOLVED X";
const twitterMatchClass = (review?: TwitterReview) => (review?.autoMatch?.confidence ?? "UNRESOLVED").toLowerCase();
const twitterMatchStats = () => kolDataset.records.reduce((stats, record) => {
  const review = state.twitterReviews[record.handle];
  const confidence = review?.autoMatch?.confidence ?? "UNRESOLVED";
  stats[confidence] += 1;
  stats.theses += review?.thesisMatches?.length ?? 0;
  return stats;
}, { EXACT: 0, LIKELY: 0, CANDIDATE: 0, UNRESOLVED: 0, theses: 0 } as Record<TwitterMatchConfidence | "theses", number>);
const xFeedKey = (handle: string) => handle.trim().replace(/^@+/, "").toLowerCase();
const xHandleForRecord = (record: KolRecord) => (state.twitterReviews[record.handle]?.xHandle || record.handle).trim().replace(/^@+/, "");
const xHandleForFomoHandle = (handle: string) => { const clean = handle.trim().replace(/^@+/, ""); const record = kolDataset.records.find((item) => xFeedKey(item.handle) === xFeedKey(clean)); return record ? xHandleForRecord(record) : clean; };
const trackedXHandles = () => [...new Set(kolDataset.records.map(xHandleForRecord).filter((handle) => validHandleCandidate(handle)))];
const xFeedForHandle = (handle: string) => state.xFeeds[xFeedKey(handle)];
const xFeedStatusLabel = (feed?: XProfileFeed) => feed?.status === "LIVE" ? (feed.stale ? "LIVE · STALE CACHE" : "LIVE") : feed?.status === "KEY_REQUIRED" ? "KEY REQUIRED" : feed?.status === "RATE_LIMITED" ? "RATE LIMITED" : "UNAVAILABLE";
const xPostAge = (createdAt?: string) => createdAt ? timeAgo(Math.round(Date.parse(createdAt) / 1000)) : "—";
const xPostEngagement = (post: XPostEvidence) => post.publicMetrics.replies + post.publicMetrics.likes + post.publicMetrics.reposts + post.publicMetrics.quotes;
const xTokenEvidenceLabels = (post: XPostEvidence) => [...post.contractAddresses.map((address) => shortAddress(address)), ...post.tokenMentions.slice(0, 4).map((token) => `$${token}`)].join(" · ");
const xProfileFeedRows = (feed?: XProfileFeed) => (feed?.posts ?? []).slice(0, 6).map((post) => `<article class="x-post-row"><div><span>${post.isReply ? "REPLY" : "POST"} · ${escapeHtml(xPostAge(post.createdAt))} · ${xPostEngagement(post)} engagement</span><b>${escapeHtml(xTokenEvidenceLabels(post) || "No contract or ticker extracted")}</b><p>${escapeHtml(post.text)}</p>${post.contractAddresses.length ? `<div class="x-post-cas">${post.contractAddresses.slice(0, 3).map((address) => `<button class="copy-ca" data-copy-ca="${escapeHtml(address)}">${uiIcon("Copy", "button-icon")}CA ${shortAddress(address)}</button>`).join("")}</div>` : ""}</div><a href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">Open ${uiIcon("ExternalLink", "inline-icon")}</a></article>`).join("");
function renderXProfileFeed(record: KolRecord) {
  const handle = xHandleForRecord(record);
  const feed = xFeedForHandle(handle);
  const review = state.twitterReviews[record.handle];
  if (!feed) return `<section class="x-feed-panel"><div class="x-feed-head"><div><span>LIVE X THESIS FEED</span><b>@${escapeHtml(handle)} · SYNCING</b></div><small>cookie session search</small></div><p class="x-feed-note">Fetching recent public posts and replies for this mapped X handle. Contract addresses and ticker mentions will be joined to pool evidence when found.</p></section>`;
  const summary = feed.profiles?.[xFeedKey(handle)]?.summary;
  const rows = xProfileFeedRows(feed);
  return `<section class="x-feed-panel ${feed.status.toLowerCase().replace("_", "-")}"><div class="x-feed-head"><div><span>LIVE X THESIS FEED · ${xFeedStatusLabel(feed)}</span><b>@${escapeHtml(handle)}</b></div><a href="${escapeHtml(review?.xUrl || `https://x.com/${encodeURIComponent(handle)}`)}" target="_blank" rel="noreferrer">Open profile ${uiIcon("ExternalLink", "inline-icon")}</a></div>${feed.status === "LIVE" ? `<div class="x-feed-metrics"><span><b>${summary?.postCount ?? feed.posts?.length ?? 0}</b><small>recent posts</small></span><span><b>${summary?.replyCount ?? 0}</b><small>replies</small></span><span><b>${summary?.contractCount ?? 0}</b><small>contract mentions</small></span><span><b>${summary?.engagement ?? 0}</b><small>engagement</small></span></div>${rows || `<p class="x-feed-note">No recent post contains a detected contract address or ticker candidate in the current window.</p>`}` : `<p class="x-feed-note">${escapeHtml(feed.note ?? "Recent X posts are unavailable for this profile.")}</p>`}<small class="x-feed-source">${escapeHtml(feed.source)}${feed.fetchedAt ? ` · fetched ${escapeHtml(xPostAge(feed.fetchedAt))}` : ""}</small></section>`;
}
function renderPoolXEvidence(pool: Pool) {
  const handles = [...new Set((pool.trackedWalletHandles ?? []).map(xHandleForFomoHandle).filter((handle) => validHandleCandidate(handle)))];
  if (!handles.length) return `<section class="x-token-evidence"><div class="x-feed-head"><div><span>X / TOKEN THESIS JOIN</span><b>Waiting for tracked-wallet matches</b></div><small>read-only</small></div><p class="x-feed-note">The pool has no retained tracked-profile handle in the current wallet scan, so no profile-specific X post can be attributed here.</p></section>`;
  const tokenSymbol = String(pool.symbol.split("-")[0] ?? "").trim().toUpperCase();
  const addresses = new Set([pool.tokenAddress, pool.pairAddress].filter(Boolean).map((address) => String(address).toLowerCase()));
  const sources: Array<{ handle: string; post: XPostEvidence; confidence: TwitterMatchConfidence }> = [];
  handles.forEach((handle) => {
    const feed = xFeedForHandle(handle);
    const review = Object.entries(state.twitterReviews).find(([, value]) => xFeedKey(value.xHandle) === xFeedKey(handle))?.[1];
    (feed?.posts ?? []).filter((post) => post.contractAddresses.some((address) => addresses.has(address.toLowerCase())) || post.tokenMentions.includes(tokenSymbol)).forEach((post) => sources.push({ handle, post, confidence: review?.autoMatch?.confidence ?? "CANDIDATE" }));
  });
  const pending = handles.some((handle) => !xFeedForHandle(handle));
  const rows = sources.slice(0, 8).map(({ handle, post, confidence }) => `<article class="x-token-row"><div><span>@${escapeHtml(handle)} · ${post.isReply ? "REPLY" : "POST"} · ${confidence}</span><b>${escapeHtml(xTokenEvidenceLabels(post) || tokenSymbol || "Token thesis")}</b><p>${escapeHtml(post.text)}</p>${post.contractAddresses.length ? `<div class="x-post-cas">${post.contractAddresses.slice(0, 3).map((address) => `<button class="copy-ca" data-copy-ca="${escapeHtml(address)}">${uiIcon("Copy", "button-icon")}CA ${shortAddress(address)}</button>`).join("")}</div>` : ""}</div><a href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">Source ${uiIcon("ExternalLink", "inline-icon")}</a></article>`).join("");
  return `<section class="x-token-evidence ${pending ? "is-pending" : ""}"><div class="x-feed-head"><div><span>X / TOKEN THESIS JOIN</span><b>${sources.length ? `${sources.length} matched post${sources.length === 1 ? "" : "s"}` : pending ? "Fetching recent posts" : "No recent CA match"}</b></div><small>${handles.length} tracked profile${handles.length === 1 ? "" : "s"}</small></div>${rows || `<p class="x-feed-note">${pending ? "Fetching recent posts and replies for the tracked profiles matched to this pool." : `No recent X post matched ${escapeHtml(tokenSymbol || "this token")} or its contract address. Seeded thesis evidence remains in each profile's source trail.`}</p>`}</section>`;
}

function header() { const links = [{ key: "home", label: "HOME" }, { key: "discover", label: "DISCOVER" }, { key: "kol", label: "KOL RADAR" }, { key: "playbooks", label: "PLAYBOOKS" }, { key: "academy", label: "ACADEMY" }]; const navLinks = links.map((link) => `<a class="${route() === link.key ? "active" : ""}" href="#${link.key}">${link.label}</a>`).join(""); return `<header class="topbar"><div class="brand"><a href="#home"><span class="brand-mark">${uiIcon("Waves")}</span><span>METEORA <small>LP SCREENER</small></span></a></div><nav>${navLinks}</nav><div class="badges"><span class="pill green">${uiIconSlot("CircleDot")}${chainLabel(state.chain).toUpperCase()}</span><span class="pill">READ-ONLY</span><button class="menu-toggle ${state.mobileNavOpen ? "open" : ""}" id="mobileNavToggle" aria-controls="mobileNav" aria-expanded="${state.mobileNavOpen}"><span class="menu-icon">${uiIcon("Menu")}</span><span class="sr-only">${state.mobileNavOpen ? "Close" : "Open"} navigation</span></button></div><div class="mobile-menu ${state.mobileNavOpen ? "open" : ""}" id="mobileNav" aria-hidden="${!state.mobileNavOpen}">${navLinks}<div class="mobile-menu-note"><span>${uiIcon("CircleDot")}</span> Read-only research workspace</div></div></header>`; }
function renderLab() { const sweep = state.lab === "curve" ? { xs: "90;180;250;300;350;420;510;90", ys: "194;190;168;74;168;190;194;194" } : state.lab === "bidask" ? { xs: "90;180;250;300;350;420;510;90", ys: "198;194;187;178;187;194;198;198" } : { xs: "90;180;250;300;350;420;510;90", ys: "182;168;151;142;132;113;118;182" }; const mode = state.lab === "curve" ? { label: "Curve", eyebrow: "CONCENTRATED RANGE", copy: "Liquidity sits close to the current price. Capital is efficient while the market stays inside the active range.", metric: "Narrow range", fee: "Higher efficiency", className: "curve-lab" } : state.lab === "bidask" ? { label: "Bid–Ask", eyebrow: "TWO-SIDED RANGE", copy: "Liquidity is staged below and above the market so the position can buy lower and sell higher.", metric: "Two-sided", fee: "Directional", className: "bidask-lab" } : { label: "Spot", eyebrow: "FULL RANGE", copy: "Liquidity follows the market across a broad range. It is simple, resilient, and less concentrated.", metric: "Wide range", fee: "Steady capture", className: "spot-lab" }; return `<section class="liquidity-lab"><div class="section-head"><div><p class="eyebrow">LIQUIDITY SHAPES · IN MOTION</p><h2>Choose the shape that matches your view.</h2><p class="subhead">The same deposit behaves differently depending on where liquidity is placed.</p></div><span class="live"><span></span> Live explainer</span></div><div class="lab-grid"><div class="lab-nav"><p class="eyebrow">PLAYBOOK ANIMATION</p><button class="lab-tab ${state.lab === "spot" ? "selected" : ""}" data-lab="spot"><span class="tab-icon spot-icon">${uiIcon("CircleDot")}</span><span><b>Spot</b><small>Price moves through</small></span><i>${uiIcon("ArrowRight")}</i></button><button class="lab-tab ${state.lab === "curve" ? "selected" : ""}" data-lab="curve"><span class="tab-icon curve-icon">${uiIcon("Activity")}</span><span><b>Curve</b><small>Price stays around here</small></span><i>${uiIcon("ArrowRight")}</i></button><button class="lab-tab ${state.lab === "bidask" ? "selected" : ""}" data-lab="bidask"><span class="tab-icon bid-icon">${uiIcon("ArrowLeftRight")}</span><span><b>Bid–Ask</b><small>Buy below · sell above</small></span><i>${uiIcon("ArrowRight")}</i></button><div class="lab-note"><span>${uiIcon("CircleCheck")}</span><p>Watch the moving price marker. It shows which part of the liquidity is active.</p></div></div><div class="lab-stage ${mode.className}"><div class="stage-copy"><p class="eyebrow">${mode.eyebrow}</p><h3>${mode.label}</h3><p>${mode.copy}</p><div class="metrics"><span><small>RANGE</small><b>${mode.metric}</b></span><span><small>FEE FLOW</small><b>${mode.fee}</b></span><span><small>MODE</small><b>Read-only</b></span></div></div><div class="graph"><div class="graph-label left">LOW</div><div class="graph-label center">CURRENT PRICE</div><div class="graph-label right">HIGH</div><svg viewBox="0 0 600 250" role="img" aria-label="Animated ${mode.label} liquidity shape"><defs><linearGradient id="fill-lab" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b7ff3c" stop-opacity=".33"/><stop offset="1" stop-color="#b7ff3c" stop-opacity="0"/></linearGradient><filter id="glow-lab"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><line x1="22" y1="205" x2="578" y2="205" class="axis"/><line x1="22" y1="25" x2="22" y2="205" class="axis"/><line x1="300" y1="25" x2="300" y2="205" class="price-line"/><g class="grid-lines"><line x1="115" y1="25" x2="115" y2="205"/><line x1="207" y1="25" x2="207" y2="205"/><line x1="393" y1="25" x2="393" y2="205"/><line x1="485" y1="25" x2="485" y2="205"/></g><path class="liquidity-fill" d="${state.lab === "spot" ? "M22 189 C95 180 132 157 185 170 S280 120 335 142 S450 94 578 115 L578 205 L22 205Z" : state.lab === "curve" ? "M22 199 C165 199 221 197 257 183 C278 171 286 74 300 52 C314 74 322 171 343 183 C379 197 435 199 578 199 L578 205 L22 205Z" : "M22 200 C118 198 174 192 225 185 C250 181 272 179 300 178 C328 179 350 181 375 185 C426 192 482 198 578 200 L578 205 L22 205Z"}"/><path class="liquidity-line" d="${state.lab === "spot" ? "M22 189 C95 180 132 157 185 170 S280 120 335 142 S450 94 578 115" : state.lab === "curve" ? "M22 199 C165 199 221 197 257 183 C278 171 286 74 300 52 C314 74 322 171 343 183 C379 197 435 199 578 199" : "M22 200 C118 198 174 192 225 185 C250 181 272 179 300 178 C328 179 350 181 375 185 C426 192 482 198 578 200"}"/><circle class="price-dot" cx="300" cy="${state.lab === "curve" ? "74" : state.lab === "bidask" ? "178" : "142"}" r="7" filter="url(#glow-lab)"/><circle class="price-dot-halo" cx="300" cy="${state.lab === "curve" ? "74" : state.lab === "bidask" ? "178" : "142"}" r="17"/><circle class="moving-price" cx="90" cy="190" r="5"><animate attributeName="cx" values="${sweep.xs}" dur="7s" repeatCount="1"/><animate attributeName="cy" values="${sweep.ys}" dur="7s" repeatCount="1"/></circle><circle class="flow-dot" cx="22" cy="205" r="3"><animate attributeName="cx" values="22;578;22" dur="5.5s" repeatCount="1"/></circle><circle class="flow-dot secondary" cx="578" cy="205" r="3"><animate attributeName="cx" values="578;22;578" dur="7s" repeatCount="1"/></circle></svg><div class="axis-labels"><span>PRICE RANGE</span><span>LIQUIDITY DEPTH</span></div></div></div></div><div class="lab-footer"><span>01 / 03</span><span>Drag your mental model across the range before choosing a strategy.</span><span class="lab-progress"><i></i><i></i><i></i></span></div></section>`; }
 function renderHome() { return `<main class="page-home"><section class="hero"><div><p class="eyebrow">— LIQUIDITY INTELLIGENCE · LIVE FEED</p><h1>Read the pool <em>before you LP.</em></h1><p class="lede">Strategy-aware discovery for Meteora DLMM and DAMM experiments. Scan the market, inspect the 15m setup, then verify the pool yourself.</p><a class="primary" href="#discover">Explore candidates <span>${uiIcon("ArrowDown", "inline-icon")}</span></a><span class="muted">No wallet connection · no trade execution</span></div><div class="orbital" data-ui="product-fragment"><div class="orbit one"></div><div class="orbit two"></div><div class="core"><b>LP</b><small>SCAN</small></div><span class="tag top">15m</span><span class="tag left">DLMM</span><span class="tag right">DAMM</span></div></section>${renderLab()}<section class="home-cards"><article><p class="eyebrow">READ-ONLY BY DESIGN</p><h3>No wallet. No execution.</h3><p>Explore candidates without signing transactions or handing over custody.</p></article><article><p class="eyebrow">START WITH A LIST</p><h3>Open the screening workspace.</h3><p>Browse all pools, new launches, trend leaders, and high-liquidity setups.</p><a href="#discover" class="text-link">Open workspace ${uiIcon("ArrowRight", "inline-icon")}</a></article></section></main>`; }
const feedLoadedTotal = () => state.feedTotal || state.pools.length;
const feedIndexedTotal = () => state.feedAvailableTotal || feedLoadedTotal();
const feedCoverage = (visible: number) => state.feedAvailableTotal > feedLoadedTotal() ? `Showing ${visible} of ${feedLoadedTotal()} loaded · ${state.feedAvailableTotal.toLocaleString()} indexed pools` : `Showing ${visible} of ${feedLoadedTotal()} pools`;
const listCount = (kind: string) => kind === "eligible" ? state.pools.filter((p) => p.eligibility?.status === "OPEN_NOW" || p.eligibility?.status === "ELIGIBLE_WAIT").length : kind === "open" ? state.pools.filter((p) => p.eligibility?.status === "OPEN_NOW").length : kind === "all" ? feedIndexedTotal() : kind === "trending" ? state.pools.filter((p) => p.change24h > 5).length : kind === "new" ? state.pools.filter((p) => p.ageDays < 45).length : kind === "liquidity" ? state.pools.filter((p) => p.liquidity > 500000).length : kind === "smart" ? state.pools.filter((p) => (p.smartWallets ?? 0) > 0 || (p.trackedWalletHits ?? 0) > 0).length : kind === "kol" ? state.pools.filter((p) => (p.kolMentions ?? 0) >= 3).length : state.watchlist.length;
const gateCount = (status: EligibilityAnalysis["status"]) => state.pools.filter((pool) => pool.eligibility?.status === status).length;
const gateSummary = () => `<div id="workspace-gate-summary" class="gate-summary"><span><i class="gate-dot open"></i><b>${gateCount("OPEN_NOW")}</b> OPEN NOW</span><span><i class="gate-dot wait"></i><b>${gateCount("ELIGIBLE_WAIT")}</b> ELIGIBLE · WAIT</span><span><i class="gate-dot screening"></i><b>${gateCount("PENDING")}</b> SCREENING</span><span><i class="gate-dot rejected"></i><b>${gateCount("REJECTED")}</b> REJECTED</span><small>Fast feed gates: liquidity · volume · age · LP metrics · deep scan required for final evidence</small></div>`;
const decisionFilterLabel = (value: string) => value === "lp" ? "LP candidates" : value === "runner" ? "Runner candidates" : value === "flow" ? "Flow upside" : value === "rejected" ? "Rejected" : "All decisions";
const workspaceFiltersDirty = () => state.list !== "all" || Boolean(state.query.trim()) || state.minLiquidity !== defaultMinLiquidityForChain(state.chain) || state.minVolume !== defaultMinVolumeForChain(state.chain) || state.maxAge !== defaultMaxAgeForChain(state.chain) || state.scoreMin !== 0 || state.sort !== "score" || state.walletFilter !== "all" || state.kolFilter !== "all" || state.decisionFilter !== "all";
function workspaceFilterState(pools: Pool[], heading: string) {
  const chips = [
    state.list !== "all" ? heading : "All pools",
    state.query.trim() ? `Search: ${state.query.trim()}` : "",
    state.minLiquidity !== defaultMinLiquidityForChain(state.chain) ? `Liquidity ≥ ${money(state.minLiquidity)}` : "",
    state.minVolume !== defaultMinVolumeForChain(state.chain) ? `Volume ≥ ${money(state.minVolume)}` : "",
    state.maxAge !== defaultMaxAgeForChain(state.chain) ? `Age ≤ ${state.maxAge}d` : "",
    state.scoreMin !== 0 ? `Score ≥ ${state.scoreMin}` : "",
    state.walletFilter !== "all" ? `Wallet: ${state.walletFilter}` : "",
    state.kolFilter !== "all" ? `KOL: ${state.kolFilter}` : "",
    state.decisionFilter !== "all" ? `Decision: ${decisionFilterLabel(state.decisionFilter)}` : "",
  ].filter(Boolean).map((chip) => `<span class="filter-chip">${escapeHtml(chip)}</span>`).join("");
  return `<div class="workspace-filter-state"><div class="workspace-filter-copy"><span>WORKSPACE STATE</span><strong>${pools.length} shown</strong><small>${workspaceFiltersDirty() ? "Custom filters are active" : "Default all-pools view"}</small></div><div class="filter-chip-list">${chips}</div>${workspaceFiltersDirty() ? `<button class="filter-reset" data-preset="reset">Reset filters</button>` : ""}</div>`;
}
function emptyWorkspaceState() {
  if (state.loading) return `<div class="empty-state"><strong>Loading market data</strong><p>Waiting for the server feed snapshot to finish.</p></div>`;
  const showAll = state.pools.length > 0 && state.list !== "all" ? `<button class="filter-reset" data-preset="all">Show all pools (${state.pools.length})</button>` : "";
  if (state.decisionFilter !== "all") return `<div class="empty-state"><strong>No ${escapeHtml(decisionFilterLabel(state.decisionFilter))} yet</strong><p>Nothing in the current feed has this decision label. Try All decisions or wait for the next live refresh.</p><div class="empty-actions">${showAll}<button class="filter-reset" data-preset="reset">Reset filters</button></div></div>`;
  if (state.walletFilter === "tracked") return `<div class="empty-state"><strong>No tracked-wallet matches yet</strong><p>The captured wallet set is mapped, but no pool has a retained match in this scan window.</p><div class="empty-actions">${showAll}<button class="filter-reset" data-preset="reset">Reset filters</button></div></div>`;
  const title = state.list === "eligible" ? "No eligible setups right now" : "No pools match this view";
  const copy = state.list === "eligible" ? "No pool currently passes every LP, activity, safety, and evidence gate. Open all pools to inspect the screening queue." : "Broaden the thresholds or return to the default eligibility view.";
  return `<div class="empty-state"><strong>${title}</strong><p>${copy}</p><div class="empty-actions">${showAll}<button class="filter-reset" data-preset="reset">Reset filters</button></div></div>`;
}
function listNav() { return `<aside class="list-sidebar"><p class="eyebrow">MARKET VIEWS</p><button class="list-link ${state.list === "eligible" ? "selected" : ""}" data-list="eligible">${uiIconSlot("Check")}Eligible setups <b>${listCount("eligible")}</b></button><button class="list-link ${state.list === "open" ? "selected" : ""}" data-list="open">${uiIconSlot("ArrowUpRight")}Open now <b>${listCount("open")}</b></button><button class="list-link ${state.list === "all" ? "selected" : ""}" data-list="all">${uiIconSlot("CircleDot")}All pools <b>${listCount("all")}</b></button><button class="list-link ${state.list === "trending" ? "selected" : ""}" data-list="trending">${uiIconSlot("TrendingUp")}Trending <b>${listCount("trending")}</b></button><button class="list-link ${state.list === "new" ? "selected" : ""}" data-list="new">${uiIconSlot("Sparkles")}New pools <b>${listCount("new")}</b></button><button class="list-link ${state.list === "liquidity" ? "selected" : ""}" data-list="liquidity">${uiIconSlot("Droplets")}High liquidity <b>${listCount("liquidity")}</b></button><button class="list-link ${state.list === "smart" ? "selected" : ""}" data-list="smart">${uiIconSlot("WalletCards")}Smart wallets <b>${listCount("smart")}</b></button><button class="list-link ${state.list === "kol" ? "selected" : ""}" data-list="kol">${uiIconSlot("Megaphone")}KOL flow <b>${listCount("kol")}</b></button><button class="list-link ${state.list === "watchlist" ? "selected" : ""}" data-list="watchlist">${uiIconSlot("Star")}Watchlist <b>${listCount("watchlist")}</b></button><div class="chain-block"><p class="eyebrow">CHAINS</p><div class="chain ${state.chain === "solana" ? "selected" : ""}" data-chain="solana"><span class="chain-dot"></span>Solana <b>${formatTvl(state.chainTvl.Solana)}</b></div><div class="chain ${state.chain === "ethereum" ? "selected" : ""}" data-chain="ethereum"><span class="chain-dot eth"></span>Ethereum <b>${formatTvl(state.chainTvl.Ethereum)}</b></div><div class="chain ${state.chain === "base" ? "selected" : ""}" data-chain="base"><span class="chain-dot base"></span>Base <b>${formatTvl(state.chainTvl.Base)}</b></div><div class="chain ${state.chain === "robinhood" ? "selected" : ""}" data-chain="robinhood"><span class="chain-dot robinhood"></span>Robinhood <b>${formatTvl(state.chainTvl.Robinhood)}</b></div></div></aside>`; }
function comparePanel() { const pools = state.compareList.map((key) => poolByKey(key)).filter(Boolean) as Pool[]; if (!pools.length) return ""; return `<div class="compare-panel"><div class="compare-head"><div><p class="eyebrow">CANDIDATE COMPARISON</p><b>${pools.length} selected</b></div><button class="evidence-close" data-clear-compare aria-label="Clear comparison">${uiIcon("X", "button-icon")}</button></div><div class="compare-grid">${pools.map((pool) => { const snapshot = scoreSnapshotFor(pool); return `<div class="compare-card"><div class="compare-title"><strong>${pool.name}</strong><button class="row-compare active" data-compare="${poolKey(pool)}" aria-label="Remove from comparison">${uiIcon("Check", "button-icon")}</button></div><small>${pool.dex} · ${pool.risk} risk · snapshot ${snapshot.snapshotId}</small><div><span>LP fit <b>${snapshot.lpFit}</b></span><span>Evidence <b>${snapshot.evidenceConfidence}</b></span><span>Liquidity <b>${money(pool.liquidity)}</b></span><span>15m <b>${pool.technical?.trend ?? "—"}</b></span><span>Wallets <b>${pool.walletIntelligence === "UNAVAILABLE" ? "?" : pool.smartWallets ?? 0}</b></span><span>KOL <b>${pool.kolIntelligence === "UNAVAILABLE" ? "?" : pool.kolMentions ?? 0}</b></span><span>Cap <b>${marketCapTierLabel(marketCapTier(pool.marketCap))}</b></span><span>Runner <b>${isRunnerTier(pool.marketCap) ? snapshot.runnerPotential : "—"}</b></span><span>Flow <b>${snapshot.flowUpside}</b></span></div><i class="compare-bar"><em style="width:${snapshot.lpFit}%"></em></i></div>`; }).join("")}</div></div>`; }
function candleChartSvg(candles: Candle[], label: string, supertrendValue?: number, compact = false) {
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || Math.max(Math.abs(max) * 0.01, 1);
  const plotLeft = 11;
  const plotRight = 83;
  const priceTop = 5;
  const priceBottom = 73;
  const volumeTop = 78;
  const volumeBottom = 91;
  const yFor = (value: number) => priceTop + ((max - value) / span) * (priceBottom - priceTop);
  const priceLabel = (value: number) => `$${formatPrice(value)}`;
  const timeLabel = (timestamp: number) => new Date(timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const volumeLabel = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K` : `${Math.round(value)}`;
  const maxVolume = Math.max(...candles.map((candle) => Math.max(0, candle.volume)), 1);
  const plotWidth = plotRight - plotLeft;
  const step = plotWidth / candles.length;
  const bodyWidth = Math.max(0.8, Math.min(3.6, step * 0.62));
  const bars = candles.map((candle, index) => {
    const center = plotLeft + (index + 0.5) * step;
    const highY = yFor(candle.high);
    const lowY = yFor(candle.low);
    const openY = yFor(candle.open);
    const closeY = yFor(candle.close);
    const bullish = candle.close >= candle.open;
    const bodyY = Math.min(openY, closeY);
    const bodyHeight = Math.max(0.9, Math.abs(openY - closeY));
    const volumeHeight = Math.max(0.8, (Math.max(0, candle.volume) / maxVolume) * (volumeBottom - volumeTop));
    const volumeY = volumeBottom - volumeHeight;
    const direction = bullish ? "up" : "down";
    const tooltip = `${timeLabel(candle.time)} · O ${priceLabel(candle.open)} · H ${priceLabel(candle.high)} · L ${priceLabel(candle.low)} · C ${priceLabel(candle.close)} · Vol ${volumeLabel(candle.volume)}`;
    const tooltipAttr = escapeHtml(tooltip);
    return `<g class="candle-hit candle ${direction}" tabindex="0" data-tooltip="${tooltipAttr}" aria-label="${tooltipAttr}"><title>${tooltipAttr}</title><line class="candle-wick" x1="${center.toFixed(3)}" x2="${center.toFixed(3)}" y1="${highY.toFixed(3)}" y2="${lowY.toFixed(3)}"/><rect class="candle-body" x="${(center - bodyWidth / 2).toFixed(3)}" y="${bodyY.toFixed(3)}" width="${bodyWidth.toFixed(3)}" height="${bodyHeight.toFixed(3)}" rx=".35"/><rect class="candle-volume" x="${(center - bodyWidth / 2).toFixed(3)}" y="${volumeY.toFixed(3)}" width="${bodyWidth.toFixed(3)}" height="${volumeHeight.toFixed(3)}" rx=".25"/><rect class="candle-hitbox" x="${(center - step / 2).toFixed(3)}" y="${priceTop}" width="${step.toFixed(3)}" height="${volumeBottom - priceTop}"/></g>`;
  }).join("");
  const supertrendY = typeof supertrendValue === "number" && Number.isFinite(supertrendValue) ? Math.max(priceTop, Math.min(priceBottom, yFor(supertrendValue))) : undefined;
  const midpoint = (priceTop + priceBottom) / 2;
  const timeIndexes = [...new Set([0, Math.floor((candles.length - 1) / 2), candles.length - 1])];
  const timeTicks = timeIndexes.map((index, tick) => {
    const x = plotLeft + (index + 0.5) * step;
    const anchor = tick === 0 ? "start" : tick === timeIndexes.length - 1 ? "end" : "middle";
    return `<text class="chart-axis-label chart-time-label" x="${x.toFixed(3)}" y="98" text-anchor="${anchor}">${timeLabel(candles[index].time)}</text>`;
  }).join("");
  const axes = `<g class="candle-grid"><line x1="${plotLeft}" x2="${plotRight}" y1="${priceTop}" y2="${priceTop}"/><line x1="${plotLeft}" x2="${plotRight}" y1="${midpoint}" y2="${midpoint}"/><line x1="${plotLeft}" x2="${plotRight}" y1="${priceBottom}" y2="${priceBottom}"/><line x1="${plotLeft}" x2="${plotRight}" y1="${volumeTop - 1}" y2="${volumeTop - 1}"/><line x1="${plotLeft}" x2="${plotLeft}" y1="${priceTop}" y2="${volumeBottom}"/><line x1="${plotRight}" x2="${plotRight}" y1="${priceTop}" y2="${volumeBottom}"/></g><g class="candle-axis"><text class="chart-axis-label chart-price-label" x="86" y="${priceTop + 2}">${priceLabel(max)}</text><text class="chart-axis-label chart-price-label" x="86" y="${midpoint + 1.5}">${priceLabel((max + min) / 2)}</text><text class="chart-axis-label chart-price-label" x="86" y="${priceBottom + 1.5}">${priceLabel(min)}</text>${timeTicks}</g>`;
  return `<svg class="candlestick-chart${compact ? " pool-sparkline" : ""}" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="15 minute candlestick chart for ${escapeHtml(label)}">${axes}${supertrendY === undefined ? "" : `<line class="supertrend-line" x1="${plotLeft}" x2="${plotRight}" y1="${supertrendY.toFixed(3)}" y2="${supertrendY.toFixed(3)}"/>`}${bars}</svg>`;
}

function miniChart(pool: Pool) {
  const candles = (pool.candles ?? []).slice(-48);
  if (candles.length < 2) return `<div class="mini-chart empty"><span class="chart-loading-line"></span><div class="mini-chart-head"><span>15M CANDLES</span><span>Loading live history</span></div><p>Waiting for the configured pool OHLCV source. No proxy is shown.</p></div>`;
  return `<div class="mini-chart"><div class="mini-chart-head"><span>15M CANDLES · OHLC</span><span>${candles.length} candles · ${timeAgo(pool.technical?.latestTimestamp)}</span></div>${candleChartSvg(candles, pool.name, pool.technical?.supertrend)}<div class="candle-tooltip" role="status" aria-live="polite" hidden></div><div class="mini-chart-legend"><span><i class="candle-key up"></i>Up candle</span><span><i class="candle-key down"></i>Down candle</span><span><i class="st-key"></i>Supertrend</span></div></div>`;
}
function poolSparkline(pool: Pool) {
  const candles = (pool.previewCandles ?? []).slice(-24);
  if (candles.length < 2) {
    return `<div class="pool-chart-visual is-pending"><span class="chart-pending">5m preview queued</span></div>`;
  }
  return `<div class="pool-chart-visual is-actual">${candleChartSvg(candles, pool.name, undefined, true)}<div class="candle-tooltip" role="status" aria-live="polite" hidden></div><small class="chart-state">${pool.previewTimeframe ?? "5m"} preview · ${candles.length} candles</small></div>`;
}

function evidenceNavigation(pool: Pool) {
  const pools = filtered();
  const index = pools.findIndex((item) => poolKey(item) === poolKey(pool));
  if (pools.length < 2 || index < 0) return `<div class="evidence-nav"><span>Selected pool · outside the current result view</span></div>`;
  const previous = pools[index - 1];
  const next = pools[index + 1];
  return `<div class="evidence-nav"><span>POOL ${index + 1} / ${pools.length}</span><div><button data-evidence-prev="${escapeHtml(previous ? poolKey(previous) : "")}" ${previous ? "" : "disabled"} aria-label="Previous pool">${uiIcon("ChevronLeft", "button-icon")}Previous</button><button data-evidence-next="${escapeHtml(next ? poolKey(next) : "")}" ${next ? "" : "disabled"} aria-label="Next pool">Next${uiIcon("ChevronRight", "button-icon")}</button></div></div>`;
}

function poolEvidence() {
  const pool = poolByKey(state.selectedPool);
  if (!pool) return "";
  const live = pool.intelligence === "LIVE";
  const evidenceKicker = pool.enrichmentLoading ? "LIVE PROVIDER · UPDATING" : live ? "LIVE PROVIDER" : pool.intelligence === "DEMO" ? "DEMO SNAPSHOT" : "LIVE MARKET · DATA GAP";
  const t = pool.technical;
  const trackedWalletLabel = pool.trackedWalletHits ? ` · ${pool.trackedWalletHits} tracked profile${pool.trackedWalletHits === 1 ? "" : "s"}` : "";
  const walletLabel = pool.walletIntelligence === "UNAVAILABLE" ? "Unavailable" : `${pool.smartMoneyLabels?.length ? `${pool.smartWallets ?? 0} smart-money holders` : `${pool.smartWallets ?? 0} recent traders`}${trackedWalletLabel}`;
  const trackedWalletDetail = pool.trackedWalletHandles?.length ? ` · matched ${pool.trackedWalletHandles.slice(0, 3).join(", ")}${pool.trackedWalletHandles.length > 3 ? ` +${pool.trackedWalletHandles.length - 3}` : ""} (${(pool.trackedWalletConfidence ?? "resolver").toUpperCase()})` : " · no captured wallet-map match in this recent sample";
  const walletDetail = pool.walletIntelligence === "UNAVAILABLE" ? (pool.walletSource ?? "Waiting for on-chain pool transaction analysis.") : `${pool.walletFlow ?? "MIXED"} · ${pool.walletSource ?? "observed in the current snapshot"}${pool.smartMoneyLabels?.length ? " · " + pool.smartMoneyLabels.join(", ") : " · RPC signers are recent-trader evidence, not a smart-money label"}${trackedWalletDetail}`;
  const publicLabel = (pool.publicLinks ?? 0) > 0 ? `${pool.publicLinks} public links` : "No profile links";
  const publicDetail = pool.oculaStatus === "LIVE" ? `Ocula discovery · ${pool.oculaHolders ? pool.oculaHolders.toLocaleString() : "—"} holders · ${pool.oculaVolume1h ? money(pool.oculaVolume1h) : "—"} 1h volume` : pool.profileUrl ? "Profile data from Dexscreener" : "Attention context only; not KOL confirmation";
  const kolLabel = pool.kolIntelligence === "UNAVAILABLE" ? "Provider required" : `${pool.kolMentions ?? 0} public mentions · ${pool.kolCreators ?? pool.kolMentions ?? 0} creators`;
  const kolDetail = pool.kolIntelligence === "UNAVAILABLE" ? (pool.kolSource && !pool.kolSource.includes("Provider key required") ? pool.kolSource : "Connect LunarCrush, Nansen, or an existing intelligence endpoint.") : `${pool.kolSource ?? "Provider-backed activity"} · latest ${pool.kolRecency ?? "—"} ago`;
  const breakdown = scoreBreakdown(pool);
  const score = scoreFor(pool);
  const capTier = marketCapTierLabel(marketCapTier(pool.marketCap));
  const flow = volumeUpsideScore(pool);
  const decision = poolDecision(pool, score);
  const signal = pool.primaryPlaybook;
  const eligibility = pool.eligibility;
  const launch = pool.launch;
  const launchLabel = !launch || launch.status === "UNAVAILABLE" ? "Unavailable" : `${launch.status} · ${launch.score}/100`;
  const launchDetail = !launch || launch.status === "UNAVAILABLE" ? "Local launch history has not observed this token yet." : `${launch.sightings} sighting${launch.sightings === 1 ? "" : "s"} · ${launch.publicLinks} public link${launch.publicLinks === 1 ? "" : "s"}${launch.vetoes.length ? ` · ${launch.vetoes.slice(0, 2).join(" ")}` : ` · ${launch.tells.slice(0, 2).join(" · ")}`}`;
  const safetyLabel = pool.tokenStatus !== "LIVE" ? "Pending" : pool.tokenSafety === "PASS" ? "PASS" : "WARNING";
  const leadWallet = pool.walletAddresses?.[0];
  const evidenceContract = pool.tokenAddress ? `<button class="copy-ca evidence-ca" data-copy-ca="${pool.tokenAddress}" title="Copy token contract address">CA ${shortAddress(pool.tokenAddress)}</button>` : "CA unavailable";
  const socialTools = (pool.oculaSocialUrls ?? []).map((href, index) => [href.includes("x.com") ? "X social" : href.includes("t.me") || href.includes("telegram") ? "Telegram" : `Ocula social ${index + 1}`, href]);
  const researchTools = [["Ocula", "https://ocula.fun/explore"], ["GMGN", pool.tokenAddress ? `https://gmgn.ai/sol/token/${pool.tokenAddress}` : "https://gmgn.ai/"], ["Birdeye", pool.tokenAddress ? `https://birdeye.so/token/${pool.tokenAddress}?chain=solana` : "https://birdeye.so/"], ["Bubblemaps", pool.tokenAddress ? `https://v2.bubblemaps.io/map?chain=solana&address=${pool.tokenAddress}&partnerId=regular` : "https://v2.bubblemaps.io/"], ["DeFiLlama", "https://defillama.com/"], ["Kaito", "https://kaito.ai/"], ["MadeOnSol", "https://madeonsol.com/"], ["Cielo", leadWallet ? `https://app.cielo.finance/profile/${leadWallet}` : "https://cielo.finance/"], ["Moby", "https://mobyagent.com/"], ["Nansen", "https://www.nansen.ai/"], ["Artemis", "https://www.artemisanalytics.com/"], ...socialTools].map(([label, href]) => `<a href="${href}" target="_blank" rel="noreferrer">${label} ${uiIcon("ExternalLink", "inline-icon")}</a>`).join("");
  return `<aside class="evidence-panel" role="dialog" aria-modal="true" aria-label="Selected pool evidence"><div class="evidence-head"><div><p class="eyebrow">CANDIDATE EVIDENCE · ${evidenceKicker}</p><h3>${pool.name} <span class="status-pill ${statusClass(signal?.status)}">${statusLabel(signal?.status)}</span> <span class="decision-pill ${decision.className}">${decision.label}</span></h3><p>${pool.dex} · pair ${pool.address} · ${evidenceContract}${pool.sourceUrl ? ` · <a href="${pool.sourceUrl}" target="_blank" rel="noreferrer">source ${uiIcon("ExternalLink", "inline-icon")}</a>` : ""}</p></div><div class="evidence-actions"><button class="watch-toggle ${state.watchlist.includes(poolKey(pool)) ? "active" : ""}" data-watch="${poolKey(pool)}">${state.watchlist.includes(poolKey(pool)) ? `${uiIcon("Star", "button-icon")} Watching` : `${uiIcon("Star", "button-icon")} Watch`}</button><button class="evidence-close" data-close-evidence aria-label="Close selected pool evidence" title="Back to results">${uiIcon("X", "button-icon")}</button></div>${evidenceNavigation(pool)}</div>${miniChart(pool)}<div class="indicator-grid"><div><span>15M TREND</span><b>${t?.trend ?? "UNAVAILABLE"}</b></div><div><span>RSI(2)</span><b>${t?.rsi2 === undefined ? "—" : t.rsi2.toFixed(1)}</b></div><div><span>SUPERTREND</span><b>${t?.supertrend === undefined ? "—" : formatPrice(t.supertrend)}</b></div><div><span>BOLLINGER WIDTH</span><b>${t?.bollinger ? `${t.bollinger.widthPct.toFixed(1)}%` : "—"}</b></div><div><span>HISTORY DRAWDOWN</span><b>${t?.drawdownPct === undefined ? "—" : `${t.drawdownPct.toFixed(1)}%`}</b></div><div><span>SIGNAL DATA</span><b>${t?.available ? (t.fresh ? "FRESH" : "STALE") : "PENDING"}</b></div><div><span>CAP PROFILE</span><b>${capTier}</b></div><div><span>LP FIT</span><b>${score}/100</b></div><div><span>RUNNER POTENTIAL</span><b>${isRunnerTier(pool.marketCap) ? `${breakdown.runner}/100` : "N/A · cap outside cohort"}</b></div><div><span>FLOW UPSIDE</span><b>${flow}/100</b></div><div><span>EVIDENCE CONFIDENCE</span><b>${breakdown.confidence}/100${breakdown.pending ? " · PENDING" : ""}</b></div></div><div class="evidence-grid"><div class="evidence-score"><span>LP FIT</span><strong>${score}</strong><small>${decision.label} · normalized LP fit · flow upside ${flow}/100 · evidence confidence ${breakdown.confidence}/100 · snapshot ${breakdown.snapshotId}</small><div class="score-track"><i style="width:${score}%"></i></div></div><div class="evidence-item"><span class="evidence-icon wallet">${uiIcon("WalletCards")}</span><div><b>Smart-wallet activity</b><strong>${walletLabel}</strong><small>${walletDetail}</small></div></div><div class="evidence-item"><span class="evidence-icon kol">${uiIcon("Megaphone")}</span><div><b>KOL / public attention</b><strong>${kolLabel}</strong><small>${kolDetail}</small></div></div><div class="evidence-item"><span class="evidence-icon public">${uiIcon("CircleDot")}</span><div><b>Public profile context</b><strong>${publicLabel}</strong><small>${publicDetail}</small></div></div><div class="evidence-item"><span class="evidence-icon launch">${uiIcon("Rocket")}</span><div><b>Launch observation</b><strong>${launchLabel}</strong><small>${launchDetail}</small></div></div><div class="evidence-item"><span class="evidence-icon score">${uiIcon("CircleCheck")}</span><div><b>Eligibility gate</b><strong>${eligibilityLabel(eligibility?.status)}</strong><small>${eligibility?.reasons?.slice(0, 3).join(" ") ?? "Waiting for live screening gates."}</small></div></div><div class="evidence-item"><span class="evidence-icon risk">${uiIcon("ShieldCheck")}</span><div><b>Token safety</b><strong>${safetyLabel}</strong><small>${pool.tokenSource ?? "Waiting for Solana RPC mint checks."}${pool.holderTop10Pct === undefined ? "" : " · top 10 " + pool.holderTop10Pct.toFixed(1) + "%"}${pool.holderProfileStatus === "LIVE" ? " · " + (pool.holderProfileSource ?? "Birdeye holder profile") : ""}</small></div></div><div class="evidence-item"><span class="evidence-icon risk">${uiIcon("CircleAlert")}</span><div><b>Research gap</b><strong>${pool.walletIntelligence === "UNAVAILABLE" || pool.kolIntelligence === "UNAVAILABLE" || pool.tokenStatus !== "LIVE" ? "Some intelligence missing" : "Verify before entry"}</strong><small>Signals do not establish safety or profitability.</small></div></div></div>${renderPoolXEvidence(pool)}<div class="playbook-stack"><div class="playbook-stack-head"><span>PLAYBOOK CHECKS</span><small>${signal?.reason ?? "Waiting for indicator data."}</small></div>${(pool.playbooks ?? []).map((item) => `<div class="playbook-check"><b>${item.name}</b><span class="status-pill ${statusClass(item.status)}">${statusLabel(item.status)}</span><small>${item.reason}</small></div>`).join("")}</div><div class="evidence-bars"><span>DEPTH <b>${breakdown.liquidity} / 100</b><i style="width:${breakdown.liquidity}%"></i></span><span>VOLUME <b>${breakdown.volume} / 100</b><i style="width:${breakdown.volume}%"></i></span><span>TURNOVER <b>${breakdown.turnover} / 100</b><i style="width:${breakdown.turnover}%"></i></span><span>FEE REALIZATION <b>${breakdown.fee} / 100</b><i style="width:${breakdown.fee}%"></i></span><span>AGE RELIABILITY <b>${breakdown.age} / 100</b><i style="width:${breakdown.age}%"></i></span><span>15M RANGE <b>${breakdown.technical} / 100</b><i style="width:${breakdown.technical}%"></i></span><span>SAFETY <b>${breakdown.safety} / 100</b><i style="width:${breakdown.safety}%"></i></span><span>FLOW UPSIDE <b>${flow} / 100</b><i style="width:${flow}%"></i></span>${isRunnerTier(pool.marketCap) ? `<span>RUNNER <b>${breakdown.runner} / 100</b><i style="width:${breakdown.runner}%"></i></span>` : ""}</div><div class="research-stack"><span>RESEARCH STACK</span><div>${researchTools}</div><small>External surfaces are read-only context; eligibility still comes from this screener's live gates.</small></div><div class="evidence-footer"><span>Read-only evidence panel · ${t?.available ? `${t.candlesCount} 15m candles` : "indicator data pending"}</span><a href="#academy">Learn how to read signals ${uiIcon("ArrowRight", "inline-icon")}</a></div></aside>`;
}
const workspaceTableHeader = (label: string, key?: WorkspaceSort) => key ? `<th scope="col" class="${state.sort === key ? "is-sorted" : ""}" aria-sort="${state.sort === key ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"}"><button type="button" class="table-sort" data-table-sort="${key}" aria-label="Sort by ${label}"><span>${label}</span><i aria-hidden="true">${workspaceSortIndicator(key)}</i></button></th>` : `<th scope="col">${label}</th>`;
const workspaceTableScrollControls = () => `<div class="table-scroll-controls" aria-label="Horizontal table navigation"><span>SCROLL COLUMNS</span><button type="button" data-table-scroll="left" aria-label="Scroll table left">${uiIcon("ArrowLeft", "button-icon")}</button><button type="button" data-table-scroll="right" aria-label="Scroll table right">${uiIcon("ArrowRight", "button-icon")}</button></div>`;
const workspaceTableStickySpacer = () => `<tr class="table-sticky-spacer" aria-hidden="true"><th></th><th></th><th></th><th></th><th></th><th></th><th></th><th></th><th></th><th></th></tr>`;
function renderWorkspace() {
  const pools = filtered();
  const walletReady = state.pools.some((pool) => pool.walletIntelligence === "LIVE");
  const kolReady = state.pools.some((pool) => pool.kolIntelligence === "LIVE");
  const intelligenceReady = walletReady || kolReady;
  const walletScanLabel = state.walletScan.active ? `Scanning selected pool` : walletReady ? "Selected-pool scan complete" : state.liveReady ? "Deep scan on selection" : "Waiting for scan";
  const heading = state.list === "eligible" ? "Eligible setups" : state.list === "open" ? "Open now" : state.list === "all" ? "All pools" : state.list === "trending" ? "Trending pools" : state.list === "new" ? "New pools" : state.list === "liquidity" ? "High liquidity" : state.list === "smart" ? "Smart-wallet activity" : state.list === "kol" ? "KOL flow" : "Your watchlist";
  const previewReady = state.pools.filter((pool) => (pool.previewCandles?.length ?? 0) >= 2).length;
  const previewProgress = `${previewReady}/${state.pools.length} 5m previews`;
  const feedMessage = state.loading ? "Fetching lightweight market pairs…" : state.liveError ? state.liveError : state.lastUpdated ? `Updated ${timeAgo(Math.floor(state.lastUpdated / 1000))} · deep data loads on selection` : "Demo snapshot · deep data loads on selection";
  return `<main class="workspace-page${state.selectedPool ? " has-selection" : ""}"><div class="workspace-layout">${listNav()}<section class="workspace" data-workspace-root><div class="section-head"><div><p class="eyebrow">${chainLabel(state.chain).toUpperCase()} · SIGNAL STACK</p><h2>${heading}</h2><p class="subhead">Pool quality, technical setup, wallet behavior, and public attention in one read-only screen.</p></div><div id="workspace-live-status" class="live ${state.loading ? "is-loading" : state.liveError ? "is-error" : ""}"><span></span><strong class="live-label">${state.source}</strong><small>${feedMessage}</small></div></div><div id="workspace-feed-notice" class="feed-notice ${state.liveError ? "error" : state.loading ? "loading" : "ready"}"><span class="feed-state-icon">${uiIcon(state.loading ? "RefreshCw" : state.liveError ? "CircleAlert" : "CircleCheck")}</span><p>${state.loading ? "Live discovery is loading the lightweight market feed. Open a row or paste a CA to run the deep scan." : state.liveError ? state.liveError : "Fast screener view · LP metrics are available now; candles, wallet, safety, and KOL evidence load only for a selected token."}</p><b>${state.loading ? "Loading" : state.liveError ? "Fallback" : state.liveReady ? "Live ready" : "Demo"}</b></div>${gateSummary()}<div class="intelligence-strip"><div><span class="intel-icon wallet">${uiIcon("WalletCards")}</span><b>Smart wallets</b><small>${walletScanLabel} · ${trackedWalletAddressCount.toLocaleString()} mapped addresses</small></div><div><span class="intel-icon kol">${uiIcon("Megaphone")}</span><b>KOL flow</b><small>${kolReady ? "Provider-backed mentions" : state.liveReady ? "Deep scan on selection" : "Public mentions only"} · ${kolDataset.coverage.profilesWithWalletEvidence} mapped profiles</small></div><div><span class="intel-icon score">${uiIcon("Activity")}</span><b>LP fit</b><small>Depth + volume + range + safety</small></div><p>Deep signals load on demand so the table stays responsive.</p><button class="source-toggle" id="sourcesToggle">${state.sourcesOpen ? "Hide sources" : "Configure sources"} ${uiIcon("ArrowRight", "inline-icon")}</button></div><div class="preset-bar"><span class="eyebrow">QUICK RECIPES</span><button class="preset-btn" data-preset="conviction">High conviction</button><button class="preset-btn" data-preset="wallet">Smart-wallet flow</button><button class="preset-btn" data-preset="attention">KOL attention</button><button class="preset-btn" data-preset="liquidity">Liquidity first</button><span class="eyebrow decision-filter-label">DECISION FILTERS</span><button class="preset-btn decision-filter-btn ${state.decisionFilter === "all" ? "selected" : ""}" data-decision-filter="all">All decisions</button><button class="preset-btn decision-filter-btn ${state.decisionFilter === "lp" ? "selected" : ""}" data-decision-filter="lp">LP candidates</button><button class="preset-btn decision-filter-btn ${state.decisionFilter === "runner" ? "selected" : ""}" data-decision-filter="runner">Runner candidates</button><button class="preset-btn decision-filter-btn ${state.decisionFilter === "flow" ? "selected" : ""}" data-decision-filter="flow">Flow upside</button><button class="preset-btn decision-filter-btn ${state.decisionFilter === "rejected" ? "selected" : ""}" data-decision-filter="rejected">Rejected</button></div>${state.sourcesOpen ? `<div class="source-panel"><div><label>SMART WALLET WATCHLIST<small>One address per line or comma-separated</small><textarea id="walletSources">${state.trackedWallets.join("\n")}</textarea></label></div><div><label>KOL WATCHLIST<small>Handles or public profile URLs</small><textarea id="kolSources">${state.trackedKols.join("\n")}</textarea></label></div><div class="provider-health"><div class="provider-health-head"><span>PROVIDER HEALTH</span><small>Server-side keys stay private; only LIVE sources can satisfy eligibility.</small></div><div class="provider-health-grid">${state.providers.length ? state.providers.map((provider) => `<div class="provider-health-row"><b>${provider.label}</b><span class="provider-badge ${provider.status.toLowerCase().replace("_", "-")}">${providerStatusLabel(provider.status)}</span><small>${provider.source}</small></div>`).join("") : "<small>Loading provider health…</small>"}</div></div><div class="provider-note"><b>DexPaprika 15m candle adapter</b><p>Pool-specific 15m OHLCV uses the server-side <code>DEXPAPRIKA_API_KEY</code>. The browser never sees the key; GeckoTerminal remains a rate-limited fallback.</p><a href="https://dexpaprika.com/api/pricing" target="_blank" rel="noreferrer">Open DexPaprika plans ${uiIcon("ExternalLink", "inline-icon")}</a></div><div class="provider-note"><b>X thesis adapter</b><p>Recent public posts and replies are collected by the local TypeScript cookie worker with <code>auth_token</code> and <code>ct0</code>. The worker extracts Solana/EVM contract addresses, ticker candidates, reply counts, and engagement, then publishes only the normalized snapshot to Vercel.</p><a href="https://github.com/vladkens/twscrape" target="_blank" rel="noreferrer">Open X recent search docs ${uiIcon("ExternalLink", "inline-icon")}</a></div><div class="provider-note"><b>LunarCrush KOL adapter</b><p>Live creator and mention data requires a server-side <code>LUNARCRUSH_API_KEY</code> in Vercel. The key is never sent to the browser.</p><a href="https://lunarcrush.com/en/developers/keys" target="_blank" rel="noreferrer">Open LunarCrush API keys ${uiIcon("ExternalLink", "inline-icon")}</a></div><div class="provider-note"><b>Nansen smart-money adapter</b><p>Labeled smart-money holders and 24h flow require a server-side <code>NANSEN_API_KEY</code>. RPC recent traders remain separate evidence.</p><a href="https://docs.nansen.ai/v1-nansen-api/api/token-god-mode/holders" target="_blank" rel="noreferrer">Open Nansen holder API docs ${uiIcon("ExternalLink", "inline-icon")}</a></div><div class="provider-note"><b>Kaito attention adapter</b><p>Live token mentions require a server-side <code>KAITO_API_KEY</code>. Kaito is used only as a provider-backed attention signal.</p><a href="https://github.com/MetaSearch-IO/kaito-mcp-server" target="_blank" rel="noreferrer">Open Kaito API bridge ${uiIcon("ExternalLink", "inline-icon")}</a></div><div class="provider-note"><b>MadeOnSol free KOL adapter</b><p>When paid social keys are absent, the screener uses MadeOnSol’s public read-only KOL feed. The documented demo feed is delayed and rate limited; add <code>MADEONSOL_API_KEY</code> for the free 200-call/day tier.</p><a href="https://madeonsol.com/api-docs" target="_blank" rel="noreferrer">Open MadeOnSol API docs ${uiIcon("ExternalLink", "inline-icon")}</a></div><div class="source-panel-footer"><span>Saved locally · sent only to the configured intelligence provider.</span><button class="refresh" id="saveSources">Save watchlists</button></div></div>` : ""}<div class="controls" id="filters"><label>LIQUIDITY MINIMUM ($)<input id="minLiquidity" type="number" value="${state.minLiquidity}" step="10000"/></label><label>24H VOLUME MINIMUM ($)<input id="minVolume" type="number" value="${state.minVolume}" step="10000"/></label><label>MAX AGE (DAYS)<input id="maxAge" type="number" value="${state.maxAge}"/></label><label>MIN LP FIT<input id="scoreMin" type="number" min="0" max="100" value="${state.scoreMin}"/></label><label>SORT BY<select id="sort"><option value="score" ${state.sort === "score" ? "selected" : ""}>LP fit</option><option value="wallets" ${state.sort === "wallets" ? "selected" : ""}>Smart wallets</option><option value="kol" ${state.sort === "kol" ? "selected" : ""}>KOL mentions</option><option value="flow" ${state.sort === "flow" ? "selected" : ""}>LP flow upside</option><option value="liquidity" ${state.sort === "liquidity" ? "selected" : ""}>Liquidity</option><option value="volume" ${state.sort === "volume" ? "selected" : ""}>24h volume</option></select></label><label>WALLET SIGNAL<select id="walletFilter"><option value="all" ${state.walletFilter === "all" ? "selected" : ""}>All wallet activity</option><option value="active" ${state.walletFilter === "active" ? "selected" : ""}>Active wallets</option><option value="inflow" ${state.walletFilter === "inflow" ? "selected" : ""}>Net inflow</option><option value="tracked" ${state.walletFilter === "tracked" ? "selected" : ""}>Tracked FOMO wallets</option></select></label><label>KOL SIGNAL<select id="kolFilter"><option value="all" ${state.kolFilter === "all" ? "selected" : ""}>All KOL activity</option><option value="recent" ${state.kolFilter === "recent" ? "selected" : ""}>3+ mentions</option><option value="visible" ${state.kolFilter === "visible" ? "selected" : ""}>Any mention</option></select></label></div><div id="workspace-filter-state">${workspaceFilterState(pools, heading)}</div><div class="scan-bar"><div class="scan-copy"><span class="eyebrow">DEEP TOKEN SCAN</span><p>Scan one CA for fresh candles, safety, wallet and KOL evidence.</p></div><form class="ca-scan" id="ca-scan-form"><label for="scan-ca">TOKEN CA<input id="scan-ca" value="${escapeHtml(state.tokenScan.query)}" placeholder="Paste a Solana or EVM token address" inputmode="text" autocomplete="off"/></label><button class="scan-submit" id="scan-ca-submit" type="submit" ${state.tokenScan.status === "scanning" ? "disabled" : ""}>${uiIcon(state.tokenScan.status === "scanning" ? "RefreshCw" : "Search", "button-icon")} ${state.tokenScan.status === "scanning" ? "Scanning…" : "Scan token"}</button><small id="ca-scan-status" class="scan-status ${state.tokenScan.status}">${escapeHtml(state.tokenScan.message)}</small></form></div><div class="provider-meter" id="dexpaprika-usage"><span>DEXPAPRIKA FREE-TIER ESTIMATE</span><b>${formatProviderUsage(state.providerUsage)}</b><small>${previewProgress} · server-instance estimate · table uses batched 5m previews; full 15m candles load only on selection</small></div><div class="toolbar"><div class="search"><span class="search-icon">${uiIcon("Search")}</span><input id="query" placeholder="Search pools, tokens, or venues" value="${state.query}"/></div><label class="chain-select">NETWORK<select id="chainSelect"><option value="solana" ${state.chain === "solana" ? "selected" : ""}>Solana</option><option value="ethereum" ${state.chain === "ethereum" ? "selected" : ""}>Ethereum</option><option value="base" ${state.chain === "base" ? "selected" : ""}>Base</option><option value="robinhood" ${state.chain === "robinhood" ? "selected" : ""}>Robinhood</option></select></label><button class="refresh" id="refresh" ${state.loading ? "disabled" : ""}>${state.loading ? `${uiIcon("RefreshCw", "button-icon")} Refreshing…` : `${uiIcon("RefreshCw", "button-icon")} Refresh feed`}</button><button class="metric-toggle" id="metricToggle" type="button">${state.metricMode === "mcap" ? "Show price" : "Show MCAP"}</button><span class="count" id="workspace-count">${pools.length} candidates</span></div><div id="workspace-evidence-slot">${poolEvidence()}</div>${comparePanel()}<div class="table-wrap"><div class="table-scroll-viewport"><table><thead>${workspaceTableStickySpacer()}<tr>${workspaceTableHeader("POOL", "name")}${workspaceTableHeader("VENUE", "venue")}${workspaceTableHeader(state.metricMode === "mcap" ? "MCAP" : "PRICE", "price")}${workspaceTableHeader("LIQUIDITY", "liquidity")}${workspaceTableHeader("24H VOLUME", "volume")}${workspaceTableHeader("AGE", "age")}${workspaceTableHeader("15M SETUP")}${workspaceTableHeader("SIGNAL STACK", "wallets")}${workspaceTableHeader("CHART")}${workspaceTableHeader("LP FIT", "score")}</tr></thead><tbody id="workspace-table-body">${pools.map(poolRow).join("") || `<tr><td colspan="10" class="empty">${emptyWorkspaceState()}</td></tr>`}</tbody></table></div></div>${workspaceTableScrollControls()}<div class="screen-method"><span>SCREEN METHOD</span><p>LP fit is a normalized liquidity-provider suitability score. LP Candidate and Runner Candidate are fast-feed triage labels; final eligibility stays pending until selected-token candles, safety, wallet, and KOL evidence are live. Nano-to-Ultra-Micro runner potential can use volume and turnover proxies before the deep scan.</p><a href="#academy">Learn the signals ${uiIcon("ArrowRight", "inline-icon")}</a></div><div id="workspace-pagination" class="pagination"><span>${feedCoverage(pools.length)} · ${state.liveReady ? "live source" : "fallback source"}</span><div><button class="load-more" id="loadMorePools" ${state.feedHasMore && !state.feedLoadingMore ? "" : "disabled"}>${state.feedLoadingMore ? "Loading…" : state.feedHasMore ? "Load more" : "End of feed"}</button></div></div></div></section></div></main>`;
}
function academyLesson() { const lessons: Record<string, { label: string; title: string; copy: string; kicker: string; points: string[] }> = { bins: { label: "01 · BINS", title: "Liquidity lives in bins.", copy: "A DLMM turns the price range into discrete containers. Bin step controls the distance between neighboring prices, so a position can be narrow, wide, or stacked.", kicker: "FOUNDATIONS", points: ["Bins hold the liquidity", "Bin step sets price spacing", "Active bins are where swaps happen"] }, shapes: { label: "02 · SHAPES", title: "Shape the position around your view.", copy: "Spot, Curve, and Bid–Ask are starting points. The shape decides where capital sits and how the position responds when price moves.", kicker: "POSITION DESIGN", points: ["Spot follows a broad range", "Curve concentrates near price", "Bid–Ask stages below and above"] }, fees: { label: "03 · FEES", title: "Volume creates the fee stream.", copy: "Fees are earned when swaps cross your active liquidity. Dynamic fees respond to volatility, so the highest headline fee is not always the best setup.", kicker: "FEE MECHANICS", points: ["Volume is the input", "Active bins capture flow", "Volatility changes fee conditions"] }, risk: { label: "04 · RISK", title: "Price can leave your range.", copy: "Fees and token appreciation must be weighed against impermanent or divergent loss. A position needs a range, an invalidation rule, and a plan to manage it.", kicker: "RISK CONTROL", points: ["Track price against range", "Compare fees with divergence", "Exit or rebalance deliberately"] }, safety: { label: "05 · SAFETY", title: "Verify before you provide.", copy: "A beautiful chart is not enough. Check the token, contract, pool age, liquidity depth, volume quality, and concentration before committing capital.", kicker: "DUE DILIGENCE", points: ["Verify the contract", "Inspect liquidity and holders", "Treat signals as research"] }, opportunities: { label: "06 · OPPORTUNITIES", title: "Read the setup, not only the APY.", copy: "A useful candidate combines usable liquidity, real volume, a believable age, a fee tier that fits volatility, and a token you can verify.", kicker: "FINDING OPPORTUNITIES", points: ["Start with liquidity and volume", "Check age, volatility, and fees", "Validate the token before entry"] }, manage: { label: "07 · MANAGE", title: "A position is a process.", copy: "After entry, the job is observation: watch active bins, collect fees, compare price with the range, then rebalance or exit when the original thesis changes.", kicker: "POSITION MANAGEMENT", points: ["Monitor active bins", "Claim and record fees", "Rebalance or exit deliberately"] }, performance: { label: "08 · PERFORMANCE", title: "Separate fees from price change.", copy: "Review fee income, inventory change, and price movement as separate lines. A green fee number does not automatically mean the position won.", kicker: "P&L REVIEW", points: ["Track fees earned", "Track inventory and divergence", "Compare the result with holding spot"] } }; return lessons[state.academy] ?? lessons.bins; }
function academyVisual() { if (state.academy === "opportunities") return `<div class="tutorial-visual opportunity-visual"><div class="radar"><span class="radar-ring r1"></span><span class="radar-ring r2"></span><span class="radar-sweep"></span><i class="radar-dot d1"></i><i class="radar-dot d2"></i><i class="radar-dot d3"></i><b>POOL<br/>FIT</b></div><div class="opportunity-score"><span>SCREENING SCORE</span><strong>78 / 100</strong><div><i style="width:78%"></i></div><small>liquidity · volume · age · safety</small></div></div>`; if (state.academy === "manage") return `<div class="tutorial-visual manage-visual"><div class="manage-loop"><div><b>WATCH</b><small>active bins</small></div><span>→</span><div><b>COLLECT</b><small>fee flow</small></div><span>→</span><div><b>ADJUST</b><small>range thesis</small></div><span>↺</span></div><div class="manage-cursor"></div><p>MANAGEMENT LOOP · REPEAT WHILE THE THESIS HOLDS</p></div>`; if (state.academy === "performance") return `<div class="tutorial-visual performance-visual"><div class="perf-legend"><span><i class="fee-key"></i>FEES</span><span><i class="inventory-key"></i>INVENTORY</span><span><i class="spot-key"></i>HOLD SPOT</span></div><svg viewBox="0 0 500 220"><line x1="30" y1="185" x2="475" y2="185" class="perf-axis"/><line x1="30" y1="30" x2="30" y2="185" class="perf-axis"/><path class="perf-fee" d="M30 177 C90 169 111 160 151 148 S219 126 250 112 S337 81 475 48"/><path class="perf-inventory" d="M30 55 C95 61 125 75 166 91 S240 118 286 136 S370 151 475 163"/><path class="perf-spot" d="M30 169 C87 152 119 142 164 132 S260 98 310 79 S402 55 475 44"/><circle cx="250" cy="112" r="6" class="perf-dot"/></svg><div class="perf-labels"><span>ENTRY</span><span>REVIEW WINDOW</span><span>NOW</span></div></div>`; if (state.academy === "risk") return `<div class="tutorial-visual risk-visual"><div class="risk-range"><span>ACTIVE RANGE</span></div><div class="risk-price"></div><div class="risk-arrow">PRICE OUT OF RANGE ${uiIcon("ArrowUpRight", "inline-icon")}</div><div class="visual-axis"><span>LOW</span><span>ENTRY</span><span>HIGH</span></div></div>`; if (state.academy === "fees") return `<div class="tutorial-visual fees-visual"><div class="fee-pool"><span>POOL</span><b>DLMM</b></div><div class="fee-path p1"></div><div class="fee-path p2"></div><div class="fee-path p3"></div><div class="fee-particle f1">＋</div><div class="fee-particle f2">＋</div><div class="fee-particle f3">＋</div><div class="fee-caption">SWAP FLOW → ACTIVE BINS → FEE SHARE</div></div>`; if (state.academy === "shapes") return `<div class="tutorial-visual shapes-visual"><div class="mini-shape"><small>SPOT</small><span class="shape-line spot-line"></span></div><div class="mini-shape"><small>CURVE</small><span class="shape-line curve-line"></span></div><div class="mini-shape"><small>BID–ASK</small><span class="shape-line bid-line"></span></div></div>`; if (state.academy === "safety") return `<div class="tutorial-visual safety-visual"><div class="check-row"><span>${uiIcon("CircleCheck")}</span><b>CONTRACT VERIFIED</b><small>address</small></div><div class="check-row"><span>${uiIcon("CircleCheck")}</span><b>LIQUIDITY DEPTH</b><small>usable</small></div><div class="check-row warn"><span>${uiIcon("CircleAlert")}</span><b>CONCENTRATION</b><small>inspect</small></div><div class="check-row"><span>${uiIcon("CircleCheck")}</span><b>VOLUME QUALITY</b><small>active</small></div></div>`; return `<div class="tutorial-visual bins-visual"><div class="bin-price">CURRENT PRICE</div><div class="bins"><i></i><i></i><i></i><i></i><i class="active"></i><i class="active"></i><i class="active"></i><i></i><i></i><i></i><i></i><i></i></div><div class="bin-labels"><span>LOW</span><span>ACTIVE BINS</span><span>HIGH</span></div><div class="bin-step">BIN STEP <b>25 bps</b></div></div>`; }
function renderAcademy() { const lesson = academyLesson(); return `<main class="academy-page"><div class="academy-intro"><div><p class="eyebrow">LP ACADEMY · RESEARCH FIRST</p><h1>Learn the mechanics<br/><em>before you choose.</em></h1><p class="lede">A compact learning path for reading DLMM pools, designing positions, and managing risk with a clear mental model.</p></div><div class="academy-progress"><span>LEARNING PATH</span><b>${String(Object.keys({bins:1,shapes:1,fees:1,risk:1,safety:1,opportunities:1,manage:1,performance:1}).indexOf(state.academy) + 1).padStart(2, "0")} / 08</b><div><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div><div class="academy-layout"><aside class="academy-nav"><p class="eyebrow">COURSE MODULES</p><button class="academy-tab ${state.academy === "bins" ? "selected" : ""}" data-academy="bins"><span>01</span><b>Bins & bin steps</b><small>Foundations</small></button><button class="academy-tab ${state.academy === "shapes" ? "selected" : ""}" data-academy="shapes"><span>02</span><b>Liquidity shapes</b><small>Position design</small></button><button class="academy-tab ${state.academy === "fees" ? "selected" : ""}" data-academy="fees"><span>03</span><b>Fees & flow</b><small>Fee mechanics</small></button><button class="academy-tab ${state.academy === "risk" ? "selected" : ""}" data-academy="risk"><span>04</span><b>Range risk</b><small>Risk control</small></button><button class="academy-tab ${state.academy === "safety" ? "selected" : ""}" data-academy="safety"><span>05</span><b>Pool safety</b><small>Due diligence</small></button><button class="academy-tab ${state.academy === "opportunities" ? "selected" : ""}" data-academy="opportunities"><span>06</span><b>Find opportunities</b><small>Screening lens</small></button><button class="academy-tab ${state.academy === "manage" ? "selected" : ""}" data-academy="manage"><span>07</span><b>Manage positions</b><small>Ongoing process</small></button><button class="academy-tab ${state.academy === "performance" ? "selected" : ""}" data-academy="performance"><span>08</span><b>Review performance</b><small>P&amp;L review</small></button><a class="academy-source" href="https://www.lparmy.com/academy" target="_blank" rel="noreferrer">Based on public LP education ${uiIcon("ExternalLink", "inline-icon")}</a></aside><section class="lesson-card"><div class="lesson-copy"><p class="eyebrow">${lesson.kicker} · ${lesson.label}</p><h2>${lesson.title}</h2><p>${lesson.copy}</p><ul>${lesson.points.map((point) => `<li><span>${uiIcon("Check")}</span>${point}</li>`).join("")}</ul><div class="lesson-actions"><a class="primary" href="#discover">Apply in screener <span>${uiIcon("ArrowRight", "inline-icon")}</span></a><button class="lesson-next" data-academy-next>Next lesson ${uiIcon("ArrowRight", "inline-icon")}</button></div></div>${academyVisual()}</section></div><section class="academy-note"><span>READ-ONLY EDUCATION</span><p>These lessons are a research aid, not financial advice. Always verify the pool, token, range, and market conditions yourself.</p></section></main>`; }
function renderKolCard(record: KolRecord, index: number) {
  const tracked = state.kolWatchlist.includes(record.handle);
  const score = kolScore(record);
  const review = state.twitterReviews[record.handle];
  const thesisCount = review?.thesisMatches?.length ?? 0;
  const walletChips = record.wallets.flatMap((wallet) => wallet.chains.map((chain) => `<span class="kol-chain ${chainClass(chain)}"><i></i>${chainLabel(chain)}</span>`)).slice(0, 4).join("");
  return `<article class="kol-card ${state.selectedKol === record.handle ? "selected" : ""}"><div class="kol-card-top"><span class="kol-rank">${String(index + 1).padStart(2, "0")}</span><span class="kol-score"><b>${score}</b><small>RESEARCH SCORE</small></span></div><div class="kol-identity"><div class="kol-avatar">${escapeHtml(record.name.slice(0, 1).toUpperCase())}</div><div><h3>${escapeHtml(record.name)}</h3><p>@${escapeHtml(record.handle)}</p></div></div><div class="kol-metrics"><span><small>FOLLOWERS</small><b>${kolCount(record.followers)}</b></span><span><small>TRADES</small><b>${kolCount(record.trades)}</b></span><span><small>PnL OBSERVED</small><b>${kolMoney(record.pnlUsd)}</b></span></div><div class="kol-wallet-chips">${walletChips}<span class="wallet-count">${record.wallets.length} wallet${record.wallets.length === 1 ? "" : "s"}</span></div><div class="kol-social-line"><span class="x-match ${twitterMatchClass(review)}">𝕏 ${twitterMatchLabel(review)}</span><span>${thesisCount} thesis source${thesisCount === 1 ? "" : "s"}</span></div><div class="kol-card-foot"><span class="confidence-line"><i class="confidence-dot ${record.wallets.some((wallet) => wallet.confidence === "verified") ? "verified" : record.wallets.some((wallet) => wallet.confidence === "likely") ? "likely" : "resolver"}"></i>${kolEvidenceText(record)}</span><div><button class="kol-track ${tracked ? "active" : ""}" data-kol-watch="${escapeHtml(record.handle)}" aria-label="${tracked ? "Stop tracking profile" : "Track profile"}">${uiIcon("Star", "button-icon")}</button><button class="kol-open" data-kol-select="${escapeHtml(record.handle)}">Inspect ${uiIcon("ArrowRight", "inline-icon")}</button></div></div></article>`;
}
function renderWalletClusterPanel(record: KolRecord) {
  const cluster = state.walletCluster;
  if (!cluster.address || !record.wallets.some((wallet) => wallet.address === cluster.address)) return "";
  if (cluster.loading) return `<section class="wallet-cluster-panel"><div class="wallet-cluster-head"><div><span>RELATED-WALLET SCAN</span><b>Scanning recent Solana transfers…</b></div><small>Public RPC · read-only</small></div><p class="wallet-cluster-loading">Reading finalized signatures, co-signers, and SPL token-account owners. This can take a few seconds.</p></section>`;
  if (cluster.error) return `<section class="wallet-cluster-panel error"><div class="wallet-cluster-head"><div><span>RELATED-WALLET SCAN</span><b>Scan unavailable</b></div></div><p>${escapeHtml(cluster.error)}</p></section>`;
  const payload = cluster.result;
  if (!payload) return "";
  const links = payload.relatedWallets ?? [];
  return `<section class="wallet-cluster-panel"><div class="wallet-cluster-head"><div><span>RELATED-WALLET SNAPSHOT</span><b>${links.length} candidate link${links.length === 1 ? "" : "s"}</b></div><small>${escapeHtml(payload.source)}</small></div><div class="wallet-cluster-meta"><span>${payload.scannedSignatures ?? 0} signatures</span><span>${payload.scannedTransactions ?? 0} transactions</span><span>${payload.scannedTransfers ?? 0} token transfers</span><span>captured ${escapeHtml(payload.snapshotCapturedAt?.slice(0, 10) ?? "—")}</span></div>${links.length ? `<div class="wallet-cluster-list">${links.map((link) => `<div class="wallet-cluster-row"><div><code>${shortAddress(link.address)}</code><small>${link.evidence.join(" · ")} · ${link.signatures} tx${link.signatures === 1 ? "" : "s"}</small></div><span class="cluster-confidence ${link.confidence.toLowerCase()}">${link.confidence}</span><button class="copy-address" data-copy-address="${escapeHtml(link.address)}">Copy</button><a href="${payload.chain === "solana" ? `https://solscan.io/account/${encodeURIComponent(link.address)}` : `https://blockscan.com/address/${encodeURIComponent(link.address)}`}" target="_blank" rel="noreferrer">Open ${uiIcon("ExternalLink", "inline-icon")}</a></div>`).join("")}</div>` : `<p class="wallet-cluster-empty">No direct transfer or co-signer candidates were found in this persisted window.</p>`}<p class="wallet-cluster-note">${escapeHtml(payload.note ?? "Candidate links are on-chain relationships, not proof of common ownership.")}</p></section>`;
}
const graphClassificationLabel = (classification: string) => ({ "tracked-wallet-match": "TRACKED MATCH", "shared-counterparty": "SHARED COUNTERPARTY", "cross-chain-counterparty": "CROSS-CHAIN REUSE", "high-fanout-infrastructure": "HIGH-FANOUT INFRA", "direct-counterparty": "DIRECT COUNTERPARTY" }[classification] ?? classification.replaceAll("-", " ").toUpperCase());
const graphClassificationClass = (classification: string) => classification.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
function renderXGraphEvidence(record?: KolRecord) {
  if (record) {
    const handle = xHandleForRecord(record);
    const feed = xFeedForHandle(handle);
    if (!feed || feed.status !== "LIVE") return `<div class="x-graph-evidence"><span>𝕏 X THESIS EDGES</span><small>${escapeHtml(feed?.note ?? "Recent X posts will appear here when the server-side X feed is configured.")}</small></div>`;
    const posts = (feed.posts ?? []).filter((post) => post.contractAddresses.length || post.isReply || xPostEngagement(post) > 0).slice(0, 3);
    return `<div class="x-graph-evidence"><div><span>𝕏 X THESIS EDGES</span><b>${posts.length} recent evidence row${posts.length === 1 ? "" : "s"} · @${escapeHtml(handle)}</b></div>${posts.length ? posts.map((post) => `<article><span>${post.isReply ? "REPLY" : "POST"} · ${escapeHtml(xPostAge(post.createdAt))}</span><b>${escapeHtml(xTokenEvidenceLabels(post) || "Attention")}</b><a href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">Source ${uiIcon("ExternalLink", "inline-icon")}</a></article>`).join("") : `<small>No contract or engagement evidence was returned in the current window.</small>`}</div>`;
  }
  const liveFeeds = Object.values(state.xFeeds).filter((feed) => feed.status === "LIVE");
  const posts = liveFeeds.reduce((count, feed) => count + (feed.posts?.length ?? 0), 0);
  const contracts = liveFeeds.reduce((count, feed) => count + (feed.posts ?? []).filter((post) => post.contractAddresses.length).length, 0);
  return `<div class="x-graph-evidence"><div><span>𝕏 X THESIS EDGES · ALL TRACKED PROFILES</span><b>${posts} recent posts · ${contracts} contract-bearing posts</b></div><small>Recent post/reply edges are joined to the wallet graph by tracked profile handle. They remain public-attention evidence, not wallet-control proof.</small></div>`;
}
function renderWalletGraphPanel(record?: KolRecord) {
  const graph = state.walletGraph;
  if (graph.loading) return `<section class="wallet-graph-panel"><div class="wallet-graph-head"><div><span>RELATED-WALLET GRAPH</span><b>Joining all captured wallet edges…</b></div><small>read-only analysis</small></div><p class="wallet-graph-note">Comparing direct counterparties across every persisted Solana, Base, Ethereum, and Robinhood scan. High-fanout infrastructure is separated from candidate shared wallets.</p></section>`;
  if (graph.error) return `<section class="wallet-graph-panel error"><div class="wallet-graph-head"><div><span>RELATED-WALLET GRAPH</span><b>Analysis unavailable</b></div></div><p class="wallet-graph-note">${escapeHtml(graph.error)}</p></section>`;
  const payload = graph.result;
  if (!payload) return "";
  if (record) {
    const profile = payload.profile?.handle === record.handle ? payload.profile : undefined;
    if (!profile) return `<section class="wallet-graph-panel"><div class="wallet-graph-head"><div><span>RELATED-WALLET GRAPH</span><b>Loading ${escapeHtml(record.handle)}…</b></div><small>persisted graph</small></div></section>`;
    const links = profile.links.slice(0, 14);
    return `<section class="wallet-graph-panel"><div class="wallet-graph-head"><div><span>RELATED-WALLET GRAPH</span><b>${profile.summary.sharedCounterparties} shared candidate${profile.summary.sharedCounterparties === 1 ? "" : "s"} for @${escapeHtml(profile.handle)}</b></div><small>captured ${escapeHtml(payload.capturedAt?.slice(0, 10) ?? "—")}</small></div><div class="wallet-graph-metrics"><span><b>${profile.summary.directLinks}</b><small>direct links</small></span><span><b>${profile.summary.repeatedLinks}</b><small>repeated links</small></span><span><b>${profile.summary.trackedWalletMatches}</b><small>tracked matches</small></span><span><b>${profile.summary.crossChainCounterparties}</b><small>chain reuse</small></span><span><b>${profile.summary.infrastructureLike}</b><small>infra-like</small></span></div>${links.length ? `<div class="wallet-graph-list">${links.map((link) => `<div class="wallet-graph-row"><div><code>${chainLabel(link.chain)} · ${shortAddress(link.address)}</code><small>${link.evidence.slice(0, 2).map(escapeHtml).join(" · ")}${link.sourceProfiles.length ? ` · ${link.sourceProfiles.slice(0, 3).map((handle) => `@${escapeHtml(handle)}`).join(", ")}` : ""}</small></div><span class="graph-class ${graphClassificationClass(link.classification)}">${graphClassificationLabel(link.classification)}</span><span class="cluster-confidence ${link.confidence.toLowerCase()}">${link.confidence}</span><button class="copy-address" data-copy-address="${escapeHtml(link.address)}">Copy</button></div>`).join("")}</div>` : `<p class="wallet-graph-note">No candidate edges were retained for this profile in the captured windows.</p>`}${renderXGraphEvidence(record)}<p class="wallet-graph-note">${escapeHtml(payload.methodology ?? "Shared edges are research leads, not proof of common ownership. Same-address chain reuse is reported separately.")}</p></section>`;
  }
  const summary = payload.summary;
  const chains = Object.entries(summary.chainCounts ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([chain, count]) => `<span>${chainLabel(chain)} <b>${count}</b></span>`).join("");
  return `<section class="wallet-graph-panel wallet-graph-overview"><div class="wallet-graph-head"><div><span>RELATED-WALLET GRAPH · ALL TRACKED PROFILES</span><b>${summary.sharedCounterparties} shared counterparties found across ${summary.trackedProfiles} profiles</b></div><small>captured ${escapeHtml(payload.capturedAt?.slice(0, 10) ?? "—")}</small></div><div class="wallet-graph-metrics"><span><b>${summary.trackedWalletRows}</b><small>wallet mappings</small></span><span><b>${summary.scannedSourceWallets}</b><small>source wallets scanned</small></span><span><b>${summary.directLinks}</b><small>direct links</small></span><span><b>${summary.possibleSharedWalletLinks}</b><small>candidate shared edges</small></span><span><b>${summary.crossChainCounterparties}</b><small>cross-chain reuse</small></span><span><b>${summary.graphClusters}</b><small>candidate clusters</small></span></div><div class="wallet-graph-chains">${chains}</div>${renderXGraphEvidence()}<p class="wallet-graph-note">${escapeHtml(payload.methodology ?? "Shared edges are research leads, not proof of common ownership.")} BNB remains pending because its indexed history requires a key.</p></section>`;
}
function renderTwitterReview(record: KolRecord) {
  const review = state.twitterReviews[record.handle] ?? automaticTwitterReview(record);
  const statusLabel = review.status === "CONFIRMED" ? "CONFIRMED" : review.status === "LIKELY" ? "LIKELY" : review.status === "NO_MATCH" ? "NO MATCH" : "UNREVIEWED";
  const autoLabel = twitterMatchLabel(review);
  const autoConfidence = review.autoMatch?.confidence ?? "UNRESOLVED";
  const autoMethod = review.autoMatch?.method === "seeded-source-trail" ? "captured source trail" : review.autoMatch?.method === "exact-handle-candidate" ? "exact FOMO handle candidate" : review.autoMatch?.method === "manual-override" ? "manual review override" : "no safe candidate";
  const sources = (review.sourceUrls ?? []).filter(Boolean);
  const thesisMatches = review.thesisMatches ?? [];
  const thesisList = thesisMatches.length ? `<div class="twitter-thesis-list"><div class="twitter-thesis-head"><span>THESIS MATCHES</span><b>${thesisMatches.length} source${thesisMatches.length === 1 ? "" : "s"}</b></div>${thesisMatches.map((match) => `<article class="twitter-thesis-row"><div><b>${escapeHtml(match.token)} <i class="thesis-confidence ${(match.confidence ?? thesisConfidence(match)).toLowerCase()}">${match.confidence ?? thesisConfidence(match)}</i></b><small>${escapeHtml(match.thesis)}</small></div><a href="${escapeHtml(match.evidenceUrl)}" target="_blank" rel="noreferrer">Evidence ${uiIcon("ExternalLink", "inline-icon")}</a><small>${escapeHtml(match.updatedAt)}</small></article>`).join("")}</div>` : `<p class="twitter-thesis-empty">No token thesis source has been captured for this profile yet. The automatic matcher leaves this unresolved until an X post or public mirror is linked.</p>`;
  const autoSources = review.autoMatch?.sourceUrls?.length ?? sources.length;
  const thesisSources = review.autoMatch?.thesisSourceUrls?.length ?? 0;
  return `<section class="twitter-review-panel"><div class="twitter-review-head"><div><span>AUTOMATIC X MATCH · MANUAL REVIEW</span><b>${statusLabel}</b></div><a href="${escapeHtml(review.xUrl)}" target="_blank" rel="noreferrer">Open X ${uiIcon("ExternalLink", "inline-icon")}</a></div><div class="twitter-auto-match"><div><span class="x-match ${autoConfidence.toLowerCase()}">𝕏 ${autoLabel}</span><b>${review.xHandle ? `@${escapeHtml(review.xHandle)}` : "No handle candidate"}</b></div><small>Method: ${autoMethod} · ${autoSources} source${autoSources === 1 ? "" : "s"} · ${thesisSources} thesis link${thesisSources === 1 ? "" : "s"}</small></div>${renderXProfileFeed(record)}<p>The matcher uses captured FOMO source URLs, exact-handle candidates, and the server-side X recent-post feed when configured. It never promotes name similarity to identity proof. Wallet confidence remains separate from social confidence; thesis rows retain their evidence URLs and are research leads, not recommendations.</p><div class="twitter-review-fields"><label>X HANDLE<input id="twitterReviewHandle" value="${escapeHtml(review.xHandle)}" placeholder="@handle"/></label><label>REVIEW STATUS<select id="twitterReviewStatus"><option value="UNREVIEWED" ${review.status === "UNREVIEWED" ? "selected" : ""}>Unreviewed</option><option value="CONFIRMED" ${review.status === "CONFIRMED" ? "selected" : ""}>Confirmed by public proof</option><option value="LIKELY" ${review.status === "LIKELY" ? "selected" : ""}>Likely · needs proof</option><option value="NO_MATCH" ${review.status === "NO_MATCH" ? "selected" : ""}>No match</option></select></label></div><label class="twitter-review-note">EVIDENCE NOTE<textarea id="twitterReviewNote" placeholder="Paste the public evidence or explain why it is unresolved">${escapeHtml(review.note)}</textarea></label>${sources.length ? `<div class="twitter-review-sources"><span>SOURCE TRAIL</span>${sources.map((source) => `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">${escapeHtml(source.replace(/^https?:\/\//, ""))} ${uiIcon("ExternalLink", "inline-icon")}</a>`).join("")}</div>` : ""}${thesisList}<div class="twitter-thesis-form"><div class="twitter-thesis-head"><span>ADD TOKEN THESIS MATCH</span><small>Use the X post or a public mirror as evidence.</small></div><div class="twitter-thesis-fields"><label>TOKEN / SYMBOL<input id="twitterThesisToken" placeholder="e.g. PONS"/></label><label>POST / EVIDENCE URL<input id="twitterThesisUrl" placeholder="https://x.com/..."/></label></div><label class="twitter-review-note">THESIS NOTE<textarea id="twitterThesisNote" placeholder="What did the post claim, and how does it relate to the FOMO thesis?"></textarea></label><button class="refresh" id="saveTwitterThesis">Save thesis match</button></div><div class="twitter-review-foot"><small>${review.updatedAt ? `Saved ${escapeHtml(review.updatedAt)}${sources.length ? " · automatic source trail" : ""}` : "Automatic candidate · local review only"}</small><button class="refresh" id="saveTwitterReview">Save review</button></div></section>`;
}
function renderKolDetail(record: KolRecord) {
  const tracked = state.kolWatchlist.includes(record.handle);
  return `<aside class="kol-detail"><div class="kol-detail-head"><div><p class="eyebrow">WALLET-BACKED PROFILE</p><h2>${escapeHtml(record.name)}</h2><p>@${escapeHtml(record.handle)} · ${kolEvidenceText(record)}</p></div><button class="kol-close" data-close-kol aria-label="Close profile">${uiIcon("X", "button-icon")}</button></div><div class="kol-detail-stats"><span><small>RESEARCH SCORE</small><b>${kolScore(record)} / 100</b></span><span><small>FOLLOWERS</small><b>${kolCount(record.followers)}</b></span><span><small>TRADES</small><b>${kolCount(record.trades)}</b></span><span><small>OBSERVED PnL</small><b>${kolMoney(record.pnlUsd)}</b></span></div><div class="kol-wallet-list"><div class="kol-detail-label"><span>LINKED WALLETS</span><small>${record.wallets.length} address${record.wallets.length === 1 ? "" : "es"} · read-only</small></div>${record.wallets.map((wallet) => { const supportedChains = wallet.chains.filter((chain) => ["solana", "base", "ethereum", "robinhood", "bnb"].includes(chain)); return `<div class="kol-wallet-row"><span class="kol-chain-bundle">${wallet.chains.map((chain) => `<span class="kol-chain ${chainClass(chain)}"><i></i>${chainLabel(chain)}</span>`).join("")}</span><code>${shortAddress(wallet.address)}</code><span class="wallet-confidence ${wallet.confidence}">${confidenceLabel(wallet.confidence)}</span>${supportedChains.length ? supportedChains.map((chain) => `<button class="cluster-scan" data-wallet-cluster="${escapeHtml(wallet.address)}" data-wallet-chain="${chain}">${chainLabel(chain)} links</button>`).join("") : `<span class="cluster-chain-note">Indexed scan required</span>`}<button class="copy-address" data-copy-address="${escapeHtml(wallet.address)}">${uiIcon("Copy", "button-icon")}Copy</button><a href="${explorerUrl(wallet)}" target="_blank" rel="noreferrer">Open ${uiIcon("ExternalLink", "inline-icon")}</a></div>`; }).join("")}</div><div class="kol-detail-note"><span>${uiIcon("CircleDot")}</span><p>${escapeHtml(kolEvidenceText(record))}. A wallet link is a research lead, not proof of a person's identity or a recommendation.</p></div>${renderWalletGraphPanel(record)}${renderWalletClusterPanel(record)}${renderTwitterReview(record)}<div class="kol-detail-actions"><button class="watch-toggle ${tracked ? "active" : ""}" data-kol-watch="${escapeHtml(record.handle)}">${tracked ? `${uiIcon("Star", "button-icon")} Tracking` : `${uiIcon("Star", "button-icon")} Track profile`}</button><a href="${escapeHtml(record.profileUrl)}" target="_blank" rel="noreferrer">Open FOMO profile ${uiIcon("ExternalLink", "inline-icon")}</a></div></aside>`;
}
function renderKol() {
  const rows = filteredKols();
  const selected = state.selectedKol ? kolDataset.records.find((record) => record.handle === state.selectedKol) : undefined;
  const chainCounts = kolDataset.records.reduce<Record<string, number>>((counts, record) => { new Set(record.wallets.flatMap((wallet) => wallet.chains)).forEach((chain) => { counts[chain] = (counts[chain] ?? 0) + 1; }); return counts; }, {});
  const coverage = kolDataset.coverage;
  const twitterStats = twitterMatchStats();
  const xLiveProfiles = Object.values(state.xFeeds).filter((feed) => feed.status === "LIVE").length;
  const xLivePosts = Object.values(state.xFeeds).reduce((count, feed) => count + (feed.posts?.length ?? 0), 0);
  return `<main class="kol-page"><section class="kol-hero"><div><p class="eyebrow">KOL RADAR · WALLET-BACKED RESEARCH</p><h1>Follow the wallets<br/><em>behind the attention.</em></h1><p class="lede">A read-only directory built from the captured FOMO cohort and wallet evidence. Use it to compare reach, activity, chain presence, and source confidence before you study a pool.</p></div><div class="kol-hero-signal"><div class="kol-orbit"><span></span><i></i><b>WALLET<br/>MAP</b></div><div><span>SNAPSHOT COHORT</span><strong>${coverage.uniqueHandles}</strong><small>profiles observed</small></div></div></section><section class="kol-summary"><div><span>TRACKED PROFILES</span><b>${coverage.profilesWithWalletEvidence}</b><small>with wallet evidence</small></div><div><span>SOLANA</span><b>${coverage.profilesWithSolanaEvidence}</b><small>profile mappings</small></div><div><span>EVM-LIKE</span><b>${coverage.profilesWithEvmEvidence}</b><small>profile mappings</small></div><div class="warn"><span>OPEN GAPS</span><b>${coverage.uniqueHandles - coverage.profilesWithWalletEvidence}</b><small>challenge or no address</small></div></section><section class="kol-auto-bar"><span>AUTOMATIC X MATCHING</span><b>${twitterStats.EXACT + twitterStats.LIKELY} linked</b><small>${twitterStats.CANDIDATE} handle candidates · ${twitterStats.UNRESOLVED} unresolved · ${twitterStats.theses} thesis sources</small><em>${xLiveProfiles ? `LIVE X SYNC · ${xLiveProfiles} profiles · ${xLivePosts} posts` : "Seeded URLs are retained; live X sync starts when the local cookie worker publishes a snapshot."}</em><button class="x-sync-button" data-x-sync ${state.xSyncing ? "disabled" : ""}>${state.xSyncing ? "Syncing X…" : "Sync X feeds"}</button></section><div class="kol-layout"><aside class="kol-filters"><div class="kol-filter-head"><p class="eyebrow">DIRECTORY FILTERS</p><span>${rows.length} shown</span></div><label>SEARCH<input id="kolQuery" value="${escapeHtml(state.kolQuery)}" placeholder="Handle, name, or address"/></label><label>CHAIN<select id="kolChain"><option value="all" ${state.kolChain === "all" ? "selected" : ""}>All chains</option><option value="solana" ${state.kolChain === "solana" ? "selected" : ""}>Solana · ${chainCounts.solana ?? 0}</option><option value="robinhood" ${state.kolChain === "robinhood" ? "selected" : ""}>Robinhood · ${chainCounts.robinhood ?? 0}</option><option value="base" ${state.kolChain === "base" ? "selected" : ""}>Base · ${chainCounts.base ?? 0}</option><option value="ethereum" ${state.kolChain === "ethereum" ? "selected" : ""}>Ethereum · ${chainCounts.ethereum ?? 0}</option><option value="bnb" ${state.kolChain === "bnb" ? "selected" : ""}>BNB · ${chainCounts.bnb ?? 0}</option><option value="evm" ${state.kolChain === "evm" ? "selected" : ""}>Generic EVM · ${chainCounts.evm ?? 0}</option></select></label><label>CONFIDENCE<select id="kolConfidence"><option value="all" ${state.kolConfidence === "all" ? "selected" : ""}>All evidence</option><option value="verified" ${state.kolConfidence === "verified" ? "selected" : ""}>Verified links</option><option value="likely" ${state.kolConfidence === "likely" ? "selected" : ""}>Likely links</option><option value="resolver" ${state.kolConfidence === "resolver" ? "selected" : ""}>Resolver-reported</option></select></label><label>SORT BY<select id="kolSort"><option value="score" ${state.kolSort === "score" ? "selected" : ""}>Research score</option><option value="followers" ${state.kolSort === "followers" ? "selected" : ""}>Followers</option><option value="pnl" ${state.kolSort === "pnl" ? "selected" : ""}>Observed PnL</option><option value="wallets" ${state.kolSort === "wallets" ? "selected" : ""}>Wallet breadth</option></select></label><div class="kol-gap-card"><span>UNRESOLVED COHORT</span><strong>${coverage.uniqueHandles - coverage.profilesWithWalletEvidence} profiles</strong><p>Resolver challenges and missing records stay visible in the evidence file. They are excluded from ranking until an address is independently resolved.</p><a href="#discover">Screen pools ${uiIcon("ArrowRight", "inline-icon")}</a></div><div class="kol-chain-card"><span>CHAIN COVERAGE</span>${Object.entries(chainCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([chain, count]) => `<div><b>${chainLabel(chain)}</b><i><em style="width:${Math.min(100, count / Math.max(1, coverage.profilesWithWalletEvidence) * 100)}%"></em></i><small>${count}</small></div>`).join("")}</div></aside><section class="kol-results"><div class="kol-results-head"><div><p class="eyebrow">RESEARCH DIRECTORY</p><h2>Wallet-backed KOL candidates</h2><p>Ranking blends public audience/activity with wallet-link confidence. It is a triage aid, not an endorsement.</p></div><span class="kol-capture">CAPTURED ${escapeHtml(kolDataset.capturedAt.slice(0, 10))}</span></div><div class="kol-grid">${rows.map((record, index) => renderKolCard(record, index)).join("") || `<div class="kol-empty">No tracked profiles match these filters.</div>`}</div>${selected ? renderKolDetail(selected) : `<div class="kol-empty-hint"><span>${uiIcon("ArrowUpRight")}</span><p>Select a profile to inspect its linked addresses, confidence labels, and source trail.</p></div>`}</section></div><section class="kol-method"><span>METHOD &amp; PROVENANCE</span><p>Addresses are joined by FOMO handle from the Provadata snapshot and the public FOMO resolver. VERIFIED, LIKELY, and RESOLVER labels are preserved from their sources. X matches are generated from captured source URLs or shown as unreviewed exact-handle candidates. Live X posts and replies are fetched by the local cookie worker; extracted CAs and ticker candidates remain public-attention evidence, not proof of wallet control. Generic EVM entries are not assigned to a specific chain without chain metadata.</p><a href="https://provadata.com/docs" target="_blank" rel="noreferrer">Read provider method ${uiIcon("ExternalLink", "inline-icon")}</a></section></main>`;
}
function renderPlaybooks() { return `<main class="playbooks-page"><div class="section-head"><div><p class="eyebrow">RESEARCH PLAYBOOKS</p><h1>Start with a repeatable lens.</h1><p class="subhead">These are saved ways to read the same live market. Each route opens the screening workspace with its matching recipe ready.</p></div></div><div class="playbook-grid"><article><span class="playbook-num">01</span><h2>Balanced discovery</h2><p>Filter for usable liquidity, active volume, reasonable age, and a moderate fee tier.</p><a href="#discover" data-preset="conviction">Open balanced list ${uiIcon("ArrowRight", "inline-icon")}</a></article><article><span class="playbook-num">02</span><h2>Liquidity first</h2><p>Prioritize depth and volume so the candidate can absorb real market flow.</p><a href="#discover" data-preset="liquidity">Open depth list ${uiIcon("ArrowRight", "inline-icon")}</a></article><article><span class="playbook-num">03</span><h2>Momentum watch</h2><p>Surface pools with positive movement while keeping the risk context visible.</p><a href="#discover" data-preset="attention">Open momentum list ${uiIcon("ArrowRight", "inline-icon")}</a></article></div></main>`; }
const eligibilityLabel = (status?: EligibilityAnalysis["status"]) => status === "OPEN_NOW" ? "OPEN NOW" : status === "ELIGIBLE_WAIT" ? "ELIGIBLE · WAIT" : status === "PENDING" ? "SCREENING" : "REJECTED";
const eligibilityClass = (status?: EligibilityAnalysis["status"]) => String(status ?? "PENDING").toLowerCase().replace("_", "-");

function poolRow(p: Pool) {
  const key = poolKey(p);
  const t = p.technical;
  const signal = p.primaryPlaybook;
  const eligibility = p.eligibility?.status;
  const wallets = p.walletIntelligence === "UNAVAILABLE" ? `<span class="stack-badge unavailable">WALLET ON OPEN</span>` : `<span class="stack-badge wallet-badge">${uiIcon("WalletCards", "badge-icon")} ${p.smartMoneyLabels?.length ? `${p.smartWallets ?? 0} smart` : `${p.smartWallets ?? 0} traders`}</span><span class="flow-badge ${String(p.walletFlow).toLowerCase()}">${p.walletFlow}</span>`;
  const trackedWallets = p.trackedWalletHits ? `<span class="stack-badge tracked-badge">${uiIcon("CircleDot", "badge-icon")} ${p.trackedWalletHits} tracked</span>` : "";
  const publicSignal = (p.publicLinks ?? 0) > 0 ? `<span class="stack-badge public-badge">${uiIcon("CircleDot", "badge-icon")} ${p.publicLinks} links</span>` : "";
  const kol = p.kolIntelligence === "UNAVAILABLE" ? `<span class="stack-badge unavailable">KOL ON OPEN</span>` : `<span class="stack-badge kol-badge">${uiIcon("Megaphone", "badge-icon")} ${p.kolCreators ?? p.kolMentions ?? 0} KOL</span><small class="recency">${p.kolMentions ?? 0} mentions · ${p.kolRecency ?? "—"}</small>`;
  const technical = t?.available ? `<span class="stack-badge trend-badge ${t.trend.toLowerCase()}">15m ${t.trend}</span><small class="recency">RSI ${t.rsi2 === undefined ? "—" : t.rsi2.toFixed(1)}</small>` : `<span class="stack-badge unavailable">15m ON OPEN</span>`;
  const launch = p.launch && p.launch.status !== "UNAVAILABLE" ? `<span class="stack-badge launch-badge">${uiIcon("Rocket", "badge-icon")} ${p.launch.status} ${p.launch.score}</span><small class="recency">${p.launch.sightings} sighting${p.launch.sightings === 1 ? "" : "s"}</small>` : "";
  const eligibilitySignal = `<span class="status-pill ${eligibilityClass(eligibility)}">${eligibilityLabel(eligibility)}</span>`;
  const safety = p.tokenSafety === "PASS" ? `<span class="stack-badge public-badge">${uiIcon("ShieldCheck", "badge-icon")} SAFETY</span>` : p.tokenSafety === "WARN" ? `<span class="stack-badge unavailable">SAFETY WARN</span>` : "";
  const initials = tokenInitials(p);
  const capTier = marketCapTierLabel(marketCapTier(p.marketCap));
  const snapshot = scoreSnapshotFor(p);
  const runner = runnerPotentialScore(p);
  const flow = volumeUpsideScore(p);
  const displayedScore = scoreFor(p);
  const decision = poolDecision(p, displayedScore);
  const tokenImage = p.imageUrl?.trim() || tokenImageUrl(p.tokenAddress, p.chain ?? "solana");
  const tokenAvatar = `<span class="token-avatar" aria-label="${escapeHtml(p.name)} token"><b>${initials}</b>${tokenImage ? `<img src="${escapeHtml(tokenImage)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"/>` : ""}</span>`;
  const contract = p.tokenAddress ? `<button class="copy-ca" data-copy-ca="${p.tokenAddress}" title="Copy token contract address">${uiIcon("Copy", "button-icon")}CA ${shortAddress(p.tokenAddress)}</button>` : `<span class="ca-missing">CA unavailable</span>`;
  const metricValue = state.metricMode === "mcap" ? money(p.marketCap ?? 0) : `$${formatPrice(p.price)}`;
  const metricLabel = state.metricMode === "mcap" ? "MCAP" : "PRICE";
  return `<tr class="pool-row" data-pool="${key}"><td data-label="POOL"><div class="pool-name">${tokenAvatar}<strong>${p.name}</strong><button class="row-watch ${state.watchlist.includes(key) ? "active" : ""}" data-watch="${key}" title="Toggle watchlist">${state.watchlist.includes(key) ? uiIcon("Star", "button-icon") : uiIcon("Star", "button-icon")}</button><button class="row-compare ${state.compareList.includes(key) ? "active" : ""}" data-compare="${key}" title="Compare candidate">${state.compareList.includes(key) ? uiIcon("Check", "button-icon") : uiIcon("Plus", "button-icon")}</button></div><small>${p.symbol} · ${chainLabel(p.chain ?? "solana")} · pair ${p.address} · ${capTier}</small><div class="pool-contract">${contract}</div></td><td data-label="VENUE">${p.dex}</td><td data-label="${metricLabel}">${metricValue}</td><td data-label="LIQUIDITY">${money(p.liquidity)}</td><td data-label="24H VOLUME">${money(p.volume24h)}</td><td data-label="AGE">${p.ageDays}d</td><td data-label="15M SETUP"><div class="signal-stack">${technical}${eligibilitySignal}<span class="status-pill ${statusClass(signal?.status)}">${statusLabel(signal?.status)}</span></div></td><td data-label="SIGNALS"><div class="signal-stack">${wallets}${trackedWallets}${kol}${safety}${publicSignal}${launch}</div></td><td data-label="CHART"><div class="pool-chart-cell">${poolSparkline(p)}</div></td><td data-label="SCORE"><span class="screen-score ${displayedScore >= 75 ? "high" : displayedScore >= 55 ? "mid" : "low"}">${displayedScore}</span><small class="score-meta">${capTier} · CONF ${snapshot.evidenceConfidence}${isRunnerTier(p.marketCap) ? ` · RUNNER ${runner} · FLOW ${flow}` : ` · FLOW ${flow}`}</small><span class="decision-pill ${decision.className}">${decision.label}</span></td></tr>`;
}
type WorkspaceScrollPosition = { pageY: number; tableLeft: number; tableTop: number; anchor?: { key: string; offset: number } };
function captureWorkspaceScroll(): WorkspaceScrollPosition {
  const table = document.querySelector<HTMLDivElement>(".table-scroll-viewport");
  const visible = Array.from(document.querySelectorAll<HTMLElement>(".pool-row[data-pool]"))
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.bottom > 54 && rect.top < window.innerHeight)
    .sort((a, b) => a.rect.top - b.rect.top)[0];
  return { pageY: window.scrollY, tableLeft: table?.scrollLeft ?? 0, tableTop: table?.scrollTop ?? 0, anchor: visible?.element.dataset.pool ? { key: visible.element.dataset.pool, offset: visible.rect.top } : undefined };
}
function restoreWorkspaceScroll(position: WorkspaceScrollPosition) {
  if (position.anchor) {
    const target = Array.from(document.querySelectorAll<HTMLElement>(".pool-row[data-pool]"))
      .find((element) => element.dataset.pool === position.anchor?.key);
    if (target) {
      const delta = target.getBoundingClientRect().top - position.anchor.offset;
      if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, left: 0, behavior: "auto" });
    } else {
      window.scrollTo({ top: position.pageY, left: 0, behavior: "auto" });
    }
  } else {
    window.scrollTo({ top: position.pageY, left: 0, behavior: "auto" });
  }
  const table = document.querySelector<HTMLDivElement>(".table-scroll-viewport");
  if (table) {
    table.scrollLeft = position.tableLeft;
    table.scrollTop = position.tableTop;
  }
}
let workspaceTableOffsetBound = false;
let workspaceTableOffsetFrame: number | undefined;
function syncWorkspaceTableHeaderOffset() {
  const viewport = document.querySelector<HTMLElement>(".table-scroll-viewport");
  if (!viewport || !viewport.querySelector(".table-sticky-spacer")) return;
  const topbarHeight = Math.round(document.querySelector<HTMLElement>(".topbar")?.getBoundingClientRect().height ?? (window.innerWidth <= 680 ? 54 : 72));
  const shouldOffset = viewport.getBoundingClientRect().top <= topbarHeight + 1;
  const wasOffset = viewport.classList.contains("table-header-offset");
  if (shouldOffset !== wasOffset) viewport.classList.toggle("table-header-offset", shouldOffset);
  const spacerCells = Array.from(viewport.querySelectorAll<HTMLElement>(".table-sticky-spacer th"));
  if (!shouldOffset) {
    viewport.style.removeProperty("--table-header-top");
    spacerCells.forEach((cell) => cell.style.removeProperty("height"));
    return;
  }
  const viewportTop = viewport.getBoundingClientRect().top;
  const headerTop = Math.max(0, Math.ceil(topbarHeight - viewportTop));
  viewport.style.setProperty("--table-header-top", `${headerTop}px`);
  if (wasOffset) return;
  const headerCell = viewport.querySelector<HTMLElement>("thead tr:not(.table-sticky-spacer) th");
  const firstRow = viewport.querySelector<HTMLElement>("tbody tr.pool-row");
  if (headerCell && firstRow && spacerCells.length) {
    const firstRowRect = firstRow.getBoundingClientRect();
    if (firstRowRect.bottom <= -topbarHeight || firstRowRect.top >= window.innerHeight + topbarHeight) {
      spacerCells.forEach((cell) => cell.style.removeProperty("height"));
      return;
    }
    const desiredBottom = topbarHeight + headerCell.getBoundingClientRect().height;
    const currentBodyTop = firstRowRect.top;
    const currentSpacerHeight = spacerCells[0].getBoundingClientRect().height;
    const nextSpacerHeight = Math.max(0, Math.ceil(currentSpacerHeight + desiredBottom - currentBodyTop));
    spacerCells.forEach((cell) => cell.style.setProperty("height", `${nextSpacerHeight}px`, "important"));
  }
}
function bindWorkspaceTableHeaderOffset() {
  if (!workspaceTableOffsetBound) {
    const schedule = () => {
      if (workspaceTableOffsetFrame !== undefined) return;
      workspaceTableOffsetFrame = window.requestAnimationFrame(() => {
        workspaceTableOffsetFrame = undefined;
        syncWorkspaceTableHeaderOffset();
      });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    workspaceTableOffsetBound = true;
  }
  syncWorkspaceTableHeaderOffset();
}
let lastRenderedRoute = "";
function syncEvidenceBackdrop() {
  const existing = document.querySelector<HTMLButtonElement>("#evidenceBackdrop");
  const shouldShow = route() === "discover" && Boolean(state.selectedPool);
  if (!shouldShow) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const backdrop = document.createElement("button");
  backdrop.id = "evidenceBackdrop";
  backdrop.className = "evidence-backdrop";
  backdrop.type = "button";
  backdrop.tabIndex = -1;
  backdrop.setAttribute("aria-label", "Close pool evidence");
  backdrop.addEventListener("click", closeEvidence);
  document.body.appendChild(backdrop);
}
function closeEvidence() {
  if (!state.selectedPool) return;
  state.selectedPool = "";
  renderEvidenceInPlace();
}
type TokenScanPayload = { pairs?: Array<Record<string, unknown>> };
const applyDeepScanPayload = (key: string, payload: DeepScanPayload) => {
  const candles = candlesFromRows(payload.candles);
  const current = poolByKey(key);
  if (!current) return;
  if (payload.pair) {
    const mapped = mapLivePair(payload.pair);
    patchPool(key, { id: current.id, chain: mapped.chain, pairAddress: mapped.pairAddress, sourceUrl: mapped.sourceUrl, name: mapped.name, symbol: mapped.symbol, dex: mapped.dex, address: mapped.address, tokenAddress: mapped.tokenAddress, imageUrl: mapped.imageUrl, quoteTokenAddress: mapped.quoteTokenAddress, price: mapped.price, marketCap: mapped.marketCap, liquidity: mapped.liquidity, volume24h: mapped.volume24h, ageDays: mapped.ageDays, createdAt: mapped.createdAt, tvl: mapped.tvl, change24h: mapped.change24h, risk: mapped.risk, discovery: mapped.discovery, oculaStatus: mapped.oculaStatus, oculaSource: mapped.oculaSource, oculaVolume1h: mapped.oculaVolume1h, oculaChange1h: mapped.oculaChange1h, oculaHolders: mapped.oculaHolders, oculaBuyCount1h: mapped.oculaBuyCount1h, oculaSellCount1h: mapped.oculaSellCount1h, oculaSocialLinks: mapped.oculaSocialLinks, oculaSocialUrls: mapped.oculaSocialUrls });
  }
  const latest = poolByKey(key) ?? current;
  if (candles.length) {
    const technical = analyzeCandles(candles);
    const playbooks = derivePlaybooks(latest, technical);
    patchPool(key, { candles, technical, playbooks, primaryPlaybook: primaryPlaybook(playbooks) });
    candleCache.set(latest.pairAddress ?? key, { candles, fetchedAt: Date.now() });
    persistCandleCache();
  }
  const wallet = payload.wallet;
  if (wallet?.status === "LIVE") applyWalletPayload(key, wallet as WalletPayload);
  const token = payload.token;
  if (token?.status === "LIVE") patchPool(key, { tokenStatus: "LIVE", tokenSource: String(token.source ?? "Solana RPC · mint + holder checks"), tokenSafety: token.safety as Pool["tokenSafety"] ?? "WARN", mintAuthority: typeof token.mintAuthority === "boolean" ? token.mintAuthority : undefined, freezeAuthority: typeof token.freezeAuthority === "boolean" ? token.freezeAuthority : undefined, holderTop10Pct: typeof token.holderTop10Pct === "number" ? token.holderTop10Pct : undefined, rugCheckScore: typeof token.rugCheckScore === "number" ? token.rugCheckScore : undefined, rugCheckRisk: typeof token.rugCheckRisk === "string" ? token.rugCheckRisk : undefined, rugCheckRisks: Array.isArray(token.rugCheckRisks) ? token.rugCheckRisks.map(String) : undefined, rugCheckLpLockedPct: typeof token.rugCheckLpLockedPct === "number" ? token.rugCheckLpLockedPct : undefined, holderProfileStatus: token.holderProfileStatus as Pool["holderProfileStatus"], holderProfileSource: typeof token.holderProfileSource === "string" ? token.holderProfileSource : undefined, holderCount: typeof token.holderCount === "number" ? token.holderCount : undefined });
  const kol = payload.kol;
  if (kol?.status === "LIVE") patchPool(key, { kolMentions: Number(kol.kolMentions ?? 0), kolRecency: String(kol.kolRecency ?? "—"), kolCreators: Number(kol.kolCreators ?? kol.kolMentions ?? 0), kolPosts: Number(kol.kolPosts ?? kol.kolMentions ?? 0), kolTrend: typeof kol.kolTrend === "string" ? kol.kolTrend : undefined, kolSentiment: typeof kol.kolSentiment === "number" ? kol.kolSentiment : undefined, kolIntelligence: "LIVE", kolSource: String(kol.source ?? "KOL provider"), intelligence: "LIVE" });
  if (payload.usage) state.providerUsage = payload.usage;
  const enriched = poolByKey(key);
  if (enriched?.trackedWalletHandles?.length) void loadXPoolTheses(key);
  refreshEligibilityNow();
};
const deepScanInFlight = new Set<string>();
async function deepScanPool(key: string) {
  const initial = poolByKey(key);
  if (!initial?.tokenAddress || !initial.pairAddress || deepScanInFlight.has(key)) return;
  deepScanInFlight.add(key);
  patchPool(key, { enrichmentLoading: true });
  render("data");
  try {
    const payload = await fetchJson<DeepScanPayload>(deepScanApi(initial.tokenAddress, initial.pairAddress, initial.chain ?? state.chain), 50_000);
    applyDeepScanPayload(key, payload);
  } catch (error) {
    patchPool(key, { walletSource: "Deep scan unavailable · retry when provider is ready", tokenSource: error instanceof Error ? error.message : "Deep scan unavailable", kolSource: "Deep scan unavailable · optional evidence" });
    render("data");
  } finally {
    deepScanInFlight.delete(key);
    patchPool(key, { enrichmentLoading: false });
    refreshEligibility();
  }
}
async function scanTokenAddress(rawAddress: string) {
  const token = rawAddress.trim();
  state.tokenScan.query = token;
  const scanChain = chainForAddress(token);
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(token) && !isEvmAddress(token)) {
    state.tokenScan.status = "error";
    state.tokenScan.message = "Paste a valid Solana or EVM token address.";
    render("data");
    return;
  }
  state.tokenScan.status = "scanning";
  state.tokenScan.message = "Resolving the best pool, then starting the deep scan…";
  render("data");
  try {
    const payload = await fetchJson<DeepScanPayload>(deepScanApi(token, undefined, scanChain), 50_000);
    if (!payload.pair) throw new Error(`No indexed ${chainLabel(scanChain)} pool was found for that token.`);
    const pool = mapLivePair(payload.pair);
    const existing = state.pools.find((item) => poolKey(item) === poolKey(pool));
    const merged = existing ? { ...existing, ...pool } : pool;
    state.pools = [merged, ...state.pools.filter((item) => poolKey(item) !== poolKey(merged))];
    state.selectedPool = poolKey(merged);
    state.tokenScan.status = "ready";
    state.tokenScan.message = `${merged.name} found · deep scan complete`;
    refreshEligibilityNow();
    render("data");
    applyDeepScanPayload(poolKey(merged), payload);
    const scannedPool = poolByKey(poolKey(merged));
    const liveEvidence = [scannedPool?.technical?.available, scannedPool?.tokenStatus === "LIVE", scannedPool?.walletIntelligence === "LIVE", scannedPool?.kolIntelligence === "LIVE"].filter(Boolean).length;
    state.tokenScan.message = `${merged.name} deep scan finished · ${liveEvidence}/4 evidence sources live`;
    render("data");
  } catch (error) {
    state.tokenScan.status = "error";
    state.tokenScan.message = error instanceof Error ? error.message : "Token scan unavailable.";
    render("data");
  }
}
function switchChain(next: ChainId) {
  if (state.chain === next) return;
  state.chain = next;
  state.selectedPool = "";
  state.query = "";
  state.list = "all";
  state.minLiquidity = defaultMinLiquidityForChain(next);
  state.minVolume = defaultMinVolumeForChain(next);
  state.maxAge = defaultMaxAgeForChain(next);
  state.pools = [];
  state.feedPage = 1;
  state.feedTotal = 0;
  state.feedAvailableTotal = 0;
  state.feedHasMore = false;
  state.feedLoadingMore = false;
  state.liveReady = false;
  state.liveError = "";
  state.source = `Loading ${chainLabel(next)} feed…`;
  render();
  void loadLive(true);
}
function bindWorkspaceDynamic() {
  const scanForm = document.querySelector<HTMLFormElement>("#ca-scan-form");
  if (scanForm && scanForm.dataset.bound !== "1") {
    scanForm.dataset.bound = "1";
    scanForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = scanForm.querySelector<HTMLInputElement>("#scan-ca");
      void scanTokenAddress(input?.value ?? "");
    });
  }
  const chainSelect = document.querySelector<HTMLSelectElement>("#chainSelect");
  if (chainSelect && chainSelect.dataset.bound !== "1") {
    chainSelect.dataset.bound = "1";
    chainSelect.addEventListener("change", () => {
      const next = chainSelect.value as ChainId;
      if (!["solana", "ethereum", "base", "robinhood"].includes(next)) return;
      switchChain(next);
    });
  }
  document.querySelectorAll<HTMLElement>(".chain[data-chain]").forEach((chainItem) => {
    if (chainItem.dataset.bound === "1") return;
    chainItem.dataset.bound = "1";
    chainItem.addEventListener("click", () => {
      const next = chainItem.dataset.chain as ChainId;
      if (!["solana", "ethereum", "base", "robinhood"].includes(next) || state.chain === next) return;
      switchChain(next);
    });
  });
  const loadMore = document.querySelector<HTMLButtonElement>("#loadMorePools");
  if (loadMore && loadMore.dataset.bound !== "1") {
    loadMore.dataset.bound = "1";
    loadMore.addEventListener("click", (event) => { event.stopPropagation(); void loadLive(false); });
  }
  document.querySelectorAll<HTMLTableRowElement>(".workspace tr[data-pool]").forEach((row) => {
    if (row.dataset.bound === "1") return;
    row.dataset.bound = "1";
    row.addEventListener("click", () => selectEvidencePool(row.dataset.pool ?? ""));
  });
  document.querySelectorAll<HTMLButtonElement>(".workspace [data-watch], .workspace [data-compare]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const key = button.dataset.watch ?? button.dataset.compare ?? "";
      if (button.dataset.watch) state.watchlist = state.watchlist.includes(key) ? state.watchlist.filter((item) => item !== key) : [...state.watchlist, key];
      else state.compareList = state.compareList.includes(key) ? state.compareList.filter((item) => item !== key) : [...state.compareList, key].slice(-4);
      localStorage.setItem(button.dataset.watch ? "lp-screener-watchlist" : "lp-screener-compare", JSON.stringify(button.dataset.watch ? state.watchlist : state.compareList));
      render("data");
    });
  });
  document.querySelectorAll<HTMLButtonElement>(".workspace [data-copy-ca]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", async (event) => { event.stopPropagation(); const address = button.dataset.copyCa ?? ""; try { await navigator.clipboard.writeText(address); button.textContent = "Copied"; window.setTimeout(() => { button.textContent = `CA ${shortAddress(address)}`; }, 1400); } catch { button.textContent = "Select"; } });
  });
  document.querySelectorAll<HTMLButtonElement>(".workspace [data-evidence-prev], .workspace [data-evidence-next]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", (event) => { event.stopPropagation(); selectEvidencePool(button.dataset.evidencePrev ?? button.dataset.evidenceNext ?? ""); });
  });
  document.querySelectorAll<HTMLButtonElement>(".workspace .filter-reset[data-preset]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      if (button.dataset.preset === "all") {
        state.list = "all"; state.query = ""; state.minLiquidity = defaultMinLiquidityForChain(state.chain); state.minVolume = defaultMinVolumeForChain(state.chain); state.maxAge = defaultMaxAgeForChain(state.chain); state.scoreMin = 0; state.walletFilter = "all"; state.kolFilter = "all"; state.sort = "score"; state.decisionFilter = "all";
      } else {
        state.list = "all"; state.query = ""; state.minLiquidity = defaultMinLiquidityForChain(state.chain); state.minVolume = defaultMinVolumeForChain(state.chain); state.maxAge = defaultMaxAgeForChain(state.chain); state.scoreMin = 0; state.walletFilter = "all"; state.kolFilter = "all"; state.sort = "score"; state.decisionFilter = "all";
      }
      render();
    });
  });
  const closeButton = document.querySelector<HTMLButtonElement>(".workspace [data-close-evidence]");
  if (closeButton && closeButton.dataset.bound !== "1") { closeButton.dataset.bound = "1"; closeButton.addEventListener("click", closeEvidence); }
}
function renderEvidenceInPlace() {
  const slot = document.querySelector<HTMLElement>("#workspace-evidence-slot");
  if (!slot) return false;
  slot.innerHTML = poolEvidence();
  document.body.classList.toggle("has-modal-selection", route() === "discover" && Boolean(state.selectedPool));
  document.querySelector<HTMLElement>(".workspace-page")?.classList.toggle("has-selection", Boolean(state.selectedPool));
  syncEvidenceBackdrop();
  bindWorkspaceDynamic();
  bindCandleTooltips();
  bindWorkspaceTableHeaderOffset();
  renderUiIcons(slot);
  return true;
}
function renderWorkspaceInPlace() {
  const body = document.querySelector<HTMLTableSectionElement>("#workspace-table-body");
  const root = document.querySelector<HTMLElement>("[data-workspace-root]");
  if (!body || !root) return false;
  const previousScroll = captureWorkspaceScroll();
  const scanStatus = root.querySelector<HTMLElement>("#ca-scan-status");
  const scanButton = root.querySelector<HTMLButtonElement>("#scan-ca-submit");
  if (scanStatus) { scanStatus.className = `scan-status ${state.tokenScan.status}`; scanStatus.textContent = state.tokenScan.message; }
  if (scanButton) { scanButton.disabled = state.tokenScan.status === "scanning"; scanButton.innerHTML = `${uiIcon(state.tokenScan.status === "scanning" ? "RefreshCw" : "Search", "button-icon")} ${state.tokenScan.status === "scanning" ? "Scanning…" : "Scan token"}`; renderUiIcons(scanButton); }
  const pools = filtered();
  const nextRows = pools.map(poolRow).join("") || `<tr><td colspan="10" class="empty">${emptyWorkspaceState()}</td></tr>`;
  if (body.innerHTML !== nextRows) {
    body.innerHTML = nextRows;
  }
  const count = root.querySelector<HTMLElement>("#workspace-count");
  if (count) count.textContent = `${pools.length} candidates`;
  const candleReady = state.pools.filter((pool) => (pool.candles?.length ?? 0) >= 2).length;
  const feedMessage = state.loading ? "Fetching lightweight market pairs…" : state.liveError ? state.liveError : state.lastUpdated ? `Updated ${timeAgo(Math.floor(state.lastUpdated / 1000))} · deep data loads on selection` : "Demo data loaded · deep data loads on selection";
  const liveStatus = root.querySelector<HTMLElement>("#workspace-live-status");
  if (liveStatus) { liveStatus.className = `live ${state.loading ? "is-loading" : state.liveError ? "is-error" : ""}`; const label = liveStatus.querySelector<HTMLElement>(".live-label"); if (label) label.textContent = state.source; const small = liveStatus.querySelector("small"); if (small) small.textContent = feedMessage; }
  const notice = root.querySelector<HTMLElement>("#workspace-feed-notice");
  if (notice) { notice.className = `feed-notice ${state.liveError ? "error" : state.loading ? "loading" : "ready"}`; const copy = notice.querySelector("p"); const badge = notice.querySelector("b"); if (copy) copy.textContent = state.loading ? "Live discovery is loading the lightweight market feed. Open a row or paste a CA to run the deep scan." : state.liveError ? state.liveError : "Fast screener view · LP metrics are available now; candles, wallet, safety, and KOL evidence load only for a selected token."; if (badge) badge.textContent = state.loading ? "Loading" : state.liveError ? "Fallback" : state.liveReady ? "Live ready" : "Demo"; }
  const usageMeter = root.querySelector<HTMLElement>("#dexpaprika-usage");
  if (usageMeter) { const budget = usageMeter.querySelector("b"); const detail = usageMeter.querySelector("small"); const previewReady = state.pools.filter((pool) => (pool.previewCandles?.length ?? 0) >= 2).length; if (budget) budget.textContent = formatProviderUsage(state.providerUsage); if (detail) detail.textContent = `${previewReady}/${state.pools.length} 5m previews · server-instance estimate · table uses batched previews; full 15m candles load only on selection`; }
  const filterState = root.querySelector<HTMLElement>("#workspace-filter-state");
  if (filterState) { const heading = state.list === "eligible" ? "Eligible setups" : state.list === "open" ? "Open now" : state.list === "all" ? "All pools" : state.list === "trending" ? "Trending pools" : state.list === "new" ? "New pools" : state.list === "liquidity" ? "High liquidity" : state.list === "smart" ? "Smart-wallet activity" : state.list === "kol" ? "KOL flow" : "Your watchlist"; filterState.innerHTML = workspaceFilterState(pools, heading); }
  document.querySelectorAll<HTMLButtonElement>(".workspace-page .list-sidebar [data-list]").forEach((button) => {
    const kind = button.dataset.list ?? "all";
    const count = button.querySelector("b");
    if (count) count.textContent = String(listCount(kind));
    button.classList.toggle("selected", state.list === kind);
  });
  const refreshButton = root.querySelector<HTMLButtonElement>("#refresh");
  if (refreshButton) { refreshButton.disabled = state.loading; refreshButton.innerHTML = state.loading ? `${uiIcon("RefreshCw", "button-icon")} Refreshing…` : `${uiIcon("RefreshCw", "button-icon")} Refresh feed`; renderUiIcons(refreshButton); }
  const pagination = root.querySelector<HTMLElement>("#workspace-pagination span");
  if (pagination) pagination.textContent = `${feedCoverage(pools.length)} · ${state.liveReady ? "live source" : "fallback source"}`;
  const loadMore = root.querySelector<HTMLButtonElement>("#loadMorePools");
  if (loadMore) { loadMore.disabled = !state.feedHasMore || state.loading || state.feedLoadingMore; loadMore.textContent = state.feedLoadingMore ? "Loading…" : state.feedHasMore ? "Load more" : "End of feed"; }
  const chainSelect = root.querySelector<HTMLSelectElement>("#chainSelect");
  if (chainSelect) chainSelect.value = state.chain;
  const gate = root.querySelector<HTMLElement>("#workspace-gate-summary");
  if (gate) gate.outerHTML = gateSummary();
  const evidenceSlot = root.querySelector<HTMLElement>("#workspace-evidence-slot");
  if (evidenceSlot) {
    const nextEvidence = poolEvidence();
    if (evidenceSlot.innerHTML !== nextEvidence) {
      const currentPanel = evidenceSlot.querySelector<HTMLElement>(".evidence-panel");
      const panelScrollTop = currentPanel?.scrollTop ?? 0;
      evidenceSlot.innerHTML = nextEvidence;
      const nextPanel = evidenceSlot.querySelector<HTMLElement>(".evidence-panel");
      if (nextPanel) nextPanel.scrollTop = panelScrollTop;
    }
  }
  document.body.classList.toggle("has-modal-selection", route() === "discover" && Boolean(state.selectedPool));
  document.querySelector<HTMLElement>(".workspace-page")?.classList.toggle("has-selection", Boolean(state.selectedPool));
  syncEvidenceBackdrop();
  bindWorkspaceDynamic();
  bindCandleTooltips();
  bindWorkspaceTableHeaderOffset();
  renderUiIcons(root);
  restoreWorkspaceScroll(previousScroll);
  return true;
}
function render(mode: "full" | "data" = "full") {
  if (mode === "data" && route() === "discover" && renderWorkspaceInPlace()) return;
  const previousScroll = captureWorkspaceScroll(); const activeRoute = route(); const motionClass = activeRoute === lastRenderedRoute ? "motion-settled" : "motion-entry"; lastRenderedRoute = activeRoute; const content = activeRoute === "discover" ? renderWorkspace() : activeRoute === "kol" ? renderKol().replace('<div class="kol-layout">', `${state.selectedKol ? "" : renderWalletGraphPanel()}<div class="kol-layout">`) : activeRoute === "playbooks" ? renderPlaybooks() : activeRoute === "academy" ? renderAcademy() : renderHome(); const footerUpdated = state.lastUpdated ? timeAgo(Math.floor(state.lastUpdated / 1000)) : "waiting for feed"; document.querySelector<HTMLDivElement>("#app")!.innerHTML = `<div class="shell ${motionClass}">${header()}${content}<footer><span>METEORA LP SCREENER · ${chainLabel(state.chain).toUpperCase()}</span><span>LAST UPDATED <b>${footerUpdated}</b></span></footer></div>`; document.body.classList.toggle("has-modal-selection", activeRoute === "discover" && Boolean(state.selectedPool)); syncEvidenceBackdrop(); bind(); restoreWorkspaceScroll(previousScroll); renderUiIcons(document.getElementById(String.fromCharCode(97,112,112))!);
}
function selectEvidencePool(key: string) {
  if (!key) return;
  state.selectedPool = key;
  renderEvidenceInPlace();
  window.requestAnimationFrame(() => {
    const evidence = document.querySelector(".evidence-panel");
    evidence?.querySelector<HTMLButtonElement>("[data-close-evidence]")?.focus({ preventScroll: true });
  });
  void deepScanPool(key);
}
function bindCandleTooltips() {
  document.querySelectorAll<SVGGElement>(".candlestick-chart .candle-hit").forEach((hit) => {
    if (hit.dataset.tooltipBound === "1") return;
    hit.dataset.tooltipBound = "1";
    const chart = hit.closest<SVGSVGElement>(".candlestick-chart");
    const tooltip = chart?.parentElement?.querySelector<HTMLElement>(".candle-tooltip");
    if (!chart || !tooltip) return;
    const position = () => {
      const container = tooltip.parentElement?.getBoundingClientRect();
      const candle = hit.getBoundingClientRect();
      if (!container) return;
      const width = tooltip.offsetWidth || 180;
      const left = Math.max(6, Math.min(container.width - width - 6, candle.left - container.left + candle.width / 2 - width / 2));
      const above = candle.top - container.top > 54;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(6, above ? candle.top - container.top - 48 : candle.bottom - container.top + 6)}px`;
    };
    const show = () => { tooltip.textContent = hit.dataset.tooltip ?? ""; tooltip.hidden = false; position(); };
    const hide = () => { tooltip.hidden = true; };
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("pointermove", position);
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("focus", show);
    hit.addEventListener("blur", hide);
  });
}
function bindDecisionFilters() {
  document.querySelectorAll<HTMLButtonElement>("[data-decision-filter]").forEach((button) => {
    if (button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const value = button.dataset.decisionFilter ?? "all";
      state.sortDir = "desc";
      if (value === "all") {
        state.decisionFilter = "all";
        state.list = "eligible";
        state.minLiquidity = defaultMinLiquidityForChain(state.chain);
        state.minVolume = defaultMinVolumeForChain(state.chain);
        state.maxAge = defaultMaxAgeForChain(state.chain);
        state.scoreMin = 0;
        state.walletFilter = "all";
        state.kolFilter = "all";
        state.sort = "score";
      } else {
        state.decisionFilter = ["lp", "runner", "flow", "rejected"].includes(value) ? value : "all";
        state.list = "all";
        state.minLiquidity = defaultMinLiquidityForChain(state.chain);
        state.minVolume = defaultMinVolumeForChain(state.chain);
        state.maxAge = defaultMaxAgeForChain(state.chain);
        state.scoreMin = 0;
        state.walletFilter = "all";
        state.kolFilter = "all";
        state.sort = value === "flow" ? "flow" : "score";
      }
      render();
    });
  });
}
function bind() {
  bindDecisionFilters(); document.querySelector<HTMLButtonElement>("#mobileNavToggle")?.addEventListener("click", () => { state.mobileNavOpen = !state.mobileNavOpen; render(); }); document.querySelectorAll<HTMLAnchorElement>(".mobile-menu a").forEach((link) => link.addEventListener("click", () => { state.mobileNavOpen = false; })); document.querySelectorAll<HTMLButtonElement>("[data-academy]").forEach((button) => button.addEventListener("click", () => { state.academy = button.dataset.academy ?? "bins"; render(); })); document.querySelector<HTMLButtonElement>("[data-academy-next]")?.addEventListener("click", () => { const order = ["bins", "shapes", "fees", "risk", "safety", "opportunities", "manage", "performance"]; state.academy = order[(order.indexOf(state.academy) + 1) % order.length]; render(); }); document.querySelectorAll<HTMLButtonElement>("[data-lab]").forEach((button) => button.addEventListener("click", () => { state.lab = button.dataset.lab ?? "spot"; render(); })); document.querySelector<HTMLInputElement>("#query")?.addEventListener("input", (e) => { state.query = (e.target as HTMLInputElement).value; render(); document.querySelector<HTMLInputElement>("#query")?.focus({ preventScroll: true }); }); (["minLiquidity", "minVolume", "maxAge", "scoreMin"] as const).forEach((id) => document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("change", (e) => { state[id] = Number((e.target as HTMLInputElement).value); render(); })); document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => { if (button.dataset.bound === "1") return; button.dataset.bound = "1"; button.addEventListener("click", () => { const preset = button.dataset.preset; state.sortDir = "desc"; if (preset === "conviction") { state.list = "eligible"; state.scoreMin = 75; state.walletFilter = "active"; state.kolFilter = "recent"; state.sort = "score"; } if (preset === "wallet") { state.list = "smart"; state.scoreMin = 0; state.walletFilter = "inflow"; state.kolFilter = "all"; state.sort = "wallets"; } if (preset === "attention") { state.list = "kol"; state.scoreMin = 0; state.walletFilter = "all"; state.kolFilter = "recent"; state.sort = "kol"; } if (preset === "liquidity") { state.list = "liquidity"; state.scoreMin = 50; state.walletFilter = "all"; state.kolFilter = "all"; state.sort = "liquidity"; } if (preset === "all") { state.list = "all"; state.query = ""; state.minLiquidity = defaultMinLiquidityForChain(state.chain); state.minVolume = defaultMinVolumeForChain(state.chain); state.maxAge = defaultMaxAgeForChain(state.chain); state.scoreMin = 0; state.walletFilter = "all"; state.kolFilter = "all"; state.sort = "score"; state.decisionFilter = "all"; } if (preset === "reset") { state.list = "all"; state.query = ""; state.minLiquidity = defaultMinLiquidityForChain(state.chain); state.minVolume = defaultMinVolumeForChain(state.chain); state.maxAge = defaultMaxAgeForChain(state.chain); state.scoreMin = 0; state.walletFilter = "all"; state.kolFilter = "all"; state.sort = "score"; state.decisionFilter = "all"; } render(); }); }); document.querySelector<HTMLButtonElement>("#sourcesToggle")?.addEventListener("click", () => { state.sourcesOpen = !state.sourcesOpen; render(); if (state.sourcesOpen) void loadProviderStatus(); }); document.querySelector<HTMLButtonElement>("#saveSources")?.addEventListener("click", () => { const parse = (id: string) => (document.querySelector<HTMLTextAreaElement>(id)?.value ?? "").split(/[\n,]/).map((value) => value.trim()).filter(Boolean); state.trackedWallets = parse("#walletSources"); state.trackedKols = parse("#kolSources"); localStorage.setItem("lp-screener-wallets", JSON.stringify(state.trackedWallets)); localStorage.setItem("lp-screener-kols", JSON.stringify(state.trackedKols)); state.sourcesOpen = false; render(); }); document.querySelector<HTMLSelectElement>("#sort")?.addEventListener("change", (e) => { state.sort = (e.target as HTMLSelectElement).value; state.sortDir = "desc"; render(); }); document.querySelector<HTMLButtonElement>("#metricToggle")?.addEventListener("click", () => { state.metricMode = state.metricMode === "mcap" ? "price" : "mcap"; render(); }); document.querySelector<HTMLSelectElement>("#walletFilter")?.addEventListener("change", (e) => { state.walletFilter = (e.target as HTMLSelectElement).value; render(); }); document.querySelector<HTMLSelectElement>("#kolFilter")?.addEventListener("change", (e) => { state.kolFilter = (e.target as HTMLSelectElement).value; render(); }); document.querySelectorAll<HTMLButtonElement>("[data-watch]").forEach((button) => { if (button.dataset.bound === "1") return; button.dataset.bound = "1"; button.addEventListener("click", (event) => { event.stopPropagation(); const symbol = button.dataset.watch ?? ""; state.watchlist = state.watchlist.includes(symbol) ? state.watchlist.filter((item) => item !== symbol) : [...state.watchlist, symbol]; localStorage.setItem("lp-screener-watchlist", JSON.stringify(state.watchlist)); render(); }); }); document.querySelectorAll<HTMLButtonElement>("[data-compare]").forEach((button) => { if (button.dataset.bound === "1") return; button.dataset.bound = "1"; button.addEventListener("click", (event) => { event.stopPropagation(); const symbol = button.dataset.compare ?? ""; state.compareList = state.compareList.includes(symbol) ? state.compareList.filter((item) => item !== symbol) : [...state.compareList, symbol].slice(-4); render(); }); }); document.querySelector<HTMLButtonElement>("[data-clear-compare]")?.addEventListener("click", () => { state.compareList = []; render(); }); document.querySelectorAll<HTMLButtonElement>("[data-table-scroll]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const table = document.querySelector<HTMLDivElement>(".table-scroll-viewport"); if (!table) return; const amount = Math.max(220, Math.round(table.clientWidth * 0.72)); table.scrollBy({ left: button.dataset.tableScroll === "right" ? amount : -amount, behavior: "smooth" }); })); document.querySelectorAll<HTMLButtonElement>("[data-table-sort]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); chooseWorkspaceSort(button.dataset.tableSort ?? ""); })); document.querySelectorAll<HTMLTableRowElement>("[data-pool]").forEach((row) => { if (row.dataset.bound === "1") return; row.dataset.bound = "1"; row.addEventListener("click", () => { selectEvidencePool(row.dataset.pool ?? ""); }); }); const evidenceClose = document.querySelector<HTMLButtonElement>("[data-close-evidence]"); if (evidenceClose && evidenceClose.dataset.bound !== "1") { evidenceClose.dataset.bound = "1"; evidenceClose.addEventListener("click", closeEvidence); } document.querySelectorAll<HTMLButtonElement>("[data-evidence-prev], [data-evidence-next]").forEach((button) => { if (button.dataset.bound === "1") return; button.dataset.bound = "1"; button.addEventListener("click", (event) => { event.stopPropagation(); selectEvidencePool(button.dataset.evidencePrev ?? button.dataset.evidenceNext ?? ""); }); }); document.querySelectorAll<HTMLButtonElement>("[data-list]").forEach((button) => button.addEventListener("click", () => { state.list = button.dataset.list ?? "all"; render(); })); document.querySelector("#refresh")?.addEventListener("click", async (e) => { const button = e.currentTarget as HTMLButtonElement; button.disabled = true; button.innerHTML = `${uiIcon("RefreshCw", "button-icon")} Refreshing…`; renderUiIcons(button); await loadLive(); render("data"); });
  document.querySelector<HTMLInputElement>("#kolQuery")?.addEventListener("input", (event) => { state.kolQuery = (event.target as HTMLInputElement).value; render(); document.querySelector<HTMLInputElement>("#kolQuery")?.focus({ preventScroll: true }); });
  document.querySelector<HTMLSelectElement>("#kolChain")?.addEventListener("change", (event) => { state.kolChain = (event.target as HTMLSelectElement).value; render(); });
  document.querySelector<HTMLSelectElement>("#kolConfidence")?.addEventListener("change", (event) => { state.kolConfidence = (event.target as HTMLSelectElement).value; render(); });
  document.querySelector<HTMLSelectElement>("#kolSort")?.addEventListener("change", (event) => { state.kolSort = (event.target as HTMLSelectElement).value; render(); });
  document.querySelector<HTMLButtonElement>("[data-x-sync]")?.addEventListener("click", () => { void loadXRadarFeed(); });
  document.querySelectorAll<HTMLButtonElement>("[data-kol-select]").forEach((button) => button.addEventListener("click", () => { state.selectedKol = button.dataset.kolSelect ?? ""; state.walletCluster = { address: "", chain: "solana", loading: false, error: "", result: undefined }; render(); const record = kolDataset.records.find((item) => item.handle === state.selectedKol); if (record) void loadXProfile(xHandleForRecord(record)); void loadWalletGraph(state.selectedKol); }));
  document.querySelector<HTMLButtonElement>("[data-close-kol]")?.addEventListener("click", () => { state.selectedKol = ""; state.walletCluster = { address: "", chain: "solana", loading: false, error: "", result: undefined }; render(); void loadWalletGraph(); });
  document.querySelectorAll<HTMLButtonElement>("[data-kol-watch]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const handle = button.dataset.kolWatch ?? ""; state.kolWatchlist = state.kolWatchlist.includes(handle) ? state.kolWatchlist.filter((item) => item !== handle) : [...state.kolWatchlist, handle]; localStorage.setItem("lp-screener-kol-watchlist", JSON.stringify(state.kolWatchlist)); render(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-copy-address]").forEach((button) => button.addEventListener("click", async (event) => { event.stopPropagation(); const address = button.dataset.copyAddress ?? ""; try { await navigator.clipboard.writeText(address); button.textContent = "Copied"; setTimeout(() => { button.textContent = "Copy"; }, 1400); } catch { button.textContent = "Select"; } }));
  document.querySelector<HTMLButtonElement>("#saveTwitterReview")?.addEventListener("click", () => { const record = state.selectedKol ? kolDataset.records.find((item) => item.handle === state.selectedKol) : undefined; if (!record) return; const prior = state.twitterReviews[record.handle] ?? automaticTwitterReview(record); const xHandle = document.querySelector<HTMLInputElement>("#twitterReviewHandle")?.value.trim().replace(/^@+/, "") ?? ""; const status = (document.querySelector<HTMLSelectElement>("#twitterReviewStatus")?.value ?? "UNREVIEWED") as TwitterReview["status"]; const note = document.querySelector<HTMLTextAreaElement>("#twitterReviewNote")?.value.trim() ?? ""; const sourceUrls = uniqueUrls([...(prior.sourceUrls ?? []), xHandle ? `https://x.com/${encodeURIComponent(xHandle)}` : undefined]); const autoMatch = { ...(prior.autoMatch ?? automaticTwitterReview(record).autoMatch!), confidence: status === "CONFIRMED" ? "EXACT" as const : status === "LIKELY" ? "LIKELY" as const : status === "NO_MATCH" ? "UNRESOLVED" as const : prior.autoMatch?.confidence ?? "CANDIDATE" as const, method: "manual-override" as const, sourceUrls, thesisSourceUrls: uniqueUrls((prior.thesisMatches ?? []).flatMap((match) => [match.evidenceUrl, ...(match.sourceUrls ?? [])])) }; state.twitterReviews[record.handle] = { ...prior, xHandle, xUrl: xHandle ? `https://x.com/${encodeURIComponent(xHandle)}` : `https://x.com/search?q=%40${encodeURIComponent(record.handle)}&f=user`, status, note, sourceUrls, autoMatch, updatedAt: new Date().toISOString().slice(0, 10) }; localStorage.setItem("lp-screener-twitter-reviews-v1", JSON.stringify(state.twitterReviews)); render(); });
  document.querySelector<HTMLButtonElement>("#saveTwitterThesis")?.addEventListener("click", () => { const record = state.selectedKol ? kolDataset.records.find((item) => item.handle === state.selectedKol) : undefined; if (!record) return; const prior = state.twitterReviews[record.handle] ?? automaticTwitterReview(record); const token = document.querySelector<HTMLInputElement>("#twitterThesisToken")?.value.trim() ?? ""; const evidenceUrl = document.querySelector<HTMLInputElement>("#twitterThesisUrl")?.value.trim() ?? ""; const thesis = document.querySelector<HTMLTextAreaElement>("#twitterThesisNote")?.value.trim() ?? ""; if (!token || !evidenceUrl || !thesis) return; const match: TwitterThesisMatch = { token, evidenceUrl, thesis, sourceUrls: [evidenceUrl], confidence: thesisConfidence({ token, evidenceUrl, thesis, sourceUrls: [evidenceUrl], updatedAt: "" }), updatedAt: new Date().toISOString().slice(0, 10) }; const thesisMatches = [...(prior.thesisMatches ?? []), match]; state.twitterReviews[record.handle] = { ...prior, thesisMatches, autoMatch: prior.autoMatch ? { ...prior.autoMatch, thesisSourceUrls: uniqueUrls(thesisMatches.flatMap((item) => [item.evidenceUrl, ...(item.sourceUrls ?? [])])) } : undefined, updatedAt: new Date().toISOString().slice(0, 10) }; localStorage.setItem("lp-screener-twitter-reviews-v1", JSON.stringify(state.twitterReviews)); render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-wallet-cluster]").forEach((button) => button.addEventListener("click", async (event) => { event.stopPropagation(); const address = button.dataset.walletCluster ?? ""; const chain = button.dataset.walletChain ?? "solana"; if (!address) return; state.walletCluster = { address, chain, loading: true, error: "", result: undefined }; render(); try { const result = await fetchJson<WalletClusterPayload>(liveApi("wallet-clusters", { address, chain }), 45000); if (state.walletCluster.address === address && state.walletCluster.chain === chain) state.walletCluster = { address, chain, loading: false, error: result.status === "UNAVAILABLE" || result.status === "KEY_REQUIRED" ? (result.note ?? "This chain requires indexed history.") : "", result: { ...result, chain } }; } catch (error) { if (state.walletCluster.address === address) state.walletCluster = { address, chain, loading: false, error: error instanceof Error ? error.message : "Persisted wallet scan unavailable", result: undefined }; } render(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-copy-ca]").forEach((button) => button.addEventListener("click", async (event) => { event.stopPropagation(); const address = button.dataset.copyCa ?? ""; try { await navigator.clipboard.writeText(address); button.textContent = "Copied"; setTimeout(() => { button.textContent = `CA ${shortAddress(address)}`; }, 1400); } catch { button.textContent = "Select"; } }));
  bindWorkspaceDynamic();
  bindCandleTooltips();
  bindWorkspaceTableHeaderOffset();
}
async function loadChainContext() {
  try {
    const rows = await fetchJson<Array<{ name?: string; tvl?: number }>>(liveApi("chains"), 12000);
    const valueFor = (name: string) => Number(rows.find((row) => row.name?.toLowerCase() === name.toLowerCase())?.tvl ?? 0);
    state.chainTvl = { Solana: valueFor("Solana"), Ethereum: valueFor("Ethereum"), Base: valueFor("Base"), Robinhood: valueFor("Robinhood") };
    render("data");
  } catch {
    // Chain context is optional and never affects pool eligibility.
  }
}

let walletGraphRequest = 0;
async function loadWalletGraph(handle = "") {
  const requestId = ++walletGraphRequest;
  const scope = handle ? "profile" as const : "overview" as const;
  state.walletGraph = { scope, handle, loading: true, error: "", result: undefined };
  if (route() === "discover") render("data"); else render();
  try {
    const result = await fetchJson<WalletGraphPayload>(liveApi("wallet-graph", handle ? { handle } : {}), 20000);
    if (requestId !== walletGraphRequest) return;
    state.walletGraph = { scope, handle, loading: false, error: result.status === "UNAVAILABLE" ? (result.note ?? "Wallet graph unavailable") : "", result };
  } catch (error) {
    if (requestId !== walletGraphRequest) return;
    state.walletGraph = { scope, handle, loading: false, error: error instanceof Error ? error.message : "Wallet graph unavailable", result: undefined };
  }
  if (route() === "discover") render("data"); else render();
}

async function loadProviderStatus() {
  try {
    const payload = await fetchJson<{ providers?: ProviderStatus[] }>(liveApi("providers"), 12000);
    state.providers = Array.isArray(payload.providers) ? payload.providers : [];
    render("data");
  } catch {
    // Provider health is informative and never affects pool eligibility.
  }
}

const xFeedInFlight = new Set<string>();
async function loadXFeedBatch(handles: string[], renderNow = true) {
  const requested = [...new Set(handles.map((handle) => handle.trim().replace(/^@+/, "")).filter((handle) => validHandleCandidate(handle)))].slice(0, 10);
  const pending = requested.filter((handle) => !xFeedInFlight.has(xFeedKey(handle)));
  if (!pending.length) return undefined;
  pending.forEach((handle) => xFeedInFlight.add(xFeedKey(handle)));
  try {
    const payload = await fetchJson<XProfileFeed>(liveApi("xfeed", { handles: pending.join(",") }), 25_000);
    const profiles = payload.profiles ?? {};
    pending.forEach((handle) => {
      const key = xFeedKey(handle);
      const profile = profiles[key] ?? { xHandle: handle, posts: [], summary: { postCount: 0, replyCount: 0, contractCount: 0, engagement: 0 } };
      state.xFeeds[key] = { ...payload, profiles: { [key]: profile }, posts: profile.posts };
    });
    state.xLastSync = Date.now();
    if (renderNow && route() === "kol") render(); else if (renderNow && state.selectedPool) render("data");
    return payload;
  } catch (error) {
    const payload: XProfileFeed = { status: "UNAVAILABLE", source: "Private X web-session snapshot", profiles: {}, posts: [], fetchedAt: new Date().toISOString(), note: error instanceof Error ? error.message : "X feed unavailable" };
    pending.forEach((handle) => { const key = xFeedKey(handle); state.xFeeds[key] = { ...payload, profiles: { [key]: { xHandle: handle, posts: [], summary: { postCount: 0, replyCount: 0, contractCount: 0, engagement: 0 } } }, posts: [] }; });
    if (renderNow && route() === "kol") render(); else if (renderNow && state.selectedPool) render("data");
    return payload;
  } finally {
    pending.forEach((handle) => xFeedInFlight.delete(xFeedKey(handle)));
  }
}
async function loadXProfile(handle: string) { return loadXFeedBatch([handle]); }
async function loadXPoolTheses(key: string) {
  const pool = poolByKey(key);
  if (!pool) return;
  const handles = [...new Set((pool.trackedWalletHandles ?? []).map(xHandleForFomoHandle).filter((handle) => validHandleCandidate(handle)))];
  if (handles.length) await loadXFeedBatch(handles);
}
async function loadXRadarFeed() {
  if (state.xSyncing || Date.now() - state.xLastSync < 5 * 60_000) return;
  const handles = trackedXHandles();
  if (!handles.length) return;
  state.xSyncing = true;
  if (route() === "kol") render();
  const chunks = Array.from({ length: Math.ceil(handles.length / 10) }, (_, index) => handles.slice(index * 10, index * 10 + 10));
  try {
    const first = await loadXFeedBatch(chunks[0], false);
    if (first?.status === "KEY_REQUIRED") {
      handles.forEach((handle) => { const key = xFeedKey(handle); state.xFeeds[key] = { ...first, profiles: { [key]: { xHandle: handle, posts: [], summary: { postCount: 0, replyCount: 0, contractCount: 0, engagement: 0 } } }, posts: [] }; });
    } else if (first?.status === "LIVE") {
      await mapConcurrent(chunks.slice(1), 2, async (chunk) => loadXFeedBatch(chunk, false));
    }
  } finally {
    state.xSyncing = false;
    state.xLastSync = Date.now();
    if (route() === "kol") render(); else if (state.selectedPool) render("data");
  }
}

async function loadPublicProfiles() { try { const response = await fetch("https://api.dexscreener.com/token-profiles/latest/v1"); if (!response.ok) return; const profiles = await response.json() as Array<{ chainId?: string; tokenAddress?: string; url?: string; icon?: string; links?: Array<unknown> }>; const byAddress = new Map(profiles.filter((item) => item.chainId === "solana" && item.tokenAddress).map((item) => [item.tokenAddress!.toLowerCase(), item])); state.pools = state.pools.map((pool) => { const profile = pool.tokenAddress ? byAddress.get(pool.tokenAddress.toLowerCase()) : undefined; return profile ? { ...pool, imageUrl: profile.icon ?? pool.imageUrl, publicLinks: Math.max(pool.publicLinks ?? 0, profile.links?.length ?? 0), profileUrl: profile.url } : pool; }); } catch { /* Public profile enrichment is optional. */ } }
async function loadTokenSafety() {
  const ranked = [...state.pools].sort((a, b) => b.volume24h - a.volume24h || b.liquidity - a.liquidity);
  const targets = [...new Map([...ranked.filter((pool) => (pool.kolMentions ?? 0) > 0).slice(0, 4), ...ranked.slice(0, 8)].map((pool) => [poolKey(pool), pool])).values()]
    .filter((pool) => pool.tokenStatus !== "LIVE" && pool.tokenAddress).slice(0, 12);
  const results = await mapConcurrent(targets, 4, async (pool) => {
    try {
      const payload = await fetchJson<{ status?: "LIVE" | "UNAVAILABLE"; source?: string; mintAuthority?: boolean; freezeAuthority?: boolean; holderTop10Pct?: number; safety?: "PASS" | "WARN"; rugCheckScore?: number; rugCheckRisk?: string; rugCheckRisks?: string[]; rugCheckLpLockedPct?: number; holderProfileStatus?: "LIVE" | "UNAVAILABLE"; holderProfileSource?: string; holderCount?: number }>(liveApi("token", { mint: pool.tokenAddress! }), 20000);
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
    return payload ? { ...pool, tokenStatus: "LIVE", tokenSource: payload.source ?? "Solana RPC · mint + holder checks", tokenSafety: payload.safety ?? "WARN", mintAuthority: payload.mintAuthority, freezeAuthority: payload.freezeAuthority, holderTop10Pct: payload.holderTop10Pct, rugCheckScore: payload.rugCheckScore, rugCheckRisk: payload.rugCheckRisk, rugCheckRisks: payload.rugCheckRisks, rugCheckLpLockedPct: payload.rugCheckLpLockedPct, holderProfileStatus: payload.holderProfileStatus, holderProfileSource: payload.holderProfileSource, holderCount: payload.holderCount } : pool;
  });
  refreshEligibility();
}

let scoreSnapshotSerial = 0;
let eligibilityRefreshTimer: number | undefined;
function refreshEligibilityNow() {
  const capturedAt = Date.now();
  const snapshotId = ++scoreSnapshotSerial;
  state.pools = state.pools.map((pool) => {
    const eligibility = evaluateEligibility(
      pool,
      pool.technical,
      {
        walletLive: pool.walletIntelligence === "LIVE",
        kolLive: pool.kolIntelligence === "LIVE",
        walletEvidence: Number(pool.smartWallets ?? 0) > 0 || Number(pool.walletEvents ?? 0) > 0 || Number(pool.trackedWalletHits ?? 0) > 0,
        kolEvidence: Number(pool.kolMentions ?? 0) > 0,
      },
      pool.tokenStatus === "LIVE" ? { status: "LIVE", source: pool.tokenSource, mintAuthority: pool.mintAuthority, freezeAuthority: pool.freezeAuthority, holderTop10Pct: pool.holderTop10Pct } : undefined,
      { maxAgeDays: pool.chain === "solana" ? 365 : 2_500 },
    );
    return { ...pool, eligibility, scoreSnapshot: computeScoreSnapshot(pool, snapshotId, capturedAt) };
  });
  render("data");
}
function refreshEligibility() {
  if (eligibilityRefreshTimer) return;
  eligibilityRefreshTimer = window.setTimeout(() => {
    eligibilityRefreshTimer = undefined;
    refreshEligibilityNow();
  }, 120);
}

type WalletPayload = { status?: string; source?: string; smartWallets?: number; walletFlow?: Pool["walletFlow"]; walletEvents?: number; walletAddresses?: string[]; trackedWalletHits?: number; trackedWalletHandles?: string[]; trackedWalletConfidence?: KolWallet["confidence"]; trackedWalletAddresses?: string[] };
const walletCache = new Map<string, { payload: WalletPayload; fetchedAt: number }>();
const applyWalletPayload = (key: string, payload: WalletPayload) => {
  const walletAddresses = payload.walletAddresses ?? [];
  const tracked = trackedWalletMatches(walletAddresses);
  const handles = [...new Set([...(payload.trackedWalletHandles ?? []), ...tracked.handles])];
  const hits = Math.max(Number(payload.trackedWalletHits ?? 0), tracked.hits);
  state.pools = state.pools.map((pool) => poolKey(pool) === key ? { ...pool, smartWallets: Number(payload.smartWallets ?? 0), walletFlow: payload.walletFlow ?? "MIXED", walletEvents: Number(payload.walletEvents ?? 0), walletAddresses, trackedWalletHits: hits, trackedWalletHandles: handles, trackedWalletConfidence: payload.trackedWalletConfidence ?? tracked.confidence, walletIntelligence: "LIVE", walletSource: payload.source ?? "Solana RPC · captured wallet map scan", intelligence: "LIVE" } : pool);
};
async function loadWalletIntelligence() {
  const targets = state.pools.filter((pool) => pool.pairAddress && pool.tokenAddress);
  const now = Date.now();
  const pending = targets.filter((pool) => {
    const cached = walletCache.get(poolKey(pool));
    if (cached && now - cached.fetchedAt < 5 * 60_000) { applyWalletPayload(poolKey(pool), cached.payload); return false; }
    return true;
  });
  state.walletScan = { active: pending.length > 0, complete: targets.length - pending.length, total: targets.length };
  render("data");
  await mapConcurrent(pending, 4, async (pool) => {
    try {
      const payload = await fetchJson<WalletPayload>(liveApi("wallets", { pool: pool.pairAddress!, base: pool.tokenAddress!, limit: "12", scan: "50" }), 20000);
      if (payload.status === "LIVE") { walletCache.set(poolKey(pool), { payload, fetchedAt: Date.now() }); applyWalletPayload(poolKey(pool), payload); }
    } catch (error) {
      console.warn("wallet activity request failed", pool.pairAddress, error);
    } finally {
      state.walletScan.complete += 1;
      if (state.walletScan.complete % 4 === 0 || state.selectedPool === poolKey(pool)) refreshEligibility(); else render("data");
    }
    return undefined;
  });
  state.walletScan.active = false;
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
      ...(() => { const tracked = trackedWalletMatches(payload.walletAddresses?.length ? payload.walletAddresses : pool.walletAddresses); return { trackedWalletHits: tracked.hits, trackedWalletHandles: tracked.handles, trackedWalletConfidence: tracked.confidence }; })(),
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
    refreshEligibility();
  } catch (error) {
    console.warn("configured intelligence provider unavailable", error);
  }
}
let refreshInFlight = false;
const CANDLE_FRESH_MS = 3 * 60_000;
const CANDLE_PERSIST_MS = 15 * 60_000;
type CandleCacheEntry = { candles?: Candle[]; fetchedAt: number; failedAt?: number; retryAt?: number };
const candleStorageKey = "lp-screener-candle-cache-v1";
const readCandleCache = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(candleStorageKey) ?? "{}") as Record<string, CandleCacheEntry>;
    return new Map(Object.entries(saved).filter(([, entry]) => Array.isArray(entry?.candles) && Date.now() - Number(entry.fetchedAt ?? 0) < CANDLE_PERSIST_MS) as Array<[string, CandleCacheEntry]>);
  } catch {
    return new Map<string, CandleCacheEntry>();
  }
};
const candleCache = readCandleCache();
const persistCandleCache = () => {
  try {
    const rows = [...candleCache.entries()].filter(([, entry]) => entry.candles?.length && Date.now() - entry.fetchedAt < CANDLE_PERSIST_MS).slice(-120);
    localStorage.setItem(candleStorageKey, JSON.stringify(Object.fromEntries(rows)));
  } catch {
    // Browser storage is optional; live requests remain authoritative.
  }
};
const candleEnrichmentInFlight = new Set<string>();
const candleRequestInFlight = new Map<string, Promise<Candle[] | undefined>>();
let nextCandleRequestAt = 0;
let candleBackoffUntil = 0;
let candleBurstRemaining = 0;
let candleRetryTimer: number | undefined;
let candleRetryPasses = 0;
const resetCandleBudget = () => { nextCandleRequestAt = 0; candleBackoffUntil = 0; candleBurstRemaining = 6; candleRetryPasses = 0; if (candleRetryTimer) { window.clearTimeout(candleRetryTimer); candleRetryTimer = undefined; } };
const waitForCandleSlot = async () => {
  if (candleBurstRemaining > 0) { candleBurstRemaining -= 1; return; }
  const now = Date.now();
  const slot = Math.max(now, nextCandleRequestAt, candleBackoffUntil);
  nextCandleRequestAt = slot + 650;
  const wait = slot - now;
  if (wait) await new Promise<void>((resolve) => window.setTimeout(resolve, wait));
};
const hydrateCandleCache = () => {
  state.pools = state.pools.map((pool) => {
    const cached = candleCache.get(pool.pairAddress ?? "");
    if (!cached?.candles?.length || cached.candles.length < 2 || pool.candles?.length) return pool;
    const technical = analyzeCandles(cached.candles);
    const playbooks = derivePlaybooks(pool, technical);
    return { ...pool, candles: cached.candles, technical, playbooks, primaryPlaybook: primaryPlaybook(playbooks) };
  });
};
const scheduleCandleRetry = () => {
  if (candleRetryTimer || candleRetryPasses >= 4) return;
  candleRetryPasses += 1;
  candleRetryTimer = window.setTimeout(() => { candleRetryTimer = undefined; void enrichTechnicalData(state.pools); }, 12_000);
};
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

type DeepScanPayload = {
  status?: "LIVE" | "PARTIAL";
  chain?: ChainId;
  source?: string;
  capturedAt?: string;
  pair?: Record<string, unknown>;
  candles?: unknown[];
  candleSource?: string;
  wallet?: Record<string, unknown>;
  token?: Record<string, unknown>;
  kol?: Record<string, unknown>;
  usage?: ProviderUsage;
};
type ChartPreviewPayload = { previews?: Record<string, { candles?: unknown[]; source?: string; timeframe?: "1m" | "5m" }>; usage?: ProviderUsage; source?: string };
const feedApi = "/api/feed";
const deepScanApi = (token: string, pool?: string, chain: ChainId = "solana") => `/api/deep-scan?${new URLSearchParams({ token, chain, ...(pool ? { pool } : {}) }).toString()}`;
const chartPreviewsApi = (pools: Pool[]) => {
  const pairs = pools.filter((pool) => pool.pairAddress).slice(0, 12);
  return `/api/chart-previews?${new URLSearchParams({ pools: pairs.map((pool) => pool.pairAddress!).join(","), chains: pairs.map((pool) => pool.chain ?? "solana").join(","), dexes: pairs.map((pool) => pool.dex).join(",") }).toString()}`;
};
const formatProviderUsage = (usage: ProviderUsage) => `${usage.creditsUsedEstimate.toLocaleString()} / ${usage.monthlyBudget.toLocaleString()} credits · ${usage.requestsLastMinute}/${usage.rateLimitPerMinute} rpm`;
const candlesFromRows = (rows: unknown) => parseOhlcv({ data: { attributes: { ohlcv_list: Array.isArray(rows) ? rows : [] } } });
type FeedPayload = { pairs?: Array<Record<string, unknown>>; source?: string; fetchedAt?: string; chain?: ChainId; page?: number; pageSize?: number; total?: number; totalAvailable?: number; discoveryHasMore?: boolean; hasMore?: boolean; nextPage?: number; availableChains?: ChainId[] };
async function fetchFeed(chain: ChainId, page = 1, pageSize = 40) {
  const cacheWindow = Math.floor(Date.now() / 15_000);
  const payload = await fetchJson<FeedPayload>(`${feedApi}?${new URLSearchParams({ chain, page: String(page), pageSize: String(pageSize), v: String(cacheWindow) }).toString()}`, 25_000);
  return payload;
}

let previewRequestInFlight: Promise<void> | undefined;
async function loadChartPreviews(pools: Pool[]) {
  const candidates = pools.filter((pool) => pool.pairAddress && pool.tokenAddress).slice(0, 12);
  if (!candidates.length || previewRequestInFlight) return previewRequestInFlight;
  previewRequestInFlight = (async () => {
    try {
      const payload = await fetchJson<ChartPreviewPayload>(chartPreviewsApi(candidates), 35_000);
      if (payload.usage) state.providerUsage = payload.usage;
      const byKey = new Map(candidates.map((pool) => [poolKey(pool), pool]));
      const previews = payload.previews ?? {};
      state.pools = state.pools.map((pool) => {
        const preview = pool.pairAddress ? previews[pool.pairAddress] : undefined;
        if (!preview) return pool;
        const previewCandles = candlesFromRows(preview.candles);
        return { ...pool, previewCandles, previewTimeframe: preview.timeframe ?? "5m", previewSource: preview.source ?? payload.source };
      });
      if (byKey.size) render("data");
    } catch {
      // Preview charts are optional and never block the feed table.
    } finally {
      previewRequestInFlight = undefined;
    }
  })();
  return previewRequestInFlight;
}

function mapLivePair(pair: Record<string, unknown>): Pool {
  const rawChain = String(pair.chainId ?? state.chain).toLowerCase();
  const chain = (Object.prototype.hasOwnProperty.call({ solana: true, ethereum: true, base: true, robinhood: true }, rawChain) ? rawChain : state.chain) as ChainId;
  const isSolana = chain === "solana";
  const base = pair.baseToken as { symbol?: string; address?: string } | undefined;
  const quote = pair.quoteToken as { symbol?: string; address?: string } | undefined;
  const ocula = pair.ocula as OculaToken | undefined;
  const madeOnSol = pair.madeOnSol as { mentions?: number; creators?: number; recency?: string; trend?: string; source?: string; delay?: string } | undefined;
  const oculaLinks = Object.values(ocula?.token?.socialLinks ?? {}).filter(Boolean).length;
  const baseSymbol = String(base?.symbol ?? ocula?.token?.symbol ?? "TOKEN");
  const quoteSymbol = String(quote?.symbol ?? (isSolana ? "SOL" : "USD"));
  const pairAddress = String(pair.pairAddress ?? "");
  const tokenAddress = String(base?.address ?? ocula?.token?.address ?? "");
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
    chain,
    pairAddress,
    sourceUrl: typeof pair.url === "string" ? pair.url : undefined,
    name: `${baseSymbol} / ${quoteSymbol}`,
    symbol: `${baseSymbol}-${quoteSymbol}`,
    dex: String(pair.dexId ?? "DEX"),
    address: pairAddress ? `${pairAddress.slice(0, 4)}…${pairAddress.slice(-4)}` : "unknown",
    tokenAddress,
    imageUrl: tokenImageUrl(tokenAddress, chain),
    quoteTokenAddress: String(quote?.address ?? ""),
    tokenStatus: "UNAVAILABLE",
    tokenSource: isSolana ? "Pending Solana RPC safety checks" : `Pending ${chainLabel(chain)} safety adapter`,
    tokenSafety: "UNAVAILABLE",
    price: Number(pair.priceUsd ?? oculaPrice ?? 0),
    marketCap: Number(pair.marketCap ?? pair.fdv ?? ocula?.marketCap ?? 0),
    liquidity,
    volume24h,
    ageDays,
    createdAt,
    fee: undefined,
    tvl: liquidity / 1_000_000,
    change24h: Number((pair.priceChange as { h24?: number } | undefined)?.h24 ?? ocula?.change24 ?? 0),
    risk: liquidity >= 1_000_000 ? "LOW" : liquidity >= 250_000 ? "MEDIUM" : "HIGH",
    smartWallets: 0,
    walletFlow: "UNAVAILABLE",
    walletIntelligence: "UNAVAILABLE",
    walletSource: isSolana ? "Pending Solana RPC analysis" : `${chainLabel(chain)} wallet indexer on demand`,
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

function mergeLivePool(next: Pool, prior?: Pool) {
  if (!prior) return next;
  const merged = { ...next };
  const copy = (fields: Array<keyof Pool>) => Object.fromEntries(fields.map((field) => [field, prior[field]]).filter(([, value]) => value !== undefined)) as Partial<Pool>;
  if (prior.previewCandles?.length) Object.assign(merged, copy(["previewCandles", "previewTimeframe", "previewSource"]));
  if (prior.candles?.length || prior.technical?.available) Object.assign(merged, copy(["candles", "technical", "playbooks", "primaryPlaybook"]));
  if (prior.tokenStatus === "LIVE") Object.assign(merged, copy(["tokenStatus", "tokenSource", "tokenSafety", "mintAuthority", "freezeAuthority", "holderTop10Pct", "rugCheckScore", "rugCheckRisk", "rugCheckRisks", "rugCheckLpLockedPct", "holderProfileStatus", "holderProfileSource", "holderCount"]));
  if (prior.walletIntelligence === "LIVE") Object.assign(merged, copy(["smartWallets", "trackedWalletHits", "trackedWalletHandles", "trackedWalletConfidence", "walletFlow", "walletIntelligence", "walletSource", "walletEvents", "walletAddresses", "smartMoneyLabels"]));
  if (prior.kolIntelligence === "LIVE") Object.assign(merged, copy(["kolMentions", "kolRecency", "kolCreators", "kolPosts", "kolTrend", "kolSentiment", "kolIntelligence", "kolSource"]));
  if (prior.intelligence === "LIVE") merged.intelligence = "LIVE";
  if (prior.enrichmentLoading) merged.enrichmentLoading = true;
  return merged;
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

async function fetchCandles(pool: Pool, preferCodex = false) {
  if (!pool.pairAddress) return undefined;
  const key = pool.pairAddress;
  const requestKey = `${key}:${preferCodex ? "codex" : "free"}`;
  const inFlight = candleRequestInFlight.get(requestKey);
  if (inFlight) return inFlight;
  const request = (async () => {
    const cached = candleCache.get(key);
    if (cached?.candles && Date.now() - cached.fetchedAt < CANDLE_FRESH_MS) return cached.candles;
    if (cached?.retryAt && Date.now() < cached.retryAt) return undefined;
    if (cached?.failedAt && !cached.retryAt && Date.now() - cached.failedAt < 60_000) return undefined;
    const markFailure = (retryMs?: number) => { const now = Date.now(); candleCache.set(key, { ...cached, fetchedAt: cached?.fetchedAt ?? now, failedAt: now, retryAt: retryMs ? now + retryMs : undefined }); };
    await waitForCandleSlot();
    let serverRateLimited = false;
    try {
      const payload = await fetchJson<unknown>(liveApi("ohlcv", { pool: key, token: pool.tokenAddress ?? "", chain: pool.chain ?? "solana", dex: pool.dex, codex: preferCodex ? "1" : "0", limit: "48" }), 12000);
      const candles = parseOhlcv(payload);
      if (candles.length) { candleCache.set(key, { candles, fetchedAt: Date.now() }); persistCandleCache(); return candles; }
    } catch (error) {
      const errorText = String(error);
      serverRateLimited = /\b429\b/.test(errorText);
      if (serverRateLimited) candleBackoffUntil = Date.now() + 15_000;
      // Keep the direct provider fallback for non-rate-limit responses too. A
      // pair can be absent from one index while still being available in Gecko.
      console.warn("server 15m candle adapter failed", key, error);
    }
    // The server adapter already uses GeckoTerminal when no higher-quota key is
    // configured. Do not immediately duplicate a rate-limited request from the
    // browser; keep the last good series and let the scheduled retry recover it.
    if (serverRateLimited) {
      markFailure(15_000);
      return cached?.candles;
    }
    try {
      const geckoChain = pool.chain === "ethereum" ? "eth" : pool.chain ?? "solana";
      const payload = await fetchJson<unknown>(`https://api.geckoterminal.com/api/v2/networks/${geckoChain}/pools/${encodeURIComponent(key)}/ohlcv/minute?aggregate=15&limit=48`, 12000);
      const candles = parseOhlcv(payload);
      if (candles.length) { candleCache.set(key, { candles, fetchedAt: Date.now() }); persistCandleCache(); return candles; }
    } catch (fallbackError) {
      const rateLimited = /\b429\b/.test(String(fallbackError));
      if (rateLimited) candleBackoffUntil = Date.now() + 15_000;
      console.warn("15m candle request failed", key, fallbackError);
      markFailure(rateLimited ? 15_000 : 30_000);
    }
    markFailure(30_000);
    return cached?.candles;
  })();
  candleRequestInFlight.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (candleRequestInFlight.get(requestKey) === request) candleRequestInFlight.delete(requestKey);
  }
}

async function enrichTechnicalData(pools: Pool[]) {
  const selectedKey = state.selectedPool;
  const ranked = [...pools].sort((a, b) => {
    const aSelected = selectedKey && poolKey(a) === selectedKey ? 1 : 0;
    const bSelected = selectedKey && poolKey(b) === selectedKey ? 1 : 0;
    return bSelected - aSelected || b.volume24h - a.volume24h || b.liquidity - a.liquidity;
  });
  const targets = [...new Map(ranked.filter((pool) => pool.pairAddress).map((pool) => [poolKey(pool), pool])).values()]
    .filter((pool) => {
      const cached = candleCache.get(pool.pairAddress ?? "");
      return !cached?.candles || Date.now() - cached.fetchedAt >= CANDLE_FRESH_MS;
    });
  const enrichTargets = async (batch: Pool[], concurrency: number) => {
    const queued = batch.filter((pool) => !candleEnrichmentInFlight.has(poolKey(pool)));
    queued.forEach((pool) => candleEnrichmentInFlight.add(poolKey(pool)));
    let completed = 0;
    await mapConcurrent(queued, concurrency, async (pool) => {
      const key = poolKey(pool);
      try {
        const candles = await fetchCandles(pool);
        const current = poolByKey(key);
        if (current && candles && candles.length >= 2) {
          const technical = analyzeCandles(candles);
          const playbooks = derivePlaybooks(current, technical);
          state.pools = state.pools.map((item) => poolKey(item) === key ? { ...item, candles, technical, playbooks, primaryPlaybook: primaryPlaybook(playbooks) } : item);
        } else if (current && !current.candles) {
          const technical = current.technical ?? { available: false, candlesCount: 0, fresh: false, trend: "UNAVAILABLE" as const, bullishFlipWithin3: false, reclaimWithin3: false, trendSeries: [] };
          const playbooks = derivePlaybooks(current, technical);
          state.pools = state.pools.map((item) => poolKey(item) === key ? { ...item, technical, playbooks, primaryPlaybook: primaryPlaybook(playbooks) } : item);
        }
      } finally {
        candleEnrichmentInFlight.delete(key);
        completed += 1;
        if (completed % 8 === 0 || completed === queued.length) refreshEligibility();
      }
      return undefined;
    });
    if (queued.some((pool) => candleCache.get(pool.pairAddress ?? "")?.retryAt)) scheduleCandleRetry();
  };
  const priority = targets.slice(0, 30);
  const remainder = targets.slice(30);
  await enrichTargets(priority, 6);
  if (targets.some((pool) => candleCache.get(pool.pairAddress ?? "")?.retryAt)) scheduleCandleRetry();
  if (remainder.length) window.setTimeout(() => { void enrichTargets(remainder, 2); }, 750);
}

const enrichmentInFlight = new Set<string>();
const patchPool = (key: string, patch: Partial<Pool>) => { state.pools = state.pools.map((pool) => poolKey(pool) === key ? { ...pool, ...patch } : pool); };

async function enrichSelectedPool(key: string) {
  const initial = poolByKey(key);
  if (!initial || !initial.pairAddress || !initial.tokenAddress || enrichmentInFlight.has(key)) return;
  const needsTechnical = !initial.technical?.available;
  const needsWallet = initial.walletIntelligence !== "LIVE";
  const needsSafety = initial.tokenStatus !== "LIVE";
  const needsKol = initial.kolIntelligence !== "LIVE";
  if (!needsTechnical && !needsWallet && !needsSafety && !needsKol) return;
  enrichmentInFlight.add(key);
  patchPool(key, { enrichmentLoading: true });
  render("data");
  try {
    if (needsTechnical) {
      const candles = await fetchCandles(initial, true);
      if (candles?.length) {
        const technical = analyzeCandles(candles);
        const playbooks = derivePlaybooks(initial, technical);
        patchPool(key, { candles, technical, playbooks, primaryPlaybook: primaryPlaybook(playbooks) });
        render("data");
      }
    }
    const current = poolByKey(key) ?? initial;
    const requests: Array<{ kind: "wallet" | "token" | "kol"; promise: Promise<unknown> }> = [];
    if (needsWallet) requests.push({ kind: "wallet", promise: fetchJson(liveApi("wallets", { pool: current.pairAddress!, base: current.tokenAddress!, limit: "12", scan: "50" }), 20000) });
    if (needsSafety) requests.push({ kind: "token", promise: fetchJson(liveApi("token", { mint: current.tokenAddress! }), 20000) });
    if (needsKol) {
      const params: Record<string, string> = { symbol: current.symbol.split("-")[0].trim() };
      if (current.tokenAddress) params.mint = current.tokenAddress;
      requests.push({ kind: "kol", promise: fetchJson(liveApi("kol", params), 20000) });
    }
    const responses = await Promise.allSettled(requests.map((request) => request.promise));
    responses.forEach((response, index) => {
      const request = requests[index];
      if (response.status !== "fulfilled") {
        if (request.kind === "wallet") patchPool(key, { walletSource: "Solana RPC unavailable · retry refresh" });
        if (request.kind === "token") patchPool(key, { tokenSource: "Solana RPC safety check unavailable · retry refresh" });
        if (request.kind === "kol") patchPool(key, { kolSource: "KOL provider unavailable · optional evidence" });
        return;
      }
      const payload = response.value as Record<string, unknown>;
      if (payload.status !== "LIVE") {
        if (request.kind === "wallet") patchPool(key, { walletSource: "Solana RPC returned no live sample · retry refresh" });
        if (request.kind === "token") patchPool(key, { tokenSource: "Solana RPC returned no safety sample · retry refresh" });
        if (request.kind === "kol") patchPool(key, { kolSource: "KOL provider returned no live attention sample" });
        return;
      }
      if (request.kind === "wallet") {
        const walletAddresses = Array.isArray(payload.walletAddresses) ? payload.walletAddresses.map(String) : [];
        const tracked = trackedWalletMatches(walletAddresses);
        patchPool(key, { smartWallets: Number(payload.smartWallets ?? 0), walletFlow: payload.walletFlow as Pool["walletFlow"] ?? "MIXED", walletEvents: Number(payload.walletEvents ?? 0), walletAddresses, trackedWalletHits: tracked.hits, trackedWalletHandles: tracked.handles, trackedWalletConfidence: tracked.confidence, walletIntelligence: "LIVE", walletSource: String(payload.source ?? "Solana RPC · recent pool traders"), intelligence: "LIVE" });
      } else if (request.kind === "token") {
        patchPool(key, { tokenStatus: "LIVE", tokenSource: String(payload.source ?? "Solana RPC · mint + holder checks"), tokenSafety: payload.safety as Pool["tokenSafety"] ?? "WARN", mintAuthority: typeof payload.mintAuthority === "boolean" ? payload.mintAuthority : undefined, freezeAuthority: typeof payload.freezeAuthority === "boolean" ? payload.freezeAuthority : undefined, holderTop10Pct: typeof payload.holderTop10Pct === "number" ? payload.holderTop10Pct : undefined, rugCheckScore: typeof payload.rugCheckScore === "number" ? payload.rugCheckScore : undefined, rugCheckRisk: typeof payload.rugCheckRisk === "string" ? payload.rugCheckRisk : undefined, rugCheckRisks: Array.isArray(payload.rugCheckRisks) ? payload.rugCheckRisks.map(String) : undefined, rugCheckLpLockedPct: typeof payload.rugCheckLpLockedPct === "number" ? payload.rugCheckLpLockedPct : undefined, holderProfileStatus: payload.holderProfileStatus as Pool["holderProfileStatus"], holderProfileSource: typeof payload.holderProfileSource === "string" ? payload.holderProfileSource : undefined, holderCount: typeof payload.holderCount === "number" ? payload.holderCount : undefined });
      } else {
        patchPool(key, { kolMentions: Number(payload.kolMentions ?? 0), kolRecency: String(payload.kolRecency ?? "—"), kolCreators: Number(payload.kolCreators ?? payload.kolMentions ?? 0), kolPosts: Number(payload.kolPosts ?? payload.kolMentions ?? 0), kolTrend: typeof payload.kolTrend === "string" ? payload.kolTrend : undefined, kolSentiment: typeof payload.kolSentiment === "number" ? payload.kolSentiment : undefined, kolIntelligence: "LIVE", kolSource: String(payload.source ?? "KOL provider"), intelligence: "LIVE" });
      }
    });
    const enriched = poolByKey(key);
    if (enriched?.trackedWalletHandles?.length) void loadXPoolTheses(key);
  } finally {
    enrichmentInFlight.delete(key);
    patchPool(key, { enrichmentLoading: false });
    refreshEligibility();
  }
}

async function loadLive(reset = true) {
  if (reset) {
    if (refreshInFlight) return;
    refreshInFlight = true;
    state.loading = true;
    state.feedPage = 1;
    state.feedHasMore = false;
    state.liveError = "";
    resetCandleBudget();
  } else {
    if (state.loading || state.feedLoadingMore || !state.feedHasMore) return;
    state.feedLoadingMore = true;
  }
  render("data");
  try {
    const payload = await fetchFeed(state.chain, reset ? 1 : state.feedPage, state.feedPageSize);
    const pairs = payload.pairs ?? [];
    if (reset && !pairs.length) throw new Error(`No ${chainLabel(state.chain)} pairs returned`);
    const priorPools = new Map(state.pools.map((pool) => [poolKey(pool), pool]));
    const incoming = recordLaunchObservations(pairs.map(mapLivePair)).map((pool) => mergeLivePool(pool, priorPools.get(poolKey(pool))));
    const merged = reset ? incoming : [...state.pools, ...incoming];
    state.pools = [...new Map(merged.map((pool) => [poolKey(pool), pool])).values()];
    state.feedTotal = Number(payload.total ?? state.pools.length);
    state.feedAvailableTotal = Number(payload.totalAvailable ?? 0);
    state.feedHasMore = Boolean(payload.hasMore);
    state.feedPage = Number(payload.nextPage ?? ((payload.page ?? (reset ? 1 : state.feedPage)) + 1));
    state.liveReady = true;
    state.source = `LIVE · ${chainLabel(state.chain)} feed · ${payload.source ?? "Dexscreener"}`;
    state.lastUpdated = Date.now();
    state.liveError = "";
    refreshEligibilityNow();
    render("data");
    state.pools = recordLaunchObservations(state.pools);
    render("data");
    void loadChartPreviews(reset ? filtered() : incoming);
  } catch (error) {
    state.liveError = error instanceof Error ? `${error.message}. Showing the last available snapshot.` : "Live feed unavailable. Showing the last available snapshot.";
    if (!state.liveReady) state.source = `${chainLabel(state.chain)} feed unavailable · demo snapshot`;
  } finally {
    if (reset) {
      state.loading = false;
      refreshInFlight = false;
    } else {
      state.feedLoadingMore = false;
    }
    render("data");
  }
}
window.addEventListener("hashchange", () => { state.mobileNavOpen = false; render(); if (route() === "kol") { void loadXRadarFeed(); void loadWalletGraph(); } else if (route() !== "discover") void loadChainContext(); });
render();
void loadLive();
if (route() !== "discover") void loadChainContext();
if (route() === "kol") { void loadXRadarFeed(); void loadWalletGraph(); }
window.setInterval(() => void loadLive(), 60_000);
window.setInterval(() => { if (route() === "kol") void loadXRadarFeed(); }, 10 * 60_000);

