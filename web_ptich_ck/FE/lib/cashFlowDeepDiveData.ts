// ==================== CASH FLOW DEEP DIVE MOCK DATA ====================

// --- ROW 1: Efficiency & Self-Funding ---
export interface EfficiencyItem {
  title: string;
  value: string;
  numericValue: number;
  max: number;
  color: string;
  subtitle: string;
}

export interface SelfFundingData {
  cfo: number;
  capex: number;
  fcf: number;
  capexCoverage: number;
  dividendCoverage: number;
}

export const efficiencyMetrics: EfficiencyItem[] = [
  {
    title: "CAPEX / Khấu hao",
    value: "1.32x",
    numericValue: 1.32,
    max: 3,
    color: "#F97316",
    subtitle: "Đang mở rộng quy mô (> 1.0x)",
  },
  {
    title: "Cổ tức tiền mặt / FCF",
    value: "65%",
    numericValue: 0.65,
    max: 1,
    color: "#3B82F6",
    subtitle: "Trả cổ tức hào phóng, vẫn giữ lại dòng tiền",
  },
  {
    title: "Cash Flow Coverage",
    value: "45%",
    numericValue: 0.45,
    max: 1,
    color: "#00C076",
    subtitle: "Đủ trả hết nợ vay trong ~2.2 năm từ OCF",
  },
];

export const selfFundingData: SelfFundingData = {
  cfo: 11500,
  capex: 3300,
  fcf: 8200,
  capexCoverage: 3.48,
  dividendCoverage: 1.5,
};

// --- ROW 2: Earnings Quality ---
export interface EarningsQualityYear {
  year: string;
  netIncome: number;
  ocf: number;
}

export interface EarningsQualityMetric {
  key: string;
  label: string;
  value: string;
  rawValue: number | null;
  status: "good" | "warning" | "danger";
  hint: string;
}

export const earningsQuality: EarningsQualityYear[] = [
  { year: "2020", netIncome: 8500, ocf: 9200 },
  { year: "2021", netIncome: 7800, ocf: 8800 },
  { year: "2022", netIncome: 7200, ocf: 9500 },
  { year: "2023", netIncome: 8100, ocf: 10200 },
  { year: "2024", netIncome: 8900, ocf: 11500 },
];

export const earningsQualityMetrics: EarningsQualityMetric[] = [
  {
    key: "cfoNetIncome",
    label: "CFO / Net Income",
    value: "1.10x",
    rawValue: 1.1,
    status: "good",
    hint: "Dòng tiền hỗ trợ lợi nhuận kế toán tốt",
  },
  {
    key: "accrualRatio",
    label: "Accrual ratio",
    value: "2.3%",
    rawValue: 2.3,
    status: "warning",
    hint: "Khoản dồn tích ở mức trung bình",
  },
  {
    key: "receivablesRevenue",
    label: "Receivables / Revenue",
    value: "18.0%",
    rawValue: 18,
    status: "good",
    hint: "Phải thu đang ở vùng kiểm soát",
  },
  {
    key: "inventoryCogs",
    label: "Inventory / COGS",
    value: "20.5%",
    rawValue: 20.5,
    status: "warning",
    hint: "Cần theo dõi vòng quay tồn kho",
  },
  {
    key: "otherIncomePbt",
    label: "Other income / PBT",
    value: "6.2%",
    rawValue: 6.2,
    status: "good",
    hint: "Lợi nhuận chủ yếu đến từ hoạt động cốt lõi",
  },
];

// --- ROW 3: Three Cash Flows & FCF/Dividend ---
export interface ThreeCashFlowYear {
  year: string;
  cfo: number;
  cfi: number;
  cff: number;
}

export const threeCashFlows: ThreeCashFlowYear[] = [
  { year: "2020", cfo: 9200, cfi: -2800, cff: -5100 },
  { year: "2021", cfo: 8800, cfi: -3100, cff: -4900 },
  { year: "2022", cfo: 9500, cfi: -2600, cff: -5500 },
  { year: "2023", cfo: 10200, cfi: -3000, cff: -5300 },
  { year: "2024", cfo: 11500, cfi: -3300, cff: -5700 },
];

export const insightText =
  "Nhận định: Dòng tiền OCF dương và tăng trưởng ổn định, đủ bù đắp CAPEX và chi trả cổ tức. Doanh nghiệp có khả năng tự tài trợ tốt.";

export interface FCFDividendYear {
  year: string;
  fcf: number;
  dividend: number;
}

export const fcfDividendData: FCFDividendYear[] = [
  { year: "2020", fcf: 6400, dividend: 4200 },
  { year: "2021", fcf: 5700, dividend: 4000 },
  { year: "2022", fcf: 6900, dividend: 4500 },
  { year: "2023", fcf: 7200, dividend: 4800 },
  { year: "2024", fcf: 8200, dividend: 5300 },
];

// --- ROW 4: Waterfall Chart ---
export interface WaterfallItem {
  name: string;
  base: number;
  value: number;
  color: string;
  isTotal: boolean;
}

export const waterfallData: WaterfallItem[] = [
  { name: "Tiền đầu kỳ", base: 0, value: 5000, color: "#9CA3AF", isTotal: true },
  { name: "+ CFO", base: 5000, value: 11500, color: "#00C076", isTotal: false },
  { name: "- CAPEX", base: 16500, value: -3300, color: "#F97316", isTotal: false },
  { name: "- Trả nợ/Cổ tức", base: 13200, value: -5700, color: "#EF4444", isTotal: false },
  { name: "= Tiền cuối kỳ", base: 0, value: 7500, color: "#3B82F6", isTotal: true },
];

export const netCashChange = 2500;
