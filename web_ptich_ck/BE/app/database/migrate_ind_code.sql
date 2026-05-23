-- ============================================================
-- Migration: Update ind_code in bctc based on ind_name mapping
-- Source: bctc.md (294 entries)
-- ============================================================
-- BACKUP BEFORE RUNNING:
-- pg_dump -U admin -d your_db -t hethong_phantich_chungkhoan.bctc > bctc_backup.sql
-- ============================================================

SET search_path TO hethong_phantich_chungkhoan;

-- ────────────────────────────────────────────────────────────
-- Step 0: DIAGNOSTIC — Find ind_names for unknown old codes
-- RUN THIS FIRST to identify unmapped bank/legacy codes
-- ────────────────────────────────────────────────────────────

-- 0a. Find ind_names for ALL old codes used in backend source code
SELECT DISTINCT ind_code, ind_name, COUNT(*) AS cnt
FROM bctc
WHERE ind_code IN (
    -- Bank IS fallbacks
    'DOANH_THU_NG',
    'T_NG_THU_NH_P_HO_T_NG',
    'LN_T_H_KD_TR_C_CF_D_PH_NG',
    'THU_NH_P_L_I_THU_N',
    'CHI_PH_L_I_V_C_C_KHO_N_T_NG_T',
    'THU_TNDN',
    -- Bank IS extras
    'THU_NH_P_L_I_V_C_C_KHO_N_T_NG_T',
    'L_I_L_T_PHI_D_CH_V',
    'L_I_L_T_H_KD_NGO_I_H_I',
    'L_I_L_T_MUA_B_N_CK_KD',
    'L_I_L_T_MUA_B_N_CK_T',
    'L_I_L_T_HO_T_NG_KH_C',
    'CHI_PH_HO_T_NG',
    'CHI_PH_D_PH_NG_RR_TD',
    -- Bank BS extras
    'CHO_VAY_KH_CH_H_NG_THU_N',
    'CHO_VAY_V_NG_TR_C_KH_CH_H_NG',
    'D_PH_NG_RR_CHO_VAY_KH_CH_H_NG',
    'TI_N_G_I_C_A_KH_CH_H_NG',
    'TI_N_G_I_T_I_NHNN_VI_T_NAM',
    'TI_N_G_I_V_CHO_VAY_C_C_TD_KH_C',
    'CH_NG_KHO_N_KINH_DOANH_THU_N',
    'CH_NG_KHO_N_U_T_THU_N',
    'PH_T_H_NH_GI_Y_T_C_GI_TR',
    -- Legacy index code
    'IS24'
)
GROUP BY ind_code, ind_name
ORDER BY ind_code, cnt DESC;

-- 0b. Find ALL ind_codes that exist in DB but NOT in bctc.md mapping
-- (run after creating the mapping table in Step 1)

-- ────────────────────────────────────────────────────────────
-- Step 1: Drop old PK, dedup (temp table), add new PK
-- ────────────────────────────────────────────────────────────
BEGIN;

-- 1a. Drop old PK
ALTER TABLE bctc DROP CONSTRAINT pk_bctc;

-- 1b. Dedup bằng temp table (nhanh)
-- Giữ row có import_time mới nhất cho mỗi (ticker, year, quarter, ind_name)
-- Bỏ qua ind_code → xử lý luôn trường hợp cùng ind_name khác ind_code
CREATE TEMP TABLE bctc_dedup AS
SELECT DISTINCT ON (ticker, year, quarter, ind_name)
    ticker, quarter, year, ind_name, ind_code, value,
    import_time, report_name, report_code
FROM bctc
ORDER BY ticker, year, quarter, ind_name,
         import_time DESC NULLS LAST;

TRUNCATE bctc;
INSERT INTO bctc SELECT * FROM bctc_dedup;
DROP TABLE bctc_dedup;

-- 1c. Add new PK with ind_name
ALTER TABLE bctc ADD CONSTRAINT pk_bctc PRIMARY KEY (ticker, year, quarter, ind_code, ind_name);

-- ────────────────────────────────────────────────────────────
-- Step 2: Create mapping table from bctc.md
-- ────────────────────────────────────────────────────────────
CREATE TEMP TABLE ind_code_mapping (
    ind_name TEXT NOT NULL,
    new_ind_code TEXT NOT NULL
);

INSERT INTO ind_code_mapping (ind_name, new_ind_code) VALUES
('Ảnh hưởng của chênh lệch tỷ giá', 'ah_tygia'),
('Ảnh hưởng của thay đổi tỷ giá', 'ah_tygia'),
('Available-for Sales Securities', 'chung_khoan_dau_tu_san_sang_de_ban'),
('Balances with the SBV', 'tien_gui_tai_ngan_hang_nha_nuoc_viet_nam'),
('Budget sources and other funds', 'von_ngan_sach_nha_nuoc_va_quy_khac'),
('_Các công cụ tài chính phái sinh và khoản nợ tài chính khác', 'phai_sinh_va_no_tc_khac'),
('Các công cụ tài chính phái sinh và khoản nợ tài chính khác', 'phai_sinh_va_no_tc_khac'),
('Các khoản giảm trừ doanh thu', 'cac_khoan_giam_tru_doanh_thu'),
('Các khoản nợ chính phủ và NHNN Việt Nam', 'cac_khoan_no_chinh_phu_va_nhnn_viet_nam'),
('Các khoản nợ khác', 'cac_khoan_no_khac'),
('Các khoản phải thu', 'cac_khoan_phai_thu'),
('Các khoản phải thu ngắn hạn (đồng)', 'cac_khoan_phai_thu'),
('_Các quỹ khác', 'quy_khac'),
('Các quỹ khác', 'quy_khac'),
('Capital', 'von_cua_to_chuc_tin_dung'),
('Chênh lệch đánh giá lại tài sản', 'chenh_lech_danh_gia_lai_tai_san'),
('Chênh lệch tỷ giá hối đoái', 'cl_tygia'),
('Chi phí bán hàng', 'chi_phi_ban_hang'),
('Chi phí dự phòng rủi ro tín dụng', 'chi_phi_du_phong_rui_ro_tin_dung'),
('Chi phí hoạt động dịch vụ', 'cp_dv'),
('Chi phí hoạt động khác', 'chi_phi_hoat_dong_khac'),
('Chi phí lãi và các khoản tương tự', 'chi_phi_lai_va_cac_khoan_tuong_tu'),
('Chi phí lãi vay', 'cp_lai_vay'),
('Chi phí lãi vay đã trả', 'lai_vay_da_tra'),
('Chi phí lãi vay (Lưu chuyển tiền tệ)', 'cp_lai_vay_lctt'),
('Chi phí quản lý DN', 'cp_qldn'),
('Chi phí quản lý doanh nghiệp', 'cp_qldn'),
('Chi phí tài chính', 'chi_phi_tai_chinh'),
('Chi phí thuế TNDN hiện hành', 'thue_tndn_hh'),
('Chi phí thuế TNDN hoãn lại', 'thue_tndn_hl'),
('Chi phí tiền lãi vay', 'cp_lai_vay'),
('Chi phí trả trước dài hạn', 'chi_phi_tra_truoc_dai_han'),
('Chi trả cho việc mua lại, trả cổ phiếu', 'chi_tra_cho_viec_mua_lai_tra_co_phieu'),
('Chi từ các quỹ của TCTD', 'chi_tu_cac_quy_cua_tctd'),
('_Cho vay khách hàng', 'cho_vay_khach_hang'),
('Chứng khoán đầu tư', 'chung_khoan_dau_tu'),
('Chứng khoán đầu tư giữ đến ngày đáo hạn', 'chung_khoan_dau_tu_giu_den_ngay_dao_han'),
('Chứng khoán đầu tư sẵn sàng để bán', 'chung_khoan_dau_tu_san_sang_de_ban'),
('_Chứng khoán kinh doanh', 'chung_khoan_kinh_doanh'),
('Chứng khoán kinh doanh', 'chung_khoan_kinh_doanh'),
('Cổ đông của Công ty mẹ', 'co_dong_cua_cong_ty_me'),
('Cổ đông thiểu số', 'loi_ich_cd_ts'),
('Convertible bonds (Bn. VND)', 'tp_chuyen_doi'),
('Convertible bonds/CDs and other valuable papers issued', 'giay_to_co_gia_phat_hanh'),
('Cổ phiếu phổ thông', 'cp_pho_thong'),
('Cổ phiếu phổ thông (đồng)', 'cp_pho_thong'),
('Cố tức đã nhận', 'co_tuc_da_nhan'),
('Cổ tức đã trả', 'co_tuc_da_tra'),
('Cổ tức, lợi nhuận đã trả cho chủ sở hữu', 'co_tuc_loi_nhuan_da_tra_cho_chu_so_huu'),
('Đầu tư dài hạn (đồng)', 'dt_tc_dh'),
('Đầu tư tài chính dài hạn', 'dt_tc_dh'),
('Đầu tư tài chính ngắn hạn', 'dau_tu_tai_chinh_ngan_han'),
('Đầu tư vào các doanh nghiệp khác', 'dau_tu_vao_cac_doanh_nghiep_khac'),
('Đầu tư vào công ty con', 'dau_tu_vao_cong_ty_con'),
('Đầu tư vào công ty liên doanh', 'dau_tu_vao_cong_ty_lien_doanh'),
('Deposits and borrowings from other credit institutions', 'tien_gui_va_vay_cac_to_chuc_tin_dung_khac'),
('Deposits from customers', 'tien_gui_cua_khach_hang'),
('_Derivatives and other financial liabilities', 'phai_sinh_va_no_tc_khac'),
('Derivatives and other financial liabilities', 'phai_sinh_va_no_tc_khac'),
('Difference upon Assets Revaluation', 'chenh_lech_danh_gia_lai_tai_san'),
('Dividends received', 'co_tuc_da_nhan'),
('Doanh thu', 'doanh_thu'),
('Doanh thu bán hàng', 'doanh_thu_ban_hang'),
('Doanh thu bán hàng và cung cấp dịch vụ', 'doanh_thu_ban_hang_va_cung_cap_dich_vu'),
('Doanh thu (đồng)', 'doanh_thu'),
('Doanh thu tài chính', 'dt_tc'),
('Doanh thu thuần', 'doanh_thu_thuan'),
('Due to Gov and borrowings from SBV', 'cac_khoan_no_chinh_phu_va_nhnn_viet_nam'),
('Dự phòng giảm giá chứng khoán đầu tư', 'du_phong_giam_gia_chung_khoan_dau_tu'),
('Dự phòng giảm giá chứng khoán kinh doanh', 'du_phong_giam_gia_chung_khoan_kinh_doanh'),
('Dự phòng giảm giá đầu tư dài hạn', 'du_phong_giam_gia_dau_tu_dai_han'),
('Dự phòng RR tín dụng', 'dp_rr_td'),
('Dự phòng rủi ro cho vay khách hàng', 'du_phong_rui_ro_cho_vay_khach_hang'),
('Dự phòng tổn thất tín dụng', 'du_phong_ton_that_tin_dung'),
('EPS_basis', 'eps_basis'),
('Fees and Comission Expenses', 'cp_dv'),
('Fees and Comission Income', 'tn_dv'),
('Foreign Currency Difference reserve', 'cl_tygia'),
('Funds received from Gov, international and other institutions', 'von_tai_tro_uy_thac_dau_tu_cua_cp_va_cac_to_chuc_td_khac'),
('Giá trị ròng tài sản đầu tư', 'gia_tri_rong_tai_san_dau_tu'),
('Giá trị thuần đầu tư ngắn hạn (đồng)', 'gia_tri_thuan_dau_tu_ngan_han'),
('Giá vốn hàng bán', 'gia_von_hang_ban'),
('Goodwill', 'loi_the_tm'),
('Hàng tồn kho', 'hang_ton_kho'),
('Hàng tồn kho ròng', 'htk_rong'),
('Hàng tồn kho, ròng (đồng)', 'htk_rong'),
('Held-to-Maturity Securities', 'chung_khoan_dau_tu_giu_den_ngay_dao_han'),
('Hoạt động khác', 'hoat_dong_khac'),
('_Increase/Decrease in payables', 'tg_ptr'),
('_Increase/Decrease in receivables', 'tg_pt'),
('Intagible fixed assets', 'tscd_vh'),
('Interest and Similar Expenses', 'chi_phi_lai_va_cac_khoan_tuong_tu'),
('Interest and Similar Income', 'thu_nhap_lai_va_cac_khoan_tuong_tu'),
('Investment in joint ventures', 'dau_tu_vao_cong_ty_lien_doanh'),
('Investment in properties', 'bat_dong_san_dau_tu'),
('Investment Securities', 'chung_khoan_dau_tu'),
('Investments in associate companies', 'dau_tu_vao_cong_ty_lien_ket'),
('Khấu hao TSCĐ', 'khau_hao_tscd'),
('Khấu hao và hao mòn', 'khau_hao_va_hao_mon'),
('Kinh doanh ngoại hối và vàng', 'kinh_doanh_ngoai_hoi_va_vang'),
('Lãi chưa phân phối (đồng)', 'lnst_chua_pp'),
('Lãi cơ bản trên cổ phiếu', 'lai_co_ban_tren_co_phieu'),
('Lãi gộp', 'ln_gop'),
('(Lãi)/lỗ các hoạt động khác', 'lai_lo_cac_hoat_dong_khac'),
('Lãi/lỗ chênh lệch tỷ giá chưa thực hiện', 'lai_lo_chenh_lech_ty_gia_chua_thuc_hien'),
('Lãi/Lỗ chênh lệch tỷ giá chưa thực hiện', 'lai_lo_chenh_lech_ty_gia_chua_thuc_hien'),
('Lãi/Lỗ ròng trước thuế', 'lntt'),
('Lãi/lỗ thuần từ hoạt động khác', 'lai_lo_thuan_tu_hoat_dong_khac'),
('Lãi lỗ trong công ty liên doanh, liên kết', 'lai_lo_trong_cong_ty_lien_doanh_lien_ket'),
('Lãi/lỗ từ công ty liên doanh', 'lai_lo_tu_cong_ty_lien_doanh'),
('Lãi/lỗ từ công ty liên doanh liên kết', 'lai_lo_tu_cong_ty_lien_doanh_lien_ket'),
('Lãi/lỗ từ hoạt động đầu tư', 'lai_lo_tu_hoat_dong_dau_tu'),
('Lãi/Lỗ từ hoạt động đầu tư', 'lai_lo_tu_hoat_dong_dau_tu'),
('Lãi/Lỗ từ hoạt động kinh doanh', 'lai_lo_tu_hoat_dong_kinh_doanh'),
('Lãi/Lỗ từ thanh lý tài sản cố định', 'lai_lo_tu_thanh_ly_tai_san_co_dinh'),
('Lãi thuần từ hoạt động dịch vụ', 'ln_thuan_dv'),
('Lãi tiền gửi và cổ tức', 'lai_tien_gui_va_co_tuc'),
('Leased assets', 'tai_san_thue_tai_chinh'),
('Less: Provision for diminuation in value of long term investments', 'du_phong_giam_gia_dau_tu_dai_han'),
('Less: Provision for diminution in value of investment securities', 'du_phong_giam_gia_chung_khoan_dau_tu'),
('Less: Provision for losses on loans and advances to customers', 'du_phong_rui_ro_cho_vay_khach_hang'),
('LNST chưa phân phối', 'lnst_chua_pp'),
('LNST của cổ đông công ty mẹ', 'lnst_cua_co_dong_cong_ty_me'),
('LNST phân bổ cho CĐ công ty mẹ', 'lnst_phan_bo_cho_cd_cong_ty_me'),
('LN trước thuế', 'lntt'),
('LN từ HĐKD trước CF dự phòng', 'ln_tu_hdkd_truoc_cf_du_phong'),
('Loans and advances to customers', 'cho_vay_khach_hang'),
('Loans and advances to customers, net', 'cho_vay_khach_hang_rong'),
('Lợi ích cổ đông thiểu số', 'loi_ich_cd_ts'),
('Lợi ích cổ đông thiểu số (Nguồn vốn)', 'loi_ich_cd_ts'),
('LỢI ÍCH CỦA CỔ ĐÔNG THIỂU SỐ', 'loi_ich_cd_ts'),
('Lợi nhuận gộp', 'ln_gop'),
('Lợi nhuận khác', 'loi_nhuan_khac'),
('Lợi nhuận/Lỗ thuần trước thuế', 'lntt'),
('Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)', 'loi_nhuan_sau_thue_cua_co_dong_cong_ty_me'),
('Lợi nhuận sau thuế thu nhập DN', 'loi_nhuan_sau_thue_thu_nhap_dn'),
('Lợi nhuận thuần', 'loi_nhuan_thuan'),
('Lợi nhuận trước thuế', 'lntt'),
('Lợi nhuận từ HĐKD', 'ln_tu_hdkd'),
('Lợi nhuận từ HĐKD trước thay đổi vốn lưu động', 'loi_nhuan_tu_hdkd_truoc_thay_doi_von_luu_dong'),
('Lợi thế thương mại', 'loi_the_tm'),
('Lợi thế thương mại (đồng)', 'loi_the_tm'),
('Lưu chuyển tiền tệ ròng từ các hoạt động SXKD', 'luu_chuyen_tien_te_rong_tu_cac_hoat_dong_sxkd'),
('Lưu chuyển tiền thuần trong kỳ', 'luu_chuyen_tien_thuan_trong_ky'),
('Lưu chuyển tiền thuần từ HĐ đầu tư', 'lctt_thuan_hd_dt'),
('Lưu chuyển tiền thuần từ HĐKD', 'luu_chuyen_tien_thuan_tu_hdkd'),
('Lưu chuyển tiền thuần từ HĐKD trước thay đổi VLĐ', 'luu_chuyen_tien_thuan_tu_hdkd_truoc_thay_doi_vld'),
('Lưu chuyển tiền thuần từ HĐKD trước thuế', 'luu_chuyen_tien_thuan_tu_hdkd_truoc_thue'),
('Lưu chuyển tiền thuần từ HĐ tài chính', 'luu_chuyen_tien_thuan_tu_hd_tai_chinh'),
('Lưu chuyển tiền từ hoạt động tài chính', 'luu_chuyen_tien_tu_hoat_dong_tai_chinh'),
('Lưu chuyển từ hoạt động đầu tư', 'lctt_hd_dt'),
('Mua sắm TSCĐ', 'mua_sam_tscd'),
('Net Cash Flows from Operating Activities before BIT', 'net_cash_flows_from_operating_activities_before_bit'),
('Net Fee and Commission Income', 'ln_thuan_dv'),
('Net gain (loss) from disposal of investment securities', 'lai_lo_thuan_tu_thanh_ly_chung_khoan_dau_tu'),
('Net gain (loss) from foreign currency and gold dealings', 'lai_lo_thuan_tu_kinh_doanh_ngoai_hoi_va_vang'),
('Net gain (loss) from trading of trading securities', 'lai_lo_thuan_tu_kinh_doanh_chung_khoan'),
('Net income from associated companies', 'thu_nhap_thuan_tu_cong_ty_lien_ket'),
('Net Interest Income', 'tn_lai_thuan'),
('Net Other income/(expenses)', 'tn_cp_khac_thuan'),
('Net Other income/expenses', 'tn_cp_khac_thuan'),
('Người mua trả tiền trước', 'nguoi_mua_tra_tien_truoc'),
('Người mua trả tiền trước ngắn hạn (đồng)', 'nguoi_mua_tra_tien_truoc'),
('Nợ dài hạn', 'no_dai_han'),
('Nợ dài hạn (đồng)', 'no_dai_han'),
('Nợ ngắn hạn', 'no_ngan_han'),
('Nợ ngắn hạn (đồng)', 'no_ngan_han'),
('Nợ phải trả', 'no_phai_tra'),
('NỢ PHẢI TRẢ (đồng)', 'no_phai_tra'),
('Operating Profit before Provision', 'ln_tu_hdkd_truoc_cf_du_phong'),
('Other Assets', 'ts_co_khac'),
('Other expenses', 'chi_phi_khac'),
('Other liabilities', 'no_khac'),
('Other payments on operating activities', 'tien_chi_khac_tu_cac_hoat_dong_kinh_doanh'),
('Other receipts from operating activities', 'tien_thu_khac_tu_cac_hoat_dong_kinh_doanh'),
('_Other Reserves', 'quy_khac_khac'),
('Other Reserves', 'quy_khac_khac'),
('Payment from reserves', 'chi_tu_cac_quy_cua_tctd'),
('Phải thu dài hạn của khách hàng', 'phai_thu_dai_han_cua_khach_hang'),
('Phải thu dài hạn (đồng)', 'phai_thu_dai_han'),
('Phải thu dài hạn khác', 'phai_thu_dai_han_khac'),
('Phải thu dài hạn khác (đồng)', 'phai_thu_dai_han_khac'),
('Phải thu về cho vay dài hạn', 'phai_thu_ve_cho_vay_dai_han'),
('Phải thu về cho vay dài hạn (đồng)', 'phai_thu_ve_cho_vay_dai_han'),
('Phải thu về cho vay ngắn hạn', 'phai_thu_ve_cho_vay_ngan_han'),
('Phải thu về cho vay ngắn hạn (đồng)', 'phai_thu_ve_cho_vay_ngan_han'),
('Phát hành giấy tờ có giá', 'phat_hanh_giay_to_co_gia'),
('Placements with and loans to other credit institutions', 'tien_gui_tai_cac_tctd_khac_va_cho_vay_cac_tctd_khac'),
('Profit/Loss from disposal of fixed assets', 'lai_lo_tu_thanh_ly_tai_san_co_dinh'),
('Profits from other activities', 'loi_nhuan_khac'),
('Provision for diminution in value of Trading Securities', 'du_phong_giam_gia_chung_khoan_kinh_doanh'),
('Quỹ của tổ chức tín dụng', 'quy_cua_to_chuc_tin_dung'),
('Quỹ đầu tư phát triển', 'quy_dtpt'),
('Quỹ đầu tư và phát triển (đồng)', 'quy_dtpt'),
('Reserves', 'quy_du_tru'),
('Tài sản cố định', 'tscd'),
('Tài sản cố định (đồng)', 'tscd'),
('Tài sản cố định hữu hình', 'tscd_hh'),
('Tài sản cố định thuê tài chính', 'tai_san_co_dinh_thue_tai_chinh'),
('Tài sản cố định vô hình', 'tscd_vh'),
('Tài sản Có khác', 'ts_co_khac'),
('Tài sản dài hạn', 'ts_dh'),
('TÀI SẢN DÀI HẠN (đồng)', 'ts_dh'),
('Tài sản dài hạn khác', 'ts_dh_khac'),
('Tài sản dài hạn khác (Bn)', 'ts_dh_khac'),
('Tài sản dài hạn khác (đồng)', 'ts_dh_khac'),
('Tài sản lưu động khác', 'tsld_khac'),
('Tài sản lưu động khác (đồng)', 'tsld_khac'),
('Tài sản ngắn hạn', 'ts_nh'),
('TÀI SẢN NGẮN HẠN (đồng)', 'ts_nh'),
('Tài sản ngắn hạn khác', 'ts_nh_khac'),
('Tài sản ngắn hạn khác (Bn)', 'ts_nh_khac'),
('_Tăng/Giảm các khoản phải thu', 'tg_pt'),
('Tăng/Giảm các khoản phải thu', 'tg_pt'),
('_Tăng/Giảm các khoản phải trả', 'tg_ptr'),
('Tăng/Giảm các khoản phải trả', 'tg_ptr'),
('Tăng/Giảm chi phí trả trước', 'tang_giam_chi_phi_tra_truoc'),
('Tăng/Giảm hàng tồn kho', 'tang_giam_hang_ton_kho'),
('Tangible fixed assets', 'tscd_hh'),
('Tăng trưởng doanh thu (%)', 'tang_truong_doanh_thu_phan_tram'),
('Tăng trưởng doanh thu YoY', 'tang_truong_doanh_thu_yoy'),
('Tăng trưởng LNST mẹ YoY', 'tang_truong_lnst_me_yoy'),
('Tăng trưởng lợi nhuận (%)', 'tang_truong_loi_nhuan_phan_tram'),
('Tăng vốn cổ phần từ góp vốn và/hoặc phát hành cổ phiếu', 'tang_von_co_phan_tu_gop_von_va_hoac_phat_hanh_co_phieu'),
('Tax For the Year', 'thue_tndn'),
('Thuế TNDN', 'thue_tndn'),
('Thuế TNDN đã nộp', 'thue_tndn_da_nop'),
('Thuế TNDN hiện hành', 'thue_tndn_hh'),
('Thuế TNDN hoãn lại', 'thue_tndn_hl'),
('Thu lãi và cổ tức', 'thu_lai_va_co_tuc'),
('Thu nhập/Chi phí khác', 'tn_cp_khac'),
('Thu nhập khác', 'thu_nhap_khac'),
('Thu nhập lãi', 'thu_nhap_lai'),
('Thu nhập lãi thuần', 'tn_lai_thuan'),
('Thu nhập lãi và các khoản tương tự', 'thu_nhap_lai_va_cac_khoan_tuong_tu'),
('Thu nhập tài chính', 'dt_tc'),
('Thu nhập từ hoạt động dịch vụ', 'tn_dv'),
('Tiền chi cho vay, mua công cụ nợ của đơn vị khác (đồng)', 'tien_chi_cho_vay_mua_cong_cu_no_cua_don_vi_khac'),
('Tiền chi đầu tư góp vốn vào đơn vị khác', 'tien_chi_dau_tu_gop_von_vao_don_vi_khac'),
('Tiền chi khác từ các hoạt động kinh doanh', 'tien_chi_khac_tu_cac_hoat_dong_kinh_doanh'),
('Tiền chi mua sắm TSCĐ', 'tien_chi_mua_sam_tscd'),
('Tiền chi trả vốn góp, mua lại cổ phiếu', 'tien_chi_tra_von_gop_mua_lai_co_phieu'),
('Tiền cho vay, mua công cụ nợ', 'tien_cho_vay_mua_cong_cu_no'),
('Tiền gửi của khách hàng', 'tien_gui_cua_khach_hang'),
('Tiền gửi tại các TCTD khác và cho vay các TCTD khác', 'tien_gui_tai_cac_tctd_khac_va_cho_vay_cac_tctd_khac'),
('Tiền gửi tại ngân hàng nhà nước Việt Nam', 'tien_gui_tai_ngan_hang_nha_nuoc_viet_nam'),
('Tiền gửi và vay các Tổ chức tín dụng khác', 'tien_gui_va_vay_cac_to_chuc_tin_dung_khac'),
('Tiền lãi vay đã trả', 'lai_vay_da_tra'),
('Tiền thanh toán vốn gốc đi thuê tài chính', 'tien_thanh_toan_von_goc_di_thue_tai_chinh'),
('Tiền thu cổ tức và lợi nhuận được chia', 'tien_thu_co_tuc_va_loi_nhuan_duoc_chia'),
('Tiền thu được các khoản đi vay', 'tien_thu_duoc_cac_khoan_di_vay'),
('Tiền thu được từ thanh lý tài sản cố định', 'tien_thu_duoc_tu_thanh_ly_tai_san_co_dinh'),
('Tiền thu hồi cho vay, bán công cụ nợ', 'tien_thu_hoi_cho_vay_ban_cong_cu_no'),
('Tiền thu hồi cho vay, bán lại các công cụ nợ của đơn vị khác (đồng)', 'tien_thu_hoi_cho_vay_ban_lai_cac_cong_cu_no_cua_don_vi_khac'),
('Tiền thu hồi đầu tư góp vốn vào đơn vị khác', 'tien_thu_hoi_dau_tu_gop_von_vao_don_vi_khac'),
('Tiền thu khác từ các hoạt động kinh doanh', 'tien_thu_khac_tu_cac_hoat_dong_kinh_doanh'),
('Tiền thu lãi cho vay, cổ tức và lợi nhuận được chia', 'tien_thu_lai_cho_vay_co_tuc_va_loi_nhuan_duoc_chia'),
('Tiền thu nhập doanh nghiệp đã trả', 'thue_tndn_da_nop'),
('Tiền thu thanh lý TSCĐ', 'tien_thu_thanh_ly_tscd'),
('Tiền thu từ đi vay', 'tien_thu_tu_di_vay'),
('Tiền thu từ phát hành cổ phiếu, nhận vốn góp', 'tien_thu_tu_phat_hanh_co_phieu_nhan_von_gop'),
('Tiền thu từ việc bán các khoản đầu tư vào doanh nghiệp khác', 'tien_thu_tu_viec_ban_cac_khoan_dau_tu_vao_doanh_nghiep_khac'),
('Tiền trả các khoản đi vay', 'tien_tra_cac_khoan_di_vay'),
('Tiền trả nợ gốc thuê tài chính', 'tien_tra_no_goc_thue_tai_chinh'),
('Tiền trả nợ gốc vay', 'tien_tra_no_goc_vay'),
('Tiền và tương đương tiền', 'tien_va_tuong_duong_tien'),
('Tiền và tương đương tiền cuối kỳ', 'tien_va_tuong_duong_tien_cuoi_ky'),
('Tiền và tương đương tiền đầu kỳ', 'tien_va_tuong_duong_tien_dau_ky'),
('Tiền và tương đương tiền (đồng)', 'tien_va_tuong_duong_tien'),
('Tổng cộng nguồn vốn', 'tong_nv'),
('TỔNG CỘNG NGUỒN VỐN (đồng)', 'tong_nv'),
('Tổng cộng tài sản', 'tong_ts'),
('TỔNG CỘNG TÀI SẢN (đồng)', 'tong_ts'),
('Tổng thu nhập hoạt động', 'tong_tn_hd'),
('Total operating revenue', 'tong_tn_hd'),
('Trading Securities', 'chung_khoan_kinh_doanh'),
('Trading Securities, net', 'chung_khoan_kinh_doanh_rong'),
('Trái phiếu chuyển đổi (đồng)', 'tp_chuyen_doi'),
('Trả trước cho người bán', 'tra_truoc_cho_nguoi_ban'),
('Trả trước cho người bán ngắn hạn (đồng)', 'tra_truoc_cho_nguoi_ban'),
('Trả trước dài hạn (đồng)', 'tra_truoc_dai_han'),
('Vay và nợ dài hạn', 'vay_va_no_dai_han'),
('Vay và nợ ngắn hạn', 'vay_va_no_ngan_han'),
('Vay và nợ thuê tài chính dài hạn (đồng)', 'vay_va_no_thue_tai_chinh_dai_han'),
('Vay và nợ thuê tài chính ngắn hạn (đồng)', 'vay_va_no_thue_tai_chinh_ngan_han'),
('Vốn chủ sở hữu', 'vcsh'),
('VỐN CHỦ SỞ HỮU (đồng)', 'vcsh'),
('Vốn của tổ chức tín dụng', 'von_cua_to_chuc_tin_dung'),
('Vốn góp của chủ sở hữu', 'von_gop_csh'),
('Vốn góp của chủ sở hữu (đồng)', 'von_gop_csh'),
('Vốn Ngân sách nhà nước và quỹ khác', 'von_ngan_sach_nha_nuoc_va_quy_khac'),
('Vốn tài trợ, uỷ thác đầu tư của CP và các tổ chức TD khác', 'von_tai_tro_uy_thac_dau_tu_cua_cp_va_cac_to_chuc_td_khac'),
('Vốn và các quỹ', 'von_va_quy'),
('Vốn và các quỹ (đồng)', 'von_va_quy');

-- Verify mapping loaded
SELECT COUNT(*) AS total_mappings FROM ind_code_mapping;

-- ────────────────────────────────────────────────────────────
-- Step 3: Find unmapped rows (ind_names NOT in bctc.md)
-- Review output — add extra mappings if needed before Step 4
-- ────────────────────────────────────────────────────────────
SELECT b.ind_name, b.ind_code, COUNT(*) AS cnt
FROM bctc b
LEFT JOIN ind_code_mapping m ON BTRIM(b.ind_name) = BTRIM(m.ind_name)
WHERE m.ind_name IS NULL
GROUP BY b.ind_name, b.ind_code
ORDER BY cnt DESC
LIMIT 50;



-- ────────────────────────────────────────────────────────────
-- Step 4: Update ind_code based on ind_name mapping
-- ────────────────────────────────────────────────────────────
UPDATE bctc b
SET ind_code = m.new_ind_code
FROM ind_code_mapping m
WHERE BTRIM(b.ind_name) = BTRIM(m.ind_name)
  AND b.ind_code != m.new_ind_code;

-- ────────────────────────────────────────────────────────────
-- Step 5: Verify results
-- ────────────────────────────────────────────────────────────

-- Check remaining UPPER_CASE codes (should be only unmapped ones)
SELECT ind_code, COUNT(*) AS cnt
FROM bctc
WHERE ind_code ~ '^[A-Z_]+$' AND LENGTH(ind_code) > 5
GROUP BY ind_code
ORDER BY cnt DESC
LIMIT 30;

-- Sample of new ind_codes
SELECT DISTINCT ind_code FROM bctc ORDER BY ind_code LIMIT 50;

COMMIT;

-- Cleanup
DROP TABLE IF EXISTS ind_code_mapping;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stock_screener_base;
