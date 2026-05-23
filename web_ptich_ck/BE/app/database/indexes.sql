-- ============================================================
-- Performance indexes for high-concurrency queries
-- Run once on PostgreSQL to eliminate sequential scans
-- ============================================================
-- Schema: hethong_phantich_chungkhoan
-- ============================================================

SET search_path TO hethong_phantich_chungkhoan;

-- ────────────────────────────────────────────────────────────
-- history_price — used in EVERY ranked_dates CTE + JOINs
-- PK is (ticker, trading_date) but we need reverse order
-- ────────────────────────────────────────────────────────────
-- For ranked_dates CTE: GROUP BY trading_date ORDER BY DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hp_trading_date_desc
    ON history_price (trading_date DESC);

-- For JOINs: WHERE ticker = X AND trading_date = Y (covering index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hp_ticker_date_close
    ON history_price (ticker, trading_date DESC)
    INCLUDE (close, volume);

-- Expression index for normalized ticker joins (UPPER(BTRIM(ticker))).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hp_ticker_norm_date
    ON history_price ((UPPER(BTRIM(ticker))), trading_date DESC)
    INCLUDE (close, volume, high, low);

-- ────────────────────────────────────────────────────────────
-- electric_board — used for MAX(trading_date), sector heatmap
-- ────────────────────────────────────────────────────────────
-- For MAX(trading_date) WHERE match_price IS NOT NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eb_date_desc
    ON electric_board (trading_date DESC)
    WHERE match_price IS NOT NULL;

-- For ticker lookup on latest date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eb_ticker_date
    ON electric_board (ticker, trading_date DESC)
    INCLUDE (match_price, ref_price, accumulated_volume, exchange,
             foreign_buy_volume, foreign_sell_volume);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eb_ticker_norm_date
    ON electric_board ((UPPER(BTRIM(ticker))), trading_date DESC)
    INCLUDE (match_price, ref_price, foreign_buy_volume, foreign_sell_volume);

-- For foreign flow GROUP BY trading_date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eb_date_match
    ON electric_board (trading_date)
    WHERE match_price IS NOT NULL AND match_price > 0;

-- ────────────────────────────────────────────────────────────
-- company_overview — used for sector grouping (icb_name2)
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_co_sector
    ON company_overview (icb_name2)
    WHERE icb_name2 IS NOT NULL;

-- For ticker lookup with sector name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_co_ticker_sector
    ON company_overview (ticker)
    INCLUDE (icb_name2, exchange, organ_short_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_co_ticker_norm
    ON company_overview ((UPPER(BTRIM(ticker))))
    INCLUDE (icb_name2, icb_name3, exchange, organ_short_name, organ_name);

-- ────────────────────────────────────────────────────────────
-- financial_ratio — used for DISTINCT ON (ticker) ORDER BY year, quarter
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fr_ticker_period
    ON financial_ratio (ticker, year DESC, quarter DESC)
    INCLUDE (pe, pb, eps, roe, roa, market_cap, dividend_yield, debt_to_equity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fr_ticker_norm_period
    ON financial_ratio ((UPPER(BTRIM(ticker))), year DESC, quarter DESC)
    INCLUDE (pe, pb, eps, roe, roa, market_cap, dividend_yield, debt_to_equity);

-- ────────────────────────────────────────────────────────────
-- market_index — used for CROSS JOIN LATERAL (ORDER BY trading_date DESC LIMIT 1)
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mi_ticker_date
    ON market_index (ticker, trading_date DESC)
    INCLUDE (close);

-- ────────────────────────────────────────────────────────────
-- bctc — used for earnings growth (DISTINCT ON ticker)
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bctc_earnings
    ON bctc (ticker, year DESC, quarter DESC)
    WHERE ind_code = 'lnst_cua_co_dong_cong_ty_me' AND value IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- news — used for listing / search
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_published
    ON news (published DESC NULLS LAST);

-- For ILIKE search (trigram index — requires pg_trgm extension)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_title_trgm
--     ON news USING gin (title gin_trgm_ops);

-- ────────────────────────────────────────────────────────────
-- Stock Detail module — additional indexes
-- ────────────────────────────────────────────────────────────
-- bctc: For ticker-specific financial statements — covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bctc_ticker_period
    ON bctc (ticker, year DESC, quarter DESC)
    INCLUDE (ind_code, value);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bctc_ticker_norm_period
    ON bctc ((UPPER(BTRIM(ticker))), year DESC, quarter DESC)
    INCLUDE (ind_code, value);

-- owner: For shareholder lookup by ticker
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owner_ticker
    ON owner (ticker);

-- event: For event lookup by ticker (stored in 'id' column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_ticker
    ON event (id);

-- realtime_quotes: For order book lookup by symbol
-- (already has idx_realtime_quotes_symbol_ts)

-- financial_ratio: Broader covering index for stock detail
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fr_ticker_full
    ON financial_ratio (ticker, year DESC, quarter DESC)
    INCLUDE (pe, pb, ps, eps, bvps, roe, roa, roic,
             gross_margin, net_margin, ebit_margin,
             debt_to_equity, current_ratio, quick_ratio, cash_ratio,
             interest_coverage_ratio, asset_turnover, inventory_turnover,
             market_cap, outstanding_shares, ev_ebitda, dividend_yield,
             p_cashflow, financial_leverage);

-- history_price: Full OHLCV covering index for stock detail charts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hp_ticker_ohlcv
    ON history_price (ticker, trading_date DESC)
    INCLUDE (open, high, low, close, volume);
