"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useStockDetail } from "@/lib/StockDetailContext";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { RecommendedStock } from "@/hooks/useStockData";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

/* ── Sparkline chart (6 months) ── */
function SparklineChart({ data, positive }: { data: number[]; positive: boolean }) {
    const option = useMemo(() => {
        const color = positive ? "#fb923c" : "#f87171";
        const gradientTop = positive ? "rgba(251,146,60,0.35)" : "rgba(248,113,113,0.28)";
        const gradientBottom = positive ? "rgba(251,146,60,0.03)" : "rgba(248,113,113,0.03)";
        return {
            grid: { top: 6, right: 0, bottom: 2, left: 0 },
            xAxis: { type: "category" as const, show: false, data: data.map((_, i) => i) },
            yAxis: { type: "value" as const, show: false, min: "dataMin", max: "dataMax" },
            tooltip: {
                trigger: "axis" as const,
                formatter: (params: unknown) => {
                    const axisParams = params as Array<{ value?: number }>;
                    const v = axisParams?.[0]?.value;
                    return v != null
                        ? `<span style="font-weight:600">${Number(v).toLocaleString("vi-VN")}</span>`
                        : "";
                },
                backgroundColor: "#111827",
                borderColor: "#334155",
                borderWidth: 1,
                textStyle: { fontSize: 11, color: "#f8fafc" },
                padding: [4, 8],
            },
            series: [
                {
                    type: "line" as const,
                    data,
                    smooth: true,
                    symbol: "none",
                    lineStyle: { width: 1.5, color },
                    areaStyle: {
                        color: {
                            type: "linear" as const,
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: gradientTop },
                                { offset: 1, color: gradientBottom },
                            ],
                        },
                    },
                },
            ],
        };
    }, [data, positive]);

    if (!data.length) {
        return (
            <div className="h-[80px] flex items-center justify-center text-xs text-muted-foreground/50">
                Chưa có dữ liệu
            </div>
        );
    }

    return <ReactECharts option={option} style={{ height: 80, width: "100%" }} opts={{ renderer: "svg" }} />;
}

/* ── Single recommendation card: chart on top, info below ── */
function RecommendationCard({ stock }: { stock: RecommendedStock }) {
    const positive = stock.priceChange >= 0;
    return (
        <Link href={`/stock/${stock.ticker}`} className="block">
            <div className="group rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 overflow-hidden shadow-[0_8px_24px_rgba(2,6,23,0.4)] hover:shadow-[0_14px_36px_rgba(2,6,23,0.55)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full">
                {/* Info: ticker name + price + change */}
                <div className="px-4 pt-4">
                    {/* Ticker row */}
                    <div className="flex items-center gap-2.5 mb-2">
                        <img
                            src={stock.logoUrl}
                            alt={stock.ticker}
                            className="w-7 h-7 rounded-full border border-slate-500 object-cover bg-slate-700"
                            onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.display = "none";
                                const fb = el.nextElementSibling as HTMLElement;
                                if (fb) fb.style.display = "flex";
                            }}
                        />
                        <div
                            className="w-7 h-7 rounded-full bg-orange-500 text-white items-center justify-center text-[10px] font-bold hidden"
                        >
                            {stock.ticker.charAt(0)}
                        </div>
                        <span className="font-bold text-sm text-slate-100 group-hover:text-orange-300 transition-colors">
                            {stock.ticker}
                        </span>
                    </div>

                    {/* Price */}
                    <div className={`text-lg font-extrabold tabular-nums tracking-tight ${positive ? "text-orange-300" : "text-rose-300"}`}>
                        {stock.price.toLocaleString("vi-VN")}
                    </div>

                    {/* Change (below price) */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                        {positive ? (
                            <TrendingUp className="w-3.5 h-3.5 text-orange-300" />
                        ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
                        )}
                        <span className={`text-xs font-semibold tabular-nums ${positive ? "text-orange-300" : "text-rose-300"}`}>
                            {positive ? "+" : ""}{stock.priceChange.toLocaleString("vi-VN")}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            positive ? "bg-orange-500/15 text-orange-200 border border-orange-400/35" : "bg-rose-500/15 text-rose-200 border border-rose-400/35"
                        }`}>
                            {positive ? "+" : ""}{stock.priceChangePercent.toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* Spacer */}
                <div className="h-4" />

                {/* Chart area */}
                <div className="px-3 pb-3 bg-gradient-to-b from-slate-900/60 to-slate-950 border-t border-slate-700/70">
                    <SparklineChart data={stock.chartData} positive={positive} />
                </div>
            </div>
        </Link>
    );
}

/* ── Main section: 4 columns, no slider ── */
const RecommendationsSection = () => {
    const { recommendations } = useStockDetail();

    if (!recommendations.length) {
        return (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-8 text-center text-sm text-slate-300">
                Không có gợi ý.
            </div>
        );
    }

    const items = recommendations.slice(0, 4);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-[#111827] to-slate-950 p-4 sm:p-5 shadow-[0_18px_50px_rgba(2,6,23,0.35)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
            <div className="pointer-events-none absolute -top-24 -right-12 h-56 w-56 rounded-full bg-orange-500/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-slate-200/10 blur-3xl" />

            <div className="relative mb-4 sm:mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-orange-300/90 font-semibold">Watchlist gợi ý</p>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-100 mt-1 leading-relaxed">Có thể bạn sẽ quan tâm</h3>
                    <p className="text-xs text-slate-400 mt-1">Các mã thanh khoản cao, biến động rõ và được theo dõi nhiều trong phiên.</p>
                </div>
                <div className="text-[11px] text-slate-400 border border-slate-600/70 rounded-full px-3 py-1 w-fit">
                    Dữ liệu tham khảo thị trường
                </div>
            </div>

            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((stock: RecommendedStock) => (
                    <RecommendationCard key={stock.ticker} stock={stock} />
                ))}
            </div>
        </div>
    );
};

export default RecommendationsSection;
