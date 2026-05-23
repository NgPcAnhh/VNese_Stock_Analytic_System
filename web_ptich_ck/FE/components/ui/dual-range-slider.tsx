"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
  className?: string;
}

export function DualRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatLabel = (v) => v.toString(),
  className,
}: DualRangeSliderProps) {
  const [dragging, setDragging] = React.useState<"min" | "max" | null>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const getPercent = (val: number) => ((val - min) / (max - min)) * 100;
  const minPercent = getPercent(value[0]);
  const maxPercent = getPercent(value[1]);

  const handlePointerDown = (thumb: "min" | "max") => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(thumb);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const rawValue = min + percent * (max - min);
    const snapped = Math.round(rawValue / step) * step;
    const clamped = Math.max(min, Math.min(max, snapped));

    if (dragging === "min") {
      onChange([Math.min(clamped, value[1] - step), value[1]]);
    } else {
      onChange([value[0], Math.max(clamped, value[0] + step)]);
    }
  };

  const handlePointerUp = () => setDragging(null);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
          {formatLabel(value[0])}
        </span>
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
          {formatLabel(value[1])}
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative h-5 flex items-center cursor-pointer"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Track */}
        <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />

        {/* Active range */}
        <div
          className="absolute h-1.5 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />

        {/* Min thumb */}
        <div
          className={cn(
            "absolute w-4 h-4 bg-white border-2 border-orange-500 rounded-full shadow-md -translate-x-1/2 transition-shadow hover:shadow-lg cursor-grab z-10",
            dragging === "min" && "ring-2 ring-orange-200 cursor-grabbing scale-110"
          )}
          style={{ left: `${minPercent}%` }}
          onPointerDown={handlePointerDown("min")}
        />

        {/* Max thumb */}
        <div
          className={cn(
            "absolute w-4 h-4 bg-white border-2 border-orange-500 rounded-full shadow-md -translate-x-1/2 transition-shadow hover:shadow-lg cursor-grab z-10",
            dragging === "max" && "ring-2 ring-orange-200 cursor-grabbing scale-110"
          )}
          style={{ left: `${maxPercent}%` }}
          onPointerDown={handlePointerDown("max")}
        />
      </div>
    </div>
  );
}
