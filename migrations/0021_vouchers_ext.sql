-- W1 根治双通道：凭证表扩展，支撑 financeStore 的 vouchers 切片直连真实 D1 vouchers 表
-- 现有 vouchers 表缺前端 Voucher 业务字段（voucherType/period/currency/reversed/reversalVoucherNo/attachmentCount/sourceNo），
-- 不扩展则「根治」会丢凭证类型/会计期间/红冲关联等业务信息。
PRAGMA foreign_keys = ON;
ALTER TABLE vouchers ADD COLUMN voucher_type TEXT;
ALTER TABLE vouchers ADD COLUMN period TEXT;
ALTER TABLE vouchers ADD COLUMN attachment_count INTEGER DEFAULT 0;
ALTER TABLE vouchers ADD COLUMN source_no TEXT;
ALTER TABLE vouchers ADD COLUMN currency TEXT DEFAULT 'CNY';
ALTER TABLE vouchers ADD COLUMN reversed INTEGER DEFAULT 0;
ALTER TABLE vouchers ADD COLUMN reversal_voucher_no TEXT;
INSERT INTO schema_migrations (version, applied_at) VALUES ('0021_vouchers_ext', datetime('now')) ON CONFLICT(version) DO NOTHING;
