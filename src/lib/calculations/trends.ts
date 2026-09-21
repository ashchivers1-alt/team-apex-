// Weight-trend and rolling-average calculations for check-in data.
// Designed to be explicit about missing data rather than silently
// interpolating or ignoring gaps.

export interface DatedValue {
  date: Date;
  value: number;
}

function toDayIndex(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000);
}

export interface RollingAverageResult {
  average: number | null;
  count: number;
  windowDays: number;
  windowStart: Date;
  windowEnd: Date;
  isLowData: boolean; // fewer than ~60% of window days have a reading
}

/**
 * Rolling average of `entries` over a trailing window ending on
 * `asOfDate` (inclusive). Only actual logged values are averaged — no
 * interpolation for missing days — and the number of contributing
 * entries is always returned alongside the average so it can be shown
 * next to the figure.
 */
export function rollingAverage(
  entries: DatedValue[],
  asOfDate: Date,
  windowDays = 7
): RollingAverageResult {
  const endIdx = toDayIndex(asOfDate);
  const startIdx = endIdx - (windowDays - 1);
  const windowStart = new Date(startIdx * 86_400_000);
  const windowEnd = new Date(endIdx * 86_400_000);

  const inWindow = entries.filter((e) => {
    const idx = toDayIndex(e.date);
    return idx >= startIdx && idx <= endIdx;
  });

  const count = inWindow.length;
  const average = count > 0 ? inWindow.reduce((s, e) => s + e.value, 0) / count : null;

  return {
    average,
    count,
    windowDays,
    windowStart,
    windowEnd,
    isLowData: count < Math.ceil(windowDays * 0.6)
  };
}

export interface TrendSlopeResult {
  slopePerDay: number | null;
  points: number;
  spanDays: number;
  warning: string | null;
}

const MIN_POINTS_FOR_TREND = 4;
const MIN_SPAN_DAYS_FOR_TREND = 7;

/**
 * Ordinary-least-squares slope of `value` per calendar day over the
 * supplied entries (already filtered to the desired period by the
 * caller). Requires a minimum number of points spread over a minimum
 * number of days before returning a slope, specifically so a handful of
 * closely-spaced readings can't be read as a meaningful trend (or a
 * "plateau").
 */
export function trendSlope(entries: DatedValue[]): TrendSlopeResult {
  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  const points = sorted.length;

  if (points === 0) {
    return { slopePerDay: null, points: 0, spanDays: 0, warning: "No data in this period." };
  }

  const firstIdx = toDayIndex(sorted[0].date);
  const lastIdx = toDayIndex(sorted[points - 1].date);
  const spanDays = lastIdx - firstIdx;

  if (points < MIN_POINTS_FOR_TREND || spanDays < MIN_SPAN_DAYS_FOR_TREND) {
    return {
      slopePerDay: null,
      points,
      spanDays,
      warning: `Only ${points} reading(s) across ${spanDays} day(s) — too little data to estimate a reliable trend. Avoid concluding a plateau or a trend change from this alone.`
    };
  }

  const xs = sorted.map((e) => toDayIndex(e.date) - firstIdx);
  const ys = sorted.map((e) => e.value);
  const n = points;
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = ys.reduce((s, y) => s + y, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }

  const slopePerDay = den === 0 ? 0 : num / den;

  return { slopePerDay, points, spanDays, warning: null };
}

export interface PeriodComparison {
  current: RollingAverageResult;
  previous: RollingAverageResult;
  changeInAverage: number | null;
  bothPeriodsReliable: boolean;
  note: string;
}

/**
 * Compares two equivalent-length rolling-average windows (e.g. this
 * week vs. last week) and is explicit when either side lacks enough
 * data to trust the comparison.
 */
export function compareEquivalentPeriods(
  entries: DatedValue[],
  currentEnd: Date,
  windowDays = 7
): PeriodComparison {
  const current = rollingAverage(entries, currentEnd, windowDays);
  const previousEnd = new Date(currentEnd.getTime() - windowDays * 86_400_000);
  const previous = rollingAverage(entries, previousEnd, windowDays);

  const changeInAverage =
    current.average != null && previous.average != null ? current.average - previous.average : null;

  const bothPeriodsReliable = !current.isLowData && !previous.isLowData;

  let note = "";
  if (!bothPeriodsReliable) {
    const parts: string[] = [];
    if (current.isLowData) parts.push(`only ${current.count}/${windowDays} days logged in the current period`);
    if (previous.isLowData) parts.push(`only ${previous.count}/${windowDays} days logged in the comparison period`);
    note = `Comparison may be unreliable: ${parts.join("; ")}.`;
  } else {
    note = "Both periods have adequate logging to compare.";
  }

  return { current, previous, changeInAverage, bothPeriodsReliable, note };
}
