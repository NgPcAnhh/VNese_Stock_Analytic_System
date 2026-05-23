// Stock Screener Configuration & Preset Data

export interface FilterRange {
  min: number;
  max: number;
}

export interface ScreenerFilters {
  // Market
  exchanges: string[];
  sectors: string[];

  // Price & Volume
  priceRange: FilterRange;
  volumeRange: FilterRange; // daily average
  marketCapRange: FilterRange; // tỷ VND

  // Valuation
  peRange: FilterRange;
  pbRange: FilterRange;
  epsRange: FilterRange;
  dividendYieldRange: FilterRange;

  // Profitability
  roeRange: FilterRange;
  roaRange: FilterRange;

  // Growth
  revenueGrowthRange: FilterRange;
  profitGrowthRange: FilterRange;

  // Risk
  debtToEquityRange: FilterRange;
  betaRange: FilterRange;

  // Technical
  rsiRange: FilterRange;
  macdSignals: string[];
  maTrends: string[];

  // Foreign
  foreignOwnershipRange: FilterRange;
  foreignNetBuyRange: FilterRange;

  // Performance
  weekChange52Range: FilterRange;
}

export interface ScreenerPreset {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  category: string;
  filters: Partial<ScreenerFilters>;
  color: string; // tailwind color class
}

export const DEFAULT_FILTERS: ScreenerFilters = {
  exchanges: [],
  sectors: [],
  priceRange: { min: 0, max: 500000 },
  volumeRange: { min: 0, max: 20000000 },
  marketCapRange: { min: 0, max: 500000 },
  peRange: { min: -50, max: 100 },
  pbRange: { min: 0, max: 20 },
  epsRange: { min: -5000, max: 20000 },
  dividendYieldRange: { min: 0, max: 15 },
  roeRange: { min: -30, max: 50 },
  roaRange: { min: -20, max: 30 },
  revenueGrowthRange: { min: -50, max: 100 },
  profitGrowthRange: { min: -80, max: 100 },
  debtToEquityRange: { min: 0, max: 20 },
  betaRange: { min: 0, max: 3 },
  rsiRange: { min: 0, max: 100 },
  macdSignals: [],
  maTrends: [],
  foreignOwnershipRange: { min: 0, max: 100 },
  foreignNetBuyRange: { min: -100, max: 200 },
  weekChange52Range: { min: -80, max: 200 },
};

export const SCREENER_PRESETS: ScreenerPreset[] = [
  {
    id: "value-investing",
    name: "Cổ phiếu Giá trị",
    description: "P/E thấp, P/B thấp, cổ tức cao, tài chính ổn định",
    icon: "gem",
    category: "Chiến lược",
    color: "from-blue-500 to-blue-700",
    filters: {
      peRange: { min: 0, max: 12 },
      pbRange: { min: 0, max: 1.5 },
      dividendYieldRange: { min: 3, max: 15 },
      roeRange: { min: 10, max: 50 },
      debtToEquityRange: { min: 0, max: 2 },
    },
  },
  {
    id: "growth-stocks",
    name: "Cổ phiếu Tăng trưởng",
    description: "Tăng trưởng doanh thu & lợi nhuận cao, ROE tốt",
    icon: "rocket",
    category: "Chiến lược",
    color: "from-green-500 to-green-700",
    filters: {
      revenueGrowthRange: { min: 15, max: 100 },
      profitGrowthRange: { min: 20, max: 100 },
      roeRange: { min: 15, max: 50 },
      epsRange: { min: 1000, max: 20000 },
    },
  },
  {
    id: "blue-chip",
    name: "Blue Chip",
    description: "Vốn hóa lớn, thanh khoản cao, dẫn đầu ngành",
    icon: "shield",
    category: "Chiến lược",
    color: "from-indigo-500 to-indigo-700",
    filters: {
      marketCapRange: { min: 50000, max: 500000 },
      volumeRange: { min: 1000000, max: 20000000 },
      roeRange: { min: 12, max: 50 },
    },
  },
  {
    id: "high-dividend",
    name: "Cổ tức cao",
    description: "Cổ tức hấp dẫn trên 4%, phù hợp thu nhập thụ động",
    icon: "banknote",
    category: "Thu nhập",
    color: "from-amber-500 to-amber-700",
    filters: {
      dividendYieldRange: { min: 4, max: 15 },
      roeRange: { min: 8, max: 50 },
      debtToEquityRange: { min: 0, max: 3 },
    },
  },
  {
    id: "oversold-bounce",
    name: "Quá bán (RSI ↓)",
    description: "RSI < 30, có thể bật tăng – cơ hội mua ngắn hạn",
    icon: "arrow-down-circle",
    category: "Kỹ thuật",
    color: "from-red-500 to-red-700",
    filters: {
      rsiRange: { min: 0, max: 35 },
      volumeRange: { min: 500000, max: 20000000 },
    },
  },
  {
    id: "overbought",
    name: "Quá mua (RSI ↑)",
    description: "RSI > 70, có thể điều chỉnh – cẩn trọng",
    icon: "arrow-up-circle",
    category: "Kỹ thuật",
    color: "from-purple-500 to-purple-700",
    filters: {
      rsiRange: { min: 70, max: 100 },
    },
  },
  {
    id: "foreign-buy",
    name: "Khối ngoại mua ròng",
    description: "Cổ phiếu được khối ngoại mua ròng mạnh",
    icon: "globe",
    category: "Dòng tiền",
    color: "from-teal-500 to-teal-700",
    filters: {
      foreignNetBuyRange: { min: 10, max: 200 },
      foreignOwnershipRange: { min: 5, max: 100 },
    },
  },
  {
    id: "small-cap-gem",
    name: "Small Cap tiềm năng",
    description: "Vốn hóa nhỏ, tăng trưởng mạnh, P/E hợp lý",
    icon: "sparkles",
    category: "Chiến lược",
    color: "from-pink-500 to-pink-700",
    filters: {
      marketCapRange: { min: 0, max: 15000 },
      profitGrowthRange: { min: 15, max: 100 },
      peRange: { min: 0, max: 15 },
    },
  },
  {
    id: "strong-uptrend",
    name: "Xu hướng tăng mạnh",
    description: "Trên MA20, MACD mua, 52 tuần tăng trên 20%",
    icon: "trending-up",
    category: "Kỹ thuật",
    color: "from-emerald-500 to-emerald-700",
    filters: {
      maTrends: ["Trên MA20"],
      macdSignals: ["Mua"],
      weekChange52Range: { min: 20, max: 200 },
    },
  },
  {
    id: "low-debt",
    name: "Nợ thấp & An toàn",
    description: "Đòn bẩy thấp, ROA cao, tài chính lành mạnh",
    icon: "shield-check",
    category: "An toàn",
    color: "from-cyan-500 to-cyan-700",
    filters: {
      debtToEquityRange: { min: 0, max: 1 },
      roaRange: { min: 8, max: 30 },
      roeRange: { min: 10, max: 50 },
    },
  },
];

export const FILTER_CATEGORIES = [
  {
    id: "market",
    label: "Thị trường",
    icon: "building-2",
    filters: ["exchanges", "sectors"],
  },
  {
    id: "price-volume",
    label: "Giá & Khối lượng",
    icon: "bar-chart-3",
    filters: ["priceRange", "volumeRange", "marketCapRange"],
  },
  {
    id: "valuation",
    label: "Định giá",
    icon: "calculator",
    filters: ["peRange", "pbRange", "epsRange", "dividendYieldRange"],
  },
  {
    id: "profitability",
    label: "Sinh lời",
    icon: "percent",
    filters: ["roeRange", "roaRange"],
  },
  {
    id: "growth",
    label: "Tăng trưởng",
    icon: "trending-up",
    filters: ["revenueGrowthRange", "profitGrowthRange"],
  },
  {
    id: "risk",
    label: "Rủi ro",
    icon: "alert-triangle",
    filters: ["debtToEquityRange", "betaRange"],
  },
  {
    id: "technical",
    label: "Kỹ thuật",
    icon: "activity",
    filters: ["rsiRange", "macdSignals", "maTrends"],
  },
  {
    id: "foreign",
    label: "Khối ngoại",
    icon: "globe",
    filters: ["foreignOwnershipRange", "foreignNetBuyRange"],
  },
  {
    id: "performance",
    label: "Hiệu suất",
    icon: "trophy",
    filters: ["weekChange52Range"],
  },
];
