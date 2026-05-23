"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SectorKPI {
    sectorName: string;
    rsScore: number;
    totalTradingValue: number;
    tradingValueVsAvg: number;
    mfi: number;
    marketCap: number;
    netForeign: number;
    pb: number;
    stockCount: number;
}

export interface SectorPerformancePoint {
    date: string;
    sectorReturn: number;
    vnindexReturn: number;
}

export interface BreadthData {
    ceiling: number;
    up: number;
    ref: number;
    down: number;
    floor: number;
}

export interface TreemapStock {
    ticker: string;
    marketCap: number;
    changePercent: number;
    companyName: string;
}

export interface LiquidityPoint {
    date: string;
    tradingValue: number;
    netForeign: number;
}

export interface ValuationStock {
    ticker: string;
    pb: number;
    roe: number;
    marketCap: number;
    zone: string;
}

export interface LiquidityByCapGroup {
    group: string;
    value: number;
}

export interface SectorStockRow {
    ticker: string;
    companyName: string;
    exchange: string;
    price: number;
    change1D: number;
    volume: number;
    tradingValue: number;
    foreignBuy: number;
    foreignSell: number;
}

export interface SectorDetailResponse {
    kpi: SectorKPI;
    performance: SectorPerformancePoint[];
    breadth: BreadthData;
    treemap: TreemapStock[];
    liquidity: LiquidityPoint[];
    valuation: ValuationStock[];
    liquidityByCap: LiquidityByCapGroup[];
    stocks: SectorStockRow[];
}

export function useSectorDetailData(slug: string) {
    const [data, setData] = useState<SectorDetailResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const fetchIdRef = useRef(0);

    const fetchData = useCallback(async () => {
        if (!slug) return;
        
        const id = ++fetchIdRef.current;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/v1/market/sector-detail?sector_slug=${encodeURIComponent(slug)}`);
            if (id !== fetchIdRef.current) return;

            if (!res.ok) {
                throw new Error(`Failed to fetch sector detail: status ${res.status}`);
            }
            const json: SectorDetailResponse = await res.json();
            setData(json);
        } catch (err: unknown) {
            if (id !== fetchIdRef.current) return;
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            if (id === fetchIdRef.current) {
                setLoading(false);
            }
        }
    }, [slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
