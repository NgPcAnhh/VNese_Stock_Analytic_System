"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface StockItem {
    symbol: string;
    price: number;
    change: number;
    percent?: number;
    volume: string;
    foreignBuy?: number;
    foreignSell?: number;
    netVolume?: number;
    side?: "net_buy" | "net_sell";
}

interface AllData {
    gainers: StockItem[];
    losers: StockItem[];
    foreign: StockItem[];
}

function formatVolume(v: number): string {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
}

type Category = "gainers" | "losers" | "foreign";

/* ────────────────────────────────────────────────────────────────── */
/*  Skeleton rows — hiệu ứng loading placeholder                    */
/* ────────────────────────────────────────────────────────────────── */
function SkeletonRows({
    count = 10,
    cols = 5,
}: {
    count?: number;
    cols?: number;
}) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/50">
                    {Array.from({ length: cols }).map((_, j) => (
                        <TableCell key={j} className="py-2">
                            <Skeleton
                                className={cn(
                                    "h-4 rounded",
                                    j === 0
                                        ? "w-5"
                                        : j === 1
                                          ? "w-14"
                                          : "w-12 ml-auto"
                                )}
                            />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

export function TopStocks() {
    const [filter, setFilter] = useState<Category>("gainers");
    const [allData, setAllData] = useState<AllData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fetchRef = useRef(0);

    /* ── Fetch tất cả 3 danh mục trong 1 lần gọi ────────────────── */
    const fetchAll = useCallback(async (isRefresh = false) => {
        const id = ++fetchRef.current;
        try {
            setError(null);
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            const res = await fetch(
                `${API_BASE}/api/v1/tong-quan/top-stocks-all?limit=10`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: AllData = await res.json();
            if (id === fetchRef.current) {
                setAllData(json);
            }
        } catch (err: unknown) {
            console.error("Failed to fetch top stocks:", err);
            if (id === fetchRef.current) {
                setError("Không thể tải dữ liệu");
            }
        } finally {
            if (id === fetchRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    // Fetch 1 lần khi mount + auto-refresh mỗi 120s
    useEffect(() => {
        fetchAll(false);
        const interval = setInterval(() => fetchAll(true), 120_000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Chuyển tab = chỉ đổi filter local, KHÔNG gọi API
    const handleTabChange = (v: string) => {
        setFilter(v as Category);
    };

    const handleRefresh = () => {
        if (!refreshing && !loading) fetchAll(true);
    };

    const isForeign = filter === "foreign";
    const currentData: StockItem[] = allData ? allData[filter] : [];
    const skeletonCols = isForeign ? 7 : 5;

    return (
        <Card className="h-full shadow-sm flex flex-col">
            <CardHeader className="pb-2 border-b border-border/50 flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-base font-semibold">
                    Top Cổ Phiếu
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Tabs
                        value={filter}
                        onValueChange={handleTabChange}
                        className="w-auto"
                    >
                        <TabsList className="h-8">
                            <TabsTrigger
                                value="gainers"
                                className="text-xs px-2 h-6"
                            >
                                Tăng giá
                            </TabsTrigger>
                            <TabsTrigger
                                value="losers"
                                className="text-xs px-2 h-6"
                            >
                                Giảm giá
                            </TabsTrigger>
                            <TabsTrigger
                                value="foreign"
                                className="text-xs px-2 h-6"
                            >
                                Nước ngoài
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        title="Làm mới"
                    >
                        <RefreshCw
                            className={cn(
                                "h-4 w-4",
                                refreshing && "animate-spin"
                            )}
                        />
                    </button>
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto relative">
                {/* Overlay spinner khi đang refresh (giữ data cũ bên dưới) */}
                {refreshing && allData && (
                    <div className="absolute inset-0 z-10 bg-background/40 flex items-center justify-center pointer-events-none">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error && !allData ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <p className="text-sm text-red-500">{error}</p>
                        <button
                            onClick={() => fetchAll(false)}
                            className="text-xs text-blue-500 hover:underline"
                        >
                            Thử lại
                        </button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="h-9 text-xs w-8">
                                    #
                                </TableHead>
                                <TableHead className="h-9 text-xs">
                                    Mã
                                </TableHead>
                                <TableHead className="h-9 text-xs text-right">
                                    Giá
                                </TableHead>
                                <TableHead className="h-9 text-xs text-right">
                                    +/-
                                </TableHead>
                                {!isForeign && (
                                    <TableHead className="h-9 text-xs text-right">
                                        KL
                                    </TableHead>
                                )}
                                {isForeign && (
                                    <>
                                        <TableHead className="h-9 text-xs text-right">
                                            Mua
                                        </TableHead>
                                        <TableHead className="h-9 text-xs text-right">
                                            Bán
                                        </TableHead>
                                        <TableHead className="h-9 text-xs text-right">
                                            Ròng
                                        </TableHead>
                                    </>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Skeleton loading — chỉ khi chưa có data */}
                            {loading && !allData ? (
                                <SkeletonRows
                                    count={10}
                                    cols={skeletonCols}
                                />
                            ) : currentData.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={skeletonCols}
                                        className="h-32 text-center text-sm text-muted-foreground"
                                    >
                                        Không có dữ liệu
                                    </TableCell>
                                </TableRow>
                            ) : isForeign ? (
                                <>
                                    {/* ▲ Mua ròng nhiều nhất (net_buy) */}
                                    <TableRow className="bg-green-50 dark:bg-green-950/20 hover:bg-green-50">
                                        <TableCell
                                            colSpan={7}
                                            className="py-1.5 text-xs font-semibold text-green-600"
                                        >
                                            ▲ Mua ròng nhiều nhất
                                        </TableCell>
                                    </TableRow>
                                    {currentData
                                        .filter((i) => i.side === "net_buy")
                                        .map((item, idx) => (
                                            <TableRow
                                                key={item.symbol}
                                                className="hover:bg-muted/50 border-b border-border/50"
                                            >
                                                <TableCell className="py-2 text-xs text-muted-foreground">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs font-semibold">
                                                    {item.symbol}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right">
                                                    {item.price.toLocaleString(
                                                        "en-US",
                                                        {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        }
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right">
                                                    <span
                                                        className={cn(
                                                            "font-medium",
                                                            item.change > 0
                                                                ? "text-green-500"
                                                                : item.change <
                                                                    0
                                                                  ? "text-red-500"
                                                                  : "text-yellow-500"
                                                        )}
                                                    >
                                                        {item.change > 0
                                                            ? "+"
                                                            : ""}
                                                        {item.change.toFixed(2)}
                                                        %
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right text-blue-500">
                                                    {formatVolume(
                                                        item.foreignBuy ?? 0
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right text-orange-500">
                                                    {formatVolume(
                                                        item.foreignSell ?? 0
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right">
                                                    <span className="font-medium text-green-500">
                                                        +
                                                        {formatVolume(
                                                            item.netVolume ?? 0
                                                        )}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                    {/* ▼ Bán ròng nhiều nhất (net_sell) */}
                                    <TableRow className="bg-red-50 dark:bg-red-950/20 hover:bg-red-50">
                                        <TableCell
                                            colSpan={7}
                                            className="py-1.5 text-xs font-semibold text-red-600"
                                        >
                                            ▼ Bán ròng nhiều nhất
                                        </TableCell>
                                    </TableRow>
                                    {currentData
                                        .filter((i) => i.side === "net_sell")
                                        .map((item, idx) => (
                                            <TableRow
                                                key={item.symbol}
                                                className="hover:bg-muted/50 border-b border-border/50"
                                            >
                                                <TableCell className="py-2 text-xs text-muted-foreground">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs font-semibold">
                                                    {item.symbol}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right">
                                                    {item.price.toLocaleString(
                                                        "en-US",
                                                        {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        }
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right">
                                                    <span
                                                        className={cn(
                                                            "font-medium",
                                                            item.change > 0
                                                                ? "text-green-500"
                                                                : item.change <
                                                                    0
                                                                  ? "text-red-500"
                                                                  : "text-yellow-500"
                                                        )}
                                                    >
                                                        {item.change > 0
                                                            ? "+"
                                                            : ""}
                                                        {item.change.toFixed(2)}
                                                        %
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right text-blue-500">
                                                    {formatVolume(
                                                        item.foreignBuy ?? 0
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right text-orange-500">
                                                    {formatVolume(
                                                        item.foreignSell ?? 0
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-right">
                                                    <span className="font-medium text-red-500">
                                                        {formatVolume(
                                                            item.netVolume ?? 0
                                                        )}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </>
                            ) : (
                                currentData.map((item, idx) => (
                                    <TableRow
                                        key={item.symbol}
                                        className="hover:bg-muted/50 border-b border-border/50"
                                    >
                                        <TableCell className="py-2 text-xs text-muted-foreground">
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs font-semibold">
                                            {item.symbol}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-right">
                                            {item.price.toLocaleString(
                                                "en-US",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                }
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-right">
                                            <span
                                                className={cn(
                                                    "flex items-center justify-end gap-1 font-medium",
                                                    (item.percent ??
                                                        item.change) > 0
                                                        ? "text-green-500"
                                                        : (item.percent ??
                                                                item.change) < 0
                                                          ? "text-red-500"
                                                          : "text-yellow-500"
                                                )}
                                            >
                                                {(item.percent ??
                                                    item.change) > 0
                                                    ? "+"
                                                    : ""}
                                                {(
                                                    item.percent ?? item.change
                                                ).toFixed(2)}
                                                %
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-right text-muted-foreground">
                                            {item.volume}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
