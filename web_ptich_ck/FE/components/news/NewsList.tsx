"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { extractNewsImage } from "@/lib/newsImage";
import {
    Search,
    Calendar,
    Loader2,
    X,
    Filter,
    Clock,
    ExternalLink,
    ChevronDown,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

interface NewsArticle {
    id: number;
    title: string | null;
    source: string | null;
    published: string | null;
    summary: string | null;
    link: string | null;
}

interface PaginatedResponse {
    data: NewsArticle[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

const SOURCE_COLORS: Record<string, string> = {
    VnExpress: "bg-blue-600",
    CafeF: "bg-emerald-600",
    VietStock: "bg-purple-600",
    Bloomberg: "bg-amber-600",
    TCBS: "bg-teal-600",
    NDH: "bg-rose-600",
};

function timeAgo(iso: string | null): string {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

function getSessionId(): string {
    if (typeof window === "undefined") return "anonymous";
    let sid = localStorage.getItem("vnstock_session_id");
    if (!sid) {
        sid = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
        localStorage.setItem("vnstock_session_id", sid);
    }
    return sid;
}

async function trackClick(articleId: number) {
    try {
        await fetch(`${API}/news/track-click`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ article_id: articleId, session_id: getSessionId() }),
        });
    } catch { /* silent */ }
}

async function trackSearch(keyword: string) {
    if (!keyword.trim()) return;
    try {
        await fetch(`${API}/news/track-search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: keyword.trim(), session_id: getSessionId() }),
        });
    } catch { /* silent */ }
}

const PAGE_SIZE = 12;

interface NewsListProps {
    onSearch?: (keyword: string) => void;
}

const NewsList: React.FC<NewsListProps> = ({ onSearch }) => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [source, setSource] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sources, setSources] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Fetch sources
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/news/sources`);
                if (res.ok) setSources(await res.json());
            } catch { /* silent */ }
        })();
    }, []);

    // Fetch articles
    const fetchArticles = useCallback(
        async (p: number, append: boolean = false) => {
            if (append) setLoadingMore(true);
            else setLoading(true);

            const params = new URLSearchParams({
                page: String(p),
                page_size: String(PAGE_SIZE),
            });
            if (activeSearch) params.set("search", activeSearch);
            if (source) params.set("source", source);
            if (dateFrom) params.set("date_from", dateFrom);
            if (dateTo) params.set("date_to", dateTo);

            try {
                const res = await fetch(`${API}/news/list?${params}`);
                if (!res.ok) throw new Error("API error");
                const json: PaginatedResponse = await res.json();

                if (append) {
                    setArticles((prev) => [...prev, ...json.data]);
                } else {
                    setArticles(json.data);
                }
                setPage(json.page);
                setTotalPages(json.total_pages);
                setTotal(json.total);
            } catch (e) {
                console.error("NewsList fetch error:", e);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [activeSearch, source, dateFrom, dateTo]
    );

    // Initial + filter change
    useEffect(() => {
        fetchArticles(1, false);
    }, [fetchArticles]);

    const handleSearch = () => {
        const q = searchInput.trim();
        setActiveSearch(q);
        if (q) trackSearch(q);
        onSearch?.(q);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    const clearFilters = () => {
        setSearchInput("");
        setActiveSearch("");
        setSource("");
        setDateFrom("");
        setDateTo("");
    };

    const hasActiveFilters = activeSearch || source || dateFrom || dateTo;

    const loadMore = () => {
        if (page < totalPages && !loadingMore) {
            fetchArticles(page + 1, true);
        }
    };

    // Skeleton
    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 rounded-xl" />
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* ── Search & Filters ─────────────────────────────────── */}
            <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
                {/* Search bar */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tin tức theo tiêu đề..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-muted/50 hover:bg-card transition-colors"
                        />
                        {searchInput && (
                            <button
                                onClick={() => { setSearchInput(""); setActiveSearch(""); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Tìm
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-1.5 ${
                            showFilters || hasActiveFilters
                                ? "bg-orange-50 border-orange-300 text-orange-600"
                                : "border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        Lọc
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {/* Extended filters */}
                {showFilters && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                        {/* Source */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Ànguồn:</label>
                            <select
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            >
                                <option value="">Tất cả</option>
                                {sources.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date from */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Từ:</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="text-sm border border-border rounded-lg pl-8 pr-3 py-1.5 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                            </div>
                        </div>

                        {/* Date to */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Đến:</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="text-sm border border-border rounded-lg pl-8 pr-3 py-1.5 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 ml-auto"
                            >
                                <X className="w-3.5 h-3.5" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Results info */}
            {(activeSearch || hasActiveFilters) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Tìm thấy <strong className="text-foreground">{total}</strong> kết quả</span>
                    {activeSearch && (
                        <Badge variant="secondary" className="text-xs">
                            &quot;{activeSearch}&quot;
                            <button onClick={() => { setSearchInput(""); setActiveSearch(""); }} className="ml-1">
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                    {source && (
                        <Badge variant="secondary" className="text-xs">
                            {source}
                            <button onClick={() => setSource("")} className="ml-1">
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}

            {/* ── Article list ─────────────────────────────────────── */}
            <div className="space-y-3">
                {articles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Search className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">Không tìm thấy bài viết nào</p>
                    </div>
                ) : (
                    articles.map((article) => {
                        const badgeColor = SOURCE_COLORS[article.source ?? ""] || "bg-slate-600";
                        const imgSrc = extractNewsImage(article.summary);
                        return (
                            <a
                                key={article.id}
                                href={article.link ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackClick(article.id)}
                                className="block"
                            >
                                <Card className="border-none shadow-sm hover:shadow-md hover:border-l-4 hover:border-l-orange-500 transition-all group">
                                    <CardContent className="p-4 flex gap-4">
                                        <div className="w-24 h-[72px] shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                                            {imgSrc !== "No image" ? (
                                                <img
                                                    src={imgSrc}
                                                    alt={article.title ?? ""}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className={`${badgeColor} w-full h-full flex items-center justify-center text-white font-bold text-xs text-center p-2`}>
                                                    No image
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-orange-600 transition-colors">
                                                {article.title}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                <Badge variant="secondary" className="text-[10px] font-medium">
                                                    {article.source}
                                                </Badge>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {timeAgo(article.published)}
                                                </span>
                                                <span className="ml-auto text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                    <ExternalLink className="w-3 h-3" />
                                                    Đọc bài
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </a>
                        );
                    })
                )}
            </div>

            {/* ── Load more ────────────────────────────────────────── */}
            {page < totalPages && (
                <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loadingMore ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải...
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-4 w-4" />
                            Xem thêm tin ({total - articles.length} bài còn lại)
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default NewsList;
