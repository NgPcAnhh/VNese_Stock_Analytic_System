"use client";

import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LiquidityPoint {
    date: string;
    value: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const LiquidityChart = () => {
    const [data, setData] = useState<LiquidityPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API}/tong-quan/liquidity?days=30`);
                if (!res.ok) throw new Error("API error");
                const json: LiquidityPoint[] = await res.json();
                if (!cancelled) setData(json);
            } catch (e) {
                console.error("LiquidityChart fetch error:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const values = data.map((d) => d.value);

    const option = {
        tooltip: {
            trigger: "axis" as const,
            axisPointer: { type: "shadow" as const },
            formatter: (params: any) => {
                const p = Array.isArray(params) ? params[0] : params;
                return `<b>${p.name}</b><br/>GTGD: <b>${Number(p.value).toLocaleString("en-US")}</b> tỷ`;
            },
        },
        grid: { left: "3%", right: "4%", top: "8%", bottom: "18%", containLabel: true },
        xAxis: {
            type: "category" as const,
            data: data.map((d) => d.date),
            axisLabel: {
                rotate: 45,
                fontSize: 10,
                interval: 0,
            },
        },
        yAxis: {
            type: "value" as const,
            scale: true,
            axisLabel: {
                formatter: (val: number) => `${val.toLocaleString("en-US")} tỷ`,
                fontSize: 10,
            },
            splitLine: { lineStyle: { type: "dashed" as const, color: "#e5e7eb" } },
        },
        dataZoom: [
            { type: "inside", start: 50, end: 100 },
            { type: "slider", start: 50, end: 100, height: 18, bottom: 4 },
        ],
        series: [
            {
                name: "GTGD (tỷ)",
                type: "bar",
                data: values,
                itemStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "#22c55e" },
                            { offset: 1, color: "#16a34a" },
                        ],
                    },
                },
                barMaxWidth: 28,
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">Thanh khoản thị trường</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
                {loading ? (
                    <div className="flex flex-col gap-2 h-full pt-2">
                        <Skeleton className="h-full w-full" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Không có dữ liệu
                    </div>
                ) : (
                    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
                )}
            </CardContent>
        </Card>
    );
};

export default LiquidityChart;
