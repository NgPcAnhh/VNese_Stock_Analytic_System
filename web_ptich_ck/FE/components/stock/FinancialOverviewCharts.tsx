"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, PieChart, Activity, DollarSign } from "lucide-react";
import type {
    IncomeStatementItem,
    BalanceSheetItem,
    CashFlowItem,
    FinancialRatioItem,
} from "@/hooks/useStockData";

// --- Helpers ---
const toTy = (v: number) => +(v / 1_000_000_000).toFixed(2);

const fmtTy = (v: number): string => {
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(1);
};

const growthPct = (curr: number, prev: number): number | null => {
    if (prev === 0 || !isFinite(prev)) return null;
    return +((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
};

function chronological(data: IncomeStatementItem[]): IncomeStatementItem[] {
    return [...data].sort((a, b) => {
        if (a.period.year !== b.period.year) return a.period.year - b.period.year;
        return a.period.quarter - b.period.quarter;
    });
}

function annualData(data: IncomeStatementItem[]): IncomeStatementItem[] {
    // Overview charts should show the latest 8 reporting periods (quarterly/annual as available).
    return chronological(data).slice(-8);
}

const C = {
    blue:   "#3B82F6",
    green:  "#10B981",
    amber:  "#F59E0B",
    orange: "#F97316",
    red:    "#EF4444",
    purple: "#8B5CF6",
    indigo: "#6366F1",
};

const GRID = { top: 50, right: 60, bottom: 36, left: 64, containLabel: false };
const AX = { fontSize: 10, color: "#6B7280", fontFamily: "Inter, sans-serif" };

function baseOpt() {
    return {
        animation: true,
        animationDuration: 500,
        tooltip: {
            trigger: "axis" as const,
            backgroundColor: "rgba(255,255,255,0.97)",
            borderColor: "#E5E7EB",
            borderWidth: 1,
            textStyle: { fontSize: 12, color: "#374151", fontFamily: "Inter, sans-serif" },
            axisPointer: { type: "shadow" as const },
        },
        grid: GRID,
    };
}

// ---- 1. Revenue & Growth -----
function RevenueGrowthChart({ data, registerChart }: { data: IncomeStatementItem[]; registerChart?: (key: string) => (instance: any) => void }) {
    const rows = useMemo(() => annualData(data), [data]);
    const option = useMemo(() => {
        const labels = rows.map((d) => d.period.period);
        const revTy  = rows.map((d) => +toTy(d.revenue).toFixed(1));
        const growth = rows.map((d, i) => i === 0 ? null : growthPct(d.revenue, rows[i - 1].revenue));
        return {
            ...baseOpt(),
            legend: { data: ["Doanh thu (t\u1ef7)", "T\u0103ng tr\u01b0\u1edfng (%)"], top: 4, textStyle: { fontSize: 11, fontFamily: "Inter, sans-serif" }, itemGap: 16 },
            xAxis: { type: "category" as const, data: labels, axisLabel: { ...AX, rotate: 30 }, axisTick: { alignWithLabel: true } },
            yAxis: [
                { type: "value" as const, name: "T\u1ef7 VND", nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }, axisLabel: { formatter: (v: number) => fmtTy(v), ...AX }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
                { type: "value" as const, name: "T\u0103ng tr\u01b0\u1edfng", nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }, axisLabel: { formatter: (v: number) => `${v}%`, ...AX }, splitLine: { show: false } },
            ],
            series: [
                { name: "Doanh thu (t\u1ef7)", type: "bar" as const, yAxisIndex: 0, data: revTy, barMaxWidth: 40, itemStyle: { color: C.blue, borderRadius: [4, 4, 0, 0] }, tooltip: { valueFormatter: (v: number) => `${v.toLocaleString("vi-VN")} t\u1ef7` } },
                { name: "T\u0103ng tr\u01b0\u1edfng (%)", type: "line" as const, yAxisIndex: 1, data: growth, smooth: true, symbol: "circle", symbolSize: 7, lineStyle: { color: C.amber, width: 2 }, itemStyle: { color: C.amber }, connectNulls: false, tooltip: { valueFormatter: (v: number | null) => v == null ? "-" : `${v > 0 ? "+" : ""}${v}%` } },
            ],
        };
    }, [rows]);
    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    Doanh thu &amp; Tăng trưởng doanh thu
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
                <ReactECharts option={option} style={{ height: 280 }} opts={{ devicePixelRatio: 2 }} onChartReady={registerChart?.("RevenueGrowthChart")} />
            </CardContent>
        </Card>
    );
}

// ---- 2. Net Profit & Growth (last 8) ----
function ProfitGrowthChart({ data, registerChart }: { data: IncomeStatementItem[]; registerChart?: (key: string) => (instance: any) => void }) {
    const rows = useMemo(() => annualData(data).slice(-8), [data]);
    const option = useMemo(() => {
        const labels = rows.map((d) => d.period.period);
        const profTy = rows.map((d) => +toTy(d.netProfit).toFixed(1));
        const growth = rows.map((d, i) => i === 0 ? null : growthPct(d.netProfit, rows[i - 1].netProfit));
        return {
            ...baseOpt(),
            legend: { data: ["LNST (t\u1ef7)", "T\u0103ng tr\u01b0\u1edfng (%)"], top: 4, textStyle: { fontSize: 11, fontFamily: "Inter, sans-serif" }, itemGap: 16 },
            xAxis: { type: "category" as const, data: labels, axisLabel: { ...AX, rotate: 30 }, axisTick: { alignWithLabel: true } },
            yAxis: [
                { type: "value" as const, name: "T\u1ef7 VND", nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }, axisLabel: { formatter: (v: number) => fmtTy(v), ...AX }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
                { type: "value" as const, name: "T\u0103ng tr\u01b0\u1edfng", nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }, axisLabel: { formatter: (v: number) => `${v}%`, ...AX }, splitLine: { show: false } },
            ],
            series: [
                { name: "LNST (t\u1ef7)", type: "bar" as const, yAxisIndex: 0, data: profTy.map((v) => ({ value: v, itemStyle: { color: v >= 0 ? C.green : C.red, borderRadius: v >= 0 ? [4,4,0,0] : [0,0,4,4] } })), barMaxWidth: 40, tooltip: { valueFormatter: (v: number) => `${v.toLocaleString("vi-VN")} t\u1ef7` } },
                { name: "T\u0103ng tr\u01b0\u1edfng (%)", type: "line" as const, yAxisIndex: 1, data: growth, smooth: true, symbol: "circle", symbolSize: 7, lineStyle: { color: C.orange, width: 2 }, itemStyle: { color: C.orange }, connectNulls: false, tooltip: { valueFormatter: (v: number | null) => v == null ? "-" : `${v > 0 ? "+" : ""}${v}%` } },
            ],
        };
    }, [rows]);
    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Lợi nhuận &amp; Tăng trưởng lợi nhuận (8 kỳ)
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
                <ReactECharts option={option} style={{ height: 280 }} opts={{ devicePixelRatio: 2 }} onChartReady={registerChart?.("ProfitGrowthChart")} />
            </CardContent>
        </Card>
    );
}

// ---- 3a. Revenue Structure ----
function RevenueStructureChart({ data, registerChart }: { data: IncomeStatementItem[]; registerChart?: (key: string) => (instance: any) => void }) {
    const rows = useMemo(() => annualData(data), [data]);
    const option = useMemo(() => {
        const labels  = rows.map((d) => d.period.period);
        const revenue = rows.map((d) => +toTy(Math.abs(d.revenue)).toFixed(1));
        const finInc  = rows.map((d) => +toTy(Math.abs(d.financialIncome)).toFixed(1));
        const extraordinaryInc = rows.map((d) => +toTy(Math.abs(d.extraordinaryIncome ?? 0)).toFixed(1));
        const otherInc = rows.map((d) => +toTy(Math.abs(d.otherIncome ?? 0)).toFixed(1));
        const mkS = (name: string, dt: number[], color: string) => ({
            name, type: "bar" as const, stack: "revenue", data: dt, barMaxWidth: 48,
            itemStyle: { color }, emphasis: { focus: "series" as const },
            tooltip: { valueFormatter: (v: number) => `${v.toLocaleString("vi-VN")} tỷ` },
        });
        return {
            ...baseOpt(),
            legend: { data: ["Doanh thu thuần", "Doanh thu tài chính", "Thu nhập bất thường / không thường xuyên", "Thu nhập khác"], top: 4, textStyle: { fontSize: 11, fontFamily: "Inter, sans-serif" }, itemGap: 12 },
            xAxis: { type: "category" as const, data: labels, axisLabel: { ...AX, rotate: 30 }, axisTick: { alignWithLabel: true } },
            yAxis: { type: "value" as const, name: "Tỷ VND", nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }, axisLabel: { formatter: (v: number) => fmtTy(v), ...AX }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
            series: [
                mkS("Doanh thu thuần", revenue, C.blue),
                mkS("Doanh thu tài chính", finInc, C.green),
                mkS("Thu nhập bất thường / không thường xuyên", extraordinaryInc, C.orange),
                mkS("Thu nhập khác", otherInc, C.indigo),
            ],
        };
    }, [rows]);
    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-500" />
                    Cơ cấu doanh thu qua các năm
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
                <ReactECharts option={option} style={{ height: 280 }} opts={{ devicePixelRatio: 2 }} onChartReady={registerChart?.("RevenueStructureChart")} />
            </CardContent>
        </Card>
    );
}

// ---- 3. Cost Structure ----
function CostStructureChart({ data, registerChart }: { data: IncomeStatementItem[]; registerChart?: (key: string) => (instance: any) => void }) {
    const rows = useMemo(() => annualData(data), [data]);
    const option = useMemo(() => {
        const labels  = rows.map((d) => d.period.period);
        const cogs    = rows.map((d) => +toTy(Math.abs(d.costOfGoodsSold)).toFixed(1));
        const selling = rows.map((d) => +toTy(Math.abs(d.sellingExpenses)).toFixed(1));
        const admin   = rows.map((d) => +toTy(Math.abs(d.adminExpenses)).toFixed(1));
        const fin     = rows.map((d) => +toTy(Math.abs(d.financialExpenses)).toFixed(1));
        const otherExpense = rows.map((d) => +toTy(Math.abs(d.otherExpense ?? 0)).toFixed(1));
        const currentTax = rows.map((d) => +toTy(Math.abs(d.currentIncomeTaxExpense ?? d.incomeTax ?? 0)).toFixed(1));
        const deferredTax = rows.map((d) => +toTy(Math.abs(d.deferredIncomeTaxExpense ?? 0)).toFixed(1));
        const mkS = (name: string, dt: number[], color: string) => ({
            name, type: "bar" as const, stack: "cost", data: dt, barMaxWidth: 48,
            itemStyle: { color }, emphasis: { focus: "series" as const },
            tooltip: { valueFormatter: (v: number) => `${v.toLocaleString("vi-VN")} t\u1ef7` },
        });
        return {
            ...baseOpt(),
            legend: { data: ["Giá vốn hàng bán", "Chi phí bán hàng", "Chi phí quản lý doanh nghiệp", "Chi phí tài chính", "Chi phí khác", "Chi phí thuế TNDN hiện hành", "Chi phí thuế TNDN hoãn lại"], top: 4, textStyle: { fontSize: 11, fontFamily: "Inter, sans-serif" }, itemGap: 12 },
            xAxis: { type: "category" as const, data: labels, axisLabel: { ...AX, rotate: 30 }, axisTick: { alignWithLabel: true } },
            yAxis: { type: "value" as const, name: "T\u1ef7 VND", nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }, axisLabel: { formatter: (v: number) => fmtTy(v), ...AX }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
            series: [
                mkS("Giá vốn hàng bán", cogs, C.red),
                mkS("Chi phí bán hàng", selling, C.orange),
                mkS("Chi phí quản lý doanh nghiệp", admin, C.purple),
                mkS("Chi phí tài chính", fin, C.amber),
                mkS("Chi phí khác", otherExpense, C.indigo),
                mkS("Chi phí thuế TNDN hiện hành", currentTax, C.blue),
                mkS("Chi phí thuế TNDN hoãn lại", deferredTax, C.green),
            ],
        };
    }, [rows]);
    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-500" />
                    Cơ cấu chi phí qua các năm
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
                <ReactECharts option={option} style={{ height: 280 }} opts={{ devicePixelRatio: 2 }} onChartReady={registerChart?.("CostStructureChart")} />
            </CardContent>
        </Card>
    );
}

// ---- 4. Financial Indices ----
function FinancialIndicesChart({ data, ratios, registerChart }: { data: IncomeStatementItem[]; ratios?: FinancialRatioItem[]; registerChart?: (key: string) => (instance: any) => void }) {
    const rows = useMemo(() => annualData(data), [data]);
    const epsMap = useMemo(() => {
        const m = new Map<string, number>();
        if (ratios) for (const r of ratios) if (r.eps != null) m.set(`${r.year}_${r.quarter}`, r.eps);
        return m;
    }, [ratios]);
    const option = useMemo(() => {
        const labels      = rows.map((d) => d.period.period);
        const grossMargin = rows.map((d) => d.revenue !== 0 ? +((d.grossProfit / d.revenue) * 100).toFixed(2) : null);
        const netMargin   = rows.map((d) => d.revenue !== 0 ? +((d.netProfit  / d.revenue) * 100).toFixed(2) : null);
        const ebitMargin  = rows.map((d) => d.revenue !== 0 ? +((d.operatingProfit / d.revenue) * 100).toFixed(2) : null);
        const eps         = rows.map((d) => {
            const v = epsMap.get(`${d.period.year}_${d.period.quarter}`);
            return v ?? (d.eps && d.eps !== 0 ? d.eps : null);
        });
        const hasEps = eps.some((v) => v != null && v !== 0);
        const mkL = (name: string, dt: (number | null)[], color: string, yIdx = 0, dashed = false) => ({
            name, type: "line" as const, yAxisIndex: yIdx, data: dt, smooth: true,
            symbol: "circle", symbolSize: 6,
            lineStyle: { color, width: 2, type: dashed ? "dashed" as const : "solid" as const },
            itemStyle: { color }, connectNulls: false,
            tooltip: { valueFormatter: (v: number | null) => v == null ? "-" : yIdx === 0 ? `${v.toFixed(1)}%` : v.toLocaleString("vi-VN") },
        });
        const legendItems = ["Bi\u00ean g\u1ed9p", "Bi\u00ean r\u00f2ng", "Bi\u00ean EBIT"];
        if (hasEps) legendItems.push("EPS (VND)");
        const yAxes: object[] = [
            { type: "value" as const, name: "T\u1ef7 l\u1ec7 (%)", nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }, axisLabel: { formatter: (v: number) => `${v}%`, ...AX }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
        ];
        if (hasEps) yAxes.push({ type: "value" as const, name: "EPS (VND)", nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }, axisLabel: { formatter: (v: number) => v.toLocaleString("vi-VN"), ...AX }, splitLine: { show: false } });
        const series: object[] = [mkL("Bi\u00ean g\u1ed9p", grossMargin, C.blue), mkL("Bi\u00ean r\u00f2ng", netMargin, C.green), mkL("Bi\u00ean EBIT", ebitMargin, C.orange)];
        if (hasEps) series.push(mkL("EPS (VND)", eps, C.purple, 1, true));
        return {
            ...baseOpt(),
            legend: { data: legendItems, top: 4, textStyle: { fontSize: 11, fontFamily: "Inter, sans-serif" }, itemGap: 14 },
            xAxis: { type: "category" as const, data: labels, axisLabel: { ...AX, rotate: 30 }, axisTick: { alignWithLabel: true } },
            yAxis: yAxes, series,
        };
    }, [rows, epsMap]);
    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    Chỉ số tài chính qua các năm
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">(biên lợi nhuận &amp; EPS)</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
                <ReactECharts option={option} style={{ height: 280 }} opts={{ devicePixelRatio: 2 }} onChartReady={registerChart?.("FinancialIndicesChart")} />
            </CardContent>
        </Card>
    );
}

// ---- 5. Profit Before Tax ----
function ProfitBeforeTaxChart({ data, registerChart }: { data: IncomeStatementItem[]; registerChart?: (key: string) => (instance: any) => void }) {
    const rows = useMemo(() => annualData(data), [data]);
    const option = useMemo(() => {
        const labels       = rows.map((d) => d.period.period);
        const grossProfit  = rows.map((d) => +toTy(d.grossProfit).toFixed(1));
        const opProfit     = rows.map((d) => +toTy(d.operatingProfit).toFixed(1));
        const pbt          = rows.map((d) => +toTy(d.profitBeforeTax).toFixed(1));
        const netProfit    = rows.map((d) => +toTy(d.netProfit).toFixed(1));
        const netParent    = rows.map((d) => +toTy(d.netProfitParent).toFixed(1));
        // YoY growth của LNST làm đường tham chiếu
        const growthLNST   = rows.map((d, i) => i === 0 ? null : growthPct(d.netProfit, rows[i - 1].netProfit));

        const mkBar = (name: string, dt: number[], color: string, r = [4,4,0,0]) => ({
            name,
            type: "bar" as const,
            yAxisIndex: 0,
            data: dt.map((v) => ({
                value: v,
                itemStyle: { color: v >= 0 ? color : C.red, borderRadius: v >= 0 ? r : [0,0,4,4] },
            })),
            barMaxWidth: 18,
            tooltip: { valueFormatter: (v: number) => `${v.toLocaleString("vi-VN")} tỷ` },
        });

        return {
            ...baseOpt(),
            grid: { top: 50, right: 60, bottom: 60, left: 64, containLabel: false },
            dataZoom: [
                {
                    type: "slider" as const,
                    xAxisIndex: 0,
                    bottom: 4,
                    height: 18,
                    borderColor: "#E5E7EB",
                    fillerColor: "rgba(99,102,241,0.1)",
                    handleStyle: { color: "#6366F1", borderColor: "#6366F1" },
                    moveHandleStyle: { color: "#6366F1" },
                    textStyle: { fontSize: 9, color: "#9CA3AF", fontFamily: "Inter, sans-serif" },
                    brushSelect: false,
                    showDetail: false,
                },
                {
                    type: "inside" as const,
                    xAxisIndex: 0,
                    zoomOnMouseWheel: true,
                    moveOnMouseMove: true,
                },
            ],
            legend: {
                data: ["LN gộp", "LN HĐKD", "LN trước thuế", "LNST", "LNST CĐCTM", "Tăng trưởng LNST (%)"],
                top: 4,
                textStyle: { fontSize: 10, fontFamily: "Inter, sans-serif" },
                itemGap: 10,
            },
            xAxis: {
                type: "category" as const,
                data: labels,
                axisLabel: { ...AX, rotate: 30 },
                axisTick: { alignWithLabel: true },
            },
            yAxis: [
                {
                    type: "value" as const,
                    name: "Tỷ VND",
                    nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" },
                    axisLabel: { formatter: (v: number) => fmtTy(v), ...AX },
                    splitLine: { lineStyle: { color: "#F3F4F6" } },
                },
                {
                    type: "value" as const,
                    name: "Tăng trưởng",
                    nameTextStyle: { fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" },
                    axisLabel: { formatter: (v: number) => `${v}%`, ...AX },
                    splitLine: { show: false },
                },
            ],
            series: [
                mkBar("LN gộp",         grossProfit, "#10B981"),
                mkBar("LN HĐKD",        opProfit,    "#06B6D4"),
                mkBar("LN trước thuế",  pbt,         C.indigo),
                mkBar("LNST",           netProfit,   C.blue),
                mkBar("LNST CĐCTM",     netParent,   "#8B5CF6"),
                {
                    name: "Tăng trưởng LNST (%)",
                    type: "line" as const,
                    yAxisIndex: 1,
                    data: growthLNST,
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 7,
                    lineStyle: { color: C.amber, width: 2 },
                    itemStyle: { color: C.amber },
                    connectNulls: false,
                    tooltip: {
                        valueFormatter: (v: number | null) =>
                            v == null ? "-" : `${v > 0 ? "+" : ""}${v}%`,
                    },
                },
            ],
        };
    }, [rows]);
    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    Các tầng lợi nhuận qua các năm
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                        (gộp · HĐKD · trước thuế · sau thuế)
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
                <ReactECharts option={option} style={{ height: 320 }} opts={{ devicePixelRatio: 2 }} onChartReady={registerChart?.("ProfitBeforeTaxChart")} />
            </CardContent>
        </Card>
    );
}

// ---- KPI Summary Cards ----
function KPISummaryCards({
    data,
    ratios,
}: {
    data: IncomeStatementItem[];
    ratios?: FinancialRatioItem[];
}) {
    const annual = useMemo(() => annualData(data), [data]);
    const latest = annual[annual.length - 1];
    const prevYr = annual.length >= 2 ? annual[annual.length - 2] : null;

    if (!latest) return null;

    const latestRatio = ratios?.find(
        (r) => r.year === latest.period.year && r.quarter === latest.period.quarter,
    );

    const grossMarginPct =
        latest.revenue !== 0 ? +((latest.grossProfit / latest.revenue) * 100).toFixed(1) : 0;
    const netMarginPct =
        latest.revenue !== 0 ? +((latest.netProfit / latest.revenue) * 100).toFixed(1) : 0;
    const opMarginPct =
        latest.revenue !== 0 ? +((latest.operatingProfit / latest.revenue) * 100).toFixed(1) : 0;
    const totalCost =
        Math.abs(latest.costOfGoodsSold) +
        Math.abs(latest.sellingExpenses) +
        Math.abs(latest.adminExpenses) +
        Math.abs(latest.financialExpenses);
    const eps = latestRatio?.eps ?? (latest.eps !== 0 ? latest.eps : null);

    const yoy = (curr: number, prev: number | undefined): number | null => {
        if (!prev || prev === 0) return null;
        return +(((curr - prev) / Math.abs(prev)) * 100).toFixed(1);
    };

    type KpiColor = "blue" | "emerald" | "teal" | "indigo" | "green" | "amber" | "purple" | "rose" | "red";
    interface KpiDef {
        label: string;
        value: string;
        change: number | null;
        isPoint?: boolean;
        color: KpiColor;
    }

    const kpis: KpiDef[] = [
        {
            label: "Doanh thu thuần",
            value: `${fmtTy(toTy(latest.revenue))} tỷ`,
            change: yoy(latest.revenue, prevYr?.revenue),
            color: "blue",
        },
        {
            label: "Lợi nhuận gộp",
            value: `${fmtTy(toTy(latest.grossProfit))} tỷ`,
            change: yoy(latest.grossProfit, prevYr?.grossProfit),
            color: "emerald",
        },
        {
            label: "LN hoạt động",
            value: `${fmtTy(toTy(latest.operatingProfit))} tỷ`,
            change: yoy(latest.operatingProfit, prevYr?.operatingProfit),
            color: "teal",
        },
        {
            label: "LN trước thuế",
            value: `${fmtTy(toTy(latest.profitBeforeTax))} tỷ`,
            change: yoy(latest.profitBeforeTax, prevYr?.profitBeforeTax),
            color: "indigo",
        },
        {
            label: "LNST",
            value: `${fmtTy(toTy(latest.netProfit))} tỷ`,
            change: yoy(latest.netProfit, prevYr?.netProfit),
            color: "green",
        },
        {
            label: "Tổng chi phí",
            value: `${fmtTy(toTy(totalCost))} tỷ`,
            change: prevYr
                ? yoy(
                      totalCost,
                      Math.abs(prevYr.costOfGoodsSold) +
                          Math.abs(prevYr.sellingExpenses) +
                          Math.abs(prevYr.adminExpenses) +
                          Math.abs(prevYr.financialExpenses),
                  )
                : null,
            color: "red",
        },
        {
            label: "Biên LN gộp",
            value: `${grossMarginPct}%`,
            change:
                prevYr && prevYr.revenue !== 0
                    ? +((grossMarginPct - (prevYr.grossProfit / prevYr.revenue) * 100).toFixed(1))
                    : null,
            isPoint: true,
            color: "amber",
        },
        {
            label: "Biên LN HĐKD",
            value: `${opMarginPct}%`,
            change:
                prevYr && prevYr.revenue !== 0
                    ? +((opMarginPct - (prevYr.operatingProfit / prevYr.revenue) * 100).toFixed(1))
                    : null,
            isPoint: true,
            color: "purple",
        },
        {
            label: "Biên LN ròng",
            value: `${netMarginPct}%`,
            change:
                prevYr && prevYr.revenue !== 0
                    ? +((netMarginPct - (prevYr.netProfit / prevYr.revenue) * 100).toFixed(1))
                    : null,
            isPoint: true,
            color: "rose",
        },
        {
            label: "EPS",
            value: eps != null ? eps.toLocaleString("vi-VN") : "—",
            change: null,
            color: "indigo",
        },
    ];

    const colorMap: Record<KpiColor, { bg: string; border: string; title: string; val: string }> = {
        blue:    { bg: "bg-blue-50",    border: "border-blue-200",    title: "text-blue-500",    val: "text-blue-800"    },
        emerald: { bg: "bg-emerald-50", border: "border-emerald-200", title: "text-emerald-500", val: "text-emerald-800" },
        teal:    { bg: "bg-teal-50",    border: "border-teal-200",    title: "text-teal-500",    val: "text-teal-800"    },
        indigo:  { bg: "bg-indigo-50",  border: "border-indigo-200",  title: "text-indigo-500",  val: "text-indigo-800"  },
        green:   { bg: "bg-green-50",   border: "border-green-200",   title: "text-green-500",   val: "text-green-800"   },
        amber:   { bg: "bg-amber-50",   border: "border-amber-200",   title: "text-amber-500",   val: "text-amber-800"   },
        purple:  { bg: "bg-purple-50",  border: "border-purple-200",  title: "text-purple-500",  val: "text-purple-800"  },
        rose:    { bg: "bg-rose-50",    border: "border-rose-200",    title: "text-rose-500",    val: "text-rose-800"    },
        red:     { bg: "bg-red-50",     border: "border-red-200",     title: "text-red-500",     val: "text-red-800"     },
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">KPI Báo Cáo Tài Chính</span>
                <span className="text-xs text-muted-foreground">• Kỳ gần nhất: {latest.period.period}</span>
                {prevYr && (
                    <span className="text-xs text-muted-foreground">• So sánh với: {prevYr.period.period}</span>
                )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-2">
                {kpis.map((kpi) => {
                    const c = colorMap[kpi.color];
                    return (
                        <div
                            key={kpi.label}
                            className={`rounded-xl border ${c.bg} ${c.border} p-3 flex flex-col gap-0.5`}
                        >
                            <div className={`text-[10px] font-semibold uppercase tracking-wide ${c.title}`}>
                                {kpi.label}
                            </div>
                            <div className={`text-sm font-bold leading-snug ${c.val}`}>{kpi.value}</div>
                            {kpi.change != null && (
                                <div
                                    className={`text-[10px] font-medium ${
                                        kpi.change >= 0 ? "text-green-600" : "text-red-500"
                                    }`}
                                >
                                    {kpi.change >= 0 ? "▲" : "▼"} {Math.abs(kpi.change)}
                                    {kpi.isPoint ? " đpt" : "%"} YoY
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ---- Financial Summary Table ----
function FinancialSummaryTable({ data }: { data: IncomeStatementItem[] }) {
    const annual = useMemo(() => annualData(data), [data]);
    const periods = annual.slice(-6);

    // Track which parent groups are expanded
    const [expanded, setExpanded] = useState<Set<string>>(new Set(["revenue", "gross", "pbt", "net"]));
    const toggle = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    if (periods.length === 0) return null;

    const fmtVal = (v: number) => {
        const ty = toTy(Math.abs(v));
        if (ty >= 1000) return `${(ty / 1000).toFixed(1)}K`;
        if (ty >= 1) return ty.toFixed(1);
        return ty.toFixed(2);
    };

    const yoyLast = (getter: (d: IncomeStatementItem) => number): number | null => {
        if (periods.length < 2) return null;
        return growthPct(getter(periods[periods.length - 1]), getter(periods[periods.length - 2]));
    };

    interface RowDef {
        id: string;
        label: string;
        getter: (d: IncomeStatementItem) => number;
        highlight?: boolean;
        isPct?: boolean;
        negative?: boolean;
        dividerBefore?: boolean;
        isParent?: boolean;  // clickable, toggles children
        parentId?: string;   // hidden when parent is collapsed
        level?: number;      // indent level (0 = none, 1 = child)
    }

    const rows: RowDef[] = [
        // ── Doanh thu ──────────────────────────────────────────────────
        { id: "revenue",     label: "Doanh thu thuần",  getter: (d) => d.revenue,                 highlight: true, isParent: true },
        { id: "cogs",        label: "Giá vốn hàng bán", getter: (d) => Math.abs(d.costOfGoodsSold), negative: true,  parentId: "revenue", level: 1 },
        // ── Lợi nhuận gộp ─────────────────────────────────────────────
        { id: "gross",       label: "Lợi nhuận gộp",   getter: (d) => d.grossProfit,             highlight: true, isParent: true, dividerBefore: true },
        { id: "selling",     label: "Chi phí bán hàng", getter: (d) => Math.abs(d.sellingExpenses), negative: true, parentId: "gross", level: 1 },
        { id: "admin",       label: "Chi phí QLDN",     getter: (d) => Math.abs(d.adminExpenses),   negative: true, parentId: "gross", level: 1 },
        { id: "finExp",      label: "Chi phí tài chính",getter: (d) => Math.abs(d.financialExpenses), negative: true, parentId: "gross", level: 1 },
        { id: "finInc",      label: "Thu nhập TC",      getter: (d) => d.financialIncome,          parentId: "gross", level: 1 },
        // ── LN HĐKD ───────────────────────────────────────────────────
        { id: "opProfit",    label: "LN từ HĐKD",      getter: (d) => d.operatingProfit,          highlight: true, dividerBefore: true },
        // ── LN trước thuế ─────────────────────────────────────────────
        { id: "pbt",         label: "LN trước thuế",   getter: (d) => d.profitBeforeTax,          highlight: true, isParent: true, dividerBefore: true },
        { id: "tax",         label: "Thuế TNDN",        getter: (d) => Math.abs(d.incomeTax),       negative: true, parentId: "pbt", level: 1 },
        // ── LNST ──────────────────────────────────────────────────────
        { id: "net",         label: "LNST",             getter: (d) => d.netProfit,                highlight: true, isParent: true, dividerBefore: true },
        { id: "netParent",   label: "LNST CĐCTM",      getter: (d) => d.netProfitParent,           parentId: "net", level: 1 },
        // ── Biên lợi nhuận ────────────────────────────────────────────
        { id: "grossMargin", label: "Biên LN gộp",     getter: (d) => d.revenue !== 0 ? +((d.grossProfit / d.revenue) * 100).toFixed(1) : 0,      isPct: true, dividerBefore: true },
        { id: "opMargin",    label: "Biên LN HĐKD",    getter: (d) => d.revenue !== 0 ? +((d.operatingProfit / d.revenue) * 100).toFixed(1) : 0,  isPct: true },
        { id: "netMargin",   label: "Biên LN ròng",    getter: (d) => d.revenue !== 0 ? +((d.netProfit / d.revenue) * 100).toFixed(1) : 0,        isPct: true },
    ];

    const expandAll  = () => setExpanded(new Set(rows.filter((r) => r.isParent).map((r) => r.id)));
    const collapseAll = () => setExpanded(new Set());

    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-foreground">
                        Bảng tổng hợp chỉ số tài chính quan trọng
                        <span className="text-[10px] font-normal text-muted-foreground ml-2">(đơn vị: tỷ VND)</span>
                    </CardTitle>
                    <div className="flex gap-2 text-[11px]">
                        <button onClick={expandAll}  className="text-indigo-500 hover:text-indigo-700 font-medium">Mở tất cả</button>
                        <span className="text-muted-foreground/50">|</span>
                        <button onClick={collapseAll} className="text-muted-foreground hover:text-foreground font-medium">Thu gọn</button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-2 pb-4 overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                    <thead>
                        <tr className="border-b-2 border-border">
                            <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-44 sticky left-0 bg-card">
                                Chỉ tiêu
                            </th>
                            {periods.map((p) => (
                                <th key={p.period.period} className="text-right py-2 px-2 font-semibold text-muted-foreground whitespace-nowrap">
                                    {p.period.period}
                                </th>
                            ))}
                            <th className="text-right py-2 px-2 font-semibold text-indigo-600 whitespace-nowrap">YoY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            // Hide child rows when parent is collapsed
                            if (row.parentId && !expanded.has(row.parentId)) return null;

                            const yoy    = yoyLast(row.getter);
                            const isOpen = row.isParent && expanded.has(row.id);

                            return (
                                <tr
                                    key={row.id}
                                    onClick={row.isParent ? () => toggle(row.id) : undefined}
                                    className={[
                                        "border-b border-border/50 transition-colors",
                                        row.isParent ? "cursor-pointer select-none" : "",
                                        row.highlight ? "bg-blue-50/50 hover:bg-blue-100/60" : "hover:bg-muted/50",
                                        row.dividerBefore ? "border-t border-t-border" : "",
                                        row.parentId ? "bg-muted/30" : "",
                                    ].join(" ")}
                                >
                                    <td
                                        className={[
                                            "py-1.5 px-2 sticky left-0",
                                            row.highlight ? "bg-blue-50/70 font-semibold text-foreground" : "bg-card text-muted-foreground",
                                            row.parentId ? "bg-muted/50 text-muted-foreground" : "",
                                            row.level === 1 ? "pl-6" : "",
                                        ].join(" ")}
                                    >
                                        <span className="flex items-center gap-1">
                                            {row.isParent && (
                                                <span className={`text-[9px] text-indigo-400 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}>
                                                    ▶
                                                </span>
                                            )}
                                            {row.level === 1 && (
                                                <span className="text-muted-foreground/50 mr-0.5">└</span>
                                            )}
                                            {row.negative && <span className="text-red-400 text-[10px]">(-)</span>}
                                            {row.label}
                                        </span>
                                    </td>
                                    {periods.map((p) => {
                                        const val  = row.getter(p);
                                        const isNeg = !row.isPct && val < 0;
                                        return (
                                            <td
                                                key={p.period.period}
                                                className={[
                                                    "py-1.5 px-2 text-right tabular-nums",
                                                    row.highlight ? "font-semibold" : "",
                                                    row.isPct
                                                        ? val >= 0 ? "text-emerald-700" : "text-red-600"
                                                        : row.negative || isNeg ? "text-red-600" : "text-foreground",
                                                ].join(" ")}
                                            >
                                                {row.isPct ? `${val.toFixed(1)}%` : fmtVal(val)}
                                            </td>
                                        );
                                    })}
                                    <td
                                        className={[
                                            "py-1.5 px-2 text-right tabular-nums font-semibold",
                                            yoy == null ? "text-muted-foreground/50" : yoy >= 0 ? "text-green-600" : "text-red-500",
                                        ].join(" ")}
                                    >
                                        {yoy == null ? "—" : `${yoy >= 0 ? "▲" : "▼"} ${Math.abs(yoy)}%`}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}

// ---- Main Export ----
interface FinancialOverviewChartsProps {
    incomeStatement: IncomeStatementItem[];
    balanceSheet: BalanceSheetItem[];
    cashFlow: CashFlowItem[];
    financialRatios?: FinancialRatioItem[];
    isBank?: boolean;
    registerChart?: (key: string) => (instance: any) => void;
    mode?: "full" | "kpi-only" | "dashboard-only";
}

export default function FinancialOverviewCharts({
    incomeStatement,
    financialRatios,
    registerChart,
    mode = "full",
}: FinancialOverviewChartsProps) {
    if (!incomeStatement.length) {
        return <div className="text-center py-8 text-muted-foreground">Không có dữ liệu để hiển thị biểu đồ.</div>;
    }
    const showKpi = mode !== "dashboard-only";
    const showDashboard = mode !== "kpi-only";

    return (
        <div className="space-y-4 font-sans">
            {showKpi && <KPISummaryCards data={incomeStatement} ratios={financialRatios} />}

            {showDashboard && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <RevenueGrowthChart data={incomeStatement} registerChart={registerChart} />
                        <ProfitGrowthChart data={incomeStatement} registerChart={registerChart} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <RevenueStructureChart data={incomeStatement} registerChart={registerChart} />
                        <CostStructureChart data={incomeStatement} registerChart={registerChart} />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <FinancialIndicesChart data={incomeStatement} ratios={financialRatios} registerChart={registerChart} />
                    </div>
                    <ProfitBeforeTaxChart data={incomeStatement} registerChart={registerChart} />

                    <FinancialSummaryTable data={incomeStatement} />
                </>
            )}
        </div>
    );
}