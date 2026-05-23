"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StockAnalysisData } from "@/lib/technicalAnalysisData";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Activity,
  DollarSign,
  Percent,
} from "lucide-react";

interface AnalysisHeaderProps {
  data: StockAnalysisData;
}

const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({ data }) => {
  const isUp = data.priceChange >= 0;
  const lastOhlcv = data.ohlcv[data.ohlcv.length - 1];
  const prevOhlcv = data.ohlcv[data.ohlcv.length - 2];

  // Price stats
  const dayRange = lastOhlcv.high - lastOhlcv.low;
  const avgVolume =
    data.ohlcv.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
  const volumeChange = ((lastOhlcv.volume - avgVolume) / avgVolume) * 100;

  return (
    <div className="space-y-3">
      {/* Price header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{data.ticker.charAt(0)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{data.ticker}</h1>
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                {data.exchange}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{data.companyName}</p>
          </div>
        </div>

        <div className="flex items-baseline gap-3 ml-auto">
          <span className="text-3xl font-bold text-foreground">
            {data.currentPrice.toLocaleString()}
          </span>
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
              isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            <span className="text-sm font-semibold">
              {isUp ? "+" : ""}
              {data.priceChange.toLocaleString()} ({isUp ? "+" : ""}
              {data.priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <QuickStatCard
          label="Mở cửa"
          value={lastOhlcv.open.toLocaleString()}
          icon={<DollarSign size={14} />}
          color="text-blue-500"
        />
        <QuickStatCard
          label="Cao nhất"
          value={lastOhlcv.high.toLocaleString()}
          icon={<TrendingUp size={14} />}
          color="text-emerald-500"
        />
        <QuickStatCard
          label="Thấp nhất"
          value={lastOhlcv.low.toLocaleString()}
          icon={<TrendingDown size={14} />}
          color="text-red-500"
        />
        <QuickStatCard
          label="Khối lượng"
          value={(lastOhlcv.volume / 1000000).toFixed(2) + "M"}
          subValue={`${volumeChange >= 0 ? "+" : ""}${volumeChange.toFixed(1)}% vs TB20`}
          subColor={volumeChange >= 0 ? "text-emerald-500" : "text-red-500"}
          icon={<BarChart3 size={14} />}
          color="text-purple-500"
        />
      </div>
    </div>
  );
};

const QuickStatCard: React.FC<{
  label: string;
  value: string;
  subValue?: string;
  subColor?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, subValue, subColor, icon, color }) => (
  <div className="bg-card rounded-lg border border-border/50 px-3 py-2.5 flex items-center gap-2.5">
    <div className={`${color} opacity-60`}>{icon}</div>
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
      <div className="text-sm font-bold text-foreground">{value}</div>
      {subValue && (
        <div className={`text-[10px] font-medium ${subColor || "text-muted-foreground"}`}>
          {subValue}
        </div>
      )}
    </div>
  </div>
);

export default AnalysisHeader;
