"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import TechnicalChart from "./TechnicalChart";
import DrawingToolbar from "./DrawingToolbar";
import DrawingCanvas, { type DrawingCanvasRef } from "./DrawingCanvas";
import type { DrawingToolType, DrawingItem } from "@/lib/drawingTypes";
import type { StockAnalysisData } from "@/lib/technicalAnalysisData";

interface ChartWithDrawingProps {
  data: StockAnalysisData;
  overlays: string[];
  subIndicator: string;
}

const ChartWithDrawing: React.FC<ChartWithDrawingProps> = ({
  data,
  overlays,
  subIndicator,
}) => {
  const [activeTool, setActiveTool] = useState<DrawingToolType>("cursor");
  const [activeColor, setActiveColor] = useState("#2563EB");
  const [lineWidth, setLineWidth] = useState(2);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [history, setHistory] = useState<DrawingItem[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [chartInst, setChartInst] = useState<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // History management
  const pushHistory = useCallback(
    (newDrawings: DrawingItem[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newDrawings);
      // Limit history to 50 steps
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const handleDrawingsChange = useCallback(
    (newDrawings: DrawingItem[]) => {
      setDrawings(newDrawings);
      // Only push to history for completed drawings (not hover highlights)
      const prevCompleted = drawings.filter((d) => d.completed).length;
      const newCompleted = newDrawings.filter((d) => d.completed).length;
      const prevTotal = drawings.length;
      const newTotal = newDrawings.length;
      if (newCompleted !== prevCompleted || newTotal !== prevTotal) {
        pushHistory(newDrawings);
      }
    },
    [drawings, pushHistory]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDrawings(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDrawings(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleClearAll = useCallback(() => {
    const empty: DrawingItem[] = [];
    setDrawings(empty);
    pushHistory(empty);
  }, [pushHistory]);

  const handleExport = useCallback(() => {
    // Get chart + drawings composite
    const container = containerRef.current;
    if (!container) return;

    // Get the ECharts canvas
    const echartsCanvas = container.querySelector("canvas:not([data-drawing])") as HTMLCanvasElement;
    const drawingData = drawingCanvasRef.current?.exportImage();

    if (!echartsCanvas) return;

    // Create composite canvas
    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = containerSize.width;
    compositeCanvas.height = containerSize.height;
    const ctx = compositeCanvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

    // Draw echarts
    ctx.drawImage(echartsCanvas, 0, 0);

    // Draw annotations
    if (drawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        // Download
        const link = document.createElement("a");
        link.download = `${data.ticker}_analysis_${new Date().toISOString().split("T")[0]}.png`;
        link.href = compositeCanvas.toDataURL("image/png");
        link.click();
      };
      img.src = drawingData;
    } else {
      const link = document.createElement("a");
      link.download = `${data.ticker}_analysis_${new Date().toISOString().split("T")[0]}.png`;
      link.href = compositeCanvas.toDataURL("image/png");
      link.click();
    }
  }, [containerSize, data.ticker]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Ctrl+Z / Ctrl+Y
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          handleUndo();
        }
        if (e.key === "y") {
          e.preventDefault();
          handleRedo();
        }
        return;
      }

      // Shortcut keys for tools
      const shortcuts: Record<string, DrawingToolType> = {
        v: "cursor",
        t: "trendline",
        h: "horizontal",
        j: "vertical",
        r: "ray",
        c: "channel",
        f: "fibonacci",
        g: "rectangle",
        e: "ellipse",
        a: "arrow",
        x: "text",
        m: "measure",
        d: "eraser",
      };
      const tool = shortcuts[e.key.toLowerCase()];
      if (tool) {
        setActiveTool(tool);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  const completedCount = drawings.filter((d) => d.completed).length;

  return (
    <div className="flex h-full">
      {/* Drawing Toolbar - Left side */}
      <div className="flex-shrink-0 p-1.5 flex items-start">
        <DrawingToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={setActiveColor}
          lineWidth={lineWidth}
          onLineWidthChange={setLineWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearAll={handleClearAll}
          onExport={handleExport}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          drawingCount={completedCount}
        />
      </div>

      {/* Chart + Drawing area */}
      <div className="flex-1 min-w-0 relative" ref={containerRef}>
        {/* ECharts underneath */}
        <TechnicalChart data={data} overlays={overlays} subIndicator={subIndicator} onChartReady={setChartInst} />

        {/* Drawing canvas overlay */}
        {containerSize.width > 0 && containerSize.height > 0 && (
          <DrawingCanvas
            ref={drawingCanvasRef}
            activeTool={activeTool}
            color={activeColor}
            lineWidth={lineWidth}
            drawings={drawings}
            onDrawingsChange={handleDrawingsChange}
            width={containerSize.width}
            height={containerSize.height}
            chartInst={chartInst}
          />
        )}
      </div>
    </div>
  );
};

export default ChartWithDrawing;
