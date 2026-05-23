"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SectorItem {
    name: string;
    value: number;
}

export const SectorPerformance = () => {
    const [data, setData] = useState<SectorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { darkMode } = useSettings();

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(
                `${API_BASE}/api/v1/tong-quan/sector-performance`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: SectorItem[] = await res.json();
            setData(json);
        } catch (err: unknown) {
            console.error("Failed to fetch sector performance:", err);
            setError("Không thể tải dữ liệu ngành");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 120_000); // auto-refresh 2 phút
        return () => clearInterval(interval);
    }, [fetchData]);

    const chartRef = useRef<ReactECharts | null>(null);

    // Khi dataZoom thay đổi: nếu range > 50% thì tắt label để tránh chồng chéo
    const onDataZoom = useCallback(() => {
        const instance = chartRef.current?.getEchartsInstance();
        if (!instance) return;
        const opt = instance.getOption() as { dataZoom?: { start?: number; end?: number }[] };
        const dz = opt.dataZoom?.[0];
        if (!dz) return;
        const range = (dz.end ?? 100) - (dz.start ?? 0);
        const showLabel = range <= 50;
        instance.setOption({
            series: [{ label: { show: showLabel } }],
        });
    }, []);

    // ── Chart option ──
    const option = React.useMemo(() => {
        if (data.length === 0) return {};
        const textColor = darkMode ? "#9ca3af" : "#6b7280";
        const splitLineColor = darkMode ? "#374151" : "#e5e7eb";
        const dzBgColor = darkMode ? "#1f2937" : "#f3f4f6";

        // Tính % hiển thị mặc định: nếu <= 12 ngành thì show hết, ngược lại show ~12 ngành
        const totalItems = data.length;
        const defaultEndPercent = totalItems <= 12 ? 100 : Math.round((12 / totalItems) * 100);

        return {
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                formatter: (params: { name: string; value: number }[]) => {
                    const p = params[0];
                    const color = p.value >= 0 ? "#22c55e" : "#ef4444";
                    return `<b>${p.name}</b><br/>
                        <span style="color:${color}; font-weight:600">
                            ${p.value >= 0 ? "+" : ""}${p.value}%
                        </span>`;
                },
            },
            grid: {
                left: "3%",
                right: "6%",
                bottom: totalItems > 12 ? "18%" : "8%",
                top: "6%",
                containLabel: true,
            },
            dataZoom: [
                {
                    type: "slider",
                    xAxisIndex: 0,
                    start: 0,
                    end: 60,
                    height: 20,
                    bottom: 4,
                    borderColor: "transparent",
                    backgroundColor: dzBgColor,
                    fillerColor: "rgba(59,130,246,0.15)",
                    handleStyle: { color: "#3b82f6", borderColor: "#3b82f6" },
                    textStyle: { fontSize: 10, color: textColor },
                    brushSelect: false,
                },
                {
                    type: "inside",
                    xAxisIndex: 0,
                    start: 0,
                    end: defaultEndPercent,
                    zoomOnMouseWheel: true,
                    moveOnMouseMove: true,
                },
            ],
            xAxis: {
                type: "category",
                data: data.map((s) => s.name),
                axisLabel: {
                    rotate: 35,
                    fontSize: 10,
                    interval: 0,
                    width: 80,
                    overflow: "truncate",
                },
                axisTick: { alignWithLabel: true },
            },
            yAxis: {
                type: "value",
                axisLabel: { formatter: "{value}%", fontSize: 11, color: textColor },
                splitLine: { lineStyle: { type: "dashed", color: splitLineColor } },
            },
            series: [
                {
                    data: data.map((s) => ({
                        value: s.value,
                        itemStyle: {
                            color: s.value >= 0 ? "#22c55e" : "#ef4444",
                            borderRadius: s.value >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
                        },
                    })),
                    type: "bar",
                    barMaxWidth: 40,
                    barMinWidth: 16,
                    label: {
                        show: true,
                        position: "top",
                        formatter: (p: { value: number }) =>
                            `${p.value >= 0 ? "+" : ""}${p.value}%`,
                        fontSize: 10,
                        color: textColor,
                    },
                },
            ],
        };
    }, [data, darkMode]);

    return (
        <Card className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-foreground">
                        Biến động ngành
                    </CardTitle>
                    {!loading && (
                        <button
                            onClick={fetchData}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Làm mới"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 relative">
                {loading && data.length === 0 ? (
                    <div className="flex items-end justify-around h-full pb-8 px-4">
                        {[65, 40, 80, 35, 55, 70, 45, 60, 50, 75].map((h, i) => (
                            <Skeleton
                                key={i}
                                className="w-8"
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <p className="text-sm text-red-500">{error}</p>
                        <button
                            onClick={fetchData}
                            className="text-xs text-blue-500 hover:underline"
                        >
                            Thử lại
                        </button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                            Không có dữ liệu
                        </p>
                    </div>
                ) : (
                    <ReactECharts
                        ref={chartRef}
                        option={option}
                        style={{ height: "100%", width: "100%" }}
                        notMerge
                        onEvents={{ datazoom: onDataZoom }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default SectorPerformance;
