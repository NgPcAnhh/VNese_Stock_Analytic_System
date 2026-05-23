"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import * as echarts from "echarts";

interface HeatmapStock {
    name: string;
    value: number;
    pChange: number;
    volume: number;
}
interface HeatmapSector {
    name: string;
    children: HeatmapStock[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const MarketHeatmap = () => {
    const [exchange, setExchange] = useState("all");
    const [data, setData] = useState<HeatmapSector[]>([]);
    const [loading, setLoading] = useState(true);
    const fetchRef = useRef(0);

    const fetchData = useCallback(async (ex: string) => {
        const id = ++fetchRef.current;
        setLoading(true);
        try {
            const q = ex === "all" ? "" : `?exchange=${ex}`;
            const res = await fetch(`${API}/tong-quan/market-heatmap${q}`);
            if (!res.ok) throw new Error("API error");
            const json: HeatmapSector[] = await res.json();
            if (id === fetchRef.current) setData(json);
        } catch (e) {
            console.error("MarketHeatmap fetch error:", e);
            if (id === fetchRef.current) setData([]);
        } finally {
            if (id === fetchRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(exchange);
    }, [exchange, fetchData]);

    const option = {
        tooltip: {
            formatter: function (info: any) {
                const value = info.value;
                const treePathInfo = info.treePathInfo;
                const treePath: string[] = [];
                for (let i = 1; i < treePathInfo.length; i++) {
                    treePath.push(treePathInfo[i].name);
                }
                const change = value[1];
                const changeColor = change > 0 ? "#22c55e" : change < 0 ? "#ef4444" : "#eab308";
                return `<b>${echarts.format.encodeHTML(treePath.join(" / "))}</b><br/>Thay đổi: <span style="color:${changeColor};font-weight:bold">${change > 0 ? "+" : ""}${change}%</span><br/>GTGD: <b>${value[0].toLocaleString()} tỷ</b>`;
            },
        },
        series: [
            {
                name: "Market Heatmap",
                type: "treemap",
                visibleMin: 300,
                label: {
                    show: true,
                    formatter: (params: any) => {
                        const change = params.value[1];
                        return `${params.name}\n${change > 0 ? "+" : ""}${change}%`;
                    },
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: "bold",
                },
                itemStyle: {
                    borderColor: "#fff",
                    borderWidth: 1,
                    gapWidth: 1,
                },
                data: data.map((sector) => ({
                    name: sector.name,
                    children: sector.children.map((stock) => ({
                        name: stock.name,
                        value: [stock.value, stock.pChange, stock.volume],
                        itemStyle: {
                            color:
                                stock.pChange > 0
                                    ? "#22c55e"
                                    : stock.pChange < 0
                                        ? "#ef4444"
                                        : "#eab308",
                        },
                    })),
                })),
            },
        ],
    };

    return (
        <Card className="shadow-sm border-border h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border">
                <CardTitle className="text-lg font-bold text-foreground">Cấu trúc thị trường</CardTitle>
                <Tabs value={exchange} onValueChange={setExchange} className="w-auto">
                    <TabsList className="h-8 bg-muted">
                        <TabsTrigger value="all" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">Tất cả</TabsTrigger>
                        <TabsTrigger value="HOSE" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">HOSE</TabsTrigger>
                        <TabsTrigger value="HNX" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">HNX</TabsTrigger>
                        <TabsTrigger value="UPCOM" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">UPCOM</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="h-[480px] relative">
                {loading ? (
                    <div className="flex flex-col gap-2 pt-4 h-full">
                        <Skeleton className="h-full w-full" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Không có dữ liệu
                    </div>
                ) : (
                    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge={true} />
                )}
            </CardContent>
        </Card>
    );
};

export default MarketHeatmap;
