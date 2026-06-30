 WITH ranked_dates AS (
         SELECT DISTINCT history_price.trading_date
           FROM history_price
          WHERE (history_price.trading_date IS NOT NULL)
          ORDER BY history_price.trading_date DESC
         LIMIT 2
        ), dates AS (
         SELECT max(
                CASE
                    WHEN (t.rn = 1) THEN t.trading_date
                    ELSE NULL::text
                END) AS latest_date,
            max(
                CASE
                    WHEN (t.rn = 2) THEN t.trading_date
                    ELSE NULL::text
                END) AS prev_date,
            to_char((((to_date(max(
                CASE
                    WHEN (t.rn = 1) THEN t.trading_date
                    ELSE NULL::text
                END), 'YYYY-MM-DD'::text) - '365 days'::interval))::date)::timestamp with time zone, 'YYYY-MM-DD'::text) AS date_52w_ago
           FROM ( SELECT ranked_dates.trading_date,
                    row_number() OVER (ORDER BY ranked_dates.trading_date DESC) AS rn
                   FROM ranked_dates) t
        ), ticker_universe AS (
         SELECT company_overview.ticker
           FROM company_overview
        UNION
         SELECT hp_1.ticker
           FROM (history_price hp_1
             JOIN dates d_1 ON ((hp_1.trading_date = d_1.latest_date)))
        UNION
         SELECT financial_ratio.ticker
           FROM financial_ratio
        UNION
         SELECT bctc.ticker
           FROM bctc
        UNION
         SELECT eb_1.ticker
           FROM electric_board eb_1
          WHERE (eb_1.trading_date = ( SELECT max(electric_board.trading_date) AS max
                   FROM electric_board))
        ), base_stocks AS (
         SELECT DISTINCT upper(btrim((ticker_universe.ticker)::text)) AS ticker
           FROM ticker_universe
          WHERE ((ticker_universe.ticker IS NOT NULL) AND (btrim((ticker_universe.ticker)::text) <> ALL (ARRAY[''::text, 'NaN'::text])) AND (upper(btrim((ticker_universe.ticker)::text)) !~~ '%INDEX'::text))
        ), bctc_data AS (
         SELECT upper(btrim((bctc.ticker)::text)) AS ticker,
            bctc.year,
            bctc.quarter,
            bctc.ind_code,
            bctc.value
           FROM bctc
          WHERE ((bctc.ind_code = ANY (ARRAY['cp_pho_thong'::text, 'vcsh'::text, 'no_phai_tra'::text, 'lnst_cua_co_dong_cong_ty_me'::text, 'doanh_thu_thuan'::text, 'co_tuc_da_tra'::text])) AND (bctc.value IS NOT NULL) AND (bctc.value <> (0)::numeric))
        ), shares AS (
         SELECT DISTINCT ON (bctc_data.ticker) bctc_data.ticker,
            (bctc_data.value / 10000.0) AS shares
           FROM bctc_data
          WHERE ((bctc_data.ind_code = 'cp_pho_thong'::text) AND (bctc_data.value > (0)::numeric))
          ORDER BY bctc_data.ticker, bctc_data.year DESC, bctc_data.quarter DESC
        ), equity AS (
         SELECT DISTINCT ON (bctc_data.ticker) bctc_data.ticker,
            bctc_data.value AS equity
           FROM bctc_data
          WHERE ((bctc_data.ind_code = 'vcsh'::text) AND (bctc_data.value > (0)::numeric))
          ORDER BY bctc_data.ticker, bctc_data.year DESC, bctc_data.quarter DESC
        ), total_liabilities AS (
         SELECT DISTINCT ON (bctc_data.ticker) bctc_data.ticker,
            bctc_data.value AS total_liabilities
           FROM bctc_data
          WHERE (bctc_data.ind_code = 'no_phai_tra'::text)
          ORDER BY bctc_data.ticker, bctc_data.year DESC, bctc_data.quarter DESC
        ), ranked_ni AS (
         SELECT bctc_data.ticker,
            bctc_data.value,
            row_number() OVER (PARTITION BY bctc_data.ticker ORDER BY bctc_data.year DESC, bctc_data.quarter DESC) AS rn
           FROM bctc_data
          WHERE (bctc_data.ind_code = 'lnst_cua_co_dong_cong_ty_me'::text)
        ), ttm_ni AS (
         SELECT ranked_ni.ticker,
            sum(ranked_ni.value) AS ttm_ni
           FROM ranked_ni
          WHERE (ranked_ni.rn <= 4)
          GROUP BY ranked_ni.ticker
         HAVING (count(*) >= 2)
        ), prev_ni AS (
         SELECT ranked_ni.ticker,
            sum(ranked_ni.value) AS prev_ni
           FROM ranked_ni
          WHERE ((ranked_ni.rn >= 5) AND (ranked_ni.rn <= 8))
          GROUP BY ranked_ni.ticker
         HAVING (count(*) = 4)
        ), ranked_rev AS (
         SELECT bctc_data.ticker,
            bctc_data.value,
            row_number() OVER (PARTITION BY bctc_data.ticker ORDER BY bctc_data.year DESC, bctc_data.quarter DESC) AS rn
           FROM bctc_data
          WHERE (bctc_data.ind_code = 'doanh_thu_thuan'::text)
        ), ttm_rev AS (
         SELECT ranked_rev.ticker,
            sum(ranked_rev.value) AS ttm_rev
           FROM ranked_rev
          WHERE (ranked_rev.rn <= 4)
          GROUP BY ranked_rev.ticker
         HAVING (count(*) >= 2)
        ), prev_rev AS (
         SELECT ranked_rev.ticker,
            sum(ranked_rev.value) AS prev_rev
           FROM ranked_rev
          WHERE ((ranked_rev.rn >= 5) AND (ranked_rev.rn <= 8))
          GROUP BY ranked_rev.ticker
         HAVING (count(*) = 4)
        ), ranked_div AS (
         SELECT bctc_data.ticker,
            bctc_data.value,
            row_number() OVER (PARTITION BY bctc_data.ticker ORDER BY bctc_data.year DESC, bctc_data.quarter DESC) AS rn
           FROM bctc_data
          WHERE (bctc_data.ind_code = 'co_tuc_da_tra'::text)
        ), ttm_div AS (
         SELECT ranked_div.ticker,
            sum(abs(ranked_div.value)) AS ttm_div
           FROM ranked_div
          WHERE (ranked_div.rn <= 4)
          GROUP BY ranked_div.ticker
         HAVING (count(*) >= 2)
        ), latest_fr AS (
         SELECT DISTINCT ON ((upper(btrim((financial_ratio.ticker)::text)))) upper(btrim((financial_ratio.ticker)::text)) AS ticker,
            financial_ratio.roe,
            financial_ratio.roa,
            financial_ratio.market_cap,
            financial_ratio.pe,
            financial_ratio.pb,
            financial_ratio.eps,
            financial_ratio.dividend_yield,
            financial_ratio.debt_to_equity
           FROM financial_ratio
          ORDER BY (upper(btrim((financial_ratio.ticker)::text))), financial_ratio.year DESC, financial_ratio.quarter DESC
        ), hp_latest AS (
         SELECT upper(btrim((hp_1.ticker)::text)) AS ticker,
            hp_1.close,
            hp_1.volume
           FROM (history_price hp_1
             JOIN dates d_1 ON ((hp_1.trading_date = d_1.latest_date)))
        ), hp_prev AS (
         SELECT upper(btrim((hp_1.ticker)::text)) AS ticker,
            hp_1.close
           FROM (history_price hp_1
             JOIN dates d_1 ON ((hp_1.trading_date = d_1.prev_date)))
        ), co_dedup AS (
         SELECT DISTINCT ON ((upper(btrim((company_overview.ticker)::text)))) upper(btrim((company_overview.ticker)::text)) AS ticker,
                CASE
                    WHEN ((company_overview.organ_short_name IS NOT NULL) AND (btrim(company_overview.organ_short_name) <> ALL (ARRAY[''::text, 'NaN'::text]))) THEN btrim(company_overview.organ_short_name)
                    WHEN ((company_overview.organ_name IS NOT NULL) AND (btrim(company_overview.organ_name) <> ALL (ARRAY[''::text, 'NaN'::text]))) THEN btrim(company_overview.organ_name)
                    ELSE NULL::text
                END AS company_name,
                CASE
                    WHEN ((company_overview.icb_name3 IS NOT NULL) AND (btrim(company_overview.icb_name3) <> ALL (ARRAY[''::text, 'NaN'::text]))) THEN btrim(company_overview.icb_name3)
                    WHEN ((company_overview.icb_name2 IS NOT NULL) AND (btrim(company_overview.icb_name2) <> ALL (ARRAY[''::text, 'NaN'::text]))) THEN btrim(company_overview.icb_name2)
                    ELSE 'Chua phan loai'::text
                END AS sector,
                CASE
                    WHEN ((company_overview.icb_name2 IS NOT NULL) AND (btrim(company_overview.icb_name2) <> ALL (ARRAY[''::text, 'NaN'::text]))) THEN btrim(company_overview.icb_name2)
                    ELSE NULL::text
                END AS sector2,
                CASE
                    WHEN (company_overview.exchange = 'HSX'::text) THEN 'HOSE'::text
                    WHEN ((company_overview.exchange IS NOT NULL) AND (btrim(company_overview.exchange) <> ALL (ARRAY[''::text, 'NaN'::text]))) THEN btrim(company_overview.exchange)
                    ELSE NULL::text
                END AS exchange
           FROM company_overview
          WHERE ((company_overview.exchange IS NULL) OR ((btrim(company_overview.exchange) <> 'NaN'::text) AND (btrim(company_overview.exchange) <> 'DELISTED'::text)))
          ORDER BY (upper(btrim((company_overview.ticker)::text))),
                CASE
                    WHEN ((company_overview.organ_short_name IS NOT NULL) AND (btrim(company_overview.organ_short_name) <> 'NaN'::text)) THEN 0
                    ELSE 1
                END,
                CASE
                    WHEN (company_overview.exchange = 'HSX'::text) THEN 'HOSE'::text
                    WHEN ((company_overview.exchange IS NOT NULL) AND (btrim(company_overview.exchange) <> ALL (ARRAY[''::text, 'NaN'::text]))) THEN btrim(company_overview.exchange)
                    ELSE NULL::text
                END
        ), latest_eb AS (
         SELECT DISTINCT ON ((upper(btrim((electric_board.ticker)::text)))) upper(btrim((electric_board.ticker)::text)) AS ticker,
            COALESCE(electric_board.foreign_buy_volume, (0)::bigint) AS foreign_buy,
            COALESCE(electric_board.foreign_sell_volume, (0)::bigint) AS foreign_sell,
                CASE
                    WHEN (electric_board.match_price > (0)::numeric) THEN electric_board.match_price
                    ELSE electric_board.ref_price
                END AS eb_price
           FROM electric_board
          WHERE ((electric_board.match_price > (0)::numeric) OR (electric_board.ref_price > (0)::numeric))
          ORDER BY (upper(btrim((electric_board.ticker)::text))), electric_board.trading_date DESC
        ), last20 AS (
         SELECT x.ticker,
            x.trading_date,
            x.close
           FROM ( SELECT upper(btrim((history_price.ticker)::text)) AS ticker,
                    history_price.trading_date,
                    history_price.close,
                    row_number() OVER (PARTITION BY (upper(btrim((history_price.ticker)::text))) ORDER BY history_price.trading_date DESC) AS rn
                   FROM history_price) x
          WHERE (x.rn <= 20)
        ), sparkline AS (
         SELECT last20.ticker,
            array_agg(round((last20.close * (1000)::numeric), 0) ORDER BY last20.trading_date) AS sparkline
           FROM last20
          GROUP BY last20.ticker
        ), avg_vol_10d AS (
         SELECT x.ticker,
            (round(avg(x.volume)))::bigint AS avg_volume_10d
           FROM ( SELECT upper(btrim((history_price.ticker)::text)) AS ticker,
                    history_price.volume,
                    row_number() OVER (PARTITION BY (upper(btrim((history_price.ticker)::text))) ORDER BY history_price.trading_date DESC) AS rn
                   FROM history_price) x
          WHERE (x.rn <= 10)
          GROUP BY x.ticker
        ), week52 AS (
         SELECT upper(btrim((hp_1.ticker)::text)) AS ticker,
            max(hp_1.high) AS high_52w,
            min(hp_1.low) AS low_52w
           FROM (history_price hp_1
             JOIN dates d_1 ON ((hp_1.trading_date >= d_1.date_52w_ago)))
          GROUP BY (upper(btrim((hp_1.ticker)::text)))
        )
 SELECT bs.ticker,
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
    round((hp.close * (1000)::numeric), 0) AS current_price,
        CASE
            WHEN (hp_prev.close > (0)::numeric) THEN round(((hp.close - hp_prev.close) * (1000)::numeric), 0)
            ELSE NULL::numeric
        END AS price_change,
        CASE
            WHEN (hp_prev.close > (0)::numeric) THEN round((((hp.close - hp_prev.close) / hp_prev.close) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS price_change_percent,
        CASE
            WHEN (fr.market_cap IS NOT NULL) THEN fr.market_cap
            WHEN ((sh.shares > (0)::numeric) AND (hp.close > (0)::numeric)) THEN (round((((hp.close * (1000)::numeric) * sh.shares) / '1000000000'::numeric), 1))::double precision
            ELSE NULL::double precision
        END AS market_cap,
        CASE
            WHEN (fr.eps IS NOT NULL) THEN fr.eps
            WHEN ((sh.shares > (0)::numeric) AND (ni.ttm_ni IS NOT NULL)) THEN (round((ni.ttm_ni / sh.shares), 0))::double precision
            ELSE NULL::double precision
        END AS eps,
        CASE
            WHEN (fr.pe IS NOT NULL) THEN fr.pe
            WHEN ((sh.shares > (0)::numeric) AND (ni.ttm_ni IS NOT NULL) AND (ni.ttm_ni > (0)::numeric) AND ((((hp.close * (1000)::numeric) * sh.shares) / ni.ttm_ni) > (0)::numeric) AND ((((hp.close * (1000)::numeric) * sh.shares) / ni.ttm_ni) < (500)::numeric)) THEN (round(((hp.close * (1000)::numeric) / (ni.ttm_ni / sh.shares)), 2))::double precision
            ELSE NULL::double precision
        END AS pe,
        CASE
            WHEN (fr.pb IS NOT NULL) THEN fr.pb
            WHEN ((sh.shares > (0)::numeric) AND (eq.equity > (0)::numeric) AND (hp.close > (0)::numeric) AND ((((hp.close * (1000)::numeric) * sh.shares) / eq.equity) > (0)::numeric) AND ((((hp.close * (1000)::numeric) * sh.shares) / eq.equity) < (100)::numeric)) THEN (round((((hp.close * (1000)::numeric) * sh.shares) / eq.equity), 2))::double precision
            ELSE NULL::double precision
        END AS pb,
    round(((fr.roe * (100)::double precision))::numeric, 2) AS roe,
    round(((fr.roa * (100)::double precision))::numeric, 2) AS roa,
        CASE
            WHEN (fr.debt_to_equity IS NOT NULL) THEN round((fr.debt_to_equity)::numeric, 2)
            WHEN ((tl.total_liabilities IS NOT NULL) AND (eq.equity > (0)::numeric)) THEN round((tl.total_liabilities / eq.equity), 2)
            ELSE NULL::numeric
        END AS debt_to_equity,
        CASE
            WHEN (fr.dividend_yield IS NOT NULL) THEN round(((fr.dividend_yield * (100)::double precision))::numeric, 2)
            WHEN ((dv.ttm_div IS NOT NULL) AND (dv.ttm_div > (0)::numeric) AND (hp.close > (0)::numeric) AND (sh.shares > (0)::numeric) AND (((hp.close * (1000)::numeric) * sh.shares) > (0)::numeric)) THEN round(((dv.ttm_div / ((hp.close * (1000)::numeric) * sh.shares)) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS dividend_yield,
        CASE
            WHEN ((tr.ttm_rev IS NOT NULL) AND (pr.prev_rev IS NOT NULL) AND (pr.prev_rev <> (0)::numeric)) THEN round((((tr.ttm_rev - pr.prev_rev) / abs(pr.prev_rev)) * (100)::numeric), 1)
            ELSE NULL::numeric
        END AS revenue_growth,
        CASE
            WHEN ((ni.ttm_ni IS NOT NULL) AND (pn.prev_ni IS NOT NULL) AND (pn.prev_ni <> (0)::numeric)) THEN round((((ni.ttm_ni - pn.prev_ni) / abs(pn.prev_ni)) * (100)::numeric), 1)
            ELSE NULL::numeric
        END AS profit_growth,
        CASE
            WHEN ((eb.eb_price > (0)::numeric) AND (eb.foreign_buy IS NOT NULL) AND (eb.foreign_sell IS NOT NULL)) THEN round(((((eb.foreign_buy - eb.foreign_sell))::numeric * eb.eb_price) / '1000000000'::numeric), 2)
            ELSE NULL::numeric
        END AS foreign_net_buy,
    round((w52.high_52w * (1000)::numeric), 0) AS high_52w,
    round((w52.low_52w * (1000)::numeric), 0) AS low_52w,
        CASE
            WHEN ((hp.close > (0)::numeric) AND (w52.low_52w > (0)::numeric)) THEN round((((hp.close - w52.low_52w) / w52.low_52w) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS week_change_52
   FROM (((((((((((((((((base_stocks bs
     CROSS JOIN dates d)
     LEFT JOIN hp_latest hp ON ((hp.ticker = bs.ticker)))
     LEFT JOIN hp_prev ON ((hp_prev.ticker = bs.ticker)))
     LEFT JOIN co_dedup co ON ((co.ticker = bs.ticker)))
     LEFT JOIN shares sh ON ((sh.ticker = bs.ticker)))
     LEFT JOIN equity eq ON ((eq.ticker = bs.ticker)))
     LEFT JOIN ttm_ni ni ON ((ni.ticker = bs.ticker)))
     LEFT JOIN prev_ni pn ON ((pn.ticker = bs.ticker)))
     LEFT JOIN ttm_rev tr ON ((tr.ticker = bs.ticker)))
     LEFT JOIN prev_rev pr ON ((pr.ticker = bs.ticker)))
     LEFT JOIN latest_fr fr ON ((fr.ticker = bs.ticker)))
     LEFT JOIN total_liabilities tl ON ((tl.ticker = bs.ticker)))
     LEFT JOIN ttm_div dv ON ((dv.ticker = bs.ticker)))
     LEFT JOIN latest_eb eb ON ((eb.ticker = bs.ticker)))
     LEFT JOIN week52 w52 ON ((w52.ticker = bs.ticker)))
     LEFT JOIN avg_vol_10d av ON ((av.ticker = bs.ticker)))
     LEFT JOIN sparkline sp ON ((sp.ticker = bs.ticker)));