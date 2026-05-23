// ==================== MOCK DATA: Income Statement DeepDive ====================

// ── ROW 1: Key Metric Cards ──
export interface IncomeMetricCard {
  label: string;
  value: string;
  borderColor: string;
  badges: { text: string; color: string }[];
  listItems?: { label: string; value: string }[];
}

export const incomeMetricCards: IncomeMetricCard[] = [
  {
    label: "Doanh thu thuần",
    value: "56,300",
    borderColor: "border-l-[#3B82F6]",
    badges: [{ text: "+5.4% YoY", color: "#00C076" }],
  },
  {
    label: "Lợi nhuận gộp",
    value: "23,900",
    borderColor: "border-l-[#F97316]",
    badges: [{ text: "Biên gộp: 42.5%", color: "#F97316" }],
  },
  {
    label: "Lợi nhuận ròng",
    value: "9,200",
    borderColor: "border-l-[#F97316]",
    badges: [
      { text: "+10% YoY", color: "#00C076" },
      { text: "ROS: 16.3%", color: "#8B5CF6" },
    ],
  },
  {
    label: "Hiệu quả sinh lời (TTM)",
    value: "",
    borderColor: "border-l-[#8B5CF6]",
    badges: [],
    listItems: [
      { label: "ROS", value: "16.3%" },
      { label: "ROA", value: "14.8%" },
      { label: "ROE", value: "22.5%" },
    ],
  },
];

// ── ROW 2: DuPont 5-Factor ──
export interface DuPontFactor {
  label: string;
  value: number;
  sub: string;
}

export const dupontFactors: DuPontFactor[] = [
  { label: "Gánh nặng thuế", value: 0.80, sub: "Net Income / EBT" },
  { label: "Gánh nặng lãi vay", value: 0.92, sub: "EBT / EBIT" },
  { label: "Biên EBIT", value: 0.21, sub: "EBIT / Revenue" },
  { label: "Vòng quay tài sản", value: 0.85, sub: "Revenue / Avg Assets" },
  { label: "Đòn bẩy tài chính", value: 1.79, sub: "Avg Assets / Equity" },
];

export const dupontResult = { label: "ROE", value: 22.5 };

export interface DuPontTreeNode {
  label: string;
  value: string;
  color: string;
  children?: DuPontTreeNode[];
}

export const dupontTree: DuPontTreeNode = {
  label: "ROE",
  value: "22.5%",
  color: "#F97316",
  children: [
    {
      label: "ROA",
      value: "14.8%",
      color: "#3B82F6",
      children: [
        { label: "ROS (Biên ròng)", value: "16.3%", color: "#00C076" },
        { label: "Vòng quay TS", value: "0.85x", color: "#8B5CF6" },
      ],
    },
    { label: "Đòn bẩy TC", value: "1.79x", color: "#EF4444" },
  ],
};

export const rosBreakdown = [
  { label: "Gross Margin (Biên gộp)", value: 42.5, color: "#3B82F6" },
  { label: "Operating Margin (Biên HĐKD)", value: 21.0, color: "#F97316" },
  { label: "ROS (Biên ròng)", value: 16.3, color: "#00C076" },
];

// ── ROW 3: Revenue & Cost Trends ──
export interface TrendYear {
  year: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
}

export const revenueTrend: TrendYear[] = [
  { year: 2020, revenue: 42000, cogs: 25200, grossProfit: 16800 },
  { year: 2021, revenue: 46500, cogs: 27450, grossProfit: 19050 },
  { year: 2022, revenue: 51200, cogs: 30210, grossProfit: 20990 },
  { year: 2023, revenue: 53400, cogs: 31500, grossProfit: 21900 },
  { year: 2024, revenue: 56300, cogs: 32400, grossProfit: 23900 },
];

export interface CostStructureItem {
  name: string;
  value: number;
  color: string;
}

export const costStructure: CostStructureItem[] = [
  { name: "Giá vốn (COGS)", value: 57.5, color: "#F97316" },
  { name: "Chi phí BH & QL", value: 18.2, color: "#8B5CF6" },
  { name: "Chi phí thuế", value: 4.0, color: "#3B82F6" },
  { name: "Lợi nhuận ròng", value: 16.3, color: "#00C076" },
  { name: "Khác", value: 4.0, color: "#9CA3AF" },
];

// ── ROW 4: Growth & Efficiency ──
export interface GrowthYear {
  year: number;
  revenueGrowth: number;
  netProfitGrowth: number;
}

export const growthData: GrowthYear[] = [
  { year: 2020, revenueGrowth: 3.2, netProfitGrowth: 1.5 },
  { year: 2021, revenueGrowth: 10.7, netProfitGrowth: 15.2 },
  { year: 2022, revenueGrowth: 10.1, netProfitGrowth: 8.8 },
  { year: 2023, revenueGrowth: 4.3, netProfitGrowth: -5.2 },
  { year: 2024, revenueGrowth: 5.4, netProfitGrowth: 10.0 },
];

export interface EfficiencyYear {
  year: number;
  costToRevenue: number;
}

export const efficiencyData: EfficiencyYear[] = [
  { year: 2020, costToRevenue: 82.5 },
  { year: 2021, costToRevenue: 80.1 },
  { year: 2022, costToRevenue: 79.8 },
  { year: 2023, costToRevenue: 81.2 },
  { year: 2024, costToRevenue: 79.0 },
];

// ── ROW 5: Segment Charts ──
export const revenueBySegment: CostStructureItem[] = [
  { name: "Sữa nước", value: 35, color: "#F97316" },
  { name: "Sữa bột", value: 25, color: "#3B82F6" },
  { name: "Sữa chua", value: 20, color: "#8B5CF6" },
  { name: "Nước giải khát", value: 12, color: "#00C076" },
  { name: "Khác", value: 8, color: "#9CA3AF" },
];

export const costByCategory: CostStructureItem[] = [
  { name: "Nguyên vật liệu", value: 45, color: "#F97316" },
  { name: "Nhân công", value: 20, color: "#3B82F6" },
  { name: "Khấu hao", value: 15, color: "#8B5CF6" },
  { name: "Marketing", value: 12, color: "#00C076" },
  { name: "Khác", value: 8, color: "#9CA3AF" },
];

export interface FunnelItem {
  name: string;
  value: number;
  color: string;
}

export const profitFunnel: FunnelItem[] = [
  { name: "Doanh Thu", value: 56300, color: "#F97316" },
  { name: "Lợi Nhuận Gộp", value: 23900, color: "#3B82F6" },
  { name: "EBIT", value: 11800, color: "#8B5CF6" },
  { name: "Lợi Nhuận Ròng", value: 9200, color: "#00C076" },
];

// ── ROW 6: Income Statement Table ──
export interface IncomeTableRow {
  label: string;
  indent: number; // 0 = top, 1 = sub, 2 = detail
  isBold: boolean;
  values: (number | null)[];
  growth24: number | null;
}

export const incomeTableHeaders = [
  "Chỉ tiêu",
  "2020",
  "2021",
  "2022",
  "2023",
  "2024",
  "GROWTH '24",
];

export const incomeTableData: IncomeTableRow[] = [
  { label: "Doanh thu thuần", indent: 0, isBold: false, values: [42000, 46500, 51200, 53400, 56300], growth24: 5.4 },
  { label: "Giá vốn hàng bán", indent: 1, isBold: false, values: [25200, 27450, 30210, 31500, 32400], growth24: 2.9 },
  { label: "Lợi nhuận gộp", indent: 0, isBold: true, values: [16800, 19050, 20990, 21900, 23900], growth24: 9.1 },
  { label: "Chi phí bán hàng", indent: 1, isBold: false, values: [5200, 5800, 6400, 6700, 7100], growth24: 6.0 },
  { label: "Chi phí quản lý doanh nghiệp", indent: 1, isBold: false, values: [2100, 2300, 2500, 2700, 2850], growth24: 5.6 },
  { label: "Chi phí tài chính", indent: 2, isBold: false, values: [800, 750, 900, 1100, 950], growth24: -13.6 },
  { label: "Trong đó: Chi phí lãi vay", indent: 2, isBold: false, values: [500, 450, 600, 750, 620], growth24: -17.3 },
  { label: "Doanh thu tài chính", indent: 1, isBold: false, values: [1200, 1400, 1500, 1300, 1600], growth24: 23.1 },
  { label: "Thu nhập khác (ròng)", indent: 1, isBold: false, values: [300, 250, 200, 150, 200], growth24: 33.3 },
  { label: "Lợi nhuận từ HĐKD", indent: 0, isBold: true, values: [10200, 11850, 12890, 12150, 14800], growth24: 21.8 },
  { label: "Chi phí thuế TNDN", indent: 1, isBold: false, values: [2000, 2400, 2600, 2300, 2800], growth24: 21.7 },
  { label: "Lợi nhuận sau thuế TNDN", indent: 0, isBold: true, values: [8200, 9450, 10290, 8400, 9200], growth24: 9.5 },
  { label: "Lợi ích cổ đông thiểu số", indent: 1, isBold: false, values: [200, 250, 300, 250, 300], growth24: 20.0 },
  { label: "Lợi nhuận sau thuế của CĐTS công ty mẹ", indent: 0, isBold: true, values: [8000, 9200, 9990, 8150, 8900], growth24: 9.2 },
  { label: "EPS (VND)", indent: 0, isBold: true, values: [3800, 4380, 4756, 3881, 4237], growth24: 9.2 },
];
