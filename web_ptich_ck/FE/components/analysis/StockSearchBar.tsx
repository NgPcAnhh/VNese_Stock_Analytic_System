"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { popularTickers } from "@/lib/technicalAnalysisData";

interface StockSearchBarProps {
  currentTicker?: string;
  className?: string;
}

const StockSearchBar: React.FC<StockSearchBarProps> = ({ currentTicker, className }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const filteredTickers = query.trim()
    ? popularTickers.filter(
        (t) =>
          t.ticker.toLowerCase().includes(query.toLowerCase()) ||
          t.name.toLowerCase().includes(query.toLowerCase())
      )
    : popularTickers;

  const handleSelect = (ticker: string) => {
    router.push(`/analysis/${ticker}`);
    setQuery("");
    setIsFocused(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().toUpperCase();
    if (trimmed) {
      handleSelect(trimmed);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            isFocused
              ? "border-primary ring-2 ring-primary/20 bg-card"
              : "border-border bg-card hover:border-border"
          )}
        >
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Nhập mã cổ phiếu (VD: VIC, FPT, HPG...)"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {isFocused && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden max-h-80 overflow-y-auto">
          {!query && (
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={12} />
              Mã phổ biến
            </div>
          )}

          {filteredTickers.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              Không tìm thấy mã cổ phiếu
            </div>
          ) : (
            filteredTickers.map((t) => (
              <button
                key={t.ticker}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(t.ticker);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors",
                  currentTicker === t.ticker && "bg-primary/5"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {t.ticker.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{t.ticker}</div>
                  <div className="text-xs text-muted-foreground">{t.name}</div>
                </div>
                {currentTicker === t.ticker && (
                  <div className="text-xs text-primary font-medium">Đang xem</div>
                )}
              </button>
            ))
          )}

          {query.trim() && !filteredTickers.find((t) => t.ticker === query.trim().toUpperCase()) && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(query.trim().toUpperCase());
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-t border-border/50"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Search size={14} className="text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  Tìm &quot;{query.trim().toUpperCase()}&quot;
                </div>
                <div className="text-xs text-muted-foreground">Nhấn Enter để phân tích</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSearchBar;
