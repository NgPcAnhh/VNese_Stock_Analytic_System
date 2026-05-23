-- ============================================================
-- Stock list / screener materialized view
-- Purpose: speed up /stock-list/overview, /stock-list/sectors, /stock-list/screener
-- ============================================================
-- Run this script once, then schedule REFRESH MATERIALIZED VIEW CONCURRENTLY
-- ============================================================

SET search_path TO hethong_phantich_chungkhoan;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stock_screener_base AS
WITH ranked_dates AS (
    SELECT DISTINCT trading_date
    FROM history_price
    WHERE trading_date IS NOT NULL
    ORDER BY trading_date DESC
    LIMIT 2
),
dates AS (
    SELECT
        MAX(CASE WHEN rn = 1 THEN trading_date END) AS latest_date,
        MAX(CASE WHEN rn = 2 THEN trading_date END) AS prev_date,
        TO_CHAR(
            (
                TO_DATE(MAX(CASE WHEN rn = 1 THEN trading_date END), 'YYYY-MM-DD')
                - INTERVAL '365 days'
            )::date,
            'YYYY-MM-DD'
        ) AS date_52w_ago
    FROM (
        SELECT trading_date, ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
        FROM ranked_dates
    ) t
),
ticker_universe AS (
    SELECT ticker FROM company_overview
    UNION
    SELECT hp.ticker
    FROM history_price hp
    JOIN dates d ON hp.trading_date = d.latest_date
    UNION
    SELECT ticker FROM financial_ratio
    UNION
    SELECT ticker FROM bctc
    UNION
    SELECT eb.ticker
    FROM electric_board eb
    WHERE eb.trading_date = (SELECT MAX(trading_date) FROM electric_board)
),
base_stocks AS (
    SELECT DISTINCT UPPER(BTRIM(ticker)) AS ticker
    FROM ticker_universe
    WHERE ticker IS NOT NULL
      AND BTRIM(ticker) NOT IN ('', 'NaN')
      AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
),
bctc_data AS (
    SELECT UPPER(BTRIM(ticker)) AS ticker, year, quarter, ind_code, value
    FROM bctc
    WHERE ind_code IN (
        'cp_pho_thong',
        'vcsh',
        'no_phai_tra',
        'lnst_cua_co_dong_cong_ty_me',
        'doanh_thu_thuan',
        'co_tuc_da_tra'
    )
      AND value IS NOT NULL
      AND value <> 0
),
shares AS (
    SELECT DISTINCT ON (ticker)
        ticker,
        value / 10000.0 AS shares
    FROM bctc_data
    WHERE ind_code = 'cp_pho_thong' AND value > 0
    ORDER BY ticker, year DESC, quarter DESC
),
equity AS (
    SELECT DISTINCT ON (ticker)
        ticker,
        value AS equity
    FROM bctc_data
    WHERE ind_code = 'vcsh' AND value > 0
    ORDER BY ticker, year DESC, quarter DESC
),
total_liabilities AS (
    SELECT DISTINCT ON (ticker)
        ticker,
        value AS total_liabilities
    FROM bctc_data
    WHERE ind_code = 'no_phai_tra'
    ORDER BY ticker, year DESC, quarter DESC
),
ranked_ni AS (
    SELECT
        ticker,
        value,
        ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
    FROM bctc_data
    WHERE ind_code = 'lnst_cua_co_dong_cong_ty_me'
),
ttm_ni AS (
    SELECT ticker, SUM(value) AS ttm_ni
    FROM ranked_ni
    WHERE rn <= 4
    GROUP BY ticker
    HAVING COUNT(*) >= 2
),
prev_ni AS (
    SELECT ticker, SUM(value) AS prev_ni
    FROM ranked_ni
    WHERE rn BETWEEN 5 AND 8
    GROUP BY ticker
    HAVING COUNT(*) = 4
),
ranked_rev AS (
    SELECT
        ticker,
        value,
        ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
    FROM bctc_data
    WHERE ind_code = 'doanh_thu_thuan'
),
ttm_rev AS (
    SELECT ticker, SUM(value) AS ttm_rev
    FROM ranked_rev
    WHERE rn <= 4
    GROUP BY ticker
    HAVING COUNT(*) >= 2
),
prev_rev AS (
    SELECT ticker, SUM(value) AS prev_rev
    FROM ranked_rev
    WHERE rn BETWEEN 5 AND 8
    GROUP BY ticker
    HAVING COUNT(*) = 4
),
ranked_div AS (
    SELECT
        ticker,
        value,
        ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
    FROM bctc_data
    WHERE ind_code = 'co_tuc_da_tra'
),
ttm_div AS (
    SELECT ticker, SUM(ABS(value)) AS ttm_div
    FROM ranked_div
    WHERE rn <= 4
    GROUP BY ticker
    HAVING COUNT(*) >= 2
),
latest_fr AS (
    SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
        UPPER(BTRIM(ticker)) AS ticker,
        roe,
        roa,
        market_cap,
        pe,
        pb,
        eps,
        dividend_yield,
        debt_to_equity
    FROM financial_ratio
    ORDER BY UPPER(BTRIM(ticker)), year DESC, quarter DESC
),
hp_latest AS (
    SELECT UPPER(BTRIM(hp.ticker)) AS ticker, hp.close, hp.volume
    FROM history_price hp
    JOIN dates d ON hp.trading_date = d.latest_date
),
hp_prev AS (
    SELECT UPPER(BTRIM(hp.ticker)) AS ticker, hp.close
    FROM history_price hp
    JOIN dates d ON hp.trading_date = d.prev_date
),
co_dedup AS (
    SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
        UPPER(BTRIM(ticker)) AS ticker,
        CASE
            WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) NOT IN ('', 'NaN')
                THEN BTRIM(organ_short_name)
            WHEN organ_name IS NOT NULL AND BTRIM(organ_name) NOT IN ('', 'NaN')
                THEN BTRIM(organ_name)
            ELSE NULL
        END AS company_name,
        CASE
            WHEN icb_name3 IS NOT NULL AND BTRIM(icb_name3) NOT IN ('', 'NaN') THEN BTRIM(icb_name3)
            WHEN icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN') THEN BTRIM(icb_name2)
            ELSE 'Chua phan loai'
        END AS sector,
        CASE
            WHEN icb_name2 IS NOT NULL AND BTRIM(icb_name2) NOT IN ('', 'NaN') THEN BTRIM(icb_name2)
            ELSE NULL
        END AS sector2,
        CASE
            WHEN exchange = 'HSX' THEN 'HOSE'
            WHEN exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('', 'NaN') THEN BTRIM(exchange)
            ELSE NULL
        END AS exchange
    FROM company_overview
    WHERE exchange IS NULL OR (BTRIM(exchange) <> 'NaN' AND BTRIM(exchange) <> 'DELISTED')
    ORDER BY UPPER(BTRIM(ticker)),
        CASE WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) <> 'NaN' THEN 0 ELSE 1 END,
        exchange
),
latest_eb AS (
    SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
        UPPER(BTRIM(ticker)) AS ticker,
        COALESCE(foreign_buy_volume, 0) AS foreign_buy,
        COALESCE(foreign_sell_volume, 0) AS foreign_sell,
        CASE WHEN match_price > 0 THEN match_price ELSE ref_price END AS eb_price
    FROM electric_board
    WHERE match_price > 0 OR ref_price > 0
    ORDER BY UPPER(BTRIM(ticker)), trading_date DESC
),
last20 AS (
    SELECT ticker, trading_date, close
    FROM (
        SELECT
            UPPER(BTRIM(ticker)) AS ticker,
            trading_date,
            close,
            ROW_NUMBER() OVER (
                PARTITION BY UPPER(BTRIM(ticker))
                ORDER BY trading_date DESC
            ) AS rn
        FROM history_price
    ) x
    WHERE rn <= 20
),
sparkline AS (
    SELECT
        ticker,
        ARRAY_AGG(ROUND((close * 1000)::numeric, 0) ORDER BY trading_date) AS sparkline
    FROM last20
    GROUP BY ticker
),
avg_vol_10d AS (
    SELECT
        ticker,
        ROUND(AVG(volume))::bigint AS avg_volume_10d
    FROM (
        SELECT
            UPPER(BTRIM(ticker)) AS ticker,
            volume,
            ROW_NUMBER() OVER (
                PARTITION BY UPPER(BTRIM(ticker))
                ORDER BY trading_date DESC
            ) AS rn
        FROM history_price
    ) x
    WHERE rn <= 10
    GROUP BY ticker
),
week52 AS (
    SELECT
        UPPER(BTRIM(hp.ticker)) AS ticker,
        MAX(hp.high) AS high_52w,
        MIN(hp.low) AS low_52w
    FROM history_price hp
    JOIN dates d ON hp.trading_date >= d.date_52w_ago
    GROUP BY UPPER(BTRIM(hp.ticker))
)
SELECT
    bs.ticker,
    d.latest_date AS trading_date,
    d.prev_date AS prev_trading_date,
    co.company_name,
    co.sector,
    co.sector2,
    co.exchange,

    hp.close,
    hp_prev.close AS prev_close,
    hp.volume,
    av.avg_volume_10d,
    sp.sparkline,

    sh.shares,
    eq.equity,
    ni.ttm_ni,
    pn.prev_ni,
    tr.ttm_rev,
    pr.prev_rev,
    tl.total_liabilities,
    dv.ttm_div,

    eb.foreign_buy,
    eb.foreign_sell,
    eb.eb_price,



    ROUND((hp.close * 1000)::numeric, 0) AS current_price,
    CASE
        WHEN hp_prev.close > 0 THEN ROUND(((hp.close - hp_prev.close) * 1000)::numeric, 0)
        ELSE NULL
    END AS price_change,
    CASE
        WHEN hp_prev.close > 0
            THEN ROUND((((hp.close - hp_prev.close) / hp_prev.close) * 100)::numeric, 2)
        ELSE NULL
    END AS price_change_percent,

    CASE
        WHEN fr.market_cap IS NOT NULL
            THEN fr.market_cap
        WHEN sh.shares > 0 AND hp.close > 0
            THEN ROUND((hp.close * 1000 * sh.shares / 1e9)::numeric, 1)
        ELSE NULL
    END AS market_cap,

    CASE
        WHEN fr.eps IS NOT NULL
            THEN fr.eps
        WHEN sh.shares > 0 AND ni.ttm_ni IS NOT NULL
            THEN ROUND((ni.ttm_ni / sh.shares)::numeric, 0)
        ELSE NULL
    END AS eps,

    CASE
        WHEN fr.pe IS NOT NULL
            THEN fr.pe
        WHEN sh.shares > 0
             AND ni.ttm_ni IS NOT NULL
             AND ni.ttm_ni > 0
             AND hp.close * 1000 * sh.shares / ni.ttm_ni > 0
             AND hp.close * 1000 * sh.shares / ni.ttm_ni < 500
            THEN ROUND((hp.close * 1000 / (ni.ttm_ni / sh.shares))::numeric, 2)
        ELSE NULL
    END AS pe,

    CASE
        WHEN fr.pb IS NOT NULL
            THEN fr.pb
        WHEN sh.shares > 0
             AND eq.equity > 0
             AND hp.close > 0
             AND hp.close * 1000 * sh.shares / eq.equity > 0
             AND hp.close * 1000 * sh.shares / eq.equity < 100
            THEN ROUND((hp.close * 1000 * sh.shares / eq.equity)::numeric, 2)
        ELSE NULL
    END AS pb,

    ROUND((fr.roe * 100)::numeric, 2) AS roe,
    ROUND((fr.roa * 100)::numeric, 2) AS roa,

    CASE
        WHEN fr.debt_to_equity IS NOT NULL
            THEN ROUND(fr.debt_to_equity::numeric, 2)
        WHEN tl.total_liabilities IS NOT NULL AND eq.equity > 0
            THEN ROUND((tl.total_liabilities / eq.equity)::numeric, 2)
        ELSE NULL
    END AS debt_to_equity,

    CASE
        WHEN fr.dividend_yield IS NOT NULL
            THEN ROUND((fr.dividend_yield * 100)::numeric, 2)
        WHEN dv.ttm_div IS NOT NULL
             AND dv.ttm_div > 0
             AND hp.close > 0
             AND sh.shares > 0
             AND hp.close * 1000 * sh.shares > 0
            THEN ROUND((dv.ttm_div / (hp.close * 1000 * sh.shares) * 100)::numeric, 2)
        ELSE NULL
    END AS dividend_yield,

    CASE
        WHEN tr.ttm_rev IS NOT NULL AND pr.prev_rev IS NOT NULL AND pr.prev_rev <> 0
            THEN ROUND((((tr.ttm_rev - pr.prev_rev) / ABS(pr.prev_rev)) * 100)::numeric, 1)
        ELSE NULL
    END AS revenue_growth,

    CASE
        WHEN ni.ttm_ni IS NOT NULL AND pn.prev_ni IS NOT NULL AND pn.prev_ni <> 0
            THEN ROUND((((ni.ttm_ni - pn.prev_ni) / ABS(pn.prev_ni)) * 100)::numeric, 1)
        ELSE NULL
    END AS profit_growth,

    CASE
        WHEN eb.eb_price > 0 AND eb.foreign_buy IS NOT NULL AND eb.foreign_sell IS NOT NULL
            THEN ROUND((((eb.foreign_buy - eb.foreign_sell) * eb.eb_price) / 1e9)::numeric, 2)
        ELSE NULL
    END AS foreign_net_buy,

    ROUND((w52.high_52w * 1000)::numeric, 0) AS high_52w,
    ROUND((w52.low_52w * 1000)::numeric, 0) AS low_52w,

    CASE
        WHEN hp.close > 0 AND w52.low_52w > 0
            THEN ROUND((((hp.close - w52.low_52w) / w52.low_52w) * 100)::numeric, 2)
        ELSE NULL
    END AS week_change_52
FROM base_stocks bs
CROSS JOIN dates d
LEFT JOIN hp_latest hp ON hp.ticker = bs.ticker
LEFT JOIN hp_prev ON hp_prev.ticker = bs.ticker
LEFT JOIN co_dedup co ON co.ticker = bs.ticker
LEFT JOIN shares sh ON sh.ticker = bs.ticker
LEFT JOIN equity eq ON eq.ticker = bs.ticker
LEFT JOIN ttm_ni ni ON ni.ticker = bs.ticker
LEFT JOIN prev_ni pn ON pn.ticker = bs.ticker
LEFT JOIN ttm_rev tr ON tr.ticker = bs.ticker
LEFT JOIN prev_rev pr ON pr.ticker = bs.ticker
LEFT JOIN latest_fr fr ON fr.ticker = bs.ticker
LEFT JOIN total_liabilities tl ON tl.ticker = bs.ticker
LEFT JOIN ttm_div dv ON dv.ticker = bs.ticker
LEFT JOIN latest_eb eb ON eb.ticker = bs.ticker
LEFT JOIN week52 w52 ON w52.ticker = bs.ticker
LEFT JOIN avg_vol_10d av ON av.ticker = bs.ticker
LEFT JOIN sparkline sp ON sp.ticker = bs.ticker
WITH NO DATA;

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_stock_screener_base_ticker
    ON mv_stock_screener_base (ticker);

CREATE INDEX IF NOT EXISTS idx_mv_stock_screener_base_sector
    ON mv_stock_screener_base (sector);

CREATE INDEX IF NOT EXISTS idx_mv_stock_screener_base_exchange
    ON mv_stock_screener_base (exchange);

CREATE INDEX IF NOT EXISTS idx_mv_stock_screener_base_market_cap
    ON mv_stock_screener_base (market_cap DESC);

CREATE INDEX IF NOT EXISTS idx_mv_stock_screener_base_price_change_percent
    ON mv_stock_screener_base (price_change_percent DESC);

CREATE INDEX IF NOT EXISTS idx_mv_stock_screener_base_volume
    ON mv_stock_screener_base (volume DESC);

CREATE INDEX IF NOT EXISTS idx_mv_stock_screener_base_pe
    ON mv_stock_screener_base (pe);

CREATE INDEX IF NOT EXISTS idx_mv_stock_screener_base_pb
    ON mv_stock_screener_base (pb);

CREATE INDEX IF NOT EXISTS idx_mv_stock_screener_base_company_name
    ON mv_stock_screener_base (company_name);

-- Initial load
REFRESH MATERIALIZED VIEW mv_stock_screener_base;

-- For periodic refresh (recommended by scheduler / cron):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_screener_base;


