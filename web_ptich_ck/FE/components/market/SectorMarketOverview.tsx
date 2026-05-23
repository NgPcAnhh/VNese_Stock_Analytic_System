"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { slugify } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SectorOverviewItem {
    name: string;
    change: number;
    volume: number;
    value: number;
    cashFlow: number;
}

const SECTOR_SHORT_NAME_MAP: Record<string, string> = {
    "Bất động sản": "BĐS",
    "Ngân hàng": "NH",
    "Chứng khoán": "CK",
    "Bảo hiểm": "BH",
    "Thép": "Thép",
    "Xây dựng": "XD",
    "Vật liệu xây dựng": "VLXD",
    "Dầu khí": "Dầu khí",
    "Điện": "Điện",
    "Nước": "Nước",
    "Bán lẻ": "BL",
    "Hàng cá nhân & gia dụng": "HCN-GD",
    "Thực phẩm & đồ uống": "TP-ĐU",
    "Hóa chất": "Hóa chất",
    "Viễn thông": "VT",
    "Công nghệ thông tin": "CNTT",
    "Dịch vụ tài chính": "DVTC",
    "Tài nguyên cơ bản": "TNCB",
    "Y tế": "Y tế",
    "Du lịch & giải trí": "DL-GT",
    "Hàng & dịch vụ công nghiệp": "CN",
    "Ô tô & phụ tùng": "Ô tô",
    "Truyền thông": "Media",
    "Vận tải": "VTải",
    "Cảng biển": "Cảng",
    "Phân bón": "PB",
    "Dệt may": "DM",
    "Thủy sản": "TS",
    "Nông nghiệp": "NN",
};

const getShortSectorName = (name: string) => {
    const mapped = SECTOR_SHORT_NAME_MAP[name];
    if (mapped) return mapped;

    // Fallback: lấy chữ cái đầu để tránh tên quá dài trên giao diện.
    const acronym = name
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("");
    return acronym || name;
};

const SectorMarketOverview = () => {
    const [data, setData] = useState<SectorOverviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(`${API_BASE}/api/v1/market/sector-overview`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: SectorOverviewItem[] = await res.json();
            setData(json);
        } catch (err) {
            console.error("Failed to fetch sector overview:", err);
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

    const chartData = useMemo(
        () =>
            data.map((item) => ({
                originalName: item.name,
                shortName: getShortSectorName(item.name),
                change: item.change,
            })),
        [data]
    );

    const chartOption = useMemo(() => ({
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            textStyle: {
                fontFamily: "var(--font-roboto), Roboto, sans-serif",
            },
            formatter: (params: Array<{ dataIndex: number; value: number }>) => {
                const point = params?.[0];
                if (!point) return "";
                const item = chartData[point.dataIndex];
                if (!item) return "";
                return `${item.originalName}<br/>Biến động: ${point.value}%`;
            },
        },
        grid: {
            left: "8%",
            right: "8%",
            top: "6%",
            bottom: "8%",
            containLabel: true,
        },
        xAxis: {
            type: "value",
            position: "top",
            splitLine: { lineStyle: { type: "dashed" } },
        },
        yAxis: {
            type: "category",
            axisLine: { show: false },
            axisLabel: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            data: chartData.map((item) => item.shortName),
        },
        series: [
            {
                name: "Thay đổi %",
                type: "bar",
                stack: "Total",
                barWidth: 12,
                label: {
                    show: true,
                    formatter: (params: { data: { shortName: string } }) => params.data?.shortName ?? "",
                },
                data: chartData.map((item) => ({
                    value: item.change,
                    shortName: item.shortName,
                    originalName: item.originalName,
                    itemStyle: {
                        color: item.change >= 0 ? "#22c55e" : "#ef4444",
                    },
                    label: {
                        position: item.change >= 0 ? "left" : "right",
                    },
                })),
            },
        ],
    }), [chartData]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm border-border">
                    <CardHeader className="pb-2"><CardTitle className="text-lg font-bold text-foreground">Biến động ngành</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-[420px] relative overflow-hidden rounded-lg">
                            <Skeleton className="h-full w-full" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                                <span className="text-xs text-slate-400">Đang tải biểu đồ...</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-border">
                    <CardHeader className="pb-2"><CardTitle className="text-lg font-bold text-foreground">Chi tiết ngành</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2.5 animate-pulse">
                            <div className="flex justify-between border-b pb-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-3 w-14" />
                                <Skeleton className="h-3 w-14" />
                            </div>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="flex justify-between py-1">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-3 w-10" />
                                    <Skeleton className="h-3 w-14" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <p>{error}</p>
                <button onClick={fetchData} className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                    <RefreshCw className="w-4 h-4" /> Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-foreground">Biến động ngành</CardTitle>
                        <button onClick={fetchData} className="text-muted-foreground hover:text-foreground"><RefreshCw className="w-4 h-4" /></button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ReactECharts option={chartOption} style={{ height: "420px" }} />
                </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-foreground">Chi tiết ngành</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-auto max-h-[420px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Ngành</TableHead>
                                    <TableHead className="text-right">Thay đổi</TableHead>
                                    <TableHead className="text-right">Dòng tiền</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">
                                            <Link href={`/market/sector/${slugify(item.name)}`} className="text-orange-500 hover:underline">
                                                {item.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-bold ${item.change >= 0 ? "text-green-600" : "text-red-600"}`}
                                        >
                                            {item.change}%
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.cashFlow.toLocaleString()} Tỷ
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SectorMarketOverview;
