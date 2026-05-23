"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import StockSearchBar from "@/components/analysis/StockSearchBar";
import { popularTickers } from "@/lib/technicalAnalysisData";
import {
  LineChart,
  BarChart3,
  TrendingUp,
  Activity,
  Gauge,
  ArrowRight,
  Waves,
  PieChart,
  Star,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getOrCreateSessionId(): string {
  const key = "session_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, generated);
  return generated;
}

export default function AnalysisLandingPage() {
  const router = useRouter();
  const [favoriteTickers, setFavoriteTickers] = useState<string[]>([]);

  const loadFavorites = async () => {
    try {
      const sessionId = getOrCreateSessionId();
      const res = await fetch(`${API}/tracking/favorite?session_id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as string[];
      // API already returns ORDER BY created_at DESC, keep this order for priority.
      setFavoriteTickers(data.map((t) => t.toUpperCase()));
    } catch {
      // noop
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadFavorites();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Merge favorites and popular, prioritizing favorites
  const displayTickers = [
    ...favoriteTickers.map((t) => ({ ticker: t, name: "Yêu thích", isFavorite: true })),
    ...popularTickers
      .filter((pt) => !favoriteTickers.includes(pt.ticker.toUpperCase()))
      .map((pt) => ({ ...pt, isFavorite: false })),
  ];

  const features = [
    {
      icon: <LineChart size={24} />,
      title: "Biểu đồ nến",
      description: "Biểu đồ nến Nhật với zoom, crosshair và tooltip chi tiết",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      icon: <Activity size={24} />,
      title: "Chỉ báo kỹ thuật",
      description: "SMA, EMA, Bollinger Bands, Ichimoku Cloud, MACD, RSI...",
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      icon: <Gauge size={24} />,
      title: "Tín hiệu mua/bán",
      description: "Tín hiệu tổng hợp từ nhiều chỉ báo kỹ thuật",
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Điểm Pivot",
      description: "Hỗ trợ và kháng cự Classic, Fibonacci",
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      icon: <Waves size={24} />,
      title: "Stochastic & RSI",
      description: "Phát hiện quá mua/quá bán với độ chính xác cao",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
    },
    {
      icon: <PieChart size={24} />,
      title: "Tổng quan tín hiệu",
      description: "Bảng tổng hợp đánh giá từ tất cả các chỉ báo",
      color: "text-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-950",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
            <Activity size={16} />
            Phân tích kỹ thuật
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Phân tích kỹ thuật cổ phiếu
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Biểu đồ chuyên nghiệp với đầy đủ chỉ báo kỹ thuật, tín hiệu mua/bán, 
            hỗ trợ và kháng cự để đưa ra quyết định đầu tư thông minh.
          </p>

          {/* Search */}
          <div className="max-w-lg mx-auto pt-2">
            <StockSearchBar className="text-left" />
          </div>
        </div>

        {/* Quick access stocks */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp size={14} />
            Mã quan tâm & phổ biến
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {displayTickers.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => router.push(`/analysis/${stock.ticker}`)}
                className={`group bg-card rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md ${
                  stock.isFavorite ? "border-yellow-400/50 hover:border-yellow-400" : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {stock.isFavorite && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                      <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {stock.ticker}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{stock.name}</div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 size={14} />
            Tính năng phân tích
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="shadow-sm border-border hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${feature.bgColor} flex items-center justify-center mb-3`}>
                    <div className={feature.color}>{feature.icon}</div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
