// Drawing tools types and state management for chart annotations

export type DrawingToolType =
  | "cursor"
  | "trendline"
  | "horizontal"
  | "vertical"
  | "ray"
  | "channel"
  | "fibonacci"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "text"
  | "measure"
  | "eraser";

export interface DrawingPoint {
  x: number; // pixel x
  y: number; // pixel y
  dataX?: number; // data index
  dataY?: number; // data value
}

export interface DrawingItem {
  id: string;
  tool: DrawingToolType;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  text?: string;
  fibLevels?: number[];
  completed: boolean;
  selected?: boolean;
}

export const DRAWING_COLORS = [
  "#2563EB", // blue
  "#EF4444", // red
  "#00C076", // green
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#FFFFFF", // white
  "#6B7280", // gray
];

export const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// How many click points each tool requires to complete
export function getToolPointCount(tool: DrawingToolType): number {
  switch (tool) {
    case "cursor":
    case "eraser":
      return 0;
    case "horizontal":
    case "vertical":
    case "text":
      return 1;
    case "trendline":
    case "ray":
    case "fibonacci":
    case "rectangle":
    case "ellipse":
    case "measure":
    case "arrow":
      return 2;
    case "channel":
      return 3;
    default:
      return 2;
  }
}
