/**
 * useAnalysisData — Fetch real OHLCV from BE then compute
 * technical indicators, signals and summary on the client side.
 *
 * Replaces the mock `getAnalysisData()` from technicalAnalysisData.ts
 * with real price-history data from the stock detail API.
 */
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type {
  OHLCVItem,
  StockAnalysisData,
} from "@/lib/technicalAnalysisData";
import {
  calculateIndicators,
  generateSignals,
  generateSummary,
} from "@/lib/technicalAnalysisData";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UseAnalysisDataResult {
  data: StockAnalysisData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Convert BE price-history response to OHLCVItem[].
 * - BE returns `trading_date` (ISO string), open/high/low/close in *thousands VND*
 * - FE charts expect prices in VND → multiply by 1000
 */
function toOHLCV(raw: any[]): OHLCVItem[] {
  return raw
    .filter((r) => r.close != null)
    .map((r) => ({
      date: String(r.date ?? r.trading_date ?? "").slice(0, 10),
      open: (r.open ?? r.close) * 1000,
      high: (r.high ?? r.close) * 1000,
      low: (r.low ?? r.close) * 1000,
      close: r.close * 1000,
      volume: r.volume ?? 0,
    }));
}

export function useAnalysisData(ticker: string): UseAnalysisDataResult {
  const [ohlcvRaw, setOhlcvRaw] = useState<OHLCVItem[] | null>(null);
  const [stockInfo, setStockInfo] = useState<{
    name: string;
    exchange: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const upperTicker = ticker.toUpperCase();

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      // Fetch price history (ALL) and overview in parallel
      const [priceRes, overviewRes] = await Promise.all([
        fetch(
          `${API_BASE}/api/v1/stock/${upperTicker}/price-history?period=ALL`
        ),
        fetch(`${API_BASE}/api/v1/stock/${upperTicker}/overview`),
      ]);

      if (id !== fetchIdRef.current) return; // stale

      if (!priceRes.ok)
        throw new Error(`Price history: HTTP ${priceRes.status}`);

      const priceJson = await priceRes.json();
      const ohlcv = toOHLCV(priceJson);
      if (ohlcv.length < 2) throw new Error("Không đủ dữ liệu giá");

      setOhlcvRaw(ohlcv);

      // Extract stock info from overview (name, exchange)
      if (overviewRes.ok) {
        const ovJson = await overviewRes.json();
        const si = ovJson?.stockInfo;
        if (si) {
          // companyName can be "NaN" in some DB rows — prefer companyNameFull
          const rawName =
            si.companyName && si.companyName !== "NaN"
              ? si.companyName
              : si.companyNameFull || upperTicker;
          setStockInfo({
            name: rawName,
            exchange: si.exchange || "HOSE",
          });
        }
      }
    } catch (err: unknown) {
      if (id !== fetchIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Fetch failed";
      setError(msg);
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [upperTicker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute indicators, signals, summary from real OHLCV
  const data: StockAnalysisData | null = useMemo(() => {
    if (!ohlcvRaw || ohlcvRaw.length < 2) return null;

    const indicators = calculateIndicators(ohlcvRaw);
    const signals = generateSignals(ohlcvRaw, indicators);
    const summary = generateSummary(signals, ohlcvRaw);

    const lastItem = ohlcvRaw[ohlcvRaw.length - 1];
    const prevItem = ohlcvRaw[ohlcvRaw.length - 2];
    const change = lastItem.close - prevItem.close;
    const changePct = (change / prevItem.close) * 100;

    return {
      ticker: upperTicker,
      companyName: stockInfo?.name || upperTicker,
      exchange: stockInfo?.exchange || "HOSE",
      currentPrice: lastItem.close,
      priceChange: Math.round(change),
      priceChangePercent: Math.round(changePct * 100) / 100,
      ohlcv: ohlcvRaw,
      indicators,
      signals,
      summary,
    };
  }, [ohlcvRaw, stockInfo, upperTicker]);

  return { data, loading, error };
}
