"use client";

import React, { useState, useEffect } from "react";
import MarketIndicesTable from "@/components/indices/MarketIndicesTable";
import { MarketIndex } from "@/lib/indicesData";
import { Loader2, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const MarketIndicesOverview = () => {
    const [marketData, setMarketData] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API}/indices/market`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!cancelled) setMarketData(json.data ?? []);
            } catch (err: unknown) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 bg-card rounded-xl border border-border">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Đang tải dữ liệu chỉ số...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-16 bg-card rounded-xl border border-border">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-600">{error}</span>
            </div>
        );
    }

    return (
        <MarketIndicesTable
            title="Chỉ số Thị trường"
            data={marketData}
            description="Dữ liệu từ bảng macro_economy — vàng, dầu, tỷ giá, trái phiếu, chỉ số quốc tế"
        />
    );
};

export default MarketIndicesOverview;
