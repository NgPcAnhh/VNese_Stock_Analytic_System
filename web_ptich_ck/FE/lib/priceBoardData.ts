/* ------------------------------------------------------------------ */
/*  Configuration for Price Board — NO hardcoded symbols              */
/*  Symbols are fetched dynamically from SSI API via /api/stocks/symbols */
/* ------------------------------------------------------------------ */

/** Index codes tracked in the top bar (these are WebSocket subscription targets) */
export const INDEX_CODES = [
  "VNINDEX", "VN30", "HNX30", "HNXINDEX", "VNXALL", "UPCOMINDEX",
] as const;

/** Main index IDs for mini‑chart cards */
export const CHART_INDEX_IDS = ["VNINDEX", "VN30", "HNX30", "HNXINDEX"] as const;

/* ── Tab / Group / Exchange definitions ─────────────────────────── */

/**
 * Each tab maps to either an SSI "exchange" or "group" API query.
 * This mirrors the cron_sync.py approach:
 *   exchange → https://iboard-query.ssi.com.vn/stock/exchange/{id}?boardId=MAIN
 *   group    → https://iboard-query.ssi.com.vn/stock/group/{id}
 */
export interface TabDef {
  key: string;          // unique tab id
  label: string;        // display label
  fetchType: "exchange" | "group";  // which SSI endpoint to query
  fetchId: string;      // parameter passed to the endpoint
}

/**
 * Tab list — order matches the SSI iBoard toolbar.
 * Group tabs (VN30, HNX30, VN100…) use the /group/ endpoint.
 * Exchange tabs (HOSE, HNX, UPCOM) use the /exchange/ endpoint.
 */
export const TABS: TabDef[] = [
  // ── Index groups ──
  { key: "VN30",         label: "VN30",         fetchType: "group",    fetchId: "VN30" },
  { key: "HNX30",        label: "HNX30",        fetchType: "group",    fetchId: "HNX30" },
  // ── Exchanges ──
  { key: "HOSE",         label: "HOSE",         fetchType: "exchange", fetchId: "hose" },
  { key: "HNX",          label: "HNX",          fetchType: "exchange", fetchId: "hnx" },
  { key: "UPCOM",        label: "UPCOM",        fetchType: "exchange", fetchId: "upcom" },
  // ── Additional groups from cron_sync.py ──
  { key: "VN100",        label: "VN100",        fetchType: "group",    fetchId: "VN100" },
  { key: "VNX50",        label: "VNX50",        fetchType: "group",    fetchId: "VNX50" },
  { key: "VNDIAMOND",    label: "VNDIAMOND",    fetchType: "group",    fetchId: "VNDIAMOND" },
  { key: "VNFINLEAD",    label: "VNFINLEAD",    fetchType: "group",    fetchId: "VNFINLEAD" },
  { key: "VNFIN",        label: "VNFIN",        fetchType: "group",    fetchId: "VNFIN" },
  { key: "VNREAL",       label: "VNREAL",       fetchType: "group",    fetchId: "VNREAL" },
  { key: "VNIT",         label: "VNIT",         fetchType: "group",    fetchId: "VNIT" },
  { key: "VNIND",        label: "VNIND",        fetchType: "group",    fetchId: "VNIND" },
  { key: "VNMAT",        label: "VNMAT",        fetchType: "group",    fetchId: "VNMAT" },
  { key: "VNCONS",       label: "VNCONS",       fetchType: "group",    fetchId: "VNCONS" },
  { key: "VNENE",        label: "VNENE",        fetchType: "group",    fetchId: "VNENE" },
  { key: "VNUTI",        label: "VNUTI",        fetchType: "group",    fetchId: "VNUTI" },
  { key: "VNHEAL",       label: "VNHEAL",       fetchType: "group",    fetchId: "VNHEAL" },
  { key: "VNSML",        label: "VNSML",        fetchType: "group",    fetchId: "VNSML" },
  { key: "VNMID",        label: "VNMID",        fetchType: "group",    fetchId: "VNMID" },
  { key: "VNALL",        label: "VNALL",        fetchType: "group",    fetchId: "VNALL" },
  { key: "VNXALL",       label: "VNXALL",       fetchType: "group",    fetchId: "VNXALL" },
];

/**
 * Fetch symbols for a tab from the local proxy API.
 * Returns a sorted, deduplicated array of symbol strings.
 */
export async function fetchSymbolsForTab(tab: TabDef): Promise<string[]> {
  try {
    const res = await fetch(
      `/api/stocks/symbols?type=${tab.fetchType}&id=${tab.fetchId}`,
    );
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    const symbols: string[] = json?.symbols ?? [];
    return [...new Set(symbols)].sort();
  } catch (err) {
    console.error(`[PriceBoard] Failed to fetch symbols for ${tab.key}:`, err);
    return [];
  }
}
