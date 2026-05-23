import { BalanceSheetItem, IncomeStatementItem, CashFlowItem, FinancialRatioItem } from "@/hooks/useStockData";
import { 
    OverviewStatCard, GaugeData, HealthMetric, TrendYearData, TableRow, DonutItem, InventoryItem, LeverageItem, CCCData, LiquidityItem 
} from "@/lib/balanceSheetDeepDiveData";
import { IncomeMetricCard, DuPontFactor, DuPontTreeNode } from "@/lib/incomeStatementDeepDiveData";
import { EfficiencyItem, SelfFundingData } from "@/lib/cashFlowDeepDiveData";

export interface DeepDiveDataView {
    overviewStats: OverviewStatCard[];
    gaugeData: GaugeData;
    healthMetrics: HealthMetric[];
    assetStructure: DonutItem[];
    capitalStructure: DonutItem[];
    trendData: TrendYearData[];
    inventoryData: InventoryItem[];
    inventoryFooter: { totalInventory: string; inventoryTurnover: string; inventoryDays: string };
    leverageItems: LeverageItem[];
    cccData: CCCData;
    liquidityItems: LiquidityItem[];
    tableHeaders: string[];
    tableData: TableRow[];
}

export interface IncomeStatementView {
    incomeMetricCards: IncomeMetricCard[];
    dupontFactors: DuPontFactor[];
    dupontResult: { label: string; value: number };
    dupontTree: DuPontTreeNode;
    rosBreakdown: { label: string; value: number; color: string }[];
    revenueTrend: any[];
    costStructure: any[];
    costStructureModelLabel?: string;
    growthData: any[];
    efficiencyData: any[];
    revenueBySegment: any[];
    costByCategory: any[];
    profitDrivers: any[];
    profitFunnel: any[];
    incomeTableHeaders: string[];
    incomeTableData: any[];
}

export interface CashFlowView {
    efficiencyMetrics: EfficiencyItem[];
    selfFundingData: SelfFundingData & { history: { year: string; cfo: number; capex: number; fcf: number }[] };
    earningsQuality: any[];
    earningsQualityMetrics: {
        key: string;
        label: string;
        value: string;
        rawValue: number | null;
        status: "good" | "warning" | "danger";
        hint: string;
    }[];
    threeCashFlows: any[];
    insightText: string;
    fcfDividendData: any[];
    waterfallData: any[];
    netCashChange: number;
    cashFlowTableHeaders: string[];
    cashFlowTableData: {
        label: string;
        values: number[];
        growth: number | null;
        isBold?: boolean;
    }[];
}

const GREEN = "#00C076";
const RED = "#EF4444";
const ORANGE = "#F97316";
const PURPLE = "#8B5CF6";
const BLUE = "#3B82F6";

const safeDiv = (n: number, d: number) => d === 0 ? 0 : n / d;
const fmtPct = (n: number) => Number((n * 100).toFixed(2)) + "%";
const fmtNum = (n: number) => Number(n.toFixed(2));
const fmtVal = (n: number, unit: number) => (n / unit).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " Tỷ";

const normalizePercentValue = (value: number | null | undefined): number | null => {
    if (value == null || !Number.isFinite(value)) return null;
    // Backend can return decimal (0.0797) or percentage points (7.97).
    return Math.abs(value) <= 1 ? value * 100 : value;
};

type CostModelType = "manufacturing" | "trading" | "service" | "banking";

function classifyCostModel(latest: IncomeStatementItem): { key: CostModelType; label: string } {
    const isBankLike =
        (latest.totalOperatingIncome ?? 0) > 0 ||
        (latest.provisionExpenses ?? 0) > 0 ||
        (latest.interestIncome ?? 0) > 0;
    if (isBankLike) return { key: "banking", label: "Ngân hàng / Tài chính" };

    const revenueBase = latest.revenue > 0 ? latest.revenue : 1;
    const cogsRatio = safeDiv(Math.abs(latest.costOfGoodsSold || 0), revenueBase);
    const sellingRatio = safeDiv(Math.abs(latest.sellingExpenses || 0), revenueBase);
    const adminRatio = safeDiv(Math.abs(latest.adminExpenses || 0), revenueBase);
    const sgaRatio = sellingRatio + adminRatio;

    if (cogsRatio >= 0.72 && sellingRatio >= adminRatio * 0.7) {
        return { key: "trading", label: "Thương mại / Phân phối" };
    }
    if (cogsRatio >= 0.55) {
        return { key: "manufacturing", label: "Sản xuất" };
    }
    if (sgaRatio >= 0.18 || cogsRatio < 0.45) {
        return { key: "service", label: "Dịch vụ / Công nghệ" };
    }
    return { key: "manufacturing", label: "Sản xuất" };
}

function makePctItem(name: string, amount: number, revenueBase: number, color: string) {
    return { name, value: fmtNum(safeDiv(Math.abs(amount), revenueBase) * 100), color };
}

function toPctByBase(items: Array<{ name: string; amount: number; color: string }>, base: number) {
    const safeBase = base > 0 ? base : 1;
    return items
        .map((it) => ({ name: it.name, value: fmtNum(safeDiv(it.amount, safeBase) * 100), color: it.color }))
        .filter((it) => it.value > 0);
}

function safeRatioNullable(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
    if (numerator == null || denominator == null || denominator === 0) return null;
    return numerator / denominator;
}

function getOperatingProfitForAltman(inc: IncomeStatementItem): number {
    if (inc.operatingProfit != null) return inc.operatingProfit;
    return (inc.grossProfit ?? 0) - (inc.sellingExpenses ?? 0) - (inc.adminExpenses ?? 0);
}

function getRevenueBaseForAltman(inc: IncomeStatementItem, isBankLike: boolean): number | null {
    if (inc.revenue && inc.revenue !== 0) return inc.revenue;
    if (isBankLike) return inc.interestIncome ?? inc.netInterestIncome ?? inc.financialIncome ?? null;
    return inc.financialIncome ?? null;
}

function buildRevenueBySegment(latest: IncomeStatementItem) {
    const model = classifyCostModel(latest);

    if (model.key === "banking") {
        const incomeParts = [
            { name: "Thu nhập lãi thuần", amount: Math.max(latest.netInterestIncome || 0, 0), color: ORANGE },
            { name: "Thu nhập phí dịch vụ", amount: Math.max(latest.netServiceFeeIncome || 0, 0), color: BLUE },
            { name: "Kinh doanh ngoại hối", amount: Math.max(latest.tradingFxIncome || 0, 0), color: PURPLE },
            { name: "CK kinh doanh", amount: Math.max(latest.tradingSecuritiesIncome || 0, 0), color: "#14B8A6" },
            { name: "CK đầu tư", amount: Math.max(latest.investmentSecuritiesIncome || 0, 0), color: "#6366F1" },
            { name: "Thu nhập hoạt động khác", amount: Math.max(latest.otherOperatingIncome || 0, 0), color: "#9CA3AF" },
        ];
        const base = incomeParts.reduce((s, p) => s + p.amount, 0) || Math.max(latest.totalOperatingIncome || 0, latest.revenue || 0, 1);
        return toPctByBase(incomeParts, base);
    }

    const otherNetIncome = latest.profitBeforeTax - latest.operatingProfit - latest.financialIncome + latest.financialExpenses;
    const otherIncome = Math.max(otherNetIncome, 0);
    const coreRevenue = Math.max(latest.revenue || 0, 0);
    const financialIncome = Math.max(latest.financialIncome || 0, 0);

    const incomeParts = [
        { name: "Doanh thu cốt lõi", amount: coreRevenue, color: ORANGE },
        { name: "Thu nhập tài chính", amount: financialIncome, color: BLUE },
        { name: "Thu nhập khác", amount: otherIncome, color: PURPLE },
    ];

    const base = incomeParts.reduce((s, p) => s + p.amount, 0) || Math.max(coreRevenue, 1);
    return toPctByBase(incomeParts, base);
}

function buildCostByCategory(latest: IncomeStatementItem) {
    const model = classifyCostModel(latest);

    if (model.key === "banking") {
        const costOfFund = Math.abs((latest.interestExpenseBank ?? latest.interestExpenses) || 0);
        const operating = Math.abs((latest.operatingExpenses ?? (latest.sellingExpenses + latest.adminExpenses)) || 0);
        const provision = Math.abs(latest.provisionExpenses || 0);
        const financialOther = Math.max(Math.abs(latest.financialExpenses || 0) - Math.abs(latest.interestExpenses || 0), 0);
        const tax = Math.abs(latest.incomeTax || 0);

        const costParts = [
            { name: "Chi phí vốn", amount: costOfFund, color: ORANGE },
            { name: "Chi phí hoạt động", amount: operating, color: PURPLE },
            { name: "Dự phòng RRTD", amount: provision, color: RED },
            { name: "Chi phí tài chính khác", amount: financialOther, color: "#A855F7" },
            { name: "Chi phí thuế", amount: tax, color: BLUE },
        ];
        const base = costParts.reduce((s, p) => s + p.amount, 0);
        return toPctByBase(costParts, base);
    }

    const cogs = Math.abs(latest.costOfGoodsSold || 0);
    const selling = Math.abs(latest.sellingExpenses || 0);
    const admin = Math.abs(latest.adminExpenses || 0);
    const interest = Math.abs(latest.interestExpenses || 0);
    const financialOther = Math.max(Math.abs(latest.financialExpenses || 0) - interest, 0);
    const tax = Math.abs(latest.incomeTax || 0);
    const otherNetIncome = latest.profitBeforeTax - latest.operatingProfit - latest.financialIncome + latest.financialExpenses;
    const otherExpense = Math.max(-otherNetIncome, 0);

    const labels = classifyCostModel(latest).key === "trading"
        ? {
            cogs: "Giá mua hàng hóa",
            selling: "Logistics & phân phối",
            admin: "Quản trị hệ thống",
        }
        : classifyCostModel(latest).key === "service"
            ? {
                cogs: "Chi phí trực tiếp dịch vụ",
                selling: "Marketing & bán hàng",
                admin: "Nhân sự & vận hành",
            }
            : {
                cogs: "Giá vốn & NVL",
                selling: "Chi phí bán hàng",
                admin: "Chi phí quản lý",
            };

    const costParts = [
        { name: labels.cogs, amount: cogs, color: ORANGE },
        { name: labels.selling, amount: selling, color: PURPLE },
        { name: labels.admin, amount: admin, color: BLUE },
        { name: "Chi phí lãi vay", amount: interest, color: RED },
        { name: "Chi phí tài chính khác", amount: financialOther, color: "#A855F7" },
        { name: "Chi phí thuế", amount: tax, color: "#06B6D4" },
        { name: "Chi phí khác", amount: otherExpense, color: "#9CA3AF" },
    ];

    const base = costParts.reduce((s, p) => s + p.amount, 0);
    return toPctByBase(costParts, base);
}

function buildCostStructureByModel(latest: IncomeStatementItem) {
    const model = classifyCostModel(latest);

    if (model.key === "banking") {
        const revenueBase = (latest.totalOperatingIncome && latest.totalOperatingIncome > 0)
            ? latest.totalOperatingIncome
            : (latest.revenue > 0 ? latest.revenue : 1);

        const costOfFund = Math.abs((latest.interestExpenseBank ?? latest.interestExpenses) || 0);
        const operating = Math.abs((latest.operatingExpenses ?? (latest.sellingExpenses + latest.adminExpenses)) || 0);
        const provision = Math.abs(latest.provisionExpenses || 0);
        const financialOther = Math.max(Math.abs(latest.financialExpenses || 0) - Math.abs(latest.interestExpenses || 0), 0);
        const tax = Math.abs(latest.incomeTax || 0);
        const netProfit = Math.max(latest.netProfit, 0);
        const otherExpense = Math.max(revenueBase - (netProfit + costOfFund + operating + provision + financialOther + tax), 0);

        return {
            modelLabel: model.label,
            items: [
                makePctItem("Chi phí vốn (lãi phải trả)", costOfFund, revenueBase, ORANGE),
                makePctItem("Chi phí hoạt động", operating, revenueBase, PURPLE),
                makePctItem("Chi phí dự phòng RRTD", provision, revenueBase, RED),
                makePctItem("Chi phí tài chính khác", financialOther, revenueBase, "#A855F7"),
                makePctItem("Chi phí thuế", tax, revenueBase, BLUE),
                makePctItem("Chi phí khác", otherExpense, revenueBase, "#9CA3AF"),
            ].filter((x) => x.value > 0),
        };
    }

    const revenueBase = latest.revenue > 0 ? latest.revenue : 1;
    const cogs = Math.abs(latest.costOfGoodsSold || 0);
    const selling = Math.abs(latest.sellingExpenses || 0);
    const admin = Math.abs(latest.adminExpenses || 0);
    const interest = Math.abs(latest.interestExpenses || 0);
    const financialOther = Math.max(Math.abs(latest.financialExpenses || 0) - interest, 0);
    const tax = Math.abs(latest.incomeTax || 0);
    const netProfit = Math.max(latest.netProfit, 0);
    const otherExpense = Math.max(revenueBase - (netProfit + cogs + selling + admin + interest + financialOther + tax), 0);

    const labelMap: Record<Exclude<CostModelType, "banking">, { cogs: string; selling: string; admin: string }> = {
        manufacturing: {
            cogs: "Giá vốn & nguyên vật liệu",
            selling: "Chi phí bán hàng & phân phối",
            admin: "Chi phí quản lý & vận hành",
        },
        trading: {
            cogs: "Giá mua hàng hóa",
            selling: "Logistics & phân phối",
            admin: "Chi phí quản trị hệ thống",
        },
        service: {
            cogs: "Chi phí trực tiếp dịch vụ",
            selling: "Marketing & bán hàng",
            admin: "Nhân sự & vận hành",
        },
    };

    const labels = labelMap[model.key as Exclude<CostModelType, "banking">];
    return {
        modelLabel: model.label,
        items: [
            makePctItem(labels.cogs, cogs, revenueBase, ORANGE),
            makePctItem(labels.selling, selling, revenueBase, PURPLE),
            makePctItem(labels.admin, admin, revenueBase, BLUE),
            makePctItem("Chi phí lãi vay", interest, revenueBase, RED),
            makePctItem("Chi phí tài chính khác", financialOther, revenueBase, "#A855F7"),
            makePctItem("Chi phí thuế", tax, revenueBase, "#06B6D4"),
            makePctItem("Chi phí khác", otherExpense, revenueBase, "#9CA3AF"),
        ].filter((x) => x.value > 0),
    };
}

function findRatio(ratios: FinancialRatioItem[] | undefined, year: number, quarter: number) {
    if (!ratios) return null;
    return ratios.find(r => r.year === year && r.quarter === quarter) || ratios[0] || null;
}

export function transformBalanceSheet(
    data: BalanceSheetItem[] | undefined, 
    incomeData: IncomeStatementItem[] | undefined,
    ratiosData: FinancialRatioItem[] | undefined,
    marketCap: number | undefined,
    unit: number = 1_000_000_000,
    selectedPeriod: string | null = null
): DeepDiveDataView | null {
    if (!data || data.length === 0) return null;
    const sortedData = [...data].sort((a, b) => {
        if (a.period.year !== b.period.year) return a.period.year - b.period.year;
        return a.period.quarter - b.period.quarter;
    });
    let viewData = sortedData;
    if (selectedPeriod) {
        const idx = sortedData.findIndex(d => d.period.period === selectedPeriod);
        if (idx !== -1) viewData = sortedData.slice(0, idx + 1);
    }
    if (viewData.length === 0) viewData = [sortedData[sortedData.length-1]];

    const latest = viewData[viewData.length - 1];
    const prev = viewData.length > 1 ? viewData[viewData.length - 2] : null;
    const ratio = findRatio(ratiosData, latest.period.year, latest.period.quarter);

    const deRatio = ratio?.debtToEquity ?? safeDiv(latest.totalLiabilities, latest.totalEquity);
    const currentRatio = ratio?.currentRatio ?? safeDiv(latest.currentAssets, latest.currentLiabilities);
    const daRatio = safeDiv(latest.totalLiabilities, latest.totalAssets);

    let zScore = 0; let zoneLabel = "N/A"; let zoneColor = "#94a3b8";
    let A = 0, B = 0, C = 0, D = 0, E = 0;
    if (incomeData) {
        const inc = incomeData.find(i => i.period.year === latest.period.year && i.period.quarter === latest.period.quarter) || incomeData[0];
        if (inc) {
            const ratioMarketCap = ratio?.marketCap ?? null;
            const periodMarketCap = (ratioMarketCap != null && ratioMarketCap > 0)
                ? ratioMarketCap
                : (marketCap && marketCap > 0 ? marketCap : null);

            const isBankLike = (inc.interestIncome ?? 0) > 0 || (inc.provisionExpenses ?? 0) > 0 || (inc.totalOperatingIncome ?? 0) > 0;
            const operatingProfit = getOperatingProfitForAltman(inc);
            const revenueBase = getRevenueBaseForAltman(inc, isBankLike);

            const x1 = safeRatioNullable(latest.currentAssets - latest.currentLiabilities, latest.totalAssets);
            const x2 = safeRatioNullable(latest.retainedEarnings, latest.totalAssets);
            const x3 = safeRatioNullable(operatingProfit, latest.totalAssets);
            const x4 = safeRatioNullable(periodMarketCap, latest.totalLiabilities);
            const x5 = safeRatioNullable(revenueBase, latest.totalAssets);

            if (x1 != null && x2 != null && x3 != null && x4 != null && x5 != null) {
                A = x1; B = x2; C = x3; D = x4; E = x5;
                zScore = fmtNum(1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E);
                if (zScore > 2.99) { zoneLabel = "An toàn"; zoneColor = GREEN; }
                else if (zScore > 1.81) { zoneLabel = "Cảnh báo"; zoneColor = ORANGE; }
                else { zoneLabel = "Nguy cơ"; zoneColor = RED; }
            }
        }
    }

    const inventoryVal = latest.inventory / unit;
    const inventoryPct = (safeDiv(latest.inventory, latest.currentAssets) * 100);
    const shortTermRecPct = (safeDiv(latest.shortTermReceivables, latest.currentAssets) * 100);
    const cashPct = (safeDiv(latest.cash + latest.shortTermInvestments, latest.currentAssets) * 100);
    const otherScaPct = Math.max(0, 100 - inventoryPct - shortTermRecPct - cashPct);
    const tablePeriods = viewData.slice(-10);

    const colorByStatus = {
        good: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
    } as const;

    const periodIncomeMap = new Map<string, IncomeStatementItem>();
    for (const inc of incomeData ?? []) {
        periodIncomeMap.set(`${inc.period.year}_${inc.period.quarter}`, inc);
    }

    const getIncomeOfPeriod = (item: BalanceSheetItem): IncomeStatementItem | null => {
        const k = `${item.period.year}_${item.period.quarter}`;
        return periodIncomeMap.get(k) ?? null;
    };

    const computeEbit = (inc: IncomeStatementItem | null): number => {
        if (!inc) return 0;
        if (typeof inc.operatingProfit === "number") return inc.operatingProfit;
        return (inc.grossProfit ?? 0) - (inc.sellingExpenses ?? 0) - (inc.adminExpenses ?? 0);
    };

    const computeInterestCoverage = (bs: BalanceSheetItem): number | null => {
        const inc = getIncomeOfPeriod(bs);
        if (!inc) return null;
        const ebit = computeEbit(inc);
        const interest = Math.abs(inc.interestExpenses || 0) || Math.abs(inc.financialExpenses || 0);
        if (interest === 0) return ebit > 0 ? 99 : null;
        return ebit / interest;
    };

    const computeNetDebtEbitda = (bs: BalanceSheetItem): number | null => {
        const inc = getIncomeOfPeriod(bs);
        if (!inc) return null;
        const ebit = computeEbit(inc);
        const ebitda = ebit; // Fallback: use EBIT when depreciation is unavailable in this view.
        if (!isFinite(ebitda) || ebitda <= 0) return null;
        const netDebt = (bs.totalLiabilities || 0) - ((bs.cash || 0) + (bs.shortTermInvestments || 0));
        return netDebt / ebitda;
    };

    const classify = (value: number | null, t1: number, t2: number, higherIsBetter = false): "good" | "warning" | "danger" => {
        if (value == null || !isFinite(value)) return "danger";
        if (higherIsBetter) {
            if (value > t2) return "good";
            if (value >= t1) return "warning";
            return "danger";
        }
        if (value < t1) return "good";
        if (value <= t2) return "warning";
        return "danger";
    };

    const riskScore = (status: "good" | "warning" | "danger", value: number | null, t1: number, t2: number, higherIsBetter = false): number => {
        const base = status === "danger" ? 2 : status === "warning" ? 1 : 0;
        if (value == null || !isFinite(value)) return 3;
        let intensity = 0;
        if (higherIsBetter) {
            if (value < t1) intensity = Math.min((t1 - value) / Math.max(t1, 1e-9), 1);
            else if (value <= t2) intensity = Math.min((t2 - value) / Math.max(t2 - t1, 1e-9), 1);
        } else {
            if (value > t2) intensity = Math.min((value - t2) / Math.max(t2, 1e-9), 1);
            else if (value >= t1) intensity = Math.min((value - t1) / Math.max(t2 - t1, 1e-9), 1);
        }
        return base + intensity;
    };

    const markerPercent = (value: number | null, maxScale: number): number => {
        if (value == null || !isFinite(value) || maxScale <= 0) return 0;
        return Math.max(0, Math.min((value / maxScale) * 100, 100));
    };

    const statusLabel = (s: "good" | "warning" | "danger"): string => {
        if (s === "good") return "Tốt";
        if (s === "warning") return "Trung bình";
        return "Rủi ro";
    };

    const latestDe = safeDiv(latest.totalLiabilities, latest.totalEquity);
    const latestDa = safeDiv(latest.totalLiabilities, latest.totalAssets) * 100;
    const latestIc = computeInterestCoverage(latest);
    const latestNetDebtEbitda = computeNetDebtEbitda(latest);
    const latestShortDebtRatio = safeDiv(latest.currentLiabilities, latest.totalLiabilities) * 100;

    const deStatus = classify(latestDe, 1, 2, false);
    const daStatus = classify(latestDa, 50, 70, false);
    const icStatus = classify(latestIc, 1, 3, true);
    const ndeStatus = classify(latestNetDebtEbitda, 2, 4, false);
    const stdStatus = classify(latestShortDebtRatio, 40, 60, false);

    const makeLeverageItem = (
        title: string,
        value: number | null,
        display: string,
        status: "good" | "warning" | "danger",
        t1: number,
        t2: number,
        maxScale: number,
        trend: number[],
        higherIsBetter = false
    ) => {
        const lowColor = higherIsBetter ? colorByStatus.danger : colorByStatus.good;
        const highColor = higherIsBetter ? colorByStatus.good : colorByStatus.danger;
        return {
            title,
            value: display,
            rawValue: value,
            status,
            statusLabel: statusLabel(status),
            colorHex: colorByStatus[status],
            riskScore: riskScore(status, value, t1, t2, higherIsBetter),
            markerPercent: markerPercent(value, maxScale),
            segments: [
                { width: Math.max(0, (t1 / maxScale) * 100), color: lowColor },
                { width: Math.max(0, ((t2 - t1) / maxScale) * 100), color: colorByStatus.warning },
                { width: Math.max(0, (1 - t2 / maxScale) * 100), color: highColor },
            ],
            trend,
        };
    };

    const deTrend = viewData.map((d) => safeDiv(d.totalLiabilities, d.totalEquity));
    const daTrend = viewData.map((d) => safeDiv(d.totalLiabilities, d.totalAssets) * 100);
    const icTrend = viewData.map((d) => computeInterestCoverage(d)).filter((v): v is number => v != null && isFinite(v));
    const ndeTrend = viewData.map((d) => computeNetDebtEbitda(d)).filter((v): v is number => v != null && isFinite(v));
    const stdTrend = viewData.map((d) => safeDiv(d.currentLiabilities, d.totalLiabilities) * 100);

    const leverageItems = [
        makeLeverageItem(
            "D/E (Nợ / Vốn chủ sở hữu)",
            latestDe,
            latestDe != null && isFinite(latestDe) ? `${fmtNum(latestDe)}x` : "—",
            deStatus,
            1,
            2,
            3,
            deTrend,
            false
        ),
        makeLeverageItem(
            "D/A (Nợ / Tổng tài sản)",
            latestDa,
            latestDa != null && isFinite(latestDa) ? `${fmtNum(latestDa)}%` : "—",
            daStatus,
            50,
            70,
            100,
            daTrend,
            false
        ),
        makeLeverageItem(
            "Interest Coverage (EBIT / Chi phí lãi vay)",
            latestIc,
            latestIc != null && isFinite(latestIc) ? `${fmtNum(latestIc)}x` : "—",
            icStatus,
            1,
            3,
            6,
            icTrend,
            true
        ),
        makeLeverageItem(
            "Net Debt / EBITDA",
            latestNetDebtEbitda,
            latestNetDebtEbitda != null && isFinite(latestNetDebtEbitda) ? `${fmtNum(latestNetDebtEbitda)}x` : "—",
            ndeStatus,
            2,
            4,
            6,
            ndeTrend,
            false
        ),
        makeLeverageItem(
            "Nợ ngắn hạn / Tổng nợ",
            latestShortDebtRatio,
            latestShortDebtRatio != null && isFinite(latestShortDebtRatio) ? `${fmtNum(latestShortDebtRatio)}%` : "—",
            stdStatus,
            40,
            60,
            100,
            stdTrend,
            false
        ),
    ].sort((a, b) => b.riskScore - a.riskScore);

    const mkRow = (label: string, accessor: (d: BalanceSheetItem) => number, level: "main" | "sub" | "detail" = "detail"): TableRow => {
        const values = tablePeriods.map(d => accessor(d) / unit);
        const lastVal = values[values.length - 1];
        const prevVal = values.length > 1 ? values[values.length - 2] : 0;
        const change = lastVal - prevVal;
        const total = tablePeriods[tablePeriods.length - 1] ? (tablePeriods[tablePeriods.length - 1].totalAssets / unit) : 1;
        return { label, level, values, change, yoyPct: safeDiv(change, Math.abs(prevVal)) * 100, pctTotal: safeDiv(lastVal, total) * 100 };
    };

    return {
        overviewStats: [
            { label: "TỔNG TÀI SẢN", value: fmtVal(latest.totalAssets, unit), rawValue: latest.totalAssets, yoyChange: prev ? ((latest.totalAssets - prev.totalAssets) / prev.totalAssets) * 100 : null, yoyLabel: prev ? "vs kỳ trước" : "", badgeText: "Quy mô", borderColor: "border-t-[#F97316]" },
            { label: "VỐN CHỦ SỞ HỮU", value: fmtVal(latest.totalEquity, unit), rawValue: latest.totalEquity, yoyChange: prev ? ((latest.totalEquity - prev.totalEquity) / prev.totalEquity) * 100 : null, yoyLabel: prev ? "vs kỳ trước" : "", badgeText: "Bền vững", borderColor: "border-t-[#10B981]" },
            { label: "NỢ PHẢI TRẢ", value: fmtVal(latest.totalLiabilities, unit), rawValue: latest.totalLiabilities, yoyChange: prev ? ((latest.totalLiabilities - prev.totalLiabilities) / prev.totalLiabilities) * 100 : null, yoyLabel: prev ? "vs kỳ trước" : "", badgeText: "Rủi ro", borderColor: "border-t-[#EF4444]" },
            { label: "TÀI SẢN NGẮN HẠN", value: fmtVal(latest.currentAssets, unit), rawValue: latest.currentAssets, yoyChange: prev ? ((latest.currentAssets - prev.currentAssets) / prev.currentAssets) * 100 : null, yoyLabel: prev ? "vs kỳ trước" : "", badgeText: "Thanh khoản", borderColor: "border-t-[#3B82F6]" }
        ],
        gaugeData: { zScore, zoneLabel, zoneColor },
        healthMetrics: [
            { title: "X1: Vốn lưu động / Tổng TS", value: fmtPct(A), rawValue: A * 100, max: 100, barPercent: Math.abs(A * 100), status: A > 0.1 ? "good" : A > 0 ? "warning" : "danger", subtitle: "Thanh khoản tài sản", color: A > 0.1 ? GREEN : A > 0 ? ORANGE : RED },
            { title: "X2: LN giữ lại / Tổng TS", value: fmtPct(B), rawValue: B * 100, max: 100, barPercent: Math.abs(B * 100), status: B > 0.1 ? "good" : B > 0 ? "warning" : "danger", subtitle: "Khả năng tái đầu tư", color: B > 0.1 ? GREEN : B > 0 ? ORANGE : RED },
            { title: "X3: EBIT / Tổng TS", value: fmtPct(C), rawValue: C * 100, max: 100, barPercent: Math.abs(C * 100), status: C > 0.05 ? "good" : C > 0 ? "warning" : "danger", subtitle: "Hiệu quả cốt lõi", color: C > 0.05 ? GREEN : C > 0 ? ORANGE : RED },
            { title: "X4: Vốn hóa / Tổng nợ", value: fmtNum(D) + "x", rawValue: D, max: 3, barPercent: Math.min((D / 3) * 100, 100), status: D > 1.5 ? "good" : D > 1 ? "warning" : "danger", subtitle: "Đệm tự vốn", color: D > 1.5 ? GREEN : D > 1 ? ORANGE : RED },
            { title: "X5: Doanh thu / Tổng TS", value: fmtNum(E) + "x", rawValue: E, max: 2, barPercent: Math.min((E / 2) * 100, 100), status: E > 1 ? "good" : E > 0.5 ? "warning" : "danger", subtitle: "Vòng quay tài sản", color: E > 1 ? GREEN : E > 0.5 ? ORANGE : RED },
        ],
        assetStructure: [
            { 
                name: "Ngắn hạn", 
                value: fmtNum(safeDiv(latest.currentAssets, latest.totalAssets) * 100), 
                rawValue: latest.currentAssets / unit,
                color: ORANGE,
                details: [
                    { name: "Tiền & tương đương", value: fmtNum(safeDiv(latest.cash, latest.totalAssets) * 100) },
                    { name: "Đầu tư TCNH", value: fmtNum(safeDiv(latest.shortTermInvestments, latest.totalAssets) * 100) },
                    { name: "Phải thu ngắn hạn", value: fmtNum(safeDiv(latest.shortTermReceivables, latest.totalAssets) * 100) },
                    { name: "Hàng tồn kho", value: fmtNum(safeDiv(latest.inventory, latest.totalAssets) * 100) },
                    { name: "Khác", value: fmtNum(safeDiv(latest.currentAssets - latest.cash - latest.shortTermInvestments - latest.shortTermReceivables - latest.inventory, latest.totalAssets) * 100) }
                ].filter(d => d.value > 0)
            },
            { 
                name: "Dài hạn", 
                value: fmtNum(safeDiv(latest.nonCurrentAssets, latest.totalAssets) * 100), 
                rawValue: latest.nonCurrentAssets / unit,
                color: PURPLE,
                details: [
                    { name: "Tài sản cố định", value: fmtNum(safeDiv(latest.fixedAssets, latest.totalAssets) * 100) },
                    { name: "Đầu tư dài hạn", value: fmtNum(safeDiv(latest.longTermInvestments, latest.totalAssets) * 100) },
                    { name: "Khác", value: fmtNum(safeDiv(latest.nonCurrentAssets - (latest.fixedAssets || 0) - (latest.longTermInvestments || 0), latest.totalAssets) * 100) }
                ].filter(d => d.value > 0)
            }
        ],
        capitalStructure: [
            { 
                name: "Vốn CSH", 
                value: fmtNum(safeDiv(latest.totalEquity, latest.totalAssets) * 100), 
                rawValue: latest.totalEquity / unit,
                color: GREEN,
                details: [
                    { name: "Vốn góp (Điều lệ)", value: fmtNum(safeDiv(latest.charterCapital, latest.totalAssets) * 100) },
                    { name: "Lợi nhuận chưa PP", value: fmtNum(safeDiv(latest.retainedEarnings, latest.totalAssets) * 100) },
                    { name: "Khác", value: fmtNum(safeDiv(latest.totalEquity - (latest.charterCapital || 0) - (latest.retainedEarnings || 0), latest.totalAssets) * 100) }
                ].filter(d => d.value > 0)
            },
            { 
                name: "Nợ phải trả", 
                value: fmtNum(safeDiv(latest.totalLiabilities, latest.totalAssets) * 100), 
                rawValue: latest.totalLiabilities / unit,
                color: ORANGE,
                details: [
                    { name: "Nợ ngắn hạn", value: fmtNum(safeDiv(latest.currentLiabilities, latest.totalAssets) * 100) },
                    { name: "Nợ dài hạn", value: fmtNum(safeDiv(latest.longTermLiabilities, latest.totalAssets) * 100) }
                ].filter(d => d.value > 0)
            }
        ],
        trendData: viewData.map(item => ({
            year: item.period.period as any,
            currentAssetsPct: (safeDiv(item.currentAssets, item.totalAssets) * 100),
            nonCurrentAssetsPct: (safeDiv(item.nonCurrentAssets, item.totalAssets) * 100),
            equityPct: (safeDiv(item.totalEquity, item.totalAssets) * 100),
            liabilitiesPct: (safeDiv(item.totalLiabilities, item.totalAssets) * 100),
            shortTermDebt: item.currentLiabilities / unit,
            longTermDebt: item.longTermLiabilities / unit,
            equity: item.totalEquity / unit,
            currentRatio: safeDiv(item.currentAssets, item.currentLiabilities),
            totalAssets: item.totalAssets / unit,
            totalLiabilities: item.totalLiabilities / unit,
            currentAssets: item.currentAssets / unit
        })) as any,
        inventoryData: [
            { name: "Hàng tồn kho", value: inventoryVal, percent: fmtNum(inventoryPct), color: ORANGE },
            { name: "Tiền mặt & Tương đương", value: (latest.cash + latest.shortTermInvestments) / unit, percent: fmtNum(cashPct), color: GREEN },
            { name: "Phải thu ngắn hạn", value: latest.shortTermReceivables / unit, percent: fmtNum(shortTermRecPct), color: BLUE },
            { name: "Khác", value: (latest.currentAssets - latest.inventory - latest.cash - latest.shortTermInvestments - latest.shortTermReceivables) / unit, percent: fmtNum(otherScaPct), color: "#9CA3AF" },
        ],
        inventoryFooter: (() => {
            const daysInPeriod = latest.period.quarter === 0 ? 365 : 90;
            const inc = incomeData?.find(i => i.period.year === latest.period.year && i.period.quarter === latest.period.quarter) || incomeData?.[0];
            const cogs = inc ? Math.abs(inc.costOfGoodsSold || 1) : 1;
            
            let invDays = ratio?.inventoryDays;
            let invTurnover = ratio?.inventoryTurnover;

            if (!invDays && inc) invDays = (latest.inventory / cogs) * daysInPeriod;
            if (!invTurnover && inc) invTurnover = cogs / (latest.inventory || 1);

            return {
                totalInventory: fmtVal(latest.inventory, unit),
                inventoryTurnover: invTurnover ? fmtNum(invTurnover) + "x" : "—",
                inventoryDays: invDays ? Math.round(invDays) + " ngày" : "—"
            };
        })(),
        leverageItems,
        cccData: (() => {
            const daysInPeriod = latest.period.quarter === 0 ? 365 : 90;
            const inc = incomeData?.find(i => i.period.year === latest.period.year && i.period.quarter === latest.period.quarter) || incomeData?.[0];
            const cogs = inc ? Math.abs(inc.costOfGoodsSold || 1) : 1;
            const rev = inc?.revenue || 1;
            
            let invDays = ratio?.inventoryDays ?? 0;
            let recDays = ratio?.receivableDays ?? 0;
            let payDays = ratio?.payableDays ?? 0;
            let ccc = ratio?.cashConversionCycle ?? 0;

            if (!invDays && inc) invDays = (latest.inventory / cogs) * daysInPeriod;
            if (!recDays && inc) recDays = (latest.shortTermReceivables / rev) * daysInPeriod;
            // Using 40% of current liabilities as a rough proxy for Accounts Payable if not provided
            if (!payDays && inc) payDays = ((latest.currentLiabilities * 0.4) / cogs) * daysInPeriod;
            if (!ccc) ccc = invDays + recDays - payDays;

            return {
                inventoryDays: Math.round(invDays),
                receivableDays: Math.round(recDays),
                payableDays: Math.round(payDays),
                cycleDays: Math.round(ccc)
            };
        })(),
        liquidityItems: [
            { title: "Hệ số thanh toán hiện hành", value: ratio?.currentRatio ?? currentRatio, max: 3, status: (ratio?.currentRatio ?? currentRatio) > 1.5 ? "good" : (ratio?.currentRatio ?? currentRatio) > 1 ? "warning" : "danger" },
            { title: "Hệ số thanh toán nhanh", value: ratio?.quickRatio || safeDiv(latest.currentAssets - latest.inventory, latest.currentLiabilities), max: 3, status: ratio?.quickRatio && ratio.quickRatio > 1 ? "good" : "warning" },
            { title: "Hệ số tỷ lệ tiền mặt", value: ratio?.cashRatio || safeDiv(latest.cash, latest.currentLiabilities), max: 2, status: ratio?.cashRatio && ratio.cashRatio > 0.5 ? "good" : "warning" }
        ],
        tableHeaders: ["Chỉ tiêu", ...tablePeriods.map(d => d.period.period), "Thay đổi", "% Kỳ trước", "% Tổng"],
        tableData: [
            { ...mkRow("TỔNG TÀI SẢN", d => d.totalAssets, "main"),
                children: [
                    { ...mkRow("Tài sản ngắn hạn", d => d.currentAssets, "sub"),
                        children: [ mkRow("Tiền & tương đương tiền", d => d.cash), mkRow("Đầu tư TCNH", d => d.shortTermInvestments), mkRow("Phải thu ngắn hạn", d => d.shortTermReceivables), mkRow("Hàng tồn kho", d => d.inventory), ]
                    },
                    { ...mkRow("Tài sản dài hạn", d => d.nonCurrentAssets, "sub"),
                        children: [ mkRow("Tài sản cố định", d => d.fixedAssets), mkRow("Đầu tư dài hạn", d => d.longTermInvestments), ]
                    }
                ]
            },
            { ...mkRow("NỢ PHẢI TRẢ", d => d.totalLiabilities, "main"),
                children: [ mkRow("Nợ ngắn hạn", d => d.currentLiabilities, "sub"), mkRow("Nợ dài hạn", d => d.longTermLiabilities, "sub") ]
            },
            { ...mkRow("VỐN CHỦ SỞ HỮU", d => d.totalEquity, "main"),
                 children: [ mkRow("Vốn góp (Điều lệ)", d => d.charterCapital), mkRow("Lợi nhuận chưa PP", d => d.retainedEarnings) ]
            }
        ]
    };
}

export function transformIncomeStatement(
    data: IncomeStatementItem[] | undefined,
    balanceData: BalanceSheetItem[] | undefined,
    ratiosData: FinancialRatioItem[] | undefined,
    cashFlowData: CashFlowItem[] | undefined,
    unit: number = 1_000_000_000,
    selectedPeriod: string | null = null,
): IncomeStatementView | null {
    if (!data || data.length === 0) return null;
    const sortedData = [...data].sort((a, b) => a.period.year !== b.period.year ? a.period.year - b.period.year : a.period.quarter - b.period.quarter);
    let viewData = sortedData;
    if (selectedPeriod) {
        const idx = sortedData.findIndex(d => d.period.period === selectedPeriod);
        if (idx !== -1) viewData = sortedData.slice(0, idx + 1);
    }
    if (viewData.length === 0) viewData = [sortedData[sortedData.length-1]];

    const latest = viewData[viewData.length - 1]; const prev = viewData.length > 1 ? viewData[viewData.length - 2] : null;
    const ratio = findRatio(ratiosData, latest.period.year, latest.period.quarter);
    const bsLatest = balanceData?.find(b => b.period.year === latest.period.year && b.period.quarter === latest.period.quarter);
    const cfLatest = cashFlowData?.find(c => c.period.year === latest.period.year && c.period.quarter === latest.period.quarter);
    const cfPrev = prev ? cashFlowData?.find(c => c.period.year === prev.period.year && c.period.quarter === prev.period.quarter) : null;

    const revChg = prev ? ((latest.revenue - prev.revenue) / prev.revenue) * 100 : 0;
    const netChg = prev ? ((latest.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100 : 0;
    const grossMargin = safeDiv(latest.grossProfit, latest.revenue) * 100;
    const netMargin = safeDiv(latest.netProfit, latest.revenue) * 100;
    const netFinancialProfit = (latest.financialIncome || 0) - (latest.financialExpenses || 0);
    const otherProfit = latest.profitBeforeTax - latest.operatingProfit - netFinancialProfit;
    const latestEbit = latest.operatingProfit;
    const prevEbit = prev ? prev.operatingProfit : null;
    const latestDepAmort = cfLatest?.depreciationAmortization ?? 0;
    const prevDepAmort = cfPrev?.depreciationAmortization ?? 0;
    const latestEbitda = latestEbit + latestDepAmort;
    const prevEbitda = prev ? ((prevEbit ?? 0) + prevDepAmort) : null;
    const ebitChg = prevEbit != null ? safeDiv(latestEbit - prevEbit, Math.abs(prevEbit)) * 100 : 0;
    const ebitdaChg = prevEbitda != null ? safeDiv(latestEbitda - prevEbitda, Math.abs(prevEbitda)) * 100 : 0;

    const roePct = normalizePercentValue(ratio?.roe);
    const roaPct = normalizePercentValue(ratio?.roa);
    const roeStr = roePct != null ? fmtNum(roePct) + "%" : "—";
    const roaStr = roaPct != null ? fmtNum(roaPct) + "%" : "—";
    const dupontVal = roePct != null ? fmtNum(roePct) : 0;

    const mkRow = (label: string, accessor: (d: IncomeStatementItem) => number, indent = 0, isBold = false): any => {
        const values = viewData.map(d => accessor(d) / unit);
        return { label, indent, isBold, values, growth24: safeDiv(values[values.length - 1] - (values.length > 1 ? values[values.length - 2] : 0), Math.abs(values.length > 1 ? values[values.length - 2] : 1)) * 100 };
    };

    const { items: costStructureItems, modelLabel: costStructureModelLabel } = buildCostStructureByModel(latest);

    return {
        incomeMetricCards: [
            { label: "Doanh thu thuần", value: fmtVal(latest.revenue, unit), borderColor: "border-l-[#3B82F6]", badges: [{ text: (revChg >= 0 ? "+" : "") + fmtNum(revChg) + "% YoY", color: revChg >= 0 ? GREEN : RED }] },
            { label: "Lợi nhuận gộp", value: fmtVal(latest.grossProfit, unit), borderColor: "border-l-[#F97316]", badges: [{ text: "Biên gộp: " + fmtNum(grossMargin) + "%", color: ORANGE }] },
            { label: "EBIT", value: fmtVal(latestEbit, unit), borderColor: "border-l-[#8B5CF6]", badges: [{ text: (ebitChg >= 0 ? "+" : "") + fmtNum(ebitChg) + "% YoY", color: ebitChg >= 0 ? GREEN : RED }] },
            { label: "EBITDA", value: fmtVal(latestEbitda, unit), borderColor: "border-l-[#06B6D4]", badges: [{ text: (ebitdaChg >= 0 ? "+" : "") + fmtNum(ebitdaChg) + "% YoY", color: ebitdaChg >= 0 ? GREEN : RED }] },
            { label: "Lợi nhuận ròng", value: fmtVal(latest.netProfit, unit), borderColor: "border-l-[#F97316]", badges: [ { text: (netChg >= 0 ? "+" : "") + fmtNum(netChg) + "% YoY", color: netChg >= 0 ? GREEN : RED }, { text: "ROS: " + fmtNum(netMargin) + "%", color: PURPLE } ] },
            { label: "Hiệu quả sinh lời", value: "", borderColor: "border-l-[#8B5CF6]", badges: [], listItems: [ { label: "ROS", value: fmtNum(netMargin) + "%" }, { label: "ROA", value: roaStr }, { label: "ROE", value: roeStr } ] },
        ],
        dupontFactors: [
            { label: "Gánh nặng thuế", value: safeDiv(latest.netProfit, latest.profitBeforeTax), sub: "Net Income / EBT" },
            { label: "Gánh nặng lãi vay", value: safeDiv(latest.profitBeforeTax, latest.operatingProfit), sub: "EBT / EBIT" },
            { label: "Biên EBIT", value: safeDiv(latest.operatingProfit, latest.revenue), sub: "EBIT / Revenue" },
            { label: "Vòng quay tài sản", value: ratio?.assetTurnover || safeDiv(latest.revenue, bsLatest?.totalAssets || 1), sub: "Revenue / Avg Assets" },
            { label: "Đòn bẩy tài chính", value: safeDiv(bsLatest?.totalAssets || 1, bsLatest?.totalEquity || 1), sub: "Avg Assets / Equity" }
        ],
        dupontResult: { label: "ROE", value: dupontVal },
        dupontTree: {
            label: "ROE", value: roeStr, color: ORANGE,
            children: [
                { label: "ROA", value: roaStr, color: BLUE, children: [ { label: "ROS (Biên ròng)", value: fmtNum(netMargin) + "%", color: GREEN }, { label: "Vòng quay TS", value: fmtNum(ratio?.assetTurnover || safeDiv(latest.revenue, bsLatest?.totalAssets || 1)) + "x", color: PURPLE } ] },
                { label: "Đòn bẩy TC", value: fmtNum(safeDiv(bsLatest?.totalAssets || 1, bsLatest?.totalEquity || 1)) + "x", color: RED }
            ],
        },
        rosBreakdown: [
            { label: "Gross Margin (Biên gộp)", value: fmtNum(grossMargin), color: BLUE },
            { label: "Operating Margin (Biên HĐKD)", value: fmtNum((safeDiv(latest.operatingProfit, latest.revenue) * 100)), color: ORANGE },
            { label: "ROS (Biên ròng)", value: fmtNum(netMargin), color: GREEN },
        ],
        revenueTrend: viewData.map(d => ({ year: d.period.period as any, revenue: d.revenue / unit, cogs: d.costOfGoodsSold / unit, grossProfit: d.grossProfit / unit })),
        costStructure: costStructureItems,
        costStructureModelLabel,
        growthData: viewData.map((d, i) => {
            const pv = i > 0 ? viewData[i - 1] : null;
            return { year: d.period.period as any, revenueGrowth: pv ? safeDiv(d.revenue - pv.revenue, pv.revenue) * 100 : 0, netProfitGrowth: pv ? safeDiv(d.netProfit - pv.netProfit, Math.abs(pv.netProfit)) * 100 : 0 };
        }),
        efficiencyData: viewData.map(d => ({ year: d.period.period as any, costToRevenue: safeDiv(d.costOfGoodsSold + d.sellingExpenses + d.adminExpenses, d.revenue) * 100 })),
        revenueBySegment: buildRevenueBySegment(latest),
        costByCategory: buildCostByCategory(latest),
        profitDrivers: [
            { name: "HĐKD cốt lõi", value: latest.operatingProfit / unit, color: ORANGE },
            { name: "Tài chính thuần", value: netFinancialProfit / unit, color: BLUE },
            { name: "Hoạt động khác", value: otherProfit / unit, color: PURPLE },
            { name: "LNTT", value: latest.profitBeforeTax / unit, color: GREEN, isTotal: true },
        ],
        profitFunnel: [
            { name: "Doanh Thu", value: latest.revenue / unit, color: ORANGE },
            { name: "Lợi Nhuận Gộp", value: latest.grossProfit / unit, color: BLUE },
            { name: "Lợi Nhuận HĐ", value: latest.operatingProfit / unit, color: PURPLE },
            { name: "Lợi Nhuận Ròng", value: latest.netProfit / unit, color: GREEN },
        ],
        incomeTableHeaders: ["Chỉ tiêu", ...viewData.map(d => d.period.period), "Thay đổi"],
        incomeTableData: [
            mkRow("Doanh thu thuần", d => d.revenue, 0, false), mkRow("Giá vốn hàng bán", d => d.costOfGoodsSold, 1, false), mkRow("Lợi nhuận gộp", d => d.grossProfit, 0, true),
            mkRow("Chi phí bán hàng", d => d.sellingExpenses, 1, false), mkRow("Chi phí QLDN", d => d.adminExpenses, 1, false), mkRow("Lợi nhuận hoạt động", d => d.operatingProfit, 0, true),
            mkRow("Lợi nhuận trước thuế", d => d.profitBeforeTax, 0, true), mkRow("Lợi nhuận sau thuế", d => d.netProfit, 0, true)
        ]
    };
}

export function transformCashFlow(
    data: CashFlowItem[] | undefined,
    incomeData: IncomeStatementItem[] | undefined,
    balanceData?: BalanceSheetItem[] | undefined,
    unit: number = 1_000_000_000,
    selectedPeriod: string | null = null,
): CashFlowView | null {
    if (!data || data.length === 0) return null;
    const sortedData = [...data].sort((a, b) => a.period.year !== b.period.year ? a.period.year - b.period.year : a.period.quarter - b.period.quarter);
    let viewData = sortedData;
    if (selectedPeriod) {
        const idx = sortedData.findIndex(d => d.period.period === selectedPeriod);
        if (idx !== -1) viewData = sortedData.slice(0, idx + 1);
    }
    if (viewData.length === 0) viewData = [sortedData[sortedData.length-1]];

    const latest = viewData[viewData.length - 1];
    const capex = Math.abs(latest.purchaseOfFixedAssets || 0);
    const cfo = latest.operatingCashFlow;
    const fcf = cfo - capex;
    const incLatest = incomeData?.find(i => i.period.year === latest.period.year && i.period.quarter === latest.period.quarter);
    const bsLatest = balanceData?.find(b => b.period.year === latest.period.year && b.period.quarter === latest.period.quarter);
    const ratioNullable = (num: number | null | undefined, den: number | null | undefined): number | null => {
        if (num == null || den == null || den === 0) return null;
        return num / den;
    };
    const status = (
        value: number | null,
        goodMin: number,
        warnMin: number,
        higherBetter = true,
    ): "good" | "warning" | "danger" => {
        if (value == null || !isFinite(value)) return "danger";
        if (higherBetter) {
            if (value >= goodMin) return "good";
            if (value >= warnMin) return "warning";
            return "danger";
        }
        if (value <= goodMin) return "good";
        if (value <= warnMin) return "warning";
        return "danger";
    };
    const netProfit = incLatest?.netProfit ?? null;
    const pbt = incLatest?.profitBeforeTax ?? null;
    const operatingProfit = incLatest?.operatingProfit ?? null;
    const netFinancialProfit = incLatest ? (incLatest.financialIncome || 0) - (incLatest.financialExpenses || 0) : null;
    const otherIncome = (pbt != null && operatingProfit != null && netFinancialProfit != null)
        ? pbt - operatingProfit - netFinancialProfit
        : null;
    const cfoNetIncome = ratioNullable(cfo, netProfit);
    const accrualRatio = ratioNullable((netProfit ?? 0) - cfo, bsLatest?.totalAssets);
    const receivablesRevenue = ratioNullable(bsLatest?.shortTermReceivables, incLatest?.revenue);
    const inventoryCogs = ratioNullable(bsLatest?.inventory, Math.abs(incLatest?.costOfGoodsSold ?? 0));
    const otherIncomePbt = ratioNullable(otherIncome, pbt);
    const earningsQualityMetrics = [
        {
            key: "cfoNetIncome",
            label: "CFO / Net Income",
            rawValue: cfoNetIncome,
            value: cfoNetIncome != null ? `${fmtNum(cfoNetIncome)}x` : "—",
            status: status(cfoNetIncome, 1, 0.8, true),
            hint: "<0.8x: lợi nhuận kế toán chưa chuyển hóa tốt thành tiền",
        },
        {
            key: "accrualRatio",
            label: "Accrual ratio",
            rawValue: accrualRatio != null ? accrualRatio * 100 : null,
            value: accrualRatio != null ? `${fmtNum(accrualRatio * 100)}%` : "—",
            status: status(accrualRatio != null ? Math.abs(accrualRatio) : null, 5 / 100, 10 / 100, false),
            hint: "|Accrual| càng thấp càng tốt",
        },
        {
            key: "receivablesRevenue",
            label: "Receivables / Revenue",
            rawValue: receivablesRevenue != null ? receivablesRevenue * 100 : null,
            value: receivablesRevenue != null ? `${fmtNum(receivablesRevenue * 100)}%` : "—",
            status: status(receivablesRevenue, 0.25, 0.4, false),
            hint: "Phải thu cao kéo dài có thể làm giảm chất lượng doanh thu",
        },
        {
            key: "inventoryCogs",
            label: "Inventory / COGS",
            rawValue: inventoryCogs != null ? inventoryCogs * 100 : null,
            value: inventoryCogs != null ? `${fmtNum(inventoryCogs * 100)}%` : "—",
            status: status(inventoryCogs, 0.2, 0.35, false),
            hint: "Tồn kho phình nhanh hơn COGS cần theo dõi rủi ro tồn đọng",
        },
        {
            key: "otherIncomePbt",
            label: "Other income / PBT",
            rawValue: otherIncomePbt != null ? otherIncomePbt * 100 : null,
            value: otherIncomePbt != null ? `${fmtNum(otherIncomePbt * 100)}%` : "—",
            status: status(otherIncomePbt != null ? Math.abs(otherIncomePbt) : null, 0.1, 0.2, false),
            hint: "Tỷ trọng thu nhập khác cao có thể làm lợi nhuận kém bền vững",
        },
    ];

    const toTableValues = (getter: (d: CashFlowItem) => number) => viewData.map((d) => getter(d) / unit);
    const calcGrowth = (arr: number[]): number | null => {
        if (arr.length < 2) return null;
        const last = arr[arr.length - 1];
        const prev = arr[arr.length - 2];
        if (prev === 0) return null;
        return fmtNum(((last - prev) / Math.abs(prev)) * 100);
    };

    const cfoVals = toTableValues((d) => d.operatingCashFlow || 0);
    const cfiVals = toTableValues((d) => d.investingCashFlow || 0);
    const cffVals = toTableValues((d) => d.financingCashFlow || 0);
    const netVals = toTableValues((d) => d.netCashChange || 0);
    const capexVals = toTableValues((d) => Math.abs(d.purchaseOfFixedAssets || 0));
    const divVals = toTableValues((d) => Math.abs(d.dividendsPaid || 0));
    const beginVals = toTableValues((d) => d.beginningCash || 0);
    const endVals = toTableValues((d) => d.endingCash || 0);
    
    return {
        efficiencyMetrics: [
            { title: "Tỷ lệ tái đầu tư (Capex/CFO)", value: fmtNum(safeDiv(capex, cfo) * 100) + "%", numericValue: safeDiv(capex, cfo), max: 1.5, color: safeDiv(capex, cfo) > 1 ? ORANGE : GREEN, subtitle: "Mức tái đầu tư từ dòng tiền KD" },
            { title: "FCF Margin (FCF/Revenue)", value: incLatest ? fmtNum(safeDiv(fcf, incLatest.revenue) * 100) + "%" : "N/A", numericValue: incLatest ? safeDiv(fcf, incLatest.revenue) : 0, max: 1, color: BLUE, subtitle: "Dòng tiền tự do trên DT" }
        ],
        selfFundingData: {
            cfo: cfo / unit, capex: capex / unit, fcf: fcf / unit, capexCoverage: fmtNum(safeDiv(cfo, capex || 1)), dividendCoverage: fmtNum(safeDiv(fcf, Math.abs(latest.dividendsPaid || 0) || 1)),
            history: viewData.map(d => ({ year: d.period.period as string, cfo: d.operatingCashFlow / unit, capex: Math.abs(d.purchaseOfFixedAssets || 0) / unit, fcf: (d.operatingCashFlow - Math.abs(d.purchaseOfFixedAssets || 0)) / unit }))
        },
        earningsQuality: viewData.map(d => {
            const inc = incomeData?.find(i => i.period.year === d.period.year && i.period.quarter === d.period.quarter);
            return { year: d.period.period, netIncome: (inc?.netProfit || 0) / unit, ocf: d.operatingCashFlow / unit };
        }),
        earningsQualityMetrics,
        threeCashFlows: viewData.map(d => ({ year: d.period.period, cfo: d.operatingCashFlow / unit, cfi: d.investingCashFlow / unit, cff: d.financingCashFlow / unit })),
        insightText: cfo > capex ? "Dòng tiền kinh doanh dồi dào, đủ bù đắp chi phí đầu tư (CAPEX)." : "Dòng tiền kinh doanh chưa đủ bù đắp chi tiêu đầu tư.",
        fcfDividendData: viewData.map(d => ({ year: d.period.period, fcf: (d.operatingCashFlow - Math.abs(d.purchaseOfFixedAssets || 0)) / unit, dividend: Math.abs(d.dividendsPaid || 0) / unit })),
        waterfallData: [
            { name: "CFO", value: latest.operatingCashFlow / unit, color: ORANGE, base: 0, isTotal: false },
            { name: "CFI", value: latest.investingCashFlow / unit, color: "#4B5563", base: latest.operatingCashFlow / unit, isTotal: false },
            { name: "CFF", value: latest.financingCashFlow / unit, color: "#9CA3AF", base: (latest.operatingCashFlow + latest.investingCashFlow) / unit, isTotal: false },
            { name: "Tiền ròng tăng/giảm", value: latest.netCashChange / unit, color: latest.netCashChange >= 0 ? GREEN : RED, base: 0, isTotal: true },
        ],
        netCashChange: latest.netCashChange / unit,
        cashFlowTableHeaders: ["Chỉ tiêu", ...viewData.map(d => d.period.period), "Thay đổi"],
        cashFlowTableData: [
            { label: "Lưu chuyển tiền thuần từ HĐKD", values: cfoVals, growth: calcGrowth(cfoVals), isBold: true },
            { label: "Lưu chuyển tiền thuần từ HĐĐT", values: cfiVals, growth: calcGrowth(cfiVals), isBold: true },
            { label: "Lưu chuyển tiền thuần từ HĐTC", values: cffVals, growth: calcGrowth(cffVals), isBold: true },
            { label: "Chi tiêu CAPEX", values: capexVals, growth: calcGrowth(capexVals) },
            { label: "Cổ tức chi trả", values: divVals, growth: calcGrowth(divVals) },
            { label: "Tiền đầu kỳ", values: beginVals, growth: calcGrowth(beginVals) },
            { label: "Tiền cuối kỳ", values: endVals, growth: calcGrowth(endVals), isBold: true },
            { label: "Tiền ròng tăng/giảm", values: netVals, growth: calcGrowth(netVals), isBold: true },
        ]
    };
}
