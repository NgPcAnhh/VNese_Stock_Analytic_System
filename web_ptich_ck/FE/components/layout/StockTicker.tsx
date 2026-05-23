"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUp, ArrowDown, Minus, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TickerItem {
    symbol: string;
    price: number;
    change: number;
    percent: number;
    category: "index" | "gainer" | "loser";
}

// Nhãn phân loại để tạo dải separator trên slide
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    index: { label: "Chỉ số", color: "bg-blue-500/10 text-blue-600" },
    gainer: { label: "Top tăng", color: "bg-green-500/10 text-green-600" },
    loser: { label: "Top giảm", color: "bg-red-500/10 text-red-600" },
};

export function StockTicker() {
    const [isPaused, setIsPaused] = useState(false);
    const [items, setItems] = useState<TickerItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/tong-quan/ticker-slide`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: TickerItem[] = await res.json();
            setItems(data);
        } catch (err) {
            console.error("Failed to fetch ticker slide:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Auto-refresh mỗi 2 phút
        const interval = setInterval(fetchData, 120_000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Nhóm items theo category để hiển thị separator
    const groupedItems = (() => {
        const result: (TickerItem | { separator: string })[] = [];
        let lastCategory = "";
        for (const item of items) {
            if (item.category !== lastCategory) {
                result.push({ separator: item.category });
                lastCategory = item.category;
            }
            result.push(item);
        }
        return result;
    })();

    // Nhân 3 lần để tạo hiệu ứng scroll vô hạn
    const tripled = [...groupedItems, ...groupedItems, ...groupedItems];

    // Tính tốc độ scroll dựa trên số item (nhiều item → chậm hơn)
    const scrollDuration = Math.max(30, items.length * 2.5);

    if (loading) {
        return (
            <div className="w-full bg-background border-b border-border h-10 flex items-center justify-center relative z-20">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                <span className="text-xs text-muted-foreground">Đang tải dữ liệu...</span>
            </div>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <div
            className="w-full bg-background border-b border-border overflow-hidden h-10 flex items-center relative z-20"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div
                className={`flex whitespace-nowrap ${isPaused ? "paused" : ""}`}
                style={{
                    animation: `scroll ${scrollDuration}s linear infinite`,
                }}
            >
                {tripled.map((entry, index) => {
                    // Separator giữa các nhóm
                    if ("separator" in entry) {
                        const meta = CATEGORY_LABELS[entry.separator];
                        return (
                            <div
                                key={`sep-${entry.separator}-${index}`}
                                className={`flex items-center px-3 mr-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${meta?.color || ""}`}
                            >
                                {meta?.label || entry.separator}
                            </div>
                        );
                    }

                    const item = entry as TickerItem;
                    const isUp = item.percent > 0;
                    const isDown = item.percent < 0;
                    const colorClass = isUp
                        ? "text-green-500"
                        : isDown
                            ? "text-red-500"
                            : "text-yellow-500";

                    return (
                        <div
                            key={`${item.symbol}-${index}`}
                            className="flex items-center space-x-2 px-5 border-r border-border/50 min-w-max"
                        >
                            <span className="font-bold text-sm text-foreground">
                                {item.symbol}
                            </span>
                            <span className={`text-sm font-medium ${colorClass}`}>
                                {item.price.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                            <span className={`flex items-center text-xs font-medium ${colorClass}`}>
                                {isUp ? (
                                    <ArrowUp size={12} className="mr-0.5" />
                                ) : isDown ? (
                                    <ArrowDown size={12} className="mr-0.5" />
                                ) : (
                                    <Minus size={12} className="mr-0.5" />
                                )}
                                {isUp ? "+" : ""}
                                {item.percent.toFixed(2)}%
                            </span>
                        </div>
                    );
                })}
            </div>
            <style jsx global>{`
                @keyframes scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-33.33%);
                    }
                }
                .paused {
                    animation-play-state: paused !important;
                }
            `}</style>
        </div>
    );
}
