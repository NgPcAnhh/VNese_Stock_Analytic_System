// ==================== BALANCE SHEET DEEP DIVE MOCK DATA ====================

export interface OverviewStat {
  label: string;
  value: number;
  unit: string;
  yoyPercent?: number;
  yoyDirection?: "up" | "down";
  subLabel: string;
  subLabelColor: "green" | "red" | "purple" | "gray";
  borderColor: string; // Tailwind border-t color
}

export interface HealthIndicator {
  title: string;
  value: number;
  suffix: string;
  barPercent: number;
  barColor: string;
  status: string;
  statusColor: string;
}

export interface TrendYear {
  year: string;
  equity: number;
  liabilities: number;
  shortTermDebt: number;
  longTermDebt: number;
}

export interface InventoryItem {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface LeverageItem {
  title: string;
  subtitle: string;
  value: number;
  suffix: string;
  barPercent: number;
  barColor: string;
  safeLabel: string;
}

export interface LiquidityItem {
  title: string;
  value: number;
  suffix: string;
  barPercent: number;
  barColor: string;
}

export interface TableRow {
  label: string;
  level: "main" | "sub" | "detail";
  values: (number | null)[];
  change?: number | null;
  yoyPercent?: number | null;
  totalPercent?: number | null;
}

// ==================== OVERVIEW STATS (ROW 1) ====================
export const overviewStats: OverviewStat[] = [
  {
    label: "TỔNG TÀI SẢN",
    value: 152400,
    unit: "Tỷ VND",
    yoyPercent: 8.5,
    yoyDirection: "up",
    subLabel: "Mở rộng",
    subLabelColor: "gray",
    borderColor: "border-t-orange-500",
  },
  {
    label: "VỐN CHỦ SỞ HỮU",
    value: 85200,
    unit: "Tỷ VND",
    yoyPercent: 5.2,
    yoyDirection: "up",
    subLabel: "Bền vững",
    subLabelColor: "green",
    borderColor: "border-t-orange-400",
  },
  {
    label: "TỔNG NỢ PHẢI TRẢ",
    value: 67200,
    unit: "Tỷ VND",
    yoyPercent: 12,
    yoyDirection: "up",
    subLabel: "Nợ chiếm dụng tăng",
    subLabelColor: "red",
    borderColor: "border-t-red-500",
  },
  {
    label: "VỐN LƯU ĐỘNG RÒNG",
    value: 18500,
    unit: "Tỷ VND",
    subLabel: "Thanh khoản dư thừa",
    subLabelColor: "green",
    borderColor: "border-t-purple-500",
  },
];

// ==================== HEALTH INDICATORS (ROW 2) ====================
export const altmanZScore = {
  value: 3.25,
  label: "Vùng An Toàn (> 2.99)",
  color: "#00C076",
};

export const healthIndicators: HealthIndicator[] = [
  {
    title: "Nợ Vay Ròng / EBITDA",
    value: 0.8,
    suffix: "x",
    barPercent: 27,
    barColor: "bg-blue-500",
    status: "Rất tốt (< 1.5x)",
    statusColor: "text-gray-500",
  },
  {
    title: "Khả năng trả lãi (ICR)",
    value: 18.5,
    suffix: "x",
    barPercent: 85,
    barColor: "bg-green-500",
    status: "Dư thừa (> 2.0x)",
    statusColor: "text-gray-500",
  },
  {
    title: "Tỷ lệ Nợ vay / Vốn hóa",
    value: 12,
    suffix: "%",
    barPercent: 12,
    barColor: "bg-blue-500",
    status: "Cấu trúc vốn an toàn",
    statusColor: "text-gray-500",
  },
  {
    title: "Đòn bẩy hoạt động (DOL)",
    value: 1.4,
    suffix: "x",
    barPercent: 35,
    barColor: "bg-green-500",
    status: "Độ nhạy lợi nhuận thấp",
    statusColor: "text-gray-500",
  },
];

// ==================== ASSET STRUCTURE (ROW 3 - Donuts) ====================
export const assetStructure = {
  shortTerm: 45,
  longTerm: 55,
  label: "Asset-Heavy?",
};

export const capitalStructure = {
  debtToEquity: 0.78,
  bankLoanPercent: 25,
  bankLoanLabel: "Nợ chiếm dụng là chủ yếu",
  equity: 56,
  liabilities: 44,
};

// ==================== TREND DATA (ROW 3 - 5 Year) ====================
export const trendData: TrendYear[] = [
  { year: "2020", equity: 50, liabilities: 50, shortTermDebt: 100, longTermDebt: 150 },
  { year: "2021", equity: 51, liabilities: 49, shortTermDebt: 120, longTermDebt: 180 },
  { year: "2022", equity: 52, liabilities: 48, shortTermDebt: 130, longTermDebt: 200 },
  { year: "2023", equity: 53, liabilities: 47, shortTermDebt: 140, longTermDebt: 250 },
  { year: "2024", equity: 55, liabilities: 45, shortTermDebt: 150, longTermDebt: 300 },
];

export const trendInsights = {
  assetCapital:
    "Tỷ lệ Vốn chủ sở hữu tăng dần qua các năm (từ 50% lên 55%), cho thấy doanh nghiệp đang tích lũy lợi nhuận tốt và giảm phụ thuộc vào nợ vay bên ngoài.",
  debtPayment:
    "Nợ vay ngắn hạn có xu hướng tăng nhẹ để phục vụ vốn lưu động, tuy nhiên chỉ số thanh khoản nhanh (Quick Ratio) vẫn duy trì > 0.8, đảm bảo an toàn.",
};

// ==================== INVENTORY (ROW 4) ====================
export const inventoryItems: InventoryItem[] = [
  { label: "Nguyên vật liệu", value: 5200, percent: 45, color: "bg-blue-500" },
  { label: "Thành phẩm", value: 4060, percent: 35, color: "bg-orange-500" },
  { label: "Chi phí SXKD dở dang", value: 1160, percent: 10, color: "bg-gray-400" },
  { label: "Hàng đi đường/Gửi bán", value: 1160, percent: 10, color: "bg-gray-300" },
];

export const inventoryStats = {
  rawMaterial: 45,
  finishedGoods: 35,
  turnover: 6.5,
};

// ==================== LEVERAGE (ROW 4) ====================
export const leverageItems: LeverageItem[] = [
  {
    title: "Nợ Vay / Vốn Chủ (D/E)",
    subtitle: "An toàn < 1.0",
    value: 0.78,
    suffix: "x",
    barPercent: 39,
    barColor: "bg-purple-500",
    safeLabel: "",
  },
  {
    title: "Nợ Vay / Tổng Tài Sản (D/A)",
    subtitle: "Mức đệ từ chí",
    value: 0.44,
    suffix: "x",
    barPercent: 44,
    barColor: "bg-blue-500",
    safeLabel: "",
  },
  {
    title: "Hệ số Nhân Vốn Chủ (Equity Multiplier)",
    subtitle: "Tài sản / Vốn chủ",
    value: 1.78,
    suffix: "x",
    barPercent: 59,
    barColor: "bg-orange-500",
    safeLabel: "",
  },
  {
    title: "Nợ dài hạn / Tổng Nguồn Vốn",
    subtitle: "Ổn định vốn",
    value: 14.5,
    suffix: "%",
    barPercent: 14.5,
    barColor: "bg-green-500",
    safeLabel: "",
  },
];

// ==================== CCC (ROW 5) ====================
export const cccData = {
  inventoryDays: 45,
  receivableDays: 30,
  payableDays: 25,
  cycleDays: 50,
};

// ==================== LIQUIDITY (ROW 5) ====================
export const liquidityData: LiquidityItem[] = [
  { title: "Current Ratio", value: 1.8, suffix: "x", barPercent: 72, barColor: "bg-green-500" },
  { title: "Quick Ratio", value: 1.2, suffix: "x", barPercent: 60, barColor: "bg-green-500" },
  { title: "Cash Ratio", value: 0.5, suffix: "x", barPercent: 25, barColor: "bg-orange-400" },
];

// ==================== DETAILED TABLE (ROW 6) ====================
export const balanceSheetTableData: TableRow[] = [
  // TÀI SẢN NGẮN HẠN
  { label: "TÀI SẢN NGẮN HẠN", level: "sub", values: [400, 450, 500, 550, 600], change: 50, yoyPercent: 9.1, totalPercent: 60.0 },
  { label: "Tiền & Tương đương tiền", level: "detail", values: [50, 60, 80, 70, 100], change: 30, yoyPercent: 42.9, totalPercent: 10.0 },
  { label: "Phải thu khách hàng", level: "detail", values: [150, 180, 200, 220, 240], change: 20, yoyPercent: 9.1, totalPercent: 24.0 },
  { label: "Hàng tồn kho", level: "detail", values: [200, 210, 220, 260, 260], change: 0, yoyPercent: 0.0, totalPercent: 26.0 },
  // TÀI SẢN DÀI HẠN
  { label: "TÀI SẢN DÀI HẠN", level: "sub", values: [300, 320, 350, 380, 400], change: 20, yoyPercent: 5.3, totalPercent: 40.0 },
  { label: "Tài sản cố định (Net)", level: "detail", values: [250, 270, 300, 330, 350], change: 20, yoyPercent: 6.1, totalPercent: 35.0 },
  // TỔNG TÀI SẢN
  { label: "TỔNG TÀI SẢN", level: "main", values: [700, 770, 850, 930, 1000], change: 70, yoyPercent: 7.5, totalPercent: 100.0 },
  // NỢ PHẢI TRẢ
  { label: "NỢ PHẢI TRẢ", level: "sub", values: [350, 380, 400, 420, 450], change: 30, yoyPercent: 7.1, totalPercent: 45.0 },
  { label: "Phải trả người bán", level: "detail", values: [100, 110, 120, 130, 140], change: 10, yoyPercent: 7.7, totalPercent: 14.0 },
  { label: "Vay ngắn hạn", level: "detail", values: [100, 120, 130, 140, 150], change: 10, yoyPercent: 7.1, totalPercent: 15.0 },
  { label: "Vay dài hạn", level: "detail", values: [150, 150, 150, 150, 160], change: 10, yoyPercent: 6.7, totalPercent: 16.0 },
  // VỐN CHỦ SỞ HỮU
  { label: "VỐN CHỦ SỞ HỮU", level: "sub", values: [350, 390, 450, 510, 550], change: 40, yoyPercent: 7.8, totalPercent: 55.0 },
  { label: "Vốn góp", level: "detail", values: [200, 200, 200, 250, 250], change: 0, yoyPercent: 0, totalPercent: 25.0 },
  { label: "LN sau thuế chưa PP", level: "detail", values: [150, 190, 250, 260, 300], change: 40, yoyPercent: 15.4, totalPercent: 30.0 },
  // TỔNG NGUỒN VỐN
  { label: "TỔNG NGUỒN VỐN", level: "main", values: [700, 770, 850, 930, 1000], change: 70, yoyPercent: 7.5, totalPercent: 100.0 },
];

export const tableYears = ["2020", "2021", "2022", "2023", "2024"];
export const tableCompareLabel = "So sánh 2023 - 2024";
