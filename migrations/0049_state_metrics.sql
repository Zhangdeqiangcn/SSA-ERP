-- 迁移 0049：大对象键体积指标表（A5 数据底座可观测性）
-- 整改版本：V3.4.0
--
-- 背景与设计取舍：
--   60 个业务域目前以「一个键 = 一整个 JSON 大对象」的形式存在 app_state 表。
--   这种形态下「某个域悄悄涨到写不进去」是必然会发生的，而现状是静默的：
--   前端 persistStorage 吞掉失败、用户看到「保存成功」、刷新后数据回滚、无人知晓。
--
--   本表不解决大对象架构本身（那要靠主计划 C1 逐域迁关系表），
--   它解决的是「把静默的、未来的故障，变成显式的、提前可见的故障」：
--     记录每个键的当前体积、历史峰值、累计写入次数、最后写入时间，
--     管理端据此可以回答两个以前回答不了的问题：
--       ① 现在哪个业务域的体积最接近危险线？（提前几周预警，而不是爆了才知道）
--       ② 哪个域增长最快？（根据 writes 与 bytes/peak_bytes 判断谁该先迁）
--
--   为什么按 (org_id, key) 唯一、只留最新值而不是追加流水：
--     如果每次写入都插一行，这张「用来观测大对象膨胀的表」自己会膨胀成新的大对象问题——
--     用观测手段制造新的观测负担是荒谬的。故采用 upsert 覆盖 + writes 累加 + peak 取最大，
--     表行数恒等于「组织数 × 键数」，天然有界。
--
--   为什么带 org_id：数据按组织隔离是本系统的既有约定（app_state 也是按 org_id 分片的），
--     不同组织的同名业务域体积可能差异极大，混在一起统计会失真。
CREATE TABLE IF NOT EXISTS app_state_metrics (
  org_id     TEXT NOT NULL,
  key        TEXT NOT NULL,
  bytes      INTEGER NOT NULL DEFAULT 0,  -- 最近一次写入的 UTF-8 字节数
  peak_bytes INTEGER NOT NULL DEFAULT 0,  -- 历史峰值（判断增长趋势用）
  writes     INTEGER NOT NULL DEFAULT 0,  -- 累计写入次数（判断活跃度用）
  updated_at TEXT,
  PRIMARY KEY (org_id, key)
);

-- 管理端「体积排行 / 逼近危险线清单」按体积倒序查询
CREATE INDEX IF NOT EXISTS idx_app_state_metrics_bytes ON app_state_metrics(bytes DESC);
