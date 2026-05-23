"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";

const PriceBoard = () => {
    const { stockInfo: stock } = useStockDetail();
    const isPositive = stock.priceChange >= 0;

    // Format price with thousand separator
    const formatPrice = (price: number) => {
        return price.toLocaleString("vi-VN");
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            {/* Main Price Row */}
            <div className="flex items-center gap-3">
                {/* Large Price */}
                <span
                    className={`text-4xl font-extrabold font-[var(--font-roboto-mono)] tracking-tight ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                        }`}
                >
                    {formatPrice(stock.currentPrice)}
                </span>

                {/* Change Value */}
                <span
                    className={`text-lg font-bold font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                        }`}
                >
                    {isPositive ? "+" : ""}
                    {formatPrice(stock.priceChange)}
                </span>

                {/* Change Percent Pill */}
                <span
                    className={`px-2 py-0.5 rounded text-sm font-bold font-[var(--font-roboto-mono)] text-white ${isPositive ? "bg-[#00C076]" : "bg-[#EF4444]"
                        }`}
                >
                    {isPositive ? "+" : ""}
                    {stock.priceChangePercent.toFixed(2)}%
                </span>
            </div>

            {/* Price Range Grid: Ceiling - Floor - Reference */}
            <div className="grid grid-cols-5 gap-4 text-center mt-2">
                <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Trần</div>
                    <div className="text-sm font-semibold text-purple-600 font-[var(--font-roboto-mono)]">
                        {formatPrice(stock.ceilingPrice)}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Giá thấp nhất</div>
                    <div className="text-sm font-semibold text-muted-foreground font-[var(--font-roboto-mono)]">
                        {formatPrice(stock.dayLow)}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Tham chiếu</div>
                    <div className="text-sm font-semibold text-[#F59E0B] font-[var(--font-roboto-mono)]">
                        {formatPrice(stock.referencePrice)}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Giá cao nhất</div>
                    <div className="text-sm font-semibold text-muted-foreground font-[var(--font-roboto-mono)]">
                        {formatPrice(stock.dayHigh)}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Sàn</div>
                    <div className="text-sm font-semibold text-cyan-600 font-[var(--font-roboto-mono)]">
                        {formatPrice(stock.floorPrice)}
                    </div>
                </div>
            </div>

            {/* Mini Price Range Slider */}
            <div className="w-full max-w-xs mt-2">
                <MiniPriceSlider
                    low={stock.floorPrice}
                    high={stock.ceilingPrice}
                    current={stock.currentPrice}
                    reference={stock.referencePrice}
                />
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                24h
            </div>
        </div>
    );
};

const MiniPriceSlider = ({
    low,
    high,
    current,
    reference
}: {
    low: number;
    high: number;
    current: number;
    reference: number;
}) => {
    const range = high - low;
    const currentPos = ((current - low) / range) * 100;
    const refPos = ((reference - low) / range) * 100;
    const isUp = current >= reference;

    return (
        <div className="relative h-2">
            {/* Background track */}
            <div className="absolute inset-0 bg-muted rounded-full" />

            {/* Colored fill from reference to current */}
            <div
                className={`absolute h-full rounded-full ${isUp ? "bg-[#00C076]" : "bg-[#EF4444]"}`}
                style={{
                    left: isUp ? `${refPos}%` : `${currentPos}%`,
                    width: `${Math.abs(currentPos - refPos)}%`,
                }}
            />

            {/* Current price marker */}
            <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-foreground rounded-full shadow-sm"
                style={{ left: `${currentPos}%`, marginLeft: '-6px' }}
            />
        </div>
    );
};

export default PriceBoard;
