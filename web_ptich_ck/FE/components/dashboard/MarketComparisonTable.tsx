"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ComparisonItem {
    name: string;
    price: number;
    change: number;
    status: "up" | "down" | "unchanged";
}

export function MarketComparisonTable() {
    const [data, setData] = useState<ComparisonItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(
                `${API_BASE}/api/v1/tong-quan/market-comparison`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: ComparisonItem[] = await res.json();
            setData(json);
        } catch (err: unknown) {
            console.error("Failed to fetch market comparison:", err);
            setError("Không thể tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 300_000); // 5 phút
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <Card className="shadow-sm h-full flex flex-col">
            <CardHeader className="pb-2 border-b border-border/50 shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                        Các chỉ số toàn cầu & vĩ mô
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

            <CardContent className="p-0 flex-1 overflow-y-auto relative">
                {loading && data.length === 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[120px]">Chỉ số</TableHead>
                                <TableHead className="text-right">Điểm</TableHead>
                                <TableHead className="text-right">% Thay đổi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i} className="border-b border-border/50">
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[120px]">Chỉ số</TableHead>
                                <TableHead className="text-right">Điểm</TableHead>
                                <TableHead className="text-right">% Thay đổi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow
                                    key={item.name}
                                    className="hover:bg-muted/50 border-b border-border/50"
                                >
                                    <TableCell className="font-medium">
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {item.price.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span
                                            className={cn(
                                                "flex items-center justify-end gap-1 font-semibold",
                                                item.status === "up"
                                                    ? "text-green-500"
                                                    : item.status === "down"
                                                        ? "text-red-500"
                                                        : "text-yellow-500"
                                            )}
                                        >
                                            {item.status === "up" ? (
                                                <ArrowUp className="h-3 w-3" />
                                            ) : item.status === "down" ? (
                                                <ArrowDown className="h-3 w-3" />
                                            ) : (
                                                <Minus className="h-3 w-3" />
                                            )}
                                            {item.change >= 0 ? "+" : ""}
                                            {item.change.toFixed(2)}%
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
