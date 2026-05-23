/* ------------------------------------------------------------------ */
/*  Utility helpers for the Price Board                               */
/* ------------------------------------------------------------------ */

import type { FlashType, RawQuoteState, RowDisplayData } from "./priceBoardTypes";

// ── Safe type conversions ──────────────────────────────────────────

export function safeFloat(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function safeInt(v: unknown): number {
  if (v == null) return 0;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
}

// ── Derive display data from accumulated WS state ──────────────────

export function deriveRowData(state: RawQuoteState): RowDisplayData {
  const price = safeFloat(state.p ?? state.c ?? state.a);
  const ref = safeFloat(state.r);
  let cv = safeFloat(state.pn ?? state.cv);
  let cp = safeFloat(state.pc ?? state.cp);

  // Compute change when WS doesn't provide it
  if (cv === 0 && cp === 0 && price > 0 && ref > 0 && price !== ref) {
    cv = price - ref;
    cp = ((price - ref) / ref) * 100;
  }

  return {
    symbol: String(state.s ?? ""),
    price,
    volume: safeInt(state.v),
    totalVolume: safeInt(state.tv),
    changeValue: cv,
    changePercent: cp,
    refPrice: ref,
    ceilPrice: safeFloat(state.ce),
    floorPrice: safeFloat(state.f),
    highPrice: safeFloat(state.h),
    lowPrice: safeFloat(state.l),
    bid1P: safeFloat(state.pb1), bid1V: safeInt(state.qb1),
    bid2P: safeFloat(state.pb2), bid2V: safeInt(state.qb2),
    bid3P: safeFloat(state.pb3), bid3V: safeInt(state.qb3),
    ask1P: safeFloat(state.pa1), ask1V: safeInt(state.qa1),
    ask2P: safeFloat(state.pa2), ask2V: safeInt(state.qa2),
    ask3P: safeFloat(state.pa3), ask3V: safeInt(state.qa3),
    foreignBuy: safeInt(state.bfq),
    foreignSell: safeInt(state.sfq),
    foreignRoom: safeFloat(state.fr),
  };
}

// ── Price colour logic (Vietnam stock market convention) ───────────
//  Ceiling → purple · Up → green · Ref → yellow · Down → red · Floor → cyan

export function getPriceColorClass(
  price: number,
  ref: number,
  ceil: number,
  floor: number,
): string {
  if (!price || price === 0) return "text-gray-400";
  if (ceil > 0 && price >= ceil) return "text-[#ff00ff]";   // trần – purple
  if (floor > 0 && price <= floor) return "text-[#00d4ff]"; // sàn – cyan
  if (ref > 0 && price > ref) return "text-[#00c076]";      // tăng – green
  if (ref > 0 && price < ref) return "text-[#ff3333]";      // giảm – red
  return "text-[#ffd700]"; // tham chiếu – gold
}

export function getFlashType(
  price: number,
  ref: number,
  ceil: number,
  floor: number,
): FlashType {
  if (!price || price === 0) return "neutral";
  if (ceil > 0 && price >= ceil) return "ceil";
  if (floor > 0 && price <= floor) return "floor";
  if (ref > 0 && price > ref) return "up";
  if (ref > 0 && price < ref) return "down";
  return "neutral";
}

export function getChangeColorClass(cv: number): string {
  if (cv > 0) return "text-[#00c076]";
  if (cv < 0) return "text-[#ff3333]";
  return "text-[#ffd700]";
}

// ── Formatting helpers ─────────────────────────────────────────────

/** Format stock price (WS sends VND, display in thousands with 2 decimals) */
export function fmtPrice(n: number): string {
  if (!n || n === 0) return "";
  return (n / 1000).toFixed(2);
}

/** Format volume with locale separators */
export function fmtVolume(n: number): string {
  if (!n || n <= 0) return "";
  return n.toLocaleString("en-US");
}

/** Format change value (in VND → thousands) */
export function fmtChange(n: number): string {
  if (n === 0) return "0.00";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n / 1000).toFixed(2)}`;
}

/** Format change percent */
export function fmtPercent(n: number): string {
  if (n === 0) return "0.00%";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** Format index value (points — no division) */
export function fmtIndexValue(n: number): string {
  if (!n || n === 0) return "-";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format index change */
export function fmtIndexChange(n: number): string {
  if (n === 0) return "0.00";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}
