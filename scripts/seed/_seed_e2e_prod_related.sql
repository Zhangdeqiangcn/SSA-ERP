-- 生产环境 E2E 沙箱补种：给 org_e2e_sandbox 补一条「有上游关系」的入库单 + 对应采购订单 + 明细。
-- 目的：生产实测「详情页关联单据可点跳转」——该租户原有 5 条入库单 source_no 全为空，
--       无任何可验证的关联关系，故补一条最小闭环数据（入库单 → 上游采购订单）。
-- 作用域：仅 org_e2e_sandbox（端到端测试专用租户），不触碰任何真实业务租户数据。
-- 执行：npx wrangler d1 execute ssa-erp-db --remote --file scripts/seed/_seed_e2e_prod_related.sql

INSERT OR IGNORE INTO purchase_orders (org_id,id,order_no,vendor_id,vendor_name,status,order_date,expected_delivery_date,total_amount,currency,tax_included,total_tax_amount,grand_total,payment_terms,order_mode,created_at,updated_at,created_by,updated_by) VALUES ('org_e2e_sandbox','po-e2e-prod','PO20240506001','vendor-e2e-prod','E2E 验证供应商','completed','2026-05-08','2026-05-20',10000,'CNY',1,0,10000,'款到发货','purchase',datetime('now'),datetime('now'),'e2e_supervisor','e2e_supervisor');

INSERT OR IGNORE INTO inbound_orders (org_id,id,inbound_no,type,source_no,vendor_id,vendor_name,status,warehouse_id,warehouse_name,operator,inbound_date,total_cost,inventory_posted,cost_posted,created_at,updated_at,created_by,updated_by) VALUES ('org_e2e_sandbox','inb-e2e-prod','INB-E2E-20260526','purchase','PO20240506001','vendor-e2e-prod','E2E 验证供应商','completed','wh-e2e-prod','E2E 验证仓库','e2e_supervisor','2026-05-20',10000,1,1,datetime('now'),datetime('now'),'e2e_supervisor','e2e_supervisor');

INSERT OR IGNORE INTO inbound_order_items (id,inbound_order_id,material_id,material_code,material_name,specification,unit,expected_quantity,actual_quantity,batch_no,location_id,location_name,quality_status,unit_price,amount) VALUES ('inb-e2e-prod-1','inb-e2e-prod','mat-e2e-prod','MAT-E2E-001','E2E 验证物料','SPEC-E2E','件',10,10,NULL,'loc-e2e-prod','E2E 验证库位','qualified',1000,10000);
