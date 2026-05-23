"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisSummaryData } from "@/lib/technicalAnalysisData";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpCircle,
  ArrowDownCircle,
  Circle,
} from "lucide-react";

interface AnalysisSummaryProps {
  summary: AnalysisSummaryData;
  currentPrice: number;
  className?: string;
  mode?: "stack" | "columns";
}

const signalColors: Record<string, { bg: string; text: string; border: string }> = {
  "Mua mạnh": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Mua": { bg: "bg-emerald-50/50", text: "text-emerald-600", border: "border-emerald-100" },
  "Trung lập": { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
  "Bán": { bg: "bg-red-50/50", text: "text-red-600", border: "border-red-100" },
  "Bán mạnh": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const SignalIcon: React.FC<{ signal: string; size?: number }> = ({ signal, size = 16 }) => {
  if (signal === "Mua" || signal === "Mua mạnh")
    return <TrendingUp size={size} className="text-emerald-500" />;
  if (signal === "Bán" || signal === "Bán mạnh")
    return <TrendingDown size={size} className="text-red-500" />;
  return <Minus size={size} className="text-muted-foreground" />;
};

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ summary, currentPrice, className, mode = "stack" }) => {
  const overall = signalColors[summary.overallSignal] || signalColors["Trung lập"];
  const totalSignals = summary.buyCount + summary.sellCount + summary.neutralCount;

  const overallCard = (
    <Card className={`shadow-sm ${overall.border} border h-full`}>
      <CardContent className="p-5 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">Tín hiệu tổng hợp</span>
          <SignalIcon signal={summary.overallSignal} size={20} />
        </div>
        <div className="flex items-end gap-2 mb-4">
          <span className={`text-3xl font-bold ${overall.text}`}>
            {summary.overallSignal}
          </span>
          <span className={`text-sm font-semibold ${summary.scorePercent >= 0 ? 'text-emerald-500' : 'text-red-500'} mb-0.5`}>
            ({summary.scorePercent > 0 ? '+' : ''}{summary.scorePercent}%)
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 rounded-l-full transition-all"
              style={{ width: `${(summary.buyCount / totalSignals) * 100}%` }}
            />
            <div
              className="bg-muted-foreground/40 transition-all"
              style={{ width: `${(summary.neutralCount / totalSignals) * 100}%` }}
            />
            <div
              className="bg-red-500 rounded-r-full transition-all"
              style={{ width: `${(summary.sellCount / totalSignals) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <ArrowUpCircle size={14} className="text-emerald-500" />
            <span className="text-emerald-600 font-medium">Mua: {summary.buyCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground font-medium">Trung lập: {summary.neutralCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowDownCircle size={14} className="text-red-500" />
            <span className="text-red-600 font-medium">Bán: {summary.sellCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const pivotCard = (
    <Card className="shadow-sm border-border h-full">
      <CardHeader className="pb-1 pt-2 px-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground">Điểm Pivot</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-1 text-muted-foreground font-medium">Loại</th>
                <th className="text-right py-1 text-red-400 font-medium">S3</th>
                <th className="text-right py-1 text-red-400 font-medium">S2</th>
                <th className="text-right py-1 text-red-400 font-medium">S1</th>
                <th className="text-right py-1 text-muted-foreground font-medium">Pivot</th>
                <th className="text-right py-1 text-emerald-400 font-medium">R1</th>
                <th className="text-right py-1 text-emerald-400 font-medium">R2</th>
                <th className="text-right py-1 text-emerald-400 font-medium">R3</th>
              </tr>
            </thead>
            <tbody>
              {summary.pivotPoints.map((pp) => (
                <tr key={pp.type} className="border-b border-border/30 last:border-0">
                  <td className="py-1 text-muted-foreground font-medium">{pp.type}</td>
                  <td className="py-1 text-right font-mono text-red-500">{pp.s3.toLocaleString()}</td>
                  <td className="py-1 text-right font-mono text-red-500">{pp.s2.toLocaleString()}</td>
                  <td className="py-1 text-right font-mono text-red-400">{pp.s1.toLocaleString()}</td>
                  <td className="py-1 text-right font-mono text-muted-foreground font-bold">{pp.pivot.toLocaleString()}</td>
                  <td className="py-1 text-right font-mono text-emerald-400">{pp.r1.toLocaleString()}</td>
                  <td className="py-1 text-right font-mono text-emerald-500">{pp.r2.toLocaleString()}</td>
                  <td className="py-1 text-right font-mono text-emerald-500">{pp.r3.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Giá hiện tại</span>
          <span className="text-sm font-bold text-foreground">{currentPrice.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (mode === "columns") {
    return (
      <div className={`grid grid-cols-1 lg:grid-cols-5 gap-3 ${className || ''}`}>
        <div className="lg:col-span-2">{overallCard}</div>
        <div className="lg:col-span-3">{pivotCard}</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 flex flex-col ${className || ''}`}>
      {overallCard}
      {pivotCard}
    </div>
  );
};

export default AnalysisSummary;
