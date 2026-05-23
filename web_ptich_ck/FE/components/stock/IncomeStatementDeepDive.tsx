"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as isDefaults from "@/lib/incomeStatementDeepDiveData";
import type { DuPontTreeNode } from "@/lib/incomeStatementDeepDiveData";

const IsCtx = React.createContext(isDefaults);

// ── Design tokens ──
const mono = "font-[var(--font-roboto-mono)]";
const GREEN = "#00C076";
const RED = "#EF4444";
const ORANGE = "#F97316";

const fmtN = (n: number | null) => {
  if (n == null) return "—";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
};

// ══════════════════════════════════════════════════════════════
//  ROW 1 – Key Metric Highlight Cards
// ══════════════════════════════════════════════════════════════
function KeyMetricCards() {
  const ctx = React.useContext(IsCtx);
  const incomeMetricCards = ctx.incomeMetricCards ?? isDefaults.incomeMetricCards;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {incomeMetricCards.map((c, i) => (
        <div
          key={i}
          className={`bg-card rounded-lg shadow-sm border border-border/50 border-l-4 ${c.borderColor} p-5`}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {c.label}
          </p>

          {c.value && (
            <p className={`text-3xl font-extrabold text-foreground ${mono}`}>{c.value}</p>
          )}

          {c.listItems ? (
            <div className="space-y-1.5 mt-2">
              {c.listItems.map((li) => (
                <div key={li.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{li.label}</span>
                  <span className={`text-sm font-bold ${mono} text-foreground`}>{li.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {c.badges.map((b, j) => (
                <span key={j} className={`text-sm font-semibold ${mono}`} style={{ color: b.color }}>
                  {b.text}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 2 – DuPont Analysis Engine (Pure Tailwind)
// ══════════════════════════════════════════════════════════════

/* Section A: 5-Factor Formula */
function DuPontFormula() {
  const ctx = React.useContext(IsCtx);
  const dupontFactors = ctx.dupontFactors ?? isDefaults.dupontFactors;
  const dupontResult = ctx.dupontResult ?? isDefaults.dupontResult;
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {dupontFactors.map((f, i) => (
        <React.Fragment key={i}>
          <div className="bg-card border border-border rounded-xl px-4 py-3 text-center min-w-[120px] shadow-sm">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {f.label}
            </p>
            <p className={`text-xl font-extrabold text-foreground ${mono}`}>{f.value.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{f.sub}</p>
          </div>
          {i < dupontFactors.length - 1 && (
            <span className="text-lg font-bold text-muted-foreground/60">×</span>
          )}
        </React.Fragment>
      ))}
      <span className="text-lg font-bold text-muted-foreground">=</span>
      <div className="bg-orange-50 border-2 border-orange-300 rounded-xl px-6 py-3 text-center min-w-[120px] shadow-sm">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {dupontResult.label}
        </p>
        <p className={`text-2xl font-extrabold text-[#F97316] ${mono}`}>
          {dupontResult.value}%
        </p>
      </div>
    </div>
  );
}

/* DuPont Tree Node */
function TreeNode({ node, isRoot = false }: { node: DuPontTreeNode; isRoot?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded-xl px-4 py-2.5 text-center shadow-sm border-2 min-w-[110px] ${
          isRoot ? "bg-orange-50 border-orange-300" : "bg-card border-border"
        }`}
      >
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
          {node.label}
        </p>
        <p className={`text-lg font-extrabold ${mono}`} style={{ color: node.color }}>
          {node.value}
        </p>
      </div>

      {node.children && node.children.length > 0 && (
        <>
          {/* Vertical connector down from parent */}
          <div className="w-px h-5 bg-border/80" />
          
          <div className="flex justify-center">
            {node.children.map((child, i) => {
              const isFirst = i === 0;
              const isLast = i === node.children!.length - 1;
              const hasMultiple = node.children!.length > 1;

              return (
                <div key={child.label} className="flex flex-col items-center relative px-2 sm:px-4">
                  {/* Horizontal line extending from center to edges */}
                  {hasMultiple && (
                    <div 
                      className="absolute top-0 h-px bg-border/80"
                      style={{
                        left: isFirst ? "50%" : 0,
                        right: isLast ? "50%" : 0,
                      }}
                    />
                  )}
                  {/* Vertical line down to the child box */}
                  <div className="w-px h-5 bg-border/80" />
                  <TreeNode node={child} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* Section B: Tree + ROS Breakdown */
function DuPontTreeAndROS() {
  const ctx = React.useContext(IsCtx);
  const dupontTree = ctx.dupontTree ?? isDefaults.dupontTree;
  const rosBreakdown = ctx.rosBreakdown ?? isDefaults.rosBreakdown;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
      {/* Left: DuPont Tree */}
      <div className="lg:col-span-7 flex items-center justify-center py-4">
        <TreeNode node={dupontTree} isRoot />
      </div>

      {/* Right: ROS Breakdown */}
      <div className="lg:col-span-5">
        <h4 className="text-sm font-bold text-foreground mb-4">
          Chi tiết Tỷ suất
        </h4>
        <div className="space-y-4">
          {rosBreakdown.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-bold ${mono}`} style={{ color: item.color }}>
                  {item.value}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${(item.value / 50) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DuPontSection() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-6">
        <span className="text-lg">🔬</span> Phân Tích DuPont 5 Yếu Tố
        <span className="text-xs text-muted-foreground font-normal">
          (Mở Rộng - Bóc Tách ROS)
        </span>
      </h2>
      <DuPontFormula />
      <DuPontTreeAndROS />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 3 – Profit Section (Profit Drivers + Profit Funnel)
// ══════════════════════════════════════════════════════════════
function ProfitSection() {
  const ctx = React.useContext(IsCtx);
  const viewCtx = ctx as typeof isDefaults & {
    profitDrivers?: Array<{ name: string; value: number; color: string; isTotal?: boolean }>;
  };
  const profitDrivers = viewCtx.profitDrivers ?? [];
  const profitFunnel = ctx.profitFunnel ?? isDefaults.profitFunnel;

  const profitDriverChart = useMemo(() => {
    const parts = profitDrivers.filter((d) => !d.isTotal);
    if (parts.length === 0) return null;
    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        valueFormatter: (value: number) => (value != null ? `${fmtN(value)} Tỷ` : "—"),
      },
      grid: { top: 18, left: 90, right: 20, bottom: 20 },
      xAxis: { type: "value" as const },
      yAxis: {
        type: "category" as const,
        data: parts.map((d) => d.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 11, color: "#6b7280" },
      },
      series: [
        {
          type: "bar",
          data: parts.map((d) => ({
            value: d.value,
            itemStyle: { color: d.value >= 0 ? d.color : RED, borderRadius: [0, 4, 4, 0] },
          })),
          barWidth: "45%",
          label: {
            show: true,
            position: "right" as const,
            formatter: (p: { value: number }) => fmtN(p.value),
            fontSize: 10,
            fontFamily: "Roboto Mono, monospace",
            color: "#374151",
          },
          markLine: { data: [{ xAxis: 0 }], lineStyle: { color: "#D1D5DB", type: "dashed" as const } },
        },
      ],
    };
  }, [profitDrivers]);

  const pbtTotal = useMemo(() => {
    const total = profitDrivers.find((d) => d.isTotal)?.value;
    if (total != null) return total;
    return profitDrivers.filter((d) => !d.isTotal).reduce((sum, d) => sum + d.value, 0);
  }, [profitDrivers]);

  const funnelChart = useMemo(() => {
    const prepared = profitFunnel
      .map((d) => ({ ...d, value: Number(d.value) }))
      .filter((d) => Number.isFinite(d.value) && d.value > 0);

    const maxVal = prepared.length ? Math.max(...prepared.map((d) => d.value)) : 0;
    const visualScaleExp = 0.72;
    const visualFloorRatio = 0.2;

    const visualized = prepared.map((d) => {
      if (maxVal <= 0) {
        return { ...d, realValue: d.value, visualValue: d.value, pctReal: 0 };
      }
      const ratio = d.value / maxVal;
      const cheatedRatio = Math.max(Math.pow(ratio, visualScaleExp), visualFloorRatio);
      return {
        ...d,
        realValue: d.value,
        visualValue: cheatedRatio * maxVal,
        pctReal: ratio * 100,
      };
    });

    return {
      tooltip: {
        trigger: "item" as const,
        formatter: (p: { data?: { realValue?: number; pctReal?: number }; name: string }) => {
          const real = p.data?.realValue ?? 0;
          const pct = p.data?.pctReal ?? 0;
          return `${p.name}<br/>Thực tế: ${fmtN(real)} (${pct.toFixed(1)}%)`;
        },
      },
      series: [
        {
          type: "funnel",
          top: "6%",
          bottom: "6%",
          // Reserve ~25% right area for notes/labels; funnel uses ~75% remaining width.
          left: "2%",
          right: "26%",
          minSize: "0%",
          maxSize: "100%",
          sort: "none" as const,
          gap: 3,
          label: {
            show: true,
            position: "right" as const,
            alignTo: "edge" as const,
            edgeDistance: "6%",
            color: "#111827",
            fontSize: 10,
            fontWeight: 600,
            width: 170,
            overflow: "truncate" as const,
            align: "left" as const,
            lineHeight: 14,
            formatter: (p: { data?: { realValue?: number; pctReal?: number }; name: string }) => {
              const real = p.data?.realValue ?? 0;
              const pct = p.data?.pctReal ?? 0;
              return `${p.name}\n${fmtN(real)} | ${pct.toFixed(1)}%`;
            },
          },
          labelLine: {
            show: true,
            length: 14,
            length2: 22,
            lineStyle: { color: "#9CA3AF", width: 1 },
          },
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 1,
            borderRadius: 4,
            shadowBlur: 8,
            shadowColor: "rgba(15, 23, 42, 0.12)",
          },
          emphasis: {
            label: { color: "#0F172A", fontWeight: 700 },
            itemStyle: { shadowBlur: 14, shadowColor: "rgba(15, 23, 42, 0.24)" },
          },
          data: visualized.map((d) => ({
            value: d.visualValue,
            name: d.name,
            realValue: d.realValue,
            pctReal: d.pctReal,
            itemStyle: {
              color: d.color,
            },
          })),
        },
      ],
    };
  }, [profitFunnel]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 h-full flex flex-col">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>🧭</span> Động lực Lợi nhuận Trước Thuế
        </h3>
        <p className="text-[10px] text-muted-foreground mb-2">Phân rã LNTT thành các nguồn đóng góp, đơn vị: Tỷ VND.</p>
        {profitDriverChart ? (
          <ReactECharts option={profitDriverChart} style={{ height: 260 }} />
        ) : (
          <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">Không đủ dữ liệu</div>
        )}
        <div className="space-y-1.5 mt-2 max-h-[150px] overflow-y-auto pr-1">
          {profitDrivers.map((d) => {
            const pct = pbtTotal !== 0 ? (d.value / pbtTotal) * 100 : 0;
            return (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.value >= 0 ? d.color : RED }} />
                  <span className="text-xs text-muted-foreground">{d.name}</span>
                </div>
                <span className={`text-xs font-bold ${mono}`}>{fmtN(d.value)} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 h-full flex flex-col">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>📉</span> Phễu Hiệu Quả (Profit Funnel)
        </h3>
        <div className="flex-1 min-h-[420px]">
          <ReactECharts option={funnelChart} style={{ height: "100%" }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 4 – Revenue & Cost Trend
// ══════════════════════════════════════════════════════════════
function RevenueCostTrendSection() {
  const ctx = React.useContext(IsCtx);
  const revenueTrend = ctx.revenueTrend ?? isDefaults.revenueTrend;
  const years = revenueTrend.map((d: any) => String(d.year));

  const comboChart = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      legend: {
        top: 4,
        textStyle: { fontSize: 11 },
        data: ["Doanh Thu", "Giá Vốn", "LN Gộp"],
      },
      grid: { top: 48, left: 55, right: 20, bottom: 32, containLabel: true },
      xAxis: { type: "category" as const, data: years },
      yAxis: { type: "value" as const },
      series: [
        {
          name: "Doanh Thu",
          type: "bar",
          data: revenueTrend.map((d) => d.revenue),
          itemStyle: { color: ORANGE },
          barWidth: "28%",
        },
        {
          name: "Giá Vốn",
          type: "bar",
          data: revenueTrend.map((d) => d.cogs),
          itemStyle: { color: "#D1D5DB" },
          barWidth: "28%",
        },
        {
          name: "LN Gộp",
          type: "line",
          data: revenueTrend.map((d) => d.grossProfit),
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: RED, width: 2.5 },
          itemStyle: { color: RED },
        },
      ],
    }),
    [years]
  );

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 h-full flex flex-col">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>📊</span> Diễn biến Doanh thu & Chi phí
        </h3>
        <div className="w-full">
          <ReactECharts option={comboChart} style={{ height: 300 }} />
        </div>
      </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 5 – Cost Structure + Cost Management Efficiency
// ══════════════════════════════════════════════════════════════
function CostStructureEfficiencySection() {
  const ctx = React.useContext(IsCtx);
  const costStructure = ctx.costStructure ?? isDefaults.costStructure;
  const efficiencyData = ctx.efficiencyData ?? isDefaults.efficiencyData;
  const costStructureModelLabel = (ctx as typeof isDefaults & { costStructureModelLabel?: string }).costStructureModelLabel;

  const totalCostPct = useMemo(
    () => Number(costStructure.reduce((sum, item) => sum + Number(item.value || 0), 0).toFixed(1)),
    [costStructure]
  );

  const donutChart = useMemo(
    () => ({
      tooltip: { trigger: "item" as const, formatter: "{b}: {d}%" },
      graphic: {
        type: "text" as const,
        left: "center",
        top: "center",
        style: {
          text: `Tổng CP\n${totalCostPct}% DT`,
          textAlign: "center" as const,
          fill: "#6b7280",
          fontSize: 13,
          fontWeight: "bold" as const,
        },
      },
      series: [
        {
          type: "pie",
          radius: ["48%", "75%"],
          label: { show: false },
          data: costStructure.map((d) => ({
            value: d.value,
            name: d.name,
            itemStyle: { color: d.color },
          })),
        },
      ],
    }),
    [costStructure, totalCostPct]
  );

  const efficiencyChart = useMemo(
    () => ({
      tooltip: {
        trigger: "axis" as const,
        valueFormatter: (value: number) => (value != null ? Number(value).toFixed(3) + "%" : "—"),
      },
      grid: { top: 24, left: 50, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: efficiencyData.map((d) => String(d.year)) },
      yAxis: { type: "value" as const, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          type: "bar",
          data: efficiencyData.map((d) => d.costToRevenue),
          itemStyle: { color: ORANGE, borderRadius: [4, 4, 0, 0] },
          barWidth: "45%",
        },
      ],
    }),
    [efficiencyData]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 h-full">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>🍩</span> Cơ cấu Chi phí (Common Size)
          </h3>
          {costStructureModelLabel && (
            <span className="text-[10px] font-semibold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
              {costStructureModelLabel}
            </span>
          )}
        </div>
        <ReactECharts option={donutChart} style={{ height: 250 }} />
        <div className="space-y-1.5 mt-2 max-h-[170px] overflow-y-auto pr-1">
          {costStructure.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
              <span className={`text-xs font-bold ${mono}`}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span className="w-1 h-4 bg-[#3B82F6] rounded-full" />
            Hiệu quả Quản lý Chi phí
          </h3>
          <span className="text-[10px] font-semibold text-[#00C076] bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            Thấp hơn là Tốt hơn
          </span>
        </div>
        <ReactECharts option={efficiencyChart} style={{ height: 320 }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 6 – Revenue Mix + Revenue & Profit Growth
// ══════════════════════════════════════════════════════════════
function RevenueMixGrowthSection() {
  const ctx = React.useContext(IsCtx);
  const revenueBySegment = ctx.revenueBySegment ?? isDefaults.revenueBySegment;
  const growthData = ctx.growthData ?? isDefaults.growthData;
  const costStructureModelLabel = (ctx as typeof isDefaults & { costStructureModelLabel?: string }).costStructureModelLabel;
  const years = growthData.map((d: any) => String(d.year));

  const revPie = useMemo(
    () => ({
      tooltip: { trigger: "item" as const, formatter: "{b}: {d}%" },
      series: [
        {
          type: "pie",
          radius: ["40%", "72%"],
          label: { show: false },
          data: revenueBySegment.map((d) => ({
            value: d.value,
            name: d.name,
            itemStyle: { color: d.color },
          })),
        },
      ],
    }),
    [revenueBySegment]
  );

  const growthChart = useMemo(
    () => ({
      tooltip: { 
        trigger: "axis" as const,
        valueFormatter: (value: number) => (value != null ? Number(value).toFixed(3) + "%" : "—"),
      },
      legend: {
        top: 4,
        textStyle: { fontSize: 11 },
        data: ["Tăng trưởng Doanh thu", "Tăng trưởng LN Ròng"],
      },
      grid: { top: 42, left: 50, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: years },
      yAxis: { type: "value" as const, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          name: "Tăng trưởng Doanh thu",
          type: "line",
          data: growthData.map((d) => d.revenueGrowth),
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { color: ORANGE, width: 2.5 },
          itemStyle: { color: ORANGE },
        },
        {
          name: "Tăng trưởng LN Ròng",
          type: "line",
          data: growthData.map((d) => d.netProfitGrowth),
          symbol: "diamond",
          symbolSize: 8,
          lineStyle: { color: GREEN, width: 2.5, type: "dashed" as const },
          itemStyle: { color: GREEN },
        },
      ],
    }),
    [years]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 h-full">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>📊</span> Cơ cấu Nguồn Thu (% tổng thu nhập)
        </h3>
        {costStructureModelLabel && (
          <p className="text-[10px] text-muted-foreground mb-2">Mô hình: {costStructureModelLabel}</p>
        )}
        <ReactECharts option={revPie} style={{ height: 240 }} />
        <div className="space-y-1.5 mt-2 max-h-[190px] overflow-y-auto pr-1">
          {revenueBySegment.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
              <span className={`text-xs font-bold ${mono}`}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 h-full">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span className="w-1 h-4 bg-[#F97316] rounded-full" />
          Tốc độ Tăng trưởng (YoY Growth %)
        </h3>
        <ReactECharts option={growthChart} style={{ height: 320 }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 7 – Detailed Income Statement Table
// ══════════════════════════════════════════════════════════════
function DetailedTable() {
  const ctx = React.useContext(IsCtx);
  const incomeTableHeaders = ctx.incomeTableHeaders ?? isDefaults.incomeTableHeaders;
  const incomeTableData = ctx.incomeTableData ?? isDefaults.incomeTableData;
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 border-t-4 border-t-[#F97316] overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <span>📋</span> Chi tiết Báo Cáo & Tăng Trưởng YoY
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {incomeTableHeaders.map((h) => (
                <th
                  key={h}
                  className={`py-3 px-3 ${h === "Chỉ tiêu" ? "text-left" : "text-right"} whitespace-nowrap`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incomeTableData.map((row, idx) => {
              const padClass =
                row.indent === 2 ? "pl-8" : row.indent === 1 ? "pl-4" : "";
              const fontClass = row.isBold
                ? "font-bold text-gray-900"
                : "text-gray-600";
              const bgClass = row.isBold ? "bg-orange-50/50" : "";

              return (
                <tr
                  key={idx}
                  className={`${bgClass} border-b border-border/30 hover:bg-muted/30 transition-colors`}
                >
                  <td
                    className={`py-2 px-3 text-left text-sm whitespace-nowrap ${padClass} ${fontClass}`}
                  >
                    {row.label}
                  </td>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={`py-2 px-3 text-right text-sm ${mono} whitespace-nowrap ${fontClass}`}
                    >
                      {v != null ? fmtN(v) : "—"}
                    </td>
                  ))}
                  <td className={`py-2 px-3 text-right text-sm ${mono} whitespace-nowrap`}>
                    {row.growth24 != null ? (
                      <span
                        className={
                          row.growth24 >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"
                        }
                      >
                        {row.growth24 >= 0 ? "↑" : "↓"}{" "}
                        {row.growth24 >= 0 ? "+" : ""}
                        {row.growth24.toFixed(1)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export default function IncomeStatementDeepDive({ data }: { data?: Record<string, unknown> }) {
  return (
    <IsCtx.Provider value={data ? { ...isDefaults, ...data } as typeof isDefaults : isDefaults}>
      <div className="space-y-6">
        {/* ROW 1 */}
        <KeyMetricCards />
        {/* ROW 2 */}
        <DuPontSection />
        {/* ROW 3 */}
        <ProfitSection />
        {/* ROW 4 */}
        <RevenueCostTrendSection />
        {/* ROW 5 */}
        <CostStructureEfficiencySection />
        {/* ROW 6 */}
        <RevenueMixGrowthSection />
        {/* ROW 7 */}
        <DetailedTable />
      </div>
    </IsCtx.Provider>
  );
}
