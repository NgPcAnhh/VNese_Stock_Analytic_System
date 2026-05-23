"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { extractNewsImage } from "@/lib/newsImage";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface NewsItem {
    id: number;
    title: string | null;
    source: string | null;
    published: string | null;
    summary: string | null;
    link: string | null;
}

const SOURCE_COLORS: Record<string, string> = {
    VnExpress: "bg-blue-600",
    CafeF: "bg-emerald-600",
    VietStock: "bg-purple-600",
    Bloomberg: "bg-amber-600",
    TCBS: "bg-teal-600",
    NDH: "bg-rose-600",
};

const KEYWORDS = [
    "VN-Index", "Cổ phiếu", "Ngân hàng", "Bất động sản",
    "Lãi suất", "GDP", "FED", "Trái phiếu",
];

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

const PAGE_SIZE = 10;

const NewsFeed = () => {
    const [feedItems, setFeedItems] = useState<NewsItem[]>([]);
    const [recentItems, setRecentItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);

    /* First load: feed (skip 3 hero) + recent for sidebar */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [feedRes, recentRes] = await Promise.all([
                    fetch(`${API}/tong-quan/news?limit=${PAGE_SIZE}&offset=3`),
                    fetch(`${API}/tong-quan/news?limit=5&offset=0`),
                ]);
                if (!feedRes.ok || !recentRes.ok) throw new Error("API error");
                const feed: NewsItem[] = await feedRes.json();
                const recent: NewsItem[] = await recentRes.json();
                if (!cancelled) {
                    setFeedItems(feed);
                    setRecentItems(recent);
                    setOffset(3 + feed.length);
                    if (feed.length < PAGE_SIZE) setHasMore(false);
                }
            } catch (e) {
                console.error("NewsFeed fetch error:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const res = await fetch(`${API}/tong-quan/news?limit=${PAGE_SIZE}&offset=${offset}`);
            if (!res.ok) throw new Error("API error");
            const data: NewsItem[] = await res.json();
            setFeedItems((prev) => [...prev, ...data]);
            setOffset((prev) => prev + data.length);
            if (data.length < PAGE_SIZE) setHasMore(false);
        } catch (e) {
            console.error("Load more error:", e);
        } finally {
            setLoadingMore(false);
        }
    }, [offset, loadingMore, hasMore]);

    /* ---- Skeleton loading ---- */
    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="h-7 w-40" />
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <div className="space-y-8">
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Left Column: Main Feed */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-foreground border-l-4 border-orange-500 pl-3">
                    Dòng sự kiện
                </h2>
                <div className="space-y-4">
                    {feedItems.map((news) => {
                        const imgSrc = extractNewsImage(news.summary);
                        const inner = (
                            <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex gap-4">
                                    <div className="w-24 h-[72px] shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                                        {imgSrc !== "No image" ? (
                                            <img
                                                src={imgSrc}
                                                alt={news.title ?? ""}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className={`${SOURCE_COLORS[news.source ?? ""] || "bg-slate-600"} w-full h-full flex items-center justify-center text-white font-bold text-xs text-center p-2`}>
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-foreground line-clamp-2 hover:text-orange-600 cursor-pointer">
                                            {news.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                            <span className="font-medium text-muted-foreground">
                                                {news.source}
                                            </span>
                                            <span>•</span>
                                            <span>{timeAgo(news.published)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );

                        return news.link ? (
                            <a key={news.id} href={news.link} target="_blank" rel="noopener noreferrer" className="block">
                                {inner}
                            </a>
                        ) : (
                            <div key={news.id}>{inner}</div>
                        );
                    })}
                </div>

                {/* Load more */}
                {hasMore && (
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full py-3 mt-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loadingMore ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang tải...
                            </>
                        ) : (
                            "Xem thêm tin"
                        )}
                    </button>
                )}
            </div>

            {/* Right Column: Sidebar */}
            <div className="space-y-8">
                {/* Hot Keywords */}
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-md font-bold text-foreground">
                            Từ khóa nổi bật
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {KEYWORDS.map((kw) => (
                                <Badge
                                    key={kw}
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-orange-100 hover:text-orange-700 transition-colors"
                                >
                                    {kw}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent News (replaces "Most Read" since DB has no views data) */}
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-md font-bold text-foreground">
                            Mới nhất
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {recentItems.map((item, index) => {
                                const inner = (
                                    <div className="p-4 flex items-start gap-3 hover:bg-muted/50 cursor-pointer transition-colors">
                                        <span className="text-2xl font-bold text-muted-foreground -mt-1">{index + 1}</span>
                                        <div>
                                            <h4 className="text-sm font-medium text-foreground hover:text-orange-600 leading-snug line-clamp-2">
                                                {item.title}
                                            </h4>
                                            <span className="text-xs text-muted-foreground">{timeAgo(item.published)}</span>
                                        </div>
                                    </div>
                                );
                                return item.link ? (
                                    <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer">
                                        {inner}
                                    </a>
                                ) : (
                                    <div key={item.id}>{inner}</div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default NewsFeed;
