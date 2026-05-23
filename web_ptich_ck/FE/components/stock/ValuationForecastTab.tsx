"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { useValuation, type ValuationData } from "@/hooks/useStockData";

/* ── Shared helpers ─────────────────────────────────────────── */
const fmtVND = (v: number) => v.toLocaleString("vi-VN");

const CardWrapper = ({
  title,
  icon,
  children,
  className = "",
  accent,
}: {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) => (
  <div className={`bg-card rounded-xl shadow-sm border border-border/50 ${accent ?? ""} ${className}`}>
    {title && (
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
    )}
    <div className="px-5 pb-5">{children}</div>
  </div>
);

const SectionHeading = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
  <div className="flex items-start gap-3 mb-4 mt-2">
    <span className="text-xl leading-none mt-0.5">{icon}</span>
    <div>
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

type InsightLevel = "positive" | "warning" | "negative" | "neutral";
const InsightBlock = ({ level, children }: { level: InsightLevel; children: React.ReactNode }) => {
  const styles: Record<InsightLevel, { border: string; bg: string; icon: string }> = {
    positive: { border: "border-[#00C076]", bg: "bg-green-50", icon: "✅" },
    warning: { border: "border-[#FBBF24]", bg: "bg-yellow-50", icon: "⚠️" },
    negative: { border: "border-[#EF4444]", bg: "bg-red-50", icon: "🚨" },
    neutral: { border: "border-border", bg: "bg-muted/50", icon: "💡" },
  };
  const s = styles[level];
  return (
    <div className={`border-l-4 ${s.border} ${s.bg} rounded-r-lg py-2 px-3 mt-3`}>
      <p className="text-xs text-muted-foreground"><span className="mr-1">{s.icon}</span>{children}</p>
    </div>
  );
};

/* ================================================================= */
/*  SECTION 1 – VALUATION SUMMARY                                    */
/* ================================================================= */
function ValuationSummaryRow({ summary }: { summary: ValuationData["summary"] }) {
  const { currentPrice, intrinsicValue, upside, methods } = summary;
  const isUndervalued = upside > 5;
  const verdictColor = isUndervalued ? "#00C076" : upside < -5 ? "#EF4444" : "#FBBF24";
  const verdictLabel = isUndervalued ? "Dinh gia thap" : upside < -5 ? "Dinh gia cao" : "Hop ly";

  return (
    <>
      <SectionHeading icon="🎯" title="Tong quan Dinh gia" subtitle="Gia tri noi tai tu cac phuong phap dinh gia" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <CardWrapper className="h-full">
            <div className="flex flex-col items-center justify-center h-full pt-2 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Gia hien tai</p>
                <p className="text-3xl font-extrabold text-foreground font-mono">{fmtVND(currentPrice)}</p>
              </div>
              <div className="w-12 border-t-2 border-dashed border-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Gia tri noi tai</p>
                <p className="text-3xl font-extrabold font-mono" style={{ color: verdictColor }}>{fmtVND(intrinsicValue)}</p>
              </div>
              <div className="px-4 py-1.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: verdictColor }}>
                {verdictLabel} · Upside {upside > 0 ? "+" : ""}{upside}%
              </div>
            </div>
          </CardWrapper>
        </div>
        <div className="lg:col-span-8">
          <CardWrapper title="Gia tri theo tung phuong phap" icon="📊" className="h-full">
            {methods.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                {methods.map((m) => (
                  <div key={m.method} className="bg-muted/50 rounded-xl border border-border/50 px-4 py-3 text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">{m.method}</p>
                    <p className="text-lg font-extrabold text-foreground font-mono">{m.value > 0 ? fmtVND(m.value) : "N/A"}</p>
                    {m.value > 0 && (
                      <p className={`text-[10px] ${m.value > currentPrice ? "text-[#00C076]" : "text-[#EF4444]"}`}>
                        {m.value > currentPrice ? "↑" : "↓"} {((m.value / currentPrice - 1) * 100).toFixed(1)}% vs gia
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-center py-4">Khong co du lieu</p>}
          </CardWrapper>
        </div>
      </div>
    </>
  );
}

/* ================================================================= */
/*  SECTION 2 – FOOTBALL FIELD                                       */
/* ================================================================= */
function FootballFieldSection({ footballField, currentPrice }: { footballField: ValuationData["footballField"]; currentPrice: number }) {
  const option = useMemo(() => {
    if (footballField.length < 2) return null;
    const methods = footballField.map((d) => d.method);
    const allValues = footballField.flatMap((d) => [d.low, d.high]).filter((v) => v > 0);
    if (allValues.length < 2) return null;
    const minVal = Math.min(...allValues) * 0.85;
    const maxVal = Math.max(...allValues) * 1.1;

    const colors = ["#3B82F6", "#00C076", "#8B5CF6", "#F97316", "#EF4444", "#64748B"];

    return {
      tooltip: {
        trigger: "axis" as const, axisPointer: { type: "shadow" as const },
        formatter: (params: { name: string }[]) => {
          const idx = methods.indexOf(params[0]?.name ?? "");
          if (idx < 0) return "";
          const row = footballField[idx];
          return `<b>${row.method}</b><br/>Thap: <b>${fmtVND(row.low)}</b><br/>TB: <b>${fmtVND(row.mid)}</b><br/>Cao: <b>${fmtVND(row.high)}</b>`;
        },
      },
      grid: { top: 20, left: 120, right: 40, bottom: 30 },
      xAxis: { type: "value" as const, min: minVal, max: maxVal, axisLabel: { formatter: (v: number) => fmtVND(v) } },
      yAxis: { type: "category" as const, data: methods, inverse: true, axisLabel: { fontSize: 11, fontWeight: 600, color: "#374151" } },
      series: [
        { name: "_placeholder", type: "bar", stack: "range", data: footballField.map((d) => d.low - minVal), itemStyle: { color: "transparent" }, barWidth: 22, silent: true },
        { name: "Range", type: "bar", stack: "range",
          data: footballField.map((d, i) => ({ value: d.high - d.low, itemStyle: { color: colors[i % colors.length], borderRadius: [4, 4, 4, 4], opacity: 0.7 } })),
          barWidth: 22,
        },
        { name: "Trung binh", type: "scatter", data: footballField.map((d, i) => [d.mid, i]), symbol: "diamond", symbolSize: 14, itemStyle: { color: "#1F2937", borderColor: "#fff", borderWidth: 2 }, z: 10 },
        { name: "Gia hien tai", type: "line", data: [], markLine: {
          silent: true, symbol: "none",
          lineStyle: { color: "#F97316", width: 2, type: "dashed" as const },
          data: [{ xAxis: currentPrice }],
          label: { formatter: `Gia: ${fmtVND(currentPrice)}`, fontSize: 11, fontWeight: 600, color: "#F97316" },
        }, lineStyle: { width: 0 }, symbol: "none", silent: true },
      ],
    };
  }, [footballField, currentPrice]);

  if (!option) return null;
  return (
    <>
      <SectionHeading icon="🏈" title="Football Field" subtitle="Pham vi dinh gia theo tung phuong phap" />
      <CardWrapper>
        <ReactECharts option={option} style={{ height: Math.max(250, footballField.length * 45 + 50) }} />
      </CardWrapper>
    </>
  );
}

/* ================================================================= */
/*  SECTION 3 – DCF                                                  */
/* ================================================================= */
function DCFSection({ dcf }: { dcf: ValuationData["dcf"] }) {
  const { wacc, terminalGrowth, projections, sensitivityMatrix, intrinsicValue } = dcf;

  if (projections.length === 0 && intrinsicValue === 0) return null;

  return (
    <CardWrapper title="Mo hinh DCF – Chiet khau dong tien tu do" icon="🔬" accent="border-t-4 border-t-blue-500">
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { label: "WACC", value: `${(wacc * 100).toFixed(1)}%` },
          { label: "Terminal Growth", value: `${(terminalGrowth * 100).toFixed(1)}%` },
          { label: "Fair Value (DCF)", value: fmtVND(intrinsicValue), color: "text-[#00C076]" },
        ].map((item) => (
          <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
            <p className={`text-sm font-bold font-mono ${item.color ?? "text-foreground"}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {projections.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Du phong FCF & PV</p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-semibold">Nam</th>
                  <th className="text-right px-3 py-2 font-semibold">FCF (ty VND)</th>
                  <th className="text-right px-3 py-2 font-semibold">PV (ty VND)</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr key={p.year} className="border-b border-border/50">
                    <td className="px-3 py-2 font-medium text-foreground">Y{p.year}</td>
                    <td className="text-right px-3 py-2 font-mono">{p.fcf.toLocaleString("vi-VN")}</td>
                    <td className="text-right px-3 py-2 font-mono">{p.pv.toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sensitivityMatrix.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Bang nhay cam (WACC vs Terminal Growth)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">WACC \ g</th>
                  {[2, 2.5, 3, 3.5, 4].map((g) => (
                    <th key={g} className="px-2 py-1.5 text-right text-muted-foreground font-semibold">{g}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[10, 11, 12, 13, 14].map((w, wi) => (
                  <tr key={w} className={`border-b border-border/50 ${w === Math.round(wacc * 100) ? "bg-orange-50 font-bold" : ""}`}>
                    <td className="px-2 py-1.5 font-semibold text-muted-foreground">{w}%</td>
                    {sensitivityMatrix[wi]?.map((val, gi) => (
                      <td key={gi} className={`text-right px-2 py-1.5 font-mono ${val > 0 ? "text-foreground" : "text-muted-foreground/60"}`}>
                        {val > 0 ? fmtVND(val) : "—"}
                      </td>
                    )) ?? <td colSpan={5} className="text-muted-foreground/60">—</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardWrapper>
  );
}

/* ================================================================= */
/*  SECTION 4 – DDM                                                  */
/* ================================================================= */
function DDMSection({ ddm }: { ddm: ValuationData["ddm"] }) {
  const intrinsic = Number(ddm?.intrinsicValue ?? 0);
  const dps = Number(ddm?.dividendPerShare ?? 0);
  const ke = Number(ddm?.costOfEquity ?? 0);
  const g = Number(ddm?.growthRate ?? 0);

  if (intrinsic <= 0 && dps <= 0) return null;

  return (
    <CardWrapper title="Mo hinh DDM – Chiet khau co tuc (Gordon Growth)" icon="💎" accent="border-t-4 border-t-green-500">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "DPS hien tai", value: `${fmtVND(dps)} VND` },
          { label: "Ke (Required Return)", value: `${(ke * 100).toFixed(1)}%` },
          { label: "Growth Rate (g)", value: `${(g * 100).toFixed(1)}%` },
          { label: "Fair Value (DDM)", value: `${fmtVND(intrinsic)} VND`, color: "text-[#00C076]" },
        ].map((item) => (
          <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2 border border-border/50 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
            <p className={`text-sm font-bold font-mono ${item.color ?? "text-foreground"}`}>{item.value}</p>
          </div>
        ))}
      </div>
      <InsightBlock level={intrinsic > 0 ? "neutral" : "warning"}>
        {intrinsic > 0
          ? `Mo hinh Gordon Growth cho gia tri: ${fmtVND(intrinsic)} VND dua tren DPS = ${fmtVND(dps)}, Ke = ${(ke * 100).toFixed(1)}%, g = ${(g * 100).toFixed(1)}%.`
          : "Khong du du lieu co tuc de tinh DDM."}
      </InsightBlock>
    </CardWrapper>
  );
}

/* ================================================================= */
/*  SECTION 5 – PE/PB BANDS                                         */
/* ================================================================= */
function MultipleBandsSection({ peBand, pbBand }: { peBand: ValuationData["peBand"]; pbBand: ValuationData["pbBand"] }) {
  const makeBandOption = (
    band: ValuationData["peBand"],
    label: string,
  ) => {
    if (!band.dates.length || !band.prices.length) return null;
    return {
      tooltip: { trigger: "axis" as const },
      legend: { top: 4, textStyle: { fontSize: 10 }, data: ["Gia thuc te", `${label} High`, `${label} Avg`, `${label} Mid`, `${label} Low`] },
      grid: { top: 42, left: 50, right: 20, bottom: 28 },
      xAxis: {
        type: "category" as const, data: band.dates,
        axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(band.dates.length / 6) },
      },
      yAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => fmtVND(v) } },
      series: [
        { name: `${label} High`, type: "line", data: band.highBand, lineStyle: { width: 1, type: "dashed" as const, color: "#EF4444" }, itemStyle: { color: "#EF4444" }, symbol: "none" },
        { name: `${label} Avg`, type: "line", data: band.avgBand, lineStyle: { width: 1, type: "dashed" as const, color: "#3B82F6" }, itemStyle: { color: "#3B82F6" }, symbol: "none" },
        { name: `${label} Mid`, type: "line", data: band.midBand, lineStyle: { width: 1, type: "dashed" as const, color: "#8B5CF6" }, itemStyle: { color: "#8B5CF6" }, symbol: "none" },
        { name: `${label} Low`, type: "line", data: band.lowBand, lineStyle: { width: 1, type: "dashed" as const, color: "#00C076" }, itemStyle: { color: "#00C076" }, symbol: "none" },
        { name: "Gia thuc te", type: "line", data: band.prices, lineStyle: { width: 3, color: "#F97316" }, itemStyle: { color: "#F97316" }, symbol: "none", z: 10 },
      ],
    };
  };

  const peOption = useMemo(() => makeBandOption(peBand, "P/E"), [peBand]);
  const pbOption = useMemo(() => makeBandOption(pbBand, "P/B"), [pbBand]);

  if (!peOption && !pbOption) return null;

  return (
    <>
      <SectionHeading icon="📉" title="Vung dinh gia lich su – P/E & P/B Bands" subtitle="Xac dinh vung gia hop ly dua tren lich su multiple" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {peOption && (
          <CardWrapper title="P/E Bands" icon="📊">
            <ReactECharts option={peOption} style={{ height: 320 }} />
          </CardWrapper>
        )}
        {pbOption && (
          <CardWrapper title="P/B Bands" icon="📈">
            <ReactECharts option={pbOption} style={{ height: 320 }} />
          </CardWrapper>
        )}
      </div>
    </>
  );
}

/* ================================================================= */
/*  SECTION 6 – PEER VALUATION                                      */
/* ================================================================= */
function PeerValuationSection({ peerValuation }: { peerValuation: ValuationData["peerValuation"] }) {
  if (peerValuation.length === 0) return null;

  const avgPE = peerValuation.reduce((s, p) => s + (p.pe ?? 0), 0) / peerValuation.filter((p) => p.pe).length || 0;
  const avgPB = peerValuation.reduce((s, p) => s + (p.pb ?? 0), 0) / peerValuation.filter((p) => p.pb).length || 0;
  const avgROE = peerValuation.reduce((s, p) => s + (p.roe ?? 0), 0) / peerValuation.filter((p) => p.roe).length || 0;

  return (
    <>
      <SectionHeading icon="⚖️" title="Dinh gia tuong doi – Peer Group" subtitle="So sanh boi so voi cac doanh nghiep cung nganh" />
      <CardWrapper>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-muted text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-3 py-2 font-semibold">Ticker</th>
                <th className="text-left px-2 py-2 font-semibold">Ten</th>
                <th className="text-right px-2 py-2 font-semibold">P/E</th>
                <th className="text-right px-2 py-2 font-semibold">P/B</th>
                <th className="text-right px-2 py-2 font-semibold">EV/EBITDA</th>
                <th className="text-right px-2 py-2 font-semibold">ROE (%)</th>
                <th className="text-right px-2 py-2 font-semibold">MCap (ty)</th>
              </tr>
            </thead>
            <tbody>
              {peerValuation.map((p) => (
                <tr key={p.ticker} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="px-3 py-2 font-bold text-foreground">{p.ticker}</td>
                  <td className="px-2 py-2 text-muted-foreground max-w-[180px] truncate">{p.companyName}</td>
                  <td className={`text-right px-2 py-2 font-mono ${p.pe && p.pe < avgPE ? "text-[#00C076]" : "text-foreground"}`}>{p.pe?.toFixed(1) ?? "—"}</td>
                  <td className={`text-right px-2 py-2 font-mono ${p.pb && p.pb < avgPB ? "text-[#00C076]" : "text-foreground"}`}>{p.pb?.toFixed(1) ?? "—"}</td>
                  <td className="text-right px-2 py-2 font-mono">{p.evEbitda?.toFixed(1) ?? "—"}</td>
                  <td className={`text-right px-2 py-2 font-mono ${p.roe && p.roe > avgROE ? "text-[#00C076]" : "text-foreground"}`}>{p.roe?.toFixed(1) ?? "—"}</td>
                  <td className="text-right px-2 py-2 font-mono">{p.marketCap ? (p.marketCap / 1e9).toFixed(0) : "—"}</td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                <td className="px-3 py-2 text-blue-700" colSpan={2}>TB nganh</td>
                <td className="text-right px-2 py-2 font-mono text-blue-700">{avgPE.toFixed(1)}</td>
                <td className="text-right px-2 py-2 font-mono text-blue-700">{avgPB.toFixed(1)}</td>
                <td className="text-right px-2 py-2">—</td>
                <td className="text-right px-2 py-2 font-mono text-blue-700">{avgROE.toFixed(1)}</td>
                <td className="text-right px-2 py-2">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardWrapper>
    </>
  );
}

/* ================================================================= */
/*  MAIN EXPORT                                                       */
/* ================================================================= */
export default function ValuationForecastTab() {
  const { ticker } = useStockDetail();
  const { data, loading, error } = useValuation(ticker);

  if (loading && !data) return <div className="text-center py-12 text-muted-foreground animate-pulse">Dang tai dinh gia...</div>;
  if (error && !data) return <div className="text-center py-12 text-red-500">Loi: {error}</div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">Khong co du lieu</div>;

  return (
    <div className="space-y-6">
      <ValuationSummaryRow summary={data.summary} />
      <FootballFieldSection footballField={data.footballField} currentPrice={data.summary.currentPrice} />

      <SectionHeading icon="🔍" title="Mo hinh Dinh gia Tuyet doi" subtitle="DCF & DDM" />
      <div className="space-y-4">
        <DCFSection dcf={data.dcf} />
        <DDMSection ddm={data.ddm} />
      </div>

      <MultipleBandsSection peBand={data.peBand} pbBand={data.pbBand} />
      <PeerValuationSection peerValuation={data.peerValuation} />
    </div>
  );
}
