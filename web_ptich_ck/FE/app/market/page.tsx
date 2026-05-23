"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import MarketHeatmap from "@/components/market/MarketHeatmap";
import IndexImpactLiquidity from "@/components/market/IndexImpactLiquidity";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { CashFlow } from "@/components/market/CashFlow";
import { TableProperties } from "lucide-react";

// ── Lazy load below-fold components — chỉ tải khi scroll tới ──
const SectorMarketOverview = dynamic(
    () => import("@/components/market/SectorMarketOverview"),
    { ssr: false }
);
const SectorAnalysisTable = dynamic(
    () => import("@/components/market/SectorAnalysisTable"),
    { ssr: false }
);
const SectorWatchlist = dynamic(
    () => import("@/components/market/SectorWatchlist").then((m) => ({ default: m.SectorWatchlist })),
    { ssr: false }
);

export default function MarketPage() {
    const detailedSectorRef = useRef<HTMLElement>(null);

    const scrollToDetailedSector = () => {
        detailedSectorRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Phân tích thị trường <span className="text-orange-500">StockPro</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={scrollToDetailedSector}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors shadow-sm"
                            title="Xem chi tiết ngành"
                        >
                            <TableProperties className="h-4 w-4" />
                            <span>Chi tiết ngành</span>
                        </button>
                        <div className="text-sm text-muted-foreground">Cập nhật: Vừa xong</div>
                    </div>
                </div>

                {/* ── Tier 1: Bản đồ thị trường (Heatmap) ── */}
                <section>
                    <MarketHeatmap />
                </section>

                {/* ── Tier 2: Tổng quan — Breadth + CashFlow ── */}
                <section>
                    <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-orange-500 rounded-full" />
                        Tổng quan thị trường
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <MarketBreadth />
                        </div>
                        <div className="md:col-span-2 flex flex-col gap-4">
                            <CashFlow />
                            <IndexImpactLiquidity />
                        </div>
                    </div>
                </section>

                {/* ── Tier 3: Phân tích ngành ── */}
                <section>
                    <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-orange-500 rounded-full" />
                        Phân tích ngành
                    </h2>
                    <SectorMarketOverview />
                    <div className="mt-4">
                        <SectorAnalysisTable />
                    </div>
                </section>

                {/* ── Tier 4: Bảng giá chi tiết theo ngành ── */}
                <section ref={detailedSectorRef}>
                    <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-orange-500 rounded-full" />
                        Bảng giá chi tiết theo Ngành
                    </h2>
                    <SectorWatchlist />
                </section>
            </div>
        </div>
    );
}
