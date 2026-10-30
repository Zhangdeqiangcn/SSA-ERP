-- V3.120.3：重算波次 order_count / line_count 使其与实际明细一致
--
-- 背景（V3.120.2 生产复验实测）：生产 wave_rfid 的 order_count / line_count 是早期遗留值，
--   与 lines JSON 实际行数 / 订单数严重不符。例如 WAVE-2026-0831-09 详情页显示
--   「订单数 4 / 行数 9」，但实际只有 1 行、0 个上游订单——这是 0120/0122/0123 都刻意
--   不动的「事实字段」遗留的脏值，详情页直接读这两个字段渲染，于是出现明显数据不一致。
--
-- 修正口径：
--   · order_count = 明细里「去重且非空」的 orderNo 个数（一个订单被多行引用只计一次）
--   · line_count  = 明细 JSON 数组的元素个数
--
-- 幂等：直接按 lines 重算，重复执行结果相同，无副作用。
-- 隔离：仅对本 org 的有效 JSON 行生效，不动其他 org 的数据。
-- 不动其它字段（planned_date / released_at / lines 内容 / 业务事实均不碰）。

UPDATE wave_rfid
SET order_count = COALESCE((
      SELECT COUNT(DISTINCT json_extract(j.value, '$.orderNo'))
      FROM json_each(wave_rfid.lines) AS j
      WHERE json_extract(j.value, '$.orderNo') IS NOT NULL
        AND json_extract(j.value, '$.orderNo') != ''
    ), 0),
    line_count = (
      SELECT COUNT(*) FROM json_each(wave_rfid.lines)
    )
WHERE org_id = 'org_d213a257563c40cca55551781cef67f9'
  AND json_valid(lines);
