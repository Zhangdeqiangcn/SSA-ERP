-- 迁移 0052：打印模板关系化 + 模板图片外置 —— C1 第二个域（V3.7.0）
--
-- ── 为什么要做这件事（先算账，不讲概念）──────────────────────────
-- 生产库 `app_state` 的 `ssa-erp-printtemplate` 键实测 **404.3 KB**，是全部 60 个
-- 业务键里最大的一份，比第二名（财务 15.0 KB）大 26 倍。拆开看构成：
--
--   tpl-po-default 采购订单模板   398.5 KB   ← 占整个域 98.6%
--   其余 8 个模板                合计 5.8 KB   ← 平均每个 0.7 KB
--
-- 采购订单那 398.5 KB 里，**397.5 KB 是图片**（98.3%），而且经字节指纹核验，
-- 页眉和页脚内嵌的是**同一张 Logo 文件、被存了两遍**（各 203.5 KB）。
-- 也就是说：全部 404 KB 里，**203.5 KB 是纯冗余**，占总量的 50.3%。
--
-- ── 第一性原理：这是「数据」还是「文件」？────────────────────────
-- 打印模板由两种性质完全不同的东西构成，此前被混在一个 JSON 里：
--
--   A. **模板定义**（标题、纸张、页眉页脚 HTML、勾选字段、打印选项）
--      —— 这是**数据**：有结构、要查询、要按实体索引、要参与权限控制。
--      「采购订单的模板改了页脚，谁改的、什么时候改的」这种问题必须能查。
--      → 该进关系表。
--
--   B. **图片资源**（公司 Logo、电子印章）
--      —— 这是**文件**：二进制、无结构、不变、按内容寻址。
--      把它 base64 塞进 HTML 文本字段里，等于把「文件」伪装成「数据」，
--      后果是：模板行的正文字段膨胀到 200 KB，任何一次列表查询都会拖着它走；
--      同一张图改一次要改 N 处；无法做「这张图被哪些模板引用」的查询。
--      → 该进独立的资源表，模板正文只留引用占位符。
--
-- 所以本迁移做了两件事，**都必须做**，只做一件就不成立：
--   ① 模板定义 → `print_templates` 关系表（可索引、可审计、可查询）
--   ② 图片资源 → `print_template_assets` 表（去重、按引用占位符取用）
--
-- 若只做 ① 不做 ②：404 KB 的正文仍在每次查询里被搬运，只是从一张表挪到另一张表。
-- 若只做 ② 不做 ①：模板仍无法按实体索引，C1 的目标（可查询）没达成。
--
-- ── 占位符协议（模板正文与图片的接缝）──────────────────────────
-- 正文里原来的 `<img src="data:image/png;base64,iVBOR...">` 会被改写成
--   `<img src="{{asset:<asset_id>}}">`
-- 前端渲染模板时把 `{{asset:<id>}}` 换回 data URL；后端只认这个 id。
-- 好处：模板正文从 203 KB 降到 1~2 KB，图片按 id 单独取、可缓存、可去重。
--
-- ── 组织归属 ──────────────────────────────────────────────────
-- 模板属于组织基础配置（谁都不能看别的组织的模板），故带 `org_id`。
-- 资源表通过 `template_id` 从属模板，**不重复存 org_id**——与 0051 的
-- `bom_headers` / `bom_items` 同一原则：两侧都存就有两份归属，
-- 不一致时以哪个为准会成为长期隐患。

CREATE TABLE IF NOT EXISTS print_templates (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  name TEXT NOT NULL,
  entity TEXT NOT NULL,                 -- purchaseOrder / salesOrder / ... 与 PrintEntity 枚举一致
  title TEXT,
  paper_size TEXT DEFAULT 'A4',         -- A4 | A5
  orientation TEXT DEFAULT 'portrait',  -- portrait | landscape
  header_html TEXT DEFAULT '',          -- 富文本 HTML（图片已外置为 {{asset:<id>}} 占位符）
  header_show_date INTEGER DEFAULT 0,
  footer_html TEXT DEFAULT '',
  footer_show_date INTEGER DEFAULT 1,
  -- V2.89 之前的旧字段（前端类型里标注 @deprecated）。**刻意保留但不再写入**：
  -- 生产数据里这两个字段曾与 header_config.html 内容完全相同（页眉那张 203 KB 的
  -- Logo 因此存了两份，是 404 KB 里 199 KB 冗余的来源）。保留列是为了兼容可能
  -- 存在的老代码读取路径，但回填与运行时都写入空串，确保不再产生重复。
  header_text TEXT DEFAULT '',
  footer_text TEXT DEFAULT '',
  field_keys TEXT,                      -- JSON 数组：勾选要打印的字段
  extra_options TEXT,                   -- JSON 对象：审批记录/制单人/页码等开关
  description TEXT,
  is_default INTEGER DEFAULT 0,         -- 每个 entity 下仅一条默认模板
  sort_order INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE (org_id, id)
);

-- 一个实体可以有多个模板（标准版/简版/客户专用版），但只有一个默认
CREATE INDEX IF NOT EXISTS idx_print_tpl_entity ON print_templates(org_id, entity, is_default);
CREATE INDEX IF NOT EXISTS idx_print_tpl_name ON print_templates(org_id, name);

CREATE TABLE IF NOT EXISTS print_template_assets (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,            -- 从属模板，不重复存 org_id
  kind TEXT DEFAULT 'image',            -- image | stamp（电子印章）预留扩展
  mime TEXT NOT NULL,                   -- image/png / image/jpeg / image/svg+xml
  file_name TEXT,
  byte_size INTEGER DEFAULT 0,
  -- 内容指纹：同一张图被多个模板/多个位置引用时只存一条，取用时按 id 查
  content_hash TEXT,
  -- 正文中替换后的占位符文本，便于反查「这个资源被哪些模板引用」
  placeholder TEXT,
  created_at TEXT,
  FOREIGN KEY (template_id) REFERENCES print_templates(id) ON DELETE CASCADE
);

-- ── 图片二进制**分片存储**（这是被实测逼出来的设计，不是过度设计）──────
--
-- 为什么不把图片直接放进 print_template_assets.content 一个 BLOB 字段：
-- D1（SQLite）**单条语句长度有硬上限**，实测 BLOB 字面量 48 KB 可写、64 KB 失败。
-- 页眉那张 Logo 是 149 KB，一条 INSERT 根本写不进去。
--
-- 那能不能「zeroblob 占位 + 分块 UPDATE 拼接」？**实测失败，且是静默损坏**：
--   分 10 块写入后，实际长度只有 784 字节（正好是最后一块），
--   而 byte_size 列记录的仍是 152658 —— 数据库里看起来完全正常，
--   只有逐字节比对才发现图片已被毁掉 99%。
--   根因：`UPDATE ... SET content = substr(content,1,off) || X'...' || substr(content,off+n+1)`
--   依赖「上一条 UPDATE 的结果已被持久化」，实际执行中这一条不成立。
--   这种「不报错的坏数据」比直接失败危险得多，所以方案必须避开它。
--
-- 结论：**一个图片 = 多行分片**，每片 ≤ 16 KB（留在 48 KB 上限内）。
--   写入：N 条独立 INSERT，各自带 `chunk_index`，互不依赖、无顺序要求。
--   读取：后端按 `chunk_index` 排序后拼接（见 assets 端点的读取逻辑）。
-- 代价是读取时多一次拼接，换来的是「写入一定正确、且没有任何静默损坏风险」。
CREATE TABLE IF NOT EXISTS print_template_asset_chunks (
  asset_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk BLOB NOT NULL,
  PRIMARY KEY (asset_id, chunk_index),
  FOREIGN KEY (asset_id) REFERENCES print_template_assets(id) ON DELETE CASCADE
);

-- 按内容指纹查重：换模板时同一张 Logo 不必重复上传
CREATE INDEX IF NOT EXISTS idx_print_asset_hash ON print_template_assets(content_hash);
CREATE INDEX IF NOT EXISTS idx_print_asset_tpl ON print_template_assets(template_id);

-- 行级策略扩展列（与 0051 及库内 0013 迁移保持一致，业务表统一两列）
ALTER TABLE print_templates        ADD COLUMN owner_id TEXT;
ALTER TABLE print_templates        ADD COLUMN dept_id  TEXT;
ALTER TABLE print_template_assets  ADD COLUMN owner_id TEXT;
ALTER TABLE print_template_assets  ADD COLUMN dept_id  TEXT;

-- 幂等守卫（业务版本登记）
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0052_print_template', datetime('now'))
ON CONFLICT(version) DO NOTHING;
