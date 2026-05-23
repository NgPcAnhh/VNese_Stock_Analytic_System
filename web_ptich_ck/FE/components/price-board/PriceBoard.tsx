"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useStockWebSocket } from "@/hooks/useStockWebSocket";
import { usePriceBoardData } from "@/hooks/usePriceBoardData";
import { TABS } from "@/lib/priceBoardData";
import IndexBar from "./IndexBar";
import PriceBoardTable from "./PriceBoardTable";
import { Search, Wifi, WifiOff, Loader2, ChevronDown } from "lucide-react";

const VISIBLE_TAB_COUNT = 5;

/* ================================================================= */
/*  PriceBoard – full page component (mounts on /price-board)         */
/* ================================================================= */

export default function PriceBoard() {
  const { connected, updateSubscription } = useStockWebSocket();
  const [activeTab, setActiveTab] = useState("VN30");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const visibleTabs = TABS.slice(0, VISIBLE_TAB_COUNT);
  const moreTabs = TABS.slice(VISIBLE_TAB_COUNT);
  const activeInMore = moreTabs.some((t) => t.key === activeTab);

  // Fetch symbols dynamically from SSI via our API proxy
  const { symbols: tabSymbols, wsSymbols, loading, error } = usePriceBoardData(activeTab);

  // Filter by search
  const displaySymbols = useMemo(() => {
    if (!search.trim()) return tabSymbols;
    const q = search.toUpperCase();
    return tabSymbols.filter((s) => s.includes(q));
  }, [tabSymbols, search]);

  // Subscribe to WebSocket when symbols change
  useEffect(() => {
    if (wsSymbols.length > 0) {
      updateSubscription(wsSymbols);
    }
  }, [wsSymbols, updateSubscription]);

  return (
    <div className="flex flex-col h-full bg-black text-gray-200 font-sans overflow-hidden">
      {/* ── Top: Index bar ──────────────────────────────────── */}
      <div className="p-2 flex-shrink-0">
        <IndexBar />
      </div>

      {/* ── Tabs + Search bar ───────────────────────────────── */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-black border-y border-[#2a2e39] gap-2 flex-shrink-0">
        {/* Search */}
        <div className="flex items-center gap-2 bg-black rounded px-2 py-1.5 w-44 border border-[#2a2e39] flex-shrink-0">
          <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Tìm mã CK..."
            className="bg-transparent border-none outline-none text-white w-full text-[12px] placeholder:text-gray-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs — first 5 visible + dropdown for the rest */}
        <div className="flex-1 flex items-center gap-1 min-w-0">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "hover:bg-[#101010] text-[#7d90a8]"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Dropdown for remaining tabs */}
          {moreTabs.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className={`flex items-center gap-1 whitespace-nowrap px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                  activeInMore
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "hover:bg-[#222] text-[#7d90a8]"
                }`}
              >
                {activeInMore ? activeTab : "Khác"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-black border border-[#2a2e39] rounded-lg shadow-xl py-1 min-w-[160px] max-h-[320px] overflow-y-auto">
                  {moreTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        activeTab === tab.key
                          ? "bg-primary/20 text-primary"
                          : "text-[#7d90a8] hover:bg-[#101010] hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Connection indicator + symbol count */}
        <div className="flex items-center gap-3 text-[11px] flex-shrink-0">
          <span className="text-gray-500">
            {tabSymbols.length > 0 && `${displaySymbols.length} mã`}
          </span>
          {connected ? (
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-[#00c076]" />
              <span className="text-[#00c076]">Live</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5 text-[#ff3333]" />
              <span className="text-[#ff3333]">Đang kết nối...</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Đang tải danh sách mã {activeTab}...</span>
        </div>
      ) : error && displaySymbols.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <PriceBoardTable symbols={displaySymbols} />
      )}
    </div>
  );
}
