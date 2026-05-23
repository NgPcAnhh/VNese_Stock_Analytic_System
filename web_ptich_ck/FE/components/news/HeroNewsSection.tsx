"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Newspaper } from "lucide-react";
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

const HeroNewsSection = () => {
    const [items, setItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API}/tong-quan/news?limit=8`);
                if (!res.ok) throw new Error("API error");
                const data: NewsItem[] = await res.json();
                if (!cancelled) setItems(data);
            } catch (e) {
                console.error("HeroNewsSection fetch error:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
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
        const t = setTimeout(updateArrows, 50);
        el.addEventListener("scroll", updateArrows, { passive: true });
        window.addEventListener("resize", updateArrows);
        return () => {
            clearTimeout(t);
            el.removeEventListener("scroll", updateArrows);
            window.removeEventListener("resize", updateArrows);
        };
    }, [items, updateArrows]);

    const scroll = (dir: "left" | "right") => {
        const el = scrollRef.current;
        if (!el) return;
        const card = el.querySelector<HTMLElement>("[data-news-card]");
        const w = card ? card.offsetWidth + 16 : 300;
        el.scrollBy({ left: dir === "left" ? -w : w, behavior: "smooth" });
    };

    /* ── Skeleton ── */
    if (loading) {
        return (
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[280px] rounded-xl" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm rounded-xl border border-dashed">
                Không có tin tức
            </div>
        );
    }

    return (
        <div className="relative group/slider">
            {/* Left arrow */}
            {canLeft && (
                <button
                    onClick={() => scroll("left")}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card shadow-lg rounded-full p-2 -ml-3 opacity-0 group-hover/slider:opacity-100 transition-opacity"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-700" />
                </button>
            )}
            {/* Right arrow */}
            {canRight && (
                <button
                    onClick={() => scroll("right")}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card shadow-lg rounded-full p-2 -mr-3 opacity-0 group-hover/slider:opacity-100 transition-opacity"
                >
                    <ChevronRight className="h-5 w-5 text-gray-700" />
                </button>
            )}

            {/* Scrollable row — 4 cards visible at a time */}
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {items.map((item) => {
                    const badgeColor = SOURCE_COLORS[item.source ?? ""] || "bg-slate-600";
                    const imgSrc = extractNewsImage(item.summary);

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
                            <div className="relative w-full h-[140px] bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                                {imgSrc !== "No image" ? (
                                    <img
                                        src={imgSrc}
                                        alt={item.title ?? ""}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs font-semibold">
                                        <Newspaper className="h-10 w-10" />
                                        No image
                                    </div>
                                )}
                                <Badge className={`absolute top-2 left-2 ${badgeColor} text-white text-[11px] px-2 py-0.5`}>
                                    {item.source || "Tin tức"}
                                </Badge>
                            </div>

                            {/* Content */}
                            <div className="p-3 flex flex-col flex-1">
                                <h3 className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors">
                                    {item.title}
                                </h3>
                                <div className="flex items-center justify-between mt-auto pt-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {timeAgo(item.published)}
                                    </span>
                                    {item.link && (
                                        <span className="text-xs text-orange-500 flex items-center gap-1">
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
    );
};

export default HeroNewsSection;
