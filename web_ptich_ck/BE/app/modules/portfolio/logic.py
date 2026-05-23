from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
import numpy as np
import math
from datetime import date

from app.modules.portfolio.schemas import CreatePortfolioRequest, PositionInput

SCHEMA = "system"
DATA_SCHEMA = "hethong_phantich_chungkhoan"

def _safe_float(value, default=0.0):
    try:
        if value is None: return default
        return float(value)
    except:
        return default

async def create_portfolio(db: AsyncSession, payload: CreatePortfolioRequest):
    # 1. Create Portfolio
    sql_port = text(f"""
        INSERT INTO {SCHEMA}.portfolio (name, risk_profile, benchmark)
        VALUES (:name, :risk_profile, :benchmark)
        RETURNING id, name, risk_profile, benchmark, created_at
    """)
    result = await db.execute(sql_port, {
        "name": payload.name,
        "risk_profile": payload.risk_profile,
        "benchmark": payload.benchmark
    })
    portfolio = result.mappings().first()
    portfolio_id = portfolio["id"]
    
    # 2. Insert Positions
    positions_ret = []
    if payload.positions:
        for pos in payload.positions:
            sql_pos = text(f"""
                INSERT INTO {SCHEMA}.portfolio_position (portfolio_id, ticker, qty, avg_cost, buy_date)
                VALUES (:portfolio_id, :ticker, :qty, :avg_cost, :buy_date)
                RETURNING id, portfolio_id, ticker, qty, avg_cost, buy_date, sector, exchange
            """)
            res_pos = await db.execute(sql_pos, {
                "portfolio_id": portfolio_id,
                "ticker": pos.ticker.upper(),
                "qty": pos.qty,
                "avg_cost": pos.avg_cost,
                "buy_date": pos.buy_date or date.today()
            })
            positions_ret.append(res_pos.mappings().first())
            
    # 3. Insert Default Risk Limits based on profile
    # Bao thu: VaR 95% <= 1.5%, Stop-loss -10%, Single 15%, Sector 30%
    # Can bang: VaR 95% <= 2.5%, Stop-loss -15%, Single 20%, Sector 40%
    # Tang truong: VaR 95% <= 4.0%, Stop-loss -20%, Single 25%, Sector 50%
    # Tich cuc: VaR 95% <= 6.0%, Stop-loss -30%, Single 30%, Sector 60%
    limits = []
    rp = payload.risk_profile.lower()
    if rp == 'conservative':
        limits = [('var_95', 0.01, 0.015), ('drawdown', -0.08, -0.10), ('weight_single', 0.1, 0.15), ('weight_sector', 0.25, 0.3)]
    elif rp == 'growth':
        limits = [('var_95', 0.03, 0.04), ('drawdown', -0.15, -0.20), ('weight_single', 0.2, 0.25), ('weight_sector', 0.4, 0.5)]
    elif rp == 'aggressive':
        limits = [('var_95', 0.05, 0.06), ('drawdown', -0.25, -0.30), ('weight_single', 0.25, 0.3), ('weight_sector', 0.5, 0.6)]
    else: # balanced
        limits = [('var_95', 0.02, 0.025), ('drawdown', -0.1, -0.15), ('weight_single', 0.15, 0.2), ('weight_sector', 0.3, 0.4)]
        
    for metric, warn, breach in limits:
        sql_limit = text(f"""
            INSERT INTO {SCHEMA}.risk_limit (portfolio_id, metric, warn_threshold, breach_threshold, action)
            VALUES (:portfolio_id, :metric, :warn, :breach, 'alert')
        """)
        await db.execute(sql_limit, {
            "portfolio_id": portfolio_id,
            "metric": metric,
            "warn": warn,
            "breach": breach
        })
        
    await db.commit()
    
    return {
        "id": portfolio["id"],
        "name": portfolio["name"],
        "risk_profile": portfolio["risk_profile"],
        "benchmark": portfolio["benchmark"],
        "created_at": portfolio["created_at"],
        "positions": positions_ret
    }

async def get_portfolio_positions(db: AsyncSession, portfolio_id: int):
    sql = text(f"SELECT * FROM {SCHEMA}.portfolio_position WHERE portfolio_id = :pid")
    result = await db.execute(sql, {"pid": portfolio_id})
    return result.mappings().all()

async def get_all_portfolios(db: AsyncSession):
    sql = text(f"SELECT id, name, risk_profile, benchmark, created_at FROM {SCHEMA}.portfolio ORDER BY created_at DESC")
    result = await db.execute(sql)
    return result.mappings().all()

async def delete_portfolio(db: AsyncSession, portfolio_id: int) -> bool:
    # Check exists
    check = await db.execute(text(f"SELECT id FROM {SCHEMA}.portfolio WHERE id = :id"), {"id": portfolio_id})
    if not check.fetchone():
        return False
    # Delete child records first
    await db.execute(text(f"DELETE FROM {SCHEMA}.portfolio_risk_daily WHERE portfolio_id = :id"), {"id": portfolio_id})
    await db.execute(text(f"DELETE FROM {SCHEMA}.rebalance_order WHERE portfolio_id = :id"), {"id": portfolio_id})
    await db.execute(text(f"DELETE FROM {SCHEMA}.risk_limit WHERE portfolio_id = :id"), {"id": portfolio_id})
    await db.execute(text(f"DELETE FROM {SCHEMA}.portfolio_position WHERE portfolio_id = :id"), {"id": portfolio_id})
    await db.execute(text(f"DELETE FROM {SCHEMA}.portfolio WHERE id = :id"), {"id": portfolio_id})
    await db.commit()
    return True

import pandas as pd
from datetime import date, timedelta

async def recalc_risk_snapshot(db: AsyncSession, portfolio_id: int):
    positions = await get_portfolio_positions(db, portfolio_id)
    if not positions:
        return None
        
    # Calculate weights
    total_nav = sum([p['qty'] * p['avg_cost'] for p in positions])
    if total_nav <= 0:
        return None
        
    weights_dict = {p['ticker']: (p['qty'] * p['avg_cost']) / total_nav for p in positions}
    tickers = list(weights_dict.keys())
    
    # 1 Year lookback
    start_date = (date.today() - timedelta(days=365)).strftime('%Y-%m-%d')
    
    # Fetch history prices
    sql_prices = text(f"""
        SELECT ticker, trading_date, close, volume 
        FROM {DATA_SCHEMA}.history_price 
        WHERE ticker = ANY(:tickers) AND trading_date >= :start_date
        ORDER BY trading_date ASC
    """)
    res_prices = await db.execute(sql_prices, {"tickers": tickers, "start_date": start_date})
    rows = res_prices.mappings().all()
    
    if not rows:
        raise Exception("Không tìm thấy dữ liệu giá lịch sử cho các mã trong danh mục")
        
    df = pd.DataFrame(rows)
    df['close'] = pd.to_numeric(df['close'], errors='coerce')
    df['volume'] = pd.to_numeric(df['volume'], errors='coerce')
    
    # Pivot for closing prices
    df_close = df.pivot(index='trading_date', columns='ticker', values='close').ffill().dropna()
    
    # Align weights to df_close columns
    available_tickers = [t for t in df_close.columns if t in weights_dict]
    if not available_tickers:
        raise Exception("Dữ liệu giá không khớp với danh mục")
        
    w_array = np.array([float(weights_dict[t]) for t in available_tickers])
    w_array = w_array / w_array.sum() # Normalize to 1
    
    # Daily Returns
    df_returns = df_close[available_tickers].pct_change().dropna()
    port_returns = df_returns.dot(w_array)
    
    # Fetch VNINDEX
    sql_vnindex = text(f"""
        SELECT trading_date, close 
        FROM {DATA_SCHEMA}.market_index 
        WHERE ticker = 'VNINDEX' AND trading_date >= :start_date
        ORDER BY trading_date ASC
    """)
    res_vnindex = await db.execute(sql_vnindex, {"start_date": start_date})
    vn_rows = res_vnindex.mappings().all()
    df_vn = pd.DataFrame(vn_rows)
    df_vn['close'] = pd.to_numeric(df_vn['close'], errors='coerce')
    df_vn = df_vn.set_index('trading_date')
    vn_returns = df_vn['close'].pct_change().dropna()
    
    # Align indices
    aligned_returns = pd.concat([port_returns, vn_returns], axis=1, join='inner').dropna()
    aligned_returns.columns = ['Portfolio', 'VNINDEX']
    p_ret = aligned_returns['Portfolio']
    m_ret = aligned_returns['VNINDEX']
    
    # Compute Metrics
    # VaR & CVaR (95%)
    var_95 = np.percentile(p_ret, 5) # Negative return value
    cvar_95 = p_ret[p_ret <= var_95].mean()
    
    var_95_val = abs(float(var_95)) if not np.isnan(var_95) else 0.0
    cvar_95_val = abs(float(cvar_95)) if not np.isnan(cvar_95) else 0.0
    
    # Beta
    if len(p_ret) > 1 and m_ret.var() > 0:
        cov = np.cov(p_ret, m_ret)[0, 1]
        beta = float(cov / m_ret.var())
    else:
        beta = 1.0
        
    # Sharpe Ratio (Risk-free = 4.5% / year)
    rf_daily = 0.045 / 252
    std_dev = p_ret.std()
    if std_dev > 0:
        sharpe = float((p_ret.mean() - rf_daily) / std_dev * np.sqrt(252))
    else:
        sharpe = 0.0
        
    # Max Drawdown
    cum_returns = (1 + port_returns).cumprod()
    peak = cum_returns.cummax()
    drawdown = (cum_returns - peak) / peak
    max_drawdown = float(drawdown.min()) if len(drawdown) > 0 else 0.0
    
    # HHI
    hhi = float((w_array ** 2).sum())
    
    # Liquidity Days
    liquidity_days = 0.0
    for p in positions:
        ticker = p['ticker']
        qty = p['qty']
        ticker_data = df[df['ticker'] == ticker]
        if not ticker_data.empty and len(ticker_data) >= 20:
            avg_vol = ticker_data['volume'].tail(20).mean()
            if avg_vol > 0:
                # assuming max we can sell is 10% of avg volume per day
                days = qty / (avg_vol * 0.1)
                liquidity_days = max(liquidity_days, float(days))
    
    daily_return = float(port_returns.iloc[-1]) if len(port_returns) > 0 else 0.0

    # Save to DB
    sql_risk = text(f"""
        INSERT INTO {SCHEMA}.portfolio_risk_daily 
        (portfolio_id, date, nav, daily_return, var_95_1d, cvar_95, beta, sharpe, sortino, max_drawdown, current_drawdown, hhi, liquidity_days)
        VALUES (:pid, :dt, :nav, :dr, :var, :cvar, :beta, :sharpe, :sortino, :mdd, :cdd, :hhi, :liq)
        ON CONFLICT (portfolio_id, date) DO UPDATE SET
        nav = EXCLUDED.nav,
        daily_return = EXCLUDED.daily_return,
        var_95_1d = EXCLUDED.var_95_1d,
        cvar_95 = EXCLUDED.cvar_95,
        beta = EXCLUDED.beta,
        sharpe = EXCLUDED.sharpe,
        max_drawdown = EXCLUDED.max_drawdown,
        hhi = EXCLUDED.hhi,
        liquidity_days = EXCLUDED.liquidity_days
        RETURNING *
    """)
    
    res = await db.execute(sql_risk, {
        "pid": portfolio_id,
        "dt": date.today(),
        "nav": total_nav,
        "dr": daily_return,
        "var": var_95_val,
        "cvar": cvar_95_val,
        "beta": beta,
        "sharpe": sharpe,
        "sortino": sharpe, # Simplified
        "mdd": max_drawdown,
        "cdd": float(drawdown.iloc[-1]) if len(drawdown) > 0 else 0.0,
        "hhi": hhi,
        "liq": liquidity_days
    })
    await db.commit()
    return res.mappings().first()

async def get_latest_risk_snapshot(db: AsyncSession, portfolio_id: int):
    sql = text(f"SELECT * FROM {SCHEMA}.portfolio_risk_daily WHERE portfolio_id = :pid ORDER BY date DESC LIMIT 1")
    res = await db.execute(sql, {"pid": portfolio_id})
    return res.mappings().first()
