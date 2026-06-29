Dựa trên danh sách và thứ tự bạn yêu cầu, dưới đây là bảng cấu trúc chi tiết dành cho khối doanh nghiệp thông thường (Phi tài chính).

### I. BẢNG CÂN ĐỐI KẾ TOÁN (BALANCE SHEET - BS)

| stt hiển thị | isparent | ischild | parent | report_name | tên chỉ tiêu (chuẩn hóa theo mẫu mới) | danh sách ind_code map thỏa mãn | loại bctc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **TRUE** | FALSE | null | BS | **TÀI SẢN** | `BS_TOT_ASSET` | Phi TC, CK |
| 2 | TRUE | TRUE | 1 | BS | **A. Tài sản lưu động và đầu tư ngắn hạn** | `BS_CUR_ASSETS`, `BS_CUR_ASSETS_ST_INV` | Phi TC, CK |
| 3 | TRUE | TRUE | 2 | BS | I. Tiền và các khoản tương đương tiền | `BS_CASH_EQ` | Phi TC, CK |
| 4 | FALSE | TRUE | 3 | BS | * Tiền | `BS_CASH` | Phi TC, CK |
| 5 | FALSE | TRUE | 3 | BS | * Các khoản tương đương tiền | `BS_CASH_EQ` | Phi TC, CK |
| 6 | TRUE | TRUE | 2 | BS | II. Các khoản đầu tư tài chính ngắn hạn | `BS_ST_INV` | Phi TC, CK |
| 7 | FALSE | TRUE | 6 | BS | * Chứng khoán kinh doanh | `BS_TRADING_SEC` | Phi TC, CK |
| 8 | FALSE | TRUE | 6 | BS | * Dự phòng giảm giá chứng khoán kinh doanh | `BS_PROV_TRADING_SEC` | Phi TC, CK |
| 9 | FALSE | TRUE | 6 | BS | * Đầu tư nắm giữ đến ngày đáo hạn | `BS_HTM_SEC` | Phi TC, CK |
| 10 | TRUE | TRUE | 2 | BS | III. Các khoản phải thu ngắn hạn | `BS_ST_REC`, `BS_REC` | Phi TC, CK |
| 11 | FALSE | TRUE | 10 | BS | * Phải thu ngắn hạn của khách hàng | `BS_ST_REC_CUST`, `BS_REC_CUST` | Phi TC, CK |
| 12 | FALSE | TRUE | 10 | BS | * Trả trước cho người bán | `BS_PREPAID_SUPP` | Phi TC, CK |
| 13 | FALSE | TRUE | 10 | BS | * Phải thu nội bộ ngắn hạn | `BS_ST_REC_INTERNAL`, `BS_REC_INTERNAL` | Phi TC, CK |
| 14 | FALSE | TRUE | 10 | BS | * Phải thu theo tiến độ hợp đồng xây dựng | `BS_REC_CONSTRUCTION_CONTRACT` | Phi TC, CK |
| 15 | FALSE | TRUE | 10 | BS | * Phải thu về cho vay ngắn hạn | `BS_ST_REC_LOANS` | Phi TC, CK |
| 16 | FALSE | TRUE | 10 | BS | * Phải thu ngắn hạn khác | `BS_ST_OTHER_REC`, `BS_OTHER_REC` | Phi TC, CK |
| 17 | FALSE | TRUE | 10 | BS | * Dự phòng phải thu ngắn hạn khó đòi | `BS_PROV_ST_DOUBTFUL_DEBT`, `BS_PROV_DOUBTFUL_DEBT` | Phi TC, CK |
| 18 | TRUE | TRUE | 2 | BS | IV. Tổng hàng tồn kho | `BS_INVENTORY` | Phi TC, CK |
| 19 | FALSE | TRUE | 18 | BS | * Hàng tồn kho | `BS_INVENTORY` | Phi TC, CK |
| 20 | FALSE | TRUE | 18 | BS | * Dự phòng giảm giá hàng tồn kho | `BS_PROV_INV` | Phi TC, CK |
| 21 | TRUE | TRUE | 2 | BS | V. Tài sản ngắn hạn khác | `BS_ST_OTHER_ASSETS` | Phi TC, CK |
| 22 | FALSE | TRUE | 21 | BS | * Chi phí trả trước ngắn hạn | `BS_ST_PREPAID` | Phi TC, CK |
| 23 | FALSE | TRUE | 21 | BS | * Thuế giá trị gia tăng được khấu trừ | `BS_DEDUCTIBLE_VAT` | Phi TC, CK |
| 24 | FALSE | TRUE | 21 | BS | * Thuế và các khoản phải thu Nhà nước | `BS_TAX_REC` | Phi TC, CK |
| 25 | FALSE | TRUE | 21 | BS | * Giao dịch mua bán lại trái phiếu chính phủ | `BS_REPO_GOV_BOND` | Phi TC, CK |
| 26 | FALSE | TRUE | 21 | BS | * Tài sản ngắn hạn khác | `BS_ST_OTHER_ASSETS` | Phi TC, CK |
| 27 | TRUE | TRUE | 1 | BS | **TÀI SẢN DÀI HẠN** | `BS_NONCUR_ASSETS` | Phi TC, CK |
| 28 | TRUE | TRUE | 27 | BS | I. Các khoản phải thu dài hạn | `BS_LT_REC` | Phi TC, CK |
| 29 | FALSE | TRUE | 28 | BS | * Phải thu dài hạn của khách hàng | `BS_LT_REC_CUST` | Phi TC, CK |
| 30 | FALSE | TRUE | 28 | BS | * Vốn kinh doanh tại các đơn vị trực thuộc | `BS_WORKING_CAPITAL_AFFILIATE` | Phi TC, CK |
| 31 | FALSE | TRUE | 28 | BS | * Phải thu dài hạn nội bộ | `BS_LT_REC_INTERNAL` | Phi TC, CK |
| 32 | FALSE | TRUE | 28 | BS | * Phải thu về cho vay dài hạn | `BS_LT_REC_LOANS` | Phi TC, CK |
| 33 | FALSE | TRUE | 28 | BS | * Phải thu dài hạn khác | `BS_LT_OTHER_REC` | Phi TC, CK |
| 34 | FALSE | TRUE | 28 | BS | * Dự phòng phải thu dài hạn khó đòi | `BS_PROV_LT_DOUBTFUL_DEBT` | Phi TC, CK |
| 35 | TRUE | TRUE | 27 | BS | II. Tài sản cố định | `BS_FA` | Phi TC, CK |
| 36 | FALSE | TRUE | 35 | BS | * Tài sản cố định hữu hình | `BS_TANGIBLE_FA` | Phi TC, CK |
| 37 | FALSE | TRUE | 35 | BS | * Tài sản cố định thuê tài chính | `BS_FIN_LEASE_FA` | Phi TC, CK |
| 38 | FALSE | TRUE | 35 | BS | * Tài sản cố định vô hình | `BS_INTANGIBLE_FA` | Phi TC, CK |
| 39 | TRUE | TRUE | 27 | BS | III. Bất động sản đầu tư | `BS_INV_PROP` | Phi TC, CK |
| 40 | FALSE | TRUE | 39 | BS | * Nguyên giá | `BS_HISTORICAL_COST` | Phi TC, CK |
| 41 | FALSE | TRUE | 39 | BS | * Giá trị hao mòn lũy kế | `BS_ACCUM_DEPR` | Phi TC, CK |
| 42 | TRUE | TRUE | 27 | BS | IV. Tài sản dở dang dài hạn | `BS_LT_WIP` | Phi TC, CK |
| 43 | FALSE | TRUE | 42 | BS | * Chi phí sản xuất kinh doanh dở dang dài hạn | `BS_LT_WIP` | Phi TC, CK |
| 44 | FALSE | TRUE | 42 | BS | * Chi phí xây dựng cơ bản dở dang | `BS_WIP_CONSTRUCTION` | Phi TC, CK |
| 45 | TRUE | TRUE | 27 | BS | V. Các khoản đầu tư tài chính dài hạn | `BS_LT_INV` | Phi TC, CK |
| 46 | FALSE | TRUE | 45 | BS | * Đầu tư vào công ty con | `BS_SUB_INV` | Phi TC, CK |
| 47 | FALSE | TRUE | 45 | BS | * Đầu tư vào công ty liên kết liên doanh | `BS_JV_ASSOC_INV`, `BS_JV_INV`, `BS_ASSOC_INV` | Phi TC, CK |
| 48 | FALSE | TRUE | 45 | BS | * Đầu tư khác vào công cụ vốn | `BS_OTHER_EQUITY_INST_INV` | Phi TC, CK |
| 49 | FALSE | TRUE | 45 | BS | * Dự phòng giảm giá đầu tư tài chính dài hạn | `BS_PROV_LT_FIN_INV`, `BS_PROV_LT_INV` | Phi TC, CK |
| 50 | FALSE | TRUE | 45 | BS | * Đầu tư nắm giữ đến ngày đáo hạn | `BS_HTM_SEC` | Phi TC, CK |
| 51 | TRUE | TRUE | 27 | BS | VI. Tổng tài sản dài hạn khác | `BS_LT_OTHER_ASSETS_TOTAL`, `BS_LT_OTHER_ASSETS` | Phi TC, CK |
| 52 | FALSE | TRUE | 51 | BS | * Chi phí trả trước dài hạn | `BS_LT_PREPAID` | Phi TC, CK |
| 53 | FALSE | TRUE | 51 | BS | * Tài sản thuế thu nhập hoãn lại | `BS_DEFERRED_TAX_ASSET` | Phi TC, CK |
| 54 | FALSE | TRUE | 51 | BS | * Tài sản dài hạn khác | `BS_LT_OTHER_ASSETS` | Phi TC, CK |
| 55 | FALSE | TRUE | 27 | BS | VII. Lợi thế thương mại | `BS_GOODWILL` | Phi TC, CK |
| **56** | **TRUE** | FALSE | null | BS | **TỔNG CỘNG TÀI SẢN** | `BS_TOT_ASSET` | Phi TC, CK |
| **57** | **TRUE** | FALSE | null | BS | **NGUỒN VỐN** | `BS_TOT_CAPITAL` | Phi TC, CK |
| 58 | TRUE | TRUE | 57 | BS | **A. Nợ phải trả** | `BS_LIABILITIES` | Phi TC, CK |
| 59 | TRUE | TRUE | 58 | BS | I. Nợ ngắn hạn | `BS_ST_LIABILITIES` | Phi TC, CK |
| 60 | FALSE | TRUE | 59 | BS | * Vay và nợ thuê tài chính ngắn hạn | `BS_ST_FIN_LEASE_DEBT` | Phi TC, CK |
| 61 | FALSE | TRUE | 59 | BS | * Vay và nợ dài hạn đến hạn phải trả | `BS_LT_DEBT_DUE` | Phi TC, CK |
| 62 | FALSE | TRUE | 59 | BS | * Phải trả người bán ngắn hạn | `BS_ST_PAY_SUPPLIER`, `BS_PAY_SUPPLIER` | Phi TC, CK |
| 63 | FALSE | TRUE | 59 | BS | * Người mua trả tiền trước | `BS_ADVANCES_CUST` | Phi TC, CK |
| 64 | FALSE | TRUE | 59 | BS | * Thuế và các khoản phải nộp Nhà nước | `BS_TAX_PAYABLES` | Phi TC, CK |
| 65 | FALSE | TRUE | 59 | BS | * Phải trả người lao động | `BS_PAY_EMPLOYEES` | Phi TC, CK |
| 66 | FALSE | TRUE | 59 | BS | * Chi phí phải trả ngắn hạn | `BS_ST_PAY_ACCRUED`, `BS_PAY_ACCRUED` | Phi TC, CK |
| 67 | FALSE | TRUE | 59 | BS | * Phải trả nội bộ ngắn hạn | `BS_ST_PAY_INTERNAL` | Phi TC, CK |
| 68 | FALSE | TRUE | 59 | BS | * Phải trả theo tiến độ kế hoạch hợp đồng xây dựng | `BS_PAY_CONSTRUCTION_CONTRACT` | Phi TC, CK |
| 69 | FALSE | TRUE | 59 | BS | * Doanh thu chưa thực hiện ngắn hạn | `BS_ST_UNEARNED_REV` | Phi TC, CK |
| 70 | FALSE | TRUE | 59 | BS | * Phải trả ngắn hạn khác | `BS_ST_PAY_OTHER`, `BS_PAY_OTHER` | Phi TC, CK |
| 71 | FALSE | TRUE | 59 | BS | * Dự phòng phải trả ngắn hạn | `BS_PROV_ST_PAY` | Phi TC, CK |
| 72 | FALSE | TRUE | 59 | BS | * Quỹ khen thưởng phúc lợi | `BS_BONUS_WALFARE_FUND` | Phi TC, CK |
| 73 | FALSE | TRUE | 59 | BS | * Quỹ bình ổn giá | `BS_PRICE_STABILIZATION_FUND` | Phi TC, CK |
| 74 | FALSE | TRUE | 59 | BS | * Giao dịch mua bán lại trái phiếu chính phủ | `BS_REPO_GOV_BOND` | Phi TC, CK |
| 75 | TRUE | TRUE | 58 | BS | II. Nợ dài hạn | `BS_LT_LIABILITIES` | Phi TC, CK |
| 76 | FALSE | TRUE | 75 | BS | * Phải trả người bán dài hạn | `BS_LT_PAY_SUPPLIER` | Phi TC, CK |
| 77 | FALSE | TRUE | 75 | BS | * Chi phí phải trả dài hạn | `BS_LT_PAY_ACCRUED` | Phi TC, CK |
| 78 | FALSE | TRUE | 75 | BS | * Phải trả nội bộ về vốn kinh doanh | `BS_PAY_WORKING_CAPITAL_INTERNAL` | Phi TC, CK |
| 79 | FALSE | TRUE | 75 | BS | * Phải trả nội bộ dài hạn | `BS_LT_PAY_INTERNAL` | Phi TC, CK |
| 80 | FALSE | TRUE | 75 | BS | * Phải trả dài hạn khác | `BS_LT_OTHER_PAY` | Phi TC, CK |
| 81 | FALSE | TRUE | 75 | BS | * Vay và nợ thuê tài chính dài hạn | `BS_LT_FIN_LEASE_DEBT`, `BS_LT_DEBT` | Phi TC, CK |
| 82 | FALSE | TRUE | 75 | BS | * Trái phiếu chuyển đổi | `BS_CONVERTIBLE_BONDS` | Phi TC, CK |
| 83 | FALSE | TRUE | 75 | BS | * Thuế thu nhập hoãn lại phải trả | `BS_DEFERRED_TAX_LIAB` | Phi TC, CK |
| 84 | FALSE | TRUE | 75 | BS | * Dự phòng trợ cấp mất việc làm | `BS_PROV_SEVERANCE`, `BS_SEVERANCE_FUND` | Phi TC, CK |
| 85 | FALSE | TRUE | 75 | BS | * Dự phòng phải trả dài hạn | `BS_PROV_LT_PAY` | Phi TC, CK |
| 86 | FALSE | TRUE | 75 | BS | * Doanh thu chưa thực hiện dài hạn | `BS_LT_UNEARNED_REV` | Phi TC, CK |
| 87 | FALSE | TRUE | 75 | BS | * Quỹ phát triển khoa học và công nghệ | `BS_SCIENCE_TECH_FUND` | Phi TC, CK |
| 88 | TRUE | TRUE | 57 | BS | **VỐN CHỦ SỞ HỮU** | `BS_EQUITY` | Phi TC, CK |
| 89 | TRUE | TRUE | 88 | BS | **B. Nguồn vốn chủ sở hữu** | `BS_EQUITY` | Phi TC, CK |
| 90 | TRUE | TRUE | 89 | BS | I. Vốn chủ sở hữu | `BS_EQUITY` | Phi TC, CK |
| 91 | FALSE | TRUE | 90 | BS | * Vốn đầu tư của chủ sở hữu | `BS_OWNER_INV_CAPITAL`, `BS_OWNER_CAPITAL` | Phi TC, CK |
| 92 | FALSE | TRUE | 90 | BS | * Thặng dư vốn cổ phần | `BS_SHARE_PREMIUM` | Phi TC, CK |
| 93 | FALSE | TRUE | 90 | BS | * Quyền chọn chuyển đổi trái phiếu | `BS_CONVERT_BOND_OPTION` | Phi TC, CK |
| 94 | FALSE | TRUE | 90 | BS | * Vốn khác của chủ sở hữu | `BS_OTHER_OWNER_CAPITAL`, `BS_OTHER_CAPITAL` | Phi TC, CK |
| 95 | FALSE | TRUE | 90 | BS | * Cổ phiếu quỹ | `BS_TREASURY_STOCK` | Phi TC, CK |
| 96 | FALSE | TRUE | 90 | BS | * Chênh lệch đánh giá lại tài sản | `BS_REVAL_RESERVE` | Phi TC, CK |
| 97 | FALSE | TRUE | 90 | BS | * Chênh lệch tỷ giá hối đoái | `BS_FX_RESERVE` | Phi TC, CK |
| 98 | FALSE | TRUE | 90 | BS | * Quỹ đầu tư phát triển | `BS_DEV_INV_FUND` | Phi TC, CK |
| 99 | FALSE | TRUE | 90 | BS | * Quỹ dự phòng tài chính | `BS_FIN_RESERVE_FUND`, `BS_FIN_RESERVE_RISK_FUND` | Phi TC, CK |
| 100 | FALSE | TRUE | 90 | BS | * Quỹ khác thuộc vốn chủ sở hữu | `BS_OTHER_EQUITY_FUNDS`, `BS_OTHER_RESERVES` | Phi TC, CK |
| 101 | FALSE | TRUE | 90 | BS | * Lợi nhuận sau thuế chưa phân phối | `BS_RETAINED_EARNINGS`, `BS_RETAINED_EARNINGS_CUR` | Phi TC, CK |
| 102 | FALSE | TRUE | 90 | BS | * Nguồn vốn đầu tư xây dựng cơ bản | `BS_CAPITAL_CONSTRUCTION` | Phi TC, CK |
| 103 | FALSE | TRUE | 90 | BS | * Quỹ hỗ trợ sắp xếp doanh nghiệp | `BS_ENTERPRISE_REORG_FUND` | Phi TC, CK |
| 104 | FALSE | TRUE | 90 | BS | * Lợi ích của cổ đông không kiểm soát | `BS_MINORITY_INTEREST` | Phi TC, CK |
| 105 | TRUE | TRUE | 89 | BS | II. Nguồn kinh phí và quỹ khác | `BS_FUND_OTHER_FUNDS` | Phi TC, CK |
| 106 | FALSE | TRUE | 105 | BS | * Nguồn kinh phí | `BS_FUND_SOURCES` | Phi TC, CK |
| 107 | FALSE | TRUE | 105 | BS | * Nguồn kinh phí đã hình thành tài sản cố định | `BS_FUND_FA` | Phi TC, CK |
| 108 | FALSE | TRUE | 105 | BS | * Quỹ dự phòng trợ cấp mất việc làm | `BS_SEVERANCE_FUND` | Phi TC, CK |
| **109** | **TRUE** | FALSE | null | BS | **TỔNG CỘNG NGUỒN VỐN** | `BS_TOT_CAPITAL`, `BS_TOT_LIAB_EQUITY` | Phi TC, CK |
| 121 | TRUE | FALSE | null | BS | TÀI SẢN | `BS_TOT_ASSET` | NH |
| 122 | FALSE | TRUE | 121 | BS | I. Tiền mặt chứng từ có giá trị ngoại tệ kim loại quý đá quý | `BS_CASH_AND_VALUABLES`, `BS_CASH`, `BS_CASH_ON_HAND` | NH |
| 123 | FALSE | TRUE | 121 | BS | II. Tiền gửi tại NHNN | `BS_BAL_SBV` | NH |
| 124 | FALSE | TRUE | 121 | BS | III. Tín phiếu kho bạc và các giấy tờ có giá ngắn hạn đủ tiêu chuẩn khác | `BS_TREASURY_BILLS` | NH |
| 125 | FALSE | TRUE | 121 | BS | IV. Tiền vàng gửi tại các TCTD khác và cho vay các TCTD khác | `BS_DEPOSITS_LOANS_CI` | NH |
| 126 | FALSE | TRUE | 121 | BS | * Tiền Vàng gửi tại các TCTD khác | `BS_DEPOSITS_CI` | NH |
| 127 | FALSE | TRUE | 121 | BS | * Cho vay các TCTD khác | `BS_LOANS_CI` | NH |
| 128 | FALSE | TRUE | 121 | BS | * Dự phòng rủi ro cho vay các TCTD khác | `BS_PROV_LOANS_CI` | NH |
| 129 | FALSE | TRUE | 121 | BS | V. Chứng khoán kinh doanh | `BS_TRADING_SEC`, `BS_NET_TRADING_SEC` | NH |
| 130 | FALSE | TRUE | 121 | BS | * Chứng khoán kinh doanh | `BS_TRADING_SEC` | NH |
| 131 | FALSE | TRUE | 121 | BS | * Dự phòng giảm giá chứng khoán kinh doanh | `BS_PROV_TRADING_SEC` | NH |
| 132 | FALSE | TRUE | 121 | BS | VI. Các công cụ tài chính phái sinh và các tài sản tài chính khác | `BS_FVTPL_ASSET`, `BS_DERIVATIVES_ASSET` | NH |
| 133 | FALSE | TRUE | 121 | BS | VII. Cho vay khách hàng | `BS_LOANS_CUST`, `BS_NET_LOANS_CUST` | NH |
| 134 | FALSE | TRUE | 121 | BS | * Cho vay khách hàng | `BS_LOANS_CUST` | NH |
| 135 | FALSE | TRUE | 121 | BS | * Dự phòng rủi ro cho vay khách hàng | `BS_PROV_LOANS_CUST`, `BS_PROV_CREDIT_LOSS` | NH |
| 136 | FALSE | TRUE | 121 | BS | VIII. Chứng khoán đầu tư | `BS_INV_SEC` | NH |
| 137 | FALSE | TRUE | 121 | BS | * Chứng khoán đầu tư sẵn sàng để bán | `BS_AFS_SEC` | NH |
| 138 | FALSE | TRUE | 121 | BS | * Chứng khoán đầu tư giữ đến ngày đáo hạn | `BS_HTM_SEC` | NH |
| 139 | FALSE | TRUE | 121 | BS | * Dự phòng giảm giá chứng khoán đầu tư | `BS_PROV_INV_SEC` | NH |
| 140 | FALSE | TRUE | 121 | BS | IX. Góp vốn đầu tư dài hạn | `BS_LT_INV_CAP`, `BS_LT_INV` | NH |
| 141 | FALSE | TRUE | 121 | BS | * Đầu tư vào công ty con | `BS_SUB_INV` | NH |
| 142 | FALSE | TRUE | 121 | BS | * Góp vốn liên doanh | `BS_INV_JV` | NH |
| 143 | FALSE | TRUE | 121 | BS | * Đầu tư vào công ty liên kết | `BS_ASSOC_INV`, `BS_JV_ASSOC_INV` | NH |
| 144 | FALSE | TRUE | 121 | BS | * Đầu tư dài hạn khác | `BS_LT_OTHER_INV` | NH |
| 145 | FALSE | TRUE | 121 | BS | * Dự phòng giảm giá đầu tư dài hạn | `BS_PROV_LT_INV` | NH |
| 146 | FALSE | TRUE | 121 | BS | X. Tài sản cố định | `BS_FA` | NH |
| 147 | FALSE | TRUE | 121 | BS | * Tài sản cố định hữu hình | `BS_TANGIBLE_FA` | NH |
| 148 | FALSE | TRUE | 121 | BS | - Nguyên giá | `BS_HISTORICAL_COST` | NH |
| 149 | FALSE | TRUE | 121 | BS | - Giá trị hao mòn lũy kế | `BS_ACCUM_DEPR` | NH |
| 150 | FALSE | TRUE | 121 | BS | * Tài sản cố định thuê tài chính | `BS_FIN_LEASE_FA` | NH |
| 151 | FALSE | TRUE | 121 | BS | - Nguyên giá | `BS_HISTORICAL_COST` | NH |
| 152 | FALSE | TRUE | 121 | BS | - Giá trị hao mòn lũy kế | `BS_ACCUM_DEPR` | NH |
| 153 | FALSE | TRUE | 121 | BS | * Tài sản cố định vô hình | `BS_INTANGIBLE_FA` | NH |
| 154 | FALSE | TRUE | 121 | BS | - Nguyên giá | `BS_HISTORICAL_COST` | NH |
| 155 | FALSE | TRUE | 121 | BS | - Giá trị hao mòn lũy kế | `BS_ACCUM_DEPR` | NH |
| 156 | FALSE | TRUE | 121 | BS | * Chi phí XDCB dở dang | `BS_WIP_CONSTRUCTION` | NH |
| 157 | FALSE | TRUE | 121 | BS | XI. Bất động sản đầu tư | `BS_INV_PROP` | NH |
| 158 | FALSE | TRUE | 121 | BS | * Nguyên giá | `BS_HISTORICAL_COST` | NH |
| 159 | FALSE | TRUE | 121 | BS | * Giá trị hao mòn lũy kế | `BS_ACCUM_DEPR` | NH |
| 160 | FALSE | TRUE | 121 | BS | XII. Tài sản có khác | `BS_OTHER_ASSETS`, `BS_ST_OTHER_ASSETS`, `BS_LT_OTHER_ASSETS` | NH |
| 161 | FALSE | TRUE | 121 | BS | * Các khoản phải thu | `BS_REC`, `BS_ST_REC`, `BS_LT_REC` | NH |
| 162 | FALSE | TRUE | 121 | BS | * Các khoản lãi phí phải thu | `BS_INT_FEE_REC` | NH |
| 163 | FALSE | TRUE | 121 | BS | * Tài sản thuế TNDN hoãn lại | `BS_DEFERRED_TAX_ASSET` | NH |
| 164 | FALSE | TRUE | 121 | BS | * Tài sản có khác | `BS_OTHER_ASSETS` | NH |
| 165 | FALSE | TRUE | 121 | BS | - Trong đó: Lợi thế thương mại | `BS_GOODWILL` | NH |
| 166 | FALSE | TRUE | 121 | BS | * Các khoản dự phòng rủi ro cho các tài sản có nội bảng khác | `BS_OTHER_PROVISION` | NH |
| 167 | TRUE | FALSE | null | BS | TỔNG CỘNG TÀI SẢN | `BS_TOT_ASSET` | NH |
| 168 | TRUE | FALSE | null | BS | NGUỒN VỐN | `BS_TOT_CAPITAL` | NH |
| 169 | FALSE | TRUE | 168 | BS | I. Các khoản nợ chính phủ và NHNN | `BS_GOV_DEBT` | NH |
| 170 | FALSE | TRUE | 168 | BS | II. Tiền gửi và cho vay các TCTD khác | `BS_DEPOSITS_LOANS_CI` | NH |
| 171 | FALSE | TRUE | 168 | BS | * Tiền gửi các tổ chức tín dụng khác | `BS_DEPOSITS_CI` | NH |
| 172 | FALSE | TRUE | 168 | BS | * Vay các TCTD khác | `BS_LOANS_CI` | NH |
| 173 | FALSE | TRUE | 168 | BS | III. Tiền gửi khách hàng | `BS_DEPOSITS_CUST` | NH |
| 174 | FALSE | TRUE | 168 | BS | IV. Các công cụ tài chính phái sinh và các khoản nợ tài chính khác | `BS_DERIVATIVES_LIAB` | NH |
| 175 | FALSE | TRUE | 168 | BS | V. Vốn tài trợ uỷ thác đầu tư mà ngân hàng chịu rủi ro | `BS_SPONSORED_FUNDS_RISK` | NH |
| 176 | FALSE | TRUE | 168 | BS | VI. Phát hành giấy tờ có giá | `BS_ISSUED_VALUABLE_PAPER`, `BS_ISSUED_PAPER` | NH |
| 177 | FALSE | TRUE | 168 | BS | VII. Các khoản nợ khác | `BS_OTHER_LIAB`, `BS_ST_PAY_OTHER`, `BS_LT_PAY_OTHER` | NH |
| 178 | FALSE | TRUE | 168 | BS | * Các khoản lãi phí phải trả | `BS_INT_FEE_PAY` | NH |
| 179 | FALSE | TRUE | 168 | BS | * Thuế TNDN hoãn lại phải trả | `BS_DEFERRED_TAX_LIAB` | NH |
| 180 | FALSE | TRUE | 168 | BS | * Các khoản phải trả và công nợ khác | `BS_PAY_OTHER` | NH |
| 181 | FALSE | TRUE | 168 | BS | * Dự phòng rủi ro khác | `BS_PROV_OTHER_RISK` | NH |
| 182 | FALSE | TRUE | 168 | BS | VIII. Vốn chủ sở hữu | `BS_EQUITY` | NH |
| 183 | FALSE | TRUE | 168 | BS | * Vốn của Tổ chức tín dụng | `BS_CI_CAPITAL` | NH |
| 184 | FALSE | TRUE | 168 | BS | - Vốn điều lệ | `BS_CHARTER_CAPITAL` | NH |
| 185 | FALSE | TRUE | 168 | BS | - Vốn đầu tư XDCB | `BS_CONSTRUCTION_INV_CAPITAL` | NH |
| 186 | FALSE | TRUE | 168 | BS | - Thặng dư vốn cổ phần | `BS_SHARE_PREMIUM` | NH |
| 187 | FALSE | TRUE | 168 | BS | - Cổ phiếu quỹ | `BS_TREASURY_STOCK` | NH |
| 188 | FALSE | TRUE | 168 | BS | - Cổ phiếu ưu đãi | `BS_PREF_STOCK` | NH |
| 189 | FALSE | TRUE | 168 | BS | - Vốn khác | `BS_OTHER_CAPITAL`, `BS_OTHER_OWNER_CAPITAL` | NH |
| 190 | FALSE | TRUE | 168 | BS | * Quỹ của TCTD | `BS_CI_FUNDS` | NH |
| 191 | FALSE | TRUE | 168 | BS | * Chênh lệch tỷ giá hối đoái | `BS_FX_RESERVE` | NH |
| 192 | FALSE | TRUE | 168 | BS | * Chênh lệch đánh giá lại tài sản | `BS_REVAL_RESERVE` | NH |
| 193 | FALSE | TRUE | 168 | BS | * Lợi nhuận chưa phân phối/Lỗ lũy kế | `BS_RETAINED_EARNINGS_DEFICIT`, `BS_RETAINED_EARNINGS`, `BS_RETAINED_EARNINGS_CUR`, `BS_RETAINED_EARNINGS_ACCUM` | NH |
| 194 | FALSE | TRUE | 168 | BS | * Nguồn kinh phí Quỹ khác | `BS_FUND_OTHER_FUNDS` | NH |
| 195 | FALSE | TRUE | 168 | BS | IX. Lợi ích của cổ đông không kiểm soát | `BS_MINORITY_INTEREST` | NH |
| 196 | TRUE | FALSE | null | BS | TỔNG NỢ PHẢI TRẢ VÀ VỐN CHỦ SỞ HỮU | `BS_TOT_LIAB_EQUITY` | NH |

---

| stt hiển thị | isparent | ischild | parent | report_name | tên chỉ tiêu (chuẩn hóa theo mẫu mới) | danh sách ind_code map thỏa mãn | loại bctc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 401 | TRUE | FALSE | null | BS | TÀI SẢN | `BS_TOT_ASSET` | BH |
| 402 | TRUE | TRUE | 401 | BS | A. Tài sản lưu động và đầu tư ngắn hạn (ở stt 1150) | `BS_CUR_ASSETS`, `BS_CUR_ASSETS_ST_INV` | BH |
| 403 | TRUE | TRUE | 402 | BS | I. Tiền (ở stt 1221) | `BS_CASH`, `BS_CASH_EQ` | BH |
| 404 | FALSE | TRUE | 403 | BS | 1. Tiền mặt tại quỹ (gồm cả ngân phiếu) | `BS_CASH_ON_HAND` | BH |
| 405 | FALSE | TRUE | 403 | BS | 2. Tiền gửi Ngân hàng (ở stt 976) | `BS_OTHER` | BH |
| 406 | FALSE | TRUE | 403 | BS | 3. Tiền đang chuyển | `BS_CASH_IN_TRANSIT` | BH |
| 407 | FALSE | TRUE | 403 | BS | 4. Các khoản tương đương tiền (ở stt 943, 1038) | `BS_CASH_EQ` | BH |
| 408 | TRUE | TRUE | 402 | BS | II. Các khoản đầu tư tài chính ngắn hạn (ở stt 1197) | `BS_ST_INV` | BH |
| 409 | FALSE | TRUE | 408 | BS | 1. Đầu tư chứng khoán ngắn hạn | `BS_ST_SEC_INV` | BH |
| 410 | FALSE | TRUE | 408 | BS | 2. Đầu tư ngắn hạn khác | `BS_ST_OTHER_INV` | BH |
| 411 | FALSE | TRUE | 408 | BS | 3. Dự phòng giảm giá chứng khoán đầu tư ngắn hạn (*) | `BS_PROV_ST_INV_SEC` | BH |
| 412 | TRUE | TRUE | 402 | BS | III. Các khoản phải thu (ở stt 1106, 1200) | `BS_REC` | BH |
| 413 | FALSE | TRUE | 412 | BS | 1. Phải thu của khách hàng (ở stt 895) | `BS_REC_CUST` | BH |
| 414 | FALSE | TRUE | 412 | BS | 2. Trả trước cho người bán (ở stt 977) | `BS_PREPAID_SUPP` | BH |
| 415 | FALSE | TRUE | 412 | BS | 3. Phải thu nội bộ (ở stt 1013) | `BS_REC_INTERNAL` | BH |
| 416 | FALSE | TRUE | 412 | BS | 4. Phải thu theo tiến độ hợp đồng xây dựng (ở stt 1051) | `BS_REC_CONSTRUCTION_CONTRACT` | BH |
| 417 | FALSE | TRUE | 412 | BS | 5. Thuế giá trị gia tăng được khấu trừ (ở stt 973) | `BS_DEDUCTIBLE_VAT` | BH |
| 418 | FALSE | TRUE | 412 | BS | 6. Các khoản phải thu khác (ở stt 1087) | `BS_OTHER_REC` | BH |
| 419 | FALSE | TRUE | 412 | BS | 7. Dự phòng các khoản phải thu khó đòi (*) (ở stt 1112) | `BS_PROV_DOUBTFUL_DEBT` | BH |
| 420 | TRUE | TRUE | 402 | BS | IV. Hàng tồn kho (ở stt 1226) | `BS_INVENTORY` | BH |
| 421 | FALSE | TRUE | 420 | BS | 1. Hàng tồn kho (ở stt 892) | `BS_INVENTORY` | BH |
| 422 | FALSE | TRUE | 420 | BS | 2. Dự phòng giảm giá hàng tồn kho (*) (ở stt 957, 958) | `BS_PROV_INV` | BH |
| 423 | TRUE | TRUE | 402 | BS | V. Tài sản ngắn hạn khác (ở stt 1212, 1293) | `BS_ST_OTHER_ASSETS` | BH |
| 424 | FALSE | TRUE | 423 | BS | 1. Tạm ứng (ở stt 901) | `BS_ADVANCES` | BH |
| 425 | FALSE | TRUE | 423 | BS | 2. Chi phí trả trước ngắn hạn (ở stt 883, 1000) | `BS_ST_PREPAID` | BH |
| 426 | FALSE | TRUE | 423 | BS | 3. Tài sản thiếu chờ xử lý (ở stt 1024) | `BS_OTHER` | BH |
| 427 | FALSE | TRUE | 423 | BS | 4. Các khoản cầm cố ký cược ký quỹ ngắn hạn (ở stt 1036) | `BS_OTHER` | BH |
| 428 | FALSE | TRUE | 423 | BS | 5. Thuế giá trị gia tăng được khấu trừ (ở stt 1083) | `BS_DEDUCTIBLE_VAT` | BH |
| 429 | FALSE | TRUE | 423 | BS | 6. Thuế và các khoản phải thu Nhà nước (ở stt 1101) | `BS_TAX_REC` | BH |
| 430 | FALSE | TRUE | 423 | BS | 7. Tài sản ngắn hạn khác (ở stt 1082, 1118) | `BS_ST_OTHER_ASSETS` | BH |
| 431 | TRUE | TRUE | 402 | BS | VI. Chi sự nghiệp | `IS_NPO_EXP_PREV`, `IS_NPO_EXP_CUR` | BH |
| 432 | FALSE | TRUE | 431 | BS | 1. Chi sự nghiệp năm trước | `IS_NPO_EXP_PREV` | BH |
| 433 | FALSE | TRUE | 431 | BS | 2. Chi sự nghiệp năm nay | `IS_NPO_EXP_CUR` | BH |
| 434 | TRUE | TRUE | 401 | BS | B. Tài sản cố định và đầu tư dài hạn (ở stt 1156) | `BS_NONCUR_ASSETS` | BH |
| 435 | TRUE | TRUE | 434 | BS | I. Các khoản phải thu dài hạn (ở stt 878, 1195) | `BS_LT_REC` | BH |
| 436 | FALSE | TRUE | 435 | BS | 1. Phải thu dài hạn của khách hàng (ở stt 896) | `BS_LT_REC_CUST` | BH |
| 437 | FALSE | TRUE | 435 | BS | 2. Vốn kinh doanh tại các đơn vị trực thuộc (ở stt 983) | `BS_WORKING_CAPITAL_AFFILIATE` | BH |
| 438 | FALSE | TRUE | 435 | BS | 3. Phải thu dài hạn nội bộ (ở stt 1012) | `BS_LT_REC_INTERNAL` | BH |
| 439 | FALSE | TRUE | 435 | BS | 4. Phải thu dài hạn khác (ở stt 1050, 1076) | `BS_LT_OTHER_REC` | BH |
| 440 | FALSE | TRUE | 435 | BS | 5. Dự phòng phải thu dài hạn khó đòi (ở stt 1072, 1093) | `BS_PROV_LT_DOUBTFUL_DEBT` | BH |
| 441 | TRUE | TRUE | 434 | BS | II. Tài sản cố định (ở stt 1211, 1301) | `BS_FA` | BH |
| 442 | FALSE | TRUE | 441 | BS | 1. Tài sản cố định hữu hình (ở stt 900) | `BS_TANGIBLE_FA` | BH |
| 443 | FALSE | TRUE | 441 | BS | 2. Tài sản cố định thuê tài chính (ở stt 967, 968) | `BS_FIN_LEASE_FA` | BH |
| 444 | FALSE | TRUE | 441 | BS | 3. Tài sản cố định vô hình (ở stt 1022) | `BS_INTANGIBLE_FA` | BH |
| 445 | FALSE | TRUE | 434 | BS | III. Chi phí xây dựng cơ bản dở dang (ở stt 763, 949, 1066, 1202, 1225) | `BS_WIP_CONSTRUCTION` | BH |
| 446 | TRUE | TRUE | 434 | BS | IV. Bất động sản đầu tư (ở stt 1199, 1222, 1296) | `BS_INV_PROP` | BH |
| 447 | FALSE | TRUE | 446 | BS | * - Nguyên giá (ở stt 1246) | `BS_HISTORICAL_COST` | BH |
| 448 | FALSE | TRUE | 446 | BS | * - Giá trị hao mòn lũy kế (ở stt 1191) | `BS_ACCUM_DEPR` | BH |
| 449 | TRUE | TRUE | 434 | BS | V. Các khoản đầu tư tài chính dài hạn (ở stt 1272) | `BS_LT_INV` | BH |
| 450 | FALSE | TRUE | 449 | BS | 1. Đầu tư chứng khoán dài hạn (ở stt 888) | `BS_LT_SEC_INV` | BH |
| 451 | FALSE | TRUE | 449 | BS | 2. Đầu tư vào công ty con (ở stt 890, 954) | `BS_SUB_INV` | BH |
| 452 | FALSE | TRUE | 449 | BS | 3. Đầu tư vào công ty liên kết liên doanh (ở stt 955, 1004) | `BS_JV_ASSOC_INV`, `BS_JV_INV`, `BS_ASSOC_INV` | BH |
| 453 | FALSE | TRUE | 449 | BS | 4. Đầu tư dài hạn khác (ở stt 1043) | `BS_LT_OTHER_INV` | BH |
| 454 | FALSE | TRUE | 449 | BS | 5. Dự phòng giảm giá đầu tư tài chính dài hạn (ở stt 1045, 1071) | `BS_PROV_LT_FIN_INV`, `BS_PROV_LT_INV` | BH |
| 455 | TRUE | TRUE | 434 | BS | VI. Các khoản ký quỹ ký cược dài hạn (và tài sản dài hạn khác) (ở stt 1081, 1292) | `BS_LT_OTHER_ASSETS` | BH |
| 456 | FALSE | TRUE | 455 | BS | 1. Chi phí trả trước dài hạn (ở stt 882, 947) | `BS_LT_PREPAID` | BH |
| 457 | FALSE | TRUE | 455 | BS | 2. Tài sản thuế thu nhập hoãn lại (ở stt 971, 1025) | `BS_DEFERRED_TAX_ASSET` | BH |
| 458 | FALSE | TRUE | 455 | BS | 3. Ký quỹ bảo hiểm | `BS_INS_DEPOSIT` | BH |
| 459 | FALSE | TRUE | 455 | BS | 4. Cầm cố ký quỹ ký cược dài hạn khác (ở stt 1039) | `BS_LT_PLEDGE_OTHER` | BH |
| 460 | TRUE | FALSE | null | BS | TỔNG CỘNG TÀI SẢN (ở stt 1248, 1265) | `BS_TOT_ASSET` | BH |
| 461 | TRUE | FALSE | null | BS | NGUỒN VỐN | `BS_TOT_CAPITAL`, `BS_TOT_LIAB_EQUITY` | BH |
| 462 | TRUE | TRUE | 461 | BS | A. NỢ PHẢI TRẢ (ở stt 1147, 1148, 1180) | `BS_LIABILITIES` | BH |
| 463 | TRUE | TRUE | 462 | BS | I. Nợ ngắn hạn (ở stt 1215, 1216) | `BS_ST_LIABILITIES` | BH |
| 464 | FALSE | TRUE | 463 | BS | 1. Vay và nợ ngắn hạn (ở stt 910) | `BS_ST_DEBT`, `BS_ST_FIN_LEASE_DEBT` | BH |
| 465 | FALSE | TRUE | 463 | BS | 2. Nợ dài hạn đến hạn phải trả (ở stt 982) | `BS_LT_DEBT_DUE` | BH |
| 466 | FALSE | TRUE | 463 | BS | 3. Phải trả người bán (ở stt 1016) | `BS_ST_PAY_SUPPLIER`, `BS_PAY_SUPPLIER` | BH |
| 467 | FALSE | TRUE | 463 | BS | 4. Người mua trả tiền trước (ở stt 1049) | `BS_ADVANCES_CUST` | BH |
| 468 | FALSE | TRUE | 463 | BS | 5. Thuế và các khoản phải nộp nhà nước (ở stt 1084) | `BS_TAX_PAYABLES` | BH |
| 469 | FALSE | TRUE | 463 | BS | 6. Phải trả người lao động (ở stt 810, 1100) | `BS_PAY_EMPLOYEES` | BH |
| 470 | FALSE | TRUE | 463 | BS | 7. Phải trả nội bộ (ở stt 1115) | `BS_PAY_INTERNAL` | BH |
| 471 | FALSE | TRUE | 463 | BS | 8. Phải trả theo tiến độ kế hoạch hợp đồng xây dựng (ở stt 1142) | `BS_PAY_CONSTRUCTION_CONTRACT` | BH |
| 472 | FALSE | TRUE | 463 | BS | 9. Các khoản phải trả phải nộp ngắn hạn khác (ở stt 865, 1135) | `BS_ST_PAY_OTHER`, `BS_PAY_OTHER` | BH |
| 473 | FALSE | TRUE | 463 | BS | 10. Dự phòng phải trả ngắn hạn (ở stt 826, 871) | `BS_PROV_ST_PAY` | BH |
| 474 | TRUE | TRUE | 462 | BS | II. Nợ dài hạn (ở stt 963, 1209, 1210) | `BS_LT_LIABILITIES` | BH |
| 475 | FALSE | TRUE | 474 | BS | 1. Vay dài hạn (ở stt 909) | `BS_LT_BORROWINGS` | BH |
| 476 | FALSE | TRUE | 474 | BS | 2. Nợ dài hạn (ở stt 963, 1209) | `BS_LT_LIABILITIES` | BH |
| 477 | FALSE | TRUE | 474 | BS | 3. Phát hành trái phiếu (ở stt 1018) | `BS_OTHER` | BH |
| 478 | FALSE | TRUE | 474 | BS | 4. Phải trả dài hạn khác (ở stt 1053, 1078) | `BS_LT_OTHER_PAY` | BH |
| 479 | TRUE | TRUE | 462 | BS | III. Dự phòng nghiệp vụ (Ngành Bảo hiểm / TCTD) (ở stt 1204) | `BS_PROV_TECH` | BH |
| 480 | FALSE | TRUE | 479 | BS | 1. Dự phòng phí (ở stt 891) | `BS_PROV_FEE` | BH |
| 481 | FALSE | TRUE | 479 | BS | 2. Dự phòng toán học (ở stt 960) | `BS_PROV_MATH` | BH |
| 482 | FALSE | TRUE | 479 | BS | 3. Dự phòng bồi thường (ở stt 1006) | `BS_PROV_CLAIM` | BH |
| 483 | FALSE | TRUE | 479 | BS | 4. Dự phòng dao động lớn (ở stt 1044) | `BS_PROV_LARGE_FLUCT` | BH |
| 484 | FALSE | TRUE | 479 | BS | 5. Dự phòng chia lãi (ở stt 1069) | `BS_PROV_PROFIT_SHARE` | BH |
| 485 | FALSE | TRUE | 479 | BS | 6. Dự phòng bảo đảm cân đối (ở stt 1092) | `BS_PROV_BALANCING` | BH |
| 486 | TRUE | TRUE | 462 | BS | IV. Nợ khác | `BS_PAY_ACCRUED`, `BS_OTHER` | BH |
| 487 | FALSE | TRUE | 486 | BS | 1. Chi phí phải trả (ở stt 880) | `BS_PAY_ACCRUED` | BH |
| 488 | FALSE | TRUE | 486 | BS | 2. Tài sản thừa chờ xử lý (ở stt 969) | `BS_OTHER` | BH |
| 489 | FALSE | TRUE | 486 | BS | 3. Nhận ký quỹ ký cược dài hạn (ở stt 1011) | `BS_LT_DEPOSIT_REC` | BH |
| 490 | TRUE | TRUE | 461 | BS | B. NGUỒN VỐN CHỦ SỞ HỮU (ở stt 1153, 1154, 1189, 1284) | `BS_EQUITY` | BH |
| 491 | TRUE | TRUE | 490 | BS | I. Vốn chủ sở hữu (ở stt 1228) | `BS_EQUITY` | BH |
| 492 | FALSE | TRUE | 491 | BS | 1. Vốn đầu tư của chủ sở hữu (ở stt 915) | `BS_OWNER_INV_CAPITAL`, `BS_OWNER_CAPITAL` | BH |
| 493 | FALSE | TRUE | 491 | BS | 2. Thặng dư vốn cổ phần (ở stt 833, 972 hoặc stt 1249) | `BS_SHARE_PREMIUM` | BH |
| 494 | FALSE | TRUE | 491 | BS | 3. Vốn khác của chủ sở hữu (ở stt 1031, 1062) | `BS_OTHER_OWNER_CAPITAL`, `BS_OTHER_CAPITAL` | BH |
| 495 | FALSE | TRUE | 491 | BS | 4. Cổ phiếu quỹ (ở stt 1042 hoặc stt 1186) | `BS_TREASURY_STOCK` | BH |
| 496 | FALSE | TRUE | 491 | BS | 5. Chênh lệch đánh giá lại tài sản (ở stt 1041, 1065, 1089) | `BS_REVAL_RESERVE` | BH |
| 497 | FALSE | TRUE | 491 | BS | 6. Chênh lệch tỷ giá hối đoái (ở stt 999, 1090, 1107) | `BS_FX_RESERVE` | BH |
| 498 | FALSE | TRUE | 491 | BS | 7. Quỹ đầu tư phát triển (ở stt 1117, 1129) | `BS_DEV_INV_FUND` | BH |
| 499 | FALSE | TRUE | 491 | BS | 8. Quỹ dự phòng tài chính (ở stt 1130, 1143) | `BS_FIN_RESERVE_FUND` | BH |
| 500 | FALSE | TRUE | 491 | BS | 9. Quỹ dự trữ bắt buộc (ở stt 1144) | `BS_COMPULSORY_RESERVE` | BH |
| 501 | FALSE | TRUE | 491 | BS | 10. Quỹ khác thuộc vốn chủ sở hữu (ở stt 795 hoặc stt 1088) | `BS_OTHER_EQUITY_FUNDS`, `BS_OTHER_RESERVES` | BH |
| 502 | FALSE | TRUE | 491 | BS | 11. Lợi nhuận sau thuế chưa phân phối (ở stt 806, 1114) | `BS_RETAINED_EARNINGS` | BH |
| 503 | FALSE | TRUE | 491 | BS | 12. Nguồn vốn đầu tư xây dựng cơ bản (ở stt 828) | `BS_CAPITAL_CONSTRUCTION` | BH |
| 504 | TRUE | TRUE | 490 | BS | II. Nguồn kinh phí quỹ khác (ở stt 1207, 1208) | `BS_FUND_OTHER_FUNDS` | BH |
| 505 | FALSE | TRUE | 504 | BS | 1. Quỹ dự phòng trợ cấp mất việc làm (ở stt 899, 1019) | `BS_SEVERANCE_FUND` | BH |
| 506 | FALSE | TRUE | 504 | BS | 2. Quỹ khen thưởng phúc lợi (ở stt 831, 966) | `BS_BONUS_WELFARE_FUND` | BH |
| 507 | FALSE | TRUE | 504 | BS | 3. Quỹ khen thưởng phúc lợi đưa đi đầu tư | `BS_BONUS_WELFARE_FUND_INV` | BH |
| 508 | FALSE | TRUE | 504 | BS | 4. Quỹ quản lý của cấp trên | `BS_MGMT_FUND_UPPER` | BH |
| 509 | FALSE | TRUE | 504 | BS | 5. Nguồn kinh phí sự nghiệp (ở stt 894) | `BS_FUND_SOURCES`, `BS_NPO_FUND` | BH |
| 510 | TRUE | FALSE | null | BS | C. LỢI ÍCH CỔ ĐÔNG THIỂU SỐ (ở stt 1123, 1179, 1233) | `BS_MINORITY_INTEREST` | BH |
| 511 | TRUE | FALSE | null | BS | TỔNG CỘNG NGUỒN VỐN (ở stt 1263, 1264, 1267) | `BS_TOT_CAPITAL`, `BS_TOT_LIAB_EQUITY` | BH |

---

### II. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (INCOME STATEMENT - IS)

| stt hiển thị | isparent | ischild | parent | report_name | tên chỉ tiêu (chuẩn hóa theo mẫu mới) | danh sách ind_code map thỏa mãn | loại bctc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **201** | **TRUE** | FALSE | null | IS | **Tổng doanh thu hoạt động kinh doanh** | `IS_OP_REV_TOTAL`, `IS_REVENUE` | Phi TC, BH |
| 202 | FALSE | TRUE | 201 | IS | Các khoản giảm trừ doanh thu | `IS_REV_DEDUCTION` | Phi TC, BH |
| 203 | FALSE | TRUE | 201 | IS | Doanh thu thuần (1)-(2) | `IS_NET_REVENUE` | Phi TC, BH |
| 204 | FALSE | TRUE | 201 | IS | Giá vốn hàng bán | `IS_COGS` | Phi TC, BH |
| 205 | FALSE | TRUE | 201 | IS | Lợi nhuận gộp (3)-(4) | `IS_GROSS_PROFIT` | Phi TC, BH |
| 206 | FALSE | TRUE | 201 | IS | Doanh thu hoạt động tài chính | `IS_FIN_INC` | Phi TC, BH |
| 207 | FALSE | TRUE | 201 | IS | Chi phí tài chính | `IS_FIN_EXP` | Phi TC, BH |
| 208 | FALSE | TRUE | 201 | IS | Trong đó: Chi phí lãi vay | `IS_INT_EXP` | Phi TC, BH |
| 209 | FALSE | TRUE | 201 | IS | Phần lợi nhuận hoặc lỗ trong công ty liên kết liên doanh | `IS_ASSOC_JV_PROFIT_SHARE`, `IS_JV_ASSOC_PROFIT`, `IS_JV_PROFIT` | Phi TC, BH |
| 210 | FALSE | TRUE | 201 | IS | Chi phí bán hàng | `IS_SELL_EXP` | Phi TC, BH |
| 211 | FALSE | TRUE | 201 | IS | Chi phí quản lý doanh nghiệp | `IS_GA_EXP` | Phi TC, BH |
| 212 | FALSE | TRUE | 201 | IS | Lợi nhuận thuần từ hoạt động kinh doanh (5)+(6)-(7)+(8)-(9)-(10) | `IS_OP_PROFIT` | Phi TC, BH |
| 213 | FALSE | TRUE | 201 | IS | Thu nhập khác | `IS_OTHER_INC` | Phi TC, BH |
| 214 | FALSE | TRUE | 201 | IS | Chi phí khác | `IS_OTHER_EXP` | Phi TC, BH |
| 215 | FALSE | TRUE | 201 | IS | Lợi nhuận khác (12)-(13) | `IS_OTHER_PROFIT` | Phi TC, BH |
| 216 | FALSE | TRUE | 201 | IS | Tổng lợi nhuận kế toán trước thuế (11)+(14) | `IS_PBT`, `IS_NET_PBT` | Phi TC, BH |
| 217 | FALSE | TRUE | 201 | IS | Chi phí thuế TNDN hiện hành | `IS_TAX_CURRENT` | Phi TC, BH |
| 218 | FALSE | TRUE | 201 | IS | Chi phí thuế TNDN hoãn lại | `IS_TAX_DEFERRED` | Phi TC, BH |
| 219 | FALSE | TRUE | 201 | IS | Chi phí thuế TNDN (16)+(17) | `IS_TAX_EXP` | Phi TC, BH |
| 220 | FALSE | TRUE | 201 | IS | Lợi nhuận sau thuế thu nhập doanh nghiệp (15)-(18) | `IS_NPAT` | Phi TC, BH |
| 221 | FALSE | TRUE | 201 | IS | Lợi nhuận sau thuế của cổ đông không kiểm soát | `IS_MINORITY_INTEREST` | Phi TC, BH |
| 222 | FALSE | TRUE | 201 | IS | Lợi nhuận sau thuế của cổ đông của công ty mẹ (19)-(20) | `IS_NPAT_PARENT` | Phi TC, BH |
| 90 | TRUE | FALSE | null | IS | Thu nhập lãi thuần | `IS_NET_INT_INC` | NH |
| 91 | FALSE | TRUE | 90 | IS | * Thu nhập từ lãi và các khoản thu nhập tương tự | `IS_INT_INC` | NH |
| 92 | FALSE | TRUE | 90 | IS | * Chi phí lãi và các chi phí tương tự | `IS_INT_EXP` | NH |
| 93 | TRUE | FALSE | null | IS | Lại/Lỗ thuần từ hoạt động dịch vụ | `IS_NET_SVC_PROFIT`, `IS_NET_FEE_INC` | NH |
| 94 | FALSE | TRUE | 93 | IS | * Thu nhập từ hoạt động dịch vụ | `IS_SVC_INC` | NH |
| 95 | FALSE | TRUE | 93 | IS | * Chi phí hoạt động dịch vụ | `IS_OP_EXP_SVC` | NH |
| 96 | TRUE | FALSE | null | IS | Lại/Lỗ thuần từ hoạt động kinh doanh ngoại hối | `IS_NET_FX_PROFIT`, `IS_NET_FX_GOLD_PROFIT` | NH |
| 97 | TRUE | FALSE | null | IS | Lại/Lỗ thuần từ mua bán chứng khoán kinh doanh | `IS_NET_TRADING_SEC_PROFIT` | NH |
| 98 | TRUE | FALSE | null | IS | Lại/Lỗ thuần từ mua bán chứng khoán đầu tư | `IS_NET_INV_SEC_PROFIT` | NH |
| 99 | TRUE | FALSE | null | IS | Lại/Lỗ thuần từ hoạt động khác | `IS_NET_OTHER_PROFIT`, `IS_OTHER_PROFIT` | NH |
| 100 | FALSE | TRUE | 99 | IS | * Thu nhập từ hoạt động khác | `IS_OTHER_INC` | NH |
| 101 | FALSE | TRUE | 99 | IS | * Chi phí hoạt động khác | `IS_OP_EXP_OTHER`, `IS_OTHER_EXP` | NH |
| 102 | TRUE | FALSE | null | IS | Thu nhập từ hoạt động góp vốn mua cổ phần | `IS_SHARE_INV_INC` | NH |
| 103 | TRUE | FALSE | null | IS | Chi phí hoạt động | `IS_OP_EXP`, `IS_OP_EXP_TOTAL` | NH |
| 104 | TRUE | FALSE | null | IS | Lợi nhuận từ HDKD trước chi phí dự phòng rủi ro tín dụng | `IS_OP_PROFIT_PRE_PROV` | NH |
| 105 | TRUE | FALSE | null | IS | Chi phí dự phòng rủi ro tín dụng | `IS_CREDIT_PROV_EXP` | NH |
| 106 | TRUE | FALSE | null | IS | Tổng lợi nhuận trước thuế | `IS_PBT` | NH |
| 107 | TRUE | FALSE | null | IS | Chi phí thuế TNDN | `IS_TAX_EXP` | NH |
| 108 | FALSE | TRUE | 107 | IS | * Chi phí thuế thu nhập hiện hành | `IS_TAX_CURRENT` | NH |
| 109 | FALSE | TRUE | 107 | IS | * Chi phí thuế TNDN giữ lại | `IS_TAX_EXP_RETAINED` | NH |
| 110 | TRUE | FALSE | null | IS | Lợi nhuận sau thuế thu nhập doanh nghiệp | `IS_NPAT` | NH |
| 111 | FALSE | TRUE | 110 | IS | * Lợi ích của cổ đông thiểu số và cổ tức ưu đãi | `BS_MINORITY_INTEREST_PREF`, `IS_MINORITY_INTEREST` | NH |
| 112 | FALSE | TRUE | 110 | IS | * LNST sau khi điều chỉnh Lợi ích của CĐTS và Cổ tức ưu đãi | `IS_NPAT_PARENT_ADJ` | NH |
| 301 | TRUE | FALSE | null | IS | I. DOANH THU HOẠT ĐỘNG | `IS_OP_REV_TOTAL` | CK |
| 302 | FALSE | TRUE | 301 | IS | Cộng doanh thu hoạt động | `IS_OP_REV_TOTAL` | CK |
| 303 | FALSE | TRUE | 301 | IS | 1.1. Lãi từ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL) | `IS_FVTPL_PROFIT` | CK |
| 304 | FALSE | TRUE | 301 | IS | * a. Lãi bán các tài sản tài chính (ở stt 1145) | `IS_FIN_SALE_GAIN` | CK |
| 305 | FALSE | TRUE | 301 | IS | * b. Chênh lệch tăng đánh giá lại các TSTC thông qua lãi/lỗ | `IS_FVTPL_REVAL_GAIN` | CK |
| 306 | FALSE | TRUE | 301 | IS | * c. Cổ tức tiền lãi phát sinh từ tài sản tài chính FVTPL | `IS_FVTPL_DIV` | CK |
| 307 | FALSE | TRUE | 301 | IS | 1.2. Lãi từ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM) | `IS_HTM_INT_INC` | CK |
| 308 | FALSE | TRUE | 301 | IS | 1.3. Lãi từ các khoản cho vay và phải thu | `IS_LOAN_REC_INT_INC` | CK |
| 309 | FALSE | TRUE | 301 | IS | 1.4. Lãi từ các tài sản tài chính sẵn sàng để bán (AFS) | `IS_AFS_PROFIT` | CK |
| 310 | FALSE | TRUE | 301 | IS | 1.5. Lãi từ các công cụ phái sinh phòng ngừa rủi ro (ở stt 858) | `IS_PROFIT_LOSS_OTHER` | CK |
| 311 | FALSE | TRUE | 301 | IS | 1.6. Doanh thu môi giới chứng khoán | `IS_REV_BROKERAGE` | CK |
| 312 | FALSE | TRUE | 301 | IS | 1.7. Doanh thu bảo lãnh đại lý phát hành chứng khoán | `IS_REV_UWRITING` | CK |
| 313 | FALSE | TRUE | 301 | IS | 1.8. Doanh thu tư vấn | `IS_REV_ADVISORY` | CK |
| 314 | FALSE | TRUE | 301 | IS | 1.9. Doanh thu hoạt động nhận ủy thác đấu giá | `IS_REV_TRUST` | CK |
| 315 | FALSE | TRUE | 301 | IS | 1.10. Doanh thu lưu ký chứng khoán | `IS_REV_DEPOSITARY` | CK |
| 316 | FALSE | TRUE | 301 | IS | 1.11. Thu nhập hoạt động khác (ở stt 799) | `IS_OTHER_INC` | CK |
| 317 | TRUE | FALSE | null | IS | II. CHI PHÍ HOẠT ĐỘNG | `IS_OP_EXP_TOTAL` | CK |
| 318 | FALSE | TRUE | 317 | IS | Cộng chi phí hoạt động | `IS_OP_EXP_TOTAL` | CK |
| 319 | FALSE | TRUE | 317 | IS | 2.1. Lỗ các tài sản tài chính ghi nhận thông qua lãi/lỗ (FVTPL) | `IS_FVTPL_LOSS` | CK |
| 320 | FALSE | TRUE | 317 | IS | * a. Lỗ bán các tài sản tài chính (ở stt 1146) | `IS_FIN_SALE_LOSS` | CK |
| 321 | FALSE | TRUE | 317 | IS | * b. Chênh lệch giảm đánh giá lại các TSTC thông qua lãi/lỗ | `IS_FVTPL_REVAL_LOSS` | CK |
| 322 | FALSE | TRUE | 317 | IS | * c. Chi phí giao dịch mua các tài sản tài chính FVTPL | `IS_FVTPL_PURCHASE_EXP` | CK |
| 323 | FALSE | TRUE | 317 | IS | 2.2. Lỗ các khoản đầu tư nắm giữ đến ngày đáo hạn (HTM) | `IS_HTM_LOSS` | CK |
| 324 | FALSE | TRUE | 317 | IS | 2.3. Chi phí lãi vay lỗ từ các khoản cho vay và phải thu | `IS_INT_EXP_LOANS` | CK |
| 325 | FALSE | TRUE | 317 | IS | 2.4. Lỗ bán các tài sản tài chính sẵn sàng để bán (AFS) | `IS_AFS_SALE_LOSS` | CK |
| 326 | FALSE | TRUE | 317 | IS | 2.5. Lỗ từ các tài sản tài chính phái sinh phòng ngừa rủi ro (ở stt 931) | `IS_PROFIT_LOSS_OTHER` | CK |
| 327 | FALSE | TRUE | 317 | IS | 2.6. Chi phí hoạt động tự doanh | `IS_OP_EXP_PROP_TRAD` | CK |
| 328 | FALSE | TRUE | 317 | IS | 2.7. Chi phí môi giới chứng khoán | `IS_OP_EXP_BROKERAGE` | CK |
| 329 | FALSE | TRUE | 317 | IS | 2.8. Chi phí hoạt động bảo lãnh đại lý phát hành chứng khoán | `IS_OP_EXP_UWRITING` | CK |
| 330 | FALSE | TRUE | 317 | IS | 2.9. Chi phí tư vấn | `IS_OP_EXP_ADVISORY` | CK |
| 331 | FALSE | TRUE | 317 | IS | 2.10. Chi phí hoạt động đấu giá ủy thác | `IS_OP_EXP_TRUST` | CK |
| 332 | FALSE | TRUE | 317 | IS | 2.11. Chi phí lưu ký chứng khoán | `IS_OP_EXP_DEPOSITARY` | CK |
| 333 | FALSE | TRUE | 317 | IS | 2.12. Chi phí khác (ở stt 920) | `IS_OTHER_EXP` | CK |
| 334 | FALSE | TRUE | 317 | IS | * Trong đó: Chi phí sửa lỗi giao dịch chứng khoán, lỗi khác | `IS_OP_EXP_SEC_ERROR` | CK |
| 335 | TRUE | FALSE | null | IS | III. DOANH THU HOẠT ĐỘNG TÀI CHÍNH | `IS_FIN_REV_TOTAL` | CK |
| 336 | FALSE | TRUE | 335 | IS | Cộng doanh thu hoạt động tài chính | `IS_FIN_REV_TOTAL` | CK |
| 337 | FALSE | TRUE | 335 | IS | 3.1. Chênh lệch lãi tỷ giá hối đoái đã và chưa thực hiện | `IS_FX_GAIN` | CK |
| 338 | FALSE | TRUE | 335 | IS | 3.2. Doanh thu dự thu cổ tức, lãi tiền gửi không cố định phát sinh trong kỳ | `IS_REV_DIV_ACCRUED` | CK |
| 339 | FALSE | TRUE | 335 | IS | 3.3. Lãi bán thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh | `IS_SUB_JV_SALE_GAIN` | CK |
| 340 | FALSE | TRUE | 335 | IS | 3.4. Doanh thu khác về đầu tư | `IS_INV_INC` | CK |
| 341 | TRUE | FALSE | null | IS | IV. CHI PHÍ TÀI CHÍNH | `IS_FIN_EXP` | CK |
| 342 | FALSE | TRUE | 341 | IS | Cộng chi phí tài chính (ở stt 1182) | `IS_FIN_EXP` | CK |
| 343 | FALSE | TRUE | 341 | IS | 4.1. Chênh lệch lỗ tỷ giá hối đoái đã và chưa thực hiện | `IS_FX_LOSS` | CK |
| 344 | FALSE | TRUE | 341 | IS | 4.2. Chi phí lãi vay (ở stt 1033) | `IS_INT_EXP` | CK |
| 345 | FALSE | TRUE | 341 | IS | 4.3. Lỗ bán thanh lý các khoản đầu tư vào công ty con, liên kết, liên doanh | `IS_SUB_JV_SALE_LOSS` | CK |
| 346 | FALSE | TRUE | 341 | IS | 4.4. Chi phí đầu tư khác | `IS_INV_OTHER_EXP` | CK |
| 347 | TRUE | FALSE | null | IS | V. CHI BÁN HÀNG | `IS_SELL_EXP` | CK |
| 348 | FALSE | TRUE | 347 | IS | Chi bán hàng | `IS_SELL_EXP` | CK |
| 349 | TRUE | FALSE | null | IS | VI. CHI PHÍ QUẢN LÝ CÔNG TY CHỨNG KHOÁN | `IS_GA_EXP` | CK |
| 350 | FALSE | TRUE | 349 | IS | Chi phí quản lý công ty chứng khoán (ở stt 24 và 1277) | `IS_GA_EXP` | CK |
| 351 | TRUE | FALSE | null | IS | VII. KẾT QUẢ HOẠT ĐỘNG | `IS_OP_RESULT` | CK |
| 352 | FALSE | TRUE | 351 | IS | Kết quả hoạt động | `IS_OP_RESULT` | CK |
| 353 | TRUE | FALSE | null | IS | VIII. THU NHẬP KHÁC VÀ CHI PHÍ KHÁC | `IS_OTHER_PROFIT` | CK |
| 354 | FALSE | TRUE | 353 | IS | Cộng kết quả hoạt động khác (ở stt 1185) | `IS_OTHER_PROFIT` | CK |
| 355 | FALSE | TRUE | 353 | IS | 8.1. Thu nhập khác (ở stt 1120) | `IS_OTHER_INC` | CK |
| 356 | FALSE | TRUE | 353 | IS | 8.2. Chi phí khác (ở stt 1121) | `IS_OTHER_EXP` | CK |
| 357 | TRUE | FALSE | null | IS | IX. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ | `IS_PBT` | CK |
| 358 | FALSE | TRUE | 357 | IS | Tổng lợi nhuận kế toán trước thuế (ở stt 1234) | `IS_PBT`, `IS_NET_PBT` | CK |
| 359 | FALSE | TRUE | 357 | IS | 9.1. Lợi nhuận đã thực hiện (ở stt 1133) | `IS_REALIZED_PROFIT` | CK |
| 360 | FALSE | TRUE | 357 | IS | 9.2. Lợi nhuận chưa thực hiện (ở stt 1134) | `BS_UNREALIZED_PROFIT` | CK |
| 361 | TRUE | FALSE | null | IS | X. CHI PHÍ THUẾ TNDN | `IS_TAX_EXP` | CK |
| 362 | FALSE | TRUE | 361 | IS | Chi phí thuế TNDN (ở stt 1295) | `IS_TAX_EXP` | CK |
| 363 | FALSE | TRUE | 361 | IS | 10.1. Chi phí thuế TNDN hiện hành (ở stt 786) | `IS_TAX_CURRENT` | CK |
| 364 | FALSE | TRUE | 361 | IS | 10.2. Chi phí thuế TNDN hoãn lại (ở stt 787) | `IS_TAX_DEFERRED` | CK |
| 365 | TRUE | FALSE | null | IS | XI. LỢI NHUẬN KẾ TOÁN SAU THUẾ TNDN | `IS_NPAT` | CK |
| 366 | FALSE | TRUE | 365 | IS | Lợi nhuận kế toán sau thuế TNDN (ở stt 1300) | `IS_NPAT` | CK |
| 367 | FALSE | TRUE | 365 | IS | 11.1. Lợi nhuận sau thuế phân bổ cho chủ sở hữu (ở stt 798) | `IS_NPAT_OWNER` | CK |
| 368 | FALSE | TRUE | 365 | IS | 11.2. Lợi nhuận sau thuế trích các Quỹ dự trữ điều lệ, Quỹ Dự phòng tài chính và rủi ro nghề nghiệp | `IS_NPAT_POST_RESERVE` | CK |
| 369 | FALSE | TRUE | 365 | IS | 11.3. Lợi nhuận thuần phân bổ cho lợi ích của cổ đông không kiểm soát (ở stt 801) | `IS_MINORITY_INTEREST` | CK |
| 370 | TRUE | FALSE | null | IS | XII. THU NHẬP (LỖ) TOÀN DIỆN KHÁC SAU THUẾ TNDN | `IS_COMPREHENSIVE_INCOME_POST_TAX` | CK |
| 371 | FALSE | TRUE | 370 | IS | Thu nhập (Lỗ) toàn diện khác sau thuế TNDN (ở stt 1299) | `IS_COMPREHENSIVE_INCOME_POST_TAX` | CK |
| 372 | FALSE | TRUE | 370 | IS | Tổng thu nhập toàn diện | `IS_COMPREHENSIVE_INCOME_TOTAL` | CK |
| 373 | FALSE | TRUE | 370 | IS | Thu nhập toàn diện phân bổ cho chủ sở hữu | `IS_COMPREHENSIVE_INCOME_OWNER` | CK |
| 374 | FALSE | TRUE | 370 | IS | Thu nhập toàn diện phân bổ cho cổ đông không nắm quyền kiểm soát | `IS_COMPREHENSIVE_INCOME_MI` | CK |
| 375 | FALSE | TRUE | 370 | IS | 12.1. Lãi/(Lỗ) từ đánh giá lại các khoản đầu tư giữ đến ngày đáo hạn | `IS_HTM_REVAL_PROFIT` | CK |
| 376 | FALSE | TRUE | 370 | IS | 12.2. Lãi/(Lỗ) từ đánh giá lại các tài sản tài chính sẵn sàng để bán | `IS_AFS_REVAL_PROFIT` | CK |
| 377 | FALSE | TRUE | 370 | IS | 12.3. Lãi (Lỗ) toàn diện khác được chia từ hoạt động đầu tư vào công ty con, công ty liên kết, liên doanh | `IS_OCI_SUB_JV_ASSOC` | CK |
| 378 | FALSE | TRUE | 370 | IS | 12.4. Lãi/(Lỗ) từ đánh giá lại các công cụ tài chính phái sinh (ở stt 817) | `IS_PROFIT_LOSS_OTHER` | CK |
| 379 | FALSE | TRUE | 370 | IS | 12.5. Lãi/(Lỗ) chênh lệch tỷ giá của hoạt động tại nước ngoài | `IS_FX_FOREIGN_OP_PROFIT` | CK |
| 380 | FALSE | TRUE | 370 | IS | 12.6. Lãi/(Lỗ) từ các khoản đầu tư vào công ty con, công ty liên kết, liên doanh chưa chia (ở stt 819) | `IS_PROFIT_LOSS_OTHER` | CK |
| 381 | FALSE | TRUE | 370 | IS | 12.7. Lãi/(Lỗ) đánh giá công cụ phái sinh | `IS_DERIVATIVES_REVAL_PROFIT` | CK |
| 382 | FALSE | TRUE | 370 | IS | 12.8. Lãi/(Lỗ) đánh giá lại tài sản cố định theo mô hình giá trị hợp lý | `IS_FA_REVAL_FV_PROFIT` | CK |
| 383 | TRUE | FALSE | null | IS | XIII. THU NHẬP THUẦN TRÊN CỔ PHIẾU PHỔ THÔNG | `IS_EPS_BASIC` | CK |
| 384 | FALSE | TRUE | 383 | IS | 13.1. Lãi cơ bản trên cổ phiếu (Đồng/1 cổ phiếu) (ở stt 835 hoặc stt 1297) | `IS_EPS_BASIC` | CK |
| 385 | FALSE | TRUE | 383 | IS | 13.2. Thu nhập pha loãng trên cổ phiếu (Đồng/1 cổ phiếu) | `IS_EPS_DILUTED` | CK |

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
| 71 | FALSE | TRUE | 64 | CF | Thay đổi vốn lưu động & Hoạt động nghiệp vụ tài chính | `CF_CFO_REC_CHG`, `CF_CFO_PAY_CHG`, `CF_CFO_INV_CHG`, `CF_CFO_PREPAID_CHG`, `CF_CFO_ST_OTHER_ASSET_CHG`, `CF_CFO_OTHER_ASSETS_CHG`, `CF_CFO_OP_WC_CHG`, `CF_CFO_OP_ASSETS`, `CF_CFO_OP_LIAB_CHG`, `CF_CFO_LOANS_CHG`, `CF_CFO_CUST_DEPOSITS_CHG`, `CF_CFO_GOV_DEBT_CHG`, `CF_CFO_DEPOSITS_LOANS_CI_CHG`, `CF_CFO_ISSUED_PAPER_CHG`, `CF_CFO_SPONSORED_FUNDS_CHG`, `CF_CFO_LOANS_CUST`, `CF_CFO_LOANS_CI`, `CF_CFO_DERIVATIVES_LIAB_CHG`, `CF_CFO_FVTPL_CHG`, `CF_CFO_AFS_CHG`, `CF_CFO_HTM_CHG`, `CF_CFO_SEC_TRADING`, `CF_CFO_REC_SVC`, `CF_CFO_REC_OTHER`, `CF_CFO_REC_FIN_SALE`, `CF_CFO_REC_FIN_INT`, `CF_CFO_FIN_ASSET_PURCHASE`, `CF_CFO_FIN_ASSET_SALE`, `CF_CFO_TRADING_DIFF`, `CF_CFO_PROVISIONS`, `CF_CFO_CLAIM_PROV_CHG`, `CF_CFO_FEE_MATH_PROV_CHG`, `CF_CFO_DERIVATIVES` | Chung |
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