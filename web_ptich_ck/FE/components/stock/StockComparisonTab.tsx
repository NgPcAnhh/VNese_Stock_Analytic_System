"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockDetail } from "@/lib/StockDetailContext";
import { useStockComparison, type ComparisonStock } from "@/hooks/useStockData";
import {
    TrendingUp,
    BarChart3,
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Info,
    Search,
    X,
    Plus,
    Building2,
    Play,
    RefreshCw,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CHART_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"];

const fmt = (v: number | null | undefined) => (v != null ? v.toLocaleString("vi-VN") : "N/A");
const fmtP = (v: number | null | undefined) => (v != null ? `${v.toFixed(1)}%` : "N/A");
const fmtX = (v: number | null | undefined) => (v != null ? v.toFixed(2) : "N/A");
const cc = (v: number | null) =>
    !v ? "text-muted-foreground" : v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-muted-foreground";

/* ──────── Search result item type ──────── */
interface SearchResultItem {
    ticker: string;
    company_name: string | null;
    exchange: string | null;
    sector: string | null;
}

export default function StockComparisonTab() {
    const { stockInfo, ticker } = useStockDetail();

    /* ── Extra peers the user explicitly selected (UI state) ── */
    const [extraPeers, setExtraPeers] = useState<string[]>([]);

    /* ── Committed peers (sent to API only on button click) ── */
    const [committedPeers, setCommittedPeers] = useState<string>("");
    const [showResults, setShowResults] = useState(false);

    /* ── Comparison data (auto-detect + committed peers) ── */
    const { data, loading, error, refresh } = useStockComparison(ticker, committedPeers);

    /* Track if selection differs from last committed comparison */
    const selectionChanged = extraPeers.join(",") !== committedPeers;

    const allStocks = useMemo(() => {
        if (!data) return [];
        // `allStocks` are only the main stock + any peer that is selected in `extraPeers`
        const peers = data.peers.filter((p) => extraPeers.includes(p.ticker));
        return [data.main, ...peers];
    }, [data, extraPeers]);

    /* ── Same-sector suggestions: sector peers returned by backend but not yet selected ── */
    const sectorPeers = useMemo(() => {
        if (!data) return [];
        return data.peers.filter((p) => !extraPeers.includes(p.ticker));
    }, [data, extraPeers]);

    /* ── Handle Compare button click ── */
    const handleCompare = useCallback(() => {
        const newPeers = extraPeers.join(",");
        setCommittedPeers(newPeers);
        setShowResults(true);
        // If peers param hasn't changed, force a refresh
        if (newPeers === committedPeers) {
            refresh();
        }
    }, [extraPeers, committedPeers, refresh]);

    /* ── Search state ── */
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    /* Close dropdown on outside click */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /* Debounced search */
    const doSearch = useCallback(
        async (q: string) => {
            if (!q.trim()) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }
            setSearchLoading(true);
            try {
                const res = await fetch(
                    `${API_BASE}/api/v1/stock-list/overview?search=${encodeURIComponent(q)}&page_size=10&page=1`
                );
                if (res.ok) {
                    const json = await res.json();
                    const items: SearchResultItem[] = (json.data ?? []).map((d: any) => ({
                        ticker: d.ticker,
                        company_name: d.company_name ?? null,
                        exchange: d.exchange ?? null,
                        sector: d.sector ?? null,
                    }));
                    setSearchResults(items);
                    setShowDropdown(true);
                }
            } catch {
                /* ignore */
            } finally {
                setSearchLoading(false);
            }
        },
        []
    );

    const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 300);
    };

    /* Add / Remove peer */
    const addPeer = (t: string) => {
        const upper = t.toUpperCase();
        if (upper === ticker.toUpperCase()) return;
        if (extraPeers.includes(upper)) return;
        if (extraPeers.length >= 6) return;
        setExtraPeers((prev) => [...prev, upper]);
        setSearchQuery("");
        setSearchResults([]);
        setShowDropdown(false);
    };

    const removePeer = (t: string) => {
        setExtraPeers((prev) => prev.filter((p) => p !== t));
    };

    /* ── Table sections ── */
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        price: true,
        valuation: true,
        financial: true,
    });
    const toggleSection = (key: string) => setExpandedSections((p) => ({ ...p, [key]: !p[key] }));

    /* ── Price Performance Chart ── */
    const priceChartOption = useMemo(() => {
        if (allStocks.length < 2) return null;
        const series = allStocks.map((stock, i) => {
            const hist = stock.priceHistory;
            if (!hist.length)
                return { name: stock.ticker, data: [], color: CHART_COLORS[i % CHART_COLORS.length] };
            const base = hist[0].close;
            return {
                name: stock.ticker,
                data: hist.map((h) => parseFloat((((h.close - base) / base) * 100).toFixed(2))),
                color: CHART_COLORS[i % CHART_COLORS.length],
            };
        });
        const dates = allStocks[0].priceHistory.map((h) => h.date);
        return {
            tooltip: {
                trigger: "axis",
                formatter: (params: any) => {
                    let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue}</div>`;
                    params.forEach((p: any) => {
                        const v = p.value;
                        const sign = v >= 0 ? "+" : "";
                        const color = v >= 0 ? "#10B981" : "#EF4444";
                        html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">${p.marker}<span>${p.seriesName}</span><span style="margin-left:auto;font-weight:600;color:${color}">${sign}${v}%</span></div>`;
                    });
                    return html;
                },
            },
            legend: { data: series.map((s) => s.name), top: 4 },
            grid: { top: 50, right: 20, bottom: 24, left: 60 },
            xAxis: {
                type: "category",
                data: dates,
                axisLabel: {
                    fontSize: 10,
                    formatter: (v: string) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                    },
                },
                axisLine: { lineStyle: { color: "#e5e7eb" } },
            },
            yAxis: {
                type: "value",
                axisLabel: {
                    fontSize: 10,
                    formatter: (v: number) => `${v >= 0 ? "+" : ""}${v}%`,
                },
                splitLine: { lineStyle: { color: "#f3f4f6" } },
            },
            dataZoom: [
                { type: "inside", start: 60, end: 100 },
                { type: "slider", start: 60, end: 100, height: 20, bottom: 30 },
            ],
            series: series.map((s) => ({
                name: s.name,
                type: "line",
                data: s.data,
                smooth: true,
                symbol: "none",
                lineStyle: { width: 2, color: s.color },
                itemStyle: { color: s.color },
            })),
        };
    }, [allStocks]);

    /* ── Radar Chart ── */
    const radarChartOption = useMemo(() => {
        if (allStocks.length < 2) return null;
        
        // Find max values for auto-scaling bounds (with 20% padding to prevent overflow)
        const maxVals = {
            roe: Math.max(0.1, ...allStocks.map(s => s.roe ?? 0)) * 1.2,
            roa: Math.max(0.1, ...allStocks.map(s => s.roa ?? 0)) * 1.2,
            pe: Math.max(1, ...allStocks.map(s => s.pe ?? 0)) * 1.2,
            pb: Math.max(1, ...allStocks.map(s => s.pb ?? 0)) * 1.2,
            gross: Math.max(0.1, ...allStocks.map(s => s.grossMargin ?? 0)) * 1.2,
            net: Math.max(0.1, ...allStocks.map(s => s.netMargin ?? 0)) * 1.2,
        };

        const indicators = [
            { name: "ROE", max: maxVals.roe },
            { name: "ROA", max: maxVals.roa },
            { name: "P/E", max: maxVals.pe },
            { name: "P/B", max: maxVals.pb },
            { name: "Biên gộp", max: maxVals.gross },
            { name: "Biên ròng", max: maxVals.net },
        ];
        
        const series = allStocks.map((stock, i) => ({
            name: stock.ticker,
            value: [
                Math.max(0, stock.roe ?? 0),
                Math.max(0, stock.roa ?? 0),
                Math.max(0, stock.pe ?? 0),
                Math.max(0, stock.pb ?? 0),
                Math.max(0, stock.grossMargin ?? 0),
                Math.max(0, stock.netMargin ?? 0),
            ],
            lineStyle: { color: CHART_COLORS[i % CHART_COLORS.length], width: 2 },
            areaStyle: { color: CHART_COLORS[i % CHART_COLORS.length], opacity: 0.1 },
            itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        }));
        
        return {
            tooltip: { trigger: "item" },
            legend: { data: allStocks.map((s) => s.ticker), bottom: 0 },
            grid: { top: 40, bottom: 40, left: 20, right: 20 },
            radar: {
                indicator: indicators,
                radius: "60%", // Reduced radius to leave space for labels
                center: ["50%", "45%"], // Move up slightly to fit legend at bottom
                nameGap: 10,
                axisName: { color: "#6B7280", fontSize: 11, fontWeight: 500 },
                splitArea: { areaStyle: { color: ["#fff", "#f9fafb"] } },
                splitLine: { lineStyle: { color: "#e5e7eb" } },
            },
            series: [{ type: "radar", data: series }],
        };
    }, [allStocks]);

    /* ── Bubble Chart (Correlation) ── */
    const bubbleChartOption = useMemo(() => {
        if (allStocks.length < 2) return null;
        
        const seriesData = allStocks.map((stock, i) => {
            const mc = stock.marketCap ?? 0;
            const size = Math.max(10, Math.min(50, mc / 5e9)); // Scale bubble size
            return {
                name: stock.ticker,
                value: [
                    stock.priceChangePercent ?? 0, // X: Price Change %
                    stock.pe ?? 0,                // Y: P/E
                    mc,                           // Z: Market Cap (for tooltip/real size)
                    stock.ticker
                ],
                itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
                symbolSize: size,
            };
        });

        return {
            tooltip: {
                formatter: function (param: any) {
                    const data = param.data.value;
                    return `
                        <div style="font-weight:bold;margin-bottom:4px">${data[3]}</div>
                        <div>Thay đổi giá: <span style="font-weight:600;color:${data[0] >= 0 ? '#10B981' : '#EF4444'}">${data[0].toFixed(2)}%</span></div>
                        <div>P/E: <span style="font-weight:600">${data[1].toFixed(2)}</span></div>
                        <div>Vốn hóa: <span style="font-weight:600">${fmt(Math.round(data[2] / 1e9))} tỷ</span></div>
                    `;
                }
            },
            grid: { top: 40, right: 30, bottom: 40, left: 50 },
            xAxis: {
                type: 'value',
                name: '% Đổi Giá',
                nameLocation: 'middle',
                nameGap: 25,
                axisLabel: { formatter: '{value}%' },
                splitLine: { lineStyle: { type: 'dashed' } },
            },
            yAxis: {
                type: 'value',
                name: 'P/E',
                nameLocation: 'middle',
                nameGap: 30,
                splitLine: { lineStyle: { type: 'dashed' } },
            },
            series: [{
                type: 'scatter',
                data: seriesData,
                itemStyle: {
                    opacity: 0.8,
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.2)'
                }
            }]
        };
    }, [allStocks]);

    /* ── Comparison Table Row Definitions ── */
    type RowDef = {
        label: string;
        format: (s: ComparisonStock) => React.ReactNode;
        best?: (stocks: ComparisonStock[]) => string | null;
    };
    const bestMax = (key: keyof ComparisonStock) => (stocks: ComparisonStock[]) => {
        const vals = stocks
            .map((s) => ({ t: s.ticker, v: s[key] as number | null }))
            .filter((x) => x.v != null);
        if (!vals.length) return null;
        const mx = Math.max(...vals.map((x) => x.v!));
        return vals.find((x) => x.v === mx)?.t ?? null;
    };
    const bestMin = (key: keyof ComparisonStock) => (stocks: ComparisonStock[]) => {
        const vals = stocks
            .map((s) => ({ t: s.ticker, v: s[key] as number | null }))
            .filter((x) => x.v != null && x.v! > 0);
        if (!vals.length) return null;
        const mn = Math.min(...vals.map((x) => x.v!));
        return vals.find((x) => x.v === mn)?.t ?? null;
    };

    const sections: { title: string; key: string; color: string; rows: RowDef[] }[] = [
        {
            title: "Thông tin giá",
            key: "price",
            color: "bg-blue-500",
            rows: [
                {
                    label: "Giá hiện tại",
                    format: (s) => <span className="font-semibold">{fmt(s.price)}đ</span>,
                },
                {
                    label: "Thay đổi giá",
                    format: (s) => (
                        <span className={`font-medium ${cc(s.priceChange)}`}>
                            {s.priceChange > 0 ? "+" : ""}
                            {fmt(s.priceChange)}đ ({s.priceChangePercent > 0 ? "+" : ""}
                            {s.priceChangePercent.toFixed(2)}%)
                        </span>
                    ),
                },
            ],
        },
        {
            title: "Định giá",
            key: "valuation",
            color: "bg-amber-500",
            rows: [
                {
                    label: "Vốn hóa (tỷ VND)",
                    format: (s) => (
                        <span className="font-medium">
                            {s.marketCap != null ? fmt(Math.round(s.marketCap / 1e9)) : "N/A"}
                        </span>
                    ),
                    best: bestMax("marketCap"),
                },
                { label: "P/E", format: (s) => <span>{fmtX(s.pe)}</span>, best: bestMin("pe") },
                { label: "P/B", format: (s) => <span>{fmtX(s.pb)}</span>, best: bestMin("pb") },
                { label: "EPS (VND)", format: (s) => <span>{fmt(s.eps)}</span>, best: bestMax("eps") },
                {
                    label: "Lợi suất cổ tức",
                    format: (s) => <span>{fmtP(s.dividendYield)}</span>,
                    best: bestMax("dividendYield"),
                },
            ],
        },
        {
            title: "Chỉ số tài chính",
            key: "financial",
            color: "bg-green-500",
            rows: [
                {
                    label: "ROE",
                    format: (s) => <span className={cc(s.roe ?? 0)}>{fmtP(s.roe)}</span>,
                    best: bestMax("roe"),
                },
                {
                    label: "ROA",
                    format: (s) => <span className={cc(s.roa ?? 0)}>{fmtP(s.roa)}</span>,
                    best: bestMax("roa"),
                },
                {
                    label: "Biên LN gộp",
                    format: (s) => <span>{fmtP(s.grossMargin)}</span>,
                    best: bestMax("grossMargin"),
                },
                {
                    label: "Biên LN ròng",
                    format: (s) => <span>{fmtP(s.netMargin)}</span>,
                    best: bestMax("netMargin"),
                },
                {
                    label: "Nợ/Vốn CSH (D/E)",
                    format: (s) => <span>{fmtX(s.debtToEquity)}</span>,
                    best: bestMin("debtToEquity"),
                },
            ],
        },
    ];

    /* ── Render ── */
    return (
        <div className="space-y-6">
            {/* ══════════════ SEARCH & SELECTOR CARD ══════════════ */}
            <Card className="shadow-sm border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-blue-500" />
                        So sánh cổ phiếu
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* ═══════ ZONE 1: Các mã đang so sánh ═══════ */}
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Các mã đang so sánh
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                                {allStocks.length} mã
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border/50 min-h-[48px]">
                            {/* Current ticker — not removable */}
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-medium"
                                style={{
                                    borderColor: CHART_COLORS[0],
                                    backgroundColor: `${CHART_COLORS[0]}10`,
                                }}
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: CHART_COLORS[0] }}
                                />
                                <span className="font-semibold">{ticker}</span>
                                <span className="text-[10px] text-blue-500">(Hiện tại)</span>
                            </div>

                            {/* Extra peers selected by user */}
                            {extraPeers.map((peerTicker, idx) => {
                                const colorIdx = idx + 1;
                                const peerData = data?.peers.find(
                                    (p) => p.ticker === peerTicker
                                );
                                return (
                                    <div
                                        key={peerTicker}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-medium group"
                                        style={{
                                            borderColor:
                                                CHART_COLORS[colorIdx % CHART_COLORS.length],
                                            backgroundColor: `${CHART_COLORS[colorIdx % CHART_COLORS.length]}10`,
                                        }}
                                    >
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    CHART_COLORS[colorIdx % CHART_COLORS.length],
                                            }}
                                        />
                                        <span className="font-semibold">{peerTicker}</span>
                                        {peerData && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                                {peerData.companyName}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => removePeer(peerTicker)}
                                            className="ml-0.5 p-0.5 rounded-full hover:bg-red-100 transition-colors opacity-60 group-hover:opacity-100"
                                            title="Xóa khỏi so sánh"
                                        >
                                            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Empty state placeholder */}
                            {extraPeers.length === 0 && (
                                <span className="text-xs text-muted-foreground italic">
                                    Tìm kiếm hoặc chọn từ gợi ý bên dưới để thêm mã
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ═══════ ZONE 2: Tìm kiếm cổ phiếu ═══════ */}
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Tìm kiếm cổ phiếu
                            </span>
                        </div>
                        <div ref={searchRef} className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={onSearchChange}
                                    onFocus={() => {
                                        if (searchResults.length) setShowDropdown(true);
                                    }}
                                    placeholder="Nhập mã hoặc tên công ty (VD: VNM, FPT, Vinamilk...)"
                                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background placeholder:text-muted-foreground"
                                />
                                {searchLoading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* ── Dropdown results ── */}
                            {showDropdown && searchResults.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                                    {searchResults.map((item) => {
                                        const isMain =
                                            item.ticker.toUpperCase() === ticker.toUpperCase();
                                        const isSelected = extraPeers.includes(
                                            item.ticker.toUpperCase()
                                        );
                                        const alreadyInPeers = allStocks.some(
                                            (s) =>
                                                s.ticker.toUpperCase() ===
                                                item.ticker.toUpperCase()
                                        );
                                        return (
                                            <button
                                                key={item.ticker}
                                                onClick={() => addPeer(item.ticker)}
                                                disabled={isMain || isSelected || alreadyInPeers}
                                                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors border-b border-border/20 last:border-0 ${
                                                    isMain || isSelected || alreadyInPeers
                                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                        : "hover:bg-blue-50 cursor-pointer"
                                                }`}
                                            >
                                                <span className="font-bold text-foreground min-w-[56px]">
                                                    {item.ticker}
                                                </span>
                                                <span className="text-muted-foreground truncate flex-1">
                                                    {item.company_name ?? ""}
                                                </span>
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    {item.exchange}
                                                </span>
                                                {(isMain || isSelected || alreadyInPeers) && (
                                                    <span className="text-[10px] text-blue-500 shrink-0">
                                                        Đã chọn
                                                    </span>
                                                )}
                                                {!isMain && !isSelected && !alreadyInPeers && (
                                                    <Plus className="w-4 h-4 text-blue-500 shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══════ ZONE 3: Gợi ý cổ phiếu cùng ngành ═══════ */}
                    {sectorPeers.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2.5">
                                <Building2 className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Gợi ý cổ phiếu cùng ngành
                                </span>
                                {stockInfo?.sector && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                        {stockInfo.sector}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {sectorPeers.map((peer) => {
                                    const isSelected = extraPeers.includes(peer.ticker);
                                    return (
                                        <button
                                            key={peer.ticker}
                                            onClick={() => addPeer(peer.ticker)}
                                            disabled={isSelected}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 ${
                                                isSelected
                                                    ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                                                    : "border-dashed border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100 cursor-pointer"
                                            }`}
                                        >
                                            <Plus className="w-3 h-3" />
                                            <span className="font-bold">{peer.ticker}</span>
                                            <span className="text-muted-foreground">
                                                {peer.price ? `${fmt(peer.price)}đ` : ""}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ═══════ COMPARE BUTTON ═══════ */}
                    <div className="pt-3 border-t border-border/50">
                        <button
                            onClick={handleCompare}
                            className={`w-full flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm ${
                                loading
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : showResults && !selectionChanged
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-green-200"
                                    : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-blue-200 hover:shadow-md"
                            }`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Đang phân tích...
                                </>
                            ) : showResults && !selectionChanged ? (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    So sánh lại
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    {selectionChanged && showResults
                                        ? "Cập nhật so sánh"
                                        : "So sánh ngay"}
                                </>
                            )}
                        </button>
                        {selectionChanged && showResults && (
                            <p className="text-xs text-amber-600 text-center mt-2">
                                Danh sách cổ phiếu đã thay đổi — nhấn nút để cập nhật kết quả
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Loading / Error ── */}
            {showResults && loading && !data && (
                <div className="text-center py-12 text-muted-foreground animate-pulse">Đang tải so sánh…</div>
            )}
            {showResults && error && !data && (
                <div className="text-center py-12 text-red-500">Lỗi: {error}</div>
            )}

            {/* ── Content (only after button click with data) ── */}
            {showResults && data && allStocks.length >= 2 && (
                <>
                    {/* ── Charts ── */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* ── Row 1: Price Return (65%) and Radar Chart (35%) ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-4">
                            {/* ── Line Chart (Price Return) ── */}
                            <Card className="shadow-sm border-border">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-blue-500" />
                                        Biến động giá tương đối (%)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {priceChartOption ? (
                                        <ReactECharts option={priceChartOption} style={{ height: 400 }} />
                                    ) : (
                                        <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                                            Chưa có dữ liệu lịch sử giá
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* ── Radar Chart (Performance) ── */}
                            <Card className="shadow-sm border-border">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-purple-500" />
                                        Đa chiều chỉ số
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {radarChartOption ? (
                                        <ReactECharts option={radarChartOption} style={{ height: 400 }} />
                                    ) : (
                                        <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                                            Không đủ dữ liệu
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                        
                        {/* ── Row 2: Bubble Chart (Correlation) Full Width ── */}
                        <Card className="shadow-sm border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    Tương quan cổ phiếu
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {bubbleChartOption ? (
                                    <ReactECharts option={bubbleChartOption} style={{ height: 400 }} />
                                ) : (
                                    <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                                        Không đủ dữ liệu
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Comparison Table ── */}
                    <Card className="shadow-sm border-border overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-green-500" />
                                Bảng so sánh chi tiết
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted border-b border-border">
                                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-muted min-w-[180px] z-10">
                                                Chỉ tiêu
                                            </th>
                                            {allStocks.map((stock, i) => (
                                                <th
                                                    key={stock.ticker}
                                                    className="text-center px-4 py-3 min-w-[140px]"
                                                >
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className="w-3 h-3 rounded-full shrink-0"
                                                                style={{
                                                                    backgroundColor:
                                                                        CHART_COLORS[i % CHART_COLORS.length],
                                                                }}
                                                            />
                                                            <span className="font-bold text-foreground">
                                                                {stock.ticker}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-normal truncate max-w-[120px]">
                                                            {stock.exchange}
                                                        </span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sections.map((section) => (
                                            <React.Fragment key={section.key}>
                                                <tr
                                                    className="cursor-pointer hover:bg-muted/50 border-b border-border/30"
                                                    onClick={() => toggleSection(section.key)}
                                                >
                                                    <td
                                                        colSpan={allStocks.length + 1}
                                                        className="px-4 py-2.5"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`w-1 h-4 ${section.color} rounded-full`}
                                                            />
                                                            <span className="font-semibold text-foreground text-sm">
                                                                {section.title}
                                                            </span>
                                                            {expandedSections[section.key] ? (
                                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedSections[section.key] &&
                                                    section.rows.map((row, ri) => {
                                                        const bestTicker = row.best
                                                            ? row.best(allStocks)
                                                            : null;
                                                        return (
                                                            <tr
                                                                key={row.label}
                                                                className={`border-b border-border/20 ${
                                                                    ri % 2 === 0
                                                                        ? "bg-card"
                                                                        : "bg-muted/30"
                                                                } hover:bg-blue-50/30 transition-colors`}
                                                            >
                                                                <td className="px-4 py-2.5 text-muted-foreground font-medium sticky left-0 bg-inherit z-10">
                                                                    {row.label}
                                                                </td>
                                                                {allStocks.map((stock) => (
                                                                    <td
                                                                        key={stock.ticker}
                                                                        className={`px-4 py-2.5 text-center ${
                                                                            bestTicker === stock.ticker
                                                                                ? "bg-green-50 font-semibold"
                                                                                : ""
                                                                        }`}
                                                                    >
                                                                        {row.format(stock)}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Summary ── */}
                    <Card className="shadow-sm border-blue-200 bg-blue-50/50">
                        <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-blue-800">
                                        Tóm tắt so sánh
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-blue-700">
                                        {(() => {
                                            const b = [...allStocks].sort(
                                                (a, c) => (c.roe ?? 0) - (a.roe ?? 0)
                                            )[0];
                                            return (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                                    <span>
                                                        ROE cao nhất: <strong>{b.ticker}</strong> (
                                                        {fmtP(b.roe)})
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                        {(() => {
                                            const w = allStocks.filter((s) => s.pe && s.pe > 0);
                                            if (!w.length) return null;
                                            const b = [...w].sort(
                                                (a, c) => (a.pe ?? 999) - (c.pe ?? 999)
                                            )[0];
                                            return (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                    <span>
                                                        P/E thấp nhất: <strong>{b.ticker}</strong> (
                                                        {fmtX(b.pe)})
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                        {(() => {
                                            const b = [...allStocks].sort(
                                                (a, c) => (c.netMargin ?? 0) - (a.netMargin ?? 0)
                                            )[0];
                                            return (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                    <span>
                                                        Biên ròng cao nhất:{" "}
                                                        <strong>{b.ticker}</strong> (
                                                        {fmtP(b.netMargin)})
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                        {(() => {
                                            const b = [...allStocks].sort(
                                                (a, c) => (c.marketCap ?? 0) - (a.marketCap ?? 0)
                                            )[0];
                                            return (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                                                    <span>
                                                        Vốn hóa lớn nhất:{" "}
                                                        <strong>{b.ticker}</strong> (
                                                        {b.marketCap != null
                                                            ? fmt(Math.round(b.marketCap / 1e9)) +
                                                              " tỷ"
                                                            : "N/A"}
                                                        )
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── No results yet — prompt ── */}
            {!showResults && (
                <Card className="shadow-sm border-dashed border-2 border-border bg-muted/30">
                    <CardContent className="py-12 text-center">
                        <Play className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-muted-foreground mb-1">
                            Chọn cổ phiếu và nhấn &ldquo;So sánh ngay&rdquo;
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Thêm cổ phiếu từ thanh tìm kiếm hoặc danh sách cùng ngành phía trên
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* ── No peers found after compare ── */}
            {showResults && data && allStocks.length < 2 && (
                <Card className="shadow-sm border-border">
                    <CardContent className="py-12 text-center">
                        <ArrowUpDown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-muted-foreground mb-1">
                            Không tìm thấy cổ phiếu cùng ngành
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Thêm cổ phiếu từ thanh tìm kiếm để so sánh
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
