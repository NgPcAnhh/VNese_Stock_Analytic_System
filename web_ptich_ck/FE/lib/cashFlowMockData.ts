// ==================== CASH FLOW STATEMENT MOCK DATA ====================

// ===== ROW 1: Efficiency & Self-Funding =====
export interface EfficiencyMetric {
  title: string;
  value: number;
  suffix: string;
  barPercent: number;
  barColor: string;
  subtitle: string;
}

export const efficiencyMetrics: EfficiencyMetric[] = [
  {
    title: "CAPEX / Khấu hao (Tỷ lệ bù đắp TS)",
    value: 1.32,
    suffix: "x",
    barPercent: 66,
    barColor: "bg-orange-500",
    subtitle: "Đang mở rộng quy mô (> 1.0x)",
  },
  {
    title: "Cổ tức tiền mặt / FCF",
    value: 65,
    suffix: "%",
    barPercent: 65,
    barColor: "bg-blue-500",
    subtitle: "Trả cổ tức hào phóng, giữ lại 35% cho dự phòng",
  },
  {
    title: "Cash Flow Coverage (CFO / Nợ vay)",
    value: 45,
    suffix: "%",
    barPercent: 45,
    barColor: "bg-green-500",
    subtitle: "Đủ trả hết nợ vay trong ~2 năm bằng tiền từ HĐKD",
  },
];

export const selfFundingData = {
  cfo: 11500,
  capex: 3300,
  fcf: 8200,
  capexCoverage: 3.48,
  dividendCoverage: 1.5,
};

// ===== ROW 2: Earnings Quality =====
export const earningsQualityYears = ["2020", "2021", "2022", "2023", "2024"];

export const earningsQualityData = {
  netIncome: [100, 120, 140, 135, 150],
  ocf: [105, 130, 150, 140, 190],
};

// ===== ROW 3: 3 Cash Flows & Allocation =====
export const threeCashFlows = {
  years: ["2020", "2021", "2022", "2023", "2024"],
  cfo: [80, 100, 130, 140, 170],
  cfi: [-50, -60, -80, -70, -90],
  cff: [-40, -30, -20, -50, -60],
};

export const cashFlowInsight =
  "Dòng tiền OCF dương và tăng trưởng đủ bù đắp CAPEX.";

export const investmentAllocation = {
  years: ["2020", "2021", "2022", "2023", "2024"],
  fcf: [30, 50, 80, 70, 110],
  dividends: [25, 40, 50, 45, 55],
};

// ===== ROW 4: Waterfall =====
export interface WaterfallItem {
  name: string;
  base: number;
  value: number;
  color: string;
  isTotal?: boolean;
}

export const waterfallData: WaterfallItem[] = [
  { name: "Tiền đầu kỳ", base: 0, value: 2000, color: "#9CA3AF", isTotal: true },
  { name: "+ CFO", base: 2000, value: 10500, color: "#00C076" },
  { name: "- CAPEX", base: 12500, value: -3300, color: "#F97316" },
  { name: "- Trả nợ/Cổ tức", base: 9200, value: -4700, color: "#EF4444" },
  { name: "= Tiền cuối kỳ", base: 0, value: 4500, color: "#3B82F6", isTotal: true },
];

export const waterfallNetChange = 2500;
