"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { useDeepAnalysis, type OverviewStat, type DuPontFactor } from "@/hooks/useStockData";

const fmt = (n: number) => n.toLocaleString("vi-VN");
const monoFont = "font-[var(--font-roboto-mono)]";

// ==================== ROW 1: KEY METRIC CARDS ====================
function IncomeKeyCards({ stats }: { stats: OverviewStat[] }) {
  const borderColors = ["border-l-orange-500", "border-l-green-500", "border-l-blue-500", "border-l-purple-500"];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <div key={i} className={`bg-card rounded-xl shadow-sm border border-border/50 border-l-4 ${borderColors[i % borderColors.length]} p-5`}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{s.label}</p>
          <p className={`text-2xl font-extrabold text-foreground ${monoFont}`}>{s.value}</p>
          {s.subLabel && <p className="text-xs text-muted-foreground mt-1">{s.subLabel}</p>}
          {s.trend && (
            <span className={`text-xs font-medium ${s.trend === "up" ? "text-[#00C076]" : s.trend === "down" ? "text-[#EF4444]" : "text-muted-foreground"}`}>
              {s.trend === "up" ? "↗" : "↘"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== ROW 2: DUPONT ANALYSIS ====================
function DuPontSection({ dupont }: { dupont: DuPontFactor[] }) {
  if (!dupont.length) return null;
  const roe = dupont.find((d) => d.name === "ROE");
  const factors = dupont.filter((d) => d.name !== "ROE");

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-6">
        <span className="text-lg">🔬</span> Phân Tích DuPont
      </h2>
      <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
        {factors.map((f, i) => (
          <React.Fragment key={i}>
            <div className="bg-card border border-border rounded-xl px-4 py-3 text-center min-w-[130px] shadow-sm">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{f.name}</p>
              <p className={`text-xl font-extrabold text-foreground ${monoFont}`}>{f.value.toFixed(2)}</p>
              {f.prior != null && (
                <p className={`text-[10px] ${f.value > f.prior ? "text-[#00C076]" : f.value < f.prior ? "text-[#EF4444]" : "text-muted-foreground"}`}>
                  Trước: {f.prior.toFixed(2)} {f.value > f.prior ? "↗" : f.value < f.prior ? "↘" : "→"}
                </p>
              )}
            </div>
            {i < factors.length - 1 && <span className="text-xl font-bold text-muted-foreground/60">×</span>}
          </React.Fragment>
        ))}
        {roe && (
          <>
            <span className="text-xl font-bold text-muted-foreground">=</span>
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl px-6 py-3 text-center min-w-[120px] shadow-sm">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">ROE</p>
              <p className={`text-2xl font-extrabold text-[#F97316] ${monoFont}`}>{roe.value.toFixed(1)}%</p>
              {roe.prior != null && <p className="text-[10px] text-muted-foreground">Trước: {roe.prior.toFixed(1)}%</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==================== ROW 3: REVENUE & COST STRUCTURE ====================
function RevenueCostTrends({ costStructure }: { costStructure: Record<string, unknown>[] }) {
  const data = useMemo(() => costStructure.filter((d) => d.revenue && Number(d.revenue) > 0), [costStructure]);
  
  const chartOption = useMemo(() => {
    if (data.length < 2) return null;
    const years = data.map((d) => String(d.year));
    const revenue = data.map((d) => Math.round(Number(d.revenue) / 1e9));
    const cogs = data.map((d) => Math.round(Number(d.cogs) / 1e9));
    const grossProfit = data.map((d, i) => revenue[i] - cogs[i]);
    return {
      tooltip: { trigger: "axis" as const },
      legend: { top: 4, textStyle: { fontSize: 11 }, data: ["Doanh Thu", "Giá Vốn", "LN Gộp"] },
      grid: { top: 42, left: 50, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: years },
      yAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => `${fmt(v)}` } },
      series: [
        { name: "Doanh Thu", type: "bar", data: revenue, itemStyle: { color: "#F97316" }, barWidth: "28%" },
        { name: "Giá Vốn", type: "bar", data: cogs, itemStyle: { color: "#D1D5DB" }, barWidth: "28%" },
        { name: "LN Gộp", type: "line", data: grossProfit, symbol: "circle", symbolSize: 8, lineStyle: { color: "#EF4444", width: 2 }, itemStyle: { color: "#EF4444" } },
      ],
    };
  }, [data]);

  const donutOption = useMemo(() => {
    if (data.length === 0) return null;
    const latest = data[data.length - 1];
    const rev = Number(latest.revenue);
    const items = [
      { name: "Giá vốn", value: Math.round(Number(latest.cogs) / rev * 100), color: "#F97316" },
      { name: "Bán hàng", value: Math.round(Number(latest.selling) / rev * 100), color: "#8B5CF6" },
      { name: "Quản lý", value: Math.round(Number(latest.admin) / rev * 100), color: "#3B82F6" },
      { name: "Tài chính", value: Math.round(Number(latest.financial) / rev * 100), color: "#EF4444" },
    ].filter((i) => i.value > 0);
    return {
      tooltip: { trigger: "item" },
      series: [{ type: "pie", radius: ["45%", "72%"], label: { show: false },
        data: items.map((i) => ({ value: i.value, name: i.name, itemStyle: { color: i.color } })),
      }],
    };
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8 bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3"><span>📊</span> Diễn biến Doanh thu & Chi phí (Tỷ VND)</h3>
        {chartOption ? <ReactECharts option={chartOption} style={{ height: 280 }} /> : <p className="text-muted-foreground text-center py-8">Không đủ dữ liệu</p>}
      </div>
      <div className="lg:col-span-4 bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3"><span>🍩</span> Cơ cấu Chi phí (% DT)</h3>
        {donutOption ? <ReactECharts option={donutOption} style={{ height: 220 }} /> : <p className="text-muted-foreground text-center py-8">Không đủ dữ liệu</p>}
      </div>
    </div>
  );
}

// ==================== ROW 4: GROWTH & MARGIN TRENDS ====================
function GrowthAndMargins({ growthData, marginTrends }: { growthData: Record<string, unknown>[]; marginTrends: Record<string, unknown>[] }) {
  const growthOption = useMemo(() => {
    if (growthData.length < 2) return null;
    return {
      tooltip: { trigger: "axis" as const },
      legend: { top: 4, textStyle: { fontSize: 11 }, data: ["Tăng trưởng DT (%)", "Tăng trưởng LNST (%)"] },
      grid: { top: 42, left: 50, right: 20, bottom: 24 },
      xAxis: { type: "category" as const, data: growthData.map((d) => String(d.year)) },
      yAxis: { type: "value" as const, axisLabel: { formatter: "{value}%" } },
      series: [
        { name: "Tăng trưởng DT (%)", type: "line", data: growthData.map((d) => d.revenueGrowth), symbol: "circle", symbolSize: 8, lineStyle: { color: "#F97316", width: 2 }, itemStyle: { color: "#F97316" } },
        { name: "Tăng trưởng LNST (%)", type: "line", data: growthData.map((d) => d.netProfitGrowth), symbol: "diamond", symbolSize: 8, lineStyle: { color: "#00C076", width: 2, type: "dashed" as const }, itemStyle: { color: "#00C076" } },
      ],
    };
  }, [growthData]);

  const marginOption = useMemo(() => {
    const annual = marginTrends.filter((d) => Number(d.quarter) === 0 || Number(d.quarter) === 5 || Number(d.quarter) === 4);
    const display = annual.length >= 2 ? annual.slice(0, 8).reverse() : marginTrends.slice(0, 8).reverse();
    if (display.length < 2) return null;
    return {
      tooltip: { trigger: "axis" as const },
      legend: { top: 4, textStyle: { fontSize: 11 }, data: ["Biên gộp", "Biên ròng", "Biên EBIT"] },
      grid: { top: 42, left: 50, right: 20, bottom: 24 },
      xAxis: { type: "category" as const, data: display.map((d) => `${d.year}${Number(d.quarter) && Number(d.quarter) < 5 ? `/Q${d.quarter}` : ""}`) },
      yAxis: { type: "value" as const, axisLabel: { formatter: "{value}%" } },
      series: [
        { name: "Biên gộp", type: "line", data: display.map((d) => d.grossMargin), lineStyle: { color: "#F97316", width: 2 }, itemStyle: { color: "#F97316" } },
        { name: "Biên ròng", type: "line", data: display.map((d) => d.netMargin), lineStyle: { color: "#3B82F6", width: 2 }, itemStyle: { color: "#3B82F6" } },
        { name: "Biên EBIT", type: "line", data: display.map((d) => d.ebitMargin), lineStyle: { color: "#8B5CF6", width: 2, type: "dashed" as const }, itemStyle: { color: "#8B5CF6" } },
      ],
    };
  }, [marginTrends]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card rounded-xl shadow-sm border-2 border-blue-200 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3"><span className="w-1 h-4 bg-orange-500 rounded-full" /> Tốc độ Tăng trưởng (YoY Growth %)</h3>
        {growthOption ? <ReactECharts option={growthOption} style={{ height: 260 }} /> : <p className="text-muted-foreground text-center py-8">Không đủ dữ liệu</p>}
      </div>
      <div className="bg-card rounded-xl shadow-sm border-2 border-blue-200 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3"><span className="w-1 h-4 bg-blue-500 rounded-full" /> Xu hướng Biên lợi nhuận (%)</h3>
        {marginOption ? <ReactECharts option={marginOption} style={{ height: 260 }} /> : <p className="text-muted-foreground text-center py-8">Không đủ dữ liệu</p>}
      </div>
    </div>
  );
}

// ==================== MAIN EXPORT ====================
export default function IncomeStatementTab() {
  const { ticker } = useStockDetail();
  const { data, loading, error } = useDeepAnalysis(ticker);
  const is = data?.incomeStatement;

  if (loading && !data) return <div className="text-center py-12 text-muted-foreground animate-pulse">Đang tải phân tích...</div>;
  if (error && !data) return <div className="text-center py-12 text-red-500">Lỗi: {error}</div>;
  if (!is) return <div className="text-center py-12 text-muted-foreground">Không có dữ liệu</div>;

  return (
    <div className="space-y-5">
      <IncomeKeyCards stats={is.overviewStats} />
      <DuPontSection dupont={is.dupont} />
      <RevenueCostTrends costStructure={is.costStructure} />
      <GrowthAndMargins growthData={is.growthData} marginTrends={is.marginTrends} />
    </div>
  );
}
