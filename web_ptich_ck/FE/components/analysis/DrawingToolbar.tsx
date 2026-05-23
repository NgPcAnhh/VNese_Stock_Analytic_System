"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { DrawingToolType } from "@/lib/drawingTypes";
import { DRAWING_COLORS } from "@/lib/drawingTypes";
import {
  MousePointer2,
  TrendingUp,
  Minus,
  ArrowUpDown,
  MoveRight,
  Triangle,
  RectangleHorizontal,
  Circle,
  ArrowRight,
  Type,
  Ruler,
  Eraser,
  Trash2,
  Download,
  Undo2,
  Redo2,
  Palette,
  ChevronDown,
  Columns3,
} from "lucide-react";

interface DrawingTool {
  id: DrawingToolType;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  group: string;
}

const drawingTools: DrawingTool[] = [
  { id: "cursor", label: "Con trỏ", icon: <MousePointer2 size={16} />, shortcut: "V", group: "basic" },
  { id: "trendline", label: "Đường xu hướng", icon: <TrendingUp size={16} />, shortcut: "T", group: "line" },
  { id: "horizontal", label: "Đường ngang", icon: <Minus size={16} />, shortcut: "H", group: "line" },
  { id: "vertical", label: "Đường dọc", icon: <ArrowUpDown size={16} />, shortcut: "J", group: "line" },
  { id: "ray", label: "Tia", icon: <MoveRight size={16} />, shortcut: "R", group: "line" },
  { id: "channel", label: "Kênh xu hướng", icon: <Columns3 size={16} />, shortcut: "C", group: "line" },
  { id: "fibonacci", label: "Fibonacci Retracement", icon: <Triangle size={16} />, shortcut: "F", group: "fib" },
  { id: "rectangle", label: "Hình chữ nhật", icon: <RectangleHorizontal size={16} />, shortcut: "G", group: "shape" },
  { id: "ellipse", label: "Hình elip", icon: <Circle size={16} />, shortcut: "E", group: "shape" },
  { id: "arrow", label: "Mũi tên", icon: <ArrowRight size={16} />, shortcut: "A", group: "shape" },
  { id: "text", label: "Văn bản", icon: <Type size={16} />, shortcut: "X", group: "annotation" },
  { id: "measure", label: "Đo lường", icon: <Ruler size={16} />, shortcut: "M", group: "annotation" },
  { id: "eraser", label: "Xóa từng nét", icon: <Eraser size={16} />, shortcut: "D", group: "basic" },
];

interface DrawingToolbarProps {
  activeTool: DrawingToolType;
  onToolChange: (tool: DrawingToolType) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (w: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  drawingCount: number;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onUndo,
  onRedo,
  onClearAll,
  onExport,
  canUndo,
  canRedo,
  drawingCount,
}) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [showWidthPicker, setShowWidthPicker] = React.useState(false);

  const groups = [
    { key: "basic", label: "" },
    { key: "line", label: "Đường" },
    { key: "fib", label: "Fibonacci" },
    { key: "shape", label: "Hình" },
    { key: "annotation", label: "Ghi chú" },
  ];

  return (
    <div className="flex flex-col bg-card border border-border rounded-xl shadow-sm py-1.5 w-[42px] items-center select-none">
      {groups.map((group, gi) => {
        const tools = drawingTools.filter((t) => t.group === group.key);
        if (tools.length === 0) return null;
        return (
          <React.Fragment key={group.key}>
            {gi > 0 && <div className="w-6 border-t border-border/50 my-1" />}
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg transition-all my-0.5",
                  activeTool === tool.id
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tool.icon}
              </button>
            ))}
          </React.Fragment>
        );
      })}

      {/* Divider */}
      <div className="w-6 border-t border-border/50 my-1.5" />

      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => { setShowColorPicker(!showColorPicker); setShowWidthPicker(false); }}
          title="Màu sắc"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors my-0.5"
        >
          <div className="w-4 h-4 rounded-full border-2 border-border" style={{ backgroundColor: activeColor }} />
        </button>
        {showColorPicker && (
          <div className="absolute left-full ml-2 top-0 bg-card rounded-lg shadow-lg border border-border p-2 z-50 w-[144px]">
            <div className="text-[10px] text-muted-foreground font-semibold uppercase mb-1.5 px-0.5">Màu nét vẽ</div>
            <div className="grid grid-cols-5 gap-1">
              {DRAWING_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { onColorChange(c); setShowColorPicker(false); }}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                    activeColor === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Line width */}
      <div className="relative">
        <button
          onClick={() => { setShowWidthPicker(!showWidthPicker); setShowColorPicker(false); }}
          title="Độ dày nét"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors my-0.5 text-muted-foreground"
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="bg-muted-foreground rounded-full" style={{ width: "16px", height: `${Math.max(lineWidth, 1)}px` }} />
          </div>
        </button>
        {showWidthPicker && (
          <div className="absolute left-full ml-2 top-0 bg-card rounded-lg shadow-lg border border-border p-2 z-50">
            <div className="text-[10px] text-muted-foreground font-semibold uppercase mb-1.5 px-0.5">Độ dày</div>
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4, 5].map((w) => (
                <button
                  key={w}
                  onClick={() => { onLineWidthChange(w); setShowWidthPicker(false); }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors",
                    lineWidth === w && "bg-primary/10"
                  )}
                >
                  <div className="bg-muted-foreground rounded-full" style={{ width: "24px", height: `${w}px` }} />
                  <span className="text-[10px] text-muted-foreground">{w}px</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-6 border-t border-border/50 my-1.5" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Hoàn tác (Ctrl+Z)"
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg transition-colors my-0.5",
          canUndo ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "text-border cursor-not-allowed"
        )}
      >
        <Undo2 size={15} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Làm lại (Ctrl+Y)"
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg transition-colors my-0.5",
          canRedo ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "text-border cursor-not-allowed"
        )}
      >
        <Redo2 size={15} />
      </button>

      {/* Clear all */}
      <button
        onClick={onClearAll}
        disabled={drawingCount === 0}
        title="Xóa tất cả"
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg transition-colors my-0.5",
          drawingCount > 0 ? "text-red-400 hover:bg-red-50 hover:text-red-600" : "text-border cursor-not-allowed"
        )}
      >
        <Trash2 size={15} />
      </button>

      {/* Export */}
      <button
        onClick={onExport}
        title="Lưu ảnh"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors my-0.5"
      >
        <Download size={15} />
      </button>

      {/* Drawing count badge */}
      {drawingCount > 0 && (
        <div className="mt-1 text-[9px] text-muted-foreground font-medium text-center leading-none">
          {drawingCount}
        </div>
      )}
    </div>
  );
};

export default DrawingToolbar;
