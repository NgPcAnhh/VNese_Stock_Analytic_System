"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CashFlowData {
    advancingValue: number;
    unchangedValue: number;
    decliningValue: number;
    advancingCount: number;
    unchangedCount: number;
    decliningCount: number;
}

export function CashFlow() {
    const [data, setData] = useState<CashFlowData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(`${API_BASE}/api/v1/market/cash-flow`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: CashFlowData = await res.json();
            setData(json);
        } catch (err) {
            console.error("Failed to fetch cash flow:", err);
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
        ? data.advancingValue + data.unchangedValue + data.decliningValue
        : 0;
    const advPct = total > 0 && data ? ((data.advancingValue / total) * 100).toFixed(0) : "0";
    const unchPct = total > 0 && data ? ((data.unchangedValue / total) * 100).toFixed(0) : "0";
    const decPct = total > 0 && data ? ((data.decliningValue / total) * 100).toFixed(0) : "0";

    const fmtVal = (v: number) => {
        if (v >= 1000) return `${(v / 1000).toFixed(1)}K tỷ`;
        return `${v.toFixed(1)} tỷ`;
    };

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-foreground">Phân bố dòng tiền</CardTitle>
                    {!loading && (
                        <button
                            onClick={fetchData}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Làm mới"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {loading && !data ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="flex h-12 w-full rounded-lg overflow-hidden gap-0.5">
                            <Skeleton className="flex-[45] h-full rounded-none" />
                            <Skeleton className="flex-[10] h-full rounded-none" />
                            <Skeleton className="flex-[45] h-full rounded-none" />
                        </div>
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-12 gap-1">
                        <p className="text-xs text-red-500">{error}</p>
                        <button onClick={fetchData} className="text-xs text-blue-500 hover:underline">Thử lại</button>
                    </div>
                ) : data ? (
                    <>
                        <div className="flex h-12 w-full rounded-lg overflow-hidden font-bold text-white text-xs">
                            <div
                                className="bg-green-500 flex items-center justify-center transition-all hover:bg-green-600 cursor-pointer"
                                style={{ width: `${advPct}%` }}
                            >
                                Tăng {fmtVal(data.advancingValue)}
                            </div>
                            <div
                                className="bg-yellow-400 flex items-center justify-center text-slate-900 transition-all hover:bg-yellow-500 cursor-pointer"
                                style={{ width: `${unchPct}%` }}
                            >
                                {fmtVal(data.unchangedValue)}
                            </div>
                            <div
                                className="bg-red-500 flex items-center justify-center transition-all hover:bg-red-600 cursor-pointer"
                                style={{ width: `${decPct}%` }}
                            >
                                Giảm {fmtVal(data.decliningValue)}
                            </div>
                        </div>
                        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>Tăng: {data.advancingCount} mã</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                <span>TC: {data.unchangedCount} mã</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span>Giảm: {data.decliningCount} mã</span>
                            </div>
                        </div>
                    </>
                ) : null}
            </CardContent>
        </Card>
    );
}
