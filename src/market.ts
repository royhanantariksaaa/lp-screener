export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TechnicalAnalysis = {
  available: boolean;
  candlesCount: number;
  latestTimestamp?: number;
  fresh: boolean;
  trend: "BULLISH" | "BEARISH" | "UNAVAILABLE";
  supertrend?: number;
  bollinger?: { middle: number; upper: number; lower: number; widthPct: number };
  rsi2?: number;
  historyHigh?: number;
  drawdownPct?: number;
  lastClose?: number;
  bullishFlipWithin3: boolean;
  reclaimWithin3: boolean;
  trendSeries: Array<"BULLISH" | "BEARISH" | "UNAVAILABLE">;
};

export type PlaybookSignal = {
  key: "evilpanda" | "bengshark" | "tight-bidask" | "damm";
  name: string;
  status: "ENTRY_NOW" | "ARMED_WAIT" | "MONITOR" | "NOT_ELIGIBLE" | "UPDATING";
  reason: string;
};


export type TokenSafetyAnalysis = {
  status: "LIVE" | "UNAVAILABLE";
  source?: string;
  mintAuthority?: boolean;
  freezeAuthority?: boolean;
  holderTop10Pct?: number;
  decimals?: number;
};

export type EligibilityStatus = "OPEN_NOW" | "ELIGIBLE_WAIT" | "PENDING" | "REJECTED";

export type EligibilityAnalysis = {
  status: EligibilityStatus;
  reasons: string[];
  hardGates: {
    address: boolean;
    liquidity: boolean;
    volume: boolean;
    age: boolean;
    technical: boolean;
    intelligence: boolean;
    safety: boolean;
  };
};

export type MarketCapTier = "NANO" | "ULTRA_MICRO" | "MICRO" | "MEDIUM" | "MACRO" | "ULTRA_MACRO" | "UNKNOWN";

const MARKET_CAP_BANDS: Array<{ tier: MarketCapTier; max?: number }> = [
  { tier: "NANO", max: 100_000 },
  { tier: "ULTRA_MICRO", max: 1_000_000 },
  { tier: "MICRO", max: 10_000_000 },
  { tier: "MEDIUM", max: 100_000_000 },
  { tier: "MACRO", max: 1_000_000_000 },
  { tier: "ULTRA_MACRO" },
];

export function marketCapTier(marketCap?: number): MarketCapTier {
  if (!Number.isFinite(marketCap) || Number(marketCap) <= 0) return "UNKNOWN";
  return MARKET_CAP_BANDS.find((band) => band.max === undefined || Number(marketCap) < band.max)?.tier ?? "UNKNOWN";
}

export const marketCapTierLabel = (tier: MarketCapTier) => tier === "ULTRA_MICRO" ? "ULTRA MICRO" : tier === "ULTRA_MACRO" ? "ULTRA MACRO" : tier;

export type ScoringPool = {
  marketCap?: number;
  liquidity: number;
  volume24h: number;
  ageDays: number;
  fee?: number;
  change24h: number;
  technical?: TechnicalAnalysis;
  candles?: Candle[];
  walletFlow?: string;
  smartWallets?: number;
  trackedWalletHits?: number;
  walletIntelligence?: string;
  kolMentions?: number;
  kolCreators?: number;
  kolIntelligence?: string;
  oculaVolume1h?: number;
  oculaChange1h?: number;
  tokenStatus?: string;
  tokenSafety?: string;
  mintAuthority?: boolean;
  freezeAuthority?: boolean;
  holderTop10Pct?: number;
};

export type ScoreSnapshot = {
  snapshotId: number;
  capturedAt: number;
  lpFit: number;
  runnerPotential: number;
  flowUpside: number;
  evidenceConfidence: number;
  pending: boolean;
  capTier: MarketCapTier;
  components: {
    depth: number;
    volume: number;
    turnover: number;
    fee: number;
    age: number;
    range: number;
    safety: number;
    momentum: number;
    acceleration: number;
    wallet: number;
    attention: number;
  };
  available: {
    depth: boolean;
    volume: boolean;
    turnover: boolean;
    fee: boolean;
    age: boolean;
    range: boolean;
    safety: boolean;
    momentum: boolean;
    acceleration: boolean;
    wallet: boolean;
    attention: boolean;
  };
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const finitePositive = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0;
const logNormalize = (value: number, low: number, high: number) => {
  if (!Number.isFinite(value) || value <= low) return 0;
  if (value >= high) return 100;
  return clampScore((Math.log(value) - Math.log(low)) / (Math.log(high) - Math.log(low)) * 100);
};
const weightedAverage = (items: Array<{ value: number; weight: number; available: boolean }>) => {
  const available = items.filter((item) => item.available && Number.isFinite(item.value));
  const weight = available.reduce((sum, item) => sum + item.weight, 0);
  return weight ? clampScore(available.reduce((sum, item) => sum + item.value * item.weight, 0) / weight) : 0;
};
const turnoverQuality = (ratio: number) => {
  if (!Number.isFinite(ratio) || ratio <= 0.05) return 0;
  if (ratio < 0.25) return clampScore(ratio / 0.25 * 55);
  if (ratio < 0.75) return clampScore(55 + (ratio - 0.25) / 0.5 * 35);
  if (ratio <= 2) return 100;
  if (ratio <= 4) return clampScore(100 - (ratio - 2) / 2 * 20);
  return clampScore(Math.max(30, 80 - Math.log(ratio / 4) * 24));
};
const ageReliability = (ageDays: number) => {
  if (!Number.isFinite(ageDays) || ageDays < 0) return 0;
  if (ageDays < 0.5) return 25;
  if (ageDays < 2) return 45;
  if (ageDays < 7) return 65;
  if (ageDays < 30) return 85;
  if (ageDays <= 180) return 100;
  if (ageDays <= 365) return 78;
  return 45;
};
const momentumScore = (change24h: number) => {
  if (!Number.isFinite(change24h)) return 0;
  if (change24h <= 0) return clampScore(Math.max(8, 30 + change24h * 2));
  if (change24h < 5) return clampScore(30 + change24h * 4);
  if (change24h < 10) return clampScore(50 + (change24h - 5) * 6);
  if (change24h < 25) return clampScore(80 + (change24h - 10) * 1.33);
  return 100;
};
const technicalRangeScore = (technical?: TechnicalAnalysis) => {
  if (!technical?.available || !technical.fresh) return undefined;
  const trend = technical.trend === "BULLISH" ? 92 : technical.trend === "BEARISH" ? 20 : 50;
  const width = technical.bollinger?.widthPct;
  const widthScore = width === undefined ? 50 : width < 2 ? 50 : width <= 18 ? 92 : width <= 35 ? 68 : 35;
  const drawdown = technical.drawdownPct;
  const drawdownScore = drawdown === undefined ? 50 : clampScore(Math.max(20, Math.min(100, 100 + drawdown * 2)));
  return clampScore(trend * 0.55 + widthScore * 0.25 + drawdownScore * 0.2);
};
const candleAccelerationScore = (candles?: Candle[]) => {
  if (!candles || candles.length < 8) return undefined;
  const recent = candles.slice(-4).reduce((sum, candle) => sum + Math.max(0, candle.volume), 0) / 4;
  const prior = candles.slice(-8, -4).reduce((sum, candle) => sum + Math.max(0, candle.volume), 0) / 4;
  if (!prior) return recent > 0 ? 70 : 0;
  const ratio = recent / prior;
  if (ratio <= 0.5) return 15;
  if (ratio < 1) return clampScore(15 + (ratio - 0.5) * 70);
  if (ratio < 2) return clampScore(50 + (ratio - 1) * 45);
  return 100;
};
const hourlyAccelerationScore = (pool: ScoringPool) => {
  const hourly = pool.oculaVolume1h;
  const baseline = pool.volume24h > 0 ? pool.volume24h / 24 : 0;
  const scores: number[] = [];
  if (finitePositive(hourly) && finitePositive(baseline)) {
    const ratio = (hourly as number) / baseline;
    scores.push(ratio <= 0.5 ? 15 : ratio < 1 ? clampScore(15 + (ratio - 0.5) * 70) : ratio < 2 ? clampScore(50 + (ratio - 1) * 45) : 100);
  }
  const change = pool.oculaChange1h;
  if (typeof change === "number" && Number.isFinite(change)) scores.push(change <= 0 ? 15 : change < 5 ? clampScore(30 + change * 4) : change < 20 ? clampScore(50 + (change - 5) * 3.33) : 100);
  return scores.length ? Math.max(...scores) : undefined;
};
const walletSignalScore = (pool: ScoringPool) => {
  if (pool.walletFlow !== "INFLOW" && pool.walletFlow !== "MIXED" && pool.walletFlow !== "OUTFLOW" && pool.walletIntelligence !== "LIVE" && !(pool.trackedWalletHits && pool.trackedWalletHits > 0)) return undefined;
  if (pool.walletFlow === "INFLOW") return 100;
  if (pool.walletFlow === "MIXED") return 52;
  if (pool.walletFlow === "OUTFLOW") return 12;
  if (pool.trackedWalletHits && pool.trackedWalletHits > 0) return Math.min(100, 68 + pool.trackedWalletHits * 8);
  return pool.smartWallets && pool.smartWallets > 0 ? 60 : 35;
};
const attentionSignalScore = (pool: ScoringPool) => {
  const mentions = Math.max(0, Number(pool.kolMentions ?? 0));
  const creators = Math.max(0, Number(pool.kolCreators ?? mentions));
  if (pool.kolIntelligence !== "LIVE" && mentions <= 0 && creators <= 0) return undefined;
  return clampScore(Math.min(100, Math.log10(mentions + creators + 1) * 55));
};
const feeRealizationScore = (pool: ScoringPool) => {
  if (!finitePositive(pool.fee) || !finitePositive(pool.liquidity) || !Number.isFinite(pool.volume24h)) return undefined;
  const annualizedFeeYield = Math.max(0, pool.volume24h * (pool.fee as number / 100) * 365 / pool.liquidity * 100);
  return logNormalize(annualizedFeeYield, 5, 300);
};
const safetySignalScore = (pool: ScoringPool) => {
  if (pool.tokenStatus !== "LIVE" || !pool.tokenSafety) return undefined;
  if (pool.mintAuthority || pool.freezeAuthority) return 0;
  const concentration = pool.holderTop10Pct;
  const concentrationScore = concentration === undefined ? 70 : clampScore(100 - Math.max(0, concentration - 20) * 2.2);
  return pool.tokenSafety === "PASS" ? concentrationScore : pool.tokenSafety === "WARN" ? Math.min(55, concentrationScore) : 25;
};

export function computeScoreSnapshot(pool: ScoringPool, snapshotId = 0, capturedAt = Date.now()): ScoreSnapshot {
  const turnover = pool.liquidity > 0 ? pool.volume24h / pool.liquidity : 0;
  const range = technicalRangeScore(pool.technical);
  const fee = feeRealizationScore(pool);
  const safety = safetySignalScore(pool);
  const acceleration = Math.max(hourlyAccelerationScore(pool) ?? 0, candleAccelerationScore(pool.candles) ?? 0);
  const momentum = momentumScore(pool.change24h);
  const wallet = walletSignalScore(pool);
  const attention = attentionSignalScore(pool);
  const depth = logNormalize(pool.liquidity, 5_000, 1_000_000);
  const volume = logNormalize(pool.volume24h, 2_000, 5_000_000);
  const age = ageReliability(pool.ageDays);
  const components = {
    depth,
    volume,
    turnover: turnoverQuality(turnover),
    fee: fee ?? 0,
    age,
    range: range ?? 0,
    safety: safety ?? 0,
    momentum,
    acceleration,
    wallet: wallet ?? 0,
    attention: attention ?? 0,
  };
  const available = {
    depth: Number.isFinite(pool.liquidity),
    volume: Number.isFinite(pool.volume24h),
    turnover: Number.isFinite(pool.liquidity) && pool.liquidity > 0 && Number.isFinite(pool.volume24h),
    fee: fee !== undefined,
    age: Number.isFinite(pool.ageDays),
    range: range !== undefined,
    safety: safety !== undefined,
    momentum: Number.isFinite(pool.change24h),
    acceleration: hourlyAccelerationScore(pool) !== undefined || candleAccelerationScore(pool.candles) !== undefined,
    wallet: wallet !== undefined,
    attention: attention !== undefined,
  };
  const lpItems = [
    { value: depth, weight: 22, available: available.depth },
    { value: volume, weight: 18, available: available.volume },
    { value: components.turnover, weight: 18, available: available.turnover },
    { value: components.fee, weight: 14, available: available.fee },
    { value: components.range, weight: 14, available: available.range },
    { value: components.safety, weight: 10, available: available.safety },
    { value: age, weight: 4, available: available.age },
  ];
  let lpFit = weightedAverage(lpItems);
  if (pool.volume24h <= 0) lpFit = Math.min(lpFit, 25);
  else if (pool.volume24h < 2_000) lpFit = Math.min(lpFit, 40);
  const flowItems = [
    { value: components.acceleration, weight: 35, available: available.acceleration },
    { value: components.momentum, weight: 25, available: available.momentum },
    { value: components.wallet, weight: 15, available: available.wallet },
    { value: components.attention, weight: 10, available: available.attention },
    { value: age, weight: 5, available: available.age },
    { value: depth, weight: 10, available: available.depth },
  ];
  const flowCoverage = flowItems.filter((item) => item.available).reduce((sum, item) => sum + item.weight, 0) / 100;
  const flowUpside = clampScore(weightedAverage(flowItems) * (0.35 + flowCoverage * 0.65));
  const tier = marketCapTier(pool.marketCap);
  const runnerEligible = tier === "NANO" || tier === "ULTRA_MICRO";
  const runnerItems = [
    // Feed-only rows do not have 15m candles yet. Turnover and depth keep the
    // runner screen useful without pretending that they are candle momentum.
    { value: components.acceleration, weight: 20, available: available.acceleration },
    { value: components.momentum, weight: 25, available: available.momentum },
    { value: components.turnover, weight: 20, available: available.turnover },
    { value: components.depth, weight: 10, available: available.depth },
    { value: components.range, weight: 15, available: available.range },
    { value: components.wallet, weight: 5, available: available.wallet },
    { value: components.attention, weight: 5, available: available.attention },
  ];
  const runnerCoverage = runnerItems.filter((item) => item.available).reduce((sum, item) => sum + item.weight, 0) / 100;
  const runnerPotential = runnerEligible ? clampScore(weightedAverage(runnerItems) * (0.35 + runnerCoverage * 0.65)) : 0;
  const confidenceParts = [
    { value: available.depth && available.volume && available.age, weight: 20 },
    { value: available.range, weight: 20 },
    { value: available.safety, weight: 20 },
    { value: available.fee, weight: 15 },
    { value: available.wallet, weight: 12.5 },
    { value: available.attention, weight: 12.5 },
  ];
  const evidenceConfidence = clampScore(confidenceParts.reduce((sum, item) => sum + (item.value ? item.weight : 0), 0));
  return {
    snapshotId,
    capturedAt,
    lpFit: clampScore(lpFit),
    runnerPotential: clampScore(runnerPotential),
    flowUpside: clampScore(flowUpside),
    evidenceConfidence,
    pending: evidenceConfidence < 70 || !available.range || !available.safety,
    capTier: tier,
    components,
    available,
  };
}

const unavailable = (candlesCount = 0): TechnicalAnalysis => ({
  available: false,
  candlesCount,
  fresh: false,
  trend: "UNAVAILABLE",
  bullishFlipWithin3: false,
  reclaimWithin3: false,
  trendSeries: [],
});

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const standardDeviation = (values: number[]) => {
  if (!values.length) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
};

const trueRange = (candle: Candle, previous?: Candle) => previous
  ? Math.max(candle.high - candle.low, Math.abs(candle.high - previous.close), Math.abs(candle.low - previous.close))
  : candle.high - candle.low;

const rsi = (closes: number[], period: number) => {
  if (closes.length <= period) return undefined;
  const changes = closes.slice(1).map((close, index) => close - closes[index]);
  const recent = changes.slice(-period);
  const gains = recent.filter((change) => change > 0).reduce((sum, change) => sum + change, 0) / period;
  const losses = recent.filter((change) => change < 0).reduce((sum, change) => sum + Math.abs(change), 0) / period;
  if (losses === 0) return gains === 0 ? 50 : 100;
  return 100 - (100 / (1 + gains / losses));
};

const supertrend = (candles: Candle[], period = 10, multiplier = 3) => {
  const ranges = candles.map((candle, index) => trueRange(candle, candles[index - 1]));
  const atr: Array<number | undefined> = candles.map((_, index) => index < period - 1 ? undefined : average(ranges.slice(index - period + 1, index + 1)));
  const values: Array<number | undefined> = [];
  const trends: Array<"BULLISH" | "BEARISH" | "UNAVAILABLE"> = [];
  let priorUpper: number | undefined;
  let priorLower: number | undefined;
  let priorSupertrend: number | undefined;
  let priorTrend: "BULLISH" | "BEARISH" | undefined;

  candles.forEach((candle, index) => {
    const currentAtr = atr[index];
    if (currentAtr === undefined) {
      values.push(undefined);
      trends.push("UNAVAILABLE");
      return;
    }
    const midpoint = (candle.high + candle.low) / 2;
    const basicUpper = midpoint + multiplier * currentAtr;
    const basicLower = midpoint - multiplier * currentAtr;
    const upper = priorUpper === undefined || basicUpper < priorUpper || candles[index - 1].close > priorUpper ? basicUpper : priorUpper;
    const lower = priorLower === undefined || basicLower > priorLower || candles[index - 1].close < priorLower ? basicLower : priorLower;
    const trend = priorSupertrend === undefined
      ? "BULLISH"
      : priorTrend === "BEARISH"
        ? candle.close > upper ? "BULLISH" : "BEARISH"
        : candle.close < lower ? "BEARISH" : "BULLISH";
    const value = trend === "BULLISH" ? lower : upper;
    values.push(value);
    trends.push(trend);
    priorUpper = upper;
    priorLower = lower;
    priorSupertrend = value;
    priorTrend = trend;
  });
  return { values, trends };
};

export function parseOhlcv(payload: unknown): Candle[] {
  const list = (payload as { data?: { attributes?: { ohlcv_list?: unknown } } })?.data?.attributes?.ohlcv_list;
  if (!Array.isArray(list)) return [];
  return list.map((row) => {
    const values = Array.isArray(row) ? row.map(Number) : [];
    return { time: values[0], open: values[1], high: values[2], low: values[3], close: values[4], volume: values[5] };
  }).filter((candle) => candle.time > 0 && [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)).sort((a, b) => a.time - b.time);
}

export function analyzeCandles(rawCandles: Candle[]): TechnicalAnalysis {
  const candles = rawCandles.filter((candle) => candle.close > 0).sort((a, b) => a.time - b.time);
  if (candles.length < 20) return unavailable(candles.length);
  const closes = candles.map((candle) => candle.close);
  const bands = closes.slice(-20);
  const middle = average(bands);
  const deviation = standardDeviation(bands);
  const upper = middle + deviation * 2;
  const lower = middle - deviation * 2;
  const widthPct = middle ? ((upper - lower) / middle) * 100 : 0;
  const st = supertrend(candles);
  const trendSeries = st.trends;
  const validTrends = trendSeries.filter((trend) => trend !== "UNAVAILABLE");
  const trend = validTrends.at(-1) ?? "UNAVAILABLE";
  const recentTrends = trendSeries.slice(-4);
  const bullishFlipWithin3 = trend === "BULLISH" && recentTrends.slice(0, -1).includes("BEARISH");
  const latestSupertrend = st.values.at(-1);
  const recentCandles = candles.slice(-4);
  const reclaimWithin3 = latestSupertrend !== undefined && recentCandles.some((candle) => candle.low <= latestSupertrend * 1.025 && candle.close >= latestSupertrend * 0.98);
  const latestTimestamp = candles.at(-1)?.time;
  const fresh = typeof latestTimestamp === "number" && (Date.now() / 1000 - latestTimestamp) <= 45 * 60;
  const historyHigh = Math.max(...candles.map((candle) => candle.high));
  const lastClose = closes.at(-1) ?? 0;
  return {
    available: true,
    candlesCount: candles.length,
    latestTimestamp,
    fresh,
    trend,
    supertrend: latestSupertrend,
    bollinger: { middle, upper, lower, widthPct },
    rsi2: rsi(closes, 2),
    historyHigh,
    drawdownPct: historyHigh ? ((lastClose / historyHigh) - 1) * 100 : undefined,
    lastClose,
    bullishFlipWithin3,
    reclaimWithin3,
    trendSeries,
  };
}

const statusRank: Record<PlaybookSignal["status"], number> = { ENTRY_NOW: 4, ARMED_WAIT: 3, MONITOR: 2, UPDATING: 1, NOT_ELIGIBLE: 0 };

export function derivePlaybooks(pool: { dex: string; marketCap?: number; liquidity: number; volume24h: number; ageDays: number }, analysis: TechnicalAnalysis): PlaybookSignal[] {
  const baseline = pool.liquidity >= 5_000 && pool.volume24h >= 2_000 && pool.ageDays <= 365;
  if (!analysis.available) {
    return [{ key: "evilpanda", name: "EvilPanda broad reversion", status: "UPDATING", reason: `Waiting for a 15m candle response (${analysis.candlesCount} candles loaded).` }];
  }
  const freshness = analysis.fresh ? "fresh candle data" : "stale candle data; refresh before acting";
  const baselineReason = baseline ? "baseline filters pass" : "baseline liquidity, volume, or age filter failed";
  const evilStatus = !baseline ? "NOT_ELIGIBLE" : analysis.trend === "BULLISH" && analysis.bullishFlipWithin3 && analysis.fresh ? "ENTRY_NOW" : analysis.trend === "BULLISH" ? "ARMED_WAIT" : "MONITOR";
  const evilReason = evilStatus === "ENTRY_NOW"
    ? "Bullish 15m trend and a bullish flip were confirmed inside the three-candle window."
    : evilStatus === "ARMED_WAIT"
      ? `Bullish 15m trend is armed; wait for the recent flip and ${freshness}.`
      : evilStatus === "MONITOR"
        ? `No bullish EvilPanda trigger. ${baselineReason}; ${freshness}.`
        : `Do not open from this state: ${baselineReason}.`;
  const bengEligible = baseline && pool.ageDays <= 2;
  const bengStatus = !bengEligible ? "NOT_ELIGIBLE" : analysis.trend === "BULLISH" && analysis.reclaimWithin3 && analysis.fresh ? "ENTRY_NOW" : analysis.trend === "BULLISH" ? "ARMED_WAIT" : "MONITOR";
  const tightEligible = baseline && (analysis.bollinger?.widthPct ?? 99) <= 12;
  const tightStatus = !tightEligible ? "NOT_ELIGIBLE" : analysis.trend === "BULLISH" && analysis.fresh ? "ARMED_WAIT" : "MONITOR";
  const dammEligible = baseline && /damm/i.test(pool.dex) && (analysis.bollinger?.widthPct ?? 99) <= 18;
  const dammStatus = !dammEligible ? "NOT_ELIGIBLE" : analysis.fresh ? "ARMED_WAIT" : "MONITOR";
  return [
    { key: "evilpanda", name: "EvilPanda broad reversion", status: evilStatus, reason: evilReason },
    { key: "bengshark", name: "Bengshark Bonus Stage", status: bengStatus, reason: bengStatus === "ENTRY_NOW" ? "Young pool reclaimed Supertrend with a recent touch and fresh data." : bengEligible ? `Young-pool reclaim is ${analysis.trend === "BULLISH" ? "armed" : "not confirmed"}; ${freshness}.` : "Requires a pool no older than two days while baseline filters pass." },
    { key: "tight-bidask", name: "Tight BidAsk → token flip", status: tightStatus, reason: tightEligible ? `Bollinger width is ${analysis.bollinger?.widthPct.toFixed(1)}%; watch for a fresh bullish flip.` : "Requires a compressed Bollinger range and passing baseline filters." },
    { key: "damm", name: "DAMM consolidation", status: dammStatus, reason: dammEligible ? `DAMM range is compressed at ${analysis.bollinger?.widthPct.toFixed(1)}%; verify pool depth before entry.` : "Requires a DAMM pool with a compressed range and passing baseline filters." },
  ];
}


export function evaluateEligibility(
  pool: { pairAddress?: string; tokenAddress?: string; marketCap?: number; liquidity: number; volume24h: number; ageDays: number },
  analysis: TechnicalAnalysis | undefined,
  intelligence: { walletLive: boolean; kolLive: boolean; walletEvidence?: boolean; kolEvidence?: boolean },
  safety: TokenSafetyAnalysis | undefined,
  options: { minLiquidity?: number; minVolume?: number; maxAgeDays?: number } = {},
): EligibilityAnalysis {
  const minLiquidity = options.minLiquidity ?? 5_000;
  const minVolume = options.minVolume ?? 2_000;
  const maxAgeDays = options.maxAgeDays ?? 365;
  const address = Boolean(pool.pairAddress && pool.tokenAddress);
  const liquidity = pool.liquidity >= minLiquidity;
  const volume = pool.volume24h >= minVolume;
  const age = pool.ageDays <= maxAgeDays;
  const technical = Boolean(analysis?.available && analysis.fresh);
  const walletReady = intelligence.walletLive && Boolean(intelligence.walletEvidence);
  const kolReady = intelligence.kolLive && Boolean(intelligence.kolEvidence);
  const intelligenceReady = walletReady && kolReady;
  const safetyReady = safety?.status === "LIVE";
  const safetyPass = safetyReady && !safety?.mintAuthority && !safety?.freezeAuthority && (safety?.holderTop10Pct === undefined || safety.holderTop10Pct <= 45);
  const bullish = analysis?.trend === "BULLISH";
  const trigger = Boolean(bullish && (analysis?.bullishFlipWithin3 || analysis?.reclaimWithin3));
  let status: EligibilityStatus;
  if (!address || !liquidity || !volume || !age) status = "REJECTED";
  else if (!analysis?.available || !analysis.fresh || !safetyReady || !intelligenceReady) status = "PENDING";
  else if (!bullish || !safetyPass) status = "REJECTED";
  else if (trigger && technical) status = "OPEN_NOW";
  else status = "ELIGIBLE_WAIT";

  const reasons: string[] = [];
  if (!address) reasons.push("Pool and token addresses are required.");
  if (!liquidity) reasons.push(`Liquidity is below the $${Math.round(minLiquidity / 1000)}K microcap floor.`);
  if (!volume) reasons.push(`24h volume is below the $${Math.round(minVolume / 1000)}K activity floor.`);
  if (!age) reasons.push(`Pool is outside the ${maxAgeDays}-day screening window.`);
  if (!analysis?.available) reasons.push("Waiting for 15m candle history.");
  else if (!analysis.fresh) reasons.push("15m data is stale; wait for a fresh refresh.");
  else if (!bullish) reasons.push("15m trend is not bullish.");
  if (!walletReady) reasons.push("Waiting for live smart-wallet evidence.");
  if (!kolReady) reasons.push("Waiting for live KOL/attention evidence.");
  if (!safetyReady) reasons.push("Waiting for mint and holder safety checks.");
  else if (!safetyPass) reasons.push("Mint, freeze, or holder concentration checks failed.");
  if (!reasons.length) reasons.push(trigger ? "All gates pass and a fresh bullish trigger is present." : "All hard gates pass; wait for the next confirmed trigger.");
  return {
    status,
    reasons,
    hardGates: { address, liquidity, volume, age, technical, intelligence: intelligenceReady, safety: Boolean(safetyPass) },
  };
}

export const primaryPlaybook = (signals: PlaybookSignal[]) => [...signals].sort((a, b) => statusRank[b.status] - statusRank[a.status])[0];

