"use client";

import React from "react";
import StockScreener from "@/components/stocks/StockScreener";

export default function StocksPage() {
    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-[1600px] mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Bảng phân tích cổ phiếu <span className="text-orange-500">StockPro</span>
                    </h1>
                </div>

                {/* Stock Screener */}
                <StockScreener />
            </div>
        </div>
    );
}
