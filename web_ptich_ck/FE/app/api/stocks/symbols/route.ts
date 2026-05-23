import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy to SSI iBoard API — avoids CORS issues when calling from browser.
 *
 * Usage:
 *   GET /api/stocks/symbols?type=exchange&id=hose
 *   GET /api/stocks/symbols?type=group&id=VN30
 *
 * Mirrors the pattern in cron_sync.py:
 *   exchange → https://iboard-query.ssi.com.vn/stock/exchange/{id}?boardId=MAIN
 *   group    → https://iboard-query.ssi.com.vn/stock/group/{id}
 */

const SSI_HEADERS = {
  Authority: "iboard-query.ssi.com.vn",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type"); // "exchange" | "group"
  const id = searchParams.get("id");     // "hose" | "VN30" etc.

  if (!type || !id) {
    return NextResponse.json(
      { error: "Missing ?type= and ?id= params" },
      { status: 400 },
    );
  }

  let url: string;
  if (type === "exchange") {
    url = `https://iboard-query.ssi.com.vn/stock/exchange/${id}?boardId=MAIN`;
  } else if (type === "group") {
    url = `https://iboard-query.ssi.com.vn/stock/group/${id}`;
  } else {
    return NextResponse.json(
      { error: 'type must be "exchange" or "group"' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url, {
      headers: SSI_HEADERS,
      next: { revalidate: 300 }, // cache 5 min — symbol lists don't change intraday
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `SSI returned ${res.status}` },
        { status: res.status },
      );
    }

    const json = await res.json();
    const data: unknown[] = json?.data ?? [];

    // Extract symbols exactly like cron_sync.py
    // For exchanges: filter stockSymbol length <= 3 to exclude ETF/CW/Bond
    // For groups: take all stockSymbol values (group API only returns actual members)
    const symbols: string[] = [];

    for (const item of data as Record<string, unknown>[]) {
      const sym = item?.stockSymbol as string | undefined;
      if (!sym) continue;

      if (type === "exchange") {
        // cron_sync.py logic: only stock symbols (len ≤ 3) for exchange queries
        if (sym.length <= 3) {
          symbols.push(sym);
        }
      } else {
        symbols.push(sym);
      }
    }

    return NextResponse.json({
      type,
      id,
      count: symbols.length,
      symbols,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch failed: ${err instanceof Error ? err.message : err}` },
      { status: 502 },
    );
  }
}
