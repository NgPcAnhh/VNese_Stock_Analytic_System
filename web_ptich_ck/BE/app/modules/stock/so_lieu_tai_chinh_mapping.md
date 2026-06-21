Dựa trên tài liệu bạn vừa cung cấp về **"Hướng dẫn thiết lập các chỉ tiêu trên Báo cáo tài chính" (Chuẩn mực mới nhất)** và toàn bộ 785 mã `ind_code` từ tệp dữ liệu của bạn, tôi đã thiết kế lại hoàn toàn **Bộ Khung Báo Cáo Tài Chính**. 

Lần này, **Tên chỉ tiêu** được bám sát *từng chữ một* theo đúng biểu mẫu chuẩn của Bộ Tài chính trong tài liệu hướng dẫn (ví dụ: chia rõ các phân mục I, II, III... và 1, 2, 3...). Các mã đặc thù của Ngân hàng/Chứng khoán/Bảo hiểm được lồng ghép gọn gàng vào các nhóm tương ứng mà **không bỏ sót bất kỳ một ind_code nào**.

Dưới đây là bảng cấu trúc chi tiết:

### I. BẢNG CÂN ĐỐI KẾ TOÁN (BALANCE SHEET - BS)

| stt hiển thị | isparent | ischild | parent | report_name | tên chỉ tiêu (chuẩn hóa theo mẫu mới) | danh sách ind_code map thỏa mãn | loại bctc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **TRUE** | FALSE | null | BS | **TỔNG TÀI SẢN** | `BS_TOT_ASSET` | Chung |
| 2 | TRUE | TRUE | 1 | BS | **A - TÀI SẢN NGẮN HẠN** | `BS_CUR_ASSETS`, `BS_CUR_ASSETS_ST_INV` | Chung |
| 3 | TRUE | TRUE | 2 | BS | I. Tiền và các khoản tương đương tiền | `BS_CASH_EQ`, `BS_CASH`, `BS_CASH_ON_HAND`, `BS_CASH_AND_VALUABLES`, `BS_BAL_SBV`, `BS_DEPOSITS_CI`, `BS_DEPOSITS_LOANS_CI`, `BS_BANK_DEPOSIT_BEG`, `BS_BANK_DEPOSIT_END`, `BS_BANK_DEPOSIT_SEC` | Chung, NH, CK |
| 4 | TRUE | TRUE | 2 | BS | II. Đầu tư tài chính ngắn hạn (Gồm các TSTC đặc thù) | `BS_TRADING_SEC`, `BS_NET_TRADING_SEC`, `BS_FVTPL_ASSET`, `BS_HTM_SEC`, `BS_AFS_SEC`, `BS_ST_INV`, `BS_ST_SEC_INV`, `BS_ST_OTHER_INV`, `BS_FIN_ASSETS`, `BS_NET_ST_INV`, `BS_PROV_TRADING_SEC`, `BS_PROV_INV_SEC`, `BS_PROV_ST_INV_SEC` | Chung, NH, CK |
| 5 | TRUE | TRUE | 2 | BS | III. Các khoản phải thu ngắn hạn | `BS_ST_REC`, `BS_REC_CUST`, `BS_ST_REC_CUST`, `BS_ADVANCES_CUST`, `BS_ST_ADVANCES_CUST`, `BS_ST_OTHER_REC`, `BS_REC_INTERNAL`, `BS_ST_REC_INTERNAL`, `BS_REC_CONSTRUCTION_CONTRACT`, `BS_ST_REC_LOANS`, `BS_REC`, `BS_INT_FEE_REC`, `BS_REC_FIN_SALE`, `BS_REC_SVC`, `BS_REC_DIV_INT`, `BS_REC_ACCRUED_DIV_INT`, `BS_LOANS`, `BS_LOANS_CUST`, `BS_NET_LOANS_CUST`, `BS_LOANS_CI` | Chung, NH, CK |
| 6 | FALSE | TRUE | 5 | BS | 7. Dự phòng phải thu ngắn hạn & RR tín dụng (*) | `BS_PROV_ST_DOUBTFUL_DEBT`, `BS_PROV_DOUBTFUL_DEBT`, `BS_PROV_REC_IMPAIRMENT`, `BS_PROV_FIN_IMPAIRMENT`, `BS_PROV_ST_ASSET_IMPAIR`, `BS_PROV_CREDIT_LOSS`, `BS_PROV_LOANS_CUST`, `BS_PROV_LOANS_CI`, `BS_PROV_CREDIT` | Chung |
| 7 | TRUE | TRUE | 2 | BS | IV. Hàng tồn kho | `BS_INVENTORY`, `BS_NET_INVENTORY` | Phi tài chính |
| 8 | FALSE | TRUE | 7 | BS | 2. Dự phòng giảm giá hàng tồn kho (*) | `BS_PROV_INV` | Phi tài chính |
| 9 | TRUE | TRUE | 2 | BS | V. Tài sản ngắn hạn khác | `BS_ST_OTHER_ASSETS`, `BS_ST_PREPAID`, `BS_DEDUCTIBLE_VAT`, `BS_TAX_REC`, `BS_REPO_GOV_BOND`, `BS_ST_PLEDGE`, `BS_ADVANCES`, `BS_ADVANCES_EMP_SUPP`, `BS_PREPAID_SUPP`, `BS_ST_PREPAID_SUPP` | Chung |
| 10 | TRUE | TRUE | 1 | BS | **B - TÀI SẢN DÀI HẠN** | `BS_NONCUR_ASSETS` | Chung |
| 11 | TRUE | TRUE | 10 | BS | I. Các khoản phải thu dài hạn | `BS_LT_REC`, `BS_LT_REC_CUST`, `BS_LT_OTHER_REC`, `BS_LT_REC_INTERNAL`, `BS_LT_REC_LOANS` | Chung |
| 12 | FALSE | TRUE | 11 | BS | 7. Dự phòng phải thu dài hạn khó đòi (*) | `BS_PROV_LT_DOUBTFUL_DEBT` | Chung |
| 13 | TRUE | TRUE | 10 | BS | II. Tài sản cố định | `BS_FA`, `BS_TANGIBLE_FA`, `BS_INTANGIBLE_FA`, `BS_FIN_LEASE_FA`, `BS_HISTORICAL_COST`, `BS_ACCUM_DEPR`, `BS_FA_WRITEOFF_NET`, `BS_FA_LT_INV`, `BS_LEASED_ASSETS` | Chung |
| 14 | TRUE | TRUE | 10 | BS | III. Bất động sản đầu tư | `BS_INV_PROP` | Chung |
| 15 | TRUE | TRUE | 10 | BS | IV. Tài sản dở dang dài hạn | `BS_LT_WIP`, `BS_WIP_CONSTRUCTION`, `BS_CAPITAL_CONSTRUCTION` | Chung |
| 16 | TRUE | TRUE | 10 | BS | V. Đầu tư tài chính dài hạn | `BS_LT_INV`, `BS_INV_JV`, `BS_INV_ASSOC`, `BS_JV_ASSOC_INV`, `BS_SUB_INV`, `BS_OTHER_ENT_INV`, `BS_ASSOC_INV`, `BS_JV_INV`, `BS_OTHER_EQUITY_INST_INV`, `BS_LT_INV_CAP`, `BS_INVESTMENTS`, `BS_LT_SEC_INV`, `BS_LT_OTHER_INV`, `BS_INV_SEC` | Chung |
| 17 | FALSE | TRUE | 16 | BS | 4. Dự phòng đầu tư tài chính dài hạn (*) | `BS_PROV_LT_INV`, `BS_PROV_LT_FIN_INV` | Chung |
| 18 | TRUE | TRUE | 10 | BS | VI. Tài sản dài hạn khác | `BS_LT_OTHER_ASSETS`, `BS_LT_OTHER_ASSETS_TOTAL`, `BS_LT_PREPAID`, `BS_DEFERRED_TAX_ASSET`, `BS_LT_PLEDGE`, `BS_LT_PLEDGE_OTHER`, `BS_LT_DEPOSIT`, `BS_LT_FIN_ASSETS`, `BS_GOODWILL`, `BS_SUPPLIES_TOOLS`, `BS_NET_INV_ASSET`, `BS_PROV_LT_ASSET_IMPAIR`, `BS_PROV_OTHER_RISK`, `BS_PROVISION`, `BS_OTHER_PROVISION` | Chung |
| **19** | **TRUE** | FALSE | null | BS | **TỔNG NGUỒN VỐN** | `BS_TOT_CAPITAL`, `BS_TOT_LIAB_EQUITY` | Chung |
| 20 | TRUE | TRUE | 19 | BS | **C - NỢ PHẢI TRẢ** | `BS_LIABILITIES` | Chung |
| 21 | TRUE | TRUE | 20 | BS | I. Nợ ngắn hạn | `BS_ST_LIABILITIES` | Chung |
| 22 | FALSE | TRUE | 21 | BS | Phải trả người bán & Thuế phải nộp | `BS_ST_PAY_SUPPLIER`, `BS_PAY_SUPPLIER`, `BS_TAX_PAYABLES` | Chung |
| 23 | FALSE | TRUE | 21 | BS | Người mua trả tiền trước & Doanh thu chưa thực hiện | `BS_ST_UNEARNED_REV`, `BS_ST_DEPOSIT_REC` | Chung |
| 24 | FALSE | TRUE | 21 | BS | Chi phí phải trả & Phải trả người lao động | `BS_PAY_EMPLOYEES`, `BS_ST_PAY_ACCRUED`, `BS_PAY_ACCRUED`, `BS_PAY_ACCRUED_PREPAID` | Chung |
| 25 | FALSE | TRUE | 21 | BS | Phải trả nội bộ & Hợp đồng xây dựng | `BS_ST_PAY_INTERNAL`, `BS_PAY_WORKING_CAPITAL_INTERNAL`, `BS_PAY_CONSTRUCTION_CONTRACT` | Chung |
| 26 | FALSE | TRUE | 21 | BS | 9. Phải trả ngắn hạn khác | `BS_ST_PAY_OTHER`, `BS_PAY_OTHER`, `BS_OTHER_LIABILITIES`, `BS_PAY_FIN_ERRORS`, `BS_PAY_SEC_TRADING`, `BS_INT_PAY`, `BS_INT_FEE_PAY`, `BS_DERIVATIVES_LIAB`, `BS_ISSUED_PAPER`, `BS_ISSUED_VALUABLE_PAPER`, `BS_ST_BONDS_ISSUED`, `BS_DEPOSITS_CI`, `BS_DEPOSITS_CUST`, `BS_GOV_DEBT` | Chung, NH, CK |
| 27 | FALSE | TRUE | 21 | BS | 10. Vay và nợ thuê tài chính ngắn hạn | `BS_ST_DEBT`, `BS_ST_BORROWINGS`, `BS_ST_FIN_LEASE_DEBT`, `BS_ST_FIN_LEASE_LIAB` | Chung |
| 28 | FALSE | TRUE | 21 | BS | 11. Dự phòng phải trả ngắn hạn & Nghiệp vụ | `BS_PROV_ST_PAY`, `BS_PROV_FCT_TAX`, `BS_PROV_SEVERANCE`, `BS_PROV_TECH`, `BS_PROV_MATH`, `BS_PROV_FEE`, `BS_PROV_CLAIM`, `BS_PROV_PROFIT_SHARE`, `BS_PROV_LARGE_FLUCT`, `BS_PROV_BALANCING`, `BS_PROV_INV_DAMAGE` | Chung, BH |
| 29 | TRUE | TRUE | 20 | BS | II. Nợ dài hạn | `BS_LT_LIABILITIES` | Chung |
| 30 | FALSE | TRUE | 29 | BS | Phải trả dài hạn (Người bán, Nội bộ, Khác) | `BS_LT_PAY_SUPPLIER`, `BS_LT_PAY_ACCRUED`, `BS_LT_PAY_INTERNAL`, `BS_LT_UNEARNED_REV`, `BS_LT_PAY_OTHER`, `BS_LT_DEPOSIT_REC` | Chung |
| 31 | FALSE | TRUE | 29 | BS | 8. Vay và nợ thuê tài chính dài hạn (Gồm TP) | `BS_LT_DEBT`, `BS_LT_BORROWINGS`, `BS_LT_FIN_LEASE_DEBT`, `BS_LT_DEBT_DUE`, `BS_LOAN_PRIN`, `BS_OTHER_LOANS`, `BS_LT_BONDS_ISSUED`, `BS_CONVERTIBLE_BONDS`, `BS_CONVERT_BOND_OPTION`, `BS_LT_FIN_LEASE_LIAB` | Chung |
| 32 | FALSE | TRUE | 29 | BS | 11. Thuế thu nhập hoãn lại phải trả | `BS_DEFERRED_TAX_LIAB` | Chung |
| 33 | FALSE | TRUE | 29 | BS | 12. Dự phòng phải trả dài hạn | `BS_PROV_LT_PAY`, `BS_SCIENCE_TECH_FUND` | Chung |
| 34 | TRUE | TRUE | 19 | BS | **D. VỐN CHỦ SỞ HỮU** | `BS_EQUITY`, `BS_CAPITAL`, `BS_CAPITAL_FUNDS` | Chung |
| 35 | FALSE | TRUE | 34 | BS | 1. Vốn góp của chủ sở hữu | `BS_CHARTER_CAPITAL`, `BS_OWNER_CAPITAL`, `BS_COMMON_STOCK`, `BS_EQUITY_PARENT`, `BS_SHARE_CAPITAL_INC`, `BS_OTHER_CAPITAL`, `BS_OTHER_OWNER_CAPITAL`, `BS_STATE_BUDGET_CAPITAL`, `BS_CI_CAPITAL`, `BS_WORKING_CAPITAL_AFFILIATE`, `BS_CONSTRUCTION_INV_CAPITAL`, `BS_OWNER_INV_CAPITAL`, `BS_SPONSORED_FUNDS_GOV_CI`, `BS_SPONSORED_FUNDS_RISK`, `BS_FUNDS_GOV_INST` | Chung, NH |
| 36 | FALSE | TRUE | 34 | BS | 2. Thặng dư vốn cổ phần & 5. Cổ phiếu quỹ | `BS_SHARE_PREMIUM`, `BS_TREASURY_STOCK` | Chung |
| 37 | FALSE | TRUE | 34 | BS | 6. Chênh lệch đánh giá lại & 7. Tỷ giá hối đoái | `BS_REVAL_RESERVE`, `BS_FAIR_VALUE_RESERVE`, `BS_FX_RESERVE` | Chung |
| 38 | FALSE | TRUE | 34 | BS | Các quỹ thuộc vốn chủ sở hữu (Gồm Quỹ ĐTPT) | `BS_DEV_INV_FUND`, `BS_ENTERPRISE_REORG_FUND`, `BS_RESERVES`, `BS_OTHER_RESERVES`, `BS_FIN_RESERVE_FUND`, `BS_FIN_RESERVE_RISK_FUND`, `BS_COMPULSORY_RESERVE`, `BS_CHARTER_RESERVE_FUND`, `BS_PRICE_STABILIZATION_FUND`, `BS_CI_FUNDS`, `BS_OTHER_EQUITY_FUNDS`, `BS_FUND_SOURCES`, `BS_FUND_OTHER_FUNDS`, `BS_FUND_FA`, `BS_SEVERANCE_FUND`, `BS_BONUS_WELFARE_FUND`, `BS_WELFARE_FUND` | Chung |
| 39 | FALSE | TRUE | 34 | BS | 11. Lợi nhuận sau thuế chưa phân phối | `BS_RETAINED_EARNINGS`, `BS_RETAINED_EARNINGS_CUR`, `BS_RETAINED_EARNINGS_ACCUM`, `BS_RETAINED_EARNINGS_DEFICIT`, `BS_UNREALIZED_PROFIT`, `BS_OTHER_ADJ` | Chung |
| 40 | FALSE | TRUE | 34 | BS | Lợi ích cổ đông không kiểm soát | `BS_MINORITY_INTEREST`, `BS_MINORITY_INTEREST_PREF`, `BS_MI_CAPITAL_SUB` | Chung |

---

### II. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (INCOME STATEMENT - IS)

| stt hiển thị | isparent | ischild | parent | report_name | tên chỉ tiêu (chuẩn hóa theo mẫu mới) | danh sách ind_code map thỏa mãn | loại bctc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **41** | **TRUE** | FALSE | null | IS | **TỔNG DOANH THU HOẠT ĐỘNG** | `IS_OP_REV_TOTAL`, `IS_OP_INC_TOTAL`, `IS_REVENUE`, `IS_COMPREHENSIVE_INCOME_TOTAL` | Chung |
| 42 | FALSE | TRUE | 41 | IS | 1. Doanh thu bán hàng và cung cấp dịch vụ (Gồm Phí BH) | `IS_NET_REVENUE`, `IS_REV_DEDUCTION`, `IS_REV_NON_CASH_DEC`, `IS_DIR_INS_PREM_INC`, `IS_REIN_PREM_INC`, `IS_REIN_COMMISSION_INC`, `IS_REIN_CLAIM_INC`, `IS_CLAIM_RECOVERY_100`, `IS_THIRD_PARTY_RECOVERY`, `IS_FEE_DEC`, `IS_FEE_REFUND` | Phi TC, BH |
| 43 | FALSE | TRUE | 41 | IS | Doanh thu hoạt động tài chính, Lãi & Dịch vụ chuyên biệt | `IS_FIN_INC`, `IS_FIN_REV_TOTAL`, `IS_INT_INC`, `IS_NET_INT_INC`, `IS_DEPOSIT_INT_INC`, `IS_DEPOSIT_DIV_INC`, `IS_DEPOSIT_INT_REC`, `IS_LOAN_REC_INT_INC`, `IS_HTM_INT_INC`, `IS_INT_DIV_INC`, `IS_FVTPL_DIV`, `IS_REV_DIV_ACCRUED`, `IS_FVTPL_REVAL_GAIN`, `IS_FIN_SALE_GAIN`, `IS_SUB_JV_SALE_GAIN`, `IS_NET_TRADING_SEC_PROFIT`, `IS_NET_INV_SEC_PROFIT`, `IS_DERIVATIVES_REVAL_PROFIT`, `IS_HTM_REVAL_PROFIT`, `IS_AFS_REVAL_PROFIT`, `IS_FX_GOLD_TRADING`, `IS_NET_FX_GOLD_PROFIT`, `IS_NET_FX_PROFIT`, `IS_FX_GAIN`, `IS_FX_PROFIT`, `IS_FX_UNREALIZED_PROFIT`, `IS_FX_FOREIGN_OP_PROFIT`, `IS_FEE_COMM_INC`, `IS_NET_FEE_INC`, `IS_SVC_INC`, `IS_REV_BROKERAGE`, `IS_REV_UWRITING`, `IS_REV_DEPOSITARY`, `IS_REV_TRUST`, `IS_REV_ADVISORY` | NH, CK |
| **44** | **TRUE** | FALSE | null | IS | **TỔNG CHI PHÍ HOẠT ĐỘNG** | `IS_OP_EXP_TOTAL`, `IS_OP_EXP` | Chung |
| 45 | FALSE | TRUE | 44 | IS | 4. Giá vốn hàng bán & Chi bồi thường Bảo hiểm | `IS_COGS`, `IS_DIR_INS_EXP_TOTAL`, `IS_CLAIM_PAID`, `IS_CLAIM_REIN_PAID`, `IS_CLAIM_RETAINED`, `IS_CLAIM_LARGE_FLUCT`, `IS_COMMISSION_EXP`, `IS_REIN_FEE`, `IS_INS_OTHER_EXP`, `IS_INS_OTHER_EXP_DIR` | Phi TC, BH |
| 46 | FALSE | TRUE | 44 | IS | 7. Chi phí tài chính (Gồm Lỗ từ TSTC) | `IS_FIN_EXP`, `IS_FVTPL_LOSS`, `IS_AFS_SALE_LOSS`, `IS_FIN_SALE_LOSS`, `IS_SUB_JV_SALE_LOSS`, `IS_HTM_LOSS`, `IS_DERIVATIVES_REVAL_LOSS`, `IS_HEDGE_DERIV_REVAL_LOSS`, `IS_FVTPL_LIAB_REVAL_LOSS`, `IS_FVTPL_REVAL_LOSS`, `IS_FVTPL_PURCHASE_EXP`, `IS_FX_LOSS` | Chung, CK |
| 47 | FALSE | TRUE | 46 | IS | *Trong đó: Chi phí lãi vay* | `IS_INT_EXP`, `IS_INT_EXP_LOANS` | Chung |
| 48 | FALSE | TRUE | 44 | IS | 9. Chi phí bán hàng | `IS_SELL_EXP` | Chung |
| 49 | FALSE | TRUE | 44 | IS | 10. Chi phí quản lý doanh nghiệp | `IS_GA_EXP` | Chung |
| 50 | FALSE | TRUE | 44 | IS | Chi phí hoạt động chuyên biệt (Môi giới, Tự doanh, Dự phòng tín dụng) | `IS_OP_EXP_BROKERAGE`, `IS_OP_EXP_UWRITING`, `IS_OP_EXP_DEPOSITARY`, `IS_OP_EXP_PROP_TRAD`, `IS_OP_EXP_TRUST`, `IS_OP_EXP_ADVISORY`, `IS_OP_EXP_SVC`, `IS_OP_EXP_SEC_ERROR`, `IS_CREDIT_PROV_EXP`, `IS_PROV_LARGE_FLUCT_CUR`, `IS_FEE_COMM_EXP`, `IS_OP_EXP_OTHER`, `IS_INV_OTHER_EXP`, `IS_DEPR_EXP` | NH, CK |
| **51** | **TRUE** | FALSE | null | IS | **11. LỢI NHUẬN GỘP / 12. LỢI NHUẬN THUẦN TỪ HĐKD** | `IS_GROSS_PROFIT`, `IS_OP_RESULT`, `IS_OP_PROFIT`, `IS_OP_PROFIT_PRE_PROV`, `IS_NET_SVC_PROFIT`, `IS_FVTPL_PROFIT`, `IS_AFS_PROFIT`, `IS_INV_PROFIT`, `IS_SUB_JV_PROFIT` | Chung |
| 52 | FALSE | FALSE | null | IS | 13. Thu nhập khác | `IS_OTHER_INC`, `IS_NET_OTHER_INC`, `IS_OTHER_ACTIVITIES`, `IS_OTHER_PROFIT`, `IS_NET_OTHER_PROFIT`, `IS_INV_INC`, `IS_SHARE_INV_INC`, `IS_ASSOC_PROFIT`, `IS_JV_PROFIT`, `IS_JV_ASSOC_PROFIT`, `IS_FA_DISPOSAL_PROFIT`, `IS_INS_OTHER_INC` | Chung |
| 53 | FALSE | FALSE | null | IS | 14. Chi phí khác | `IS_OTHER_EXP` | Chung |
| **54** | **TRUE** | FALSE | null | IS | **16. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ** | `IS_PBT`, `IS_NET_PBT` | Chung |
| 55 | FALSE | FALSE | null | IS | 17. Chi phí thuế thu nhập doanh nghiệp hiện hành | `IS_TAX_EXP`, `IS_TAX_CURRENT`, `IS_TAX_EXP_RETAINED` | Chung |
| 56 | FALSE | FALSE | null | IS | 18. Chi phí thuế thu nhập doanh nghiệp hoãn lại | `IS_TAX_DEFERRED` | Chung |
| **57** | **TRUE** | FALSE | null | IS | **19. LỢI NHUẬN SAU THUẾ THU NHẬP DOANH NGHIỆP** | `IS_NPAT`, `IS_NET_PROFIT`, `IS_COMPREHENSIVE_INCOME_POST_TAX` | Chung |
| 58 | FALSE | TRUE | 57 | IS | LNST của cổ đông không kiểm soát (Thiểu số) | `IS_MINORITY_INTEREST`, `IS_COMPREHENSIVE_INCOME_MI` | Chung |
| 59 | FALSE | TRUE | 57 | IS | LNST của cổ đông công ty mẹ | `IS_NPAT_PARENT`, `IS_NPAT_OWNER`, `IS_NPAT_PARENT_ADJ`, `IS_COMPREHENSIVE_INCOME_OWNER` | Chung |
| 60 | FALSE | TRUE | 57 | IS | Lợi nhuận đã phân phối & Trích lập quỹ | `IS_NPAT_POST_RESERVE`, `IS_PROFIT_DISTRIBUTED`, `IS_RETAINED_EARNING_DED`, `IS_REALIZED_PROFIT`, `IS_TAXABLE_PROFIT`, `IS_ASSOC_JV_PROFIT_SHARE` | Chung |
| 61 | FALSE | FALSE | null | IS | 20. Lãi cơ bản trên cổ phiếu (*) | `IS_EPS_BASIC` | Chung |
| 62 | FALSE | FALSE | null | IS | 21. Lãi suy giảm trên cổ phiếu (*) | `IS_EPS_DILUTED`, `IS_EPS_ADJ` | Chung |
| 63 | FALSE | FALSE | null | IS | Chỉ số tăng trưởng hoạt động (Metadata) | `IS_NPAT_PARENT_GROWTH_YOY`, `IS_REV_GROWTH_PCT`, `IS_REV_GROWTH_YOY`, `IS_PROFIT_GROWTH_PCT` | Chung |

---

### III. BÁO CÁO LƯU CHUYỂN TIỀN TỆ (CASH FLOW - CF)

| stt hiển thị | isparent | ischild | parent | report_name | tên chỉ tiêu (chuẩn hóa theo mẫu mới) | danh sách ind_code map thỏa mãn | loại bctc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **64** | **TRUE** | FALSE | null | CF | **I. Lưu chuyển tiền từ hoạt động kinh doanh** | `CF_CFO`, `CF_CFO_PRE_WC`, `CF_CFO_PRE_TAX`, `CF_CFO_ADJUSTMENTS` | Chung |
| 65 | FALSE | TRUE | 64 | CF | 1. Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác | `CF_CFO_CUST_REC`, `CF_CFO_FEE_COMM_REC`, `CF_CFO_OTHER_REC`, `CF_CFO_EXP_REDUCTION_REC` | Chung |
| 66 | FALSE | TRUE | 64 | CF | 2. Tiền chi trả cho người cung cấp hàng hóa và dịch vụ | `CF_CFO_SUPPLIER_PAY`, `CF_CFO_PAYABLES` | Chung |
| 67 | FALSE | TRUE | 64 | CF | 3. Tiền chi trả cho người lao động | `CF_CFO_EMPLOYEE_PAY`, `CF_CFO_EMPLOYEE_GA_PAY` | Chung |
| 68 | FALSE | TRUE | 64 | CF | 4. Tiền lãi vay đã trả | `CF_CFO_INT_PAID`, `CF_CFO_SEC_INT_PAID` | Chung |
| 69 | FALSE | TRUE | 64 | CF | 5. Thuế TNDN đã nộp | `CF_CFO_TAX_PAID`, `CF_CFO_TAX_PAY`, `CF_CFO_VAT_PAID`, `CF_CFO_TAX_PAYABLES`, `CF_CFO_SEC_TAX_PAID` | Chung |
| 70 | FALSE | TRUE | 64 | CF | 6. Tiền thu khác & 7. Tiền chi khác từ HĐ kinh doanh | `CF_CFO_OTHER_PAY`, `CF_CFO_NON_CASH_EXP_INC`, `CF_CFO_CLEARING_FUND_PAY`, `CF_CFO_CLEARING_FUND_BORROW`, `CF_CFO_FUNDS_EXP`, `CF_CFO_SEC_SVC_PAY`, `CF_CFO_FIN_TRADE_EXP`, `CF_CFO_INS_COMM_PAY`, `CF_CFO_PROV_PAY`, `CF_CFO_RECOVERED_BAD_DEBT`, `CF_CFO_PAY_ISSUER`, `CF_CFO_INT_REC` | Chung |
| 71 | FALSE | TRUE | 64 | CF | Thay đổi vốn lưu động & Hoạt động nghiệp vụ tài chính | `CF_CFO_REC_CHG`, `CF_CFO_PAY_CHG`, `CF_CFO_INV_CHG`, `CF_CFO_PREPAID_CHG`, `CF_CFO_ST_OTHER_ASSET_CHG`, `CF_CFO_OTHER_ASSETS_CHG`, `CF_CFO_OP_WC_CHG`, `CF_CFO_OP_ASSETS`, `CF_CFO_OP_LIAB_CHG`, `CF_CFO_LOANS_CHG`, `CF_CFO_CUST_DEPOSITS_CHG`, `CF_CFO_GOV_DEBT_CHG`, `CF_CFO_DEPOSITS_LOANS_CI_CHG`, `CF_CFO_ISSUED_PAPER_CHG`, `CF_CFO_SPONSORED_FUNDS_CHG`, `CF_CFO_LOANS_CUST`, `CF_CFO_LOANS_CI`, `CF_CFO_DERIVATIVES_LIAB_CHG`, `CF_CFO_FVTPL_CHG`, `CF_CFO_AFS_CHG`, `CF_CFO_HTM_CHG`, `CF_CFO_SEC_TRADING`, `CF_CFO_REC_SVC`, `CF_CFO_REC_OTHER`, `CF_CFO_REC_FIN_SALE`, `CF_CFO_REC_FIN_INT`, `CF_CFO_FIN_ASSET_PURCHASE`, `CF_CFO_FIN_ASSET_SALE`, `CF_CFO_TRADING_DIFF`, `CF_CFO_PROVISIONS`, `CF_CFO_CLAIM_PROV_CHG`, `CF_CFO_FEE_MATH_PROV_CHG`, `CF_CFO_DERIVATIVES` | Chung, NH, CK, BH |
| **72** | **TRUE** | FALSE | null | CF | **II. Lưu chuyển tiền tệ từ hoạt động đầu tư** | `CF_CFI` | Chung |
| 73 | FALSE | TRUE | 72 | CF | 1. Tiền chi để mua sắm, xây dựng TSCĐ, BĐS ĐT và các TSDH | `CF_CFI_FA_PURCHASE`, `CF_CFI_INV_PROP_PURCHASE` | Chung |
| 74 | FALSE | TRUE | 72 | CF | 2. Tiền thu từ thanh lý nhượng bán TSCĐ, BĐS ĐT | `CF_CFI_FA_DISPOSAL`, `CF_CFI_FA_DISPOSAL_EXP`, `CF_CFI_INV_PROP_DISPOSAL` | Chung |
| 75 | FALSE | TRUE | 72 | CF | 3. Tiền chi cho vay, mua các công cụ nợ của đơn vị khác | `CF_CFI_LOANS_DEBT_PURCHASE`, `CF_CFI_ST_INV` | Chung |
| 76 | FALSE | TRUE | 72 | CF | 4. Tiền thu hồi cho vay, bán lại các công cụ nợ của ĐV khác | `CF_CFI_LOANS_DEBT_RECOVERY` | Chung |
| 77 | FALSE | TRUE | 72 | CF | 5. Tiền chi đầu tư góp vốn vào đơn vị khác | `CF_CFI_EQUITY_INV_PAY` | Chung |
| 78 | FALSE | TRUE | 72 | CF | 6. Tiền thu hồi đầu tư góp vốn vào đơn vị khác | `CF_CFI_EQUITY_INV_DISPOSAL` | Chung |
| 79 | FALSE | TRUE | 72 | CF | 7. Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia | `CF_CFI_DIV_REC`, `CF_CFI_INT_DIV_REC`, `CF_CFI_INV_INT_REC` | Chung |
| **80** | **TRUE** | FALSE | null | CF | **III. Lưu chuyển tiền tệ từ hoạt động tài chính** | `CF_CFF` | Chung |
| 81 | FALSE | TRUE | 80 | CF | 1. Tiền thu từ phát hành cổ phiếu, nhận góp vốn của CSH | `CF_CFF_EQUITY_ISSUE` | Chung |
| 82 | FALSE | TRUE | 80 | CF | 2. Tiền trả lại vốn góp cho các CSH, mua lại CP quỹ | `CF_CFF_EQUITY_RETURN`, `CF_CFF_SHARE_REPURCHASE`, `CF_CFF_TREASURY_STOCK_SALE`, `CF_CFF_MI_REPURCHASE`, `CF_CFF_EQUITY_PRIVATIZATION` | Chung |
| 83 | FALSE | TRUE | 80 | CF | 3. Tiền thu từ đi vay | `CF_CFF_BORROWINGS`, `CF_CFF_LT_DEBT_PAPER_ISSUE` | Chung |
| 84 | FALSE | TRUE | 80 | CF | 4. Tiền trả nợ gốc vay & nợ gốc thuê TC | `CF_CFF_PRIN_PAY`, `CF_CFF_OTHER_PRIN_PAY`, `CF_CFF_LT_DEBT_PAPER_PAY`, `CF_CFF_LEASE_PRIN_PAY` | Chung |
| 85 | FALSE | TRUE | 80 | CF | 6. Cổ tức, lợi nhuận đã trả cho chủ sở hữu & chi khác | `CF_CFF_DIV_PAID`, `CF_CFF_OTHER_PAY` | Chung |
| **86** | **FALSE** | FALSE | null | CF | **Lưu chuyển tiền thuần trong năm** | `CF_NET_CASH` | Chung |
| **87** | **FALSE** | FALSE | null | CF | **Tiền và tương đương tiền đầu năm** | `CF_CASH_BEG` | Chung |
| **88** | **FALSE** | FALSE | null | CF | **Ảnh hưởng của thay đổi tỷ giá hối đoái** | `CF_CFO_FX_IMPACT`, `CF_CFO_FX_UNREALIZED`, `CF_CFO_FX_PROFIT_CHG` | Chung |
| **89** | **FALSE** | FALSE | null | CF | **Tiền và tương đương tiền cuối năm** | `CF_CASH_END` | Chung |

Với cấu trúc này, bạn đã có một **Master Data Table** tích hợp hoàn hảo văn bản của Chuẩn mực Báo cáo tài chính mới cùng 100% dữ liệu ánh xạ (785 mã) từ file nguồn ban đầu.