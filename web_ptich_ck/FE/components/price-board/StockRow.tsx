"use client";

import React, { useEffect, useRef, useState, memo, Fragment } from "react";
import { marketEvents } from "@/lib/socketEvents";
import type { RawQuoteState, FlashType } from "@/lib/priceBoardTypes";
import {
  deriveRowData,
  getPriceColorClass,
  getFlashType,
  getChangeColorClass,
  fmtPrice,
  fmtVolume,
  fmtChange,
  fmtPercent,
} from "@/lib/priceBoardUtils";

/* ================================================================= */
/*  BlinkingCell – a single table cell that flashes on value change   */
/* ================================================================= */

const FLASH_MAP: Record<FlashType, string> = {
  up: "animate-flash-up",
  down: "animate-flash-down",
  ceil: "animate-flash-ceil",
  floor: "animate-flash-floor",
  neutral: "animate-flash-neutral",
};

const BlinkingCell = memo(function BlinkingCell({
  value,
  display,
  colorClass = "text-gray-300",
  align = "right",
  className = "",
  flashType = "neutral",
}: {
  value: number | undefined;
  display: React.ReactNode;
  colorClass?: string;
  align?: "left" | "center" | "right";
  className?: string;
  flashType?: FlashType;
}) {
  const [flashClass, setFlashClass] = useState("");
  const prevRef = useRef(value);

  useEffect(() => {
    if (
      value !== prevRef.current &&
      value !== undefined &&
      prevRef.current !== undefined
    ) {
      const anim = FLASH_MAP[flashType] ?? "";
      if (anim) {
        setFlashClass("");
        // Force re-trigger by toggling in next micro-task
        const t = setTimeout(() => setFlashClass(anim), 16);
        prevRef.current = value;
        return () => clearTimeout(t);
      }
    }
    prevRef.current = value;
  }, [value, flashType]);

  const alignCls =
    align === "center"
      ? "text-center"
      : align === "left"
        ? "text-left"
        : "text-right";

  return (
    <td
      className={`px-1.5 py-[5px] border-r border-b border-[#2a2e39] text-[12px] font-medium leading-none whitespace-nowrap tabular-nums ${alignCls} ${colorClass} ${className} ${flashClass}`}
    >
      {display}
    </td>
  );
});

/* ================================================================= */
/*  StockRow – one row per symbol, self-updating via event bus        */
/* ================================================================= */

interface StockRowProps {
  symbol: string;
}

export const StockRow = memo(function StockRow({ symbol }: StockRowProps) {
  const stateRef = useRef<RawQuoteState>({ s: symbol });
  const rafRef = useRef(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsub = marketEvents.on(symbol, (delta) => {
      // Accumulate state (like Python's state.update(item))
      Object.assign(stateRef.current, delta);

      // Debounce visual updates via rAF
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          forceRender((n) => n + 1);
        });
      }
    });

    return () => {
      unsub();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [symbol]);

  const d = deriveRowData(stateRef.current);
  const { refPrice: r, ceilPrice: c, floorPrice: f, price: mp, changeValue: ch } = d;

  // Color helpers
  const color = (p: number) => getPriceColorClass(p, r, c, f);
  const flash = (p: number) => getFlashType(p, r, c, f);
  const matchColor = color(mp);
  const matchFlash = flash(mp);

  return (
    <tr className="hover:bg-[#0a0a0a] bg-black transition-colors duration-75 group">
      {/* Symbol */}
      <td
        className={`px-2 py-[5px] border-r border-b border-[#2a2e39] font-bold sticky left-0 z-20 bg-black group-hover:bg-[#0a0a0a] text-left text-[12px] ${matchColor}`}
      >
        {symbol}
      </td>

      {/* Trần / Sàn / TC */}
      <BlinkingCell value={c} display={fmtPrice(c)} colorClass="text-[#ff00ff]" flashType="ceil" />
      <BlinkingCell value={f} display={fmtPrice(f)} colorClass="text-[#00d4ff]" flashType="floor" />
      <BlinkingCell value={r} display={fmtPrice(r)} colorClass="text-[#ffd700]" flashType="neutral" />

      {/* Bên mua: 3 → 2 → 1 (bids: outer → inner) */}
      {([
        [d.bid3P, d.bid3V],
        [d.bid2P, d.bid2V],
        [d.bid1P, d.bid1V],
      ] as [number, number][]).map(([p, v], idx) => (
        <Fragment key={`b${idx}`}>
          <BlinkingCell value={p} display={fmtPrice(p)} colorClass={color(p)} flashType={flash(p)} />
          <BlinkingCell
            value={v}
            display={fmtVolume(v)}
            colorClass={color(p)}
            flashType="neutral"
            className={idx === 2 ? "border-r-2 border-[#3a3f4b]" : ""}
          />
        </Fragment>
      ))}

      {/* Khớp lệnh (match) */}
      <BlinkingCell
        value={mp}
        display={mp > 0 ? fmtPrice(mp) : ""}
        colorClass={`${matchColor} font-bold`}
        className="bg-[#0f0f10]"
        align="center"
        flashType={matchFlash}
      />
      <BlinkingCell
        value={d.volume}
        display={mp > 0 ? fmtVolume(d.volume) : ""}
        colorClass={matchColor}
        className="bg-[#0f0f10]"
        flashType="neutral"
      />
      <BlinkingCell
        value={ch}
        display={mp > 0 ? fmtChange(ch) : ""}
        colorClass={getChangeColorClass(ch)}
        className="bg-[#0f0f10]"
        align="center"
        flashType={matchFlash}
      />
      <BlinkingCell
        value={d.changePercent}
        display={mp > 0 ? fmtPercent(d.changePercent) : ""}
        colorClass={getChangeColorClass(ch)}
        className="bg-[#0f0f10] border-r-2 border-[#3a3f4b]"
        align="center"
        flashType={matchFlash}
      />

      {/* Bên bán: 1 → 2 → 3 (asks: inner → outer) */}
      {([
        [d.ask1P, d.ask1V],
        [d.ask2P, d.ask2V],
        [d.ask3P, d.ask3V],
      ] as [number, number][]).map(([p, v], idx) => (
        <Fragment key={`a${idx}`}>
          <BlinkingCell value={p} display={fmtPrice(p)} colorClass={color(p)} flashType={flash(p)} />
          <BlinkingCell
            value={v}
            display={fmtVolume(v)}
            colorClass={color(p)}
            flashType="neutral"
            className={idx === 2 ? "border-r-2 border-[#3a3f4b]" : ""}
          />
        </Fragment>
      ))}

      {/* Tổng KL / Cao / Thấp */}
      <BlinkingCell value={d.totalVolume} display={fmtVolume(d.totalVolume)} colorClass="text-white" flashType="neutral" />
      <BlinkingCell value={d.highPrice} display={fmtPrice(d.highPrice)} colorClass={color(d.highPrice)} flashType={flash(d.highPrice)} />
      <BlinkingCell value={d.lowPrice} display={fmtPrice(d.lowPrice)} colorClass={color(d.lowPrice)} flashType={flash(d.lowPrice)} />

      {/* ĐTNN */}
      <BlinkingCell value={d.foreignBuy} display={fmtVolume(d.foreignBuy)} colorClass="text-[#d1d5db]" flashType="neutral" />
      <BlinkingCell value={d.foreignSell} display={fmtVolume(d.foreignSell)} colorClass="text-[#d1d5db]" flashType="neutral" />
      <BlinkingCell value={d.foreignRoom} display={fmtVolume(d.foreignRoom)} colorClass="text-[#d1d5db]" flashType="neutral" />
    </tr>
  );
});
