-- V3.120.2：订正波次明细里的**剩余**虚构物料编码 + 撤销一条无佐证的订单映射
--
-- 背景（V3.120.1 生产复验实测结论）：
--   V3.119.0 只把 src/mocks 里的波次种子改成了真实编码，但**生产 D1 的 wave_rfid
--   从未同步**。2026-10-30 生产实测，波次明细里的物料编码仍是上一代虚构值：
--     MAT-1001 / MAT-1002 / MAT-2001 / MAT-1003 / MAT-3001 / MAT-3002
--   这 6 个编码在生产 materials 表的 18 条主数据里**一个都不存在**，
--   导致波次行挂不上库存、也挂不上任何销售订单明细。
--
-- 本迁移**只订正有唯一佐证的事实**，其余一律不动（与 V3.119.0 / 0120 / 0122 同一原则：
--   修错不改义，不替用户挑替代品）：
--
--   ① wave-001 / wl-1「钢板 Q235B」MAT-1001 → MAT202405010001
--      佐证：materials 里 MAT202405010001 的 name **精确等于**「钢板 Q235B」，
--            库存 85 ≥ 本行需求 10（量能对上）。这是纯纠错（FG-5001/MAT-1001 → 真编码）。
--
--   ② wave-001 / wl-4「角钢」MAT-1003 → MAT202405010013，且 orderNo
--      SO202405003 → SO202406001
--      佐证：materials 里 MAT202405010013 的 name「角钢 Q235」是 18 条里**唯一**含「角钢」的
--            记录，库存 380 ≥ 需求 12；而 sales_order_items 里**只有** SO202406001
--            含「角钢 50×50×5」这一行 → 目标订单唯一，可确定改。
--      原订单 SO202405003 的明细是「钢管 无缝钢管」，与本行物料不符，属可确证的错。
--
--   ③ wave-003 / wl-7「交流接触器 MAT202405010009」orderNo SO202406001 → 空串
--      佐证：sales_order_items 里**没有任何一行**含 MAT202405010009；
--            SO202406001 的明细是「角钢 50×50×5」+「H型钢 Q345B」，与交流接触器无关。
--      即 V3.120.1（0122）把 SO-2026-0006 → SO202406001 的那次映射**缺订单侧佐证**，
--      属于上一轮判断错误，本轮撤销：改成空串表示「本拣货行没有上游销售订单」
--      （它更可能来自生产领料），前端关联列因此不再误挂一个语义不符的订单。
--
-- ★ 明确**不改**的（诚实边界，逐条说明）：
--   · wl-2「槽钢」MAT-1002：materials 18 条里无任何「槽钢」→ 无编码可映射，不改。
--   · wl-3「不锈钢板 304」MAT-2001：materials 里只有「钢管 不锈钢」(MAT202405010014)，
--     板 ≠ 管，属不同物料 → 挑一个就是编数据，不改。
--   · wl-5「铝型材」MAT-3001、wl-6「铜排」MAT-3002：主数据无对应，不改。
--   · wl-1 / wl-2 的 orderNo：钢板在 SO202406002 与 SO202406004 两张单里都出现，
--     槽钢任何单里都没有 → 目标订单**不唯一**，不猜，保留原值。
--   · quantity / pickedQty / location / status / order_count / line_count：
--     业务事实，一律不动。
--   · planned_date / released_at：0122 已把 planned_date 迁到 2024-06-14；
--     released_at 与波次号 WAVE-2026-0831-09 同源，属既有事实，本轮不动（差异如实记录）。
--
-- 幂等：每条 UPDATE 的 WHERE 都锁定「当前仍为旧值」，命中即已改、第二次不再命中；
--   且用 EXISTS 守卫目标主数据/订单确实存在。重复执行无副作用。
-- 不动其他 org 的数据：所有 EXISTS 子句均以 wave_rfid.org_id 对齐。

-- ① wave-001 / wl-1：钢板 Q235B 的虚构编码 → 真实编码
UPDATE wave_rfid
SET lines = (
  SELECT json_group_array(
           CASE
             WHEN json_extract(j.value, '$.id') = 'wl-1'
                  AND json_extract(j.value, '$.materialCode') = 'MAT-1001'
                  AND json_extract(j.value, '$.materialName') = '钢板 Q235B'
                  AND json_extract(j.value, '$.orderNo') = 'SO202406001'
             THEN json_set(j.value, '$.materialCode', 'MAT202405010001')
             ELSE j.value
           END
         )
  FROM json_each(wave_rfid.lines) AS j
)
WHERE wave_no = 'WAVE-2026-0901-01'
  AND json_valid(lines)
  AND lines LIKE '%"MAT-1001"%'
  AND EXISTS (
    SELECT 1 FROM materials m
    WHERE m.code = 'MAT202405010001'
      AND m.name = '钢板 Q235B'
      AND m.org_id = wave_rfid.org_id
  );

-- ② wave-001 / wl-4：角钢 → MAT202405010013；订单号 → SO202406001（唯一含角钢的订单）
UPDATE wave_rfid
SET lines = (
  SELECT json_group_array(
           CASE
             WHEN json_extract(j.value, '$.id') = 'wl-4'
                  AND json_extract(j.value, '$.materialCode') = 'MAT-1003'
                  AND json_extract(j.value, '$.materialName') = '角钢'
                  AND json_extract(j.value, '$.orderNo') = 'SO202405003'
             THEN json_set(j.value,
                    '$.materialCode', 'MAT202405010013',
                    '$.orderNo',      'SO202406001')
             ELSE j.value
           END
         )
  FROM json_each(wave_rfid.lines) AS j
)
WHERE wave_no = 'WAVE-2026-0901-01'
  AND json_valid(lines)
  AND lines LIKE '%"MAT-1003"%'
  AND lines LIKE '%SO202405003%'
  AND EXISTS (
    SELECT 1 FROM materials m
    WHERE m.code = 'MAT202405010013'
      AND m.name LIKE '角钢%'
      AND m.org_id = wave_rfid.org_id
  )
  AND EXISTS (
    SELECT 1 FROM sales_order_items i
    JOIN sales_orders so ON so.id = i.sales_order_id
    WHERE so.order_no = 'SO202406001'
      AND so.org_id = wave_rfid.org_id
      AND i.material_name LIKE '角钢%'
  );

-- ③ wave-003 / wl-7：撤销无订单侧佐证的销售订单映射（SO202406001 → 空串）
UPDATE wave_rfid
SET lines = (
  SELECT json_group_array(
           CASE
             WHEN json_extract(j.value, '$.id') = 'wl-7'
                  AND json_extract(j.value, '$.materialCode') = 'MAT202405010009'
                  AND json_extract(j.value, '$.orderNo') = 'SO202406001'
             THEN json_set(j.value, '$.orderNo', '')
             ELSE j.value
           END
         )
  FROM json_each(wave_rfid.lines) AS j
)
WHERE wave_no = 'WAVE-2026-0831-09'
  AND json_valid(lines)
  AND lines LIKE '%MAT202405010009%'
  -- 守卫：确认「没有任何销售订单明细含这个物料」——一旦将来有了，就不该清空
  AND NOT EXISTS (
    SELECT 1 FROM sales_order_items i
    WHERE i.material_code = 'MAT202405010009'
  );
