// Technical Analysis Mock Data
// Generates realistic OHLCV data with technical indicators

export interface OHLCVItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  sma20: (number | null)[];
  sma50: (number | null)[];
  sma100: (number | null)[];
  sma200: (number | null)[];
  ema12: (number | null)[];
  ema26: (number | null)[];
  bollingerUpper: (number | null)[];
  bollingerMiddle: (number | null)[];
  bollingerLower: (number | null)[];
  rsi: (number | null)[];
  macdLine: (number | null)[];
  macdSignal: (number | null)[];
  macdHistogram: (number | null)[];
  stochK: (number | null)[];
  stochD: (number | null)[];
  atr: (number | null)[];
  obv: (number | null)[];
  williamsR: (number | null)[];
  cci: (number | null)[];
  adx: (number | null)[];
  vwap: (number | null)[];
  ichimokuTenkan: (number | null)[];
  ichimokuKijun: (number | null)[];
  ichimokuSenkouA: (number | null)[];
  ichimokuSenkouB: (number | null)[];
  psar: (number | null)[];
  keltnerUpper: (number | null)[];
  keltnerLower: (number | null)[];
  mfi: (number | null)[];
}

export interface TechnicalSignal {
  indicator: string;
  value: string;
  signal: 'Mua' | 'Bán' | 'Trung lập';
  strength: 'Mạnh' | 'Trung bình' | 'Yếu';
}

export interface AnalysisSummaryData {
  overallSignal: 'Mua mạnh' | 'Mua' | 'Trung lập' | 'Bán' | 'Bán mạnh';
  /** Weighted score from -100 (Bán mạnh) to +100 (Mua mạnh) */
  scorePercent: number;
  buyCount: number;
  sellCount: number;
  neutralCount: number;
  movingAverages: TechnicalSignal[];
  oscillators: TechnicalSignal[];
  pivotPoints: {
    type: string;
    s3: number;
    s2: number;
    s1: number;
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
  }[];
}

export interface StockAnalysisData {
  ticker: string;
  companyName: string;
  exchange: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  ohlcv: OHLCVItem[];
  indicators: IndicatorData;
  signals: TechnicalSignal[];
  summary: AnalysisSummaryData;
}

// ===== Helper Functions =====

function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(Math.round((sum / period) * 100) / 100);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(Math.round((sum / period) * 100) / 100);
    } else {
      const prev = result[i - 1]!;
      const ema = (data[i] - prev) * multiplier + prev;
      result.push(Math.round(ema * 100) / 100);
    }
  }
  return result;
}

function calculateRSI(data: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }

    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      result.push(null);
    } else if (i === period) {
      avgGain = (avgGain + gain) / period;
      avgLoss = (avgLoss + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
    }
  }
  return result;
}

function calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2) {
  const middle = calculateSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(Math.round((mean + stdDev * std) * 100) / 100);
      lower.push(Math.round((mean - stdDev * std) * 100) / 100);
    }
  }
  return { upper, middle, lower };
}

function calculateMACD(data: number[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (ema12[i] === null || ema26[i] === null) {
      macdLine.push(null);
    } else {
      macdLine.push(Math.round((ema12[i]! - ema26[i]!) * 100) / 100);
    }
  }

  const validMACD = macdLine.filter((v) => v !== null) as number[];
  const signalRaw = calculateEMA(validMACD, 9);
  const macdSignal: (number | null)[] = [];
  const macdHistogram: (number | null)[] = [];
  let signalIdx = 0;

  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] === null) {
      macdSignal.push(null);
      macdHistogram.push(null);
    } else {
      const sig = signalRaw[signalIdx] ?? null;
      macdSignal.push(sig);
      macdHistogram.push(sig !== null ? Math.round((macdLine[i]! - sig) * 100) / 100 : null);
      signalIdx++;
    }
  }

  return { macdLine, macdSignal, macdHistogram };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3) {
  const stochK: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      stochK.push(null);
    } else {
      const highSlice = highs.slice(i - kPeriod + 1, i + 1);
      const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);
      const k = highestHigh === lowestLow ? 50 : ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      stochK.push(Math.round(k * 100) / 100);
    }
  }

  const validK = stochK.filter((v) => v !== null) as number[];
  const dRaw = calculateSMA(validK, dPeriod);
  const stochD: (number | null)[] = [];
  let dIdx = 0;

  for (let i = 0; i < closes.length; i++) {
    if (stochK[i] === null) {
      stochD.push(null);
    } else {
      stochD.push(dRaw[dIdx] ?? null);
      dIdx++;
    }
  }

  return { stochK, stochD };
}

function calculatePSAR(highs: number[], lows: number[], afStart = 0.02, afMax = 0.2, afStep = 0.02) {
  const psar: (number | null)[] = [null];
  if (highs.length < 2) return psar;

  let isLong = highs[1] > highs[0];
  let ep = isLong ? Math.max(highs[0], highs[1]) : Math.min(lows[0], lows[1]);
  let sar = isLong ? Math.min(lows[0], lows[1]) : Math.max(highs[0], highs[1]);
  let af = afStart;

  for (let i = 1; i < highs.length; i++) {
    psar.push(Math.round(sar * 100) / 100);
    const prevSar = sar;
    sar = sar + af * (ep - sar);

    if (isLong) {
      if (lows[i] < sar) {
        isLong = false;
        sar = ep;
        ep = lows[i];
        af = afStart;
      } else {
        if (highs[i] > ep) {
          ep = highs[i];
          af = Math.min(afMax, af + afStep);
        }
        sar = Math.min(sar, lows[i - 1], i > 1 ? lows[i - 2] : lows[i - 1]);
      }
    } else {
      if (highs[i] > sar) {
        isLong = true;
        sar = ep;
        ep = highs[i];
        af = afStart;
      } else {
        if (lows[i] < ep) {
          ep = lows[i];
          af = Math.min(afMax, af + afStep);
        }
        sar = Math.max(sar, highs[i - 1], i > 1 ? highs[i - 2] : highs[i - 1]);
      }
    }
  }
  return psar;
}

function calculateMFI(highs: number[], lows: number[], closes: number[], volumes: number[], period = 14) {
  const mfi: (number | null)[] = [];
  const typicalPrice = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const moneyFlow = typicalPrice.map((tp, i) => tp * volumes[i]);

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      mfi.push(null);
    } else {
      let posFlow = 0;
      let negFlow = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (typicalPrice[j] > typicalPrice[j - 1]) posFlow += moneyFlow[j];
        else if (typicalPrice[j] < typicalPrice[j - 1]) negFlow += moneyFlow[j];
      }
      if (negFlow === 0) {
        mfi.push(100);
      } else {
        const mfr = posFlow / negFlow;
        mfi.push(Math.round((100 - (100 / (1 + mfr))) * 100) / 100);
      }
    }
  }
  return mfi;
}

// ===== Generate OHLCV Data =====

function generateOHLCV(ticker: string, days: number = 365): OHLCVItem[] {
  const data: OHLCVItem[] = [];
  const baseDate = new Date('2025-02-18');
  
  const seedMap: Record<string, { basePrice: number; volatility: number; baseVol: number }> = {
    VIC: { basePrice: 42000, volatility: 0.025, baseVol: 5000000 },
    VNM: { basePrice: 72000, volatility: 0.018, baseVol: 3000000 },
    VHM: { basePrice: 38000, volatility: 0.028, baseVol: 8000000 },
    HPG: { basePrice: 25000, volatility: 0.03, baseVol: 15000000 },
    FPT: { basePrice: 135000, volatility: 0.022, baseVol: 4000000 },
    MSN: { basePrice: 67000, volatility: 0.02, baseVol: 2500000 },
    MWG: { basePrice: 55000, volatility: 0.025, baseVol: 3500000 },
    TCB: { basePrice: 24000, volatility: 0.022, baseVol: 7000000 },
    VCB: { basePrice: 88000, volatility: 0.015, baseVol: 3000000 },
    SSI: { basePrice: 28000, volatility: 0.03, baseVol: 6000000 },
  };

  const seed = seedMap[ticker.toUpperCase()] || { basePrice: 50000, volatility: 0.025, baseVol: 4000000 };
  let price = seed.basePrice;

  // Simple seeded random
  let rng = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const random = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  for (let i = days; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = (random() - 0.48) * seed.volatility * price;
    const open = Math.round(price / 100) * 100;
    price = price + change;
    price = Math.max(price * 0.3, price); // prevent negative
    const close = Math.round(price / 100) * 100;
    const high = Math.round((Math.max(open, close) + random() * seed.volatility * price * 0.5) / 100) * 100;
    const low = Math.round((Math.min(open, close) - random() * seed.volatility * price * 0.5) / 100) * 100;
    const volume = Math.round(seed.baseVol * (0.5 + random() * 1.5));

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high: Math.max(high, Math.max(open, close)),
      low: Math.min(low, Math.min(open, close)),
      close,
      volume,
    });
  }

  return data;
}

// ===== Calculate All Indicators =====

export function calculateIndicators(ohlcv: OHLCVItem[]): IndicatorData {
  const closes = ohlcv.map((d) => d.close);
  const highs = ohlcv.map((d) => d.high);
  const lows = ohlcv.map((d) => d.low);
  const volumes = ohlcv.map((d) => d.volume);

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma100 = calculateSMA(closes, 100);
  const sma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const bollinger = calculateBollingerBands(closes, 20, 2);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const stoch = calculateStochastic(highs, lows, closes, 14, 3);

  // VWAP — cumulative (typical price × volume) / cumulative volume
  const vwap: (number | null)[] = [];
  let cumTPV = 0;
  let cumVol = 0;
  for (let i = 0; i < ohlcv.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumTPV += tp * volumes[i];
    cumVol += volumes[i];
    vwap.push(cumVol === 0 ? null : Math.round((cumTPV / cumVol) * 100) / 100);
  }

  // ATR (simplified)
  const atr: (number | null)[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 14) {
      atr.push(null);
    } else {
      const slice = ohlcv.slice(i - 13, i + 1);
      const trValues = slice.map((d, j) => {
        if (j === 0) return d.high - d.low;
        const prev = slice[j - 1];
        return Math.max(d.high - d.low, Math.abs(d.high - prev.close), Math.abs(d.low - prev.close));
      });
      atr.push(Math.round((trValues.reduce((a, b) => a + b, 0) / 14) * 100) / 100);
    }
  }

  // OBV
  const obv: (number | null)[] = [0];
  for (let i = 1; i < ohlcv.length; i++) {
    const prev = obv[i - 1]!;
    if (closes[i] > closes[i - 1]) obv.push(prev + volumes[i]);
    else if (closes[i] < closes[i - 1]) obv.push(prev - volumes[i]);
    else obv.push(prev);
  }

  // Williams %R
  const williamsR: (number | null)[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 13) {
      williamsR.push(null);
    } else {
      const hSlice = highs.slice(i - 13, i + 1);
      const lSlice = lows.slice(i - 13, i + 1);
      const hh = Math.max(...hSlice);
      const ll = Math.min(...lSlice);
      const wr = hh === ll ? -50 : ((hh - closes[i]) / (hh - ll)) * -100;
      williamsR.push(Math.round(wr * 100) / 100);
    }
  }

  // CCI (simplified)
  const cci: (number | null)[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 19) {
      cci.push(null);
    } else {
      const tpSlice: number[] = [];
      for (let j = i - 19; j <= i; j++) {
        tpSlice.push((highs[j] + lows[j] + closes[j]) / 3);
      }
      const mean = tpSlice.reduce((a, b) => a + b, 0) / 20;
      const meanDev = tpSlice.reduce((sum, val) => sum + Math.abs(val - mean), 0) / 20;
      const tp = (highs[i] + lows[i] + closes[i]) / 3;
      const cciVal = meanDev === 0 ? 0 : (tp - mean) / (0.015 * meanDev);
      cci.push(Math.round(cciVal * 100) / 100);
    }
  }

  // ADX (Wilder's smoothing, period=14)
  const adxPeriod = 14;
  const adx: (number | null)[] = [];
  const plusDMs: number[] = [0];
  const minusDMs: number[] = [0];
  const trVals: number[] = [ohlcv[0] ? ohlcv[0].high - ohlcv[0].low : 0];

  for (let i = 1; i < ohlcv.length; i++) {
    const upMove = ohlcv[i].high - ohlcv[i - 1].high;
    const downMove = ohlcv[i - 1].low - ohlcv[i].low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trVals.push(
      Math.max(
        ohlcv[i].high - ohlcv[i].low,
        Math.abs(ohlcv[i].high - ohlcv[i - 1].close),
        Math.abs(ohlcv[i].low - ohlcv[i - 1].close)
      )
    );
  }

  let smPlusDM = 0,
    smMinusDM = 0,
    smTR = 0;
  const dxArr: number[] = [];
  let prevADX = 0;

  for (let i = 0; i < ohlcv.length; i++) {
    if (i < adxPeriod) {
      smPlusDM += plusDMs[i];
      smMinusDM += minusDMs[i];
      smTR += trVals[i];
      adx.push(null);
    } else if (i === adxPeriod) {
      smPlusDM += plusDMs[i];
      smMinusDM += minusDMs[i];
      smTR += trVals[i];
      // First smoothed values = sum of first (period+1)
      // Then Wilder smooth from next bar onwards
      const diP = smTR === 0 ? 0 : (smPlusDM / smTR) * 100;
      const diM = smTR === 0 ? 0 : (smMinusDM / smTR) * 100;
      const diSum = diP + diM;
      dxArr.push(diSum === 0 ? 0 : (Math.abs(diP - diM) / diSum) * 100);
      adx.push(null);
    } else {
      smPlusDM = smPlusDM - smPlusDM / adxPeriod + plusDMs[i];
      smMinusDM = smMinusDM - smMinusDM / adxPeriod + minusDMs[i];
      smTR = smTR - smTR / adxPeriod + trVals[i];
      const diP = smTR === 0 ? 0 : (smPlusDM / smTR) * 100;
      const diM = smTR === 0 ? 0 : (smMinusDM / smTR) * 100;
      const diSum = diP + diM;
      dxArr.push(diSum === 0 ? 0 : (Math.abs(diP - diM) / diSum) * 100);

      if (dxArr.length < adxPeriod) {
        adx.push(null);
      } else if (dxArr.length === adxPeriod) {
        prevADX = dxArr.reduce((s, v) => s + v, 0) / adxPeriod;
        adx.push(Math.round(prevADX * 100) / 100);
      } else {
        prevADX = (prevADX * (adxPeriod - 1) + dxArr[dxArr.length - 1]) / adxPeriod;
        adx.push(Math.round(prevADX * 100) / 100);
      }
    }
  }

  // Ichimoku (simplified)
  const ichimokuTenkan: (number | null)[] = [];
  const ichimokuKijun: (number | null)[] = [];
  const ichimokuSenkouA: (number | null)[] = [];
  const ichimokuSenkouB: (number | null)[] = [];

  const psar = calculatePSAR(highs, lows);
  const mfi = calculateMFI(highs, lows, closes, volumes, 14);
  const keltnerMiddle = calculateEMA(closes, 20);
  const keltnerUpper: (number | null)[] = [];
  const keltnerLower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (keltnerMiddle[i] === null || atr[i] === null) {
      keltnerUpper.push(null);
      keltnerLower.push(null);
    } else {
      keltnerUpper.push(Math.round((keltnerMiddle[i]! + 2 * atr[i]!) * 100) / 100);
      keltnerLower.push(Math.round((keltnerMiddle[i]! - 2 * atr[i]!) * 100) / 100);
    }
  }
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 8) {
      ichimokuTenkan.push(null);
    } else {
      const hSlice = highs.slice(i - 8, i + 1);
      const lSlice = lows.slice(i - 8, i + 1);
      ichimokuTenkan.push(Math.round(((Math.max(...hSlice) + Math.min(...lSlice)) / 2) * 100) / 100);
    }
    if (i < 25) {
      ichimokuKijun.push(null);
      ichimokuSenkouA.push(null);
    } else {
      const hSlice = highs.slice(i - 25, i + 1);
      const lSlice = lows.slice(i - 25, i + 1);
      ichimokuKijun.push(Math.round(((Math.max(...hSlice) + Math.min(...lSlice)) / 2) * 100) / 100);
      if (ichimokuTenkan[i] !== null) {
        ichimokuSenkouA.push(Math.round(((ichimokuTenkan[i]! + ichimokuKijun[i]!) / 2) * 100) / 100);
      } else {
        ichimokuSenkouA.push(null);
      }
    }
    if (i < 51) {
      ichimokuSenkouB.push(null);
    } else {
      const hSlice = highs.slice(i - 51, i + 1);
      const lSlice = lows.slice(i - 51, i + 1);
      ichimokuSenkouB.push(Math.round(((Math.max(...hSlice) + Math.min(...lSlice)) / 2) * 100) / 100);
    }
  }

  return {
    sma20,
    sma50,
    sma100,
    sma200,
    ema12,
    ema26,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    rsi,
    macdLine: macd.macdLine,
    macdSignal: macd.macdSignal,
    macdHistogram: macd.macdHistogram,
    stochK: stoch.stochK,
    stochD: stoch.stochD,
    atr,
    obv,
    williamsR,
    cci,
    adx,
    vwap,
    ichimokuTenkan,
    ichimokuKijun,
    ichimokuSenkouA,
    ichimokuSenkouB,
    psar,
    mfi,
    keltnerUpper,
    keltnerLower,
  };
}

// ===== Generate Signals =====

/** Helper: safe value at index, or null */
function _v(arr: (number | null)[], idx: number): number | null {
  return idx >= 0 && idx < arr.length ? arr[idx] : null;
}

export function generateSignals(ohlcv: OHLCVItem[], indicators: IndicatorData): TechnicalSignal[] {
  const lastIdx = ohlcv.length - 1;
  const price = ohlcv[lastIdx].close;
  const prevPrice = lastIdx > 0 ? ohlcv[lastIdx - 1].close : price;
  const signals: TechnicalSignal[] = [];

  // ----- MOVING AVERAGE SIGNALS -----

  // SMA 20 — short-term trend
  const sma20Val = _v(indicators.sma20, lastIdx);
  if (sma20Val !== null) {
    signals.push({
      indicator: 'SMA (20)',
      value: sma20Val.toLocaleString(),
      signal: price > sma20Val ? 'Mua' : 'Bán',
      strength: Math.abs(price - sma20Val) / price > 0.03 ? 'Mạnh' : 'Trung bình',
    });
  }

  // SMA 50 — medium-term trend
  const sma50Val = _v(indicators.sma50, lastIdx);
  if (sma50Val !== null) {
    signals.push({
      indicator: 'SMA (50)',
      value: sma50Val.toLocaleString(),
      signal: price > sma50Val ? 'Mua' : 'Bán',
      strength: Math.abs(price - sma50Val) / price > 0.05 ? 'Mạnh' : 'Trung bình',
    });
  }

  // SMA 100 — intermediate trend
  const sma100Val = _v(indicators.sma100, lastIdx);
  if (sma100Val !== null) {
    signals.push({
      indicator: 'SMA (100)',
      value: sma100Val.toLocaleString(),
      signal: price > sma100Val ? 'Mua' : 'Bán',
      strength: Math.abs(price - sma100Val) / price > 0.08 ? 'Mạnh' : 'Trung bình',
    });
  }

  // SMA 200 — long-term trend
  const sma200Val = _v(indicators.sma200, lastIdx);
  if (sma200Val !== null) {
    signals.push({
      indicator: 'SMA (200)',
      value: sma200Val.toLocaleString(),
      signal: price > sma200Val ? 'Mua' : 'Bán',
      strength: Math.abs(price - sma200Val) / price > 0.10 ? 'Mạnh' : 'Trung bình',
    });
  }

  // Golden Cross / Death Cross (SMA 50 vs SMA 200)
  const sma50Prev = _v(indicators.sma50, lastIdx - 1);
  const sma200Prev = _v(indicators.sma200, lastIdx - 1);
  if (sma50Val !== null && sma200Val !== null && sma50Prev !== null && sma200Prev !== null) {
    const crossUp = sma50Prev <= sma200Prev && sma50Val > sma200Val;
    const crossDown = sma50Prev >= sma200Prev && sma50Val < sma200Val;
    if (crossUp) {
      signals.push({
        indicator: 'Golden Cross (50/200)',
        value: `${sma50Val.toLocaleString()} > ${sma200Val.toLocaleString()}`,
        signal: 'Mua',
        strength: 'Mạnh',
      });
    } else if (crossDown) {
      signals.push({
        indicator: 'Death Cross (50/200)',
        value: `${sma50Val.toLocaleString()} < ${sma200Val.toLocaleString()}`,
        signal: 'Bán',
        strength: 'Mạnh',
      });
    } else {
      signals.push({
        indicator: 'SMA Cross (50/200)',
        value: sma50Val > sma200Val ? 'SMA50 > SMA200' : 'SMA50 < SMA200',
        signal: sma50Val > sma200Val ? 'Mua' : 'Bán',
        strength: 'Trung bình',
      });
    }
  }

  // EMA 12
  const ema12Val = _v(indicators.ema12, lastIdx);
  if (ema12Val !== null) {
    signals.push({
      indicator: 'EMA (12)',
      value: ema12Val.toLocaleString(),
      signal: price > ema12Val ? 'Mua' : 'Bán',
      strength: Math.abs(price - ema12Val) / price > 0.02 ? 'Mạnh' : 'Trung bình',
    });
  }

  // EMA 26
  const ema26Val = _v(indicators.ema26, lastIdx);
  if (ema26Val !== null) {
    signals.push({
      indicator: 'EMA (26)',
      value: ema26Val.toLocaleString(),
      signal: price > ema26Val ? 'Mua' : 'Bán',
      strength: Math.abs(price - ema26Val) / price > 0.03 ? 'Mạnh' : 'Trung bình',
    });
  }

  // EMA Crossover (12 vs 26)
  const ema12Prev = _v(indicators.ema12, lastIdx - 1);
  const ema26Prev = _v(indicators.ema26, lastIdx - 1);
  if (ema12Val !== null && ema26Val !== null && ema12Prev !== null && ema26Prev !== null) {
    const bullishCross = ema12Prev <= ema26Prev && ema12Val > ema26Val;
    const bearishCross = ema12Prev >= ema26Prev && ema12Val < ema26Val;
    if (bullishCross || bearishCross) {
      signals.push({
        indicator: 'EMA Cross (12/26)',
        value: bullishCross ? 'EMA12 cắt lên EMA26' : 'EMA12 cắt xuống EMA26',
        signal: bullishCross ? 'Mua' : 'Bán',
        strength: 'Mạnh',
      });
    }
  }

  // VWAP — Volume Weighted Average Price
  const vwapVal = _v(indicators.vwap, lastIdx);
  if (vwapVal !== null) {
    const deviation = (price - vwapVal) / vwapVal;
    signals.push({
      indicator: 'VWAP',
      value: vwapVal.toLocaleString(),
      signal: price > vwapVal ? 'Mua' : price < vwapVal ? 'Bán' : 'Trung lập',
      strength: Math.abs(deviation) > 0.05 ? 'Mạnh' : 'Trung bình',
    });
  }

  // Ichimoku Cloud signal
  const tenkan = _v(indicators.ichimokuTenkan, lastIdx);
  const kijun = _v(indicators.ichimokuKijun, lastIdx);
  const senkouA = _v(indicators.ichimokuSenkouA, lastIdx);
  const senkouB = _v(indicators.ichimokuSenkouB, lastIdx);
  if (tenkan !== null && kijun !== null && senkouA !== null && senkouB !== null) {
    const cloudTop = Math.max(senkouA, senkouB);
    const cloudBottom = Math.min(senkouA, senkouB);
    let ichSignal: 'Mua' | 'Bán' | 'Trung lập' = 'Trung lập';
    let ichStrength: 'Mạnh' | 'Trung bình' | 'Yếu' = 'Yếu';
    if (price > cloudTop && tenkan > kijun) {
      ichSignal = 'Mua';
      ichStrength = price > cloudTop * 1.02 ? 'Mạnh' : 'Trung bình';
    } else if (price < cloudBottom && tenkan < kijun) {
      ichSignal = 'Bán';
      ichStrength = price < cloudBottom * 0.98 ? 'Mạnh' : 'Trung bình';
    } else if (price > cloudTop || price < cloudBottom) {
      ichSignal = price > cloudTop ? 'Mua' : 'Bán';
      ichStrength = 'Yếu';
    }
    signals.push({
      indicator: 'Ichimoku Cloud',
      value: `${cloudBottom.toLocaleString()} - ${cloudTop.toLocaleString()}`,
      signal: ichSignal,
      strength: ichStrength,
    });
  }

  // ----- TECHNICAL INDICATOR SIGNALS -----

  // RSI
  const rsiVal = _v(indicators.rsi, lastIdx);
  if (rsiVal !== null) {
    signals.push({
      indicator: 'RSI (14)',
      value: rsiVal.toFixed(2),
      signal: rsiVal < 30 ? 'Mua' : rsiVal > 70 ? 'Bán' : 'Trung lập',
      strength: rsiVal < 20 || rsiVal > 80 ? 'Mạnh' : rsiVal < 30 || rsiVal > 70 ? 'Trung bình' : 'Yếu',
    });
  }

  // RSI Divergence — price makes new low but RSI makes higher low (bullish) or vice versa
  if (rsiVal !== null && lastIdx >= 20) {
    const lookback = Math.min(20, lastIdx);
    const recentPrices = ohlcv.slice(lastIdx - lookback, lastIdx + 1).map(d => d.close);
    const recentRSI = indicators.rsi.slice(lastIdx - lookback, lastIdx + 1).filter(v => v !== null) as number[];
    if (recentRSI.length >= 10) {
      const priceMin = Math.min(...recentPrices);
      const rsiMin = Math.min(...recentRSI);
      const priceMax = Math.max(...recentPrices);
      const rsiMax = Math.max(...recentRSI);
      // Bullish divergence: price near recent low but RSI higher than its recent low
      if (price <= priceMin * 1.01 && rsiVal > rsiMin * 1.05 && rsiVal < 40) {
        signals.push({
          indicator: 'RSI Phân kỳ tăng',
          value: `RSI ${rsiVal.toFixed(1)} (đáy RSI trước: ${rsiMin.toFixed(1)})`,
          signal: 'Mua',
          strength: 'Mạnh',
        });
      }
      // Bearish divergence: price near recent high but RSI lower than its recent high
      if (price >= priceMax * 0.99 && rsiVal < rsiMax * 0.95 && rsiVal > 60) {
        signals.push({
          indicator: 'RSI Phân kỳ giảm',
          value: `RSI ${rsiVal.toFixed(1)} (đỉnh RSI trước: ${rsiMax.toFixed(1)})`,
          signal: 'Bán',
          strength: 'Mạnh',
        });
      }
    }
  }

  // MACD
  const macdVal = _v(indicators.macdLine, lastIdx);
  const macdSig = _v(indicators.macdSignal, lastIdx);
  if (macdVal !== null && macdSig !== null) {
    signals.push({
      indicator: 'MACD (12,26,9)',
      value: macdVal.toFixed(2),
      signal: macdVal > macdSig ? 'Mua' : 'Bán',
      strength: Math.abs(macdVal - macdSig) / price > 0.005 ? 'Mạnh' : 'Trung bình',
    });
  }

  // MACD Histogram trend — 3 consecutive increasing/decreasing histogram bars
  if (lastIdx >= 3) {
    const h0 = _v(indicators.macdHistogram, lastIdx);
    const h1 = _v(indicators.macdHistogram, lastIdx - 1);
    const h2 = _v(indicators.macdHistogram, lastIdx - 2);
    if (h0 !== null && h1 !== null && h2 !== null) {
      if (h0 > h1 && h1 > h2) {
        signals.push({
          indicator: 'MACD Histogram xu hướng',
          value: `${h0.toFixed(0)} (tăng 3 phiên)`,
          signal: 'Mua',
          strength: h0 > 0 ? 'Mạnh' : 'Trung bình',
        });
      } else if (h0 < h1 && h1 < h2) {
        signals.push({
          indicator: 'MACD Histogram xu hướng',
          value: `${h0.toFixed(0)} (giảm 3 phiên)`,
          signal: 'Bán',
          strength: h0 < 0 ? 'Mạnh' : 'Trung bình',
        });
      }
    }
  }

  // Stochastic
  const stochKVal = _v(indicators.stochK, lastIdx);
  const stochDVal = _v(indicators.stochD, lastIdx);
  if (stochKVal !== null) {
    let stochSignal: 'Mua' | 'Bán' | 'Trung lập' = 'Trung lập';
    let stochStrength: 'Mạnh' | 'Trung bình' | 'Yếu' = 'Trung bình';
    // Classic overbought/oversold + K/D crossover
    if (stochKVal < 20) {
      stochSignal = 'Mua';
      stochStrength = stochKVal < 10 ? 'Mạnh' : 'Trung bình';
      // Confirm with K crossing above D
      if (stochDVal !== null && stochKVal > stochDVal) stochStrength = 'Mạnh';
    } else if (stochKVal > 80) {
      stochSignal = 'Bán';
      stochStrength = stochKVal > 90 ? 'Mạnh' : 'Trung bình';
      if (stochDVal !== null && stochKVal < stochDVal) stochStrength = 'Mạnh';
    }
    signals.push({
      indicator: 'Stochastic (14,3)',
      value: stochKVal.toFixed(2),
      signal: stochSignal,
      strength: stochStrength,
    });
  }

  // Bollinger Bands — price position within bands + squeeze detection
  const bbUpper = _v(indicators.bollingerUpper, lastIdx);
  const bbLower = _v(indicators.bollingerLower, lastIdx);
  const bbMiddle = _v(indicators.bollingerMiddle, lastIdx);
  if (bbUpper !== null && bbLower !== null && bbMiddle !== null) {
    const bandWidth = (bbUpper - bbLower) / bbMiddle;
    let bbSignal: 'Mua' | 'Bán' | 'Trung lập' = 'Trung lập';
    let bbStrength: 'Mạnh' | 'Trung bình' | 'Yếu' = 'Trung bình';
    if (price <= bbLower) {
      bbSignal = 'Mua';
      bbStrength = 'Mạnh';
    } else if (price >= bbUpper) {
      bbSignal = 'Bán';
      bbStrength = 'Mạnh';
    } else if (price < bbMiddle) {
      bbSignal = 'Mua';
      bbStrength = 'Yếu';
    } else {
      bbSignal = 'Bán';
      bbStrength = 'Yếu';
    }
    signals.push({
      indicator: 'Bollinger Bands (20,2)',
      value: `${bbLower.toLocaleString()} - ${bbUpper.toLocaleString()}`,
      signal: bbSignal,
      strength: bbStrength,
    });

    // Bollinger Squeeze — narrow bands indicate upcoming breakout
    if (bandWidth < 0.04) {
      signals.push({
        indicator: 'BB Squeeze (siết dải)',
        value: `BW ${(bandWidth * 100).toFixed(1)}%`,
        signal: price > bbMiddle ? 'Mua' : 'Bán',
        strength: 'Trung bình',
      });
    }
  }

  // Williams %R
  const wrVal = _v(indicators.williamsR, lastIdx);
  if (wrVal !== null) {
    signals.push({
      indicator: 'Williams %R (14)',
      value: wrVal.toFixed(2),
      signal: wrVal < -80 ? 'Mua' : wrVal > -20 ? 'Bán' : 'Trung lập',
      strength: wrVal < -90 || wrVal > -10 ? 'Mạnh' : 'Trung bình',
    });
  }

  // CCI
  const cciVal = _v(indicators.cci, lastIdx);
  if (cciVal !== null) {
    signals.push({
      indicator: 'CCI (20)',
      value: cciVal.toFixed(2),
      signal: cciVal < -100 ? 'Mua' : cciVal > 100 ? 'Bán' : 'Trung lập',
      strength: Math.abs(cciVal) > 200 ? 'Mạnh' : 'Trung bình',
    });
  }

  // ADX — trend strength (not direction; direction from DI+/DI-)
  const adxVal = _v(indicators.adx, lastIdx);
  if (adxVal !== null) {
    signals.push({
      indicator: 'ADX (14)',
      value: adxVal.toFixed(2),
      signal: adxVal > 25
        ? (price > (sma20Val ?? price) ? 'Mua' : 'Bán')
        : 'Trung lập',
      strength: adxVal > 50 ? 'Mạnh' : adxVal > 25 ? 'Trung bình' : 'Yếu',
    });
  }

  // ATR — volatility context (informational)
  const atrVal = _v(indicators.atr, lastIdx);
  if (atrVal !== null) {
    const atrPct = (atrVal / price) * 100;
    signals.push({
      indicator: 'ATR (14)',
      value: `${atrVal.toLocaleString()} (${atrPct.toFixed(1)}%)`,
      signal: 'Trung lập',
      strength: atrPct > 3 ? 'Mạnh' : atrPct > 1.5 ? 'Trung bình' : 'Yếu',
    });
  }

  // Volume analysis — current volume vs 20-day average
  if (ohlcv.length >= 21) {
    const vol20 = ohlcv.slice(-21, -1).reduce((s, d) => s + d.volume, 0) / 20;
    const curVol = ohlcv[lastIdx].volume;
    const volRatio = curVol / vol20;
    const priceUp = price > prevPrice;
    if (volRatio > 1.5) {
      // High volume + price direction = strong signal
      signals.push({
        indicator: 'Khối lượng đột biến',
        value: `${(volRatio * 100).toFixed(0)}% so với TB20`,
        signal: priceUp ? 'Mua' : 'Bán',
        strength: volRatio > 2 ? 'Mạnh' : 'Trung bình',
      });
    } else if (volRatio < 0.5) {
      signals.push({
        indicator: 'Khối lượng thấp',
        value: `${(volRatio * 100).toFixed(0)}% so với TB20`,
        signal: 'Trung lập',
        strength: 'Yếu',
      });
    }
  }

  // OBV trend — compare OBV direction with price direction (5-day lookback)
  if (lastIdx >= 5) {
    const obv0 = _v(indicators.obv, lastIdx);
    const obv5 = _v(indicators.obv, lastIdx - 5);
    if (obv0 !== null && obv5 !== null) {
      const obvUp = obv0 > obv5;
      const priceUp5 = price > ohlcv[lastIdx - 5].close;
      // Divergence: OBV up but price down = accumulation (bullish)
      // OBV down but price up = distribution (bearish)
      if (obvUp && !priceUp5) {
        signals.push({
          indicator: 'OBV Phân kỳ (tích lũy)',
          value: `OBV tăng, giá giảm`,
          signal: 'Mua',
          strength: 'Trung bình',
        });
      } else if (!obvUp && priceUp5) {
        signals.push({
          indicator: 'OBV Phân kỳ (phân phối)',
          value: `OBV giảm, giá tăng`,
          signal: 'Bán',
          strength: 'Trung bình',
        });
      }
    }
  }

  return signals;
}

// ===== Generate Summary =====

/** Weighted scoring for overall signal */
function _strengthWeight(s: 'Mạnh' | 'Trung bình' | 'Yếu'): number {
  if (s === 'Mạnh') return 3;
  if (s === 'Trung bình') return 2;
  return 1; // Yếu
}

export function generateSummary(signals: TechnicalSignal[], ohlcv: OHLCVItem[]): AnalysisSummaryData {
  const buyCount = signals.filter((s) => s.signal === 'Mua').length;
  const sellCount = signals.filter((s) => s.signal === 'Bán').length;
  const neutralCount = signals.filter((s) => s.signal === 'Trung lập').length;

  // Weighted score: Mua → +weight, Bán → −weight, Trung lập → 0
  let totalScore = 0;
  let maxScore = 0;
  for (const sig of signals) {
    const w = _strengthWeight(sig.strength);
    maxScore += w;
    if (sig.signal === 'Mua') totalScore += w;
    else if (sig.signal === 'Bán') totalScore -= w;
    // Trung lập contributes 0 to score but still adds to maxScore
  }

  // Normalize to [-100, +100] range
  const pct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  let overallSignal: AnalysisSummaryData['overallSignal'];
  if (pct >= 40) overallSignal = 'Mua mạnh';
  else if (pct >= 15) overallSignal = 'Mua';
  else if (pct <= -40) overallSignal = 'Bán mạnh';
  else if (pct <= -15) overallSignal = 'Bán';
  else overallSignal = 'Trung lập';

  const lastItem = ohlcv[ohlcv.length - 1];
  const pivot = (lastItem.high + lastItem.low + lastItem.close) / 3;
  const s1 = 2 * pivot - lastItem.high;
  const r1 = 2 * pivot - lastItem.low;
  const s2 = pivot - (lastItem.high - lastItem.low);
  const r2 = pivot + (lastItem.high - lastItem.low);
  const s3 = lastItem.low - 2 * (lastItem.high - pivot);
  const r3 = lastItem.high + 2 * (pivot - lastItem.low);

  return {
    overallSignal,
    scorePercent: Math.round(pct * 10) / 10,
    buyCount,
    sellCount,
    neutralCount,
    movingAverages: signals.filter((s) => {
      const n = s.indicator;
      return n.includes('SMA') || n.includes('EMA') || n.includes('VWAP')
        || n.includes('Ichimoku') || n.includes('Golden') || n.includes('Death');
    }),
    oscillators: signals.filter((s) => {
      const n = s.indicator;
      return !(n.includes('SMA') || n.includes('EMA') || n.includes('VWAP')
        || n.includes('Ichimoku') || n.includes('Golden') || n.includes('Death'));
    }),
    pivotPoints: [
      {
        type: 'Classic',
        s3: Math.round(s3),
        s2: Math.round(s2),
        s1: Math.round(s1),
        pivot: Math.round(pivot),
        r1: Math.round(r1),
        r2: Math.round(r2),
        r3: Math.round(r3),
      },
      {
        type: 'Fibonacci',
        s3: Math.round(pivot - 1.0 * (lastItem.high - lastItem.low)),
        s2: Math.round(pivot - 0.618 * (lastItem.high - lastItem.low)),
        s1: Math.round(pivot - 0.382 * (lastItem.high - lastItem.low)),
        pivot: Math.round(pivot),
        r1: Math.round(pivot + 0.382 * (lastItem.high - lastItem.low)),
        r2: Math.round(pivot + 0.618 * (lastItem.high - lastItem.low)),
        r3: Math.round(pivot + 1.0 * (lastItem.high - lastItem.low)),
      },
    ],
  };
}

// ===== Main Export =====

const stockNames: Record<string, { name: string; exchange: string }> = {
  VIC: { name: 'Tập đoàn Vingroup', exchange: 'HOSE' },
  VNM: { name: 'Vinamilk', exchange: 'HOSE' },
  VHM: { name: 'Vinhomes', exchange: 'HOSE' },
  HPG: { name: 'Hòa Phát', exchange: 'HOSE' },
  FPT: { name: 'FPT Corporation', exchange: 'HOSE' },
  MSN: { name: 'Masan Group', exchange: 'HOSE' },
  MWG: { name: 'Thế Giới Di Động', exchange: 'HOSE' },
  TCB: { name: 'Techcombank', exchange: 'HOSE' },
  VCB: { name: 'Vietcombank', exchange: 'HOSE' },
  SSI: { name: 'SSI Securities', exchange: 'HOSE' },
};

export function getAnalysisData(ticker: string): StockAnalysisData {
  const upperTicker = ticker.toUpperCase();
  const ohlcv = generateOHLCV(upperTicker, 365);
  const indicators = calculateIndicators(ohlcv);
  const signals = generateSignals(ohlcv, indicators);
  const summary = generateSummary(signals, ohlcv);

  const lastItem = ohlcv[ohlcv.length - 1];
  const prevItem = ohlcv[ohlcv.length - 2];
  const change = lastItem.close - prevItem.close;
  const changePct = (change / prevItem.close) * 100;

  const info = stockNames[upperTicker] || { name: upperTicker, exchange: 'HOSE' };

  return {
    ticker: upperTicker,
    companyName: info.name,
    exchange: info.exchange,
    currentPrice: lastItem.close,
    priceChange: change,
    priceChangePercent: Math.round(changePct * 100) / 100,
    ohlcv,
    indicators,
    signals,
    summary,
  };
}

export const popularTickers = [
  { ticker: 'VIC', name: 'Vingroup' },
  { ticker: 'VNM', name: 'Vinamilk' },
  { ticker: 'VHM', name: 'Vinhomes' },
  { ticker: 'HPG', name: 'Hòa Phát' },
  { ticker: 'FPT', name: 'FPT Corp' },
  { ticker: 'MSN', name: 'Masan' },
  { ticker: 'MWG', name: 'Thế Giới Di Động' },
  { ticker: 'TCB', name: 'Techcombank' },
  { ticker: 'VCB', name: 'Vietcombank' },
  { ticker: 'SSI', name: 'SSI Securities' },
];
