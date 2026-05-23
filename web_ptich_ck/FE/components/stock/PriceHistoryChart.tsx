"use client";
import { AlertPopup } from './AlertPopup';

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { usePriceHistory, type PriceHistoryPeriod, type PriceHistoryItem } from "@/hooks/useStockData";
import { useAlerts, type StockAlert } from "@/hooks/useAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Star,
    Bell,
    GitCompare,
    Pencil,
    Settings,
    Maximize2,
    LineChart,
    CandlestickChart,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getOrCreateSessionId(): string {
    const key = "session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, generated);
    return generated;
}

/* Period UI labels */
const PERIODS: { label: string; value: PriceHistoryPeriod }[] = [
    { label: "1D", value: "1D" },
    { label: "1W", value: "1W" },
    { label: "1M", value: "1M" },
    { label: "3M", value: "3M" },
    { label: "6M", value: "6M" },
    { label: "1Y", value: "1Y" },
    { label: "5Y", value: "5Y" },
    { label: "Tất cả", value: "ALL" },
];

/* Smart date label depending on period */
function formatDateLabel(dateStr: string, period: PriceHistoryPeriod): string {
    const d = new Date(dateStr);
    if (period === "1D" || period === "1W") {
        return `${d.getDate()}/${d.getMonth() + 1}`;
    }
    if (period === "1M" || period === "3M") {
        return `${d.getDate()}/${d.getMonth() + 1}`;
    }
    if (period === "6M" || period === "1Y") {
        return `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
    }
    // 5Y, ALL
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

/* Compute reasonable axis label interval */
function computeInterval(count: number): number {
    if (count <= 30) return 0;
    if (count <= 100) return Math.floor(count / 10);
    if (count <= 400) return Math.floor(count / 12);
    return Math.floor(count / 15);
}

const PriceHistoryChart = () => {
    const { ticker, priceHistory: contextHistory, onTabChange } = useStockDetail();
    const { listAlerts } = useAlerts();
    const [period, setPeriod] = useState<PriceHistoryPeriod>("1Y");
    const [chartType, setChartType] = useState<"line" | "candle">("line");
    const [isFavorite, setIsFavorite] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [activeAlert, setActiveAlert] = useState<StockAlert | null>(null);
    const [showCompareMa20, setShowCompareMa20] = useState(false);
    const [analysisNote, setAnalysisNote] = useState("");
    const [showGridLines, setShowGridLines] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);

    /* Fetch price data for the selected period */
    const { data: apiData, loading } = usePriceHistory(ticker, period);

    /* Use API data when available, context data as initial fallback */
    const priceData: PriceHistoryItem[] = useMemo(
        () => apiData ?? contextHistory ?? [],
        [apiData, contextHistory],
    );

    /* Derived chart arrays — memoized for performance */
    const { dates, closePrices, candlestickData, volumeData, volumeColors } = useMemo(() => {
        const d = priceData.map((item) => formatDateLabel(item.date, period));
        const c = priceData.map((item) => item.close);
        const cd = priceData.map((item) => [item.open, item.close, item.low, item.high]);
        const v = priceData.map((item) => item.volume);
        const vc = priceData.map((item) =>
            item.close >= item.open ? "rgba(0, 192, 118, 0.5)" : "rgba(239, 68, 68, 0.5)"
        );
        return { dates: d, closePrices: c, candlestickData: cd, volumeData: v, volumeColors: vc };
    }, [priceData, period]);

    const axisInterval = useMemo(() => computeInterval(dates.length), [dates.length]);
    const latestClosePrice = closePrices.length > 0 ? closePrices[closePrices.length - 1] : null;

    const isAlertTriggered = useMemo(() => {
        if (!activeAlert || latestClosePrice === null) return false;
        const target = Number(activeAlert.target_price);
        if (activeAlert.condition_type === "LESS_THAN") {
            return latestClosePrice <= target;
        }
        return latestClosePrice >= target;
    }, [activeAlert, latestClosePrice]);

    const ma20Data = useMemo(() => {
        if (closePrices.length < 20) return closePrices.map(() => null);
        return closePrices.map((_, index, arr) => {
            if (index < 19) return null;
            const window = arr.slice(index - 19, index + 1);
            const avg = window.reduce((sum, val) => sum + val, 0) / 20;
            return Number(avg.toFixed(2));
        });
    }, [closePrices]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEffect(() => {
        const noteKey = "stock_analysis_notes";

        const loadRemoteState = async () => {
            try {
                const sessionId = getOrCreateSessionId();

                const [favRes, alertRes] = await Promise.all([
                    fetch(`${API}/tracking/favorite?session_id=${encodeURIComponent(sessionId)}`),
                    listAlerts(),
                ]);

                if (favRes.ok) {
                    const favorites: string[] = await favRes.json();
                    setIsFavorite(favorites.includes(ticker));
                } else {
                    setIsFavorite(false);
                }

                const alerts = alertRes as StockAlert[];
                const tickerAlerts = alerts.filter((a) => a.ticker.toUpperCase() === ticker.toUpperCase());
                const active =
                    tickerAlerts.find((a) => a.status === "ACTIVE") ||
                    tickerAlerts.find((a) => a.status === "TRIGGERED") ||
                    null;
                setActiveAlert(active);
            } catch {
                setIsFavorite(false);
                setActiveAlert(null);
            }
        };

        loadRemoteState();

        try {
            const notesRaw = localStorage.getItem(noteKey);
            const notes = notesRaw ? (JSON.parse(notesRaw) as Record<string, string>) : {};
            setAnalysisNote(notes[ticker] || "");
        } catch {
            setAnalysisNote("");
        }
    }, [ticker, listAlerts]);

    const toggleFavorite = useCallback(() => {
        const run = async () => {
            try {
                const res = await fetch(`${API}/tracking/favorite`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ticker,
                        session_id: getOrCreateSessionId(),
                    }),
                });
                if (!res.ok) return;
                setIsFavorite((prev) => !prev);
            } catch {
                // noop
            }
        };
        run();
    }, [ticker]);

    const setupPriceAlert = useCallback(() => {
        setShowAlert(true);
    }, []);

    const editAnalysisNote = useCallback(() => {
        const noteKey = "stock_analysis_notes";
        const input = window.prompt("Ghi chú phân tích cho mã này:", analysisNote);
        if (input === null) return;

        const nextValue = input.trim();
        try {
            const notesRaw = localStorage.getItem(noteKey);
            const notes = notesRaw ? (JSON.parse(notesRaw) as Record<string, string>) : {};
            if (!nextValue) {
                delete notes[ticker];
            } else {
                notes[ticker] = nextValue;
            }
            localStorage.setItem(noteKey, JSON.stringify(notes));
            setAnalysisNote(nextValue);
        } catch {
            // noop
        }
    }, [analysisNote, ticker]);

    const toggleFullscreen = useCallback(async () => {
        if (!cardRef.current) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }
        await cardRef.current.requestFullscreen();
    }, []);

    /* Tooltip formatter shared by both chart types */
    const tooltipFormatter = (params: any) => {
        const idx = params[0]?.dataIndex ?? 0;
        const item = priceData[idx];
        if (!item) return "";
        return `
            <div style="font-family: 'Roboto Mono', monospace; padding: 2px; font-size: 13px;">
                <div style="font-weight: bold; margin-bottom: 4px;">${item.date}</div>
                <div>Mở: <b>${item.open.toLocaleString()}</b></div>
                <div>Cao: <b style="color: #00C076;">${item.high.toLocaleString()}</b></div>
                <div>Thấp: <b style="color: #EF4444;">${item.low.toLocaleString()}</b></div>
                <div>Đóng: <b>${item.close.toLocaleString()}</b></div>
                <div>KL: <b>${item.volume.toLocaleString()}</b></div>
            </div>`;
    };

    const lineChartOption = useMemo(
        () => ({
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderColor: "#e5e7eb",
                borderWidth: 1,
                textStyle: { color: "#374151", fontSize: 13 },
                formatter: tooltipFormatter,
            },
            grid: { left: "1%", right: "8%", bottom: "5%", top: "5%", containLabel: true },
            xAxis: {
                type: "category",
                data: dates,
                boundaryGap: false,
                axisLine: { lineStyle: { color: "#e5e7eb" } },
                axisLabel: { color: "#6b7280", fontSize: 12, interval: axisInterval },
                splitLine: { show: false },
            },
            yAxis: {
                type: "value",
                position: "right",
                scale: true,
                axisLine: { show: false },
                axisLabel: { color: "#6b7280", fontSize: 12, formatter: (v: number) => v.toLocaleString() },
                splitLine: { show: showGridLines, lineStyle: { color: "#f3f4f6", type: "dashed" } },
            },
            dataZoom: [
                { type: "inside", xAxisIndex: 0, start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false },
                { type: "inside", yAxisIndex: 0, zoomOnMouseWheel: false, moveOnMouseMove: false },
            ],
            series: [
                {
                    name: "Giá",
                    type: "line",
                    data: closePrices,
                    smooth: true,
                    symbol: "none",
                    lineStyle: { color: "#00C076", width: 2 },
                    areaStyle: {
                        color: {
                            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "rgba(0, 192, 118, 0.35)" },
                                { offset: 1, color: "rgba(0, 192, 118, 0.02)" },
                            ],
                        },
                    },
                },
                ...(showCompareMa20
                    ? [
                        {
                            name: "MA20",
                            type: "line",
                            data: ma20Data,
                            smooth: true,
                            symbol: "none",
                            lineStyle: { color: "#3B82F6", width: 1.5, type: "dashed" },
                        },
                    ]
                    : []),
            ],
        }),
        [dates, closePrices, axisInterval, showCompareMa20, ma20Data, showGridLines],
    );

    const candleChartOption = useMemo(
        () => ({
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderColor: "#e5e7eb",
                borderWidth: 1,
                textStyle: { color: "#374151", fontSize: 13 },
                formatter: tooltipFormatter,
            },
            grid: [
                { left: "1%", right: "8%", top: "5%", height: "58%", containLabel: true },
                { left: "1%", right: "8%", top: "70%", height: "22%", containLabel: true },
            ],
            xAxis: [
                {
                    type: "category", data: dates, boundaryGap: true,
                    axisLine: { lineStyle: { color: "#e5e7eb" } },
                    axisLabel: { color: "#6b7280", fontSize: 12, interval: axisInterval },
                    splitLine: { show: false },
                },
                {
                    type: "category", gridIndex: 1, data: dates, boundaryGap: true,
                    axisLine: { lineStyle: { color: "#e5e7eb" } },
                    axisLabel: { show: false },
                    splitLine: { show: false },
                },
            ],
            yAxis: [
                {
                    type: "value", position: "right", scale: true,
                    axisLine: { show: false },
                    axisLabel: { color: "#6b7280", fontSize: 12, formatter: (v: number) => v.toLocaleString() },
                    splitLine: { show: showGridLines, lineStyle: { color: "#f3f4f6", type: "dashed" } },
                },
                {
                    type: "value", gridIndex: 1, position: "right", scale: true,
                    axisLine: { show: false },
                    axisLabel: { color: "#6b7280", fontSize: 10, formatter: (v: number) => (v / 1000000).toFixed(1) + "M" },
                    splitLine: { show: showGridLines, lineStyle: { color: "#f3f4f6", type: "dashed" } },
                },
            ],
            dataZoom: [
                { type: "inside", xAxisIndex: [0, 1], start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false },
                { type: "inside", yAxisIndex: [0], zoomOnMouseWheel: false, moveOnMouseMove: false },
            ],
            series: [
                {
                    name: "Candlestick",
                    type: "candlestick",
                    data: candlestickData,
                    xAxisIndex: 0,
                    yAxisIndex: 0,
                    itemStyle: {
                        color: "#00C076",
                        color0: "#EF4444",
                        borderColor: "#00C076",
                        borderColor0: "#EF4444",
                    },
                },
                ...(showCompareMa20
                    ? [
                        {
                            name: "MA20",
                            type: "line",
                            data: ma20Data,
                            xAxisIndex: 0,
                            yAxisIndex: 0,
                            symbol: "none",
                            lineStyle: { color: "#3B82F6", width: 1.5, type: "dashed" },
                        },
                    ]
                    : []),
                {
                    name: "Volume",
                    type: "bar",
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: volumeData.map((v, i) => ({
                        value: v,
                        itemStyle: { color: volumeColors[i] },
                    })),
                },
            ],
        }),
        [dates, candlestickData, volumeData, volumeColors, axisInterval, showCompareMa20, ma20Data, showGridLines],
    );

    return (
        <Card ref={cardRef} className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg font-bold text-foreground">
                            Biểu đồ giá
                        </CardTitle>
                        {activeAlert !== null && (
                            <span className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                Cảnh báo: {activeAlert.condition_type === "LESS_THAN" ? "<=" : ">="} {Number(activeAlert.target_price).toLocaleString()} ({isAlertTriggered ? "Đã chạm" : "Đang theo dõi"})
                            </span>
                        )}
                        {analysisNote && (
                            <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 max-w-[280px] truncate" title={analysisNote}>
                                Ghi chú: {analysisNote}
                            </span>
                        )}
                        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                            <button
                                onClick={() => setChartType("line")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === "line" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <LineChart className="w-3.5 h-3.5" />
                                Line
                            </button>
                            <button
                                onClick={() => setChartType("candle")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === "candle" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <CandlestickChart className="w-3.5 h-3.5" />
                                Candlestick
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Period Pills */}
                        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                            {PERIODS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${period === p.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCompareMa20((prev) => !prev)}
                            className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors ${showCompareMa20
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-background text-muted-foreground border-border hover:text-foreground"
                                }`}
                        >
                            MA20
                        </button>
                        <div className="flex items-center gap-0.5 border-l border-border/50 pl-2">
                            <ToolbarButton
                                icon={<Star className="w-3.5 h-3.5" fill={isFavorite ? "currentColor" : "none"} />}
                                title={isFavorite ? "Bỏ khỏi danh sách theo dõi" : "Thêm vào danh sách theo dõi"}
                                active={isFavorite}
                                activeClassName="text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                                onClick={toggleFavorite}
                            />
                            <ToolbarButton
                                icon={<Bell className="w-3.5 h-3.5" />}
                                title={activeAlert ? "Quản lý cảnh báo giá" : "Thiết lập cảnh báo giá"}
                                active={activeAlert !== null || isAlertTriggered}
                                activeClassName="text-amber-600 bg-amber-50 dark:bg-amber-500/10"
                                onClick={setupPriceAlert}
                            />
                            <ToolbarButton
                                icon={<GitCompare className="w-3.5 h-3.5" />}
                                title="Mở tab so sánh cổ phiếu"
                                onClick={() => {
                                    if (onTabChange) {
                                        onTabChange("compare");
                                        return;
                                    }
                                    setShowCompareMa20((prev) => !prev);
                                }}
                            />
                            <ToolbarButton
                                icon={<Pencil className="w-3.5 h-3.5" />}
                                title="Thêm ghi chú nhanh"
                                active={Boolean(analysisNote)}
                                onClick={editAnalysisNote}
                            />
                            <ToolbarButton
                                icon={<Settings className="w-3.5 h-3.5" />}
                                title="Bật/tắt lưới biểu đồ"
                                active={showGridLines}
                                onClick={() => setShowGridLines((prev) => !prev)}
                            />
                            <ToolbarButton
                                icon={<Maximize2 className="w-3.5 h-3.5" />}
                                title="Toàn màn hình"
                                onClick={toggleFullscreen}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-2 flex-1 relative">
                {loading && !apiData && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                )}
                {priceData.length === 0 && !loading ? (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
                        Không có dữ liệu giá cho khoảng thời gian này
                    </div>
                ) : chartType === "line" ? (
                    <ReactECharts
                        option={lineChartOption}
                        style={{ height: isFullscreen ? "100%" : "400px", width: "100%" }}
                        notMerge={true}
                    />
                ) : (
                    <ReactECharts
                        option={candleChartOption}
                        style={{ height: isFullscreen ? "100%" : "400px", width: "100%" }}
                        notMerge={true}
                    />
                )}
            </CardContent>
            {showAlert && (
                <AlertPopup
                    ticker={ticker}
                    existingAlert={activeAlert}
                    onClose={() => setShowAlert(false)}
                    onSaved={(alert) => setActiveAlert(alert)}
                />
            )}
    </Card>
    );
};

const ToolbarButton = ({
    icon,
    title,
    active,
    activeClassName = "text-foreground bg-muted",
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    active?: boolean;
    activeClassName?: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        className={`p-1.5 rounded transition-colors ${active
            ? activeClassName
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
    >
        {icon}
    </button>
);

export default PriceHistoryChart;
