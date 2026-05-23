"use client";

import React, { useCallback, useState } from "react";
import LatestNewsSlider from "@/components/news/LatestNewsSlider";
import NewsList from "@/components/news/NewsList";
import MostClickedNews from "@/components/news/MostClickedNews";
import HotSearch from "@/components/news/HotSearch";
import SentimentGauges from "@/components/news/SentimentGauges";
import SectorPerformanceWidget from "@/components/news/SectorPerformanceWidget";

export default function NewsPage() {
    const [hotKeyword, setHotKeyword] = useState("");

    const handleHotKeywordClick = useCallback((keyword: string) => {
        setHotKeyword(keyword);
        const el = document.getElementById("news-list-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-[1400px] mx-auto px-6 py-8">
                {/* Page header */}
                <div className="mb-10">
                    <h1 className="text-2xl font-bold text-foreground">
                        Tin tức & Sự kiện
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Cập nhật tin tức tài chính, chứng khoán mới nhất
                    </p>
                </div>

                {/* ── Section 1: Latest News Hero Slider ───────────── */}
                <section className="mb-10">
                    <h2 className="text-lg font-bold text-foreground border-l-4 border-orange-500 pl-3 mb-4">
                        Bài viết mới nhất
                    </h2>
                    <LatestNewsSlider />
                </section>

                {/* ── Section 2: Main content grid ─────────────────── */}
                <div id="news-list-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left — Article list with search & pagination */}
                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-bold text-foreground border-l-4 border-orange-500 pl-3 mb-4">
                            Tất cả bài viết
                        </h2>
                        <NewsList key={hotKeyword} />
                    </div>

                    {/* Right — Sidebar */}
                    <div className="space-y-6">
                        <HotSearch onKeywordClick={handleHotKeywordClick} />
                        <MostClickedNews />
                        <SentimentGauges />
                        <SectorPerformanceWidget />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-white mt-12 border-t-4 border-orange-500">
                <div className="max-w-[1400px] mx-auto p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-orange-400">StockPro</h3>
                        <p className="text-sm text-gray-400">
                            Nền tảng phân tích tài chính hàng đầu Việt Nam.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-bold text-md mb-4">Sản phẩm</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>Dữ liệu thị trường</li>
                            <li>Phân tích kỹ thuật</li>
                            <li>Tin tức</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-md mb-4">Hỗ trợ</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>Trung tâm trợ giúp</li>
                            <li>Điều khoản sử dụng</li>
                            <li>Chính sách bảo mật</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-md mb-4">Liên hệ</h3>
                        <p className="text-sm text-gray-400">
                            Email: support@stockpro.com<br />
                            Hotline: 1900 1234
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
