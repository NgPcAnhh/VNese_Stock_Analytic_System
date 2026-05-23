"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Newspaper } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface NewsItemData {
    id: number;
    title: string | null;
    source: string | null;
    published: string | null;
    summary: string | null;
    link: string | null;
}

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

const SOURCE_COLORS: Record<string, string> = {
    VnExpress: "bg-blue-600",
    CafeF: "bg-emerald-600",
    VietStock: "bg-purple-600",
    Bloomberg: "bg-amber-600",
    TCBS: "bg-teal-600",
    NDH: "bg-rose-600",
};

export function NewsSection() {
    const [news, setNews] = useState<NewsItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE}/api/v1/tong-quan/news?limit=8`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (!cancelled && Array.isArray(data) && data.length > 0) {
                    setNews(data);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    /* ── Arrow visibility ── */
    const updateArrows = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        // wait a tick so widths are computed
        const t = setTimeout(updateArrows, 50);
        el.addEventListener("scroll", updateArrows, { passive: true });
        window.addEventListener("resize", updateArrows);
        return () => {
            clearTimeout(t);
            el.removeEventListener("scroll", updateArrows);
            window.removeEventListener("resize", updateArrows);
        };
    }, [news, updateArrows]);

    const scroll = (dir: "left" | "right") => {
        const el = scrollRef.current;
        if (!el) return;
        const card = el.querySelector<HTMLElement>("[data-news-card]");
        const w = card ? card.offsetWidth + 16 : 300; // card + gap
        el.scrollBy({ left: dir === "left" ? -w : w, behavior: "smooth" });
    };

    /* ── Skeleton ── */
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Tin tức mới nhất</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-[240px] rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (news.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Tin tức mới nhất</h2>
                <Link href="/news" className="text-sm font-medium text-primary hover:underline">
                    Xem tất cả
                </Link>
            </div>

            {/* Slider wrapper */}
            <div className="relative group/slider">
                {/* Left arrow */}
                {canLeft && (
                    <button
                        onClick={() => scroll("left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card shadow-lg rounded-full p-2 -ml-3 opacity-0 group-hover/slider:opacity-100 transition-opacity"
                    >
                        <ChevronLeft className="h-5 w-5 text-foreground" />
                    </button>
                )}
                {/* Right arrow */}
                {canRight && (
                    <button
                        onClick={() => scroll("right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card shadow-lg rounded-full p-2 -mr-3 opacity-0 group-hover/slider:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="h-5 w-5 text-foreground" />
                    </button>
                )}

                {/* Scrollable row — exactly 4 cards visible */}
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {news.map((item) => {
                        const badgeColor = SOURCE_COLORS[item.source ?? ""] || "bg-slate-600";
                        const hasImg = item.summary ? /<img\s/i.test(item.summary) : false;

                        const Wrapper = item.link ? "a" : "div";
                        const wrapperProps = item.link
                            ? { href: item.link, target: "_blank", rel: "noopener noreferrer" }
                            : {};

                        return (
                            <Wrapper
                                key={item.id}
                                {...(wrapperProps as any)}
                                data-news-card
                                className="w-[calc((100%-48px)/4)] min-w-[calc((100%-48px)/4)] shrink-0 snap-start rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col"
                            >
                                {/* Thumbnail */}
                                    <div className="relative h-[140px] bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                                    {hasImg ? (
                                        <div
                                            className="w-full h-full [&_img]:w-full [&_img]:h-full [&_img]:object-cover"
                                            style={{ fontSize: 0, lineHeight: 0, color: "transparent" }}
                                            dangerouslySetInnerHTML={{ __html: item.summary! }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Newspaper className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                    )}
                                    <Badge className={`absolute top-2 left-2 ${badgeColor} text-white text-[11px] px-2 py-0.5`}>
                                        {item.source || "Tin tức"}
                                    </Badge>
                                </div>

                                {/* Content */}
                                <div className="p-3 flex flex-col flex-1">
                                    <h3 className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-auto pt-2">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(item.published)}
                                        </span>
                                        {item.link && (
                                            <span className="text-xs text-primary/70 flex items-center gap-1">
                                                <ExternalLink className="w-3 h-3" />
                                                Đọc thêm
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Wrapper>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
