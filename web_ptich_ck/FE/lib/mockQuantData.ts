/* ------------------------------------------------------------------ */
/*  Mock data for Quantitative Analysis tab                           */
/* ------------------------------------------------------------------ */

/** Helper: generate dates from startDate for N trading days */
function tradingDates(startDate: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(startDate);
  while (dates.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/* ── KPI Metrics ──────────────────────────────────────────────────── */
export interface QuantKPI {
  cagr: number;
  sharpeRatio: number;
  maxDrawdown: number;
  annualizedVol: number;
  beta: number;
  riskFreeRate: number;
  alpha: number;
}

export const quantKPI: QuantKPI = {
  cagr: 12.5,
  sharpeRatio: 1.25,
  maxDrawdown: -22.4,
  annualizedVol: 18.2,
  beta: 0.85,
  riskFreeRate: 4.5,
  alpha: 4.5,
};

/* ── Wealth Index (Cumulative Return vs Benchmark) ────────────────── */
export interface WealthIndexPoint {
  date: string;
  stock: number;      // value of 100k invested in the stock
  benchmark: number;   // value of 100k invested in VN-INDEX
}

function generateWealthIndex(): WealthIndexPoint[] {
  const dates = tradingDates("2022-01-03", 750);
  const data: WealthIndexPoint[] = [];
  let stockVal = 100000;
  let benchVal = 100000;

  // seed for deterministic-looking values
  let s1 = 42, s2 = 137;
  const pseudoRand = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < dates.length; i++) {
    const r1 = (pseudoRand(s1++) - 0.48) * 0.025;  // slight positive drift for stock
    const r2 = (pseudoRand(s2++) - 0.485) * 0.018;  // slight positive drift for benchmark
    stockVal *= (1 + r1);
    benchVal *= (1 + r2);
    data.push({
      date: dates[i],
      stock: Math.round(stockVal),
      benchmark: Math.round(benchVal),
    });
  }
  return data;
}

export const wealthIndex: WealthIndexPoint[] = generateWealthIndex();

/* ── Monthly Returns Heatmap ──────────────────────────────────────── */
// Data: [monthIndex (0-11), yearIndex (0-N), value %]
export interface MonthlyReturn {
  year: number;
  month: number;     // 0-11
  value: number;     // percentage
}

function generateMonthlyReturns(): { data: MonthlyReturn[]; years: number[]; ytd: number[] } {
  const years = [2020, 2021, 2022, 2023, 2024];
  const data: MonthlyReturn[] = [];
  const ytd: number[] = [];

  let seed = 77;
  const pr = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  for (let yi = 0; yi < years.length; yi++) {
    let cumReturn = 0;
    for (let m = 0; m < 12; m++) {
      const val = parseFloat(((pr(seed++) - 0.45) * 14).toFixed(1));
      data.push({ year: years[yi], month: m, value: val });
      cumReturn += val;
    }
    ytd.push(parseFloat(cumReturn.toFixed(1)));
  }

  return { data, years, ytd };
}

export const monthlyReturns = generateMonthlyReturns();

/* ── Drawdown (Underwater Chart) ──────────────────────────────────── */
export interface DrawdownPoint {
  date: string;
  value: number;   // always <= 0
}

function generateDrawdown(): DrawdownPoint[] {
  const dates = tradingDates("2022-01-03", 750);
  const data: DrawdownPoint[] = [];
  let peak = 100000;
  let current = 100000;
  let seed = 42;
  const pr = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < dates.length; i++) {
    const r = (pr(seed++) - 0.48) * 0.025;
    current *= (1 + r);
    if (current > peak) peak = current;
    const dd = ((current - peak) / peak) * 100;
    data.push({ date: dates[i], value: parseFloat(dd.toFixed(2)) });
  }
  return data;
}

export const drawdownData: DrawdownPoint[] = generateDrawdown();

/* ── Rolling Volatility (30-day) ──────────────────────────────────── */
export interface RollingVolPoint {
  date: string;
  value: number;   // annualized %
}

function generateRollingVol(): { data: RollingVolPoint[]; average: number } {
  const dates = tradingDates("2022-02-15", 720);
  const data: RollingVolPoint[] = [];
  let seed = 200;
  const pr = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  let sum = 0;

  for (let i = 0; i < dates.length; i++) {
    const vol = 12 + pr(seed++) * 16; // range ~12-28%
    const v = parseFloat(vol.toFixed(1));
    data.push({ date: dates[i], value: v });
    sum += v;
  }

  return { data, average: parseFloat((sum / dates.length).toFixed(1)) };
}

export const rollingVol = generateRollingVol();

/* ── Distribution Histogram (Daily Returns) ───────────────────────── */
export interface HistogramBin {
  range: string;      // e.g. "-3% to -2%"
  rangeCenter: number; // center of bin
  count: number;
}

function generateHistogram(): { bins: HistogramBin[]; normalCurve: { x: number; y: number }[] } {
  const binEdges = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  const counts = [2, 5, 12, 28, 65, 110, 145, 120, 70, 30, 15, 6, 3];

  const bins: HistogramBin[] = [];
  for (let i = 0; i < binEdges.length; i++) {
    const lo = binEdges[i];
    const hi = i < binEdges.length - 1 ? binEdges[i + 1] : lo + 1;
    bins.push({
      range: `${lo}% ~ ${hi}%`,
      rangeCenter: (lo + (hi || lo + 1)) / 2,
      count: counts[i],
    });
  }

  // Normal distribution fit
  const mean = 0.05;
  const std = 1.8;
  const total = counts.reduce((a, b) => a + b, 0);
  const normalCurve: { x: number; y: number }[] = [];
  for (let x = -6; x <= 6; x += 0.25) {
    const y = (total / (std * Math.sqrt(2 * Math.PI))) *
              Math.exp(-0.5 * ((x - mean) / std) ** 2);
    normalCurve.push({ x, y: parseFloat(y.toFixed(1)) });
  }

  return { bins, normalCurve };
}

export const histogram = generateHistogram();

/* ── Scatter Plot (Stock vs Benchmark) ────────────────────────────── */
export interface ScatterPoint {
  benchmarkReturn: number;
  stockReturn: number;
}

function generateScatter(): {
  points: ScatterPoint[];
  regressionLine: { x1: number; y1: number; x2: number; y2: number };
} {
  const points: ScatterPoint[] = [];
  let seed = 350;
  const pr = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 300; i++) {
    const bm = (pr(seed++) - 0.5) * 6;   // benchmark return -3% to +3%
    const noise = (pr(seed++) - 0.5) * 3;
    const stock = 0.85 * bm + 0.02 + noise;  // beta=0.85, alpha offset
    points.push({
      benchmarkReturn: parseFloat(bm.toFixed(2)),
      stockReturn: parseFloat(stock.toFixed(2)),
    });
  }

  // Regression line from β = 0.85, α ≈ 0.02
  const x1 = -4, x2 = 4;
  const y1 = 0.85 * x1 + 0.02;
  const y2 = 0.85 * x2 + 0.02;

  return {
    points,
    regressionLine: {
      x1, y1: parseFloat(y1.toFixed(2)),
      x2, y2: parseFloat(y2.toFixed(2)),
    },
  };
}

export const scatterData = generateScatter();

/* ── Rolling Sharpe Ratio (90-day) ────────────────────────────────── */
export interface RollingSharpePoint {
  date: string;
  value: number;
}

function generateRollingSharpe(): { data: RollingSharpePoint[]; average: number } {
  const dates = tradingDates("2022-04-01", 680);
  const data: RollingSharpePoint[] = [];
  let seed = 500;
  const pr = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
  let sum = 0;
  for (let i = 0; i < dates.length; i++) {
    const v = parseFloat((-0.5 + pr(seed++) * 3).toFixed(2)); // range -0.5 to 2.5
    data.push({ date: dates[i], value: v });
    sum += v;
  }
  return { data, average: parseFloat((sum / dates.length).toFixed(2)) };
}

export const rollingSharpe = generateRollingSharpe();

/* ── Yearly Returns Bar ───────────────────────────────────────────── */
export interface YearlyReturn {
  year: string;
  stock: number;
  benchmark: number;
}

export const yearlyReturns: YearlyReturn[] = [
  { year: "2020", stock: 18.2, benchmark: 14.5 },
  { year: "2021", stock: 32.1, benchmark: 35.7 },
  { year: "2022", stock: -15.3, benchmark: -32.8 },
  { year: "2023", stock: 8.7, benchmark: 12.2 },
  { year: "2024", stock: 22.4, benchmark: 10.1 },
];

/* ── Value at Risk (VaR) data ─────────────────────────────────────── */
export interface VaRData {
  var95: number;   // 95% confidence
  var99: number;   // 99% confidence
  cvar95: number;  // conditional VaR
  dailyVol: number;
  worstDay: number;
  bestDay: number;
}

export const varData: VaRData = {
  var95: -2.8,
  var99: -4.1,
  cvar95: -3.6,
  dailyVol: 1.72,
  worstDay: -6.8,
  bestDay: 7.2,
};

/* ── Risk-Reward Radar ────────────────────────────────────────────── */
export interface RadarMetric {
  name: string;
  stock: number;      // 0-100 normalized
  benchmark: number;  // 0-100 normalized
}

export const radarMetrics: RadarMetric[] = [
  { name: "Lợi nhuận", stock: 75, benchmark: 60 },
  { name: "Ổn định", stock: 65, benchmark: 50 },
  { name: "Sharpe", stock: 70, benchmark: 55 },
  { name: "Drawdown\nthấp", stock: 55, benchmark: 35 },
  { name: "Thanh\nkhoản", stock: 80, benchmark: 90 },
  { name: "Momentum", stock: 68, benchmark: 58 },
];

/* ── Rolling Return Periods ───────────────────────────────────────── */
export interface RollingReturnPeriod {
  period: string;
  min: number;
  avg: number;
  max: number;
  pctPositive: number;  // % of rolling windows with positive return
}

export const rollingReturnPeriods: RollingReturnPeriod[] = [
  { period: "1 tháng", min: -12.3, avg: 1.1, max: 15.2, pctPositive: 56 },
  { period: "3 tháng", min: -18.5, avg: 3.2, max: 22.1, pctPositive: 61 },
  { period: "6 tháng", min: -22.4, avg: 6.1, max: 28.7, pctPositive: 65 },
  { period: "1 năm", min: -15.3, avg: 12.5, max: 42.3, pctPositive: 72 },
  { period: "2 năm", min: -5.2, avg: 22.8, max: 55.1, pctPositive: 82 },
  { period: "3 năm", min: 2.1, avg: 38.4, max: 68.2, pctPositive: 95 },
];

/* ── Monte Carlo Simulation ───────────────────────────────────────── */
export interface MonteCarloStats {
  currentPrice: number;
  median: number;
  top5: number;
  bottom5: number;
  winRate: number;        // % paths ending above currentPrice
  expectedReturn: number; // % median return
}

export interface MonteCarloParams {
  numSims?: number;          // default 1000
  displayPaths?: number;     // default 50
  days?: number;             // trading days to simulate (default 253)
  startPrice?: number;       // S0 (default 85000)
  annualReturn?: number;     // expected annual return % (default 10)
  annualVol?: number;        // annual volatility % (default 28.5)
  seed?: number;             // random seed (default 9999)
}

export interface MonteCarloResult {
  paths: number[][];
  percentile95: number[];
  percentile50: number[];
  percentile5: number[];
  stats: MonteCarloStats;
}

export function generateMonteCarlo(params?: MonteCarloParams): MonteCarloResult {
  const SIMS = params?.numSims ?? 1000;
  const DISPLAY_PATHS = Math.min(params?.displayPaths ?? 50, SIMS);
  const DAYS = (params?.days ?? 253);
  const S0 = params?.startPrice ?? 85000;
  const annualRet = (params?.annualReturn ?? 10) / 100;
  const annualVolPct = (params?.annualVol ?? 28.5) / 100;

  // Convert annual params to daily using √252
  const mu = annualRet / 252;
  const sigma = annualVolPct / Math.sqrt(252);

  // Seeded pseudo-random (Box-Muller via sin-based PRNG)
  let seedVal = params?.seed ?? 9999;
  const pr = () => { seedVal++; const x = Math.sin(seedVal) * 10000; return x - Math.floor(x); };
  const randNormal = () => {
    const u1 = Math.max(pr(), 1e-10);
    const u2 = pr();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const allFinals: number[] = [];
  const displayPathsArr: number[][] = [];
  const dayValues: number[][] = Array.from({ length: DAYS }, () => []);

  for (let sim = 0; sim < SIMS; sim++) {
    const path: number[] = [S0];
    let price = S0;
    for (let d = 1; d < DAYS; d++) {
      const z = randNormal();
      price = price * Math.exp((mu - 0.5 * sigma * sigma) + sigma * z);
      path.push(Math.round(price));
      dayValues[d].push(price);
    }
    dayValues[0].push(S0);
    allFinals.push(price);
    if (sim < DISPLAY_PATHS) {
      displayPathsArr.push(path);
    }
  }

  const pctl = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(p * sorted.length);
    return Math.round(sorted[Math.min(idx, sorted.length - 1)]);
  };

  const percentile5: number[] = [];
  const percentile50: number[] = [];
  const percentile95: number[] = [];

  for (let d = 0; d < DAYS; d++) {
    const vals = dayValues[d];
    if (vals.length === 0) { percentile5.push(S0); percentile50.push(S0); percentile95.push(S0); continue; }
    percentile5.push(pctl(vals, 0.05));
    percentile50.push(pctl(vals, 0.50));
    percentile95.push(pctl(vals, 0.95));
  }

  const sortedFinals = [...allFinals].sort((a, b) => a - b);
  const medianFinal = Math.round(sortedFinals[Math.floor(0.5 * SIMS)]);
  const top5Final = Math.round(sortedFinals[Math.floor(0.95 * SIMS)]);
  const bottom5Final = Math.round(sortedFinals[Math.floor(0.05 * SIMS)]);
  const winCount = allFinals.filter((p) => p > S0).length;

  return {
    paths: displayPathsArr,
    percentile95,
    percentile50,
    percentile5,
    stats: {
      currentPrice: S0,
      median: medianFinal,
      top5: top5Final,
      bottom5: bottom5Final,
      winRate: parseFloat(((winCount / SIMS) * 100).toFixed(1)),
      expectedReturn: parseFloat(((medianFinal / S0 - 1) * 100).toFixed(1)),
    },
  };
}

// Default pre-computed result (backward compatible)
export const monteCarlo = generateMonteCarlo();

/* ── Monte Carlo DCF Valuation ────────────────────────────────────── */
export interface ValuationParams {
  currentEPS: number;       // EPS hiện tại (VND)
  growthRate: number;       // tăng trưởng trung bình EPS (%/year)
  growthVol: number;        // biến động tăng trưởng (%/year)
  discountRate: number;     // tỷ lệ chiết khấu (%/year)
  terminalGrowth: number;   // tốc độ tăng trưởng dài hạn (%/year)
  years: number;            // số năm dự phóng
  numSims: number;          // số kịch bản
}

export interface ValuationResult {
  fairValues: number[];       // all simulated fair values (for histogram)
  median: number;
  mean: number;
  percentile10: number;
  percentile90: number;
  currentPrice: number;
  upside: number;             // % upside from currentPrice to median
  pctUndervalued: number;     // % of sims where fair value > currentPrice
}

export function generateValuation(params: ValuationParams, currentPrice: number): ValuationResult {
  const { currentEPS, growthRate, growthVol, discountRate, terminalGrowth, years, numSims } = params;
  const gMean = growthRate / 100;
  const gStd = growthVol / 100;
  const r = discountRate / 100;
  const gTerminal = terminalGrowth / 100;

  let seedVal = 7777;
  const pr = () => { seedVal++; const x = Math.sin(seedVal) * 10000; return x - Math.floor(x); };
  const randNormal = () => {
    const u1 = Math.max(pr(), 1e-10);
    const u2 = pr();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const fairValues: number[] = [];

  for (let sim = 0; sim < numSims; sim++) {
    let eps = currentEPS;
    let pvCashflows = 0;

    // Project earnings for N years
    for (let y = 1; y <= years; y++) {
      const g = gMean + gStd * randNormal();
      eps = eps * (1 + g);
      pvCashflows += eps / Math.pow(1 + r, y);
    }

    // Terminal value (Gordon Growth Model)
    const terminalEPS = eps * (1 + gTerminal);
    const terminalValue = terminalEPS / (r - gTerminal);
    const pvTerminal = terminalValue / Math.pow(1 + r, years);

    const fv = Math.max(pvCashflows + pvTerminal, 0);
    fairValues.push(Math.round(fv));
  }

  const sorted = [...fairValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(0.5 * numSims)];
  const mean = Math.round(fairValues.reduce((a, b) => a + b, 0) / numSims);
  const p10 = sorted[Math.floor(0.1 * numSims)];
  const p90 = sorted[Math.floor(0.9 * numSims)];
  const pctUnder = fairValues.filter((v) => v > currentPrice).length / numSims * 100;

  return {
    fairValues,
    median,
    mean,
    percentile10: p10,
    percentile90: p90,
    currentPrice,
    upside: parseFloat(((median / currentPrice - 1) * 100).toFixed(1)),
    pctUndervalued: parseFloat(pctUnder.toFixed(1)),
  };
}
