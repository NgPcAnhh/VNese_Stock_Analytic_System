"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from "react";
import Link from "next/link";
import {
  STOCK_SECTORS,
  STOCK_EXCHANGES,
  type StockListItem,
} from "@/lib/stockListMockData";
import {
  DEFAULT_FILTERS,
  SCREENER_PRESETS,
  FILTER_CATEGORIES,
  type ScreenerFilters,
  type FilterRange,
  type ScreenerPreset,
} from "@/lib/stockScreenerData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import {
  ArrowUpDown, Search, ChevronDown, ChevronRight, RotateCcw,
  Download, Bookmark, SlidersHorizontal, LayoutGrid, List,
  Gem, Rocket, Shield, Banknote, ArrowDownCircle, ArrowUpCircle,
  Globe, Sparkles, TrendingUp, ShieldCheck, X,
  Building2, BarChart3, Calculator, Percent, AlertTriangle,
  Activity, Trophy, ChevronLeft, ChevronsLeft, ChevronsRight,
  Star, Eye,
} from "lucide-react";
import { useTracking } from "@/hooks/useTracking";

// ─── API config ──────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapApiToStockItem(item: any): StockListItem {
  return {
    ticker: item.ticker ?? "",
    companyName: item.companyName ?? "",
    sector: item.sector ?? "Khác",
    exchange: item.exchange ?? "HOSE",
    currentPrice: item.currentPrice ?? 0,
    priceChange: item.priceChange ?? 0,
    priceChangePercent: item.priceChangePercent ?? 0,
    volume: item.volume ?? 0,
    avgVolume10d: item.avgVolume10d ?? 0,
    marketCap: item.marketCap ?? 0,
    pe: item.pe ?? null,
    pb: item.pb ?? 0,
    eps: item.eps ?? 0,
    roe: item.roe ?? 0,
    roa: item.roa ?? 0,
    debtToEquity: item.debtToEquity ?? 0,
    revenueGrowth: item.revenueGrowth ?? 0,
    profitGrowth: item.profitGrowth ?? 0,
    dividendYield: item.dividendYield ?? 0,
    foreignOwnership: item.foreignOwnership ?? 0,
    foreignNetBuy: item.foreignNetBuy ?? 0,
    weekChange52: item.weekChange52 ?? 0,
    high52w: item.high52w ?? 0,
    low52w: item.low52w ?? 0,
    beta: item.beta ?? 0,
    rsi14: item.rsi14 ?? 50,
    macdSignal: item.macdSignal ?? "Trung tính",
    ma20Trend: item.ma20Trend ?? "Dưới MA20",
    signal: item.signal ?? "Nắm giữ",
    sparkline: item.sparkline ?? [],
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── helpers ──────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("vi-VN");
const fmtVol = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
};
const fmtCap = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}Tr tỷ`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K tỷ`;
  return `${v.toLocaleString()} tỷ`;
};
const fmtPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtPrice = (v: number) => `${fmt(v)}đ`;

// icon map for presets
const presetIconMap: Record<string, React.ReactNode> = {
  gem: <Gem className="w-4 h-4" />,
  rocket: <Rocket className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
  banknote: <Banknote className="w-4 h-4" />,
  "arrow-down-circle": <ArrowDownCircle className="w-4 h-4" />,
  "arrow-up-circle": <ArrowUpCircle className="w-4 h-4" />,
  globe: <Globe className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
  "trending-up": <TrendingUp className="w-4 h-4" />,
  "shield-check": <ShieldCheck className="w-4 h-4" />,
};

const categoryIconMap: Record<string, React.ReactNode> = {
  "building-2": <Building2 className="w-4 h-4" />,
  "bar-chart-3": <BarChart3 className="w-4 h-4" />,
  calculator: <Calculator className="w-4 h-4" />,
  percent: <Percent className="w-4 h-4" />,
  "trending-up": <TrendingUp className="w-4 h-4" />,
  "alert-triangle": <AlertTriangle className="w-4 h-4" />,
  activity: <Activity className="w-4 h-4" />,
  globe: <Globe className="w-4 h-4" />,
  trophy: <Trophy className="w-4 h-4" />,
};

type SortKey = keyof StockListItem;
type SortDir = "asc" | "desc";

const ROWS_PER_PAGE_OPTIONS = [20, 50, 100];

const signalColor: Record<string, string> = {
  Mua: "bg-green-100 text-green-700 border-green-200",
  Bán: "bg-red-100 text-red-700 border-red-200",
  "Nắm giữ": "bg-blue-100 text-blue-700 border-blue-200",
  "Theo dõi": "bg-amber-100 text-amber-700 border-amber-200",
};

// ─── check if filter range is active (narrowed) ──────
function isRangeActive(current: FilterRange, def: FilterRange) {
  return current.min > def.min || current.max < def.max;
}
function isFiltersDefault(f: ScreenerFilters): boolean {
  const d = DEFAULT_FILTERS;
  if (f.exchanges.length > 0 || f.sectors.length > 0) return false;
  if (f.macdSignals.length > 0 || f.maTrends.length > 0) return false;
  const ranges: (keyof ScreenerFilters)[] = [
    "priceRange", "volumeRange", "marketCapRange", "peRange", "pbRange", "epsRange",
    "dividendYieldRange", "roeRange", "roaRange", "revenueGrowthRange", "profitGrowthRange",
    "debtToEquityRange", "betaRange", "rsiRange", "foreignOwnershipRange",
    "foreignNetBuyRange", "weekChange52Range",
  ];
  for (const key of ranges) {
    if (isRangeActive(f[key] as FilterRange, d[key] as FilterRange)) return false;
  }
  return true;
}
function countActiveFilters(f: ScreenerFilters): number {
  const d = DEFAULT_FILTERS;
  let count = 0;
  if (f.exchanges.length > 0) count++;
  if (f.sectors.length > 0) count++;
  if (f.macdSignals.length > 0) count++;
  if (f.maTrends.length > 0) count++;
  const ranges: (keyof ScreenerFilters)[] = [
    "priceRange", "volumeRange", "marketCapRange", "peRange", "pbRange", "epsRange",
    "dividendYieldRange", "roeRange", "roaRange", "revenueGrowthRange", "profitGrowthRange",
    "debtToEquityRange", "betaRange", "rsiRange", "foreignOwnershipRange",
    "foreignNetBuyRange", "weekChange52Range",
  ];
  for (const key of ranges) {
    if (isRangeActive(f[key] as FilterRange, d[key] as FilterRange)) count++;
  }
  return count;
}

// ─── main component ──────────────────────────────────
export default function StockScreener() {
  const [allStocks, setAllStocks] = useState<StockListItem[]>([]);
  const [favoriteTickers, setFavoriteTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ScreenerFilters>({ ...DEFAULT_FILTERS });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["market"]));
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Theo dõi tìm kiếm mã cổ phiếu (debounce 1.5s)
  const { trackStockSearch } = useTracking();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!search.trim()) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      trackStockSearch(search.trim());
    }, 1500);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());

  const getOrCreateSessionId = useCallback(() => {
    const key = "session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, generated);
    return generated;
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const sessionId = getOrCreateSessionId();
      const res = await fetch(`${API}/tracking/favorite?session_id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as string[];
      setFavoriteTickers(data.map((t) => t.toUpperCase()));
    } catch {
      // noop
    }
  }, [getOrCreateSessionId]);

  // ─── Fetch screener data from API ──────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const res = await fetch(`${API}/stock-list/screener`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const mapped: StockListItem[] = (json.data || []).map(mapApiToStockItem);
          setAllStocks(mapped);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Lỗi tải dữ liệu";
          console.error("Screener fetch error:", err);
          setFetchError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadFavorites();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadFavorites]);

  // ─── Dynamic sector & exchange lists from data ─────
  const dynamicSectors = useMemo(() => {
    if (allStocks.length === 0) return STOCK_SECTORS;
    const set = new Set(allStocks.map((s) => s.sector).filter(Boolean));
    return [...set].sort();
  }, [allStocks]);

  const dynamicExchanges = useMemo(() => {
    if (allStocks.length === 0) return STOCK_EXCHANGES;
    const set = new Set(allStocks.map((s) => s.exchange).filter(Boolean));
    return [...set].sort();
  }, [allStocks]);

  // — toggle category
  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // — apply preset
  const applyPreset = useCallback((preset: ScreenerPreset) => {
    const newFilters = { ...DEFAULT_FILTERS };
    Object.assign(newFilters, preset.filters);
    setFilters(newFilters);
    setActivePreset(preset.id);
    setPage(1);

    // Expand relevant filter categories
    const relevantCats = new Set<string>();
    const filterToCategory: Record<string, string> = {};
    FILTER_CATEGORIES.forEach((cat) => {
      cat.filters.forEach((f) => (filterToCategory[f] = cat.id));
    });
    Object.keys(preset.filters).forEach((key) => {
      if (filterToCategory[key]) relevantCats.add(filterToCategory[key]);
    });
    setExpandedCategories(relevantCats);
  }, []);

  // — reset filters
  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    setActivePreset(null);
    setPage(1);
  }, []);

  // — update a range filter
  const updateRange = useCallback((key: keyof ScreenerFilters, value: [number, number]) => {
    setFilters((prev) => ({ ...prev, [key]: { min: value[0], max: value[1] } }));
    setActivePreset(null);
    setPage(1);
  }, []);

  // — toggle array filter
  const toggleArrayFilter = useCallback(
    (key: "exchanges" | "sectors" | "macdSignals" | "maTrends", value: string) => {
      setFilters((prev) => {
        const arr = [...(prev[key] as string[])];
        const idx = arr.indexOf(value);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(value);
        return { ...prev, [key]: arr };
      });
      setActivePreset(null);
      setPage(1);
    },
    []
  );

  // — toggle watchlist
  const toggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }, []);

  // — sort
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ─── FILTER LOGIC ──────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...allStocks];
    const favoriteOrderMap = new Map(
      favoriteTickers.map((ticker, index) => [ticker.toUpperCase(), index]),
    );

    // Search
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      list = list.filter(
        (s) => s.ticker.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)
      );
    }

    // Exchange
    if (filters.exchanges.length > 0)
      list = list.filter((s) => filters.exchanges.includes(s.exchange));

    // Sector
    if (filters.sectors.length > 0)
      list = list.filter((s) => filters.sectors.includes(s.sector));

    // Range filters
    const rangeCheck = (val: number | null, range: FilterRange): boolean => {
      if (val === null) return true;
      return val >= range.min && val <= range.max;
    };

    list = list.filter(
      (s) =>
        rangeCheck(s.currentPrice, filters.priceRange) &&
        rangeCheck(s.volume, filters.volumeRange) &&
        rangeCheck(s.marketCap, filters.marketCapRange) &&
        rangeCheck(s.pe, filters.peRange) &&
        rangeCheck(s.pb, filters.pbRange) &&
        rangeCheck(s.eps, filters.epsRange) &&
        rangeCheck(s.dividendYield, filters.dividendYieldRange) &&
        rangeCheck(s.roe, filters.roeRange) &&
        rangeCheck(s.roa, filters.roaRange) &&
        rangeCheck(s.revenueGrowth, filters.revenueGrowthRange) &&
        rangeCheck(s.profitGrowth, filters.profitGrowthRange) &&
        rangeCheck(s.debtToEquity, filters.debtToEquityRange) &&
        rangeCheck(s.beta, filters.betaRange) &&
        rangeCheck(s.rsi14, filters.rsiRange) &&
        rangeCheck(s.foreignOwnership, filters.foreignOwnershipRange) &&
        rangeCheck(s.foreignNetBuy, filters.foreignNetBuyRange) &&
        rangeCheck(s.weekChange52, filters.weekChange52Range)
    );

    // MACD signal
    if (filters.macdSignals.length > 0)
      list = list.filter((s) => filters.macdSignals.includes(s.macdSignal));

    // MA Trend
    if (filters.maTrends.length > 0)
      list = list.filter((s) => filters.maTrends.includes(s.ma20Trend));

    // Sort
    list.sort((a, b) => {
      const favA = favoriteOrderMap.get(a.ticker.toUpperCase());
      const favB = favoriteOrderMap.get(b.ticker.toUpperCase());
      const isFavA = favA !== undefined;
      const isFavB = favB !== undefined;

      // Favorites always first.
      if (isFavA !== isFavB) return isFavA ? -1 : 1;

      // Newer favorite first (index 0 is newest from API ORDER BY created_at DESC).
      if (isFavA && isFavB && favA !== favB) {
        return (favA as number) - (favB as number);
      }

      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return list;
  }, [allStocks, deferredSearch, filters, sortKey, sortDir, favoriteTickers]);

  // — pagination
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const activeCount = countActiveFilters(filters);

  // ─── RENDER FILTER CONTENT ─────────────────────────
  const renderFilterContent = (catId: string) => {
    switch (catId) {
      case "market":
        return (
          <div className="space-y-4">
            {/* Exchange */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Sàn giao dịch
              </label>
              <div className="flex flex-wrap gap-2">
                {dynamicExchanges.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => toggleArrayFilter("exchanges", ex)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      filters.exchanges.includes(ex)
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            {/* Sector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Ngành
              </label>
              <div className="flex flex-wrap gap-1.5">
                {dynamicSectors.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleArrayFilter("sectors", s)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                      filters.sectors.includes(s)
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "price-volume":
        return (
          <div className="space-y-5">
            <FilterSlider label="Giá (VND)" filterKey="priceRange" step={1000}
              formatLabel={fmtPrice} filters={filters} updateRange={updateRange} />
            <FilterSlider label="Khối lượng GD" filterKey="volumeRange" step={100000}
              formatLabel={fmtVol} filters={filters} updateRange={updateRange} />
            <FilterSlider label="Vốn hóa (tỷ VND)" filterKey="marketCapRange" step={1000}
              formatLabel={(v) => fmtCap(v)} filters={filters} updateRange={updateRange} />
          </div>
        );

      case "valuation":
        return (
          <div className="space-y-5">
            <FilterSlider label="P/E" filterKey="peRange" step={0.5}
              formatLabel={(v) => v.toFixed(1)} filters={filters} updateRange={updateRange} />
            <FilterSlider label="P/B" filterKey="pbRange" step={0.1}
              formatLabel={(v) => v.toFixed(1)} filters={filters} updateRange={updateRange} />
            <FilterSlider label="EPS (VND)" filterKey="epsRange" step={100}
              formatLabel={(v) => fmt(v)} filters={filters} updateRange={updateRange} />
            <FilterSlider label="Cổ tức (%)" filterKey="dividendYieldRange" step={0.5}
              formatLabel={(v) => `${v.toFixed(1)}%`} filters={filters} updateRange={updateRange} />
          </div>
        );

      case "profitability":
        return (
          <div className="space-y-5">
            <FilterSlider label="ROE (%)" filterKey="roeRange" step={1}
              formatLabel={(v) => `${v}%`} filters={filters} updateRange={updateRange} />
            <FilterSlider label="ROA (%)" filterKey="roaRange" step={1}
              formatLabel={(v) => `${v}%`} filters={filters} updateRange={updateRange} />
          </div>
        );

      case "growth":
        return (
          <div className="space-y-5">
            <FilterSlider label="Tăng trưởng DT (%)" filterKey="revenueGrowthRange" step={1}
              formatLabel={(v) => `${v}%`} filters={filters} updateRange={updateRange} />
            <FilterSlider label="Tăng trưởng LN (%)" filterKey="profitGrowthRange" step={1}
              formatLabel={(v) => `${v}%`} filters={filters} updateRange={updateRange} />
          </div>
        );

      case "risk":
        return (
          <div className="space-y-5">
            <FilterSlider label="Nợ/Vốn CSH (D/E)" filterKey="debtToEquityRange" step={0.1}
              formatLabel={(v) => v.toFixed(1)} filters={filters} updateRange={updateRange} />
            <FilterSlider label="Beta (β)" filterKey="betaRange" step={0.05}
              formatLabel={(v) => v.toFixed(2)} filters={filters} updateRange={updateRange} />
          </div>
        );

      case "technical":
        return (
          <div className="space-y-5">
            <FilterSlider label="RSI (14)" filterKey="rsiRange" step={1}
              formatLabel={(v) => v.toString()} filters={filters} updateRange={updateRange} />
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Tín hiệu MACD
              </label>
              <div className="flex gap-2">
                {["Mua", "Bán", "Trung tính"].map((s) => (
                  <button key={s} onClick={() => toggleArrayFilter("macdSignals", s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      filters.macdSignals.includes(s)
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Xu hướng MA20
              </label>
              <div className="flex gap-2">
                {["Trên MA20", "Dưới MA20"].map((s) => (
                  <button key={s} onClick={() => toggleArrayFilter("maTrends", s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      filters.maTrends.includes(s)
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "foreign":
        return (
          <div className="space-y-5">
            <FilterSlider label="Tỷ lệ sở hữu NN (%)" filterKey="foreignOwnershipRange" step={1}
              formatLabel={(v) => `${v}%`} filters={filters} updateRange={updateRange} />
            <FilterSlider label="NN mua ròng (tỷ)" filterKey="foreignNetBuyRange" step={5}
              formatLabel={(v) => `${v} tỷ`} filters={filters} updateRange={updateRange} />
          </div>
        );

      case "performance":
        return (
          <div className="space-y-5">
            <FilterSlider label="Thay đổi 52 tuần (%)" filterKey="weekChange52Range" step={1}
              formatLabel={(v) => `${v}%`} filters={filters} updateRange={updateRange} />
          </div>
        );

      default:
        return null;
    }
  };

  // ─── SortableHeader helper ─────────────────────────
  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <TableHead
      className={`cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap text-[11px] ${className}`}
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-0.5">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-orange-500" : "text-gray-300"}`} />
      </div>
    </TableHead>
  );

  // ─── Render ────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ════ PRESET SCREENERS ════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-orange-500" />
            Bộ lọc có sẵn
          </h3>
          {activePreset && (
            <button
              onClick={resetFilters}
              className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Bỏ chọn
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {SCREENER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => (activePreset === preset.id ? resetFilters() : applyPreset(preset))}
              className={`group relative p-3 rounded-xl border text-left transition-all hover:shadow-md ${
                activePreset === preset.id
                  ? "border-orange-400 bg-orange-50 shadow-sm ring-1 ring-orange-200"
                  : "border-gray-200 bg-white hover:border-orange-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`p-1.5 rounded-lg bg-gradient-to-br ${preset.color} text-white flex-shrink-0`}
                >
                  {presetIconMap[preset.icon]}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-800 truncate">{preset.name}</div>
                  <div className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-tight">
                    {preset.description}
                  </div>
                </div>
              </div>
              {activePreset === preset.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ════ FILTER PANEL + RESULTS ════ */}
      <div className="flex gap-4">
        {/* ──── Left: Filter Panel ──── */}
        {showFilters && (
          <div className="w-72 flex-shrink-0">
            <Card className="shadow-sm border-gray-200 sticky top-4">
              <CardContent className="p-0">
                {/* Search in filter panel */}
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã CK, tên công ty..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                    />
                  </div>
                </div>

                {/* Filter header */}
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-bold text-gray-800">Bộ lọc nâng cao</span>
                    {activeCount > 0 && (
                      <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 h-4">
                        {activeCount}
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={resetFilters}
                    disabled={isFiltersDefault(filters)}
                    className="text-[10px] text-gray-400 hover:text-orange-600 disabled:opacity-30 flex items-center gap-0.5 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Đặt lại
                  </button>
                </div>

                {/* Filter categories (accordion) */}
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                  {FILTER_CATEGORIES.map((cat) => {
                    const isOpen = expandedCategories.has(cat.id);
                    return (
                      <div key={cat.id} className="border-b border-gray-50 last:border-0">
                        <button
                          onClick={() => toggleCategory(cat.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-gray-400">{categoryIconMap[cat.icon]}</span>
                          <span className="flex-1 text-left">{cat.label}</span>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pt-1">
                            {renderFilterContent(cat.id)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ──── Right: Results ──── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  showFilters
                    ? "bg-orange-50 text-orange-600 border-orange-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
              </button>
              <span className="text-xs text-gray-500">
                <strong className="text-gray-800">{filtered.length}</strong> mã phù hợp
              </span>
              {/* Active filter tags */}
              {activePreset && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">
                  {SCREENER_PRESETS.find((p) => p.id === activePreset)?.name}
                  <X className="w-3 h-3 ml-1 cursor-pointer" onClick={resetFilters} />
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-orange-500 text-white" : "bg-white text-gray-400 hover:text-gray-600"}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 transition-colors ${viewMode === "card" ? "bg-orange-500 text-white" : "bg-white text-gray-400 hover:text-gray-600"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Export */}
              <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:border-orange-200 hover:text-orange-600 transition-colors">
                <Download className="w-3.5 h-3.5" /> Xuất
              </button>
            </div>
          </div>

          {/* ════ TABLE VIEW ════ */}
          {loading ? (
            <Card className="shadow-sm border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu bộ lọc...</p>
                <p className="text-xs text-gray-400 mt-1">Có thể mất vài giây</p>
              </CardContent>
            </Card>
          ) : fetchError ? (
            <Card className="shadow-sm border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <p className="text-sm text-red-600 font-medium mb-2">Lỗi tải dữ liệu</p>
                <p className="text-xs text-gray-500 mb-4">{fetchError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Thử lại
                </button>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 text-[11px]">
                        <TableHead className="w-8 text-center">
                          <Star className="w-3 h-3 text-gray-300 mx-auto" />
                        </TableHead>
                        <TableHead className="w-[150px] sticky left-0 bg-gray-50/80 z-10">Mã CK</TableHead>
                        <SortHeader label="Giá" field="currentPrice" className="text-right" />
                        <SortHeader label="%" field="priceChangePercent" className="text-right" />
                        <SortHeader label="KL" field="volume" className="text-right" />
                        <SortHeader label="Vốn hóa" field="marketCap" className="text-right" />
                        <SortHeader label="P/E" field="pe" className="text-right" />
                        <SortHeader label="P/B" field="pb" className="text-right" />
                        <SortHeader label="EPS" field="eps" className="text-right" />
                        <SortHeader label="ROE" field="roe" className="text-right" />
                        <SortHeader label="ROA" field="roa" className="text-right" />
                        <SortHeader label="D/E" field="debtToEquity" className="text-right" />
                        <SortHeader label="DT ↑" field="revenueGrowth" className="text-right" />
                        <SortHeader label="LN ↑" field="profitGrowth" className="text-right" />
                        <SortHeader label="Cổ tức" field="dividendYield" className="text-right" />
                        <SortHeader label="RSI" field="rsi14" className="text-right" />
                        <SortHeader label="NN%" field="foreignOwnership" className="text-right" />
                        <SortHeader label="52W" field="weekChange52" className="text-right" />
                        <TableHead className="text-center">MACD</TableHead>
                        <TableHead className="text-center">Tín hiệu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={20} className="text-center py-16">
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <Search className="w-8 h-8" />
                              <p className="text-sm font-medium">Không tìm thấy cổ phiếu phù hợp</p>
                              <p className="text-xs">Hãy thử điều chỉnh bộ lọc của bạn</p>
                              <button
                                onClick={resetFilters}
                                className="mt-2 text-xs text-orange-600 hover:underline flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" /> Đặt lại bộ lọc
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginated.map((stock) => {
                          const isUp = stock.priceChangePercent >= 0;
                          return (
                            <TableRow key={stock.ticker} className="hover:bg-orange-50/40 transition-colors group text-[11px]">
                              {/* Watchlist */}
                              <TableCell className="text-center px-1">
                                <button onClick={() => toggleWatchlist(stock.ticker)} className="p-0.5">
                                  <Star
                                    className={`w-3.5 h-3.5 transition-colors ${
                                      watchlist.has(stock.ticker)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-gray-300 hover:text-amber-400"
                                    }`}
                                  />
                                </button>
                              </TableCell>

                              {/* Ticker */}
                              <TableCell className="sticky left-0 bg-white group-hover:bg-orange-50/40 z-10">
                                <Link href={`/stock/${stock.ticker}`} className="flex items-center gap-2">
                                  <div
                                    className={`w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[10px] ${
                                      isUp
                                        ? "bg-gradient-to-br from-green-500 to-green-700"
                                        : "bg-gradient-to-br from-red-500 to-red-700"
                                    }`}
                                  >
                                    {stock.ticker.slice(0, 2)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                                      {stock.ticker}
                                    </div>
                                    <div className="text-[9px] text-gray-400 truncate max-w-[90px]">
                                      {stock.exchange} · {stock.sector}
                                    </div>
                                  </div>
                                </Link>
                              </TableCell>

                              {/* Price */}
                              <TableCell className="text-right">
                                <span className={`font-semibold ${isUp ? "text-green-600" : "text-red-600"}`}>
                                  {fmt(stock.currentPrice)}
                                </span>
                              </TableCell>

                              {/* Change % */}
                              <TableCell className="text-right">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    isUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {fmtPct(stock.priceChangePercent)}
                                </span>
                              </TableCell>

                              {/* Volume */}
                              <TableCell className="text-right text-gray-600 font-medium">
                                {fmtVol(stock.volume)}
                              </TableCell>

                              {/* Market Cap */}
                              <TableCell className="text-right text-gray-600 font-medium">
                                {fmtCap(stock.marketCap)}
                              </TableCell>

                              {/* P/E */}
                              <TableCell className="text-right text-gray-600">
                                {stock.pe !== null ? stock.pe.toFixed(1) : "—"}
                              </TableCell>

                              {/* P/B */}
                              <TableCell className="text-right text-gray-600">
                                {stock.pb.toFixed(1)}
                              </TableCell>

                              {/* EPS */}
                              <TableCell className="text-right text-gray-600">
                                {fmt(stock.eps)}
                              </TableCell>

                              {/* ROE */}
                              <TableCell className="text-right">
                                <span className={stock.roe >= 15 ? "text-green-600 font-medium" : stock.roe >= 0 ? "text-gray-600" : "text-red-600"}>
                                  {stock.roe.toFixed(1)}%
                                </span>
                              </TableCell>

                              {/* ROA */}
                              <TableCell className="text-right">
                                <span className={stock.roa >= 8 ? "text-green-600" : stock.roa >= 0 ? "text-gray-600" : "text-red-600"}>
                                  {stock.roa.toFixed(1)}%
                                </span>
                              </TableCell>

                              {/* D/E */}
                              <TableCell className="text-right">
                                <span className={stock.debtToEquity > 3 ? "text-red-600" : "text-gray-600"}>
                                  {stock.debtToEquity.toFixed(1)}
                                </span>
                              </TableCell>

                              {/* Revenue Growth */}
                              <TableCell className="text-right">
                                <span className={stock.revenueGrowth > 0 ? "text-green-600" : "text-red-600"}>
                                  {fmtPct(stock.revenueGrowth)}
                                </span>
                              </TableCell>

                              {/* Profit Growth */}
                              <TableCell className="text-right">
                                <span className={stock.profitGrowth > 0 ? "text-green-600" : "text-red-600"}>
                                  {fmtPct(stock.profitGrowth)}
                                </span>
                              </TableCell>

                              {/* Dividend Yield */}
                              <TableCell className="text-right">
                                <span className={stock.dividendYield >= 3 ? "text-green-600 font-medium" : "text-gray-600"}>
                                  {stock.dividendYield.toFixed(1)}%
                                </span>
                              </TableCell>

                              {/* RSI */}
                              <TableCell className="text-right">
                                <RsiBadge value={stock.rsi14} />
                              </TableCell>

                              {/* Foreign Ownership */}
                              <TableCell className="text-right text-gray-600">
                                {stock.foreignOwnership.toFixed(1)}%
                              </TableCell>

                              {/* 52W Change */}
                              <TableCell className="text-right">
                                <span className={stock.weekChange52 >= 0 ? "text-green-600" : "text-red-600"}>
                                  {fmtPct(stock.weekChange52)}
                                </span>
                              </TableCell>

                              {/* MACD */}
                              <TableCell className="text-center">
                                <MacdBadge signal={stock.macdSignal} />
                              </TableCell>

                              {/* Signal */}
                              <TableCell className="text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded border ${
                                    signalColor[stock.signal] ?? ""
                                  }`}
                                >
                                  {stock.signal}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Hiển thị</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-400"
                      >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n} mã</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronsLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="text-xs text-gray-600 px-2">
                        Trang <strong>{page}</strong> / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronsRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* ════ CARD VIEW ════ */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginated.map((stock) => {
                  const isUp = stock.priceChangePercent >= 0;
                  return (
                    <Link key={stock.ticker} href={`/stock/${stock.ticker}`}>
                      <Card className="shadow-sm border-gray-200 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                                  isUp
                                    ? "bg-gradient-to-br from-green-500 to-green-700"
                                    : "bg-gradient-to-br from-red-500 to-red-700"
                                }`}
                              >
                                {stock.ticker.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-gray-900 group-hover:text-orange-600">
                                  {stock.ticker}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {stock.exchange} · {stock.sector}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.preventDefault(); toggleWatchlist(stock.ticker); }}
                                className="p-1"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    watchlist.has(stock.ticker)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              </button>
                              <span className={`text-[10px] font-semibold rounded border px-1.5 py-0.5 ${signalColor[stock.signal]}`}>
                                {stock.signal}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-baseline justify-between mb-3">
                            <span className={`text-lg font-bold ${isUp ? "text-green-600" : "text-red-600"}`}>
                              {fmt(stock.currentPrice)}
                            </span>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                              }`}
                            >
                              {fmtPct(stock.priceChangePercent)}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[10px]">
                            <div>
                              <span className="text-gray-400">KL</span>
                              <span className="float-right font-medium text-gray-700">{fmtVol(stock.volume)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">P/E</span>
                              <span className="float-right font-medium text-gray-700">
                                {stock.pe !== null ? stock.pe.toFixed(1) : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">ROE</span>
                              <span className={`float-right font-medium ${stock.roe >= 15 ? "text-green-600" : "text-gray-700"}`}>
                                {stock.roe.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Vốn hóa</span>
                              <span className="float-right font-medium text-gray-700">{fmtCap(stock.marketCap)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">P/B</span>
                              <span className="float-right font-medium text-gray-700">{stock.pb.toFixed(1)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">RSI</span>
                              <span className="float-right"><RsiBadge value={stock.rsi14} /></span>
                            </div>
                            <div>
                              <span className="text-gray-400">Cổ tức</span>
                              <span className="float-right font-medium text-gray-700">{stock.dividendYield.toFixed(1)}%</span>
                            </div>
                            <div>
                              <span className="text-gray-400">52W</span>
                              <span className={`float-right font-medium ${stock.weekChange52 >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {fmtPct(stock.weekChange52)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">MACD</span>
                              <span className="float-right"><MacdBadge signal={stock.macdSignal} /></span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>

              {/* Card view pagination */}
              {filtered.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <ChevronsLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xs text-gray-600 px-3">
                    Trang <strong>{page}</strong> / {totalPages}
                  </span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                    <ChevronsRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── small sub-components ────────────────────────────

function FilterSlider({
  label,
  filterKey,
  step,
  formatLabel,
  filters,
  updateRange,
}: {
  label: string;
  filterKey: keyof ScreenerFilters;
  step: number;
  formatLabel: (v: number) => string;
  filters: ScreenerFilters;
  updateRange: (key: keyof ScreenerFilters, value: [number, number]) => void;
}) {
  const range = filters[filterKey] as FilterRange;
  const defRange = DEFAULT_FILTERS[filterKey] as FilterRange;
  const active = isRangeActive(range, defRange);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={`text-xs font-medium ${active ? "text-orange-600" : "text-gray-600"}`}>
          {label}
        </label>
        {active && (
          <button
            onClick={() => updateRange(filterKey, [defRange.min, defRange.max])}
            className="text-[10px] text-gray-400 hover:text-orange-500"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <DualRangeSlider
        min={defRange.min}
        max={defRange.max}
        step={step}
        value={[range.min, range.max]}
        onChange={(v) => updateRange(filterKey, v)}
        formatLabel={formatLabel}
      />
    </div>
  );
}

function RsiBadge({ value }: { value: number }) {
  let cls = "text-gray-600";
  if (value >= 70) cls = "text-red-600 font-medium";
  else if (value <= 30) cls = "text-green-600 font-medium";
  return <span className={`text-[10px] ${cls}`}>{value}</span>;
}

function MacdBadge({ signal }: { signal: string }) {
  const cls =
    signal === "Mua"
      ? "bg-green-50 text-green-700 border-green-200"
      : signal === "Bán"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded border ${cls}`}>
      {signal === "Trung tính" ? "T.tính" : signal}
    </span>
  );
}
