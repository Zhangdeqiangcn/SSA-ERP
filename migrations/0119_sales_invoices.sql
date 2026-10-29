-- V3.112.0：销售发票持久化
-- 背景：原 salesAdvancedStore.salesInvoices 仅 zustand 内存态（addInvoice 不持久化、store 无 hydrateInvoices、
--       SalesInvoice.tsx 不触发任何后端加载）→ 列表永远空、V3.111.0 新建的发票详情页成为死路。
--       项目此前无销售发票专用表，fin_invoices 实为采购发票表（vendor_name/purchase_order_no 等采购字段）。
-- 方案：克隆 sales_quotations（迁移 0100）范式建销售发票表；items 明细封 extra_json，头部金额列支持列表直查；
--       组织内共享单据，rls 登 'all'（组织隔离靠 org_id，'all' ≠ 跨组织放行）。
-- 编号：接在生产已应用的 0118_po_row_vendor_project 之后（本地与远程 d1_migrations 最高均 0118）。

CREATE TABLE IF NOT EXISTS sales_invoices (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  invoice_no TEXT,
  invoice_type TEXT,
  sales_order_no TEXT,
  customer_name TEXT,
  status TEXT,
  invoice_date TEXT,
  currency TEXT,
  amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  linked_return_no TEXT,
  voucher_no TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_org ON sales_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_no ON sales_invoices(org_id, invoice_no);
