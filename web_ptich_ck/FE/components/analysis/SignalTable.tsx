"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TechnicalSignal } from "@/lib/technicalAnalysisData";
import { TrendingUp, TrendingDown, Minus, BarChart2, Activity } from "lucide-react";

interface SignalTableProps {
  signals: TechnicalSignal[];
}

const SignalBadge: React.FC<{ signal: string }> = ({ signal }) => {
  const config = {
    Mua: { bg: "bg-emerald-50", text: "text-emerald-700", icon: TrendingUp },
    Bán: { bg: "bg-red-50", text: "text-red-700", icon: TrendingDown },
    "Trung lập": { bg: "bg-muted", text: "text-muted-foreground", icon: Minus },
  };
  const c = config[signal as keyof typeof config] || config["Trung lập"];
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${c.bg} ${c.text}`}
    >
      <Icon size={12} />
      {signal}
    </span>
  );
};

const StrengthDots: React.FC<{ strength: string }> = ({ strength }) => {
  const levels = { Mạnh: 3, "Trung bình": 2, Yếu: 1 };
  const level = levels[strength as keyof typeof levels] || 1;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= level
              ? level === 3
                ? "bg-emerald-500"
                : level === 2
                ? "bg-amber-400"
                : "bg-muted-foreground/50"
              : "bg-muted"
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{strength}</span>
    </div>
  );
};

/** Categorize signals by type for display grouping */
function categorizeSignals(signals: TechnicalSignal[]) {
  const maSignals: TechnicalSignal[] = [];
  const techSignals: TechnicalSignal[] = [];

  for (const s of signals) {
    if (
      s.indicator.includes("SMA") ||
      s.indicator.includes("EMA") ||
      s.indicator.includes("VWAP") ||
      s.indicator.includes("Ichimoku")
    ) {
      maSignals.push(s);
    } else {
      techSignals.push(s);
    }
  }
  return { maSignals, techSignals };
}

const RenderTable: React.FC<{
  items: TechnicalSignal[];
  title: string;
  icon: React.ReactNode;
}> = ({ items, title, icon }) => {
  if (items.length === 0) return null;
  return (
    <Card className="shadow-sm border-border h-full">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 text-xs text-muted-foreground font-medium">Chỉ báo</th>
                <th className="text-right py-2 text-xs text-muted-foreground font-medium">Giá trị</th>
                <th className="text-center py-2 text-xs text-muted-foreground font-medium">Tín hiệu</th>
                <th className="text-right py-2 text-xs text-muted-foreground font-medium">Độ mạnh</th>
              </tr>
            </thead>
            <tbody>
              {items.map((signal) => (
                <tr
                  key={signal.indicator}
                  className="border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-2.5 text-sm text-foreground font-medium">
                    {signal.indicator}
                  </td>
                  <td className="py-2.5 text-right font-mono text-sm text-muted-foreground">
                    {signal.value}
                  </td>
                  <td className="py-2.5 text-center">
                    <SignalBadge signal={signal.signal} />
                  </td>
                  <td className="py-2.5 text-right">
                    <StrengthDots strength={signal.strength} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const SignalTable: React.FC<SignalTableProps> = ({ signals }) => {
  const { maSignals, techSignals } = categorizeSignals(signals);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
      <div className="h-full">
        <RenderTable
          items={maSignals}
          title="Đường trung bình động"
          icon={<BarChart2 size={16} className="text-blue-500" />}
        />
      </div>
      <div className="h-full">
        <RenderTable
          items={techSignals}
          title="Chỉ báo kỹ thuật"
          icon={<Activity size={16} className="text-purple-500" />}
        />
      </div>
    </div>
  );
};

export default SignalTable;
