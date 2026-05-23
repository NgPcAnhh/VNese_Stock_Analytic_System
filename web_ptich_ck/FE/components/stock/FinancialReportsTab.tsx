"use client";

import React, { useState, useCallback, useMemo, Component, type ReactNode, type ErrorInfo } from "react";
import ExcelJS from "exceljs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    useFinancialReports,
    type IncomeStatementItem,
    type BalanceSheetItem,
    type CashFlowItem,
    type FinancialReportTable,
} from "@/hooks/useStockData";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Download, FileSpreadsheet, Building2, ChevronDown, ChevronRight } from "lucide-react";

// Temporary error boundary to capture runtime errors
class FinancialErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(err: Error) { return { error: err }; }
    componentDidCatch(err: Error, info: ErrorInfo) {
        console.error("[FinancialErrorBoundary]", err.message, err.stack, info.componentStack);
    }
    render() {
        if (this.state.error) {
            return (
                <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-sm font-sans">
                    <p className="font-bold text-red-700">Runtime Error:</p>
                    <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">{this.state.error.message}{"\n"}{this.state.error.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

type ReportType = "income" | "balance" | "cashflow";

type DynamicReportType = "incomeStatement" | "balanceSheet" | "cashFlow";
type ReportLayout = "nonFinancial" | "bank" | "financial" | "insurance";

const formatNumber = (val: number): string => {
    if (val === 0) return "0";
    const negative = val < 0;
    const abs = Math.abs(val);
    const formatted = abs.toLocaleString("vi-VN");
    return negative ? `(${formatted})` : formatted;
};

// Convert raw VND to tỷ VND for display
const toTyVND = (val: number): number => +(val / 1_000_000_000).toFixed(2);
const fmtTy = (val: number): string => formatNumber(toTyVND(val));

const getChangePercent = (current: number, previous: number): number | null => {
    if (previous === 0) return null;
    return parseFloat((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
};

function ChangeCell({ current, previous }: { current: number; previous: number }) {
    const pct = getChangePercent(current, previous);
    if (pct === null) return <span className="text-muted-foreground">-</span>;
    const isPositive = pct > 0;
    const isNegative = pct < 0;
    return (
        <span
            className={`text-xs font-medium ${
                isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-muted-foreground"
            }`}
        >
            {isPositive ? "+" : ""}
            {pct}%
        </span>
    );
}

function normalizeLabelForGrouping(label: string): string {
    return (label || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getParentGroupId(reportType: DynamicReportType, label: string, indCode: string): string {
    const l = normalizeLabelForGrouping(label);
    const c = normalizeLabelForGrouping(indCode);

    if (reportType === "incomeStatement") {
        if (l.includes("doanh thu") || l.includes("thu nhap") || l.includes("revenue") || l.includes("income")) return "income-revenue";
        if (l.includes("chi phi") || l.includes("gia von") || l.includes("expense") || l.includes("cost")) return "income-expense";
        if (l.includes("thue") || c.includes("thue")) return "income-tax";
        if (l.includes("loi nhuan") || l.includes("lai") || l.includes("eps") || l.includes("profit") || c.includes("lntt") || c.includes("lnst")) return "income-profit";
        return "income-other";
    }

    if (reportType === "balanceSheet") {
        if (l.includes("tai san") || c.includes("ts_")) return "balance-assets";
        if (l.includes("no") || c.includes("no_")) return "balance-liabilities";
        if (l.includes("von chu so huu") || l.includes("von") || c.includes("vcsh")) return "balance-equity";
        return "balance-other";
    }

    if (l.includes("hoat dong kinh doanh") || l.includes("hdkd") || c.includes("hdkd") || c.includes("operating")) return "cashflow-operating";
    if (l.includes("hoat dong dau tu") || l.includes("hddt") || c.includes("hddt") || c.includes("investing")) return "cashflow-investing";
    if (l.includes("hoat dong tai chinh") || l.includes("hdtc") || c.includes("hdtc") || c.includes("financing")) return "cashflow-financing";
    return "cashflow-other";
}

function getParentTitle(groupId: string): string {
    const map: Record<string, string> = {
        "income-revenue": "Nhóm Doanh thu",
        "income-expense": "Nhóm Chi phí",
        "income-tax": "Nhóm Thuế",
        "income-profit": "Nhóm Lợi nhuận",
        "income-other": "Nhóm Khác",
        "balance-assets": "Nhóm Tài sản",
        "balance-liabilities": "Nhóm Nợ phải trả",
        "balance-equity": "Nhóm Vốn chủ sở hữu",
        "balance-other": "Nhóm Khác",
        "cashflow-operating": "Nhóm HĐKD",
        "cashflow-investing": "Nhóm HĐĐT",
        "cashflow-financing": "Nhóm HĐTC",
        "cashflow-other": "Nhóm Khác",
    };
    return map[groupId] ?? "Nhóm Khác";
}

function DynamicReportTable({
    title,
    subtitle,
    reportType,
    reportLayout,
    table,
}: {
    title: string;
    subtitle: string;
    reportType: DynamicReportType;
    reportLayout: ReportLayout;
    table: FinancialReportTable;
}) {
    const periods = table.periods ?? [];
    const rows = table.rows ?? [];
    const groupedRows = useMemo(() => {
        const groups = new Map<string, { sectionLabel: string; sectionOrder: number; rows: typeof rows }>();
        for (const row of rows) {
            const groupId = row.section || getParentGroupId(reportType, row.label, row.indCode);
            const existing = groups.get(groupId) ?? {
                sectionLabel: row.sectionLabel || getParentTitle(groupId),
                sectionOrder: row.sectionOrder ?? 999,
                rows: [],
            };
            existing.rows.push(row);
            if (row.sectionLabel) {
                existing.sectionLabel = row.sectionLabel;
            }
            if (typeof row.sectionOrder === "number") {
                existing.sectionOrder = Math.min(existing.sectionOrder, row.sectionOrder);
            }
            groups.set(groupId, existing);
        }
        return Array.from(groups.entries())
            .map(([groupId, group]) => ({
                groupId,
                title: group.sectionLabel || getParentTitle(groupId),
                order: group.sectionOrder,
                children: [...group.rows].sort((a, b) => {
                    const ao = a.rowOrder ?? 999999;
                    const bo = b.rowOrder ?? 999999;
                    if (ao !== bo) return ao - bo;
                    return (a.label || "").localeCompare(b.label || "", "vi");
                }),
            }))
            .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "vi"));
    }, [rows, reportType]);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-foreground font-sans">{title}</CardTitle>
                    <span className="text-xs text-muted-foreground italic font-sans">
                        {subtitle} • Bố cục: {reportLayout === "bank" ? "Ngân hàng" : reportLayout === "financial" ? "Tài chính" : reportLayout === "insurance" ? "Bảo hiểm" : "Phi tài chính"}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-sans">
                        <thead>
                            <tr className="bg-muted border-b border-border">
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[260px] sticky left-0 bg-muted z-10">
                                    Chỉ tiêu
                                </th>
                                {periods.map((p, i) => (
                                    <th
                                        key={p}
                                        className={`text-right px-3 py-3 font-semibold min-w-[120px] ${
                                            i === 0 ? "text-blue-600 bg-blue-50/50" : "text-muted-foreground"
                                        }`}
                                    >
                                        {p}
                                        {i === 0 && <span className="block text-[10px] font-normal text-blue-400">Mới nhất</span>}
                                    </th>
                                ))}
                                <th className="text-right px-3 py-3 font-semibold text-muted-foreground min-w-[90px]">% thay đổi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedRows.map((group) => {
                                const isCollapsed = collapsedGroups[group.groupId] ?? false;
                                return (
                                    <React.Fragment key={group.groupId}>
                                        <tr className="bg-blue-50/35 border-b border-blue-100">
                                            <td className="px-4 py-2.5 sticky left-0 bg-blue-50/35 z-10 font-semibold text-blue-800">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(group.groupId)}
                                                    className="inline-flex items-center gap-1.5 hover:text-blue-900"
                                                >
                                                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    <span>{group.title}</span>
                                                    <span className="text-[10px] text-blue-500">({group.children.length})</span>
                                                </button>
                                            </td>
                                            {periods.map((_, i) => (
                                                <td key={i} className="text-right px-3 py-2.5 text-blue-400">-</td>
                                            ))}
                                            <td className="text-right px-3 py-2.5 text-blue-400">-</td>
                                        </tr>

                                        {!isCollapsed && group.children.map((row) => {
                                            const currentVal = row.values?.[0] ?? 0;
                                            const prevVal = row.values?.[1] ?? 0;
                                            return (
                                                <tr key={row.indCode} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-2.5 pl-8 sticky left-0 bg-card z-10 font-normal text-muted-foreground">
                                                        {row.label}
                                                    </td>
                                                    {(row.values ?? []).map((val, i) => (
                                                        <td
                                                            key={i}
                                                            className={`text-right px-3 py-2.5 tabular-nums ${
                                                                i === 0 ? "font-semibold text-blue-700 bg-blue-50/30" : "font-normal text-muted-foreground"
                                                            } ${val < 0 ? "!text-red-500" : ""}`}
                                                        >
                                                            {fmtTy(val)}
                                                        </td>
                                                    ))}
                                                    <td className="text-right px-3 py-2.5">
                                                        <ChangeCell current={currentVal} previous={prevVal} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

// ==================== INCOME STATEMENT TABLE ====================
function IncomeStatementTable({ data }: { data: IncomeStatementItem[] }) {
    const periods = data.map((d) => d.period.period);

    const rows: { label: string; key: keyof IncomeStatementItem; bold?: boolean; indent?: boolean }[] = [
        { label: "Doanh thu thuần", key: "revenue", bold: true },
        { label: "Giá vốn hàng bán", key: "costOfGoodsSold", indent: true },
        { label: "Lợi nhuận gộp", key: "grossProfit", bold: true },
        { label: "Chi phí bán hàng", key: "sellingExpenses", indent: true },
        { label: "Chi phí quản lý DN", key: "adminExpenses", indent: true },
        { label: "Lợi nhuận từ HĐKD", key: "operatingProfit", bold: true },
        { label: "Doanh thu tài chính", key: "financialIncome", indent: true },
        { label: "Chi phí tài chính", key: "financialExpenses", indent: true },
        { label: "Trong đó: Chi phí lãi vay", key: "interestExpenses", indent: true },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax", bold: true },
        { label: "Thuế TNDN", key: "incomeTax", indent: true },
        { label: "Lợi nhuận sau thuế", key: "netProfit", bold: true },
        { label: "LNST của CĐ công ty mẹ", key: "netProfitParent", bold: true },
        { label: "EPS (VND)", key: "eps" },
    ];

    return (
        <ReportTable
            title="📋 Kết quả kinh doanh"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== BALANCE SHEET TABLE ====================
function BalanceSheetTable({ data }: { data: BalanceSheetItem[] }) {
    const periods = data.map((d) => d.period.period);

    const rows: { label: string; key: keyof BalanceSheetItem; bold?: boolean; indent?: boolean; section?: string }[] = [
        { label: "TÀI SẢN", key: "totalAssets", bold: true, section: "header" },
        { label: "Tổng tài sản", key: "totalAssets", bold: true },
        { label: "Tài sản ngắn hạn", key: "currentAssets", bold: true },
        { label: "Tiền & tương đương tiền", key: "cash", indent: true },
        { label: "Đầu tư TC ngắn hạn", key: "shortTermInvestments", indent: true },
        { label: "Phải thu ngắn hạn", key: "shortTermReceivables", indent: true },
        { label: "Hàng tồn kho", key: "inventory", indent: true },
        { label: "Tài sản dài hạn", key: "nonCurrentAssets", bold: true },
        { label: "Tài sản cố định", key: "fixedAssets", indent: true },
        { label: "Đầu tư TC dài hạn", key: "longTermInvestments", indent: true },
        { label: "NGUỒN VỐN", key: "totalLiabilitiesAndEquity", bold: true, section: "header" },
        { label: "Tổng nợ phải trả", key: "totalLiabilities", bold: true },
        { label: "Nợ ngắn hạn", key: "currentLiabilities", indent: true },
        { label: "Nợ dài hạn", key: "longTermLiabilities", indent: true },
        { label: "Vốn chủ sở hữu", key: "totalEquity", bold: true },
        { label: "Vốn điều lệ", key: "charterCapital", indent: true },
        { label: "LN chưa phân phối", key: "retainedEarnings", indent: true },
        { label: "Tổng nguồn vốn", key: "totalLiabilitiesAndEquity", bold: true },
    ];

    return (
        <ReportTable
            title="🏛️ Cân đối kế toán"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== CASH FLOW TABLE ====================
function CashFlowTable({ data }: { data: CashFlowItem[] }) {
    const periods = data.map((d) => d.period.period);

    const rows: { label: string; key: keyof CashFlowItem; bold?: boolean; indent?: boolean; section?: string }[] = [
        { label: "I. LƯU CHUYỂN TIỀN TỪ HĐKD", key: "operatingCashFlow", bold: true, section: "header" },
        { label: "Lưu chuyển tiền thuần từ HĐKD", key: "operatingCashFlow", bold: true },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax", indent: true },
        { label: "Khấu hao TSCĐ", key: "depreciationAmortization", indent: true },
        { label: "Dự phòng", key: "provisionsAndReserves", indent: true },
        { label: "Thay đổi vốn lưu động", key: "workingCapitalChanges", indent: true },
        { label: "Tiền lãi đã trả", key: "interestPaid", indent: true },
        { label: "Thuế TNDN đã nộp", key: "incomeTaxPaid", indent: true },
        { label: "II. LƯU CHUYỂN TIỀN TỪ HĐĐT", key: "investingCashFlow", bold: true, section: "header" },
        { label: "Lưu chuyển tiền thuần từ HĐĐT", key: "investingCashFlow", bold: true },
        { label: "Mua sắm TSCĐ", key: "purchaseOfFixedAssets", indent: true },
        { label: "Thu thanh lý tài sản", key: "proceedsFromDisposal", indent: true },
        { label: "Đầu tư vào công ty con", key: "investmentInSubsidiaries", indent: true },
        { label: "III. LƯU CHUYỂN TIỀN TỪ HĐTC", key: "financingCashFlow", bold: true, section: "header" },
        { label: "Lưu chuyển tiền thuần từ HĐTC", key: "financingCashFlow", bold: true },
        { label: "Tiền thu từ đi vay", key: "proceedsFromBorrowing", indent: true },
        { label: "Tiền trả nợ vay", key: "repaymentOfBorrowing", indent: true },
        { label: "Cổ tức đã trả", key: "dividendsPaid", indent: true },
        { label: "Thu phát hành cổ phiếu", key: "proceedsFromEquity", indent: true },
        { label: "Tăng/giảm tiền thuần", key: "netCashChange", bold: true },
        { label: "Tiền đầu kỳ", key: "beginningCash", indent: true },
        { label: "Tiền cuối kỳ", key: "endingCash", bold: true },
    ];

    return (
        <ReportTable
            title="💵 Lưu chuyển tiền tệ"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== GENERIC TABLE COMPONENT ====================
function ReportTable<T extends Record<string, any>>({
    title,
    subtitle,
    periods,
    rows,
    data,
}: {
    title: string;
    subtitle: string;
    periods: string[];
    rows: { label: string; key: keyof T; bold?: boolean; indent?: boolean; section?: string }[];
    data: T[];
}) {
    // Track which sections are visible (for headers that are repeated)
    const seenSectionHeaders = new Set<string>();

    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-foreground font-sans">{title}</CardTitle>
                    <span className="text-xs text-muted-foreground italic font-sans">{subtitle}</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-sans">
                        <thead>
                            <tr className="bg-muted border-b border-border">
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[220px] sticky left-0 bg-muted z-10">
                                    Chỉ tiêu
                                </th>
                                {periods.map((p, i) => (
                                    <th
                                        key={p}
                                        className={`text-right px-3 py-3 font-semibold min-w-[110px] ${
                                            i === 0 ? "text-blue-600 bg-blue-50/50" : "text-muted-foreground"
                                        }`}
                                    >
                                        {p}
                                        {i === 0 && (
                                            <span className="block text-[10px] font-normal text-blue-400">
                                                Mới nhất
                                            </span>
                                        )}
                                    </th>
                                ))}
                                <th className="text-right px-3 py-3 font-semibold text-muted-foreground min-w-[90px]">
                                    % thay đổi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                // Section headers
                                if (row.section === "header") {
                                    if (seenSectionHeaders.has(row.label)) return null;
                                    seenSectionHeaders.add(row.label);
                                    return (
                                        <tr key={`section-${idx}`} className="bg-blue-50/40 border-t border-blue-100">
                                            <td
                                                colSpan={periods.length + 2}
                                                className="px-4 py-2 text-xs font-bold text-blue-700 uppercase tracking-wide"
                                            >
                                                {row.label}
                                            </td>
                                        </tr>
                                    );
                                }

                                const values = data.map((d) => (d[row.key] as number) ?? 0);
                                const currentVal = values[0] ?? 0;
                                const prevVal = values[1] ?? 0;

                                return (
                                    <tr
                                        key={`row-${idx}`}
                                        className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                                            row.bold ? "bg-muted/20" : ""
                                        }`}
                                    >
                                        <td
                                            className={`px-4 py-2.5 sticky left-0 bg-card z-10 ${
                                                row.bold ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
                                            } ${row.indent ? "pl-8" : ""}`}
                                        >
                                            {row.label}
                                        </td>
                                        {values.map((val, i) => (
                                            <td
                                                key={i}
                                                className={`text-right px-3 py-2.5 tabular-nums ${
                                                    i === 0
                                                        ? "font-semibold text-blue-700 bg-blue-50/30"
                                                        : row.bold
                                                        ? "font-medium text-foreground"
                                                        : "font-normal text-muted-foreground"
                                                } ${val < 0 ? "!text-red-500" : ""}`}
                                            >
                                                {fmtTy(val)}
                                            </td>
                                        ))}
                                        <td className="text-right px-3 py-2.5">
                                            <ChangeCell current={currentVal} previous={prevVal} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

// ==================== BANK INCOME STATEMENT TABLE ====================
function BankIncomeStatementTable({ data }: { data: IncomeStatementItem[] }) {
    const periods = data.map((d) => d.period.period);

    type BankISRow = {
        label: string;
        key: keyof IncomeStatementItem;
        bold?: boolean;
        indent?: boolean;
        section?: string;
    };

    const rows: BankISRow[] = [
        { label: "I. THU NHẬP LÃI THUẦN", key: "netInterestIncome", bold: true, section: "header" },
        { label: "Thu nhập lãi và các khoản tương đương", key: "interestIncome", indent: true },
        { label: "Chi phí lãi và các khoản tương đương", key: "interestExpenseBank", indent: true },
        { label: "Thu nhập lãi thuần (NII)", key: "netInterestIncome", bold: true },

        { label: "II. THU NHẬP NGOÀI LÃI", key: "totalOperatingIncome", bold: true, section: "header" },
        { label: "Lãi/lỗ thuần dịch vụ & phí", key: "netServiceFeeIncome", indent: true },
        { label: "Lãi/lỗ hoạt động kinh doanh ngoại tệ", key: "tradingFxIncome", indent: true },
        { label: "Lãi/lỗ mua bán chứng khoán kinh doanh", key: "tradingSecuritiesIncome", indent: true },
        { label: "Lãi/lỗ từ chứng khoán đầu tư", key: "investmentSecuritiesIncome", indent: true },
        { label: "Thu nhập từ hoạt động khác", key: "otherOperatingIncome", indent: true },
        { label: "Tổng thu nhập hoạt động (TOI)", key: "totalOperatingIncome", bold: true },

        { label: "III. CHI PHÍ HOẠT ĐỘNG (OPEX)", key: "operatingExpenses", bold: true, section: "header" },
        { label: "Chi phí hoạt động", key: "operatingExpenses", bold: true, indent: true },
        { label: "Lợi nhuận trước dự phòng (PPOP)", key: "prePpopProfit", bold: true },

        { label: "IV. DỰ PHÒNG RỦI RO TÍN DỤNG", key: "provisionExpenses", bold: true, section: "header" },
        { label: "Chi phí dự phòng rủi ro tín dụng", key: "provisionExpenses", bold: true, indent: true },

        { label: "V. LỢI NHUẬN", key: "profitBeforeTax", bold: true, section: "header" },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax", bold: true },
        { label: "Thuế TNDN", key: "incomeTax", indent: true },
        { label: "Lợi nhuận sau thuế (LNST)", key: "netProfit", bold: true },
        { label: "LNST của CĐ công ty mẹ", key: "netProfitParent" },
        { label: "EPS (VND)", key: "eps" },
    ];

    return (
        <ReportTable
            title="🏦 KQKD Ngân hàng"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== BANK BALANCE SHEET TABLE ====================
function BankBalanceSheetTable({ data }: { data: BalanceSheetItem[] }) {
    const periods = data.map((d) => d.period.period);

    type BankBSRow = {
        label: string;
        key: keyof BalanceSheetItem;
        bold?: boolean;
        indent?: boolean;
        section?: string;
    };

    const rows: BankBSRow[] = [
        { label: "TÀI SẢN", key: "totalAssets", bold: true, section: "header" },
        { label: "Tổng tài sản", key: "totalAssets", bold: true },
        { label: "Tiền và tương đương tiền", key: "cash", indent: true },
        { label: "Tiền gửi tại NHNN", key: "sbvDeposits", indent: true },
        { label: "Tiền gửi tại TCTD khác (tài sản)", key: "interBankDeposits", indent: true },
        { label: "Chứng khoán kinh doanh", key: "tradingSecurities", indent: true },
        { label: "Chứng khoán đầu tư", key: "investmentSecurities", indent: true },
        { label: "Cho vay khách hàng (gộp)", key: "loansToCustomersGross", indent: true },
        { label: "Dự phòng rủi ro cho vay", key: "loanLossReserves", indent: true },
        { label: "Cho vay khách hàng (thuần)", key: "loansToCustomers", bold: true, indent: true },
        { label: "Tài sản cố định", key: "fixedAssets", indent: true },
        { label: "Đầu tư TC dài hạn", key: "longTermInvestments", indent: true },

        { label: "NGUỒN VỐN", key: "totalLiabilitiesAndEquity", bold: true, section: "header" },
        { label: "Tổng nợ phải trả", key: "totalLiabilities", bold: true },
        { label: "Tiền gửi của NHNN và TCTD", key: "sbvDeposits", indent: true },
        { label: "Tiền gửi khách hàng", key: "customerDeposits", bold: true, indent: true },
        { label: "Phát hành giấy tờ có giá", key: "debtSecuritiesIssued", indent: true },
        { label: "Vốn chủ sở hữu", key: "totalEquity", bold: true },
        { label: "Vốn điều lệ", key: "charterCapital", indent: true },
        { label: "LN chưa phân phối", key: "retainedEarnings", indent: true },
        { label: "Tổng nguồn vốn", key: "totalLiabilitiesAndEquity", bold: true },
    ];

    return (
        <ReportTable
            title="🏦 Cân đối kế toán Ngân hàng"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== EXCEL EXPORT UTILITY ====================
function escapeCSV(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
}

function downloadCSV(filename: string, csvContent: string) {
    // BOM for UTF-8 so Excel reads Vietnamese correctly
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function buildIncomeCSV(data: IncomeStatementItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: keyof IncomeStatementItem }[] = [
        { label: "Doanh thu thuần", key: "revenue" },
        { label: "Giá vốn hàng bán", key: "costOfGoodsSold" },
        { label: "Lợi nhuận gộp", key: "grossProfit" },
        { label: "Chi phí bán hàng", key: "sellingExpenses" },
        { label: "Chi phí quản lý DN", key: "adminExpenses" },
        { label: "Lợi nhuận từ HĐKD", key: "operatingProfit" },
        { label: "Doanh thu tài chính", key: "financialIncome" },
        { label: "Chi phí tài chính", key: "financialExpenses" },
        { label: "Chi phí lãi vay", key: "interestExpenses" },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax" },
        { label: "Thuế TNDN", key: "incomeTax" },
        { label: "Lợi nhuận sau thuế", key: "netProfit" },
        { label: "LNST CĐ công ty mẹ", key: "netProfitParent" },
        { label: "EPS (VND)", key: "eps" },
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String(d[row.key]));
        lines.push([escapeCSV(row.label), ...vals].join(","));
    }
    return lines.join("\n");
}

function buildBalanceCSV(data: BalanceSheetItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: keyof BalanceSheetItem }[] = [
        { label: "Tổng tài sản", key: "totalAssets" },
        { label: "Tài sản ngắn hạn", key: "currentAssets" },
        { label: "Tiền & tương đương tiền", key: "cash" },
        { label: "Đầu tư TC ngắn hạn", key: "shortTermInvestments" },
        { label: "Phải thu ngắn hạn", key: "shortTermReceivables" },
        { label: "Hàng tồn kho", key: "inventory" },
        { label: "Tài sản dài hạn", key: "nonCurrentAssets" },
        { label: "Tài sản cố định", key: "fixedAssets" },
        { label: "Đầu tư TC dài hạn", key: "longTermInvestments" },
        { label: "Tổng nợ phải trả", key: "totalLiabilities" },
        { label: "Nợ ngắn hạn", key: "currentLiabilities" },
        { label: "Nợ dài hạn", key: "longTermLiabilities" },
        { label: "Vốn chủ sở hữu", key: "totalEquity" },
        { label: "Vốn điều lệ", key: "charterCapital" },
        { label: "LN chưa phân phối", key: "retainedEarnings" },
        { label: "Tổng nguồn vốn", key: "totalLiabilitiesAndEquity" },
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String(d[row.key]));
        lines.push([escapeCSV(row.label), ...vals].join(","));
    }
    return lines.join("\n");
}

function buildCashFlowCSV(data: CashFlowItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: keyof CashFlowItem }[] = [
        { label: "LC tiền thuần từ HĐKD", key: "operatingCashFlow" },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax" },
        { label: "Khấu hao TSCĐ", key: "depreciationAmortization" },
        { label: "Dự phòng", key: "provisionsAndReserves" },
        { label: "Thay đổi vốn lưu động", key: "workingCapitalChanges" },
        { label: "Tiền lãi đã trả", key: "interestPaid" },
        { label: "Thuế TNDN đã nộp", key: "incomeTaxPaid" },
        { label: "LC tiền thuần từ HĐĐT", key: "investingCashFlow" },
        { label: "Mua sắm TSCĐ", key: "purchaseOfFixedAssets" },
        { label: "Thu thanh lý tài sản", key: "proceedsFromDisposal" },
        { label: "Đầu tư vào công ty con", key: "investmentInSubsidiaries" },
        { label: "LC tiền thuần từ HĐTC", key: "financingCashFlow" },
        { label: "Tiền thu từ đi vay", key: "proceedsFromBorrowing" },
        { label: "Tiền trả nợ vay", key: "repaymentOfBorrowing" },
        { label: "Cổ tức đã trả", key: "dividendsPaid" },
        { label: "Thu phát hành cổ phiếu", key: "proceedsFromEquity" },
        { label: "Tăng/giảm tiền thuần", key: "netCashChange" },
        { label: "Tiền đầu kỳ", key: "beginningCash" },
        { label: "Tiền cuối kỳ", key: "endingCash" },
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String(d[row.key]));
        lines.push([escapeCSV(row.label), ...vals].join(","));
    }
    return lines.join("\n");
}

// ==================== MAIN COMPONENT ====================
export default function FinancialReportsTab() {
    const { stockInfo, ticker } = useStockDetail();
    const { data: reportData, loading, error } = useFinancialReports(ticker, 20);
    const [activeReport, setActiveReport] = useState<ReportType>("income");

    const isBank = reportData?.isBank ?? false;
    const reportLayout: ReportLayout = reportData?.reportLayout ?? (isBank ? "bank" : "nonFinancial");
    const reportLayoutLabel = reportData?.reportLayoutLabel || (reportLayout === "bank" ? "Ngân hàng" : reportLayout === "financial" ? "Tài chính" : reportLayout === "insurance" ? "Bảo hiểm" : "Phi tài chính");
    const dynamicTables = reportData?.reportTables;
    const hasDynamicRows = !!(
        dynamicTables &&
        ((dynamicTables.incomeStatement?.rows?.length ?? 0) > 0 ||
            (dynamicTables.balanceSheet?.rows?.length ?? 0) > 0 ||
            (dynamicTables.cashFlow?.rows?.length ?? 0) > 0)
    );

    const data = reportData
        ? {
              incomeStatements: reportData.incomeStatement,
              balanceSheets: reportData.balanceSheet,
              cashFlows: reportData.cashFlow,
          }
        : null;

    const reportTabs: { id: ReportType; label: string; icon: string }[] = [
        { id: "income", label: reportLayout === "bank" ? "KQKD Ngân hàng" : reportLayout === "insurance" ? "KQKD Bảo hiểm" : reportLayout === "financial" ? "KQKD Tài chính" : "Kết quả kinh doanh", icon: reportLayout === "bank" ? "🏦" : reportLayout === "insurance" ? "🛡️" : reportLayout === "financial" ? "💼" : "📋" },
        { id: "balance", label: reportLayout === "bank" ? "CĐKT Ngân hàng" : reportLayout === "insurance" ? "CĐKT Bảo hiểm" : reportLayout === "financial" ? "CĐKT Tài chính" : "Cân đối kế toán", icon: reportLayout === "bank" ? "🏦" : reportLayout === "insurance" ? "🛡️" : reportLayout === "financial" ? "💼" : "🏛️" },
        { id: "cashflow", label: "Lưu chuyển tiền tệ", icon: "💵" },
    ];

    // All hooks MUST be called before any early return (React Rules of Hooks)
    const handleExportCurrent = useCallback(() => {
        if (!data) return;
        const t = stockInfo.ticker;
        if (activeReport === "income") {
            downloadCSV(`${t}_ket_qua_kinh_doanh.csv`, buildIncomeCSV(data.incomeStatements));
        } else if (activeReport === "balance") {
            downloadCSV(`${t}_can_doi_ke_toan.csv`, buildBalanceCSV(data.balanceSheets));
        } else {
            downloadCSV(`${t}_luu_chuyen_tien_te.csv`, buildCashFlowCSV(data.cashFlows));
        }
    }, [activeReport, data, stockInfo.ticker]);

    const handleExportAll = useCallback(async () => {
        if (!data) return;
        const t = stockInfo.ticker;

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Dữ liệu & Dashboard", {
                views: [{ showGridLines: false }]
            });

            const income = data.incomeStatements;
            const balance = data.balanceSheets;
            const cashflow = data.cashFlows;
            const periods = income.map(s => s.period.period);
            const leftColCount = periods.length + 1;

            sheet.getColumn(1).width = 42;
            for (let i = 0; i < periods.length; i++) {
                sheet.getColumn(i + 2).width = 15;
            }

            // Row 1: Copyright / Logo text
            sheet.mergeCells(1, 1, 1, leftColCount);
            const copyrightCell = sheet.getCell(1, 1);
            copyrightCell.value = `© StockPro - Nền tảng phân tích đầu tư chứng khoán chuyên sâu`;
            copyrightCell.font = { name: 'Arial', size: 11, bold: true, italic: true, color: { argb: 'FFea580c' } }; // Orange tint
            copyrightCell.alignment = { vertical: 'middle', horizontal: 'left' };
            sheet.getRow(1).height = 25;

            // Row 3: Title
            sheet.mergeCells(3, 1, 3, leftColCount);
            const titleCell = sheet.getCell(3, 1);
            titleCell.value = `BÁO CÁO TÀI CHÍNH VÀ PHÂN TÍCH SỐ LIỆU - ${t}`;
            titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(3).height = 30;

            const headerRow = sheet.getRow(5);
            headerRow.getCell(1).value = "Chỉ tiêu (Tỷ VNĐ)";
            periods.forEach((p, idx) => {
                headerRow.getCell(idx + 2).value = p;
            });
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            for(let i=1; i<=leftColCount; i++) {
                const cell = headerRow.getCell(i);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: {style:'thin', color: {argb:'FFB4C6E7'}}, left: {style:'thin', color: {argb:'FFB4C6E7'}}, bottom: {style:'thin', color: {argb:'FFB4C6E7'}}, right: {style:'thin', color: {argb:'FFB4C6E7'}} };
            }
            headerRow.height = 25;

            let currentRowIdx = 6;

            const addSectionHeader = (title: string) => {
                sheet.mergeCells(currentRowIdx, 1, currentRowIdx, leftColCount);
                const cell = sheet.getCell(currentRowIdx, 1);
                cell.value = title;
                cell.font = { bold: true, size: 11, color: {argb: 'FF1F4E78'} };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                cell.alignment = { vertical: 'middle' };
                cell.border = { top: {style:'thin', color: {argb:'FF8EA9DB'}}, bottom: {style:'thin', color: {argb:'FF8EA9DB'}} };
                sheet.getRow(currentRowIdx).height = 25;
                currentRowIdx++;
            };

            const addDataRow = (metricName: string, dataArray: any[], keyName: string, isBold = false) => {
                const row = sheet.getRow(currentRowIdx);
                const leftCell = row.getCell(1);
                leftCell.value = metricName;
                leftCell.border = { left: {style:'thin', color: {argb:'FF8EA9DB'}}, right: {style:'thin', color: {argb:'FF8EA9DB'}} };
                if (isBold) leftCell.font = { bold: true };
                
                dataArray.forEach((item, index) => {
                    const cell = row.getCell(index + 2);
                    let val = item[keyName] || 0;
                    if (typeof val === "number") {
                        if (keyName === "eps") {
                            cell.value = val;
                            cell.numFmt = '#,##0';
                        } else {
                            cell.value = +(val / 1_000_000_000).toFixed(2);
                            cell.numFmt = '#,##0.00';
                        }
                    } else {
                        cell.value = val;
                    }
                    cell.border = { right: {style:'thin', color: {argb:'FF8EA9DB'}} };
                    if (isBold) cell.font = { bold: true };
                });
                
                for(let i=1; i<=leftColCount; i++) {
                    const c = row.getCell(i);
                    c.border = { ...c.border, bottom: {style:'hair', color: {argb:'FFD9E1F2'}} };
                }
                currentRowIdx++;
            };

            if (isBank) {
                addSectionHeader("KẾT QUẢ KINH DOANH NGÂN HÀNG");
                addDataRow("Thu nhập lãi thuần", income, "netInterestIncome", true);
                addDataRow("Thu nhập lãi và các khoản tương đương", income, "interestIncome");
                addDataRow("Chi phí lãi và các khoản tương đương", income, "interestExpenseBank");
                addDataRow("Tổng thu nhập ngoài lãi", income, "totalOperatingIncome", true);
                addDataRow("Lãi/lỗ thuần dịch vụ & phí", income, "netServiceFeeIncome");
                addDataRow("Lãi/lỗ ngoại tệ", income, "tradingFxIncome");
                addDataRow("Lãi/lỗ mua bán chứng khoán kinh doanh", income, "tradingSecuritiesIncome");
                addDataRow("Lãi/lỗ từ chứng khoán đầu tư", income, "investmentSecuritiesIncome");
                addDataRow("Thu nhập từ hoạt động khác", income, "otherOperatingIncome");
                addDataRow("Chi phí hoạt động", income, "operatingExpenses", true);
                addDataRow("Lợi nhuận trước dự phòng (PPOP)", income, "prePpopProfit", true);
                addDataRow("Chi phí dự phòng rủi ro tín dụng", income, "provisionExpenses", true);
                addDataRow("Lợi nhuận trước thuế", income, "profitBeforeTax", true);
                addDataRow("Thuế TNDN", income, "incomeTax");
                addDataRow("Lợi nhuận sau thuế (LNST)", income, "netProfit", true);
                addDataRow("LNST của CĐ công ty mẹ", income, "netProfitParent");
                addDataRow("EPS (VND)", income, "eps");
                
                addSectionHeader("CÂN ĐỐI KẾ TOÁN NGÂN HÀNG");
                addDataRow("TÀI SẢN", balance, "totalAssets", true);
                addDataRow("Tiền và tương đương tiền", balance, "cash");
                addDataRow("Tiền gửi tại NHNN", balance, "sbvDeposits");
                addDataRow("Tiền gửi tại TCTD khác (tài sản)", balance, "interBankDeposits");
                addDataRow("Chứng khoán kinh doanh", balance, "tradingSecurities");
                addDataRow("Chứng khoán đầu tư", balance, "investmentSecurities");
                addDataRow("Cho vay khách hàng (gộp)", balance, "loansToCustomersGross");
                addDataRow("Dự phòng rủi ro cho vay", balance, "loanLossReserves");
                addDataRow("Cho vay khách hàng (thuần)", balance, "loansToCustomers", true);
                addDataRow("Tài sản cố định", balance, "fixedAssets");
                addDataRow("Đầu tư TC dài hạn", balance, "longTermInvestments");

                addDataRow("NGUỒN VỐN", balance, "totalLiabilitiesAndEquity", true);
                addDataRow("Tổng nợ phải trả", balance, "totalLiabilities", true);
                addDataRow("Tiền gửi của NHNN và TCTD", balance, "sbvDeposits");
                addDataRow("Tiền gửi khách hàng", balance, "customerDeposits", true);
                addDataRow("Phát hành giấy tờ có giá", balance, "debtSecuritiesIssued");
                
                addDataRow("Vốn chủ sở hữu", balance, "totalEquity", true);
                addDataRow("Vốn điều lệ", balance, "charterCapital");
                addDataRow("LN chưa phân phối", balance, "retainedEarnings");
                addDataRow("Tổng nguồn vốn", balance, "totalLiabilitiesAndEquity", true);
            } else {
                addSectionHeader("KẾT QUẢ KINH DOANH");
                addDataRow("Doanh thu thuần", income, "revenue", true);
                addDataRow("Giá vốn hàng bán", income, "costOfGoodsSold");
                addDataRow("Lợi nhuận gộp", income, "grossProfit", true);
                addDataRow("Chi phí bán hàng", income, "sellingExpenses");
                addDataRow("Chi phí quản lý DN", income, "adminExpenses");
                addDataRow("Lợi nhuận từ HĐKD", income, "operatingProfit", true);
                addDataRow("Doanh thu tài chính", income, "financialIncome");
                addDataRow("Chi phí tài chính", income, "financialExpenses");
                addDataRow("Trong đó: Chi phí lãi vay", income, "interestExpenses");
                addDataRow("Lợi nhuận trước thuế", income, "profitBeforeTax", true);
                addDataRow("Thuế TNDN", income, "incomeTax");
                addDataRow("Lợi nhuận sau thuế", income, "netProfit", true);
                addDataRow("LNST của CĐ công ty mẹ", income, "netProfitParent", true);
                addDataRow("EPS (VND)", income, "eps");

                addSectionHeader("CÂN ĐỐI KẾ TOÁN");
                addDataRow("Tổng tài sản", balance, "totalAssets", true);
                addDataRow("Tài sản ngắn hạn", balance, "currentAssets", true);
                addDataRow("Tiền & tương đương tiền", balance, "cash");
                addDataRow("Đầu tư TC ngắn hạn", balance, "shortTermInvestments");
                addDataRow("Phải thu ngắn hạn", balance, "shortTermReceivables");
                addDataRow("Hàng tồn kho", balance, "inventory");
                addDataRow("Tài sản dài hạn", balance, "nonCurrentAssets", true);
                addDataRow("Tài sản cố định", balance, "fixedAssets");
                addDataRow("Đầu tư TC dài hạn", balance, "longTermInvestments");

                addDataRow("Tổng nợ phải trả", balance, "totalLiabilities", true);
                addDataRow("Nợ ngắn hạn", balance, "currentLiabilities");
                addDataRow("Nợ dài hạn", balance, "longTermLiabilities");

                addDataRow("Vốn chủ sở hữu", balance, "totalEquity", true);
                addDataRow("Vốn điều lệ", balance, "charterCapital");
                addDataRow("LN chưa phân phối", balance, "retainedEarnings");
                addDataRow("Tổng nguồn vốn", balance, "totalLiabilitiesAndEquity", true);
            }

            addSectionHeader("LƯU CHUYỂN TIỀN TỆ");
            addDataRow("Lưu chuyển tiền thuần từ HĐKD", cashflow, "operatingCashFlow", true);
            addDataRow("Lợi nhuận trước thuế", cashflow, "profitBeforeTax");
            addDataRow("Khấu hao TSCĐ", cashflow, "depreciationAmortization");
            addDataRow("Dự phòng", cashflow, "provisionsAndReserves");
            addDataRow("Thay đổi vốn lưu động", cashflow, "workingCapitalChanges");
            addDataRow("Tiền lãi đã trả", cashflow, "interestPaid");
            addDataRow("Thuế TNDN đã nộp", cashflow, "incomeTaxPaid");

            addDataRow("Lưu chuyển tiền thuần từ HĐĐT", cashflow, "investingCashFlow", true);
            addDataRow("Mua sắm TSCĐ", cashflow, "purchaseOfFixedAssets");
            addDataRow("Thu thanh lý tài sản", cashflow, "proceedsFromDisposal");
            addDataRow("Đầu tư vào công ty con", cashflow, "investmentInSubsidiaries");

            addDataRow("Lưu chuyển tiền thuần từ HĐTC", cashflow, "financingCashFlow", true);
            addDataRow("Tiền thu từ đi vay", cashflow, "proceedsFromBorrowing");
            addDataRow("Tiền trả nợ vay", cashflow, "repaymentOfBorrowing");
            addDataRow("Cổ tức đã trả", cashflow, "dividendsPaid");
            addDataRow("Thu phát hành cổ phiếu", cashflow, "proceedsFromEquity");

            addDataRow("Tăng/giảm tiền thuần", cashflow, "netCashChange", true);
            addDataRow("Tiền đầu kỳ", cashflow, "beginningCash");
            addDataRow("Tiền cuối kỳ", cashflow, "endingCash", true);

            const lastRow = sheet.getRow(currentRowIdx - 1);
            for(let i=1; i<=leftColCount; i++) {
                const c = lastRow.getCell(i);
                c.border = { ...c.border, bottom: {style:'thin', color: {argb:'FF8EA9DB'}} };
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${t}_BaoCaoTaiChinh.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Lỗi xuất Excel:", err);
            alert("Có lỗi xảy ra khi xuất Excel. Xin thử lại.");
        }
    }, [data, stockInfo.ticker, isBank]);

    if (loading && !reportData) return <div className="text-center py-12 text-muted-foreground animate-pulse font-sans">Đang tải báo cáo tài chính…</div>;
    if (error && !reportData) return <div className="text-center py-12 text-red-500 font-sans">Lỗi: {error}</div>;
    if (!data) return null;

    return (
        <div className="space-y-4 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        {isBank && <Building2 className="w-5 h-5 text-blue-600" />}
                        Báo cáo tài chính
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{reportLayoutLabel}</span>
                        {" — "}{stockInfo.ticker}
                    </h2>
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                        So sánh các kỳ gần nhất • Đơn vị: Tỷ VND
                        {" • Cấu trúc BCTC theo bộ "}{reportLayoutLabel}
                        {hasDynamicRows && " • Mapping chỉ tiêu chuẩn hoá từ dữ liệu BCTC"}
                    </p>
                </div>
                <button
                    onClick={handleExportAll}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Tải toàn bộ Excel
                </button>
            </div>

            {/* Sub-tabs + Export current */}
            <div className="flex items-center justify-between border-b border-border pb-0">
                <div className="flex gap-1 flex-wrap">
                    {reportTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveReport(tab.id)}
                            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                                activeReport === tab.id
                                    ? "border-blue-500 text-blue-600 bg-blue-50/50"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                            <span className="mr-1.5">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleExportCurrent}
                    className="flex items-center gap-1.5 px-3 py-1.5 mb-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
                >
                    <Download className="w-3.5 h-3.5" />
                    Tải báo cáo này
                </button>
            </div>

            {/* Report content */}
            <FinancialErrorBoundary>
            {activeReport === "income" && hasDynamicRows && dynamicTables?.incomeStatement?.rows?.length ? (
                <DynamicReportTable
                    title={reportLayout === "bank" ? "🏦 KQKD Ngân hàng" : reportLayout === "insurance" ? "🛡️ KQKD Bảo hiểm" : reportLayout === "financial" ? "💼 KQKD Tài chính" : "📋 Kết quả kinh doanh"}
                    subtitle="Đơn vị: Tỷ VND"
                    reportType="incomeStatement"
                    reportLayout={reportLayout}
                    table={dynamicTables.incomeStatement}
                />
            ) : null}
            {activeReport === "balance" && hasDynamicRows && dynamicTables?.balanceSheet?.rows?.length ? (
                <DynamicReportTable
                    title={reportLayout === "bank" ? "🏦 Cân đối kế toán Ngân hàng" : reportLayout === "insurance" ? "🛡️ Cân đối kế toán Bảo hiểm" : reportLayout === "financial" ? "💼 Cân đối kế toán Tài chính" : "🏛️ Cân đối kế toán"}
                    subtitle="Đơn vị: Tỷ VND"
                    reportType="balanceSheet"
                    reportLayout={reportLayout}
                    table={dynamicTables.balanceSheet}
                />
            ) : null}
            {activeReport === "cashflow" && hasDynamicRows && dynamicTables?.cashFlow?.rows?.length ? (
                <DynamicReportTable
                    title="💵 Lưu chuyển tiền tệ"
                    subtitle="Đơn vị: Tỷ VND"
                    reportType="cashFlow"
                    reportLayout={reportLayout}
                    table={dynamicTables.cashFlow}
                />
            ) : null}

            {activeReport === "income" && data && (
                !hasDynamicRows && (isBank
                    ? <BankIncomeStatementTable data={data.incomeStatements} />
                    : <IncomeStatementTable data={data.incomeStatements} />)
            )}
            {activeReport === "balance" && data && (
                !hasDynamicRows && (isBank
                    ? <BankBalanceSheetTable data={data.balanceSheets} />
                    : <BalanceSheetTable data={data.balanceSheets} />)
            )}
            {activeReport === "cashflow" && data && (
                !hasDynamicRows && <CashFlowTable data={data.cashFlows} />
            )}
            </FinancialErrorBoundary>
        </div>
    );
}
