-- 0073: 新建单据幂等键登记（缺陷台账 #10 完整范围 · 幂等键部分）
--
-- 背景：系统此前的防重复手段全部只覆盖「副作用」（库存过账 inventory_posted 守卫、
--       折旧计提期间查重、MRP 落库 run_id），**建单本身没有任何防重复**。
--       用户双击保存、或网络超时后前端重试，会静默建出两张一模一样的单据。
--
-- 用途：客户端可在新建请求上带 `Idempotency-Key` 请求头（或 body.idempotencyKey），
--       服务端按 (org_id, idem_key) 唯一登记；重复提交命中登记则直接回传上一次结果，不再建单。
--       不带键的端点完全不启用，老客户端行为零变化。
--
-- ★ 单号查重（另一道闸）不需要本表——它直接查业务表自身单号是否重复，见 idempotency.dedupeByNo。

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  idem_key    TEXT NOT NULL,
  resource    TEXT NOT NULL,
  result_id   TEXT,
  created_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idem_org_key ON idempotency_keys(org_id, idem_key);
CREATE INDEX IF NOT EXISTS idx_idem_org_created ON idempotency_keys(org_id, created_at);
