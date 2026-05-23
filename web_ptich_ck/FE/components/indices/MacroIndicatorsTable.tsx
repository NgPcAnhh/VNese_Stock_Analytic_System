"use client";

import React, { useState, useMemo } from "react";
import { MacroIndicator } from "@/lib/indicesData";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowUpDown,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";

type SortKey = keyof MacroIndicator | "";
type SortDir = "asc" | "desc";

const trendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
};

const changeBg = (v: number) =>
    v > 0
        ? "bg-green-50 text-green-700"
        : v < 0
            ? "bg-red-50 text-red-700"
            : "bg-muted text-muted-foreground";

interface MacroIndicatorsTableProps {
    data: MacroIndicator[];
}

export default function MacroIndicatorsTable({ data }: MacroIndicatorsTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(["Lãi suất & Tiền tệ", "Kinh tế vĩ mô", "Thương mại & Đầu tư", "Thị trường tài chính"])
    );

    const categories = useMemo(() => {
        const map = new Map<string, MacroIndicator[]>();
        data.forEach((item) => {
            if (!map.has(item.category)) map.set(item.category, []);
            map.get(item.category)!.push(item);
        });
        return map;
    }, [data]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const sortItems = (items: MacroIndicator[]) => {
        if (!sortKey) return items;
        return [...items].sort((a, b) => {
            const av = a[sortKey as keyof MacroIndicator];
            const bv = b[sortKey as keyof MacroIndicator];
            if (typeof av === "number" && typeof bv === "number") {
                return sortDir === "asc" ? av - bv : bv - av;
            }
            return sortDir === "asc"
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

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

    const categoryIcons: Record<string, string> = {
        "Lãi suất & Tiền tệ": "💰",
        "Kinh tế vĩ mô": "📊",
        "Thương mại & Đầu tư": "🌍",
        "Thị trường tài chính": "🏦",
    };

    return (
        <Card className="shadow-sm border-border overflow-hidden">
            <div className="px-5 py-4 border-b bg-card">
                <h3 className="text-lg font-bold text-foreground">Chỉ số vĩ mô Việt Nam</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Tổng hợp các chỉ số kinh tế vĩ mô quan trọng
                </p>
            </div>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead
                                    className="sticky left-0 bg-muted/50 z-10 min-w-[220px] cursor-pointer select-none hover:bg-muted/50 transition-colors px-4"
                                    onClick={() => handleSort("name")}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Chỉ số
                                        <ArrowUpDown
                                            className={`h-3 w-3 ${sortKey === "name" ? "text-orange-500" : "text-muted-foreground"}`}
                                        />
                                    </span>
                                </TableHead>
                                <SortableHead label="Giá trị" colKey="value" />
                                <TableHead className="text-center whitespace-nowrap px-4">Đơn vị</TableHead>
                                <SortableHead label="Thay đổi" colKey="change" />
                                <SortableHead label="% Thay đổi" colKey="changePercent" />
                                <TableHead className="text-center whitespace-nowrap px-4">Xu hướng</TableHead>
                                <SortableHead label="Kỳ trước" colKey="previousValue" />
                                <TableHead className="text-center whitespace-nowrap px-4">Thời kỳ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from(categories.entries()).map(([category, items]) => {
                                const isExpanded = expandedCategories.has(category);
                                return (
                                    <React.Fragment key={category}>
                                        {/* Category header row */}
                                        <TableRow
                                            className="bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors"
                                            onClick={() => toggleCategory(category)}
                                        >
                                            <TableCell
                                                colSpan={8}
                                                className="sticky left-0 z-10 bg-muted/40 px-4 py-2.5"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">
                                                        {categoryIcons[category] || "📈"}
                                                    </span>
                                                    <span className="font-bold text-foreground text-sm">
                                                        {category}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-normal">
                                                        ({items.length} chỉ số)
                                                    </span>
                                                    <span
                                                        className={`ml-auto text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                    >
                                                        ▼
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {/* Data rows */}
                                        {isExpanded &&
                                            sortItems(items).map((row) => (
                                                <TableRow
                                                    key={row.name}
                                                    className="hover:bg-orange-50/40 transition-colors"
                                                >
                                                    <TableCell className="sticky left-0 bg-card z-10 px-4 pl-8">
                                                        <span className="font-medium text-foreground text-sm">
                                                            {row.name}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-foreground px-4 tabular-nums">
                                                        {row.value}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground text-xs px-4">
                                                        {row.unit}
                                                    </TableCell>
                                                    <TableCell className="text-right px-4">
                                                        <span
                                                            className={`font-semibold text-sm ${row.change > 0
                                                                ? "text-green-600"
                                                                : row.change < 0
                                                                    ? "text-red-600"
                                                                    : "text-gray-500"
                                                                }`}
                                                        >
                                                            {row.change > 0 ? "+" : ""}
                                                            {row.change}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right px-4">
                                                        <span
                                                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${changeBg(row.changePercent)}`}
                                                        >
                                                            {row.changePercent > 0 ? "+" : ""}
                                                            {row.changePercent.toFixed(2)}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center px-4">
                                                        {trendIcon(row.trend)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground px-4 tabular-nums">
                                                        {row.previousValue}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground text-xs px-4 whitespace-nowrap">
                                                        {row.period}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
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
