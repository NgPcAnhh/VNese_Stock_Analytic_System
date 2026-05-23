"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { slugify } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── Types ─────────────────────────────────────────────────────── */
interface WatchlistStock {
    symbol: string;
    companyName: string;
    exchange: string;
    price: number;
    refPrice: number;
    priceChange: number;
    change: number;
    volume: number;
    tradeValue: number;
}

interface WatchlistSector {
    id: string;
    name: string;
    count: number;
}

interface SectorWatchlistData {
    sectors: WatchlistSector[];
    stocks: Record<string, WatchlistStock[]>;
}

/* ── Price color classification (Vietnamese market) ────────────── */
type PriceLevel = "ceiling" | "strongUp" | "up" | "ref" | "down" | "strongDown" | "floor";

const CEILING_PCT: Record<string, number> = { HOSE: 7, HNX: 10, UPCOM: 15 };

function getPriceLevel(change: number, exchange: string): PriceLevel {
    const limit = CEILING_PCT[exchange] || 7;
    if (change >= limit) return "ceiling";
    if (change <= -limit) return "floor";
    if (change >= 3) return "strongUp";
    if (change > 0) return "up";
    if (change === 0) return "ref";
    if (change > -3) return "down";
    return "strongDown";
}

const LEVEL_COLORS: Record<PriceLevel, { text: string; bg: string; dot: string }> = {
    ceiling:    { text: "text-fuchsia-600",  bg: "bg-fuchsia-600 text-white",   dot: "bg-fuchsia-600" },
    strongUp:   { text: "text-emerald-600",  bg: "bg-emerald-600 text-white",   dot: "bg-emerald-600" },
    up:         { text: "text-green-600",    bg: "bg-green-100 text-green-700",  dot: "bg-green-500"   },
    ref:        { text: "text-yellow-600",   bg: "bg-yellow-100 text-yellow-700",dot: "bg-yellow-500"  },
    down:       { text: "text-red-600",      bg: "bg-red-100 text-red-700",      dot: "bg-red-500"     },
    strongDown: { text: "text-red-800",      bg: "bg-red-700 text-white",        dot: "bg-red-800"     },
    floor:      { text: "text-cyan-600",     bg: "bg-cyan-600 text-white",       dot: "bg-cyan-500"    },
};

const LEVEL_LABELS: Record<PriceLevel, string> = {
    ceiling: "Trần",
    strongUp: "Tăng mạnh",
    up: "Tăng",
    ref: "TC",
    down: "Giảm",
    strongDown: "Giảm mạnh",
    floor: "Sàn",
};

/* ── Formatters ────────────────────────────────────────────────── */
const fmtPrice = (p: number) =>
    p.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Component ─────────────────────────────────────────────────── */
export function SectorWatchlist() {
    const [watchlistData, setWatchlistData] = useState<SectorWatchlistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const fetchRef = useRef(0);

    const fetchData = useCallback(async () => {
        const id = ++fetchRef.current;
        try {
            setError(null);
            const res = await fetch(`${API_BASE}/api/v1/market/sector-watchlist`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: SectorWatchlistData = await res.json();
            if (id !== fetchRef.current) return;
            setWatchlistData(json);
            if (selectedSectors.length === 0 && json.sectors.length > 0) {
                setSelectedSectors(json.sectors.slice(0, 3).map((s) => s.id));
            }
        } catch (err) {
            console.error("Failed to fetch sector watchlist:", err);
            if (id === fetchRef.current) setError("Không thể tải dữ liệu");
        } finally {
            if (id === fetchRef.current) setLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 120_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const toggleSector = (id: string) => {
        setSelectedSectors((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

    /* ── Loading skeleton ── */
    if (loading) {
        return (
            <Card className="shadow-md border-border">
                <CardHeader className="pb-3 border-b border-border/50">
                    <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent className="pt-4 space-y-4 animate-pulse">
                    <div className="flex gap-2 flex-wrap">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 rounded-full" style={{ width: `${60 + Math.random() * 40}px` }} />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="border rounded-lg p-3 space-y-2">
                                <Skeleton className="h-4 w-24" />
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <div key={j} className="flex justify-between">
                                        <Skeleton className="h-3 w-12" />
                                        <Skeleton className="h-3 w-14" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    /* ── Error state ── */
    if (error || !watchlistData) {
        return (
            <Card className="shadow-md border-border">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                    <p>{error || "Không có dữ liệu"}</p>
                    <button onClick={fetchData} className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                        <RefreshCw className="w-4 h-4" /> Thử lại
                    </button>
                </CardContent>
            </Card>
        );
    }

    const { sectors, stocks } = watchlistData;
    const visibleSectors = sectors.filter((s) => selectedSectors.includes(s.id));

    return (
        <Card className="shadow-md border-border">
            {/* ── Header ── */}
            <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-foreground">
                        Bảng giá chi tiết theo ngành
                    </CardTitle>
                    <button onClick={fetchData} className="text-muted-foreground hover:text-foreground" title="Làm mới">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                    {(["floor", "strongDown", "down", "ref", "up", "strongUp", "ceiling"] as PriceLevel[]).map((level) => (
                        <span key={level} className="flex items-center gap-1 text-[10px]">
                            <span className={`inline-block w-3 h-3 rounded-sm ${LEVEL_COLORS[level].dot}`} />
                            <span className="text-muted-foreground">{LEVEL_LABELS[level]}</span>
                        </span>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Left panel: sector filter (15-20% on large screens) */}
                    <aside className="w-full lg:basis-[18%] lg:min-w-[220px] lg:max-w-[300px] lg:shrink-0 border border-border rounded-lg p-3 bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-foreground">Bộ lọc ngành</p>
                            <span className="text-[11px] text-muted-foreground">{selectedSectors.length}/{sectors.length}</span>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                            <button
                                onClick={() => setSelectedSectors(sectors.map((s) => s.id))}
                                className="text-xs text-orange-600 hover:underline font-medium"
                            >
                                Chọn tất cả
                            </button>
                            <button
                                onClick={() => setSelectedSectors([])}
                                className="text-xs text-muted-foreground hover:underline font-medium"
                            >
                                Bỏ chọn
                            </button>
                        </div>

                        <div className="space-y-2">
                            {sectors.map((sector) => {
                                const isSelected = selectedSectors.includes(sector.id);
                                return (
                                    <Badge
                                        key={sector.id}
                                        variant={isSelected ? "default" : "outline"}
                                        className={`w-full justify-between cursor-pointer transition-all hover:opacity-80 px-3 py-1.5 text-xs ${
                                            isSelected
                                                ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                                                : "bg-card text-muted-foreground border-border hover:border-orange-300 hover:text-orange-600"
                                        }`}
                                        onClick={() => toggleSector(sector.id)}
                                    >
                                        <span className="truncate">{sector.name}</span>
                                        <span className={`${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                            {sector.count}
                                        </span>
                                    </Badge>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Right panel: sector tables */}
                    <section className="w-full lg:basis-[82%]">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {visibleSectors.map((sector) => {
                        const items = stocks[sector.id] || [];
                        if (items.length === 0) return null;
                        const sorted = [...items].sort((a, b) => b.change - a.change);

                        const sectorUp = items.filter((s) => s.change > 0).length;
                        const sectorDown = items.filter((s) => s.change < 0).length;
                        const sectorUnch = items.filter((s) => s.change === 0).length;

                        return (
                            <div
                                key={sector.id}
                                className="border border-border rounded-lg overflow-hidden"
                            >
                                {/* Sector header */}
                                <div className="flex justify-between items-center px-3 py-2 bg-muted/50 border-b border-border/50">
                                    <span className="text-xs font-bold text-foreground truncate shrink max-w-[150px]">
                                        <Link href={`/market/sector/${slugify(sector.name)}`} className="text-orange-500 hover:underline">
                                            {sector.name}
                                        </Link>
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px] shrink-0 ml-2">
                                        <span className="text-green-600 font-semibold">{sectorUp}&#8593;</span>
                                        <span className="text-yellow-500 font-semibold">{sectorUnch}&#8722;</span>
                                        <span className="text-red-600 font-semibold">{sectorDown}&#8595;</span>
                                        <span className="text-muted-foreground">({items.length})</span>
                                    </div>
                                </div>

                                {/* Stock list — compact: Mã | Giá | % */}
                                <div className="overflow-y-auto max-h-[280px]">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-card z-10">
                                            <tr className="border-b border-border/50 text-muted-foreground">
                                                <th className="text-left py-1 px-2 font-medium">Mã</th>
                                                <th className="text-right py-1 px-2 font-medium">Giá</th>
                                                <th className="text-right py-1 px-2 font-medium">%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sorted.map((stock) => {
                                                const level = getPriceLevel(stock.change, stock.exchange || "HOSE");
                                                const colors = LEVEL_COLORS[level];
                                                return (
                                                    <tr
                                                        key={stock.symbol}
                                                        className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                                                    >
                                                        <td className="py-1 px-2">
                                                            <Link
                                                                href={`/stock/${stock.symbol}`}
                                                                className={`font-bold hover:underline ${colors.text}`}
                                                            >
                                                                {stock.symbol}
                                                            </Link>
                                                        </td>
                                                        <td className={`text-right py-1 px-2 font-semibold ${colors.text}`}>
                                                            {fmtPrice(stock.price)}
                                                        </td>
                                                        <td className="text-right py-1 px-2">
                                                            <span
                                                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[44px] text-center ${colors.bg}`}
                                                            >
                                                                {stock.change > 0 ? "+" : ""}{stock.change.toFixed(2)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                            </div>
                    </section>
                </div>

                {selectedSectors.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        Chọn ít nhất một ngành để xem bảng giá chi tiết
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
