"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { OHLCVItem } from "@/lib/technicalAnalysisData";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart3,
  Zap,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MLPredictionProps {
  ohlcv: OHLCVItem[];
  ticker: string;
  currentPrice: number;
}

/* ═══════════════════════════════════════════════
   Utility: Solve linear system via Gaussian Elimination
   For polynomial normal equations (3x3 for degree 2)
   ═══════════════════════════════════════════════ */

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    if (Math.abs(M[col][col]) < 1e-12) continue;

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = M[row][n];
    for (let j = row + 1; j < n; j++) {
      sum -= M[row][j] * x[j];
    }
    x[row] = Math.abs(M[row][row]) > 1e-12 ? sum / M[row][row] : 0;
  }
  return x;
}

/* ═══════════════════════════════════════════════
   1. Polynomial Regression Forecast (Degree 2)
   Higher R² than simple linear regression
   ═══════════════════════════════════════════════ */

interface RegressionResult {
  predictedPrices: { day: number; price: number; lower: number; upper: number }[];
  coefficients: number[]; // [a, b, c] for ax² + bx + c
  r2: number;
  trend: "up" | "down" | "neutral";
  confidence: number;
  metrics: ClassificationMetrics;
}

interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  totalSamples: number;
}

function polynomialRegressionForecast(
  ohlcv: OHLCVItem[],
  lookback = 30,
  forecastDays = 5,
  degree = 2
): RegressionResult {
  const prices = ohlcv.slice(-lookback).map((d) => d.close);
  const n = prices.length;

  // Build normal equations for polynomial fit: y = a0 + a1*x + a2*x² (+ a3*x³ ...)
  const order = degree + 1;

  // Construct X^T * X matrix and X^T * y vector
  const XtX: number[][] = Array.from({ length: order }, () => new Array(order).fill(0));
  const Xty: number[] = new Array(order).fill(0);

  // Precompute sums of x^k
  const powSums: number[] = new Array(2 * degree + 1).fill(0);
  for (let i = 0; i < n; i++) {
    let xp = 1;
    for (let k = 0; k <= 2 * degree; k++) {
      powSums[k] += xp;
      xp *= i;
    }
  }

  for (let r = 0; r < order; r++) {
    for (let c = 0; c < order; c++) {
      XtX[r][c] = powSums[r + c];
    }
    // X^T * y
    for (let i = 0; i < n; i++) {
      Xty[r] += Math.pow(i, r) * prices[i];
    }
  }

  // Solve for coefficients [a0, a1, a2, ...]
  const coeffs = solveLinearSystem(XtX, Xty);

  // Evaluate polynomial
  const evalPoly = (x: number) => {
    let val = 0;
    for (let k = 0; k < coeffs.length; k++) {
      val += coeffs[k] * Math.pow(x, k);
    }
    return val;
  };

  // R² calculation
  const meanY = prices.reduce((a, b) => a + b, 0) / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = evalPoly(i);
    ssTot += (prices[i] - meanY) ** 2;
    ssRes += (prices[i] - yHat) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Standard error
  const se = Math.sqrt(ssRes / Math.max(n - order, 1));

  // Forecast next days
  const predictedPrices = [];
  for (let d = 1; d <= forecastDays; d++) {
    const x = n - 1 + d;
    const pred = evalPoly(x);
    // Approximate CI: use leverage-like correction
    const meanX = (n - 1) / 2;
    let ssX = 0;
    for (let i = 0; i < n; i++) ssX += (i - meanX) ** 2;
    const margin = 1.96 * se * Math.sqrt(1 + 1 / n + (x - meanX) ** 2 / (ssX || 1));
    predictedPrices.push({
      day: d,
      price: Math.round(pred),
      lower: Math.round(pred - margin),
      upper: Math.round(pred + margin),
    });
  }

  const lastPred = predictedPrices[predictedPrices.length - 1].price;
  const currentLast = prices[prices.length - 1];
  const changePct = ((lastPred - currentLast) / currentLast) * 100;

  // Backtesting for classification metrics
  const metrics = backtestPolynomialRegression(ohlcv, lookback, degree);

  return {
    predictedPrices,
    coefficients: coeffs,
    r2: Math.max(0, Math.min(1, r2)),
    trend: changePct > 0.5 ? "up" : changePct < -0.5 ? "down" : "neutral",
    confidence: Math.min(99, Math.max(30, Math.round(r2 * 100))),
    metrics,
  };
}

/* ═══════════════════════════════════════════════
   Backtesting: Polynomial Regression Classification
   Rolling window backtest to compute accuracy/precision/recall
   ═══════════════════════════════════════════════ */

function backtestPolynomialRegression(
  ohlcv: OHLCVItem[],
  lookback: number,
  degree: number
): ClassificationMetrics {
  const prices = ohlcv.map((d) => d.close);
  const n = prices.length;
  const testWindow = Math.min(60, Math.floor(n * 0.3));
  const startIdx = Math.max(lookback + 1, n - testWindow);

  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (let t = startIdx; t < n - 1; t++) {
    const windowPrices = prices.slice(Math.max(0, t - lookback), t);
    const wn = windowPrices.length;
    if (wn < 10) continue;

    // Fit polynomial on window
    const order = degree + 1;
    const powSums: number[] = new Array(2 * degree + 1).fill(0);
    for (let i = 0; i < wn; i++) {
      let xp = 1;
      for (let k = 0; k <= 2 * degree; k++) {
        powSums[k] += xp;
        xp *= i;
      }
    }

    const XtX: number[][] = Array.from({ length: order }, () => new Array(order).fill(0));
    const Xty: number[] = new Array(order).fill(0);
    for (let r = 0; r < order; r++) {
      for (let c = 0; c < order; c++) {
        XtX[r][c] = powSums[r + c];
      }
      for (let i = 0; i < wn; i++) {
        Xty[r] += Math.pow(i, r) * windowPrices[i];
      }
    }

    const coeffs = solveLinearSystem(XtX, Xty);

    // Predict next day direction
    const nextX = wn;
    let pred = 0;
    for (let k = 0; k < coeffs.length; k++) {
      pred += coeffs[k] * Math.pow(nextX, k);
    }

    const predictedUp = pred > windowPrices[wn - 1];
    const actualUp = prices[t + 1] > prices[t];

    if (predictedUp && actualUp) tp++;
    else if (predictedUp && !actualUp) fp++;
    else if (!predictedUp && !actualUp) tn++;
    else fn++;
  }

  const total = tp + fp + tn + fn;
  return {
    accuracy: total > 0 ? Math.round(((tp + tn) / total) * 100) : 0,
    precision: tp + fp > 0 ? Math.round((tp / (tp + fp)) * 100) : 0,
    recall: tp + fn > 0 ? Math.round((tp / (tp + fn)) * 100) : 0,
    f1: tp + fp > 0 && tp + fn > 0
      ? Math.round((2 * tp / (2 * tp + fp + fn)) * 100)
      : 0,
    totalSamples: total,
  };
}

/* ═══════════════════════════════════════════════
   2. Pattern Matching (KNN-Based Direction Prediction)
   ═══════════════════════════════════════════════ */

interface PatternResult {
  direction: "up" | "down" | "neutral";
  probability: number;
  avgReturn: number;
  matchCount: number;
  historicalWinRate: number;
  metrics: ClassificationMetrics;
}

function knnPatternPrediction(
  ohlcv: OHLCVItem[],
  patternLength = 10,
  k = 5
): PatternResult {
  const prices = ohlcv.map((d) => d.close);
  const n = prices.length;

  if (n < patternLength + 10) {
    return {
      direction: "neutral",
      probability: 50,
      avgReturn: 0,
      matchCount: 0,
      historicalWinRate: 50,
      metrics: { accuracy: 0, precision: 0, recall: 0, f1: 0, totalSamples: 0 },
    };
  }

  // Normalize current pattern: relative returns
  const currentPattern: number[] = [];
  for (let i = n - patternLength; i < n; i++) {
    currentPattern.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  // Find similar historical patterns
  interface Match {
    distance: number;
    futureReturn: number;
  }

  const matches: Match[] = [];

  for (let start = patternLength; start < n - patternLength - 1; start++) {
    const pattern: number[] = [];
    for (let i = start; i < start + patternLength; i++) {
      pattern.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    // Euclidean distance
    let dist = 0;
    for (let j = 0; j < patternLength; j++) {
      dist += (pattern[j] - currentPattern[j]) ** 2;
    }
    dist = Math.sqrt(dist);

    // Next-day return after this historical pattern
    const nextIdx = start + patternLength;
    if (nextIdx < n) {
      const futureReturn = (prices[nextIdx] - prices[nextIdx - 1]) / prices[nextIdx - 1];
      matches.push({ distance: dist, futureReturn });
    }
  }

  // Sort by distance, pick K nearest
  matches.sort((a, b) => a.distance - b.distance);
  const kNearest = matches.slice(0, Math.min(k, matches.length));

  if (kNearest.length === 0) {
    return {
      direction: "neutral",
      probability: 50,
      avgReturn: 0,
      matchCount: 0,
      historicalWinRate: 50,
      metrics: { accuracy: 0, precision: 0, recall: 0, f1: 0, totalSamples: 0 },
    };
  }

  // Weight by inverse distance
  let totalWeight = 0;
  let weightedReturn = 0;
  let upCount = 0;

  for (const m of kNearest) {
    const w = 1 / (m.distance + 1e-8);
    totalWeight += w;
    weightedReturn += w * m.futureReturn;
    if (m.futureReturn > 0) upCount++;
  }

  const avgReturn = (weightedReturn / totalWeight) * 100;
  const winRate = (upCount / kNearest.length) * 100;

  // Overall historical win rate (for context)
  const allUp = matches.filter((m) => m.futureReturn > 0).length;
  const historicalWinRate =
    matches.length > 0 ? (allUp / matches.length) * 100 : 50;

  const direction =
    avgReturn > 0.1 ? "up" : avgReturn < -0.1 ? "down" : "neutral";
  const probability = Math.min(
    95,
    Math.max(30, Math.round(Math.abs(avgReturn) * 50 + winRate * 0.5))
  );

  // Backtesting for classification metrics
  const metrics = backtestKNN(ohlcv, patternLength, k);

  return {
    direction,
    probability,
    avgReturn: Math.round(avgReturn * 100) / 100,
    matchCount: kNearest.length,
    historicalWinRate: Math.round(historicalWinRate),
    metrics,
  };
}

/* ═══════════════════════════════════════════════
   Backtesting: KNN Classification
   ═══════════════════════════════════════════════ */

function backtestKNN(
  ohlcv: OHLCVItem[],
  patternLength: number,
  k: number
): ClassificationMetrics {
  const prices = ohlcv.map((d) => d.close);
  const n = prices.length;
  const testWindow = Math.min(60, Math.floor(n * 0.3));
  const startIdx = Math.max(patternLength + k + 2, n - testWindow);

  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (let t = startIdx; t < n - 1; t++) {
    // Current pattern ending at t
    if (t < patternLength + 1) continue;
    const currentPat: number[] = [];
    for (let i = t - patternLength; i < t; i++) {
      currentPat.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    // Find KNN in data before t
    const localMatches: { distance: number; futureReturn: number }[] = [];
    for (let start = patternLength; start < t - patternLength; start++) {
      const pat: number[] = [];
      for (let i = start; i < start + patternLength; i++) {
        pat.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
      let dist = 0;
      for (let j = 0; j < patternLength; j++) {
        dist += (pat[j] - currentPat[j]) ** 2;
      }
      dist = Math.sqrt(dist);
      const nextIdx = start + patternLength;
      if (nextIdx < t) {
        localMatches.push({
          distance: dist,
          futureReturn: (prices[nextIdx] - prices[nextIdx - 1]) / prices[nextIdx - 1],
        });
      }
    }

    if (localMatches.length === 0) continue;

    localMatches.sort((a, b) => a.distance - b.distance);
    const kn = localMatches.slice(0, Math.min(k, localMatches.length));

    let wTotal = 0, wReturn = 0;
    for (const m of kn) {
      const w = 1 / (m.distance + 1e-8);
      wTotal += w;
      wReturn += w * m.futureReturn;
    }
    const predictedUp = wReturn / wTotal > 0;
    const actualUp = prices[t + 1] > prices[t];

    if (predictedUp && actualUp) tp++;
    else if (predictedUp && !actualUp) fp++;
    else if (!predictedUp && !actualUp) tn++;
    else fn++;
  }

  const total = tp + fp + tn + fn;
  return {
    accuracy: total > 0 ? Math.round(((tp + tn) / total) * 100) : 0,
    precision: tp + fp > 0 ? Math.round((tp / (tp + fp)) * 100) : 0,
    recall: tp + fn > 0 ? Math.round((tp / (tp + fn)) * 100) : 0,
    f1: tp + fp > 0 && tp + fn > 0
      ? Math.round((2 * tp / (2 * tp + fp + fn)) * 100)
      : 0,
    totalSamples: total,
  };
}

/* ═══════════════════════════════════════════════
   Metrics Badge Component
   ═══════════════════════════════════════════════ */

const MetricsBadge: React.FC<{ metrics: ClassificationMetrics }> = ({ metrics }) => {
  if (metrics.totalSamples === 0) return null;

  const getColor = (val: number) => {
    if (val >= 60) return "text-emerald-600";
    if (val >= 45) return "text-amber-600";
    return "text-red-500";
  };

  return (
    <div className="grid grid-cols-4 gap-1 mt-1.5">
      <div className="bg-muted/50 rounded px-1.5 py-1 text-center">
        <div className="text-[9px] text-muted-foreground">Accuracy</div>
        <div className={cn("text-[11px] font-bold", getColor(metrics.accuracy))}>
          {metrics.accuracy}%
        </div>
      </div>
      <div className="bg-muted/50 rounded px-1.5 py-1 text-center">
        <div className="text-[9px] text-muted-foreground">Precision</div>
        <div className={cn("text-[11px] font-bold", getColor(metrics.precision))}>
          {metrics.precision}%
        </div>
      </div>
      <div className="bg-muted/50 rounded px-1.5 py-1 text-center">
        <div className="text-[9px] text-muted-foreground">Recall</div>
        <div className={cn("text-[11px] font-bold", getColor(metrics.recall))}>
          {metrics.recall}%
        </div>
      </div>
      <div className="bg-muted/50 rounded px-1.5 py-1 text-center">
        <div className="text-[9px] text-muted-foreground">F1</div>
        <div className={cn("text-[11px] font-bold", getColor(metrics.f1))}>
          {metrics.f1}%
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */

const MLPrediction: React.FC<MLPredictionProps> = ({
  ohlcv,
  ticker,
  currentPrice,
}) => {
  const [expandRegression, setExpandRegression] = useState(true);
  const [expandKNN, setExpandKNN] = useState(true);

  const regression = useMemo(
    () => polynomialRegressionForecast(ohlcv),
    [ohlcv]
  );

  const knn = useMemo(() => knnPatternPrediction(ohlcv), [ohlcv]);

  // Trend icon & color
  const trendConfig = (dir: "up" | "down" | "neutral") => {
    if (dir === "up")
      return {
        icon: <TrendingUp size={14} />,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        label: "TĂNG",
      };
    if (dir === "down")
      return {
        icon: <TrendingDown size={14} />,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        label: "GIẢM",
      };
    return {
      icon: <Minus size={14} />,
      color: "text-muted-foreground",
      bg: "bg-muted",
      border: "border-border",
      label: "TRUNG LẬP",
    };
  };

  const regTrend = trendConfig(regression.trend);
  const knnTrend = trendConfig(knn.direction);

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Brain size={14} className="text-violet-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Dự báo ML
        </span>
      </div>

      {/* 1. Polynomial Regression */}
      <div>
        <button
          onClick={() => setExpandRegression(!expandRegression)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
        >
          <span className="flex-1 text-left">
            Dự báo giá (Hồi quy đa thức)
          </span>
          {expandRegression ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>

        {expandRegression && (
          <div className="px-2 pb-2 space-y-2">
            {/* Trend badge */}
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border",
                regTrend.bg,
                regTrend.border
              )}
            >
              <div className="flex items-center gap-1.5">
                {regTrend.icon}
                <span className={cn("text-xs font-bold", regTrend.color)}>
                  {regTrend.label}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                R² = {(regression.r2 * 100).toFixed(1)}%
              </span>
            </div>

            {/* Predicted prices table */}
            <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-2 py-1.5 font-medium">Ngày</th>
                    <th className="text-right px-2 py-1.5 font-medium">Dự báo</th>
                    <th className="text-right px-2 py-1.5 font-medium">Khoảng</th>
                  </tr>
                </thead>
                <tbody>
                  {regression.predictedPrices.map((p) => {
                    const change = ((p.price - currentPrice) / currentPrice) * 100;
                    const isUp = change > 0;
                    return (
                      <tr
                        key={p.day}
                        className="border-t border-border/30 hover:bg-muted/40"
                      >
                        <td className="px-2 py-1.5 text-muted-foreground">
                          +{p.day}D
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          <span
                            className={
                              isUp ? "text-emerald-600" : "text-red-600"
                            }
                          >
                            {p.price.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            ({isUp ? "+" : ""}
                            {change.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right text-muted-foreground">
                          {p.lower.toLocaleString()}-{p.upper.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Classification metrics */}
            <MetricsBadge metrics={regression.metrics} />

            <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
              Polynomial Regression (bậc 2) trên 30 phiên gần nhất. R² = {(regression.r2 * 100).toFixed(1)}%. 
              Khoảng tin cậy 95%. Backtest {regression.metrics.totalSamples} mẫu.
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-border/50" />

      {/* 2. KNN Pattern Matching */}
      <div>
        <button
          onClick={() => setExpandKNN(!expandKNN)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
        >
          <span className="flex-1 text-left">
            Nhận diện mẫu hình (KNN)
          </span>
          {expandKNN ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expandKNN && (
          <div className="px-2 pb-2 space-y-2">
            {/* Direction badge */}
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border",
                knnTrend.bg,
                knnTrend.border
              )}
            >
              <div className="flex items-center gap-1.5">
                {knnTrend.icon}
                <span className={cn("text-xs font-bold", knnTrend.color)}>
                  {knnTrend.label}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Xác suất: {knn.probability}%
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-card rounded-lg border border-border/50 px-2.5 py-2 text-center">
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  Lợi nhuận TB
                </div>
                <div
                  className={cn(
                    "text-sm font-bold",
                    knn.avgReturn > 0
                      ? "text-emerald-600"
                      : knn.avgReturn < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                  )}
                >
                  {knn.avgReturn > 0 ? "+" : ""}
                  {knn.avgReturn}%
                </div>
              </div>
              <div className="bg-card rounded-lg border border-border/50 px-2.5 py-2 text-center">
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  Win Rate tổng
                </div>
                <div className="text-sm font-bold text-foreground">
                  {knn.historicalWinRate}%
                </div>
              </div>
            </div>

            {/* Probability bar */}
            <div className="px-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Giảm</span>
                <span>Trung lập</span>
                <span>Tăng</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                <div
                  className={cn(
                    "absolute top-0 h-full rounded-full transition-all",
                    knn.direction === "up"
                      ? "bg-emerald-500 left-1/2"
                      : knn.direction === "down"
                        ? "bg-red-500 right-1/2"
                        : "bg-muted-foreground left-[40%]"
                  )}
                  style={{
                    width: `${Math.min(50, knn.probability / 2)}%`,
                  }}
                />
                <div className="absolute left-1/2 top-0 w-px h-full bg-border" />
              </div>
            </div>

            {/* Classification metrics */}
            <MetricsBadge metrics={knn.metrics} />

            <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
              K-Nearest Neighbors: so khớp 10 phiên gần nhất với lịch sử, chọn 5 mẫu tương đồng nhất.
              Backtest {knn.metrics.totalSamples} mẫu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MLPrediction;
