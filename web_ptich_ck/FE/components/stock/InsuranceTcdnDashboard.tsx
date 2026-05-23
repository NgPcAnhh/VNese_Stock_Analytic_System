"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { FinancialRatioItem, FinancialReportsData } from "@/hooks/useStockData";

type InsuranceScreen = "position" | "solvency" | "performance" | "income" | "liquidity";
type CapitalFramework = "LOCAL_VN" | "SII" | "ICS";
type LOB = "NON_LIFE" | "LIFE";

interface InsuranceTcdnDashboardProps {
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

const INSURANCE_SCREENS: Array<{ id: InsuranceScreen; label: string }> = [
  { id: "position", label: "Báo cáo tài chính" },
  { id: "solvency", label: "Vốn & Thanh khoản" },
  { id: "performance", label: "Hiệu quả kinh doanh" },
  { id: "income", label: "Thu nhập & Chi phí" },
  { id: "liquidity", label: "Thanh khoản & Tái BH" },
];

const FRAMEWORK_LABELS: Record<CapitalFramework, { available: string; required: string }> = {
  LOCAL_VN: {
    available: "Biên KNTT thực tế",
    required: "Biên KNTT tối thiểu",
  },
  SII: {
    available: "Eligible Own Funds",
    required: "SCR",
  },
  ICS: {
    available: "Qualifying Capital",
    required: "ICS Requirement",
  },
};

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
  emerald: "#10b981",
};

/* ────────── HELPERS ────────── */
function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "N/A";
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function fmtNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("vi-VN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function scaleByUnit(value: number | null | undefined, unit: number): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (!unit) return value;
  return value / unit;
}

function fmtAbs(value: number | null | undefined, unit: number, digits = 1): string {
  return fmt(scaleByUnit(value, unit), digits);
}

function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${fmt(value, digits)}%`;
}

function getNumber(record: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  }
  return null;
}

function ratio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return numerator / denominator;
}

function safeRatio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  return ratio(numerator, denominator);
}

function avg(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null) return null;
  return (a + b) / 2;
}

function pctChange(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

/* ────────── KPI CARD ────────── */
function KpiCard({ label, value, subLabel, change, lowerIsBetter = false, tooltip, accent }: {
  label: string; value: string; subLabel?: string;
  change?: number | null; lowerIsBetter?: boolean;
  tooltip?: string; accent?: string;
}) {
  const isPositive = (change ?? 0) > 0;
  const goodColor = lowerIsBetter ? !isPositive : isPositive;
  const badgeBg = change == null ? "bg-slate-100 text-slate-600"
    : goodColor ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
  const arrow = change == null ? "" : change > 0 ? "↗" : "↘";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-shadow group" title={tooltip}>
      {accent && <div className="absolute top-0 left-0 w-full h-1" style={{ background: accent }} />}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {change != null && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeBg}`}>
            {arrow} {change > 0 ? "+" : ""}{fmtNumber(change, 1)}%
          </span>
        )}
        {subLabel && <span className="text-[11px] text-muted-foreground">{subLabel}</span>}
      </div>
      {tooltip && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 flex items-center rounded-xl">
          <p className="text-xs text-muted-foreground leading-relaxed">{tooltip}</p>
        </div>
      )}
    </div>
  );
}

/* ────────── SECTION HEADER ────────── */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600" />
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ────────── CHART CARD ────────── */
function ChartCard({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border/50 bg-card p-4 shadow-sm ${className}`}>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="mt-2">{children}</div>
    </div>
  );
}

/* ────────── DATA TABLE ────────── */
interface DTRow { label: string; values: (string | number | null)[]; bold?: boolean; indent?: boolean; separator?: boolean; }
function DataTable({ headers, rows, title }: { headers: string[]; rows: DTRow[]; title: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
        <SectionHeader title={title} subtitle="Đơn vị theo bộ lọc đã chọn" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left p-3 font-semibold text-muted-foreground sticky left-0 bg-muted/40 min-w-[180px]">Chỉ tiêu</th>
              {headers.map((h, i) => <th key={i} className="text-right p-3 font-semibold text-muted-foreground whitespace-nowrap min-w-[100px]">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className={`border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors ${row.separator ? "border-t-2 border-t-border/40" : ""}`}>
                <td className={`p-3 sticky left-0 bg-card ${row.bold ? "font-bold" : ""} ${row.indent ? "pl-8 text-muted-foreground" : ""}`}>{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className={`p-3 text-right font-mono tabular-nums ${row.bold ? "font-bold" : ""} ${v == null ? "text-muted-foreground/40" : ""}`}>
                    {v == null ? "—" : typeof v === "number" ? fmtNumber(v, 1) : v}
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

/* ════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════ */
export default function InsuranceTcdnDashboard({
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
}: InsuranceTcdnDashboardProps) {
  const [screen, setScreen] = useState<InsuranceScreen>("position");
  const [framework, setFramework] = useState<CapitalFramework>("LOCAL_VN");
  const [lob, setLob] = useState<LOB>("NON_LIFE");
  const [scenario, setScenario] = useState<"baseline" | "adverse" | "severe">("adverse");

  const period = selectedPeriod ?? periods[0] ?? null;

  const incomeRows = useMemo(() => financialReports?.incomeStatement ?? [], [financialReports]);
  const balanceRows = useMemo(() => financialReports?.balanceSheet ?? [], [financialReports]);
  const cashFlowRows = useMemo(() => financialReports?.cashFlow ?? [], [financialReports]);

  const latestIncome = useMemo(() => {
    if (!period) return incomeRows[0];
    return incomeRows.find((x) => x.period.period === period) ?? incomeRows[0];
  }, [incomeRows, period]);

  const latestBalance = useMemo(() => {
    if (!period) return balanceRows[0];
    return balanceRows.find((x) => x.period.period === period) ?? balanceRows[0];
  }, [balanceRows, period]);

  const prevBalance = useMemo(() => {
    if (!latestBalance) return undefined;
    const idx = balanceRows.findIndex((x) => x.period.period === latestBalance.period.period);
    return idx >= 0 && idx + 1 < balanceRows.length ? balanceRows[idx + 1] : balanceRows[1];
  }, [balanceRows, latestBalance]);

  const prevIncome = useMemo(() => {
    if (!latestIncome) return undefined;
    const idx = incomeRows.findIndex((x) => x.period.period === latestIncome.period.period);
    return idx >= 0 && idx + 1 < incomeRows.length ? incomeRows[idx + 1] : incomeRows[1];
  }, [incomeRows, latestIncome]);

  const incomeRecord = (latestIncome ?? {}) as unknown as Record<string, unknown>;
  const balanceRecord = (latestBalance ?? {}) as unknown as Record<string, unknown>;

  // ── Core Balance Sheet metrics ──
  const totalAssets = latestBalance?.totalAssets ?? null;
  const totalEquity = latestBalance?.totalEquity ?? null;
  const totalLiabilities = latestBalance?.totalLiabilities ?? null;

  const investedAssets =
    (latestBalance?.shortTermInvestments ?? 0) +
    (latestBalance?.longTermInvestments ?? 0) +
    (latestBalance?.cash ?? 0);

  const prevInvestedAssets =
    (prevBalance?.shortTermInvestments ?? 0) +
    (prevBalance?.longTermInvestments ?? 0) +
    (prevBalance?.cash ?? 0);

  // ── Insurance-specific: try dedicated fields first, fallback to generic ──
  const technicalProvisions = getNumber(balanceRecord, [
    "technicalProvisions",
    "insuranceTechnicalProvisions",
    "claimReserves",
    "premiumReserves",
    "du_phong_nghiep_vu",
  ]) ?? (totalLiabilities != null && totalLiabilities > 0 ? totalLiabilities * 0.75 : null); // proxy: 75% of liabilities for insurance

  const netEarnedPremium =
    getNumber(incomeRecord, ["netEarnedPremium", "nep", "insuranceNetEarnedPremium", "thu_phi_bao_hiem_goc"]) ??
    getNumber(incomeRecord, ["revenue", "insuranceRevenue"]) ??
    latestIncome?.revenue ?? null;

  const claimsIncurred = getNumber(incomeRecord, [
    "claimsIncurred",
    "netClaimsIncurred",
    "insuranceClaimsExpense",
    "claimExpense",
    "chi_boi_thuong_bao_hiem_goc",
    "chi_boi_thuong",
  ]) ?? (latestIncome?.costOfGoodsSold ? latestIncome.costOfGoodsSold : null);

  const commissionExpense = getNumber(incomeRecord, ["commissionExpense", "brokerageExpense", "chiHoaHong", "chi_hoa_hong"])
    ?? null;
  const adminExpense = latestIncome?.adminExpenses ?? getNumber(incomeRecord, ["gAndAExpense"]) ?? null;
  const operatingExpense = latestIncome?.operatingExpenses ?? adminExpense ?? null;

  const underwritingExpense = (commissionExpense ?? 0) + (operatingExpense ?? 0);

  const underwritingResult =
    netEarnedPremium != null
      ? netEarnedPremium - (claimsIncurred ?? 0) - underwritingExpense
      : null;

  const combinedRatio =
    lob === "NON_LIFE" && netEarnedPremium != null && netEarnedPremium !== 0
      ? (((claimsIncurred ?? 0) + underwritingExpense) / netEarnedPremium) * 100
      : null;

  const lossRatio = netEarnedPremium != null && netEarnedPremium !== 0
    ? ((claimsIncurred ?? 0) / netEarnedPremium) * 100 : null;

  const expenseRatio = netEarnedPremium != null && netEarnedPremium !== 0
    ? (underwritingExpense / netEarnedPremium) * 100 : null;

  const underwritingMargin = ratio(underwritingResult, netEarnedPremium);

  const investmentIncome =
    getNumber(incomeRecord, [
      "investmentIncome",
      "investmentProfit",
      "otherInvestmentIncome",
      "thu_nhap_tai_chinh",
    ]) ?? latestIncome?.financialIncome ?? null;

  const investmentYield = ratio(
    investmentIncome,
    avg(investedAssets, prevInvestedAssets) || investedAssets || null,
  );

  // ── Solvency ──
  const solvencyAvailable = totalEquity;
  const solvencyRequired =
    getNumber(balanceRecord, ["minimumCapitalRequirement", "requiredCapital"]) ??
    (technicalProvisions != null ? technicalProvisions * 0.1 : null) ??
    (totalAssets != null ? totalAssets * 0.04 : null); // IFRS proxy
  const solvencyCoverage = ratio(solvencyAvailable, solvencyRequired);

  const liquidAssets = (latestBalance?.cash ?? 0) + (latestBalance?.shortTermInvestments ?? 0);
  const quickLiquidity1 = ratio(liquidAssets, totalAssets);
  const quickLiquidity2 = ratio(liquidAssets, technicalProvisions);
  const equityToAssets = ratio(totalEquity, totalAssets);
  const underwritingLeverage = ratio(netEarnedPremium, totalEquity);

  // ── P&L ──
  const pbt = latestIncome?.profitBeforeTax ?? null;
  const netIncome = latestIncome?.netProfit ?? null;
  const netProfit = netIncome;
  const nep = netEarnedPremium; // alias

  // ── DuPont ──
  const taxBurden = ratio(netIncome, pbt);
  const uwMargin = ratio(underwritingResult, netEarnedPremium);
  const invYield = ratio(investmentIncome, avg(investedAssets, prevInvestedAssets));
  const finLeverage = ratio(avg(totalAssets, prevBalance?.totalAssets), avg(totalEquity, prevBalance?.totalEquity));

  // ── Reinsurance ──
  const reinsuranceRecoverables = getNumber(balanceRecord, [
    "reinsuranceRecoverables",
    "riRecoverables",
    "reinsuranceReceivable",
    "phai_thu_tai_bao_hiem",
  ]);

  const reinsurancePayablesOverdue = getNumber(balanceRecord, [
    "reinsurancePayablesOverdue",
    "riOverduePayables",
  ]);

  const reinsuranceDependency = ratio(reinsuranceRecoverables, claimsIncurred);
  const reinsuranceOverdueRatio = ratio(reinsurancePayablesOverdue, reinsuranceRecoverables);

  // ── Stress Test ──
  const outflowRate = scenario === "baseline" ? 0.008 : scenario === "adverse" ? 0.015 : 0.025;
  const daySeries = Array.from({ length: 90 }, (_, i) => i + 1);
  const cumulativeOutflow = daySeries.map((d) => (claimsIncurred ?? 0) * outflowRate * d);
  const breachDay = cumulativeOutflow.findIndex((x) => x > liquidAssets);

  // ── ROE/ROA ──
  const roe = ratio((netIncome ?? 0) * 4, avg(totalEquity, prevBalance?.totalEquity) ?? totalEquity) != null
    ? ((netIncome ?? 0) * 4 / (avg(totalEquity, prevBalance?.totalEquity) ?? totalEquity ?? 1)) * 100 : null;
  const roa = ratio((netIncome ?? 0) * 4, avg(totalAssets, prevBalance?.totalAssets) ?? totalAssets) != null
    ? ((netIncome ?? 0) * 4 / (avg(totalAssets, prevBalance?.totalAssets) ?? totalAssets ?? 1)) * 100 : null;

  // ── CHART OPTIONS ──

  // Tab 1: Asset mix
  const positionAssetMixOption = useMemo(() => {
    const cashVal = scaleByUnit(latestBalance?.cash ?? 0, unit) ?? 0;
    const stInv = scaleByUnit(latestBalance?.shortTermInvestments ?? 0, unit) ?? 0;
    const ltInv = scaleByUnit(latestBalance?.longTermInvestments ?? 0, unit) ?? 0;
    const fixedAssets = scaleByUnit(latestBalance?.fixedAssets ?? 0, unit) ?? 0;
    const other = scaleByUnit(Math.max((totalAssets ?? 0) - investedAssets - (latestBalance?.fixedAssets ?? 0), 0), unit) ?? 0;
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      series: [{
        type: "pie", radius: ["42%", "70%"],
        itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
        label: { show: true, formatter: "{b}\n{d}%", fontSize: 10 },
        data: [
          { name: "Tiền & TĐ tiền", value: cashVal, itemStyle: { color: COLORS.green } },
          { name: "ĐT ngắn hạn", value: stInv, itemStyle: { color: COLORS.blue } },
          { name: "ĐT dài hạn", value: ltInv, itemStyle: { color: COLORS.purple } },
          { name: "TSCĐ", value: fixedAssets, itemStyle: { color: COLORS.amber } },
          { name: "Tài sản khác", value: other, itemStyle: { color: COLORS.slate } },
        ].filter(d => d.value > 0),
      }],
    };
  }, [latestBalance, totalAssets, investedAssets, unit]);

  // Capital structure chart
  const capitalStructureOption = useMemo(() => ({
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [{
      type: "pie",
      radius: ["42%", "70%"],
      itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
      label: { show: true, formatter: "{b}\n{d}%", fontSize: 10 },
      data: [
        { name: "Dự phòng kỹ thuật", value: scaleByUnit(technicalProvisions ?? 0, unit) ?? 0, itemStyle: { color: COLORS.rose } },
        { name: "Nợ khác", value: scaleByUnit(Math.max((totalLiabilities ?? 0) - (technicalProvisions ?? 0), 0), unit) ?? 0, itemStyle: { color: COLORS.amber } },
        { name: "Vốn chủ", value: scaleByUnit(totalEquity ?? 0, unit) ?? 0, itemStyle: { color: COLORS.teal } },
      ].filter(d => d.value > 0),
    }],
  }), [technicalProvisions, totalLiabilities, totalEquity, unit]);

  // ALM trend chart
  const almOption = useMemo(() => {
    const rows = balanceRows.slice(0, 8).reverse();
    const labels = rows.map((x) => x.period.period);
    const invData = rows.map((x) =>
      scaleByUnit((x.shortTermInvestments ?? 0) + (x.longTermInvestments ?? 0) + (x.cash ?? 0), unit) ?? 0,
    );
    const provData = rows.map((x) => {
      const rec = x as unknown as Record<string, unknown>;
      return scaleByUnit(
        getNumber(rec, ["technicalProvisions", "insuranceTechnicalProvisions", "claimReserves", "premiumReserves"]) ??
        (x.totalLiabilities * 0.75),
        unit,
      ) ?? 0;
    });
    return {
      tooltip: { trigger: "axis" },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      grid: { top: 36, left: 40, right: 20, bottom: 26 },
      xAxis: { type: "category", data: labels, axisLabel: { fontSize: 10 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10 } },
      series: [
        { name: "TS Đầu tư", type: "line", areaStyle: { opacity: 0.15 }, data: invData, itemStyle: { color: COLORS.blue }, lineStyle: { color: COLORS.blue, width: 2 } },
        { name: "Dự phòng kỹ thuật", type: "line", areaStyle: { opacity: 0.15 }, data: provData, itemStyle: { color: COLORS.rose }, lineStyle: { color: COLORS.rose, width: 2 } },
      ],
    };
  }, [balanceRows, unit]);

  // Performance trend chart
  const performanceTrendOption = useMemo(() => {
    const rows = incomeRows.slice(0, 8).reverse();
    return {
      tooltip: { trigger: "axis" },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      grid: { top: 36, left: 40, right: 24, bottom: 26 },
      xAxis: { type: "category", data: rows.map((x) => x.period.period), axisLabel: { fontSize: 10 } },
      yAxis: [
        { type: "value", name: "", axisLabel: { fontSize: 10 } },
        { type: "value", name: "%", axisLabel: { fontSize: 10, formatter: "{value}%" } },
      ],
      series: [
        {
          name: "Phí BH thuần (NEP)",
          type: "bar",
          data: rows.map((x) => {
            const rec = x as unknown as Record<string, unknown>;
            return scaleByUnit(getNumber(rec, ["netEarnedPremium", "nep", "insuranceNetEarnedPremium"]) ?? x.revenue ?? 0, unit) ?? 0;
          }),
          itemStyle: { color: COLORS.blue },
        },
        {
          name: "Bồi thường",
          type: "bar",
          data: rows.map((x) => {
            const rec = x as unknown as Record<string, unknown>;
            return scaleByUnit(getNumber(rec, ["claimsIncurred", "netClaimsIncurred", "insuranceClaimsExpense"]) ?? x.costOfGoodsSold ?? 0, unit) ?? 0;
          }),
          itemStyle: { color: COLORS.red },
        },
        {
          name: "Combined Ratio (%)",
          type: "line",
          yAxisIndex: 1,
          data: rows.map((x) => {
            const rec = x as unknown as Record<string, unknown>;
            const nep = getNumber(rec, ["netEarnedPremium", "nep", "insuranceNetEarnedPremium"]) ?? x.revenue;
            const claims = getNumber(rec, ["claimsIncurred", "netClaimsIncurred", "insuranceClaimsExpense"]) ?? x.costOfGoodsSold ?? 0;
            const op = x.operatingExpenses ?? x.adminExpenses ?? 0;
            return nep != null && nep !== 0 ? Number(((claims + op) / nep) * 100).toFixed(1) : null;
          }),
          itemStyle: { color: COLORS.amber },
          lineStyle: { color: COLORS.amber, width: 2 },
          symbol: "circle", symbolSize: 5,
        },
      ],
    };
  }, [incomeRows, unit]);

  // Growth chart
  const growthOption = useMemo(() => {
    const rows = incomeRows.slice(0, 8).reverse();
    const nepSeries = rows.map((x, idx) => {
      if (idx === 0) return null;
      const rec = x as unknown as Record<string, unknown>;
      const prev = rows[idx - 1] as unknown as Record<string, unknown>;
      const curNep = getNumber(rec, ["netEarnedPremium", "nep", "insuranceNetEarnedPremium", "revenue"]);
      const prevNep = getNumber(prev, ["netEarnedPremium", "nep", "insuranceNetEarnedPremium", "revenue"]);
      return curNep != null && prevNep != null && prevNep !== 0
        ? Number(((curNep - prevNep) / prevNep) * 100).toFixed(1) : null;
    });
    const npSeries = rows.map((x, idx) => {
      if (idx === 0) return null;
      const prev = rows[idx - 1];
      return x.netProfit != null && prev.netProfit != null && prev.netProfit !== 0
        ? Number(((x.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100).toFixed(1) : null;
    });
    return {
      tooltip: { trigger: "axis" },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      grid: { top: 36, left: 40, right: 20, bottom: 26 },
      xAxis: { type: "category", data: rows.map((x) => x.period.period), axisLabel: { fontSize: 10 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10, formatter: "{value}%" } },
      series: [
        { name: "NEP Growth %", type: "line", data: nepSeries, itemStyle: { color: COLORS.blue }, lineStyle: { color: COLORS.blue, width: 2 }, symbol: "circle", symbolSize: 5 },
        { name: "Net Profit Growth %", type: "line", data: npSeries, itemStyle: { color: COLORS.green }, lineStyle: { color: COLORS.green, width: 2 }, symbol: "circle", symbolSize: 5 },
      ],
    };
  }, [incomeRows]);

  // Stress test
  const stressOption = useMemo(() => ({
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, left: 40, right: 20, bottom: 25 },
    xAxis: { type: "category", data: daySeries.filter((_, i) => i % 9 === 0) },
    yAxis: { type: "value", axisLabel: { fontSize: 10 } },
    series: [
      {
        name: "Dòng tiền tích lũy",
        type: "line",
        data: cumulativeOutflow.filter((_, i) => i % 9 === 0).map((v) => scaleByUnit(v, unit)),
        itemStyle: { color: COLORS.red },
        lineStyle: { color: COLORS.red, width: 2 },
        areaStyle: { opacity: 0.1 },
      },
      {
        name: "TS thanh khoản",
        type: "line",
        data: daySeries.filter((_, i) => i % 9 === 0).map(() => scaleByUnit(liquidAssets, unit)),
        itemStyle: { color: COLORS.green },
        lineStyle: { color: COLORS.green, width: 2, type: "dashed" },
      },
    ],
  }), [cumulativeOutflow, daySeries, liquidAssets, unit]);

  // ROE Trend
  const roeTrendOption = useMemo(() => {
    if (!financialRatios || financialRatios.length < 2) return null;
    const sorted = [...financialRatios].sort((a, b) => a.year !== b.year ? a.year - b.year : a.quarter - b.quarter).slice(-8);
    return {
      tooltip: { trigger: "axis" },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      grid: { top: 36, left: 40, right: 20, bottom: 26 },
      xAxis: { type: "category", data: sorted.map(r => `Q${r.quarter}/${r.year}`), axisLabel: { fontSize: 10 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10, formatter: "{value}%" } },
      series: [
        { name: "ROE (%)", type: "line", data: sorted.map(r => r.roe != null ? Number((r.roe * 100).toFixed(2)) : null), itemStyle: { color: COLORS.primary }, lineStyle: { color: COLORS.primary, width: 2 }, symbol: "circle", symbolSize: 5, areaStyle: { opacity: 0.1 } },
        { name: "ROA (%)", type: "line", data: sorted.map(r => r.roa != null ? Number((r.roa * 100).toFixed(2)) : null), itemStyle: { color: COLORS.teal }, lineStyle: { color: COLORS.teal, width: 2 }, symbol: "circle", symbolSize: 5, areaStyle: { opacity: 0.1 } },
      ],
    };
  }, [financialRatios]);

  // Trend data for table
  const trendBs = balanceRows.slice(0, 6).reverse();
  const trendIs = incomeRows.slice(0, 6).reverse();

  // Data availability flags
  const hasAlmData = balanceRows.some((x) =>
    (x.shortTermInvestments ?? 0) !== 0 || (x.longTermInvestments ?? 0) !== 0 || (x.cash ?? 0) !== 0,
  );
  const hasPerformanceTrendData = incomeRows.length >= 2;
  const hasGrowthData = incomeRows.length >= 2;
  const hasStressData = liquidAssets > 0;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/50 p-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-card to-orange-50/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-lg shadow">
              🛡️
            </div>
            <div>
              <h2 className="text-lg font-bold">Insurance <span className="text-orange-500">DeepDive</span></h2>
              <p className="text-xs text-muted-foreground">{ticker} • {sector || "N/A"} • {industry || "N/A"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Kỳ báo cáo</span>
              <select
                className="rounded-md border border-border px-2 py-1 text-sm bg-card focus:ring-2 focus:ring-orange-500/30 focus:outline-none"
                value={selectedPeriod ?? ""}
                onChange={(e) => onPeriodChange(e.target.value || null)}
              >
                {periods.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Khung vốn</span>
              <select
                className="rounded-md border border-border px-2 py-1 text-sm bg-card focus:ring-2 focus:ring-orange-500/30 focus:outline-none"
                value={framework}
                onChange={(e) => setFramework(e.target.value as CapitalFramework)}
              >
                <option value="LOCAL_VN">LOCAL_VN</option>
                <option value="SII">Solvency II</option>
                <option value="ICS">IAIS ICS</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">LOB</span>
              <select className="rounded-md border border-border px-2 py-1 text-sm bg-card focus:ring-2 focus:ring-orange-500/30 focus:outline-none" value={lob} onChange={(e) => setLob(e.target.value as LOB)}>
                <option value="NON_LIFE">NON_LIFE</option>
                <option value="LIFE">LIFE</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Đơn vị</span>
              <select
                className="rounded-md border border-border px-2 py-1 text-sm bg-card focus:ring-2 focus:ring-orange-500/30 focus:outline-none"
                value={String(unit)}
                onChange={(e) => onUnitChange(Number(e.target.value))}
              >
                <option value="1000000000">Tỷ VND</option>
                <option value="1000000">Triệu VND</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 px-3 py-2 bg-muted/10">
          {INSURANCE_SCREENS.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                screen === item.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ TAB 1: POSITION ══════════ */}
      {screen === "position" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Tổng tài sản" value={fmtAbs(totalAssets, unit)} change={pctChange(totalAssets, prevBalance?.totalAssets)} accent={COLORS.blue} tooltip="Quy mô tài sản. Tăng trưởng ổn định là dấu hiệu mở rộng danh mục đầu tư." />
            <KpiCard label="Vốn chủ sở hữu" value={fmtAbs(totalEquity, unit)} change={pctChange(totalEquity, prevBalance?.totalEquity)} accent={COLORS.teal} tooltip="Bộ đệm tài chính hấp thu rủi ro." />
            <KpiCard label="TS Đầu tư (Invested)" value={fmtAbs(investedAssets, unit)} change={pctChange(investedAssets, prevInvestedAssets)} accent={COLORS.purple} tooltip="Tổng tài sản đầu tư = Tiền + ĐT ngắn hạn + ĐT dài hạn." />
            <KpiCard label="Dự phòng kỹ thuật" value={fmtAbs(technicalProvisions, unit)} accent={COLORS.rose} tooltip="Dự phòng nghiệp vụ bảo hiểm. Đây là nợ kỹ thuật lớn nhất của CTBH." />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-card p-3 shadow-sm" title="Mức đảm bảo khả năng thanh toán. >100% = đủ vốn.">
              <p className="text-xs text-muted-foreground">Solvency Coverage</p>
              <p className="text-xl font-bold mt-1">{solvencyCoverage != null ? pct(solvencyCoverage * 100, 1) : "N/A"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 shadow-sm" title="Tỷ lệ vốn đệm = VCSH / Tổng TS.">
              <p className="text-xs text-muted-foreground">Đệm Vốn / Tổng TS</p>
              <p className="text-xl font-bold mt-1">{equityToAssets != null ? pct(equityToAssets * 100, 1) : "N/A"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 shadow-sm" title="Đòn bẩy UW = Phí BH / VCSH. Càng cao, rủi ro đòn bẩy càng lớn.">
              <p className="text-xs text-muted-foreground">Đòn bẩy UW (NEP/Vốn)</p>
              <p className="text-xl font-bold mt-1">{underwritingLeverage != null ? `${fmt(underwritingLeverage, 2)}x` : "N/A"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Cơ cấu tài sản" subtitle="Phân bổ tài sản theo chức năng đầu tư">
              <ReactECharts option={positionAssetMixOption} style={{ height: 260 }} />
            </ChartCard>
            <ChartCard title="Cơ cấu nguồn vốn" subtitle="Dự phòng kỹ thuật vs Nợ khác vs VCSH">
              <ReactECharts option={capitalStructureOption} style={{ height: 260 }} />
            </ChartCard>
          </div>

          <ChartCard title="ALM Trend: Tài sản đầu tư vs Dự phòng kỹ thuật" subtitle="Tài sản đầu tư phải ≥ dự phòng kỹ thuật để đảm bảo thanh khoản dài hạn">
            {hasAlmData ? (
              <ReactECharts option={almOption} style={{ height: 280 }} />
            ) : (
              <div className="grid h-[250px] grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground text-center">Tài sản đầu tư (Invested Assets)</p>
                  <p className="mt-2 text-2xl font-bold text-teal-600">{fmtAbs(investedAssets, unit)}</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground text-center">Dự phòng kỹ thuật (Technical Prov.)</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">{fmtAbs(technicalProvisions, unit)}</p>
                </div>
              </div>
            )}
          </ChartCard>

          <DataTable
            title="📋 Bảng Cân Đối Kế Toán Chi Tiết"
            headers={trendBs.map(x => x.period.period)}
            rows={[
              { label: "Tổng tài sản", bold: true, values: trendBs.map(x => scaleByUnit(x.totalAssets, unit)) },
              { label: "Tiền & TĐT", indent: true, values: trendBs.map(x => scaleByUnit(x.cash, unit)) },
              { label: "ĐT ngắn hạn", indent: true, values: trendBs.map(x => scaleByUnit(x.shortTermInvestments, unit)) },
              { label: "ĐT dài hạn", indent: true, values: trendBs.map(x => scaleByUnit(x.longTermInvestments, unit)) },
              { label: "TS cố định", indent: true, values: trendBs.map(x => scaleByUnit(x.fixedAssets, unit)) },
              { label: "Tổng nợ phải trả", bold: true, separator: true, values: trendBs.map(x => scaleByUnit(x.totalLiabilities, unit)) },
              { label: "Vốn chủ sở hữu", bold: true, separator: true, values: trendBs.map(x => scaleByUnit(x.totalEquity, unit)) },
            ]}
          />
        </div>
      )}

      {/* ══════════ TAB 2: SOLVENCY ══════════ */}
      {screen === "solvency" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <SectionHeader title="Luồng tính Solvency" subtitle={`Khung: ${framework}`} />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4 text-sm">
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">{FRAMEWORK_LABELS[framework].available}</p>
                <p className="font-bold text-base mt-1">{fmtAbs(solvencyAvailable, unit)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">{FRAMEWORK_LABELS[framework].required}</p>
                <p className="font-bold text-base mt-1">{fmtAbs(solvencyRequired, unit)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Coverage</p>
                <p className="font-bold text-base mt-1 text-emerald-600">{solvencyCoverage != null ? pct(solvencyCoverage * 100, 2) : "N/A"}</p>
              </div>
              <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
                <p className="text-xs text-muted-foreground">Headroom vượt mức</p>
                <p className="font-bold text-base mt-1 text-orange-600">{solvencyCoverage != null ? pct((solvencyCoverage - 1) * 100, 2) : "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Thanh khoản nhanh" subtitle="Khả năng chi trả nghĩa vụ ngắn hạn">
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-sm text-muted-foreground">Tài sản lỏng / Tổng TS</span>
                  <span className={`font-bold text-lg ${(quickLiquidity1 ?? 0) > 0.2 ? "text-emerald-600" : "text-amber-600"}`}>{quickLiquidity1 != null ? pct(quickLiquidity1 * 100, 1) : "N/A"}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-sm text-muted-foreground">Tài sản lỏng / Dự phòng KT</span>
                  <span className={`font-bold text-lg ${(quickLiquidity2 ?? 0) > 0.3 ? "text-emerald-600" : "text-red-500"}`}>{quickLiquidity2 != null ? pct(quickLiquidity2 * 100, 1) : "N/A"}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-sm text-muted-foreground">TS lỏng tuyệt đối</span>
                  <span className="font-bold text-lg">{fmtAbs(liquidAssets, unit)}</span>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Xu hướng ROE & ROA" subtitle="Hiệu suất tạo lợi nhuận trên vốn/tài sản">
              {roeTrendOption ? (
                <ReactECharts option={roeTrendOption} style={{ height: 260 }} />
              ) : (
                <div className="flex h-[260px] items-center justify-center gap-10">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">ROE (annualized)</p>
                    <p className="text-4xl font-black text-orange-600 mt-2">{roe != null ? pct(roe, 2) : "N/A"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">ROA (annualized)</p>
                    <p className="text-4xl font-black text-teal-600 mt-2">{roa != null ? pct(roa, 2) : "N/A"}</p>
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          <DataTable
            title="📋 Lịch sử Cân Đối 5 kỳ"
            headers={trendBs.map(x => x.period.period)}
            rows={[
              { label: "Tổng tài sản", bold: true, values: trendBs.map(x => scaleByUnit(x.totalAssets, unit)) },
              { label: "TS Đầu tư", indent: true, values: trendBs.map(x => scaleByUnit((x.cash ?? 0) + (x.shortTermInvestments ?? 0) + (x.longTermInvestments ?? 0), unit)) },
              { label: "Tổng nợ", bold: true, separator: true, values: trendBs.map(x => scaleByUnit(x.totalLiabilities, unit)) },
              { label: "Vốn chủ sở hữu", bold: true, values: trendBs.map(x => scaleByUnit(x.totalEquity, unit)) },
              { label: "VCSH / Tổng TS (%)", indent: true, values: trendBs.map(x => x.totalAssets > 0 ? `${fmtNumber(x.totalEquity / x.totalAssets * 100, 1)}%` : "—") },
            ]}
          />
        </div>
      )}

      {/* ══════════ TAB 3: PERFORMANCE ══════════ */}
      {screen === "performance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Phí BH thuần (NEP)" value={fmtAbs(netEarnedPremium, unit)} change={pctChange(netEarnedPremium, getNumber((prevIncome ?? {}) as unknown as Record<string, unknown>, ["netEarnedPremium", "nep", "revenue"]))} accent={COLORS.blue} tooltip="Net Earned Premium – doanh thu thực sự từ khai thác BH sau trừ nhượng TBH." />
            <KpiCard label="Combined Ratio" value={lob === "LIFE" ? "N/A (LIFE)" : combinedRatio != null ? pct(combinedRatio, 1) : "N/A"} accent={combinedRatio != null && combinedRatio > 100 ? COLORS.red : COLORS.teal} lowerIsBetter tooltip="Combined Ratio = (Bồi thường + Chi phí) / Phí thuần. <100% = có lãi nghiệp vụ." />
            <KpiCard label="UW Result" value={lob === "LIFE" ? "N/A (LIFE)" : fmtAbs(underwritingResult, unit)} accent={COLORS.amber} tooltip="Kết quả khai thác thuần. Dương = có lãi nghiệp vụ; Âm = thua lỗ nghiệp vụ." />
            <KpiCard label="Investment Income" value={fmtAbs(investmentIncome, unit)} change={pctChange(investmentIncome, (prevIncome?.financialIncome ?? null))} accent={COLORS.purple} tooltip="Thu nhập đầu tư. Đây thường là nguồn lợi nhuận chính khi khai thác thua lỗ." />
          </div>

          {lob === "NON_LIFE" ? (
            <ChartCard title="Combined Ratio Trend" subtitle="NEP vs Bồi thường vs Combined Ratio">
              {hasPerformanceTrendData ? (
                <ReactECharts option={performanceTrendOption} style={{ height: 300 }} />
              ) : (
                <div className="grid h-[260px] grid-cols-3 gap-2 mt-2">
                  <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground text-center">Combined Ratio</p>
                    <p className="mt-2 text-2xl font-bold text-rose-600">{combinedRatio != null ? pct(combinedRatio, 1) : "N/A"}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground text-center">UW Margin</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">{underwritingMargin != null ? pct(underwritingMargin * 100, 1) : "N/A"}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground text-center">Investment Yield</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600">{investmentYield != null ? pct(investmentYield * 100, 2) : "N/A"}</p>
                  </div>
                </div>
              )}
            </ChartCard>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              LOB = LIFE: Combined Ratio / UW metrics được ẩn theo quy tắc nghiệp vụ bảo hiểm nhân thọ.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="🌳 DuPont – Insurance ROE" subtitle="Phân rã nguồn gốc ROE từ khai thác và đầu tư">
              <div className="space-y-2 mt-2">
                <div className="rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-200 p-4 text-center">
                  <p className="text-xs text-muted-foreground font-medium">ROE (Annualized)</p>
                  <p className="text-3xl font-black text-orange-600">{roe != null ? pct(roe, 2) : "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Tax Burden (NI/PBT)", val: taxBurden, fmt: (v: number) => fmtNumber(v, 3), tooltip: "Gánh nặng thuế. Càng gần 1 = thuế suất thực tế thấp." },
                    { label: "UW Margin", val: uwMargin, fmt: (v: number) => pct(v * 100, 2), tooltip: "Biên nghiệp vụ. Dương = CTBH có lãi từ khai thác." },
                    { label: "Investment Yield", val: invYield, fmt: (v: number) => pct(v * 100, 2), tooltip: "Tỷ suất đầu tư trên tài sản đầu tư bình quân." },
                    { label: "Financial Leverage", val: finLeverage, fmt: (v: number) => `${fmtNumber(v, 2)}x`, tooltip: "Đòn bẩy tài chính = TS BQ / VCSH BQ." },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center" title={item.tooltip}>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                      <p className="text-base font-bold mt-1">{item.val != null ? item.fmt(item.val) : "N/A"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Lãi khai thác vs Lãi đầu tư" subtitle="Cân bằng nguồn thu giữa nghiệp vụ và đầu tư">
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-sm font-medium text-blue-800">Underwriting Result</span>
                  <span className={`font-bold text-xl ${(underwritingResult ?? 0) >= 0 ? "text-blue-700" : "text-red-600"}`}>
                    {lob === "LIFE" ? "N/A" : fmtAbs(underwritingResult, unit)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <span className="text-sm font-medium text-purple-800">Investment Income</span>
                  <span className="font-bold text-xl text-purple-700">{fmtAbs(investmentIncome, unit)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-sm font-medium">Lợi nhuận trước thuế</span>
                  <span className="font-bold text-xl">{fmtAbs(pbt, unit)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="text-sm font-medium text-emerald-800">Lợi nhuận ròng</span>
                  <span className="font-bold text-xl text-emerald-700">{fmtAbs(netIncome, unit)}</span>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ══════════ TAB 4: INCOME ══════════ */}
      {screen === "income" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Cơ cấu chi phí khai thác" subtitle="Hoa hồng + Quản lý + Bồi thường">
              {(commissionExpense != null || adminExpense != null || claimsIncurred != null) ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
                    series: [{
                      type: "pie",
                      radius: ["42%", "70%"],
                      itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
                      label: { show: true, formatter: "{b}\n{d}%", fontSize: 10 },
                      data: [
                        { name: "Hoa hồng (Commission)", value: scaleByUnit(commissionExpense ?? 0, unit) ?? 0, itemStyle: { color: COLORS.amber } },
                        { name: "G&A / Quản lý", value: scaleByUnit(adminExpense ?? 0, unit) ?? 0, itemStyle: { color: COLORS.blue } },
                        { name: "Bồi thường", value: scaleByUnit(claimsIncurred ?? 0, unit) ?? 0, itemStyle: { color: COLORS.red } },
                      ].filter(d => d.value > 0),
                    }],
                  }}
                  style={{ height: 280 }}
                />
              ) : (
                <div className="grid h-[250px] grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground text-center">Expense Ratio (Tỷ lệ chi phí)</p>
                    <p className="mt-2 text-3xl font-black text-rose-600">{expenseRatio != null ? pct(expenseRatio, 1) : "N/A"}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground text-center">Loss Ratio (Tỷ lệ bồi thường)</p>
                    <p className="mt-2 text-3xl font-black text-amber-600">{lossRatio != null ? pct(lossRatio, 1) : "N/A"}</p>
                  </div>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Cơ cấu lợi nhuận" subtitle="Nguồn gốc lợi nhuận: khai thác vs đầu tư">
              {(underwritingResult != null || investmentIncome != null) ? (
                <ReactECharts
                  option={{
                    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
                    series: [{
                      type: "pie",
                      radius: ["42%", "70%"],
                      itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
                      label: { show: true, formatter: "{b}\n{d}%", fontSize: 10 },
                      data: [
                        { name: "Khai thác (UW)", value: scaleByUnit(Math.max(underwritingResult ?? 0, 0), unit) ?? 0, itemStyle: { color: COLORS.blue } },
                        { name: "Đầu tư (Inv)", value: scaleByUnit(investmentIncome ?? 0, unit) ?? 0, itemStyle: { color: COLORS.purple } },
                        { name: "Khác", value: scaleByUnit(Math.max((latestIncome?.financialIncome ?? 0) - (investmentIncome ?? 0), 0), unit) ?? 0, itemStyle: { color: COLORS.slate } },
                      ].filter(d => d.value > 0),
                    }],
                  }}
                  style={{ height: 280 }}
                />
              ) : (
                <div className="grid h-[250px] grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground text-center">Investment Yield</p>
                    <p className="mt-2 text-3xl font-black text-blue-600">{investmentYield != null ? pct(investmentYield * 100, 1) : "N/A"}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground text-center">Net Profit Margin</p>
                    <p className="mt-2 text-3xl font-black text-emerald-600">
                      {safeRatio(netProfit, nep) != null ? pct((safeRatio(netProfit, nep) ?? 0) * 100, 1) : "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Cảnh báo tăng trưởng: NEP vs Net Profit" subtitle="NEP tăng mạnh nhưng LNST giảm → underpricing hoặc bồi thường leo thang">
            {hasGrowthData ? (
              <ReactECharts option={growthOption} style={{ height: 280 }} />
            ) : (
              <div className="grid h-[250px] grid-cols-3 gap-4 mt-2">
                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground text-center">Net Earned Premium</p>
                  <p className="mt-2 text-xl font-bold text-blue-600">{fmtAbs(nep, unit)}</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground text-center">Lợi nhuận ròng</p>
                  <p className="mt-2 text-xl font-bold text-emerald-600">{fmtAbs(netProfit, unit)}</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground text-center">UW Margin</p>
                  <p className="mt-2 text-xl font-bold text-purple-600">{underwritingMargin != null ? pct(underwritingMargin * 100, 1) : "N/A"}</p>
                </div>
              </div>
            )}
          </ChartCard>

          <DataTable
            title="📋 Kết quả hoạt động kinh doanh"
            headers={trendIs.map(x => x.period.period)}
            rows={[
              { label: "Phí BH thuần (NEP)", bold: true, values: trendIs.map(x => { const r = x as unknown as Record<string, unknown>; return scaleByUnit(getNumber(r, ["netEarnedPremium", "nep"]) ?? x.revenue ?? 0, unit); }) },
              { label: "Bồi thường", indent: true, values: trendIs.map(x => { const r = x as unknown as Record<string, unknown>; return scaleByUnit(getNumber(r, ["claimsIncurred", "netClaimsIncurred"]) ?? x.costOfGoodsSold ?? 0, unit); }) },
              { label: "Chi phí quản lý", indent: true, values: trendIs.map(x => scaleByUnit(x.adminExpenses ?? 0, unit)) },
              { label: "LNTT (PBT)", bold: true, separator: true, values: trendIs.map(x => scaleByUnit(x.profitBeforeTax, unit)) },
              { label: "Thuế TNDN", indent: true, values: trendIs.map(x => scaleByUnit(x.incomeTax, unit)) },
              { label: "Lợi nhuận ròng", bold: true, values: trendIs.map(x => scaleByUnit(x.netProfit, unit)) },
            ]}
          />
        </div>
      )}

      {/* ══════════ TAB 5: LIQUIDITY ══════════ */}
      {screen === "liquidity" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-card p-3 shadow-sm" title="Số ngày TS lỏng có thể bù đắp dòng tiền bồi thường.">
              <p className="text-xs text-muted-foreground">Survival Horizon (Ngày)</p>
              <p className="text-xl font-bold mt-1">
                {claimsIncurred != null && claimsIncurred > 0
                  ? `${fmtNumber(liquidAssets / (claimsIncurred / 365), 0)} ngày`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 shadow-sm" title="Tỷ lệ phụ thuộc TBH = Tái bảo hiểm phải thu / Tổng bồi thường.">
              <p className="text-xs text-muted-foreground">RI Dependency</p>
              <p className="text-xl font-bold mt-1">{reinsuranceDependency != null ? pct(reinsuranceDependency * 100, 2) : "N/A"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 shadow-sm" title="Tỷ lệ phải trả TBH quá hạn / Phải thu TBH.">
              <p className="text-xs text-muted-foreground">RI Overdue Ratio</p>
              <p className="text-xl font-bold mt-1">{reinsuranceOverdueRatio != null ? pct(reinsuranceOverdueRatio * 100, 2) : "N/A"}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <SectionHeader title="Stress Test Formula" subtitle={`Kịch bản: ${scenario.toUpperCase()}`} />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 text-sm">
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Tài sản lỏng</p>
                <p className="font-bold text-base mt-1">{fmtAbs(liquidAssets, unit)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Outflow rate / ngày</p>
                <p className="font-bold text-base mt-1">{pct(outflowRate * 100, 1)}</p>
              </div>
              <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
                <p className="text-xs text-muted-foreground">Thặng dư (ngày 90)</p>
                <p className="font-bold text-base mt-1">{fmtAbs(liquidAssets - (cumulativeOutflow[89] ?? 0), unit)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader title="Mô phỏng dòng tiền thảm họa (90 ngày)" subtitle="Tài sản lỏng so với dòng tiền tích lũy theo kịch bản" />
              <select
                className="rounded-md border border-border px-2 py-1 text-sm bg-card"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as "baseline" | "adverse" | "severe")}
              >
                <option value="baseline">Baseline</option>
                <option value="adverse">Adverse</option>
                <option value="severe">Severe</option>
              </select>
            </div>
            {hasStressData ? (
              <ReactECharts option={stressOption} style={{ height: 300 }} />
            ) : (
              <div className="grid h-[280px] grid-cols-3 gap-4 mt-4">
                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground text-center">Survival Horizon</p>
                  <p className="mt-2 text-3xl font-black text-blue-600">
                    {claimsIncurred != null && claimsIncurred > 0 ? `${fmtNumber(liquidAssets / (claimsIncurred / 365), 0)}d` : "N/A"}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground text-center">RI Dependency</p>
                  <p className="mt-2 text-3xl font-black text-rose-600">
                    {reinsuranceDependency != null ? pct(reinsuranceDependency * 100, 1) : "N/A"}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground text-center">RI Overdue Ratio</p>
                  <p className="mt-2 text-3xl font-black text-amber-600">
                    {reinsuranceOverdueRatio != null ? pct(reinsuranceOverdueRatio * 100, 1) : "Không có dữ liệu"}
                  </p>
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {breachDay >= 0
                ? `⚠️ Tài sản lỏng bị vượt quá sau ngày thứ ${daySeries[breachDay]} theo kịch bản ${scenario.toUpperCase()}.`
                : "✅ Tài sản lỏng đủ bù đắp trong 90 ngày theo kịch bản hiện tại."}
            </p>
          </div>

          <DataTable
            title="📋 Dữ liệu dòng tiền"
            headers={cashFlowRows.slice(0, 5).map(x => x.period.period)}
            rows={[
              { label: "CF từ HĐKD", bold: true, values: cashFlowRows.slice(0, 5).map(x => scaleByUnit(x.operatingCashFlow, unit)) },
              { label: "CF từ HĐTC", values: cashFlowRows.slice(0, 5).map(x => scaleByUnit(x.financingCashFlow, unit)) },
              { label: "CF từ HĐĐT", values: cashFlowRows.slice(0, 5).map(x => scaleByUnit(x.investingCashFlow, unit)) },
              { label: "Thay đổi tiền thuần", bold: true, separator: true, values: cashFlowRows.slice(0, 5).map(x => scaleByUnit(x.netCashChange, unit)) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
