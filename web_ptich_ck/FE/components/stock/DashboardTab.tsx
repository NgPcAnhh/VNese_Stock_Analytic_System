"use client";

import React, { useMemo, useState, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import {
    useFinancialRatios,
    useFinancialReports,
    useQuantAnalysis,
    useValuation,
    type FinancialRatioItem,
} from "@/hooks/useStockData";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const fmtNum = (v: number | null | undefined, decimals = 1): string => {
    if (v == null || isNaN(v)) return "—";
    if (Math.abs(v) >= 1_000_000_000_000)
        return `${(v / 1_000_000_000_000).toFixed(1)}N`;
    if (Math.abs(v) >= 1_000_000_000)
        return `${(v / 1_000_000_000).toFixed(1)}T`;
    if (Math.abs(v) >= 1_000_000)
        return `${(v / 1_000_000).toFixed(0)}M`;
    return v.toFixed(decimals);
};

const fmtPct = (v: number | null | undefined): string => {
    if (v == null || isNaN(v)) return "—";
    return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
};

const fmtPctNosign = (v: number | null | undefined): string => {
    if (v == null || isNaN(v)) return "—";
    return `${v.toFixed(1)}%`;
};

function trendIcon(current: number | null | undefined, previous: number | null | undefined) {
    if (current == null || previous == null) return null;
    if (current > previous * 1.02)
        return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (current < previous * 0.98)
        return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
}

// Lấy period label: Q1/2025 → chỉ giữ "Q1/25"
const shortPeriod = (p: string) => p.replace("/20", "/");

type ReportData = ReturnType<typeof useFinancialReports>["data"];

const parseMetricNumber = (raw: string | null | undefined): number | null => {
    if (!raw) return null;
    const cleaned = raw.replace(/[^0-9+\-.,]/g, "").replace(/,/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRoeRoaPercent = (value: number | null | undefined): number | null => {
    if (value == null || !Number.isFinite(value)) return null;
    // API may return decimal (0.12) or percentage point (12)
    return Math.abs(value) <= 1 ? value * 100 : value;
};

const safeRatio = (numerator: number | null | undefined, denominator: number | null | undefined): number | null => {
    if (numerator == null || denominator == null || denominator === 0) return null;
    return numerator / denominator;
};

const getOperatingProfit = (
    income: NonNullable<ReportData>["incomeStatement"][number] | null | undefined,
): number | null => {
    if (!income) return null;
    if (income.operatingProfit != null) return income.operatingProfit;
    if (income.grossProfit == null || income.sellingExpenses == null || income.adminExpenses == null) return null;
    return income.grossProfit - income.sellingExpenses - income.adminExpenses;
};

const getRevenueBase = (
    income: NonNullable<ReportData>["incomeStatement"][number] | null | undefined,
    isBank: boolean,
): number | null => {
    if (!income) return null;
    if (income.revenue && income.revenue !== 0) return income.revenue;
    if (isBank) return income.interestIncome ?? income.netInterestIncome ?? income.financialIncome ?? null;
    return income.financialIncome ?? null;
};

const getInterestExpense = (
    income: NonNullable<ReportData>["incomeStatement"][number] | null | undefined,
    isBank: boolean,
): number | null => {
    if (!income) return null;
    if (isBank) return income.interestExpenseBank ?? income.interestExpenses ?? null;
    return income.interestExpenses ?? income.interestExpenseBank ?? null;
};

const findReportIncome = (reportData: ReportData, year: number, quarter: number) => {
    if (!reportData) return null;
    return reportData.incomeStatement.find((x) => x.period.year === year && x.period.quarter === quarter) ?? null;
};

// ── Section Heading ───────────────────────────────────────────────
function SectionHead({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <span className="text-base leading-none">{icon}</span>
            <div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
            </div>
        </div>
    );
}

// ── Card Wrapper ──────────────────────────────────────────────────
function Card({
    children,
    className = "",
    noPad = false,
}: {
    children: React.ReactNode;
    className?: string;
    noPad?: boolean;
}) {
    return (
        <div
            className={`bg-card rounded-xl border border-border/50 shadow-sm ${noPad ? "" : "p-4"} ${className}`}
        >
            {children}
        </div>
    );
}

// ── Skeleton pulse ────────────────────────────────────────────────
function Skel({ h = "h-4", w = "w-full" }: { h?: string; w?: string }) {
    return <div className={`animate-pulse bg-muted rounded ${h} ${w}`} />;
}

// ══════════════════════════════════════════════════════════════════
//  1. KPI STRIP
// ══════════════════════════════════════════════════════════════════
interface KpiCardProps {
    label: string;
    value: string;
    sub?: string;
    color?: string;
    trend?: React.ReactNode;
    badge?: { text: string; color: string };
}
function KpiCard({ label, value, sub, color = "text-foreground", trend, badge }: KpiCardProps) {
    return (
        <div className="bg-card rounded-xl border border-border/50 shadow-sm px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                {label}
                {badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${badge.color}`}>
                        {badge.text}
                    </span>
                )}
            </span>
            <div className="flex items-end gap-1.5">
                <span className={`text-xl font-extrabold font-mono leading-tight ${color}`}>{value}</span>
                {trend}
            </div>
            {sub && <span className="text-[10px] text-muted-foreground font-mono">{sub}</span>}
        </div>
    );
}

function KpiStrip({ ratios, reportData }: { ratios: FinancialRatioItem[] | null; reportData: ReportData }) {
    const { stockInfo } = useStockDetail();
    const m = stockInfo.metrics;

    // Latest ratio period
    const latest = ratios?.[0] ?? null;
    const prev = ratios?.[1] ?? null;

    let fallbackNetMargin: number | null = null;
    let fallbackGrossMargin: number | null = null;
    let fallbackPrevNetMargin: number | null = null;
    let fallbackPrevGrossMargin: number | null = null;

    if (reportData && reportData.incomeStatement.length > 0) {
        const is0 = reportData.incomeStatement[0];
        const revenueBase = getRevenueBase(is0, reportData.isBank);
        if (revenueBase && revenueBase > 0) {
            const net = safeRatio(is0.netProfit, revenueBase);
            const gross = safeRatio(is0.grossProfit, revenueBase);
            fallbackNetMargin = net != null ? net * 100 : null;
            fallbackGrossMargin = gross != null ? gross * 100 : null;
        }
    }
    if (reportData && reportData.incomeStatement.length > 1) {
        const is1 = reportData.incomeStatement[1];
        const revenueBase = getRevenueBase(is1, reportData.isBank);
        if (revenueBase && revenueBase > 0) {
            const net = safeRatio(is1.netProfit, revenueBase);
            const gross = safeRatio(is1.grossProfit, revenueBase);
            fallbackPrevNetMargin = net != null ? net * 100 : null;
            fallbackPrevGrossMargin = gross != null ? gross * 100 : null;
        }
    }

    const nmLatest = latest?.netMargin ?? fallbackNetMargin;
    const gmLatest = latest?.grossMargin ?? fallbackGrossMargin;
    const nmPrev = prev?.netMargin ?? fallbackPrevNetMargin;
    const gmPrev = prev?.grossMargin ?? fallbackPrevGrossMargin;

    const latestRoe = normalizeRoeRoaPercent(latest?.roe);
    const prevRoe = normalizeRoeRoaPercent(prev?.roe);
    const overviewRoe = parseMetricNumber(m.roe);

    const cards: KpiCardProps[] = [
        {
            label: "Vốn hóa (tỷ VND)",
            value: m.marketCap ? m.marketCap.replace(/tỷ|Tỷ/g, "").trim() : "—",
            // sub: m.marketCap?.toLowerCase().includes("tỷ") ? " " : undefined,
            color: "text-blue-700",
        },
        {
            label: "P/E",
            value: m.pe || "—",
            trend: trendIcon(latest?.pe, prev?.pe),
        },
        {
            label: "P/B",
            value: m.pb || "—",
            trend: trendIcon(latest?.pb, prev?.pb),
        },
        {
            label: "EPS",
            value: m.eps || "—",
            trend: trendIcon(latest?.eps, prev?.eps),
        },
        {
            label: "ROE",
            value: latestRoe != null ? fmtPctNosign(latestRoe) : overviewRoe != null ? fmtPctNosign(overviewRoe) : m.roe || "—",
            color:
                (latestRoe ?? 0) > 15
                    ? "text-green-600"
                    : (latestRoe ?? 0) > 8
                        ? "text-amber-600"
                        : "text-red-500",
            trend: trendIcon(latestRoe, prevRoe),
        },
        {
            label: "Biên LN ròng",
            value: nmLatest != null ? fmtPctNosign(nmLatest) : "—",
            color: (nmLatest ?? 0) > 10 ? "text-green-600" : "text-muted-foreground",
            trend: trendIcon(nmLatest, nmPrev),
        },
        {
            label: "Biên gộp",
            value: gmLatest != null ? fmtPctNosign(gmLatest) : "—",
            color: (gmLatest ?? 0) > 30 ? "text-green-600" : "text-muted-foreground",
            trend: trendIcon(gmLatest, gmPrev),
        },
    ];

    const cleanCards = cards;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
            {cleanCards.slice(0, 7).map((c) => (
                <KpiCard key={c.label} {...c} />
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  2. REVENUE & PROFIT TREND
// ══════════════════════════════════════════════════════════════════
function RevenueProfitChart({ reportData }: { reportData: ReturnType<typeof useFinancialReports>["data"] }) {
    const option = useMemo(() => {
        if (!reportData || reportData.incomeStatement.length < 2) return null;

        // Filter for Quarterly data only
        const sorted = [...reportData.incomeStatement].reverse().slice(-8); // Get up to last 8 quarters
        const periods = sorted.map((d) => shortPeriod(d.period.period)); // e.g., "Q1/24"
        const revenues = sorted.map((d) => +(d.revenue / 1e9).toFixed(1));
        const profits = sorted.map((d) => +(d.netProfit / 1e9).toFixed(1));

        return {
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: { seriesName: string; value: number; axisValue: string }[]) => {
                    const lines = params.map(
                        (p) =>
                            `<span style="color:${p.seriesName === "Doanh thu" ? "#60a5fa" : "#34d399"}">${p.seriesName}</span>: <b>${typeof p.value === "number" ? fmtNum(p.value, 1) + " tỷ" : "—"}</b>`
                    );
                    return `<b>${params[0]?.axisValue}</b><br/>${lines.join("<br/>")}`;
                },
            },
            legend: {
                top: 0,
                right: 0,
                textStyle: { fontSize: 11, color: "#64748b", fontFamily: "Inter,sans-serif" },
                icon: "roundRect",
                itemWidth: 12,
                itemHeight: 6,
            },
            grid: { top: 46, bottom: 24, left: 60, right: 20 },
            xAxis: {
                type: "category" as const,
                data: periods,
                axisLabel: { fontSize: 12, color: "#94a3b8", fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
                axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                name: "Tỷ VND",
                nameTextStyle: { fontSize: 11, color: "#94a3b8" },
                axisLabel: {
                    fontSize: 12,
                    color: "#94a3b8",
                    fontFamily: "Roboto Mono,monospace",
                    formatter: (v: number) => fmtNum(v, 0),
                },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                {
                    name: "Doanh thu",
                    type: "bar" as const,
                    data: revenues,
                    barMaxWidth: 28,
                    itemStyle: { color: "#3b82f6", borderRadius: [3, 3, 0, 0] },
                },
                {
                    name: "LNST",
                    type: "bar" as const,
                    data: profits,
                    barMaxWidth: 28,
                    itemStyle: {
                        borderRadius: [3, 3, 0, 0],
                        color: (p: { value: number }) => (p.value >= 0 ? "#10b981" : "#ef4444"),
                    },
                },
            ],
        };
    }, [reportData]);

    if (!option)
        return (
            <div className="flex flex-col gap-2 py-4">
                <Skel h="h-4" w="w-1/2" />
                <Skel h="h-32" />
            </div>
        );

    return <ReactECharts option={option} style={{ height: "100%", minHeight: 240 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  3. RATIO TRENDS  (ROE / Net Margin / Gross Margin over time)
// ══════════════════════════════════════════════════════════════════
function RatioTrendChart({ ratios, reportData }: { ratios: FinancialRatioItem[] | null; reportData: ReportData }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 2) return null;
        const sorted = [...ratios].reverse().slice(-8);
        const periods = sorted.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`));
        const roe = sorted.map((d) => {
            const value = normalizeRoeRoaPercent(d.roe);
            return value != null ? +value.toFixed(1) : null;
        });
        const roa = sorted.map((d) => {
            const value = normalizeRoeRoaPercent(d.roa);
            return value != null ? +value.toFixed(1) : null;
        });

        const netMargin = sorted.map((d) => {
            if (d.netMargin != null) return +d.netMargin.toFixed(1);
            const rep = findReportIncome(reportData, d.year, d.quarter);
            const revenueBase = getRevenueBase(rep, !!reportData?.isBank);
            const fallback = safeRatio(rep?.netProfit ?? null, revenueBase);
            if (fallback != null) return +(fallback * 100).toFixed(1);
            return null;
        });

        const grossMargin = sorted.map((d) => {
            if (d.grossMargin != null) return +d.grossMargin.toFixed(1);
            const rep = findReportIncome(reportData, d.year, d.quarter);
            const revenueBase = getRevenueBase(rep, !!reportData?.isBank);
            const fallback = safeRatio(rep?.grossProfit ?? null, revenueBase);
            if (fallback != null) return +(fallback * 100).toFixed(1);
            return null;
        });

        const makeSeries = (name: string, data: (number | null)[], color: string) => ({
            name,
            type: "line" as const,
            data,
            symbol: "circle",
            symbolSize: 5,
            lineStyle: { color, width: 2 },
            itemStyle: { color },
            connectNulls: true,
        });

        return {
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: { seriesName: string; value: number; axisValue: string }[]) =>
                    (params[0]?.axisValue ?? "") +
                    "<br/>" +
                    params.map((p) => `${p.seriesName}: <b>${p.value != null ? fmtPctNosign(p.value) : "—"}</b>`).join("<br/>"),
            },
            legend: {
                bottom: 0,
                left: "center",
                textStyle: { fontSize: 10, color: "#64748b", fontFamily: "Inter,sans-serif" },
                icon: "roundRect",
                itemWidth: 10,
                itemHeight: 5,
            },
            grid: { top: 12, bottom: 40, left: 42, right: 10 },
            xAxis: {
                type: "category" as const,
                data: periods,
                axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Inter,sans-serif", rotate: 30 },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
                axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: {
                    fontSize: 9,
                    color: "#94a3b8",
                    formatter: (v: number) => v.toFixed(0) + "%",
                },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                makeSeries("ROE", roe, "#f97316"),
                makeSeries("ROA", roa, "#3b82f6"),
                makeSeries("Biên LN ròng", netMargin, "#10b981"),
                makeSeries("Biên gộp", grossMargin, "#8b5cf6"),
            ],
        };
    }, [ratios, reportData]);

    if (!option)
        return (
            <div className="flex flex-col gap-2 py-4">
                <Skel h="h-32" />
            </div>
        );

    return <ReactECharts option={option} style={{ height: 220 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  4. QUANT RISK SNAPSHOT
// ══════════════════════════════════════════════════════════════════
function QuantSnapshot({ quantData }: { quantData: ReturnType<typeof useQuantAnalysis>["data"] }) {
    const kpis = quantData?.kpis ?? [];
    const wealthIndex = quantData?.wealthIndex ?? [];
    const varData = quantData?.varData ?? { var95: 0, var99: 0, cvar95: 0, distribution: [] };

    const kpiOrder = [
        { label: "Sharpe Ratio", aliases: ["Sharpe Ratio"] },
        { label: "Sortino Ratio", aliases: ["Sortino Ratio"] },
        { label: "Max Drawdown", aliases: ["Max Drawdown"] },
        { label: "Ann. Return", aliases: ["Ann. Return", "LN hàng năm"] },
        { label: "Ann. Volatility", aliases: ["Ann. Volatility", "Biến động (σ)"] },
        { label: "Total Return", aliases: ["Total Return", "Tổng lợi nhuận"] },
    ];
    const displayKpis = kpiOrder
        .map((item) => {
            const found = kpis.find((x) => item.aliases.includes(x.label));
            return found ? { ...found, label: item.label } : null;
        })
        .filter(Boolean) as Array<{ label: string; value: number; suffix: string }>;

    const kpiColor = (label: string, value: number) => {
        if (label === "Sharpe Ratio" || label === "Sortino Ratio")
            return value >= 1 ? "text-green-600" : value >= 0.5 ? "text-amber-600" : "text-red-500";
        if (label === "Max Drawdown")
            return value > -15 ? "text-green-600" : value > -30 ? "text-amber-600" : "text-red-500";
        if (label === "Ann. Return")
            return value > 0 ? "text-green-600" : "text-red-500";
        return "text-foreground";
    };

    // Wealth index mini sparkline
    const wealthOption = useMemo(() => {
        if (!wealthIndex || wealthIndex.length < 5) return null;
        const vals = wealthIndex.slice(-60).map((d) => d.value);
        const lastVal = vals[vals.length - 1] ?? 1;
        const color = lastVal >= 1 ? "#10b981" : "#ef4444";
        return {
            grid: { top: 4, bottom: 4, left: 4, right: 4 },
            xAxis: { type: "category" as const, show: false },
            yAxis: { type: "value" as const, show: false },
            series: [{
                type: "line" as const,
                data: vals,
                symbol: "none",
                smooth: true,
                lineStyle: { color, width: 2 },
                areaStyle: { color: `${color}22` },
            }],
        };
    }, [wealthIndex]);

    const lastWealth = wealthIndex?.[wealthIndex.length - 1]?.value ?? 1;
    const totalReturn = (lastWealth - 1) * 100;

    if (!quantData) return <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Đang tải phân tích định lượng…</div>;

    return (
        <div className="space-y-3">
            {/* KPI chips */}
            <div className="grid grid-cols-3 gap-2">
                {displayKpis.map((k) => (
                    <div key={k.label} className="bg-muted/50 rounded-lg border border-border/50 p-2.5">
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{k.label}</div>
                        <div className={`text-base font-extrabold font-mono mt-0.5 ${kpiColor(k.label, k.value)}`}>
                            {k.value}{k.suffix}
                        </div>
                    </div>
                ))}
            </div>

            {/* VaR row */}
            <div className="flex gap-2">
                {[
                    { label: "VaR 95%", value: `${varData.var95}%`, color: "text-amber-600" },
                    { label: "VaR 99%", value: `${varData.var99}%`, color: "text-red-500" },
                    { label: "CVaR 95%", value: `${varData.cvar95}%`, color: "text-red-600" },
                ].map((it) => (
                    <div key={it.label} className="flex-1 bg-muted/50 rounded-lg border border-border/50 p-2">
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase">{it.label}</div>
                        <div className={`text-sm font-bold font-mono ${it.color}`}>{it.value}</div>
                    </div>
                ))}
            </div>

            {/* Wealth mini sparkline */}
            {wealthOption && (
                <div className="bg-muted/50 rounded-lg border border-border/50 p-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Lợi nhuận tích lũy</span>
                        <span className={`text-xs font-bold font-mono ${totalReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmtPct(totalReturn)}
                        </span>
                    </div>
                    <ReactECharts option={wealthOption} style={{ height: 52 }} />
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  5. VALUATION DASHBOARD (full multi-layer)
// ══════════════════════════════════════════════════════════════════

/* ── helpers ── */
const fmtVND = (v: number) => v.toLocaleString("vi-VN");

function UpsideBadge({ upside }: { upside: number }) {
    const isUnder = upside > 5;
    const isOver = upside < -5;
    const cls = isUnder
        ? "bg-green-100 text-green-700 border-green-300"
        : isOver
        ? "bg-red-100 text-red-700 border-red-300"
        : "bg-yellow-100 text-yellow-700 border-yellow-300";
    const label = isUnder ? "Rẻ" : isOver ? "Đắt" : "Theo dõi";
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
            {label} · {upside > 0 ? "+" : ""}{upside.toFixed(1)}%
        </span>
    );
}

/* ── A. Executive Summary ── */
function ValuationExecSummary({
    valuationData,
    appliedWeights,
    onApplyWeights,
    onResetWeights,
}: {
    valuationData: NonNullable<ReturnType<typeof useValuation>["data"]>;
    appliedWeights: { method: string; weight: number }[];
    onApplyWeights: (w: { method: string; weight: number }[]) => void;
    onResetWeights: () => void;
}) {
    const { summary } = valuationData;
    const upside = summary.upside;
    const verdictColor = upside > 5 ? "#00C076" : upside < -5 ? "#EF4444" : "#FBBF24";

    const [sliderWeights, setSliderWeights] = React.useState(appliedWeights);

    React.useEffect(() => {
        setSliderWeights(appliedWeights);
    }, [appliedWeights]);

    /* Weighted intrinsic from user-adjusted weights (APPLIED) */
    const totalW = appliedWeights.reduce((s, w) => s + w.weight, 0);
    const weightedIV = useMemo(() => {
        if (!appliedWeights.length || !totalW) return summary.intrinsicValue;
        const methodMap = Object.fromEntries(summary.methods.map((m) => [m.method, m.value]));
        const sum = appliedWeights.reduce((s, w) => s + (methodMap[w.method] ?? 0) * w.weight, 0);
        return totalW ? sum / totalW : summary.intrinsicValue;
    }, [appliedWeights, summary, totalW]);

    const weightedUpside = summary.currentPrice
        ? ((weightedIV / summary.currentPrice - 1) * 100)
        : upside;

    const sliderTotalW = sliderWeights.reduce((s, w) => s + w.weight, 0);

    return (
        <div className="space-y-4">
            {/* Hero row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-xl border border-border/50 p-4 flex flex-col items-center justify-center gap-1 text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Giá hiện tại</span>
                    <span className="text-2xl font-extrabold font-mono text-foreground">{fmtVND(summary.currentPrice)}</span>
                </div>
                <div className="rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-1 text-center"
                    style={{ borderColor: verdictColor, background: `${verdictColor}12` }}>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Giá trị Nội tại (Hợp nhất)</span>
                    <span className="text-2xl font-extrabold font-mono" style={{ color: verdictColor }}>{fmtVND(Math.round(weightedIV))}</span>
                    <UpsideBadge upside={weightedUpside} />
                </div>
                <div className="bg-muted/50 rounded-xl border border-border/50 p-3 flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Theo từng phương pháp</span>
                    <div className="space-y-1.5">
                        {summary.methods.filter((m) => m.value > 0).map((m) => {
                            const pct = summary.currentPrice
                                ? ((m.value / summary.currentPrice - 1) * 100)
                                : 0;
                            return (
                                <div key={m.method} className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{m.method}</span>
                                    <span className="text-xs font-mono font-bold text-foreground">{fmtVND(m.value)}</span>
                                    <span className={`text-[10px] font-bold font-mono ${pct >= 0 ? "text-green-600" : "text-red-500"}`}>
                                        {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Weight customizer */}
            {sliderWeights.length > 0 && (
                <div className="bg-muted/30 rounded-xl border border-border/50 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Bảng trọng số định giá (tùy chỉnh) — Tổng: <span className={sliderTotalW !== 100 ? "text-red-500" : ""}>{sliderTotalW}%</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onResetWeights}
                                className="px-3 py-1.5 height-8 flex items-center justify-center text-[10px] font-bold rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => onApplyWeights(sliderWeights)}
                                className="px-3 py-1.5 height-8 flex items-center justify-center text-[10px] font-bold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                Áp dụng
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                        {sliderWeights.map((w) => (
                            <div key={w.method} className="flex flex-col items-center gap-1 min-w-[80px]">
                                <span className="text-[10px] text-muted-foreground text-center leading-tight">{w.method}</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={w.weight}
                                    onChange={(e) => setSliderWeights((prev) => prev.map((x) => x.method === w.method ? { ...x, weight: Number(e.target.value) } : x))}
                                    className="w-full accent-primary h-1.5 cursor-pointer"
                                />
                                <span className="text-[10px] font-bold font-mono text-primary">{w.weight}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── B. Football Field Chart ── */
function ValuationFootballField({
    footballField,
    currentPrice,
}: {
    footballField: NonNullable<ReturnType<typeof useValuation>["data"]>["footballField"];
    currentPrice: number;
}) {
    const option = useMemo(() => {
        if (!footballField || footballField.length < 2) return null;
        const methods = footballField.map((d) => d.method);
        const allValues = footballField.flatMap((d) => [d.low, d.high]).filter((v) => v > 0);
        if (allValues.length < 2) return null;
        const minVal = Math.min(...allValues, currentPrice) * 0.9;
        const maxVal = Math.max(...allValues, currentPrice) * 1.08;
        const colors = ["#3B82F6", "#00C076", "#8B5CF6", "#F97316", "#EF4444", "#64748B", "#06B6D4"];

        return {
            tooltip: {
                trigger: "axis" as const,
                axisPointer: { type: "shadow" as const },
                formatter: (params: { name: string }[]) => {
                    const idx = methods.indexOf(params[0]?.name ?? "");
                    if (idx < 0) return "";
                    const row = footballField[idx];
                    return `<b>${row.method}</b><br/>Thấp: <b>${fmtVND(row.low)}</b><br/>TB: <b>${fmtVND(row.mid)}</b><br/>Cao: <b>${fmtVND(row.high)}</b>`;
                },
            },
            grid: { top: 20, left: 130, right: 50, bottom: 30 },
            xAxis: {
                type: "value" as const,
                min: minVal,
                max: maxVal,
                axisLabel: { formatter: (v: number) => fmtVND(v), fontSize: 10, color: "#94a3b8" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            yAxis: {
                type: "category" as const,
                data: methods,
                inverse: true,
                axisLabel: { fontSize: 11, fontWeight: 600, color: "#374151" },
            },
            series: [
                {
                    name: "_gap",
                    type: "bar",
                    stack: "range",
                    data: footballField.map((d) => Math.max(0, d.low - minVal)),
                    itemStyle: { color: "transparent" },
                    barWidth: 20,
                    silent: true,
                },
                {
                    name: "Vùng định giá",
                    type: "bar",
                    stack: "range",
                    data: footballField.map((d, i) => ({
                        value: Math.max(0, d.high - d.low),
                        itemStyle: { color: colors[i % colors.length], borderRadius: [4, 4, 4, 4], opacity: 0.75 },
                    })),
                    barWidth: 20,
                },
                {
                    name: "Trung vị",
                    type: "scatter",
                    data: footballField.map((d, i) => [d.mid, i]),
                    symbol: "diamond",
                    symbolSize: 14,
                    itemStyle: { color: "#1F2937", borderColor: "#fff", borderWidth: 2 },
                    z: 10,
                },
                {
                    name: "Giá hiện tại",
                    type: "line",
                    data: [],
                    markLine: {
                        silent: true,
                        symbol: "none",
                        lineStyle: { color: "#F97316", width: 2.5, type: "dashed" as const },
                        data: [{ xAxis: currentPrice }],
                        label: {
                            formatter: `Giá: ${fmtVND(currentPrice)}`,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#F97316",
                            position: "end" as const,
                        },
                    },
                    lineStyle: { width: 0 },
                    symbol: "none",
                    silent: true,
                },
            ],
        };
    }, [footballField, currentPrice]);

    if (!option) return null;

    return (
        <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Football Field — biên định giá tất cả phương pháp (đường cam = Giá hiện tại)
            </p>
            <ReactECharts option={option} style={{ height: Math.max(220, footballField.length * 40 + 60) }} />
        </div>
    );
}

/* ── C. DCF Section ── */
function ValuationDCF({
    dcf,
    currentPrice,
}: {
    dcf: NonNullable<ReturnType<typeof useValuation>["data"]>["dcf"];
    currentPrice: number;
}) {
    const [wacc, setWacc] = React.useState(dcf.wacc);
    const [g, setG] = React.useState(dcf.terminalGrowth);

    /* Live DCF estimate when sliders change */
    const liveValue = useMemo(() => {
        if (!dcf.projections.length) return dcf.intrinsicValue;
        // Sum PV of FCF projections (simplified: fixed projections, adjust terminal)
        const terminalFCF = dcf.projections[dcf.projections.length - 1]?.fcf ?? 0;
        const nYears = dcf.projections.length;
        const tVal = terminalFCF * (1 + g) / Math.max(wacc - g, 0.001);
        const tPV = tVal / Math.pow(1 + wacc, nYears);
        const pvSum = dcf.projections.reduce((s, p, i) => s + p.fcf / Math.pow(1 + wacc, i + 1), 0);
        return Math.round(pvSum + tPV);
    }, [wacc, g, dcf]);

    const negativeFcfYears = dcf.negativeFcfYears ?? 0;
    const showWarning = negativeFcfYears >= 3;

    return (
        <div className="space-y-3">
            {/* Warning if persistent negative FCF */}
            {showWarning && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <span className="text-base mt-0.5">🚨</span>
                    <p className="text-xs text-red-700">
                        <b>Cảnh báo:</b> FCF âm trong {negativeFcfYears}/5 năm gần nhất. Kết quả DCF có thể không đáng tin cậy — cân nhắc chuyển sang phương pháp định giá tài sản (RNAV, P/B).
                    </p>
                </div>
            )}

            {/* Slider controls */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl border border-border/50 p-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">WACC</span>
                        <span className="text-xs font-bold font-mono text-primary">{(wacc * 100).toFixed(1)}%</span>
                    </div>
                    <input
                        type="range"
                        min={6}
                        max={20}
                        step={0.5}
                        value={wacc * 100}
                        onChange={(e) => setWacc(Number(e.target.value) / 100)}
                        className="w-full accent-primary h-1.5"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                        <span>6%</span><span>20%</span>
                    </div>
                </div>
                <div className="bg-muted/50 rounded-xl border border-border/50 p-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Terminal Growth (g)</span>
                        <span className="text-xs font-bold font-mono text-primary">{(g * 100).toFixed(1)}%</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={6}
                        step={0.5}
                        value={g * 100}
                        onChange={(e) => setG(Number(e.target.value) / 100)}
                        className="w-full accent-primary h-1.5"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                        <span>0%</span><span>6%</span>
                    </div>
                </div>
            </div>

            {/* Live value pill */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                    <span className="text-[10px] text-blue-600 font-semibold uppercase">Fair Value (DCF live)</span>
                    <span className={`text-base font-extrabold font-mono ${liveValue >= currentPrice ? "text-green-600" : "text-red-500"}`}>
                        {fmtVND(liveValue)}
                    </span>
                    <UpsideBadge upside={(liveValue / currentPrice - 1) * 100} />
                </div>
            </div>

            {/* FCF projections table */}
            {dcf.projections.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr className="bg-muted text-muted-foreground uppercase tracking-wider">
                                <th className="text-left px-3 py-2 font-semibold">Năm</th>
                                <th className="text-right px-3 py-2 font-semibold">FCF (tỷ)</th>
                                <th className="text-right px-3 py-2 font-semibold">PV (tỷ)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dcf.projections.map((p) => (
                                <tr key={p.year} className="border-b border-border/50">
                                    <td className="px-3 py-2 font-medium">Y{p.year}</td>
                                    <td className={`text-right px-3 py-2 font-mono ${p.fcf < 0 ? "text-red-500" : "text-foreground"}`}>
                                        {p.fcf < 0 ? "(" + fmtVND(Math.abs(p.fcf)) + ")" : fmtVND(p.fcf)}
                                    </td>
                                    <td className="text-right px-3 py-2 font-mono text-muted-foreground">{p.pv > 0 ? fmtVND(p.pv) : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sensitivity Matrix */}
            {dcf.sensitivityMatrix.length > 0 && (
                <div>
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase">Bảng nhạy cảm — WACC × g</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="bg-muted">
                                    <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">WACC \ g</th>
                                    {[2, 2.5, 3, 3.5, 4].map((gv) => (
                                        <th key={gv} className="px-2 py-1.5 text-right text-muted-foreground font-semibold">{gv}%</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[10, 11, 12, 13, 14].map((wv, wi) => {
                                    const isActive = Math.abs(wv / 100 - dcf.wacc) < 0.006;
                                    return (
                                        <tr key={wv} className={`border-b border-border/50 ${isActive ? "bg-orange-50 font-bold" : ""}`}>
                                            <td className="px-2 py-1.5 font-semibold text-muted-foreground">{wv}%</td>
                                            {(dcf.sensitivityMatrix[wi] ?? []).map((val, gi) => (
                                                <td
                                                    key={gi}
                                                    className={`text-right px-2 py-1.5 font-mono text-xs ${
                                                        val > 0
                                                            ? val > currentPrice
                                                                ? "text-green-700 font-semibold"
                                                                : "text-red-600"
                                                            : "text-muted-foreground/50"
                                                    }`}
                                                >
                                                    {val > 0 ? fmtVND(val) : "—"}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── D. RNAV Section ── */
function ValuationRNAV({ rnav, currentPrice }: {
    rnav: NonNullable<NonNullable<ReturnType<typeof useValuation>["data"]>["rnav"]>;
    currentPrice: number;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <span className="text-base">🏗️</span>
                <p className="text-xs text-amber-800">
                    <b>RNAV</b> — Tính lại giá trị thị trường của quỹ đất và dự án đang triển khai. Đặc biệt quan trọng cho cổ phiếu BĐS/hạ tầng.
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                    { label: "Giá trị Quỹ đất", value: rnav.landBankValue },
                    { label: "Giá trị Dự án", value: rnav.projectsValue },
                    { label: "NAV điều chỉnh", value: rnav.adjustedNAV },
                    { label: "Chiết khấu RNAV", value: rnav.discount * 100, suffix: "%", isSuffix: true },
                    { label: "Fair Value (RNAV)", value: rnav.intrinsicValue, highlight: true },
                ].map((item) => (
                    <div
                        key={item.label}
                        className={`rounded-xl border px-3 py-2.5 text-center ${
                            item.highlight
                                ? rnav.intrinsicValue >= currentPrice
                                    ? "border-green-300 bg-green-50"
                                    : "border-red-300 bg-red-50"
                                : "border-border/50 bg-muted/50"
                        }`}
                    >
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">{item.label}</p>
                        <p className={`text-sm font-bold font-mono ${
                            item.highlight
                                ? rnav.intrinsicValue >= currentPrice ? "text-green-700" : "text-red-600"
                                : "text-foreground"
                        }`}>
                            {item.isSuffix ? `${item.value.toFixed(1)}%` : fmtVND(Math.round(item.value))}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── E. DDM Section (conditional: only when yield > 3%) ── */
function ValuationDDM({ ddm, currentPrice }: {
    ddm: NonNullable<ReturnType<typeof useValuation>["data"]>["ddm"];
    currentPrice: number;
}) {
    const divYield = ddm.dividendYield ?? (ddm.dividendPerShare > 0 && currentPrice > 0 ? ddm.dividendPerShare / currentPrice : 0);
    if (divYield < 0.03 && ddm.intrinsicValue <= 0) return (
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl border border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
            <span>💡</span>
            DDM không hiển thị vì tỷ suất cổ tức &lt; 3% (hiện tại: {(divYield * 100).toFixed(1)}%)
        </div>
    );

    return (
        <div className="space-y-3">
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <span className="text-base">💎</span>
                <p className="text-xs text-green-800">
                    DDM Gordon Growth — Tỷ suất cổ tức: <b>{(divYield * 100).toFixed(1)}%</b>. Mô hình phù hợp cho cổ phiếu chi trả cổ tức đều đặn.
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "DPS hiện tại", value: `${fmtVND(ddm.dividendPerShare)} đ` },
                    { label: "Ke (Required Return)", value: `${(ddm.costOfEquity * 100).toFixed(1)}%` },
                    { label: "Growth (g)", value: `${(ddm.growthRate * 100).toFixed(1)}%` },
                    { label: "Fair Value (DDM)", value: `${fmtVND(ddm.intrinsicValue)} đ`, color: ddm.intrinsicValue >= currentPrice ? "text-green-700" : "text-red-600" },
                ].map((item) => (
                    <div key={item.label} className="bg-muted/50 rounded-xl border border-border/50 px-3 py-2.5 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">{item.label}</p>
                        <p className={`text-sm font-bold font-mono mt-0.5 ${item.color ?? "text-foreground"}`}>{item.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── F. P/E & P/B Bands ── */
function ValuationMultipleBands({
    peBand,
    pbBand,
}: {
    peBand: NonNullable<ReturnType<typeof useValuation>["data"]>["peBand"];
    pbBand: NonNullable<ReturnType<typeof useValuation>["data"]>["pbBand"];
}) {
    const makeBandOption = (
        band: typeof peBand,
        label: string,
    ) => {
        if (!band.dates.length || !band.prices.length) return null;
        return {
            tooltip: { trigger: "axis" as const },
            legend: {
                top: 4,
                textStyle: { fontSize: 10 },
                data: ["Giá thực tế", `${label} +2SD`, `${label} +1SD`, `${label} TB`, `${label} -1SD`, `${label} -2SD`],
            },
            grid: { top: 46, left: 60, right: 20, bottom: 34 },
            xAxis: {
                type: "category" as const,
                data: band.dates,
                axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(band.dates.length / 6) },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: { formatter: (v: number) => fmtVND(v), fontSize: 9, color: "#94a3b8" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                { name: `${label} +2SD`, type: "line", data: band.sdBands?.sd2High ?? band.highBand, lineStyle: { width: 1, type: "dashed" as const, color: "#EF4444" }, itemStyle: { color: "#EF4444" }, symbol: "none" },
                { name: `${label} +1SD`, type: "line", data: band.sdBands?.sd1High ?? band.avgBand, lineStyle: { width: 1, type: "dashed" as const, color: "#F97316" }, itemStyle: { color: "#F97316" }, symbol: "none" },
                { name: `${label} TB`, type: "line", data: band.midBand, lineStyle: { width: 1.5, type: "dashed" as const, color: "#3B82F6" }, itemStyle: { color: "#3B82F6" }, symbol: "none" },
                { name: `${label} -1SD`, type: "line", data: band.sdBands?.sd1Low ?? band.avgBand, lineStyle: { width: 1, type: "dashed" as const, color: "#10B981" }, itemStyle: { color: "#10B981" }, symbol: "none" },
                { name: `${label} -2SD`, type: "line", data: band.sdBands?.sd2Low ?? band.lowBand, lineStyle: { width: 1, type: "dashed" as const, color: "#00C076" }, itemStyle: { color: "#00C076" }, symbol: "none" },
                { name: "Giá thực tế", type: "line", data: band.prices, lineStyle: { width: 2.5, color: "#F97316" }, itemStyle: { color: "#F97316" }, symbol: "none", z: 10 },
            ],
        };
    };

    const peOption = useMemo(() => makeBandOption(peBand, "P/E"), [peBand]);
    const pbOption = useMemo(() => makeBandOption(pbBand, "P/B"), [pbBand]);

    if (!peOption && !pbOption) return (
        <p className="text-center py-4 text-xs text-muted-foreground">Chưa đủ dữ liệu lịch sử P/E & P/B Bands</p>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {peOption && (
                <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">P/E Bands (5 năm)</p>
                    <ReactECharts option={peOption} style={{ height: 320 }} />
                </div>
            )}
            {pbOption && (
                <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">P/B Bands (5 năm)</p>
                    <ReactECharts option={pbOption} style={{ height: 320 }} />
                </div>
            )}
        </div>
    );
}

/* ── G. Peer Group with PEG ── */
function ValuationPeerGroup({
    peerValuation,
    currentTicker,
}: {
    peerValuation: NonNullable<ReturnType<typeof useValuation>["data"]>["peerValuation"];
    currentTicker: string;
}) {
    /* Filter "junk" peers: P/E < 0, P/E > 100, all-null */
    const cleaned = peerValuation.filter((p) => {
        if (p.pe !== null && (p.pe < 0 || p.pe > 100)) return false;
        if (p.pe === null && p.pb === null && p.roe === null) return false;
        return true;
    });

    if (cleaned.length === 0) return (
        <p className="text-center py-4 text-xs text-muted-foreground">Không có dữ liệu đối thủ cùng ngành</p>
    );

    const validPE = cleaned.filter((p) => p.pe != null && p.pe! > 0);
    const validPB = cleaned.filter((p) => p.pb != null && p.pb! > 0);
    const validROE = cleaned.filter((p) => p.roe != null);
    const avgPE = validPE.length ? validPE.reduce((s, p) => s + p.pe!, 0) / validPE.length : 0;
    const avgPB = validPB.length ? validPB.reduce((s, p) => s + p.pb!, 0) / validPB.length : 0;
    const avgROE = validROE.length ? validROE.reduce((s, p) => s + p.roe!, 0) / validROE.length : 0;

    return (
        <div>
            <div className="overflow-x-auto mb-3">
                <table className="w-full text-[11px]">
                    <thead>
                        <tr className="bg-muted text-muted-foreground uppercase tracking-wider">
                            <th className="text-left px-3 py-2 font-semibold">Ticker</th>
                            <th className="text-left px-2 py-2 font-semibold">Công ty</th>
                            <th className="text-right px-2 py-2 font-semibold">P/E</th>
                            <th className="text-right px-2 py-2 font-semibold">P/B</th>
                            <th className="text-right px-2 py-2 font-semibold">EV/EBITDA</th>
                            <th className="text-right px-2 py-2 font-semibold">ROE (%)</th>
                            <th className="text-right px-2 py-2 font-semibold">PEG</th>
                            <th className="text-right px-2 py-2 font-semibold">MCap (tỷ)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cleaned.map((p) => {
                            const isSelf = p.ticker === currentTicker;
                            const peg = p.peg ?? (p.pe != null && p.epsGrowth != null && p.epsGrowth > 0
                                ? p.pe / p.epsGrowth
                                : null);
                            return (
                                <tr
                                    key={p.ticker}
                                    className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${isSelf ? "bg-blue-50 font-semibold" : ""}`}
                                >
                                    <td className={`px-3 py-2 font-bold ${isSelf ? "text-blue-700" : "text-foreground"}`}>{p.ticker}</td>
                                    <td className="px-2 py-2 text-muted-foreground max-w-[160px] truncate">{p.companyName}</td>
                                    <td className={`text-right px-2 py-2 font-mono ${p.pe != null && avgPE > 0 && p.pe < avgPE ? "text-green-600 font-semibold" : "text-foreground"}`}>
                                        {p.pe != null ? p.pe.toFixed(1) : "—"}
                                    </td>
                                    <td className={`text-right px-2 py-2 font-mono ${p.pb != null && avgPB > 0 && p.pb < avgPB ? "text-green-600 font-semibold" : "text-foreground"}`}>
                                        {p.pb != null ? p.pb.toFixed(2) : "—"}
                                    </td>
                                    <td className="text-right px-2 py-2 font-mono">{p.evEbitda != null ? p.evEbitda.toFixed(1) : "—"}</td>
                                    <td className={`text-right px-2 py-2 font-mono ${p.roe != null && avgROE > 0 && p.roe > avgROE ? "text-green-600 font-semibold" : "text-foreground"}`}>
                                        {p.roe != null ? p.roe.toFixed(1) : "—"}
                                    </td>
                                    <td className={`text-right px-2 py-2 font-mono ${peg != null ? (peg < 1 ? "text-green-600 font-semibold" : peg < 2 ? "text-amber-600" : "text-red-500") : "text-muted-foreground"}`}>
                                        {peg != null ? peg.toFixed(2) : "—"}
                                    </td>
                                    <td className="text-right px-2 py-2 font-mono text-muted-foreground">
                                        {p.marketCap ? (p.marketCap / 1e9).toFixed(0) : "—"}
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                            <td className="px-3 py-2 text-blue-700" colSpan={2}>TB ngành ({cleaned.length} mã)</td>
                            <td className="text-right px-2 py-2 font-mono text-blue-700">{avgPE > 0 ? avgPE.toFixed(1) : "—"}</td>
                            <td className="text-right px-2 py-2 font-mono text-blue-700">{avgPB > 0 ? avgPB.toFixed(2) : "—"}</td>
                            <td className="text-right px-2 py-2">—</td>
                            <td className="text-right px-2 py-2 font-mono text-blue-700">{avgROE > 0 ? avgROE.toFixed(1) : "—"}</td>
                            <td className="text-right px-2 py-2">—</td>
                            <td className="text-right px-2 py-2">—</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="text-[9px] text-muted-foreground">
                * Đã lọc tự động các mã có P/E âm, P/E &gt; 100 hoặc thiếu toàn bộ dữ liệu. PEG = P/E ÷ tăng trưởng EPS (PEG &lt; 1 = rẻ theo tăng trưởng).
            </p>
        </div>
    );
}

/* ── MAIN Valuation Section (Full Dashboard) ── */
function ValuationDashboardSection({ valuationData }: {
    valuationData: NonNullable<ReturnType<typeof useValuation>["data"]>;
}) {
    const defaultWeights = useMemo(() => {
        return valuationData.weights ?? valuationData.summary.methods.map((m, i) => ({
            method: m.method,
            weight: Math.round(100 / valuationData.summary.methods.length),
        }));
    }, [valuationData]);

    const [appliedWeights, setAppliedWeights] = React.useState<{ method: string; weight: number }[]>(defaultWeights);

    const { ticker } = useStockDetail();
    const { summary, footballField, peBand, pbBand } = valuationData;

    const hasBands = peBand.dates.length > 0 || pbBand.dates.length > 0;
    const hasFootball = footballField.length >= 2;

    return (
        <div className="space-y-6">
            {/* Tầng 1: Executive Summary */}
            <Card>
                <SectionHead icon="🎯" title="Tổng quan Định giá" sub="Giá trị Nội tại Hợp nhất — Trọng số từng phương pháp" />
                <ValuationExecSummary
                    valuationData={valuationData}
                    appliedWeights={appliedWeights}
                    onApplyWeights={setAppliedWeights}
                    onResetWeights={() => setAppliedWeights(defaultWeights)}
                />
            </Card>

            {/* Football Field */}
            {hasFootball && (
                <Card>
                    <SectionHead icon="🏈" title="Football Field Chart" sub="Biên định giá tổng hợp tất cả phương pháp" />
                    <ValuationFootballField footballField={footballField} currentPrice={summary.currentPrice} />
                </Card>
            )}

            {/* P/E & P/B Bands */}
            {hasBands && (
                <Card>
                    <SectionHead icon="📉" title="P/E & P/B Historical Bands" sub="Dải Standard Deviation 5 năm — vùng quá mua / quá bán" />
                    <ValuationMultipleBands peBand={peBand} pbBand={pbBand} />
                </Card>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  6. FINANCIAL HEALTH SCORECARD
// ══════════════════════════════════════════════════════════════════
function HealthScorecard({ ratios, reportData }: {
    ratios: FinancialRatioItem[] | null;
    reportData: ReportData;
}) {
    if (!ratios || ratios.length === 0) return null;
    const r = ratios[0];
    const bs  = reportData?.balanceSheet[0];
    const is0 = reportData?.incomeStatement[0];
    const cf  = reportData?.cashFlow;
    const isBank = !!reportData?.isBank;

    // Compute missing ratios from raw financial statements
    const debtToEquity = r.debtToEquity
        ?? (bs?.totalEquity ? bs.totalLiabilities / bs.totalEquity : null);

    const currentRatio = r.currentRatio
        ?? (bs?.currentLiabilities ? bs.currentAssets / bs.currentLiabilities : null);

    const quickRatio = r.quickRatio
        ?? (bs?.currentLiabilities ? (bs.currentAssets - (bs.inventory ?? 0)) / bs.currentLiabilities : null);

    const interestCoverageRatio = (() => {
        if (r.interestCoverageRatio != null) return r.interestCoverageRatio;
        if (!is0) return null;
        const ebit = getOperatingProfit(is0);
        const intExp = getInterestExpense(is0, isBank);
        return safeRatio(ebit, intExp);
    })();

    const assetTurnover = r.assetTurnover
        ?? safeRatio(getRevenueBase(is0, isBank), bs?.totalAssets ?? null);

    const dividendYield = (() => {
        if (r.dividendYield != null) return r.dividendYield;
        if (!cf || cf.length === 0 || !r.marketCap) return null;
        const ttmDiv = cf.slice(0, 4).reduce((s, q) => s + Math.abs(q.dividendsPaid ?? 0), 0);
        return ttmDiv ? (ttmDiv / r.marketCap) * 100 : null;
    })();

    type Metric = { label: string; value: number | null; good: (v: number) => boolean; fmt: (v: number) => string };
    const metrics: Metric[] = [
        { label: "D/E Ratio",          value: debtToEquity,          good: (v) => v < 1.5,  fmt: (v) => v.toFixed(2) + "x" },
        { label: "Current Ratio",      value: currentRatio,          good: (v) => v >= 1.5, fmt: (v) => v.toFixed(2) + "x" },
        { label: "Quick Ratio",        value: quickRatio,            good: (v) => v >= 1,   fmt: (v) => v.toFixed(2) + "x" },
        { label: "Interest Coverage",  value: interestCoverageRatio, good: (v) => v >= 3,   fmt: (v) => v.toFixed(1) + "x" },
        { label: "Asset Turnover",     value: assetTurnover,         good: (v) => v >= 0.5, fmt: (v) => v.toFixed(2) + "x" },
        { label: "Dividend Yield",     value: dividendYield,         good: (v) => v > 0,   fmt: (v) => fmtPctNosign(v) },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.map((m) => {
                const val = m.value;
                const isGood = val != null && m.good(val);
                const isNull = val == null;
                return (
                    <div key={m.label} className={`rounded-lg border p-2.5 ${isNull ? "border-border/50 bg-muted/50" : isGood ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</div>
                        <div className={`text-base font-extrabold font-mono mt-0.5 ${isNull ? "text-muted-foreground" : isGood ? "text-green-700" : "text-red-600"}`}>
                            {val != null ? m.fmt(val) : "—"}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  7. VALUATION RATIO TREND  (PE / PB over time)
// ══════════════════════════════════════════════════════════════════
function ValuationRatioChart({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 2) return null;
        const sorted = [...ratios].reverse().slice(-8);
        const periods = sorted.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`));
        const pe = sorted.map((d) => d.pe ?? null);
        const pb = sorted.map((d) => d.pb ?? null);
        const evEbitda = sorted.map((d) => d.evEbitda ?? null);

        const makeS = (name: string, data: (number | null)[], color: string) => ({
            name,
            type: "line" as const,
            data,
            symbol: "circle",
            symbolSize: 4,
            lineStyle: { color, width: 2 },
            itemStyle: { color },
            connectNulls: true,
        });

        return {
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
            },
            legend: {
                bottom: 0, left: "center",
                textStyle: { fontSize: 10, color: "#64748b", fontFamily: "Inter,sans-serif" },
                icon: "roundRect", itemWidth: 10, itemHeight: 5,
            },
            grid: { top: 12, bottom: 36, left: 36, right: 10 },
            xAxis: {
                type: "category" as const, data: periods,
                axisLabel: { fontSize: 9, color: "#94a3b8", rotate: 20, fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono,monospace" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [makeS("P/E", pe, "#3b82f6"), makeS("P/B", pb, "#f97316"), makeS("EV/EBITDA", evEbitda, "#8b5cf6")],
        };
    }, [ratios]);

    if (!option) return <Skel h="h-28" />;
    return <ReactECharts option={option} style={{ height: 200 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  8. DRAWDOWN CHART
// ══════════════════════════════════════════════════════════════════
function DrawdownChart({ drawdownData }: { drawdownData: { date: string; value: number }[] | null | undefined }) {
    const option = useMemo(() => {
        if (!drawdownData || drawdownData.length < 5) return null;
        const dates = drawdownData.map((d) => d.date.slice(5)); // MM-DD
        const values = drawdownData.map((d) => +d.value.toFixed(2));

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: Array<{ axisValue: string; value: number }>) => `${params[0]?.axisValue}<br/>Drawdown: <b>${params[0]?.value}%</b>`,
            },
            grid: { top: 20, bottom: 28, left: 40, right: 20 },
            xAxis: {
                type: "category" as const, data: dates, boundaryGap: false,
                axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 6), fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: { fontSize: 9, color: "#94a3b8", formatter: (v: number) => v.toFixed(0) + "%" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [{
                type: "line" as const, data: values, symbol: "none", smooth: true,
                lineStyle: { color: "#ef4444", width: 2 },
                areaStyle: { color: "#ef444418" },
            }],
        };
    }, [drawdownData]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Drawdown</div>;

    const latestDt = drawdownData?.[drawdownData.length - 1];

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium">Mức sụt giảm lớn nhất</span>
                <span className="text-sm font-bold font-mono text-red-500">
                    {latestDt ? latestDt.value.toFixed(2) + "%" : "—"}
                </span>
            </div>
            <ReactECharts option={option} style={{ height: 180 }} />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  9. PEER COMPARISON
// ══════════════════════════════════════════════════════════════════
function PeerWidget() {
    const { peerStocks, stockInfo } = useStockDetail();

    if (!peerStocks || peerStocks.length === 0)
        return <div className="text-xs text-muted-foreground py-4 text-center">Không có cổ phiếu cùng ngành</div>;

    const myChange = stockInfo.priceChangePercent;

    return (
        <div className="space-y-1.5">
            {/* Self row */}
            <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <div>
                    <span className="text-xs font-bold text-blue-700">{stockInfo.ticker}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">({stockInfo.exchange})</span>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold font-mono text-foreground">
                        {stockInfo.currentPrice.toLocaleString("vi-VN")}
                    </div>
                    <div className={`text-[10px] font-mono font-semibold ${myChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {fmtPct(myChange)}
                    </div>
                </div>
            </div>

            {/* Peer rows */}
            {peerStocks.map((p) => (
                <div key={p.ticker} className="flex items-center justify-between rounded-lg hover:bg-muted/50 px-3 py-2 transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-foreground">{p.ticker}</span>
                    <div className="text-right">
                        <div className="text-xs font-mono text-muted-foreground">{p.price.toLocaleString("vi-VN")}</div>
                        <div className={`text-[10px] font-mono font-semibold ${p.priceChangePercent >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmtPct(p.priceChangePercent)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  10. DUPONT ROE DECOMPOSITION (5-Factor)
// ══════════════════════════════════════════════════════════════════
function DuPontDecomposition({ reportData }: { reportData: ReportData }) {
    const result = useMemo(() => {
        if (!reportData) return null;
        const { incomeStatement: isList, balanceSheet: bsList } = reportData;
        const isBank = reportData.isBank;
        if (isList.length < 1 || bsList.length < 1) return null;
        const ni = isList[0].netProfit ?? 0;
        const pbt = isList[0].profitBeforeTax ?? 0;
        const ebit = getOperatingProfit(isList[0]);
        const rev = getRevenueBase(isList[0], isBank);
        const ta = bsList[0].totalAssets ?? 0;
        const te = bsList[0].totalEquity ?? 0;
        if (!rev || !ta || !te || !pbt || !ebit) return null;
        return {
            taxBurden: ni / pbt,
            interestBurden: pbt / ebit,
            ebitMargin: ebit / rev,
            assetTurnover: rev / ta,
            equityMultiplier: ta / te,
            roe: (ni / pbt) * (pbt / ebit) * (ebit / rev) * (rev / ta) * (ta / te),
        };
    }, [reportData]);

    if (!result) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu DuPont</div>;
    const { taxBurden, interestBurden, ebitMargin, assetTurnover, equityMultiplier, roe } = result;

    const factors = [
        { label: "Tax Burden", desc: "NI ÷ PBT", value: taxBurden, fmt: taxBurden.toFixed(2), good: taxBurden > 0.7 },
        { label: "Interest Burden", desc: "PBT ÷ EBIT", value: interestBurden, fmt: interestBurden.toFixed(2), good: interestBurden > 0.8 },
        { label: "EBIT Margin", desc: "EBIT ÷ Revenue", value: ebitMargin, fmt: fmtPctNosign(ebitMargin * 100), good: ebitMargin > 0.1 },
        { label: "Asset Turnover", desc: "Rev ÷ Assets", value: assetTurnover, fmt: assetTurnover.toFixed(2) + "x", good: assetTurnover > 0.3 },
        { label: "Equity Mult.", desc: "Assets ÷ Equity", value: equityMultiplier, fmt: equityMultiplier.toFixed(2) + "x", good: equityMultiplier > 1 && equityMultiplier < 3 },
    ];
    const roeColor = roe > 0.15 ? "text-green-600" : roe > 0.08 ? "text-amber-600" : "text-red-500";
    const roeBg = roe > 0.15 ? "bg-green-50 border-green-200" : roe > 0.08 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

    return (
        <div className="space-y-2">
            <div className={`rounded-lg border px-3 py-2 text-center ${roeBg}`}>
                <div className="text-[9px] font-semibold text-muted-foreground uppercase">ROE (DuPont 5-Factor)</div>
                <div className={`text-xl font-extrabold font-mono ${roeColor}`}>{fmtPctNosign(roe * 100)}</div>
            </div>
            {/* 5 horizontal factor boxes */}
            <div className="flex items-stretch gap-1">
                {factors.map((f, i) => (
                    <React.Fragment key={f.label}>
                        <div className="flex-1 flex flex-col items-center justify-between bg-muted/50 rounded-lg border border-border/50 px-1 py-2 text-center gap-1">
                            <div className="text-[8px] font-semibold text-muted-foreground uppercase leading-tight">{f.label}</div>
                            <div className="text-[7px] text-muted-foreground/60 leading-tight">{f.desc}</div>
                            <div className={`text-sm font-bold font-mono ${f.good ? "text-green-600" : "text-amber-600"}`}>{f.fmt}</div>
                        </div>
                        {i < factors.length - 1 && (
                            <span className="flex items-center text-muted-foreground/40 text-xs font-bold self-center shrink-0">×</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  11. ALTMAN Z-SCORE GAUGE
// ══════════════════════════════════════════════════════════════════
function AltmanZScoreGauge({ reportData, ratios }: {
    reportData: ReportData;
    ratios: FinancialRatioItem[] | null;
}) {
    const result = useMemo(() => {
        if (!reportData || !ratios || ratios.length === 0) return null;
        const isBank = reportData.isBank;
        const bs = reportData.balanceSheet[0];
        const is0 = reportData.incomeStatement[0];
        if (!bs || !is0) return null;
        const ta = bs.totalAssets ?? 0;
        if (!ta) return null;
        const wc = (bs.currentAssets ?? 0) - (bs.currentLiabilities ?? 0);
        const re = bs.retainedEarnings ?? 0;
        const ebit = getOperatingProfit(is0) ?? 0;
        const tl = bs.totalLiabilities ?? 0;
        const rev = getRevenueBase(is0, isBank) ?? 0;
        const mve = ratios[0]?.marketCap ?? null;
        if (mve == null || !tl) return null;

        const x1 = wc / ta;
        const x2 = re / ta;
        const x3 = ebit / ta;
        const x4 = mve / tl;
        const x5 = rev / ta;
        const z = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;
        return { z: +z.toFixed(2), x1, x2, x3, x4, x5 };
    }, [reportData, ratios]);

    const z = result?.z ?? 0;
    const zone = z >= 2.99 ? "safe" : z >= 1.81 ? "grey" : "distress";
    const zoneLabel = zone === "safe" ? "An toàn" : zone === "grey" ? "Cảnh báo" : "Nguy hiểm";
    const zoneColor = zone === "safe" ? "text-green-600" : zone === "grey" ? "text-amber-600" : "text-red-500";
    const zoneBg = zone === "safe" ? "bg-green-50 border-green-200" : zone === "grey" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

    const gaugeOption = useMemo(() => ({
        series: [{
            type: "gauge" as const,
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max: 5,
            pointer: { length: "55%", width: 5, itemStyle: { color: "#475569" } },
            axisLine: {
                lineStyle: {
                    width: 18,
                    color: [
                        [0.362, "#ef4444"],
                        [0.598, "#f59e0b"],
                        [1, "#10b981"],
                    ],
                },
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { fontSize: 9, color: "#94a3b8", distance: -28 },
            detail: {
                valueAnimation: true,
                fontSize: 22,
                fontWeight: "bold" as const,
                fontFamily: "Roboto Mono,monospace",
                color: zone === "safe" ? "#10b981" : zone === "grey" ? "#f59e0b" : "#ef4444",
                offsetCenter: [0, "40%"],
            },
            data: [{ value: z }],
        }],
    }), [z, zone]);

    if (!result) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Z-Score</div>;

    return (
        <div className="flex items-center gap-3 w-full">
            {/* LEFT: Gauge centered + zone badge */}
            <div className="flex flex-col items-center justify-center flex-1 min-w-0">
                <ReactECharts option={gaugeOption} style={{ height: 150, width: "100%" }} />
                <div className={`rounded-lg border px-3 py-1 text-center w-full ${zoneBg}`}>
                    <span className={`text-sm font-bold ${zoneColor}`}>{zoneLabel}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                        {zone === "safe" ? "> 2.99" : zone === "grey" ? "1.81 – 2.99" : "< 1.81"}
                    </span>
                </div>
            </div>
            {/* RIGHT: 5 component indicators stacked vertically — larger */}
            <div className="flex flex-col gap-1.5 shrink-0 w-[88px]">
                {[
                    { l: "WC/TA", v: result.x1 },
                    { l: "RE/TA", v: result.x2 },
                    { l: "EBIT/TA", v: result.x3 },
                    { l: "MVE/TL", v: result.x4 },
                    { l: "Rev/TA", v: result.x5 },
                ].map((it) => (
                    <div key={it.l} className="bg-muted/50 rounded border border-border/50 px-2 py-1.5 flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-semibold leading-none tracking-wide">{it.l}</span>
                        <span className="text-sm font-mono font-bold text-foreground leading-none">{it.v.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  12. PIOTROSKI F-SCORE (9 Criteria)
// ══════════════════════════════════════════════════════════════════
function PiotroskiFScore({ reportData, ratios }: {
    reportData: ReturnType<typeof useFinancialReports>["data"];
    ratios: FinancialRatioItem[] | null;
}) {
    const criteria = useMemo(() => {
        if (!reportData || !ratios || ratios.length < 2) return null;
        const { incomeStatement: is, balanceSheet: bs, cashFlow: cf } = reportData;
        if (is.length < 2 || bs.length < 2 || cf.length < 1) return null;

        const ta0 = bs[0].totalAssets ?? 1;
        const ta1 = bs[1].totalAssets ?? 1;
        const ni0 = is[0].netProfit ?? 0;
        const ni1 = is[1].netProfit ?? 0;
        const cfo0 = cf.length > 0 ? (cf[0]?.operatingCashFlow ?? 0) : 0;
        const ltDebt0 = bs[0].longTermLiabilities ?? 0;
        const ltDebt1 = bs[1].longTermLiabilities ?? 0;
        const cr0 = ratios[0]?.currentRatio ?? 0;
        const cr1 = ratios[1]?.currentRatio ?? 0;
        const shares0 = ratios[0]?.outstandingShares ?? 0;
        const shares1 = ratios[1]?.outstandingShares ?? 0;
        const gm0 = ratios[0]?.grossMargin ?? 0;
        const gm1 = ratios[1]?.grossMargin ?? 0;
        const at0 = ratios[0]?.assetTurnover ?? 0;
        const at1 = ratios[1]?.assetTurnover ?? 0;

        const roa0 = ni0 / ta0;
        const roa1 = ni1 / ta1;

        const items = [
            { group: "Lợi nhuận", name: "ROA > 0", pass: roa0 > 0 },
            { group: "Lợi nhuận", name: "CFO > 0", pass: cfo0 > 0 },
            { group: "Lợi nhuận", name: "ΔROA > 0", pass: roa0 > roa1 },
            { group: "Lợi nhuận", name: "CFO > NI (Accruals)", pass: cfo0 > ni0 },
            { group: "Đòn bẩy", name: "ΔNợ dài hạn ↓", pass: ltDebt0 / ta0 <= ltDebt1 / ta1 },
            { group: "Đòn bẩy", name: "ΔCurrent Ratio ↑", pass: cr0 >= cr1 },
            { group: "Đòn bẩy", name: "Không phát hành CP mới", pass: shares0 <= shares1 || shares1 === 0 },
            { group: "Hiệu quả", name: "ΔBiên gộp ↑", pass: gm0 >= gm1 },
            { group: "Hiệu quả", name: "ΔAsset Turnover ↑", pass: at0 >= at1 },
        ];
        return items;
    }, [reportData, ratios]);

    if (!criteria) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu F-Score</div>;
    const score = criteria.filter((c) => c.pass).length;
    const scoreColor = score >= 7 ? "text-green-600" : score >= 4 ? "text-amber-600" : "text-red-500";
    const scoreBg = score >= 7 ? "bg-green-50 border-green-200" : score >= 4 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
    const scoreLabel = score >= 7 ? "Mạnh" : score >= 4 ? "Trung bình" : "Yếu";

    const groups = ["Lợi nhuận", "Đòn bẩy", "Hiệu quả"];
    return (
        <div className="space-y-3">
            <div className={`rounded-lg border p-3 flex items-center justify-between ${scoreBg}`}>
                <div>
                    <div className="text-[9px] font-semibold text-muted-foreground uppercase">Piotroski F-Score</div>
                    <div className={`text-xs font-bold mt-0.5 ${scoreColor}`}>{scoreLabel}</div>
                </div>
                <div className={`text-3xl font-extrabold font-mono ${scoreColor}`}>{score}/9</div>
            </div>
            {groups.map((g) => (
                <div key={g}>
                    <div className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">{g}</div>
                    <div className="space-y-1">
                        {criteria.filter((c) => c.group === g).map((c) => (
                            <div key={c.name} className="flex items-center gap-2 bg-muted/50 rounded-lg border border-border/50 px-3 py-1.5">
                                <span className="text-sm">{c.pass ? "✅" : "❌"}</span>
                                <span className={`text-[11px] font-medium ${c.pass ? "text-foreground" : "text-muted-foreground"}`}>{c.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  13. CASH CONVERSION CYCLE
// ══════════════════════════════════════════════════════════════════
function CashConversionCycleChart({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 3) return null;
        const sorted = [...ratios].reverse().slice(-8);
        const hasData = sorted.some((d) => d.receivableDays != null || d.inventoryDays != null);
        if (!hasData) return null;
        const periods = sorted.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`));
        const recDays = sorted.map((d) => d.receivableDays ?? null);
        const invDays = sorted.map((d) => d.inventoryDays ?? null);
        const payDays = sorted.map((d) => d.payableDays ?? null);
        const ccc = sorted.map((d) => d.cashConversionCycle ?? null);

        const mkLine = (name: string, data: (number | null)[], color: string, dash = false) => ({
            name, type: "line" as const, data, symbol: "circle", symbolSize: 4,
            lineStyle: { color, width: 2, type: (dash ? "dashed" : "solid") as "dashed" | "solid" },
            itemStyle: { color }, connectNulls: true,
        });

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (params: { seriesName: string; value: number }[]) =>
                    params.map((p) => `${p.seriesName}: <b>${p.value != null ? p.value.toFixed(0) + " ngày" : "—"}</b>`).join("<br/>"),
            },
            legend: {
                bottom: 0, left: "center", textStyle: { fontSize: 9, color: "#64748b" },
                icon: "roundRect", itemWidth: 10, itemHeight: 5,
            },
            grid: { top: 12, bottom: 40, left: 42, right: 10 },
            xAxis: {
                type: "category" as const, data: periods,
                axisLabel: { fontSize: 9, color: "#94a3b8", rotate: 20 },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const, name: "Ngày",
                nameTextStyle: { fontSize: 9, color: "#94a3b8" },
                axisLabel: { fontSize: 9, color: "#94a3b8" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                mkLine("Thu tiền", recDays, "#3b82f6"),
                mkLine("Tồn kho", invDays, "#f97316"),
                mkLine("Trả nợ", payDays, "#8b5cf6", true),
                mkLine("CCC", ccc, "#ef4444"),
            ],
        };
    }, [ratios]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu CCC</div>;
    return <ReactECharts option={option} style={{ height: 230 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  14. DIVIDEND ANALYSIS
// ══════════════════════════════════════════════════════════════════
function DividendAnalysis({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 3) return null;
        const annual = [...ratios].reverse().filter((d) => d.dividendYield != null);
        if (annual.length < 2) return null;
        const periods = annual.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`)).slice(-8);
        const yields = annual.map((d) => d.dividendYield != null ? +d.dividendYield.toFixed(2) : null).slice(-8);
        const eps = annual.map((d) => d.eps).slice(-8);

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
            },
            legend: {
                bottom: 0, left: "center", textStyle: { fontSize: 9, color: "#64748b" },
                icon: "roundRect", itemWidth: 10, itemHeight: 5,
            },
            grid: { top: 16, bottom: 40, left: 46, right: 46 },
            xAxis: {
                type: "category" as const, data: periods,
                axisLabel: { fontSize: 9, color: "#94a3b8", rotate: 20 },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: [
                {
                    type: "value" as const, name: "Yield %",
                    nameTextStyle: { fontSize: 9, color: "#10b981" },
                    axisLabel: { fontSize: 9, color: "#10b981", formatter: (v: number) => v.toFixed(1) + "%" },
                    splitLine: { lineStyle: { color: "#f1f5f9" } },
                },
                {
                    type: "value" as const, name: "EPS",
                    nameTextStyle: { fontSize: 9, color: "#3b82f6" },
                    axisLabel: { fontSize: 9, color: "#3b82f6", formatter: (v: number) => fmtNum(v, 0) },
                    splitLine: { show: false },
                },
            ],
            series: [
                {
                    name: "Dividend Yield", type: "bar" as const, data: yields,
                    barMaxWidth: 24, yAxisIndex: 0,
                    itemStyle: { color: "#10b981", borderRadius: [3, 3, 0, 0] },
                },
                {
                    name: "EPS", type: "line" as const, data: eps, yAxisIndex: 1,
                    symbol: "circle", symbolSize: 5,
                    lineStyle: { color: "#3b82f6", width: 2 },
                    itemStyle: { color: "#3b82f6" }, connectNulls: true,
                },
            ],
        };
    }, [ratios]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không có dữ liệu cổ tức</div>;
    return <ReactECharts option={option} style={{ height: 220 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  15. YTD PERFORMANCE
// ══════════════════════════════════════════════════════════════════
function YtdPerformance() {
    const { priceHistory, stockInfo } = useStockDetail();
    const option = useMemo(() => {
        if (!priceHistory || priceHistory.length < 10) return null;
        const currentYear = new Date().getFullYear();
        const ytdPrices = priceHistory.filter((p) => {
            const y = parseInt(p.date.slice(0, 4), 10);
            return y === currentYear;
        });
        if (ytdPrices.length < 5) return null;
        const basePrice = ytdPrices[0].close;
        if (!basePrice) return null;
        const dates = ytdPrices.map((p) => p.date.slice(5)); // MM-DD
        const cumReturn = ytdPrices.map((p) => +((p.close / basePrice - 1) * 100).toFixed(2));
        const lastReturn = cumReturn[cumReturn.length - 1] ?? 0;
        const lineColor = lastReturn >= 0 ? "#10b981" : "#ef4444";

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (params: { axisValue: string; value: number }[]) =>
                    `${params[0]?.axisValue}<br/>Lợi nhuận: <b>${fmtPct(params[0]?.value)}</b>`,
            },
            grid: { top: 20, bottom: 28, left: 50, right: 20 },
            xAxis: {
                type: "category" as const, data: dates, boundaryGap: false,
                axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 6) },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: { fontSize: 9, color: "#94a3b8", formatter: (v: number) => v.toFixed(0) + "%" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [{
                type: "line" as const, data: cumReturn, symbol: "none", smooth: true,
                lineStyle: { color: lineColor, width: 2 },
                areaStyle: { color: lineColor + "18" },
                markLine: {
                    silent: true,
                    data: [{ yAxis: 0 }],
                    lineStyle: { color: "#94a3b8", type: "dashed" as const, width: 1 },
                    label: { show: false },
                    symbol: ["none", "none"],
                },
            }],
        };
    }, [priceHistory]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu YTD</div>;
    const ytdPrices = priceHistory.filter((p) => parseInt(p.date.slice(0, 4), 10) === new Date().getFullYear());
    const basePrice = ytdPrices[0]?.close ?? 1;
    const lastPrice = ytdPrices[ytdPrices.length - 1]?.close ?? basePrice;
    const ytdReturn = ((lastPrice / basePrice - 1) * 100);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium">Lợi nhuận từ đầu năm {new Date().getFullYear()}</span>
                <span className={`text-sm font-bold font-mono ${ytdReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmtPct(ytdReturn)}
                </span>
            </div>
            <ReactECharts option={option} style={{ height: 180 }} />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  16. REVENUE ⟶ NET PROFIT WATERFALL
// ══════════════════════════════════════════════════════════════════
function RevenueWaterfall({ reportData }: { reportData: ReturnType<typeof useFinancialReports>["data"] }) {
    const option = useMemo(() => {
        if (!reportData) return null;
        const is = reportData.incomeStatement;
        if (is.length < 1) return null;
        const d = is[0];
        const rev = d.revenue ?? 0;
        if (!rev) return null;
        const cogs = Math.abs(d.costOfGoodsSold ?? 0);
        const gross = d.grossProfit ?? 0;
        const sell = Math.abs(d.sellingExpenses ?? 0);
        const admin = Math.abs(d.adminExpenses ?? 0);
        let opProfit = d.operatingProfit ?? 0;
        if (!opProfit) opProfit = gross - sell - admin;
        const finInc = d.financialIncome ?? 0;
        const finExp = Math.abs(d.financialExpenses ?? 0);
        const pbt = d.profitBeforeTax ?? 0;
        const tax = Math.abs(d.incomeTax ?? 0);
        const ni = d.netProfit ?? 0;
        const toTy = (v: number) => +(v / 1e9).toFixed(1);

        // Waterfall: [transparent_base, visible_value]
        const items = [
            { name: "Doanh thu", value: toTy(rev), base: 0, color: "#3b82f6" },
            { name: "Giá vốn", value: -toTy(cogs), base: toTy(rev) + (-toTy(cogs)), color: "#ef4444" },
            { name: "LN gộp", value: toTy(gross), base: 0, color: "#10b981", isSum: true },
            { name: "CP bán hàng", value: -toTy(sell), base: toTy(gross) + (-toTy(sell)), color: "#f97316" },
            { name: "CP quản lý", value: -toTy(admin), base: toTy(gross) - toTy(sell) + (-toTy(admin)), color: "#f97316" },
            { name: "LN HĐKD", value: toTy(opProfit), base: 0, color: "#10b981", isSum: true },
            { name: "Thu tài chính", value: toTy(finInc), base: toTy(opProfit), color: "#06b6d4" },
            { name: "CP tài chính", value: -toTy(finExp), base: toTy(opProfit) + toTy(finInc) + (-toTy(finExp)), color: "#ef4444" },
            { name: "LN trước thuế", value: toTy(pbt), base: 0, color: "#8b5cf6", isSum: true },
            { name: "Thuế TNDN", value: -toTy(tax), base: toTy(pbt) + (-toTy(tax)), color: "#ef4444" },
            { name: "LNST", value: toTy(ni), base: 0, color: ni >= 0 ? "#10b981" : "#ef4444", isSum: true },
        ];

        const baseData = items.map((it) => (it.isSum ? 0 : Math.max(0, (it.value >= 0 ? it.base : it.base))));
        const visibleData = items.map((it) => ({
            value: Math.abs(it.value),
            itemStyle: { color: it.color, borderRadius: it.value >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] },
        }));

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: { seriesIndex: number; name: string; value: number }[]) => {
                    const p = params.find((x) => x.seriesIndex === 1);
                    if (!p) return "";
                    const it = items.find((x) => x.name === p.name);
                    const sign = (it?.value ?? 0) < 0 ? "-" : "+";
                    const pct = rev ? ((Math.abs(it?.value ?? 0) / toTy(rev)) * 100).toFixed(1) : "0";
                    return `<b>${p.name}</b><br/>Giá trị: <b>${it?.value ?? 0} tỷ</b> (${sign}${pct}% DT)`;
                },
            },
            grid: { top: 16, bottom: 60, left: 50, right: 10 },
            xAxis: {
                type: "category" as const, data: items.map((it) => it.name),
                axisLabel: { fontSize: 8, color: "#64748b", interval: 0, rotate: 35, fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const, name: "Tỷ VND",
                nameTextStyle: { fontSize: 9, color: "#94a3b8" },
                axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono,monospace" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                { name: "base", type: "bar" as const, stack: "wf", data: baseData, itemStyle: { color: "transparent" }, emphasis: { itemStyle: { color: "transparent" } } },
                {
                    name: "value", type: "bar" as const, stack: "wf", data: visibleData, barMaxWidth: 28,
                    label: {
                        show: true, position: "top" as const, fontSize: 8, color: "#64748b", fontFamily: "Roboto Mono,monospace",
                        formatter: (p: { value: number; dataIndex: number }) => {
                            const it = items[p.dataIndex];
                            return it ? (it.value >= 0 ? "+" : "") + it.value.toFixed(0) : "";
                        },
                    },
                },
            ],
        };
    }, [reportData]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Waterfall</div>;
    return <ReactECharts option={option} style={{ height: 280 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  17. DAILY RETURN HISTOGRAM
// ══════════════════════════════════════════════════════════════════
function ReturnHistogram() {
    const { priceHistory } = useStockDetail();
    const option = useMemo(() => {
        if (!priceHistory || priceHistory.length < 30) return null;
        // Compute daily returns
        const closes = priceHistory.map((p) => p.close).filter(Boolean);
        const returns: number[] = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
        }
        if (returns.length < 20) return null;

        // Stats
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
        const std = Math.sqrt(variance);
        const n = returns.length;
        const skewness = returns.reduce((a, b) => a + ((b - mean) / std) ** 3, 0) / n;
        const kurtosis = returns.reduce((a, b) => a + ((b - mean) / std) ** 4, 0) / n - 3;

        // Histogram bins
        const binCount = 25;
        const min = Math.min(...returns);
        const max = Math.max(...returns);
        const binWidth = (max - min) / binCount;
        const bins: { center: number; count: number }[] = [];
        for (let i = 0; i < binCount; i++) {
            const lo = min + i * binWidth;
            const hi = lo + binWidth;
            const center = +(lo + binWidth / 2).toFixed(2);
            const count = returns.filter((r) => r >= lo && (i === binCount - 1 ? r <= hi : r < hi)).length;
            bins.push({ center, count });
        }

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (params: { name: string; value: number }[]) => {
                    const p = params[0];
                    return `Return: <b>${p?.name}%</b><br/>Tần suất: <b>${p?.value} ngày</b>`;
                },
            },
            grid: { top: 36, bottom: 28, left: 44, right: 10 },
            xAxis: {
                type: "category" as const, data: bins.map((b) => b.center.toFixed(1)),
                axisLabel: { fontSize: 8, color: "#94a3b8", interval: 3, fontFamily: "Roboto Mono,monospace" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
                name: "% Return", nameTextStyle: { fontSize: 9, color: "#94a3b8" },
            },
            yAxis: {
                type: "value" as const, name: "Số ngày",
                nameTextStyle: { fontSize: 9, color: "#94a3b8" },
                axisLabel: { fontSize: 9, color: "#94a3b8" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [{
                type: "bar" as const, data: bins.map((b) => ({
                    value: b.count,
                    itemStyle: {
                        color: b.center >= 0 ? "#10b981" : "#ef4444",
                        borderRadius: [2, 2, 0, 0],
                    },
                })),
                barCategoryGap: "10%",
                markLine: {
                    silent: true,
                    data: [
                        { xAxis: bins.findIndex((b) => b.center >= mean).toString(), lineStyle: { color: "#3b82f6", width: 2 } },
                    ],
                    label: { show: true, formatter: `μ=${mean.toFixed(2)}%`, fontSize: 9, color: "#3b82f6" },
                    symbol: ["none", "none"],
                },
            }],
            graphic: [{
                type: "text" as const,
                left: 54, top: 8,
                style: {
                    text: `μ=${mean.toFixed(2)}%  σ=${std.toFixed(2)}%  Skew=${skewness.toFixed(2)}  Kurt=${kurtosis.toFixed(2)}`,
                    fontSize: 9, fill: "#94a3b8", fontFamily: "Roboto Mono,monospace",
                },
            }],
        };
    }, [priceHistory]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Histogram</div>;
    return <ReactECharts option={option} style={{ height: 260 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  18-A. MONTE CARLO SIMULATION (Client-side)
// ══════════════════════════════════════════════════════════════════
function boxMullerRandom(mu: number, sigma: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    return mu + sigma * z;
}

interface MCParams {
    sessions: number;       // số phiên mô phỏng (days)
    simulations: number;    // số kịch bản
    distribution: "normal" | "lognormal"; // loại phân phối
    capital: number;        // vốn đầu tư (triệu VND)
}

interface MCResult {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
    finalValues: number[];  // phân phối cuối kỳ
    meanReturn: number;     // % mean return hàng ngày
    stdReturn: number;      // % std return hàng ngày
    probUp: number;         // % xác suất lãi
    expectedFinal: number;  // vốn kỳ vọng cuối kỳ
}

function runMonteCarlo(closes: number[], params: MCParams): MCResult | null {
    if (closes.length < 30) return null;
    const { sessions, simulations, distribution, capital } = params;

    // Tính lịch sử returns
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const n = returns.length;
    const meanR = returns.reduce((a, b) => a + b, 0) / n;
    const varR = returns.reduce((a, b) => a + (b - meanR) ** 2, 0) / n;
    const stdR = Math.sqrt(varR);

    // Lognormal tham số
    const mu_ln = Math.log(1 + meanR) - 0.5 * Math.log(1 + varR / ((1 + meanR) ** 2));
    const sigma_ln = Math.sqrt(Math.log(1 + varR / ((1 + meanR) ** 2)));

    // Chạy mô phỏng — lưu percentile tại mỗi bước
    const NUM_STEPS = Math.min(sessions, 250);
    const allPaths: Float32Array[] = [];

    for (let s = 0; s < simulations; s++) {
        const path = new Float32Array(NUM_STEPS + 1);
        path[0] = capital;
        for (let t = 1; t <= NUM_STEPS; t++) {
            const prevVal = path[t - 1];
            let ret: number;
            if (distribution === "lognormal") {
                ret = Math.exp(boxMullerRandom(mu_ln, sigma_ln)) - 1;
            } else {
                ret = boxMullerRandom(meanR, stdR);
            }
            path[t] = prevVal * (1 + ret);
        }
        allPaths.push(path);
    }

    // Tính percentile theo từng bước (lấy mẫu 51 điểm để vẽ đẹp)
    const SAMPLE_STEPS = 51;
    const stepIndices = Array.from({ length: SAMPLE_STEPS }, (_, i) =>
        Math.round((i / (SAMPLE_STEPS - 1)) * NUM_STEPS)
    );

    const p5: number[] = [];
    const p25: number[] = [];
    const p50: number[] = [];
    const p75: number[] = [];
    const p95: number[] = [];

    for (const step of stepIndices) {
        const slice = allPaths.map((path) => path[step]).sort((a, b) => a - b);
        const len = slice.length;
        p5.push(+(slice[Math.floor(len * 0.05)] ?? 0).toFixed(2));
        p25.push(+(slice[Math.floor(len * 0.25)] ?? 0).toFixed(2));
        p50.push(+(slice[Math.floor(len * 0.50)] ?? 0).toFixed(2));
        p75.push(+(slice[Math.floor(len * 0.75)] ?? 0).toFixed(2));
        p95.push(+(slice[Math.floor(len * 0.95)] ?? 0).toFixed(2));
    }

    // Giá trị cuối kỳ
    const finalValues = allPaths.map((path) => path[NUM_STEPS]);
    const probUp = (finalValues.filter((v) => v > capital).length / simulations) * 100;
    const expectedFinal = finalValues.reduce((a, b) => a + b, 0) / simulations;

    return {
        p5, p25, p50, p75, p95,
        finalValues,
        meanReturn: meanR * 100,
        stdReturn: stdR * 100,
        probUp: +probUp.toFixed(1),
        expectedFinal: +expectedFinal.toFixed(2),
    };
}

function MonteCarloSimulation() {
    const { priceHistory, stockInfo } = useStockDetail();

    const [params, setParams] = useState<MCParams>({
        sessions: 250,
        simulations: 1000,
        distribution: "lognormal",
        capital: 100,
    });
    const [draftParams, setDraftParams] = useState<MCParams>(params);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<MCResult | null>(null);
    const [hasRun, setHasRun] = useState(false);

    const closes = useMemo(() => {
        if (!priceHistory || priceHistory.length < 30) return [];
        return priceHistory.map((p) => p.close).filter(Boolean);
    }, [priceHistory]);

    // Tự động chạy lần đầu
    const runSimulation = useCallback(() => {
        setRunning(true);
        setParams(draftParams);
        setTimeout(() => {
            const res = runMonteCarlo(closes, draftParams);
            setResult(res);
            setHasRun(true);
            setRunning(false);
        }, 50);
    }, [closes, draftParams]);

    // Chart 1: Fan chart
    const fanOption = useMemo(() => {
        if (!result) return null;
        const { p5, p25, p50, p75, p95 } = result;
        const xLabels = p50.map((_, i) =>
            i === 0 ? "T0" : `P${Math.round((i / (p50.length - 1)) * params.sessions)}`
        );

        return {
            animation: false,
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono,monospace" },
                formatter: (pArr: { seriesName: string; value: number; axisValue: string }[]) => {
                    const day = pArr[0]?.axisValue ?? "";
                    const fmtM = (v: number) => v.toFixed(1);
                    const lines = pArr
                        .filter((p) => !p.seriesName.startsWith("_"))
                        .map((p) => `${p.seriesName}: <b>${fmtM(p.value)}M</b>`);
                    return `<b>${day}</b><br/>${lines.join("<br/>")}`;
                },
            },
            legend: {
                top: 4, right: 8,
                data: ["P50 (Trung vị)", "P95 (Tích cực)", "P5 (Tiêu cực)"],
                textStyle: { fontSize: 10, color: "#64748b" },
                icon: "roundRect", itemWidth: 12, itemHeight: 5,
            },
            grid: { top: 44, bottom: 28, left: 58, right: 14 },
            xAxis: {
                type: "category" as const,
                data: xLabels,
                axisLabel: {
                    fontSize: 9, color: "#94a3b8",
                    interval: Math.max(Math.floor(xLabels.length / 6), 1),
                },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
                axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: {
                    fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono,monospace",
                    formatter: (v: number) => v.toFixed(0) + "M",
                },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                // Band P5-P95 (outer)
                {
                    name: "_band_outer_base",
                    type: "line",
                    data: p5,
                    symbol: "none",
                    lineStyle: { width: 0, opacity: 0 },
                    stack: "outer",
                    z: 1,
                },
                {
                    name: "_band_outer",
                    type: "line",
                    data: p95.map((v, i) => Math.max(0, v - (p5[i] ?? 0))),
                    symbol: "none",
                    lineStyle: { width: 0 },
                    areaStyle: { color: "rgba(249,115,22,0.07)" },
                    stack: "outer",
                    z: 1,
                },
                // Band P25-P75 (inner)
                {
                    name: "_band_inner_base",
                    type: "line",
                    data: p25,
                    symbol: "none",
                    lineStyle: { width: 0, opacity: 0 },
                    stack: "inner",
                    z: 2,
                },
                {
                    name: "_band_inner",
                    type: "line",
                    data: p75.map((v, i) => Math.max(0, v - (p25[i] ?? 0))),
                    symbol: "none",
                    lineStyle: { width: 0 },
                    areaStyle: { color: "rgba(249,115,22,0.14)" },
                    stack: "inner",
                    z: 2,
                },
                // Lines
                {
                    name: "P50 (Trung vị)",
                    type: "line",
                    data: p50,
                    symbol: "none",
                    lineStyle: { width: 3, color: "#F97316" },
                    z: 10,
                },
                {
                    name: "P95 (Tích cực)",
                    type: "line",
                    data: p95,
                    symbol: "none",
                    lineStyle: { width: 1.5, color: "#00C076", type: "dashed" as const },
                    z: 6,
                },
                {
                    name: "P5 (Tiêu cực)",
                    type: "line",
                    data: p5,
                    symbol: "none",
                    lineStyle: { width: 1.5, color: "#EF4444", type: "dashed" as const },
                    z: 6,
                },
                // Vốn ban đầu reference line
                {
                    name: "_capital",
                    type: "line",
                    data: [],
                    silent: true,
                    markLine: {
                        silent: true,
                        symbol: "none",
                        lineStyle: { color: "#94a3b8", width: 1.5, type: "dotted" as const },
                        data: [{ yAxis: params.capital }],
                        label: {
                            formatter: `Vốn ban đầu: ${params.capital}M`,
                            fontSize: 9, color: "#64748b",
                            position: "end" as const,
                        },
                    },
                },
            ],
        };
    }, [result, params.sessions, params.capital]);

    // Chart 2: Histogram phân phối cuối kỳ
    const histOption = useMemo(() => {
        if (!result || result.finalValues.length < 10) return null;
        const vals = result.finalValues;
        const minV = Math.min(...vals);
        const maxV = Math.max(...vals);
        const binCount = 30;
        const bw = (maxV - minV) / binCount;
        const bins: { center: number; count: number; isProfit: boolean }[] = [];
        for (let i = 0; i < binCount; i++) {
            const lo = minV + i * bw;
            const hi = lo + bw;
            const center = lo + bw / 2;
            const count = vals.filter((v) => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length;
            bins.push({ center: +center.toFixed(2), count, isProfit: center > params.capital });
        }
        const medianFinal = result.p50[result.p50.length - 1] ?? params.capital;

        return {
            animation: false,
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (pArr: { name: string; value: number }[]) =>
                    `Giá trị: <b>${Number(pArr[0]?.name).toFixed(1)}M VND</b><br/>Kịch bản: <b>${pArr[0]?.value}</b>`,
            },
            grid: { top: 36, bottom: 28, left: 52, right: 12 },
            xAxis: {
                type: "category" as const,
                data: bins.map((b) => b.center.toFixed(0)),
                axisLabel: { fontSize: 8, color: "#94a3b8", fontFamily: "Roboto Mono,monospace", interval: 4, rotate: 30 },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
                name: "Triệu VND", nameTextStyle: { fontSize: 9, color: "#94a3b8" },
            },
            yAxis: {
                type: "value" as const,
                name: "Kịch bản",
                nameTextStyle: { fontSize: 9, color: "#94a3b8" },
                axisLabel: { fontSize: 9, color: "#94a3b8" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [{
                type: "bar" as const,
                data: bins.map((b) => ({
                    value: b.count,
                    itemStyle: {
                        color: b.isProfit ? "#00C076" : "#EF4444",
                        borderRadius: [3, 3, 0, 0],
                        opacity: 0.85,
                    },
                })),
                barCategoryGap: "8%",
                markLine: {
                    silent: true,
                    symbol: "none",
                    data: [
                        {
                            xAxis: bins.findIndex((b) => b.center >= medianFinal).toString(),
                            lineStyle: { color: "#F97316", width: 2, type: "dashed" as const },
                            label: { formatter: "P50", color: "#F97316", fontSize: 9, position: "start" as const },
                        },
                        {
                            xAxis: bins.findIndex((b) => b.center >= params.capital).toString(),
                            lineStyle: { color: "#64748b", width: 1.5, type: "dotted" as const },
                            label: { formatter: "Vốn", color: "#64748b", fontSize: 9, position: "end" as const },
                        },
                    ],
                },
            }],
        };
    }, [result, params.capital]);

    const fmtM = (v: number) => v.toFixed(1);

    if (!closes.length) {
        return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu giá để mô phỏng</div>;
    }

    return (
        <div className="flex flex-col lg:flex-row gap-0 min-h-[480px]">
            {/* ── LEFT: BỘ LỌC TINH CHỈNH (20%) ── */}
            <aside className="w-full lg:w-[20%] flex-shrink-0 border-r border-border/50 bg-muted/20 rounded-l-xl p-4 flex flex-col gap-4">
                <div>
                    <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="text-base">⚙️</span> Tham số mô phỏng
                    </h4>

                    {/* Số phiên */}
                    <div className="mb-3">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Số phiên <span className="font-mono text-primary ml-1">{draftParams.sessions}</span>
                        </label>
                        <input
                            type="range" min={20} max={500} step={10}
                            value={draftParams.sessions}
                            onChange={(e) => setDraftParams((p) => ({ ...p, sessions: +e.target.value }))}
                            className="w-full h-1.5 accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
                            <span>20</span><span>500</span>
                        </div>
                    </div>

                    {/* Số kịch bản */}
                    <div className="mb-3">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Kịch bản <span className="font-mono text-primary ml-1">{draftParams.simulations.toLocaleString()}</span>
                        </label>
                        <input
                            type="range" min={100} max={10000} step={100}
                            value={draftParams.simulations}
                            onChange={(e) => setDraftParams((p) => ({ ...p, simulations: +e.target.value }))}
                            className="w-full h-1.5 accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
                            <span>100</span><span>10,000</span>
                        </div>
                    </div>

                    {/* Vốn đầu tư */}
                    <div className="mb-3">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Vốn (triệu VND) <span className="font-mono text-primary ml-1">{draftParams.capital}M</span>
                        </label>
                        <input
                            type="range" min={10} max={1000} step={10}
                            value={draftParams.capital}
                            onChange={(e) => setDraftParams((p) => ({ ...p, capital: +e.target.value }))}
                            className="w-full h-1.5 accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
                            <span>10M</span><span>1,000M</span>
                        </div>
                    </div>

                    {/* Phân phối */}
                    <div className="mb-4">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Phân phối
                        </label>
                        <div className="flex gap-2">
                            {(["lognormal", "normal"] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDraftParams((p) => ({ ...p, distribution: d }))}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                        draftParams.distribution === d
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                    }`}
                                >
                                    {d === "lognormal" ? "Log-Normal" : "Normal"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chạy */}
                    <button
                        onClick={runSimulation}
                        disabled={running}
                        className="w-full py-2.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {running ? "Đang mô phỏng…" : "▶ Chạy mô phỏng"}
                    </button>
                </div>

                {/* Thông số lịch sử */}
                {result && (
                    <div className="mt-auto space-y-2 pt-3 border-t border-border/50">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Tham số lịch sử</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-background rounded-lg border border-border/50 p-2 text-center">
                                <div className="text-[8px] text-muted-foreground font-medium">μ/ngày</div>
                                <div className={`text-xs font-bold font-mono ${result.meanReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
                                    {result.meanReturn >= 0 ? "+" : ""}{result.meanReturn.toFixed(3)}%
                                </div>
                            </div>
                            <div className="bg-background rounded-lg border border-border/50 p-2 text-center">
                                <div className="text-[8px] text-muted-foreground font-medium">σ/ngày</div>
                                <div className="text-xs font-bold font-mono text-blue-600">{result.stdReturn.toFixed(3)}%</div>
                            </div>
                        </div>
                        <div className="bg-background rounded-lg border border-border/50 p-2">
                            <div className="text-[8px] text-muted-foreground font-medium mb-1">Xác suất sinh lời</div>
                            <div className={`text-sm font-extrabold font-mono ${result.probUp >= 50 ? "text-green-600" : "text-red-500"}`}>
                                {result.probUp}%
                            </div>
                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-green-500 transition-all"
                                    style={{ width: `${result.probUp}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── RIGHT: BIỂU ĐỒ (80%) ── */}
            <div className="flex-1 min-w-0 p-4 flex flex-col gap-4">
                {!hasRun ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                        <div className="text-5xl">🎲</div>
                        <p className="text-sm text-muted-foreground text-center max-w-xs">
                            Điều chỉnh tham số và nhấn <b className="text-foreground">▶ Chạy mô phỏng</b> để xem kết quả Monte Carlo
                        </p>
                        <button
                            onClick={runSimulation}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm"
                        >
                            {running ? "Đang chạy…" : "▶ Chạy ngay"}
                        </button>
                    </div>
                ) : running ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                            <p className="text-sm text-muted-foreground">Đang mô phỏng {params.simulations.toLocaleString()} kịch bản…</p>
                        </div>
                    </div>
                ) : result ? (
                    <>
                        {/* Stat chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { label: "Kỳ vọng (TB)", value: `${fmtM(result.expectedFinal)}M`, color: "text-[#F97316]" },
                                { label: "P95 (Tích cực)", value: `${fmtM(result.p95[result.p95.length - 1] ?? 0)}M`, color: "text-[#00C076]" },
                                { label: "P5 (Tiêu cực)", value: `${fmtM(result.p5[result.p5.length - 1] ?? 0)}M`, color: "text-[#EF4444]" },
                                { label: "Sinh lời", value: `${result.probUp}%`, color: result.probUp >= 50 ? "text-green-600" : "text-red-500" },
                            ].map((it) => (
                                <div key={it.label} className="bg-muted/40 rounded-lg border border-border/50 p-2.5 text-center">
                                    <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{it.label}</div>
                                    <div className={`text-base font-extrabold font-mono mt-0.5 ${it.color}`}>{it.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Fan chart */}
                        <div className="flex-1 min-h-0">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                                Đường đi giá trị danh mục — {params.simulations.toLocaleString()} kịch bản · {params.sessions} phiên
                            </p>
                            {fanOption && <ReactECharts option={fanOption} style={{ height: 260 }} />}
                        </div>

                        {/* Histogram phân phối cuối kỳ */}
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                                Phân phối giá trị danh mục cuối kỳ (triệu VND) — <span className="text-green-600">Lãi</span> / <span className="text-red-500">Lỗ</span>
                            </p>
                            {histOption && <ReactECharts option={histOption} style={{ height: 180 }} />}
                        </div>

                        {/* Insight */}
                        <div className={`border-l-4 rounded-r-lg px-4 py-2.5 text-xs text-muted-foreground ${
                            result.probUp >= 65
                                ? "border-green-500 bg-green-50"
                                : result.probUp >= 50
                                    ? "border-blue-400 bg-blue-50"
                                    : "border-red-400 bg-red-50"
                        }`}>
                            <span className="mr-1">{result.probUp >= 65 ? "✅" : result.probUp >= 50 ? "ℹ️" : "⚠️"}</span>
                            <b>Nhận định:</b> Dựa trên {params.simulations.toLocaleString()} kịch bản mô phỏng{" "}
                            <b>{params.distribution === "lognormal" ? "Log-Normal" : "Normal"}</b> với{" "}
                            μ={result.meanReturn.toFixed(3)}%, σ={result.stdReturn.toFixed(3)}%/ngày, sau{" "}
                            <b>{params.sessions} phiên</b>, vốn <b>{params.capital}M VND</b> có{" "}
                            <b className={result.probUp >= 50 ? "text-green-600" : "text-red-500"}>{result.probUp}%</b> xác suất sinh lời.
                            {result.probUp >= 65
                                ? " Phân bổ nghiêng tích cực — kỳ vọng danh mục tốt."
                                : result.probUp >= 50
                                    ? " Phân bổ cân bằng, cần quản lý rủi ro tích cực."
                                    : " Xác suất thua lỗ cao — cân nhắc tái cơ cấu danh mục."}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  18. PRICE SENSITIVITY DENSITY (KDE + VaR markers)
// ══════════════════════════════════════════════════════════════════
function PriceSensitivityDensity() {
    const { priceHistory, stockInfo } = useStockDetail();
    const option = useMemo(() => {
        if (!priceHistory || priceHistory.length < 30) return null;
        const closes = priceHistory.map((p) => p.close).filter(Boolean);
        const returns: number[] = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
        }
        if (returns.length < 20) return null;

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const std = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length);
        const sorted = [...returns].sort((a, b) => a - b);
        const var95 = sorted[Math.floor(returns.length * 0.05)];
        const var99 = sorted[Math.floor(returns.length * 0.01)];

        // Kernel density estimation (Gaussian)
        const bandwidth = std * 0.5;
        const minX = mean - 4 * std;
        const maxX = mean + 4 * std;
        const steps = 80;
        const dx = (maxX - minX) / steps;
        const kdePoints: { x: number; y: number }[] = [];
        for (let i = 0; i <= steps; i++) {
            const x = minX + i * dx;
            let density = 0;
            for (const r of returns) {
                density += Math.exp(-0.5 * ((x - r) / bandwidth) ** 2);
            }
            density /= returns.length * bandwidth * Math.sqrt(2 * Math.PI);
            kdePoints.push({ x: +x.toFixed(3), y: +density.toFixed(6) });
        }

        // Normal distribution overlay
        const normalPoints = kdePoints.map((p) => {
            const z = (p.x - mean) / std;
            return +(Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI))).toFixed(6);
        });

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (params: { seriesName: string; value: number; name: string }[]) => {
                    const lines = params.map((p) =>
                        `${p.seriesName}: <b>${p.value.toFixed(2)}%</b>`
                    );
                    return `Return: <b>${params[0]?.name}%</b><br/>${lines.join("<br/>")}`;
                },
            },
            legend: {
                top: 0, right: 0, textStyle: { fontSize: 9, color: "#64748b" },
                icon: "roundRect", itemWidth: 10, itemHeight: 5,
            },
            grid: { top: 30, bottom: 28, left: 10, right: 10 },
            xAxis: {
                type: "category" as const, data: kdePoints.map((p) => p.x.toFixed(1)),
                axisLabel: { fontSize: 8, color: "#94a3b8", interval: Math.floor(steps / 8), fontFamily: "Roboto Mono,monospace" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const, show: false,
            },
            series: [
                {
                    name: "Mật độ thực tế", type: "line" as const,
                    data: kdePoints.map((p) => p.y), symbol: "none", smooth: true,
                    lineStyle: { color: "#3b82f6", width: 2.5 },
                    areaStyle: { color: "#3b82f622" },
                },
                {
                    name: "Phân phối chuẩn", type: "line" as const,
                    data: normalPoints, symbol: "none", smooth: true,
                    lineStyle: { color: "#f59e0b", width: 1.5, type: "dashed" as const },
                },
            ],
            markLine: {
                silent: true,
                data: [
                    { xAxis: kdePoints.findIndex((p) => p.x >= var95).toString() },
                    { xAxis: kdePoints.findIndex((p) => p.x >= var99).toString() },
                ],
            },
        };
    }, [priceHistory]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Density</div>;

    // Compute stats for display
    const closes = priceHistory.map((p) => p.close).filter(Boolean);
    const rets: number[] = [];
    for (let i = 1; i < closes.length; i++) rets.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const std = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length);
    const sorted = [...rets].sort((a, b) => a - b);
    const var95 = sorted[Math.floor(rets.length * 0.05)];
    const var99 = sorted[Math.floor(rets.length * 0.01)];

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: "TB Return", value: `${mean.toFixed(2)}%`, color: mean >= 0 ? "text-green-600" : "text-red-500" },
                    { label: "Biến động (σ)", value: `${std.toFixed(2)}%`, color: std < 2 ? "text-green-600" : std < 3.5 ? "text-amber-600" : "text-red-500" },
                    { label: "VaR 95%", value: `${var95.toFixed(2)}%`, color: "text-amber-600" },
                    { label: "VaR 99%", value: `${var99.toFixed(2)}%`, color: "text-red-500" },
                ].map((it) => (
                    <div key={it.label} className="bg-muted/50 rounded-lg border border-border/50 p-2 text-center">
                        <div className="text-[8px] font-semibold text-muted-foreground uppercase">{it.label}</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 ${it.color}`}>{it.value}</div>
                    </div>
                ))}
            </div>
            <ReactECharts option={option} style={{ height: 220 }} />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════════
export default function DashboardTab() {
    const { ticker, stockInfo } = useStockDetail();
    // If year selected, we fetch that year's quarters (usually 4). If not, we fetch default 12 periods.
    // If backend logic handles "year" param correctly, "periods" might be ignored or used as fallback.
    const { data: ratios, loading: ratioLoading } = useFinancialRatios(ticker, 12);
    const { data: reportData, loading: reportLoading } = useFinancialReports(ticker, 12);

    const { data: quantData, loading: quantLoading } = useQuantAnalysis(ticker);
    const { data: valuationData, loading: valuationLoading } = useValuation(ticker);

    const latestRatio = (ratios && ratios.length > 0) ? ratios[0] : null;

    return (
        <div className="space-y-6 font-sans pb-12">
            {/* ── PHẦN 1: HEADER & KPI ── */}
            <div className="py-2 mb-4 border-b">
                <div className="flex flex-col gap-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                Dashboard — <span className="text-blue-600">{ticker}</span>
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {stockInfo.companyName} • {stockInfo.exchange}
                                {stockInfo.sector ? ` • ${stockInfo.sector}` : ""}
                            </p>
                        </div>
                        
                        {/* Evaluation badges */}
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap gap-1.5 justify-end">
                                {stockInfo.evaluation.fundamentalAnalysis && (
                                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                        📊 Cơ bản: {stockInfo.evaluation.fundamentalAnalysis}
                                    </span>
                                )}
                                {stockInfo.evaluation.technicalAnalysis && (
                                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                        📈 Kỹ thuật: {stockInfo.evaluation.technicalAnalysis}
                                    </span>
                                )}
                                {stockInfo.evaluation.valuation && (
                                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                        💰 Định giá: {stockInfo.evaluation.valuation}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="w-full">
                        {ratioLoading && !ratios
                            ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">{Array(7).fill(0).map((_, i) => <Skel key={i} h="h-16" />)}</div>
                            : <KpiStrip ratios={ratios ?? null} reportData={reportData ?? null} />
                        }
                    </div>
                </div>
            </div>

            {/* ── PHẦN 2: ĐỊNH GIÁ ĐA CHIỀU ── */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wider">
                    <span className="bg-primary/10 text-primary p-1 rounded">1</span>
                    Định giá Đa chiều
                </h3>

                {/* Full Valuation Dashboard */}
                {valuationLoading && !valuationData
                    ? (
                        <Card>
                            <div className="space-y-3 py-4">
                                {Array(5).fill(0).map((_, i) => <Skel key={i} h="h-14" />)}
                            </div>
                        </Card>
                    )
                    : valuationData
                    ? <ValuationDashboardSection valuationData={valuationData} />
                    : (
                        <Card>
                            <p className="text-center py-6 text-sm text-muted-foreground">Không có dữ liệu định giá</p>
                        </Card>
                    )
                }

            </div>

            {/* ── PHẦN 3: PHÂN TÍCH CƠ BẢN (CHƯƠNG 1 & 2) ── */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wider">
                    <span className="bg-primary/10 text-primary p-1 rounded">2</span>
                    Sức khỏe Tài chính & Dự báo khủng hoảng
                </h3>

                {/* Nửa trên (Kinh doanh) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <Card className="lg:col-span-7 flex flex-col">
                        <SectionHead icon="📊" title="Doanh thu & Lợi nhuận" sub="8 quý gần nhất — tỷ VND" />
                        <div className="flex-1 min-h-0">
                            {reportLoading && !reportData
                                ? <Skel h="h-52" />
                                : <RevenueProfitChart reportData={reportData ?? null} />
                            }
                        </div>
                    </Card>
                    <Card className="lg:col-span-5 flex flex-col">
                        <SectionHead icon="📉" title="Xu hướng tỷ suất sinh lời" sub="ROE / ROA / Biên LN ròng / Biên gộp" />
                        <div className="flex-1">
                            {ratioLoading && !ratios
                                ? <Skel h="h-44" />
                                : <RatioTrendChart ratios={ratios ?? null} reportData={reportData ?? null} />
                            }
                        </div>
                        {/* Health scorecard mini at bottom corner */}
                        {latestRatio && (
                            <div className="mt-auto pt-3 border-t">
                                <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Chỉ số sức khỏe tài chính</p>
                                <HealthScorecard ratios={ratios ?? null} reportData={reportData ?? null} />
                            </div>
                        )}
                    </Card>
                </div>

                {/* Nửa dưới (Sức khỏe) - Piotroski bên trái, Altman & DuPont xếp dọc bên phải */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* LEFT COLUMN: Piotroski F-Score */}
                    <Card className="lg:col-span-7">
                        <SectionHead icon="🏅" title="Piotroski F-Score" sub="Chấm điểm cơ bản 9 tiêu chí" />
                        <div>
                            {(reportLoading || ratioLoading) && !reportData
                                ? <Skel h="h-48" />
                                : <PiotroskiFScore reportData={reportData ?? null} ratios={ratios ?? null} />
                            }
                        </div>
                    </Card>

                    {/* RIGHT COLUMN: Stacked Altman & DuPont */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <Card className="flex flex-col">
                            <SectionHead icon="📐" title="Altman Z-Score" sub="Rủi ro phá sản" />
                            <div>
                                {(reportLoading || ratioLoading) && !reportData
                                    ? <Skel h="h-48" />
                                    : <AltmanZScoreGauge reportData={reportData ?? null} ratios={ratios ?? null} />
                                }
                            </div>
                        </Card>
                        <Card className="flex flex-col">
                            <SectionHead icon="🧮" title="DuPont ROE" sub="Phân rã 5 nhân tố" />
                            <div>
                                {reportLoading && !reportData
                                    ? <Skel h="h-48" />
                                    : <DuPontDecomposition reportData={reportData ?? null} />
                                }
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ── PHẦN 4: RỦI RO ĐỊNH LƯỢNG (CHƯƠNG 4) ── */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wider">
                    <span className="bg-primary/10 text-primary p-1 rounded">3</span>
                    Rủi ro & Định lượng (Quants)
                </h3>

                {/* Hàng đầu: YTD và Rủi ro */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <Card className="lg:col-span-6">
                        <SectionHead icon="📈" title="Hiệu suất từ đầu năm (YTD)" sub={`${stockInfo.ticker} — Lợi nhuận tích lũy ${new Date().getFullYear()}`} />
                        <YtdPerformance />
                    </Card>
                    <Card className="lg:col-span-6">
                        <SectionHead icon="⚠️" title="Phân tích rủi ro" sub="Quant metrics · VaR · Drawdown" />
                        {quantLoading && !quantData
                            ? <div className="animate-pulse space-y-2">{Array(4).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div>
                            : <QuantSnapshot quantData={quantData ?? null} />
                        }
                    </Card>
                </div>

                {/* Hàng giữa: Drawdown */}
                <Card>
                    <SectionHead icon="📉" title="Biểu đồ Drawdown" sub="Mức sụt giảm từ đỉnh gần nhất" />
                    {quantLoading && !quantData
                        ? <Skel h="h-52" />
                        : <DrawdownChart drawdownData={quantData?.drawdownData} />
                    }
                </Card>

                {/* Hàng cuối: KDE & Histogram */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <Card className="lg:col-span-6">
                        <SectionHead icon="🔬" title="Mật độ nhạy cảm giá" sub="KDE vs Phân phối chuẩn · VaR markers" />
                        <PriceSensitivityDensity />
                    </Card>
                    <Card className="lg:col-span-6">
                        <SectionHead icon="📊" title="Phân phối lợi nhuận ngày" sub="Histogram — thống kê μ, σ, Skew, Kurtosis" />
                        <ReturnHistogram />
                    </Card>
                </div>

                {/* Hàng Monte Carlo */}
                <Card noPad>
                    <div className="px-4 pt-4 pb-1">
                        <SectionHead
                            icon="🎲"
                            title="Mô phỏng Monte Carlo"
                            sub={`10,000 kịch bản · phân phối Normal/Log-Normal · stress test danh mục — ${stockInfo.ticker}`}
                        />
                    </div>
                    <MonteCarloSimulation />
                </Card>
            </div>

        </div>
    );
}
