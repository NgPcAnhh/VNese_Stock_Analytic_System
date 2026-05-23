// ==================== VALUATION & FORECASTING MOCK DATA ====================

// ---------- ROW 0: Valuation Summary ----------
export const valuationSummary = {
  currentPrice: 85000,
  intrinsicValue: 112500,
  upside: 32.4,
  verdict: "Undervalued" as const,
  marginOfSafety: 24.4,
  methodBreakdown: [
    { method: "DCF (FCFF)", value: 118000, weight: 0.35 },
    { method: "P/E tương đối", value: 105000, weight: 0.25 },
    { method: "P/B tương đối", value: 98000, weight: 0.15 },
    { method: "DDM (Gordon)", value: 125000, weight: 0.15 },
    { method: "EV/EBITDA", value: 110000, weight: 0.10 },
  ],
  analystConsensus: {
    strongBuy: 5,
    buy: 8,
    hold: 3,
    sell: 1,
    strongSell: 0,
    avgTarget: 110000,
    highTarget: 135000,
    lowTarget: 90000,
  },
};

// ---------- ROW 1: Revenue & EPS Projections ----------
export const revenueProjections = {
  years: ["2020", "2021", "2022", "2023", "2024", "2025E", "2026E", "2027E"],
  actual: [28500, 32100, 35800, 41200, 48600, null, null, null],
  estimate: [null, null, null, null, null, 55200, 63500, 72800],
  yoyGrowth: [null, 12.6, 11.5, 15.1, 18.0, 13.6, 15.0, 14.6],
};

export const epsProjections = {
  years: ["2020", "2021", "2022", "2023", "2024", "2025E", "2026E", "2027E"],
  actual: [3200, 3800, 4100, 4900, 5600, null, null, null],
  estimate: [null, null, null, null, null, 6400, 7500, 8700],
  yoyGrowth: [null, 18.8, 7.9, 19.5, 14.3, 14.3, 17.2, 16.0],
};

// ---------- ROW 2: Football Field Chart ----------
export interface FootballFieldRow {
  method: string;
  low: number;
  mid: number;
  high: number;
  color: string;
}

export const footballFieldData: FootballFieldRow[] = [
  { method: "DCF (FCFF)",    low: 95000,  mid: 118000, high: 142000, color: "#3B82F6" },
  { method: "P/E tương đối", low: 88000,  mid: 105000, high: 122000, color: "#8B5CF6" },
  { method: "P/B tương đối", low: 82000,  mid: 98000,  high: 115000, color: "#F97316" },
  { method: "DDM (Gordon)",  low: 100000, mid: 125000, high: 148000, color: "#00C076" },
  { method: "EV/EBITDA",     low: 90000,  mid: 110000, high: 130000, color: "#EF4444" },
];

export const footballFieldCurrentPrice = 85000;

// ---------- ROW 3: DCF Model Deep Dive (enhanced) ----------
export const dcfAssumptions = {
  periods: 5,
  wacc: 11.5,
  terminalGrowth: 3.0,
  taxRate: 20,
  beta: 1.12,
  riskFreeRate: 4.5,
  equityRiskPremium: 7.0,
  debtCostPreTax: 8.0,
  costOfDebtAfterTax: 6.4,
  costOfEquity: 12.34,
  debtWeight: 30,
  equityWeight: 70,
};

export const dcfProjection = {
  years: ["2025E", "2026E", "2027E", "2028E", "2029E"],
  revenue:       [55200, 63500, 72800, 82500, 93000],
  revenueGrowth: [13.6, 15.0, 14.6, 13.3, 12.7],
  cogs:          [35300, 40200, 45800, 51500, 57700],
  grossProfit:   [19900, 23300, 27000, 31000, 35300],
  grossMargin:   [36.1, 36.7, 37.1, 37.6, 38.0],
  sga:           [6100, 6800, 7400, 7900, 8500],
  ebitda:        [13800, 16500, 19600, 23100, 26800],
  ebitdaMargin:  [25.0, 26.0, 26.9, 28.0, 28.8],
  da:            [2800, 3200, 3600, 4000, 4500],
  ebit:          [11000, 13300, 16000, 19100, 22300],
  ebitMargin:    [19.9, 20.9, 22.0, 23.2, 24.0],
  tax:           [2200, 2660, 3200, 3820, 4460],
  nopat:         [8800, 10640, 12800, 15280, 17840],
  capex:         [3500, 3800, 4200, 4600, 5100],
  nwcChange:     [800, 640, 600, 480, 540],
  fcff:          [8500, 10200, 12400, 14800, 17200],
  discountFactor:[0.8969, 0.8044, 0.7214, 0.6470, 0.5803],
  discountedFcff:[7623, 8209, 8942, 9580, 9988],
  terminalValue:     208471,
  discountedTerminal:121050,
  enterpriseValue:   165392,
  netDebt:           12500,
  minorityInterest:  500,
  equityValue:       152392,
  sharesOutstanding:  1295,
  fairValuePerShare:  118000,
};

export const dcfSensitivity = {
  waccValues: [9.5, 10.5, 11.5, 12.5, 13.5],
  growthValues: [1.0, 2.0, 3.0, 4.0, 5.0],
  matrix: [
    [135000, 145000, 158000, 174000, 196000],
    [118000, 126000, 136000, 148000, 164000],
    [104000, 110000, 118000, 128000, 140000],
    [93000,  98000,  104000, 112000, 121000],
    [84000,  88000,  93000,  99000,  107000],
  ],
};

// ---------- DDM (Dividend Discount Model) ----------
export const ddmModel = {
  assumptions: {
    currentDPS: 3000,         // VND
    dividendGrowthShort: 12,  // % (năm 1-3)
    dividendGrowthLong: 5,    // % (từ năm 4+)
    requiredReturn: 12.34,    // % = Ke
    terminalGrowth: 3.0,      // %
  },
  projections: {
    years: ["2025E", "2026E", "2027E", "2028E", "2029E", "Terminal"],
    dps:            [3360, 3763, 4215, 4426, 4647, 4787],
    growthRate:     [12.0, 12.0, 12.0, 5.0, 5.0, 3.0],
    discountFactor: [0.890, 0.793, 0.706, 0.628, 0.559, null],
    pvDividend:     [2990, 2984, 2974, 2780, 2598, null],
  },
  pvExplicit: 14326,
  terminalValuePerShare: 110700,
  pvTerminal: 61851,
  fairValue: 125000,
  dividendHistory: {
    years: ["2019", "2020", "2021", "2022", "2023", "2024"],
    dps:   [1500,   1800,   2000,   2200,   2500,   3000],
    payout:[35,     38,     40,     42,     40,     43],    // %
    yield: [2.9,    3.1,    2.8,    3.4,    3.3,    3.5],   // %
  },
};

// ---------- Relative Valuation (Peer Comparison) ----------
export interface PeerValuation {
  ticker: string;
  name: string;
  price: number;
  pe: number;
  pb: number;
  evEbitda: number;
  roe: number;
  debtEquity: number;
  marketCap: number; // tỷ VND
  highlight?: boolean;
}

export const relativeValuation: PeerValuation[] = [
  { ticker: "VNM",  name: "Vinamilk",     price: 85000,  pe: 15.2, pb: 4.1, evEbitda: 10.8, roe: 28.5, debtEquity: 0.32, marketCap: 178000, highlight: true },
  { ticker: "MSN",  name: "Masan Group",   price: 72000,  pe: 18.5, pb: 2.3, evEbitda: 12.4, roe: 14.2, debtEquity: 1.15, marketCap: 85000 },
  { ticker: "SAB",  name: "Sabeco",         price: 58000,  pe: 22.1, pb: 5.6, evEbitda: 14.2, roe: 25.8, debtEquity: 0.18, marketCap: 112000 },
  { ticker: "KDC",  name: "Kido Group",     price: 48000,  pe: 12.8, pb: 1.8, evEbitda: 8.5,  roe: 15.6, debtEquity: 0.45, marketCap: 14500 },
  { ticker: "MCH",  name: "Masan Consumer", price: 120000, pe: 20.3, pb: 5.2, evEbitda: 13.1, roe: 32.1, debtEquity: 0.28, marketCap: 95000 },
];

export const sectorAverage = {
  pe: 17.8, pb: 3.8, evEbitda: 11.8, roe: 23.2, debtEquity: 0.48,
};

export const impliedFromPeers = {
  fromPE: 99500,
  fromPB: 78900,
  fromEVEBITDA: 93200,
  blended: 90500,
};

// ---------- Profitability & Margin Trends ----------
export const profitabilityTrends = {
  years: ["2019", "2020", "2021", "2022", "2023", "2024", "2025E"],
  roe:  [24.5, 26.1, 27.8, 25.2, 28.5, 30.2, 31.5],
  roa:  [12.8, 13.5, 14.2, 13.0, 14.8, 15.5, 16.2],
  roic: [18.2, 19.5, 20.8, 18.5, 21.2, 22.5, 23.8],
};

export const marginTrends = {
  years: ["2019", "2020", "2021", "2022", "2023", "2024", "2025E"],
  grossMargin:     [33.5, 34.2, 35.0, 34.8, 35.5, 36.1, 36.7],
  operatingMargin: [16.8, 17.5, 18.2, 17.0, 18.5, 19.9, 20.9],
  netMargin:       [12.5, 13.2, 14.0, 13.5, 14.8, 15.5, 16.2],
  ebitdaMargin:    [22.0, 23.0, 23.8, 23.5, 24.5, 25.0, 26.0],
};

// ---------- P/E Bands ----------
export const peBandsData = {
  years: ["2019", "2020", "2021", "2022", "2023", "2024", "2025E"],
  priceHistory: [52000, 58000, 72000, 65000, 75000, 85000, null],
  bands: [
    { label: "P/E 20x", values: [48000, 64000, 76000, 82000, 98000, 112000, 128000], color: "#00C076" },
    { label: "P/E 17x", values: [40800, 54400, 64600, 69700, 83300, 95200, 108800], color: "#3B82F6" },
    { label: "P/E 14x (Avg)", values: [33600, 44800, 53200, 57400, 68600, 78400, 89600], color: "#F97316" },
    { label: "P/E 11x", values: [26400, 35200, 41800, 45100, 53900, 61600, 70400], color: "#EF4444" },
    { label: "P/E 8x", values: [19200, 25600, 30400, 32800, 39200, 44800, 51200], color: "#9CA3AF" },
  ],
};

// ---------- P/B Bands ----------
export const pbBandsData = {
  years: ["2019", "2020", "2021", "2022", "2023", "2024", "2025E"],
  priceHistory: [52000, 58000, 72000, 65000, 75000, 85000, null],
  bvps: [15200, 16800, 18500, 19200, 20800, 22500, 24200],
  bands: [
    { label: "P/B 5.0x", values: [76000, 84000, 92500, 96000, 104000, 112500, 121000], color: "#00C076" },
    { label: "P/B 4.0x", values: [60800, 67200, 74000, 76800, 83200, 90000, 96800], color: "#3B82F6" },
    { label: "P/B 3.5x (Avg)", values: [53200, 58800, 64750, 67200, 72800, 78750, 84700], color: "#F97316" },
    { label: "P/B 3.0x", values: [45600, 50400, 55500, 57600, 62400, 67500, 72600], color: "#EF4444" },
    { label: "P/B 2.0x", values: [30400, 33600, 37000, 38400, 41600, 45000, 48400], color: "#9CA3AF" },
  ],
};

// ---------- Analyst Consensus colors & labels ----------
export const consensusCategories = [
  { key: "strongBuy",  label: "Mua mạnh", color: "#00C076" },
  { key: "buy",        label: "Mua",      color: "#34D399" },
  { key: "hold",       label: "Nắm giữ",  color: "#FBBF24" },
  { key: "sell",       label: "Bán",       color: "#F87171" },
  { key: "strongSell", label: "Bán mạnh",  color: "#EF4444" },
] as const;

// ---------- Helpers ----------
export function formatVND(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString("vi-VN");
}
