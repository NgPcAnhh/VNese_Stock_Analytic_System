"use client";

import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PEPoint {
    month: string;
    value: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Only show the last N periods */
const VISIBLE_PERIODS = 10;

export const ValuationChart = () => {
    const [data, setData] = useState<PEPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API}/tong-quan/valuation-pe`);
                if (!res.ok) throw new Error("API error");
                const json: PEPoint[] = await res.json();
                if (!cancelled) setData(json.slice(-VISIBLE_PERIODS));
            } catch (e) {
                console.error("ValuationChart fetch error:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const values = data.map((d) => d.value);
    const minVal = values.length ? Math.floor(Math.min(...values) - 1) : 0;
    const maxVal = values.length ? Math.ceil(Math.max(...values) + 2) : 20;

    const option = {
        tooltip: {
            trigger: "axis" as const,
            formatter: (params: any) => {
                const p = Array.isArray(params) ? params[0] : params;
                return `<b>${p.name}</b><br/>P/E: <b>${p.value.toFixed(2)}</b>`;
            },
        },
        grid: { left: "3%", right: "4%", top: "8%", bottom: "15%", containLabel: true },
        xAxis: {
            type: "category" as const,
            data: data.map((d) => d.month),
            axisLabel: {
                rotate: 45,
                fontSize: 10,
                interval: 0,
            },
        },
        yAxis: {
            type: "value" as const,
            min: minVal,
            max: maxVal,
            axisLabel: { formatter: (v: number) => v.toFixed(1) },
        },
        series: [
            {
                name: "P/E",
                type: "line",
                data: values,
                smooth: true,
                lineStyle: { color: "#f97316", width: 2 },
                itemStyle: { color: "#f97316" },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(249, 115, 22, 0.3)" },
                            { offset: 1, color: "rgba(249, 115, 22, 0.02)" },
                        ],
                    },
                },
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">P/E VN-Index</CardTitle>
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

export default ValuationChart;
