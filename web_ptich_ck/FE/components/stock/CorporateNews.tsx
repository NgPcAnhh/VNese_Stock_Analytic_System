"use client";

import React, { useState } from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, Tag, ChevronRight, ChevronDown } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
    "Tin doanh nghiệp": "bg-blue-100 text-blue-700",
    "ĐHCĐ": "bg-purple-100 text-purple-700",
    "Cổ tức": "bg-green-100 text-green-700",
    "Phát hành": "bg-amber-100 text-amber-700",
    "Niêm yết": "bg-teal-100 text-teal-700",
    "Giao dịch nội bộ": "bg-rose-100 text-rose-700",
    "Kết quả kinh doanh": "bg-indigo-100 text-indigo-700",
};

function getCategoryColor(category: string) {
    for (const [key, val] of Object.entries(CATEGORY_COLORS)) {
        if (category.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return "bg-muted text-muted-foreground";
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
        return dateStr;
    }
}

/* ── Grid constants per mode ── */
const OVERVIEW_COLS = 3;
const OVERVIEW_ROWS = 2;
const OVERVIEW_COUNT = OVERVIEW_COLS * OVERVIEW_ROWS; // 6

const FULL_COLS = 3;
const FULL_ROWS = 4;
const FULL_PAGE_SIZE = FULL_COLS * FULL_ROWS; // 12

/* ── Single news card ── */
function NewsCard({ ev, idx }: { ev: { id?: string; title: string; time: string; source?: string; category?: string }; idx: number }) {
    return (
        <article
            key={ev.id ?? idx}
            className="group rounded-lg border border-border bg-card p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between"
        >
            {/* Category & date */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    {ev.category && (
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0.5 font-medium ${getCategoryColor(ev.category)}`}>
                            <Tag className="w-2.5 h-2.5 mr-0.5" />
                            {ev.category}
                        </Badge>
                    )}
                </div>
                {/* Title */}
                <h3 className="text-sm font-semibold text-foreground group-hover:text-orange-600 transition-colors leading-relaxed line-clamp-3 mb-2">
                    {ev.source ? (
                        <a href={ev.source} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {ev.title}
                        </a>
                    ) : (
                        ev.title
                    )}
                </h3>
            </div>
            {/* Footer: date + source */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(ev.time)}
                </div>
                {ev.source && (
                    <a
                        href={ev.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-orange-500 hover:text-orange-600 flex items-center gap-0.5"
                    >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Nguồn
                    </a>
                )}
            </div>
        </article>
    );
}

/* ── Props ── */
interface CorporateNewsProps {
    /** "overview" = 2 rows × 3 cols on overview tab; "full" = 4 rows × 3 cols on news tab */
    mode?: "overview" | "full";
}

const CorporateNews = ({ mode = "overview" }: CorporateNewsProps) => {
    const { corporateNews: events, onTabChange } = useStockDetail();
    const [visibleCount, setVisibleCount] = useState(FULL_PAGE_SIZE);

    if (!events.length) {
        return (
            <div className="rounded-lg border border-border bg-card py-8 text-center text-sm text-muted-foreground">
                Chưa có sự kiện nào cho mã này.
            </div>
        );
    }

    /* ─ Overview mode: show first 6 items (2 rows × 3 cols), "Xem thêm" goes to news tab ─ */
    if (mode === "overview") {
        const displayed = events.slice(0, OVERVIEW_COUNT);
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayed.map((ev, idx) => (
                        <NewsCard key={ev.id ?? idx} ev={ev} idx={idx} />
                    ))}
                </div>
                {events.length > OVERVIEW_COUNT && (
                    <div className="flex justify-center">
                        <button
                            onClick={() => onTabChange?.("news")}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors flex items-center gap-1 px-4 py-2 rounded-lg hover:bg-orange-50"
                        >
                            Xem thêm tin tức
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    /* ─ Full mode (news tab): show 12 items at a time (4 rows × 3 cols), load more ─ */
    const displayed = events.slice(0, visibleCount);
    const hasMore = visibleCount < events.length;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayed.map((ev, idx) => (
                    <NewsCard key={ev.id ?? idx} ev={ev} idx={idx} />
                ))}
            </div>
            {hasMore && (
                <div className="flex justify-center">
                    <button
                        onClick={() => setVisibleCount((prev) => prev + FULL_PAGE_SIZE)}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors flex items-center gap-1 px-4 py-2 rounded-lg hover:bg-orange-50"
                    >
                        <ChevronDown className="w-4 h-4" />
                        Xem thêm ({Math.min(FULL_PAGE_SIZE, events.length - visibleCount)} tin)
                    </button>
                </div>
            )}
        </div>
    );
};

export default CorporateNews;
