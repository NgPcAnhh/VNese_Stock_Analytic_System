"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockDetail } from "@/lib/StockDetailContext";
import {
    useCompanyProfile,
    type CompanyProfileData,
    type Shareholder,
} from "@/hooks/useStockData";
import {
    Building2,
    Globe,
    Users,
    CalendarDays,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    Network,
} from "lucide-react";
import OrgChart from "@/components/stock/OrgChart";

// ==================== HELPER COMPONENTS ====================

function SectionHeading({
    icon: Icon,
    title,
    color,
}: {
    icon: React.ElementType;
    title: string;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        blue: "text-blue-600 bg-blue-50 border-blue-200",
        green: "text-green-600 bg-green-50 border-green-200",
        amber: "text-amber-600 bg-amber-50 border-amber-200",
        purple: "text-purple-600 bg-purple-50 border-purple-200",
        red: "text-red-600 bg-red-50 border-red-200",
        cyan: "text-cyan-600 bg-cyan-50 border-cyan-200",
    };
    const cls = colorMap[color] || colorMap.blue;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cls}`}>
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{title}</span>
        </div>
    );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
    return (
        <div className="flex justify-between items-start py-2 border-b border-border/50 last:border-b-0">
            <span className="text-xs text-muted-foreground w-2/5">{label}</span>
            <span className={`text-xs font-medium text-foreground text-right w-3/5 ${mono ? "font-mono" : ""}`}>
                {value}
            </span>
        </div>
    );
}

function Badge({ text, variant }: { text: string; variant: "blue" | "green" | "amber" | "red" | "gray" }) {
    const cls: Record<string, string> = {
        blue: "bg-blue-50 text-blue-700 border-blue-200",
        green: "bg-green-50 text-green-700 border-green-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        red: "bg-red-50 text-red-700 border-red-200",
        gray: "bg-muted text-muted-foreground border-border",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${cls[variant]}`}>
            {text}
        </span>
    );
}

// ====================== SECTIONS ==========================

function CompanyOverviewSection({ data }: { data: CompanyProfileData["overview"] }) {
    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Giới thiệu chung
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.description || "Chưa có thông tin giới thiệu."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3 space-y-0.5">
                        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Thông tin doanh nghiệp
                        </h4>
                        <InfoRow label="Tên đầy đủ" value={data.companyNameFull} />
                        <InfoRow label="Mã số thuế" value={data.taxCode} mono />
                        <InfoRow label="Ngành" value={data.industry} />
                        <InfoRow label="Ngành phụ" value={data.subIndustry} />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 space-y-0.5">
                        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Thông tin niêm yết
                        </h4>
                        <InfoRow label="Sàn giao dịch" value={data.exchange} />
                        <InfoRow label="Vốn điều lệ" value={data.charterCapital != null ? `${(data.charterCapital / 1e9).toFixed(1)} tỷ` : "—"} />
                        <InfoRow label="CP lưu hành" value={data.outstandingShares != null ? data.outstandingShares.toLocaleString("vi-VN") : "—"} />
                        {data.website && (
                            <div className="flex items-center gap-2 py-2">
                                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <a
                                    href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    {data.website}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

type ShareholderSortKey = "name" | "role" | "percentage";
type ShareholderSortDir = "asc" | "desc" | null;
const SHAREHOLDERS_PAGE_SIZE = 10;

function ShareholdersSection({ shareholders }: { shareholders: Shareholder[] }) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<ShareholderSortKey | null>(null);
    const [sortDir, setSortDir] = useState<ShareholderSortDir>(null);
    const [page, setPage] = useState(1);

    const toggleSort = (key: ShareholderSortKey) => {
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
        if (!search.trim()) return shareholders;
        const q = search.toLowerCase();
        return shareholders.filter(
            (s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q),
        );
    }, [shareholders, search]);

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

    const totalPages = Math.max(1, Math.ceil(sorted.length / SHAREHOLDERS_PAGE_SIZE));
    const pageData = sorted.slice((page - 1) * SHAREHOLDERS_PAGE_SIZE, page * SHAREHOLDERS_PAGE_SIZE);

    const SortIcon = ({ col }: { col: ShareholderSortKey }) => {
        if (sortKey !== col || !sortDir) return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
        return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-amber-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />;
    };

    if (!shareholders.length) {
        return (
            <Card className="shadow-sm border-border">
                <CardContent className="py-8 text-center text-xs text-muted-foreground">Chưa có dữ liệu cổ đông</CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-500" />
                        Cổ đông & Lãnh đạo
                        <span className="text-[11px] font-normal text-muted-foreground ml-1">({shareholders.length})</span>
                    </CardTitle>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc chức vụ…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 w-full sm:w-56 bg-muted/50"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0 pb-3">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-1 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground bg-muted/50 border-y border-border uppercase tracking-wide">
                    <button className="col-span-1 text-center">#</button>
                    <button className="col-span-4 flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("name")}>
                        Họ và tên <SortIcon col="name" />
                    </button>
                    <button className="col-span-4 flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("role")}>
                        Chức vụ <SortIcon col="role" />
                    </button>
                    <button className="col-span-3 flex items-center gap-1 justify-end hover:text-foreground" onClick={() => toggleSort("percentage")}>
                        Tỷ lệ (%) <SortIcon col="percentage" />
                    </button>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-border/50">
                    {pageData.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-muted-foreground">Không tìm thấy kết quả</div>
                    ) : (
                        pageData.map((s, idx) => (
                            <div
                                key={idx}
                                className={`grid grid-cols-12 gap-1 px-4 py-2.5 text-xs hover:bg-amber-50/40 transition-colors ${idx % 2 === 0 ? "bg-card" : "bg-muted/20"}`}
                            >
                                <span className="col-span-1 text-center text-muted-foreground font-mono">
                                    {(page - 1) * SHAREHOLDERS_PAGE_SIZE + idx + 1}
                                </span>
                                <span className="col-span-4 text-foreground font-medium truncate">{s.name}</span>
                                <span className="col-span-4 text-muted-foreground truncate">{s.role}</span>
                                <span className="col-span-3 text-right font-semibold text-muted-foreground font-[var(--font-roboto-mono)]">
                                    {`${s.percentage}%`}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 pt-3 border-t border-border mt-1">
                        <span className="text-[11px] text-muted-foreground">
                            Trang {page}/{totalPages} · {sorted.length} kết quả
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .map((p, idx, arr) => (
                                    <React.Fragment key={p}>
                                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                                            <span className="text-[10px] text-border px-0.5">…</span>
                                        )}
                                        <button
                                            onClick={() => setPage(p)}
                                            className={`min-w-[24px] h-6 rounded text-[11px] font-medium transition-colors ${
                                                p === page
                                                    ? "bg-amber-500 text-white"
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
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const EVENTS_PREVIEW_COUNT = 5;

function EventsSection({ events }: { events: CompanyProfileData["events"] }) {
    const [expanded, setExpanded] = useState(false);

    if (!events.length) {
        return (
            <Card className="shadow-sm border-border">
                <CardContent className="py-8 text-center text-xs text-muted-foreground">Chưa có sự kiện</CardContent>
            </Card>
        );
    }

    const hasMore = events.length > EVENTS_PREVIEW_COUNT;
    const visible = expanded ? events : events.slice(0, EVENTS_PREVIEW_COUNT);

    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-red-500" />
                    Sự kiện doanh nghiệp
                    <span className="text-[11px] font-normal text-muted-foreground ml-1">({events.length})</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-3">
                        {visible.map((e, i) => (
                            <div key={i} className="flex gap-3 relative">
                                <div className="w-9 h-9 rounded-full border-2 border-blue-400 bg-blue-50 flex items-center justify-center shrink-0 z-10 text-sm">
                                    📅
                                </div>
                                <div className="flex-1 pb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-foreground">{e.date}</span>
                                        {e.category && <Badge text={e.category} variant="blue" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{e.title}</p>
                                    {e.source && (
                                        <span className="text-[10px] text-muted-foreground">Nguồn: {e.source}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {hasMore && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                    >
                        {expanded ? (
                            <>Thu gọn <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                            <>Xem thêm ({events.length - EVENTS_PREVIEW_COUNT} sự kiện còn lại) <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                    </button>
                )}
            </CardContent>
        </Card>
    );
}

// ==================== MAIN ====================

export default function CompanyProfileTab() {
    const { stockInfo, ticker } = useStockDetail();
    const { data, loading, error } = useCompanyProfile(ticker);

    if (loading && !data) return <div className="text-center py-12 text-muted-foreground animate-pulse">Đang tải hồ sơ doanh nghiệp…</div>;
    if (error && !data) return <div className="text-center py-12 text-red-500">Lỗi: {error}</div>;
    if (!data) return null;

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-foreground">
                    Hồ sơ doanh nghiệp - {stockInfo.ticker}
                </h2>
                <p className="text-xs text-muted-foreground italic mt-0.5">
                    {data.overview.companyName}
                </p>
            </div>

            <SectionHeading icon={Building2} title="Giới thiệu doanh nghiệp" color="blue" />
            <CompanyOverviewSection data={data.overview} />

            <SectionHeading icon={Network} title="Sơ đồ bộ máy tổ chức" color="cyan" />
            <Card className="shadow-sm border-border">
                <CardContent className="p-4 sm:p-6">
                    <OrgChart shareholders={data.shareholders} />
                </CardContent>
            </Card>

            <SectionHeading icon={Users} title="Cổ đông & Lãnh đạo" color="amber" />
            <ShareholdersSection shareholders={data.shareholders} />

            <SectionHeading icon={CalendarDays} title="Sự kiện doanh nghiệp" color="red" />
            <EventsSection events={data.events} />
        </div>
    );
}
