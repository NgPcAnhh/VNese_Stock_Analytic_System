"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { Loader2 } from "lucide-react";
import type { TechnicalSignal } from "@/lib/technicalAnalysisData";

// Tương tự logic trong technicalAnalysisData.ts
function getStrengthWeight(s: string): number {
  if (s === "Mạnh") return 3;
  if (s === "Trung bình") return 2;
  return 1;
}

function calculateScore(signals: TechnicalSignal[]) {
    if (!signals || signals.length === 0) return { pct: 0, signal: "Trung lập", totalMua: 0, totalBan: 0, totalTrungLap: 0 };
    
    let totalScore = 0;
    let maxScore = 0;
    
    let totalMua = 0;
    let totalBan = 0;
    let totalTrungLap = 0;

    for (const sig of signals) {
      const w = getStrengthWeight(sig.strength);
      maxScore += w;
      if (sig.signal === "Mua") {
          totalScore += w;
          totalMua++;
      }
      else if (sig.signal === "Bán") {
          totalScore -= w;
          totalBan++;
      }
      else totalTrungLap++;
    }

    const pct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    let signalText = "Trung lập";
    if (pct >= 40) signalText = "Mua mạnh";
    else if (pct >= 15) signalText = "Mua";
    else if (pct <= -40) signalText = "Bán mạnh";
    else if (pct <= -15) signalText = "Bán";

    return { pct, signal: signalText, totalMua, totalBan, totalTrungLap };
}

export default function TechnicalGaugeCard({ ticker }: { ticker: string }) {
  const { data, loading, error } = useAnalysisData(ticker);
  const [activeTab, setActiveTab] = useState<"all" | "ma" | "osc">("all");

  const scoreData = useMemo(() => {
     if (!data?.summary) return { pct: 0, signal: "Trung lập", totalMua: 0, totalBan: 0, totalTrungLap: 0 };
     if (activeTab === "all") {
         return calculateScore([...data.summary.movingAverages, ...data.summary.oscillators]);
     } else if (activeTab === "ma") {
         return calculateScore(data.summary.movingAverages);
     } else {
         return calculateScore(data.summary.oscillators);
     }
  }, [data, activeTab]);

  if (loading) {
      return (
          <Card className="h-full flex items-center justify-center min-h-[420px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
      );
  }

  if (error || !data) {
      return (
          <Card className="h-full flex items-center justify-center min-h-[420px] text-muted-foreground text-sm">
              Không thể tải dữ liệu chỉ báo kỹ thuật
          </Card>
      );
  }

  // Echarts settings
  const option = {
      series: [
          {
              type: "gauge",
              min: -100,
              max: 100,
              splitNumber: 4,
              radius: "85%",
              center: ["50%", "65%"],
              startAngle: 180,
              endAngle: 0,
              axisLine: {
                  lineStyle: {
                      width: 24,
                      color: [
                          [0.3, "#ef4444"], // Bán mạnh (-100 to -40)
                          [0.425, "#fca5a5"], // Bán (-40 to -15)
                          [0.575, "#94a3b8"], // Trung lập (-15 to 15)
                          [0.7, "#6ee7b7"], // Mua (15 to 40)
                          [1, "#10b981"], // Mua mạnh (40 to 100)
                      ],
                  },
              },
              pointer: {
                  icon: "path://M12.8,0.7l12,40.1H0.7L12.8,0.7z",
                  length: "60%",
                  width: 14,
                  offsetCenter: [0, "-5%"],
                  itemStyle: {
                      color: "auto",
                  },
              },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: { show: false },
              title: {
                  offsetCenter: [0, "20%"],
                  fontSize: 13,
                  color: "#64748b"
              },
              detail: {
                  offsetCenter: [0, "50%"],
                  formatter: scoreData.signal,
                  fontSize: 18,
                  fontWeight: "700",
                  color: "auto",
              },
              data: [
                  {
                      value: scoreData.pct,
                      name: activeTab === "all" ? "Tổng hợp" : activeTab === "ma" ? "Đường MA" : "Chỉ báo KT",
                  },
              ],
          },
      ],
  };

  return (
      <Card className="h-full flex flex-col shadow-sm border-border bg-card">
          <CardHeader className="py-3 px-4 border-b border-border/50">
              <CardTitle className="text-[15px] font-semibold text-foreground">
                  Phân tích kỹ thuật
              </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 flex flex-col justify-between">
              {/* SLICER */}
               <div className="flex bg-muted/50 p-1 rounded-lg mb-2 border border-border/50">
                  <button
                      onClick={() => setActiveTab("all")}
                      className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                          activeTab === "all"
                              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                      Tổng hợp
                  </button>
                  <button
                      onClick={() => setActiveTab("ma")}
                      className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                          activeTab === "ma"
                              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                      MA
                  </button>
                  <button
                      onClick={() => setActiveTab("osc")}
                      className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                          activeTab === "osc"
                              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                      Chỉ báo
                  </button>
              </div>

              {/* GAUGE CHART */}
              <div className="flex-1 relative min-h-[220px] -mt-2">
                  <ReactECharts
                      option={option}
                      style={{ height: "100%", width: "100%" }}
                      opts={{ renderer: "svg" }}
                  />
              </div>

              {/* Count Breakdown */}
              <div className="grid grid-cols-3 divide-x divide-border/50 text-center text-xs border-t border-border/50 pt-3 mt-1">
                  <div className="flex flex-col">
                      <span className="text-muted-foreground mb-1">Bán</span>
                      <span className="font-semibold text-red-500 text-sm">{scoreData.totalBan}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-muted-foreground mb-1">Trung lập</span>
                      <span className="font-semibold text-slate-500 text-sm">{scoreData.totalTrungLap}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-muted-foreground mb-1">Mua</span>
                      <span className="font-semibold text-emerald-500 text-sm">{scoreData.totalMua}</span>
                  </div>
              </div>
          </CardContent>
      </Card>
  );
}
