"use client";

import React, { createContext, useContext } from "react";
import type {
    StockInfo,
    PriceHistoryItem,
    OrderBookItem,
    HistoricalDataItem,
    Shareholder,
    PeerStock,
    NewsArticle,
    RecommendedStock,
} from "@/hooks/useStockData";

export interface StockDetailData {
    stockInfo: StockInfo;
    priceHistory: PriceHistoryItem[];
    orderBook: OrderBookItem[];
    historicalData: HistoricalDataItem[];
    shareholders: Shareholder[];
    shareholderStructure: { position: string; percent: number; members: { name: string; percent: number }[] }[];
    peerStocks: PeerStock[];
    corporateNews: NewsArticle[];
    recommendations: RecommendedStock[];
    /** The raw ticker string for sub-tab API calls */
    ticker: string;
    /** Whether the overview data is still loading */
    loading: boolean;
    /** Error message if overview fetch failed */
    error: string | null;
    /** Callback to switch navigation tabs from child components */
    onTabChange?: (tab: string) => void;
}

const StockDetailContext = createContext<StockDetailData | null>(null);

export function StockDetailProvider({ data, children }: { data: StockDetailData; children: React.ReactNode }) {
    return (
        <StockDetailContext.Provider value={data}>
            {children}
        </StockDetailContext.Provider>
    );
}

export function useStockDetail(): StockDetailData {
    const ctx = useContext(StockDetailContext);
    if (!ctx) throw new Error("useStockDetail must be used within StockDetailProvider");
    return ctx;
}
