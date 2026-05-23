/* ------------------------------------------------------------------ */
/*  Types for the Price Board (Bảng điện)                             */
/* ------------------------------------------------------------------ */

/** Accumulated raw WS state per symbol (key → value from WebSocket) */
export interface RawQuoteState {
  s?: string;    // symbol
  p?: number;    // price (match / last)
  c?: number;    // close
  a?: number;    // average
  v?: number;    // last volume (instant lot)
  tv?: number;   // total volume (accumulated)
  tva?: number;  // total value
  pc?: number;   // change percent
  cp?: number;   // alias change percent
  pn?: number;   // change value
  cv?: number;   // alias change value
  r?: number;    // reference price
  ce?: number;   // ceiling price
  f?: number;    // floor price
  h?: number;    // high
  l?: number;    // low
  pb1?: number;  qb1?: number;  // bid level 1
  pb2?: number;  qb2?: number;  // bid level 2
  pb3?: number;  qb3?: number;  // bid level 3
  pa1?: number;  qa1?: number;  // ask level 1
  pa2?: number;  qa2?: number;  // ask level 2
  pa3?: number;  qa3?: number;  // ask level 3
  bfq?: number;  // foreign buy qty
  sfq?: number;  // foreign sell qty
  fr?: number;   // foreign room
  t?: number;    // timestamp ms
  [key: string]: unknown;
}

/** Derived display‑ready row data */
export interface RowDisplayData {
  symbol: string;
  price: number;
  volume: number;
  totalVolume: number;
  changeValue: number;
  changePercent: number;
  refPrice: number;
  ceilPrice: number;
  floorPrice: number;
  highPrice: number;
  lowPrice: number;
  bid1P: number; bid1V: number;
  bid2P: number; bid2V: number;
  bid3P: number; bid3V: number;
  ask1P: number; ask1V: number;
  ask2P: number; ask2V: number;
  ask3P: number; ask3V: number;
  foreignBuy: number;
  foreignSell: number;
  foreignRoom: number;
}

/** Index quote for the top market bar */
export interface IndexDisplayData {
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  totalVolume: number;
  totalValue: number;
  advances: number;
  declines: number;
  noChange: number;
  chartData: number[];
  chartTimes: string[];
}

export type FlashType = "up" | "down" | "ceil" | "floor" | "neutral";
