"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type {
  FinancialRatioItem,
  FinancialReportsData,
  BalanceSheetItem,
  IncomeStatementItem,
} from "@/hooks/useStockData";

/* ================================================================
   TYPES
   ================================================================ */
type BankScreen = "balance" | "asset_quality" | "efficiency" | "income" | "liquidity";

interface BankTcdnDashboardProps {
  ticker: string;
  sector?: string;
  industry?: string;
  financialReports?: FinancialReportsData;
  financialRatios?: FinancialRatioItem[];
  periods: string[];
  selectedPeriod: string | null;
  onPeriodChange: (value: string | null) => void;
  unit: number;
  onUnitChange: (value: number) => void;
}

/* ================================================================
   CONSTANTS
   ================================================================ */
const BANK_SCREENS: Array<{ id: BankScreen; label: string; icon: string }> = [
  { id: "balance", label: "Bảng cân đối kế toán", icon: "📊" },
  { id: "asset_quality", label: "Chất lượng tài sản", icon: "🛡️" },
  { id: "efficiency", label: "Hiệu quả kinh doanh", icon: "📈" },
  { id: "income", label: "Thu nhập & Chi phí", icon: "💰" },
  { id: "liquidity", label: "Thanh khoản & ALM", icon: "💧" },
];

const COLORS = {
  primary: "#F97316",
  blue: "#3b82f6",
  green: "#00C076",
  red: "#EF4444",
  amber: "#F59E0B",
  purple: "#8B5CF6",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  rose: "#f43f5e",
  indigo: "#6366f1",
  slate: "#64748b",
  chartPalette: ["#F97316", "#3b82f6", "#00C076", "#8B5CF6", "#14b8a6", "#f43f5e", "#06b6d4", "#F59E0B"],
};

/* ================================================================
   HELPERS
   ================================================================ */
function avg(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null) return a ?? b ?? null;
  return (a + b) / 2;
}

function fmtNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("vi-VN", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

function unitLabel(unit: number): string {
  return unit === 1_000_000 ? "Triệu VND" : "Tỷ VND";
}

function scaleByUnit(value: number | null | undefined, unit: number): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value / unit;
}

function fmtAbs(value: number | null | undefined, unit: number, decimals = 1): string {
  return fmtNumber(scaleByUnit(value, unit), decimals);
}

function hasMetric(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value);
}

function safeRatio(n: number | null | undefined, d: number | null | undefined): number | null {
  if (!hasMetric(n) || !hasMetric(d) || d === 0) return null;
  return (n as number) / (d as number);
}

function pctChange(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (!hasMetric(curr) || !hasMetric(prev) || prev === 0) return null;
  return ((curr as number) - (prev as number)) / Math.abs(prev as number) * 100;
}

/** Determine color based on Higher/Lower is Better logic */
function changeColor(change: number | null, lowerIsBetter = false): string {
  if (change == null) return "text-muted-foreground";
  const isPositive = change > 0;
  if (lowerIsBetter) return isPositive ? "text-red-500" : "text-emerald-500";
  return isPositive ? "text-emerald-500" : "text-red-500";
}

function changeBg(change: number | null, lowerIsBetter = false): string {
  if (change == null) return "bg-slate-100 text-slate-600";
  const isPositive = change > 0;
  if (lowerIsBetter) return isPositive ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700";
  return isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
}

function changeArrow(change: number | null): string {
  if (change == null) return "";
  return change > 0 ? "↗" : change < 0 ? "↘" : "→";
}

function findPeriodIndex(periods: string[], selectedPeriod: string | null): number {
  if (!selectedPeriod) return 0;
  const idx = periods.findIndex((p) => p === selectedPeriod);
  return idx >= 0 ? idx : 0;
}

function periodMatch(item: { period: { period: string } }, period: string): boolean {
  return item.period.period === period;
}

/* ================================================================
   SHARED CHART OPTIONS BUILDER
   ================================================================ */
function baseChartGrid() {
  return { top: 40, left: 55, right: 20, bottom: 30 };
}

function tooltipOpts() {
  return {
    trigger: "axis" as const,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderColor: "rgba(255,255,255,0.08)",
    textStyle: { color: "#e2e8f0", fontSize: 12 },
  };
}

function legendOpts(data?: string[]) {
  return { top: 4, textStyle: { fontSize: 11, color: "#94a3b8" }, data };
}

/* ================================================================
   KPI CARD COMPONENT
   ================================================================ */
interface KpiCardProps {
  label: string;
  value: string;
  subLabel?: string;
  change?: number | null;
  lowerIsBetter?: boolean;
  tooltip?: string;
  accent?: string;
}

function KpiCard({ label, value, subLabel, change, lowerIsBetter = false, tooltip, accent }: KpiCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-border group"
      title={tooltip}
    >
      {accent && (
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: accent }} />
      )}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {change != null && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${changeBg(change, lowerIsBetter)}`}>
            {changeArrow(change)} {change > 0 ? "+" : ""}{fmtNumber(change, 1)}%
          </span>
        )}
        {subLabel && <span className="text-[11px] text-muted-foreground">{subLabel}</span>}
      </div>
      {/* Hover tooltip explanation */}
      {tooltip && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-4 flex items-center">
          <p className="text-xs text-muted-foreground leading-relaxed">{tooltip}</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SECTION HEADER COMPONENT
   ================================================================ */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_6px_rgba(249,115,22,0.3)]" />
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ================================================================
   CHART CARD COMPONENT
   ================================================================ */
function ChartCard({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border/50 bg-card p-5 shadow-sm ${className}`}>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="mt-3">{children}</div>
    </div>
  );
}

/* ================================================================
   DATA TABLE COMPONENT
   ================================================================ */
interface DataTableRow {
  label: string;
  values: (string | number | null)[];
  bold?: boolean;
  indent?: boolean;
  separator?: boolean;
}

function DataTable({ headers, rows, title }: { headers: string[]; rows: DataTableRow[]; title: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/50 bg-muted/30">
        <SectionHeader title={title} subtitle="Đơn vị theo bộ lọc đã chọn" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 font-semibold text-muted-foreground sticky left-0 bg-muted/50 min-w-[180px]">Chỉ tiêu</th>
              {headers.map((h: string, i: number) => (
                <th key={i} className="text-right p-3 font-semibold text-muted-foreground whitespace-nowrap min-w-[100px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: DataTableRow, idx: number) => (
              <tr
                key={idx}
                className={`border-b border-border/20 last:border-0 transition-colors hover:bg-muted/30 ${row.separator ? "border-t-2 border-t-border/50" : ""}`}
              >
                <td className={`p-3 sticky left-0 bg-card ${row.bold ? "font-bold" : ""} ${row.indent ? "pl-8" : ""}`}>
                  {row.label}
                </td>
                {row.values.map((v: string | number | null, i: number) => (
                  <td key={i} className={`p-3 text-right font-mono tabular-nums ${row.bold ? "font-bold" : ""}`}>
                    {v ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function BankTcdnDashboard({
  ticker,
  sector,
  industry,
  financialReports,
  financialRatios,
  periods,
  selectedPeriod,
  onPeriodChange,
  unit,
  onUnitChange,
}: BankTcdnDashboardProps) {
  const [screen, setScreen] = useState<BankScreen>("balance");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const periodIndex = findPeriodIndex(periods, selectedPeriod);
  const period = periods[periodIndex] ?? null;

  // ── Data Selectors ──
  const bsList = useMemo(() => financialReports?.balanceSheet ?? [], [financialReports]);
  const isList = useMemo(() => financialReports?.incomeStatement ?? [], [financialReports]);

  const latestBs = useMemo(() => {
    if (!period || !bsList.length) return bsList[0];
    return bsList.find((item) => periodMatch(item, period)) ?? bsList[0];
  }, [bsList, period]);

  const prevBs = useMemo(() => {
    if (!bsList.length) return undefined;
    if (periodIndex + 1 < periods.length) {
      const p = periods[periodIndex + 1];
      return bsList.find((item) => periodMatch(item, p));
    }
    return bsList[1];
  }, [bsList, periodIndex, periods]);

  const latestIs = useMemo(() => {
    if (!period || !isList.length) return isList[0];
    return isList.find((item) => periodMatch(item, period)) ?? isList[0];
  }, [isList, period]);

  const prevIs = useMemo(() => {
    if (!isList.length) return undefined;
    if (periodIndex + 1 < periods.length) {
      const p = periods[periodIndex + 1];
      return isList.find((item) => periodMatch(item, p));
    }
    return isList[1];
  }, [isList, periodIndex, periods]);

  const latestRatio = useMemo(() => {
    if (!financialRatios?.length) return undefined;
    if (!period) return financialRatios[0];
    const m = /Q(\d+)\/(\d+)/i.exec(period);
    if (!m) return financialRatios[0];
    return financialRatios.find((r) => r.year === Number(m[2]) && r.quarter === Number(m[1])) ?? financialRatios[0];
  }, [financialRatios, period]);

  const prevRatio = useMemo(() => {
    if (!financialRatios?.length) return undefined;
    if (periodIndex + 1 < periods.length) {
      const p = periods[periodIndex + 1];
      const m = /Q(\d+)\/(\d+)/i.exec(p);
      if (m) return financialRatios.find((r) => r.year === Number(m[2]) && r.quarter === Number(m[1]));
    }
    return financialRatios[1];
  }, [financialRatios, periodIndex, periods]);

  // ── Reverse period data (oldest first) for trend charts ──
  const trendBs = useMemo(() => {
    const labels = periods.slice(0, 8).reverse();
    return labels.map((l) => bsList.find((r) => r.period.period === l)).filter(Boolean) as BalanceSheetItem[];
  }, [bsList, periods]);

  const trendLabels = useMemo(() => trendBs.map((x) => x.period.period), [trendBs]);

  const trendIs = useMemo(() => {
    const labels = periods.slice(0, 8).reverse();
    return labels.map((l) => isList.find((r) => r.period.period === l)).filter(Boolean) as IncomeStatementItem[];
  }, [isList, periods]);

  const trendIsLabels = useMemo(() => trendIs.map((x) => x.period.period), [trendIs]);

  // ── Computed Banking KPIs ──
  const nii = latestIs?.netInterestIncome ?? ((latestIs?.interestIncome ?? 0) - (latestIs?.interestExpenseBank ?? 0));
  const prevNii = prevIs?.netInterestIncome ?? ((prevIs?.interestIncome ?? 0) - (prevIs?.interestExpenseBank ?? 0));
  const toi = latestIs?.totalOperatingIncome ?? null;
  const opex = latestIs?.operatingExpenses ?? null;
  const ppop = latestIs?.prePpopProfit ?? (toi != null && opex != null ? toi - opex : null);

  const earningAssetsCurr =
    (latestBs?.loansToCustomers ?? 0) +
    (latestBs?.investmentSecurities ?? 0) +
    (latestBs?.tradingSecurities ?? 0) +
    (latestBs?.interBankDeposits ?? 0);
  const earningAssetsPrev =
    (prevBs?.loansToCustomers ?? 0) +
    (prevBs?.investmentSecurities ?? 0) +
    (prevBs?.tradingSecurities ?? 0) +
    (prevBs?.interBankDeposits ?? 0);

  const nim = nii != null && earningAssetsCurr > 0
    ? (() => { const ea = avg(earningAssetsCurr, earningAssetsPrev) ?? earningAssetsCurr; return ea > 0 ? (nii * 4 * 100) / ea : null; })()
    : null;

  const prevNimCalc = prevNii != null && earningAssetsPrev > 0
    ? (prevNii * 4 * 100) / earningAssetsPrev
    : null;

  const cir = toi != null && toi !== 0 && opex != null ? (Math.abs(opex) * 100) / toi : null;
  const prevToi = prevIs?.totalOperatingIncome ?? null;
  const prevOpex = prevIs?.operatingExpenses ?? null;
  const prevCir = prevToi != null && prevToi !== 0 && prevOpex != null ? (Math.abs(prevOpex) * 100) / prevToi : null;

  const roa = latestIs && latestBs ? (() => {
    const aa = avg(latestBs.totalAssets, prevBs?.totalAssets) ?? latestBs.totalAssets;
    return aa > 0 ? ((latestIs.netProfit ?? 0) * 4 * 100) / aa : null;
  })() : null;

  const roe = latestIs && latestBs ? (() => {
    const ae = avg(latestBs.totalEquity, prevBs?.totalEquity) ?? latestBs.totalEquity;
    return ae > 0 ? ((latestIs.netProfit ?? 0) * 4 * 100) / ae : null;
  })() : null;

  const prevRoe = prevIs && prevBs ? (() => {
    const ae = prevBs.totalEquity;
    return ae > 0 ? ((prevIs.netProfit ?? 0) * 4 * 100) / ae : null;
  })() : null;

  const ldr = safeRatio(latestBs?.loansToCustomers, latestBs?.customerDeposits);
  const prevLdr = safeRatio(prevBs?.loansToCustomers, prevBs?.customerDeposits);
  const equityRatio = safeRatio(latestBs?.totalEquity, latestBs?.totalAssets);
  const provisionCoverage = safeRatio(latestBs?.loanLossReserves, latestBs?.loansToCustomersGross ?? latestBs?.loansToCustomers);
  const creditCost = latestIs?.provisionExpenses != null && latestBs?.loansToCustomers
    ? Math.abs((latestIs.provisionExpenses * 4 * 100) / latestBs.loansToCustomers) : null;
  const provisionToPpop = safeRatio(latestIs?.provisionExpenses, ppop);

  const earningAssetsShare = latestBs && latestBs.totalAssets > 0
    ? ((earningAssetsCurr + (latestBs.sbvDeposits ?? 0)) * 100) / latestBs.totalAssets : null;

  const quickAssets = (latestBs?.cash ?? 0) + (latestBs?.sbvDeposits ?? 0) + (latestBs?.interBankDeposits ?? 0) + (latestBs?.tradingSecurities ?? 0);
  const quickLiquidity = safeRatio(quickAssets, latestBs?.currentLiabilities);

  // DuPont components
  const taxBurden = safeRatio(latestIs?.netProfit, latestIs?.profitBeforeTax);
  const earningPower = safeRatio(latestIs?.profitBeforeTax, ppop);
  const efficiencyDupont = safeRatio(ppop, latestIs?.totalOperatingIncome);
  const assetYield = safeRatio(latestIs?.totalOperatingIncome, avg(latestBs?.totalAssets, prevBs?.totalAssets));
  const leverageDupont = safeRatio(avg(latestBs?.totalAssets, prevBs?.totalAssets), avg(latestBs?.totalEquity, prevBs?.totalEquity));

  // ── Global Alerts ──
  const criticalWarnings: string[] = [];
  if (provisionCoverage != null && provisionCoverage < 0.5)
    criticalWarnings.push(`LLR (Bao phủ nợ xấu) ở mức ${fmtNumber(provisionCoverage * 100, 2)}%, dưới ngưỡng an toàn 50%.`);
  if (equityRatio != null && equityRatio < 0.08)
    criticalWarnings.push(`CAR proxy (Vốn CSH/Tổng TS) ở mức ${fmtNumber(equityRatio * 100, 2)}%, dưới ngưỡng 8%.`);
  if (ldr != null && ldr > 0.85)
    criticalWarnings.push(`LDR (Cho vay/Huy động) ở mức ${fmtNumber(ldr * 100, 1)}%, vượt ngưỡng cảnh báo 85%.`);

  /* ================================================================
     TAB 1: BALANCE SHEET
     ================================================================ */
  const renderBalanceSheet = () => {
    // Earning Assets Donut
    const nonEarning = Math.max((latestBs?.totalAssets ?? 0) - earningAssetsCurr - (latestBs?.sbvDeposits ?? 0), 0);
    const earningDonutData = [
      { name: "Cho vay KH", value: scaleByUnit(latestBs?.loansToCustomers ?? 0, unit) ?? 0, itemStyle: { color: COLORS.primary } },
      { name: "CK đầu tư", value: scaleByUnit(latestBs?.investmentSecurities ?? 0, unit) ?? 0, itemStyle: { color: COLORS.blue } },
      { name: "CK kinh doanh", value: scaleByUnit(latestBs?.tradingSecurities ?? 0, unit) ?? 0, itemStyle: { color: COLORS.purple } },
      { name: "Liên ngân hàng", value: scaleByUnit(latestBs?.interBankDeposits ?? 0, unit) ?? 0, itemStyle: { color: COLORS.teal } },
      { name: "Tiền gửi NHNN", value: scaleByUnit(latestBs?.sbvDeposits ?? 0, unit) ?? 0, itemStyle: { color: COLORS.cyan } },
      { name: "TS không sinh lời", value: scaleByUnit(nonEarning, unit) ?? 0, itemStyle: { color: "#cbd5e1" } },
    ];

    // Funding Mix Pie
    const deposits = latestBs?.customerDeposits ?? 0;
    const interbank = latestBs?.interBankDeposits ?? 0;
    const debtIssued = latestBs?.debtSecuritiesIssued ?? 0;
    const equity = latestBs?.totalEquity ?? 0;
    const otherLiab = Math.max((latestBs?.totalLiabilities ?? 0) - deposits - interbank - debtIssued, 0);
    const fundingData = [
      { name: "Tiền gửi KH", value: scaleByUnit(deposits, unit) ?? 0, itemStyle: { color: COLORS.primary } },
      { name: "Liên ngân hàng", value: scaleByUnit(interbank, unit) ?? 0, itemStyle: { color: COLORS.blue } },
      { name: "Giấy tờ có giá", value: scaleByUnit(debtIssued, unit) ?? 0, itemStyle: { color: COLORS.purple } },
      { name: "Vốn CSH", value: scaleByUnit(equity, unit) ?? 0, itemStyle: { color: COLORS.green } },
      { name: "Nợ khác", value: scaleByUnit(otherLiab, unit) ?? 0, itemStyle: { color: COLORS.slate } },
    ];

    // Horizontal bar: Earning Assets allocation
    const earningBarData = [
      { name: "Cho vay KH", value: scaleByUnit(latestBs?.loansToCustomers ?? 0, unit) ?? 0 },
      { name: "CK đầu tư", value: scaleByUnit(latestBs?.investmentSecurities ?? 0, unit) ?? 0 },
      { name: "Liên ngân hàng", value: scaleByUnit(latestBs?.interBankDeposits ?? 0, unit) ?? 0 },
      { name: "CK kinh doanh", value: scaleByUnit(latestBs?.tradingSecurities ?? 0, unit) ?? 0 },
    ].sort((a, b) => b.value - a.value);

    // Funding Trend Stacked Area
    const fundingTrendOpt = {
      tooltip: tooltipOpts(),
      legend: legendOpts(["Tiền gửi KH", "Liên ngân hàng", "Giấy tờ có giá", "Vốn CSH"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      series: [
        { name: "Tiền gửi KH", type: "bar", stack: "fund", data: trendBs.map((x) => scaleByUnit(x.customerDeposits ?? 0, unit) ?? 0), itemStyle: { color: COLORS.primary } },
        { name: "Liên ngân hàng", type: "bar", stack: "fund", data: trendBs.map((x) => scaleByUnit(x.interBankDeposits ?? 0, unit) ?? 0), itemStyle: { color: COLORS.blue } },
        { name: "Giấy tờ có giá", type: "bar", stack: "fund", data: trendBs.map((x) => scaleByUnit(x.debtSecuritiesIssued ?? 0, unit) ?? 0), itemStyle: { color: COLORS.purple } },
        { name: "Vốn CSH", type: "bar", stack: "fund", data: trendBs.map((x) => scaleByUnit(x.totalEquity ?? 0, unit) ?? 0), itemStyle: { color: COLORS.green } },
      ],
    };

    // Gauge configs
    const gaugeOption = (name: string, value: number | null, threshold: number, color: string, max = 100) => ({
      series: [{
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max,
        splitNumber: 5,
        pointer: { length: "55%", width: 5, itemStyle: { color } },
        axisLine: { lineStyle: { width: 12, color: [[threshold / max, "#e2e8f0"], [1, color]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, "70%"], fontSize: 11, color: "#94a3b8" },
        detail: { fontSize: 18, fontWeight: "bold", offsetCenter: [0, "40%"], formatter: (v: number) => `${v.toFixed(1)}%`, color },
        data: [{ value: value ?? 0, name }],
      }],
    });

    // Balance Sheet Data Table
    const bsTableHeaders = trendBs.slice(-6).map((x) => x.period.period);
    const bsTableData = trendBs.slice(-6);
    const bsTableRows: DataTableRow[] = [
      { label: "TỔNG TÀI SẢN", values: bsTableData.map((x) => fmtAbs(x.totalAssets, unit)), bold: true },
      { label: "  Tiền & TĐTT", values: bsTableData.map((x) => fmtAbs(x.cash, unit)), indent: true },
      { label: "  TG tại NHNN", values: bsTableData.map((x) => fmtAbs(x.sbvDeposits, unit)), indent: true },
      { label: "  TG & CV các TCTD", values: bsTableData.map((x) => fmtAbs(x.interBankDeposits, unit)), indent: true },
      { label: "  CK kinh doanh", values: bsTableData.map((x) => fmtAbs(x.tradingSecurities, unit)), indent: true },
      { label: "  Cho vay KH (thuần)", values: bsTableData.map((x) => fmtAbs(x.loansToCustomers, unit)), indent: true },
      { label: "  CK đầu tư", values: bsTableData.map((x) => fmtAbs(x.investmentSecurities, unit)), indent: true },
      { label: "NỢ PHẢI TRẢ", values: bsTableData.map((x) => fmtAbs(x.totalLiabilities, unit)), bold: true, separator: true },
      { label: "  TG của khách hàng", values: bsTableData.map((x) => fmtAbs(x.customerDeposits, unit)), indent: true },
      { label: "  Phát hành GTCG", values: bsTableData.map((x) => fmtAbs(x.debtSecuritiesIssued, unit)), indent: true },
      { label: "VỐN CHỦ SỞ HỮU", values: bsTableData.map((x) => fmtAbs(x.totalEquity, unit)), bold: true, separator: true },
      { label: "  Vốn điều lệ", values: bsTableData.map((x) => fmtAbs(x.charterCapital, unit)), indent: true },
      { label: "  LNST chưa PP", values: bsTableData.map((x) => fmtAbs(x.retainedEarnings, unit)), indent: true },
    ];

    return (
      <div className="space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tổng tài sản"
            value={fmtAbs(latestBs?.totalAssets, unit)}
            change={pctChange(latestBs?.totalAssets, prevBs?.totalAssets)}
            accent={COLORS.primary}
            tooltip="Tổng giá trị tài sản trên bảng CĐKT. Đo lường quy mô chung của ngân hàng."
            subLabel={unitLabel(unit)}
          />
          <KpiCard
            label="Tiền gửi khách hàng"
            value={fmtAbs(latestBs?.customerDeposits, unit)}
            change={pctChange(latestBs?.customerDeposits, prevBs?.customerDeposits)}
            accent={COLORS.blue}
            tooltip="Nguồn vốn lõi ổn định nhất. Tỷ trọng cao = ổn định về nguồn huy động."
            subLabel={unitLabel(unit)}
          />
          <KpiCard
            label="Cho vay KH (gộp)"
            value={fmtAbs(latestBs?.loansToCustomersGross ?? latestBs?.loansToCustomers, unit)}
            change={pctChange(latestBs?.loansToCustomersGross ?? latestBs?.loansToCustomers, prevBs?.loansToCustomersGross ?? prevBs?.loansToCustomers)}
            accent={COLORS.green}
            tooltip="Tài sản sinh lời cốt lõi. Thể hiện quy mô cấp tín dụng của ngân hàng."
            subLabel={unitLabel(unit)}
          />
          <KpiCard
            label="Vốn chủ sở hữu"
            value={fmtAbs(latestBs?.totalEquity, unit)}
            change={pctChange(latestBs?.totalEquity, prevBs?.totalEquity)}
            accent={COLORS.purple}
            tooltip="Bộ đệm rủi ro phòng thủ. Vốn CSH càng lớn → khả năng hấp thụ tổn thất càng cao."
            subLabel={unitLabel(unit)}
          />
        </div>

        {/* Charts Row 1: Earning Assets Donut + Funding Structure */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Tỷ trọng Tài sản theo chức năng" subtitle={earningAssetsShare != null ? `TS Sinh lời: ${fmtNumber(earningAssetsShare, 1)}% (Ngưỡng lý tưởng >85%)` : ""}>
            <ReactECharts
              option={{
                tooltip: { trigger: "item", backgroundColor: "rgba(15,23,42,0.92)", textStyle: { color: "#e2e8f0", fontSize: 12 } },
                series: [{ type: "pie", radius: ["42%", "72%"], label: { show: true, fontSize: 10, formatter: "{b}: {d}%" }, data: earningDonutData, emphasis: { scaleSize: 8 } }],
              }}
              style={{ height: 280 }}
            />
          </ChartCard>
          <ChartCard title="Cơ cấu Nguồn vốn" subtitle="Đánh giá sự phụ thuộc giữa các nguồn huy động">
            <ReactECharts
              option={{
                tooltip: { trigger: "item", backgroundColor: "rgba(15,23,42,0.92)", textStyle: { color: "#e2e8f0", fontSize: 12 } },
                series: [{ type: "pie", radius: ["42%", "72%"], label: { show: true, fontSize: 10, formatter: "{b}: {d}%" }, data: fundingData, emphasis: { scaleSize: 8 } }],
              }}
              style={{ height: 280 }}
            />
          </ChartCard>
        </div>

        {/* Charts Row 2: Earning Asset Bar + Funding Trend */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Cơ cấu Tài sản sinh lời" subtitle="Phân bổ danh mục tài sản sinh lời">
            <ReactECharts
              option={{
                tooltip: tooltipOpts(),
                grid: { top: 10, left: 100, right: 30, bottom: 10 },
                xAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
                yAxis: { type: "category" as const, data: earningBarData.map((x) => x.name), axisLabel: { fontSize: 11, color: "#94a3b8" } },
                series: [{
                  type: "bar", data: earningBarData.map((x, i) => ({ value: x.value, itemStyle: { color: COLORS.chartPalette[i] } })),
                  barWidth: "55%", label: { show: true, position: "right", fontSize: 10, formatter: (p: { value: number }) => fmtNumber(p.value) },
                }],
              }}
              style={{ height: 220 }}
            />
          </ChartCard>
          {trendBs.length > 1 && (
            <ChartCard title="Diễn biến Cơ cấu nguồn vốn" subtitle="Xu hướng huy động qua các kỳ">
              <ReactECharts option={fundingTrendOpt} style={{ height: 260 }} />
            </ChartCard>
          )}
        </div>

        {/* Gauges Row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ChartCard title="CAR Proxy" subtitle="Vốn CSH / Tổng TS (Ngưỡng ≥8%)">
            <ReactECharts option={gaugeOption("CAR Proxy", equityRatio != null ? equityRatio * 100 : null, 8, equityRatio != null && equityRatio >= 0.08 ? COLORS.green : COLORS.red, 20)} style={{ height: 180 }} />
          </ChartCard>
          <ChartCard title="LDR" subtitle="Cho vay / Huy động (Ngưỡng ≤85%)">
            <ReactECharts option={gaugeOption("LDR", ldr != null ? ldr * 100 : null, 85, ldr != null && ldr <= 0.85 ? COLORS.green : COLORS.amber, 120)} style={{ height: 180 }} />
          </ChartCard>
          <ChartCard title="Quick Ratio" subtitle="TS thanh khoản nhanh / Nợ ngắn hạn">
            <ReactECharts option={gaugeOption("Quick Ratio", quickLiquidity != null ? quickLiquidity * 100 : null, 100, quickLiquidity != null && quickLiquidity >= 1.0 ? COLORS.green : COLORS.amber, 200)} style={{ height: 180 }} />
          </ChartCard>
        </div>

        {/* Data Table */}
        <DataTable headers={bsTableHeaders} rows={bsTableRows} title="📋 Bảng số liệu Cân đối kế toán" />
      </div>
    );
  };

  /* ================================================================
     TAB 2: ASSET QUALITY
     ================================================================ */
  const renderAssetQuality = () => {
    const prevProvisionCoverage = safeRatio(prevBs?.loanLossReserves, prevBs?.loansToCustomersGross ?? prevBs?.loansToCustomers);
    const prevCreditCost = prevIs?.provisionExpenses != null && prevBs?.loansToCustomers
      ? Math.abs((prevIs.provisionExpenses * 4 * 100) / prevBs.loansToCustomers) : null;
    const prevProvisionToPpop = safeRatio(prevIs?.provisionExpenses, (() => {
      const pt = prevIs?.totalOperatingIncome ?? null;
      const po = prevIs?.operatingExpenses ?? null;
      return pt != null && po != null ? pt - po : null;
    })());

    // Provision & Loans Trend
    const provLoanTrendOpt = trendBs.length > 1 ? {
      tooltip: tooltipOpts(),
      legend: legendOpts(["Cho vay KH (thuần)", "Dự phòng rủi ro"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: [
        { type: "value" as const, name: "Cho vay", axisLabel: { fontSize: 10, color: "#94a3b8" } },
        { type: "value" as const, name: "Dự phòng", axisLabel: { fontSize: 10, color: "#94a3b8" } },
      ],
      series: [
        { name: "Cho vay KH (thuần)", type: "bar", data: trendBs.map((x) => scaleByUnit(x.loansToCustomers ?? 0, unit) ?? 0), itemStyle: { color: COLORS.blue }, barWidth: "40%" },
        { name: "Dự phòng rủi ro", type: "line", yAxisIndex: 1, data: trendBs.map((x) => scaleByUnit(Math.abs(x.loanLossReserves ?? 0), unit) ?? 0), lineStyle: { color: COLORS.red, width: 3 }, itemStyle: { color: COLORS.red }, symbol: "circle", symbolSize: 6 },
      ],
    } : null;

    // Credit Cost Trend
    const creditCostTrend = trendIs.length > 1 && trendBs.length > 1 ? {
      tooltip: tooltipOpts(),
      legend: legendOpts(["Credit Cost (%)"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendIsLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
      series: [{
        name: "Credit Cost (%)", type: "line",
        data: trendIs.map((inc, i) => {
          const bs = trendBs[i];
          if (!inc?.provisionExpenses || !bs?.loansToCustomers || bs.loansToCustomers === 0) return null;
          return Number((Math.abs(inc.provisionExpenses * 4 * 100) / bs.loansToCustomers).toFixed(2));
        }),
        lineStyle: { color: COLORS.rose, width: 3 },
        itemStyle: { color: COLORS.rose },
        symbol: "circle", symbolSize: 6,
        areaStyle: { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(244,63,94,0.15)" }, { offset: 1, color: "rgba(244,63,94,0.02)" }] } },
      }],
    } : null;

    // Provision Roll-forward (waterfall approach using delta from period to period)
    const provisionRollOpt = trendBs.length > 1 ? (() => {
      const provValues = trendBs.map((x) => scaleByUnit(Math.abs(x.loanLossReserves ?? 0), unit) ?? 0);
      return {
        tooltip: tooltipOpts(),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        series: [{
          type: "bar", data: provValues.map((v, i) => {
            const delta = i > 0 ? v - provValues[i - 1] : 0;
            return { value: v, itemStyle: { color: delta >= 0 ? COLORS.rose : COLORS.green } };
          }),
          barWidth: "50%",
          label: { show: true, position: "top", fontSize: 9, formatter: (p: { value: number }) => fmtNumber(p.value) },
        }],
      };
    })() : null;

    // Data Table
    const aqTableHeaders = trendBs.slice(-6).map((x) => x.period.period);
    const aqTableBs = trendBs.slice(-6);
    const aqTableIs = trendIs.slice(-6);
    const aqTableRows: DataTableRow[] = [
      { label: "Cho vay KH (thuần)", values: aqTableBs.map((x) => fmtAbs(x.loansToCustomers, unit)), bold: true },
      { label: "Cho vay KH (gộp)", values: aqTableBs.map((x) => fmtAbs(x.loansToCustomersGross, unit)) },
      { label: "Dự phòng rủi ro CV", values: aqTableBs.map((x) => fmtAbs(x.loanLossReserves, unit)) },
      { label: "Chi phí dự phòng (IS)", values: aqTableIs.map((x) => fmtAbs(x?.provisionExpenses, unit)), separator: true },
      { label: "Coverage Ratio (%)", values: aqTableBs.map((x) => { const r = safeRatio(x.loanLossReserves, x.loansToCustomersGross ?? x.loansToCustomers); return r != null ? fmtNumber(r * 100, 2) + "%" : "—"; }), bold: true },
      { label: "Credit Cost (%)", values: aqTableIs.map((x, i) => { const bs = aqTableBs[i]; if (!x?.provisionExpenses || !bs?.loansToCustomers) return "—"; return fmtNumber(Math.abs(x.provisionExpenses * 4 * 100 / bs.loansToCustomers), 2) + "%"; }) },
    ];

    return (
      <div className="space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="NPL Ratio (Proxy)"
            value={provisionCoverage != null ? `${fmtNumber(provisionCoverage * 100, 2)}%` : "N/A"}
            change={pctChange(provisionCoverage, prevProvisionCoverage)}
            lowerIsBetter
            accent={COLORS.red}
            tooltip="Proxy: Dự phòng / Tổng dư nợ. Dữ liệu phân nhóm nợ (3,4,5) yêu cầu Thuyết minh BCTC. Ngưỡng NHNN: Dưới 3%."
            subLabel="Proxy từ BCTC"
          />
          <KpiCard
            label="Coverage Ratio (LLR)"
            value={provisionCoverage != null ? `${fmtNumber(provisionCoverage * 100, 2)}%` : "N/A"}
            change={pctChange(provisionCoverage, prevProvisionCoverage)}
            accent={COLORS.green}
            tooltip="Bao phủ nợ xấu: Quỹ dự phòng / Dư nợ. Trên 100% = đủ dự phòng bao trọn nợ xấu."
            subLabel="Proxy: DP/Dư nợ"
          />
          <KpiCard
            label="Credit Cost"
            value={creditCost != null ? `${fmtNumber(creditCost, 2)}%` : "N/A"}
            change={pctChange(creditCost, prevCreditCost)}
            lowerIsBetter
            accent={COLORS.amber}
            tooltip="Chi phí tín dụng: Chi phí DP annualized / Dư nợ bình quân. Phản ánh 'tổn thất' cho rủi ro."
            subLabel="Annualized"
          />
          <KpiCard
            label="Dự phòng / PPOP"
            value={provisionToPpop != null ? `${fmtNumber(Math.abs(provisionToPpop) * 100, 1)}%` : "N/A"}
            change={pctChange(Math.abs(provisionToPpop ?? 0), Math.abs(prevProvisionToPpop ?? 0))}
            lowerIsBetter
            accent={COLORS.rose}
            tooltip="Tỷ lệ chi phí dự phòng trên lợi nhuận trước dự phòng. Chỉ báo áp lực rủi ro tín dụng."
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {provLoanTrendOpt ? (
            <ChartCard title="Xu hướng Dư nợ & Dự phòng" subtitle="So sánh dư nợ cho vay với quỹ dự phòng rủi ro theo kỳ">
              <ReactECharts option={provLoanTrendOpt} style={{ height: 280 }} />
            </ChartCard>
          ) : (
            <ChartCard title="Dư nợ & Dự phòng" subtitle="Kỳ hiện tại">
              <div className="grid grid-cols-2 gap-4 h-[280px] items-center">
                <div className="flex flex-col items-center justify-center rounded-lg border bg-blue-50/50 p-6">
                  <p className="text-xs text-muted-foreground">Dư nợ tín dụng thuần</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{fmtAbs(latestBs?.loansToCustomers, unit)}</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border bg-rose-50/50 p-6">
                  <p className="text-xs text-muted-foreground">Quỹ dự phòng rủi ro</p>
                  <p className="text-2xl font-bold text-rose-600 mt-2">{fmtAbs(latestBs?.loanLossReserves, unit)}</p>
                </div>
              </div>
            </ChartCard>
          )}
          {creditCostTrend ? (
            <ChartCard title="Xu hướng Chi phí tín dụng" subtitle="Credit Cost (%) annualized qua các kỳ">
              <ReactECharts option={creditCostTrend} style={{ height: 280 }} />
            </ChartCard>
          ) : (
            <ChartCard title="Chi phí tín dụng" subtitle="Thông tin kỳ hiện tại">
              <div className="flex h-[280px] items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-black text-rose-600">{creditCost != null ? `${fmtNumber(creditCost, 2)}%` : "N/A"}</p>
                  <p className="text-xs text-muted-foreground mt-2">Chi phí dự phòng / Dư nợ (annualized)</p>
                </div>
              </div>
            </ChartCard>
          )}
        </div>

        {provisionRollOpt && (
          <ChartCard title="Biến động Dự phòng rủi ro tín dụng" subtitle="Số dư quỹ dự phòng qua các kỳ (tăng = đỏ, giảm = xanh)">
            <ReactECharts option={provisionRollOpt} style={{ height: 260 }} />
          </ChartCard>
        )}

        {/* Data Table */}
        <DataTable headers={aqTableHeaders} rows={aqTableRows} title="📋 Bảng số liệu Chất lượng Tài sản" />
      </div>
    );
  };

  /* ================================================================
     TAB 3: EFFICIENCY / DUPONT
     ================================================================ */
  const renderEfficiency = () => {
    // NII & NIM Trend (Bar + Line)
    const niiNimOpt = trendIs.length > 1 ? {
      tooltip: tooltipOpts(),
      legend: legendOpts(["NII (Thu nhập lãi thuần)", "NIM (%)"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendIsLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: [
        { type: "value" as const, name: unitLabel(unit), axisLabel: { fontSize: 10, color: "#94a3b8" } },
        { type: "value" as const, name: "NIM %", axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
      ],
      series: [
        {
          name: "NII (Thu nhập lãi thuần)", type: "bar", data: trendIs.map((x) => {
            const v = x.netInterestIncome ?? ((x.interestIncome ?? 0) - (x.interestExpenseBank ?? 0));
            return scaleByUnit(v, unit) ?? 0;
          }),
          itemStyle: { color: COLORS.blue }, barWidth: "45%",
        },
        {
          name: "NIM (%)", type: "line", yAxisIndex: 1,
          data: trendIs.map((inc, i) => {
            const v = inc.netInterestIncome ?? ((inc.interestIncome ?? 0) - (inc.interestExpenseBank ?? 0));
            const bs = trendBs[i];
            if (!bs) return null;
            const ea = (bs.loansToCustomers ?? 0) + (bs.investmentSecurities ?? 0) + (bs.tradingSecurities ?? 0) + (bs.interBankDeposits ?? 0);
            return ea > 0 ? Number(((v * 4 * 100) / ea).toFixed(2)) : null;
          }),
          lineStyle: { color: COLORS.primary, width: 3 }, itemStyle: { color: COLORS.primary }, symbol: "circle", symbolSize: 6,
        },
      ],
    } : null;

    // P&L Waterfall
    const waterfallItems = latestIs ? [
      { name: "TOI", value: scaleByUnit(latestIs.totalOperatingIncome ?? 0, unit) ?? 0 },
      { name: "OPEX", value: -(scaleByUnit(Math.abs(latestIs.operatingExpenses ?? 0), unit) ?? 0) },
      { name: "Dự phòng", value: -(scaleByUnit(Math.abs(latestIs.provisionExpenses ?? 0), unit) ?? 0) },
      { name: "PBT", value: scaleByUnit(latestIs.profitBeforeTax ?? 0, unit) ?? 0 },
      { name: "Thuế", value: -(scaleByUnit(Math.abs(latestIs.incomeTax ?? 0), unit) ?? 0) },
      { name: "LNST", value: scaleByUnit(latestIs.netProfit ?? 0, unit) ?? 0 },
    ] : [];

    const waterfallBase: number[] = [];
    const waterfallDelta: number[] = [];
    let running = 0;
    waterfallItems.forEach((item, idx) => {
      if (idx === 0 || item.name === "PBT" || item.name === "LNST") {
        waterfallBase.push(0);
        waterfallDelta.push(item.value);
        running = item.value;
      } else {
        waterfallBase.push(Math.min(running, running + item.value));
        waterfallDelta.push(Math.abs(item.value));
        running += item.value;
      }
    });

    const waterfallOpt = waterfallItems.some((x) => x.value !== 0) ? {
      tooltip: tooltipOpts(),
      grid: { top: 20, left: 50, right: 20, bottom: 25 },
      xAxis: { type: "category" as const, data: waterfallItems.map((x) => x.name), axisLabel: { fontSize: 11, color: "#94a3b8" } },
      yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      series: [
        { type: "bar", stack: "wf", itemStyle: { color: "transparent" }, data: waterfallBase },
        {
          type: "bar", stack: "wf", data: waterfallDelta,
          label: { show: true, position: "top", fontSize: 9, formatter: (p: { dataIndex: number }) => fmtNumber(waterfallItems[p.dataIndex]?.value) },
          itemStyle: {
            color: (params: { dataIndex: number }) => {
              const it = waterfallItems[params.dataIndex];
              if (it.name === "PBT" || it.name === "LNST" || it.name === "TOI") return COLORS.blue;
              return it.value >= 0 ? COLORS.green : COLORS.red;
            },
          },
        },
      ],
    } : null;

    // ROE & ROA Trend
    const roeTrendOpt = (financialRatios && financialRatios.length >= 2) ? (() => {
      const ratiosSorted = [...financialRatios].sort((a, b) => a.year !== b.year ? a.year - b.year : a.quarter - b.quarter).slice(-8);
      return {
        tooltip: tooltipOpts(),
        legend: legendOpts(["ROE (%)", "ROA (%)"]),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: ratiosSorted.map((r) => `Q${r.quarter}/${r.year}`), axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
        series: [
          { name: "ROE (%)", type: "line", data: ratiosSorted.map((r) => r.roe != null ? Number((r.roe * 100).toFixed(2)) : null), lineStyle: { color: COLORS.primary, width: 3 }, itemStyle: { color: COLORS.primary }, symbol: "circle", symbolSize: 6, areaStyle: { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(249,115,22,0.12)" }, { offset: 1, color: "rgba(249,115,22,0.01)" }] } } },
          { name: "ROA (%)", type: "line", data: ratiosSorted.map((r) => r.roa != null ? Number((r.roa * 100).toFixed(2)) : null), lineStyle: { color: COLORS.teal, width: 2 }, itemStyle: { color: COLORS.teal }, symbol: "circle", symbolSize: 5, areaStyle: { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(20,184,166,0.1)" }, { offset: 1, color: "rgba(20,184,166,0.01)" }] } } },
        ],
      };
    })() : null;

    // DuPont Tree
    const dupontNodes = [
      { label: "ROE", value: roe, suffix: "%", dec: 2 },
      { label: "Tax Burden", value: taxBurden, dec: 3, tooltip: "Gánh nặng thuế = LNST / LNTT" },
      { label: "Earning Power", value: earningPower, dec: 3, tooltip: "Sức mạnh tạo lãi = LNTT / PPOP" },
      { label: "Efficiency", value: efficiencyDupont, dec: 3, tooltip: "Hiệu quả = PPOP / TOI = 1 - CIR" },
      { label: "Asset Yield", value: assetYield, dec: 4, tooltip: "Hiệu suất TS = TOI / Tổng TS BQ" },
      { label: "Leverage", value: leverageDupont, suffix: "x", dec: 2, tooltip: "Đòn bẩy = Tổng TS BQ / Vốn CSH BQ" },
    ];

    // Efficiency Data Table
    const effTableHeaders = trendIs.slice(-6).map((x) => x.period.period);
    const effTableIs = trendIs.slice(-6);
    const effTableRows: DataTableRow[] = [
      { label: "Thu nhập lãi", values: effTableIs.map((x) => fmtAbs(x.interestIncome, unit)) },
      { label: "Chi phí lãi", values: effTableIs.map((x) => fmtAbs(x.interestExpenseBank, unit)) },
      { label: "NII (Lãi thuần)", values: effTableIs.map((x) => fmtAbs(x.netInterestIncome ?? ((x.interestIncome ?? 0) - (x.interestExpenseBank ?? 0)), unit)), bold: true },
      { label: "Lãi thuần phí DV", values: effTableIs.map((x) => fmtAbs(x.netServiceFeeIncome, unit)) },
      { label: "TOI (Tổng TN HĐ)", values: effTableIs.map((x) => fmtAbs(x.totalOperatingIncome, unit)), bold: true, separator: true },
      { label: "OPEX (Chi phí HĐ)", values: effTableIs.map((x) => fmtAbs(x.operatingExpenses, unit)) },
      { label: "Chi phí Dự phòng", values: effTableIs.map((x) => fmtAbs(x.provisionExpenses, unit)) },
      { label: "LNTT", values: effTableIs.map((x) => fmtAbs(x.profitBeforeTax, unit)), bold: true, separator: true },
      { label: "Thuế TNDN", values: effTableIs.map((x) => fmtAbs(x.incomeTax, unit)) },
      { label: "LNST", values: effTableIs.map((x) => fmtAbs(x.netProfit, unit)), bold: true },
      { label: "CIR (%)", values: effTableIs.map((x) => { const t = x.totalOperatingIncome; const o = x.operatingExpenses; return t && t !== 0 && o != null ? fmtNumber(Math.abs(o) * 100 / t, 1) + "%" : "—"; }), separator: true },
    ];

    return (
      <div className="space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="NII (Lãi thuần)" value={fmtAbs(nii, unit)} change={pctChange(nii, prevNii)} accent={COLORS.blue} tooltip="Thu nhập lãi thuần = Thu nhập lãi - Chi phí lãi. Nguồn thu chính của ngân hàng." subLabel={unitLabel(unit)} />
          <KpiCard label="NIM" value={nim != null ? `${fmtNumber(nim, 2)}%` : "N/A"} change={pctChange(nim, prevNimCalc)} accent={COLORS.primary} tooltip="Biên lãi thuần = NII annualized / Tài sản sinh lời BQ. NIM cao = hiệu quả sử dụng TS sinh lời." />
          <KpiCard label="Thu phí dịch vụ" value={fmtAbs(latestIs?.netServiceFeeIncome, unit)} change={pctChange(latestIs?.netServiceFeeIncome, prevIs?.netServiceFeeIncome)} accent={COLORS.teal} tooltip="Lãi thuần phí dịch vụ. Thu nhập bền vững từ bancassurance, thẻ, thanh toán." subLabel={unitLabel(unit)} />
          <KpiCard label="CIR" value={cir != null ? `${fmtNumber(cir, 1)}%` : "N/A"} change={pctChange(cir, prevCir)} lowerIsBetter accent={COLORS.amber} tooltip="Chi phí / Thu nhập. CIR thấp = vận hành hiệu quả. Ngưỡng tốt: <45%." />
          <KpiCard label="Chi phí DP" value={fmtAbs(latestIs?.provisionExpenses, unit)} change={pctChange(latestIs?.provisionExpenses, prevIs?.provisionExpenses)} lowerIsBetter accent={COLORS.rose} tooltip="Chi phí dự phòng rủi ro tín dụng. Tăng mạnh có thể báo hiệu nợ xấu gia tăng." subLabel={unitLabel(unit)} />
          <KpiCard label="LNTT" value={fmtAbs(latestIs?.profitBeforeTax, unit)} change={pctChange(latestIs?.profitBeforeTax, prevIs?.profitBeforeTax)} accent={COLORS.green} tooltip="Lợi nhuận trước thuế." subLabel={unitLabel(unit)} />
        </div>

        {/* NII & NIM Trend + Waterfall */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {niiNimOpt ? (
            <ChartCard title="Trend NII & NIM" subtitle="NII tăng nhưng NIM giảm → đang hi sinh biên lợi nhuận">
              <ReactECharts option={niiNimOpt} style={{ height: 300 }} />
            </ChartCard>
          ) : (
            <ChartCard title="NII & NIM" subtitle="Kỳ hiện tại">
              <div className="flex h-[300px] items-center justify-center gap-8">
                <div className="text-center"><p className="text-sm text-muted-foreground">NII</p><p className="text-3xl font-black text-blue-600">{fmtAbs(nii, unit)}</p></div>
                <div className="text-center"><p className="text-sm text-muted-foreground">NIM</p><p className="text-3xl font-black text-orange-600">{nim != null ? `${fmtNumber(nim, 2)}%` : "N/A"}</p></div>
              </div>
            </ChartCard>
          )}
          {waterfallOpt ? (
            <ChartCard title="P&L Bridge (Waterfall)" subtitle="Phân rã lợi nhuận: TOI → OPEX → Dự phòng → LNST">
              <ReactECharts option={waterfallOpt} style={{ height: 300 }} />
            </ChartCard>
          ) : (
            <ChartCard title="P&L Bridge" subtitle="Không đủ dữ liệu xây dựng waterfall">
              <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">Chưa có dữ liệu P&L hợp lệ</div>
            </ChartCard>
          )}
        </div>

        {/* DuPont Tree + ROE Trend */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="🌳 Mô hình Cây DuPont (Banking)" subtitle="ROE = Tax Burden × Earning Power × Efficiency × Asset Yield × Leverage">
            <div className="space-y-3 mt-2">
              {/* ROE root node */}
              <div className="rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium">ROE (Return on Equity)</p>
                <p className="text-3xl font-black text-orange-600">{roe != null ? `${fmtNumber(roe, 2)}%` : "N/A"}</p>
                {roe != null && prevRoe != null && (
                  <span className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${changeBg(pctChange(roe, prevRoe))}`}>
                    QoQ: {changeArrow(pctChange(roe, prevRoe))} {fmtNumber(pctChange(roe, prevRoe), 1)}%
                  </span>
                )}
              </div>
              {/* Decomposition */}
              <div className="grid grid-cols-5 gap-2">
                {dupontNodes.slice(1).map((node) => (
                  <div key={node.label} className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center hover:bg-muted/60 transition-colors" title={node.tooltip}>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{node.label}</p>
                    <p className="text-lg font-bold mt-1">
                      {node.value != null ? `${fmtNumber(node.value * (node.suffix === "x" ? 1 : node.suffix === "%" ? 1 : 1), node.dec ?? 2)}${node.suffix ?? ""}` : "N/A"}
                    </p>
                  </div>
                ))}
              </div>
              {/* Meanings */}
              <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                <div className="rounded bg-muted/40 p-2">💡 Leverage cao → Rủi ro vốn cao</div>
                <div className="rounded bg-muted/40 p-2">💡 Efficiency (1-CIR) cao → Vận hành tối ưu</div>
                <div className="rounded bg-muted/40 p-2">💡 Earning Power thấp → LN bị ăn mòn bởi DP</div>
              </div>
            </div>
          </ChartCard>
          {roeTrendOpt ? (
            <ChartCard title="Xu hướng ROE & ROA" subtitle="Hiệu suất sinh lời qua các kỳ">
              <ReactECharts option={roeTrendOpt} style={{ height: 320 }} />
            </ChartCard>
          ) : (
            <ChartCard title="ROE & ROA" subtitle="Kỳ hiện tại">
              <div className="flex h-[320px] items-center justify-center gap-10">
                <div className="text-center"><p className="text-sm text-muted-foreground">ROE</p><p className="text-4xl font-black text-orange-600">{roe != null ? `${fmtNumber(roe, 2)}%` : "N/A"}</p></div>
                <div className="text-center"><p className="text-sm text-muted-foreground">ROA</p><p className="text-4xl font-black text-teal-600">{roa != null ? `${fmtNumber(roa, 2)}%` : "N/A"}</p></div>
              </div>
            </ChartCard>
          )}
        </div>

        {/* Data Table */}
        <DataTable headers={effTableHeaders} rows={effTableRows} title="📋 Bảng số liệu Hiệu quả Kinh doanh" />
      </div>
    );
  };

  /* ================================================================
     TAB 4: INCOME & EXPENSE
     ================================================================ */
  const renderIncome = () => {
    // TOI Composition Donut
    const toiDonutData = [
      { name: "NII (Thu lãi)", value: scaleByUnit(Math.max(latestIs?.netInterestIncome ?? 0, 0), unit) ?? 0, itemStyle: { color: COLORS.primary } },
      { name: "Phí dịch vụ", value: scaleByUnit(Math.max(latestIs?.netServiceFeeIncome ?? 0, 0), unit) ?? 0, itemStyle: { color: COLORS.blue } },
      { name: "Kinh doanh ngoại hối", value: scaleByUnit(Math.max(latestIs?.tradingFxIncome ?? 0, 0), unit) ?? 0, itemStyle: { color: COLORS.teal } },
      { name: "CK kinh doanh", value: scaleByUnit(Math.max(latestIs?.tradingSecuritiesIncome ?? 0, 0), unit) ?? 0, itemStyle: { color: COLORS.purple } },
      { name: "CK đầu tư", value: scaleByUnit(Math.max(latestIs?.investmentSecuritiesIncome ?? 0, 0), unit) ?? 0, itemStyle: { color: COLORS.cyan } },
      { name: "Khác", value: scaleByUnit(Math.max(latestIs?.otherOperatingIncome ?? 0, 0), unit) ?? 0, itemStyle: { color: COLORS.slate } },
    ].filter((x) => x.value > 0);

    // TOI Breakdown Stacked Bar (Trend)
    const toiTrendOpt = trendIs.length > 1 ? {
      tooltip: tooltipOpts(),
      legend: legendOpts(["NII", "Phí DV", "FX", "CK KD", "Khác"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendIsLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      series: [
        { name: "NII", type: "bar", stack: "toi", data: trendIs.map((x) => scaleByUnit(Math.max(x.netInterestIncome ?? ((x.interestIncome ?? 0) - (x.interestExpenseBank ?? 0)), 0), unit) ?? 0), itemStyle: { color: COLORS.primary } },
        { name: "Phí DV", type: "bar", stack: "toi", data: trendIs.map((x) => scaleByUnit(Math.max(x.netServiceFeeIncome ?? 0, 0), unit) ?? 0), itemStyle: { color: COLORS.blue } },
        { name: "FX", type: "bar", stack: "toi", data: trendIs.map((x) => scaleByUnit(Math.max(x.tradingFxIncome ?? 0, 0), unit) ?? 0), itemStyle: { color: COLORS.teal } },
        { name: "CK KD", type: "bar", stack: "toi", data: trendIs.map((x) => scaleByUnit(Math.max(x.tradingSecuritiesIncome ?? 0, 0), unit) ?? 0), itemStyle: { color: COLORS.purple } },
        { name: "Khác", type: "bar", stack: "toi", data: trendIs.map((x) => scaleByUnit(Math.max(x.otherOperatingIncome ?? 0, 0), unit) ?? 0), itemStyle: { color: COLORS.slate } },
      ],
    } : null;

    // YoY Growth Comparison: NII vs LNST
    const yoyOpt = trendIs.length > 4 ? (() => {
      const calcYoY = (curr: number | null | undefined, prev: number | null | undefined) => {
        if (!hasMetric(curr) || !hasMetric(prev) || prev === 0) return null;
        return Number(((((curr as number) - (prev as number)) / Math.abs(prev as number)) * 100).toFixed(1));
      };
      const labels: string[] = [];
      const niiYoy: (number | null)[] = [];
      const lnstYoy: (number | null)[] = [];
      for (let i = 4; i < trendIs.length; i++) {
        labels.push(trendIs[i].period.period);
        const currNii = trendIs[i].netInterestIncome ?? ((trendIs[i].interestIncome ?? 0) - (trendIs[i].interestExpenseBank ?? 0));
        const prevNiiLocal = trendIs[i - 4]?.netInterestIncome ?? ((trendIs[i - 4]?.interestIncome ?? 0) - (trendIs[i - 4]?.interestExpenseBank ?? 0));
        niiYoy.push(calcYoY(currNii, prevNiiLocal));
        lnstYoy.push(calcYoY(trendIs[i].netProfit, trendIs[i - 4]?.netProfit));
      }
      if (labels.length < 1) return null;
      return {
        tooltip: tooltipOpts(),
        legend: legendOpts(["NII YoY (%)", "LNST YoY (%)"]),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: labels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
        series: [
          { name: "NII YoY (%)", type: "line", data: niiYoy, lineStyle: { color: COLORS.blue, width: 3 }, itemStyle: { color: COLORS.blue }, symbol: "circle", symbolSize: 6 },
          { name: "LNST YoY (%)", type: "line", data: lnstYoy, lineStyle: { color: COLORS.green, width: 3 }, itemStyle: { color: COLORS.green }, symbol: "circle", symbolSize: 6 },
        ],
      };
    })() : null;

    // Opex Donut (proxy)
    const totalOpex = Math.abs(latestIs?.operatingExpenses ?? 0);
    const totalProvision = Math.abs(latestIs?.provisionExpenses ?? 0);
    const opexDonutData = totalOpex + totalProvision > 0 ? [
      { name: "Chi phí hoạt động", value: scaleByUnit(totalOpex, unit) ?? 0, itemStyle: { color: COLORS.amber } },
      { name: "Chi phí dự phòng", value: scaleByUnit(totalProvision, unit) ?? 0, itemStyle: { color: COLORS.rose } },
    ] : [];

    // Data Table P&L
    const plTableHeaders = trendIs.slice(-6).map((x) => x.period.period);
    const plTableIs = trendIs.slice(-6);
    const plTableRows: DataTableRow[] = [
      { label: "Thu nhập lãi", values: plTableIs.map((x) => fmtAbs(x.interestIncome, unit)) },
      { label: "Chi phí lãi", values: plTableIs.map((x) => fmtAbs(x.interestExpenseBank, unit)) },
      { label: "NII (Lãi thuần)", values: plTableIs.map((x) => fmtAbs(x.netInterestIncome ?? ((x.interestIncome ?? 0) - (x.interestExpenseBank ?? 0)), unit)), bold: true },
      { label: "Thu phí dịch vụ thuần", values: plTableIs.map((x) => fmtAbs(x.netServiceFeeIncome, unit)), separator: true },
      { label: "LN KD ngoại hối", values: plTableIs.map((x) => fmtAbs(x.tradingFxIncome, unit)) },
      { label: "LN CK kinh doanh", values: plTableIs.map((x) => fmtAbs(x.tradingSecuritiesIncome, unit)) },
      { label: "LN CK đầu tư", values: plTableIs.map((x) => fmtAbs(x.investmentSecuritiesIncome, unit)) },
      { label: "Thu nhập HĐ khác", values: plTableIs.map((x) => fmtAbs(x.otherOperatingIncome, unit)) },
      { label: "TOI (Tổng TN HĐ)", values: plTableIs.map((x) => fmtAbs(x.totalOperatingIncome, unit)), bold: true, separator: true },
      { label: "OPEX (Chi phí HĐ)", values: plTableIs.map((x) => fmtAbs(x.operatingExpenses, unit)) },
      { label: "PPOP (LN trước DP)", values: plTableIs.map((x) => { const t = x.totalOperatingIncome ?? 0; const o = x.operatingExpenses ?? 0; return fmtAbs(t - Math.abs(o), unit); }), bold: true },
      { label: "Chi phí dự phòng", values: plTableIs.map((x) => fmtAbs(x.provisionExpenses, unit)) },
      { label: "LNTT", values: plTableIs.map((x) => fmtAbs(x.profitBeforeTax, unit)), bold: true },
      { label: "Thuế TNDN", values: plTableIs.map((x) => fmtAbs(x.incomeTax, unit)) },
      { label: "LNST", values: plTableIs.map((x) => fmtAbs(x.netProfit, unit)), bold: true, separator: true },
    ];

    return (
      <div className="space-y-5">
        {/* Charts Row 1: TOI Donut + TOI Trend */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Cơ cấu Tổng Thu nhập HĐ (TOI)" subtitle="NII vs Phí DV vs Trading/FX vs Khác">
            {toiDonutData.length > 0 ? (
              <ReactECharts
                option={{
                  tooltip: { trigger: "item", backgroundColor: "rgba(15,23,42,0.92)", textStyle: { color: "#e2e8f0", fontSize: 12 } },
                  series: [{ type: "pie", radius: ["42%", "72%"], label: { show: true, fontSize: 10, formatter: "{b}\n{d}%" }, data: toiDonutData, emphasis: { scaleSize: 8 } }],
                }}
                style={{ height: 300 }}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">Không đủ dữ liệu cơ cấu thu nhập</div>
            )}
          </ChartCard>
          {toiTrendOpt ? (
            <ChartCard title="Thu nhập HĐ theo quý (Breakdown)" subtitle="Cơ cấu thu nhập hoạt động qua các kỳ">
              <ReactECharts option={toiTrendOpt} style={{ height: 300 }} />
            </ChartCard>
          ) : (
            <ChartCard title="Cơ cấu Chi phí" subtitle="OPEX vs Dự phòng">
              {opexDonutData.length > 0 ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: "item", backgroundColor: "rgba(15,23,42,0.92)", textStyle: { color: "#e2e8f0", fontSize: 12 } },
                    series: [{ type: "pie", radius: ["42%", "72%"], label: { show: true, fontSize: 10, formatter: "{b}\n{d}%" }, data: opexDonutData }],
                  }}
                  style={{ height: 300 }}
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">Không đủ dữ liệu chi phí</div>
              )}
            </ChartCard>
          )}
        </div>

        {/* Charts Row 2: Opex donut + YoY */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {opexDonutData.length > 0 && toiTrendOpt && (
            <ChartCard title="Cơ cấu Chi phí (OPEX vs Dự phòng)" subtitle="Tỷ trọng hai loại chi phí chính">
              <ReactECharts
                option={{
                  tooltip: { trigger: "item", backgroundColor: "rgba(15,23,42,0.92)", textStyle: { color: "#e2e8f0", fontSize: 12 } },
                  series: [{ type: "pie", radius: ["42%", "72%"], label: { show: true, fontSize: 11, formatter: "{b}\n{d}%" }, data: opexDonutData, emphasis: { scaleSize: 8 } }],
                }}
                style={{ height: 280 }}
              />
            </ChartCard>
          )}
          {yoyOpt ? (
            <ChartCard title="Tăng trưởng YoY: NII vs LNST" subtitle="Nếu phân kỳ → LN đang bị chi phí dự phòng kéo lùi">
              <ReactECharts option={yoyOpt} style={{ height: 280 }} />
            </ChartCard>
          ) : (
            <ChartCard title="Chất lượng Thu nhập" subtitle="Tỷ trọng NII / Fee / Provision trên TOI">
              <div className="space-y-3 p-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">NII / TOI</span>
                  <span className="font-bold">{safeRatio(latestIs?.netInterestIncome, latestIs?.totalOperatingIncome) != null ? `${fmtNumber((safeRatio(latestIs?.netInterestIncome, latestIs?.totalOperatingIncome) ?? 0) * 100, 1)}%` : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Fee / TOI</span>
                  <span className="font-bold">{safeRatio(latestIs?.netServiceFeeIncome, latestIs?.totalOperatingIncome) != null ? `${fmtNumber((safeRatio(latestIs?.netServiceFeeIncome, latestIs?.totalOperatingIncome) ?? 0) * 100, 1)}%` : "N/A"}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Provision / TOI</span>
                  <span className="font-bold">{safeRatio(latestIs?.provisionExpenses, latestIs?.totalOperatingIncome) != null ? `${fmtNumber(Math.abs(safeRatio(latestIs?.provisionExpenses, latestIs?.totalOperatingIncome) ?? 0) * 100, 1)}%` : "N/A"}</span>
                </div>
              </div>
            </ChartCard>
          )}
        </div>

        {/* Data Table */}
        <DataTable headers={plTableHeaders} rows={plTableRows} title="📋 Bảng Kết quả Kinh doanh (P&L)" />
      </div>
    );
  };

  /* ================================================================
     TAB 5: LIQUIDITY & ALM GAP
     ================================================================ */
  const renderLiquidity = () => {
    const prevLdrChange = pctChange(ldr, prevLdr);

    // LDR Trend
    const ldrTrendOpt = trendBs.length > 1 ? {
      tooltip: tooltipOpts(),
      legend: legendOpts(["LDR (%)"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" }, min: 50, max: 120 },
      series: [
        {
          name: "LDR (%)", type: "line",
          data: trendBs.map((x) => {
            const r = safeRatio(x.loansToCustomers, x.customerDeposits);
            return r != null ? Number((r * 100).toFixed(1)) : null;
          }),
          markLine: { data: [{ yAxis: 85, lineStyle: { color: COLORS.red, type: "dashed" as const }, label: { formatter: "Ngưỡng 85%", fontSize: 10, color: COLORS.red } }], silent: true },
          lineStyle: { color: COLORS.primary, width: 3 },
          itemStyle: { color: COLORS.primary },
          symbol: "circle", symbolSize: 6,
          areaStyle: { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(249,115,22,0.12)" }, { offset: 1, color: "rgba(249,115,22,0.01)" }] } },
        },
      ],
    } : null;

    // Liquidity Assets vs Liabilities Trend
    const liqTrendOpt = trendBs.length > 1 ? {
      tooltip: tooltipOpts(),
      legend: legendOpts(["TS Thanh khoản nhanh", "Nợ ngắn hạn"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      series: [
        {
          name: "TS Thanh khoản nhanh", type: "bar",
          data: trendBs.map((x) => scaleByUnit((x.cash ?? 0) + (x.sbvDeposits ?? 0) + (x.interBankDeposits ?? 0) + (x.tradingSecurities ?? 0), unit) ?? 0),
          itemStyle: { color: COLORS.teal }, barWidth: "35%",
        },
        {
          name: "Nợ ngắn hạn", type: "bar",
          data: trendBs.map((x) => scaleByUnit(x.currentLiabilities, unit) ?? 0),
          itemStyle: { color: COLORS.rose }, barWidth: "35%",
        },
      ],
    } : null;

    // Liability Structure Trend
    const liabTrendOpt = trendBs.length > 1 ? {
      tooltip: tooltipOpts(),
      legend: legendOpts(["Nợ ngắn hạn", "Nợ dài hạn"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      series: [
        { name: "Nợ ngắn hạn", type: "bar", stack: "liab", data: trendBs.map((x) => scaleByUnit(x.currentLiabilities, unit) ?? 0), itemStyle: { color: COLORS.amber } },
        { name: "Nợ dài hạn", type: "bar", stack: "liab", data: trendBs.map((x) => scaleByUnit(x.longTermLiabilities, unit) ?? 0), itemStyle: { color: COLORS.indigo } },
      ],
    } : null;

    // Data Table
    const liqTableHeaders = trendBs.slice(-6).map((x) => x.period.period);
    const liqTableData = trendBs.slice(-6);
    const liqTableRows: DataTableRow[] = [
      { label: "Tiền & TĐTT", values: liqTableData.map((x) => fmtAbs(x.cash, unit)) },
      { label: "TG tại NHNN", values: liqTableData.map((x) => fmtAbs(x.sbvDeposits, unit)) },
      { label: "TG & CV TCTD khác", values: liqTableData.map((x) => fmtAbs(x.interBankDeposits, unit)) },
      { label: "CK kinh doanh", values: liqTableData.map((x) => fmtAbs(x.tradingSecurities, unit)) },
      { label: "TS Thanh khoản nhanh", values: liqTableData.map((x) => fmtAbs((x.cash ?? 0) + (x.sbvDeposits ?? 0) + (x.interBankDeposits ?? 0) + (x.tradingSecurities ?? 0), unit)), bold: true, separator: true },
      { label: "Cho vay KH", values: liqTableData.map((x) => fmtAbs(x.loansToCustomers, unit)) },
      { label: "TG của KH", values: liqTableData.map((x) => fmtAbs(x.customerDeposits, unit)) },
      { label: "LDR (%)", values: liqTableData.map((x) => { const r = safeRatio(x.loansToCustomers, x.customerDeposits); return r != null ? fmtNumber(r * 100, 1) + "%" : "—"; }), bold: true, separator: true },
      { label: "Nợ ngắn hạn", values: liqTableData.map((x) => fmtAbs(x.currentLiabilities, unit)) },
      { label: "Nợ dài hạn", values: liqTableData.map((x) => fmtAbs(x.longTermLiabilities, unit)) },
      { label: "Vốn CSH", values: liqTableData.map((x) => fmtAbs(x.totalEquity, unit)), bold: true },
      { label: "Vốn CSH / TTS (%)", values: liqTableData.map((x) => { const r = safeRatio(x.totalEquity, x.totalAssets); return r != null ? fmtNumber(r * 100, 2) + "%" : "—"; }) },
    ];

    return (
      <div className="space-y-5">
        {/* Note */}
        <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          <span className="font-semibold">⚠️ Lưu ý:</span> Dữ liệu Ma trận đáo hạn (Maturity Gap) yêu cầu thông tin chi tiết từ Thuyết minh BCTC.
          Dashboard sử dụng các chỉ số thanh khoản proxy từ BCTC công bố.
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="LDR (Cho vay / Huy động)"
            value={ldr != null ? `${fmtNumber(ldr * 100, 1)}%` : "N/A"}
            change={prevLdrChange}
            lowerIsBetter
            accent={COLORS.primary}
            tooltip="Tỷ lệ cho vay trên huy động. Ngưỡng NHNN: ≤85%. LDR quá cao → rủi ro thanh khoản."
          />
          <KpiCard
            label="Dự trữ thanh khoản sơ cấp"
            value={fmtAbs((latestBs?.cash ?? 0) + (latestBs?.sbvDeposits ?? 0), unit)}
            change={pctChange((latestBs?.cash ?? 0) + (latestBs?.sbvDeposits ?? 0), (prevBs?.cash ?? 0) + (prevBs?.sbvDeposits ?? 0))}
            accent={COLORS.teal}
            tooltip="Tiền mặt + TG tại NHNN. Nguồn thanh khoản sẵn sàng cao nhất."
            subLabel={unitLabel(unit)}
          />
          <KpiCard
            label="Quick Ratio"
            value={quickLiquidity != null ? `${fmtNumber(quickLiquidity * 100, 1)}%` : "N/A"}
            accent={COLORS.blue}
            tooltip="Tài sản thanh khoản nhanh / Nợ ngắn hạn. Quick Ratio > 100% → đáp ứng tốt nợ ngắn hạn."
          />
          <KpiCard
            label="Vốn CSH / Tổng TS"
            value={equityRatio != null ? `${fmtNumber(equityRatio * 100, 2)}%` : "N/A"}
            change={pctChange(equityRatio, safeRatio(prevBs?.totalEquity, prevBs?.totalAssets))}
            accent={COLORS.purple}
            tooltip="Tỷ lệ vốn tự có so với tổng tài sản. Proxy cho khả năng chống chịu rủi ro."
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {ldrTrendOpt ? (
            <ChartCard title="Xu hướng LDR" subtitle="Loan-to-Deposit Ratio qua các kỳ (ngưỡng 85%)">
              <ReactECharts option={ldrTrendOpt} style={{ height: 280 }} />
            </ChartCard>
          ) : (
            <ChartCard title="LDR" subtitle="Kỳ hiện tại">
              <div className="flex h-[280px] items-center justify-center">
                <div className="text-center">
                  <p className="text-5xl font-black" style={{ color: ldr != null && ldr > 0.85 ? COLORS.red : COLORS.green }}>{ldr != null ? `${fmtNumber(ldr * 100, 1)}%` : "N/A"}</p>
                  <p className="text-xs text-muted-foreground mt-2">Ngưỡng NHNN: ≤85%</p>
                </div>
              </div>
            </ChartCard>
          )}
          {liqTrendOpt ? (
            <ChartCard title="TS Thanh khoản vs Nợ ngắn hạn" subtitle="So sánh khả năng đáp ứng nghĩa vụ ngắn hạn">
              <ReactECharts option={liqTrendOpt} style={{ height: 280 }} />
            </ChartCard>
          ) : (
            <ChartCard title="Thanh khoản hiện hành" subtitle="Kỳ hiện tại">
              <div className="grid grid-cols-2 gap-4 h-[280px] items-center p-4">
                <div className="text-center p-4 rounded-lg border bg-teal-50/50">
                  <p className="text-xs text-muted-foreground">TS thanh khoản nhanh</p>
                  <p className="text-2xl font-bold text-teal-600 mt-2">{fmtAbs(quickAssets, unit)}</p>
                </div>
                <div className="text-center p-4 rounded-lg border bg-rose-50/50">
                  <p className="text-xs text-muted-foreground">Nợ ngắn hạn</p>
                  <p className="text-2xl font-bold text-rose-600 mt-2">{fmtAbs(latestBs?.currentLiabilities, unit)}</p>
                </div>
              </div>
            </ChartCard>
          )}
        </div>

        {liabTrendOpt && (
          <ChartCard title="Cơ cấu Nợ phải trả theo kỳ hạn" subtitle="Nợ ngắn hạn vs Nợ dài hạn qua các kỳ">
            <ReactECharts option={liabTrendOpt} style={{ height: 260 }} />
          </ChartCard>
        )}

        {/* Quick Ratio Gauge */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChartCard title="Sức khỏe Thanh khoản" subtitle="Quick Ratio gauge">
            <ReactECharts
              option={{
                series: [{
                  type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 200,
                  pointer: { length: "55%", width: 5, itemStyle: { color: quickLiquidity != null && quickLiquidity >= 1.0 ? COLORS.green : COLORS.amber } },
                  axisLine: { lineStyle: { width: 14, color: [[0.5, COLORS.red], [0.75, COLORS.amber], [1, COLORS.green]] } },
                  axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                  title: { show: true, offsetCenter: [0, "72%"], fontSize: 11, color: "#94a3b8" },
                  detail: { fontSize: 20, fontWeight: "bold", offsetCenter: [0, "42%"], formatter: (v: number) => `${v.toFixed(1)}%`, color: quickLiquidity != null && quickLiquidity >= 1.0 ? COLORS.green : COLORS.amber },
                  data: [{ value: quickLiquidity != null ? quickLiquidity * 100 : 0, name: "Quick Ratio" }],
                }],
              }}
              style={{ height: 200 }}
            />
          </ChartCard>
          <ChartCard title="Bộ đệm Thanh khoản" subtitle="Tổng quan các lớp thanh khoản">
            <div className="space-y-3 p-2">
              {[
                { label: "Tiền mặt & TĐTT", value: latestBs?.cash ?? 0, color: COLORS.teal },
                { label: "TG tại NHNN", value: latestBs?.sbvDeposits ?? 0, color: COLORS.blue },
                { label: "TG & CV TCTD khác", value: latestBs?.interBankDeposits ?? 0, color: COLORS.purple },
                { label: "CK kinh doanh", value: latestBs?.tradingSecurities ?? 0, color: COLORS.cyan },
              ].map((item) => {
                const pct = latestBs?.totalAssets ? (item.value / latestBs.totalAssets) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-semibold">{fmtAbs(item.value, unit)} ({fmtNumber(pct, 1)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct * 5, 100)}%`, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>

        {/* Data Table */}
        <DataTable headers={liqTableHeaders} rows={liqTableRows} title="📋 Bảng số liệu Thanh khoản" />
      </div>
    );
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-5">
      {/* Global Critical Warnings */}
      {criticalWarnings.length > 0 && (
        <div className="rounded-xl bg-red-500/10 border-2 border-red-500/40 p-4 animate-pulse">
          <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 mb-2">
            <span className="text-xl">🚨</span> Critical Warning — Ngưỡng An toàn bị Vi phạm
          </div>
          <ul className="list-inside list-disc pl-5 text-sm space-y-1 text-red-600 dark:text-red-400">
            {criticalWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/50 p-5 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-card to-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-lg shadow-md">
              🏦
            </div>
            <div>
              <h2 className="text-lg font-bold">BankInsight <span className="text-orange-500">DeepDive</span></h2>
              <p className="text-xs text-muted-foreground">{ticker} • {sector || "Ngân hàng"} • {industry || "NHTM"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Kỳ báo cáo</span>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium bg-card hover:bg-muted/50 focus:ring-2 focus:ring-orange-500/30 focus:outline-none min-w-[120px] transition-colors"
              >
                <span>{selectedPeriod ?? "Chọn kỳ"}</span>
                <svg className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute top-full left-0 z-50 mt-1 w-[40vw] min-w-[160px] max-w-[280px] max-h-[360px] overflow-y-auto rounded-lg border border-border bg-card shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {periods.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { onPeriodChange(p); setDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-950/20 ${selectedPeriod === p ? "bg-orange-100 dark:bg-orange-950/30 text-orange-600 font-semibold" : "text-foreground"
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Đơn vị</span>
              <select className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium bg-card focus:ring-2 focus:ring-orange-500/30 focus:outline-none" value={String(unit)} onChange={(e) => onUnitChange(Number(e.target.value))}>
                <option value="1000000000">Tỷ VND</option>
                <option value="1000000">Triệu VND</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-0 px-3 overflow-x-auto bg-muted/10">
          {BANK_SCREENS.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-[3px] transition-all whitespace-nowrap ${screen === item.id
                ? "text-orange-600 border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
                }`}
            >
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {screen === "balance" && renderBalanceSheet()}
      {screen === "asset_quality" && renderAssetQuality()}
      {screen === "efficiency" && renderEfficiency()}
      {screen === "income" && renderIncome()}
      {screen === "liquidity" && renderLiquidity()}
    </div>
  );
}
