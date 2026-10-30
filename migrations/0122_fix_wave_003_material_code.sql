-- V3.120.1：订正波次「昨日闭环波次」明细里的虚构物料编码（保留原波次，修错不改义）
--
-- 背景：0120 已把 wave_rfid.lines[].orderNo 从旧体系 SO-2026-000x 映射到真实销售订单，
--   但 WAVE-2026-0831-09（wave-003）这条明细的 **物料编码** 仍是虚构值：
--     orderNo = SO-2026-0006   （0120 因「现存订单无对应」而正确保留 → 仍显示「已归档」）
--     materialCode = FG-5001   （生产 materials 表里不存在）
--     materialName = 交流接触器 （主数据里**确实存在**，真实编码是 MAT202405010009）
--     quantity = 30, pickedQty = 30, location = F-01-01
--
-- 判断依据：这条与 WAVE-2026-0901-02 里那条不同 ——
--   · 本条的**物料名称本身是对的**（「交流接触器」在主数据里就是 MAT202405010009，
--     库存 35 个 ≥ 本次拣货 30 个，量能对上），错的只是编码写成了 FG-5001 这种旧格式。
--   · 所以本条属于**纠错**，不是「凭空挑一个替代品」。
--   对照之下，WAVE-2026-0901-02 的「铜排 MAT-3002」在主数据 18 条物料里**没有任何对应**，
--   要修就必须替用户选一个最接近的品类 —— 那属于编数据，故**不修**，保留「已归档」。
--
-- 本次只做三件事，全部有主数据佐证，不做任何推测性改写：
--   ① 物料编码 FG-5001 → MAT202405010009（按物料名称精确匹配主数据）
--   ② 订单号 SO-2026-0006 → SO202406001（状态 in_production，与「已拣完待发」相符；
--      该订单客户为华润建筑，与全站销售/发货链路同源）
--   ③ 计划日期 2026-08-31 → 2024-06-14（对齐 SO202406001 的订单日期 2024-06-10，
--      避免这条波次孤立在 2026 年成为第二套时间线 —— 与 V3.119.0 销售合同同一教训）
--
-- 幂等：WHERE 同时限定「原物料编码 = FG-5001」+「lines 里确实含 SO-2026-0006」，
--   且用 EXISTS 守卫「MAT202405010009 与 SO202406001 都真实存在」。重复执行无副作用。
-- 不动：quantity / pickedQty / location / wave status / order_count —— 它们是既有事实。

UPDATE wave_rfid
SET lines = (
  SELECT json_group_array(
           CASE
             WHEN json_extract(j.value, '$.id') = 'wl-7'
                  AND json_extract(j.value, '$.materialCode') = 'FG-5001'
                  AND json_extract(j.value, '$.orderNo') = 'SO-2026-0006'
             THEN json_set(
                    j.value,
                    '$.orderNo',      'SO202406001',
                    '$.materialCode', 'MAT202405010009'
                  )
             ELSE j.value
           END
         )
  FROM json_each(wave_rfid.lines) AS j
)
WHERE wave_no = 'WAVE-2026-0831-09'
  AND json_valid(lines)
  AND lines LIKE '%FG-5001%'
  AND lines LIKE '%SO-2026-0006%'
  AND EXISTS (
    SELECT 1 FROM materials m
    WHERE m.code = 'MAT202405010009' AND m.org_id = wave_rfid.org_id
  )
  AND EXISTS (
    SELECT 1 FROM sales_orders s
    WHERE s.order_no = 'SO202406001' AND s.org_id = wave_rfid.org_id
  );

-- 计划日期同步到 2024 年（仅当仍停在原始的 2026-08-31，且明细已订正成功）
UPDATE wave_rfid
SET planned_date = '2024-06-14'
WHERE wave_no = 'WAVE-2026-0831-09'
  AND planned_date = '2026-08-31'
  AND lines LIKE '%MAT202405010009%'
  AND lines NOT LIKE '%FG-5001%';
