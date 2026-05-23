"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ChartWithDrawing from "@/components/analysis/ChartWithDrawing";
import AnalysisSummary from "@/components/analysis/AnalysisSummary";
import SignalTable from "@/components/analysis/SignalTable";
import IndicatorSelector from "@/components/analysis/IndicatorSelector";
import AnalysisHeader from "@/components/analysis/AnalysisHeader";
import StockSearchBar from "@/components/analysis/StockSearchBar";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { Footer } from "@/components/layout/Footer";
import {
  ChartCandlestick,
  ListChecks,
  BarChart3,
  Settings2,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  Maximize,
  Minimize,
} from "lucide-react";
import { use } from "react";

interface AnalysisPageProps {
  params: Promise<{ ticker: string }>;
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { ticker } = use(params);
  const { data, loading, error } = useAnalysisData(ticker);

  const [selectedOverlays, setSelectedOverlays] = useState<string[]>([]);
  const [selectedSubIndicator, setSelectedSubIndicator] = useState("none");
  const [activeTab, setActiveTab] = useState("chart");
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!chartContainerRef.current) return;
    if (!document.fullscreenElement) {
      chartContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Đang tải dữ liệu {ticker.toUpperCase()}...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-500 font-medium">Không thể tải dữ liệu</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-3 py-3 space-y-3">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <StockSearchBar currentTicker={data.ticker} className="flex-1 max-w-md" />
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Phân tích kỹ thuật</span>
            <span>/</span>
            <span className="font-semibold text-foreground">{data.ticker}</span>
          </div>
        </div>

        {/* Header */}
        <AnalysisHeader data={data} />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border shadow-sm p-1 h-auto">
            <TabsTrigger
              value="chart"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <ChartCandlestick size={14} />
              Biểu đồ
            </TabsTrigger>
            <TabsTrigger
              value="signals"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <ListChecks size={14} />
              Tín hiệu
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <BarChart3 size={14} />
              Tổng hợp
            </TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
          <TabsContent value="chart" className="mt-3">
            <div className="flex gap-3">
              {/* Chart Area */}
              <div className="flex-1 min-w-0">
                <div
                  ref={chartContainerRef}
                  className={isFullscreen ? "bg-background w-full h-full" : ""}
                >
                  <Card className="shadow-sm border-border overflow-hidden relative">
                    {/* Fullscreen toggle button */}
                    <button
                      onClick={toggleFullscreen}
                      className="absolute top-2 right-2 z-20 w-8 h-8 bg-card/90 hover:bg-card border border-border rounded-lg shadow-sm flex items-center justify-center transition-colors group"
                      title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"}
                    >
                      {isFullscreen ? (
                        <Minimize size={15} className="text-muted-foreground group-hover:text-primary" />
                      ) : (
                        <Maximize size={15} className="text-muted-foreground group-hover:text-primary" />
                      )}
                    </button>
                    <CardContent className="p-0" style={{ height: isFullscreen ? "100vh" : "650px" }}>
                      <ChartWithDrawing
                        data={data}
                        overlays={selectedOverlays}
                        subIndicator={selectedSubIndicator === "none" ? "" : selectedSubIndicator}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Indicator Panel */}
              {!isFullscreen && (
                <div className="relative">
                  <button
                    onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
                    className="absolute -left-3 top-3 z-10 w-6 h-6 bg-card border border-border rounded-full shadow-sm flex items-center justify-center hover:bg-muted/50 transition-colors"
                    title={showIndicatorPanel ? "Ẩn bảng chỉ báo" : "Hiện bảng chỉ báo"}
                  >
                    {showIndicatorPanel ? <PanelLeftClose size={12} /> : <PanelLeft size={12} />}
                  </button>

                  {showIndicatorPanel && (
                    <Card className="shadow-sm border-border w-[260px] flex-shrink-0 overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                        <Settings2 size={14} className="text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Chỉ báo kỹ thuật</span>
                      </div>
                      <CardContent className="p-2 max-h-[570px] overflow-y-auto">
                        <IndicatorSelector
                          selectedOverlays={selectedOverlays}
                          onOverlaysChange={setSelectedOverlays}
                          selectedSubIndicator={selectedSubIndicator}
                          onSubIndicatorChange={setSelectedSubIndicator}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Summary + signal tables below chart */}
            <div className="mt-3 space-y-3">
              <AnalysisSummary summary={data.summary} currentPrice={data.currentPrice} mode="columns" />
              <SignalTable signals={data.signals} />
            </div>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="mt-3">
            <SignalTable signals={data.signals} />
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-3">
            <div className="space-y-3">
              <AnalysisSummary summary={data.summary} currentPrice={data.currentPrice} mode="columns" />
              <SignalTable signals={data.signals} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
