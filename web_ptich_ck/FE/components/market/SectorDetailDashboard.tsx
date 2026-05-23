"use client";

import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useSectorDetailData } from "@/hooks/useSectorDetailData";
import Link from "next/link";
import { Activity, CircleDollarSign, TrendingUp, TrendingDown } from "lucide-react";

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmt = (n: number | undefined | null) => {
    if (n == null) return "0";
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

interface SectorDetailDashboardProps {
    slug: string;
}

export default function SectorDetailDashboard({ slug }: SectorDetailDashboardProps) {
    const { data, loading, error } = useSectorDetailData(slug);
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: "asc" | "desc";
    } | null>({ key: "tradingValue", direction: "desc" });

    /* ── ALL hooks must run before any early return ───────────────── */
    const sortedStocks = useMemo(() => {
        if (!data?.stocks) return [];
        const items = [...data.stocks];
        if (sortConfig !== null) {
            items.sort((a: any, b: any) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [data?.stocks, sortConfig]);

    /* ── Early returns (after all hooks) ─────────────────────────── */
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center py-12 text-red-500">
                Không thể tải dữ liệu ngành. {error && <span>({error})</span>}
            </div>
        );
    }

    const { kpi, performance, breadth, treemap, liquidity, valuation, liquidityByCap, stocks } = data;

    /* ── Sorting helpers ──────────────────────────────────────────── */
    const requestSort = (key: string) => {
        let direction: "asc" | "desc" = "desc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
            direction = "asc";
        }
        setSortConfig({ key, direction });
    };

    const sortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key)
            return <span className="ml-1 opacity-20">↕</span>;
        return sortConfig.direction === "asc" ? (
            <span className="ml-1 text-orange-500">↑</span>
        ) : (
            <span className="ml-1 text-orange-500">↓</span>
        );
    };

    /* ── ECharts Options ──────────────────────────────────────────── */

    // 1. Performance vs VN-Index
    const perfOption = {
        tooltip: { trigger: "axis", valueFormatter: (v: number) => v?.toFixed(2) + "%" },
        legend: { data: [kpi.sectorName, "VN-Index"], bottom: 0, textStyle: { color: "#94a3b8" } },
        grid: { top: 30, right: 20, bottom: 40, left: 50 },
        xAxis: { type: "category", data: performance.map((p) => p.date), axisLabel: { color: "#94a3b8" } },
        yAxis: { type: "value", axisLabel: { formatter: "{value}%", color: "#94a3b8" }, splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.15)" } } },
        series: [
            { name: kpi.sectorName, data: performance.map((p) => p.sectorReturn), type: "line", itemStyle: { color: "#f97316" }, symbol: "none", smooth: true },
            { name: "VN-Index", data: performance.map((p) => p.vnindexReturn), type: "line", itemStyle: { color: "#64748b" }, symbol: "none", smooth: true, lineStyle: { type: "dashed" } },
        ],
    };

    // 2. Market Breadth (Donut)
    const breadthOption = {
        tooltip: { trigger: "item", formatter: "<strong>Độ rộng ngành</strong><br/>{b}: {c} mã ({d}%)<br/><span style='font-size:11px;color:#94a3b8'>Chi tiết số lượng mã cổ phiếu theo trạng thái giá</span>" },
        legend: { show: false },
        series: [{
            name: "Độ rộng", type: "pie", radius: ["40%", "70%"],
            data: [
                { value: breadth.ceiling, name: "Trần", itemStyle: { color: "#c026d3" } },
                { value: breadth.up, name: "Tăng", itemStyle: { color: "#22c55e" } },
                { value: breadth.ref, name: "TC", itemStyle: { color: "#eab308" } },
                { value: breadth.down, name: "Giảm", itemStyle: { color: "#ef4444" } },
                { value: breadth.floor, name: "Sàn", itemStyle: { color: "#0ea5e9" } },
            ].filter((d) => d.value > 0),
            label: { 
                formatter: (p: any) => `${p.name}\n${p.value} mã\n${Number(p.percent).toFixed(2)}%`, 
                color: "#94a3b8", 
                align: "center", 
                lineHeight: 18 
            },
        }],
    };

    // 3. Treemap — size = marketCap, color = changePercent
    const treemapOption = {
        tooltip: {
            formatter: (info: any) => {
                const t = info.data?.tooltipParams;
                if (!t) return info.name;
                return `<strong>${t.ticker}</strong><br/>Vốn hóa: ${fmt(t.marketCap)} tỷ<br/>Thay đổi: ${t.changePercent > 0 ? "+" : ""}${t.changePercent}%`;
            },
        },
        series: [{
            type: "treemap", roam: true, nodeClick: "zoomToNode", breadcrumb: { show: true, itemStyle: { textStyle: { color: "#94a3b8" } } },
            label: { show: true, formatter: "{b}", fontSize: 13, fontWeight: "bold" },
            itemStyle: { borderColor: "#ffffff", borderWidth: 2, gapWidth: 2 },
            data: treemap.map((t) => {
                const s = stocks.find((stock) => stock.ticker === t.ticker);
                const limit = s?.exchange === "HNX" ? 10 : s?.exchange === "UPCOM" ? 15 : 7;
                return {
                    name: t.ticker, value: t.marketCap, tooltipParams: t,
                    itemStyle: {
                        color: t.changePercent >= limit ? "#c026d3"
                            : t.changePercent > 0 ? "#22c55e"
                            : t.changePercent === 0 ? "#eab308"
                            : t.changePercent <= -limit ? "#0ea5e9"
                            : "#ef4444",
                    },
                };
            }),
        }],
    };

    // 4. Liquidity & Foreign Flow (Bar + Line)
    const liqOption = {
        tooltip: { trigger: "axis" },
        legend: { data: ["GTGD (tỷ)", "NN Net (tỷ)"], bottom: 0, textStyle: { color: "#94a3b8" } },
        grid: { top: 30, right: 50, bottom: 40, left: 60 },
        visualMap: {
            show: false,
            seriesIndex: 1,
            pieces: [
                { min: 0.001, color: "#22c55e" }, // Mua ròng (Xanh)
                { max: 0, color: "#ef4444" }      // Bán ròng (Đỏ)
            ]
        },
        xAxis: { type: "category", data: liquidity.map((l) => l.date), axisLabel: { color: "#94a3b8" } },
        yAxis: [
            { type: "value", name: "GTGD (tỷ)", position: "left", axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.15)" } } },
            { type: "value", name: "NN Net (tỷ)", position: "right", axisLabel: { color: "#94a3b8" }, splitLine: { show: false } },
        ],
        series: [
            { name: "GTGD (tỷ)", type: "bar", data: liquidity.map((l) => l.tradingValue), itemStyle: { color: "#22c55e", borderRadius: [4, 4, 0, 0] } },
            { name: "NN Net (tỷ)", type: "line", yAxisIndex: 1, data: liquidity.map((l) => l.netForeign), smooth: true },
        ],
    };

    // 5. Valuation Scatter (P/B vs ROE)
    const scatterOption = {
        grid: { top: 30, right: 30, bottom: 40, left: 50 },
        tooltip: {
            formatter: (p: any) => {
                const d = p.data;
                return `<strong>${d[2]}</strong><br/>P/B: ${d[0]?.toFixed(2)}<br/>ROE: ${d[1]?.toFixed(2)}%<br/>Vốn hóa: ${fmt(d[3])} tỷ`;
            },
        },
        xAxis: { type: "value", name: "P/B", splitLine: { show: false }, nameTextStyle: { color: "#94a3b8" }, axisLabel: { color: "#94a3b8" } },
        yAxis: { type: "value", name: "ROE (%)", splitLine: { show: false }, nameTextStyle: { color: "#94a3b8" }, axisLabel: { color: "#94a3b8" } },
        series: [{
            type: "scatter",
            data: valuation.map((v) => [v.pb, v.roe, v.ticker, v.marketCap, v.zone]),
            symbolSize: (d: any) => Math.max(10, Math.min(50, Math.sqrt(Math.abs(d[3])) / 2)),
            itemStyle: {
                color: (p: any) => {
                    const z = p.data[4];
                    return z === "attractive" ? "#22c55e" : z === "risk" ? "#ef4444" : "#3b82f6";
                },
                opacity: 0.8,
            },
        }],
    };

    // 6. Liquidity by Cap (Donut)
    const capColors = ["#f97316", "#ef4444", "#f59e0b", "#22c55e", "#0ea5e9"];
    const capOption = {
        tooltip: { trigger: "item", formatter: "<strong>Phân bổ Thanh khoản</strong><br/>{b}: {c} tỷ ({d}%)" },
        legend: { bottom: 0, textStyle: { color: "#94a3b8" } },
        series: [{
            name: "Thanh khoản", type: "pie", radius: ["40%", "70%"],
            label: { show: false },
            data: liquidityByCap.map((c, idx) => ({
                value: c.value,
                name: c.group,
                itemStyle: { color: capColors[idx % capColors.length] },
            })),
        }],
    };

    /* ── Render ────────────────────────────────────────────────────── */
    return (
        <div className="space-y-6">
            {/* Breadcrumb + Header */}
            <div>
                <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Link href="/market" className="hover:text-orange-500 transition-colors">Thị trường</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">{kpi.sectorName}</span>
                </nav>
                <h1 className="text-2xl font-bold text-foreground">{kpi.sectorName} <span className="text-orange-500 ml-1">StockPro</span></h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {kpi.stockCount} mã cổ phiếu • P/B: {kpi.pb || "N/A"} • Vốn hóa: {fmt(kpi.marketCap)} tỷ
                </p>
            </div>

            {/* Zone 1: KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="overflow-hidden border-border"><CardContent className="h-full p-5 flex flex-col justify-center relative">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Thanh khoản 24H</p>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-2xl font-bold tracking-tight">{fmt(kpi.totalTradingValue)}</h2>
                        <span className="text-sm text-muted-foreground">tỷ</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${kpi.tradingValueVsAvg >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"} flex items-center`}>
                            {kpi.tradingValueVsAvg > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {kpi.tradingValueVsAvg > 0 ? "+" : ""}{kpi.tradingValueVsAvg}%
                        </span>
                        <span className="text-xs text-muted-foreground">so với TB 20 phiên</span>
                    </div>
                </CardContent></Card>
                <Card className="overflow-hidden border-border"><CardContent className="h-full p-5 flex flex-col justify-center relative">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-muted-foreground">NN Mua ròng</p>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className={`text-2xl font-bold tracking-tight ${kpi.netForeign > 0 ? "text-green-500" : kpi.netForeign < 0 ? "text-red-500" : ""}`}>
                            {kpi.netForeign > 0 ? "+" : ""}{fmt(kpi.netForeign)}
                        </h2>
                        <span className="text-sm text-muted-foreground">tỷ</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Dòng tiền vốn ngoại phiên gần nhất</p>
                </CardContent></Card>
                {/* RS Score Gauge */}
                <Card className="overflow-hidden border-border"><CardContent className="h-full p-5 flex items-center justify-between">
                    <div className="flex flex-col h-full justify-center">
                        <p className="text-sm font-medium text-muted-foreground mb-1">RS Score</p>
                        <p className="text-xs text-muted-foreground max-w-[120px]">Khả năng sinh lời tương đối</p>
                    </div>
                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted/30" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - kpi.rsScore / 100)}
                                className={kpi.rsScore >= 70 ? "text-green-500" : kpi.rsScore <= 30 ? "text-red-500" : "text-amber-500"} />
                        </svg>
                        <span className="absolute text-lg font-bold tracking-tighter">{Math.round(kpi.rsScore)}</span>
                    </div>
                </CardContent></Card>
                {/* MFI Gauge */}
                <Card className="overflow-hidden border-border"><CardContent className="h-full p-5 flex items-center justify-between">
                    <div className="flex flex-col h-full justify-center">
                        <p className="text-sm font-medium text-muted-foreground mb-1">MFI (Dòng tiền)</p>
                        <p className="text-xs text-muted-foreground max-w-[120px]">Chỉ báo sức mạnh dòng tiền</p>
                    </div>
                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted/30" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - kpi.mfi / 100)}
                                className={kpi.mfi >= 80 ? "text-red-500" : kpi.mfi <= 20 ? "text-green-500" : "text-blue-500"} />
                        </svg>
                        <span className="absolute text-lg font-bold tracking-tighter">{Math.round(kpi.mfi)}</span>
                    </div>
                </CardContent></Card>
            </div>

            {/* Zone 2: Performance & Breadth */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2"><CardContent className="p-4">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><span className="w-1 h-5 bg-orange-500 rounded-full" />Hiệu suất vs VN-Index (6 tháng)</h2>
                    <ReactECharts option={perfOption} style={{ height: "300px" }} />
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><span className="w-1 h-5 bg-orange-500 rounded-full" />Độ rộng ngành (Phiên gần nhất)</h2>
                    <ReactECharts option={breadthOption} style={{ height: "300px" }} />
                </CardContent></Card>
            </div>

            {/* Zone 3: Treemap */}
            <Card><CardContent className="p-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><span className="w-1 h-5 bg-orange-500 rounded-full" />Bản đồ Vốn hóa &amp; Thay đổi Giá (Heatmap)</h2>
                <ReactECharts option={treemapOption} style={{ height: "450px" }} />
            </CardContent></Card>

            {/* Zone 3b: Liquidity */}
            <Card><CardContent className="p-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><span className="w-1 h-5 bg-orange-500 rounded-full" />Thanh khoản &amp; Khối ngoại (30 phiên gần nhất)</h2>
                <ReactECharts option={liqOption} style={{ height: "450px" }} />
            </CardContent></Card>

            {/* Zone 4: Valuation & Cap Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2"><CardContent className="p-4">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><span className="w-1 h-5 bg-orange-500 rounded-full" />Ma trận Định giá P/B vs ROE</h2>
                    {valuation.length > 0 ? (
                        <>
                            <ReactECharts option={scatterOption} style={{ height: "300px" }} />
                            <div className="flex justify-center items-center gap-6 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2" />Hấp dẫn</span>
                                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2" />Cân bằng</span>
                                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2" />Rủi ro</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu định giá P/B cho ngành này.</p>
                    )}
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><span className="w-1 h-5 bg-orange-500 rounded-full" />Phân bổ Thanh khoản</h2>
                    <ReactECharts option={capOption} style={{ height: "300px" }} />
                </CardContent></Card>
            </div>

            {/* Zone 5: Stock List Table */}
            <Card><CardContent className="p-0">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><span className="w-1 h-5 bg-orange-500 rounded-full" />Chi tiết Cổ phiếu ({stocks.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="cursor-pointer select-none" onClick={() => requestSort("ticker")}>Mã {sortIcon("ticker")}</TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => requestSort("price")}>Giá {sortIcon("price")}</TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => requestSort("change1D")}>% 1D {sortIcon("change1D")}</TableHead>
                                <TableHead className="cursor-pointer select-none text-right" onClick={() => requestSort("volume")}>KL Khớp {sortIcon("volume")}</TableHead>
                                <TableHead className="cursor-pointer select-none text-right" onClick={() => requestSort("tradingValue")}>GTGD (tỷ) {sortIcon("tradingValue")}</TableHead>
                                <TableHead className="cursor-pointer select-none text-right" onClick={() => requestSort("foreignBuy")}>NN Mua {sortIcon("foreignBuy")}</TableHead>
                                <TableHead className="cursor-pointer select-none text-right" onClick={() => requestSort("foreignSell")}>NN Bán {sortIcon("foreignSell")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedStocks.map((s) => (
                                <TableRow key={s.ticker}>
                                    <TableCell className="font-medium">
                                        <Link href={`/stock/${s.ticker}`} className="text-orange-500 hover:underline">{s.ticker}</Link>
                                        <span className="ml-2 text-xs text-muted-foreground rounded bg-muted px-1">{s.exchange}</span>
                                    </TableCell>
                                    <TableCell>{fmt(s.price)}</TableCell>
                                    <TableCell className={s.change1D > 0 ? "text-green-500" : s.change1D < 0 ? "text-red-500" : ""}>
                                        {s.change1D > 0 ? "+" : ""}{fmt(s.change1D)}%
                                    </TableCell>
                                    <TableCell className="text-right">{fmt(s.volume)}</TableCell>
                                    <TableCell className="text-right font-medium">{fmt(s.tradingValue)}</TableCell>
                                    <TableCell className="text-right">{fmt(s.foreignBuy)}</TableCell>
                                    <TableCell className="text-right">{fmt(s.foreignSell)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent></Card>
        </div>
    );
}
