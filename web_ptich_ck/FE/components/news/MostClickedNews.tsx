"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Eye, ExternalLink, Clock } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface MostClickedItem {
    id: number;
    title: string | null;
    source: string | null;
    published: string | null;
    link: string | null;
    click_count: number;
}

function timeAgo(iso: string | null): string {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}p trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h trước`;
    const days = Math.floor(hours / 24);
    return `${days}d trước`;
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

const MostClickedNews: React.FC = () => {
    const [items, setItems] = useState<MostClickedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API}/news/most-clicked?limit=10&days=30`);
                if (!res.ok) throw new Error("API error");
                const data: MostClickedItem[] = await res.json();
                if (!cancelled) setItems(data);
            } catch (e) {
                console.error("MostClickedNews fetch error:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    Đọc nhiều nhất
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {items.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Chưa có dữ liệu
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {items.map((item, index) => (
                            <a
                                key={item.id}
                                href={item.link ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackClick(item.id)}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-orange-50/50 transition-colors group"
                            >
                                <span
                                    className={`text-lg font-black w-7 text-center shrink-0 ${
                                        index < 3 ? "text-orange-500" : "text-muted-foreground"
                                    }`}
                                >
                                    {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-orange-600 transition-colors leading-snug">
                                        {item.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                        <span className="flex items-center gap-0.5">
                                            <Eye className="w-3 h-3" />
                                            {item.click_count}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-0.5">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(item.published)}
                                        </span>
                                    </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-orange-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default MostClickedNews;
