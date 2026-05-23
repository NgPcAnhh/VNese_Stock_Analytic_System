"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ImpactItem {
    ticker: string;
    impact: number;
}

interface FlowItem {
    date: string;
    netVal: number;
}

const IndexImpactLiquidity = () => {
    const [impactData, setImpactData] = useState<ImpactItem[]>([]);
    const [flowData, setFlowData] = useState<FlowItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const [impactRes, flowRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/market/index-impact?limit=10`),
                fetch(`${API_BASE}/api/v1/market/foreign-flow?days=10`),
            ]);
            if (!impactRes.ok) throw new Error(`Impact API ${impactRes.status}`);
            if (!flowRes.ok) throw new Error(`Flow API ${flowRes.status}`);
            const [impact, flow] = await Promise.all([
                impactRes.json() as Promise<ImpactItem[]>,
                flowRes.json() as Promise<FlowItem[]>,
            ]);
            setImpactData(impact);
            setFlowData(flow);
        } catch (err) {
            console.error("Failed to fetch impact/flow:", err);
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

    const impactOption = useMemo(() => ({
        tooltip: {
            trigger: "axis" as const,
            axisPointer: { type: "shadow" as const },
            textStyle: {
                fontFamily: "var(--font-roboto), Roboto, sans-serif",
            },
        },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
            type: "category" as const,
            data: impactData.map((i) => i.ticker),
            axisLabel: { fontSize: 10 },
        },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10 } },
        series: [
            {
                data: impactData.map((item) => ({
                    value: item.impact,
                    itemStyle: { color: item.impact >= 0 ? "#22c55e" : "#ef4444" },
                })),
                type: "bar",
                barMaxWidth: 24,
            },
        ],
    }), [impactData]);

    const foreignOption = useMemo(() => ({
        tooltip: {
            trigger: "axis" as const,
            axisPointer: { type: "shadow" as const },
            textStyle: {
                fontFamily: "var(--font-roboto), Roboto, sans-serif",
            },
        },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
            type: "category" as const,
            data: flowData.map((i) => i.date),
            axisLabel: { fontSize: 10 },
        },
        yAxis: { type: "value" as const, axisLabel: { fontSize: 10 } },
        series: [
            {
                data: flowData.map((item) => ({
                    value: item.netVal,
                    itemStyle: { color: item.netVal >= 0 ? "#22c55e" : "#ef4444" },
                })),
                type: "bar",
                barMaxWidth: 20,
            },
        ],
    }), [flowData]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-border">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-foreground">
                            Tác động tới Index
                        </CardTitle>
                        {!loading && (
                            <button onClick={fetchData} className="text-muted-foreground hover:text-foreground transition-colors" title="Làm mới">
                                <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-[220px] w-full relative overflow-hidden rounded-lg">
                            <Skeleton className="h-full w-full" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                                <span className="text-[10px] text-muted-foreground">Đang tải...</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-[220px] gap-2">
                            <p className="text-xs text-red-500">{error}</p>
                            <button onClick={fetchData} className="text-xs text-blue-500 hover:underline">Thử lại</button>
                        </div>
                    ) : (
                        <ReactECharts option={impactOption} style={{ height: "220px" }} notMerge />
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground">
                        Giao dịch Khối ngoại
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-[220px] w-full relative overflow-hidden rounded-lg">
                            <Skeleton className="h-full w-full" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                                <span className="text-[10px] text-muted-foreground">Đang tải...</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-[220px] gap-2">
                            <p className="text-xs text-red-500">{error}</p>
                            <button onClick={fetchData} className="text-xs text-blue-500 hover:underline">Thử lại</button>
                        </div>
                    ) : (
                        <ReactECharts option={foreignOption} style={{ height: "220px" }} notMerge />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default IndexImpactLiquidity;
