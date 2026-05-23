"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type {
  DrawingToolType,
  DrawingItem,
  DrawingPoint,
} from "@/lib/drawingTypes";
import {
  generateId,
  getToolPointCount,
  DEFAULT_FIB_LEVELS,
} from "@/lib/drawingTypes";

export interface DrawingCanvasRef {
  exportImage: () => string | null;
}

interface DrawingCanvasProps {
  activeTool: DrawingToolType;
  color: string;
  lineWidth: number;
  drawings: DrawingItem[];
  onDrawingsChange: (drawings: DrawingItem[]) => void;
  width: number;
  height: number;
  chartInst?: any;
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  ({ activeTool, color, lineWidth, drawings, onDrawingsChange, width, height, chartInst }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [currentDrawing, setCurrentDrawing] = useState<DrawingItem | null>(null);
    const [mousePos, setMousePos] = useState<DrawingPoint | null>(null);
    const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
      x: 0, y: 0, visible: false,
    });
    const [textValue, setTextValue] = useState("");
    const textInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      exportImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL("image/png");
      },
    }));

    const mapToPixel = useCallback((item: DrawingItem): DrawingItem => {
      if (!chartInst) return item;
      try {
        const pts = item.points.map(p => {
          if (p.dataX !== undefined && p.dataY !== undefined) {
             const coord = chartInst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [p.dataX, p.dataY]);
             if (coord) return { ...p, x: coord[0], y: coord[1] };
          }
          return p;
        });
        return { ...item, points: pts };
      } catch (e) {
        return item;
      }
    }, [chartInst]);

    const mapToData = useCallback((p: DrawingPoint): DrawingPoint => {
      if (!chartInst) return p;
      try {
        const dataCoord = chartInst.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [p.x, p.y]);
        if (dataCoord) return { ...p, dataX: dataCoord[0], dataY: dataCoord[1] };
      } catch (e) {}
      return p;
    }, [chartInst]);

    // Draw everything
    const drawAll = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      // Draw completed drawings
      drawings.forEach((d) => {
         const mapped = mapToPixel(d);
         drawShape(ctx, mapped, false);
      });

      // Draw current in-progress drawing with preview
      if (currentDrawing && mousePos) {
        const mappedCurrent = mapToPixel(currentDrawing);
        const preview: DrawingItem = {
          ...mappedCurrent,
          points: [...mappedCurrent.points, mousePos],
        };
        drawShape(ctx, preview, true);
      }
    }, [drawings, currentDrawing, mousePos, width, height, mapToPixel]);

    useEffect(() => {
      drawAll();
    }, [drawAll]);

    // Resize canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      drawAll();
    }, [width, height, drawAll]);

    // Link drawn lines to ECharts zoom/pan
    useEffect(() => {
      if (!chartInst) return;
      const handleChartChange = () => drawAll();
      chartInst.on('datazoom', handleChartChange);
      chartInst.on('restore', handleChartChange);
      return () => {
        if (!chartInst.isDisposed()) {
          chartInst.off('datazoom', handleChartChange);
          chartInst.off('restore', handleChartChange);
        }
      };
    }, [chartInst, drawAll]);

    function drawShape(ctx: CanvasRenderingContext2D, item: DrawingItem, isPreview: boolean) {
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = item.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (isPreview) {
        ctx.globalAlpha = 0.7;
        ctx.setLineDash([6, 4]);
      } else if (item.selected) {
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 6;
      }

      const pts = item.points;

      switch (item.tool) {
        case "trendline":
          if (pts.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.stroke();
            // Draw endpoints
            drawEndpoint(ctx, pts[0], item.color);
            drawEndpoint(ctx, pts[1], item.color);
          }
          break;

        case "horizontal":
          if (pts.length >= 1) {
            ctx.beginPath();
            ctx.moveTo(0, pts[0].y);
            ctx.lineTo(width, pts[0].y);
            ctx.stroke();
            // Label
            ctx.fillStyle = item.color;
            ctx.font = "10px monospace";
            ctx.fillText(`${pts[0].y.toFixed(0)}`, width - 40, pts[0].y - 4);
          }
          break;

        case "vertical":
          if (pts.length >= 1) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, 0);
            ctx.lineTo(pts[0].x, height);
            ctx.stroke();
          }
          break;

        case "ray":
          if (pts.length >= 2) {
            const dx = pts[1].x - pts[0].x;
            const dy = pts[1].y - pts[0].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              const extX = pts[0].x + (dx / len) * Math.max(width, height) * 2;
              const extY = pts[0].y + (dy / len) * Math.max(width, height) * 2;
              ctx.beginPath();
              ctx.moveTo(pts[0].x, pts[0].y);
              ctx.lineTo(extX, extY);
              ctx.stroke();
              drawEndpoint(ctx, pts[0], item.color);
            }
          }
          break;

        case "channel":
          if (pts.length >= 2) {
            // Main line
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.stroke();

            if (pts.length >= 3) {
              // Parallel line through 3rd point
              const dx = pts[1].x - pts[0].x;
              const dy = pts[1].y - pts[0].y;
              const offsetY = pts[2].y - pts[0].y;
              const offsetX = pts[2].x - pts[0].x;

              // Project 3rd point onto perpendicular
              const len = Math.sqrt(dx * dx + dy * dy);
              const nx = -dy / len;
              const ny = dx / len;
              const dist = offsetX * nx + offsetY * ny;

              ctx.beginPath();
              ctx.moveTo(pts[0].x + nx * dist, pts[0].y + ny * dist);
              ctx.lineTo(pts[1].x + nx * dist, pts[1].y + ny * dist);
              ctx.stroke();

              // Middle line
              ctx.globalAlpha = 0.3;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(pts[0].x + (nx * dist) / 2, pts[0].y + (ny * dist) / 2);
              ctx.lineTo(pts[1].x + (nx * dist) / 2, pts[1].y + (ny * dist) / 2);
              ctx.stroke();
              ctx.setLineDash(isPreview ? [6, 4] : []);
              ctx.globalAlpha = isPreview ? 0.7 : 1;

              // Fill channel
              ctx.globalAlpha = 0.06;
              ctx.beginPath();
              ctx.moveTo(pts[0].x, pts[0].y);
              ctx.lineTo(pts[1].x, pts[1].y);
              ctx.lineTo(pts[1].x + nx * dist, pts[1].y + ny * dist);
              ctx.lineTo(pts[0].x + nx * dist, pts[0].y + ny * dist);
              ctx.closePath();
              ctx.fill();
              ctx.globalAlpha = isPreview ? 0.7 : 1;
            }
          }
          break;

        case "fibonacci":
          if (pts.length >= 2) {
            const levels = item.fibLevels || DEFAULT_FIB_LEVELS;
            const top = Math.min(pts[0].y, pts[1].y);
            const bottom = Math.max(pts[0].y, pts[1].y);
            const range = bottom - top;
            const left = Math.min(pts[0].x, pts[1].x);
            const right = Math.max(pts[0].x, pts[1].x);

            const fibColors = [
              "rgba(239,68,68,0.12)",
              "rgba(249,115,22,0.1)",
              "rgba(245,158,11,0.08)",
              "rgba(34,197,94,0.08)",
              "rgba(6,182,212,0.08)",
              "rgba(139,92,246,0.1)",
              "rgba(236,72,153,0.12)",
            ];

            levels.forEach((level, i) => {
              const y = bottom - level * range;

              // Background band
              if (i < levels.length - 1) {
                const nextY = bottom - levels[i + 1] * range;
                ctx.fillStyle = fibColors[i % fibColors.length];
                ctx.fillRect(left, Math.min(y, nextY), right - left, Math.abs(nextY - y));
              }

              // Line
              ctx.strokeStyle = item.color;
              ctx.globalAlpha = isPreview ? 0.5 : 0.7;
              ctx.setLineDash(level === 0 || level === 1 ? [] : [4, 3]);
              ctx.beginPath();
              ctx.moveTo(left, y);
              ctx.lineTo(right, y);
              ctx.stroke();

              // Label
              ctx.globalAlpha = isPreview ? 0.7 : 1;
              ctx.fillStyle = item.color;
              ctx.font = "bold 10px sans-serif";
              ctx.setLineDash([]);
              ctx.fillText(
                `${(level * 100).toFixed(1)}%`,
                right + 4,
                y + 3
              );
            });
          }
          break;

        case "rectangle":
          if (pts.length >= 2) {
            const x = Math.min(pts[0].x, pts[1].x);
            const y = Math.min(pts[0].y, pts[1].y);
            const w = Math.abs(pts[1].x - pts[0].x);
            const h = Math.abs(pts[1].y - pts[0].y);
            ctx.strokeRect(x, y, w, h);
            ctx.globalAlpha = 0.06;
            ctx.fillRect(x, y, w, h);
          }
          break;

        case "ellipse":
          if (pts.length >= 2) {
            const cx = (pts[0].x + pts[1].x) / 2;
            const cy = (pts[0].y + pts[1].y) / 2;
            const rx = Math.abs(pts[1].x - pts[0].x) / 2;
            const ry = Math.abs(pts[1].y - pts[0].y) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.06;
            ctx.fill();
          }
          break;

        case "arrow":
          if (pts.length >= 2) {
            const headLen = 12;
            const dx = pts[1].x - pts[0].x;
            const dy = pts[1].y - pts[0].y;
            const angle = Math.atan2(dy, dx);
            // Line
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.stroke();
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(pts[1].x, pts[1].y);
            ctx.lineTo(
              pts[1].x - headLen * Math.cos(angle - Math.PI / 6),
              pts[1].y - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              pts[1].x - headLen * Math.cos(angle + Math.PI / 6),
              pts[1].y - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
          break;

        case "text":
          if (pts.length >= 1 && item.text) {
            ctx.font = `${Math.max(12, item.lineWidth * 4)}px sans-serif`;
            ctx.fillStyle = item.color;
            ctx.globalAlpha = 1;
            ctx.fillText(item.text, pts[0].x, pts[0].y);
          }
          break;

        case "measure":
          if (pts.length >= 2) {
            const dx = pts[1].x - pts[0].x;
            const dy = pts[1].y - pts[0].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Line
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.stroke();
            // Endpoints
            drawEndpoint(ctx, pts[0], item.color);
            drawEndpoint(ctx, pts[1], item.color);
            // Label in middle
            const mx = (pts[0].x + pts[1].x) / 2;
            const my = (pts[0].y + pts[1].y) / 2;
            const pxLabel = `${dist.toFixed(0)}px`;
            ctx.globalAlpha = 1;
            ctx.font = "bold 11px monospace";
            // Background
            const metrics = ctx.measureText(pxLabel);
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(mx - metrics.width / 2 - 4, my - 16, metrics.width + 8, 18);
            ctx.fillStyle = "#fff";
            ctx.fillText(pxLabel, mx - metrics.width / 2, my - 3);
          }
          break;
      }
      ctx.restore();
    }

    function drawEndpoint(ctx: CanvasRenderingContext2D, pt: DrawingPoint, color: string) {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Check if a point is near a drawing (for eraser / selection)
    function isNearDrawing(item: DrawingItem, px: number, py: number, threshold: number = 8): boolean {
      for (let i = 0; i < item.points.length - 1; i++) {
        const p1 = item.points[i];
        const p2 = item.points[i + 1];
        const dist = pointToLineDistance(px, py, p1.x, p1.y, p2.x, p2.y);
        if (dist < threshold) return true;
      }
      // For single-point tools
      if (item.points.length === 1) {
        const p = item.points[0];
        const d = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);
        if (d < threshold * 2) return true;
      }
      // For shapes, check inside
      if (item.tool === "rectangle" && item.points.length >= 2) {
        const x1 = Math.min(item.points[0].x, item.points[1].x);
        const y1 = Math.min(item.points[0].y, item.points[1].y);
        const x2 = Math.max(item.points[0].x, item.points[1].x);
        const y2 = Math.max(item.points[0].y, item.points[1].y);
        if (px >= x1 && px <= x2 && py >= y1 && py <= y2) return true;
      }
      if (item.tool === "horizontal" && item.points.length >= 1) {
        if (Math.abs(py - item.points[0].y) < threshold) return true;
      }
      if (item.tool === "vertical" && item.points.length >= 1) {
        if (Math.abs(px - item.points[0].x) < threshold) return true;
      }
      return false;
    }

    function pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
      let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }

    // Mouse handlers
    const getCanvasPos = (e: React.MouseEvent): DrawingPoint => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      return mapToData(pos);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return; // left click only
      const pos = getCanvasPos(e);

      if (activeTool === "cursor") {
        // Select / deselect drawings
        const updated = drawings.map((d) => ({
          ...d,
          selected: isNearDrawing(mapToPixel(d), pos.x, pos.y),
        }));
        onDrawingsChange(updated);
        return;
      }

      if (activeTool === "eraser") {
        const remaining = drawings.filter((d) => !isNearDrawing(mapToPixel(d), pos.x, pos.y));
        if (remaining.length !== drawings.length) {
          onDrawingsChange(remaining);
        }
        return;
      }

      if (activeTool === "text") {
        setTextInput({ x: pos.x, y: pos.y, visible: true });
        setTextValue("");
        setTimeout(() => textInputRef.current?.focus(), 50);
        return;
      }

      const neededPoints = getToolPointCount(activeTool);

      if (!currentDrawing) {
        // Start new drawing
        const newDrawing: DrawingItem = {
          id: generateId(),
          tool: activeTool,
          points: [pos],
          color,
          lineWidth,
          fibLevels: activeTool === "fibonacci" ? DEFAULT_FIB_LEVELS : undefined,
          completed: neededPoints <= 1,
        };

        if (neededPoints <= 1) {
          onDrawingsChange([...drawings, newDrawing]);
          setCurrentDrawing(null);
        } else {
          setCurrentDrawing(newDrawing);
        }
      } else {
        // Add point to current drawing
        const updatedPoints = [...currentDrawing.points, pos];
        if (updatedPoints.length >= neededPoints) {
          // Complete the drawing
          const completed: DrawingItem = {
            ...currentDrawing,
            points: updatedPoints,
            completed: true,
          };
          onDrawingsChange([...drawings, completed]);
          setCurrentDrawing(null);
          setMousePos(null);
        } else {
          setCurrentDrawing({ ...currentDrawing, points: updatedPoints });
        }
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (currentDrawing) {
        setMousePos(getCanvasPos(e));
      }

      // Eraser hover highlight
      if (activeTool === "eraser") {
        const pos = getCanvasPos(e);
        const updated = drawings.map((d) => ({
          ...d,
          selected: isNearDrawing(mapToPixel(d), pos.x, pos.y),
        }));
        // Only update if selection changed
        const changed = updated.some((d, i) => d.selected !== drawings[i].selected);
        if (changed) {
          onDrawingsChange(updated);
        }
      }
    };

    const handleRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      // Cancel current drawing
      if (currentDrawing) {
        setCurrentDrawing(null);
        setMousePos(null);
      }
    };

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape" && currentDrawing) {
          setCurrentDrawing(null);
          setMousePos(null);
        }
        // Delete selected drawings
        if (e.key === "Delete" || e.key === "Backspace") {
          if (textInput.visible) return;
          const remaining = drawings.filter((d) => !d.selected);
          if (remaining.length !== drawings.length) {
            onDrawingsChange(remaining);
          }
        }
      },
      [currentDrawing, drawings, onDrawingsChange, textInput.visible]
    );

    useEffect(() => {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const handleTextSubmit = () => {
      if (textValue.trim()) {
        const newDrawing: DrawingItem = {
          id: generateId(),
          tool: "text",
          points: [{ x: textInput.x, y: textInput.y }],
          color,
          lineWidth,
          text: textValue.trim(),
          completed: true,
        };
        onDrawingsChange([...drawings, newDrawing]);
      }
      setTextInput({ ...textInput, visible: false });
      setTextValue("");
    };

    const cursorStyle = (() => {
      switch (activeTool) {
        case "cursor": return "default";
        case "eraser": return "pointer";
        case "text": return "text";
        default: return "crosshair";
      }
    })();

    return (
      <div className="absolute inset-0" style={{ pointerEvents: activeTool === "cursor" && !drawings.some(d => d.selected) ? "none" : "auto" }}>
        <canvas
          ref={canvasRef}
          data-drawing="true"
          width={width}
          height={height}
          className="absolute inset-0"
          style={{ cursor: cursorStyle }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onContextMenu={handleRightClick}
          onWheel={(e) => {
            // Forward wheel events to ECharts canvas underneath for zoom
            e.stopPropagation();
            const echartsCanvas = canvasRef.current?.parentElement?.parentElement?.querySelector('canvas:not([data-drawing])') as HTMLCanvasElement;
            if (echartsCanvas) {
              const wheelEvent = new WheelEvent('wheel', {
                deltaX: e.deltaX,
                deltaY: e.deltaY,
                deltaZ: e.deltaZ,
                deltaMode: e.deltaMode,
                clientX: e.clientX,
                clientY: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                bubbles: true,
                cancelable: true,
              });
              echartsCanvas.dispatchEvent(wheelEvent);
            }
          }}
        />

        {/* Text input overlay */}
        {textInput.visible && (
          <div
            className="absolute z-50"
            style={{ left: textInput.x, top: textInput.y - 30 }}
          >
            <input
              ref={textInputRef}
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTextSubmit();
                if (e.key === "Escape") {
                  setTextInput({ ...textInput, visible: false });
                  setTextValue("");
                }
              }}
              onBlur={handleTextSubmit}
              placeholder="Nhập ghi chú..."
              className="px-2 py-1 text-sm border border-primary rounded-md shadow-lg bg-white outline-none focus:ring-2 focus:ring-primary/30 min-w-[120px]"
              style={{ color }}
            />
          </div>
        )}
      </div>
    );
  }
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
