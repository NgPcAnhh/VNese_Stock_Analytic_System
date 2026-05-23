"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

const toFileStamp = (date = new Date()) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const normalizeMetaStockDate = (dateText: string): string => {
    const trimmed = dateText.trim();
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return toFileStamp(new Date()).slice(0, 8);
    }

    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${parsed.getFullYear()}${pad(parsed.getMonth() + 1)}${pad(parsed.getDate())}`;
};

const triggerDownload = (content: BlobPart, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const HistoricalDataTable = () => {
    const { ticker, historicalData: HISTORICAL_DATA } = useStockDetail();

    const exportExcel = () => {
        if (HISTORICAL_DATA.length === 0) return;

        const rows = HISTORICAL_DATA.map((row) => ({
            Ngay: row.date,
            GiaMoCua: row.open,
            GiaCaoNhat: row.high,
            GiaThapNhat: row.low,
            GiaDongCua: row.close,
            ThayDoiGia: row.change,
            PhanTramThayDoi: row.changePercent,
            KhoiLuong: row.volume,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "HistoricalData");

        const stamp = toFileStamp();
        XLSX.writeFile(wb, `${ticker || "stock"}_historical_data_${stamp}.xlsx`);
    };

    const exportMetaStock = () => {
        if (HISTORICAL_DATA.length === 0) return;

        const lines = HISTORICAL_DATA.map((row) => {
            const date = normalizeMetaStockDate(row.date);
            return [
                ticker,
                date,
                row.open,
                row.high,
                row.low,
                row.close,
                row.volume,
            ].join(",");
        });

        const content = `${lines.join("\n")}\n`;
        const stamp = toFileStamp();
        triggerDownload(content, `${ticker || "stock"}_metastock_${stamp}.txt`, "text/plain;charset=utf-8");
    };

    return (
        <Card className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg font-bold text-foreground">
                        Dữ liệu lịch sử
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportMetaStock}
                            disabled={HISTORICAL_DATA.length === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-600 text-green-600 text-xs font-medium rounded-md hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Xuất file Metastock
                        </button>
                        <button
                            onClick={exportExcel}
                            disabled={HISTORICAL_DATA.length === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-600 text-green-600 text-xs font-medium rounded-md hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Xuất file Excel
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                {/* Table */}
                <div className="overflow-x-auto overflow-y-auto max-h-[320px]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-background">
                            <tr className="bg-background border-y border-border shadow-sm">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Giá mở cửa</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Giá cao nhất</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Giá thấp nhất</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Giá đóng cửa</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Thay đổi giá</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">% thay đổi</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Khối lượng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {HISTORICAL_DATA.map((row, index) => {
                                const isPositive = row.change >= 0;
                                return (
                                    <tr
                                        key={index}
                                        className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? "bg-card" : "bg-muted/30"
                                            }`}
                                    >
                                        <td className="px-4 py-3 text-muted-foreground font-medium">{row.date}</td>
                                        <td className="px-4 py-3 text-right text-foreground font-[var(--font-roboto-mono)]">
                                            {row.open.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-foreground font-[var(--font-roboto-mono)]">
                                            {row.high.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-foreground font-[var(--font-roboto-mono)]">
                                            {row.low.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-foreground font-semibold font-[var(--font-roboto-mono)]">
                                            {row.close.toLocaleString()}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-semibold font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                                                }`}
                                        >
                                            {isPositive ? "+" : ""}
                                            {row.change.toLocaleString()}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-semibold font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                                                }`}
                                        >
                                            {isPositive ? "" : ""}
                                            {row.changePercent.toFixed(2)}%
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground font-[var(--font-roboto-mono)]">
                                            {row.volume.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default HistoricalDataTable;
