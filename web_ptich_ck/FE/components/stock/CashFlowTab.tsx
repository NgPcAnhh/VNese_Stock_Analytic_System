"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { useDeepAnalysis, type OverviewStat, type TrendYear } from "@/hooks/useStockData";

const fmt = (n: number) => n.toLocaleString("vi-VN");
const monoFont = "font-[var(--font-roboto-mono)]";

// ==================== ROW 0: OVERVIEW CARDS ====================
function CashFlowOverview({ stats }: { stats: OverviewStat[] }) {
  const colors = ["bg-green-500", "bg-red-500", "bg-blue-500", "bg-purple-500"];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <div key={i} className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
          <p className={`text-2xl font-extrabold text-foreground ${monoFont}`}>{s.value}</p>
          {s.trend && (
            <span className={`text-xs font-medium ${s.trend === "up" ? "text-[#00C076]" : s.trend === "down" ? "text-[#EF4444]" : "text-muted-foreground"}`}>
              {s.trend === "up" ? "↗ Tích cực" : s.trend === "down" ? "↘ Tiêu cực" : ""}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== ROW 1: EFFICIENCY & SELF-FUNDING ====================
function EfficiencyAndFunding({ efficiencyMetrics, selfFundingData }: {
  efficiencyMetrics: Record<string, unknown>[];
  selfFundingData: Record<string, unknown>[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-5"><span>📊</span> Hiệu Quả Dòng Tiền (%)</h3>
        {efficiencyMetrics.length > 0 ? (
          <div className="space-y-5">
            {efficiencyMetrics.map((m, i) => {
              const cfToRev = Number(m.cfToRevenue ?? 0);
              const cfToNI = Number(m.cfToNetProfit ?? 0);
              return (
                <div key={i} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Năm {String(m.year)}</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-muted-foreground">CF/Doanh thu</span>
                        <span className={`text-sm font-bold ${monoFont}`}>{cfToRev.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full">
                        <div className={`h-1.5 rounded-full ${cfToRev > 0 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min(Math.abs(cfToRev), 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-muted-foreground">CF/LNST</span>
                        <span className={`text-sm font-bold ${monoFont}`}>{cfToNI.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full">
                        <div className={`h-1.5 rounded-full ${cfToNI > 80 ? "bg-green-500" : "bg-orange-500"}`} style={{ width: `${Math.min(Math.abs(cfToNI), 200) / 2}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-muted-foreground text-center py-4">Không có dữ liệu</p>}
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-5"><span>💰</span> Khả Năng Tự Tài Trợ</h3>
        {selfFundingData.length > 0 ? (
          <div className="space-y-4">
            {selfFundingData.map((d, i) => {
              const ocf = Number(d.operatingCF ?? 0);
              const icf = Math.abs(Number(d.investingCF ?? 0));
              const ratio = Number(d.selfFundingRatio ?? 0);
              return (
                <div key={i} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Năm {String(d.year)}</span>
                    <span className={`text-sm font-bold ${monoFont} ${ratio >= 100 ? "text-[#00C076]" : "text-orange-500"}`}>{ratio.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>CFO: <strong className="text-green-600">{fmt(Math.round(ocf / 1e9))}</strong></span>
                    <span>|</span>
                    <span>|CFI|: <strong className="text-red-600">{fmt(Math.round(icf / 1e9))}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-muted-foreground text-center py-4">Không có dữ liệu</p>}
      </div>
    </div>
  );
}

// ==================== ROW 2: EARNINGS QUALITY ====================
function EarningsQualityChart({ earningsQuality }: { earningsQuality: Record<string, unknown>[] }) {
  const option = useMemo(() => {
    if (earningsQuality.length < 2) return null;
    const data = [...earningsQuality].reverse();
    const years = data.map((d) => String(d.year));
    return {
      tooltip: { trigger: "axis" as const },
      legend: { top: 0, textStyle: { fontSize: 11 }, data: ["LNST", "CF HĐKD"] },
      grid: { top: 40, left: 50, right: 30, bottom: 30 },
      xAxis: { type: "category" as const, data: years, boundaryGap: false },
      yAxis: { type: "value" as const },
      series: [
        { name: "LNST", type: "line", data: data.map((d) => Math.round(Number(d.netProfit) / 1e9)), symbol: "diamond", symbolSize: 8, lineStyle: { color: "#9CA3AF", width: 2, type: "dashed" as const }, itemStyle: { color: "#9CA3AF" } },
        { name: "CF HĐKD", type: "line", data: data.map((d) => Math.round(Number(d.operatingCF) / 1e9)), symbol: "circle", symbolSize: 8, lineStyle: { color: "#F97316", width: 3 }, itemStyle: { color: "#F97316" },
          areaStyle: { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(249,115,22,0.18)" }, { offset: 1, color: "rgba(249,115,22,0.02)" }] } },
        },
      ],
    };
  }, [earningsQuality]);

  if (!option) return null;
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <h3 className="text-base font-bold text-foreground flex items-center gap-1.5 mb-2">
        <span className="w-1 h-5 bg-orange-500 rounded-full" /> LNST vs CF HĐKD (Tỷ VND — Earnings Quality)
      </h3>
      <ReactECharts option={option} style={{ height: 300 }} />
    </div>
  );
}

// ==================== ROW 3: THREE CASH FLOWS ====================
function ThreeCashFlows({ trends }: { trends: TrendYear[] }) {
  const chartOption = useMemo(() => {
    if (trends.length < 2) return null;
    const data = [...trends].reverse();
    const years = data.map((d) => String(d.year));
    return {
      tooltip: { trigger: "axis" as const },
      legend: { top: 4, textStyle: { fontSize: 11 }, data: ["HĐ Kinh Doanh", "HĐ Đầu Tư", "HĐ Tài Chính"] },
      grid: { top: 40, left: 50, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: years },
      yAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => fmt(v) } },
      series: [
        { name: "HĐ Kinh Doanh", type: "bar", data: data.map((d) => Math.round(Number(d.operatingCashFlow ?? 0) / 1e9)), itemStyle: { color: "#F97316", borderRadius: [4, 4, 0, 0] }, barWidth: "22%" },
        { name: "HĐ Đầu Tư", type: "bar", data: data.map((d) => Math.round(Number(d.investingCashFlow ?? 0) / 1e9)), itemStyle: { color: "#4B5563" }, barWidth: "22%" },
        { name: "HĐ Tài Chính", type: "bar", data: data.map((d) => Math.round(Number(d.financingCashFlow ?? 0) / 1e9)), itemStyle: { color: "#D1D5DB" }, barWidth: "22%" },
      ],
    };
  }, [trends]);

  if (!chartOption) return null;
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3"><span className="w-3 h-3 rounded-full bg-orange-500" /> 3 Dòng Tiền Chính (Tỷ VND)</h3>
      <ReactECharts option={chartOption} style={{ height: 280 }} />
    </div>
  );
}

// ==================== ROW 4: WATERFALL ====================
function WaterfallChart({ waterfall }: { waterfall: Record<string, unknown>[] }) {
  const option = useMemo(() => {
    if (waterfall.length < 2) return null;
    const items = waterfall.map((w) => ({ name: String(w.name), value: Math.round(Number(w.value) / 1e9) }));
    const categories = items.map((i) => i.name);
    let running = 0;
    const baseValues: number[] = [];
    const visibleValues: number[] = [];
    const isLast = (idx: number) => idx === items.length - 1;

    items.forEach((item, idx) => {
      if (isLast(idx)) {
        baseValues.push(0);
        visibleValues.push(item.value);
      } else {
        baseValues.push(item.value >= 0 ? running : running + item.value);
        visibleValues.push(Math.abs(item.value));
        running += item.value;
      }
    });

    return {
      tooltip: { trigger: "axis" as const, formatter: (params: { name: string; seriesIndex: number; value: number }[]) => {
        const p = params.find((p) => p.seriesIndex === 1);
        if (!p) return "";
        const orig = items.find((i) => i.name === p.name);
        return `${p.name}: <b>${fmt(orig?.value ?? 0)}</b> Tỷ`;
      }},
      grid: { top: 20, left: 80, right: 40, bottom: 40 },
      xAxis: { type: "category" as const, data: categories, axisLabel: { fontSize: 11 } },
      yAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => fmt(v) } },
      series: [
        { name: "base", type: "bar", stack: "wf", data: baseValues, itemStyle: { color: "transparent" }, emphasis: { itemStyle: { color: "transparent" } }, barWidth: "45%" },
        { name: "value", type: "bar", stack: "wf", barWidth: "45%",
          data: visibleValues.map((v, i) => ({ value: v, itemStyle: { color: items[i].value >= 0 ? "#00C076" : "#EF4444", borderRadius: items[i].value >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] } })),
          label: { show: true, position: "top" as const, fontSize: 11, fontWeight: 600, formatter: (p: { dataIndex: number }) => fmt(items[p.dataIndex].value) },
        },
      ],
    };
  }, [waterfall]);

  if (!option) return null;
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <h3 className="text-base font-bold text-foreground flex items-center gap-1.5 mb-3"><span>✅</span> Tổng Quan Dòng Chảy Tiền Tệ (Tỷ VND)</h3>
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}

// ==================== MAIN EXPORT ====================
export default function CashFlowTab() {
  const { ticker } = useStockDetail();
  const { data, loading, error } = useDeepAnalysis(ticker);
  const cf = data?.cashFlow;

  if (loading && !data) return <div className="text-center py-12 text-muted-foreground animate-pulse">Đang tải phân tích...</div>;
  if (error && !data) return <div className="text-center py-12 text-red-500">Lỗi: {error}</div>;
  if (!cf) return <div className="text-center py-12 text-muted-foreground">Không có dữ liệu</div>;

  return (
    <div className="space-y-5">
      <CashFlowOverview stats={cf.overviewStats} />
      <EfficiencyAndFunding efficiencyMetrics={cf.efficiencyMetrics} selfFundingData={cf.selfFundingData} />
      <EarningsQualityChart earningsQuality={cf.earningsQuality} />
      <ThreeCashFlows trends={cf.trends} />
      <WaterfallChart waterfall={cf.waterfall} />
    </div>
  );
}
