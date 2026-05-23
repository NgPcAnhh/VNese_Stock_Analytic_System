// ==================== INCOME STATEMENT DEEP DIVE MOCK DATA ====================

// ===== ROW 1: Key Metric Cards =====
export interface IncomeOverviewStat {
  label: string;
  value?: number;
  yoyPercent?: number;
  yoyDirection?: "up" | "down";
  subLines: { label: string; value: string; color?: string }[];
  borderColor: string; // Tailwind border-l color
}

export const incomeOverviewStats: IncomeOverviewStat[] = [
  {
    label: "DOANH THU THUẦN",
    value: 56300,
    yoyPercent: 5.4,
    yoyDirection: "up",
    subLines: [],
    borderColor: "border-l-blue-500",
  },
  {
    label: "LỢI NHUẬN GỘP",
    value: 23900,
    subLines: [{ label: "Biên gộp", value: "42.5%" }],
    borderColor: "border-l-orange-500",
  },
  {
    label: "LỢI NHUẬN RÒNG",
    value: 9200,
    subLines: [
      { label: "Tăng trưởng", value: "+10%", color: "text-[#00C076]" },
      { label: "ROS", value: "16.3%" },
    ],
    borderColor: "border-l-orange-500",
  },
  {
    label: "HIỆU QUẢ SINH LỜI (TTM)",
    subLines: [
      { label: "ROS", value: "16.3%", color: "text-[#00C076]" },
      { label: "ROA", value: "14.8%", color: "text-[#F97316]" },
      { label: "ROE", value: "22.5%", color: "text-[#8B5CF6]" },
    ],
    borderColor: "border-l-purple-500",
  },
];

// ===== ROW 2: DuPont 5 Factor =====
export interface DuPontFactor {
  topLabel: string;
  value: string;
  bottomLabel: string;
}

export const duPont5Factors: DuPontFactor[] = [
  { topLabel: "GÁNH NẶNG THUẾ", value: "0.80", bottomLabel: "Net Income / EBT" },
  { topLabel: "GÁNH NẶNG LÃI", value: "0.95", bottomLabel: "EBT / EBIT" },
  { topLabel: "BIÊN HĐ (EBIT)", value: "21.4%", bottomLabel: "EBIT / Revenue" },
  { topLabel: "VÒNG QUAY TS", value: "0.91x", bottomLabel: "Revenue / Assets" },
  { topLabel: "ĐÒN BẨY (A/E)", value: "1.52x", bottomLabel: "Assets / Equity" },
];

export const duPontResult = { label: "ROE", value: "22.5%" };

export const duPontTree = {
  roe: { label: "ROE", value: "22.5%", sub: "Return on Equity" },
  roa: { label: "ROA", value: "14.8%", sub: "Return on Assets" },
  leverage: { label: "Đòn bẩy (A/E)", value: "1.52x", sub: "Tài sản / Vốn chủ" },
  ros: { label: "ROS (Net Margin)", value: "16.3%", sub: "Lãi ròng / Doanh thu" },
  assetTurnover: { label: "Vòng quay TS", value: "0.91x", sub: "Doanh thu / Tài sản" },
};

export const rosBreakdown = [
  { label: "Gross Margin", value: 42.5, color: "bg-blue-500" },
  { label: "Operating Margin", value: 18.2, color: "bg-orange-500" },
  { label: "ROS (Net Margin)", value: 16.3, color: "bg-green-500" },
];

// ===== ROW 3: Revenue & Profit Trends =====
export const revenueTrendYears = ["2020", "2021", "2022", "2023", "2024"];

export const revenueTrendData = {
  revenue: [800, 950, 1050, 1150, 1250],
  cogs: [500, 600, 680, 755, 820],
  grossProfit: [300, 350, 370, 395, 430],
};

export const costStructure = [
  { name: "Giá vốn (COGS)", value: 65.6, color: "#9CA3AF" },
  { name: "Chi phí SG&A", value: 14.4, color: "#F97316" },
  { name: "Lãi vay & Thuế", value: 5.2, color: "#8B5CF6" },
  { name: "Lợi nhuận ròng", value: 14.8, color: "#EF4444" },
];

export const costInsight =
  "Tỷ trọng giá vốn hàng bán (COGS) giảm dần từ 68% xuống 65.6% trong 3 năm qua, cho thấy hiệu quả kinh tế theo quy mô và khả năng đàm phán giá đầu vào tốt hơn.";

// ===== ROW 4: Growth & Efficiency =====
export const growthData = {
  years: ["2021", "2022", "2023", "2024"],
  revenueGrowth: [18.8, 10.5, 9.5, 8.7],
  netProfitGrowth: [16.7, 10.7, -3.2, 23.3],
};

export const sgaEfficiency = {
  years: ["2020", "2021", "2022", "2023", "2024"],
  sgaPercent: [15.0, 14.7, 14.3, 13.9, 14.4],
};

// ===== ROW 5: Segment Charts =====
export const revenueBySegment = [
  { name: "Sữa đóng lon", value: 35, color: "#3B82F6" },
  { name: "Bán lẻ", value: 25, color: "#F97316" },
  { name: "Công nghiệp", value: 20, color: "#00C076" },
  { name: "Dịch vụ", value: 12, color: "#8B5CF6" },
  { name: "FnB", value: 8, color: "#EF4444" },
];

export const costBreakdownPie = [
  { name: "Giá vốn", value: 65.6, color: "#9CA3AF" },
  { name: "Chi phí BH", value: 10.0, color: "#F97316" },
  { name: "Chi phí QLDN", value: 4.4, color: "#FBBF24" },
  { name: "Lãi vay", value: 2.4, color: "#8B5CF6" },
];

export const profitFunnel = [
  { name: "Doanh Thu", value: 56300, color: "#3B82F6" },
  { name: "Lợi nhuận Gộp", value: 23900, color: "#F97316" },
  { name: "EBIT", value: 11800, color: "#8B5CF6" },
  { name: "Lợi nhuận Ròng (NI)", value: 9200, color: "#00C076" },
];

// ===== ROW 6: Income Statement Table =====
export interface IncomeTableRow {
  label: string;
  isBold: boolean;
  isHighlight?: boolean; // orange bg for key totals
  indent: number; // 0 | 1 | 2
  values: (number | null)[];
  growthPercent: number | null;
}

export const incomeTableYears = ["2020", "2021", "2022", "2023", "2024"];

export const incomeStatementTable: IncomeTableRow[] = [
  { label: "Doanh thu thuần", isBold: false, indent: 0, values: [800, 950, 1050, 1150, 1250], growthPercent: 8.7 },
  { label: "Giá vốn hàng bán", isBold: false, indent: 1, values: [500, 600, 680, 755, 820], growthPercent: 8.6 },
  { label: "Lợi nhuận gộp", isBold: true, indent: 0, values: [300, 350, 370, 395, 430], growthPercent: 8.9 },
  { label: "Chi phí bán hàng & QLDN", isBold: false, indent: 1, values: [120, 140, 150, 160, 180], growthPercent: 12.5 },
  { label: "Lợi nhuận từ HĐKD (EBIT)", isBold: true, indent: 0, values: [180, 210, 220, 235, 250], growthPercent: 6.4 },
  { label: "Chi phí lãi vay", isBold: false, indent: 1, values: [20, 25, 30, 35, 30], growthPercent: -14.3 },
  { label: "Lợi nhuận trước thuế", isBold: false, indent: 1, values: [160, 185, 190, 200, 220], growthPercent: 10.0 },
  { label: "Thuế TNDN", isBold: false, indent: 1, values: [40, 45, 35, 50, 35], growthPercent: -30.0 },
  { label: "Lợi nhuận sau thuế", isBold: true, isHighlight: true, indent: 0, values: [120, 140, 155, 150, 185], growthPercent: 23.3 },
  { label: "EPS (VNĐ)", isBold: false, indent: 1, values: [1200, 1400, 1550, 1500, 1850], growthPercent: 23.3 },
];
