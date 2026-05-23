"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Search, TrendingUp, TrendingDown, BarChart3, Filter, SlidersHorizontal, ListFilter, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StockScreener from "@/components/stocks/StockScreener";

/* ── API base ──────────────────────────────────────────────────── */
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/* ── Types matching BE response ────────────────────────────────── */
interface StockItem {
    ticker: string;
    company_name: string | null;
    sector: string | null;
    exchange: string | null;
    current_price: number | null;
    price_change: number | null;
    price_change_percent: number | null;
    volume: number | null;
    avg_volume_10d: number | null;
    market_cap: number | null;
    pe: number | null;
    pb: number | null;
    eps: number | null;
    roe: number | null;
    roa: number | null;
    debt_to_equity: number | null;
    dividend_yield: number | null;
    high_52w: number | null;
    low_52w: number | null;
    week_change_52: number | null;
    sparkline: number[];
}

interface MarketSummary {
    total_stocks: number;
    total_up: number;
    total_down: number;
    total_unchanged: number;
    total_volume: number;
    avg_pe: number | null;
}

interface OverviewResponse {
    data: StockItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    summary: MarketSummary;
}

interface SectorItem {
    name: string;
    count: number;
}

/* ── Sort field mapping (FE key → BE sort_by) ─────────────────── */
type SortKey = "ticker" | "current_price" | "price_change_percent" | "volume" | "market_cap" | "pe" | "pb" | "eps" | "roe" | "week_change_52";
type SortDir = "asc" | "desc";

/* ── Formatters ────────────────────────────────────────────────── */
const formatPrice = (p: number) => p.toLocaleString("vi-VN");
const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
};
const formatMarketCap = (v: number) => {
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}Tr tỷ`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(0)}K tỷ`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)} tỷ`;
    return v.toLocaleString("vi-VN");
};

/* ── Sparkline component ───────────────────────────────────────── */
const Sparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
    if (!data || data.length === 0) return <span className="text-gray-300 text-xs">—</span>;
    const option = {
        grid: { left: 0, right: 0, top: 0, bottom: 0 },
        xAxis: { type: "category" as const, show: false, data: data.map((_, i) => i) },
        yAxis: { type: "value" as const, show: false, min: Math.min(...data) * 0.98, max: Math.max(...data) * 1.02 },
        series: [{
            type: "line", data, smooth: true, symbol: "none",
            lineStyle: { color: positive ? "#22c55e" : "#ef4444", width: 1.5 },
            areaStyle: {
                color: {
                    type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: positive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)" },
                        { offset: 1, color: "rgba(255,255,255,0)" },
                    ],
                },
            },
        }],
    };
    return <ReactECharts option={option} style={{ height: 32, width: 80 }} opts={{ renderer: "svg" }} />;
};

/* ── Session ID (persistent per browser tab) ───────────────────── */
const getSessionId = () => {
    if (typeof window === "undefined") return "anonymous";
    let sid = sessionStorage.getItem("stock_session_id");
    if (!sid) {
        sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem("stock_session_id", sid);
    }
    return sid;
};

export default function StocksPage() {
    const [activeTab, setActiveTab] = useState("overview");

    /* ── Data state ── */
    const [stocks, setStocks] = useState<StockItem[]>([]);
    const [summary, setSummary] = useState<MarketSummary>({ total_stocks: 0, total_up: 0, total_down: 0, total_unchanged: 0, total_volume: 0, avg_pe: null });
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sectors, setSectors] = useState<SectorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [sectorsLoading, setSectorsLoading] = useState(true);

    /* ── Filter / sort / page state ── */
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sectorFilter, setSectorFilter] = useState("Tất cả");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);
    const [sortKey, setSortKey] = useState<SortKey>("ticker");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [page, setPage] = useState(1);
    const pageSize = 30;

    /* ── Fetch/cache refs ── */
    const overviewCacheRef = useRef<Map<string, OverviewResponse>>(new Map());
    const fetchControllerRef = useRef<AbortController | null>(null);
    const trackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* ── Fetch stock overview data ── */
    const fetchStocks = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(pageSize),
                sort_by: sortKey,
                sort_dir: sortDir,
            });
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (sectorFilter !== "Tất cả") params.set("sector", sectorFilter);

            const queryString = params.toString();
            const cached = overviewCacheRef.current.get(queryString);
            if (cached) {
                setStocks(cached.data);
                setTotal(cached.total);
                setTotalPages(cached.total_pages);
                setSummary(cached.summary);
                setLoading(false);
                setInitialLoad(false);
                return;
            }

            fetchControllerRef.current?.abort();
            const controller = new AbortController();
            fetchControllerRef.current = controller;

            const res = await fetch(`${API}/stock-list/overview?${queryString}`, {
                signal: controller.signal,
            });
            if (!res.ok) throw new Error("API error");
            const json: OverviewResponse = await res.json();
            overviewCacheRef.current.set(queryString, json);
            setStocks(json.data);
            setTotal(json.total);
            setTotalPages(json.total_pages);
            setSummary(json.summary);
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            console.error("Failed to fetch stock overview:", err);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    }, [page, pageSize, sortKey, sortDir, debouncedSearch, sectorFilter]);

    /* ── Fetch sectors ── */
    useEffect(() => {
        (async () => {
            setSectorsLoading(true);
            try {
                const res = await fetch(`${API}/stock-list/sectors`);
                if (res.ok) {
                    const json: SectorItem[] = await res.json();
                    setSectors(json);
                }
            } catch (err) {
                console.error("Failed to fetch sectors:", err);
            } finally {
                setSectorsLoading(false);
            }
        })();
    }, []);

    /* ── Refetch when filters change ── */
    useEffect(() => { fetchStocks(); }, [fetchStocks]);

    /* ── Reset page when search / sector changes ── */
    useEffect(() => { setPage(1); }, [debouncedSearch, sectorFilter]);

    /* ── Search tracking (debounced 1.5s) ── */
    const handleSearch = (value: string) => {
        setSearch(value);
        if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
        if (value.trim().length >= 2) {
            trackTimerRef.current = setTimeout(() => {
                fetch(`${API}/stock-list/track-search`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ keyword: value.trim(), session_id: getSessionId() }),
                }).catch(() => { });
            }, 1500);
        }
    };

    /* ── Click tracking ── */
    const trackClick = (ticker: string) => {
        fetch(`${API}/stock-list/track-click`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker, session_id: getSessionId() }),
        }).catch(() => { });
    };

    /* ── Sort toggle ── */
    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
        <TableHead
            className={`cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap ${className}`}
            onClick={() => toggleSort(field)}
        >
            <div className="flex items-center justify-center gap-1">
                {label}
                <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-orange-500" : "text-gray-300"}`} />
            </div>
        </TableHead>
    );

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-[1600px] mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Bảng phân tích cổ phiếu <span className="text-orange-500">StockPro</span>
                    </h1>
                    <div className="text-sm text-muted-foreground">
                        {total} mã · Cập nhật: Vừa xong
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-card border border-border shadow-sm p-1 h-auto">
                        <TabsTrigger
                            value="overview"
                            className="flex items-center gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md"
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                            Tổng quan
                        </TabsTrigger>
                        <TabsTrigger
                            value="screener"
                            className="flex items-center gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Bộ lọc cổ phiếu
                        </TabsTrigger>
                    </TabsList>

                    {/* ════ TAB 1: OVERVIEW ════ */}
                    <TabsContent value="overview" className="space-y-5 mt-4">

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {initialLoad ? (
                        // Skeleton summary cards
                        Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i} className="shadow-sm border-border">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <Skeleton className="w-9 h-9 rounded-lg" />
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-6 w-12" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <>
                    <Card className="shadow-sm border-border">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Mã tăng</p>
                                <p className="text-xl font-bold text-green-600">{summary.total_up}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-border">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Mã giảm</p>
                                <p className="text-xl font-bold text-red-600">{summary.total_down}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-border">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tổng KLGD</p>
                                <p className="text-xl font-bold text-foreground">{formatVolume(summary.total_volume)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-border">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Filter className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">P/E Trung bình</p>
                                <p className="text-xl font-bold text-foreground">{summary.avg_pe != null ? `${summary.avg_pe.toFixed(1)}x` : "—"}</p>
                            </div>
                        </CardContent>
                    </Card>
                        </>
                    )}
                </div>

                {/* Filters */}
                <Card className="shadow-sm border-border">
                    <CardContent className="p-4 space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm mã cổ phiếu hoặc tên công ty..."
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 bg-background text-foreground"
                            />
                        </div>

                        {/* Sector filter */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground flex items-center mr-1">Ngành:</span>
                            {sectorsLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <Skeleton key={i} className="h-6 w-20 rounded-full" />
                                ))
                            ) : (
                                <>
                            <Badge
                                variant={sectorFilter === "Tất cả" ? "default" : "outline"}
                                className={`cursor-pointer text-xs ${sectorFilter === "Tất cả" ? "bg-orange-500 hover:bg-orange-600 text-white" : "hover:border-orange-300"}`}
                                onClick={() => setSectorFilter("Tất cả")}
                            >
                                Tất cả
                            </Badge>
                            {sectors.map((s) => (
                                <Badge
                                    key={s.name}
                                    variant={sectorFilter === s.name ? "default" : "outline"}
                                    className={`cursor-pointer text-xs ${sectorFilter === s.name ? "bg-orange-500 hover:bg-orange-600 text-white" : "hover:border-orange-300"}`}
                                    onClick={() => setSectorFilter(s.name)}
                                >
                                    {s.name} ({s.count})
                                </Badge>
                            ))}
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Stock Table */}
                <Card className="shadow-sm border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                            <span>Danh sách cổ phiếu ({total} mã)</span>
                            {loading && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto relative">
                            {/* Loading overlay for subsequent loads */}
                            {loading && !initialLoad && (
                                <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative">
                                            <div className="w-10 h-10 border-3 border-orange-200 rounded-full" />
                                            <div className="absolute inset-0 w-10 h-10 border-3 border-orange-500 rounded-full border-t-transparent animate-spin" />
                                        </div>
                                        <span className="text-xs text-muted-foreground font-medium">Đang tải dữ liệu...</span>
                                    </div>
                                </div>
                            )}
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 text-xs">
                                        <TableHead className="w-[180px] sticky left-0 bg-muted/50 z-10 text-left">Mã CK</TableHead>
                                        <SortHeader label="Giá" field="current_price" className="text-center" />
                                        <SortHeader label="Thay đổi" field="price_change_percent" className="text-center" />
                                        <TableHead className="text-center w-[90px]">Xu hướng</TableHead>
                                        <SortHeader label="KLGD" field="volume" className="text-center" />
                                        <SortHeader label="Vốn hóa" field="market_cap" className="text-center" />
                                        <SortHeader label="P/E" field="pe" className="text-center" />
                                        <SortHeader label="P/B" field="pb" className="text-center" />
                                        <SortHeader label="EPS" field="eps" className="text-center" />
                                        <SortHeader label="ROE" field="roe" className="text-center" />
                                        <SortHeader label="52W %" field="week_change_52" className="text-center" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Skeleton rows on initial load */}
                                    {initialLoad && stocks.length === 0 && (
                                        Array.from({ length: 10 }).map((_, i) => (
                                            <TableRow key={`skeleton-${i}`} className="animate-pulse">
                                                <TableCell className="sticky left-0 bg-card z-10">
                                                    <div className="flex items-center gap-2">
                                                        <Skeleton className="w-8 h-8 rounded-lg" />
                                                        <div className="space-y-1">
                                                            <Skeleton className="h-4 w-12" />
                                                            <Skeleton className="h-2.5 w-20" />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Skeleton className="h-3 w-12" />
                                                        <Skeleton className="h-4 w-14 rounded" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-8 w-20 mx-auto rounded" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-4 w-14 mx-auto" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                                <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {stocks.length === 0 && !loading && !initialLoad && (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                                                Không tìm thấy cổ phiếu nào
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {stocks.map((stock) => {
                                        const isUp = (stock.price_change_percent ?? 0) >= 0;
                                        return (
                                            <TableRow
                                                key={stock.ticker}
                                                className="hover:bg-orange-50/50 transition-colors group"
                                            >
                                                {/* Ticker + Company */}
                                                <TableCell className="sticky left-0 bg-card group-hover:bg-orange-50/50 z-10 text-left">
                                                    <Link
                                                        href={`/stock/${stock.ticker}`}
                                                        className="block"
                                                        onClick={() => trackClick(stock.ticker)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${isUp ? "bg-gradient-to-br from-green-500 to-green-700" : "bg-gradient-to-br from-red-500 to-red-700"}`}>
                                                                {stock.ticker.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm text-foreground group-hover:text-orange-600 transition-colors">
                                                                    {stock.ticker}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                                                    {stock.company_name ?? stock.sector ?? "—"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </TableCell>

                                                {/* Price */}
                                                <TableCell className="text-center">
                                                    <Link href={`/stock/${stock.ticker}`} className="block" onClick={() => trackClick(stock.ticker)}>
                                                        <span className={`font-semibold text-sm ${isUp ? "text-green-600" : "text-red-600"}`}>
                                                            {stock.current_price != null ? formatPrice(stock.current_price) : "—"}
                                                        </span>
                                                    </Link>
                                                </TableCell>

                                                {/* Change */}
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-xs font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
                                                            {stock.price_change != null ? `${isUp ? "+" : ""}${formatPrice(stock.price_change)}` : "—"}
                                                        </span>
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                                            {stock.price_change_percent != null ? `${isUp ? "+" : ""}${stock.price_change_percent.toFixed(2)}%` : "—"}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Sparkline */}
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <Sparkline data={stock.sparkline} positive={isUp} />
                                                    </div>
                                                </TableCell>

                                                {/* Volume */}
                                                <TableCell className="text-center text-xs text-foreground font-medium">
                                                    {stock.volume != null ? formatVolume(stock.volume) : "—"}
                                                </TableCell>

                                                {/* Market Cap */}
                                                <TableCell className="text-center text-xs text-foreground font-medium">
                                                    {stock.market_cap != null ? formatMarketCap(stock.market_cap) : "—"}
                                                </TableCell>

                                                {/* P/E */}
                                                <TableCell className="text-center text-xs text-foreground">
                                                    {stock.pe != null ? stock.pe.toFixed(1) : "—"}
                                                </TableCell>

                                                {/* P/B */}
                                                <TableCell className="text-center text-xs text-foreground">
                                                    {stock.pb != null ? stock.pb.toFixed(1) : "—"}
                                                </TableCell>

                                                {/* EPS */}
                                                <TableCell className="text-center text-xs text-foreground">
                                                    {stock.eps != null ? stock.eps.toLocaleString() : "—"}
                                                </TableCell>

                                                {/* ROE */}
                                                <TableCell className="text-center">
                                                    {stock.roe != null ? (
                                                        <span className={`text-xs font-medium ${stock.roe >= 15 ? "text-green-600" : stock.roe >= 0 ? "text-foreground" : "text-red-600"}`}>
                                                            {stock.roe.toFixed(1)}%
                                                        </span>
                                                    ) : <span className="text-xs text-gray-400">—</span>}
                                                </TableCell>

                                                {/* 52W Change */}
                                                <TableCell className="text-center">
                                                    {stock.week_change_52 != null ? (
                                                        <span className={`text-xs font-medium ${stock.week_change_52 >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                            {stock.week_change_52 > 0 ? "+" : ""}{stock.week_change_52.toFixed(1)}%
                                                        </span>
                                                    ) : <span className="text-xs text-gray-400">—</span>}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                    Trang {page}/{totalPages} · Hiển thị {stocks.length}/{total} mã
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        className="p-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-8 h-8 rounded-md text-xs font-medium ${page === pageNum
                                                    ? "bg-orange-500 text-white"
                                                    : "border border-border hover:bg-muted/50 text-foreground"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    <button
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        className="p-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                    </TabsContent>

                    {/* ════ TAB 2: STOCK SCREENER ════ */}
                    <TabsContent value="screener" className="mt-4">
                        <StockScreener />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
