"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { slugify } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SectorTableRow {
    name: string;
    stockCount: number;
    marketCap: string;
    pe: number;
    pb: number;
    priceChange1D: number;
    priceChange7D: number;
    priceChangeYTD: number;
    priceChange1Y: number;
    priceChange3Y: number;
}

type SortKey = keyof SectorTableRow;
type SortDir = "asc" | "desc";

const colorClass = (v: number) =>
    v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-muted-foreground";

const fmt = (v: number) => {
    const s = v > 0 ? "+" : "";
    return `${s}${v.toFixed(2)}%`;
};

export default function SectorAnalysisTable() {
    const [data, setData] = useState<SectorTableRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>("marketCap");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(`${API_BASE}/api/v1/market/sector-analysis`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: SectorTableRow[] = await res.json();
            setData(json);
        } catch (err) {
            console.error("Failed to fetch sector analysis:", err);
            setError("Không thể tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 300_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const sorted = useMemo(() => [...data].sort((a, b) => {
        let av: number | string = a[sortKey];
        let bv: number | string = b[sortKey];
        // parse marketCap string for numeric sort
        if (sortKey === "marketCap") {
            av = parseFloat(String(av).replace(/,/g, ""));
            bv = parseFloat(String(bv).replace(/,/g, ""));
        }
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
    }), [data, sortKey, sortDir]);

    const SortableHead = ({ label, colKey, className = "" }: { label: string; colKey: SortKey; className?: string }) => (
        <TableHead
            className={`text-right cursor-pointer select-none hover:bg-muted/50 transition-colors whitespace-nowrap ${className}`}
            onClick={() => handleSort(colKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <ArrowUpDown className={`h-3 w-3 ${sortKey === colKey ? "text-orange-500" : "text-muted-foreground"}`} />
            </span>
        </TableHead>
    );

    if (loading) {
        return (
            <Card className="shadow-sm border-border">
                <CardContent className="p-4">
                    <div className="animate-pulse space-y-0">
                        {/* Header row */}
                        <div className="flex gap-3 py-2 border-b border-slate-200">
                            <Skeleton className="h-3 w-28" />
                            {Array.from({ length: 9 }).map((_, i) => (
                                <Skeleton key={i} className="h-3 w-14" />
                            ))}
                        </div>
                        {/* Data rows */}
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="flex gap-3 py-2.5 border-b border-slate-50">
                                <Skeleton className="h-3 w-28" />
                                {Array.from({ length: 9 }).map((_, j) => (
                                    <Skeleton key={j} className="h-3 w-14" />
                                ))}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
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
        <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead
                                    className="sticky left-0 bg-muted/50 z-10 min-w-[160px] cursor-pointer select-none hover:bg-muted/50 transition-colors"
                                    onClick={() => handleSort("name")}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Nhóm ngành
                                        <ArrowUpDown className={`h-3 w-3 ${sortKey === "name" ? "text-orange-500" : "text-muted-foreground"}`} />
                                    </span>
                                </TableHead>
                                <SortableHead label="Số lượng cổ phiếu" colKey="stockCount" />
                                <SortableHead label="Vốn hóa" colKey="marketCap" />
                                <SortableHead label="P/E" colKey="pe" />
                                <SortableHead label="P/B" colKey="pb" />
                                <SortableHead label="% Giá 1D" colKey="priceChange1D" />
                                <SortableHead label="% Giá 7D" colKey="priceChange7D" />
                                <SortableHead label="% Giá YTD" colKey="priceChangeYTD" />
                                <SortableHead label="% Giá 1Y" colKey="priceChange1Y" />
                                <SortableHead label="% Giá 3Y" colKey="priceChange3Y" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.map((row) => (
                                <TableRow key={row.name} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="sticky left-0 bg-card font-semibold text-foreground min-w-[160px] z-10">
                                        <Link href={`/market/sector/${slugify(row.name)}`} className="text-orange-500 hover:underline">
                                            {row.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">{row.stockCount}</TableCell>
                                    <TableCell className="text-right text-muted-foreground font-medium">{row.marketCap}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{row.pe.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{row.pb.toFixed(2)}</TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChange1D)}`}>
                                        {fmt(row.priceChange1D)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChange7D)}`}>
                                        {fmt(row.priceChange7D)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChangeYTD)}`}>
                                        {fmt(row.priceChangeYTD)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChange1Y)}`}>
                                        {fmt(row.priceChange1Y)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChange3Y)}`}>
                                        {fmt(row.priceChange3Y)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
