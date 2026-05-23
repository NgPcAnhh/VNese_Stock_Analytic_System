"use client";

import React, { useState, useMemo } from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
    Search,
} from "lucide-react";

type SortKey = "name" | "role" | "percentage";
type SortDir = "asc" | "desc" | null;
const PAGE_SIZE = 8;

const ShareholderList = () => {
    const { shareholders: SHAREHOLDERS } = useStockDetail();
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            const next = sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc";
            setSortDir(next);
            if (next === null) setSortKey(null);
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
        setPage(1);
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return SHAREHOLDERS;
        const q = search.toLowerCase();
        return SHAREHOLDERS.filter(
            (s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q),
        );
    }, [SHAREHOLDERS, search]);

    const sorted = useMemo(() => {
        if (!sortKey || !sortDir) return filtered;
        return [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sortKey === "name") cmp = a.name.localeCompare(b.name, "vi");
            else if (sortKey === "role") cmp = a.role.localeCompare(b.role, "vi");
            else cmp = a.percentage - b.percentage;
            return sortDir === "desc" ? -cmp : cmp;
        });
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const renderSortIcon = (col: SortKey) => {
        if (sortKey !== col || !sortDir) return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
        return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-orange-500" /> : <ArrowDown className="w-3 h-3 text-orange-500" />;
    };

    return (
        <div className="bg-card rounded-lg overflow-hidden h-full border border-border">
            {/* Search */}
            <div className="px-3 py-2 border-b border-border bg-muted/50">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc chức vụ…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-400 w-full bg-background"
                    />
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-1 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground bg-muted border-b border-border uppercase tracking-wide">
                <span className="col-span-1 text-center">#</span>
                <button className="col-span-4 flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("name")}>
                    Họ và tên {renderSortIcon("name")}
                </button>
                <button className="col-span-4 flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("role")}>
                    Chức vụ {renderSortIcon("role")}
                </button>
                <button className="col-span-3 flex items-center gap-1 justify-end hover:text-foreground" onClick={() => toggleSort("percentage")}>
                    Tỷ lệ (%) {renderSortIcon("percentage")}
                </button>
            </div>

            {/* Body */}
            <div className="divide-y divide-border/30">
                {pageData.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">Không tìm thấy kết quả</div>
                ) : (
                    pageData.map((holder, index) => (
                        <div
                            key={index}
                            className={`grid grid-cols-12 gap-1 px-4 py-2.5 text-xs hover:bg-orange-50/50 transition-colors ${index % 2 === 0 ? "bg-card" : "bg-muted/20"}`}
                        >
                            <span className="col-span-1 text-center text-muted-foreground font-mono">
                                {(page - 1) * PAGE_SIZE + index + 1}
                            </span>
                            <span className="col-span-4 text-foreground font-medium truncate">{holder.name}</span>
                            <span className="col-span-4 text-muted-foreground truncate">{holder.role}</span>
                            <span className="col-span-3 text-right text-foreground font-semibold font-[var(--font-roboto-mono)]">
                                {`${holder.percentage}%`}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
                    <span className="text-[10px] text-muted-foreground">
                        Trang {page}/{totalPages}
                    </span>
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                            .map((p, idx, arr) => (
                                <React.Fragment key={p}>
                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                        <span className="text-[9px] text-muted-foreground/50 px-0.5">…</span>
                                    )}
                                    <button
                                        onClick={() => setPage(p)}
                                        className={`min-w-[22px] h-5.5 rounded text-[10px] font-medium transition-colors ${
                                            p === page
                                                ? "bg-orange-500 text-white"
                                                : "text-muted-foreground hover:bg-muted"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShareholderList;
