"""
SQL queries and business logic for the Stock module.

Endpoints:
  1. get_stock_overview   — mega endpoint (overview tab)
  2. get_price_history    — OHLCV chart data
  3. get_financial_ratios — ratio table (pe, pb, roe, …)
  4. get_financial_reports — IS, BS, CF from BCTC table
  5. get_company_profile  — company info + events + owners
"""
from __future__ import annotations

import asyncio
import difflib
import json
import logging
import re
import unicodedata
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cached

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────
# Constants (shared with analysis module via import)
# ────────────────────────────────────────────────────────────────────
_STMT_TIMEOUT = text("SET LOCAL statement_timeout = '15000'")
SCHEMA = "hethong_phantich_chungkhoan"

# CTEs for latest trading dates
_RANKED_DATES_CTE = f"""
    ranked_dates AS (
        SELECT trading_date,
               ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
        FROM {SCHEMA}.history_price
        WHERE close IS NOT NULL
        GROUP BY trading_date
        HAVING COUNT(*) >= 50
    ),
    latest_date AS (SELECT trading_date AS td FROM ranked_dates WHERE rn = 1),
    prev_date   AS (SELECT trading_date AS td FROM ranked_dates WHERE rn = 2)
"""

_EB_RANKED_DATES_CTE = f"""
    eb_ranked AS (
        SELECT trading_date,
               ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
        FROM {SCHEMA}.electric_board
        WHERE match_price IS NOT NULL
        GROUP BY trading_date
    ),
    eb_latest AS (SELECT trading_date AS td FROM eb_ranked WHERE rn = 1),
    eb_prev   AS (SELECT trading_date AS td FROM eb_ranked WHERE rn = 2)
"""


# ────────────────────────────────────────────────────────────────────
# BCTC ind_code mappings for financial statements
# (Vietnamese-encoded names as stored in DB)
# ────────────────────────────────────────────────────────────────────
# Income Statement
IS_CODES: Dict[str, str] = {
    "revenue":          "doanh_thu_thuan",
    "costOfGoodsSold":  "gia_von_hang_ban",
    "grossProfit":      "ln_gop",
    "sellingExpenses":  "chi_phi_ban_hang",
    "adminExpenses":    "cp_qldn",
    "operatingProfit":  "lai_lo_tu_hoat_dong_kinh_doanh",
    "financialIncome":  "dt_tc",
    "financialExpenses":"chi_phi_tai_chinh",
    "interestExpenses": "cp_lai_vay",
    "profitBeforeTax":  "lntt",
    "incomeTax":        "thue_tndn_hh",
    "netProfit":        "loi_nhuan_thuan",
    "netProfitParent":  "lnst_cua_co_dong_cong_ty_me",
    "basicEps":         "lai_co_ban_tren_co_phieu",
    "otherIncome":      "thu_nhap_khac",
}

# Additional IS fields resolved by ind_name fallback to avoid ind_code drift.
IS_IND_NAME_FALLBACKS: Dict[str, List[str]] = {
    "otherIncome": [
        "Thu nhập khác",
        "Profits from other activities",
    ],
    "extraordinaryIncome": [
        "Thu nhập/Chi phí khác",
        "Net Other income/(expenses)",
        "Net Other income/expenses",
        "Lãi/lỗ thuần từ hoạt động khác",
        "(Lãi)/lỗ các hoạt động khác",
    ],
    "otherExpense": [
        "Chi phí khác",
        "Other expenses",
    ],
    "currentIncomeTaxExpense": [
        "Chi phí thuế TNDN hiện hành",
        "Thuế TNDN hiện hành",
    ],
    "deferredIncomeTaxExpense": [
        "Chi phí thuế TNDN hoãn lại",
        "Thuế TNDN hoãn lại",
    ],
}

# Balance Sheet
BS_CODES: Dict[str, str] = {
    "totalAssets":          "tong_ts",
    "currentAssets":        "ts_nh",
    "cash":                 "tien_va_tuong_duong_tien",
    "shortTermInvestments": "gia_tri_thuan_dau_tu_ngan_han",
    "shortTermReceivables": "cac_khoan_phai_thu",
    "inventory":            "htk_rong",
    "nonCurrentAssets":     "ts_dh",
    "fixedAssets":          "gia_tri_rong_tai_san_dau_tu",
    "longTermInvestments":  "dt_tc_dh",
    "totalLiabilities":     "no_phai_tra",
    "currentLiabilities":   "no_ngan_han",
    "longTermLiabilities":  "no_dai_han",
    "totalEquity":          "vcsh",
    "charterCapital":       "von_gop_csh",
    "retainedEarnings":     "lnst_chua_pp",
    "outstandingSharesPar": "cp_pho_thong",
}

# Cash Flow
CF_CODES: Dict[str, str] = {
    "operatingCashFlow":     "luu_chuyen_tien_te_rong_tu_cac_hoat_dong_sxkd",
    "profitBeforeTax":       "lntt",
    "depreciationAmortization": "khau_hao_tscd",
    "provisionsAndReserves": "dp_rr_td",
    "workingCapitalChanges": "luu_chuyen_tien_thuan_tu_hdkd_truoc_thay_doi_vld",
    "interestPaid":          "lai_vay_da_tra",
    "incomeTaxPaid":         "thue_tndn_da_nop",
    "investingCashFlow":     "lctt_hd_dt",
    "purchaseOfFixedAssets": "mua_sam_tscd",
    "proceedsFromDisposal":  "tien_thu_duoc_tu_thanh_ly_tai_san_co_dinh",
    "investmentInSubsidiaries":"dau_tu_vao_cac_doanh_nghiep_khac",
    "financingCashFlow":     "luu_chuyen_tien_tu_hoat_dong_tai_chinh",
    "proceedsFromBorrowing": "tien_thu_duoc_cac_khoan_di_vay",
    "repaymentOfBorrowing":  "tien_tra_cac_khoan_di_vay",
    "dividendsPaid":         "co_tuc_da_tra",
    "proceedsFromEquity":    "tang_von_co_phan_tu_gop_von_va_hoac_phat_hanh_co_phieu",
    "netCashChange":         "luu_chuyen_tien_thuan_trong_ky",
    "beginningCash":         "tien_va_tuong_duong_tien",
    "endingCash":            "tien_va_tuong_duong_tien_cuoi_ky",
}

# ── Bank / securities-firm IS fallback codes ──
# Banks don't have DOANH_THU_THU_N, GI_V_N_H_NG_B_N, etc.
# Map to bank-specific equivalents so charts still render for bank tickers.
IS_BANK_FALLBACKS: Dict[str, str] = {
    "revenue":          "doanh_thu",
    "grossProfit":      "tong_tn_hd",
    "operatingProfit":  "ln_tu_hdkd_truoc_cf_du_phong",
    "financialIncome":  "tn_lai_thuan",
    "financialExpenses":"chi_phi_lai_va_cac_khoan_tuong_tu",
    "incomeTax":        "thue_tndn",
}

# ── Bank-specific EXTRA fields for income statement (ngân hàng) ──
# These are fetched in addition to IS_CODES when isBank detected.
IS_BANK_EXTRA_CODES: Dict[str, str] = {
    "interestIncome":       "thu_nhap_lai_va_cac_khoan_tuong_tu",
    "interestExpenseBank":  "chi_phi_lai_va_cac_khoan_tuong_tu",
    "netInterestIncome":    "tn_lai_thuan",
    "netServiceFeeIncome":  "ln_thuan_dv",
    "tradingFxIncome":      "kinh_doanh_ngoai_hoi_va_vang",
    "tradingSecuritiesIncome":"lai_lo_thuan_tu_kinh_doanh_chung_khoan",
    "investmentSecuritiesIncome":"lai_lo_thuan_tu_thanh_ly_chung_khoan_dau_tu",
    "otherOperatingIncome": "hoat_dong_khac",
    "totalOperatingIncome": "tong_tn_hd",
    "operatingExpenses":    "chi_phi_hoat_dong_khac",
    "prePpopProfit":        "ln_tu_hdkd_truoc_cf_du_phong",
    "provisionExpenses":    "chi_phi_du_phong_rui_ro_tin_dung",
}

# ── Bank-specific EXTRA fields for balance sheet ──
BS_BANK_EXTRA_CODES: Dict[str, str] = {
    "loansToCustomers":      "cho_vay_khach_hang",
    "loansToCustomersGross": "cho_vay_khach_hang",
    "loanLossReserves":      "du_phong_rui_ro_cho_vay_khach_hang",
    "customerDeposits":      "tien_gui_cua_khach_hang",
    "sbvDeposits":           "tien_gui_tai_ngan_hang_nha_nuoc_viet_nam",
    "interBankDeposits":     "tien_gui_tai_cac_tctd_khac_va_cho_vay_cac_tctd_khac",
    "tradingSecurities":     "chung_khoan_kinh_doanh",
    "investmentSecurities":  "chung_khoan_dau_tu",
    "debtSecuritiesIssued":  "phat_hanh_giay_to_co_gia",
}

# Banking industry detection keywords (Vietnamese ICB names)
BANK_INDUSTRY_KEYWORDS = ("ngân hàng", "bảo hiểm", "bank", "chứng khoán", "tài chính")
# Stricter: only "Ngân hàng" is a true bank with bank-format BCTC
BANK_STRICT_KEYWORDS = ("ngân hàng", "bank")
INSURANCE_STRICT_KEYWORDS = ("bảo hiểm", "bao hiem", "insurance")
FINANCIAL_STRICT_KEYWORDS = (
    "tài chính",
    "tai chinh",
    "financial",
    "finance",
    "chứng khoán",
    "chung khoan",
    "securities",
)

REPORT_LAYOUT_LABELS: Dict[str, str] = {
    "nonFinancial": "Phi tài chính",
    "bank": "Ngân hàng",
    "financial": "Tài chính",
    "insurance": "Bảo hiểm",
}


# ────────────────────────────────────────────────────────────────────
# Helpers (shared with analysis module via import)
# ────────────────────────────────────────────────────────────────────
def _fmt_market_cap(v: Optional[float]) -> str:
    if not v or v <= 0:
        return "N/A"
    if v >= 1e12:
        return f"{v / 1e12:,.0f} N tỷ"
    if v >= 1e9:
        return f"{v / 1e9:,.1f} tỷ"
    return f"{v:,.0f}"


def _fmt_volume(v: Optional[int]) -> str:
    if not v:
        return "0"
    if v >= 1e6:
        return f"{v / 1e6:,.1f}M"
    if v >= 1e3:
        return f"{v / 1e3:,.1f}K"
    return str(v)


def _safe_float(v: Any, default: float = 0.0) -> float:
    if v is None:
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def _safe_int(v: Any, default: int = 0) -> int:
    if v is None:
        return default
    try:
        return int(v)
    except (ValueError, TypeError):
        return default


def _safe_round(v: Any, ndigits: int = 2) -> Optional[float]:
    if v is None:
        return None
    try:
        return round(float(v), ndigits)
    except (ValueError, TypeError):
        return None


def _safe_div(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    if numerator is None or denominator in (None, 0):
        return None
    try:
        return float(numerator) / float(denominator)
    except (ValueError, TypeError, ZeroDivisionError):
        return None


def _normalize_ind_name(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


def _normalize_text_loose(text: str) -> str:
    """Aggressive normalization for fuzzy alias matching.

    - lowercase
    - remove accents/diacritics
    - replace non-alnum with spaces
    - collapse spaces
    """
    base = (text or "").strip().lower()
    if not base:
        return ""
    decomp = unicodedata.normalize("NFKD", base)
    no_diacritic = "".join(ch for ch in decomp if not unicodedata.combining(ch))
    cleaned = re.sub(r"[^a-z0-9]+", " ", no_diacritic)
    return " ".join(cleaned.split())


def _load_bctc_name_code_mapping() -> Tuple[Dict[str, str], Dict[str, str]]:
    """Load indicator alias mapping from md/bctc.md.

    Returns:
      - normalized ind_name -> canonical ind_code
      - canonical ind_code -> preferred display label
    """
    name_to_code: Dict[str, str] = {}
    code_to_label: Dict[str, str] = {}
    try:
        root_dir = Path(__file__).resolve().parents[4]
        mapping_file = root_dir / "md" / "bctc.md"
        if not mapping_file.exists():
            return name_to_code, code_to_label

        raw_data = json.loads(mapping_file.read_text(encoding="utf-8"))
        if not isinstance(raw_data, list):
            return name_to_code, code_to_label

        for item in raw_data:
            if not isinstance(item, dict):
                continue
            ind_name = str(item.get("ind_name") or "").strip()
            ind_code = str(item.get("ind_code") or "").strip()
            if not ind_name or not ind_code:
                continue

            normalized = _normalize_ind_name(ind_name)
            if normalized:
                name_to_code[normalized] = ind_code

            # Pick first non-underscore alias as preferred display label.
            preferred = code_to_label.get(ind_code)
            if preferred is None:
                code_to_label[ind_code] = ind_name
            elif preferred.startswith("_") and not ind_name.startswith("_"):
                code_to_label[ind_code] = ind_name
    except Exception:
        logger.exception("Failed to load bctc mapping file")

    return name_to_code, code_to_label


BCTC_NAME_TO_CODE, BCTC_CODE_TO_LABEL = _load_bctc_name_code_mapping()
BCTC_NAME_TO_CODE_LOOSE: Dict[str, str] = {
    _normalize_text_loose(name): code
    for name, code in BCTC_NAME_TO_CODE.items()
    if _normalize_text_loose(name)
}


def _resolve_canonical_code(raw_code: str, raw_name: str) -> str:
    """Resolve canonical code with exact + loose + fuzzy alias matching."""
    clean_code = (raw_code or "").strip()
    name_exact = _normalize_ind_name(raw_name)
    name_loose = _normalize_text_loose(raw_name)

    # 1) Exact normalized match from mapping file.
    if name_exact and name_exact in BCTC_NAME_TO_CODE:
        return BCTC_NAME_TO_CODE[name_exact]

    # 2) Loose normalized match (ignores accents/punctuation/spacing style).
    if name_loose and name_loose in BCTC_NAME_TO_CODE_LOOSE:
        return BCTC_NAME_TO_CODE_LOOSE[name_loose]

    # 3) Fuzzy fallback for minor typos (single/few chars differences).
    if name_loose and len(name_loose) >= 8:
        close = difflib.get_close_matches(name_loose, BCTC_NAME_TO_CODE_LOOSE.keys(), n=1, cutoff=0.92)
        if close:
            return BCTC_NAME_TO_CODE_LOOSE[close[0]]

    return clean_code or name_loose or "unknown_indicator"


def _classify_statement(report_code: str, report_name: str, ind_code: str) -> Optional[str]:
    """Classify a BCTC row into incomeStatement / balanceSheet / cashFlow buckets."""
    rc = (report_code or "").strip().lower()
    rn = (report_name or "").strip().lower()
    code = (ind_code or "").strip()

    if any(k in rc for k in ("is", "kqkd", "income")):
        return "incomeStatement"
    if any(k in rc for k in ("bs", "cdkt", "balance")):
        return "balanceSheet"
    if any(k in rc for k in ("cf", "lctt", "cash")):
        return "cashFlow"

    if any(k in rn for k in ("kết quả kinh doanh", "ket qua kinh doanh", "income")):
        return "incomeStatement"
    if any(k in rn for k in ("cân đối kế toán", "can doi ke toan", "balance")):
        return "balanceSheet"
    if any(k in rn for k in ("lưu chuyển tiền tệ", "luu chuyen tien te", "cash flow")):
        return "cashFlow"

    if code in IS_CODES.values() or code in IS_BANK_EXTRA_CODES.values() or code in IS_BANK_FALLBACKS.values():
        return "incomeStatement"
    if code in BS_CODES.values() or code in BS_BANK_EXTRA_CODES.values():
        return "balanceSheet"
    if code in CF_CODES.values():
        return "cashFlow"

    return None


def _pick_value(existing: Optional[float], new_value: float) -> float:
    """Pick most reliable value when same metric appears multiple times in a period.

    We prefer non-zero and larger absolute magnitude to avoid double counting alias rows.
    """
    if existing is None:
        return new_value
    if abs(new_value) > abs(existing):
        return new_value
    return existing


def _is_insurance_text(value: str) -> bool:
    text_value = (value or "").strip().lower()
    return any(keyword in text_value for keyword in INSURANCE_STRICT_KEYWORDS)


def _is_bank_text(value: str) -> bool:
    text_value = (value or "").strip().lower()
    return any(keyword in text_value for keyword in BANK_STRICT_KEYWORDS)


def _is_financial_text(value: str) -> bool:
    text_value = (value or "").strip().lower()
    return any(keyword in text_value for keyword in FINANCIAL_STRICT_KEYWORDS)


def _detect_report_layout(industry_values: List[str]) -> str:
    # Priority: insurance -> bank -> financial -> nonFinancial
    if any(_is_insurance_text(v) for v in industry_values):
        return "insurance"
    if any(_is_bank_text(v) for v in industry_values):
        return "bank"
    if any(_is_financial_text(v) for v in industry_values):
        return "financial"
    return "nonFinancial"


def _contains_any(text: str, terms: List[str]) -> bool:
    return any(term in text for term in terms)


def _resolve_layout_section(
    report_layout: str,
    stmt_type: str,
    ind_code: str,
    label: str,
) -> Tuple[str, str, int]:
    code_text = _normalize_text_loose(ind_code)
    label_text = _normalize_text_loose(label)

    def pick(rules: List[Dict[str, Any]], default_key: str, default_label: str) -> Tuple[str, str, int]:
        for idx, rule in enumerate(rules):
            code_terms = rule.get("codeTerms", [])
            label_terms = rule.get("labelTerms", [])
            if _contains_any(code_text, code_terms) or _contains_any(label_text, label_terms):
                return str(rule["key"]), str(rule["label"]), idx
        return default_key, default_label, 999

    if stmt_type == "cashFlow":
        return pick(
            [
                {
                    "key": "cf_operating",
                    "label": "Lưu chuyển từ hoạt động kinh doanh",
                    "codeTerms": ["hdkd", "hoat dong sxkd", "hoat dong kinh doanh", "luu chuyen tien thuan tu hdkd"],
                    "labelTerms": ["hoạt động kinh doanh", "hdkd", "kinh doanh"],
                },
                {
                    "key": "cf_investing",
                    "label": "Lưu chuyển từ hoạt động đầu tư",
                    "codeTerms": ["hddt", "hoat dong dau tu", "lctt hd dt"],
                    "labelTerms": ["hoạt động đầu tư", "hđđt", "đầu tư"],
                },
                {
                    "key": "cf_financing",
                    "label": "Lưu chuyển từ hoạt động tài chính",
                    "codeTerms": ["hdtc", "hoat dong tai chinh", "luu chuyen tien tu hoat dong tai chinh"],
                    "labelTerms": ["hoạt động tài chính", "hđtc", "tài chính"],
                },
                {
                    "key": "cf_net",
                    "label": "Tiền và tương đương tiền",
                    "codeTerms": ["cuoi ky", "dau ky", "luu chuyen tien thuan trong ky", "tien va tuong duong tien"],
                    "labelTerms": ["đầu kỳ", "cuối kỳ", "tiền và tương đương tiền", "tăng giảm tiền"],
                },
            ],
            "cf_other",
            "Khoản mục khác",
        )

    if report_layout == "bank":
        if stmt_type == "incomeStatement":
            return pick(
                [
                    {
                        "key": "bank_is_interest",
                        "label": "Thu nhập lãi và cận lãi",
                        "codeTerms": ["thu_nhap_lai", "chi_phi_lai", "tn_lai_thuan"],
                        "labelTerms": ["thu nhập lãi", "chi phí lãi", "lãi thuần"],
                    },
                    {
                        "key": "bank_is_non_interest",
                        "label": "Thu nhập ngoài lãi",
                        "codeTerms": ["dv", "ngoai_hoi", "chung_khoan", "hoat_dong_khac", "tong_tn_hd"],
                        "labelTerms": ["dịch vụ", "ngoại hối", "chứng khoán", "hoạt động khác", "tổng thu nhập hoạt động"],
                    },
                    {
                        "key": "bank_is_cost",
                        "label": "Chi phí hoạt động",
                        "codeTerms": ["chi_phi_hoat_dong", "cp_hd", "cp_dv"],
                        "labelTerms": ["chi phí hoạt động", "chi phí"],
                    },
                    {
                        "key": "bank_is_provision",
                        "label": "Dự phòng rủi ro tín dụng",
                        "codeTerms": ["du_phong", "rui_ro_tin_dung"],
                        "labelTerms": ["dự phòng", "rủi ro tín dụng"],
                    },
                    {
                        "key": "bank_is_profit",
                        "label": "Lợi nhuận và thuế",
                        "codeTerms": ["lntt", "lnst", "thue", "eps", "lai_co_ban"],
                        "labelTerms": ["lợi nhuận", "thuế", "eps"],
                    },
                ],
                "bank_is_other",
                "Khoản mục khác",
            )
        return pick(
            [
                {
                    "key": "bank_bs_asset_core",
                    "label": "Tài sản cốt lõi sinh lãi",
                    "codeTerms": ["cho_vay_khach_hang", "chung_khoan", "tien_gui_tai_cac_tctd", "tong_ts"],
                    "labelTerms": ["cho vay", "chứng khoán", "tài sản", "tiền gửi tại"],
                },
                {
                    "key": "bank_bs_asset_other",
                    "label": "Tài sản khác",
                    "codeTerms": ["tai_san_co_dinh", "ts_dh", "ts_nh", "phai_thu"],
                    "labelTerms": ["tài sản cố định", "phải thu", "tài sản dài hạn", "tài sản ngắn hạn"],
                },
                {
                    "key": "bank_bs_funding",
                    "label": "Nguồn vốn huy động",
                    "codeTerms": ["tien_gui_cua_khach_hang", "phat_hanh_giay_to_co_gia", "vay_cac_to_chuc_tin_dung"],
                    "labelTerms": ["tiền gửi khách hàng", "giấy tờ có giá", "huy động"],
                },
                {
                    "key": "bank_bs_liabilities",
                    "label": "Nợ phải trả khác",
                    "codeTerms": ["no_phai_tra", "no_ngan_han", "no_dai_han", "phai_sinh"],
                    "labelTerms": ["nợ phải trả", "nợ ngắn hạn", "nợ dài hạn", "phái sinh"],
                },
                {
                    "key": "bank_bs_equity",
                    "label": "Vốn chủ sở hữu",
                    "codeTerms": ["vcsh", "von", "lnst_chua_pp", "chenh_lech"],
                    "labelTerms": ["vốn chủ sở hữu", "vốn", "lợi nhuận chưa phân phối", "chênh lệch"],
                },
            ],
            "bank_bs_other",
            "Khoản mục khác",
        )

    if report_layout == "financial":
        if stmt_type == "incomeStatement":
            return pick(
                [
                    {
                        "key": "fin_is_revenue",
                        "label": "Doanh thu và thu nhập cốt lõi",
                        "codeTerms": ["doanh_thu", "tn_lai_thuan", "dt_tc", "tong_tn_hd"],
                        "labelTerms": ["doanh thu", "thu nhập", "lãi thuần", "thu phí"],
                    },
                    {
                        "key": "fin_is_cost",
                        "label": "Chi phí hoạt động",
                        "codeTerms": ["chi_phi", "cp_", "gia_von"],
                        "labelTerms": ["chi phí", "giá vốn", "hoạt động"],
                    },
                    {
                        "key": "fin_is_provision",
                        "label": "Dự phòng và rủi ro",
                        "codeTerms": ["du_phong", "rui_ro"],
                        "labelTerms": ["dự phòng", "rủi ro"],
                    },
                    {
                        "key": "fin_is_profit",
                        "label": "Lợi nhuận và thuế",
                        "codeTerms": ["lntt", "lnst", "thue", "eps"],
                        "labelTerms": ["lợi nhuận", "thuế", "eps"],
                    },
                ],
                "fin_is_other",
                "Khoản mục khác",
            )
        return pick(
            [
                {
                    "key": "fin_bs_lending_invest",
                    "label": "Cho vay và đầu tư tài chính",
                    "codeTerms": ["cho_vay", "dt_tc", "chung_khoan", "dau_tu"],
                    "labelTerms": ["cho vay", "đầu tư", "chứng khoán", "tài sản tài chính"],
                },
                {
                    "key": "fin_bs_assets_other",
                    "label": "Tài sản khác",
                    "codeTerms": ["ts_nh", "ts_dh", "tien_va_tuong_duong_tien", "phai_thu", "tong_ts"],
                    "labelTerms": ["tài sản", "tiền", "phải thu", "hàng tồn kho"],
                },
                {
                    "key": "fin_bs_liabilities",
                    "label": "Nợ phải trả và nguồn vốn vay",
                    "codeTerms": ["no_", "vay", "phat_hanh", "tien_gui", "no_phai_tra"],
                    "labelTerms": ["nợ", "vay", "phát hành", "tiền gửi"],
                },
                {
                    "key": "fin_bs_equity",
                    "label": "Vốn chủ sở hữu",
                    "codeTerms": ["vcsh", "von", "lnst_chua_pp"],
                    "labelTerms": ["vốn chủ sở hữu", "vốn", "lợi nhuận chưa phân phối"],
                },
            ],
            "fin_bs_other",
            "Khoản mục khác",
        )

    if report_layout == "insurance":
        if stmt_type == "incomeStatement":
            return pick(
                [
                    {
                        "key": "ins_is_premium",
                        "label": "Doanh thu bảo hiểm và tài chính",
                        "codeTerms": ["doanh_thu", "phi", "bao_hiem", "dt_tc", "thu_nhap"],
                        "labelTerms": ["doanh thu", "phí bảo hiểm", "thu nhập tài chính"],
                    },
                    {
                        "key": "ins_is_claims",
                        "label": "Bồi thường và dự phòng nghiệp vụ",
                        "codeTerms": ["boi_thuong", "du_phong", "nghiep_vu"],
                        "labelTerms": ["bồi thường", "dự phòng nghiệp vụ"],
                    },
                    {
                        "key": "ins_is_cost",
                        "label": "Chi phí hoạt động",
                        "codeTerms": ["chi_phi", "cp_", "hoa_hong"],
                        "labelTerms": ["chi phí", "hoa hồng", "quản lý"],
                    },
                    {
                        "key": "ins_is_profit",
                        "label": "Lợi nhuận và thuế",
                        "codeTerms": ["lntt", "lnst", "thue", "eps"],
                        "labelTerms": ["lợi nhuận", "thuế", "eps"],
                    },
                ],
                "ins_is_other",
                "Khoản mục khác",
            )
        return pick(
            [
                {
                    "key": "ins_bs_invest_assets",
                    "label": "Tài sản đầu tư và tài sản lỏng",
                    "codeTerms": ["dau_tu", "chung_khoan", "tien", "tong_ts", "ts_nh", "ts_dh"],
                    "labelTerms": ["tài sản đầu tư", "tiền", "chứng khoán", "tài sản"],
                },
                {
                    "key": "ins_bs_tech_provisions",
                    "label": "Dự phòng kỹ thuật",
                    "codeTerms": ["du_phong", "ky_thuat", "bao_hiem"],
                    "labelTerms": ["dự phòng kỹ thuật", "dự phòng bảo hiểm"],
                },
                {
                    "key": "ins_bs_liabilities",
                    "label": "Nợ phải trả khác",
                    "codeTerms": ["no_", "no_phai_tra", "phai_tra"],
                    "labelTerms": ["nợ phải trả", "phải trả"],
                },
                {
                    "key": "ins_bs_equity",
                    "label": "Vốn chủ sở hữu",
                    "codeTerms": ["vcsh", "von", "lnst_chua_pp"],
                    "labelTerms": ["vốn chủ sở hữu", "vốn", "lợi nhuận chưa phân phối"],
                },
            ],
            "ins_bs_other",
            "Khoản mục khác",
        )

    if stmt_type == "incomeStatement":
        return pick(
            [
                {
                    "key": "non_is_revenue",
                    "label": "Doanh thu và giá vốn",
                    "codeTerms": ["doanh_thu", "gia_von", "ln_gop"],
                    "labelTerms": ["doanh thu", "giá vốn", "lợi nhuận gộp"],
                },
                {
                    "key": "non_is_operating_cost",
                    "label": "Chi phí hoạt động",
                    "codeTerms": ["chi_phi_ban_hang", "cp_qldn", "chi_phi_hoat_dong"],
                    "labelTerms": ["chi phí bán hàng", "chi phí quản lý", "chi phí hoạt động"],
                },
                {
                    "key": "non_is_financial",
                    "label": "Doanh thu/chi phí tài chính",
                    "codeTerms": ["dt_tc", "chi_phi_tai_chinh", "cp_lai_vay"],
                    "labelTerms": ["doanh thu tài chính", "chi phí tài chính", "lãi vay"],
                },
                {
                    "key": "non_is_profit",
                    "label": "Lợi nhuận và thuế",
                    "codeTerms": ["lntt", "lnst", "thue", "eps"],
                    "labelTerms": ["lợi nhuận", "thuế", "eps"],
                },
            ],
            "non_is_other",
            "Khoản mục khác",
        )

    return pick(
        [
            {
                "key": "non_bs_assets_short",
                "label": "Tài sản ngắn hạn",
                "codeTerms": ["ts_nh", "tien_va_tuong_duong_tien", "phai_thu", "htk"],
                "labelTerms": ["tài sản ngắn hạn", "tiền", "phải thu", "hàng tồn kho"],
            },
            {
                "key": "non_bs_assets_long",
                "label": "Tài sản dài hạn",
                "codeTerms": ["ts_dh", "tai_san_co_dinh", "dt_tc_dh", "gia_tri_rong_tai_san_dau_tu"],
                "labelTerms": ["tài sản dài hạn", "tài sản cố định", "đầu tư dài hạn"],
            },
            {
                "key": "non_bs_liabilities",
                "label": "Nợ phải trả",
                "codeTerms": ["no_phai_tra", "no_ngan_han", "no_dai_han", "no_"],
                "labelTerms": ["nợ phải trả", "nợ ngắn hạn", "nợ dài hạn"],
            },
            {
                "key": "non_bs_equity",
                "label": "Vốn chủ sở hữu",
                "codeTerms": ["vcsh", "von", "lnst_chua_pp"],
                "labelTerms": ["vốn chủ sở hữu", "vốn", "lợi nhuận chưa phân phối"],
            },
        ],
        "non_bs_other",
        "Khoản mục khác",
    )


def _pick_first_number(record: Dict[str, Any], keys: List[str], default: float = 0.0) -> float:
    for key in keys:
        val = record.get(key)
        if val is None:
            continue
        try:
            return float(val)
        except (ValueError, TypeError):
            continue
    return default


def _pick_report_by_period(rows: List[Dict[str, Any]], period: Optional[str]) -> Dict[str, Any]:
    if not rows:
        return {}
    if not period:
        return rows[0]
    for row in rows:
        row_period = (((row or {}).get("period") or {}).get("period") or "")
        if str(row_period).upper() == str(period).upper():
            return row
    return rows[0]


def _metric_payload(value: Optional[float], confidence: str, formula: str, source: str) -> Dict[str, Any]:
    return {
        "value": _safe_round(value, 4) if value is not None else None,
        "confidence": confidence,
        "formula": formula,
        "source": source,
    }


def _compute_evaluation(ratio: Dict, current_price: float, ref_price: float) -> Dict[str, str]:
    """Compute evaluation ratings from actual financial ratio data.

    Rating logic (each dimension: Tốt / Khá / Trung bình / Yếu):
      - risk: based on debt_to_equity & current_ratio
      - valuation: based on PE & PB vs typical thresholds
      - fundamentalAnalysis: based on ROE & net_margin
      - technicalAnalysis: based on price trend (current vs ref)
    """
    def _rate3(good: bool, bad: bool) -> str:
        if good:
            return "Tốt"
        if bad:
            return "Yếu"
        return "Trung bình"

    # ── Risk (debt & liquidity) ──
    de = _safe_float(ratio.get("debt_to_equity"))
    cr = _safe_float(ratio.get("current_ratio"))
    if de > 0 and cr > 0:
        risk = _rate3(de < 0.5 and cr > 2, de > 2 or cr < 0.8)
    elif de > 0:
        risk = _rate3(de < 0.5, de > 2)
    else:
        risk = "N/A"

    # ── Valuation (PE & PB) ──
    pe = _safe_float(ratio.get("pe"))
    pb = _safe_float(ratio.get("pb"))
    if pe > 0 and pb > 0:
        val = _rate3(pe < 10 and pb < 1.5, pe > 25 or pb > 4)
    elif pe > 0:
        val = _rate3(pe < 10, pe > 25)
    else:
        val = "N/A"

    # ── Fundamental (profitability) ──
    roe = _safe_float(ratio.get("roe"))
    nm = _safe_float(ratio.get("net_margin"))
    if roe != 0:
        fund = _rate3(roe > 15 and nm > 10, roe < 5 or nm < 2)
    else:
        fund = "N/A"

    # ── Technical (simple price momentum) ──
    if current_price > 0 and ref_price > 0:
        chg_pct = (current_price - ref_price) / ref_price * 100
        tech = _rate3(chg_pct > 1, chg_pct < -1)
    else:
        tech = "N/A"

    return {
        "risk": risk,
        "valuation": val,
        "fundamentalAnalysis": fund,
        "technicalAnalysis": tech,
    }


# ────────────────────────────────────────────────────────────────────
# 1. Stock Overview — Mega endpoint
# ────────────────────────────────────────────────────────────────────
@cached("stock:overview", ttl=60)
async def get_stock_overview(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    """Aggregate overview data for a single stock ticker."""
    await db.execute(_STMT_TIMEOUT)

    ticker = ticker.upper()

    # Run sub-queries in parallel
    (
        info_row,
        price_rows,
        order_rows,
        hist_rows,
        holders,
        peers_rows,
        news_rows,
        ratio_row,
    ) = await asyncio.gather(
        _query_stock_info(db, ticker),
        _query_price_history(db, ticker, days=90),
        _query_order_book(db, ticker),
        _query_historical_data(db, ticker, days=30),
        _query_shareholders(db, ticker),
        _query_peer_stocks(db, ticker),
        _query_stock_events(db, ticker, limit=12),
        _query_latest_ratio(db, ticker),
    )

    # Build stockInfo
    info = info_row or {}
    ratio = ratio_row or {}

    current_price = _safe_float(info.get("match_price") or info.get("close"))
    ref_price = _safe_float(info.get("ref_price"))
    change = current_price - ref_price if ref_price > 0 else 0
    change_pct = (change / ref_price * 100) if ref_price > 0 else 0
    market_cap = _safe_float(ratio.get("market_cap"))
    eps = _safe_float(ratio.get("eps"))

    stock_info = {
        "ticker": ticker,
        "exchange": info.get("exchange", ""),
        "companyName": info.get("organ_name", "") or info.get("organ_short_name", ""),
        "companyNameFull": info.get("organ_name", ""),
        "logoUrl": f"https://cdn.simplize.vn/simplizevn/logo/{ticker}.jpeg",
        "tags": [t for t in [
            info.get("exchange", ""),
            info.get("icb_name2", ""),
            info.get("icb_name3", ""),
        ] if t],
        "overview": info.get("overview") or info.get("organ_name") or "",
        "website": "",
        "currentPrice": current_price,
        "priceChange": round(change, 2),
        "priceChangePercent": round(change_pct, 2),
        "dayLow": _safe_float(info.get("lowest_price") or info.get("low")),
        "dayHigh": _safe_float(info.get("highest_price") or info.get("high")),
        "referencePrice": ref_price,
        "ceilingPrice": _safe_float(info.get("ceil_price")),
        "floorPrice": _safe_float(info.get("floor_price")),
        "metrics": {
            "marketCap": _fmt_market_cap(market_cap),
            "marketCapRank": 0,
            "volume": _fmt_volume(_safe_int(info.get("accumulated_volume") or info.get("volume"))),
            "pe": str(_safe_round(ratio.get("pe")) or "N/A"),
            "peRank": 0,
            "eps": f"{eps:,.0f}" if eps else "N/A",
            "pb": str(_safe_round(ratio.get("pb")) or "N/A"),
            "evEbitda": str(_safe_round(ratio.get("ev_ebitda")) or "N/A"),
            "outstandingShares": _fmt_volume(_safe_int(ratio.get("outstanding_shares"))),
            "roe": f"{_safe_float(ratio.get('roe')) * 100:.1f}%" if ratio.get("roe") else "N/A",
            "bvps": f"{_safe_float(ratio.get('bvps')):,.0f}" if ratio.get("bvps") else "N/A",
        },
        "evaluation": _compute_evaluation(ratio, current_price, ref_price),
    }

    # Price history
    price_history = [
        {
            "date": r["trading_date"],
            "open": _safe_float(r["open"]),
            "high": _safe_float(r["high"]),
            "low": _safe_float(r["low"]),
            "close": _safe_float(r["close"]),
            "volume": _safe_int(r["volume"]),
        }
        for r in (price_rows or [])
    ]

    # Order book (from realtime_quotes)
    order_book = [
        {
            "time": r.get("ts", ""),
            "volume": _safe_int(r.get("last_volume")),
            "price": _safe_float(r.get("last_price")),
            "side": "Mua" if _safe_float(r.get("change_value")) >= 0 else "Bán",
            "change": _safe_float(r.get("change_value")),
        }
        for r in (order_rows or [])
    ]

    # Historical data
    historical_data = []
    for i, r in enumerate(hist_rows or []):
        close = _safe_float(r["close"])
        prev_close = _safe_float((hist_rows or [])[i + 1]["close"]) if i + 1 < len(hist_rows or []) else close
        ch = close - prev_close
        ch_pct = (ch / prev_close * 100) if prev_close > 0 else 0
        historical_data.append({
            "date": r["trading_date"],
            "open": _safe_float(r["open"]),
            "high": _safe_float(r["high"]),
            "low": _safe_float(r["low"]),
            "close": close,
            "change": round(ch, 2),
            "changePercent": round(ch_pct, 2),
            "volume": _safe_int(r["volume"]),
        })

    # Shareholders
    shareholders = [
        {
            "name": r.get("name", ""),
            "role": r.get("position", "") or "",
            "shares": str(r.get("percent", "0")),
            "percentage": _safe_float(r.get("percent")),
        }
        for r in (holders or [])
    ]

    # Shareholder structure (from owner table)
    structure = _build_shareholder_structure(holders)

    # Peer stocks (same sector)
    peer_stocks = [
        {
            "ticker": r["ticker"],
            "price": _safe_float(r.get("close")),
            "priceChange": round(_safe_float(r.get("close")) - _safe_float(r.get("ref_price")), 2),
            "priceChangePercent": round(
                ((_safe_float(r.get("close")) - _safe_float(r.get("ref_price")))
                 / _safe_float(r.get("ref_price")) * 100)
                if _safe_float(r.get("ref_price")) > 0 else 0, 2
            ),
            "volume": _safe_int(r.get("volume")),
            "sparklineData": [],
        }
        for r in (peers_rows or [])
    ]

    # Corporate news (from event table)
    corp_news = [
        {
            "id": str(i),
            "title": r.get("event_title", ""),
            "time": r.get("public_date", ""),
            "source": r.get("source_url", ""),
            "category": r.get("event_list_name", ""),
            "ticker": ticker,
        }
        for i, r in enumerate(news_rows or [])
    ]

    # Recommendations — pick top-4 peers by trading volume (most liquid)
    _sorted_peers = sorted(peer_stocks, key=lambda p: p.get("volume", 0) or 0, reverse=True)
    _top4 = _sorted_peers[:4]
    _top4_tickers = [p["ticker"] for p in _top4]

    # Fetch sparkline data + latest electric_board prices in parallel
    sparklines, rec_eb_rows = await asyncio.gather(
        _query_sparklines(db, _top4_tickers, days=180),
        _query_rec_latest_prices(db, _top4_tickers),
    )
    # Map ticker → {match_price, ref_price} from electric_board
    _eb_map: Dict[str, Dict] = {r["ticker"]: r for r in (rec_eb_rows or [])}

    recommendations = []
    for p in _top4:
        spark = sparklines.get(p["ticker"], [])
        eb = _eb_map.get(p["ticker"], {})

        # Best price: electric_board match_price > peer close > sparkline last
        price = (
            _safe_float(eb.get("match_price"))
            or p["price"]
            or (spark[-1] if spark else 0)
        )
        # Reference price for daily change
        ref = _safe_float(eb.get("ref_price"))
        if ref > 0 and price > 0:
            change = round(price - ref, 2)
            change_pct = round(change / ref * 100, 2)
        elif len(spark) >= 2:
            # Fallback: last two sparkline closes
            change = round(spark[-1] - spark[-2], 2)
            change_pct = round(change / spark[-2] * 100, 2) if spark[-2] > 0 else 0
        else:
            change = 0
            change_pct = 0.0

        recommendations.append({
            "ticker": p["ticker"],
            "exchange": "",
            "companyName": "",
            "logoUrl": f"https://cdn.simplize.vn/simplizevn/logo/{p['ticker']}.jpeg",
            "price": price,
            "priceChange": change,
            "priceChangePercent": change_pct,
            "marketCap": "",
            "volume": str(p.get("volume", "")),
            "pe": "",
            "chartData": spark,
        })

    return {
        "stockInfo": stock_info,
        "priceHistory": price_history,
        "orderBook": order_book,
        "historicalData": historical_data,
        "shareholders": shareholders,
        "shareholderStructure": structure,
        "peerStocks": peer_stocks,
        "corporateNews": corp_news,
        "recommendations": recommendations,
    }

@cached("stock:years", ttl=3600)
async def get_available_periods(db: AsyncSession, ticker: str) -> List[int]:
    """Get list of years available in financial reports."""
    ticker = ticker.upper()
    sql = text(f"""
        SELECT DISTINCT year
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = :ticker
        ORDER BY year DESC
    """)
    res = await db.execute(sql, {"ticker": ticker})
    # If no results from financial_ratio, query bctc
    years = [r["year"] for r in res.mappings().all()]
    if not years:
        sql = text(f"""
            SELECT DISTINCT year
            FROM {SCHEMA}.bctc
            WHERE ticker = :ticker
            ORDER BY year DESC
        """)
        res = await db.execute(sql, {"ticker": ticker})
        years = [r["year"] for r in res.mappings().all()]
    return list(map(int, years))


# ── Sub-queries for overview ──────────────────────────────────────

async def _query_stock_info(db: AsyncSession, ticker: str) -> Optional[Dict]:
    """Get current stock info from electric_board + company_overview."""
    sql = text(f"""
        WITH {_EB_RANKED_DATES_CTE}
        , dedup_company_overview AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                ticker,
                exchange,
                organ_short_name,
                organ_name,
                icb_name2,
                icb_name3,
                overview
            FROM {SCHEMA}.company_overview
            WHERE UPPER(BTRIM(ticker)) = :ticker
            ORDER BY
                UPPER(BTRIM(ticker)),
                CASE WHEN overview IS NOT NULL AND BTRIM(overview) != '' THEN 0 ELSE 1 END,
                CASE WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) != '' THEN 0 ELSE 1 END,
                CASE WHEN organ_name IS NOT NULL AND BTRIM(organ_name) != '' THEN 0 ELSE 1 END
        )
        SELECT
            co.ticker, co.exchange, co.organ_short_name, co.organ_name,
            co.icb_name2, co.icb_name3, co.overview,
            eb.match_price, eb.ref_price, eb.accumulated_volume,
            eb.highest_price, eb.lowest_price,
            eb.bid_1_price, eb.bid_1_volume, eb.bid_2_price, eb.bid_2_volume,
            eb.bid_3_price, eb.bid_3_volume,
            eb.ask_1_price, eb.ask_1_volume, eb.ask_2_price, eb.ask_2_volume,
            eb.ask_3_price, eb.ask_3_volume,
            hp.close, hp.high, hp.low, hp.volume
        FROM dedup_company_overview co
        LEFT JOIN {SCHEMA}.electric_board eb
            ON eb.ticker = co.ticker
            AND eb.trading_date = (SELECT td FROM eb_latest)
        LEFT JOIN (
            SELECT ticker, close, high, low, volume
            FROM {SCHEMA}.history_price
            WHERE ticker = :ticker
            ORDER BY trading_date DESC
            LIMIT 1
        ) hp ON hp.ticker = co.ticker
        WHERE co.ticker = :ticker
        LIMIT 1
    """)
    res = await db.execute(sql, {"ticker": ticker})
    row = res.mappings().first()
    return dict(row) if row else None


# Period → approximate calendar days mapping
_PERIOD_DAYS = {
    "1D": 1,
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "5Y": 1825,
}

# Max data points to return per period (prevents huge payloads)
_MAX_POINTS = {
    "1D": 500,
    "1W": 500,
    "1M": 500,
    "3M": 500,
    "6M": 500,
    "1Y": 500,
    "5Y": 1000,
    "ALL": 8000,
}


async def _query_price_history(db: AsyncSession, ticker: str, days: int = 90) -> List[Dict]:
    """OHLCV price history for chart (legacy, LIMIT-based)."""
    sql = text(f"""
        SELECT trading_date, open, high, low, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY trading_date DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, {"ticker": ticker, "limit": days})
    rows = res.mappings().all()
    return [dict(r) for r in reversed(rows)]  # chronological order


async def _query_price_history_by_period(
    db: AsyncSession, ticker: str, period: str = "1Y",
) -> List[Dict]:
    """OHLCV price history filtered by period with smart sampling."""
    if period == "ALL":
        sql = text(f"""
            SELECT trading_date, open, high, low, close, volume
            FROM {SCHEMA}.history_price
            WHERE ticker = :ticker AND close IS NOT NULL
            ORDER BY trading_date ASC
        """)
        res = await db.execute(sql, {"ticker": ticker})
    else:
        days = _PERIOD_DAYS.get(period, 365)
        cutoff = (date.today() - timedelta(days=days)).isoformat()
        sql = text(f"""
            SELECT trading_date, open, high, low, close, volume
            FROM {SCHEMA}.history_price
            WHERE ticker = :ticker AND close IS NOT NULL
              AND trading_date >= :cutoff
            ORDER BY trading_date ASC
        """)
        res = await db.execute(sql, {"ticker": ticker, "cutoff": cutoff})

    rows = [dict(r) for r in res.mappings().all()]

    # Sample if too many points
    max_pts = _MAX_POINTS.get(period, 500)
    if len(rows) > max_pts:
        # Always keep first, last, and evenly-spaced points
        step = len(rows) / max_pts
        indices = {0, len(rows) - 1}
        i = 0.0
        while i < len(rows):
            indices.add(int(i))
            i += step
        rows = [rows[idx] for idx in sorted(indices)]

    return rows


async def _query_order_book(db: AsyncSession, ticker: str) -> List[Dict]:
    """Recent trades from realtime_quotes."""
    sql = text(f"""
        SELECT ts, last_price, last_volume, change_value, change_percent
        FROM {SCHEMA}.realtime_quotes
        WHERE symbol = :ticker
        ORDER BY ts DESC
        LIMIT 20
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


async def _query_historical_data(db: AsyncSession, ticker: str, days: int = 30) -> List[Dict]:
    """Recent OHLCV rows for the historical data table."""
    sql = text(f"""
        SELECT trading_date, open, high, low, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY trading_date DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, {"ticker": ticker, "limit": days})
    return [dict(r) for r in res.mappings().all()]


async def _query_shareholders(db: AsyncSession, ticker: str) -> List[Dict]:
    """Shareholder list from owner table."""
    sql = text(f"""
        WITH dedup AS (
            SELECT DISTINCT ON (
                UPPER(BTRIM(COALESCE(name, ''))),
                UPPER(BTRIM(COALESCE(position, ''))),
                COALESCE(percent::text, ''),
                UPPER(BTRIM(COALESCE(type, '')))
            )
                BTRIM(COALESCE(name, '')) AS name,
                BTRIM(COALESCE(position, '')) AS position,
                percent,
                type
            FROM {SCHEMA}.owner
            WHERE UPPER(BTRIM(ticker)) = :ticker
            ORDER BY
                UPPER(BTRIM(COALESCE(name, ''))),
                UPPER(BTRIM(COALESCE(position, ''))),
                COALESCE(percent::text, ''),
                UPPER(BTRIM(COALESCE(type, '')))
        )
        SELECT name, position, percent, type
        FROM dedup
        ORDER BY percent::numeric DESC NULLS LAST
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


def _build_shareholder_structure(holders: List[Dict]) -> List[Dict]:
    """Phân tích cơ cấu cổ đông từ bảng owner, nhóm theo position.

    Trả về danh sách [{"position": ..., "percent": ..., "members": [...]}]
    để FE vẽ biểu đồ donut theo chức vụ với tooltip chi tiết.
    """
    from collections import defaultdict
    groups: Dict[str, Dict] = defaultdict(lambda: {"percent": 0.0, "members": []})
    for h in (holders or []):
        pos = (h.get("position") or "Khác").strip()
        pct = _safe_float(h.get("percent"))
        groups[pos]["percent"] = round(groups[pos]["percent"] + pct, 2)
        groups[pos]["members"].append({
            "name": h.get("name", ""),
            "percent": pct,
        })
    result = [
        {"position": pos, "percent": data["percent"], "members": data["members"]}
        for pos, data in groups.items()
        if data["percent"] > 0
    ]
    result.sort(key=lambda x: x["percent"], reverse=True)
    return result


async def _query_peer_stocks(db: AsyncSession, ticker: str) -> List[Dict]:
    """Find stocks in the same sector (icb_name2) with latest price."""
    sql = text(f"""
        WITH sector AS (
            SELECT icb_name2 FROM {SCHEMA}.company_overview
            WHERE ticker = :ticker LIMIT 1
        )
        SELECT DISTINCT ON (hp.ticker)
            hp.ticker, hp.close, hp.volume,
            eb.ref_price
        FROM {SCHEMA}.history_price hp
        JOIN {SCHEMA}.company_overview co ON co.ticker = hp.ticker
        LEFT JOIN {SCHEMA}.electric_board eb
            ON eb.ticker = hp.ticker
            AND eb.trading_date = (
                SELECT MAX(trading_date) FROM {SCHEMA}.electric_board
                WHERE ticker = hp.ticker
            )
        WHERE co.icb_name2 = (SELECT icb_name2 FROM sector)
          AND hp.ticker != :ticker
          AND hp.close IS NOT NULL
        ORDER BY hp.ticker, hp.trading_date DESC
        LIMIT 10
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


async def _query_sparklines(db: AsyncSession, tickers: List[str], days: int = 90) -> Dict[str, List[float]]:
    """Fetch recent close prices for multiple tickers (for sparkline charts)."""
    if not tickers:
        return {}
    placeholders = ", ".join(f":t{i}" for i in range(len(tickers)))
    params = {f"t{i}": t for i, t in enumerate(tickers)}
    params["days"] = days
    sql = text(f"""
        SELECT ticker, trading_date, close
        FROM {SCHEMA}.history_price
        WHERE ticker IN ({placeholders})
          AND close IS NOT NULL
        ORDER BY ticker, trading_date DESC
    """)
    res = await db.execute(sql, params)
    rows = res.mappings().all()
    # Group by ticker, keep last N days, chronological
    from collections import defaultdict
    grouped: Dict[str, List[float]] = defaultdict(list)
    counts: Dict[str, int] = defaultdict(int)
    for r in rows:
        t = r["ticker"]
        if counts[t] < days:
            grouped[t].append(float(r["close"]))
            counts[t] += 1
    # Reverse to chronological order
    return {t: list(reversed(v)) for t, v in grouped.items()}


async def _query_rec_latest_prices(db: AsyncSession, tickers: List[str]) -> List[Dict]:
    """Fetch latest match_price & ref_price from electric_board for multiple tickers."""
    if not tickers:
        return []
    placeholders = ", ".join(f":t{i}" for i in range(len(tickers)))
    params = {f"t{i}": t for i, t in enumerate(tickers)}
    sql = text(f"""
        WITH {_EB_RANKED_DATES_CTE}
        SELECT eb.ticker, eb.match_price, eb.ref_price
        FROM {SCHEMA}.electric_board eb
        WHERE eb.ticker IN ({placeholders})
          AND eb.trading_date = (SELECT td FROM eb_latest)
    """)
    res = await db.execute(sql, params)
    return [dict(r) for r in res.mappings().all()]


async def _query_stock_events(db: AsyncSession, ticker: str, limit: int = 12) -> List[Dict]:
    """Corporate events from the event table for a given ticker (title starts with ticker)."""
    sql = text(f"""
        WITH dedup AS (
            SELECT DISTINCT ON (
                BTRIM(COALESCE(event_title, '')),
                public_date,
                BTRIM(COALESCE(source_url, '')),
                BTRIM(COALESCE(event_list_name, ''))
            )
                event_title,
                public_date,
                source_url,
                event_list_name
            FROM {SCHEMA}.event
            WHERE event_title ILIKE :pattern
            ORDER BY
                BTRIM(COALESCE(event_title, '')),
                public_date DESC NULLS LAST,
                BTRIM(COALESCE(source_url, '')),
                BTRIM(COALESCE(event_list_name, ''))
        )
        SELECT event_title, public_date, source_url, event_list_name
        FROM dedup
        ORDER BY public_date DESC NULLS LAST
        LIMIT :limit
    """)
    res = await db.execute(sql, {"pattern": f"{ticker}%", "limit": limit})
    return [dict(r) for r in res.mappings().all()]


async def _query_latest_ratio(db: AsyncSession, ticker: str) -> Optional[Dict]:
    """Latest financial ratios for a ticker — BCTC-computed PE/PB/EPS with FR fallback."""
    sql = text(f"""
        WITH latest_fr AS (
            SELECT pe, pb, ps, eps, bvps, roe, roa, roic,
                   gross_margin, net_margin, ebit_margin,
                   debt_to_equity, current_ratio, quick_ratio, cash_ratio,
                   interest_coverage_ratio, asset_turnover, inventory_turnover,
                   receivable_days, inventory_days, payable_days,
                   cash_conversion_cycle, ev_ebitda, dividend_yield,
                   market_cap, outstanding_shares, p_cashflow
            FROM {SCHEMA}.financial_ratio
            WHERE ticker = :ticker
            ORDER BY year DESC, quarter DESC
            LIMIT 1
        ),
        -- BCTC: outstanding shares (fallback to contributed capital for banks)
        bctc_shares AS (
            SELECT DISTINCT ON (ticker)
                ticker, value / 10000.0 AS shares
            FROM (
                SELECT ticker, value, year, quarter, 1 AS priority
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'cp_pho_thong'
                  AND ticker = :ticker AND value IS NOT NULL AND value > 0
                UNION ALL
                SELECT ticker, value, year, quarter, 2 AS priority
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'von_gop_csh'
                  AND ticker = :ticker AND value IS NOT NULL AND value > 0
            ) combined
            ORDER BY ticker, priority, year DESC, quarter DESC
        ),
        -- BCTC: equity (latest)
        bctc_equity AS (
            SELECT value AS equity
            FROM {SCHEMA}.bctc
            WHERE ind_code = 'vcsh'
              AND ticker = :ticker AND value IS NOT NULL AND value > 0
            ORDER BY year DESC, quarter DESC
            LIMIT 1
        ),
        -- BCTC: TTM net income (sum of last 4 quarters)
        ranked_ni AS (
            SELECT value,
                ROW_NUMBER() OVER (ORDER BY year DESC, quarter DESC) AS rn
            FROM {SCHEMA}.bctc
            WHERE ind_code = 'lnst_cua_co_dong_cong_ty_me'
              AND ticker = :ticker AND value IS NOT NULL AND value != 0
        ),
        ttm_ni AS (
            SELECT SUM(value) AS ttm_ni
            FROM ranked_ni WHERE rn <= 4
            HAVING COUNT(*) >= 2
        ),
        latest_price AS (
            SELECT close
            FROM {SCHEMA}.history_price
            WHERE ticker = :ticker AND close IS NOT NULL
            ORDER BY trading_date DESC
            LIMIT 1
        )
        SELECT
            fr.*,
            -- BCTC-computed PE
            COALESCE(
                CASE WHEN ni.ttm_ni IS NOT NULL AND sh.shares > 0
                          AND (ni.ttm_ni / sh.shares) > 0
                          AND (lp.close * 1000 / (ni.ttm_ni / sh.shares)) BETWEEN 0.1 AND 500
                     THEN lp.close * 1000 / (ni.ttm_ni / sh.shares)
                     ELSE NULL END,
                fr.pe
            ) AS computed_pe,
            -- BCTC-computed PB
            COALESCE(
                CASE WHEN eq.equity > 0 AND sh.shares > 0
                          AND (lp.close * 1000 * sh.shares / eq.equity) BETWEEN 0.01 AND 100
                     THEN lp.close * 1000 * sh.shares / eq.equity
                     ELSE NULL END,
                fr.pb
            ) AS computed_pb,
            -- BCTC-computed EPS
            COALESCE(
                CASE WHEN ni.ttm_ni IS NOT NULL AND sh.shares > 0
                     THEN ni.ttm_ni / sh.shares
                     ELSE NULL END,
                fr.eps
            ) AS computed_eps,
            -- BCTC-computed market_cap
            COALESCE(
                CASE WHEN sh.shares > 0 AND lp.close > 0
                     THEN lp.close * 1000 * sh.shares END,
                fr.market_cap
            ) AS computed_market_cap,
            -- BCTC shares
            sh.shares AS computed_shares
        FROM (SELECT 1) AS _dummy
        LEFT JOIN latest_fr fr ON TRUE
        LEFT JOIN bctc_shares sh ON TRUE
        LEFT JOIN bctc_equity eq ON TRUE
        LEFT JOIN ttm_ni ni ON TRUE
        LEFT JOIN latest_price lp ON TRUE
    """)
    res = await db.execute(sql, {"ticker": ticker})
    row = res.mappings().first()
    if not row:
        return None
    result = dict(row)
    # Override FR values with BCTC-computed values
    if result.get("computed_pe") is not None:
        result["pe"] = result["computed_pe"]
    if result.get("computed_pb") is not None:
        result["pb"] = result["computed_pb"]
    if result.get("computed_eps") is not None:
        result["eps"] = result["computed_eps"]
    if result.get("computed_market_cap") is not None:
        result["market_cap"] = result["computed_market_cap"]
    if result.get("computed_shares") is not None:
        result["outstanding_shares"] = result["computed_shares"]
    return result


# ────────────────────────────────────────────────────────────────────
# 2. Price History (separate endpoint for charting)
# ────────────────────────────────────────────────────────────────────
@cached("stock:price", ttl=120)
async def get_price_history(
    db: AsyncSession,
    ticker: str = "VIC",
    days: int = 365,
    period: Optional[str] = None,
) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    if period:
        rows = await _query_price_history_by_period(db, ticker.upper(), period)
    else:
        rows = await _query_price_history(db, ticker.upper(), days)
    return [
        {
            "date": r["trading_date"],
            "open": _safe_float(r["open"]),
            "high": _safe_float(r["high"]),
            "low": _safe_float(r["low"]),
            "close": _safe_float(r["close"]),
            "volume": _safe_int(r["volume"]),
        }
        for r in rows
    ]


# ────────────────────────────────────────────────────────────────────
# 3. Financial Ratios
# ────────────────────────────────────────────────────────────────────
@cached("stock:ratios", ttl=300)
async def get_financial_ratios(
    db: AsyncSession,
    ticker: str = "VIC",
    periods: int = 20,
    year: Optional[int] = None,
) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Build query based on filter
    if year:
        # If specific year, get quarters ASC for that year (Q1 -> Q4)
        where_clause = "WHERE ticker = :ticker AND year = :year"
        order_clause = "ORDER BY year ASC, quarter ASC"
        limit_clause = ""
        params = {"ticker": ticker, "year": year}
    else:
        # Default: latest periods DESC (New -> Old)
        where_clause = "WHERE ticker = :ticker"
        order_clause = "ORDER BY year DESC, quarter DESC"
        limit_clause = "LIMIT :limit"
        params = {"ticker": ticker, "limit": periods}

    # Fetch FR rows (base data)
    fr_sql = text(f"""
        SELECT year, quarter,
               pe, pb, ps, eps, bvps, roe, roa, roic,
               gross_margin, net_margin, ebit_margin,
               debt_to_equity, current_ratio, quick_ratio, cash_ratio,
               interest_coverage_ratio, asset_turnover, inventory_turnover,
               receivable_days, inventory_days, payable_days,
               cash_conversion_cycle, ev_ebitda, dividend_yield,
               market_cap, outstanding_shares, p_cashflow
        FROM {SCHEMA}.financial_ratio
        {where_clause}
        {order_clause}
        {limit_clause}
    """)
    fr_res = await db.execute(fr_sql, params)
    fr_rows = fr_res.mappings().all()

    # Fetch BCTC data for computing PE/PB/EPS per quarter
    # Note: BCTC query fetches relevant quarters for ticker to ensure we match.
    
    bctc_sql_text = f"""
        SELECT year, quarter, ind_code, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker
          AND ind_code IN (
              'cp_pho_thong', 
              'von_gop_csh', 
              'vcsh', 
              'lnst_cua_co_dong_cong_ty_me',
              'doanh_thu_thuan',
              'ln_gop',
              'tong_ts'
          )
          {'AND year = :year' if year else ''}
    """
    bctc_res = await db.execute(text(bctc_sql_text), params)
    bctc_raw = bctc_res.mappings().all()

    # Process BCTC in memory
    bctc_map: Dict[Tuple, Dict] = {}
    
    # Helper to update map
    def update_map(y, q, key, val):
        k = (int(y), int(q))
        if k not in bctc_map: bctc_map[k] = {}
        # Logic for shares priority: prefer cp_pho_thong over von_gop_csh
        if key == "shares":
            curr = bctc_map[k].get("shares_prio", 99)
            # 1 for cp_pho_thong, 2 for von_gop_csh
            prio = 1 if val[1] == 'cp_pho_thong' else 2
            if prio < curr:
                bctc_map[k]["shares"] = val[0]
                bctc_map[k]["shares_prio"] = prio
        else:
            bctc_map[k][key] = val

    for b in bctc_raw:
        code = b["ind_code"]
        val = _safe_float(b["value"])
        if code in ('cp_pho_thong', 'von_gop_csh'):
            update_map(b["year"], b["quarter"], "shares", (val / 10000.0, code))
        elif code == 'vcsh':
            update_map(b["year"], b["quarter"], "equity", val)
        elif code == 'lnst_cua_co_dong_cong_ty_me':
            update_map(b["year"], b["quarter"], "net_income", val)
        elif code == 'doanh_thu_thuan':
            update_map(b["year"], b["quarter"], "revenue", val)
        elif code == 'ln_gop':
            update_map(b["year"], b["quarter"], "gross_profit", val)
        elif code == 'tong_ts':
            update_map(b["year"], b["quarter"], "total_assets", val)

    # Fetch price at each quarter-end for PE/PB computation
    price_sql = text(f"""
        SELECT DISTINCT ON (EXTRACT(YEAR FROM trading_date::date), EXTRACT(QUARTER FROM trading_date::date))
            EXTRACT(YEAR FROM trading_date::date)::int AS year,
            EXTRACT(QUARTER FROM trading_date::date)::int AS quarter,
            close
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY EXTRACT(YEAR FROM trading_date::date) DESC,
                 EXTRACT(QUARTER FROM trading_date::date) DESC,
                 trading_date DESC
    """)
    price_res = await db.execute(price_sql, {"ticker": ticker})
    price_map: Dict[Tuple, float] = {}
    for p in price_res.mappings().all():
        price_map[(int(p["year"]), int(p["quarter"]))] = _safe_float(p["close"])

    result = []
    
    # Process rows
    # Note: fr_rows order depends on `year` parameter (ASC if year, DESC if default)
    # We maintain this order in output.
    
    for r in fr_rows:
        year_val = int(r["year"])
        quarter_val = int(r["quarter"])
        key = (year_val, quarter_val)
        bctc = bctc_map.get(key, {})
        close = price_map.get(key, 0)

        # Compute PE, PB, EPS from BCTC when FR values are missing
        fr_pe = _safe_round(r["pe"])
        fr_pb = _safe_round(r["pb"])
        fr_eps = _safe_round(r["eps"])
        fr_mcap = _safe_round(r["market_cap"])
        
        # Other ratios
        fr_roe = _safe_round(r["roe"])
        fr_roa = _safe_round(r["roa"])
        fr_gross_margin = _safe_round(r["gross_margin"])
        fr_net_margin = _safe_round(r["net_margin"])

        shares = bctc.get("shares", 0)
        equity = bctc.get("equity", 0)
        net_income = bctc.get("net_income", 0)
        revenue = bctc.get("revenue", 0)
        gross_profit = bctc.get("gross_profit", 0)
        total_assets = bctc.get("total_assets", 0)

        # EPS from BCTC
        computed_eps = None
        if net_income != 0 and shares > 0:
            computed_eps = round(net_income / shares, 2)

        # PE from BCTC (annualized: multiply quarterly NI by 4)
        computed_pe = None
        if close > 0 and net_income != 0 and shares > 0:
            annualized_eps = (net_income * 4) / shares
            if annualized_eps > 0:
                pe_val = close * 1000 / annualized_eps
                if 0.1 <= pe_val <= 500:
                    computed_pe = round(pe_val, 2)

        # PB from BCTC
        computed_pb = None
        if close > 0 and equity > 0 and shares > 0:
            pb_val = close * 1000 * shares / equity
            if 0.01 <= pb_val <= 100:
                computed_pb = round(pb_val, 2)

        # Market cap from BCTC
        computed_mcap = None
        if close > 0 and shares > 0:
            computed_mcap = round(close * 1000 * shares, 0)

        # ROE (Annualized: Quarterly Net Income * 4 / Equity)
        computed_roe = None
        if net_income != 0 and equity > 0:
            computed_roe = round((net_income * 4 / equity) * 100, 2)

        # ROA (Annualized: Quarterly Net Income * 4 / Total Assets)
        computed_roa = None
        if net_income != 0 and total_assets > 0:
            computed_roa = round((net_income * 4 / total_assets) * 100, 2)
            
        # Gross Margin (Gross Profit / Revenue)
        computed_gross_margin = None
        if gross_profit != 0 and revenue != 0:
            computed_gross_margin = round((gross_profit / revenue) * 100, 2)
            
        # Net Margin (Net Income / Revenue)
        computed_net_margin = None
        if net_income != 0 and revenue != 0:
            computed_net_margin = round((net_income / revenue) * 100, 2)

        result.append({
            "year": year_val,
            "quarter": quarter_val,
            "pe": computed_pe if fr_pe is None else fr_pe,
            "pb": computed_pb if fr_pb is None else fr_pb,
            "ps": _safe_round(r["ps"]),
            "eps": computed_eps if fr_eps is None else fr_eps,
            "bvps": _safe_round(r["bvps"]),
            "roe": computed_roe if fr_roe is None else fr_roe,
            "roa": computed_roa if fr_roa is None else fr_roa,
            "roic": _safe_round(r["roic"]),
            "grossMargin": computed_gross_margin if fr_gross_margin is None else fr_gross_margin,
            "netMargin": computed_net_margin if fr_net_margin is None else fr_net_margin,
            "ebitMargin": _safe_round(r["ebit_margin"]),
            "debtToEquity": _safe_round(r["debt_to_equity"]),
            "currentRatio": _safe_round(r["current_ratio"]),
            "quickRatio": _safe_round(r["quick_ratio"]),
            "cashRatio": _safe_round(r["cash_ratio"]),
            "interestCoverageRatio": _safe_round(r["interest_coverage_ratio"]),
            "assetTurnover": _safe_round(r["asset_turnover"]),
            "inventoryTurnover": _safe_round(r["inventory_turnover"]),
            "receivableDays": _safe_round(r["receivable_days"]),
            "inventoryDays": _safe_round(r["inventory_days"]),
            "payableDays": _safe_round(r["payable_days"]),
            "cashConversionCycle": _safe_round(r["cash_conversion_cycle"]),
            "evEbitda": _safe_round(r["ev_ebitda"]),
            "dividendYield": _safe_round(r["dividend_yield"]),
            "marketCap": computed_mcap if fr_mcap is None else fr_mcap,
            "outstandingShares": _safe_round(r["outstanding_shares"]),
            "pCashflow": _safe_round(r["p_cashflow"]),
        })
    
    # If year filter was NOT used, we fetched DESC (New -> Old).
    # If year filter WAS used, we fetched ASC (Old -> New, Q1->Q4).
    # To maintain consistency, let's reverse if year filter was used, so it's New -> Old (Q4->Q1).
    if year:
        result.reverse()

    return result


# ────────────────────────────────────────────────────────────────────
# 4. Financial Reports (IS, BS, CF from BCTC table)
# ────────────────────────────────────────────────────────────────────
@cached("stock:reports", ttl=300)
async def get_financial_reports(
    db: AsyncSession, 
    ticker: str = "VIC", 
    periods: int = 12,
    year: Optional[int] = None
) -> Dict[str, Any]:
    """Fetch IS, BS, CF from bctc table, pivoting ind_code rows into columns.

    Automatically detects banking/financial-sector tickers and:
      1. Returns isBank=True in the response
      2. Maps IS fields using bank-specific ind_codes (NET_INTEREST_INCOME, TOI, etc.)
      3. Adds extra bank fields (interestIncome, netInterestIncome, loansToCustomers, …)
    """
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # ── Detect industry from company_overview ──
    info_sql = text(f"""
        SELECT icb_name1, icb_name2, icb_name3
        FROM {SCHEMA}.company_overview
        WHERE ticker = :ticker
        LIMIT 1
    """)
    info_res = await db.execute(info_sql, {"ticker": ticker})
    info_row = info_res.mappings().first()
    industry1 = (info_row["icb_name1"] or "").lower() if info_row else ""
    industry2 = (info_row["icb_name2"] or "").lower() if info_row else ""
    industry3 = (info_row["icb_name3"] or "").lower() if info_row else ""
    report_layout = _detect_report_layout([industry1, industry2, industry3])
    is_bank = report_layout == "bank"

    # ── Collect all needed ind_codes ──
    all_codes: set = set()
    for mapping in (IS_CODES, BS_CODES, CF_CODES, IS_BANK_FALLBACKS):
        all_codes.update(mapping.values())
    if is_bank:
        all_codes.update(IS_BANK_EXTRA_CODES.values())
        all_codes.update(BS_BANK_EXTRA_CODES.values())

    # ── Single query for all financial data — efficient pivot ──
    where_extra = ""
    params = {"ticker": ticker, "codes": list(all_codes)}
    
    if year:
        where_extra = "AND year = :year"
        params["year"] = year
        
    extra_ind_names: List[str] = []
    for names in IS_IND_NAME_FALLBACKS.values():
        extra_ind_names.extend(names)

    sql = text(f"""
        SELECT year, quarter, ind_code, ind_name, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker
          AND (
              ind_code = ANY(:codes)
              OR ind_name = ANY(:extra_ind_names)
          )
          {where_extra}
        ORDER BY year DESC, quarter DESC
    """)

    params["extra_ind_names"] = extra_ind_names
    
    res = await db.execute(sql, params)
    rows = res.mappings().all()

    # Pivot: {(year, quarter)} -> {ind_code: value}
    pivot: Dict[Tuple[int, str], Dict[str, float]] = {}
    pivot_ind_name: Dict[Tuple[int, str], Dict[str, float]] = {}
    for r in rows:
        key = (int(r["year"]), str(r["quarter"]))
        if key not in pivot:
            pivot[key] = {}
        if key not in pivot_ind_name:
            pivot_ind_name[key] = {}
        pivot[key][r["ind_code"]] = _safe_float(r["value"])
        normalized_name = _normalize_ind_name(str(r.get("ind_name") or ""))
        if normalized_name:
            pivot_ind_name[key][normalized_name] = _safe_float(r["value"])

    # Sort periods descending, take latest N
    # If year is filtered, we probably want all quarters of that year, not limited by 'periods' 
    # unless 'periods' is smaller than 4 (unlikely default).
    # But usually 'periods' defaults to 12.
    if year:
        # If year specified, take all available quarters for that year (max 4)
        sorted_periods = sorted(pivot.keys(), key=lambda x: (x[0], x[1]), reverse=True)
    else:
        # Default behavior: limit by periods
        sorted_periods = sorted(pivot.keys(), key=lambda x: (x[0], x[1]), reverse=True)[:periods]

    period_labels = [f"Q{quarter}/{year}" for year, quarter in sorted_periods]
    period_index = {(year, quarter): idx for idx, (year, quarter) in enumerate(sorted_periods)}

    def _build_period(year: int, quarter: str) -> Dict:
        return {"period": {"period": f"Q{quarter}/{year}", "year": year, "quarter": int(quarter) if quarter.isdigit() else 0}}

    # ── Build IS (with bank fallback logic + extra bank fields) ──
    income_statement = []
    for year, quarter in sorted_periods:
        data = pivot.get((year, quarter), {})
        data_by_name = pivot_ind_name.get((year, quarter), {})
        item = _build_period(year, quarter)

        for field, code in IS_CODES.items():
            val = data.get(code, 0)
            # If primary code yields 0, try bank fallback
            if val == 0 and field in IS_BANK_FALLBACKS:
                val = data.get(IS_BANK_FALLBACKS[field], 0)
            item[field] = val

        for field, candidates in IS_IND_NAME_FALLBACKS.items():
            if item.get(field, 0):
                continue
            for candidate in candidates:
                val = data_by_name.get(_normalize_ind_name(candidate))
                if val not in (None, 0):
                    item[field] = val
                    break

        # EPS: use basicEps if available, otherwise 0 (ratio endpoint has proper EPS)
        item["eps"] = item.pop("basicEps", 0) or 0

        # Unified aliases for charting in Overview.
        if item.get("currentIncomeTaxExpense", 0) == 0:
            item["currentIncomeTaxExpense"] = item.get("incomeTax", 0)
        item.setdefault("deferredIncomeTaxExpense", 0)
        item.setdefault("otherExpense", 0)
        item.setdefault("extraordinaryIncome", 0)
        item.setdefault("otherIncome", 0)

        # Bank-specific extra income statement fields
        if is_bank:
            for field, code in IS_BANK_EXTRA_CODES.items():
                item[field] = data.get(code, 0)
            # Ensure totalOperatingIncome is populated — try field or grossProfit fallback
            if item.get("totalOperatingIncome", 0) == 0:
                item["totalOperatingIncome"] = item.get("grossProfit", 0) or item.get("revenue", 0)
            # Ensure netInterestIncome is populated
            if item.get("netInterestIncome", 0) == 0:
                item["netInterestIncome"] = item.get("financialIncome", 0)
            # Ensure prePpopProfit (PPOP)
            if item.get("prePpopProfit", 0) == 0:
                item["prePpopProfit"] = item.get("operatingProfit", 0)

        income_statement.append(item)

    # ── Build BS ──
    balance_sheet = []
    for year, quarter in sorted_periods:
        data = pivot.get((year, quarter), {})
        item = _build_period(year, quarter)
        for field, code in BS_CODES.items():
            item[field] = data.get(code, 0)
        item["totalLiabilitiesAndEquity"] = item.get("totalLiabilities", 0) + item.get("totalEquity", 0)

        # Bank-specific extra balance sheet fields
        if is_bank:
            for field, code in BS_BANK_EXTRA_CODES.items():
                item[field] = data.get(code, 0)
            # Compute gross loans if net loans are available but gross is not
            if item.get("loansToCustomers", 0) == 0 and item.get("loansToCustomersGross", 0) != 0:
                reserves = item.get("loanLossReserves", 0)
                # reserves typically negative, so Gross = Net - Reserves (if reserves < 0) or Net + Reserves?
                # Usually: Net = Gross - Reserves. So Gross = Net + Reserves.
                # If reserves is stored as negative number in DB (e.g. -500), then Gross = Net - (-500).
                # But here code says: item["loansToCustomers"] = item["loansToCustomersGross"] + reserves
                # This seems to be setting Net from Gross + Reserves.
                # If Reserves IS negative, then Net = Gross + (-500) = Gross - 500. Correct.
                pass

        balance_sheet.append(item)

    # ── Build CF ──
    cash_flow = []
    for year, quarter in sorted_periods:
        data = pivot.get((year, quarter), {})
        item = _build_period(year, quarter)
        for field, code in CF_CODES.items():
            item[field] = data.get(code, 0)
        cash_flow.append(item)

    # ── Build dynamic statement tables (alias-aware, full indicators) ──
    report_tables: Dict[str, Dict[str, Any]] = {
        "incomeStatement": {"periods": period_labels, "rows": []},
        "balanceSheet": {"periods": period_labels, "rows": []},
        "cashFlow": {"periods": period_labels, "rows": []},
    }

    if sorted_periods:
        period_clauses: List[str] = []
        detail_params: Dict[str, Any] = {"ticker": ticker}
        for idx, (y, q) in enumerate(sorted_periods):
            y_key = f"y{idx}"
            q_key = f"q{idx}"
            period_clauses.append(f"(year = :{y_key} AND quarter = :{q_key})")
            detail_params[y_key] = y
            detail_params[q_key] = str(q)

        detail_sql = text(f"""
            SELECT year, quarter, report_code, report_name, ind_code, ind_name, value
            FROM {SCHEMA}.bctc
            WHERE ticker = :ticker
              AND ({" OR ".join(period_clauses)})
            ORDER BY year DESC, quarter DESC, report_code NULLS LAST, ind_code, ind_name
        """)
        detail_rows = (await db.execute(detail_sql, detail_params)).mappings().all()

        bucket_rows: Dict[str, Dict[str, Dict[str, Any]]] = {
            "incomeStatement": {},
            "balanceSheet": {},
            "cashFlow": {},
        }

        for r in detail_rows:
            y = int(r["year"])
            q = str(r["quarter"])
            p_idx = period_index.get((y, q))
            if p_idx is None:
                continue

            raw_code = str(r.get("ind_code") or "").strip()
            raw_name = str(r.get("ind_name") or "").strip()
            normalized_name = _normalize_ind_name(raw_name)
            canonical_code = _resolve_canonical_code(raw_code, raw_name)

            stmt_type = _classify_statement(
                str(r.get("report_code") or ""),
                str(r.get("report_name") or ""),
                canonical_code,
            )
            if stmt_type is None:
                continue

            display_label = BCTC_CODE_TO_LABEL.get(canonical_code) or raw_name or canonical_code
            value = _safe_float(r.get("value"), 0.0)

            row_store = bucket_rows[stmt_type].get(canonical_code)
            if row_store is None:
                row_store = {
                    "indCode": canonical_code,
                    "label": display_label,
                    "values": [0.0 for _ in period_labels],
                    "_seen": [False for _ in period_labels],
                    "_section": "",
                    "_sectionLabel": "",
                    "_sectionOrder": 999,
                }
                bucket_rows[stmt_type][canonical_code] = row_store

            seen = row_store["_seen"][p_idx]
            if not seen:
                row_store["values"][p_idx] = value
                row_store["_seen"][p_idx] = True
            else:
                row_store["values"][p_idx] = _pick_value(row_store["values"][p_idx], value)

            if row_store["label"].startswith("_") and display_label and not display_label.startswith("_"):
                row_store["label"] = display_label

            section_key, section_label, section_order = _resolve_layout_section(
                report_layout=report_layout,
                stmt_type=stmt_type,
                ind_code=canonical_code,
                label=row_store["label"],
            )
            row_store["_section"] = section_key
            row_store["_sectionLabel"] = section_label
            row_store["_sectionOrder"] = section_order

        income_order = list(dict.fromkeys(list(IS_CODES.values()) + list(IS_BANK_EXTRA_CODES.values()) + list(IS_BANK_FALLBACKS.values())))
        balance_order = list(dict.fromkeys(list(BS_CODES.values()) + list(BS_BANK_EXTRA_CODES.values())))
        cash_order = list(dict.fromkeys(list(CF_CODES.values())))
        order_map = {
            "incomeStatement": {code: idx for idx, code in enumerate(income_order)},
            "balanceSheet": {code: idx for idx, code in enumerate(balance_order)},
            "cashFlow": {code: idx for idx, code in enumerate(cash_order)},
        }

        for stmt_type in ("incomeStatement", "balanceSheet", "cashFlow"):
            # Second-pass dedup by loose label to merge near-identical records
            # that still slipped through code canonicalization.
            deduped_by_label: Dict[str, Dict[str, Any]] = {}
            for row in bucket_rows[stmt_type].values():
                label_key = _normalize_text_loose(str(row.get("label") or ""))
                merge_key = label_key or str(row.get("indCode") or "")
                existing = deduped_by_label.get(merge_key)
                if existing is None:
                    deduped_by_label[merge_key] = row
                    continue

                for i, v in enumerate(row.get("values", [])):
                    existing["values"][i] = _pick_value(existing["values"][i], v)

                existing_label = str(existing.get("label") or "")
                incoming_label = str(row.get("label") or "")
                if existing_label.startswith("_") and incoming_label and not incoming_label.startswith("_"):
                    existing["label"] = incoming_label

            rows_list = list(deduped_by_label.values())
            for row in rows_list:
                row.pop("_seen", None)
                row["section"] = row.pop("_section", "")
                row["sectionLabel"] = row.pop("_sectionLabel", "Khoản mục khác")
                row["sectionOrder"] = row.pop("_sectionOrder", 999)
                row["rowOrder"] = order_map[stmt_type].get(row["indCode"], 999999)

            rows_list.sort(
                key=lambda row: (
                    int(row.get("sectionOrder", 999)),
                    int(row.get("rowOrder", 999999)),
                    str(row.get("label") or "").lower(),
                )
            )
            report_tables[stmt_type]["rows"] = rows_list

    return {
        "isBank": is_bank,
        "industry": (info_row["icb_name2"] if info_row else "") or "",
        "reportLayout": report_layout,
        "reportLayoutLabel": REPORT_LAYOUT_LABELS.get(report_layout, "Phi tài chính"),
        "incomeStatement": income_statement,
        "balanceSheet": balance_sheet,
        "cashFlow": cash_flow,
        "reportTables": report_tables,
    }


@cached("stock:insurance:tcdn", ttl=300)
async def get_insurance_tcdn_dashboard(
    db: AsyncSession,
    ticker: str = "BVH",
    period: Optional[str] = None,
    year: Optional[int] = None,
    scenario: str = "adverse",
) -> Dict[str, Any]:
    """Build industry-aware insurance payload for TCDN dashboard.

    The payload is proxy-capable: when strict insurance fields are unavailable,
    it exposes computed values with confidence tags for the frontend.
    """
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    company_info = await _query_company_info(db, ticker)
    industry_texts = [
        str((company_info or {}).get("icb_name1", "")),
        str((company_info or {}).get("icb_name2", "")),
        str((company_info or {}).get("icb_name3", "")),
    ]
    is_insurance = any(_is_insurance_text(v) for v in industry_texts)

    reports, ratios = await asyncio.gather(
        get_financial_reports(db, ticker=ticker, periods=12, year=year),
        get_financial_ratios(db, ticker=ticker, periods=12, year=year),
    )

    income_rows: List[Dict[str, Any]] = reports.get("incomeStatement", []) or []
    balance_rows: List[Dict[str, Any]] = reports.get("balanceSheet", []) or []

    latest_income = _pick_report_by_period(income_rows, period)
    latest_balance = _pick_report_by_period(balance_rows, period)

    selected_period = (((latest_income or {}).get("period") or {}).get("period"))
    if not selected_period:
        selected_period = (((latest_balance or {}).get("period") or {}).get("period"))

    total_assets = _pick_first_number(latest_balance, ["totalAssets"], 0)
    total_equity = _pick_first_number(latest_balance, ["totalEquity"], 0)
    total_liabilities = _pick_first_number(latest_balance, ["totalLiabilities"], 0)

    technical_provisions = _pick_first_number(
        latest_balance,
        ["technicalProvisions", "insuranceTechnicalProvisions", "claimReserves", "premiumReserves"],
        0,
    )
    if technical_provisions == 0 and total_liabilities > 0:
        technical_provisions = total_liabilities * 0.6

    net_earned_premium = _pick_first_number(
        latest_income,
        ["netEarnedPremium", "nep", "insuranceNetEarnedPremium", "revenue"],
        0,
    )
    claims_incurred = _pick_first_number(
        latest_income,
        ["claimsIncurred", "netClaimsIncurred", "insuranceClaimsExpense", "claimExpense"],
        0,
    )
    commission_expense = _pick_first_number(latest_income, ["commissionExpense", "brokerageExpense", "chiHoaHong"], 0)
    operating_expense = _pick_first_number(latest_income, ["operatingExpenses", "adminExpenses", "gAndAExpense"], 0)

    underwriting_expense = commission_expense + operating_expense
    underwriting_result = net_earned_premium - claims_incurred - underwriting_expense
    combined_ratio = _safe_div(claims_incurred + underwriting_expense, net_earned_premium)
    combined_ratio_pct = combined_ratio * 100 if combined_ratio is not None else None

    liquid_assets = _pick_first_number(latest_balance, ["cash"], 0) + _pick_first_number(latest_balance, ["shortTermInvestments"], 0)
    solvency_required = _pick_first_number(latest_balance, ["minimumCapitalRequirement", "requiredCapital"], 0)
    if solvency_required == 0 and technical_provisions > 0:
        solvency_required = technical_provisions * 0.1
    solvency_coverage = _safe_div(total_equity, solvency_required)

    reinsurance_recoverables = _pick_first_number(
        latest_balance,
        ["reinsuranceRecoverables", "riRecoverables", "reinsuranceReceivable"],
        0,
    )
    reinsurance_overdue = _pick_first_number(
        latest_balance,
        ["reinsurancePayablesOverdue", "riOverduePayables"],
        0,
    )

    reinsurance_dependency = _safe_div(reinsurance_recoverables, claims_incurred)
    reinsurance_overdue_ratio = _safe_div(reinsurance_overdue, reinsurance_recoverables)

    scenario_name = str(scenario or "adverse").lower()
    outflow_rate = 0.015
    if scenario_name == "baseline":
        outflow_rate = 0.008
    elif scenario_name == "severe":
        outflow_rate = 0.025

    stress_days = list(range(1, 91))
    stress_outflows = [claims_incurred * outflow_rate * day for day in stress_days]
    liquidity_breach_day = next((idx + 1 for idx, value in enumerate(stress_outflows) if value > liquid_assets), None)

    trend_income = list(reversed(income_rows[:8]))
    trend_balance = list(reversed(balance_rows[:8]))
    trend_periods = [(((row or {}).get("period") or {}).get("period") or "") for row in trend_income]

    trend_nep = [
        _pick_first_number(row, ["netEarnedPremium", "nep", "insuranceNetEarnedPremium", "revenue"], 0)
        for row in trend_income
    ]
    trend_claims = [
        _pick_first_number(row, ["claimsIncurred", "netClaimsIncurred", "insuranceClaimsExpense", "claimExpense"], 0)
        for row in trend_income
    ]
    trend_combined_ratio = []
    for row in trend_income:
        row_nep = _pick_first_number(row, ["netEarnedPremium", "nep", "insuranceNetEarnedPremium", "revenue"], 0)
        row_claims = _pick_first_number(row, ["claimsIncurred", "netClaimsIncurred", "insuranceClaimsExpense", "claimExpense"], 0)
        row_opex = _pick_first_number(row, ["operatingExpenses", "adminExpenses", "gAndAExpense"], 0)
        row_ratio = _safe_div(row_claims + row_opex, row_nep)
        trend_combined_ratio.append(_safe_round(row_ratio * 100, 4) if row_ratio is not None else None)

    trend_assets = [_pick_first_number(row, ["totalAssets"], 0) for row in trend_balance]
    trend_equity = [_pick_first_number(row, ["totalEquity"], 0) for row in trend_balance]
    trend_liquid_assets = [
        _pick_first_number(row, ["cash"], 0) + _pick_first_number(row, ["shortTermInvestments"], 0)
        for row in trend_balance
    ]

    latest_ratio = ratios[0] if ratios else {}
    roe_ratio = _safe_float((latest_ratio or {}).get("roe"), 0)
    roa_ratio = _safe_float((latest_ratio or {}).get("roa"), 0)

    return {
        "ticker": ticker,
        "industry": (company_info or {}).get("icb_name2", "") or reports.get("industry", ""),
        "isInsurance": bool(is_insurance),
        "selectedPeriod": selected_period,
        "scenario": scenario_name,
        "kpis": {
            "totalAssets": _metric_payload(total_assets, "high", "BS.totalAssets", "financialReports.balanceSheet"),
            "totalEquity": _metric_payload(total_equity, "high", "BS.totalEquity", "financialReports.balanceSheet"),
            "technicalProvisions": _metric_payload(
                technical_provisions,
                "proxy" if _pick_first_number(latest_balance, ["technicalProvisions", "insuranceTechnicalProvisions", "claimReserves", "premiumReserves"], 0) == 0 else "high",
                "technicalProvisions || totalLiabilities*0.6",
                "financialReports.balanceSheet",
            ),
            "netEarnedPremium": _metric_payload(net_earned_premium, "proxy", "NEP || revenue", "financialReports.incomeStatement"),
            "claimsIncurred": _metric_payload(claims_incurred, "proxy", "claimsIncurred fallback", "financialReports.incomeStatement"),
            "underwritingResult": _metric_payload(
                underwriting_result,
                "proxy",
                "netEarnedPremium - claimsIncurred - (commissionExpense + operatingExpense)",
                "computed",
            ),
            "combinedRatioPct": _metric_payload(
                combined_ratio_pct,
                "proxy",
                "(claimsIncurred + underwritingExpense) / netEarnedPremium * 100",
                "computed",
            ),
            "solvencyCoverage": _metric_payload(
                solvency_coverage,
                "proxy",
                "availableCapital / requiredCapital",
                "computed",
            ),
            "liquidAssets": _metric_payload(liquid_assets, "high", "cash + shortTermInvestments", "financialReports.balanceSheet"),
            "liquidityToAssets": _metric_payload(_safe_div(liquid_assets, total_assets), "proxy", "liquidAssets/totalAssets", "computed"),
            "liquidityToTechnicalProvisions": _metric_payload(
                _safe_div(liquid_assets, technical_provisions),
                "proxy",
                "liquidAssets/technicalProvisions",
                "computed",
            ),
            "reinsuranceDependency": _metric_payload(
                reinsurance_dependency,
                "proxy",
                "reinsuranceRecoverables/claimsIncurred",
                "computed",
            ),
            "reinsuranceOverdueRatio": _metric_payload(
                reinsurance_overdue_ratio,
                "proxy",
                "reinsurancePayablesOverdue/reinsuranceRecoverables",
                "computed",
            ),
            "roe": _metric_payload(roe_ratio, "high", "financialRatio.roe", "financialRatios"),
            "roa": _metric_payload(roa_ratio, "high", "financialRatio.roa", "financialRatios"),
        },
        "stress": {
            "days": stress_days,
            "cumulativeOutflows": [_safe_round(v, 4) for v in stress_outflows],
            "liquidAssetsLine": [_safe_round(liquid_assets, 4) for _ in stress_days],
            "breachDay": liquidity_breach_day,
            "outflowRate": outflow_rate,
        },
        "trends": {
            "periods": trend_periods,
            "nep": [_safe_round(v, 4) for v in trend_nep],
            "claims": [_safe_round(v, 4) for v in trend_claims],
            "combinedRatioPct": trend_combined_ratio,
            "assets": [_safe_round(v, 4) for v in trend_assets],
            "equity": [_safe_round(v, 4) for v in trend_equity],
            "liquidAssets": [_safe_round(v, 4) for v in trend_liquid_assets],
        },
        "meta": {
            "fallbackMode": True,
            "notes": [
                "Proxy metrics are returned with confidence tags when strict insurance fields are missing.",
                "Use confidence='high' metrics first for regulatory interpretations.",
            ],
        },
    }


# ────────────────────────────────────────────────────────────────────
# 5. Company Profile
# ────────────────────────────────────────────────────────────────────
@cached("stock:profile", ttl=600)
async def get_company_profile(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Run sub-queries in parallel
    info_res, holders_res, events_res = await asyncio.gather(
        _query_company_info(db, ticker),
        _query_shareholders(db, ticker),
        _query_events(db, ticker),
    )

    info = info_res or {}
    overview = {
        "ticker": ticker,
        "companyName": info.get("organ_short_name", ""),
        "companyNameFull": info.get("organ_name", ""),
        "exchange": info.get("exchange", ""),
        "industry": info.get("icb_name2", ""),
        "subIndustry": info.get("icb_name3", ""),
        "sector": info.get("icb_name1", ""),
        "description": info.get("overview", ""),
        "taxCode": "",
        "charterCapital": None,
        "outstandingShares": None,
        "website": "",
    }

    shareholders = [
        {
            "name": r.get("name", ""),
            "role": r.get("position", "") or "",
            "shares": str(r.get("percent", "0")),
            "percentage": _safe_float(r.get("percent")),
        }
        for r in (holders_res or [])
    ]

    events = [
        {
            "title": r.get("event_title", ""),
            "date": r.get("public_date", ""),
            "source": r.get("source_url", ""),
            "category": r.get("event_list_name", ""),
        }
        for r in (events_res or [])
    ]

    return {
        "overview": overview,
        "shareholders": shareholders,
        "events": events,
        "dividendHistory": [],
    }


async def _query_company_info(db: AsyncSession, ticker: str) -> Optional[Dict]:
    sql = text(f"""
        SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
               ticker,
               exchange,
               organ_short_name,
               organ_name,
               icb_name1,
               icb_name2,
               icb_name3,
               overview,
               type_info
        FROM {SCHEMA}.company_overview
        WHERE UPPER(BTRIM(ticker)) = :ticker
        ORDER BY
            UPPER(BTRIM(ticker)),
            CASE WHEN overview IS NOT NULL AND BTRIM(overview) != '' THEN 0 ELSE 1 END,
            CASE WHEN organ_short_name IS NOT NULL AND BTRIM(organ_short_name) != '' THEN 0 ELSE 1 END,
            CASE WHEN organ_name IS NOT NULL AND BTRIM(organ_name) != '' THEN 0 ELSE 1 END
        LIMIT 1
    """)
    res = await db.execute(sql, {"ticker": ticker})
    row = res.mappings().first()
    return dict(row) if row else None


async def _query_events(db: AsyncSession, ticker: str) -> List[Dict]:
    sql = text(f"""
        WITH dedup AS (
            SELECT DISTINCT ON (
                BTRIM(COALESCE(event_title, '')),
                public_date,
                BTRIM(COALESCE(source_url, '')),
                BTRIM(COALESCE(event_list_name, ''))
            )
                event_title,
                public_date,
                source_url,
                event_list_name
            FROM {SCHEMA}.event
            WHERE event_title ILIKE :pattern
            ORDER BY
                BTRIM(COALESCE(event_title, '')),
                public_date DESC NULLS LAST,
                BTRIM(COALESCE(source_url, '')),
                BTRIM(COALESCE(event_list_name, ''))
        )
        SELECT event_title, public_date, source_url, event_list_name
        FROM dedup
        ORDER BY public_date DESC NULLS LAST
        LIMIT 50
    """)
    res = await db.execute(sql, {"pattern": f"{ticker}%"})
    return [dict(r) for r in res.mappings().all()]


# ────────────────────────────────────────────────────────────────────
# 6. Stock Comparison
# ────────────────────────────────────────────────────────────────────
@cached("stock:compare", ttl=300)
async def get_stock_comparison(
    db: AsyncSession, ticker: str = "VIC", peers: str = ""
) -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Resolve peer list — always include same-sector peers, plus any custom
    extra_list = [p.strip().upper() for p in peers.split(",") if p.strip()] if peers else []

    sql = text(f"""
        WITH sector AS (
            SELECT icb_name2 FROM {SCHEMA}.company_overview
            WHERE ticker = :ticker LIMIT 1
        )
        SELECT ticker FROM {SCHEMA}.company_overview
        WHERE icb_name2 = (SELECT icb_name2 FROM sector)
          AND ticker != :ticker
        LIMIT 5
    """)
    res = await db.execute(sql, {"ticker": ticker})
    sector_peers = [r["ticker"] for r in res.mappings().all()]

    # Merge: sector peers first, then extra (deduplicated, excluding main ticker)
    seen = {ticker}
    peer_list: list[str] = []
    for t in sector_peers + extra_list:
        if t not in seen:
            seen.add(t)
            peer_list.append(t)

    all_tickers = [ticker] + peer_list

    # ── Main query: latest price, financial ratios ──
    sql = text(f"""
        WITH latest_fr AS (
            SELECT DISTINCT ON (ticker)
                ticker, pe, pb, roe, roa, gross_margin, net_margin,
                debt_to_equity, market_cap, eps, dividend_yield,
                outstanding_shares
            FROM {SCHEMA}.financial_ratio
            WHERE ticker = ANY(:tickers)
            ORDER BY ticker, year DESC, quarter DESC
        ),
        latest_hp AS (
            SELECT DISTINCT ON (ticker)
                ticker, close, trading_date
            FROM {SCHEMA}.history_price
            WHERE ticker = ANY(:tickers) AND close IS NOT NULL
            ORDER BY ticker, trading_date DESC
        ),
        latest_eb AS (
            SELECT DISTINCT ON (ticker)
                ticker, ref_price, match_price
            FROM {SCHEMA}.electric_board
            WHERE ticker = ANY(:tickers)
            ORDER BY ticker, trading_date DESC
        ),
        latest_co AS (
            SELECT DISTINCT ON (ticker)
                ticker, organ_short_name, organ_name, exchange
            FROM {SCHEMA}.company_overview
            WHERE ticker = ANY(:tickers)
            ORDER BY ticker,
                CASE WHEN organ_short_name IS NOT NULL
                     AND organ_short_name != 'NaN' THEN 0 ELSE 1 END
        )
        SELECT
            hp.ticker,
            co.organ_short_name AS company_name,
            co.exchange,
            hp.close AS hp_close,
            eb.match_price AS eb_match,
            eb.ref_price AS eb_ref,
            COALESCE(eb.match_price / 1000.0, hp.close) AS price,
            COALESCE(eb.ref_price / 1000.0, hp.close) AS ref_price,
            fr.pe, fr.pb, fr.roe, fr.roa,
            fr.gross_margin, fr.net_margin,
            fr.debt_to_equity, fr.market_cap,
            fr.eps, fr.dividend_yield,
            fr.outstanding_shares
        FROM latest_hp hp
        JOIN latest_co co ON co.ticker = hp.ticker
        LEFT JOIN latest_fr fr ON fr.ticker = hp.ticker
        LEFT JOIN latest_eb eb ON eb.ticker = hp.ticker
    """)
    res = await db.execute(sql, {"tickers": all_tickers})
    rows = {r["ticker"]: dict(r) for r in res.mappings().all()}

    # ── Price history (last 90 trading days) for all tickers ──
    sql_hist = text(f"""
        SELECT ticker, trading_date AS date, open, high, low, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = ANY(:tickers) AND close IS NOT NULL
          AND trading_date >= (
              SELECT trading_date FROM (
                  SELECT DISTINCT trading_date
                  FROM {SCHEMA}.history_price
                  WHERE close IS NOT NULL
                  ORDER BY trading_date DESC
                  LIMIT 90
              ) sub ORDER BY trading_date LIMIT 1
          )
        ORDER BY ticker, trading_date
    """)
    res_hist = await db.execute(sql_hist, {"tickers": all_tickers})
    hist_map: Dict[str, List[Dict]] = {t: [] for t in all_tickers}
    for h in res_hist.mappings().all():
        t = h["ticker"]
        if t in hist_map:
            hist_map[t].append({
                "date": str(h["date"]),
                "open": float(h["open"] or 0),
                "high": float(h["high"] or 0),
                "low": float(h["low"] or 0),
                "close": float(h["close"] or 0),
                "volume": int(h["volume"] or 0),
            })

    # ── BCTC fallback: compute missing financial metrics ──
    # Gather tickers that have null metrics from financial_ratio
    tickers_needing_bctc = [
        t for t in all_tickers
        if t in rows and any(
            rows[t].get(col) is None
            for col in ("pe", "pb", "roe", "roa", "gross_margin", "net_margin",
                        "debt_to_equity", "eps", "market_cap")
        )
    ]

    bctc_data: Dict[str, Dict] = {}
    if tickers_needing_bctc:
        sql_bctc = text(f"""
            WITH
            -- Outstanding shares (prefer C_PHI_U_PH_TH_NG_NG, fallback charter capital)
            shares AS (
                SELECT DISTINCT ON (ticker)
                    ticker, value / 10000.0 AS shares
                FROM (
                    SELECT ticker, value, year, quarter, 1 AS priority
                    FROM {SCHEMA}.bctc
                    WHERE ind_code = 'cp_pho_thong'
                      AND ticker = ANY(:tickers) AND value IS NOT NULL AND value > 0
                    UNION ALL
                    SELECT ticker, value, year, quarter, 2 AS priority
                    FROM {SCHEMA}.bctc
                    WHERE ind_code = 'von_gop_csh'
                      AND ticker = ANY(:tickers) AND value IS NOT NULL AND value > 0
                ) combined
                ORDER BY ticker, priority, year DESC, quarter DESC
            ),
            -- Equity (latest)
            equity AS (
                SELECT DISTINCT ON (ticker) ticker, value AS equity
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'vcsh'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL AND value > 0
                ORDER BY ticker, year DESC, quarter DESC
            ),
            -- Total assets (latest)
            assets AS (
                SELECT DISTINCT ON (ticker) ticker, value AS total_assets
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'tong_ts'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL AND value > 0
                ORDER BY ticker, year DESC, quarter DESC
            ),
            -- Total liabilities (latest)
            liabilities AS (
                SELECT DISTINCT ON (ticker) ticker, value AS total_liabilities
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'no_phai_tra'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL
                ORDER BY ticker, year DESC, quarter DESC
            ),
            -- Revenue TTM (sum of last 4 quarters)
            rev_ranked AS (
                SELECT ticker, value,
                    ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'doanh_thu_thuan'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL AND value != 0
            ),
            revenue_ttm AS (
                SELECT ticker, SUM(value) AS revenue
                FROM rev_ranked WHERE rn <= 4
                GROUP BY ticker HAVING COUNT(*) >= 2
            ),
            -- Gross profit TTM
            gp_ranked AS (
                SELECT ticker, value,
                    ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'ln_gop'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL
            ),
            gross_profit_ttm AS (
                SELECT ticker, SUM(value) AS gross_profit
                FROM gp_ranked WHERE rn <= 4
                GROUP BY ticker HAVING COUNT(*) >= 2
            ),
            -- Net income TTM (parent)
            ni_ranked AS (
                SELECT ticker, value,
                    ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'lnst_cua_co_dong_cong_ty_me'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL AND value != 0
            ),
            net_income_ttm AS (
                SELECT ticker, SUM(value) AS net_income
                FROM ni_ranked WHERE rn <= 4
                GROUP BY ticker HAVING COUNT(*) >= 2
            )
            SELECT
                sh.ticker,
                sh.shares,
                eq.equity,
                ast.total_assets,
                li.total_liabilities,
                rev.revenue,
                gp.gross_profit,
                ni.net_income
            FROM shares sh
            LEFT JOIN equity eq ON eq.ticker = sh.ticker
            LEFT JOIN assets ast ON ast.ticker = sh.ticker
            LEFT JOIN liabilities li ON li.ticker = sh.ticker
            LEFT JOIN revenue_ttm rev ON rev.ticker = sh.ticker
            LEFT JOIN gross_profit_ttm gp ON gp.ticker = sh.ticker
            LEFT JOIN net_income_ttm ni ON ni.ticker = sh.ticker
        """)
        res_bctc = await db.execute(sql_bctc, {"tickers": tickers_needing_bctc})
        for b in res_bctc.mappings().all():
            bctc_data[b["ticker"]] = dict(b)

    def _build_comparison(t: str) -> Dict:
        r = rows.get(t, {})
        price = _safe_float(r.get("price"))
        ref = _safe_float(r.get("ref_price"))
        change = price - ref if ref > 0 else 0
        change_pct = (change / ref * 100) if ref > 0 else 0

        # Start with financial_ratio values
        pe = _safe_round(r.get("pe"))
        pb = _safe_round(r.get("pb"))
        roe = _safe_round(r.get("roe"))
        roa = _safe_round(r.get("roa"))
        gross_margin = _safe_round(r.get("gross_margin"))
        net_margin = _safe_round(r.get("net_margin"))
        debt_to_equity = _safe_round(r.get("debt_to_equity"))
        market_cap = _safe_round(r.get("market_cap"))
        eps = _safe_round(r.get("eps"))
        dividend_yield = _safe_round(r.get("dividend_yield"))

        # financial_ratio stores ROE/ROA as decimals (0.3 = 30%), convert to %
        if roe is not None:
            roe = _safe_round(roe * 100)
        if roa is not None:
            roa = _safe_round(roa * 100)

        # BCTC fallback for null values
        # Use hp_close (in 1000 VND) for BCTC calculations
        hp_close = _safe_float(r.get("hp_close"))
        bctc = bctc_data.get(t)
        if bctc and hp_close > 0:
            shares = _safe_float(bctc.get("shares"), 0)
            equity_val = _safe_float(bctc.get("equity"), 0)
            total_assets = _safe_float(bctc.get("total_assets"), 0)
            total_liab = _safe_float(bctc.get("total_liabilities"), 0)
            revenue = _safe_float(bctc.get("revenue"), 0)
            gross_profit = _safe_float(bctc.get("gross_profit"), 0)
            net_income = _safe_float(bctc.get("net_income"), 0)
            price_vnd = hp_close * 1000  # convert to VND

            if eps is None and net_income != 0 and shares > 0:
                eps = _safe_round(net_income / shares)

            if pe is None and net_income != 0 and shares > 0:
                computed_eps = net_income / shares
                if computed_eps > 0:
                    pe_val = price_vnd / computed_eps
                    if 0.1 <= pe_val <= 500:
                        pe = _safe_round(pe_val)

            if pb is None and equity_val > 0 and shares > 0:
                pb_val = price_vnd * shares / equity_val
                if 0.01 <= pb_val <= 100:
                    pb = _safe_round(pb_val)

            if market_cap is None and shares > 0:
                market_cap = _safe_round(price_vnd * shares)

            if roe is None and net_income != 0 and equity_val > 0:
                roe = _safe_round(net_income / equity_val * 100)

            if roa is None and net_income != 0 and total_assets > 0:
                roa = _safe_round(net_income / total_assets * 100)

            if gross_margin is None and revenue > 0 and gross_profit != 0:
                gross_margin = _safe_round(gross_profit / revenue * 100)

            if net_margin is None and revenue > 0 and net_income != 0:
                net_margin = _safe_round(net_income / revenue * 100)

            if debt_to_equity is None and equity_val > 0:
                debt_to_equity = _safe_round(total_liab / equity_val)

        return {
            "ticker": t,
            "companyName": r.get("company_name", ""),
            "exchange": r.get("exchange", ""),
            "price": price,
            "priceChange": round(change, 2),
            "priceChangePercent": round(change_pct, 2),
            "pe": pe,
            "pb": pb,
            "roe": roe,
            "roa": roa,
            "grossMargin": gross_margin,
            "netMargin": net_margin,
            "debtToEquity": debt_to_equity,
            "marketCap": market_cap,
            "eps": eps,
            "dividendYield": dividend_yield,
            "priceHistory": hist_map.get(t, []),
        }

    main_data = _build_comparison(ticker)
    peers_data = [_build_comparison(t) for t in peer_list if t in rows]

    return {"main": main_data, "peers": peers_data}


# ────────────────────────────────────────────────────────────────────
# 7. Deep Analysis (Balance Sheet, Income Statement, Cash Flow)
# ────────────────────────────────────────────────────────────────────
@cached("stock:deep", ttl=300)
async def get_deep_analysis(db: AsyncSession, ticker: str = "VIC", year: int | None = None) -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    reports_res, ratios_res = await asyncio.gather(
        _query_annual_bctc(db, ticker, years=5, end_year=year),
        _query_annual_ratios(db, ticker, years=5, end_year=year),
    )

    reports = reports_res
    ratios = ratios_res

    bs_analysis = _build_bs_analysis(reports, ratios)
    is_analysis = _build_is_analysis(reports, ratios)
    cf_analysis = _build_cf_analysis(reports, ratios)

    return {
        "balanceSheet": bs_analysis,
        "incomeStatement": is_analysis,
        "cashFlow": cf_analysis,
    }


async def _query_annual_bctc(db: AsyncSession, ticker: str, years: int = 5, end_year: int | None = None) -> Dict:
    """Get annual (Q5=full year or Q4) BCTC data for multiple years."""
    all_codes = set()
    for mapping in (IS_CODES, BS_CODES, CF_CODES):
        all_codes.update(mapping.values())

    params = {"ticker": ticker, "codes": list(all_codes)}
    year_filter = ""
    if end_year:
        year_filter = "AND year <= :end_year"
        params["end_year"] = end_year

    sql = text(f"""
        SELECT year, quarter, ind_code, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker
          AND ind_code = ANY(:codes)
          {year_filter}
        ORDER BY year DESC, quarter DESC
    """)
    res = await db.execute(sql, params)
    rows = res.mappings().all()

    pivot: Dict[Tuple[int, str], Dict[str, float]] = {}
    for r in rows:
        key = (int(r["year"]), str(r["quarter"]))
        if key not in pivot:
            pivot[key] = {}
        pivot[key][r["ind_code"]] = _safe_float(r["value"])

    return pivot


async def _query_annual_ratios(db: AsyncSession, ticker: str, years: int = 5, end_year: int | None = None) -> List[Dict]:
    """Get annual financial ratios."""
    params = {"ticker": ticker, "limit": years * 4 + 4}
    year_filter = ""
    if end_year:
        year_filter = "AND year <= :end_year"
        params["end_year"] = end_year

    sql = text(f"""
        SELECT year, quarter,
               pe, pb, roe, roa, roic,
               gross_margin, net_margin, ebit_margin,
               debt_to_equity, current_ratio, quick_ratio, cash_ratio,
               interest_coverage_ratio, asset_turnover,
               financial_leverage, market_cap, eps,
               inventory_days, receivable_days, payable_days,
               cash_conversion_cycle, inventory_turnover,
               ebitda_value, ebit_value, outstanding_shares
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = :ticker
        {year_filter}
        ORDER BY year DESC, quarter DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, params)
    return [dict(r) for r in res.mappings().all()]


def _get_year_data(reports: Dict, year: int) -> Dict:
    """Get best available data for a specific year (prefer Q5/annual, then Q4..Q1)."""
    for q in ["5", "4", "3", "2", "1"]:
        if (year, q) in reports:
            return reports[(year, q)]
    return {}


def _get_annual_flow(reports: Dict, year: int, code: str) -> float:
    """Sum a flow item (IS/CF) across all quarters for a year to get annual total.
    If Q5 (annual) exists, use it directly. Otherwise sum Q1..Q4."""
    if (year, "5") in reports:
        return _safe_float(reports[(year, "5")].get(code, 0))
    total = 0.0
    n_q = 0
    for q in ["1", "2", "3", "4"]:
        if (year, q) in reports and code in reports[(year, q)]:
            total += _safe_float(reports[(year, q)].get(code, 0))
            n_q += 1
    if n_q > 0 and n_q < 4:
        total = total / n_q * 4  # annualize partial year
    return total


def _get_sorted_years(reports: Dict, n: int = 5) -> List[int]:
    """Get the last N unique years from reports."""
    years_set = set()
    for (y, _q) in reports.keys():
        years_set.add(y)
    return sorted(years_set)[-n:]


def _yoy_change(cur: float, prev: float) -> Optional[float]:
    """Compute YoY % change — returns None when not computable."""
    if not prev or prev == 0:
        return None
    return round((cur - prev) / abs(prev) * 100, 1)


def _to_ty(v: float) -> str:
    """Format to Tỷ VND string for display."""
    if v == 0:
        return "0"
    t = v / 1e9
    if abs(t) >= 1:
        return f"{t:,.0f}"
    return f"{t:,.1f}"


def _build_bs_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build balance sheet analysis data — full detail for DeepDive UI."""
    years = _get_sorted_years(reports, 5)

    # Per-year BCTC data
    year_datas = []
    for year in years:
        yd = _get_year_data(reports, year)
        if yd:
            year_datas.append((year, yd))

    # Latest ratio = most recent from ratios list
    latest_r = ratios[0] if ratios else {}

    # ── Previous year data for YoY comparisons ──
    latest_yd = year_datas[-1][1] if year_datas else {}
    prev_yd = year_datas[-2][1] if len(year_datas) >= 2 else {}

    total_assets = latest_yd.get(BS_CODES["totalAssets"], 0)
    total_equity = latest_yd.get(BS_CODES["totalEquity"], 0)
    total_liab = latest_yd.get(BS_CODES["totalLiabilities"], 0)
    current_assets = latest_yd.get(BS_CODES["currentAssets"], 0)
    current_liab = latest_yd.get(BS_CODES["currentLiabilities"], 0)
    working_capital = current_assets - current_liab

    prev_total_assets = prev_yd.get(BS_CODES["totalAssets"], 0)
    prev_total_equity = prev_yd.get(BS_CODES["totalEquity"], 0)
    prev_total_liab = prev_yd.get(BS_CODES["totalLiabilities"], 0)

    de_val = _safe_float(latest_r.get("debt_to_equity"))
    current_ratio_val = _safe_float(latest_r.get("current_ratio"))
    quick_ratio_val = _safe_float(latest_r.get("quick_ratio"))
    cash_ratio_val = _safe_float(latest_r.get("cash_ratio"))
    icr = _safe_float(latest_r.get("interest_coverage_ratio"))
    fl = _safe_float(latest_r.get("financial_leverage"))

    # ── Fallback: Compute missing ratios from BCTC data ──
    _inventory = latest_yd.get(BS_CODES["inventory"], 0)
    _cash = latest_yd.get(BS_CODES["cash"], 0)
    if not current_ratio_val and current_liab:
        current_ratio_val = round(current_assets / current_liab, 2)
    if not quick_ratio_val and current_liab:
        quick_ratio_val = round((current_assets - _inventory) / current_liab, 2)
    if not cash_ratio_val and current_liab:
        cash_ratio_val = round(_cash / current_liab, 2)
    if not de_val and total_equity:
        de_val = round(total_liab / total_equity, 2)
    if not fl and total_equity:
        _avg_a = (total_assets + prev_total_assets) / 2 if prev_total_assets else total_assets
        _avg_e = (total_equity + prev_total_equity) / 2 if prev_total_equity else total_equity
        fl = round(_avg_a / _avg_e, 2) if _avg_e else 0

    # ── 1. Overview Stats (OverviewStatCard[]) ──
    ta_yoy = _yoy_change(total_assets, prev_total_assets)
    eq_yoy = _yoy_change(total_equity, prev_total_equity)
    li_yoy = _yoy_change(total_liab, prev_total_liab)

    overview_stats = [
        {
            "label": "Tổng tài sản", "value": _to_ty(total_assets),
            "rawValue": total_assets, "yoyChange": ta_yoy,
            "yoyLabel": f"{ta_yoy:+.1f}%" if ta_yoy is not None else "",
            "badgeText": "Mở rộng" if (ta_yoy or 0) > 0 else "Thu hẹp",
            "borderColor": "border-t-[#F97316]",
        },
        {
            "label": "Vốn chủ sở hữu", "value": _to_ty(total_equity),
            "rawValue": total_equity, "yoyChange": eq_yoy,
            "yoyLabel": f"{eq_yoy:+.1f}%" if eq_yoy is not None else "",
            "badgeText": "Bền vững" if (eq_yoy or 0) >= 0 else "Giảm",
            "borderColor": "border-t-[#F97316]",
        },
        {
            "label": "Tổng nợ phải trả", "value": _to_ty(total_liab),
            "rawValue": total_liab, "yoyChange": li_yoy,
            "yoyLabel": f"{li_yoy:+.1f}%" if li_yoy is not None else "",
            "badgeText": "Nợ tăng" if (li_yoy or 0) > 0 else "Nợ giảm",
            "borderColor": "border-t-[#EF4444]",
        },
        {
            "label": "Vốn lưu động ròng", "value": _to_ty(working_capital),
            "rawValue": working_capital, "yoyChange": None,
            "yoyLabel": "",
            "badgeText": "Thanh khoản dư thừa" if working_capital > 0 else "Thanh khoản âm",
            "borderColor": "border-t-[#8B5CF6]",
        },
    ]

    # ── 2. Health / Z-Score / Gauge ──
    # Altman Z-Score approximation: 1.2*WC/TA + 1.4*RE/TA + 3.3*EBIT/TA + 0.6*MCap/TL + 1.0*Rev/TA
    retained_earnings = latest_yd.get(BS_CODES["retainedEarnings"], 0)
    ebit = _safe_float(latest_r.get("ebit_value"))
    mkt_cap = _safe_float(latest_r.get("market_cap"))
    revenue = 0
    for q in ["5", "4", "3", "2", "1"]:
        if years and (years[-1], q) in reports:
            revenue = reports[(years[-1], q)].get(IS_CODES.get("revenue", ""), 0)
            if revenue:
                break

    z_score = 0.0
    if total_assets > 0:
        z_score += 1.2 * (working_capital / total_assets)
        z_score += 1.4 * (retained_earnings / total_assets)
        z_score += 3.3 * (ebit / total_assets) if ebit else 0
        z_score += 0.6 * (mkt_cap / total_liab) if total_liab > 0 and mkt_cap else 0
        z_score += 1.0 * (revenue / total_assets) if revenue else 0
    z_score = round(z_score, 2)

    if z_score > 2.99:
        z_zone_label, z_zone_color = "Vùng An Toàn (> 2.99)", "#00C076"
    elif z_score > 1.81:
        z_zone_label, z_zone_color = "Vùng Xám (1.81 - 2.99)", "#F59E0B"
    else:
        z_zone_label, z_zone_color = "Vùng Nguy Hiểm (< 1.81)", "#EF4444"

    gauge_data = {"zScore": z_score, "zoneLabel": z_zone_label, "zoneColor": z_zone_color}

    # Health metrics (4 items like the mock)
    debt_to_capital = round(total_liab / (total_liab + total_equity) * 100, 1) if (total_liab + total_equity) > 0 else 0
    health_metrics = [
        {
            "title": "Nợ Vay Ròng / EBITDA",
            "value": f"{round(total_liab / _safe_float(latest_r.get('ebitda_value'), 1), 1)}x" if _safe_float(latest_r.get("ebitda_value")) else "N/A",
            "rawValue": round(total_liab / _safe_float(latest_r.get("ebitda_value"), 1), 1) if _safe_float(latest_r.get("ebitda_value")) else 0,
            "max": 5, "barPercent": 0, "status": "good", "subtitle": "Tốt < 3x", "color": "#00C076",
        },
        {
            "title": "Khả năng trả lãi (ICR)",
            "value": f"{icr:.1f}x" if icr else "N/A",
            "rawValue": icr, "max": 20,
            "barPercent": min(round(icr / 20 * 100), 100) if icr else 0,
            "status": "good" if icr >= 3 else ("warning" if icr >= 1.5 else "danger"),
            "subtitle": "An toàn > 3x", "color": "#00C076" if icr >= 3 else "#F59E0B",
        },
        {
            "title": "Tỷ lệ Nợ vay / Vốn hóa",
            "value": f"{debt_to_capital:.0f}%",
            "rawValue": debt_to_capital, "max": 100,
            "barPercent": min(round(debt_to_capital), 100),
            "status": "good" if debt_to_capital < 30 else ("warning" if debt_to_capital < 50 else "danger"),
            "subtitle": "Trung bình < 40%", "color": "#F59E0B" if debt_to_capital >= 30 else "#00C076",
        },
        {
            "title": "Đòn bẩy tài chính",
            "value": f"{fl:.2f}x" if fl else "N/A",
            "rawValue": fl, "max": 3,
            "barPercent": min(round(fl / 3 * 100), 100) if fl else 0,
            "status": "good" if fl < 1.5 else ("warning" if fl < 2.5 else "danger"),
            "subtitle": "Trung bình < 2x", "color": "#F59E0B" if fl >= 1.5 else "#00C076",
        },
    ]
    # Compute barPercent for first item
    if health_metrics[0]["rawValue"]:
        health_metrics[0]["barPercent"] = min(round(health_metrics[0]["rawValue"] / 5 * 100), 100)
        hv = health_metrics[0]["rawValue"]
        health_metrics[0]["status"] = "good" if hv < 1.5 else ("warning" if hv < 3 else "danger")
        health_metrics[0]["color"] = "#00C076" if hv < 1.5 else ("#F59E0B" if hv < 3 else "#EF4444")

    # ── 3. Donut charts: asset & capital structure ──
    short_pct = round(current_assets / total_assets * 100) if total_assets > 0 else 0
    long_pct = 100 - short_pct
    asset_structure = [
        {"name": "Tài sản ngắn hạn", "value": short_pct, "color": "#F97316"},
        {"name": "Tài sản dài hạn", "value": long_pct, "color": "#8B5CF6"},
    ]
    eq_pct = round(total_equity / (total_equity + total_liab) * 100) if (total_equity + total_liab) > 0 else 0
    li_pct = 100 - eq_pct
    capital_structure = [
        {"name": "Vốn chủ sở hữu", "value": eq_pct, "color": "#00C076"},
        {"name": "Nợ phải trả", "value": li_pct, "color": "#F97316"},
    ]

    # ── 4. Trend data (for stacked bar charts) ──
    trend_data = []
    for year, yd in year_datas:
        ta = yd.get(BS_CODES["totalAssets"], 0)
        ca = yd.get(BS_CODES["currentAssets"], 0)
        nca = yd.get(BS_CODES["nonCurrentAssets"], 0)
        eq = yd.get(BS_CODES["totalEquity"], 0)
        tl = yd.get(BS_CODES["totalLiabilities"], 0)
        cl = yd.get(BS_CODES["currentLiabilities"], 0)
        ltl = yd.get(BS_CODES["longTermLiabilities"], 0)
        ca_pct = round(ca / ta * 100) if ta > 0 else 0
        eq_p = round(eq / (eq + tl) * 100) if (eq + tl) > 0 else 0
        trend_data.append({
            "year": year,
            "currentAssetsPct": ca_pct, "nonCurrentAssetsPct": 100 - ca_pct,
            "equityPct": eq_p, "liabilitiesPct": 100 - eq_p,
            "shortTermDebt": cl / 1e9, "longTermDebt": ltl / 1e9, "equity": eq / 1e9,
            "currentRatio": round(ca / cl, 2) if cl > 0 else 0,
        })

    # ── 5. Inventory data ──
    latest_year = years[-1] if years else 0
    prev_year = years[-2] if len(years) >= 2 else 0
    inventory_val = latest_yd.get(BS_CODES["inventory"], 0)
    inv_turnover = _safe_float(latest_r.get("inventory_turnover"))
    inv_days = _safe_float(latest_r.get("inventory_days"))
    # Fallback: compute from BCTC (use annual COGS)
    if not inv_turnover and inventory_val:
        _cogs_inv = abs(_get_annual_flow(reports, latest_year, IS_CODES["costOfGoodsSold"]))
        _prev_inv = prev_yd.get(BS_CODES["inventory"], inventory_val)
        _avg_inv = (inventory_val + _prev_inv) / 2
        inv_turnover = round(_cogs_inv / _avg_inv, 2) if _avg_inv else 0
    if not inv_days and inv_turnover:
        inv_days = round(365 / inv_turnover) if inv_turnover else 0
    inventory_data = [
        {"name": "Hàng tồn kho", "value": round(inventory_val / 1e9), "percent": 100, "color": "#3B82F6"},
    ]
    inventory_footer = {
        "totalInventory": _to_ty(inventory_val),
        "inventoryTurnover": f"{inv_turnover:.1f}x" if inv_turnover else "N/A",
        "inventoryDays": f"{inv_days:.0f} ngày" if inv_days else "N/A",
    }

    # ── 6. Leverage items (4 metrics) ──
    da_ratio = round(total_liab / total_assets * 100, 1) if total_assets > 0 else 0
    de_ratio_pct = round(de_val * 100, 0) if de_val else 0
    lt_debt_pct = round(latest_yd.get(BS_CODES["longTermLiabilities"], 0) / total_liab * 100, 1) if total_liab > 0 else 0
    leverage_items = [
        {"title": "Tỷ số nợ trên tài sản (D/A)", "value": f"{da_ratio:.1f}%", "rawValue": da_ratio, "max": 100, "color": "text-[#8B5CF6]", "barColor": "bg-[#8B5CF6]"},
        {"title": "Tỷ số nợ trên vốn CSH (D/E)", "value": f"{de_val:.2f}x", "rawValue": de_ratio_pct, "max": 200, "color": "text-[#3B82F6]", "barColor": "bg-[#3B82F6]"},
        {"title": "Hệ số đòn bẩy tài chính", "value": f"{fl:.2f}x" if fl else "N/A", "rawValue": round(fl / 3 * 100) if fl else 0, "max": 100, "color": "text-[#F97316]", "barColor": "bg-[#F97316]"},
        {"title": "Nợ dài hạn / Tổng nợ", "value": f"{lt_debt_pct:.1f}%", "rawValue": lt_debt_pct, "max": 100, "color": "text-[#00C076]", "barColor": "bg-[#00C076]"},
    ]

    # ── 7. CCC data ──
    inv_d = _safe_float(latest_r.get("inventory_days"))
    rec_d = _safe_float(latest_r.get("receivable_days"))
    pay_d = _safe_float(latest_r.get("payable_days"))
    ccc_d = _safe_float(latest_r.get("cash_conversion_cycle"))
    # CCC fallback from BCTC (use annual COGS/revenue)
    _revenue_ccc = _get_annual_flow(reports, latest_year, IS_CODES["revenue"])
    _cogs_ccc = abs(_get_annual_flow(reports, latest_year, IS_CODES["costOfGoodsSold"]))
    _inv_ccc = latest_yd.get(BS_CODES["inventory"], 0)
    _rec_ccc = latest_yd.get(BS_CODES["shortTermReceivables"], 0)
    _prev_inv_ccc = prev_yd.get(BS_CODES["inventory"], _inv_ccc)
    _prev_rec_ccc = prev_yd.get(BS_CODES["shortTermReceivables"], _rec_ccc)
    if not inv_d and _cogs_ccc and _inv_ccc:
        _avg_inv_ccc = (_inv_ccc + _prev_inv_ccc) / 2
        inv_d = round(_avg_inv_ccc / _cogs_ccc * 365) if _cogs_ccc else 0
    if not rec_d and _revenue_ccc and _rec_ccc:
        _avg_rec_ccc = (_rec_ccc + _prev_rec_ccc) / 2
        rec_d = round(_avg_rec_ccc / _revenue_ccc * 365) if _revenue_ccc else 0
    if not ccc_d and (inv_d or rec_d or pay_d):
        ccc_d = inv_d + rec_d - pay_d
    ccc_data = {
        "inventoryDays": round(inv_d) if inv_d else 0,
        "receivableDays": round(rec_d) if rec_d else 0,
        "payableDays": round(pay_d) if pay_d else 0,
        "cycleDays": round(ccc_d) if ccc_d else 0,
    }

    # ── 8. Liquidity items ──
    liquidity_items = [
        {"title": "Current Ratio", "value": round(current_ratio_val, 2), "max": 3, "status": "good" if current_ratio_val >= 1.5 else ("warning" if current_ratio_val >= 1 else "danger")},
        {"title": "Quick Ratio", "value": round(quick_ratio_val, 2), "max": 3, "status": "good" if quick_ratio_val >= 1 else ("warning" if quick_ratio_val >= 0.5 else "danger")},
        {"title": "Cash Ratio", "value": round(cash_ratio_val, 2), "max": 2, "status": "good" if cash_ratio_val >= 0.5 else ("warning" if cash_ratio_val >= 0.2 else "danger")},
    ]

    # ── 9. Detailed table data ──
    table_headers = ["Chỉ tiêu"] + [str(y) for _, y in [(0, yr) for yr in years]] + ["Thay đổi", "% YoY", "% Total"]

    def _bs_row(label: str, code: str, level: str = "detail") -> Dict:
        vals = []
        for yr in years:
            yd = _get_year_data(reports, yr)
            vals.append(round(yd.get(BS_CODES.get(code, ""), 0) / 1e9))
        change = vals[-1] - vals[-2] if len(vals) >= 2 else None
        yoy = round((vals[-1] - vals[-2]) / abs(vals[-2]) * 100, 1) if len(vals) >= 2 and vals[-2] else None
        pct = round(vals[-1] / (total_assets / 1e9) * 100, 1) if total_assets > 0 and vals else None
        return {"label": label, "level": level, "values": vals, "change": change, "yoyPct": yoy, "pctTotal": pct}

    table_data = [
        {
            "label": "TỔNG TÀI SẢN", "level": "main",
            "values": [round(_get_year_data(reports, y).get(BS_CODES["totalAssets"], 0) / 1e9) for y in years],
            "change": round((total_assets - prev_total_assets) / 1e9) if prev_total_assets else None,
            "yoyPct": ta_yoy, "pctTotal": 100.0,
            "children": [
                {
                    **_bs_row("Tài sản ngắn hạn", "currentAssets", "sub"),
                    "children": [
                        _bs_row("Tiền & Tương đương tiền", "cash"),
                        _bs_row("Đầu tư tài chính ngắn hạn", "shortTermInvestments"),
                        _bs_row("Phải thu ngắn hạn", "shortTermReceivables"),
                        _bs_row("Hàng tồn kho", "inventory"),
                    ],
                },
                {
                    **_bs_row("Tài sản dài hạn", "nonCurrentAssets", "sub"),
                    "children": [
                        _bs_row("Tài sản cố định", "fixedAssets"),
                        _bs_row("Đầu tư tài chính dài hạn", "longTermInvestments"),
                    ],
                },
            ],
        },
        {
            "label": "TỔNG NỢ PHẢI TRẢ", "level": "main",
            "values": [round(_get_year_data(reports, y).get(BS_CODES["totalLiabilities"], 0) / 1e9) for y in years],
            "change": round((total_liab - prev_total_liab) / 1e9) if prev_total_liab else None,
            "yoyPct": li_yoy,
            "pctTotal": round(total_liab / total_assets * 100, 1) if total_assets > 0 else None,
            "children": [
                _bs_row("Nợ ngắn hạn", "currentLiabilities", "sub"),
                _bs_row("Nợ dài hạn", "longTermLiabilities", "sub"),
            ],
        },
        {
            "label": "VỐN CHỦ SỞ HỮU", "level": "main",
            "values": [round(_get_year_data(reports, y).get(BS_CODES["totalEquity"], 0) / 1e9) for y in years],
            "change": round((total_equity - prev_total_equity) / 1e9) if prev_total_equity else None,
            "yoyPct": eq_yoy,
            "pctTotal": round(total_equity / total_assets * 100, 1) if total_assets > 0 else None,
            "children": [
                _bs_row("Vốn góp chủ sở hữu", "charterCapital", "sub"),
                _bs_row("Lợi nhuận chưa phân phối", "retainedEarnings", "sub"),
            ],
        },
    ]

    # Also keep the simple trends/leverageData/liquidityData for BalanceSheetTab compatibility
    trends = []
    for year, yd in year_datas:
        trends.append({
            "year": year,
            "totalAssets": yd.get(BS_CODES["totalAssets"]),
            "currentAssets": yd.get(BS_CODES["currentAssets"]),
            "nonCurrentAssets": yd.get(BS_CODES["nonCurrentAssets"]),
            "totalLiabilities": yd.get(BS_CODES["totalLiabilities"]),
            "currentLiabilities": yd.get(BS_CODES["currentLiabilities"]),
            "longTermLiabilities": yd.get(BS_CODES["longTermLiabilities"]),
            "equity": yd.get(BS_CODES["totalEquity"]),
        })

    leverage_data = []
    for t in trends:
        equity = t.get("equity") or 0
        liab = t.get("totalLiabilities") or 0
        leverage_data.append({
            "year": t["year"], "equity": equity, "liabilities": liab,
            "deRatio": round(liab / equity, 2) if equity > 0 else 0,
        })

    liquidity_data = []
    for r in ratios:
        if r.get("current_ratio") is not None:
            liquidity_data.append({
                "year": r.get("year"), "quarter": r.get("quarter"),
                "currentRatio": _safe_round(r.get("current_ratio")),
                "quickRatio": _safe_round(r.get("quick_ratio")),
                "cashRatio": _safe_round(r.get("cash_ratio")),
            })

    # Health indicators (simple format for BalanceSheetTab)
    health_indicators = [
        {
            "name": "Hệ số thanh toán hiện hành", "value": current_ratio_val,
            "status": "good" if current_ratio_val >= 1.5 else ("warning" if current_ratio_val >= 1 else "danger"),
            "description": f"Khả năng thanh toán nợ ngắn hạn: {current_ratio_val:.2f}x", "threshold": ">= 1.5",
        },
        {
            "name": "Hệ số nợ/vốn chủ sở hữu", "value": de_val,
            "status": "good" if de_val <= 1 else ("warning" if de_val <= 2 else "danger"),
            "description": f"Đòn bẩy tài chính: {de_val:.2f}x", "threshold": "<= 1.0",
        },
        {
            "name": "Hệ số thanh toán nhanh", "value": quick_ratio_val,
            "status": "good" if quick_ratio_val >= 1 else ("warning" if quick_ratio_val >= 0.5 else "danger"),
            "description": f"Thanh khoản nhanh: {quick_ratio_val:.2f}x", "threshold": ">= 1.0",
        },
    ]

    return {
        # Full data for DeepDive component
        "overviewStats": overview_stats,
        "gaugeData": gauge_data,
        "healthMetrics": health_metrics,
        "assetStructure": asset_structure,
        "capitalStructure": capital_structure,
        "trendData": trend_data,
        "inventoryData": inventory_data,
        "inventoryFooter": inventory_footer,
        "leverageItems": leverage_items,
        "cccData": ccc_data,
        "liquidityItems": liquidity_items,
        "tableHeaders": table_headers,
        "tableData": table_data,
        # Backward-compatible fields for BalanceSheetTab
        "healthIndicators": health_indicators,
        "trends": trends,
        "leverageData": leverage_data[:5],
        "liquidityData": liquidity_data[:8],
    }


def _build_is_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build income statement analysis data — full detail for DeepDive UI."""
    years = _get_sorted_years(reports, 5)
    year_datas = [(y, _get_year_data(reports, y)) for y in years if _get_year_data(reports, y)]

    latest_r = ratios[0] if ratios else {}
    prior_r = ratios[4] if len(ratios) > 4 else (ratios[-1] if ratios else {})
    latest_yd = year_datas[-1][1] if year_datas else {}
    prev_yd = year_datas[-2][1] if len(year_datas) >= 2 else {}

    # Use annual flow totals (sum of Q1-Q4) for IS items
    latest_year = years[-1] if years else 0
    prev_year = years[-2] if len(years) >= 2 else 0
    revenue = _get_annual_flow(reports, latest_year, IS_CODES["revenue"])
    prev_revenue = _get_annual_flow(reports, prev_year, IS_CODES["revenue"])
    net_profit = _get_annual_flow(reports, latest_year, IS_CODES["netProfit"])
    prev_net_profit = _get_annual_flow(reports, prev_year, IS_CODES["netProfit"])
    gross_profit = _get_annual_flow(reports, latest_year, IS_CODES["grossProfit"])
    cogs = abs(_get_annual_flow(reports, latest_year, IS_CODES["costOfGoodsSold"]))

    # financial_ratio stores ROE/ROA/margins as decimals (0.3 = 30%), convert to %
    roe_val = _safe_float(latest_r.get("roe")) * 100
    roa_val = _safe_float(latest_r.get("roa")) * 100
    net_margin_val = _safe_float(latest_r.get("net_margin")) * 100
    gross_margin_val = _safe_float(latest_r.get("gross_margin")) * 100
    eps_val = _safe_float(latest_r.get("eps"))
    pe_val = _safe_float(latest_r.get("pe"))
    asset_turnover = _safe_float(latest_r.get("asset_turnover"))
    fl_val = _safe_float(latest_r.get("financial_leverage"))

    # ── Fallback: Compute missing ratios from BCTC data ──
    _bs_ta = latest_yd.get(BS_CODES["totalAssets"], 0)
    _bs_te = latest_yd.get(BS_CODES["totalEquity"], 0)
    _bs_prev_ta = prev_yd.get(BS_CODES["totalAssets"], 0)
    _bs_prev_te = prev_yd.get(BS_CODES["totalEquity"], 0)
    if not asset_turnover and revenue and _bs_ta:
        _avg_a = (_bs_ta + _bs_prev_ta) / 2 if _bs_prev_ta else _bs_ta
        asset_turnover = round(revenue / _avg_a, 4) if _avg_a else 0
    if not fl_val and _bs_te:
        _avg_a = (_bs_ta + _bs_prev_ta) / 2 if _bs_prev_ta else _bs_ta
        _avg_e = (_bs_te + _bs_prev_te) / 2 if _bs_prev_te else _bs_te
        fl_val = round(_avg_a / _avg_e, 4) if _avg_e else 0
    if not net_margin_val and revenue:
        net_margin_val = round(net_profit / revenue * 100, 1)
    if not gross_margin_val and revenue:
        gross_margin_val = round(gross_profit / revenue * 100, 1)
    if not roe_val and _bs_te:
        _avg_e = (_bs_te + _bs_prev_te) / 2 if _bs_prev_te else _bs_te
        roe_val = round(net_profit / _avg_e * 100, 1) if _avg_e else 0
    if not roa_val and _bs_ta:
        _avg_a = (_bs_ta + _bs_prev_ta) / 2 if _bs_prev_ta else _bs_ta
        roa_val = round(net_profit / _avg_a * 100, 1) if _avg_a else 0

    rev_yoy = _yoy_change(revenue, prev_revenue)
    ni_yoy = _yoy_change(net_profit, prev_net_profit)

    # ── 1. Income Metric Cards (IncomeMetricCard[]) ──
    rev_badges = []
    if rev_yoy is not None:
        rev_badges.append({"text": f"{rev_yoy:+.1f}% YoY", "color": "#00C076" if rev_yoy > 0 else "#EF4444"})
    ni_badges = []
    if ni_yoy is not None:
        ni_badges.append({"text": f"{ni_yoy:+.1f}% YoY", "color": "#00C076" if ni_yoy > 0 else "#EF4444"})
    ni_badges.append({"text": f"ROS: {net_margin_val:.1f}%", "color": "#8B5CF6"})
    income_metric_cards = [
        {
            "label": "Doanh thu thuần", "value": _to_ty(revenue),
            "borderColor": "border-l-[#3B82F6]", "badges": rev_badges,
        },
        {
            "label": "Lợi nhuận gộp", "value": _to_ty(gross_profit),
            "borderColor": "border-l-[#F97316]",
            "badges": [{"text": f"Biên gộp: {gross_margin_val:.1f}%", "color": "#F97316"}],
        },
        {
            "label": "Lợi nhuận ròng", "value": _to_ty(net_profit),
            "borderColor": "border-l-[#F97316]", "badges": ni_badges,
        },
        {
            "label": "Hiệu quả sinh lời (TTM)", "value": "",
            "borderColor": "border-l-[#8B5CF6]", "badges": [],
            "listItems": [
                {"label": "ROS", "value": f"{net_margin_val:.1f}%"},
                {"label": "ROA", "value": f"{roa_val:.1f}%"},
                {"label": "ROE", "value": f"{roe_val:.1f}%"},
            ],
        },
    ]

    # ── 2. DuPont Analysis (5-factor) ──
    # 5-factor: Tax Burden × Interest Burden × EBIT Margin × Asset Turnover × Fin Leverage = ROE
    ebt = _get_annual_flow(reports, latest_year, IS_CODES.get("profitBeforeTax", ""))
    fin_exp = abs(_get_annual_flow(reports, latest_year, IS_CODES.get("financialExpenses", "")))
    ebit_margin = _safe_float(latest_r.get("ebit_margin"))
    tax_burden = round(net_profit / ebt, 2) if ebt else 0
    ebit_is = ebt + fin_exp
    interest_burden = round(ebt / ebit_is, 2) if ebit_is else 0
    ebit_margin_r = round(ebit_is / revenue, 2) if revenue else 0
    dupont_factors = [
        {"label": "Gánh nặng thuế", "value": tax_burden, "sub": "Net Income / EBT"},
        {"label": "Gánh nặng lãi vay", "value": interest_burden, "sub": "EBT / EBIT"},
        {"label": "Biên EBIT", "value": ebit_margin_r, "sub": "EBIT / Revenue"},
        {"label": "Vòng quay tài sản", "value": round(asset_turnover, 2), "sub": "Revenue / Avg Assets"},
        {"label": "Đòn bẩy tài chính", "value": round(fl_val, 2), "sub": "Avg Assets / Equity"},
    ]
    dupont_result = {"label": "ROE", "value": round(roe_val, 1)}

    # DuPont tree (hierarchical)
    dupont_tree = {
        "label": "ROE", "value": f"{roe_val:.1f}%", "color": "#F97316",
        "children": [
            {
                "label": "ROA", "value": f"{roa_val:.1f}%", "color": "#3B82F6",
                "children": [
                    {"label": "ROS (Biên ròng)", "value": f"{net_margin_val:.1f}%", "color": "#00C076"},
                    {"label": "Vòng quay TS", "value": f"{asset_turnover:.2f}x", "color": "#8B5CF6"},
                ],
            },
            {"label": "Đòn bẩy TC", "value": f"{fl_val:.2f}x", "color": "#EF4444"},
        ],
    }

    # ROS breakdown (how net margin decomposes)
    operating_margin = _safe_float(latest_r.get("operating_margin"))
    if not operating_margin and revenue > 0:
        op_p = latest_yd.get(IS_CODES.get("operatingProfit", ""), 0)
        operating_margin = round(op_p / revenue * 100, 1)
    ros_breakdown = [
        {"label": "Gross Margin (Biên gộp)", "value": round(gross_margin_val, 1), "color": "#3B82F6"},
        {"label": "Operating Margin (Biên HĐKD)", "value": round(operating_margin, 1), "color": "#F97316"},
        {"label": "ROS (Biên ròng)", "value": round(net_margin_val, 1), "color": "#00C076"},
    ]

    # ── 3. Revenue & Profit trend (bars + line) ──
    revenue_trend = []
    for yr, _yd in year_datas:
        rev = _get_annual_flow(reports, yr, IS_CODES["revenue"])
        np_val = _get_annual_flow(reports, yr, IS_CODES["netProfit"])
        gp = _get_annual_flow(reports, yr, IS_CODES["grossProfit"])
        cogs_v = abs(_get_annual_flow(reports, yr, IS_CODES["costOfGoodsSold"]))
        revenue_trend.append({
            "year": yr,
            "revenue": round(rev / 1e9),
            "cogs": round(cogs_v / 1e9),
            "grossProfit": round(gp / 1e9),
        })

    # ── 4. Cost structure (donut for latest year) ──
    sell_exp = abs(_get_annual_flow(reports, latest_year, IS_CODES.get("sellingExpenses", "")))
    admin_exp = abs(_get_annual_flow(reports, latest_year, IS_CODES.get("adminExpenses", "")))
    total_cost = cogs + sell_exp + admin_exp + fin_exp
    cost_structure_donut = [
        {"name": "Giá vốn hàng bán", "value": round(cogs / total_cost * 100) if total_cost > 0 else 0, "color": "#3B82F6"},
        {"name": "Chi phí bán hàng", "value": round(sell_exp / total_cost * 100) if total_cost > 0 else 0, "color": "#F97316"},
        {"name": "Chi phí quản lý", "value": round(admin_exp / total_cost * 100) if total_cost > 0 else 0, "color": "#8B5CF6"},
        {"name": "Chi phí tài chính", "value": round(fin_exp / total_cost * 100) if total_cost > 0 else 0, "color": "#EF4444"},
    ]

    # ── 5. Growth data ──
    growth_data = []
    for i in range(len(year_datas)):
        yr, _yd = year_datas[i]
        if i == 0:
            growth_data.append({"year": yr, "revenueGrowth": 0, "netProfitGrowth": 0, "grossProfitGrowth": 0})
            continue
        prev_yr = year_datas[i - 1][0]
        cr = _get_annual_flow(reports, yr, IS_CODES["revenue"])
        pr = _get_annual_flow(reports, prev_yr, IS_CODES["revenue"])
        cn = _get_annual_flow(reports, yr, IS_CODES["netProfit"])
        pn = _get_annual_flow(reports, prev_yr, IS_CODES["netProfit"])
        cg = _get_annual_flow(reports, yr, IS_CODES["grossProfit"])
        pg = _get_annual_flow(reports, prev_yr, IS_CODES["grossProfit"])
        growth_data.append({
            "year": yr,
            "revenueGrowth": round((cr - pr) / abs(pr) * 100, 1) if pr else 0,
            "netProfitGrowth": round((cn - pn) / abs(pn) * 100, 1) if pn else 0,
            "grossProfitGrowth": round((cg - pg) / abs(pg) * 100, 1) if pg else 0,
        })

    # ── 6. Efficiency data (cost-to-revenue ratio over years) ──
    efficiency_data = []
    for yr, _yd in year_datas:
        rev = _get_annual_flow(reports, yr, IS_CODES["revenue"]) or 1
        total_c = abs(_get_annual_flow(reports, yr, IS_CODES["costOfGoodsSold"])) + abs(_get_annual_flow(reports, yr, IS_CODES.get("sellingExpenses", ""))) + abs(_get_annual_flow(reports, yr, IS_CODES.get("adminExpenses", "")))
        efficiency_data.append({
            "year": yr,
            "costToRevenue": round(total_c / rev * 100, 1),
        })

    # ── 7. Revenue by segment / cost by category / profit funnel (mock-like) ──
    fin_rev = abs(_get_annual_flow(reports, latest_year, IS_CODES.get("financialIncome", "")))
    other_inc = abs(_get_annual_flow(reports, latest_year, IS_CODES.get("otherIncome", "")))
    revenue_by_segment = [
        {"name": "Hoạt động chính", "value": round(revenue / 1e9), "color": "#3B82F6"},
        {"name": "Hoạt động tài chính", "value": round(fin_rev / 1e9), "color": "#00C076"},
        {"name": "Thu nhập khác", "value": round(other_inc / 1e9), "color": "#F97316"},
    ]
    cost_by_category = cost_structure_donut

    # Profit funnel
    operating_profit = _get_annual_flow(reports, latest_year, IS_CODES.get("operatingProfit", ""))
    profit_before_tax = _get_annual_flow(reports, latest_year, IS_CODES.get("profitBeforeTax", ""))
    profit_funnel = [
        {"name": "Doanh thu thuần", "value": round(revenue / 1e9), "color": "#3B82F6"},
        {"name": "Lợi nhuận gộp", "value": round(gross_profit / 1e9), "color": "#00C076"},
        {"name": "LNTT từ HĐKD", "value": round(operating_profit / 1e9), "color": "#8B5CF6"},
        {"name": "Lợi nhuận trước thuế", "value": round(profit_before_tax / 1e9), "color": "#F97316"},
        {"name": "Lãi ròng", "value": round(net_profit / 1e9), "color": "#EF4444"},
    ]

    # ── 8. Detailed table ──
    income_table_headers = ["Chỉ tiêu"] + [str(y) for y in years] + ["GROWTH '" + str(years[-1])[-2:] if years else ""]

    def _is_row(label: str, code: str, indent: int = 0, is_bold: bool = False) -> Dict:
        vals = []
        for yr in years:
            v = _get_annual_flow(reports, yr, IS_CODES.get(code, ""))
            vals.append(round(v / 1e9))
        g24 = round((vals[-1] - vals[-2]) / abs(vals[-2]) * 100, 1) if len(vals) >= 2 and vals[-2] else None
        return {"label": label, "indent": indent, "isBold": is_bold, "values": vals, "growth24": g24}

    income_table_data = [
        _is_row("Doanh thu thuần", "revenue", 0, False),
        _is_row("Giá vốn hàng bán", "costOfGoodsSold", 1, False),
        _is_row("Lợi nhuận gộp", "grossProfit", 0, True),
        _is_row("Chi phí bán hàng", "sellingExpenses", 1, False),
        _is_row("Chi phí quản lý doanh nghiệp", "adminExpenses", 1, False),
        _is_row("Chi phí tài chính", "financialExpenses", 2, False),
        _is_row("Doanh thu tài chính", "financialIncome", 1, False),
        _is_row("Lợi nhuận từ HĐKD", "operatingProfit", 0, True),
        _is_row("Lợi nhuận trước thuế", "profitBeforeTax", 0, True),
        _is_row("Lợi nhuận sau thuế TNDN", "netProfit", 0, True),
    ]

    # Backward-compatible simple fields
    dupont_simple = [
        {"name": "ROE", "value": _safe_float(latest_r.get("roe")), "prior": _safe_float(prior_r.get("roe"))},
        {"name": "Biên lợi nhuận ròng", "value": _safe_float(latest_r.get("net_margin")), "prior": _safe_float(prior_r.get("net_margin"))},
        {"name": "Vòng quay tổng tài sản", "value": _safe_float(latest_r.get("asset_turnover")), "prior": _safe_float(prior_r.get("asset_turnover"))},
        {"name": "Đòn bẩy tài chính", "value": _safe_float(latest_r.get("financial_leverage")), "prior": _safe_float(prior_r.get("financial_leverage"))},
    ]

    margin_trends = []
    for r in ratios:
        if r.get("gross_margin") is not None:
            margin_trends.append({
                "year": r.get("year"), "quarter": r.get("quarter"),
                "grossMargin": _safe_round(r.get("gross_margin")),
                "netMargin": _safe_round(r.get("net_margin")),
                "ebitMargin": _safe_round(r.get("ebit_margin")),
            })

    overview_stats = [
        {"label": "ROE", "value": f"{roe_val:.1f}%", "subLabel": "", "trend": ""},
        {"label": "Biên LN ròng", "value": f"{net_margin_val:.1f}%", "subLabel": "", "trend": ""},
        {"label": "EPS", "value": f"{eps_val:,.0f}", "subLabel": "", "trend": ""},
        {"label": "P/E", "value": f"{pe_val:.1f}", "subLabel": "", "trend": ""},
    ]

    return {
        # Full data for DeepDive component
        "incomeMetricCards": income_metric_cards,
        "dupontFactors": dupont_factors,
        "dupontResult": dupont_result,
        "dupontTree": dupont_tree,
        "rosBreakdown": ros_breakdown,
        "revenueTrend": revenue_trend,
        "costStructure": cost_structure_donut,
        "growthData": growth_data,
        "efficiencyData": efficiency_data,
        "revenueBySegment": revenue_by_segment,
        "costByCategory": cost_by_category,
        "profitFunnel": profit_funnel,
        "incomeTableHeaders": income_table_headers,
        "incomeTableData": income_table_data,
        # Backward-compatible fields
        "overviewStats": overview_stats,
        "dupont": dupont_simple,
        "marginTrends": margin_trends[:8],
        "revenueBreakdown": [],
    }


def _build_cf_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build cash flow analysis data — full detail for DeepDive UI."""
    years = _get_sorted_years(reports, 5)
    year_datas = [(y, _get_year_data(reports, y)) for y in years if _get_year_data(reports, y)]

    latest_yd = year_datas[-1][1] if year_datas else {}
    prev_yd = year_datas[-2][1] if len(year_datas) >= 2 else {}

    latest_year = years[-1] if years else 0
    prev_year = years[-2] if len(years) >= 2 else 0
    ocf = _get_annual_flow(reports, latest_year, CF_CODES["operatingCashFlow"])
    icf = _get_annual_flow(reports, latest_year, CF_CODES["investingCashFlow"])
    fcf_val = _get_annual_flow(reports, latest_year, CF_CODES["financingCashFlow"])
    net_profit = _get_annual_flow(reports, latest_year, IS_CODES["netProfit"])
    revenue = _get_annual_flow(reports, latest_year, IS_CODES["revenue"])

    # Capex approximation: investing CF minus long-term investment changes
    capex = abs(icf)  # simplified: capex ≈ |investing CF|
    free_cash_flow = ocf - capex

    # ── 1. Efficiency metrics (3 cards) ──
    cf_to_rev = round(ocf / revenue * 100, 1) if revenue > 0 else 0
    cf_to_ni = round(ocf / net_profit * 100, 1) if net_profit > 0 else 0
    capex_dep_ratio = round(capex / (ocf * 0.3), 2) if ocf > 0 else 0  # approximate
    div_to_fcf = round(0.65, 2)  # placeholder until dividend data available
    cf_coverage = round(ocf / (capex + abs(fcf_val)) * 100, 1) if (capex + abs(fcf_val)) > 0 else 0
    efficiency_metrics = [
        {
            "title": "CAPEX / Khấu hao", "value": f"{capex_dep_ratio:.2f}x",
            "numericValue": capex_dep_ratio, "max": 3,
            "color": "#F97316", "subtitle": "Đang mở rộng quy mô (> 1.0x)" if capex_dep_ratio > 1 else "Thu hẹp quy mô",
        },
        {
            "title": "Cổ tức tiền mặt / FCF", "value": f"{round(div_to_fcf * 100)}%",
            "numericValue": div_to_fcf, "max": 1,
            "color": "#3B82F6", "subtitle": "Trả cổ tức từ dòng tiền tự do",
        },
        {
            "title": "Cash Flow Coverage", "value": f"{cf_coverage:.0f}%",
            "numericValue": cf_coverage / 100, "max": 1,
            "color": "#00C076", "subtitle": f"Đủ trả hết nợ vay trong ~{round(1 / (cf_coverage / 100), 1) if cf_coverage > 0 else 'N/A'} năm từ OCF",
        },
    ]

    # ── 2. Self-funding data ──
    self_funding_data = {
        "cfo": round(ocf / 1e9),
        "capex": round(capex / 1e9),
        "fcf": round(free_cash_flow / 1e9),
        "capexCoverage": round(ocf / capex, 2) if capex > 0 else 0,
        "dividendCoverage": round(free_cash_flow / (abs(fcf_val) * 0.5 or 1), 2) if fcf_val else 0,
    }

    # ── 3. Earnings quality (grouped bar: net profit vs CFO per year) ──
    earnings_quality = []
    for yr, _yd in year_datas:
        ni = _get_annual_flow(reports, yr, IS_CODES["netProfit"])
        cfo = _get_annual_flow(reports, yr, CF_CODES["operatingCashFlow"])
        earnings_quality.append({
            "year": str(yr),
            "netIncome": round(ni / 1e9),
            "ocf": round(cfo / 1e9),
        })

    # ── 4. Three cash flows (stacked bar per year) ──
    three_cash_flows = []
    for yr, _yd in year_datas:
        three_cash_flows.append({
            "year": str(yr),
            "cfo": round(_get_annual_flow(reports, yr, CF_CODES["operatingCashFlow"]) / 1e9),
            "cfi": round(_get_annual_flow(reports, yr, CF_CODES["investingCashFlow"]) / 1e9),
            "cff": round(_get_annual_flow(reports, yr, CF_CODES["financingCashFlow"]) / 1e9),
        })

    # Insight text based on CFO pattern
    if ocf > 0 and icf < 0 and fcf_val < 0:
        insight_text = "Mô hình dòng tiền lành mạnh: HĐKD tạo tiền mặt, đang đầu tư mở rộng và trả nợ/cổ tức."
    elif ocf > 0 and icf < 0 and fcf_val > 0:
        insight_text = "Doanh nghiệp đang đầu tư và huy động thêm vốn bên ngoài."
    elif ocf < 0:
        insight_text = "Cảnh báo: Dòng tiền từ hoạt động kinh doanh âm — cần theo dõi."
    else:
        insight_text = "Dòng tiền ổn định."

    # ── 5. FCF & Dividend data ──
    fcf_dividend_data = []
    for yr, _yd in year_datas:
        cfo = _get_annual_flow(reports, yr, CF_CODES["operatingCashFlow"])
        inv = _get_annual_flow(reports, yr, CF_CODES["investingCashFlow"])
        fcf_yr = cfo + inv
        div_paid = abs(_get_annual_flow(reports, yr, CF_CODES.get("dividendPaid", "")))
        fcf_dividend_data.append({
            "year": str(yr),
            "fcf": round(fcf_yr / 1e9),
            "dividend": round(div_paid / 1e9),
        })

    # ── 6. Waterfall data ──
    ocf_b = round(ocf / 1e9)
    icf_b = round(icf / 1e9)
    fcf_b = round(fcf_val / 1e9)
    # Compute beginning cash from prior year if possible
    begin_cash = 0
    if prev_yd:
        begin_cash = round((prev_yd.get(CF_CODES.get("endingCash", ""), 0) or 0) / 1e9)
    end_cash = begin_cash + ocf_b + icf_b + fcf_b
    waterfall_data = [
        {"name": "Tiền đầu kỳ", "base": 0, "value": begin_cash, "color": "#9CA3AF", "isTotal": True},
        {"name": "+ CFO", "base": begin_cash, "value": ocf_b, "color": "#00C076", "isTotal": False},
        {"name": "- CAPEX", "base": begin_cash + ocf_b, "value": icf_b, "color": "#F97316", "isTotal": False},
        {"name": "- Trả nợ/Cổ tức", "base": begin_cash + ocf_b + icf_b, "value": fcf_b, "color": "#EF4444", "isTotal": False},
        {"name": "= Tiền cuối kỳ", "base": 0, "value": end_cash, "color": "#3B82F6", "isTotal": True},
    ]
    net_cash_change = ocf_b + icf_b + fcf_b

    # Backward-compatible simple fields
    trends = []
    for yr, yd in year_datas:
        trends.append({
            "year": yr,
            "operatingCashFlow": yd.get(CF_CODES["operatingCashFlow"]),
            "investingCashFlow": yd.get(CF_CODES["investingCashFlow"]),
            "financingCashFlow": yd.get(CF_CODES["financingCashFlow"]),
            "revenue": yd.get(IS_CODES["revenue"]),
            "netProfit": yd.get(IS_CODES["netProfit"]),
        })

    overview_stats = [
        {"label": "CF HĐKD", "value": _fmt_market_cap(ocf), "subLabel": "", "trend": "up" if ocf > 0 else "down"},
        {"label": "CF HĐĐT", "value": _fmt_market_cap(icf), "subLabel": "", "trend": "down" if icf < 0 else "up"},
        {"label": "CF HĐTC", "value": _fmt_market_cap(fcf_val), "subLabel": "", "trend": ""},
        {"label": "FCF", "value": _fmt_market_cap(ocf + icf), "subLabel": "", "trend": "up" if (ocf + icf) > 0 else "down"},
    ]

    return {
        # Full data for DeepDive component
        "efficiencyMetrics": efficiency_metrics,
        "selfFundingData": self_funding_data,
        "earningsQuality": earnings_quality,
        "threeCashFlows": three_cash_flows,
        "insightText": insight_text,
        "fcfDividendData": fcf_dividend_data,
        "waterfallData": waterfall_data,
        "netCashChange": net_cash_change,
        # Backward-compatible
        "overviewStats": overview_stats,
        "trends": trends,
        "selfFunding": [{"year": yr, "operatingCF": yd.get(CF_CODES["operatingCashFlow"], 0), "investingCF": yd.get(CF_CODES["investingCashFlow"], 0), "selfFundingRatio": round(yd.get(CF_CODES["operatingCashFlow"], 0) / abs(yd.get(CF_CODES["investingCashFlow"], 0) or 1) * 100, 2)} for yr, yd in year_datas],
        "waterfall": waterfall_data,
    }


# ────────────────────────────────────────────────────────────────────
# 8. Quant Analysis
# ────────────────────────────────────────────────────────────────────
@cached("stock:quant", ttl=600)
async def get_quant_analysis(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    """Quantitative analysis using numpy on price history."""
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    sql = text(f"""
        SELECT trading_date, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY trading_date ASC
    """)
    res = await db.execute(sql, {"ticker": ticker})
    rows = res.mappings().all()

    if len(rows) < 30:
        return _empty_quant()

    dates = [r["trading_date"] for r in rows]
    closes = np.array([float(r["close"]) for r in rows])
    volumes = np.array([float(r["volume"] or 0) for r in rows])

    # Daily returns
    returns = np.diff(closes) / closes[:-1]
    returns = returns[np.isfinite(returns)]

    if len(returns) < 20:
        return _empty_quant()

    # ── KPIs ──
    total_return = (closes[-1] / closes[0] - 1) * 100
    ann_return = ((closes[-1] / closes[0]) ** (252 / len(closes)) - 1) * 100
    ann_vol = float(np.std(returns) * np.sqrt(252) * 100)
    rf = 0.045  # risk-free rate ~4.5%
    sharpe = (ann_return / 100 - rf) / (ann_vol / 100) if ann_vol > 0 else 0

    # Max drawdown
    cummax = np.maximum.accumulate(closes)
    drawdowns = (closes - cummax) / cummax
    max_dd = float(np.min(drawdowns) * 100)

    # Sortino ratio
    daily_rf = rf / 252
    downside_diff = np.minimum(returns - daily_rf, 0)
    downside_vol = float(np.sqrt(np.mean(downside_diff ** 2)) * np.sqrt(252))
    sortino = (ann_return / 100 - rf) / downside_vol if downside_vol > 0 else 0

    kpis = [
        {"label": "Tổng lợi nhuận", "value": round(total_return, 2), "suffix": "%"},
        {"label": "LN hàng năm", "value": round(ann_return, 2), "suffix": "%"},
        {"label": "Biến động (σ)", "value": round(ann_vol, 2), "suffix": "%"},
        {"label": "Sharpe Ratio", "value": round(sharpe, 2), "suffix": ""},
        {"label": "Sortino Ratio", "value": round(sortino, 2), "suffix": ""},
        {"label": "Max Drawdown", "value": round(max_dd, 2), "suffix": "%"},
    ]

    # ── Wealth Index ──
    wealth = np.cumprod(1 + returns)
    wealth_index = [
        {"date": dates[i + 1], "value": round(float(wealth[i]), 4)}
        for i in range(0, len(wealth), max(1, len(wealth) // 200))
    ]

    # ── Monthly Returns heatmap ──
    monthly_returns = _compute_monthly_returns(dates[1:], returns)

    # ── Drawdown chart ──
    dd_sample = max(1, len(drawdowns) // 200)
    drawdown_data = [
        {"date": dates[i], "value": round(float(drawdowns[i]) * 100, 2)}
        for i in range(0, len(drawdowns), dd_sample)
    ]

    # ── Rolling Volatility (60-day window) ──
    window = 60
    rolling_vol_data = []
    if len(returns) > window:
        for i in range(window, len(returns), max(1, (len(returns) - window) // 150)):
            vol = float(np.std(returns[i - window:i]) * np.sqrt(252) * 100)
            rolling_vol_data.append({"date": dates[i + 1], "value": round(vol, 2)})

    # ── Histogram ──
    hist_counts, bin_edges = np.histogram(returns * 100, bins=50)
    histogram = [
        {"bin": round(float((bin_edges[i] + bin_edges[i + 1]) / 2), 2), "count": int(hist_counts[i])}
        for i in range(len(hist_counts))
    ]

    # ── Rolling Sharpe (120-day) ──
    sharpe_window = 120
    rolling_sharpe_data = []
    if len(returns) > sharpe_window:
        daily_rf_val = rf / 252
        for i in range(sharpe_window, len(returns), max(1, (len(returns) - sharpe_window) // 100)):
            window_ret = returns[i - sharpe_window:i]
            w_mean = float(np.mean(window_ret))
            w_std = float(np.std(window_ret))
            s = ((w_mean - daily_rf_val) / w_std * np.sqrt(252)) if w_std > 0 else 0
            rolling_sharpe_data.append({"date": dates[i + 1], "value": round(s, 2)})

    # ── VaR (Value at Risk) ──
    var_95 = float(np.percentile(returns, 5) * 100)
    var_99 = float(np.percentile(returns, 1) * 100)
    cvar_95 = float(np.mean(returns[returns <= np.percentile(returns, 5)]) * 100)
    var_data = {
        "var95": round(var_95, 2),
        "var99": round(var_99, 2),
        "cvar95": round(cvar_95, 2),
        "distribution": histogram[:20],
    }

    # ── Radar metrics ──
    ret_score = max(0, min(100, ann_return / 0.30 * 100))
    vol_score = max(0, min(100, (1 - ann_vol / 50) * 100))
    sharpe_score = max(0, min(100, sharpe / 3 * 100))
    dd_score = max(0, min(100, (1 + max_dd / 50) * 100))
    sortino_score = max(0, min(100, sortino / 3 * 100))

    if len(returns) > 20:
        monthly_means = []
        chunk = max(1, len(returns) // 12)
        for ci in range(0, len(returns), chunk):
            monthly_means.append(float(np.mean(returns[ci:ci + chunk])))
        cv = float(np.std(monthly_means) / (abs(np.mean(monthly_means)) + 1e-10))
        consistency = max(0, min(100, (1 - min(cv, 5) / 5) * 100))
    else:
        consistency = 50

    radar_metrics = [
        {"axis": "Lợi nhuận", "value": round(ret_score, 1)},
        {"axis": "Rủi ro thấp", "value": round(vol_score, 1)},
        {"axis": "Sharpe", "value": round(sharpe_score, 1)},
        {"axis": "Drawdown thấp", "value": round(dd_score, 1)},
        {"axis": "Sortino", "value": round(sortino_score, 1)},
        {"axis": "Tính nhất quán", "value": round(consistency, 1)},
    ]

    # ── Monte Carlo Simulation ──
    monte_carlo = _run_monte_carlo(closes[-1], returns, days=252, simulations=500)

    return {
        "kpis": kpis,
        "wealthIndex": wealth_index,
        "monthlyReturns": monthly_returns,
        "drawdownData": drawdown_data,
        "rollingVolatility": rolling_vol_data,
        "histogram": histogram,
        "rollingSharpe": rolling_sharpe_data,
        "varData": var_data,
        "radarMetrics": radar_metrics,
        "monteCarlo": monte_carlo,
    }


def _empty_quant() -> Dict:
    return {
        "kpis": [], "wealthIndex": [], "monthlyReturns": [],
        "drawdownData": [], "rollingVolatility": [], "histogram": [],
        "rollingSharpe": [], "varData": {}, "radarMetrics": [],
        "monteCarlo": {},
    }


def _compute_monthly_returns(dates: List[str], returns: np.ndarray) -> List[Dict]:
    """Aggregate daily returns into monthly returns for heatmap."""
    monthly: Dict[str, float] = {}
    for i, d in enumerate(dates):
        if i >= len(returns):
            break
        try:
            if "-" in d:
                ym = d[:7]
            else:
                parts = d.split("/")
                ym = f"{parts[2]}-{parts[1]}"
        except (IndexError, AttributeError):
            continue
        if ym not in monthly:
            monthly[ym] = 1.0
        monthly[ym] *= (1 + float(returns[i]))

    result = []
    for ym, cum in sorted(monthly.items()):
        parts = ym.split("-")
        if len(parts) == 2:
            result.append({
                "year": int(parts[0]),
                "month": int(parts[1]),
                "return": round((cum - 1) * 100, 2),
            })
    return result


def _run_monte_carlo(
    last_price: float,
    returns: np.ndarray,
    days: int = 252,
    simulations: int = 500,
) -> Dict[str, Any]:
    """Run Monte Carlo simulation on stock returns."""
    if len(returns) < 20:
        return {}

    mu = float(np.mean(returns))
    sigma = float(np.std(returns))

    rng = np.random.default_rng(abs(hash(str(last_price))) % (2**31))
    random_returns = rng.normal(mu, sigma, (simulations, days))
    price_paths = last_price * np.cumprod(1 + random_returns, axis=1)

    percentiles = {}
    for p in [5, 25, 50, 75, 95]:
        pct_values = np.percentile(price_paths, p, axis=0)
        sample = max(1, days // 50)
        percentiles[f"p{p}"] = [
            round(float(pct_values[i]), 2)
            for i in range(0, days, sample)
        ]

    final_prices = price_paths[:, -1]
    expected = round(float(np.mean(final_prices)), 2)
    p5 = round(float(np.percentile(final_prices, 5)), 2)
    p95 = round(float(np.percentile(final_prices, 95)), 2)

    return {
        "simulations": simulations,
        "days": days,
        "expectedPrice": expected,
        "p5": p5,
        "p95": p95,
        "percentiles": percentiles,
        "probUp": round(float(np.mean(final_prices > last_price) * 100), 1),
    }


# ────────────────────────────────────────────────────────────────────
# 9. Valuation
# ────────────────────────────────────────────────────────────────────

# PAR value per share in VND (standard for Vietnam stock market)
_VN_PAR_VALUE = 10_000


@cached("stock:valuation", ttl=600)
async def get_valuation(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    """Valuation models: DCF, DDM, PE/PB bands, peer valuation."""
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    ratio_res, bctc_res, price_res, peers_res = await asyncio.gather(
        _query_valuation_ratios(db, ticker),
        _query_valuation_bctc(db, ticker),
        _query_price_history(db, ticker, days=1500),
        _query_valuation_peers(db, ticker),
    )

    ratios = ratio_res or []
    bctc = bctc_res
    prices = price_res or []
    peers = peers_res or []

    # history_price.close is in 1000 VND — convert to VND
    for p in prices:
        p["close"] = float(p["close"]) * 1000

    current_price = float(prices[-1]["close"]) if prices else 0

    # ── Derive PE, PB, EPS, BVPS, outstanding shares from BCTC ──
    derived = _derive_financial_metrics(bctc, ratios, current_price)
    enriched_ratios = _enrich_ratios_with_derived(ratios, derived)
    shares = derived.get("outstanding_shares", 0)

    dcf = _compute_dcf(bctc, enriched_ratios, current_price)
    ddm = _compute_ddm(enriched_ratios, current_price)
    pe_band = _compute_pe_pb_band(prices, bctc, shares, "pe")
    pb_band = _compute_pe_pb_band(prices, bctc, shares, "pb")

    peer_valuation = [
        {
            "ticker": r["ticker"],
            "companyName": r.get("company_name", ""),
            "pe": _safe_round(r.get("pe")),
            "pb": _safe_round(r.get("pb")),
            "evEbitda": _safe_round(r.get("ev_ebitda")),
            "roe": _safe_round(r.get("roe")),
            "marketCap": _safe_round(r.get("market_cap")),
        }
        for r in peers
    ]

    # Build summary from all available methods
    dcf_val = dcf.get("intrinsicValue", 0)
    ddm_val = ddm.get("intrinsicValue", 0)

    # PE-based valuation from peers
    peer_pe_val = 0
    target_eps = derived.get("eps", 0)
    peer_pes = [p.get("pe") for p in peer_valuation if p.get("pe") and p["pe"] > 0]
    if peer_pes and target_eps > 0:
        avg_peer_pe = sum(peer_pes) / len(peer_pes)
        peer_pe_val = round(avg_peer_pe * target_eps, 0)

    # PB-based valuation from peers
    peer_pb_val = 0
    target_bvps = derived.get("bvps", 0)
    peer_pbs = [p.get("pb") for p in peer_valuation if p.get("pb") and p["pb"] > 0]
    if peer_pbs and target_bvps > 0:
        avg_peer_pb = sum(peer_pbs) / len(peer_pbs)
        peer_pb_val = round(avg_peer_pb * target_bvps, 0)

    # Collect all valid valuations (exclude negative values)
    methods = []
    method_values = []
    if dcf_val > 0:
        methods.append({"method": "DCF", "value": dcf_val})
        method_values.append(dcf_val)
    if ddm_val > 0:
        methods.append({"method": "DDM (Gordon)", "value": ddm_val})
        method_values.append(ddm_val)
    if pe_band.get("avgBand") and pe_band["avgBand"]:
        pe_band_val = pe_band["avgBand"][-1]
        methods.append({"method": "P/E Band", "value": round(pe_band_val, 0)})
        method_values.append(pe_band_val)
    if pb_band.get("avgBand") and pb_band["avgBand"]:
        pb_band_val = pb_band["avgBand"][-1]
        methods.append({"method": "P/B Band", "value": round(pb_band_val, 0)})
        method_values.append(pb_band_val)
    if peer_pe_val > 0:
        methods.append({"method": "Peer P/E", "value": peer_pe_val})
        method_values.append(peer_pe_val)
    if peer_pb_val > 0:
        methods.append({"method": "Peer P/B", "value": peer_pb_val})
        method_values.append(peer_pb_val)

    # Weighted intrinsic value: DCF weighted higher
    if method_values:
        # Weight DCF more if available
        if dcf_val > 0:
            intrinsic = dcf_val * 0.35
            rest = [v for v in method_values if v != dcf_val]
            if rest:
                intrinsic += sum(rest) / len(rest) * 0.65
            else:
                intrinsic = dcf_val
        else:
            intrinsic = sum(method_values) / len(method_values)
    else:
        intrinsic = 0

    upside = ((intrinsic - current_price) / current_price * 100) if current_price > 0 and intrinsic > 0 else 0

    summary = {
        "intrinsicValue": round(intrinsic, 0),
        "currentPrice": current_price,
        "upside": round(upside, 2),
        "methods": methods,
    }

    football_field = _compute_football_field(dcf, ddm, pe_band, pb_band, peer_valuation, current_price, target_eps)

    return {
        "summary": summary,
        "dcf": dcf,
        "ddm": ddm,
        "peBand": pe_band,
        "pbBand": pb_band,
        "peerValuation": peer_valuation,
        "footballField": football_field,
    }


def _derive_financial_metrics(bctc: Dict, ratios: List[Dict], current_price: float) -> Dict:
    """Derive EPS, BVPS, PE, PB, outstanding shares, dividendYield from BCTC data.

    This compensates for financial_ratio table having NULL values for these metrics.
    Uses TTM (trailing twelve months) by summing the last 4 quarters for flow items.
    Handles banks and non-bank companies differently for share counts and EPS.
    """
    result: Dict[str, float] = {}

    if not bctc:
        return result

    # Sort periods descending
    sorted_keys = sorted(bctc.keys(), key=lambda x: (x[0], int(x[1]) if str(x[1]).isdigit() else 0), reverse=True)

    # ─── Outstanding shares ───
    # 1) Try C_PHI_U_PH_TH_NG (par value amount) / 10,000
    shares = 0
    for k in sorted_keys:
        par_value = bctc[k].get(BS_CODES.get("outstandingSharesPar", ""), 0)
        if par_value > 0:
            shares = par_value / _VN_PAR_VALUE
            break

    # 2) Fallback: charterCapital / 10,000 (works for banks like VCB)
    if shares <= 0:
        for k in sorted_keys:
            charter = bctc[k].get(BS_CODES.get("charterCapital", ""), 0)
            if charter > 0:
                shares = charter / _VN_PAR_VALUE
                break

    # 3) Fallback: financial_ratio table
    if shares <= 0 and ratios:
        shares = _safe_float(ratios[0].get("outstanding_shares"))

    if shares > 0:
        result["outstanding_shares"] = shares

    # ─── EPS ───
    # 1) Try direct EPS from BCTC (L_I_C_B_N_TR_N_C_PHI_U = basic EPS, available for banks)
    direct_eps_code = IS_CODES.get("basicEps", "")
    ttm_direct_eps = _compute_ttm(bctc, sorted_keys, direct_eps_code) if direct_eps_code else 0

    # 2) Compute from net profit parent / shares
    ttm_net_profit = _compute_ttm(bctc, sorted_keys, IS_CODES.get("netProfitParent", ""))
    computed_eps = (ttm_net_profit / shares) if shares > 0 and ttm_net_profit != 0 else 0

    # Use direct EPS if available, otherwise computed
    eps = ttm_direct_eps if ttm_direct_eps > 0 else computed_eps
    if eps != 0:
        result["eps"] = eps
        if current_price > 0 and eps > 0:
            result["pe"] = current_price / eps

    # ─── BVPS from Equity ───
    for k in sorted_keys:
        equity = bctc[k].get(BS_CODES.get("totalEquity", ""), 0)
        if equity > 0 and shares > 0:
            bvps = equity / shares
            result["bvps"] = bvps
            if current_price > 0 and bvps > 0:
                result["pb"] = current_price / bvps
            break

    # ─── Market Cap ───
    if current_price > 0 and shares > 0:
        result["market_cap"] = current_price * shares

    # ─── Dividend yield ───
    # From dividends paid (negative) in cash flow
    ttm_dividends_paid = abs(_compute_ttm(bctc, sorted_keys, CF_CODES.get("dividendsPaid", "")))
    if ttm_dividends_paid > 0 and shares > 0:
        dps = ttm_dividends_paid / shares
        result["dps"] = dps
        if current_price > 0:
            result["dividend_yield"] = (dps / current_price) * 100

    # ─── D/E ratio ───
    for k in sorted_keys:
        total_liab = bctc[k].get(BS_CODES.get("totalLiabilities", ""), 0)
        equity = bctc[k].get(BS_CODES.get("totalEquity", ""), 0)
        if equity > 0:
            result["debt_to_equity"] = total_liab / equity
            break

    return result


def _compute_ttm(bctc: Dict, sorted_keys: List, ind_code: str) -> float:
    """Compute trailing twelve months value by summing last 4 quarterly values."""
    # Check if there's annual data (quarter 5) first
    for k in sorted_keys:
        if str(k[1]) in ("5", "0"):
            val = bctc[k].get(ind_code, 0)
            if val != 0:
                return val

    # Sum last 4 quarters
    values = []
    for k in sorted_keys:
        q = str(k[1])
        if not q.isdigit() or q in ("5", "0"):
            continue
        val = bctc[k].get(ind_code, 0)
        if val != 0:
            values.append(val)
        if len(values) >= 4:
            break

    return sum(values) if len(values) >= 2 else (values[0] if values else 0)


def _enrich_ratios_with_derived(ratios: List[Dict], derived: Dict) -> List[Dict]:
    """Inject derived PE/PB/EPS into ratio objects where they are NULL."""
    if not ratios:
        # Create a synthetic ratio entry
        return [{
            "year": 2025, "quarter": 4,
            "pe": derived.get("pe"),
            "pb": derived.get("pb"),
            "eps": derived.get("eps"),
            "roe": None,
            "market_cap": derived.get("market_cap"),
            "outstanding_shares": derived.get("outstanding_shares"),
            "dividend_yield": derived.get("dividend_yield"),
            "debt_to_equity": derived.get("debt_to_equity"),
        }]

    enriched = []
    for r in ratios:
        r2 = dict(r)
        if not r2.get("pe") and derived.get("pe"):
            r2["pe"] = derived["pe"]
        if not r2.get("pb") and derived.get("pb"):
            r2["pb"] = derived["pb"]
        if not r2.get("eps") and derived.get("eps"):
            r2["eps"] = derived["eps"]
        if not r2.get("market_cap") and derived.get("market_cap"):
            r2["market_cap"] = derived["market_cap"]
        if not r2.get("outstanding_shares") and derived.get("outstanding_shares"):
            r2["outstanding_shares"] = derived["outstanding_shares"]
        if not r2.get("dividend_yield") and derived.get("dividend_yield"):
            r2["dividend_yield"] = derived["dividend_yield"]
        if not r2.get("debt_to_equity") and derived.get("debt_to_equity"):
            r2["debt_to_equity"] = derived["debt_to_equity"]
        enriched.append(r2)
    return enriched


async def _query_valuation_ratios(db: AsyncSession, ticker: str) -> List[Dict]:
    sql = text(f"""
        SELECT year, quarter, pe, pb, eps, roe, roa,
               market_cap, outstanding_shares, ev_ebitda,
               dividend_yield, net_margin, debt_to_equity
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = :ticker
        ORDER BY year DESC, quarter DESC
        LIMIT 20
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


async def _query_valuation_bctc(db: AsyncSession, ticker: str) -> Dict:
    codes = list(set(IS_CODES.values()) | set(CF_CODES.values()) | set(BS_CODES.values()))
    sql = text(f"""
        SELECT year, quarter, ind_code, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker AND ind_code = ANY(:codes)
        ORDER BY year DESC, quarter DESC
    """)
    res = await db.execute(sql, {"ticker": ticker, "codes": codes})
    rows = res.mappings().all()

    pivot: Dict[Tuple[int, str], Dict[str, float]] = {}
    for r in rows:
        key = (int(r["year"]), str(r["quarter"]))
        if key not in pivot:
            pivot[key] = {}
        pivot[key][r["ind_code"]] = _safe_float(r["value"])
    return pivot


async def _query_valuation_peers(db: AsyncSession, ticker: str) -> List[Dict]:
    sql = text(f"""
        WITH sector AS (
            SELECT icb_name2 FROM {SCHEMA}.company_overview
            WHERE ticker = :ticker LIMIT 1
        ),
        peer_ratios AS (
            SELECT DISTINCT ON (fr.ticker)
                fr.ticker, co.organ_short_name AS company_name,
                fr.pe, fr.pb, fr.ev_ebitda, fr.roe, fr.market_cap
            FROM {SCHEMA}.financial_ratio fr
            JOIN {SCHEMA}.company_overview co ON co.ticker = fr.ticker
            WHERE co.icb_name2 = (SELECT icb_name2 FROM sector)
              AND fr.ticker != :ticker
            ORDER BY fr.ticker, fr.year DESC, fr.quarter DESC
        )
        SELECT * FROM peer_ratios LIMIT 10
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


def _compute_dcf(bctc: Dict, ratios: List[Dict], current_price: float) -> Dict:
    """DCF model: use annual FCF, derive WACC from data where possible."""
    yearly_fcf: Dict[int, float] = {}
    annual_years: set = set()

    # First pass: collect annual (quarter=5 or 0) FCF
    for (yr, q), data in bctc.items():
        if str(q) not in ("5", "0"):
            continue
        ocf = data.get(CF_CODES.get("operatingCashFlow", ""), 0)
        capex = abs(data.get(CF_CODES.get("purchaseOfFixedAssets", ""), 0))
        if ocf == 0:
            continue
        yearly_fcf[yr] = ocf - capex
        annual_years.add(yr)

    # Second pass: accumulate quarterly FCF for years without annual data
    for (yr, q), data in bctc.items():
        if str(q) in ("5", "0") or yr in annual_years:
            continue
        ocf = data.get(CF_CODES.get("operatingCashFlow", ""), 0)
        capex = abs(data.get(CF_CODES.get("purchaseOfFixedAssets", ""), 0))
        if ocf == 0:
            continue
        yearly_fcf.setdefault(yr, 0)
        yearly_fcf[yr] += ocf - capex

    if not yearly_fcf:
        return {"wacc": 0, "terminalGrowth": 0, "projections": [], "sensitivityMatrix": [], "intrinsicValue": 0}

    sorted_years = sorted(yearly_fcf.keys(), reverse=True)
    base_fcf = yearly_fcf[sorted_years[0]]

    # Estimate growth rate from historical FCF CAGR
    growth_rate = 0.08
    if len(sorted_years) >= 3:
        oldest_yr = sorted_years[min(4, len(sorted_years) - 1)]
        old_fcf = yearly_fcf[oldest_yr]
        if old_fcf > 0 and base_fcf > 0:
            n = sorted_years[0] - oldest_yr
            if n > 0:
                cagr = (base_fcf / old_fcf) ** (1 / n) - 1
                growth_rate = max(-0.05, min(0.30, cagr))

    # Estimate WACC
    wacc = 0.12
    if ratios:
        roe = _safe_float(ratios[0].get("roe")) / 100 if ratios[0].get("roe") else 0
        de = _safe_float(ratios[0].get("debt_to_equity"))
        if roe > 0 and de >= 0:
            ke = max(0.08, min(0.25, roe))
            kd = 0.06
            tax_rate = 0.20
            e_weight = 1 / (1 + de)
            d_weight = de / (1 + de)
            wacc = ke * e_weight + kd * (1 - tax_rate) * d_weight
            wacc = max(0.08, min(0.20, wacc))

    terminal_growth = 0.03

    shares = _safe_float(ratios[0].get("outstanding_shares")) if ratios else 0
    projections_display = []
    cum_pv_full = 0.0
    for i in range(1, 6):
        projected_fcf = base_fcf * (1 + growth_rate) ** i
        pv = projected_fcf / (1 + wacc) ** i
        cum_pv_full += pv
        projections_display.append({
            "year": i,
            "fcf": round(projected_fcf / 1e9, 2),
            "pv": round(pv / 1e9, 2),
        })

    terminal_fcf = base_fcf * (1 + growth_rate) ** 5 * (1 + terminal_growth)
    terminal_value = terminal_fcf / (wacc - terminal_growth) if wacc > terminal_growth else 0
    pv_terminal = terminal_value / (1 + wacc) ** 5

    ev = cum_pv_full + pv_terminal
    intrinsic = (ev / shares) if shares > 0 else 0

    # Sensitivity matrix
    waccs = [round(wacc - 0.02, 3), round(wacc - 0.01, 3), round(wacc, 3), round(wacc + 0.01, 3), round(wacc + 0.02, 3)]
    growths = [0.02, 0.025, 0.03, 0.035, 0.04]
    sensitivity = []
    for w in waccs:
        row = []
        for g in growths:
            if w <= g:
                row.append(0)
                continue
            tv = base_fcf * (1 + growth_rate) ** 5 * (1 + g) / (w - g)
            pv_tv = tv / (1 + w) ** 5
            cum_pv = sum(base_fcf * (1 + growth_rate) ** yr / (1 + w) ** yr for yr in range(1, 6))
            val = (cum_pv + pv_tv) / shares if shares > 0 else 0
            row.append(round(val, 0))
        sensitivity.append(row)

    return {
        "wacc": round(wacc, 4),
        "terminalGrowth": terminal_growth,
        "projections": projections_display,
        "sensitivityMatrix": sensitivity,
        "intrinsicValue": round(intrinsic, 0),
    }


def _compute_ddm(ratios: List[Dict], current_price: float) -> Dict:
    """Gordon Growth Model (DDM)."""
    if not ratios:
        return {"intrinsicValue": 0}

    div_yield = _safe_float(ratios[0].get("dividend_yield"))
    eps = _safe_float(ratios[0].get("eps"))
    roe = _safe_float(ratios[0].get("roe")) / 100 if ratios[0].get("roe") else 0

    if eps <= 0:
        return {"intrinsicValue": 0, "dividendPerShare": 0, "costOfEquity": 0, "growthRate": 0}

    if div_yield > 0 and current_price > 0:
        payout_ratio = min(1.0, (div_yield / 100) * current_price / eps)
    else:
        payout_ratio = 0.3
    dividend = eps * payout_ratio

    if dividend <= 0:
        return {"intrinsicValue": 0, "dividendPerShare": 0, "costOfEquity": 0, "growthRate": 0}

    cost_of_equity = max(0.08, min(0.20, roe if roe > 0 else 0.12))

    retention = 1 - payout_ratio
    growth = max(0.02, min(0.10, roe * retention)) if roe > 0 else 0.05

    if cost_of_equity <= growth:
        growth = cost_of_equity - 0.02

    intrinsic = dividend * (1 + growth) / (cost_of_equity - growth)

    return {
        "intrinsicValue": round(intrinsic, 0),
        "dividendPerShare": round(dividend, 0),
        "costOfEquity": round(cost_of_equity, 4),
        "growthRate": round(growth, 4),
    }


def _compute_pe_pb_band(prices: List[Dict], bctc: Dict, shares: float, metric: str = "pe") -> Dict:
    """Compute PE or PB band chart from BCTC + price data.

    Instead of relying on financial_ratio (which has NULL PE/PB),
    we derive annual EPS/BVPS from BCTC and compute historical multiples
    from year-end prices.
    """
    _empty = {"dates": [], "prices": [], "highBand": [], "midBand": [], "lowBand": [], "avgBand": []}
    if not prices or not bctc or shares <= 0:
        return _empty

    sorted_keys = sorted(bctc.keys(), key=lambda x: (x[0], int(x[1]) if str(x[1]).isdigit() else 0))

    # ── Build annual base values (EPS or BVPS) from BCTC ──
    annual_base: Dict[int, float] = {}

    if metric == "pe":
        code = IS_CODES.get("netProfitParent", "")
        eps_code = IS_CODES.get("basicEps", "")
        # Prefer annual (q=5 or 0) - net profit / shares
        for yr, q in sorted_keys:
            if str(q) in ("5", "0") and yr not in annual_base:
                val = bctc[(yr, q)].get(code, 0)
                if val > 0:
                    annual_base[yr] = val / shares
        # For banks: try direct EPS (basicEps) summed across quarters
        if not annual_base and eps_code:
            q_eps_acc: Dict[int, float] = {}
            q_eps_cnt: Dict[int, int] = {}
            for yr, q in sorted_keys:
                if str(q) not in ("5", "0"):
                    val = bctc[(yr, q)].get(eps_code, 0)
                    if val > 0:
                        q_eps_acc.setdefault(yr, 0)
                        q_eps_cnt.setdefault(yr, 0)
                        q_eps_acc[yr] += val
                        q_eps_cnt[yr] += 1
            for yr, total in q_eps_acc.items():
                if q_eps_cnt.get(yr, 0) >= 2 and total > 0:
                    annual_base[yr] = total
        # Fallback: sum quarterly net profit for years without annual
        q_acc: Dict[int, float] = {}
        q_cnt: Dict[int, int] = {}
        for yr, q in sorted_keys:
            if str(q) not in ("5", "0") and yr not in annual_base:
                val = bctc[(yr, q)].get(code, 0)
                if val != 0:
                    q_acc.setdefault(yr, 0)
                    q_cnt.setdefault(yr, 0)
                    q_acc[yr] += val
                    q_cnt[yr] += 1
        for yr, total in q_acc.items():
            if q_cnt.get(yr, 0) >= 2 and total > 0:
                annual_base[yr] = total / shares
    else:
        code = BS_CODES.get("totalEquity", "")
        # For PB, equity is a balance-sheet item — take latest per year
        seen_years: set = set()
        for yr, q in reversed(sorted_keys):
            if yr not in seen_years:
                val = bctc[(yr, q)].get(code, 0)
                if val > 0:
                    annual_base[yr] = val / shares
                    seen_years.add(yr)

    if not annual_base:
        return _empty

    # ── Compute historical multiples from year-end prices ──
    year_end_prices: Dict[int, float] = {}
    for p in prices:
        d = str(p["trading_date"])
        try:
            yr = int(d[:4])
            year_end_prices[yr] = float(p["close"])
        except (ValueError, IndexError):
            continue

    multiples = []
    for yr, base_val in annual_base.items():
        price = year_end_prices.get(yr)
        if price and price > 0 and base_val > 0:
            mult = price / base_val
            if 0 < mult < 500:     # sanity check
                multiples.append(mult)

    # Fallback: compute from current price if not enough history
    if len(multiples) < 2:
        latest_yr = max(annual_base.keys())
        latest_base = annual_base[latest_yr]
        if latest_base > 0:
            current_price = float(prices[-1]["close"])
            cm = current_price / latest_base
            multiples = [cm * 0.6, cm * 0.8, cm, cm * 1.2, cm * 1.4]

    if not multiples:
        return _empty

    high_mult = max(multiples)
    low_mult = min(multiples)
    avg_mult = sum(multiples) / len(multiples)
    sorted_m = sorted(multiples)
    mid_mult = sorted_m[len(sorted_m) // 2]

    # ── Build time-varying base lookup ──
    years_sorted = sorted(annual_base.keys())

    def _find_base(date_str: str) -> float:
        try:
            yr = int(str(date_str)[:4])
        except (ValueError, IndexError):
            return annual_base[years_sorted[-1]]
        best = annual_base[years_sorted[0]]
        for y in years_sorted:
            if y <= yr:
                best = annual_base[y]
        return best

    # ── Sample prices for chart ──
    sample = max(1, len(prices) // 200)
    sampled = [prices[i] for i in range(0, len(prices), sample)]

    dates = [str(p["trading_date"]) for p in sampled]
    price_vals = [float(p["close"]) for p in sampled]

    high_band, mid_band, low_band, avg_band = [], [], [], []
    for d in dates:
        bv = _find_base(d)
        high_band.append(round(high_mult * bv, 2))
        mid_band.append(round(mid_mult * bv, 2))
        low_band.append(round(low_mult * bv, 2))
        avg_band.append(round(avg_mult * bv, 2))

    return {
        "dates": dates,
        "prices": price_vals,
        "highBand": high_band,
        "midBand": mid_band,
        "lowBand": low_band,
        "avgBand": avg_band,
    }


def _compute_football_field(dcf: Dict, ddm: Dict, pe_band: Dict, pb_band: Dict,
                             peer_valuation: List[Dict], current_price: float,
                             target_eps: float = 0) -> List[Dict]:
    """Compute football field chart data showing valuation ranges."""
    result = []

    # DCF
    if dcf.get("sensitivityMatrix"):
        flat = [v for row in dcf["sensitivityMatrix"] for v in row if v > 0]
        if flat:
            result.append({"method": "DCF", "low": min(flat), "mid": dcf.get("intrinsicValue", 0), "high": max(flat)})

    # DDM
    ddm_val = ddm.get("intrinsicValue", 0)
    dps = ddm.get("dividendPerShare", 0)
    ke = ddm.get("costOfEquity", 0)
    g = ddm.get("growthRate", 0)
    if ddm_val > 0 and dps > 0 and ke > 0:
        ddm_low = dps * (1 + max(0.01, g - 0.01)) / (min(0.25, ke + 0.02) - max(0.01, g - 0.01)) if (ke + 0.02) > (g - 0.01) else ddm_val * 0.7
        ddm_high = dps * (1 + min(0.15, g + 0.01)) / (max(0.06, ke - 0.02) - min(0.15, g + 0.01)) if (ke - 0.02) > (g + 0.01) else ddm_val * 1.3
        result.append({"method": "DDM", "low": round(min(ddm_low, ddm_val), 0), "mid": ddm_val, "high": round(max(ddm_high, ddm_val), 0)})

    # PE Band
    if pe_band.get("lowBand") and pe_band["lowBand"]:
        result.append({"method": "P/E Band", "low": pe_band["lowBand"][-1], "mid": pe_band["avgBand"][-1], "high": pe_band["highBand"][-1]})

    # PB Band
    if pb_band.get("lowBand") and pb_band["lowBand"]:
        result.append({"method": "P/B Band", "low": pb_band["lowBand"][-1], "mid": pb_band["avgBand"][-1], "high": pb_band["highBand"][-1]})

    # Peer comparison
    peer_pes = [p.get("pe") for p in peer_valuation if p.get("pe") and p["pe"] > 0]
    if peer_pes and target_eps > 0:
        result.append({
            "method": "Peer P/E",
            "low": round(min(peer_pes) * target_eps, 0),
            "mid": round(sum(peer_pes) / len(peer_pes) * target_eps, 0),
            "high": round(max(peer_pes) * target_eps, 0),
        })

    # Current price marker
    if result:
        result.append({"method": "Giá hiện tại", "low": current_price, "mid": current_price, "high": current_price})

    return result
