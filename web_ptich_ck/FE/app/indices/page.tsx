"use client";

import { useRef, useEffect, useState } from "react";
import MarketIndicesTable from "@/components/indices/MarketIndicesTable";
import MacroIndicatorsTable from "@/components/indices/MacroIndicatorsTable";
import { MarketIndex, MacroIndicator } from "@/lib/indicesData";
import { TrendingUp, Globe, Landmark, Loader2, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function IndicesPage() {
    const marketRef = useRef<HTMLElement>(null);
    const macroRef = useRef<HTMLElement>(null);

    const [marketData, setMarketData] = useState<MarketIndex[]>([]);
    const [macroData, setMacroData] = useState<MacroIndicator[]>([]);
    const [loadingMarket, setLoadingMarket] = useState(true);
    const [loadingMacro, setLoadingMacro] = useState(true);
    const [errorMarket, setErrorMarket] = useState<string | null>(null);
    const [errorMacro, setErrorMacro] = useState<string | null>(null);

    const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
        ref.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Fetch market indices from macro_economy
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/indices/market`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setMarketData(json.data ?? []);
            } catch (err: unknown) {
                setErrorMarket(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
            } finally {
                setLoadingMarket(false);
            }
        })();
    }, []);

    // Fetch macro yearly indicators from vn_macro_yearly
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/indices/macro-yearly`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setMacroData(json.data ?? []);
            } catch (err: unknown) {
                setErrorMacro(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
            } finally {
                setLoadingMacro(false);
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Chỉ số &amp; Vĩ mô <span className="text-orange-500">StockPro</span>
                    </h1>
                    <div className="text-sm text-muted-foreground">Cập nhật: Vừa xong</div>
                </div>

                {/* Quick nav cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => scrollTo(marketRef)}
                        className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group"
                    >
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
                            <Globe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="font-bold text-foreground text-sm">Chỉ số Thị trường</div>
                            <div className="text-xs text-muted-foreground">
                                {loadingMarket ? "..." : `${marketData.length} chỉ số`}
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => scrollTo(macroRef)}
                        className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-sm hover:border-emerald-300 hover:shadow-md transition-all text-left group"
                    >
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900 transition-colors">
                            <Landmark className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <div className="font-bold text-foreground text-sm">Chỉ số Vĩ mô</div>
                            <div className="text-xs text-muted-foreground">
                                {loadingMacro ? "..." : `${macroData.length} chỉ số`}
                            </div>
                        </div>
                    </button>
                </div>

                {/* Market Indices (macro_economy) */}
                <section ref={marketRef}>
                    <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-blue-500 rounded-full" />
                        Chỉ số Thị trường
                    </h2>
                    {loadingMarket ? (
                        <div className="flex items-center justify-center py-16 bg-card rounded-xl border">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                            <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                        </div>
                    ) : errorMarket ? (
                        <div className="flex items-center justify-center py-16 bg-card rounded-xl border">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                            <span className="text-red-600">{errorMarket}</span>
                        </div>
                    ) : (
                        <MarketIndicesTable
                            title="Chỉ số Thị trường"
                            data={marketData}
                            description="Dữ liệu từ bảng macro_economy — vàng, dầu, tỷ giá, trái phiếu, chỉ số quốc tế"
                        />
                    )}
                </section>

                {/* Macro Indicators (vn_macro_yearly) */}
                <section ref={macroRef}>
                    <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-emerald-500 rounded-full" />
                        Chỉ số Vĩ mô Việt Nam
                    </h2>
                    {loadingMacro ? (
                        <div className="flex items-center justify-center py-16 bg-card rounded-xl border">
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mr-2" />
                            <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                        </div>
                    ) : errorMacro ? (
                        <div className="flex items-center justify-center py-16 bg-card rounded-xl border">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                            <span className="text-red-600">{errorMacro}</span>
                        </div>
                    ) : (
                        <MacroIndicatorsTable data={macroData} />
                    )}
                </section>
            </div>
        </div>
    );
}
