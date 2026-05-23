"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw } from "lucide-react";
import { useSettings } from "@/lib/SettingsContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BreadthData {
    advancing: number;
    declining: number;
    unchanged: number;
}

export const MarketBreadth = () => {
    const [data, setData] = useState<BreadthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { darkMode } = useSettings();

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(
                `${API_BASE}/api/v1/tong-quan/market-breadth`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: BreadthData = await res.json();
            setData(json);
        } catch (err: unknown) {
            console.error("Failed to fetch market breadth:", err);
            setError("Không thể tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 120_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const total = data
        ? data.advancing + data.declining + data.unchanged
        : 0;

    const option = useMemo(() => {
        if (!data) return {};
        const textColor = darkMode ? "#e5e7eb" : "#1f2937";
        const mutedColor = darkMode ? "#9ca3af" : "#9ca3af";
        return {
            tooltip: {
                trigger: "item",
                formatter: (params: { name: string; value: number; percent: number }) =>
                    `<b>${params.name}</b><br/><b>${params.value} mã</b><br/>Tỷ lệ: <b>${params.percent}%</b>`,
                textStyle: {
                    fontFamily: "var(--font-roboto), Roboto, sans-serif",
                },
            },
            legend: {
                bottom: 0,
                itemWidth: 12,
                itemHeight: 12,
                textStyle: { fontSize: 13, color: darkMode ? "#d1d5db" : "#555" },
            },
            graphic: [
                {
                    type: "text",
                    left: "center",
                    top: "38%",
                    style: {
                        text: `${total}`,
                        fontSize: 32,
                        fontWeight: "bold",
                        fill: textColor,
                        textAlign: "center",
                    },
                },
                {
                    type: "text",
                    left: "center",
                    top: "50%",
                    style: {
                        text: "Tổng mã",
                        fontSize: 13,
                        fill: mutedColor,
                        textAlign: "center",
                    },
                },
            ],
            series: [
                {
                    type: "pie",
                    radius: ["55%", "80%"],
                    center: ["50%", "45%"],
                    avoidLabelOverlap: false,
                    padAngle: 3,
                    itemStyle: { borderRadius: 6 },
                    label: { show: false },
                    emphasis: {
                        scale: true,
                        scaleSize: 6,
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: "rgba(0, 0, 0, 0.15)",
                        },
                    },
                    labelLine: { show: false },
                    data: [
                        {
                            value: data.advancing,
                            name: "Tăng",
                            itemStyle: { color: "#22c55e" },
                        },
                        {
                            value: data.unchanged,
                            name: "Không thay đổi",
                            itemStyle: { color: "#eab308" },
                        },
                        {
                            value: data.declining,
                            name: "Giảm",
                            itemStyle: { color: "#ef4444" },
                        },
                    ],
                },
            ],
        };
    }, [data, total, darkMode]);

    return (
        <Card className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-foreground">
                        Độ rộng thị trường
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
                {loading && !data ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="relative">
                            <Skeleton className="h-40 w-40 rounded-full" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            </div>
                        </div>
                        <div className="flex gap-6 animate-pulse">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-14" />
                        </div>
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
                ) : (
                    <ReactECharts
                        option={option}
                        style={{ height: "100%", width: "100%" }}
                        notMerge
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default MarketBreadth;
