// Stock List Mock Data — used by the Stocks overview page & screener

export interface StockListItem {
  ticker: string;
  companyName: string;
  sector: string;
  sector2?: string;
  exchange: string;
  tradingDate?: string;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  closePrice?: number;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  avgVolume10d: number;
  marketCap: number; // tỷ VND
  pe: number | null;
  pb: number;
  eps: number;
  roe: number;
  roa: number;
  debtToEquity: number;
  revenueGrowth: number; // %
  profitGrowth: number; // %
  dividendYield: number; // %
  foreignOwnership: number; // %
  foreignNetBuy: number; // tỷ VND
  weekChange52: number; // %
  high52w: number;
  low52w: number;
  beta: number;
  rsi14: number;
  macdSignal: "Mua" | "Bán" | "Trung tính";
  ma20Trend: "Trên MA20" | "Dưới MA20";
  signal: string;
  sparkline: number[];
}

export const STOCK_SECTORS = [
  "Ngân hàng",
  "Bất động sản",
  "Chứng khoán",
  "Thép",
  "Dầu khí",
  "Công nghệ",
  "Bán lẻ",
  "Điện",
  "Xây dựng",
  "Thực phẩm",
  "Dược phẩm",
  "Vận tải",
  "Hóa chất",
  "Bảo hiểm",
];

export const STOCK_SIGNALS = ["Tất cả", "Mua", "Bán", "Nắm giữ", "Theo dõi"];

export const STOCK_EXCHANGES = ["HOSE", "HNX", "UPCOM"];

// Helper to generate sparkline
const genSparkline = (base: number, volatility: number): number[] =>
  Array.from({ length: 20 }, (_, i) => {
    const trend = (Math.random() - 0.45) * volatility;
    return Math.round(base + trend * (i + 1) + (Math.random() - 0.5) * volatility * 3);
  });

export const STOCK_LIST_DATA: StockListItem[] = [
  // === Ngân hàng ===
  {
    ticker: "VCB", companyName: "Ngân hàng TMCP Ngoại thương Việt Nam", sector: "Ngân hàng", exchange: "HOSE",
    currentPrice: 92500, priceChange: 1500, priceChangePercent: 1.65, volume: 5200000, avgVolume10d: 4800000,
    marketCap: 432000, pe: 15.2, pb: 3.1, eps: 6085, roe: 22.5, roa: 1.8, debtToEquity: 10.2,
    revenueGrowth: 12.5, profitGrowth: 15.3, dividendYield: 1.2, foreignOwnership: 22.8, foreignNetBuy: 45,
    weekChange52: 18.5, high52w: 95000, low52w: 72000, beta: 0.85, rsi14: 62,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(90000, 800),
  },
  {
    ticker: "BID", companyName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", sector: "Ngân hàng", exchange: "HOSE",
    currentPrice: 48200, priceChange: -300, priceChangePercent: -0.62, volume: 4100000, avgVolume10d: 3900000,
    marketCap: 242000, pe: 12.8, pb: 2.4, eps: 3766, roe: 19.1, roa: 1.2, debtToEquity: 11.5,
    revenueGrowth: 8.2, profitGrowth: 10.1, dividendYield: 1.0, foreignOwnership: 0, foreignNetBuy: -12,
    weekChange52: 8.2, high52w: 52000, low52w: 41000, beta: 0.92, rsi14: 45,
    macdSignal: "Trung tính", ma20Trend: "Dưới MA20", signal: "Nắm giữ", sparkline: genSparkline(48000, 500),
  },
  {
    ticker: "CTG", companyName: "Ngân hàng TMCP Công Thương Việt Nam", sector: "Ngân hàng", exchange: "HOSE",
    currentPrice: 35400, priceChange: 600, priceChangePercent: 1.72, volume: 3800000, avgVolume10d: 3500000,
    marketCap: 186000, pe: 10.5, pb: 1.9, eps: 3371, roe: 18.2, roa: 1.1, debtToEquity: 12.1,
    revenueGrowth: 10.5, profitGrowth: 12.8, dividendYield: 1.5, foreignOwnership: 5.2, foreignNetBuy: 22,
    weekChange52: 15.3, high52w: 37000, low52w: 28000, beta: 0.88, rsi14: 58,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(34000, 400),
  },
  {
    ticker: "TCB", companyName: "Ngân hàng TMCP Kỹ Thương Việt Nam", sector: "Ngân hàng", exchange: "HOSE",
    currentPrice: 26800, priceChange: 200, priceChangePercent: 0.75, volume: 6500000, avgVolume10d: 5800000,
    marketCap: 94000, pe: 7.2, pb: 1.3, eps: 3722, roe: 17.8, roa: 2.1, debtToEquity: 7.8,
    revenueGrowth: 15.2, profitGrowth: 18.5, dividendYield: 0, foreignOwnership: 19.5, foreignNetBuy: 30,
    weekChange52: 22.1, high52w: 28500, low52w: 20000, beta: 1.15, rsi14: 55,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(26000, 350),
  },
  {
    ticker: "MBB", companyName: "Ngân hàng TMCP Quân đội", sector: "Ngân hàng", exchange: "HOSE",
    currentPrice: 22300, priceChange: -200, priceChangePercent: -0.89, volume: 7200000, avgVolume10d: 6500000,
    marketCap: 105000, pe: 6.8, pb: 1.4, eps: 3279, roe: 20.5, roa: 2.3, debtToEquity: 8.3,
    revenueGrowth: 18.1, profitGrowth: 20.2, dividendYield: 0, foreignOwnership: 23.1, foreignNetBuy: -8,
    weekChange52: 12.5, high52w: 25000, low52w: 18000, beta: 1.08, rsi14: 42,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Theo dõi", sparkline: genSparkline(22000, 300),
  },
  {
    ticker: "VPB", companyName: "Ngân hàng TMCP Việt Nam Thịnh Vượng", sector: "Ngân hàng", exchange: "HOSE",
    currentPrice: 20100, priceChange: 300, priceChangePercent: 1.52, volume: 8100000, avgVolume10d: 7200000,
    marketCap: 152000, pe: 8.5, pb: 1.6, eps: 2365, roe: 16.2, roa: 1.5, debtToEquity: 9.5,
    revenueGrowth: 22.5, profitGrowth: 25.3, dividendYield: 0, foreignOwnership: 15.2, foreignNetBuy: 18,
    weekChange52: 28.5, high52w: 21500, low52w: 14500, beta: 1.25, rsi14: 68,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(19500, 300),
  },
  {
    ticker: "ACB", companyName: "Ngân hàng TMCP Á Châu", sector: "Ngân hàng", exchange: "HOSE",
    currentPrice: 25800, priceChange: -100, priceChangePercent: -0.39, volume: 3200000, avgVolume10d: 2800000,
    marketCap: 88000, pe: 7.8, pb: 1.7, eps: 3308, roe: 23.1, roa: 2.5, debtToEquity: 7.2,
    revenueGrowth: 14.2, profitGrowth: 16.5, dividendYield: 2.0, foreignOwnership: 29.8, foreignNetBuy: 5,
    weekChange52: 10.2, high52w: 28000, low52w: 21000, beta: 0.95, rsi14: 50,
    macdSignal: "Trung tính", ma20Trend: "Trên MA20", signal: "Nắm giữ", sparkline: genSparkline(25500, 280),
  },
  {
    ticker: "STB", companyName: "Ngân hàng TMCP Sài Gòn Thương Tín", sector: "Ngân hàng", exchange: "HOSE",
    currentPrice: 31200, priceChange: 400, priceChangePercent: 1.30, volume: 5500000, avgVolume10d: 5000000,
    marketCap: 58000, pe: 12.1, pb: 1.5, eps: 2579, roe: 12.8, roa: 0.9, debtToEquity: 13.2,
    revenueGrowth: 20.1, profitGrowth: 28.5, dividendYield: 0, foreignOwnership: 3.5, foreignNetBuy: 10,
    weekChange52: 35.2, high52w: 33000, low52w: 21000, beta: 1.32, rsi14: 72,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(30000, 400),
  },

  // === Bất động sản ===
  {
    ticker: "VIC", companyName: "Tập đoàn Vingroup", sector: "Bất động sản", exchange: "HOSE",
    currentPrice: 42500, priceChange: 800, priceChangePercent: 1.92, volume: 3300000, avgVolume10d: 3000000,
    marketCap: 145000, pe: 48.5, pb: 2.8, eps: 876, roe: 5.8, roa: 1.2, debtToEquity: 3.8,
    revenueGrowth: 8.5, profitGrowth: -5.2, dividendYield: 0, foreignOwnership: 41.2, foreignNetBuy: 55,
    weekChange52: 5.2, high52w: 45000, low52w: 38000, beta: 1.05, rsi14: 60,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Theo dõi", sparkline: genSparkline(42000, 500),
  },
  {
    ticker: "VHM", companyName: "Công ty CP Vinhomes", sector: "Bất động sản", exchange: "HOSE",
    currentPrice: 38200, priceChange: -500, priceChangePercent: -1.29, volume: 7200000, avgVolume10d: 6500000,
    marketCap: 128000, pe: 9.5, pb: 1.8, eps: 4021, roe: 18.5, roa: 8.5, debtToEquity: 1.2,
    revenueGrowth: 25.2, profitGrowth: 30.1, dividendYield: 2.5, foreignOwnership: 34.5, foreignNetBuy: -25,
    weekChange52: -8.5, high52w: 44000, low52w: 35000, beta: 1.18, rsi14: 38,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Bán", sparkline: genSparkline(39000, 450),
  },
  {
    ticker: "NVL", companyName: "Tập đoàn Novaland", sector: "Bất động sản", exchange: "HOSE",
    currentPrice: 12800, priceChange: -300, priceChangePercent: -2.29, volume: 8000000, avgVolume10d: 7500000,
    marketCap: 25000, pe: null, pb: 0.8, eps: -520, roe: -8.5, roa: -2.1, debtToEquity: 5.5,
    revenueGrowth: -35.2, profitGrowth: -65.1, dividendYield: 0, foreignOwnership: 8.2, foreignNetBuy: -15,
    weekChange52: -25.5, high52w: 18000, low52w: 10500, beta: 1.85, rsi14: 28,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Bán", sparkline: genSparkline(13500, 400),
  },
  {
    ticker: "KDH", companyName: "Công ty CP Đầu tư Kinh Doanh Nhà Khang Điền", sector: "Bất động sản", exchange: "HOSE",
    currentPrice: 28500, priceChange: 200, priceChangePercent: 0.71, volume: 2900000, avgVolume10d: 2500000,
    marketCap: 20000, pe: 14.2, pb: 1.9, eps: 2007, roe: 13.5, roa: 6.2, debtToEquity: 1.1,
    revenueGrowth: 12.1, profitGrowth: 15.5, dividendYield: 1.8, foreignOwnership: 45.5, foreignNetBuy: 8,
    weekChange52: 12.3, high52w: 31000, low52w: 23000, beta: 0.92, rsi14: 55,
    macdSignal: "Trung tính", ma20Trend: "Trên MA20", signal: "Nắm giữ", sparkline: genSparkline(28000, 300),
  },

  // === Chứng khoán ===
  {
    ticker: "SSI", companyName: "Công ty CP Chứng khoán SSI", sector: "Chứng khoán", exchange: "HOSE",
    currentPrice: 32500, priceChange: 500, priceChangePercent: 1.56, volume: 8500000, avgVolume10d: 7800000,
    marketCap: 42000, pe: 11.5, pb: 1.8, eps: 2826, roe: 15.8, roa: 5.2, debtToEquity: 2.1,
    revenueGrowth: 25.5, profitGrowth: 32.1, dividendYield: 1.5, foreignOwnership: 48.5, foreignNetBuy: 20,
    weekChange52: 25.8, high52w: 35000, low52w: 24000, beta: 1.35, rsi14: 65,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(31500, 400),
  },
  {
    ticker: "VND", companyName: "Công ty CP Chứng khoán VNDirect", sector: "Chứng khoán", exchange: "HOSE",
    currentPrice: 18500, priceChange: -200, priceChangePercent: -1.07, volume: 6200000, avgVolume10d: 5500000,
    marketCap: 22000, pe: 9.2, pb: 1.2, eps: 2011, roe: 12.5, roa: 4.1, debtToEquity: 2.5,
    revenueGrowth: 18.2, profitGrowth: 22.5, dividendYield: 0, foreignOwnership: 15.8, foreignNetBuy: -5,
    weekChange52: 15.2, high52w: 21000, low52w: 14500, beta: 1.52, rsi14: 40,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Theo dõi", sparkline: genSparkline(19000, 350),
  },
  {
    ticker: "HCM", companyName: "Công ty CP Chứng khoán TP.HCM", sector: "Chứng khoán", exchange: "HOSE",
    currentPrice: 25200, priceChange: 300, priceChangePercent: 1.21, volume: 4100000, avgVolume10d: 3600000,
    marketCap: 17000, pe: 10.8, pb: 1.5, eps: 2333, roe: 14.2, roa: 4.8, debtToEquity: 1.8,
    revenueGrowth: 20.1, profitGrowth: 25.8, dividendYield: 2.2, foreignOwnership: 36.2, foreignNetBuy: 12,
    weekChange52: 18.5, high52w: 27000, low52w: 19500, beta: 1.28, rsi14: 58,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(24500, 300),
  },

  // === Thép ===
  {
    ticker: "HPG", companyName: "Tập đoàn Hòa Phát", sector: "Thép", exchange: "HOSE",
    currentPrice: 26500, priceChange: 700, priceChangePercent: 2.71, volume: 12000000, avgVolume10d: 10500000,
    marketCap: 120000, pe: 10.2, pb: 1.5, eps: 2598, roe: 15.2, roa: 8.5, debtToEquity: 0.8,
    revenueGrowth: 28.5, profitGrowth: 45.2, dividendYield: 1.0, foreignOwnership: 22.5, foreignNetBuy: 35,
    weekChange52: 32.5, high52w: 28000, low52w: 18500, beta: 1.42, rsi14: 70,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(25500, 400),
  },
  {
    ticker: "HSG", companyName: "Tập đoàn Hoa Sen", sector: "Thép", exchange: "HOSE",
    currentPrice: 18200, priceChange: 200, priceChangePercent: 1.11, volume: 5500000, avgVolume10d: 4800000,
    marketCap: 11000, pe: 8.5, pb: 1.2, eps: 2141, roe: 14.5, roa: 6.2, debtToEquity: 1.3,
    revenueGrowth: 15.2, profitGrowth: 35.5, dividendYield: 2.5, foreignOwnership: 8.5, foreignNetBuy: 5,
    weekChange52: 22.1, high52w: 20000, low52w: 13500, beta: 1.55, rsi14: 58,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Nắm giữ", sparkline: genSparkline(17800, 300),
  },

  // === Dầu khí ===
  {
    ticker: "GAS", companyName: "Tổng Công ty Khí Việt Nam", sector: "Dầu khí", exchange: "HOSE",
    currentPrice: 78500, priceChange: -1200, priceChangePercent: -1.51, volume: 1200000, avgVolume10d: 1100000,
    marketCap: 150000, pe: 15.8, pb: 3.2, eps: 4968, roe: 20.5, roa: 15.2, debtToEquity: 0.3,
    revenueGrowth: 5.2, profitGrowth: 8.1, dividendYield: 4.5, foreignOwnership: 48.2, foreignNetBuy: -10,
    weekChange52: -5.2, high52w: 85000, low52w: 72000, beta: 0.72, rsi14: 35,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Bán", sparkline: genSparkline(79500, 700),
  },
  {
    ticker: "PLX", companyName: "Tập đoàn Xăng Dầu Việt Nam", sector: "Dầu khí", exchange: "HOSE",
    currentPrice: 38800, priceChange: 200, priceChangePercent: 0.52, volume: 1800000, avgVolume10d: 1500000,
    marketCap: 50000, pe: 18.5, pb: 2.1, eps: 2097, roe: 11.5, roa: 3.5, debtToEquity: 2.2,
    revenueGrowth: 3.5, profitGrowth: 5.2, dividendYield: 3.8, foreignOwnership: 12.5, foreignNetBuy: 3,
    weekChange52: 2.1, high52w: 42000, low52w: 35000, beta: 0.65, rsi14: 48,
    macdSignal: "Trung tính", ma20Trend: "Trên MA20", signal: "Nắm giữ", sparkline: genSparkline(38500, 400),
  },

  // === Công nghệ ===
  {
    ticker: "FPT", companyName: "Công ty CP FPT", sector: "Công nghệ", exchange: "HOSE",
    currentPrice: 128500, priceChange: 2500, priceChangePercent: 1.98, volume: 3500000, avgVolume10d: 3200000,
    marketCap: 168000, pe: 22.5, pb: 5.2, eps: 5711, roe: 25.8, roa: 10.5, debtToEquity: 1.5,
    revenueGrowth: 22.1, profitGrowth: 25.5, dividendYield: 1.8, foreignOwnership: 48.5, foreignNetBuy: 85,
    weekChange52: 45.2, high52w: 135000, low52w: 82000, beta: 1.12, rsi14: 72,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(125000, 1500),
  },

  // === Bán lẻ ===
  {
    ticker: "MWG", companyName: "Công ty CP Đầu tư Thế Giới Di Động", sector: "Bán lẻ", exchange: "HOSE",
    currentPrice: 62500, priceChange: 1200, priceChangePercent: 1.96, volume: 4200000, avgVolume10d: 3800000,
    marketCap: 90000, pe: 18.5, pb: 4.2, eps: 3378, roe: 22.8, roa: 5.5, debtToEquity: 3.1,
    revenueGrowth: 15.8, profitGrowth: 55.2, dividendYield: 1.0, foreignOwnership: 48.8, foreignNetBuy: 42,
    weekChange52: 38.5, high52w: 65000, low52w: 42000, beta: 1.25, rsi14: 66,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(61000, 700),
  },
  {
    ticker: "PNJ", companyName: "Công ty CP Vàng bạc Đá quý Phú Nhuận", sector: "Bán lẻ", exchange: "HOSE",
    currentPrice: 82500, priceChange: -500, priceChangePercent: -0.60, volume: 1200000, avgVolume10d: 1000000,
    marketCap: 25000, pe: 16.2, pb: 3.8, eps: 5093, roe: 24.5, roa: 12.2, debtToEquity: 1.0,
    revenueGrowth: 12.5, profitGrowth: 18.2, dividendYield: 2.2, foreignOwnership: 48.2, foreignNetBuy: 8,
    weekChange52: 15.2, high52w: 88000, low52w: 65000, beta: 0.85, rsi14: 48,
    macdSignal: "Trung tính", ma20Trend: "Dưới MA20", signal: "Nắm giữ", sparkline: genSparkline(83000, 800),
  },

  // === Điện ===
  {
    ticker: "POW", companyName: "Tổng Công ty Điện lực Dầu khí Việt Nam", sector: "Điện", exchange: "HOSE",
    currentPrice: 12800, priceChange: 100, priceChangePercent: 0.79, volume: 5200000, avgVolume10d: 4500000,
    marketCap: 30000, pe: 12.5, pb: 1.2, eps: 1024, roe: 9.8, roa: 4.2, debtToEquity: 1.3,
    revenueGrowth: 8.5, profitGrowth: 12.2, dividendYield: 3.5, foreignOwnership: 18.5, foreignNetBuy: 2,
    weekChange52: 8.5, high52w: 14000, low52w: 10500, beta: 0.72, rsi14: 52,
    macdSignal: "Trung tính", ma20Trend: "Trên MA20", signal: "Nắm giữ", sparkline: genSparkline(12500, 200),
  },
  {
    ticker: "PC1", companyName: "Công ty CP Xây lắp Điện 1", sector: "Điện", exchange: "HOSE",
    currentPrice: 22500, priceChange: -400, priceChangePercent: -1.75, volume: 2800000, avgVolume10d: 2500000,
    marketCap: 8000, pe: 9.8, pb: 1.1, eps: 2296, roe: 11.2, roa: 3.5, debtToEquity: 2.2,
    revenueGrowth: 18.5, profitGrowth: 22.1, dividendYield: 1.5, foreignOwnership: 12.5, foreignNetBuy: -3,
    weekChange52: -12.5, high52w: 28000, low52w: 20000, beta: 1.18, rsi14: 32,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Bán", sparkline: genSparkline(23000, 350),
  },

  // === Xây dựng ===
  {
    ticker: "CTD", companyName: "Công ty CP Xây dựng Coteccons", sector: "Xây dựng", exchange: "HOSE",
    currentPrice: 68500, priceChange: 1500, priceChangePercent: 2.24, volume: 800000, avgVolume10d: 650000,
    marketCap: 5200, pe: 14.5, pb: 1.3, eps: 4724, roe: 9.2, roa: 5.5, debtToEquity: 0.7,
    revenueGrowth: 22.5, profitGrowth: 28.1, dividendYield: 3.0, foreignOwnership: 22.1, foreignNetBuy: 5,
    weekChange52: 18.5, high52w: 72000, low52w: 52000, beta: 0.95, rsi14: 62,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(66500, 700),
  },
  {
    ticker: "HBC", companyName: "Công ty CP Tập đoàn Xây dựng Hòa Bình", sector: "Xây dựng", exchange: "HOSE",
    currentPrice: 8500, priceChange: -200, priceChangePercent: -2.30, volume: 6500000, avgVolume10d: 5800000,
    marketCap: 2500, pe: null, pb: 0.6, eps: -850, roe: -15.2, roa: -4.5, debtToEquity: 4.5,
    revenueGrowth: -25.2, profitGrowth: -55.1, dividendYield: 0, foreignOwnership: 5.2, foreignNetBuy: -8,
    weekChange52: -35.2, high52w: 14000, low52w: 7000, beta: 1.85, rsi14: 25,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Bán", sparkline: genSparkline(9000, 250),
  },

  // === Thực phẩm ===
  {
    ticker: "VNM", companyName: "Công ty CP Sữa Việt Nam", sector: "Thực phẩm", exchange: "HOSE",
    currentPrice: 68200, priceChange: -300, priceChangePercent: -0.44, volume: 2800000, avgVolume10d: 2500000,
    marketCap: 142000, pe: 16.8, pb: 4.5, eps: 4060, roe: 28.5, roa: 18.5, debtToEquity: 0.5,
    revenueGrowth: 5.2, profitGrowth: 8.5, dividendYield: 5.5, foreignOwnership: 52.5, foreignNetBuy: -15,
    weekChange52: -2.5, high52w: 75000, low52w: 62000, beta: 0.55, rsi14: 42,
    macdSignal: "Trung tính", ma20Trend: "Dưới MA20", signal: "Nắm giữ", sparkline: genSparkline(68500, 500),
  },
  {
    ticker: "MSN", companyName: "Tập đoàn Masan", sector: "Thực phẩm", exchange: "HOSE",
    currentPrice: 78500, priceChange: 1500, priceChangePercent: 1.95, volume: 2200000, avgVolume10d: 1800000,
    marketCap: 92000, pe: 32.5, pb: 3.2, eps: 2415, roe: 10.2, roa: 2.8, debtToEquity: 2.5,
    revenueGrowth: 8.5, profitGrowth: 15.2, dividendYield: 0.5, foreignOwnership: 25.5, foreignNetBuy: 22,
    weekChange52: 12.8, high52w: 82000, low52w: 65000, beta: 0.92, rsi14: 58,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Theo dõi", sparkline: genSparkline(77000, 800),
  },

  // === Dược phẩm ===
  {
    ticker: "DHG", companyName: "Công ty CP Dược Hậu Giang", sector: "Dược phẩm", exchange: "HOSE",
    currentPrice: 95500, priceChange: 500, priceChangePercent: 0.53, volume: 350000, avgVolume10d: 300000,
    marketCap: 12500, pe: 18.2, pb: 4.8, eps: 5247, roe: 26.5, roa: 18.2, debtToEquity: 0.4,
    revenueGrowth: 8.2, profitGrowth: 12.5, dividendYield: 4.2, foreignOwnership: 48.2, foreignNetBuy: 3,
    weekChange52: 8.5, high52w: 100000, low52w: 82000, beta: 0.45, rsi14: 55,
    macdSignal: "Trung tính", ma20Trend: "Trên MA20", signal: "Nắm giữ", sparkline: genSparkline(94500, 500),
  },

  // === Vận tải ===
  {
    ticker: "ACV", companyName: "Tổng Công ty Cảng Hàng không Việt Nam", sector: "Vận tải", exchange: "HOSE",
    currentPrice: 82500, priceChange: 1200, priceChangePercent: 1.48, volume: 1500000, avgVolume10d: 1200000,
    marketCap: 178000, pe: 28.5, pb: 5.5, eps: 2895, roe: 19.5, roa: 12.5, debtToEquity: 0.5,
    revenueGrowth: 18.5, profitGrowth: 22.1, dividendYield: 0.8, foreignOwnership: 4.5, foreignNetBuy: 15,
    weekChange52: 22.5, high52w: 85000, low52w: 62000, beta: 0.82, rsi14: 62,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(81000, 700),
  },

  // === Hóa chất ===
  {
    ticker: "DPM", companyName: "Tổng Công ty Phân bón và Hóa chất Dầu khí", sector: "Hóa chất", exchange: "HOSE",
    currentPrice: 32500, priceChange: -500, priceChangePercent: -1.52, volume: 2200000, avgVolume10d: 1800000,
    marketCap: 12800, pe: 7.8, pb: 1.2, eps: 4167, roe: 15.5, roa: 10.2, debtToEquity: 0.5,
    revenueGrowth: -8.5, profitGrowth: -15.2, dividendYield: 8.5, foreignOwnership: 18.2, foreignNetBuy: -5,
    weekChange52: -12.5, high52w: 40000, low52w: 28000, beta: 0.95, rsi14: 35,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Bán", sparkline: genSparkline(33500, 400),
  },

  // === Bảo hiểm ===
  {
    ticker: "BVH", companyName: "Tập đoàn Bảo Việt", sector: "Bảo hiểm", exchange: "HOSE",
    currentPrice: 48500, priceChange: 200, priceChangePercent: 0.41, volume: 1200000, avgVolume10d: 1000000,
    marketCap: 36000, pe: 22.5, pb: 2.1, eps: 2156, roe: 9.5, roa: 1.5, debtToEquity: 5.2,
    revenueGrowth: 5.5, profitGrowth: 8.2, dividendYield: 2.5, foreignOwnership: 25.8, foreignNetBuy: 5,
    weekChange52: 5.2, high52w: 52000, low52w: 42000, beta: 0.68, rsi14: 50,
    macdSignal: "Trung tính", ma20Trend: "Trên MA20", signal: "Nắm giữ", sparkline: genSparkline(48000, 350),
  },

  // === More HNX / UPCOM stocks ===
  {
    ticker: "SHS", companyName: "Công ty CP Chứng khoán Sài Gòn – Hà Nội", sector: "Chứng khoán", exchange: "HNX",
    currentPrice: 14500, priceChange: 300, priceChangePercent: 2.11, volume: 9500000, avgVolume10d: 8800000,
    marketCap: 8500, pe: 8.2, pb: 1.1, eps: 1768, roe: 13.5, roa: 4.5, debtToEquity: 2.0,
    revenueGrowth: 30.2, profitGrowth: 42.5, dividendYield: 0, foreignOwnership: 8.5, foreignNetBuy: 5,
    weekChange52: 35.2, high52w: 15500, low52w: 9500, beta: 1.6, rsi14: 68,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(14000, 250),
  },
  {
    ticker: "PVS", companyName: "Tổng Công ty CP Dịch vụ Kỹ thuật Dầu khí VN", sector: "Dầu khí", exchange: "HNX",
    currentPrice: 32800, priceChange: -200, priceChangePercent: -0.61, volume: 3200000, avgVolume10d: 2800000,
    marketCap: 15500, pe: 11.2, pb: 1.5, eps: 2929, roe: 13.8, roa: 5.8, debtToEquity: 1.2,
    revenueGrowth: 12.5, profitGrowth: 18.2, dividendYield: 2.8, foreignOwnership: 38.5, foreignNetBuy: 8,
    weekChange52: 15.2, high52w: 36000, low52w: 25000, beta: 0.88, rsi14: 48,
    macdSignal: "Trung tính", ma20Trend: "Dưới MA20", signal: "Nắm giữ", sparkline: genSparkline(33000, 350),
  },
  {
    ticker: "IDC", companyName: "Tổng Công ty IDICO", sector: "Xây dựng", exchange: "HNX",
    currentPrice: 42500, priceChange: 500, priceChangePercent: 1.19, volume: 1500000, avgVolume10d: 1200000,
    marketCap: 13500, pe: 8.5, pb: 1.8, eps: 5000, roe: 21.2, roa: 8.5, debtToEquity: 1.5,
    revenueGrowth: 25.5, profitGrowth: 35.2, dividendYield: 3.5, foreignOwnership: 22.5, foreignNetBuy: 12,
    weekChange52: 28.5, high52w: 45000, low52w: 30000, beta: 1.05, rsi14: 62,
    macdSignal: "Mua", ma20Trend: "Trên MA20", signal: "Mua", sparkline: genSparkline(41500, 450),
  },
  {
    ticker: "DDV", companyName: "Công ty CP DAP – VINACHEM", sector: "Hóa chất", exchange: "UPCOM",
    currentPrice: 18500, priceChange: -100, priceChangePercent: -0.54, volume: 450000, avgVolume10d: 380000,
    marketCap: 2200, pe: 5.8, pb: 0.9, eps: 3190, roe: 15.5, roa: 8.5, debtToEquity: 0.8,
    revenueGrowth: -5.2, profitGrowth: -8.5, dividendYield: 6.5, foreignOwnership: 2.5, foreignNetBuy: -1,
    weekChange52: -8.5, high52w: 22000, low52w: 15000, beta: 0.78, rsi14: 38,
    macdSignal: "Bán", ma20Trend: "Dưới MA20", signal: "Bán", sparkline: genSparkline(19000, 250),
  },
  {
    ticker: "BSR", companyName: "Công ty CP Lọc Hóa Dầu Bình Sơn", sector: "Dầu khí", exchange: "UPCOM",
    currentPrice: 22500, priceChange: 300, priceChangePercent: 1.35, volume: 2800000, avgVolume10d: 2500000,
    marketCap: 28000, pe: 6.5, pb: 1.1, eps: 3462, roe: 17.2, roa: 8.2, debtToEquity: 1.0,
    revenueGrowth: 8.5, profitGrowth: 12.5, dividendYield: 5.2, foreignOwnership: 5.5, foreignNetBuy: 5,
    weekChange52: 12.5, high52w: 25000, low52w: 18000, beta: 0.85, rsi14: 55,
    macdSignal: "Trung tính", ma20Trend: "Trên MA20", signal: "Nắm giữ", sparkline: genSparkline(22000, 300),
  },
];
