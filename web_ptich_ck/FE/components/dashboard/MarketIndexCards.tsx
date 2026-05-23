"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface IndexData {
    id: string;
    tradingDate: string | null;
    name: string;
    value: number;
    change: number;
    percent: number;
    status: "up" | "down" | "unchanged";
}

interface MarketIndexCardsProps {
    onIndexSelect?: (indexId: string) => void;
    activeIndex?: string;
}

export function MarketIndexCards({ onIndexSelect, activeIndex }: MarketIndexCardsProps) {
    const [selectedIndex, setSelectedIndex] = useState(activeIndex || "VNINDEX");
    const [indices, setIndices] = useState<IndexData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchIndices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`${API_BASE}/api/v1/tong-quan/market-index-cards`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: IndexData[] = await res.json();
            setIndices(data);
        } catch (err: any) {
            console.error("Failed to fetch market index cards:", err);
            setError(err.message || "Không thể tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIndices();
        // Auto-refresh mỗi 60s
        const interval = setInterval(fetchIndices, 60_000);
        return () => clearInterval(interval);
    }, [fetchIndices]);

    // Sync with parent if activeIndex changes
    useEffect(() => {
        if (activeIndex && activeIndex !== selectedIndex) {
            setSelectedIndex(activeIndex);
        }
    }, [activeIndex]);

    const handleSelect = (id: string) => {
        setSelectedIndex(id);
        onIndexSelect?.(id);
    };

    // ── Loading skeleton ──
    if (loading && indices.length === 0) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative p-4 rounded-xl border bg-card border-border animate-pulse">
                        <div className="flex justify-between items-start mb-2">
                            <div className="h-4 w-16 bg-muted rounded" />
                            <div className="h-6 w-6 rounded-full bg-muted" />
                        </div>
                        <div className="h-7 w-24 bg-muted rounded mt-1" />
                        <div className="h-3 w-20 bg-muted rounded mt-2" />
                    </div>
                ))}
            </div>
        );
    }

    // ── Error state ──
    if (error && indices.length === 0) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="col-span-full p-6 rounded-xl border border-red-200 bg-red-50 text-center">
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                    <button
                        onClick={fetchIndices}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {indices.map((item) => (
                <div
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                        "relative p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md",
                        selectedIndex === item.id
                            ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                            : "bg-card border-border hover:border-sidebar-border"
                    )}
                >
                    {/* Loading overlay khi refresh */}
                    {loading && (
                        <div className="absolute inset-0 bg-card/50 rounded-xl flex items-center justify-center z-10">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                        <span className={cn(
                            "font-bold text-sm",
                            selectedIndex === item.id ? "text-primary" : "text-muted-foreground"
                        )}>
                            {item.name}
                        </span>
                        {item.status === "up" ? (
                            <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                <ArrowUp className="h-3.5 w-3.5" />
                            </div>
                        ) : item.status === "down" ? (
                            <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                <ArrowDown className="h-3.5 w-3.5" />
                            </div>
                        ) : (
                            <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                <Minus className="h-3.5 w-3.5" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold tracking-tight">
                            {item.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div
                        className={cn(
                            "text-xs font-medium flex items-center mt-1",
                            item.status === "up" ? "text-green-500" : item.status === "down" ? "text-red-500" : "text-yellow-500"
                        )}
                    >
                        <span>{item.change > 0 ? "+" : ""}{item.change.toFixed(2)}</span>
                        <span className="mx-1">•</span>
                        <span>{item.change > 0 ? "+" : ""}{item.percent.toFixed(2)}%</span>
                    </div>

                    {/* Active Indicator Line */}
                    {selectedIndex === item.id && (
                        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-t-full" />
                    )}
                </div>
            ))}
        </div>
    );
}
