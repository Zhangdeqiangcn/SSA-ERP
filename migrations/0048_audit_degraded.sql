-- 迁移 0048：审计写入降级留痕表
-- 来源：独立安全评测（V2.97.0 基线）发现 L-05「审计写入失败无降级记录」
-- 整改版本：V3.3.0
--
-- 背景与设计取舍：
--   原状：所有审计写入都是 `try { INSERT } catch { /* 静默丢弃 */ }`——
--     审计失败时既不报错、不留痕、也不告警。后果有两层：
--       ① 出问题时无人知晓：管理员看到的「审计日志」是完整的，因为缺的那条根本不存在；
--       ② 安全事件（越权尝试、批量删除）发生后，恰恰在最需要证据的时候没有证据。
--   本表用于承载「审计写入失败」这一事件本身，即「关于失败记录的记录」：
--     写入失败时，把 谁 / 哪个实体 / 什么动作 / 原始摘要 / 失败原因 记到这里，
--     从而把「静默丢失」变成「可发现、可追溯、可在管理端看到」。
--
--   为什么不用同一张 audit_logs 表：一次 INSERT 失败通常意味着该表或该批次本身有问题
--     （约束冲突、列缺失、库临时不可用），再往同一张表写第二条大概率同样失败；
--     用独立的表 + 独立的 try/catch，才能做到「主审计失败但降级留痕仍可能成功」。
--
--   为什么降级记录本身失败也不再向上抛：审计绝不能阻断业务主流程。因此降级链条为
--     ① 结构化错误日志（console.error，平台侧可检索，零依赖，永远能执行）
--     ② 本表留痕（尽力而为，独立 try/catch）
--     ③ 永不抛出，业务请求照常返回成功。
CREATE TABLE IF NOT EXISTS audit_degraded (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  user_id TEXT,
  user_name TEXT,
  entity TEXT,
  action TEXT,
  summary TEXT,
  error TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_degraded_org_time ON audit_degraded(org_id, created_at DESC);
