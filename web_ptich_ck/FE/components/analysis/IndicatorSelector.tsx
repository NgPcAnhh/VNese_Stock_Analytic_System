"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Activity,
  Waves,
  TrendingUp,
  ArrowLeftRight,
  LineChart,
  Mountain,
  Gauge,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface IndicatorConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface IndicatorSelectorProps {
  selectedOverlays: string[];
  onOverlaysChange: (overlays: string[]) => void;
  selectedSubIndicator: string;
  onSubIndicatorChange: (indicator: string) => void;
}

const overlayIndicators: IndicatorConfig[] = [
  { id: "sma20", name: "SMA 20", icon: <LineChart size={14} />, description: "Đường trung bình giản đơn 20 phiên" },
  { id: "sma50", name: "SMA 50", icon: <LineChart size={14} />, description: "Đường trung bình giản đơn 50 phiên" },
  { id: "sma100", name: "SMA 100", icon: <LineChart size={14} />, description: "Đường trung bình giản đơn 100 phiên" },
  { id: "sma200", name: "SMA 200", icon: <LineChart size={14} />, description: "Đường trung bình giản đơn 200 phiên" },
  { id: "ema12", name: "EMA 12", icon: <TrendingUp size={14} />, description: "Đường trung bình hàm mũ 12 phiên" },
  { id: "ema26", name: "EMA 26", icon: <TrendingUp size={14} />, description: "Đường trung bình hàm mũ 26 phiên" },
  { id: "vwap", name: "VWAP", icon: <Activity size={14} />, description: "Giá trung bình theo khối lượng" },
  { id: "bollinger", name: "Bollinger Bands", icon: <ArrowLeftRight size={14} />, description: "Dải Bollinger (20, 2)" },
  { id: "ichimoku", name: "Ichimoku Cloud", icon: <Mountain size={14} />, description: "Mây Ichimoku" },
  { id: "keltner", name: "Keltner Channels", icon: <Waves size={14} />, description: "Kênh Keltner (20, 2)" },
  { id: "psar", name: "Parabolic SAR", icon: <Activity size={14} />, description: "Dừng và đảo chiều (0.02, 0.2)" },
];

const subIndicators: IndicatorConfig[] = [
  { id: "none", name: "Không hiển thị", icon: <BarChart3 size={14} />, description: "Ẩn panel chỉ báo phụ" },
  { id: "rsi", name: "RSI", icon: <Gauge size={14} />, description: "Chỉ số sức mạnh tương đối (14)" },
  { id: "macd", name: "MACD", icon: <Activity size={14} />, description: "Đường MACD (12, 26, 9)" },
  { id: "stochastic", name: "Stochastic", icon: <Waves size={14} />, description: "Stochastic Oscillator (14, 3)" },
  { id: "williams", name: "Williams %R", icon: <BarChart3 size={14} />, description: "Williams %R (14)" },
  { id: "cci", name: "CCI", icon: <Activity size={14} />, description: "Commodity Channel Index (20)" },
  { id: "adx", name: "ADX", icon: <TrendingUp size={14} />, description: "Average Directional Index (14)" },
  { id: "mfi", name: "Money Flow Index", icon: <Activity size={14} />, description: "Chỉ số dòng tiền (14)" },
];

const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({
  selectedOverlays,
  onOverlaysChange,
  selectedSubIndicator,
  onSubIndicatorChange,
}) => {
  const [expandOverlays, setExpandOverlays] = React.useState(true);
  const [expandSub, setExpandSub] = React.useState(true);

  const toggleOverlay = (id: string) => {
    if (selectedOverlays.includes(id)) {
      onOverlaysChange(selectedOverlays.filter((o) => o !== id));
    } else {
      onOverlaysChange([...selectedOverlays, id]);
    }
  };

  return (
    <div className="space-y-1">
      {/* Overlay Indicators */}
      <div>
        <button
          onClick={() => setExpandOverlays(!expandOverlays)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded-lg transition-colors"
        >
          <span>Chỉ báo trên biểu đồ</span>
          {expandOverlays ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expandOverlays && (
          <div className="space-y-0.5 mt-1">
            {overlayIndicators.map((ind) => {
              const isSelected = selectedOverlays.includes(ind.id);
              return (
                <button
                  key={ind.id}
                  onClick={() => toggleOverlay(ind.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all",
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
                      isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {ind.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{ind.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{ind.description}</div>
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary border-primary" : "border-border"
                    )}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub Indicators */}
      <div>
        <button
          onClick={() => setExpandSub(!expandSub)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded-lg transition-colors"
        >
          <span>Chỉ báo phụ</span>
          {expandSub ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expandSub && (
          <div className="space-y-0.5 mt-1">
            {subIndicators.map((ind) => {
              const isSelected = selectedSubIndicator === ind.id;
              return (
                <button
                  key={ind.id}
                  onClick={() => onSubIndicatorChange(ind.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all",
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
                      isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {ind.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{ind.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{ind.description}</div>
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected ? "border-primary" : "border-border"
                    )}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndicatorSelector;
