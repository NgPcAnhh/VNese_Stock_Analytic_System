"use client";

import React, { useState, useMemo, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { MarketIndex } from "@/lib/indicesData";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

type SortKey = keyof MarketIndex | "";
type SortDir = "asc" | "desc";
type ChartRange = "1m" | "3m" | "6m" | "1y" | "all";

const RANGE_DAYS: Record<Exclude<ChartRange, "all">, number> = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
};

const colorClass = (v: number) =>
    v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-muted-foreground";

const colorBg = (v: number) =>
    v > 0
        ? "bg-green-50 text-green-700"
        : v < 0
            ? "bg-red-50 text-red-700"
            : "bg-muted text-muted-foreground";

const fmt = (v: number) => {
    const s = v > 0 ? "+" : "";
    return `${s}${v.toFixed(2)}%`;
};

function filterHistoryByRange(
    history: { date: string; close: number }[],
    range: ChartRange
): { date: string; close: number }[] {
    if (!history.length || range === "all") return history;

    const days = RANGE_DAYS[range];
    const endDate = new Date(history[history.length - 1].date);
    if (Number.isNaN(endDate.getTime())) return history.slice(-days);

    const cutoff = new Date(endDate);
    cutoff.setDate(cutoff.getDate() - days + 1);

    const filtered = history.filter((point) => {
        const d = new Date(point.date);
        return !Number.isNaN(d.getTime()) && d >= cutoff;
    });

    return filtered.length ? filtered : history.slice(-days);
}

function normalizeHistory(row: MarketIndex): { date: string; close: number }[] {
    if (row.history && row.history.length) {
        return row.history
            .filter((point) => typeof point.close === "number")
            .map((point) => ({ date: point.date, close: point.close }));
    }

    const now = new Date();
    return row.sparkline.map((close, idx) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (row.sparkline.length - 1 - idx));
        return { date: d.toISOString().slice(0, 10), close };
    });
}

function SparklineChart({ data, positive }: { data: number[]; positive: boolean }) {
    const option = useMemo(
        () => {
            if (!data || data.length === 0) return {};
            const minVal = Math.min(...data);
            const maxVal = Math.max(...data);
            return {
                grid: { top: 2, bottom: 2, left: 2, right: 2 },
                xAxis: { type: "category" as const, show: false, data: data.map((_, i) => i) },
                yAxis: { type: "value" as const, show: false, min: minVal * 0.999, max: maxVal * 1.001 },
                series: [
                    {
                        type: "line",
                        data,
                        smooth: true,
                        symbol: "none",
                        lineStyle: { width: 1.5, color: positive ? "#16a34a" : "#dc2626" },
                        areaStyle: {
                            color: {
                                type: "linear",
                                x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [
                                    { offset: 0, color: positive ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)" },
                                    { offset: 1, color: "rgba(255,255,255,0)" },
                                ],
                            },
                        },
                    },
                ],
                tooltip: { show: false },
            };
        },
        [data, positive]
    );

    if (!data || data.length === 0) return <span className="text-muted-foreground text-xs">N/A</span>;
    return <ReactECharts option={option} style={{ height: 36, width: 120 }} opts={{ renderer: "svg" }} />;
}

interface MarketIndicesTableProps {
    title: string;
    data: MarketIndex[];
    description?: string;
}

function ExpandedIndexChart({ row }: { row: MarketIndex }) {
    const [range, setRange] = useState<ChartRange>("1m");

    const baseHistory = useMemo(() => normalizeHistory(row), [row]);
    const dataSpanDays = useMemo(() => {
        if (baseHistory.length < 2) return 0;
        const first = new Date(baseHistory[0].date);
        const last = new Date(baseHistory[baseHistory.length - 1].date);
        if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return baseHistory.length;
        const diff = Math.max(0, last.getTime() - first.getTime());
        return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    }, [baseHistory]);

    const availableRanges = useMemo(() => {
        return {
            "1m": dataSpanDays >= RANGE_DAYS["1m"],
            "3m": dataSpanDays >= RANGE_DAYS["3m"],
            "6m": dataSpanDays >= RANGE_DAYS["6m"],
            "1y": dataSpanDays >= RANGE_DAYS["1y"],
            all: true,
        } as Record<ChartRange, boolean>;
    }, [dataSpanDays]);

    useEffect(() => {
        if (range !== "all" && !availableRanges[range]) {
            if (availableRanges["3m"]) setRange("3m");
            else if (availableRanges["1m"]) setRange("1m");
            else setRange("all");
        }
    }, [availableRanges, range]);

    const displayHistory = useMemo(
        () => filterHistoryByRange(baseHistory, range),
        [baseHistory, range]
    );

    const displaySpan = useMemo(() => {
        if (!displayHistory.length) return "";
        const start = displayHistory[0].date;
        const end = displayHistory[displayHistory.length - 1].date;
        return `${start} -> ${end}`;
    }, [displayHistory]);

    const chartOption = useMemo(() => {
        if (!displayHistory.length) return {};

        const values = displayHistory.map((item) => item.close);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const first = values[0];
        const last = values[values.length - 1];
        const positive = last >= first;
        const color = positive ? "#16a34a" : "#dc2626";
        const areaTop = positive ? "rgba(22,163,74,0.22)" : "rgba(220,38,38,0.22)";

        return {
            grid: { top: 28, left: 56, right: 26, bottom: 48 },
            tooltip: {
                trigger: "axis" as const,
                valueFormatter: (value: number) =>
                    Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }),
            },
            xAxis: {
                type: "category" as const,
                data: displayHistory.map((item) => item.date),
                boundaryGap: false,
                axisLabel: {
                    color: "#64748b",
                    formatter: (val: string) => val.slice(5),
                },
            },
            yAxis: {
                type: "value" as const,
                min: minVal * 0.995,
                max: maxVal * 1.005,
                axisLabel: {
                    color: "#64748b",
                    formatter: (val: number) =>
                        val.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }),
                },
                splitLine: { lineStyle: { color: "rgba(148,163,184,0.2)" } },
            },
            series: [
                {
                    type: "line",
                    smooth: true,
                    showSymbol: false,
                    data: values,
                    lineStyle: { width: 2, color },
                    areaStyle: {
                        color: {
                            type: "linear",
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: areaTop },
                                { offset: 1, color: "rgba(255,255,255,0)" },
                            ],
                        },
                    },
                },
            ],
        };
    }, [displayHistory]);

    return (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-foreground">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                        {displayHistory.length} điểm dữ liệu | {displaySpan}
                    </div>
                </div>
                <div className="inline-flex rounded-lg border border-border bg-background p-1">
                    {(["1m", "3m", "6m", "1y", "all"] as ChartRange[]).map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                if (availableRanges[item]) setRange(item);
                            }}
                            disabled={!availableRanges[item]}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                range === item
                                    ? "bg-orange-500 text-white"
                                    : availableRanges[item]
                                        ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        : "text-muted-foreground/50 cursor-not-allowed"
                            }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            <ReactECharts option={chartOption} style={{ height: 320, width: "100%" }} opts={{ renderer: "svg" }} />
        </div>
    );
}

export default function MarketIndicesTable({ title, data, description }: MarketIndicesTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const sorted = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const av = a[sortKey as keyof MarketIndex];
            const bv = b[sortKey as keyof MarketIndex];
            if (typeof av === "number" && typeof bv === "number") {
                return sortDir === "asc" ? av - bv : bv - av;
            }
            return sortDir === "asc"
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
    }, [data, sortKey, sortDir]);

    const SortableHead = ({
        label,
        colKey,
        className = "",
    }: {
        label: string;
        colKey: SortKey;
        className?: string;
    }) => (
        <TableHead
            className={`text-right cursor-pointer select-none hover:bg-muted/50 transition-colors whitespace-nowrap px-4 ${className}`}
            onClick={() => handleSort(colKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <ArrowUpDown
                    className={`h-3 w-3 ${sortKey === colKey ? "text-orange-500" : "text-muted-foreground"}`}
                />
            </span>
        </TableHead>
    );

    return (
        <Card className="shadow-sm border-border overflow-hidden">
            <div className="px-5 py-4 border-b bg-card">
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                )}
            </div>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead
                                    className="sticky left-0 bg-muted/50 z-10 min-w-[160px] cursor-pointer select-none hover:bg-muted/50 transition-colors px-4"
                                    onClick={() => handleSort("name")}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Tên chỉ số
                                        <ArrowUpDown
                                            className={`h-3 w-3 ${sortKey === "name" ? "text-orange-500" : "text-muted-foreground"}`}
                                        />
                                    </span>
                                </TableHead>
                                <TableHead className="text-center whitespace-nowrap px-4 min-w-[140px]">
                                    Biểu đồ giá 30D
                                </TableHead>
                                <SortableHead label="Giá trị" colKey="value" />
                                <SortableHead label="Thay đổi" colKey="change" />
                                <SortableHead label="% thay đổi" colKey="changePercent" />
                                <SortableHead label="7 ngày" colKey="week1" />
                                <SortableHead label="Từ đầu năm" colKey="ytd" />
                                <SortableHead label="1 năm" colKey="year1" />
                                <SortableHead label="3 năm" colKey="year3" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.map((row) => {
                                const isExpanded = expandedRow === row.name;

                                return (
                                    <React.Fragment key={row.name}>
                                        <TableRow
                                            className={`hover:bg-orange-50/40 transition-colors h-[68px] cursor-pointer ${
                                                isExpanded ? "bg-orange-50/40" : ""
                                            }`}
                                            onClick={() => setExpandedRow((prev) => (prev === row.name ? null : row.name))}
                                        >
                                            <TableCell className="sticky left-0 bg-card z-10 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <ChevronDown
                                                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                                                            isExpanded ? "rotate-180" : ""
                                                        }`}
                                                    />
                                                    <span className="text-xl leading-none">{row.flag}</span>
                                                    <span className="font-bold text-foreground text-sm">
                                                        {row.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <div className="flex justify-center">
                                                    <SparklineChart
                                                        data={row.sparkline}
                                                        positive={row.change >= 0}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-foreground px-4 tabular-nums">
                                                {row.value.toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right px-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 font-semibold text-sm ${colorClass(row.change)}`}
                                                >
                                                    {row.change > 0 ? (
                                                        <TrendingUp className="h-3.5 w-3.5" />
                                                    ) : row.change < 0 ? (
                                                        <TrendingDown className="h-3.5 w-3.5" />
                                                    ) : null}
                                                    {row.change > 0 ? "+" : ""}
                                                    {row.change.toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right px-4">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorBg(row.changePercent)}`}
                                                >
                                                    {fmt(row.changePercent)}
                                                </span>
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium px-4 ${colorClass(row.week1)}`}
                                            >
                                                {fmt(row.week1)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium px-4 ${colorClass(row.ytd)}`}
                                            >
                                                {fmt(row.ytd)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium px-4 ${colorClass(row.year1)}`}
                                            >
                                                {fmt(row.year1)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium px-4 ${colorClass(row.year3)}`}
                                            >
                                                {fmt(row.year3)}
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded && (
                                            <TableRow className="bg-card">
                                                <TableCell colSpan={9} className="px-4 pb-4 pt-1">
                                                    <ExpandedIndexChart row={row} />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
