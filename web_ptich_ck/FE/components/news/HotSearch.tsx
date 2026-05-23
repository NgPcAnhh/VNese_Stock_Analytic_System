"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, TrendingUp } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface HotSearchItem {
    keyword: string;
    search_count: number;
}

// Default keywords hiển thị khi chưa có data từ API
const DEFAULT_KEYWORDS = [
    "VN-Index", "Cổ phiếu", "Ngân hàng", "Bất động sản",
    "Lãi suất", "GDP", "FED", "Trái phiếu", "Chứng khoán",
    "Vàng", "Dầu thô", "Lạm phát",
];

interface HotSearchProps {
    onKeywordClick?: (keyword: string) => void;
}

const HotSearch: React.FC<HotSearchProps> = ({ onKeywordClick }) => {
    const [items, setItems] = useState<HotSearchItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API}/news/hot-search?limit=12&days=7`);
                if (!res.ok) throw new Error("API error");
                const data: HotSearchItem[] = await res.json();
                if (!cancelled) setItems(data);
            } catch (e) {
                console.error("HotSearch fetch error:", e);
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
                    <Skeleton className="h-5 w-36" />
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-7 w-20 rounded-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Use API data if available, otherwise show default keywords
    const keywords = items.length > 0
        ? items.map((item) => item.keyword)
        : DEFAULT_KEYWORDS;

    return (
        <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-500" />
                    Tìm kiếm nổi bật
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, idx) => {
                        const isTop3 = items.length > 0 && idx < 3;
                        return (
                            <button
                                key={kw}
                                onClick={() => onKeywordClick?.(kw)}
                                className="group"
                            >
                                <Badge
                                    variant="secondary"
                                    className={`cursor-pointer transition-all text-xs px-3 py-1 ${
                                        isTop3
                                            ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200"
                                            : "hover:bg-orange-100 hover:text-orange-700"
                                    }`}
                                >
                                    {isTop3 && (
                                        <TrendingUp className="w-3 h-3 mr-1 inline" />
                                    )}
                                    {kw}
                                    {items.length > 0 && items[idx] && (
                                        <span className="ml-1 text-[10px] opacity-60">
                                            {items[idx].search_count}
                                        </span>
                                    )}
                                </Badge>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default HotSearch;
