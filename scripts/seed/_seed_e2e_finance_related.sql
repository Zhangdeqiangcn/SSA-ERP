-- V3.113.2 本地验证造数：财务域「来源单号可点」链路
-- 目标：让发票 → 采购订单、付款计划 → 采购订单/发票、凭证 → 发票 三条链路在本地真实可解析。
-- 仅用于本地 E2E 验证，不进入迁移链。

-- 1) 采购发票：指向真实存在的采购订单 PO20240506001
INSERT OR IGNORE INTO fin_invoices (id,org_id,invoice_no,invoice_type,status,vendor_name,vendor_tax_no,purchase_order_no,invoice_date,received_date,amount,tax_rate,tax_amount,total_amount,currency,exchange_rate,note,voucher_generated,created_at,updated_at)
VALUES ('fi-v31132-1','org_e2e_sandbox','INV-V31132-001','vat_special','submitted','鞍钢股份','91310000MA1V31132','PO20240506001','2026-10-20','2026-10-21',100000,13,13000,113000,'CNY',1,'V3.113.2 验证：发票上游采购订单',0,'2026-10-20T08:00:00.000Z','2026-10-21T08:00:00.000Z');

-- 2) 付款计划：同时指向采购订单与上面的发票（验证「关联采购单」「关联发票」两条链接分别可点）
INSERT OR IGNORE INTO fin_payment_plans (id,org_id,plan_no,vendor_name,vendor_id,purchase_order_no,invoice_no,total_amount,paid_amount,status,due_date,payment_method,note,voucher_generated,advance_amount,advance_occupied,currency,exchange_rate,created_at,updated_at,version)
VALUES ('pp-v31132-1','org_e2e_sandbox','PP-V31132-001','鞍钢股份','vend-001','PO20240506001','INV-V31132-001',113000,0,'pending','2026-11-20','bank_transfer','V3.113.2 验证：付款计划上游采购订单+发票',0,0,0,'CNY',1,'2026-10-20T08:00:00.000Z','2026-10-20T08:00:00.000Z',1);

-- 3) 草稿凭证：来源单据指向真实发票 INV-V31132-001（验证凭证「来源单据」可点）
INSERT OR IGNORE INTO vouchers (id,org_id,voucher_no,date,source,status,source_no,total_debit,total_credit,created_by,voucher_type,period,attachment_count,currency,created_at,updated_at)
VALUES ('vch-v31132-1','org_e2e_sandbox','V-V31132-001','2026-10-20','invoice','draft','INV-V31132-001',113000,113000,'系统','记','2026-10',1,'CNY','2026-10-20T08:00:00.000Z','2026-10-20T08:00:00.000Z');
INSERT OR IGNORE INTO voucher_items (id,voucher_id,line_no,summary,account_code,account_name,debit,credit,currency)
VALUES ('vi-v31132-1','vch-v31132-1',1,'冲采购暂估 INV-V31132-001','2201','物资采购（GR/IR暂估）',100000,0,'CNY'),
       ('vi-v31132-2','vch-v31132-1',2,'进项税额 INV-V31132-001','2221','应交税费-应交增值税',13000,0,'CNY');
