"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { FinancialReportsData, FinancialRatioItem } from "@/hooks/useStockData";

/* ================================================================
   TYPES & PROP DEFINITIONS
   ================================================================ */
export interface FincoTcdnDashboardProps {
  ticker: string;
  sector?: string;
  industry?: string;
  financialReports?: FinancialReportsData;
  financialRatios?: FinancialRatioItem[];
  periods: string[];
  selectedPeriod: string | null;
  onPeriodChange: (p: string | null) => void;
  unit: number;
  onUnitChange: (u: number) => void;
}

type FincoScreen = "balance" | "asset_quality" | "efficiency" | "income" | "liquidity";

const FINCO_SCREENS: { id: FincoScreen; label: string; icon: string }[] = [
  { id: "balance", label: "CĐKT & Nguồn vốn", icon: "🏛️" },
  { id: "asset_quality", label: "Chất lượng tài sản", icon: "🛡️" },
  { id: "efficiency", label: "Hiệu quả KD (DuPont)", icon: "⚙️" },
  { id: "income", label: "Thu nhập & Chi phí", icon: "💰" },
  { id: "liquidity", label: "ALM & Thanh khoản", icon: "💧" },
];

/* ================================================================
   UTILITIES
   ================================================================ */
const formatMoney = (val: number | null | undefined): string => {
  if (val == null || isNaN(val)) return "N/A";
  return new Intl.NumberFormat("vi-VN").format(Math.round(val));
};

const fmtRatio = (val: number | null | undefined, decimals = 2): string => {
  if (val == null || isNaN(val)) return "N/A";
  return `${val.toFixed(decimals)}%`;
};

const fmtNumber = (val: number | null | undefined, decimals = 1): string => {
  if (val == null || isNaN(val)) return "N/A";
  return val.toFixed(decimals);
};

const fmtAbs = (val: number | null | undefined): number | null => {
  if (val == null || isNaN(val)) return null;
  return Math.abs(val);
};

const safeRatio = (num: number | null | undefined, den: number | null | undefined): number | null => {
  if (num == null || den == null || den === 0) return null;
  return num / den;
};

const annualizationFactor = (quarter: number | null | undefined): number => {
  // Annual rows (quarter=0) should not be multiplied by 4.
  return quarter === 0 ? 1 : 4;
};

const scaleByUnit = (val: number | null | undefined, unit: number): number | null => {
  if (val == null || isNaN(val)) return null;
  return val / unit;
};

const COLORS = {
  blue: "#3b82f6", green: "#10b981", red: "#ef4444", yellow: "#f59e0b",
  purple: "#8b5cf6", orange: "#f97316", cyan: "#06b6d4", rose: "#f43f5e",
  slate: "#64748b", indigo: "#6366f1", emerald: "#14b8a6"
};

const monoFont = "font-[var(--font-roboto-mono)]";

const getBadgeColors = (diff: number, type: "higher_better" | "lower_better") => {
  if (diff > 0) return type === "higher_better" ? "text-green-600 bg-green-500/10" : "text-red-600 bg-red-500/10";
  if (diff < 0) return type === "higher_better" ? "text-red-600 bg-red-500/10" : "text-green-600 bg-green-500/10";
  return "text-slate-500 bg-slate-500/10";
};

const getTrendIcon = (diff: number) => {
  if (diff > 0) return "▲";
  if (diff < 0) return "▼";
  return "—";
};

const findPeriodIndex = (periods: string[], selected: string | null) => {
  if (!selected) return 0;
  const idx = periods.indexOf(selected);
  return idx !== -1 ? idx : 0;
};

type DataTableRow = {
  label: string;
  values: (string | number | null)[];
  bold?: boolean;
  indent?: boolean;
  separator?: boolean;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <span className="w-1.5 h-5 bg-orange-500 rounded-sm" /> {title}
      </h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-1 ml-3.5">{subtitle}</p>}
    </div>
  );
}

function DataTable({ headers, rows, title }: { headers: string[]; rows: DataTableRow[]; title: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border/50 bg-muted/30">
        <SectionHeader title={title} subtitle="Đơn vị theo bộ lọc đã chọn" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/20 border-b border-border/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3 whitespace-nowrap lg:w-1/3">Chỉ tiêu</th>
              {headers.map((h, i) => <th key={i} className="px-4 py-3 whitespace-nowrap text-right">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {rows.map((row, i) => (
              <tr key={i} className={`hover:bg-muted/10 transition-colors ${row.bold ? 'font-bold bg-muted/5' : ''} ${row.separator ? 'border-t-2 border-border/50' : ''}`}>
                <td className={`px-5 py-2.5 whitespace-nowrap ${row.indent ? 'pl-9 text-muted-foreground' : 'text-foreground'}`}>
                  {row.label}
                </td>
                {row.values.map((val, colIdx) => (
                  <td key={colIdx} className={`px-4 py-2.5 whitespace-nowrap text-right ${monoFont} ${val === null ? 'text-muted-foreground/50' : ''}`}>
                    {val === null ? "-" : typeof val === 'number' ? formatMoney(val) : val}
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
export default function FincoTcdnDashboard({
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
}: FincoTcdnDashboardProps) {
  const [screen, setScreen] = useState<FincoScreen>("balance");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const periodIndex = findPeriodIndex(periods, selectedPeriod);
  const period = periods[periodIndex] ?? null;

  // ── Data Selectors ──
  const bsList = useMemo(() => financialReports?.balanceSheet ?? [], [financialReports]);
  const isList = useMemo(() => financialReports?.incomeStatement ?? [], [financialReports]);

  const latestBs = useMemo(() => {
    if (!period || !bsList.length) return bsList[0];
    return bsList.find(b => b.period.period === period) ?? bsList[0];
  }, [bsList, period]);

  const latestIs = useMemo(() => {
    if (!period || !isList.length) return isList[0];
    return isList.find(i => i.period.period === period) ?? isList[0];
  }, [isList, period]);

  const prevBs = useMemo(() => bsList[periodIndex + 1], [bsList, periodIndex]);
  const prevIs = useMemo(() => isList[periodIndex + 1], [isList, periodIndex]);

  const trendBs = useMemo(() => bsList.slice(periodIndex, periodIndex + 6).reverse(), [bsList, periodIndex]);
  const trendIs = useMemo(() => isList.slice(periodIndex, periodIndex + 6).reverse(), [isList, periodIndex]);
  const trendLabels = trendBs.map(b => b.period.period);
  const trendIsLabels = trendIs.map(i => i.period.period);

  // Warning thresholds
  const criticalWarnings: string[] = [];
  const currentCoverage = safeRatio(latestBs?.loanLossReserves, latestBs?.loansToCustomersGross ?? latestBs?.loansToCustomers);
  if (currentCoverage != null && Math.abs(currentCoverage * 100) < 45) {
      criticalWarnings.push(`Tỷ lệ bao phủ nợ xấu (LLR) ở mức RỦI RO (< 45%): ${fmtRatio(Math.abs(currentCoverage * 100))}`);
  }
  const latestAnnualFactor = annualizationFactor(latestIs?.period.quarter);
  const currentCreditCost = latestIs?.provisionExpenses != null && latestBs?.loansToCustomers
    ? Math.abs((latestIs.provisionExpenses * latestAnnualFactor * 100) / latestBs.loansToCustomers) : null;
  if (currentCreditCost != null && currentCreditCost > 15) {
      criticalWarnings.push(`Chi phí RRTD (Credit Cost) vượt ngưỡng 15%: ${fmtRatio(currentCreditCost)}`);
  }

  // Pre-calculated scaled values for quick reference
  const sTotalAssets = scaleByUnit(latestBs?.totalAssets, unit);
  // Loans: prefer banking field; fallback to shortTermReceivables for non-bank FinCo
  const hasLoanData = (latestBs?.loansToCustomers ?? 0) > 0;
  const sLoans = scaleByUnit(latestBs?.loansToCustomers ?? latestBs?.shortTermReceivables, unit);
  const loanLabel = hasLoanData ? "Cho vay tiêu dùng" : "Phải thu ngắn hạn (proxy)";
  // Wholesale funding proxy: Interbank + Debt Issued.
  const sWholesaleFunding = scaleByUnit((latestBs?.interBankDeposits ?? 0) + (latestBs?.debtSecuritiesIssued ?? 0), unit);
  const sEquity = scaleByUnit(latestBs?.totalEquity, unit);

  // General P&L fallbacks (used when banking-specific fields are absent)
  const hasBankingFields = (latestIs?.totalOperatingIncome ?? 0) !== 0;
  const effectiveTOI = latestIs?.totalOperatingIncome ?? latestIs?.revenue ?? null;
  const effectiveNII = latestIs?.netInterestIncome ?? latestIs?.grossProfit ?? null;
  const effectiveOPEX = latestIs?.operatingExpenses != null
    ? latestIs.operatingExpenses
    : latestIs != null ? -(latestIs.sellingExpenses + latestIs.adminExpenses) : null;
  const effectivePPOP = effectiveTOI != null && effectiveOPEX != null
    ? effectiveTOI - Math.abs(effectiveOPEX) : latestIs?.operatingProfit ?? null;
  const effectiveProvision = latestIs?.provisionExpenses ?? null;
  const hasProvisionData = (latestBs?.loanLossReserves ?? 0) !== 0 || (latestIs?.provisionExpenses ?? 0) !== 0;

  // ECharts shared options
  const baseChartGrid = () => ({ top: 40, left: 55, right: 20, bottom: 25, containLabel: true });
  const tooltipOpts = () => ({ trigger: "axis" as const, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#e2e8f0', textStyle: { color: '#0f172a', fontSize: 12 }, padding: [10, 14], extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px;' });
  const legendOpts = (data: string[]) => ({ data, top: 0, right: 0, textStyle: { fontSize: 11, color: '#64748b' }, itemWidth: 12, itemHeight: 12, icon: "circle" });

  const renderKpiCard = (
    title: string, value: string, diffStr: string, diffRaw: number,
    type: "higher_better" | "lower_better", subValue?: string, tooltipText?: string
  ) => {
    return (
      <div className="bg-card rounded-xl p-5 border border-border/50 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/5 to-purple-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
        <div className="flex justify-between items-start mb-2 relative">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
          {tooltipText && (
             <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-muted/50 text-muted-foreground cursor-help">
               <span className="text-[10px]">?</span>
               <div className="absolute opacity-0 group-hover:opacity-100 bottom-full right-0 mb-2 w-48 p-2 text-xs bg-popover text-popover-foreground rounded shadow-lg pointer-events-none transition-opacity z-10">
                 {tooltipText}
               </div>
             </div>
          )}
        </div>
        <div className="flex items-end gap-3 mt-4">
          <span className={`text-2xl font-extrabold text-foreground ${monoFont}`}>{value}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1 ${getBadgeColors(diffRaw, type)}`}>
            {getTrendIcon(diffRaw)} {diffStr}
          </span>
        </div>
        {subValue && <p className="text-xs text-muted-foreground mt-2">{subValue}</p>}
      </div>
    );
  };

  /* ================================================================
     TAB 1: BALANCE SHEET & FUNDING
     ================================================================ */
  const renderBalanceSheet = () => {
    const totalFunding = sWholesaleFunding;
    
    const assetGrowth = prevBs?.totalAssets && latestBs?.totalAssets
      ? ((latestBs.totalAssets - prevBs.totalAssets) / prevBs.totalAssets) * 100 : null;
    const loanGrowth = prevBs?.loansToCustomers && latestBs?.loansToCustomers
      ? ((latestBs.loansToCustomers - prevBs.loansToCustomers) / prevBs.loansToCustomers) * 100 : null;
    const fundingGrowth = prevBs && latestBs
      ? (((latestBs.interBankDeposits ?? 0) + (latestBs.debtSecuritiesIssued ?? 0)) -
        ((prevBs.interBankDeposits ?? 0) + (prevBs.debtSecuritiesIssued ?? 0))) /
        (((prevBs.interBankDeposits ?? 0) + (prevBs.debtSecuritiesIssued ?? 0)) || 1) * 100 : null;
    const equityGrowth = prevBs?.totalEquity && latestBs?.totalEquity
      ? ((latestBs.totalEquity - prevBs.totalEquity) / prevBs.totalEquity) * 100 : null;

    const assetDonut = sTotalAssets ? {
      tooltip: tooltipOpts(),
      legend: { show: false },
      series: [{
        type: 'pie', radius: ['55%', '85%'], avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: [
          { value: sLoans, name: "Cho vay tiêu dùng", itemStyle: { color: COLORS.purple } },
          { value: scaleByUnit(latestBs?.cash, unit) ?? 0, name: "Tiền & TĐ tiền", itemStyle: { color: COLORS.emerald } },
          { value: scaleByUnit(latestBs?.investmentSecurities, unit) ?? 0, name: "CK Đầu tư", itemStyle: { color: COLORS.blue } },
          { value: scaleByUnit((latestBs?.totalAssets ?? 0) - (latestBs?.loansToCustomers ?? 0) - (latestBs?.cash ?? 0) - (latestBs?.investmentSecurities ?? 0), unit), name: "TS Khác", itemStyle: { color: COLORS.slate } }
        ]
      }]
    } : null;

    const fundingTrend = trendBs.length ? {
      tooltip: { ...tooltipOpts(), axisPointer: { type: "shadow" } },
      legend: legendOpts(["Vay LNH", "Phát hành GTCG", "Vốn CSH"]),
      grid: baseChartGrid(),
      xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
      series: [
        { name: "Vay LNH", type: "bar", stack: "total", data: trendBs.map(x => scaleByUnit(x.interBankDeposits, unit) ?? 0), itemStyle: { color: COLORS.cyan } },
        { name: "Phát hành GTCG", type: "bar", stack: "total", data: trendBs.map(x => scaleByUnit(x.debtSecuritiesIssued, unit) ?? 0), itemStyle: { color: COLORS.orange } },
        { name: "Vốn CSH", type: "line", data: trendBs.map(x => scaleByUnit(x.totalEquity, unit) ?? 0), lineStyle: { color: COLORS.purple, width: 3 }, itemStyle: { color: COLORS.purple } }
      ]
    } : null;

    const currentLeverage = safeRatio(latestBs?.totalAssets, latestBs?.totalEquity);

    return (
      <div className="space-y-6">
        <SectionHeader title="Quy Mô Cân Đối Kế Toán" subtitle="Khẩu vị rủi ro và chiến lược cấp vốn" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderKpiCard("Tổng TÀI SẢN", `${formatMoney(sTotalAssets)}`, `${fmtRatio(assetGrowth)} YoY`, assetGrowth ?? 0, "higher_better")}
          {renderKpiCard("CHO VAY TIÊU DÙNG", `${formatMoney(sLoans)}`, `${fmtRatio(loanGrowth)} YoY`, loanGrowth ?? 0, "higher_better")}
          {renderKpiCard("VỐN BÁN BUÔN", `${formatMoney(totalFunding)}`, `${fmtRatio(fundingGrowth)} YoY`, fundingGrowth ?? 0, "higher_better", "Vay LNH & Trái phiếu")}
          {renderKpiCard("VỐN CHỦ SỞ HỮU", `${formatMoney(sEquity)}`, `${fmtRatio(equityGrowth)} YoY`, equityGrowth ?? 0, "higher_better", undefined, "Bộ đệm vốn chủ sở hữu")}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
           <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
             <SectionHeader title="Cơ cấu Tài Sản" />
             <div className="h-64 flex justify-center mt-2">
                {assetDonut ? <ReactECharts option={assetDonut} style={{width: '100%', height: '100%'}} /> : <span className="text-muted-foreground m-auto">No Data</span>}
             </div>
           </div>
           
           <div className="lg:col-span-2 bg-card rounded-xl border border-border/50 shadow-sm p-5">
             <SectionHeader title="Xu hướng Nguồn Vốn" subtitle="Mổ xẻ Vốn bán buôn & Vốn tự có" />
             <div className="h-64 mt-2">
                {fundingTrend ? <ReactECharts option={fundingTrend} style={{width: '100%', height: '100%'}} /> : <span className="text-muted-foreground m-auto">No Data</span>}
             </div>
           </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
            <SectionHeader title="Đòn bẩy hoạt động (Đồng Bảy Tài Chính)" subtitle="Tổng Tài Sản / Vốn Chủ Sở Hữu" />
            <div className="flex flex-col items-center">
                <span className={`text-4xl font-extrabold ${monoFont} text-purple-600`}>{fmtNumber(currentLeverage, 2)}x</span>
                <span className="text-sm text-muted-foreground mt-2">Ngưỡng thông thường: 5x - 8x đối với FinCo</span>
            </div>
        </div>

        <DataTable title="Bảng Cân Đối Kế Toán Chi Tiết" headers={trendLabels} rows={[
          { label: "Tổng Tài Sản", bold: true, values: trendBs.map(x => scaleByUnit(x.totalAssets, unit)) },
          { label: "1. Cho vay khách hàng", indent: true, values: trendBs.map(x => scaleByUnit(x.loansToCustomersGross ?? x.loansToCustomers, unit)) },
          { label: "2. CK Đầu tư", indent: true, values: trendBs.map(x => scaleByUnit(x.investmentSecurities, unit)) },
          { label: "Nguồn Vốn", bold: true, separator: true, values: trendBs.map(x => scaleByUnit(x.totalLiabilitiesAndEquity, unit)) },
          { label: "1. Vay LNH & TCTD", indent: true, values: trendBs.map(x => scaleByUnit(x.interBankDeposits, unit)) },
          { label: "2. Phát hành GTCG", indent: true, values: trendBs.map(x => scaleByUnit(x.debtSecuritiesIssued, unit)) },
          { label: "3. Khác", indent: true, values: trendBs.map(x => scaleByUnit((x.totalLiabilities ?? 0) - (x.interBankDeposits ?? 0) - (x.debtSecuritiesIssued ?? 0), unit)) },
          { label: "Vốn CSH", bold: true, separator: true, values: trendBs.map(x => scaleByUnit(x.totalEquity, unit)) }
        ]} />
      </div>
    );
  };

  /* ================================================================
     TAB 2: ASSET QUALITY
     ================================================================ */
  const renderAssetQuality = () => {
    const prevCoverage = safeRatio(prevBs?.loanLossReserves, prevBs?.loansToCustomersGross ?? prevBs?.loansToCustomers);
    const coverageGrowth = currentCoverage != null && prevCoverage != null ? (currentCoverage - prevCoverage) * 100 : null;

    const prevAnnualFactor = annualizationFactor(prevIs?.period.quarter);
    const prevCreditCost = prevIs?.provisionExpenses != null && prevBs?.loansToCustomers
      ? Math.abs((prevIs.provisionExpenses * prevAnnualFactor * 100) / prevBs.loansToCustomers) : null;
    const creditCostGrowth = currentCreditCost != null && prevCreditCost != null ? currentCreditCost - prevCreditCost : null;

    const ppopVal = effectivePPOP;
    const currentProvToPPOP = safeRatio(effectiveProvision, ppopVal);
    const prevPpop = prevIs != null ? (prevIs.totalOperatingIncome ?? prevIs.grossProfit ?? 0) - Math.abs(prevIs.operatingExpenses ?? (prevIs.sellingExpenses + prevIs.adminExpenses)) : null;
    const prevProvToPPOP = safeRatio(prevIs?.provisionExpenses, prevPpop);
    const provPPOPGrowth = currentProvToPPOP != null && prevProvToPPOP != null ? (currentProvToPPOP - prevProvToPPOP) * 100 : null;

    const estimatedNplRatio = currentCoverage ? Math.abs(currentCoverage / 0.60 * 100) : null;

    // Leverage & liquidity fallbacks for non-loan FinCo
    const currentDebt = (latestBs?.longTermLiabilities ?? 0) + (latestBs?.currentLiabilities ?? 0);
    const debtToEquity = safeRatio(currentDebt, latestBs?.totalEquity);
    const debtToAssets = safeRatio(currentDebt, latestBs?.totalAssets);
    const currentRatio = safeRatio(latestBs?.currentAssets, latestBs?.currentLiabilities);

    // Chart: loans+provisions OR fallback to assets/liabilities trend
    const loanProvTrend = trendBs.length > 1 && hasProvisionData ? {
        tooltip: tooltipOpts(),
        legend: legendOpts(["Dư nợ cho vay", "Dự phòng (LLR)"]),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: [
          { type: "value" as const, name: "Cho vay", axisLabel: { fontSize: 10, color: "#94a3b8" } },
          { type: "value" as const, name: "Dự phòng", axisLabel: { fontSize: 10, color: "#94a3b8" } }
        ],
        series: [
          { name: "Dư nợ cho vay", type: "bar", data: trendBs.map(x => scaleByUnit(x.loansToCustomers ?? x.shortTermReceivables ?? 0, unit)), itemStyle: { color: COLORS.purple } },
          { name: "Dự phòng (LLR)", type: "line", yAxisIndex: 1, data: trendBs.map(x => scaleByUnit(Math.abs(x.loanLossReserves ?? 0), unit)), lineStyle: { color: COLORS.red, width: 3 }, itemStyle: { color: COLORS.red }, symbol: "emptyCircle", symbolSize: 6 }
        ]
    } : null;

    // Fallback trend: current ratio & debt ratio
    const leverageTrend = trendBs.length > 1 && !hasProvisionData ? {
        tooltip: tooltipOpts(),
        legend: legendOpts(["D/E Ratio", "Current Ratio"]),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        series: [
          { name: "D/E Ratio", type: "line",
            data: trendBs.map(x => { const de = safeRatio((x.longTermLiabilities+x.currentLiabilities), x.totalEquity); return de != null ? Number(de.toFixed(2)) : null; }),
            lineStyle: { color: COLORS.red, width: 3 }, itemStyle: { color: COLORS.red }, symbol: "circle", symbolSize: 6 },
          { name: "Current Ratio", type: "line",
            data: trendBs.map(x => { const cr = safeRatio(x.currentAssets, x.currentLiabilities); return cr != null ? Number(cr.toFixed(2)) : null; }),
            lineStyle: { color: COLORS.blue, width: 3 }, itemStyle: { color: COLORS.blue }, symbol: "circle", symbolSize: 6 },
        ]
    } : null;

    const ccTrend = trendIs.length > 1 && (latestIs?.provisionExpenses ?? 0) !== 0 ? {
        tooltip: tooltipOpts(),
        legend: { show: false },
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: trendIsLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
        series: [{
            name: "Credit Cost", type: "line",
            data: trendIs.map((inc, i) => {
                const bs = trendBs[i];
                const loanBase = bs?.loansToCustomers ?? bs?.shortTermReceivables;
                if (!inc?.provisionExpenses || !loanBase) return null;
              const annualFactor = annualizationFactor(inc.period.quarter);
              return Number((Math.abs(inc.provisionExpenses * annualFactor * 100) / loanBase).toFixed(2));
            }),
            lineStyle: { color: COLORS.rose, width: 3 }, itemStyle: { color: COLORS.rose },
            areaStyle: { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(244,63,94,0.15)" }, { offset: 1, color: "rgba(244,63,94,0.02)" }] } }
        }]
    } : null;

    // Fallback chart: net margin & ROE trend
    const profitabilityTrend = trendIs.length > 1 && ccTrend === null ? {
        tooltip: tooltipOpts(),
        legend: legendOpts(["Biên LN ròng (%)", "ROE (ann. %%)"]),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: trendIsLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
        series: [
          { name: "Biên LN ròng (%)", type: "line",
            data: trendIs.map(x => { const margin = safeRatio(x.netProfit, x.revenue ?? x.totalOperatingIncome ?? 1); return margin != null ? Number((margin * 100).toFixed(2)) : null; }),
            lineStyle: { color: COLORS.green, width: 3 }, itemStyle: { color: COLORS.green }, symbol: "circle", symbolSize: 6 },
          { name: "ROE (ann. %)", type: "line",
            data: trendIs.map((x, i) => {
              const eq = trendBs[i]?.totalEquity;
              const prevEq = trendBs[i - 1]?.totalEquity;
              const eqBase = ((eq ?? 0) + (prevEq ?? 0)) / ((eq != null && prevEq != null) ? 2 : 1);
              const np = x.netProfitParent ?? x.netProfit;
              if (np == null || eqBase <= 0) return null;
              const annualFactor = annualizationFactor(x.period.quarter);
              return Number((np * annualFactor * 100 / eqBase).toFixed(2));
            }),
            lineStyle: { color: COLORS.orange, width: 3 }, itemStyle: { color: COLORS.orange }, symbol: "circle", symbolSize: 6 },
        ]
    } : null;

    return (
      <div className="space-y-6">
        <SectionHeader title={hasProvisionData ? "Chất Lượng Tài Sản & Rủi Ro Tín Dụng" : "Sức Khỏe Tài Chính & Đòn Bẩy"} subtitle={hasProvisionData ? "Sự sống còn của Công ty Tài chính" : "Rủi ro đòn bẩy và khả năng thanh toán"} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {hasProvisionData ? (
            <>
              <div className="bg-card rounded-xl p-5 border border-border/50 shadow-sm relative overflow-hidden">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">TỶ LỆ NỢ XẤU ƯỚC TÍNH</h4>
                <div className="flex items-end gap-3 mt-4">
                    <span className={`text-2xl font-extrabold text-foreground ${monoFont}`}>{fmtRatio(estimatedNplRatio)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Proxy based on Provision</p>
              </div>
              {renderKpiCard("COVERAGE RATIO (LLR)", `${fmtRatio((currentCoverage ?? 0) * 100)}`, `${fmtNumber(coverageGrowth, 1)}% điểm`, coverageGrowth ?? 0, "higher_better", "Bao phủ nợ xấu")}
              {renderKpiCard("CREDIT COST (ANNUAL)", `${fmtRatio(currentCreditCost)}`, `${fmtNumber(creditCostGrowth, 1)}% điểm`, creditCostGrowth ?? 0, "lower_better", "Chi phí RRTD / Dư nợ")}
              {renderKpiCard("PROVISION / PPOP", `${fmtRatio((currentProvToPPOP ?? 0) * 100)}`, `${fmtNumber(provPPOPGrowth, 1)}% điểm`, provPPOPGrowth ?? 0, "lower_better", "Tỷ lệ ăn mòn lợi nhuận")}
            </>
          ) : (
            <>
              {renderKpiCard("D/E RATIO (Đòn bẩy)", `${fmtNumber(debtToEquity, 2)}x`, "Tổng nợ / VCSH", 0, "lower_better", "FinCo thường 5-8x")}
              {renderKpiCard("D/A RATIO", `${fmtRatio((debtToAssets ?? 0) * 100)}`, "Tỷ lệ nợ / Tổng TS", 0, "lower_better", "Càng thấp càng an toàn")}
              {renderKpiCard("CURRENT RATIO", `${fmtNumber(currentRatio, 2)}x`, "TS ngắn hạn / Nợ ngắn hạn", 0, "higher_better", "≥1.5x là an toàn")}
              {renderKpiCard("VCSH / TỔNG TS", `${fmtRatio(safeRatio(latestBs?.totalEquity, latestBs?.totalAssets) != null ? (safeRatio(latestBs?.totalEquity, latestBs?.totalAssets) ?? 0) * 100 : null)}`, "Tỷ lệ vốn tự có", 0, "higher_better")}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
                <SectionHeader title={hasProvisionData ? "Dư nợ vs Dự phòng lũy kế" : "Xu hướng Đòn bẩy Tài chính"} subtitle={hasProvisionData ? "Gia tăng dự phòng" : "D/E Ratio và Current Ratio qua các kỳ"} />
                <div className="h-64 mt-2">
                    {loanProvTrend ? (
                      <ReactECharts option={loanProvTrend} style={{width: '100%', height: '100%'}} />
                    ) : leverageTrend ? (
                      <ReactECharts option={leverageTrend} style={{width: '100%', height: '100%'}} />
                    ) : (
                      <div className="flex h-full items-center justify-center gap-6">
                        <div className="text-center"><p className="text-xs text-muted-foreground">D/E Ratio</p><p className="text-3xl font-black text-red-500 mt-1">{fmtNumber(debtToEquity, 2)}x</p></div>
                        <div className="text-center"><p className="text-xs text-muted-foreground">Current Ratio</p><p className="text-3xl font-black text-blue-500 mt-1">{fmtNumber(currentRatio, 2)}x</p></div>
                      </div>
                    )}
                </div>
            </div>
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
                <SectionHeader title={ccTrend ? "Credit Cost (Chi phí RR Tín Dụng)" : "Xu hướng Lợi nhuận"} subtitle={ccTrend ? "Chi phí RRTD quy năm" : "Biên LN ròng & ROE qua các kỳ"} />
                <div className="h-64 mt-2">
                    {ccTrend ? (
                      <ReactECharts option={ccTrend} style={{width: '100%', height: '100%'}} />
                    ) : profitabilityTrend ? (
                      <ReactECharts option={profitabilityTrend} style={{width: '100%', height: '100%'}} />
                    ) : (
                      <div className="flex h-full items-center justify-center gap-6">
                        <div className="text-center"><p className="text-xs text-muted-foreground">Net Margin</p>
                          <p className="text-3xl font-black text-green-500 mt-1">{safeRatio(latestIs?.netProfit, latestIs?.revenue) != null ? fmtRatio((safeRatio(latestIs?.netProfit, latestIs?.revenue) ?? 0) * 100) : "N/A"}</p>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        </div>

        <DataTable title={hasProvisionData ? "Bảng Chi Phí Rủi Ro Tín Dụng" : "Bảng Đòn bẩy & Thanh khoản"} headers={trendIsLabels} rows={hasProvisionData ? [
          { label: "PPOP (LN trước DP)", bold: true, values: trendIs.map(x => scaleByUnit((x?.totalOperatingIncome ?? x?.grossProfit ?? 0) - Math.abs(x?.operatingExpenses ?? x?.sellingExpenses + x?.adminExpenses), unit)) },
          { label: "Chi phí Dự phòng (P&L)", indent: true, values: trendIs.map(x => scaleByUnit(Math.abs(x.provisionExpenses ?? 0), unit)) },
          { label: "% Chi phí DP / PPOP", indent: true, values: trendIs.map((x, i) => { const ppop = (x?.totalOperatingIncome ?? 0) - Math.abs(x?.operatingExpenses ?? 0); return fmtRatio(ppop !== 0 ? Math.abs((x.provisionExpenses ?? 0) / ppop) * 100 : null); }) },
          { label: "Dư nợ cho vay (Cuối kỳ)", separator: true, values: trendBs.map(x => scaleByUnit(x.loansToCustomers ?? x.shortTermReceivables, unit)) },
          { label: "Quỹ dự phòng LLR (CĐKT)", indent: true, values: trendBs.map(x => scaleByUnit(Math.abs(x.loanLossReserves ?? 0), unit)) },
        ] : [
          { label: "Tổng nợ phải trả", bold: true, values: trendBs.map(x => scaleByUnit(x.totalLiabilities, unit)) },
          { label: "Nợ ngắn hạn", indent: true, values: trendBs.map(x => scaleByUnit(x.currentLiabilities, unit)) },
          { label: "Nợ dài hạn", indent: true, values: trendBs.map(x => scaleByUnit(x.longTermLiabilities, unit)) },
          { label: "Vốn chủ sở hữu", bold: true, separator: true, values: trendBs.map(x => scaleByUnit(x.totalEquity, unit)) },
          { label: "D/E Ratio", indent: true, values: trendBs.map(x => { const de = safeRatio(x.totalLiabilities, x.totalEquity); return de != null ? `${fmtNumber(de, 2)}x` : "—"; }) },
          { label: "Current Ratio", indent: true, values: trendBs.map(x => { const cr = safeRatio(x.currentAssets, x.currentLiabilities); return cr != null ? `${fmtNumber(cr, 2)}x` : "—"; }) },
        ]} />
      </div>
    );
  };

  /* ================================================================
     TAB 3: EFFICIENCY & DUPONT
     ================================================================ */
  const renderEfficiency = () => {
    // Prefer banking fields; fallback to general financials
    const currentNII = latestIs?.netInterestIncome ?? latestIs?.grossProfit ?? null;
    const prevNII = prevIs?.netInterestIncome ?? prevIs?.grossProfit ?? null;
    const niiGrowth = currentNII != null && prevNII != null && prevNII !== 0 ? ((currentNII - prevNII) / Math.abs(prevNII)) * 100 : null;
    const niiLabel = (latestIs?.netInterestIncome ?? 0) !== 0 ? "Thu nhập lãi thuần (NII)" : "Lợi nhuận gộp";

    const currentAvgAssets = ((latestBs?.totalAssets ?? 0) + (prevBs?.totalAssets ?? 0)) / 2;
    const currentNimAnnualFactor = annualizationFactor(latestIs?.period.quarter);
    const currentNIM = currentNII != null && currentAvgAssets > 0 ? (currentNII * currentNimAnnualFactor * 100) / currentAvgAssets : null;
    const prevAvgAssets = ((prevBs?.totalAssets ?? 0) + (bsList[periodIndex + 2]?.totalAssets ?? 0)) / 2;
    const prevNimAnnualFactor = annualizationFactor(prevIs?.period.quarter);
    const prevNIM = prevNII != null && prevAvgAssets > 0 ? (prevNII * prevNimAnnualFactor * 100) / prevAvgAssets : null;
    const nimGrowth = currentNIM != null && prevNIM != null ? currentNIM - prevNIM : null;
    const nimLabel = (latestIs?.netInterestIncome ?? 0) !== 0 ? "Biên lãi thuần (NIM)" : "Gross Yield (LN gộp/TS)";

    const toi = effectiveTOI;
    const opex = effectiveOPEX;
    const currentCIR = toi != null && toi !== 0 && opex != null ? Math.abs(opex) / Math.abs(toi) : null;
    const prevToi = prevIs != null ? (prevIs.totalOperatingIncome ?? prevIs.revenue ?? null) : null;
    const prevOpex = prevIs != null
      ? (prevIs.operatingExpenses != null ? prevIs.operatingExpenses : -(prevIs.sellingExpenses + prevIs.adminExpenses))
      : null;
    const prevCIR = prevToi != null && prevToi !== 0 && prevOpex != null ? Math.abs(prevOpex) / Math.abs(prevToi) : null;
    const cirGrowth = currentCIR != null && prevCIR != null ? (currentCIR - prevCIR) * 100 : null;

    const pbt = latestIs?.profitBeforeTax ?? 0;
    const netIncome = latestIs?.netProfitParent ?? latestIs?.netProfit ?? 0;
    const opIncome = effectivePPOP ?? 0;
    const totalAssets = latestBs?.totalAssets ?? 0;
    const equity = latestBs?.totalEquity ?? 0;

    const annualFactor = annualizationFactor(latestIs?.period.quarter);
    const avgEquityBase = ((latestBs?.totalEquity ?? 0) + (prevBs?.totalEquity ?? 0)) / ((latestBs?.totalEquity != null && prevBs?.totalEquity != null) ? 2 : 1);
    const roe = avgEquityBase > 0 ? (netIncome * annualFactor / avgEquityBase) * 100 : 0;
    const taxBurden = pbt !== 0 ? netIncome / pbt : 0;
    const riskBurden = opIncome !== 0 ? pbt / opIncome : 0;
    const opMargin = safeRatio(opIncome, toi);
    const assetTurnover = safeRatio(toi != null ? toi * annualFactor : null, totalAssets);
    const leverage = safeRatio(totalAssets, equity);

    const roeTrend = trendIs.length > 1 ? {
        tooltip: tooltipOpts(),
        legend: legendOpts(["ROE Annualized (%)", "ROA Annualized (%)"]),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: trendIsLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
        series: [
          {
            name: "ROE Annualized (%)", type: "line",
            data: trendIs.map((inc, i) => {
                  const eq = trendBs[i]?.totalEquity;
                  const prevEq = trendBs[i - 1]?.totalEquity;
                  const eqBase = ((eq ?? 0) + (prevEq ?? 0)) / ((eq != null && prevEq != null) ? 2 : 1);
                const np = inc?.netProfitParent ?? inc?.netProfit;
                  if (np == null || eqBase <= 0) return null;
                  const annualFactor = annualizationFactor(inc?.period.quarter);
                  return Number((np * annualFactor * 100 / eqBase).toFixed(2));
            }),
            lineStyle: { color: COLORS.green, width: 3 }, itemStyle: { color: COLORS.green }, symbol: "circle", symbolSize: 6
          },
          {
            name: "ROA Annualized (%)", type: "line",
            data: trendIs.map((inc, i) => {
                const ta = trendBs[i]?.totalAssets;
                const np = inc?.netProfitParent ?? inc?.netProfit;
                  if (np == null || !ta) return null;
                  const annualFactor = annualizationFactor(inc?.period.quarter);
                  return Number((np * annualFactor * 100 / ta).toFixed(2));
            }),
            lineStyle: { color: COLORS.blue, width: 2, type: "dashed" as const }, itemStyle: { color: COLORS.blue }, symbol: "circle", symbolSize: 5
          }
        ]
    } : null;

    return (
      <div className="space-y-6">
        <SectionHeader title="Hiệu Quả Kinh Doanh & Lợi Nhuận" subtitle={hasBankingFields ? "Focus vào NII, CIR và Asset Yield" : "Focus vào Biên lợi nhuận, CIR và ROE"} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderKpiCard(niiLabel.toUpperCase(), `${formatMoney(scaleByUnit(currentNII, unit))}`, `${fmtRatio(niiGrowth)} YoY`, niiGrowth ?? 0, "higher_better")}
          {renderKpiCard(nimLabel.toUpperCase(), `${fmtRatio(currentNIM)}`, `${fmtNumber(nimGrowth, 2)}% điểm`, nimGrowth ?? 0, "higher_better", "Tỷ suất sinh lời / TS")}
          {renderKpiCard("TỶ LỆ CHI PHÍ (CIR)", `${fmtRatio((currentCIR ?? 0) * 100)}`, `${fmtNumber(cirGrowth, 1)}% điểm`, cirGrowth ?? 0, "lower_better", "OPEX / TOI")}
          {renderKpiCard("LỢI NHUẬN TT (PBT)", `${formatMoney(scaleByUnit(latestIs?.profitBeforeTax, unit))}`, "", 0, "higher_better")}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
           <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
             <SectionHeader title="Mô Hình Phân Rã ROE (DuPont - FinCo Focus)" subtitle="Yếu tố nào kéo ROE xuống?" />
             <div className="flex flex-col gap-3 mt-4">
                <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border/50">
                   <div className="text-sm font-semibold text-muted-foreground">ROE Doanh Nghiệp (Annual)</div>
                   <div className={`text-2xl font-bold ${monoFont} text-green-600`}>{fmtRatio(roe)}</div>
                </div>
                <div className="space-y-2 mt-2">
                   <div className="flex justify-between items-center bg-card p-2 border-b border-border/30">
                       <span className="text-xs text-muted-foreground">1. Thuế (Tax Burden = NI/PBT)</span>
                       <span className={`text-sm font-bold ${monoFont}`}>{fmtRatio(taxBurden * 100)}</span>
                   </div>
                   <div className="flex justify-between items-center bg-card p-2 border-b border-border/30 group relative">
                       <span className="text-xs text-muted-foreground font-semibold text-red-500">2. Earning Power (PBT/PPOP)</span>
                       <span className={`text-sm font-bold text-red-500 ${monoFont}`}>{fmtRatio(riskBurden * 100)}</span>
                       <div className="absolute hidden group-hover:block bottom-full left-0 mb-1 w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow shadow-red-500/20 border border-red-500/20 z-10">Mức lợi nhuận giữ lại sau khi trừ đi chi phí Phân bổ Dự phòng khổng lồ của FinCo. Số này càng nhỏ, áp lực nợ xấu càng lớn.</div>
                   </div>
                   <div className="flex justify-between items-center bg-card p-2 border-b border-border/30">
                       <span className="text-xs text-muted-foreground">3. Biên Lợi Nhuận HĐ (PPOP/TOI)</span>
                       <span className={`text-sm font-bold ${monoFont}`}>{fmtRatio((opMargin ?? 0) * 100)}</span>
                   </div>
                   <div className="flex justify-between items-center bg-card p-2 border-b border-border/30 group relative">
                       <span className="text-xs text-muted-foreground font-semibold text-green-500">4. Asset Yield (TOI/Total Assets)</span>
                       <span className={`text-sm font-bold text-green-500 ${monoFont}`}>{fmtRatio((assetTurnover ?? 0) * 100)}</span>
                       <div className="absolute hidden group-hover:block bottom-full left-0 mb-1 w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow shadow-green-500/20 border border-green-500/20 z-10">Tỷ suất sinh lời của Tổng tài sản (chủ yếu là Lãi suất cho vay). FinCo có mức này cao kỷ lục.</div>
                   </div>
                   <div className="flex justify-between items-center bg-card p-2 border-b border-border/30">
                       <span className="text-xs text-muted-foreground">5. Đòn bẩy Tài chính (TA/Equity)</span>
                       <span className={`text-sm font-bold ${monoFont}`}>{fmtNumber(leverage, 2)}x</span>
                   </div>
                </div>
             </div>
           </div>

           <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
             <SectionHeader title="Xu Hướng Trẻ Sinh Lời Tự Có (ROE)" subtitle="Lợi nhuận trên vốn" />
             <div className="h-72 mt-2">
                 {roeTrend ? <ReactECharts option={roeTrend} style={{width: '100%', height: '100%'}} /> : <span className="text-muted-foreground m-auto">No Data</span>}
             </div>
           </div>
        </div>
      </div>
    );
  };

  /* ================================================================
     TAB 4: INCOME & EXPENSE
     ================================================================ */
  const renderIncome = () => {
    const toi = effectiveTOI ?? 0;
    const nii = latestIs?.netInterestIncome ?? latestIs?.grossProfit ?? 0;
    const fee = latestIs?.netServiceFeeIncome ?? 0;
    const other = Math.max(toi - nii - fee, 0);

    const currentPBT = latestIs?.profitBeforeTax;
    const prevPBT = prevIs?.profitBeforeTax;
    const pbtGrowth = currentPBT && prevPBT ? ((currentPBT - prevPBT) / Math.abs(prevPBT)) * 100 : null;

    const niiLabel2 = (latestIs?.netInterestIncome ?? 0) !== 0 ? "Lãi thuần (NII)" : "Lợi nhuận gộp";
    const toiLabel2 = hasBankingFields ? "Tổng Thu nhập HĐ (TOI)" : "Doanh thu thuần";
    const toiDonut = toi > 0 ? {
        tooltip: tooltipOpts(),
        legend: { show: false },
        series: [{
            type: 'pie' as const, radius: ['45%', '70%'],
            itemStyle: { borderColor: '#fff', borderWidth: 2 },
            label: { formatter: '{b}\n{d}%', fontSize: 10 },
            data: [
                { value: scaleByUnit(nii, unit) ?? 0, name: niiLabel2, itemStyle: { color: COLORS.purple } },
                { value: scaleByUnit(fee, unit) ?? 0, name: "Phí dịch vụ", itemStyle: { color: COLORS.cyan } },
                { value: scaleByUnit(other, unit) ?? 0, name: "Thu nhập khác", itemStyle: { color: COLORS.orange } }
            ].filter(d => d.value > 0)
        }]
    } : null;

    const revenueKey = hasBankingFields ? "NII" : "Doanh thu thuần";
    const divTrend = trendIs.length > 1 ? {
        tooltip: tooltipOpts(),
        legend: legendOpts([`${revenueKey} Growth (%)`, "PBT Growth (%)"]),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: trendIsLabels.slice(0, -1), axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
        series: [
            {
                name: `${revenueKey} Growth (%)`, type: "line",
                data: trendIs.slice(0, -1).map((inc, i) => {
                    const prev = trendIs[i + 1];
                    const currVal = inc?.netInterestIncome ?? inc?.grossProfit ?? inc?.revenue;
                    const prevVal = prev?.netInterestIncome ?? prev?.grossProfit ?? prev?.revenue;
                    return currVal != null && prevVal != null && prevVal !== 0 ? Number(((currVal - prevVal) / Math.abs(prevVal) * 100).toFixed(1)) : null;
                }),
                lineStyle: { color: COLORS.blue, width: 3 }, itemStyle: { color: COLORS.blue }, symbol: "square", symbolSize: 6
            },
            {
                name: "PBT Growth (%)", type: "line",
                data: trendIs.slice(0, -1).map((inc, i) => {
                    const prev = trendIs[i + 1]?.profitBeforeTax;
                    const curr = inc?.profitBeforeTax;
                    return curr != null && prev != null && prev !== 0 ? Number(((curr - prev) / Math.abs(prev) * 100).toFixed(1)) : null;
                }),
                lineStyle: { color: COLORS.red, type: "dashed" as const, width: 3 }, itemStyle: { color: COLORS.red }, symbol: "triangle", symbolSize: 8
            }
        ]
    } : null;

    return (
      <div className="space-y-6">
        <SectionHeader title="Thu Nhập & Chi Phí (P&L)" subtitle={hasBankingFields ? "Hơn 90% Doanh thu là Lãi tín dụng" : "Phân tích doanh thu và chi phí hoạt động"} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {renderKpiCard(toiLabel2.toUpperCase(), `${formatMoney(scaleByUnit(toi, unit))}`, "", 0, "higher_better")}
             {renderKpiCard("CHI PHÍ HĐ (OPEX)", `${formatMoney(scaleByUnit(Math.abs(effectiveOPEX ?? 0), unit))}`, "Chi phí vận hành", 0, "lower_better")}
             {renderKpiCard("TĂNG TRƯỞNG PBT", `${fmtRatio(pbtGrowth)}`, "So với cùng kỳ", 0, "higher_better")}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
             <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
                 <SectionHeader title="Cơ Cấu Thu Nhập HĐ (TOI)" subtitle="Tỷ trọng Lãi thuần (NII)" />
                 <div className="h-64 mt-2">
                     {toiDonut ? <ReactECharts option={toiDonut} style={{width: '100%', height: '100%'}} /> : <span className="text-muted-foreground m-auto">No Data</span>}
                 </div>
             </div>
             
             <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5 relative overflow-hidden group">
                 <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-muted/50 text-muted-foreground cursor-help z-20">
                     <span className="text-[10px]">?</span>
                     <div className="absolute hidden group-hover:block top-full right-0 mt-2 w-64 p-3 text-xs bg-popover text-popover-foreground rounded shadow-lg border border-border/50">
                         <strong>Phân kỳ NII - PBT:</strong><br/>Ở các CTTC, Lãi thuần (NII) có thể tăng trưởng rất mạnh do đẩy mạnh cho vay, nhưng Lợi nhuận (PBT) lại cắm đầu lao dốc vì gánh nặng Dự phòng rủi ro tín dụng theo sau.
                     </div>
                 </div>
                 <SectionHeader title="Tốc độ tăng trưởng NII vs PBT (YoY)" subtitle="Phân kỳ thu nhập & Lợi nhuận ròng" />
                 <div className="h-64 mt-2 z-10 relative">
                     {divTrend ? <ReactECharts option={divTrend} style={{width: '100%', height: '100%'}} /> : <span className="text-muted-foreground m-auto">No Data</span>}
                 </div>
             </div>
        </div>

        <DataTable title="Kết Quả Hoạt Động KD Chi Tiết" headers={trendIsLabels} rows={[
          { label: hasBankingFields ? "Tổng Thu Nhập HĐ (TOI)" : "Doanh thu thuần", bold: true, values: trendIs.map(x => scaleByUnit(x?.totalOperatingIncome ?? x?.revenue, unit)) },
          { label: hasBankingFields ? "1. Thu nhập lãi thuần" : "1. Lợi nhuận gộp", indent: true, values: trendIs.map(x => scaleByUnit(x?.netInterestIncome ?? x?.grossProfit, unit)) },
          { label: hasBankingFields ? "2. Thu nhập phí DV thuần" : "2. Doanh thu tài chính", indent: true, values: trendIs.map(x => scaleByUnit(x?.netServiceFeeIncome ?? x?.financialIncome, unit)) },
          { label: "Chi Phí Hoạt Động (OPEX)", bold: true, separator: true, values: trendIs.map(x => scaleByUnit(Math.abs(x?.operatingExpenses ?? (x?.sellingExpenses + x?.adminExpenses)), unit)) },
          { label: hasBankingFields ? "PPOP (LN trước dự phòng)" : "Lợi nhuận hoạt động", bold: true, separator: true, values: trendIs.map(x => scaleByUnit((x?.totalOperatingIncome ?? x?.revenue ?? 0) - Math.abs(x?.operatingExpenses ?? (x?.sellingExpenses + x?.adminExpenses)), unit)) },
          { label: "Chi Phí Dự Phòng RRTD", indent: true, values: trendIs.map(x => scaleByUnit(x?.provisionExpenses, unit)) },
          { label: "Lợi Nhuận Trước Thuế (PBT)", bold: true, separator: true, values: trendIs.map(x => scaleByUnit(x?.profitBeforeTax, unit)) },
          { label: "LNST", bold: true, values: trendIs.map(x => scaleByUnit(x?.netProfitParent ?? x?.netProfit, unit)) },
        ]} />
      </div>
    );
  };

  /* ================================================================
     TAB 5: LIQUIDITY RISK
     ================================================================ */
  const renderLiquidity = () => {
    const currentLDR = safeRatio(latestBs?.loansToCustomers, (latestBs?.interBankDeposits ?? 0) + (latestBs?.debtSecuritiesIssued ?? 0));
    const prevLDR = safeRatio(prevBs?.loansToCustomers, (prevBs?.interBankDeposits ?? 0) + (prevBs?.debtSecuritiesIssued ?? 0));
    const ldrGrowth = currentLDR != null && prevLDR != null ? (currentLDR - prevLDR) * 100 : null;

    const currentQuickAsset = (latestBs?.cash ?? 0) + (latestBs?.sbvDeposits ?? 0); 
    const currentShortLiab = latestBs?.interBankDeposits ?? 1; 
    const currentQuickRatio = safeRatio(currentQuickAsset, currentShortLiab);

    const ldrTrend = trendBs.length ? {
        tooltip: tooltipOpts(),
        grid: baseChartGrid(),
        xAxis: { type: "category" as const, data: trendLabels, axisLabel: { fontSize: 10, color: "#94a3b8" } },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10, color: "#94a3b8", formatter: "{value}%" } },
        series: [{
            name: "LDR Proxy (%)", type: "bar",
            data: trendBs.map(x => {
                const funding = (x.interBankDeposits ?? 0) + (x.debtSecuritiesIssued ?? 0);
                if (!x.loansToCustomers || !funding) return null;
                return Number((x.loansToCustomers / funding * 100).toFixed(2));
            }),
            itemStyle: { color: COLORS.cyan }, barWidth: "50%",
            markLine: {
                data: [{ yAxis: 100, name: "Cảnh báo LDR > 100%" }],
                label: { formatter: 'Ngưỡng 100%' }, lineStyle: { color: COLORS.red, type: 'dashed' }
            }
        }]
    } : null;

    const almIll = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: legendOpts(["Tài trợ bằng Vay Ngắn hạn (LNH)", "Tài trợ bằng Vốn dài hạn (TP, CSH)"]),
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: ['Dư nợ Tiêu dùng (Loans)'] },
        series: [
            {
                name: 'Tài trợ bằng Vay Ngắn hạn (LNH)', type: 'bar', stack: 'total',
                label: { show: true, formatter: '{c}%' },
                itemStyle: { color: COLORS.orange },
                data: [Math.min(100, Math.round(((latestBs?.interBankDeposits ?? 0) / (latestBs?.loansToCustomers || 1)) * 100))]
            },
            {
                name: 'Tài trợ bằng Vốn dài hạn (TP, CSH)', type: 'bar', stack: 'total',
                label: { show: true, formatter: '{c}%' },
                itemStyle: { color: COLORS.indigo },
                data: [Math.min(100, Math.round((((latestBs?.debtSecuritiesIssued ?? 0) + (latestBs?.totalEquity ?? 0)) / (latestBs?.loansToCustomers || 1)) * 100))]
            }
        ]
    };

    return (
        <div className="space-y-6">
            <SectionHeader title="Thanh Khoản & ALM" subtitle="Rủi ro cấu trúc kỳ hạn (Rollover Risk)" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {renderKpiCard("LDR PROXY (LOAN/FUNDING)", `${fmtRatio((currentLDR ?? 0) * 100)}`, `${fmtNumber(ldrGrowth, 1)}% điểm`, ldrGrowth ?? 0, "lower_better", "Tỷ lệ Dư nợ / Tổng vốn huy động")}
                 {renderKpiCard("TÀI SẢN THANH KHOẢN (LIQUID)", `${formatMoney(scaleByUnit(currentQuickAsset, unit))}`, "", 0, "higher_better", "Tiền mặt & TG NHNN")}
                 {renderKpiCard("VAY NGẮN HẠN LNH", `${formatMoney(scaleByUnit(currentShortLiab, unit))}`, "Kỳ hạn tái cấp vốn liên tục", 0, "lower_better")}
                 {renderKpiCard("QUICK RATIO PROXY", `${fmtNumber(currentQuickRatio, 2)}x`, "Liquid Assets / Short Liabilities", 0, "higher_better")}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                 <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
                     <SectionHeader title="Xu hướng LDR Proxy (%)" subtitle="Vượt mức 100% tài trợ bằng vốn LNH là rủi ro" />
                     <div className="h-64 mt-2">
                         {ldrTrend ? <ReactECharts option={ldrTrend} style={{width: '100%', height: '100%'}} /> : <span className="text-muted-foreground m-auto">No Data</span>}
                     </div>
                 </div>

                 <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5">
                     <SectionHeader title="Mô phỏng Maturity Gap (ALM Proxy)" subtitle="Borrow Short - Lend Long (Bóc tách Dư nợ Tiêu dùng)" />
                     <p className="text-xs text-muted-foreground mb-4">Các Công ty Tài chính thường dùng nguồn vốn vay LNH (kỳ hạn rất ngắn 1-3 tháng) để tài trợ cho khoản cho vay tiêu dùng (kỳ hạn 1-3 năm), tạo ra Rủi ro tái cấp vốn (Rollover Risk) nếu NHNN thắt chặt thanh khoản.</p>
                     <div className="h-32 mt-2">
                         <ReactECharts option={almIll} style={{width: '100%', height: '100%'}} />
                     </div>
                 </div>
            </div>

            <DataTable title="Dữ Liệu Thanh Khoản (Proxy)" headers={trendLabels} rows={[
              { label: "1. Tổng vốn huy động (Funding)", bold: true, values: trendBs.map(x => scaleByUnit((x.interBankDeposits ?? 0) + (x.debtSecuritiesIssued ?? 0), unit)) },
              { label: "- Vay Liên Ngân hàng (Short-term)", indent: true, values: trendBs.map(x => scaleByUnit(x.interBankDeposits, unit)) },
              { label: "- Phát hành Trái phiếu/GTCG (Long-term)", indent: true, values: trendBs.map(x => scaleByUnit(x.debtSecuritiesIssued, unit)) },
              { label: "2. Dư nợ khoản vay (Loans)", bold: true, separator: true, values: trendBs.map(x => scaleByUnit(x.loansToCustomers, unit)) },
              { label: "Tỷ lệ LDR Proxy (%)", indent: true, bold: true, values: trendBs.map(x => {
                const funding = (x.interBankDeposits ?? 0) + (x.debtSecuritiesIssued ?? 0);
                if (!x.loansToCustomers || !funding) return "-";
                return fmtRatio(x.loansToCustomers / funding * 100) as string;
              }) },
              { label: "3. Tài sản thanh khoản (Liquidity Bufer)", bold: true, separator: true, values: trendBs.map(x => scaleByUnit((x.cash ?? 0) + (x.sbvDeposits ?? 0), unit)) },
            ]} />
        </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {criticalWarnings.length > 0 && (
        <div className="rounded-xl bg-red-500/10 border-2 border-red-500/40 p-4 animate-pulse">
          <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 mb-2">
            <span className="text-xl">🚨</span> Critical Warning — Cảnh báo Rủi ro
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md">
              🎯
            </div>
            <div>
              <h2 className="text-lg font-bold">FinCoInsight <span className="text-purple-500">DeepDive</span></h2>
              <p className="text-xs text-muted-foreground">{ticker} • {sector || "Tài chính"} • {industry || "Consumer Finance"}</p>
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
          {FINCO_SCREENS.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-[3px] transition-all whitespace-nowrap ${screen === item.id
                ? "text-purple-600 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
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
