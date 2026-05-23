"use client";

import React from "react";
import Link from "next/link";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Globe, Calendar, Users, FileText, Star, Share2, MessageCircle } from "lucide-react";

const StockIdentityCard = () => {
    const { stockInfo: stock, onTabChange } = useStockDetail();

    return (
        <div className="flex gap-4">
            {/* Left Section - Stock Info */}
            <div className="flex-1 flex flex-col gap-2">
                {/* Row 1: Logo, Ticker, Exchange, Star, Share */}
                <div className="flex items-center gap-3">
                    {/* Logo */}
                    <div className="w-10 h-10 rounded-full overflow-hidden shadow-md bg-muted flex-shrink-0 flex items-center justify-center">
                        <img
                            src={stock.logoUrl}
                            alt={stock.ticker}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = 'none';
                                el.parentElement!.innerHTML = `<span class="text-xs font-bold text-muted-foreground">${stock.ticker}</span>`;
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-extrabold text-foreground">{stock.ticker}</h1>
                        <span className="text-muted-foreground text-sm">({stock.exchange})</span>
                        <button className="text-amber-500 hover:text-amber-600">
                            <Star className="w-5 h-5" fill="currentColor" />
                        </button>
                        <button className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 ml-2">
                            <Share2 className="w-4 h-4" />
                            Chia sẻ
                        </button>
                    </div>
                </div>

                {/* Row 2: Company Full Name (organ_name) */}
                <h2 className="text-base font-semibold text-foreground">{stock.companyNameFull || stock.companyName}</h2>

                {/* Row 3: Tags - Exchange + ICB Name 2 + ICB Name 3 */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {stock.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="px-2 py-0.5 bg-orange-50 text-orange-600 font-medium rounded border border-orange-100/50"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Row 4: Company Overview (from DB) with "Xem thêm" → profile tab */}
                <div className="text-xs text-muted-foreground leading-relaxed">
                    <p className="line-clamp-5">
                        {stock.overview || stock.companyNameFull}
                    </p>
                    <button
                        className="text-orange-600 hover:text-orange-700 font-medium hover:underline mt-0.5 inline-block transition-colors"
                        onClick={() => onTabChange?.("profile")}
                    >
                        Xem thêm
                    </button>
                </div>

                {/* Row 5: Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-1">
                    <ActionButton icon={<Globe className="w-3 h-3" />} label="Website công ty" />
                    <ActionButton icon={<Calendar className="w-3 h-3" />} label="Lịch sử trả cổ tức" />
                    <ActionButton icon={<Users className="w-3 h-3" />} label={`Có trong 142,505 watchlists`} />
                    <ActionButton icon={<FileText className="w-3 h-3" />} label="Xem ghi chú" />
                </div>
            </div>

            {/* Right Section - AI Box */}
            <div className="w-64 flex-shrink-0">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/30 border border-orange-200 rounded-lg p-3 shadow-sm shadow-orange-500/5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-2">
                        <MessageCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-orange-800">
                                Bạn cần phân tích kỹ thuật?
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                                Sử dụng Biểu đồ kỹ thuật của Simplize để được cập nhật dữ liệu từng ngày thông qua AI!
                            </p>
                            <Link
                                href={`/analysis/${stock.ticker}`}
                                className="text-xs text-orange-600 font-semibold mt-2 hover:text-orange-700 hover:underline inline-flex items-center gap-1 transition-colors group"
                            >
                                Xem Biểu đồ kỹ thuật của {stock.ticker} →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ActionButton = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <button className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 text-muted-foreground text-xs rounded transition-colors">
        {icon}
        {label}
    </button>
);

export default StockIdentityCard;
