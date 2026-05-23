"use client";

import React from "react";
import { StockRow } from "./StockRow";

interface Props {
  symbols: string[];
}

export default function PriceBoardTable({ symbols }: Props) {
  return (
    <div className="flex-1 overflow-auto custom-scrollbar relative bg-black">
      <table className="w-full border-collapse border-spacing-0 min-w-[1400px]">
        {/* ── Header ─────────────────────────────────────────── */}
        <thead className="sticky top-0 z-40 bg-black text-[#7d90a8] text-[11px] font-semibold uppercase shadow-sm select-none">
          <tr>
            <th
              rowSpan={2}
              className="p-1.5 border border-[#2a2e39] sticky left-0 z-50 bg-black text-center w-[72px]"
            >
              CK
            </th>
            <th rowSpan={2} className="p-1.5 border border-[#2a2e39] text-[#ff00ff] text-center w-16">
              Trần
            </th>
            <th rowSpan={2} className="p-1.5 border border-[#2a2e39] text-[#00d4ff] text-center w-16">
              Sàn
            </th>
            <th rowSpan={2} className="p-1.5 border border-[#2a2e39] text-[#ffd700] text-center w-16">
              TC
            </th>
            <th colSpan={6} className="py-1.5 border border-[#2a2e39] text-center border-b-0">
              Bên mua
            </th>
            <th colSpan={4} className="py-1.5 border border-[#2a2e39] text-center border-b-0 bg-[#0f0f10] text-white">
              Khớp lệnh
            </th>
            <th colSpan={6} className="py-1.5 border border-[#2a2e39] text-center border-b-0">
              Bên bán
            </th>
            <th rowSpan={2} className="p-1.5 border border-[#2a2e39] text-center w-20">
              Tổng KL
            </th>
            <th rowSpan={2} className="p-1.5 border border-[#2a2e39] text-center w-16">
              Cao
            </th>
            <th rowSpan={2} className="p-1.5 border border-[#2a2e39] text-center w-16">
              Thấp
            </th>
            <th colSpan={3} className="py-1.5 border border-[#2a2e39] text-center border-b-0">
              ĐTNN
            </th>
          </tr>
          <tr className="text-[10px] text-gray-500">
            {/* Buy 3-2-1 */}
            <th className="p-1 border border-[#2a2e39] w-14">Giá 3</th>
            <th className="p-1 border border-[#2a2e39] w-16">KL 3</th>
            <th className="p-1 border border-[#2a2e39] w-14">Giá 2</th>
            <th className="p-1 border border-[#2a2e39] w-16">KL 2</th>
            <th className="p-1 border border-[#2a2e39] w-14">Giá 1</th>
            <th className="p-1 border-r-2 border-[#3a3f4b] border-b border-t border-l border-[#2a2e39] w-16">
              KL 1
            </th>
            {/* Match */}
            <th className="p-1 border border-[#2a2e39] bg-[#0f0f10] text-gray-300 w-14">Giá</th>
            <th className="p-1 border border-[#2a2e39] bg-[#0f0f10] text-gray-300 w-16">KL</th>
            <th className="p-1 border border-[#2a2e39] bg-[#0f0f10] text-gray-300 w-14">+/-</th>
            <th className="p-1 border-r-2 border-[#3a3f4b] border-b border-t border-l border-[#2a2e39] bg-[#0f0f10] text-gray-300 w-14">
              +/- (%)
            </th>
            {/* Sell 1-2-3 */}
            <th className="p-1 border border-[#2a2e39] w-14">Giá 1</th>
            <th className="p-1 border border-[#2a2e39] w-16">KL 1</th>
            <th className="p-1 border border-[#2a2e39] w-14">Giá 2</th>
            <th className="p-1 border border-[#2a2e39] w-16">KL 2</th>
            <th className="p-1 border border-[#2a2e39] w-14">Giá 3</th>
            <th className="p-1 border-r-2 border-[#3a3f4b] border-b border-t border-l border-[#2a2e39] w-16">
              KL 3
            </th>
            {/* ĐTNN sub */}
            <th className="p-1 border border-[#2a2e39] w-16">NN mua</th>
            <th className="p-1 border border-[#2a2e39] w-16">NN bán</th>
            <th className="p-1 border border-[#2a2e39] w-20">Room</th>
          </tr>
        </thead>

        {/* ── Body ───────────────────────────────────────────── */}
        <tbody>
          {symbols.map((sym) => (
            <StockRow key={sym} symbol={sym} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
