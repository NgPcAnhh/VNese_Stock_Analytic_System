⚡ RISK_SYS v1.0 - Vibe Coding Workflow & Spec

Context: Hệ thống Quản trị rủi ro & Tối ưu danh mục đầu tư chứng khoán Việt Nam (HOSE, HNX, UPCOM).
Data Foundation: Chạy trực tiếp trên schema hethong_phantich_chungkhoan hiện có. Không cần nguồn data ngoài.
Architecture: Python + FastAPI (Backend/Calc Engine), React + TS (Frontend), PostgreSQL (DB), Redis + APScheduler (Jobs/Cache).

🎯 TRÌNH TỰ TRIỂN KHAI (VIBE CODING ROADMAP)

Khuyến nghị làm theo thứ tự này để luồng flow mượt nhất, không bị lỗi thiếu data.

[ ] Step 0: Khởi tạo DB Schema (Tạo 5 bảng mới cho Portfolio Layer).

[ ] Step 1: Code Phase 1 (Portfolio Setup API & Logic).

[ ] Step 2: Code Phase 2A (EOD Risk Batch - Tính VaR, Sharpe, Beta...). Core engine.

[ ] Step 3: Code Phase 5 (Alerts & Limit Monitor) - Gắn ngay vào đuôi của Phase 2A.

[ ] Step 4: Dựng Frontend Dashboard UI (Hiển thị data từ Step 1, 2, 3).

[ ] Step 5: Code Phase 3 (Optimizer Engine - Markowitz/CVXPY).

[ ] Step 6: Code Phase 4 (Rebalancing Logic - Generate trade list).

[ ] Step 7: Code Phase 2B (Intraday Fast Calc) + Realtime Websocket.

[ ] Step 8: Code Phase 6 (Analytics & Reports).

🗄️ STEP 0: DATABASE SCHEMA & MAPPING

Các bảng ĐÃ CÓ (Chỉ READ)

history_price: Nền tảng tính VaR, Beta, Return series (close, volume).

market_index: Benchmark VNINDEX để tính Beta, Alpha.

realtime_quotes / electric_board: Lấy giá intraday/EOD, khối lượng khớp.

company_overview: Lấy sector (icb_name1) tính concentration.

financial_ratio / bctc: Fundamental filter, Market Cap.

vn_macro_yearly: Lấy lãi suất phi rủi ro (lai_suat_tien_gui), tỷ giá.

news / event: Trigger sự kiện.

Các bảng CẦN TẠO MỚI (Portfolio Layer)

Copy/Paste thẳng đoạn SQL này vào Database

-- 1. Danh mục đầu tư
CREATE TABLE portfolio (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    risk_profile VARCHAR(20), -- conservative/balanced/growth/aggressive
    benchmark VARCHAR(20) DEFAULT 'VNINDEX',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Vị thế danh mục
CREATE TABLE portfolio_position (
    id SERIAL PRIMARY KEY,
    portfolio_id INT REFERENCES portfolio(id),
    ticker VARCHAR(10),
    qty INT,
    avg_cost NUMERIC(15,2),
    buy_date DATE,
    sector TEXT,
    exchange VARCHAR(10),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Hạn mức rủi ro
CREATE TABLE risk_limit (
    id SERIAL PRIMARY KEY,
    portfolio_id INT REFERENCES portfolio(id),
    metric VARCHAR(50), -- var_95, drawdown, weight_single, weight_sector, liquidity_days
    warn_threshold NUMERIC(10,4),
    breach_threshold NUMERIC(10,4),
    action VARCHAR(50)
);

-- 4. Lịch sử risk metrics (EOD snapshot)
CREATE TABLE portfolio_risk_daily (
    portfolio_id INT,
    date DATE,
    nav NUMERIC(20,2),
    daily_return NUMERIC(10,6),
    var_95_1d NUMERIC(10,6),
    cvar_95 NUMERIC(10,6),
    beta NUMERIC(8,4),
    sharpe NUMERIC(8,4),
    sortino NUMERIC(8,4),
    max_drawdown NUMERIC(10,6),
    current_drawdown NUMERIC(10,6),
    hhi NUMERIC(8,4),
    liquidity_days NUMERIC(8,2),
    PRIMARY KEY (portfolio_id, date)
);

-- 5. Đề xuất tái cân bằng
CREATE TABLE rebalance_order (
    id SERIAL PRIMARY KEY,
    portfolio_id INT,
    triggered_by VARCHAR(30),
    ticker VARCHAR(10),
    action VARCHAR(4), -- BUY/SELL
    qty INT,
    target_price NUMERIC(15,2),
    est_cost NUMERIC(15,2),
    status VARCHAR(20), -- pending/approved/executed/cancelled
    created_at TIMESTAMP,
    executed_at TIMESTAMP,
    actual_price NUMERIC(15,2)
);


🛠️ STEP 1: PHASE 1 - PORTFOLIO SETUP

Duy nhất bước này là User Manual Input.

User Input: Nhập Ticker, Qty, Avg_Cost.

Validation (Auto): * Check ticker có trong company_overview.

Check lịch sử > 60 phiên (history_price).

DB Write: Ghi vào portfolio & portfolio_position.

Risk Profile (Config): Map config vào bảng risk_limit:

Bảo thủ: VaR 95% ≤ 1.5%, Stop-loss -10%, Single max 15%, Sector max 30%.

Cân bằng: VaR 95% ≤ 2.5%, Stop-loss -15%, Single max 20%, Sector max 40%.

Tăng trưởng: VaR 95% ≤ 4.0%, Stop-loss -20%, Single max 25%, Sector max 50%.

Tích cực: VaR 95% ≤ 6.0%, Stop-loss -30%, Single max 30%, Sector max 60%.

Trigger: Bắn ngay lệnh tính toán Phase 2A lần đầu.

⚙️ STEP 2: PHASE 2A - EOD RISK BATCH

Chạy tự động sau 15:15 hàng ngày. Tính toán nặng.

Fetch Data: Lấy 252 phiên history_price của các Tickers trong danh mục và VNINDEX. Tính daily returns.

Portfolio Return: $R_{portfolio_t} = \sum(w_i \times R_{i_t})$ (dùng tỷ trọng $w_i$ hiện tại).

VaR & CVaR (Historical):

VaR_1d = $-NAV \times np.percentile(R_{portfolio}, 5)$

CVaR = $-NAV \times mean(R[R < percentile(R, 5)])$

Metrics khác:

Beta: Linear regression (Covariance / Variance) với VNINDEX (60 phiên).

Sharpe: $(R_p - R_f) / \sigma_p$. Lấy $R_f$ từ vn_macro_yearly (lai_suat_tien_gui).

Max Drawdown: Peak-to-trough 1 năm.

HHI: $\sum(w_i^2)$ (Độ tập trung).

Liquidity Days: $Avg(Position\_Value / ADTV_{20})$.

Write: Ghi dòng mới vào portfolio_risk_daily.

🚨 STEP 3: PHASE 5 - ALERTS & LIMIT MONITOR

Trigger ngay sau khi Phase 2A hoặc 2B chạy xong.

Levels:

⚠️ WARNING (80% threshold) -> Log, In-app banner.

🔴 ALERT (95% threshold) -> Email/Push, Suggest action.

🚨 BREACH (>100% threshold) -> Block buy, Trigger Phase 4, SMS/Popup.

Các rule cần check:

L1 (VaR): (VaR / NAV) * 100 vs limit. Tính Marginal VaR để gợi ý bán mã nào.

L2 (Drawdown): Check stoploss. Nghiêm trọng nhất.

L3 (Concentration): Check $w_i$ > single limit? và $w_{sector}$ > sector limit?

L4 (Liquidity): Nếu days_to_exit > 5 ngày -> Cảnh báo.

L5 (News/Events): Quét bảng news/event có keyword ticker trong 4h-8h gần nhất.

L6 (Macro/Beta): Beta > 1.3 + VNINDEX giảm 3 phiên liên tiếp -> Cảnh báo Defensive.

🧠 STEP 5: PHASE 3 - OPTIMIZER (MARKOWITZ)

Chạy On-demand (User bấm nút).

Prep: Lấy N phiên lịch sử, filter CP kém thanh khoản (< 100k vol).

Expected Returns & Covariance:

Dùng sklearn.covariance.LedoitWolf để tính Covariance Matrix (tránh nhiễu khi danh mục > 20 mã).

QP Solver (CVXPY):

# Pseudo-code cho Vibe Coding
constraints = [
    cp.sum(w) == 1,              # Fully invested
    w >= 0.01,                   # Min weight 1%
    w <= max_weight_limit,       # Từ risk profile
    w <= liquidity_cap_limit,    # Dựa trên ADTV_20
    sector_w <= sector_max       # Concentration check
]
# Objective: Minimize Variance, Maximize Sharpe, or Risk Parity.
# Result -> Optimal Weights vector


Efficient Frontier: Chạy vòng lặp 50 target returns để vẽ biểu đồ.

Calculate Trade Cost: So sánh tỷ trọng hiện tại vs Tối ưu $\rightarrow$ Tính phí thuế (0.1% sell + 0.15% phí).

⚖️ STEP 6: PHASE 4 - REBALANCING

Trigger từ: Lịch (Tháng) / Ngưỡng lệch (>5%) / Nút Approve từ Phase 3.

Calculate Delta: $\Delta w = w_{target} - w_{current}$. Tính ra số cổ phiếu chênh lệch làm tròn lô 100.

Validate: * CP Sell đã về tài khoản chưa (T+2).

Giá trị lệnh < 10% $ADTV_{20}$ không.

Đủ tiền mặt không.

Write Order: Ghi vào rebalance_order (Status: Pending). Ưu tiên SELL trước BUY sau.

Execution (Mock): User approve -> Update lại portfolio_position -> Kích hoạt Phase 2A tính lại.

⚡ STEP 7: PHASE 2B - INTRADAY FAST CALC

Chạy mỗi 15p trong giờ giao dịch bằng Background Job.

Read Price: realtime_quotes (last_price).

Realtime NAV: $\sum(qty \times last\_price)$.

Parametric VaR: $VaR = NAV \times 1.645 \times \sqrt{w^T \cdot \Sigma \cdot w}$.
(Lưu ý: Dùng lại Covariance Matrix $\Sigma$ đã tính từ EOD hôm trước để chạy cho nhanh).

Trigger L1, L2, L3 Alerts tức thì nếu vi phạm.

📊 STEP 8: PHASE 6 - ANALYTICS (Optional/Deep Dive)

Attribution: Return đóng góp theo Ticker / Ngành. Tính Alpha.

Stress Test: Simulate VNINDEX sập 35% (Covid) hoặc Lãi suất tăng 200bps.

Fundamental Score: Scan financial_ratio (ROE, P/E) + bctc (EPS YoY).

🌐 API SPEC (FastAPI Blueprint)

# --- PORTFOLIO ---
POST /api/portfolios                     # Khởi tạo
GET  /api/portfolios/{id}/positions      # Kèm realtime price
PUT  /api/portfolios/{id}/positions      # Manual update

# --- RISK METRICS ---
GET  /api/portfolios/{id}/risk/snapshot  # Latest (P2)
GET  /api/portfolios/{id}/risk/history   # Time-series charts
POST /api/portfolios/{id}/risk/recalc    # Force trigger P2

# --- OPTIMIZATION (P3) ---
POST /api/portfolios/{id}/optimize       # { method, window_days }
GET  /api/optimizations/{opt_id}         # Frontier data & Weights
POST /api/optimizations/{opt_id}/approve # Chuyển sang P4

# --- REBALANCING & ALERTS ---
GET  /api/portfolios/{id}/rebalance/orders
POST /api/portfolios/{id}/rebalance/execute
GET  /api/portfolios/{id}/alerts

# --- MARKET DATA WRAPPERS ---
GET  /api/market/quote/{ticker}
GET  /api/market/history/{ticker}?from=...
GET  /api/market/news/{ticker}
