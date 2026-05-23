"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as bsDefaults from "@/lib/balanceSheetDeepDiveData";
import type { TableRow } from "@/lib/balanceSheetDeepDiveData";

const BsCtx = React.createContext(bsDefaults);

// ── Design tokens ──
const mono = "font-[var(--font-roboto-mono)]";
const GREEN = "#00C076";
const RED = "#EF4444";
const ORANGE = "#F97316";
const BLUE = "#3B82F6";
const PURPLE = "#8B5CF6";

const fmtN = (n: number | null) => {
  if (n == null) return "—";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
};

// ══════════════════════════════════════════════════════════════
//  ROW 1 – Key Metric Highlight Cards
// ══════════════════════════════════════════════════════════════
function KeyMetricCards() {
  const ctx = React.useContext(BsCtx);
  const overviewStats = ctx.overviewStats ?? bsDefaults.overviewStats;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {overviewStats.map((s, i) => (
        <div
          key={i}
          className={`bg-card rounded-lg shadow-sm border border-border/50 border-t-4 ${s.borderColor} p-5`}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {s.label}
          </p>
          <p className={`text-3xl font-extrabold text-foreground ${mono}`}>
            {s.value}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {s.yoyChange != null && (
              <span
                className={`text-sm font-semibold ${mono} ${s.yoyChange >= 0 ? "text-[#00C076]" : "text-[#EF4444]"}`}
              >
                {s.yoyChange >= 0 ? "↗" : "↘"} {s.yoyChange > 0 ? "+" : ""}{s.yoyChange.toFixed(2)}% {s.yoyLabel === "vs kỳ trước" ? s.yoyLabel : "vs kỳ trước"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 2 – Financial Health & Risk (Gauge + Metrics)
// ══════════════════════════════════════════════════════════════
function FinancialHealthSection() {
  const ctx = React.useContext(BsCtx);
  const gaugeData = ctx.gaugeData ?? bsDefaults.gaugeData;
  const healthMetrics = ctx.healthMetrics ?? bsDefaults.healthMetrics;
  const gaugeOption = useMemo(
    () => ({
      series: [
        {
          type: "gauge",
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 5,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 18,
              color: [
                [0.33, RED],
                [0.6, "#F59E0B"],
                [1, GREEN],
              ],
            },
          },
          pointer: { length: "60%", width: 6, itemStyle: { color: "#334155" } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: {
            fontSize: 28,
            fontWeight: 800,
            fontFamily: "Roboto Mono, monospace",
            offsetCenter: [0, "30%"],
            formatter: "{value}",
            color: "#1e293b",
          },
          title: { show: false },
          data: [{ value: gaugeData.zScore }],
        },
      ],
    }),
    [gaugeData]
  );

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-5">
        <span className="text-lg">🛡️</span> Sức Khỏe Tài Chính & Rủi Ro
        <span className="text-xs text-muted-foreground font-normal">(Financial Health)</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left: Gauge */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center">
          <p className="text-sm font-semibold text-muted-foreground mb-1">
            Altman Z-Score (Nguy cơ phá sản)
          </p>
          <ReactECharts option={gaugeOption} style={{ height: 200, width: "100%" }} />
          <p className="text-sm font-semibold mt-1" style={{ color: gaugeData.zoneColor }}>
            {gaugeData.zoneLabel}
          </p>
        </div>

        {/* Right: Metrics */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {healthMetrics.map((m, i) => (
            <div 
              key={i} 
              className={`bg-muted/40 rounded-xl p-4 border border-border/30 ${
                i === 4 ? "sm:col-span-2 w-full sm:w-[calc(50%-0.5rem)] sm:mx-auto" : ""
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground mb-1">{m.title}</p>
              <p className={`text-2xl font-extrabold ${mono}`} style={{ color: m.color }}>
                {m.value}
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2 mb-1">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${m.barPercent}%`, backgroundColor: m.color }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">{m.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 3 – Asset & Capital Structure (Donuts + Stacked Bars)
// ══════════════════════════════════════════════════════════════
function AssetCapitalDonutRow() {
  const ctx = React.useContext(BsCtx);
  const assetStructure = ctx.assetStructure ?? bsDefaults.assetStructure;
  const capitalStructure = ctx.capitalStructure ?? bsDefaults.capitalStructure;
  const assetDonut = useMemo(
    () => ({
      tooltip: { 
        trigger: "item" as const, 
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        textStyle: { fontSize: 12 },
        formatter: (params: any) => {
          const data = params.data;
          let tip = `<div style="margin-bottom:4px; font-size:13px;"><b>${data.name}</b>: ${params.percent}%</div>`;
          if (data.details && data.details.length > 0) {
            tip += `<div style="font-size:12px; margin-top:6px; border-top:1px solid #f3f4f6; padding-top:6px;">`;
            data.details.forEach((dt: any) => {
              tip += `<div style="display:flex; justify-content:space-between; margin-bottom:3px;">`;
              tip += `<span style="color:#6b7280; margin-right:16px;">${dt.name}</span>`;
              tip += `<span style="font-weight:bold; font-family:monospace; color:#374151;">${dt.value}%</span>`;
              tip += `</div>`;
            });
            tip += `</div>`;
          }
          return tip;
        }
      },
      legend: { show: false },
      series: [
        {
          type: "pie",
          radius: ["40%", "65%"],
          center: ["50%", "50%"],
          label: { 
            show: true,
            position: "outside",
            formatter: (params: any) => {
              const val = new Intl.NumberFormat('vi-VN').format(params.data.rawValue || 0);
              return `{name|${params.name}}\n{val|${val} Tỷ} ({pct|${params.percent}%})`;
            },
            rich: {
              name: { fontFamily: "Roboto, sans-serif", fontSize: 11, color: "#6b7280", padding: [0, 0, 4, 0] },
              val: { fontFamily: "Roboto, monospace", fontWeight: "bold", fontSize: 12, color: "#111827" },
              pct: { fontFamily: "Roboto, sans-serif", fontSize: 11, color: "#4b5563" }
            }
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 15,
            smooth: true
          },
          data: assetStructure.map((d) => ({
            value: d.value,
            name: d.name,
            rawValue: d.rawValue,
            itemStyle: { color: d.color },
            details: d.details
          })),
        },
      ],
    }),
    [assetStructure]
  );

  const capitalDonut = useMemo(
    () => ({
      tooltip: { 
        trigger: "item" as const, 
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        textStyle: { fontSize: 12 },
        formatter: (params: any) => {
          const data = params.data;
          let tip = `<div style="margin-bottom:4px; font-size:13px;"><b>${data.name}</b>: ${params.percent}%</div>`;
          if (data.details && data.details.length > 0) {
            tip += `<div style="font-size:12px; margin-top:6px; border-top:1px solid #f3f4f6; padding-top:6px;">`;
            data.details.forEach((dt: any) => {
              tip += `<div style="display:flex; justify-content:space-between; margin-bottom:3px;">`;
              tip += `<span style="color:#6b7280; margin-right:16px;">${dt.name}</span>`;
              tip += `<span style="font-weight:bold; font-family:monospace; color:#374151;">${dt.value}%</span>`;
              tip += `</div>`;
            });
            tip += `</div>`;
          }
          return tip;
        }
      },
      legend: { show: false },
      series: [
        {
          type: "pie",
          radius: ["40%", "65%"],
          center: ["50%", "50%"],
          label: { 
            show: true,
            position: "outside",
            formatter: (params: any) => {
              const val = new Intl.NumberFormat('vi-VN').format(params.data.rawValue || 0);
              return `{name|${params.name}}\n{val|${val} Tỷ} ({pct|${params.percent}%})`;
            },
            rich: {
              name: { fontFamily: "Roboto, sans-serif", fontSize: 11, color: "#6b7280", padding: [0, 0, 4, 0] },
              val: { fontFamily: "Roboto, monospace", fontWeight: "bold", fontSize: 12, color: "#111827" },
              pct: { fontFamily: "Roboto, sans-serif", fontSize: 11, color: "#4b5563" }
            }
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 15,
            smooth: true
          },
          data: capitalStructure.map((d) => ({
            value: d.value,
            name: d.name,
            rawValue: d.rawValue,
            itemStyle: { color: d.color },
            details: d.details
          })),
        },
      ],
    }),
    [capitalStructure]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Asset Structure Donut */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
          <span>🍩</span> Cơ Cấu Tài Sản
        </h3>
        <div className="flex flex-col items-center gap-6">
          <div className="w-full h-[260px] flex-shrink-0">
            <ReactECharts option={assetDonut} style={{ height: "100%", width: "100%" }} />
          </div>
          <div className="space-y-4 w-full px-2">
            {assetStructure.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-muted-foreground">{d.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${mono}`} style={{ color: d.color }}>
                    {d.value}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${d.value}%`, backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capital Structure Donut */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
          <span>🍩</span> Cấu Trúc Nguồn Vốn
        </h3>
        <div className="flex flex-col items-center gap-6">
          <div className="w-full h-[260px] flex-shrink-0">
            <ReactECharts option={capitalDonut} style={{ height: "100%", width: "100%" }} />
          </div>
          <div className="space-y-4 w-full px-2">
            {capitalStructure.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-muted-foreground">{d.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${mono}`} style={{ color: d.color }}>
                    {d.value}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${d.value}%`, backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendChartsRow() {
  const ctx = React.useContext(BsCtx);
  const trendData = (ctx.trendData ?? bsDefaults.trendData).slice(-8);
  const years = trendData.map((d: any) => String(d.year));

  const assetCapitalTrend = useMemo(
    () => ({
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        formatter: (params: Array<{ seriesName: string; value: number; marker: string }>) =>
          params.map((p) => {
            const val = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(p.value || 0);
            return `${p.marker} ${p.seriesName}: <b>${val}%</b>`;
          }).join("<br/>"),
        textStyle: { fontFamily: "Roboto, sans-serif" }
      },
      legend: { top: 4, textStyle: { fontSize: 11, fontFamily: "Roboto, sans-serif" } },
      grid: { top: 40, left: 50, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: years, axisLabel: { fontFamily: "Roboto, sans-serif" } },
      yAxis: { type: "value" as const, max: 100, axisLabel: { formatter: "{value}%", fontFamily: "Roboto, sans-serif" } },
      series: [
        {
          name: "TS Ngắn hạn",
          type: "bar",
          stack: "asset",
          data: trendData.map((d) => d.currentAssetsPct),
          itemStyle: { color: ORANGE },
          barWidth: "40%",
        },
        {
          name: "TS Dài hạn",
          type: "bar",
          stack: "asset",
          data: trendData.map((d) => d.nonCurrentAssetsPct),
          itemStyle: { color: PURPLE },
          barWidth: "40%",
        },
      ],
    }),
    [trendData, years]
  );

  const debtTrend = useMemo(
    () => ({
      tooltip: { 
        trigger: "axis" as const, 
        axisPointer: { type: "shadow" as const },
        formatter: (params: Array<{ seriesName: string; value: number; marker: string }>) =>
          params.map((p) => {
            const val = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(p.value || 0);
            return `${p.marker} ${p.seriesName}: <b>${val}</b>`;
          }).join("<br/>"),
        textStyle: { fontFamily: "Roboto, sans-serif" }
      },
      legend: { top: 4, textStyle: { fontSize: 11, fontFamily: "Roboto, sans-serif" } },
      grid: { top: 40, left: 60, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: years, axisLabel: { fontFamily: "Roboto, sans-serif" } },
      yAxis: { 
        type: "value" as const, 
        axisLabel: { 
          fontFamily: "Roboto, sans-serif",
          formatter: (value: number) => new Intl.NumberFormat('vi-VN').format(value)
        } 
      },
      series: [
        {
          name: "Nợ ngắn hạn",
          type: "bar",
          stack: "debt",
          data: trendData.map((d) => d.shortTermDebt),
          itemStyle: { color: RED },
          barWidth: "40%",
        },
        {
          name: "Nợ dài hạn",
          type: "bar",
          stack: "debt",
          data: trendData.map((d) => d.longTermDebt),
          itemStyle: { color: "#F59E0B" },
          barWidth: "40%",
        },
        {
          name: "Vốn CSH",
          type: "bar",
          stack: "debt",
          data: trendData.map((d) => d.equity),
          itemStyle: { color: GREEN },
          barWidth: "40%",
        },
      ],
    }),
    [trendData, years]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Stacked % bar */}
      <div className="bg-card rounded-xl shadow-sm border-2 border-blue-200 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span className="w-1 h-4 bg-[#F97316] rounded-full" />
          Cấu trúc Tài sản & Nguồn vốn (5 năm)
        </h3>
        <ReactECharts option={assetCapitalTrend} style={{ height: 260 }} />
      </div>

      {/* Absolute stacked bar */}
      <div className="bg-card rounded-xl shadow-sm border-2 border-blue-200 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span className="w-1 h-4 bg-[#3B82F6] rounded-full" />
          Phân tích Nợ & Khả năng thanh toán
        </h3>
        <ReactECharts option={debtTrend} style={{ height: 260 }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 4 – Inventory & Leverage Details
// ══════════════════════════════════════════════════════════════
function InventoryAndLeverage() {
  const ctx = React.useContext(BsCtx);
  const inventoryData = ctx.inventoryData ?? bsDefaults.inventoryData;
  const inventoryFooter = ctx.inventoryFooter ?? bsDefaults.inventoryFooter;
  const leverageItems = ctx.leverageItems ?? bsDefaults.leverageItems;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Inventory */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-5">
          <span>📦</span> Cấu Trúc Hàng Tồn Kho
        </h3>
        <div className="space-y-4">
          {inventoryData.map((item) => (
            <div key={item.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${mono}`}>{fmtN(item.value)}</span>
                  <span className={`text-xs text-muted-foreground ${mono}`}>{item.percent}%</span>
                </div>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
        {/* Footer stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Tổng HTK</p>
            <p className={`text-sm font-bold text-foreground ${mono}`}>{inventoryFooter.totalInventory}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Vòng quay HTK</p>
            <p className={`text-sm font-bold text-foreground ${mono}`}>{inventoryFooter.inventoryTurnover}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Số ngày HTK</p>
            <p className={`text-sm font-bold text-foreground ${mono}`}>{inventoryFooter.inventoryDays}</p>
          </div>
        </div>
      </div>

      {/* Leverage */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-5">
          <span>⚖️</span> Các Chỉ Số Đòn Bẩy Tài Chính
        </h3>
        <div className="space-y-1.5">
          {leverageItems.map((item) => (
            <div key={item.title} className="rounded-md border border-border/40 bg-muted/20 p-1.5">
              <div className="flex items-start justify-between gap-1.5 mb-0.5">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground font-medium leading-snug">{item.title}</div>
                  <div className="text-[10px] mt-0" style={{ color: item.colorHex }}>
                    {item.status === "warning" ? "⚠ Trung bình" : item.status === "danger" ? "🔴 Rủi ro" : "Tốt"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-sm font-extrabold ${mono}`}
                    style={{ color: item.colorHex }}
                    title={`Giá trị: ${item.value}\nĐánh giá: ${item.statusLabel}`}
                  >
                    {item.value}
                  </span>
                </div>
              </div>
              <div className="relative w-full h-1.5 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  {item.segments.map((seg, idx) => (
                    <div key={idx} style={{ width: `${seg.width}%`, backgroundColor: seg.color }} />
                  ))}
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-white shadow"
                  style={{ left: `calc(${item.markerPercent}% - 5px)`, backgroundColor: item.colorHex }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 5 – CCC & Liquidity
// ══════════════════════════════════════════════════════════════
function CCCAndLiquidity() {
  const ctx = React.useContext(BsCtx);
  const cccData = ctx.cccData ?? bsDefaults.cccData;
  const liquidityItems = ctx.liquidityItems ?? bsDefaults.liquidityItems;
  const statusColor = { good: GREEN, warning: "#F59E0B", danger: RED };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* CCC Math Layout */}
      <div className="lg:col-span-7 bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-5">
          <span>🔄</span> Chu Kỳ Tiền Mặt (CCC)
        </h3>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex flex-col items-center bg-blue-50 rounded-xl px-5 py-3 border border-blue-100 min-w-[90px]">
            <span className="text-[10px] text-muted-foreground font-medium">Tồn kho</span>
            <span className={`text-xl font-extrabold text-blue-700 ${mono}`}>
              {cccData.inventoryDays}d
            </span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">+</span>
          <div className="flex flex-col items-center bg-orange-50 rounded-xl px-5 py-3 border border-orange-100 min-w-[90px]">
            <span className="text-[10px] text-muted-foreground font-medium">Phải thu</span>
            <span className={`text-xl font-extrabold text-orange-700 ${mono}`}>
              {cccData.receivableDays}d
            </span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">−</span>
          <div className="flex flex-col items-center bg-green-50 rounded-xl px-5 py-3 border border-green-100 min-w-[90px]">
            <span className="text-[10px] text-muted-foreground font-medium">Phải trả</span>
            <span className={`text-xl font-extrabold text-green-700 ${mono}`}>
              {cccData.payableDays}d
            </span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">=</span>
          <div className="flex flex-col items-center bg-purple-50 rounded-xl px-6 py-3 border-2 border-purple-200 min-w-[100px]">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Chu kỳ
            </span>
            <span className={`text-3xl font-extrabold text-purple-700 ${mono}`}>
              {cccData.cycleDays}
            </span>
            <span className="text-xs text-purple-500 font-semibold">Ngày</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-border/50 pt-4">
          <div className="text-center p-2 rounded-lg bg-blue-50/50 border border-blue-100/50 text-xs">
            <p className="font-semibold text-blue-800 mb-1">Số ngày Tồn kho</p>
            <p className="text-muted-foreground">(Hàng tồn kho / Giá vốn) × 365</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-orange-50/50 border border-orange-100/50 text-xs">
            <p className="font-semibold text-orange-800 mb-1">Số ngày Phải thu</p>
            <p className="text-muted-foreground">(Phải thu / Doanh thu) × 365</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-50/50 border border-green-100/50 text-xs">
            <p className="font-semibold text-green-800 mb-1">Số ngày Phải trả</p>
            <p className="text-muted-foreground">(Phải trả / Giá vốn) × 365</p>
          </div>
        </div>
      </div>

      {/* Liquidity */}
      <div className="lg:col-span-5 bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
          <span>💧</span> Thanh khoản
        </h3>
        <div className="space-y-4">
          {liquidityItems.map((item) => {
            const clr = statusColor[item.status];
            return (
              <div key={item.title}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground font-medium">{item.title}</span>
                  <span className={`text-base font-extrabold ${mono}`} style={{ color: clr }}>
                    {item.value.toFixed(2)}
                    <span className="text-xs text-muted-foreground">x</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${Math.min((item.value / item.max) * 100, 100)}%`,
                      backgroundColor: clr,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 6 – Detailed Balance Sheet Table
// ══════════════════════════════════════════════════════════════
function renderRows(rows: TableRow[]): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  const walk = (items: TableRow[]) => {
    for (const row of items) {
      const isMain = row.level === "main";
      const isSub = row.level === "sub";

      const rowClass = isMain
        ? "font-bold text-orange-700 bg-orange-50"
        : isSub
          ? "font-semibold text-gray-800"
          : "text-gray-600";

      const indent = row.level === "detail" ? "pl-6" : row.level === "sub" ? "pl-3" : "";

      result.push(
        <tr key={row.label} className={`${rowClass} border-b border-border/30 hover:bg-muted/30 transition-colors`}>
          <td className={`py-2 px-3 text-left text-sm whitespace-nowrap ${indent}`}>
            {row.label}
          </td>
          {row.values.map((v, i) => (
            <td key={i} className={`py-2 px-3 text-right text-sm ${mono} whitespace-nowrap`}>
              {v != null ? fmtN(v) : "—"}
            </td>
          ))}
          <td className={`py-2 px-3 text-right text-sm ${mono} whitespace-nowrap`}>
            {row.change != null ? (
              <span className={row.change >= 0 ? "text-[#00C076]" : "text-[#EF4444]"}>
                {row.change >= 0 ? "↑" : "↓"} {fmtN(Math.abs(row.change))}
              </span>
            ) : (
              "—"
            )}
          </td>
          <td className={`py-2 px-3 text-right text-sm ${mono} whitespace-nowrap`}>
            {row.yoyPct != null ? (
              <span className={row.yoyPct >= 0 ? "text-[#00C076]" : "text-[#EF4444]"}>
                {row.yoyPct >= 0 ? "+" : ""}
                {row.yoyPct.toFixed(1)}%
              </span>
            ) : (
              "—"
            )}
          </td>
          <td className={`py-2 px-3 text-right text-sm ${mono} whitespace-nowrap`}>
            {row.pctTotal != null ? `${row.pctTotal.toFixed(1)}%` : "—"}
          </td>
        </tr>
      );

      if (row.children) walk(row.children);
    }
  };

  walk(rows);
  return result;
}

function DetailedTable() {
  const ctx = React.useContext(BsCtx);
  const tableHeaders = ctx.tableHeaders ?? bsDefaults.tableHeaders;
  const tableData = ctx.tableData ?? bsDefaults.tableData;
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 border-t-4 border-t-[#F97316] overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <span>📋</span> Chi tiết Bảng Cân Đối Kế Toán & So Sánh
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tableHeaders.map((h) => (
                <th
                  key={h}
                  className={`py-3 px-3 ${h === "Chỉ tiêu" ? "text-left" : "text-right"} whitespace-nowrap`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{renderRows(tableData)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export default function BalanceSheetDeepDive({ data }: { data?: Record<string, unknown> }) {
  return (
    <BsCtx.Provider value={data ? { ...bsDefaults, ...data } as typeof bsDefaults : bsDefaults}>
      <div className="space-y-5">
        {/* ROW 1 */}
        <KeyMetricCards />
        {/* ROW 3 - Donuts */}
        <AssetCapitalDonutRow />
        {/* ROW 3 - Trends */}
        <TrendChartsRow />
        {/* ROW 4 */}
        <InventoryAndLeverage />
        {/* ROW 5 */}
        <CCCAndLiquidity />
        {/* ROW 2 - Financial Health moved down */}
        <FinancialHealthSection />
        {/* ROW 6 */}
        <DetailedTable />
      </div>
    </BsCtx.Provider>
  );
}
