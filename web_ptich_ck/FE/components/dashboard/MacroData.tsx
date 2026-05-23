"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface MacroYearlyIndicator {
    key: string;
    label: string;
    values: (number | null)[];
}

interface MacroYearlyResponse {
    years: number[];
    indicators: MacroYearlyIndicator[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Show last N years only */
const VISIBLE_YEARS = 4;

/** Format a numeric value nicely; null → "N/A" */
const fmt = (v: number | null): string => {
    if (v === null || v === undefined) return "N/A";
    if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Compute YoY growth string: (cur - prev) / |prev| * 100 */
const growthFmt = (cur: number | null, prev: number | null): { text: string; dir: "up" | "down" | "flat" } => {
    if (cur === null || prev === null || prev === 0) return { text: "N/A", dir: "flat" };
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    const rounded = Math.round(pct * 100) / 100;
    const sign = rounded > 0 ? "+" : "";
    return {
        text: `${sign}${rounded.toFixed(2)}%`,
        dir: rounded > 0 ? "up" : rounded < 0 ? "down" : "flat",
    };
};

export const MacroData = () => {
    const [data, setData] = useState<MacroYearlyResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API}/tong-quan/macro-yearly`);
                if (!res.ok) throw new Error("API error");
                const json: MacroYearlyResponse = await res.json();
                if (!cancelled) setData(json);
            } catch (e) {
                console.error("MacroData fetch error:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    /** Trim to last VISIBLE_YEARS years */
    const view = useMemo(() => {
        if (!data) return null;
        const total = data.years.length;
        if (total <= VISIBLE_YEARS) return data;
        const startIdx = total - VISIBLE_YEARS;
        return {
            years: data.years.slice(startIdx),
            indicators: data.indicators.map((ind) => ({
                ...ind,
                values: ind.values.slice(startIdx),
            })),
        };
    }, [data]);

    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg font-bold text-foreground">
                    Chỉ số vĩ mô Việt Nam
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-4 space-y-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-6 w-full" />
                        ))}
                    </div>
                ) : !view || view.indicators.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                        Không có dữ liệu
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-xs font-semibold sticky left-0 bg-card z-10 min-w-[200px]">
                                        Chỉ số
                                    </TableHead>
                                    {view.years.map((y) => (
                                        <TableHead key={y} className="text-xs text-center font-semibold min-w-[90px] text-foreground">
                                            {y}
                                        </TableHead>
                                    ))}
                                        <TableHead className="text-xs text-center font-semibold min-w-[100px] bg-blue-50 dark:bg-blue-950/30">
                                        Tăng trưởng
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {view.indicators.map((ind) => {
                                    const vals = ind.values;
                                    const lastIdx = vals.length - 1;
                                    const growth = lastIdx >= 1
                                        ? growthFmt(vals[lastIdx], vals[lastIdx - 1])
                                        : { text: "N/A", dir: "flat" as const };

                                    return (
                                        <TableRow key={ind.key} className="hover:bg-muted/50 border-b border-border/50">
                                            <TableCell className="font-semibold text-sm sticky left-0 bg-card z-10 text-foreground">
                                                {ind.label}
                                            </TableCell>
                                            {vals.map((val, idx) => {
                                                const prev = idx > 0 ? vals[idx - 1] : null;
                                                const isUp = val !== null && prev !== null && val > prev;
                                                const isDown = val !== null && prev !== null && val < prev;
                                                return (
                                                    <TableCell
                                                        key={idx}
                                                        className={cn(
                                                            "text-center text-sm tabular-nums",
                                                            val === null && "text-muted-foreground",
                                                            isUp && "text-green-600",
                                                            isDown && "text-red-500",
                                                        )}
                                                    >
                                                        {fmt(val)}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className={cn(
                                                "text-center text-sm font-semibold tabular-nums bg-blue-50/50 dark:bg-blue-950/20",
                                                growth.dir === "up" && "text-green-600",
                                                growth.dir === "down" && "text-red-500",
                                                growth.dir === "flat" && "text-muted-foreground",
                                            )}>
                                                <span className="inline-flex items-center gap-0.5">
                                                    {growth.dir === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
                                                    {growth.dir === "down" && <ArrowDownRight className="h-3.5 w-3.5" />}
                                                    {growth.dir === "flat" && <Minus className="h-3.5 w-3.5" />}
                                                    {growth.text}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default MacroData;
