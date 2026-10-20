// ─────────────────────────────────────────────────────────────
// 全局模糊搜索引擎（V3.70.0 三源合一 → V3.71.0 记录源全覆盖）
// 三源合一，供「顶栏搜索框实时命中」与「/help/search-results 独立结果页」共用：
//   1) 菜单/表单页：基于 searchIndex（页面名/模块/关键词/路径模糊命中）
//   2) 模块使用说明：基于 manual.tsx 的 MANUAL_MODULES（章节标题+正文模糊命中，
//      命中即展示该模块使用说明，并可跳转说明书锚点）
//   3) 业务记录：**全部业务台账（配置驱动，见 recordSources.ts 登记表）**，
//      读各 store 当前数据做模糊命中，**仅登录态下启用，且按
//      passDataPermission 既有数据权限口径过滤（仅限自己权限内，不做行级 owner 硬比）**
// 设计原则：
//   - 纯函数 + getState 读 zustand vanilla 值，无订阅、无副作用；
//   - **记录源 store 一律动态 import（调用时才加载）**：本文件被 Header 顶栏（App
//     早期加载链）与独立结果页共引，静态引几十个业务 store 有循环依赖风险，动态导入
//     彻底杜绝；UI 侧已做 300ms 防抖，额外一次模块解析开销可忽略。
//   - **按需预取（B 类 D1 台账）**：台账未预加载时，B 类切片里是「演示假数据（mock
//     种子）」——搜索前幂等拉一次真实数据（拉完走内存），并用 loadedGate 真值闸门
//     过滤「还没加载成功 / 离线」的源，宁可少结果不可搜出假数据（比"搜不到"更糟）。
//   - 记录类命中附详情路由（有详情跳详情）或列表页路径（无详情落列表页）；
//   - 各源单源限额 + 全局限额双闸门，避免某一台账刷屏。
// ─────────────────────────────────────────────────────────────
import { searchIndex, type SearchEntry } from './searchIndex';
import { MANUAL_MODULES, type ManualBlock } from '@/content/manual';
import { RECORD_SOURCES } from './recordSources';

// ── 命中结果统一结构 ────────────────────────────────────────
export type HitKind = 'page' | 'manual' | 'record';

export interface GlobalHit {
  /** 唯一键（去重用） */
  key: string;
  kind: HitKind;
  /** 分组名（下拉里按组折叠展示） */
  group: string;
  /** 主标题（命中词高亮由 UI 层按 title 内子串做） */
  title: string;
  /** 次行文案（用途/状态/关联信息/正文预览） */
  sub?: string;
  /** 导航目标 */
  path?: string;
  /** 页内锚点（说明书章节 hash） */
  hash?: string;
  /** 记录类：业务类型名（物料/供应商/…） */
  recordType?: string;
  /** 记录类：记录 id */
  recordId?: string;
  /** 匹配评分（越大越优先） */
  score: number;
}

export interface GlobalSearchResult {
  query: string;
  pages: GlobalHit[];
  manuals: GlobalHit[];
  records: GlobalHit[];
  /** 记录类是否有权限搜（未登录/离线为 false，UI 层据此隐藏记录组并给提示） */
  recordsAvailable: boolean;
  total: number;
}

// ── 通用模糊评分（与 Header 原 scoreEntry 同口径：前缀>包含>关键词/路径）──
export function scoreText(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t.startsWith(q)) return 100;
  if (t.includes(q)) return 80;
  return 0;
}

// ── 记录源收集（V3.71.0 配置驱动全覆盖）──────────────────────
// 遍历 recordSources.ts 登记表，动态 import 各台账 store → B 类幂等预取（拉一次走
// 内存，避免 mock 种子混入）→ 数据真实性闸门（loaded 非真值则跳过本源）→ 模糊匹配
// + 既有数据权限口径（组织/角色/作用域，不做行级 owner 硬比）+ 单源限额 + 全局限额。
async function collectRecordHits(
  q: string,
  limit: number,
  authed: boolean,
): Promise<GlobalHit[]> {
  if (!authed) return [];
  // 权限上下文 + 竞态兜底（动态 import，避免静态引 4 个 store 的循环依赖）
  const [
    { useOrgStore }, { useAuthStore }, { useDataPermissionStore, passDataPermission },
    { isAuthed: isAuthedDyn },
  ] = await Promise.all([
    import('@/stores/orgStore'), import('@/stores/authStore'),
    import('@/stores/dataPermissionStore'), import('@/services/b2Api'),
  ]);
  if (!isAuthedDyn()) return []; // 解析期间登出了就不出记录

  // 动态 import 登记表用到的全部 store（按 storePath 去重）
  const moduleCache = new Map<string, any>();
  await Promise.all(
    [...new Set(RECORD_SOURCES.map((s) => s.storePath))].map(async (p) => {
      moduleCache.set(p, await import(p));
    }),
  );

  // B 类按需幂等预取：按「storePath::load方法文本」去重，避免同 store 重复网络请求。
  // 各 store 的 load/hydrate 内部均自带幂等守卫（已 loaded 直接返回），重复调用无副作用。
  const seenLoad = new Set<string>();
  const preloads: Promise<unknown>[] = [];
  for (const src of RECORD_SOURCES) {
    if (!src.ensureLoaded) continue;
    const st = moduleCache.get(src.storePath)?.[src.hookKey]?.getState?.();
    if (!st) continue;
    const key = `${src.storePath}::${String(src.ensureLoaded)}`;
    if (seenLoad.has(key)) continue;
    seenLoad.add(key);
    preloads.push(Promise.resolve(src.ensureLoaded(st)));
  }
  await Promise.all(preloads);

  const org = useOrgStore.getState();
  const user = useAuthStore.getState().currentUser;
  const dp = useDataPermissionStore.getState();
  const canSee = (rowOrg: string | undefined, moduleKey: string): boolean => {
    // 与 WorkOrderList 既有用法同口径：组织 + 角色 + 模块作用域。own/dept 作用域
    // 不传 ownerId/deptId（各台账记录无行级 owner 字段）→ passDataPermission 里
    // `!opts.ownerId`/`!opts.deptId` 直接放行，只做组织隔离，不硬比负责人（不引入误杀）。
    const opts: { role?: string; userId?: string } = {};
    if (user) { opts.role = user.role; opts.userId = user.id; }
    return passDataPermission(rowOrg, org.currentOrgId, dp.enabled, dp.mode, moduleKey, dp.modules, opts);
  };

  // 单源限额：随全局限额缩放，保证「全覆盖」时没有某一张台账刷屏占满结果
  const cap = Math.max(2, Math.round(limit / 12));
  const hits: GlobalHit[] = [];
  const seen = new Set<string>();
  const push = (h: GlobalHit) => { if (!seen.has(h.key)) { seen.add(h.key); hits.push(h); } };

  for (const src of RECORD_SOURCES) {
    if (hits.length >= limit) break;
    const st = moduleCache.get(src.storePath)?.[src.hookKey]?.getState?.();
    if (!st) continue;
    // B 类数据真实性闸门：loaded 非真值（未加载/离线/失败）→ 该切片是 mock 种子，跳过
    if (src.loadedGate && !src.loadedGate(st)) continue;
    const rows: any[] = st[src.slice] ?? [];
    let srcCount = 0;
    for (const r of rows) {
      if (hits.length >= limit || srcCount >= cap) break;
      const p = src.pick(r);
      if (!p.fields.some((f) => f && String(f).toLowerCase().includes(q))) continue;
      if (!canSee((r as any).orgId, src.moduleKey)) continue;
      srcCount += 1;
      push({
        key: `rec-${src.recordType}-${r.id}`,
        kind: 'record',
        group: src.recordType,
        recordType: src.recordType,
        recordId: r.id,
        title: p.title,
        sub: p.sub,
        path: src.path(r),
        score: 50, // 记录类统一基线分，同组内按出现顺序（列表本身按时间/编号排）
      });
    }
  }

  return hits.slice(0, limit);
}

// ── 说明书章节索引（预计算一次：模块/章节/正文扁平化）──────
interface ManualIndexEntry {
  moduleId: string;
  moduleTitle: string;
  sectionId: string;
  sectionTitle: string;
  /** 正文预览（命中时取） */
  preview: string;
  /** 搜索用全文（模块+章节+正文，lowercase） */
  full: string;
}
let manualIndexCache: ManualIndexEntry[] | null = null;
function getManualIndex(): ManualIndexEntry[] {
  if (manualIndexCache) return manualIndexCache;
  const out: ManualIndexEntry[] = [];
  for (const m of MANUAL_MODULES) {
    for (const s of m.sections) {
      const text = s.blocks.map((b: ManualBlock) => `${b.title} ${b.text}`).join(' ');
      out.push({
        moduleId: m.id,
        moduleTitle: m.title,
        sectionId: s.id,
        sectionTitle: s.title,
        preview: text.slice(0, 120),
        full: `${m.title} ${s.title} ${text}`.toLowerCase(),
      });
    }
  }
  manualIndexCache = out;
  return out;
}

// ── 主入口：三源合一（async：记录源动态 import + B 类预取需要 await）──────
export async function globalSearch(
  rawQuery: string,
  opts: { isAdmin?: boolean; recordLimit?: number } = {},
): Promise<GlobalSearchResult> {
  const query = rawQuery.trim().toLowerCase();
  const isAdmin = opts.isAdmin ?? false;
  // 未登录：记录类数据不出（权限内 = 至少登录态；演示态无会话组织）
  const { isAuthed } = await import('@/services/b2Api');
  const authed = isAuthed();

  // ① 菜单/表单页（原 Header 的 scoreEntry 逻辑收口到这里）
  const searchableIndex = isAdmin ? searchIndex : (searchIndex as SearchEntry[]).filter((e) => !e.adminOnly);
  const pages: GlobalHit[] = query
    ? searchableIndex
        .map((e) => {
          let s = 0;
          const label = e.label.toLowerCase();
          const kw = e.keywords.map((k) => k.toLowerCase());
          if (label.startsWith(query)) s = 100;
          else if (label.includes(query)) s = 80;
          else if (e.module.toLowerCase().includes(query) || e.group.toLowerCase().includes(query)) s = 60;
          else if (kw.some((k) => k.startsWith(query))) s = 55;
          else if (kw.some((k) => k.includes(query))) s = 40;
          else if (e.path.toLowerCase().includes(query.replace(/\s+/g, ''))) s = 20;
          return { e, s };
        })
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 20)
        .map((x) => ({
          key: `page-${x.e.path}`,
          kind: 'page' as const,
          group: x.e.module,
          title: x.e.label,
          sub: `${x.e.module} · ${x.e.desc}`,
          path: x.e.path,
          score: x.s,
        }))
    : (searchableIndex as SearchEntry[]).slice(0, 8).map((e) => ({
        key: `page-${e.path}`,
        kind: 'page' as const,
        group: e.module,
        title: e.label,
        sub: `${e.module} · ${e.desc}`,
        path: e.path,
        score: 0,
      }));

  // ② 模块使用说明（模糊命中说明书章节）
  const manuals: GlobalHit[] = query
    ? getManualIndex()
        .map((m) => {
          let s = 0;
          const st = m.sectionTitle.toLowerCase();
          if (st.startsWith(query)) s = 95;
          else if (st.includes(query)) s = 75;
          else if (m.moduleTitle.toLowerCase().includes(query)) s = 55;
          else if (m.full.includes(query)) s = 35; // 正文命中（弱）
          return { m, s };
        })
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 12)
        .map((x) => ({
          key: `manual-${x.m.sectionId}`,
          kind: 'manual' as const,
          group: x.m.moduleTitle,
          title: x.m.sectionTitle,
          sub: `「${x.m.moduleTitle}」模块说明：${x.m.preview.slice(0, 60)}…`,
          path: '/help/manual',
          hash: `sec-${x.m.sectionId}`,
          score: x.s,
        }))
    : [];

  // ③ 业务记录（配置驱动全覆盖 + 权限内模糊命中；未登录直接空）
  const records = query ? await collectRecordHits(query, opts.recordLimit ?? 60, authed) : [];

  const total = pages.length + manuals.length + records.length;
  return {
    query,
    pages,
    manuals,
    records,
    recordsAvailable: authed,
    total,
  };
}
