-- V3.120.0（续 0120）：把 V3.119.0 新增的 C1 批次追溯工单补入生产库
--
-- 背景：0120 已把 fin-001 的 WO20240515001 修正为 WO-2024-0501，但 fin-002 仍指向
--       WO20240601001 —— 原因是它对应的正确工单 WO-2024-0601（id=wo-c1-001）是 V3.119.0
--       在 src/mocks/data/production.ts 里**新增的种子**，而生产 work_orders 表早有数据，
--       「空库才回填」机制从未执行 → 库里没有这张工单，EXISTS 守卫正确地拦下了这次改写。
--
-- 设计意图（与源码注释一致）：fin-002 / out-003 引用 workOrderId='wo-c1-001' 从一开始
--   就指向这张工单，只是工单本身没被建出来。所以**补工单**才是正解，把入库单改指别的
--   工单会凭空给那张工单多加一批产出入库，并破坏「6/1 开工 → 6/20 完工入库」的时间线。
--
-- 幂等：INSERT OR IGNORE + UNIQUE(org_id, order_no) 双保险，重复执行无副作用。
-- org 归属：取生产库里已有的唯一组织（本项目为单组织部署，多组织时会插入多条 —— 但本
--   迁移只对存在 fin-002 且该单 org_id 的组织补工单，因此天然按单归属，不会跨组织扩散）。

INSERT OR IGNORE INTO work_orders (
  id, org_id, order_no, status, product_code, product_name,
  bom_id, bom_no, route_id, route_no,
  planned_quantity, completed_quantity, scrap_quantity, qualified_quantity,
  planned_start_date, planned_end_date, actual_start_date, actual_end_date,
  priority, workshop, supervisor,
  created_at, updated_at, created_by, updated_by,
  created_by_name, updated_by_name
)
SELECT
  'wo-c1-001', fgi.org_id, 'WO-2024-0601', 'completed',
  'PRD-FRAME-001', '重型钢结构焊接架 H1200',
  'bom-001', 'BOM-2024-001', 'route-001', 'RT-2024-001',
  30, 28, 1, 27,
  '2024-06-01', '2024-06-20', '2024-06-01', '2024-06-19',
  'normal', '焊接车间', '刘生产主管',
  '2024-05-28T09:00:00Z', '2024-06-19T17:00:00Z', 'user-pm01', 'user-pm01',
  '系统', '系统'
FROM finished_goods_inbounds fgi
WHERE fgi.inbound_no = 'FIN20240620001'
  AND NOT EXISTS (
    SELECT 1 FROM work_orders w
    WHERE w.org_id = fgi.org_id AND w.order_no = 'WO-2024-0601'
  );

-- 工单补齐后，再执行一次成品入库的单号改写（此时 EXISTS 守卫会通过）。
UPDATE finished_goods_inbounds
SET work_order_no = 'WO-2024-0601'
WHERE work_order_no = 'WO20240601001'
  AND EXISTS (
    SELECT 1 FROM work_orders w
    WHERE w.order_no = 'WO-2024-0601'
      AND w.org_id = finished_goods_inbounds.org_id
  );

-- 领料出库单 out-003 同样引用旧号（若生产库存在该单），一并订正为按工单领料。
UPDATE outbound_orders
SET source_no = 'WO-2024-0601'
WHERE source_no = 'WO20240601001'
  AND type = 'pick'
  AND EXISTS (
    SELECT 1 FROM work_orders w
    WHERE w.order_no = 'WO-2024-0601'
      AND w.org_id = outbound_orders.org_id
  );
