"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PeerComparison = () => {
    const { peerStocks: PEER_STOCKS } = useStockDetail();
    return (
        <Card className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-foreground">
                    Công ty cùng ngành
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[320px]">
                {/* Table Header */}
                <div className="grid grid-cols-4 gap-2 px-4 py-2.5 bg-muted text-sm font-medium text-muted-foreground border-y border-border sticky top-0 z-10">
                    <span>Mã</span>
                    <span className="text-center"></span>
                    <span className="text-right">Giá</span>
                    <span className="text-right">KLGD</span>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-border/30">
                    {PEER_STOCKS.map((stock, index) => {
                        const isPositive = stock.priceChange >= 0;

                        // Sparkline option
                        const sparklineOption = {
                            grid: {
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                            },
                            xAxis: {
                                type: "category",
                                show: false,
                                data: stock.sparklineData.map((_, i) => i),
                            },
                            yAxis: {
                                type: "value",
                                show: false,
                                min: Math.min(...stock.sparklineData) * 0.99,
                                max: Math.max(...stock.sparklineData) * 1.01,
                            },
                            series: [
                                {
                                    type: "line",
                                    data: stock.sparklineData,
                                    smooth: true,
                                    symbol: "none",
                                    lineStyle: {
                                        color: isPositive ? "#00C076" : "#EF4444",
                                        width: 1.5,
                                    },
                                    areaStyle: {
                                        color: {
                                            type: "linear",
                                            x: 0,
                                            y: 0,
                                            x2: 0,
                                            y2: 1,
                                            colorStops: [
                                                { offset: 0, color: isPositive ? "rgba(0, 192, 118, 0.3)" : "rgba(239, 68, 68, 0.3)" },
                                                { offset: 1, color: isPositive ? "rgba(0, 192, 118, 0.05)" : "rgba(239, 68, 68, 0.05)" },
                                            ],
                                        },
                                    },
                                },
                            ],
                        };

                        return (
                            <div
                                key={index}
                                className="grid grid-cols-4 gap-2 px-4 py-2.5 items-center hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                                {/* Ticker */}
                                <span className="text-base font-bold text-orange-600 hover:text-orange-700 hover:underline">
                                    {stock.ticker}
                                </span>

                                {/* Sparkline */}
                                <div className="flex items-center justify-center">
                                    <ReactECharts
                                        option={sparklineOption}
                                        style={{ height: "30px", width: "60px" }}
                                        opts={{ renderer: "svg" }}
                                    />
                                </div>

                                {/* Price & Change */}
                                <div className="text-right">
                                    <div
                                        className={`text-base font-bold font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                                            }`}
                                    >
                                        {stock.price.toLocaleString()}
                                    </div>
                                    <div
                                        className={`text-xs font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                                            }`}
                                    >
                                        {isPositive ? "+" : ""}
                                        {stock.priceChange.toFixed(2)} ({isPositive ? "+" : ""}
                                        {(stock.priceChangePercent * 100).toFixed(2)}%)
                                    </div>
                                </div>

                                {/* Volume */}
                                <span className="text-right text-sm text-muted-foreground font-[var(--font-roboto-mono)]">
                                    {stock.volume.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default PeerComparison;
