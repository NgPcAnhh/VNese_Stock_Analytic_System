// ==================== MOCK DATA: Balance Sheet DeepDive ====================

export interface OverviewStatCard {
  label: string;
  value: string;
  rawValue: number;
  yoyChange: number | null;
  yoyLabel: string;
  badgeText: string;
  borderColor: string;
}

export interface GaugeData {
  zScore: number;
  zoneLabel: string;
  zoneColor: string;
}

export interface HealthMetric {
  title: string;
  value: string;
  rawValue: number;
  max: number;
  barPercent: number;
  status: "good" | "warning" | "danger";
  subtitle: string;
  color: string;
}

export interface DonutItem {
  name: string;
  value: number;
  rawValue?: number;
  color: string;
  details?: { name: string; value: number; rawValue?: number }[];
}

export interface TrendYearData {
  year: string | number;
  currentAssetsPct: number;
  nonCurrentAssetsPct: number;
  equityPct: number;
  liabilitiesPct: number;
  shortTermDebt: number;
  longTermDebt: number;
  equity: number;
  currentRatio: number;
}

export interface InventoryItem {
  name: string;
  value: number;
  percent: number;
  color: string;
}

export interface LeverageItem {
  title: string;
  value: string;
  rawValue: number | null;
  status: "good" | "warning" | "danger";
  statusLabel: string;
  colorHex: string;
  riskScore: number;
  markerPercent: number;
  segments: { width: number; color: string }[];
  trend: number[];
}

export interface CCCData {
  inventoryDays: number;
  receivableDays: number;
  payableDays: number;
  cycleDays: number;
}

export interface LiquidityItem {
  title: string;
  value: number;
  max: number;
  status: "good" | "warning" | "danger";
}

export interface TableRow {
  label: string;
  level: "main" | "sub" | "detail";
  values: (number | null)[];
  change: number | null;
  yoyPct: number | null;
  pctTotal: number | null;
  children?: TableRow[];
}

// ── 1. Overview Stats (ROW 1) ──
export const overviewStats: OverviewStatCard[] = [
  {
    label: "Tổng tài sản",
    value: "152,400",
    rawValue: 152400,
    yoyChange: 8.5,
    yoyLabel: "+8.5%",
    badgeText: "Mở rộng",
    borderColor: "border-t-[#F97316]",
  },
  {
    label: "Vốn chủ sở hữu",
    value: "85,200",
    rawValue: 85200,
    yoyChange: 5.2,
    yoyLabel: "+5.2%",
    badgeText: "Bền vững",
    borderColor: "border-t-[#F97316]",
  },
  {
    label: "Tổng nợ phải trả",
    value: "67,200",
    rawValue: 67200,
    yoyChange: 12.0,
    yoyLabel: "+12.0%",
    badgeText: "Nợ chiếm dụng tăng",
    borderColor: "border-t-[#EF4444]",
  },
  {
    label: "Vốn lưu động ròng",
    value: "18,500",
    rawValue: 18500,
    yoyChange: null,
    yoyLabel: "",
    badgeText: "Thanh khoản dư thừa",
    borderColor: "border-t-[#8B5CF6]",
  },
];

// ── 2. Health Indicators (ROW 2) ──
export const gaugeData: GaugeData = {
  zScore: 3.25,
  zoneLabel: "Vùng An Toàn (> 2.99)",
  zoneColor: "#00C076",
};

export const healthMetrics: HealthMetric[] = [
  {
    title: "Nợ Vay Ròng / EBITDA",
    value: "0.8x",
    rawValue: 0.8,
    max: 5,
    barPercent: 16,
    status: "good",
    subtitle: "Rất tốt < 1.5x",
    color: "#00C076",
  },
  {
    title: "Khả năng trả lãi (ICR)",
    value: "12.5x",
    rawValue: 12.5,
    max: 20,
    barPercent: 62,
    status: "good",
    subtitle: "An toàn > 3x",
    color: "#00C076",
  },
  {
    title: "Tỷ lệ Nợ vay / Vốn hóa",
    value: "28%",
    rawValue: 28,
    max: 100,
    barPercent: 28,
    status: "warning",
    subtitle: "Trung bình < 40%",
    color: "#F59E0B",
  },
  {
    title: "Đòn bẩy hoạt động",
    value: "1.35x",
    rawValue: 1.35,
    max: 3,
    barPercent: 45,
    status: "warning",
    subtitle: "Trung bình < 2x",
    color: "#F59E0B",
  },
];

// ── 3. Donut Charts (ROW 3 Top) ──
export const assetStructure: DonutItem[] = [
  { name: "Tài sản ngắn hạn", value: 45, color: "#F97316", details: [{name: "Tiền", value: 10}, {name: "Phải thu", value: 15}] },
  { name: "Tài sản dài hạn", value: 55, color: "#8B5CF6", details: [{name: "TSCĐ", value: 40}, {name: "Khác", value: 15}] },
];

export const capitalStructure: DonutItem[] = [
  { name: "Vốn chủ sở hữu", value: 56, color: "#00C076", details: [{name: "Vốn góp", value: 30}, {name: "LN chưa PP", value: 26}] },
  { name: "Nợ phải trả", value: 44, color: "#F97316", details: [{name: "Nợ ngắn hạn", value: 24}, {name: "Nợ dài hạn", value: 20}] },
];

// ── 4. Trend Data (ROW 3 Bottom) ──
export const trendData: TrendYearData[] = [
  { year: 2020, currentAssetsPct: 50, nonCurrentAssetsPct: 50, equityPct: 52, liabilitiesPct: 48, shortTermDebt: 28000, longTermDebt: 18000, equity: 62000, currentRatio: 1.4 },
  { year: 2021, currentAssetsPct: 48, nonCurrentAssetsPct: 52, equityPct: 53, liabilitiesPct: 47, shortTermDebt: 30000, longTermDebt: 17500, equity: 66000, currentRatio: 1.5 },
  { year: 2022, currentAssetsPct: 46, nonCurrentAssetsPct: 54, equityPct: 54, liabilitiesPct: 46, shortTermDebt: 31000, longTermDebt: 17000, equity: 72000, currentRatio: 1.6 },
  { year: 2023, currentAssetsPct: 44, nonCurrentAssetsPct: 56, equityPct: 55, liabilitiesPct: 45, shortTermDebt: 33000, longTermDebt: 16500, equity: 78000, currentRatio: 1.7 },
  { year: 2024, currentAssetsPct: 45, nonCurrentAssetsPct: 55, equityPct: 56, liabilitiesPct: 44, shortTermDebt: 35000, longTermDebt: 16000, equity: 85200, currentRatio: 1.8 },
];

// ── 5. Inventory Data (ROW 4 Left) ──
export const inventoryData: InventoryItem[] = [
  { name: "Nguyên vật liệu", value: 4200, percent: 35, color: "#3B82F6" },
  { name: "Thành phẩm", value: 3600, percent: 30, color: "#F97316" },
  { name: "Chi phí dở dang", value: 2400, percent: 20, color: "#9CA3AF" },
  { name: "Hàng đi đường", value: 1800, percent: 15, color: "#6B7280" },
];

export const inventoryFooter = {
  totalInventory: "12,000",
  inventoryTurnover: "5.2x",
  inventoryDays: "70 ngày",
};

// ── 6. Leverage Items (ROW 4 Right) ──
export const leverageItems: LeverageItem[] = [
  {
    title: "D/E (Nợ / Vốn chủ sở hữu)",
    value: "0.79x",
    rawValue: 0.79,
    status: "good",
    statusLabel: "Tốt",
    colorHex: "#22c55e",
    riskScore: 0,
    markerPercent: 26.3,
    segments: [
      { width: 33.3, color: "#22c55e" },
      { width: 33.3, color: "#f59e0b" },
      { width: 33.4, color: "#ef4444" },
    ],
    trend: [0.95, 0.88, 0.84, 0.81, 0.79],
  },
  {
    title: "D/A (Nợ / Tổng tài sản)",
    value: "44.1%",
    rawValue: 44.1,
    status: "good",
    statusLabel: "Tốt",
    colorHex: "#22c55e",
    riskScore: 0,
    markerPercent: 44.1,
    segments: [
      { width: 50, color: "#22c55e" },
      { width: 20, color: "#f59e0b" },
      { width: 30, color: "#ef4444" },
    ],
    trend: [47.5, 46.8, 45.6, 44.8, 44.1],
  },
  {
    title: "Interest Coverage (EBIT / Chi phí lãi vay)",
    value: "4.20x",
    rawValue: 4.2,
    status: "good",
    statusLabel: "Tốt",
    colorHex: "#22c55e",
    riskScore: 0,
    markerPercent: 70,
    segments: [
      { width: 16.7, color: "#ef4444" },
      { width: 33.3, color: "#f59e0b" },
      { width: 50, color: "#22c55e" },
    ],
    trend: [3.3, 3.5, 3.8, 4.0, 4.2],
  },
  {
    title: "Net Debt / EBITDA",
    value: "1.60x",
    rawValue: 1.6,
    status: "good",
    statusLabel: "Tốt",
    colorHex: "#22c55e",
    riskScore: 0,
    markerPercent: 26.7,
    segments: [
      { width: 33.3, color: "#22c55e" },
      { width: 33.3, color: "#f59e0b" },
      { width: 33.4, color: "#ef4444" },
    ],
    trend: [2.1, 2.0, 1.9, 1.7, 1.6],
  },
  {
    title: "Nợ ngắn hạn / Tổng nợ",
    value: "52.0%",
    rawValue: 52,
    status: "warning",
    statusLabel: "Trung bình",
    colorHex: "#f59e0b",
    riskScore: 1,
    markerPercent: 52,
    segments: [
      { width: 40, color: "#22c55e" },
      { width: 20, color: "#f59e0b" },
      { width: 40, color: "#ef4444" },
    ],
    trend: [49, 50, 50.5, 51.2, 52],
  },
];

// ── 7. CCC Data (ROW 5 Left) ──
export const cccData: CCCData = {
  inventoryDays: 45,
  receivableDays: 30,
  payableDays: 25,
  cycleDays: 50,
};

// ── 8. Liquidity Data (ROW 5 Right) ──
export const liquidityItems: LiquidityItem[] = [
  { title: "Current Ratio", value: 1.82, max: 3, status: "good" },
  { title: "Quick Ratio", value: 1.25, max: 3, status: "good" },
  { title: "Cash Ratio", value: 0.45, max: 2, status: "warning" },
];

// ── 9. Detailed Table Data (ROW 6) ──
export const tableHeaders = ["Chỉ tiêu", "2020", "2021", "2022", "2023", "2024", "Thay đổi", "% YoY", "% Total '24"];

export const tableData: TableRow[] = [
  {
    label: "TỔNG TÀI SẢN",
    level: "main",
    values: [120000, 128000, 135000, 140500, 152400],
    change: 11900,
    yoyPct: 8.5,
    pctTotal: 100,
    children: [
      {
        label: "Tài sản ngắn hạn",
        level: "sub",
        values: [60000, 61440, 62100, 61820, 68580],
        change: 6760,
        yoyPct: 10.9,
        pctTotal: 45.0,
        children: [
          { label: "Tiền & Tương đương tiền", level: "detail", values: [8500, 9200, 8800, 10200, 12500], change: 2300, yoyPct: 22.5, pctTotal: 8.2 },
          { label: "Đầu tư tài chính ngắn hạn", level: "detail", values: [15000, 14500, 15200, 14800, 16000], change: 1200, yoyPct: 8.1, pctTotal: 10.5 },
          { label: "Phải thu ngắn hạn", level: "detail", values: [18000, 19200, 18500, 17520, 19080], change: 1560, yoyPct: 8.9, pctTotal: 12.5 },
          { label: "Hàng tồn kho", level: "detail", values: [14000, 13540, 14600, 14300, 15000], change: 700, yoyPct: 4.9, pctTotal: 9.8 },
          { label: "Tài sản ngắn hạn khác", level: "detail", values: [4500, 5000, 5000, 5000, 6000], change: 1000, yoyPct: 20.0, pctTotal: 3.9 },
        ],
      },
      {
        label: "Tài sản dài hạn",
        level: "sub",
        values: [60000, 66560, 72900, 78680, 83820],
        change: 5140,
        yoyPct: 6.5,
        pctTotal: 55.0,
        children: [
          { label: "Tài sản cố định", level: "detail", values: [35000, 38000, 42000, 45000, 47500], change: 2500, yoyPct: 5.6, pctTotal: 31.2 },
          { label: "Bất động sản đầu tư", level: "detail", values: [5000, 5500, 6000, 6200, 6500], change: 300, yoyPct: 4.8, pctTotal: 4.3 },
          { label: "Đầu tư tài chính dài hạn", level: "detail", values: [12000, 14000, 15500, 17000, 18500], change: 1500, yoyPct: 8.8, pctTotal: 12.1 },
          { label: "Tài sản dài hạn khác", level: "detail", values: [8000, 9060, 9400, 10480, 11320], change: 840, yoyPct: 8.0, pctTotal: 7.4 },
        ],
      },
    ],
  },
  {
    label: "TỔNG NỢ PHẢI TRẢ",
    level: "main",
    values: [46000, 47500, 48000, 60000, 67200],
    change: 7200,
    yoyPct: 12.0,
    pctTotal: 44.1,
    children: [
      {
        label: "Nợ ngắn hạn",
        level: "sub",
        values: [28000, 30000, 31000, 43500, 51200],
        change: 7700,
        yoyPct: 17.7,
        pctTotal: 33.6,
        children: [
          { label: "Vay ngắn hạn", level: "detail", values: [10000, 11000, 12000, 18000, 22000], change: 4000, yoyPct: 22.2, pctTotal: 14.4 },
          { label: "Phải trả người bán ngắn hạn", level: "detail", values: [12000, 13000, 12500, 16000, 18200], change: 2200, yoyPct: 13.8, pctTotal: 11.9 },
          { label: "Người mua trả tiền trước", level: "detail", values: [2000, 2500, 3000, 4500, 5000], change: 500, yoyPct: 11.1, pctTotal: 3.3 },
          { label: "Nợ ngắn hạn khác", level: "detail", values: [4000, 3500, 3500, 5000, 6000], change: 1000, yoyPct: 20.0, pctTotal: 3.9 },
        ],
      },
      {
        label: "Nợ dài hạn",
        level: "sub",
        values: [18000, 17500, 17000, 16500, 16000],
        change: -500,
        yoyPct: -3.0,
        pctTotal: 10.5,
        children: [
          { label: "Vay dài hạn", level: "detail", values: [12000, 11500, 11000, 10500, 10000], change: -500, yoyPct: -4.8, pctTotal: 6.6 },
          { label: "Nợ dài hạn khác", level: "detail", values: [6000, 6000, 6000, 6000, 6000], change: 0, yoyPct: 0, pctTotal: 3.9 },
        ],
      },
    ],
  },
  {
    label: "VỐN CHỦ SỞ HỮU",
    level: "main",
    values: [74000, 80500, 87000, 80500, 85200],
    change: 4700,
    yoyPct: 5.8,
    pctTotal: 55.9,
    children: [
      { label: "Vốn góp chủ sở hữu", level: "sub", values: [35000, 35000, 35000, 35000, 35000], change: 0, yoyPct: 0, pctTotal: 23.0 },
      { label: "Thặng dư vốn cổ phần", level: "sub", values: [5000, 5000, 5000, 5000, 5000], change: 0, yoyPct: 0, pctTotal: 3.3 },
      { label: "Lợi nhuận chưa phân phối", level: "sub", values: [28000, 33500, 39000, 33500, 37200], change: 3700, yoyPct: 11.0, pctTotal: 24.4 },
      { label: "Quỹ đầu tư phát triển", level: "sub", values: [4000, 5000, 6000, 5000, 6000], change: 1000, yoyPct: 20.0, pctTotal: 3.9 },
      { label: "Lợi ích cổ đông không kiểm soát", level: "sub", values: [2000, 2000, 2000, 2000, 2000], change: 0, yoyPct: 0, pctTotal: 1.3 },
    ],
  },
];
