-- V3.120.0：修正生产 D1 中残留的旧体系单号引用（关联列显示「已归档」的真死链）
--
-- 背景：V3.119.0 统一关联改造复核时发现，生产上「成品入库 → 生产工单」「波次拣货 → 销售订单」
--       两类关联列全部显示「已归档」。核验后确认**不是代码缺陷**，而是生产库里早于代码
--       种子修正就已落库的历史行：
--         · finished_goods_inbounds.work_order_no 仍是 WO20240601001 / WO20240515001
--           （旧编号体系），而 work_orders 实际单号是 WO-2024-0501 / WO-2024-0601 ...
--         · wave_rfid.lines[].orderNo 仍是 SO-2026-0001~0006，而 sales_orders 实际
--           单号是 SO202405003 / SO202406001~004 / SO-DEMO-20261022
--       src/mocks/data/*.ts 已改对，但 D1 里这些行早已存在；空库回填只在「表为空」时触发，
--       不会覆盖已有行 —— 所以只能靠数据迁移订正。
--
-- 原则：
--   1. **幂等**：WHERE 严格限定「当前值 = 旧单号」，重复执行无副作用。
--   2. **不造错**：新单号若在目标表查不到，宁可不改（关联列继续显示「已归档」也比指向一张
--      不存在的工单好）。因此用 EXISTS 做存在性守卫，而不是写死字符串。
--   3. **不动业务日期**：只换单号，入库日期保持原值 —— 它是历史事实。若按新工单重排日期，
--      6/20 的成品入库会跑到 5 月之前，时间线自相矛盾。
--   4. **按 org 隔离**：每个 UPDATE 都带 org_id 匹配，避免跨组织误改。
--
-- 映射依据（产品/数量/日期交叉核对）：
--   fin-001  FIN20240522001（入库 2024-05-22，成品 FG202405001 钢结构框架 A型）
--            旧 WO20240515001 → WO-2024-0501（重型钢结构焊接架 H1200，5/12 开工）
--   fin-002  FIN20240620001（入库 2024-06-20，同成品）
--            旧 WO20240601001 → WO-2024-0601（V3.119.0 新增工单 wo-c1-001，6/1 开工）
--   波次明细：旧销售订单号按序号映射到现存订单
--            0001→SO202406001、0002→SO202406002、0003→SO202405003、0004→SO202406004。
--            0005/0006 在现存订单里无对应，保留原值，关联列继续显示「已归档」——
--            这是诚实的：那几张订单确实不在库里。

-- ── ① 成品入库 → 生产工单 ──────────────────────────────────────────────
UPDATE finished_goods_inbounds
SET work_order_no = 'WO-2024-0501'
WHERE work_order_no = 'WO20240515001'
  AND EXISTS (
    SELECT 1 FROM work_orders w
    WHERE w.order_no = 'WO-2024-0501'
      AND w.org_id = finished_goods_inbounds.org_id
  );

UPDATE finished_goods_inbounds
SET work_order_no = 'WO-2024-0601'
WHERE work_order_no = 'WO20240601001'
  AND EXISTS (
    SELECT 1 FROM work_orders w
    WHERE w.order_no = 'WO-2024-0601'
      AND w.org_id = finished_goods_inbounds.org_id
  );

-- ── ② 波次拣货明细 → 销售订单 ─────────────────────────────────────────
-- lines 是 TEXT 存 JSON 数组。用 json_each 展开后逐项判断、再 json_group_array 重建，
-- 未命中的项原样保留（json_set 只改 orderNo 一个键，其余字段不动）。
-- 守卫：① lines 必须是合法 JSON；② 目标销售订单必须存在；③ 整个 UPDATE 只作用于仍含旧号的行。
UPDATE wave_rfid
SET lines = (
  SELECT json_group_array(
           CASE
             WHEN json_extract(j.value, '$.orderNo') = 'SO-2026-0001'
                  AND EXISTS (SELECT 1 FROM sales_orders s WHERE s.order_no = 'SO202406001' AND s.org_id = wave_rfid.org_id)
             THEN json_set(j.value, '$.orderNo', 'SO202406001')
             WHEN json_extract(j.value, '$.orderNo') = 'SO-2026-0002'
                  AND EXISTS (SELECT 1 FROM sales_orders s WHERE s.order_no = 'SO202406002' AND s.org_id = wave_rfid.org_id)
             THEN json_set(j.value, '$.orderNo', 'SO202406002')
             WHEN json_extract(j.value, '$.orderNo') = 'SO-2026-0003'
                  AND EXISTS (SELECT 1 FROM sales_orders s WHERE s.order_no = 'SO202405003' AND s.org_id = wave_rfid.org_id)
             THEN json_set(j.value, '$.orderNo', 'SO202405003')
             WHEN json_extract(j.value, '$.orderNo') = 'SO-2026-0004'
                  AND EXISTS (SELECT 1 FROM sales_orders s WHERE s.order_no = 'SO202406004' AND s.org_id = wave_rfid.org_id)
             THEN json_set(j.value, '$.orderNo', 'SO202406004')
             ELSE j.value
           END
         )
  FROM json_each(wave_rfid.lines) AS j
)
WHERE json_valid(lines)
  AND lines LIKE '%SO-2026-000%';

-- 波次头部的 order_count 是建单时的统计值，明细换号不影响张数，故不动。
