"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface OHLCVData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Tên hiển thị cho index
const INDEX_META: Record<string, { name: string }> = {
    VNINDEX: { name: "VN-INDEX" },
    VN30: { name: "VN30" },
    HNXINDEX: { name: "HNX-INDEX" },
    UPCOMINDEX: { name: "UPCOM-INDEX" },
};

// ==================== TIME FRAME ====================
type TimeFrame = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

// ==================== FORMAT HELPERS ====================
function formatDate(dateStr: string, short = false): string {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    if (short) return `${dd}/${mm}`;
    return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatNumber(val: number): string {
    if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
    return val.toLocaleString();
}

function formatPrice(val: number): string {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==================== MA CALC ====================
function calcMA(data: number[], period: number): (number | string)[] {
    const result: (number | string)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push("-");
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(+(sum / period).toFixed(2));
        }
    }
    return result;
}

// ==================== CHART OPTIONS ====================

function getLineChartOption(data: OHLCVData[], ticker: string, darkMode: boolean) {
    const dates = data.map(d => d.date);
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const minPrice = Math.min(...closes) * 0.998;
    const maxPrice = Math.max(...closes) * 1.002;

    const firstPrice = closes[0] || 0;
    const lastPrice = closes[closes.length - 1] || 0;
    const priceChange = lastPrice - firstPrice;
    const isUp = priceChange >= 0;
    const lineColor = isUp ? "#22c55e" : "#ef4444";
    const areaColors = isUp
        ? ["rgba(34,197,94,0.28)", "rgba(34,197,94,0.01)"]
        : ["rgba(239,68,68,0.28)", "rgba(239,68,68,0.01)"];

    return {
        animation: true,
        animationDuration: 600,
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            textStyle: { color: "#1f2937", fontSize: 12 },
            axisPointer: {
                type: "cross",
                lineStyle: { color: "#9ca3af", type: "dashed" },
                crossStyle: { color: "#9ca3af" },
                label: { backgroundColor: "#374151" },
            },
            formatter: (params: any) => {
                const p = params[0];
                const idx = p.dataIndex;
                const d = data[idx];
                if (!d) return "";
                const change = idx > 0 ? d.close - data[idx - 1].close : 0;
                const changePct = idx > 0 && data[idx - 1].close ? ((change / data[idx - 1].close) * 100) : 0;
                const color = change >= 0 ? "#22c55e" : "#ef4444";
                return `
                    <div style="padding:4px 2px">
                        <div style="font-weight:600;margin-bottom:6px;color:#374151">${formatDate(d.date)}</div>
                        <div style="display:flex;justify-content:space-between;gap:24px">
                            <span style="color:#6b7280">Giá đóng cửa</span>
                            <span style="font-weight:600">${formatPrice(d.close)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:24px">
                            <span style="color:#6b7280">Thay đổi</span>
                            <span style="font-weight:600;color:${color}">${change >= 0 ? "+" : ""}${change.toFixed(2)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:24px">
                            <span style="color:#6b7280">Khối lượng</span>
                            <span style="font-weight:600">${formatNumber(d.volume)}</span>
                        </div>
                    </div>
                `;
            },
        },
        grid: [
            { left: "58px", right: "20px", top: "20px", height: "65%" },
            { left: "58px", right: "20px", top: "82%", height: "12%" },
        ],
        xAxis: [
            {
                type: "category",
                data: dates,
                gridIndex: 0,
                axisLine: { lineStyle: { color: darkMode ? "#374151" : "#e5e7eb" } },
                axisTick: { show: false },
                axisLabel: {
                    color: darkMode ? "#9ca3af" : "#6b7280",
                    fontSize: 11,
                    formatter: (val: string) => formatDate(val, true),
                    interval: Math.max(Math.floor(dates.length / 8), 1),
                },
                splitLine: { show: false },
                boundaryGap: false,
            },
            {
                type: "category",
                data: dates,
                gridIndex: 1,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
                splitLine: { show: false },
                boundaryGap: true,
            },
        ],
        yAxis: [
            {
                type: "value",
                gridIndex: 0,
                min: minPrice,
                max: maxPrice,
                position: "left",
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: darkMode ? "#374151" : "#f3f4f6", type: "dashed" } },
                axisLabel: {
                    color: darkMode ? "#9ca3af" : "#6b7280",
                    fontSize: 11,
                    formatter: (val: number) => formatPrice(val),
                },
            },
            {
                type: "value",
                gridIndex: 1,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
            },
        ],
        dataZoom: [
            { type: "inside", xAxisIndex: [0, 1], start: 0, end: 100 },
        ],
        series: [
            {
                name: "Giá",
                type: "line",
                xAxisIndex: 0,
                yAxisIndex: 0,
                data: closes,
                smooth: 0.3,
                symbol: "none",
                lineStyle: { color: lineColor, width: 2 },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: areaColors[0] },
                            { offset: 1, color: areaColors[1] },
                        ],
                    },
                },
            },
            {
                name: "KL",
                type: "bar",
                xAxisIndex: 1,
                yAxisIndex: 1,
                data: volumes.map((v, i) => ({
                    value: v,
                    itemStyle: {
                        color: i > 0 && closes[i] >= closes[i - 1]
                            ? "rgba(34,197,94,0.5)"
                            : "rgba(239,68,68,0.5)",
                    },
                })),
                barMaxWidth: 4,
            },
        ],
    };
}

function getCandleChartOption(data: OHLCVData[], ticker: string, darkMode: boolean) {
    const dates = data.map(d => d.date);
    const ohlc = data.map(d => [d.open, d.close, d.low, d.high]);
    const volumes = data.map(d => d.volume);
    const closes = data.map(d => d.close);

    return {
        animation: true,
        animationDuration: 600,
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            textStyle: { color: "#1f2937", fontSize: 12 },
            axisPointer: {
                type: "cross",
                lineStyle: { color: "#9ca3af", type: "dashed" },
                crossStyle: { color: "#9ca3af" },
                label: { backgroundColor: "#374151" },
            },
            formatter: (params: any) => {
                const candle = params.find((p: any) => p.seriesName === "K-Line");
                if (!candle) return "";
                const idx = candle.dataIndex;
                const d = data[idx];
                if (!d) return "";
                const change = d.close - d.open;
                const changePct = d.open ? ((change / d.open) * 100) : 0;
                const color = change >= 0 ? "#22c55e" : "#ef4444";
                return `
                    <div style="padding:4px 2px">
                        <div style="font-weight:600;margin-bottom:6px;color:#374151">${formatDate(d.date)}</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px">
                            <div><span style="color:#6b7280">Mở cửa:</span> <b>${formatPrice(d.open)}</b></div>
                            <div><span style="color:#6b7280">Cao nhất:</span> <b>${formatPrice(d.high)}</b></div>
                            <div><span style="color:#6b7280">Đóng cửa:</span> <b style="color:${color}">${formatPrice(d.close)}</b></div>
                            <div><span style="color:#6b7280">Thấp nhất:</span> <b>${formatPrice(d.low)}</b></div>
                        </div>
                        <div style="margin-top:6px;border-top:1px solid #f3f4f6;padding-top:4px;display:flex;justify-content:space-between">
                            <span style="color:#6b7280">Thay đổi</span>
                            <span style="font-weight:600;color:${color}">${change >= 0 ? "+" : ""}${change.toFixed(2)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)</span>
                        </div>
                        <div style="display:flex;justify-content:space-between">
                            <span style="color:#6b7280">Khối lượng</span>
                            <span style="font-weight:600">${formatNumber(d.volume)}</span>
                        </div>
                    </div>
                `;
            },
        },
        grid: [
            { left: "58px", right: "20px", top: "20px", height: "60%" },
            { left: "58px", right: "20px", top: "78%", height: "16%" },
        ],
        xAxis: [
            {
                type: "category",
                data: dates,
                gridIndex: 0,
                axisLine: { lineStyle: { color: darkMode ? "#374151" : "#e5e7eb" } },
                axisTick: { show: false },
                axisLabel: {
                    color: darkMode ? "#9ca3af" : "#6b7280",
                    fontSize: 11,
                    formatter: (val: string) => formatDate(val, true),
                    interval: Math.max(Math.floor(dates.length / 8), 1),
                },
                splitLine: { show: false },
                boundaryGap: true,
            },
            {
                type: "category",
                data: dates,
                gridIndex: 1,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
                splitLine: { show: false },
                boundaryGap: true,
            },
        ],
        yAxis: [
            {
                type: "value",
                gridIndex: 0,
                position: "left",
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: darkMode ? "#374151" : "#f3f4f6", type: "dashed" } },
                axisLabel: {
                    color: darkMode ? "#9ca3af" : "#6b7280",
                    fontSize: 11,
                    formatter: (val: number) => formatPrice(val),
                },
                scale: true,
            },
            {
                type: "value",
                gridIndex: 1,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                scale: true,
            },
        ],
        dataZoom: [
            { type: "inside", xAxisIndex: [0, 1], start: 60, end: 100 },
            {
                type: "slider",
                xAxisIndex: [0, 1],
                start: 60,
                end: 100,
                top: "96%",
                height: 16,
                borderColor: "transparent",
                backgroundColor: darkMode ? "#374151" : "#f3f4f6",
                fillerColor: "rgba(59,130,246,0.12)",
                handleStyle: { color: "#3b82f6", borderColor: "#3b82f6" },
                textStyle: { color: "#9ca3af", fontSize: 10 },
            },
        ],
        series: [
            {
                name: "K-Line",
                type: "candlestick",
                xAxisIndex: 0,
                yAxisIndex: 0,
                data: ohlc,
                itemStyle: {
                    color: "#22c55e",
                    color0: "#ef4444",
                    borderColor: "#16a34a",
                    borderColor0: "#dc2626",
                },
            },
            {
                name: "MA5",
                type: "line",
                xAxisIndex: 0,
                yAxisIndex: 0,
                data: calcMA(closes, 5),
                smooth: true,
                symbol: "none",
                lineStyle: { color: "#f59e0b", width: 1.2, opacity: 0.8 },
            },
            {
                name: "MA20",
                type: "line",
                xAxisIndex: 0,
                yAxisIndex: 0,
                data: calcMA(closes, 20),
                smooth: true,
                symbol: "none",
                lineStyle: { color: "#3b82f6", width: 1.2, opacity: 0.8 },
            },
            {
                name: "KL",
                type: "bar",
                xAxisIndex: 1,
                yAxisIndex: 1,
                data: volumes.map((v, i) => ({
                    value: v,
                    itemStyle: {
                        color: i > 0 && data[i].close >= data[i].open
                            ? "rgba(34,197,94,0.65)"
                            : "rgba(239,68,68,0.65)",
                    },
                })),
                barMaxWidth: 6,
            },
        ],
    };
}

function getVolumeChartOption(data: OHLCVData[], ticker: string, darkMode: boolean) {
    const dates = data.map(d => d.date);
    const volumes = data.map(d => d.volume);
    const closes = data.map(d => d.close);
    const ma5Vol = calcMA(volumes, 5);
    const ma20Vol = calcMA(volumes, 20);

    return {
        animation: true,
        animationDuration: 600,
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            textStyle: { color: "#1f2937", fontSize: 12 },
            axisPointer: {
                type: "shadow",
                shadowStyle: { color: "rgba(59,130,246,0.06)" },
            },
            formatter: (params: any) => {
                const bar = params[0];
                if (!bar) return "";
                const idx = bar.dataIndex;
                const d = data[idx];
                if (!d) return "";
                const avgVol = ma20Vol[idx] ? Number(ma20Vol[idx]) : 0;
                const ratio = avgVol ? ((d.volume / avgVol) * 100).toFixed(0) : "—";
                return `
                    <div style="padding:4px 2px">
                        <div style="font-weight:600;margin-bottom:6px;color:#374151">${formatDate(d.date)}</div>
                        <div style="display:flex;justify-content:space-between;gap:24px">
                            <span style="color:#6b7280">Khối lượng</span>
                            <span style="font-weight:600">${formatNumber(d.volume)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:24px">
                            <span style="color:#6b7280">MA5</span>
                            <span style="font-weight:600;color:#f59e0b">${ma5Vol[idx] ? formatNumber(Number(ma5Vol[idx])) : "—"}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:24px">
                            <span style="color:#6b7280">MA20</span>
                            <span style="font-weight:600;color:#3b82f6">${avgVol ? formatNumber(avgVol) : "—"}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;gap:24px;border-top:1px solid #f3f4f6;margin-top:4px;padding-top:4px">
                            <span style="color:#6b7280">So với TB20</span>
                            <span style="font-weight:600">${ratio}%</span>
                        </div>
                    </div>
                `;
            },
        },
        legend: {
            data: ["Khối lượng", "MA5", "MA20"],
            top: 4,
            right: 12,
            textStyle: { color: "#6b7280", fontSize: 11 },
            itemWidth: 14,
            itemHeight: 3,
        },
        grid: { left: "58px", right: "20px", top: "40px", bottom: "40px" },
        xAxis: {
            type: "category",
            data: dates,
            axisLine: { lineStyle: { color: darkMode ? "#374151" : "#e5e7eb" } },
            axisTick: { show: false },
            axisLabel: {
                color: darkMode ? "#9ca3af" : "#6b7280",
                fontSize: 11,
                formatter: (val: string) => formatDate(val, true),
                interval: Math.max(Math.floor(dates.length / 8), 1),
            },
            splitLine: { show: false },
            boundaryGap: true,
        },
        yAxis: {
            type: "value",
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: darkMode ? "#374151" : "#f3f4f6", type: "dashed" } },
            axisLabel: {
                color: darkMode ? "#9ca3af" : "#6b7280",
                fontSize: 11,
                formatter: (val: number) => formatNumber(val),
            },
        },
        dataZoom: [
            { type: "inside", start: 0, end: 100 },
        ],
        series: [
            {
                name: "Khối lượng",
                type: "bar",
                data: volumes.map((v, i) => ({
                    value: v,
                    itemStyle: {
                        color: i > 0 && closes[i] >= closes[i - 1]
                            ? { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#22c55e" }, { offset: 1, color: "#16a34a" }] }
                            : { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#ef4444" }, { offset: 1, color: "#dc2626" }] },
                        borderRadius: [2, 2, 0, 0],
                    },
                })),
                barMaxWidth: 8,
            },
            {
                name: "MA5",
                type: "line",
                data: ma5Vol,
                smooth: true,
                symbol: "none",
                lineStyle: { color: "#f59e0b", width: 1.5 },
            },
            {
                name: "MA20",
                type: "line",
                data: ma20Vol,
                smooth: true,
                symbol: "none",
                lineStyle: { color: "#3b82f6", width: 1.5 },
            },
        ],
    };
}

// ==================== COMPONENT ====================

interface MainMarketChartProps {
    ticker?: string;
}

export const MainMarketChart = ({ ticker = "VNINDEX" }: MainMarketChartProps) => {
    const [chartType, setChartType] = useState<"line" | "candle" | "volume">("line");
    const [timeFrame, setTimeFrame] = useState<TimeFrame>("1Y");
    const [data, setData] = useState<OHLCVData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { darkMode } = useSettings();

    // ── Fetch dữ liệu chart từ API ──
    const fetchChart = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(
                `${API_BASE}/api/v1/tong-quan/market-chart/${ticker}?period=${timeFrame}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            // API trả { data: [...], meta: {...} }
            setData(json.data || []);
        } catch (err: any) {
            console.error("Failed to fetch chart:", err);
            setError(err.message || "Không thể tải biểu đồ");
        } finally {
            setLoading(false);
        }
    }, [ticker, timeFrame]);

    useEffect(() => {
        fetchChart();
    }, [fetchChart]);

    const meta = INDEX_META[ticker] || { name: ticker };

    // Tính thống kê hiển thị header
    const stats = useMemo(() => {
        if (data.length < 2) return { last: 0, change: 0, pct: 0, high: 0, low: 0, vol: 0 };
        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        const change = last.close - prev.close;
        const pct = prev.close ? (change / prev.close) * 100 : 0;
        const high = Math.max(...data.map(d => d.high));
        const low = Math.min(...data.map(d => d.low));
        const vol = data.reduce((s, d) => s + d.volume, 0) / data.length;
        return { last: last.close, change, pct, high, low, vol };
    }, [data]);

    const chartOption = useMemo(() => {
        if (data.length === 0) return {};
        switch (chartType) {
            case "line": return getLineChartOption(data, ticker, darkMode);
            case "candle": return getCandleChartOption(data, ticker, darkMode);
            case "volume": return getVolumeChartOption(data, ticker, darkMode);
        }
    }, [data, ticker, chartType, darkMode]);

    const timeFrames: { value: TimeFrame; label: string }[] = [
        { value: "1W", label: "1W" },
        { value: "1M", label: "1M" },
        { value: "3M", label: "3M" },
        { value: "6M", label: "6M" },
        { value: "1Y", label: "1Y" },
        { value: "ALL", label: "Tất cả" },
    ];

    return (
        <Card className="shadow-sm border-border overflow-hidden">
            {/* Header: Ticker info + stats */}
            <CardHeader className="pb-2 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Left: Ticker name + price */}
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-bold text-foreground">
                                    {meta.name}
                                </CardTitle>
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">
                                    {ticker}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-2xl font-bold tracking-tight text-foreground">
                                    {formatPrice(stats.last)}
                                </span>
                                <span className={`text-sm font-semibold px-2 py-0.5 rounded ${stats.change >= 0
                                        ? "text-green-700 bg-green-50"
                                        : "text-red-700 bg-red-50"
                                    }`}>
                                    {stats.change >= 0 ? "+" : ""}{stats.change.toFixed(2)} ({stats.pct >= 0 ? "+" : ""}{stats.pct.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Mini stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="text-center">
                            <div className="font-semibold text-foreground">{formatPrice(stats.high)}</div>
                            <div>Cao nhất</div>
                        </div>
                        <div className="w-px h-6 bg-border" />
                        <div className="text-center">
                            <div className="font-semibold text-foreground">{formatPrice(stats.low)}</div>
                            <div>Thấp nhất</div>
                        </div>
                        <div className="w-px h-6 bg-border" />
                        <div className="text-center">
                            <div className="font-semibold text-foreground">{formatNumber(stats.vol)}</div>
                            <div>TB KL</div>
                        </div>
                    </div>
                </div>

                {/* Tabs: Chart type + Time frame */}
                <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                    <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-auto">
                        <TabsList className="h-8 bg-muted">
                            <TabsTrigger
                                value="line"
                                className="text-xs px-3 h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            >
                                Đường
                            </TabsTrigger>
                            <TabsTrigger
                                value="candle"
                                className="text-xs px-3 h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            >
                                Nến
                            </TabsTrigger>
                            <TabsTrigger
                                value="volume"
                                className="text-xs px-3 h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            >
                                Khối lượng
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex items-center gap-1">
                        {timeFrames.map((tf) => (
                            <button
                                key={tf.value}
                                onClick={() => setTimeFrame(tf.value)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${timeFrame === tf.value
                                        ? "bg-blue-500 text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    }`}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MA Legend (candlestick only) */}
                {chartType === "candle" && (
                    <div className="flex items-center gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-amber-500 rounded" />
                            <span className="text-muted-foreground">MA5</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-blue-500 rounded" />
                            <span className="text-muted-foreground">MA20</span>
                        </div>
                    </div>
                )}
            </CardHeader>

            {/* Chart */}
            <CardContent className="p-0 relative">
                {/* Loading overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-background/70 z-20 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="text-sm text-muted-foreground">Đang tải dữ liệu...</span>
                    </div>
                )}

                {/* Error state */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <p className="text-red-500 text-sm">{error}</p>
                        <button
                            onClick={fetchChart}
                            className="text-xs text-blue-500 hover:text-blue-700 underline"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {/* Chart */}
                {!error && data.length > 0 && (
                    <ReactECharts
                        option={chartOption}
                        style={{ height: chartType === "candle" ? "520px" : "460px", width: "100%" }}
                        notMerge={true}
                        lazyUpdate={true}
                    />
                )}

                {/* Empty state */}
                {!error && !loading && data.length === 0 && (
                    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                        Không có dữ liệu cho {meta.name} ({timeFrame})
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default MainMarketChart;
