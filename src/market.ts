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
  score: number;
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
  pool: { pairAddress?: string; tokenAddress?: string; liquidity: number; volume24h: number; ageDays: number },
  analysis: TechnicalAnalysis | undefined,
  intelligence: { walletLive: boolean; kolLive: boolean },
  safety: TokenSafetyAnalysis | undefined,
): EligibilityAnalysis {
  const address = Boolean(pool.pairAddress && pool.tokenAddress);
  const liquidity = pool.liquidity >= 5_000;
  const volume = pool.volume24h >= 2_000;
  const age = pool.ageDays <= 365;
  const technical = Boolean(analysis?.available && analysis.fresh);
  const intelligenceReady = intelligence.walletLive || intelligence.kolLive;
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
  if (!liquidity) reasons.push("Liquidity is below the $5K microcap floor.");
  if (!volume) reasons.push("24h volume is below the $2K activity floor.");
  if (!age) reasons.push("Pool is outside the 365-day screening window.");
  if (!analysis?.available) reasons.push("Waiting for 15m candle history.");
  else if (!analysis.fresh) reasons.push("15m data is stale; wait for a fresh refresh.");
  else if (!bullish) reasons.push("15m trend is not bullish.");
  if (!intelligenceReady) reasons.push("Waiting for live wallet or attention evidence.");
  if (!safetyReady) reasons.push("Waiting for mint and holder safety checks.");
  else if (!safetyPass) reasons.push("Mint, freeze, or holder concentration checks failed.");
  if (!reasons.length) reasons.push(trigger ? "All gates pass and a fresh bullish trigger is present." : "All hard gates pass; wait for the next confirmed trigger.");
  const score = Math.max(0, Math.min(100,
    (address ? 10 : 0) +
    (liquidity ? 15 : 0) +
    (volume ? 15 : 0) +
    (age ? 10 : 0) +
    (technical ? 20 : 0) +
    (intelligenceReady ? 15 : 0) +
    (safetyPass ? 15 : 0),
  ));
  return {
    status,
    score,
    reasons,
    hardGates: { address, liquidity, volume, age, technical, intelligence: intelligenceReady, safety: Boolean(safetyPass) },
  };
}

export const primaryPlaybook = (signals: PlaybookSignal[]) => [...signals].sort((a, b) => statusRank[b.status] - statusRank[a.status])[0];

