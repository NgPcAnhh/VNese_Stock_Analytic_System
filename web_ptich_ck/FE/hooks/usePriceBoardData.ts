"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TABS, INDEX_CODES, fetchSymbolsForTab, type TabDef } from "@/lib/priceBoardData";

/**
 * Hook that dynamically fetches symbol lists from SSI API
 * when the active tab changes. Caches results to avoid refetching.
 */
export function usePriceBoardData(activeTabKey: string) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache: tabKey → symbols[]
  const cacheRef = useRef<Map<string, string[]>>(new Map());

  const fetchTab = useCallback(async (tabKey: string) => {
    // Check cache first
    const cached = cacheRef.current.get(tabKey);
    if (cached) {
      setSymbols(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const tab = TABS.find((t) => t.key === tabKey);
    if (!tab) {
      setError(`Unknown tab: ${tabKey}`);
      setLoading(false);
      return;
    }

    const result = await fetchSymbolsForTab(tab);
    if (result.length === 0) {
      setError(`Không lấy được danh sách mã cho ${tab.label}`);
    } else {
      cacheRef.current.set(tabKey, result);
      setError(null);
    }
    setSymbols(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTab(activeTabKey);
  }, [activeTabKey, fetchTab]);

  /** All symbols that should be subscribed on the WebSocket (tab symbols + index codes) */
  const wsSymbols = [...new Set([...symbols, ...INDEX_CODES])];

  return { symbols, wsSymbols, loading, error };
}
