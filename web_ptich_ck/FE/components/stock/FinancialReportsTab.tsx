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
                                                <tr
                                                    key={row.indCode}
                                                    className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                                                        row.isparent || row.label?.includes("Cộng") || row.label?.includes("Tổng") || row.label?.includes("Kết quả")
                                                            ? "bg-muted/5 font-medium"
                                                            : ""
                                                    }`}
                                                >
                                                    <td
                                                        className={`px-4 py-2.5 sticky left-0 bg-card z-10 ${
                                                            row.isparent || row.label?.includes("Cộng") || row.label?.includes("Tổng") || row.label?.includes("Kết quả")
                                                                ? "font-semibold text-foreground"
                                                                : "font-normal text-muted-foreground"
                                                        } ${
                                                            row.ischild
                                                                    ? row.label?.startsWith("*")
                                                                        ? "pl-14"
                                                                        : "pl-8"
                                                                    : "pl-4"
                                                        }`}
                                                    >
                                                        {(row.label ?? "").replace(/^\*\s*/, "")}
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

// ==================== SECURITIES INCOME STATEMENT TABLE ====================
function FinIncomeStatementTable({ data }: { data: IncomeStatementItem[] }) {
    const periods = data.map((d) => d.period.period);

    type FinISRow = {
        label: string;
        key: any;
        bold?: boolean;
        indent?: boolean;
        section?: string;
    };

    const rows: FinISRow[] = [
        { label: "I. DOANH THU HOẠT ĐỘNG", key: "IS_OP_REV_TOTAL", bold: true, section: "header" },
        { label: "Cộng doanh thu hoạt động", key: "IS_OP_REV_TOTAL", bold: true },
        { label: "1.1. Lãi từ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)", key: "IS_FVTPL_PROFIT", bold: true },
        { label: "a. Lãi bán các tài sản tài chính (ở stt 1145)", key: "IS_FIN_SALE_GAIN", indent: true },
        { label: "b. Chênh lệch tăng đánh giá lại các TSTC thông qua lãi/lỗ", key: "IS_FVTPL_REVAL_GAIN", indent: true },
        { label: "c. Cổ tức tiền lãi phát sinh từ tài sản tài chính FVTPL", key: "IS_FVTPL_DIV", indent: true },
        { label: "1.2. Lãi từ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)", key: "IS_HTM_INT_INC" },
        { label: "1.3. Lãi từ các khoản cho vay và phải thu", key: "IS_LOAN_REC_INT_INC" },
        { label: "1.4. Lãi từ các tài sản tài chính sẵn sàng để bán (AFS)", key: "IS_AFS_PROFIT" },
        { label: "1.5. Lãi từ các công cụ phái sinh phòng ngừa rủi ro (ở stt 858)", key: "IS_PROFIT_LOSS_OTHER" },
        { label: "1.6. Doanh thu môi giới chứng khoán", key: "IS_REV_BROKERAGE" },
        { label: "1.7. Doanh thu bảo lãnh đại lý phát hành chứng khoán", key: "IS_REV_UWRITING" },
        { label: "1.8. Doanh thu tư vấn", key: "IS_REV_ADVISORY" },
        { label: "1.9. Doanh thu hoạt động nhận ủy thác đấu giá", key: "IS_REV_TRUST" },
        { label: "1.10. Doanh thu lưu ký chứng khoán", key: "IS_REV_DEPOSITARY" },
        { label: "1.11. Thu nhập hoạt động khác (ở stt 799)", key: "IS_OTHER_INC" },

        { label: "II. CHI PHÍ HOẠT ĐỘNG", key: "IS_OP_EXP_TOTAL", bold: true, section: "header" },
        { label: "Cộng chi phí hoạt động", key: "IS_OP_EXP_TOTAL", bold: true },
        { label: "2.1. Lỗ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)", key: "IS_FVTPL_LOSS", bold: true },
        { label: "a. Lỗ bán các tài sản tài chính (ở stt 1146)", key: "IS_FIN_SALE_LOSS", indent: true },
        { label: "b. Chênh lệch giảm đánh giá lại các TSTC thông qua lãi/lỗ", key: "IS_FVTPL_REVAL_LOSS", indent: true },
        { label: "c. Chi phí giao dịch mua các tài sản tài chính FVTPL", key: "IS_FVTPL_PURCHASE_EXP", indent: true },
        { label: "2.2. Lỗ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)", key: "IS_HTM_LOSS" },
        { label: "2.3. Chi phí lãi vay lỗ từ các khoản cho vay và phải thu", key: "IS_INT_EXP_LOANS" },
        { label: "2.4. Lỗ bán các tài sản tài chính sẵn sàng để bán (AFS)", key: "IS_AFS_SALE_LOSS" },
        { label: "2.5. Lỗ từ các tài sản tài chính phái sinh phòng ngừa rủi ro (ở stt 931)", key: "IS_PROFIT_LOSS_OTHER" },
        { label: "2.6. Chi phí hoạt động tự doanh", key: "IS_OP_EXP_PROP_TRAD" },
        { label: "2.7. Chi phí môi giới chứng khoán", key: "IS_OP_EXP_BROKERAGE" },
        { label: "2.8. Chi phí hoạt động bảo lãnh đại lý phát hành chứng khoán", key: "IS_OP_EXP_UWRITING" },
        { label: "2.9. Chi phí tư vấn", key: "IS_OP_EXP_ADVISORY" },
        { label: "2.10. Chi phí hoạt động đấu giá ủy thác", key: "IS_OP_EXP_TRUST" },
        { label: "2.11. Chi phí lưu ký chứng khoán", key: "IS_OP_EXP_DEPOSITARY" },
        { label: "2.12. Chi phí khác (ở stt 920)", key: "IS_OTHER_EXP" },
        { label: "* Trong đó: Chi phí sửa lỗi giao dịch chứng khoán, lỗi khác", key: "IS_OP_EXP_SEC_ERROR", indent: true },

        { label: "III. DOANH THU HOẠT ĐỘNG TÀI CHÍNH", key: "IS_FIN_REV_TOTAL", bold: true, section: "header" },
        { label: "Cộng doanh thu hoạt động tài chính", key: "IS_FIN_REV_TOTAL", bold: true },
        { label: "3.1. Chênh lệch lãi tỷ giá hối đoái đã và chưa thực hiện", key: "IS_FX_GAIN" },
        { label: "3.2. Doanh thu dự thu cổ tức, lãi tiền gửi không cố định phát sinh trong kỳ", key: "IS_REV_DIV_ACCRUED" },
        { label: "3.3. Lãi bán thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh", key: "IS_SUB_JV_SALE_GAIN" },
        { label: "3.4. Doanh thu khác về đầu tư", key: "IS_INV_INC" },

        { label: "IV. CHI PHÍ TÀI CHÍNH", key: "IS_FIN_EXP", bold: true, section: "header" },
        { label: "Cộng chi phí tài chính (ở stt 1182)", key: "IS_FIN_EXP", bold: true },
        { label: "4.1. Chênh lệch lỗ tỷ giá hối đoái đã và chưa thực hiện", key: "IS_FX_LOSS" },
        { label: "4.2. Chi phí lãi vay (ở stt 1033)", key: "IS_INT_EXP" },
        { label: "4.3. Lỗ bán thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh", key: "IS_SUB_JV_SALE_LOSS" },
        { label: "4.4. Chi phí đầu tư khác", key: "IS_INV_OTHER_EXP" },

        { label: "V. CHI BÁN HÀNG", key: "IS_SELL_EXP", bold: true, section: "header" },
        { label: "Chi bán hàng", key: "IS_SELL_EXP", bold: true },

        { label: "VI. CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN", key: "IS_GA_EXP", bold: true, section: "header" },
        { label: "Chi phí quản lý công ty chứng khoán (ở stt 24 và 1277)", key: "IS_GA_EXP", bold: true },

        { label: "VII. KẾT QUẢ HOẠT ĐỘNG", key: "IS_OP_RESULT", bold: true, section: "header" },
        { label: "Kết quả hoạt động", key: "IS_OP_RESULT", bold: true },

        { label: "VIII. THU NHẬP KHÁC VÀ CHI PHÍ KHÁC", key: "IS_OTHER_PROFIT", bold: true, section: "header" },
        { label: "Cộng kết quả hoạt động khác (ở stt 1185)", key: "IS_OTHER_PROFIT", bold: true },
        { label: "8.1. Thu nhập khác (ở stt 1120)", key: "IS_OTHER_INC" },
        { label: "8.2. Chi phí khác (ở stt 1121)", key: "IS_OTHER_EXP" },

        { label: "IX. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ", key: "IS_PBT", bold: true, section: "header" },
        { label: "Tổng lợi nhuận kế toán trước thuế (ở stt 1234)", key: "IS_PBT", bold: true },
        { label: "9.1. Lợi nhuận đã thực hiện (ở stt 1133)", key: "IS_REALIZED_PROFIT" },
        { label: "9.2. Lợi nhuận chưa thực hiện (ở stt 1134)", key: "BS_UNREALIZED_PROFIT" },

        { label: "X. CHI PHÍ THUẾ TNDN", key: "IS_TAX_EXP", bold: true, section: "header" },
        { label: "Chi phí thuế TNDN (ở stt 1295)", key: "IS_TAX_EXP", bold: true },
        { label: "10.1. Chi phí thuế TNDN hiện hành (ở stt 786)", key: "IS_TAX_CURRENT" },
        { label: "10.2. Chi phí thuế TNDN hoãn lại (ở stt 787)", key: "IS_TAX_DEFERRED" },

        { label: "XI. LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN", key: "IS_NPAT", bold: true, section: "header" },
        { label: "Lợi nhuận kế toán sau thuế TNDN (ở stt 1300)", key: "IS_NPAT", bold: true },
        { label: "11.1. Lợi nhuận sau thuế phân bổ cho chủ sở hữu (ở stt 798)", key: "IS_NPAT_OWNER" },
        { label: "11.2. Lợi nhuận sau thuế trích các Quỹ dự trữ điều lệ, Quỹ Dự phòng tài chính và rủi ro nghề nghiệp", key: "IS_NPAT_POST_RESERVE" },
        { label: "11.3. Lợi nhuận thuần phân bổ cho lợi ích của cổ đông không kiểm soát (ở stt 801)", key: "IS_MINORITY_INTEREST" },

        { label: "XII. THU NHẬP (LỖ) TOÀN DIỆN KHÁC SAU THUẾ TNDN", key: "IS_COMPREHENSIVE_INCOME_POST_TAX", bold: true, section: "header" },
        { label: "Thu nhập (Lỗ) toàn diện khác sau thuế TNDN (ở stt 1299)", key: "IS_COMPREHENSIVE_INCOME_POST_TAX", bold: true },
        { label: "Tổng thu nhập toàn diện", key: "IS_COMPREHENSIVE_INCOME_TOTAL" },
        { label: "Thu nhập toàn diện phân bổ cho chủ sở hữu", key: "IS_COMPREHENSIVE_INCOME_OWNER" },
        { label: "Thu nhập toàn diện phân bổ cho cổ đông không nắm quyền kiểm soát", key: "IS_COMPREHENSIVE_INCOME_MI" },
        { label: "12.1. Lãi/(Lỗ) từ đánh giá lại các khoản đầu tư giữ đến ngày đáo hạn", key: "IS_HTM_REVAL_PROFIT" },
        { label: "12.2. Lãi/(Lỗ) từ đánh giá lại các tài sản tài chính sẵn sàng để bán", key: "IS_AFS_REVAL_PROFIT" },
        { label: "12.3. Lãi (Lỗ) toàn diện khác được chia từ hoạt động đầu tư vào công ty con, công ty liên kết, liên doanh", key: "IS_OCI_SUB_JV_ASSOC" },
        { label: "12.4. Lãi/(Lỗ) từ đánh giá lại các công cụ tài chính phái sinh (ở stt 817)", key: "IS_PROFIT_LOSS_OTHER" },
        { label: "12.5. Lãi/(Lỗ) chênh lệch tỷ giá của hoạt động tại nước ngoài", key: "IS_FX_FOREIGN_OP_PROFIT" },
        { label: "12.6. Lãi/(Lỗ) từ các khoản đầu tư vào công ty con, công ty liên kết, liên doanh chưa chia (ở stt 819)", key: "IS_PROFIT_LOSS_OTHER" },
        { label: "12.7. Lãi/(Lỗ) đánh giá công cụ phái sinh", key: "IS_DERIVATIVES_REVAL_PROFIT" },
        { label: "12.8. Lãi/(Lỗ) đánh giá lại tài sản cố định theo mô hình giá trị hợp lý", key: "IS_FA_REVAL_FV_PROFIT" },

        { label: "XIII. THU NHẬP THUẦN TRÊN CỔ PHIẾU PHỔ THÔNG", key: "IS_EPS_BASIC", bold: true, section: "header" },
        { label: "13.1. Lãi cơ bản trên cổ phiếu (Đồng/1 cổ phiếu) (ở stt 835 hoặc stt 1297)", key: "IS_EPS_BASIC" },
        { label: "13.2. Thu nhập pha loãng trên cổ phiếu (Đồng/1 cổ phiếu)", key: "IS_EPS_DILUTED" }
    ];

    return (
        <ReportTable
            title="💼 KQKD Tài chính"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows as any}
            data={data as any}
        />
    );
}

// ==================== BANK INCOME STATEMENT TABLE ====================
function BankIncomeStatementTable({ data }: { data: IncomeStatementItem[] }) {
    const periods = data.map((d) => d.period.period);

    type BankISRow = {
        label: string;
        key: any;
        bold?: boolean;
        indent?: boolean;
        section?: string;
    };

    const rows: BankISRow[] = [
        { label: "Thu nhập lãi thuần", key: "netInterestIncome", bold: true, section: "header" },
        { label: "Thu nhập từ lãi và các khoản thu nhập tương tự", key: "interestIncome", indent: true },
        { label: "Chi phí lãi và các chi phí tương tự", key: "interestExpenseBank", indent: true },
        { label: "Lại/Lỗ thuần từ hoạt động dịch vụ", key: "netServiceFeeIncome", bold: true, section: "header" },
        { label: "Thu nhập từ hoạt động dịch vụ", key: "serviceIncome", indent: true },
        { label: "Chi phí hoạt động dịch vụ", key: "serviceExpense", indent: true },
        { label: "Lại/Lỗ thuần từ hoạt động kinh doanh ngoại hối", key: "tradingFxIncome", bold: true },
        { label: "Lại/Lỗ thuần từ mua bán chứng khoán kinh doanh", key: "tradingSecuritiesIncome", bold: true },
        { label: "Lại/Lỗ thuần từ mua bán chứng khoán đầu tư", key: "investmentSecuritiesIncome", bold: true },
        { label: "Lại/Lỗ thuần từ hoạt động khác", key: "otherOperatingIncome", bold: true, section: "header" },
        { label: "Thu nhập từ hoạt động khác", key: "otherIncome", indent: true },
        { label: "Chi phí hoạt động khác", key: "otherExpense", indent: true },
        { label: "Thu nhập từ hoạt động góp vốn mua cổ phần", key: "shareInvestmentIncome", bold: true },
        { label: "Chi phí hoạt động", key: "operatingExpenses", bold: true },
        { label: "Lợi nhuận từ HDKD trước chi phí dự phòng rủi ro tín dụng", key: "prePpopProfit", bold: true },
        { label: "Chi phí dự phòng rủi ro tín dụng", key: "provisionExpenses", bold: true },
        { label: "Tổng lợi nhuận trước thuế", key: "profitBeforeTax", bold: true },
        { label: "Chi phí thuế TNDN", key: "incomeTax", bold: true, section: "header" },
        { label: "Chi phí thuế thu nhập hiện hành", key: "currentIncomeTax", indent: true },
        { label: "Chi phí thuế TNDN giữ lại", key: "retainedIncomeTax", indent: true },
        { label: "Lợi nhuận sau thuế thu nhập doanh nghiệp", key: "netProfit", bold: true, section: "header" },
        { label: "Lợi ích của cổ đông thiểu số và cổ tức ưu đãi", key: "minorityInterestPref", indent: true },
        { label: "LNST sau khi điều chỉnh Lợi ích của CĐTS và Cổ tức ưu đãi", key: "netProfitParentAdj", indent: true },
    ];

    return (
        <ReportTable
            title="🏦 KQKD Ngân hàng"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows as any}
            data={data as any}
        />
    );
}

// ==================== BANK BALANCE SHEET TABLE ====================
function BankBalanceSheetTable({ data }: { data: BalanceSheetItem[] }) {
    const periods = data.map((d) => d.period.period);

    type BankBSRow = {
        label: string;
        key: any;
        bold?: boolean;
        indent?: boolean;
        section?: string;
    };

    const rows: BankBSRow[] = [
        { label: "TÀI SẢN", key: "totalAssets", bold: true, section: "header" },
        { label: "I. Tiền mặt chứng từ có giá trị ngoại tệ kim loại quý đá quý", key: "cashValuables", indent: true },
        { label: "II. Tiền gửi tại NHNN", key: "sbvDeposits", indent: true },
        { label: "III. Tín phiếu kho bạc và các giấy tờ có giá ngắn hạn đủ tiêu chuẩn khác", key: "treasuryBills", indent: true },
        { label: "IV. Tiền vàng gửi tại các TCTD khác và cho vay các TCTD khác", key: "interBankDepositsLoans", indent: true, bold: true },
        { label: "Tiền Vàng gửi tại các TCTD khác", key: "interBankDeposits", indent: true },
        { label: "Cho vay các TCTD khác", key: "interBankLoans", indent: true },
        { label: "Dự phòng rủi ro cho vay các TCTD khác", key: "interBankLoansProv", indent: true },
        { label: "V. Chứng khoán kinh doanh", key: "tradingSecurities", indent: true, bold: true },
        { label: "Chứng khoán kinh doanh", key: "tradingSecurities", indent: true },
        { label: "Dự phòng giảm giá chứng khoán kinh doanh", key: "tradingSecuritiesProv", indent: true },
        { label: "VI. Các công cụ tài chính phái sinh và các tài sản tài chính khác", key: "derivativesAsset", indent: true },
        { label: "VII. Cho vay khách hàng", key: "loansToCustomers", indent: true, bold: true },
        { label: "Cho vay khách hàng", key: "loansToCustomersGross", indent: true },
        { label: "Dự phòng rủi ro cho vay khách hàng", key: "loanLossReserves", indent: true },
        { label: "VIII. Chứng khoán đầu tư", key: "investmentSecurities", indent: true, bold: true },
        { label: "Chứng khoán đầu tư sẵn sàng để bán", key: "investmentSecuritiesAFS", indent: true },
        { label: "Chứng khoán đầu tư giữ đến ngày đáo hạn", key: "investmentSecuritiesHTM", indent: true },
        { label: "Dự phòng giảm giá chứng khoán đầu tư", key: "investmentSecuritiesProv", indent: true },
        { label: "IX. Góp vốn đầu tư dài hạn", key: "longTermInvestments", indent: true, bold: true },
        { label: "Đầu tư vào công ty con", key: "subsidiaryInvestments", indent: true },
        { label: "Góp vốn liên doanh", key: "jvInvestments", indent: true },
        { label: "Đầu tư vào công ty liên kết", key: "assocInvestments", indent: true },
        { label: "Đầu tư dài hạn khác", key: "otherLongTermInvestments", indent: true },
        { label: "Dự phòng giảm giá đầu tư dài hạn", key: "longTermInvestmentsProv", indent: true },
        { label: "X. Tài sản cố định", key: "fixedAssets", indent: true, bold: true },
        { label: "Tài sản cố định hữu hình", key: "tangibleFixedAssets", indent: true },
        { label: "Nguyên giá", key: "historicalCost", indent: true },
        { label: "Giá trị hao mòn lũy kế", key: "accumulatedDepreciation", indent: true },
        { label: "Tài sản cố định thuê tài chính", key: "financeLeaseFixedAssets", indent: true },
        { label: "Nguyên giá", key: "historicalCost", indent: true },
        { label: "Giá trị hao mòn lũy kế", key: "accumulatedDepreciation", indent: true },
        { label: "Tài sản cố định vô hình", key: "intangibleFixedAssets", indent: true },
        { label: "Nguyên giá", key: "historicalCost", indent: true },
        { label: "Giá trị hao mòn lũy kế", key: "accumulatedDepreciation", indent: true },
        { label: "Chi phí XDCB dở dang", key: "wipConstruction", indent: true },
        { label: "XI. Bất động sản đầu tư", key: "investmentProperty", indent: true, bold: true },
        { label: "Nguyên giá", key: "historicalCost", indent: true },
        { label: "Giá trị hao mòn lũy kế", key: "accumulatedDepreciation", indent: true },
        { label: "XII. Tài sản có khác", key: "otherAssets", indent: true, bold: true },
        { label: "Các khoản phải thu", key: "receivables", indent: true },
        { label: "Các khoản lãi phí phải thu", key: "interestFeeReceivables", indent: true },
        { label: "Tài sản thuế TNDN hoãn lại", key: "deferredTaxAsset", indent: true },
        { label: "Tài sản có khác", key: "otherAssets", indent: true },
        { label: "Trong đó: Lợi thế thương mại", key: "goodwill", indent: true },
        { label: "Các khoản dự phòng rủi ro cho các tài sản có nội bảng khác", key: "otherAssetProvision", indent: true },
        { label: "TỔNG CỘNG TÀI SẢN", key: "totalAssets", bold: true },

        { label: "NGUỒN VỐN", key: "totalCapital", bold: true, section: "header" },
        { label: "I. Các khoản nợ chính phủ và NHNN", key: "govDebt", indent: true },
        { label: "II. Tiền gửi và cho vay các TCTD khác", key: "interBankDepositsLoansLiab", indent: true, bold: true },
        { label: "Tiền gửi các tổ chức tín dụng khác", key: "interBankDepositsLiab", indent: true },
        { label: "Vay các TCTD khác", key: "interBankLoansLiab", indent: true },
        { label: "III. Tiền gửi khách hàng", key: "customerDeposits", indent: true },
        { label: "IV. Các công cụ tài chính phái sinh và các khoản nợ tài chính khác", key: "derivativesLiab", indent: true },
        { label: "V. Vốn tài trợ uỷ thác đầu tư mà ngân hàng chịu rủi ro", key: "sponsoredFundsRisk", indent: true },
        { label: "VI. Phát hành giấy tờ có giá", key: "debtSecuritiesIssued", indent: true },
        { label: "VII. Các khoản nợ khác", key: "otherLiabilities", indent: true, bold: true },
        { label: "Các khoản lãi phí phải trả", key: "interestFeePayables", indent: true },
        { label: "Thuế TNDN hoãn lại phải trả", key: "deferredTaxLiabilities", indent: true },
        { label: "Các khoản phải trả và công nợ khác", key: "otherPayables", indent: true },
        { label: "Dự phòng rủi ro khác", key: "otherRiskProvisions", indent: true },
        { label: "VIII. Vốn chủ sở hữu", key: "totalEquity", indent: true, bold: true },
        { label: "Vốn của Tổ chức tín dụng", key: "ciCapital", indent: true },
        { label: "Vốn điều lệ", key: "charterCapital", indent: true },
        { label: "Vốn đầu tư XDCB", key: "constructionInvCapital", indent: true },
        { label: "Thặng dư vốn cổ phần", key: "sharePremium", indent: true },
        { label: "Cổ phiếu quỹ", key: "treasuryStock", indent: true },
        { label: "Cổ phiếu ưu đãi", key: "prefStock", indent: true },
        { label: "Vốn khác", key: "otherCapital", indent: true },
        { label: "Quỹ của TCTD", key: "ciFunds", indent: true },
        { label: "Chênh lệch tỷ giá hối đoái", key: "fxReserve", indent: true },
        { label: "Chênh lệch đánh giá lại tài sản", key: "revalReserve", indent: true },
        { label: "Lợi nhuận chưa phân phối/Lỗ lũy kế", key: "retainedEarnings", indent: true },
        { label: "Nguồn kinh phí Quỹ khác", key: "fundOtherFunds", indent: true },
        { label: "IX. Lợi ích của cổ đông không kiểm soát", key: "minorityInterest", indent: true },
        { label: "TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU", key: "totalLiabilitiesAndEquity", bold: true },
    ];

    return (
        <ReportTable
            title="🏦 Cân đối kế toán Ngân hàng"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows as any}
            data={data as any}
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

function buildFinIncomeCSV(data: IncomeStatementItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: any }[] = [
        { label: "I. DOANH THU HOẠT ĐỘNG", key: "IS_OP_REV_TOTAL" },
        { label: "Cộng doanh thu hoạt động", key: "IS_OP_REV_TOTAL" },
        { label: "1.1. Lãi từ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)", key: "IS_FVTPL_PROFIT" },
        { label: "a. Lãi bán các tài sản tài chính (ở stt 1145)", key: "IS_FIN_SALE_GAIN" },
        { label: "b. Chênh lệch tăng đánh giá lại các TSTC thông qua lãi/lỗ", key: "IS_FVTPL_REVAL_GAIN" },
        { label: "c. Cổ tức tiền lãi phát sinh từ tài sản tài chính FVTPL", key: "IS_FVTPL_DIV" },
        { label: "1.2. Lãi từ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)", key: "IS_HTM_INT_INC" },
        { label: "1.3. Lãi từ các khoản cho vay và phải thu", key: "IS_LOAN_REC_INT_INC" },
        { label: "1.4. Lãi từ các tài sản tài chính sẵn sàng để bán (AFS)", key: "IS_AFS_PROFIT" },
        { label: "1.5. Lãi từ các công cụ phái sinh phòng ngừa rủi ro (ở stt 858)", key: "IS_PROFIT_LOSS_OTHER" },
        { label: "1.6. Doanh thu môi giới chứng khoán", key: "IS_REV_BROKERAGE" },
        { label: "1.7. Doanh thu bảo lãnh đại lý phát hành chứng khoán", key: "IS_REV_UWRITING" },
        { label: "1.8. Doanh thu tư vấn", key: "IS_REV_ADVISORY" },
        { label: "1.9. Doanh thu hoạt động nhận ủy thác đấu giá", key: "IS_REV_TRUST" },
        { label: "1.10. Doanh thu lưu ký chứng khoán", key: "IS_REV_DEPOSITARY" },
        { label: "1.11. Thu nhập hoạt động khác (ở stt 799)", key: "IS_OTHER_INC" },
        { label: "II. CHI PHÍ HOẠT ĐỘNG", key: "IS_OP_EXP_TOTAL" },
        { label: "Cộng chi phí hoạt động", key: "IS_OP_EXP_TOTAL" },
        { label: "2.1. Lỗ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL)", key: "IS_FVTPL_LOSS" },
        { label: "a. Lỗ bán các tài sản tài chính (ở stt 1146)", key: "IS_FIN_SALE_LOSS" },
        { label: "b. Chênh lệch giảm đánh giá lại các TSTC thông qua lãi/lỗ", key: "IS_FVTPL_REVAL_LOSS" },
        { label: "c. Chi phí giao dịch mua các tài sản tài chính FVTPL", key: "IS_FVTPL_PURCHASE_EXP" },
        { label: "2.2. Lỗ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM)", key: "IS_HTM_LOSS" },
        { label: "2.3. Chi phí lãi vay lỗ từ các khoản cho vay và phải thu", key: "IS_INT_EXP_LOANS" },
        { label: "2.4. Lỗ bán các tài sản tài chính sẵn sàng để bán (AFS)", key: "IS_AFS_SALE_LOSS" },
        { label: "2.5. Lỗ từ các tài sản tài chính phái sinh phòng ngừa rủi ro (ở stt 931)", key: "IS_PROFIT_LOSS_OTHER" },
        { label: "2.6. Chi phí hoạt động tự doanh", key: "IS_OP_EXP_PROP_TRAD" },
        { label: "2.7. Chi phí môi giới chứng khoán", key: "IS_OP_EXP_BROKERAGE" },
        { label: "2.8. Chi phí hoạt động bảo lãnh đại lý phát hành chứng khoán", key: "IS_OP_EXP_UWRITING" },
        { label: "2.9. Chi phí tư vấn", key: "IS_OP_EXP_ADVISORY" },
        { label: "2.10. Chi phí hoạt động đấu giá ủy thác", key: "IS_OP_EXP_TRUST" },
        { label: "2.11. Chi phí lưu ký chứng khoán", key: "IS_OP_EXP_DEPOSITARY" },
        { label: "2.12. Chi phí khác (ở stt 920)", key: "IS_OTHER_EXP" },
        { label: "Trong đó: Chi phí sửa lỗi giao dịch chứng khoán, lỗi khác", key: "IS_OP_EXP_SEC_ERROR" },
        { label: "III. DOANH THU HOẠT ĐỘNG TÀI CHÍNH", key: "IS_FIN_REV_TOTAL" },
        { label: "Cộng doanh thu hoạt động tài chính", key: "IS_FIN_REV_TOTAL" },
        { label: "3.1. Chênh lệch lãi tỷ giá hối đoái đã và chưa thực hiện", key: "IS_FX_GAIN" },
        { label: "3.2. Doanh thu dự thu cổ tức, lãi tiền gửi không cố định phát sinh trong kỳ", key: "IS_REV_DIV_ACCRUED" },
        { label: "3.3. Lãi bán thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh", key: "IS_SUB_JV_SALE_GAIN" },
        { label: "3.4. Doanh thu khác về đầu tư", key: "IS_INV_INC" },
        { label: "IV. CHI PHÍ TÀI CHÍNH", key: "IS_FIN_EXP" },
        { label: "Cộng chi phí tài chính (ở stt 1182)", key: "IS_FIN_EXP" },
        { label: "4.1. Chênh lệch lỗ tỷ giá hối đoái đã và chưa thực hiện", key: "IS_FX_LOSS" },
        { label: "4.2. Chi phí lãi vay (ở stt 1033)", key: "IS_INT_EXP" },
        { label: "4.3. Lỗ bán thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh", key: "IS_SUB_JV_SALE_LOSS" },
        { label: "4.4. Chi phí đầu tư khác", key: "IS_INV_OTHER_EXP" },
        { label: "V. CHI BÁN HÀNG", key: "IS_SELL_EXP" },
        { label: "Chi bán hàng", key: "IS_SELL_EXP" },
        { label: "VI. CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN", key: "IS_GA_EXP" },
        { label: "Chi phí quản lý công ty chứng khoán (ở stt 24 và 1277)", key: "IS_GA_EXP" },
        { label: "VII. KẾT QUẢ HOẠT ĐỘNG", key: "IS_OP_RESULT" },
        { label: "Kết quả hoạt động", key: "IS_OP_RESULT" },
        { label: "VIII. THU NHẬP KHÁC VÀ CHI PHÍ KHÁC", key: "IS_OTHER_PROFIT" },
        { label: "Cộng kết quả hoạt động khác (ở stt 1185)", key: "IS_OTHER_PROFIT" },
        { label: "8.1. Thu nhập khác (ở stt 1120)", key: "IS_OTHER_INC" },
        { label: "8.2. Chi phí khác (ở stt 1121)", key: "IS_OTHER_EXP" },
        { label: "IX. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ", key: "IS_PBT" },
        { label: "Tổng lợi nhuận kế toán trước thuế (ở stt 1234)", key: "IS_PBT" },
        { label: "9.1. Lợi nhuận đã thực hiện (ở stt 1133)", key: "IS_REALIZED_PROFIT" },
        { label: "9.2. Lợi nhuận chưa thực hiện (ở stt 1134)", key: "BS_UNREALIZED_PROFIT" },
        { label: "X. CHI PHÍ THUẾ TNDN", key: "IS_TAX_EXP" },
        { label: "Chi phí thuế TNDN (ở stt 1295)", key: "IS_TAX_EXP" },
        { label: "10.1. Chi phí thuế TNDN hiện hành (ở stt 786)", key: "IS_TAX_CURRENT" },
        { label: "10.2. Chi phí thuế TNDN hoãn lại (ở stt 787)", key: "IS_TAX_DEFERRED" },
        { label: "XI. LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN", key: "IS_NPAT" },
        { label: "Lợi nhuận kế toán sau thuế TNDN (ở stt 1300)", key: "IS_NPAT" },
        { label: "11.1. Lợi nhuận sau thuế phân bổ cho chủ sở hữu (ở stt 798)", key: "IS_NPAT_OWNER" },
        { label: "11.2. Lợi nhuận sau thuế trích các Quỹ dự trữ điều lệ, Quỹ Dự phòng tài chính và rủi ro nghề nghiệp", key: "IS_NPAT_POST_RESERVE" },
        { label: "11.3. Lợi nhuận thuần phân bổ cho lợi ích của cổ đông không kiểm soát (ở stt 801)", key: "IS_MINORITY_INTEREST" },
        { label: "XII. THU NHẬP (LỖ) TOÀN DIỆN KHÁC SAU THUẾ TNDN", key: "IS_COMPREHENSIVE_INCOME_POST_TAX" },
        { label: "Thu nhập (Lỗ) toàn diện khác sau thuế TNDN (ở stt 1299)", key: "IS_COMPREHENSIVE_INCOME_POST_TAX" },
        { label: "Tổng thu nhập toàn diện", key: "IS_COMPREHENSIVE_INCOME_TOTAL" },
        { label: "Thu nhập toàn diện phân bổ cho chủ sở hữu", key: "IS_COMPREHENSIVE_INCOME_OWNER" },
        { label: "Thu nhập toàn diện phân bổ cho cổ đông không nắm quyền kiểm soát", key: "IS_COMPREHENSIVE_INCOME_MI" },
        { label: "12.1. Lãi/(Lỗ) từ đánh giá lại các khoản đầu tư giữ đến ngày đáo hạn", key: "IS_HTM_REVAL_PROFIT" },
        { label: "12.2. Lãi/(Lỗ) từ đánh giá lại các tài sản tài chính sẵn sàng để bán", key: "IS_AFS_REVAL_PROFIT" },
        { label: "12.3. Lãi (Lỗ) toàn diện khác được chia từ hoạt động đầu tư vào công ty con, công ty liên kết, liên doanh", key: "IS_OCI_SUB_JV_ASSOC" },
        { label: "12.4. Lãi/(Lỗ) từ đánh giá lại các công cụ tài chính phái sinh (ở stt 817)", key: "IS_PROFIT_LOSS_OTHER" },
        { label: "12.5. Lãi/(Lỗ) chênh lệch tỷ giá của hoạt động tại nước ngoài", key: "IS_FX_FOREIGN_OP_PROFIT" },
        { label: "12.6. Lãi/(Lỗ) từ các khoản đầu tư vào công ty con, công ty liên kết, liên doanh chưa chia (ở stt 819)", key: "IS_PROFIT_LOSS_OTHER" },
        { label: "12.7. Lãi/(Lỗ) đánh giá công cụ phái sinh", key: "IS_DERIVATIVES_REVAL_PROFIT" },
        { label: "12.8. Lãi/(Lỗ) đánh giá lại tài sản cố định theo mô hình giá trị hợp lý", key: "IS_FA_REVAL_FV_PROFIT" },
        { label: "XIII. THU NHẬP THUẦN TRÊN CỔ PHIẾU PHỔ THÔNG", key: "IS_EPS_BASIC" },
        { label: "13.1. Lãi cơ bản trên cổ phiếu (Đồng/1 cổ phiếu) (ở stt 835 hoặc stt 1297)", key: "IS_EPS_BASIC" },
        { label: "13.2. Thu nhập pha loãng trên cổ phiếu (Đồng/1 cổ phiếu)", key: "IS_EPS_DILUTED" }
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String((d as any)[row.key] ?? 0));
        lines.push([escapeCSV(row.label), ...vals].join(","));
    }
    return lines.join("\n");
}

function buildBankIncomeCSV(data: IncomeStatementItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: any }[] = [
        { label: "Thu nhập lãi thuần", key: "netInterestIncome" },
        { label: "Thu nhập từ lãi và các khoản thu nhập tương tự", key: "interestIncome" },
        { label: "Chi phí lãi và các chi phí tương tự", key: "interestExpenseBank" },
        { label: "Lại/Lỗ thuần từ hoạt động dịch vụ", key: "netServiceFeeIncome" },
        { label: "Thu nhập từ hoạt động dịch vụ", key: "serviceIncome" },
        { label: "Chi phí hoạt động dịch vụ", key: "serviceExpense" },
        { label: "Lại/Lỗ thuần từ hoạt động kinh doanh ngoại hối", key: "tradingFxIncome" },
        { label: "Lại/Lỗ thuần từ mua bán chứng khoán kinh doanh", key: "tradingSecuritiesIncome" },
        { label: "Lại/Lỗ thuần từ mua bán chứng khoán đầu tư", key: "investmentSecuritiesIncome" },
        { label: "Lại/Lỗ thuần từ hoạt động khác", key: "otherOperatingIncome" },
        { label: "Thu nhập từ hoạt động khác", key: "otherIncome" },
        { label: "Chi phí hoạt động khác", key: "otherExpense" },
        { label: "Thu nhập từ hoạt động góp vốn mua cổ phần", key: "shareInvestmentIncome" },
        { label: "Chi phí hoạt động", key: "operatingExpenses" },
        { label: "Lợi nhuận từ HDKD trước chi phí dự phòng rủi ro tín dụng", key: "prePpopProfit" },
        { label: "Chi phí dự phòng rủi ro tín dụng", key: "provisionExpenses" },
        { label: "Tổng lợi nhuận trước thuế", key: "profitBeforeTax" },
        { label: "Chi phí thuế TNDN", key: "incomeTax" },
        { label: "Chi phí thuế thu nhập hiện hành", key: "currentIncomeTax" },
        { label: "Chi phí thuế TNDN giữ lại", key: "retainedIncomeTax" },
        { label: "Lợi nhuận sau thuế thu nhập doanh nghiệp", key: "netProfit" },
        { label: "Lợi ích của cổ đông thiểu số và cổ tức ưu đãi", key: "minorityInterestPref" },
        { label: "LNST sau khi điều chỉnh Lợi ích của CĐTS và Cổ tức ưu đãi", key: "netProfitParentAdj" },
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String((d as any)[row.key] ?? 0));
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

function buildBankBalanceCSV(data: BalanceSheetItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: any }[] = [
        { label: "TÀI SẢN", key: "totalAssets" },
        { label: "I. Tiền mặt chứng từ có giá trị ngoại tệ kim loại quý đá quý", key: "cashValuables" },
        { label: "II. Tiền gửi tại NHNN", key: "sbvDeposits" },
        { label: "III. Tín phiếu kho bạc và các giấy tờ có giá ngắn hạn đủ tiêu chuẩn khác", key: "treasuryBills" },
        { label: "IV. Tiền vàng gửi tại các TCTD khác và cho vay các TCTD khác", key: "interBankDepositsLoans" },
        { label: "Tiền Vàng gửi tại các TCTD khác", key: "interBankDeposits" },
        { label: "Cho vay các TCTD khác", key: "interBankLoans" },
        { label: "Dự phòng rủi ro cho vay các TCTD khác", key: "interBankLoansProv" },
        { label: "V. Chứng khoán kinh doanh", key: "tradingSecurities" },
        { label: "Dự phòng giảm giá chứng khoán kinh doanh", key: "tradingSecuritiesProv" },
        { label: "VI. Các công cụ tài chính phái sinh và các tài sản tài chính khác", key: "derivativesAsset" },
        { label: "VII. Cho vay khách hàng", key: "loansToCustomers" },
        { label: "Cho vay khách hàng (gộp)", key: "loansToCustomersGross" },
        { label: "Dự phòng rủi ro cho vay khách hàng", key: "loanLossReserves" },
        { label: "VIII. Chứng khoán đầu tư", key: "investmentSecurities" },
        { label: "Chứng khoán đầu tư sẵn sàng để bán", key: "investmentSecuritiesAFS" },
        { label: "Chứng khoán đầu tư giữ đến ngày đáo hạn", key: "investmentSecuritiesHTM" },
        { label: "Dự phòng giảm giá chứng khoán đầu tư", key: "investmentSecuritiesProv" },
        { label: "IX. Góp vốn đầu tư dài hạn", key: "longTermInvestments" },
        { label: "Đầu tư vào công ty con", key: "subsidiaryInvestments" },
        { label: "Góp vốn liên doanh", key: "jvInvestments" },
        { label: "Đầu tư vào công ty liên kết", key: "assocInvestments" },
        { label: "Đầu tư dài hạn khác", key: "otherLongTermInvestments" },
        { label: "Dự phòng giảm giá đầu tư dài hạn", key: "longTermInvestmentsProv" },
        { label: "X. Tài sản cố định", key: "fixedAssets" },
        { label: "Tài sản cố định hữu hình", key: "tangibleFixedAssets" },
        { label: "Nguyên giá", key: "historicalCost" },
        { label: "Giá trị hao mòn lũy kế", key: "accumulatedDepreciation" },
        { label: "Tài sản cố định thuê tài chính", key: "financeLeaseFixedAssets" },
        { label: "Nguyên giá", key: "historicalCost" },
        { label: "Giá trị hao mòn lũy kế", key: "accumulatedDepreciation" },
        { label: "Tài sản cố định vô hình", key: "intangibleFixedAssets" },
        { label: "Nguyên giá", key: "historicalCost" },
        { label: "Giá trị hao mòn lũy kế", key: "accumulatedDepreciation" },
        { label: "Chi phí XDCB dở dang", key: "wipConstruction" },
        { label: "XI. Bất động sản đầu tư", key: "investmentProperty" },
        { label: "Nguyên giá", key: "historicalCost" },
        { label: "Giá trị hao mòn lũy kế", key: "accumulatedDepreciation" },
        { label: "XII. Tài sản có khác", key: "otherAssets" },
        { label: "Các khoản phải thu", key: "receivables" },
        { label: "Các khoản lãi phí phải thu", key: "interestFeeReceivables" },
        { label: "Tài sản thuế TNDN hoãn lại", key: "deferredTaxAsset" },
        { label: "Tài sản có khác", key: "otherAssets" },
        { label: "Trong đó: Lợi thế thương mại", key: "goodwill" },
        { label: "Các khoản dự phòng rủi ro cho các tài sản có nội bảng khác", key: "otherAssetProvision" },
        { label: "TỔNG CỘNG TÀI SẢN", key: "totalAssets" },
        { label: "NGUỒN VỐN", key: "totalCapital" },
        { label: "I. Các khoản nợ chính phủ và NHNN", key: "govDebt" },
        { label: "II. Tiền gửi và cho vay các TCTD khác", key: "interBankDepositsLoansLiab" },
        { label: "Tiền gửi các tổ chức tín dụng khác", key: "interBankDepositsLiab" },
        { label: "Vay các TCTD khác", key: "interBankLoansLiab" },
        { label: "III. Tiền gửi khách hàng", key: "customerDeposits" },
        { label: "IV. Các công cụ tài chính phái sinh và các khoản nợ tài chính khác", key: "derivativesLiab" },
        { label: "V. Vốn tài trợ uỷ thác đầu tư mà ngân hàng chịu rủi ro", key: "sponsoredFundsRisk" },
        { label: "VI. Phát hành giấy tờ có giá", key: "debtSecuritiesIssued" },
        { label: "VII. Các khoản nợ khác", key: "otherLiabilities" },
        { label: "Các khoản lãi phí phải trả", key: "interestFeePayables" },
        { label: "Thuế TNDN hoãn lại phải trả", key: "deferredTaxLiabilities" },
        { label: "Các khoản phải trả và công nợ khác", key: "otherPayables" },
        { label: "Dự phòng rủi ro khác", key: "otherRiskProvisions" },
        { label: "VIII. Vốn chủ sở hữu", key: "totalEquity" },
        { label: "Vốn của Tổ chức tín dụng", key: "ciCapital" },
        { label: "Vốn điều lệ", key: "charterCapital" },
        { label: "Vốn đầu tư XDCB", key: "constructionInvCapital" },
        { label: "Thặng dư vốn cổ phần", key: "sharePremium" },
        { label: "Cổ phiếu quỹ", key: "treasuryStock" },
        { label: "Cổ phiếu ưu đãi", key: "prefStock" },
        { label: "Vốn khác", key: "otherCapital" },
        { label: "Quỹ của TCTD", key: "ciFunds" },
        { label: "Chênh lệch tỷ giá hối đoái", key: "fxReserve" },
        { label: "Chênh lệch đánh giá lại tài sản", key: "revalReserve" },
        { label: "Lợi nhuận chưa phân phối/Lỗ lũy kế", key: "retainedEarnings" },
        { label: "Nguồn kinh phí Quỹ khác", key: "fundOtherFunds" },
        { label: "IX. Lợi ích của cổ đông không kiểm soát", key: "minorityInterest" },
        { label: "TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU", key: "totalLiabilitiesAndEquity" },
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String((d as any)[row.key] ?? 0));
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
    const [periodType, setPeriodType] = useState<"quarter" | "year">("quarter");
    const { data: reportData, loading, error } = useFinancialReports(ticker, 20, null, periodType === "year" ? "0" : undefined);
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
            if (isBank) {
                downloadCSV(`${t}_ket_qua_kinh_doanh_ngan_hang.csv`, buildBankIncomeCSV(data.incomeStatements));
            } else if (reportLayout === "financial") {
                downloadCSV(`${t}_ket_qua_kinh_doanh_tai_chinh.csv`, buildFinIncomeCSV(data.incomeStatements));
            } else {
                downloadCSV(`${t}_ket_qua_kinh_doanh.csv`, buildIncomeCSV(data.incomeStatements));
            }
        } else if (activeReport === "balance") {
            if (isBank) {
                downloadCSV(`${t}_can_doi_ke_toan_ngan_hang.csv`, buildBankBalanceCSV(data.balanceSheets));
            } else {
                downloadCSV(`${t}_can_doi_ke_toan.csv`, buildBalanceCSV(data.balanceSheets));
            }
        } else {
            downloadCSV(`${t}_luu_chuyen_tien_te.csv`, buildCashFlowCSV(data.cashFlows));
        }
    }, [activeReport, data, stockInfo.ticker, isBank, reportLayout]);

    const handleExportAll = useCallback(async () => {
        const t = stockInfo.ticker;

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            
            // Fetch both quarter and year datasets in parallel
            const [qRes, yRes] = await Promise.all([
                fetch(`${apiBase}/api/v1/stock/${t}/financial-reports?periods=20`),
                fetch(`${apiBase}/api/v1/stock/${t}/financial-reports?periods=20&quarter=0`)
            ]);
            
            if (!qRes.ok || !yRes.ok) {
                throw new Error("Không thể lấy dữ liệu báo cáo tài chính từ máy chủ");
            }
            
            const qData = await qRes.json();
            const yData = await yRes.json();

            const workbook = new ExcelJS.Workbook();
            const sheetQ = workbook.addWorksheet("Báo cáo theo Quý", {
                views: [{ showGridLines: false }]
            });
            const sheetY = workbook.addWorksheet("Báo cáo theo Năm", {
                views: [{ showGridLines: false }]
            });

            const populateSheet = (sheet: ExcelJS.Worksheet, reportData: any, titleSuffix: string) => {
                const dynamicTables = reportData?.reportTables;
                const hasDynamicRows = !!(
                    dynamicTables &&
                    ((dynamicTables.incomeStatement?.rows?.length ?? 0) > 0 ||
                        (dynamicTables.balanceSheet?.rows?.length ?? 0) > 0 ||
                        (dynamicTables.cashFlow?.rows?.length ?? 0) > 0)
                );

                const income = reportData?.incomeStatement || [];
                const balance = reportData?.balanceSheet || [];
                const cashflow = reportData?.cashFlow || [];
                
                const isBankLocal = reportData?.isBank ?? false;
                const reportLayoutLocal: ReportLayout = reportData?.reportLayout ?? (isBankLocal ? "bank" : "nonFinancial");

                if (hasDynamicRows && dynamicTables) {
                    const dynIncome = dynamicTables.incomeStatement;
                    const dynBalance = dynamicTables.balanceSheet;
                    const dynCashflow = dynamicTables.cashFlow;
                    
                    const periods = dynIncome?.periods || [];
                    const leftColCount = periods.length + 1;

                    sheet.getColumn(1).width = 45;
                    for (let i = 0; i < periods.length; i++) {
                        sheet.getColumn(i + 2).width = 16;
                    }

                    // Row 1: Copyright / Logo text
                    sheet.mergeCells(1, 1, 1, leftColCount);
                    const copyrightCell = sheet.getCell(1, 1);
                    copyrightCell.value = `© StockPro - Nền tảng phân tích đầu tư chứng khoán chuyên sâu`;
                    copyrightCell.font = { name: 'Arial', size: 11, bold: true, italic: true, color: { argb: 'FFea580c' } };
                    copyrightCell.alignment = { vertical: 'middle', horizontal: 'left' };
                    sheet.getRow(1).height = 25;

                    // Row 3: Title
                    sheet.mergeCells(3, 1, 3, leftColCount);
                    const titleCell = sheet.getCell(3, 1);
                    titleCell.value = `BÁO CÁO TÀI CHÍNH VÀ PHÂN TÍCH SỐ LIỆU - ${t} (${titleSuffix})`;
                    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
                    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
                    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
                    sheet.getRow(3).height = 30;

                    const headerRow = sheet.getRow(5);
                    headerRow.getCell(1).value = "Chỉ tiêu (Tỷ VNĐ)";
                    periods.forEach((p: string, idx: number) => {
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

                    const addSectionHeader = (secTitle: string) => {
                        sheet.mergeCells(currentRowIdx, 1, currentRowIdx, leftColCount);
                        const cell = sheet.getCell(currentRowIdx, 1);
                        cell.value = secTitle;
                        cell.font = { bold: true, size: 11, color: {argb: 'FF1F4E78'} };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                        cell.alignment = { vertical: 'middle' };
                        cell.border = { top: {style:'thin', color: {argb:'FFB4C6E7'}}, left: {style:'thin', color: {argb:'FFB4C6E7'}}, bottom: {style:'thin', color: {argb:'FFB4C6E7'}}, right: {style:'thin', color: {argb:'FFB4C6E7'}} };
                        sheet.getRow(currentRowIdx).height = 24;
                        currentRowIdx++;
                    };

                    const addDynamicRows = (sectionTitle: string, tableObj: any) => {
                        if (!tableObj || !tableObj.rows?.length) return;
                        addSectionHeader(sectionTitle);
                        
                        const rows = tableObj.rows;
                        rows.forEach((row: any) => {
                            const excelRow = sheet.getRow(currentRowIdx);
                            const leftCell = excelRow.getCell(1);
                            
                            const cleanedLabel = (row.label || "").replace(/^\*\s*/, "");
                            let prefixSpace = "";
                            if (row.ischild) {
                                prefixSpace = row.label?.startsWith("*") ? "      " : "    ";
                            }
                            leftCell.value = prefixSpace + cleanedLabel;
                            leftCell.border = { left: {style:'thin', color: {argb:'FF8EA9DB'}}, right: {style:'thin', color: {argb:'FF8EA9DB'}} };
                            
                            const isBold = row.isparent || cleanedLabel.includes("Cộng") || cleanedLabel.includes("Tổng") || cleanedLabel.includes("Kết quả");
                            if (isBold) {
                                leftCell.font = { bold: true };
                            } else {
                                leftCell.font = { name: 'Arial', size: 10 };
                            }

                            const values = row.values || [];
                            values.forEach((val: number, valIdx: number) => {
                                const cell = excelRow.getCell(valIdx + 2);
                                if (typeof val === "number") {
                                    cell.value = +(val / 1_000_000_000).toFixed(2);
                                    cell.numFmt = '#,##0.00';
                                } else {
                                    cell.value = val;
                                }
                                cell.border = { right: {style:'thin', color: {argb:'FF8EA9DB'}} };
                                if (isBold) cell.font = { bold: true };
                            });

                            for(let i=1; i<=leftColCount; i++) {
                                const c = excelRow.getCell(i);
                                c.border = { ...c.border, bottom: {style:'hair', color: {argb:'FFD9E1F2'}} };
                            }
                            currentRowIdx++;
                        });
                    };

                    addDynamicRows(reportLayoutLocal === "bank" ? "KẾT QUẢ KINH DOANH NGÂN HÀNG" : reportLayoutLocal === "insurance" ? "KẾT QUẢ KINH DOANH BẢO HIỂM" : reportLayoutLocal === "financial" ? "KẾT QUẢ KINH DOANH TÀI CHÍNH" : "KẾT QUẢ HOẠT ĐỘNG KINH DOANH", dynIncome);
                    addDynamicRows(reportLayoutLocal === "bank" ? "CÂN ĐỐI KẾ TOÁN NGÂN HÀNG" : reportLayoutLocal === "insurance" ? "CÂN ĐỐI KẾ TOÁN BẢO HIỂM" : reportLayoutLocal === "financial" ? "CÂN ĐỐI KẾ TOÁN TÀI CHÍNH" : "BẢNG CÂN ĐỐI KẾ TOÁN", dynBalance);
                    addDynamicRows("BÁO CÁO LƯU CHUYỂN TIỀN TỆ", dynCashflow);

                    const lastRow = sheet.getRow(currentRowIdx - 1);
                    for(let i=1; i<=leftColCount; i++) {
                        const c = lastRow.getCell(i);
                        c.border = { ...c.border, bottom: {style:'thin', color: {argb:'FF8EA9DB'}} };
                    }
                } else {
                    // Fallback to static columns
                    const periods = income.map((s: any) => s.period.period);
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
                    titleCell.value = `BÁO CÁO TÀI CHÍNH VÀ PHÂN TÍCH SỐ LIỆU - ${t} (${titleSuffix})`;
                    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
                    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
                    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
                    sheet.getRow(3).height = 30;

                    const headerRow = sheet.getRow(5);
                    headerRow.getCell(1).value = "Chỉ tiêu (Tỷ VNĐ)";
                    periods.forEach((p: string, idx: number) => {
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
                        cell.border = { top: {style:'thin', color: {argb:'FFB4C6E7'}}, left: {style:'thin', color: {argb:'FFB4C6E7'}}, bottom: {style:'thin', color: {argb:'FFB4C6E7'}}, right: {style:'thin', color: {argb:'FFB4C6E7'}} };
                        sheet.getRow(currentRowIdx).height = 24;
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

                    if (isBankLocal) {
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
                        addDataRow("Dự phòng rủi ro cho vay khách hàng (*)", balance, "provisionForCustomerLoans");
                        addDataRow("Cho vay khách hàng (thuần)", balance, "loansToCustomersNet", true);
                        addDataRow("Tài sản tài chính khác", balance, "otherFinancialAssets");
                        addDataRow("Tài sản cố định", balance, "fixedAssets");
                        addDataRow("Tài sản dở dang khác", balance, "otherWipAssets");
                        addDataRow("Tài sản khác", balance, "otherAssets");
                        
                        addDataRow("NGUỒN VỐN", balance, "totalLiabilitiesAndEquity", true);
                        addDataRow("NỢ PHẢI TRẢ", balance, "totalLiabilities", true);
                        addDataRow("Tiền gửi và vay các TCTD khác", balance, "interBankDepositsAndLoans");
                        addDataRow("Tiền gửi của khách hàng", balance, "customerDeposits");
                        addDataRow("Công cụ tài chính phái sinh", balance, "derivativesAndOtherLiabilities");
                        addDataRow("Vay và nợ thuê tài chính khác", balance, "otherBorrowings");
                        addDataRow("Giấy tờ có giá", balance, "issuedValuablePapers");
                        addDataRow("Các khoản nợ khác", balance, "otherLiabilities");
                        
                        addDataRow("VỐN CHỦ SỞ HỮU", balance, "totalEquity", true);
                        addDataRow("Vốn điều lệ", balance, "charterCapital");
                        addDataRow("Thặng dư vốn cổ phần", balance, "sharePremium");
                        addDataRow("Quỹ của TCTD", balance, "bankFunds");
                        addDataRow("LN chưa phân phối", balance, "retainedEarnings");
                        addDataRow("Lợi ích của CĐ thiểu số", balance, "minorityInterest");
                    } else if (reportLayoutLocal === "financial") {
                        addSectionHeader("KẾT QUẢ KINH DOANH TÀI CHÍNH");
                        addDataRow("Doanh thu hoạt động", income, "operatingRevenue", true);
                        addDataRow("Lãi từ các tài sản tài chính FVTPL", income, "fvtplGain");
                        addDataRow("Lãi từ các khoản đầu tư nắm giữ đến ngày đáo hạn HTM", income, "htmGain");
                        addDataRow("Lãi từ các tài sản tài chính AFS", income, "afsGain");
                        addDataRow("Doanh thu hoạt động môi giới", income, "brokerageRevenue");
                        addDataRow("Doanh thu hoạt động tư vấn", income, "consultingRevenue");
                        addDataRow("Doanh thu hoạt động khác", income, "otherOperatingRevenue");
                        addDataRow("Chi phí hoạt động", income, "operatingExpenses", true);
                        addDataRow("Lỗ từ các tài sản tài chính FVTPL", income, "fvtplLoss");
                        addDataRow("Lỗ từ các tài sản tài chính AFS", income, "afsLoss");
                        addDataRow("Chi phí tự doanh", income, "propTradingExpenses");
                        addDataRow("Chi phí hoạt động môi giới", income, "brokerageExpenses");
                        addDataRow("Chi phí hoạt động tư vấn", income, "consultingExpenses");
                        addDataRow("Lợi nhuận gộp hoạt động", income, "grossOperatingProfit", true);
                        addDataRow("Doanh thu tài chính", income, "financialIncome");
                        addDataRow("Chi phí tài chính", income, "financialExpenses");
                        addDataRow("Chi phí lãi vay", income, "interestExpenses");
                        addDataRow("Chi phí quản lý công ty chứng khoán", income, "adminExpenses");
                        addDataRow("Lợi nhuận từ HĐKD", income, "operatingProfit", true);
                        addDataRow("Lợi nhuận khác", income, "otherProfit");
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
                    } else {
                        addSectionHeader("KẾT QUẢ HOẠT ĐỘNG KINH DOANH");
                        addDataRow("Doanh thu thuần", income, "netRevenue", true);
                        addDataRow("Doanh thu bán hàng và cung cấp dịch vụ", income, "grossRevenue");
                        addDataRow("Giá vốn hàng bán", income, "costOfSales");
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

                    addSectionHeader("LƯU CHUYỂN TIỀN TỆ ĐẦU TƯ");
                    addDataRow("Lưu chuyển tiền thuần từ HĐĐT", cashflow, "investingCashFlow", true);
                    addDataRow("Mua sắm TSCĐ", cashflow, "purchaseOfFixedAssets");
                    addDataRow("Thu thanh lý tài sản", cashflow, "proceedsFromDisposal");
                    addDataRow("Đầu tư vào công ty con", cashflow, "investmentInSubsidiaries");

                    addSectionHeader("LƯU CHUYỂN TIỀN TỆ TÀI CHÍNH");
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
                }
            };

            populateSheet(sheetQ, qData, "Báo cáo theo Quý");
            populateSheet(sheetY, yData, "Báo cáo theo Năm");

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
    }, [stockInfo.ticker]);

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
                <div className="flex items-center gap-3">
                    {/* Toggle Period Type */}
                    <div className="flex items-center bg-muted p-1 rounded-lg border border-border">
                        <button
                            onClick={() => setPeriodType("quarter")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                periodType === "quarter"
                                    ? "bg-background text-foreground shadow-sm font-bold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Theo Quý
                        </button>
                        <button
                            onClick={() => setPeriodType("year")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                periodType === "year"
                                    ? "bg-background text-foreground shadow-sm font-bold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Theo Năm
                        </button>
                    </div>

                    <button
                        onClick={handleExportAll}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Tải toàn bộ Excel
                    </button>
                </div>
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
            <div className={loading ? "opacity-60 transition-opacity pointer-events-none" : "transition-opacity"}>
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
                        : reportLayout === "financial"
                        ? <FinIncomeStatementTable data={data.incomeStatements} />
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
        </div>
    );
}
