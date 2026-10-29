// 上下游关联列工厂（V3.113.0 新增；V3.114.0 改为「按单据类型命名」）
// ─────────────────────────────────────────────────────────────────────────────
// 变更原因（V3.114.0，用户实测反馈）：
//   原来的两列固定叫「上游单号 / 下游单号」，单元格只给一串编号（ASN-DEMO-20261022、
//   IN-DEMO-20261022），看的人得自己猜这是送货单、入库单还是发票。
//   现在：明细里是什么单，列头就写什么单 ——
//     · 默认两列改名「来源单据 / 后续单据」，单元格每项前带单据类型名（如「入库单 IN-…」）
//     · 列表页可改用 buildTypedRelatedColumns()：一种单据一列，列头直接是「采购申请 / 入库单 /
//       采购发票 / 付款计划 …」，且只对数据里真实出现过的单据类型生成列（不铺一排空列）
//
// 用法（列表页，推荐）：
//   const related = useMemo(
//     () => buildTypedRelatedColumns('purchaseOrder', rowsWithDocs),
//     [rowsWithDocs]
//   );
//   const data = useMemo(() => rowsWithDocs.map(r => ({ ...r, ...related.fieldsOf(r) })), [rowsWithDocs]);
//   <DataTable columns={[...base, ...related.columns]} data={data} hiddenColumns={related.defaultHidden} />
//
// 用法（兼容旧写法）：
//   const columns = [...base, ...buildRelatedColumns()];
//   const data = withRelatedDocNos('purchaseRequest', rawRows);

import { type ColumnDef } from '@tanstack/react-table';
import RelatedDocLinks from './RelatedDocLinks';
import {
  DOC_RELATIONS,
  docTypeLabel,
  type RelatedDocRef,
} from '@/utils/relations/documentRelations';
import { getDocStatus } from '@/utils/relations/docStatus';

/** 行增强后的类型（withRelatedDocNos 会给每行附加这 4 个字段） */
export interface WithRelatedRow {
  upstreamNo: string;
  upstreamDocs: RelatedDocRef[];
  downstreamNo: string;
  downstreamDocs: RelatedDocRef[];
}

/**
 * 生成「来源单据 / 后续单据」两列（列内每项带单据类型名）。
 * 返回 any 列以便各列表页按自身行类型 cast。
 */
export function buildRelatedColumns(): ColumnDef<any, unknown>[] {
  return [
    {
      id: 'upstreamNo',
      accessorKey: 'upstreamNo',
      header: '来源单据',
      meta: { searchable: true, filterType: 'text' },
      cell: ({ row }) => {
        const docs = (row.original as WithRelatedRow).upstreamDocs ?? [];
        return <RelatedDocLinks docs={docs} showType showStatus />;
      },
    },
    {
      id: 'downstreamNo',
      accessorKey: 'downstreamNo',
      header: '后续单据',
      meta: { searchable: true, filterType: 'text' },
      cell: ({ row }) => {
        const docs = (row.original as WithRelatedRow).downstreamDocs ?? [];
        return <RelatedDocLinks docs={docs} showType showStatus />;
      },
    },
  ];
}

/** 关联列 id 前缀（单据类型分列时用，避免与其他业务列 id 冲突） */
export const REL_UPSTREAM_PREFIX = 'relUp_';
export const REL_DOWNSTREAM_PREFIX = 'relDown_';

export interface TypedRelatedColumns {
  /** 每种实际出现过的单据类型一列，列头 = 单据中文名 */
  columns: ColumnDef<any, unknown>[];
  /** 把某行的 docs 摊平成 relUp_<type> / relDown_<type> 文本字段（筛选/检索靠它） */
  fieldsOf: (row: Record<string, any>) => Record<string, string>;
  /** 列 id 清单（供 hiddenColumns / 列方案使用） */
  ids: string[];
  /** 默认隐藏的列：全部保留可见（用户要看的正是"这是什么单"），仅作占位返回空数组 */
  defaultHidden: string[];
}

/** 收集一批行里出现过的单据类型（保序：按首次出现顺序） */
function collectTypes(rows: Array<Record<string, any>>, key: 'upstreamDocs' | 'downstreamDocs'): string[] {
  const seen: string[] = [];
  for (const r of rows) {
    const docs = (r?.[key] ?? []) as RelatedDocRef[];
    for (const d of docs) {
      if (d?.type && !seen.includes(d.type)) seen.push(d.type);
    }
  }
  return seen;
}

/** 关联列构建选项（V3.116.0） */
export interface TypedRelatedOptions {
  /**
   * 覆盖单号点击行为。供应商门户传「弹门户内只读速览」——门户用户没有主 ERP 登录态，
   * 默认的跳路由会被 RequireAuth 弹回登录页，等于点了没反应。
   */
  onDocClick?: (doc: RelatedDocRef) => void;
  /**
   * 强制铺出这些类型的列（即使当前这批数据里一张都没关联上）。
   * 用于「这张单本该有、现在查不到」本身就是重要信息的场景 ——
   * 例：供应商对账单必须能看出"这笔钱排了付款计划没有"，列不存在就等于这个问题不可见。
   */
  alwaysIncludeTypes?: string[];
  /**
   * 「点击需接管」的门户体系单据类型（V3.118.0）。
   *
   * 背景：某些单据类型登记的路由在**门户身份体系**下（/vendor-portal/...），
   *   主 ERP 里点它们会被 RequireAuth 直接踹到门户登录页（实测：财务对账页点「开票申请」
   *   → 跳到 /vendor-portal/login，用户以为功能坏了）。
   *
   * 为什么不能只靠 onDocClick：onDocClick 的语义是"本列所有点击都交给调用方"，
   *   一旦传入，同一列里正常类型（采购订单/入库单）也会被接管 —— 实测表现为点它们没反应
   *   （回调只处理门户类型，其余直接 return，而 RelatedDocLinks 已不再 navigate）。
   *   故这里按类型分组：门户类型走 onDocClick，其余类型照常跳路由，同一列内并存。
   */
  portalDocTypes?: string[];
}

/**
 * 按「实际出现的单据类型」生成关联列（V3.114.0）。
 *
 * 与 buildRelatedColumns 的区别：
 *   - 一种下游单据一列（入库单 / 采购发票 / 付款计划 各占一列），列头就是单据名；
 *   - 只对数据里真出现过的类型建列，不会铺一排永远空白的列；
 *   - 同时产出 fieldsOf() 把每类单号写成行字段，使筛选条与列检索都能按类型精确查。
 *
 * @param docType 本单据类型（用于读关系登记，决定上游/下游的默认类型集合；当前实现以数据为准，
 *                参数保留以便后续按关系表补"暂时无数据"的类型）
 * @param rows    已用 withRelatedDocNos 增强过的行（必须含 upstreamDocs / downstreamDocs）
 * @param opts    渲染选项（门户侧覆盖点击行为）
 */
export function buildTypedRelatedColumns(
  docType: string,
  rows: Array<Record<string, any>>,
  opts?: TypedRelatedOptions
): TypedRelatedColumns {
  // 关系表已登记但数据里暂无的类型，仅在「上游」保留一列（上游通常只有一种，空着也比没有强，
  // 让用户知道这张单本该来源于什么）；下游一律按实际数据生成，避免一排空列。
  const rel = DOC_RELATIONS[docType];
  const declaredUpstream = new Set<string>();
  if (rel?.upstream?.target) declaredUpstream.add(rel.upstream.target);
  // V3.115.0：显式声明的上游类型优先（upstreamResolver 是函数，静态看不出指向谁）
  for (const t of rel?.upstreamTargets ?? []) declaredUpstream.add(t);
  if (rel?.upstreamResolver && !rel?.upstreamTargets) {
    // 未显式声明时只保留已知的唯一上游兜底（采购订单的来源是采购申请）
    if (docType === 'purchaseOrder') declaredUpstream.add('purchaseRequest');
  }

  const upTypes = collectTypes(rows, 'upstreamDocs');
  for (const t of declaredUpstream) if (!upTypes.includes(t)) upTypes.push(t);
  const downTypes = collectTypes(rows, 'downstreamDocs');
  // V3.115.0 兜底：若整批数据一条下游关联都算不出来（常见于种子数据里没存关联字段），
  //   仍按关系表声明 + 同源目标把列铺出来。理由：用户要的是「这些单据的状态都能查到」，
  //   列都不存在就无从查起，也看不出"本该有单却没关联"这个异常。
  if (downTypes.length === 0) {
    for (const d of rel?.downstream ?? []) {
      if (!downTypes.includes(d.target)) downTypes.push(d.target);
    }
    for (const t of rel?.siblingTargets ?? []) {
      if (!downTypes.includes(t)) downTypes.push(t);
    }
  }
  // 调用方指定的"必须有列"的类型（V3.116.0，门户对账单要固定看到付款计划列）
  for (const t of opts?.alwaysIncludeTypes ?? []) {
    if (!downTypes.includes(t)) downTypes.push(t);
  }

  // V3.117.0 修复：同一单据类型既出现在上游又出现在下游时，会生成两个**同名**列
  //   （表头都是「出库单」/「检验通知单」，用户看到两列一模一样的标题，分不清哪个是来源哪个是去向）。
  //   典型：不合格品单的 linkedOutboundNo 同时登记为上游与下游；工单的 inspectionNotice
  //   既在 upstreamTargets 里声明、又是 downstream 的目标。
  //
  //   处理：同类型**只出一列**，单元格里合并显示两个方向的数据（上游在前、下游在后，按单号去重）。
  //   为什么不直接删掉下游列：上游那列可能只是因为 upstreamTargets 声明出来的空占位，
  //   真正有数据的在下游 —— 删下游等于把真实存在的单弄丢（比同名列更糟）。
  //   为什么不用「上游有数据才保留上游」：那样同一页不同行会出现列含义漂移，
  //   用户在 A 行看到的是来源、B 行看到的是去向，更难理解。
  const upHasData = new Set<string>();
  for (const r of rows) {
    for (const d of ((r?.upstreamDocs ?? []) as RelatedDocRef[])) {
      if (d?.type) upHasData.add(d.type);
    }
  }
  const downOnly = downTypes.filter((t) => !upTypes.includes(t));
  /** 两个方向都出现的类型：只出一列，单元格合并两个方向 */
  const bothDirs = downTypes.filter((t) => upTypes.includes(t));

  const columns: ColumnDef<any, unknown>[] = [];
  const ids: string[] = [];

  const makeColumn = (
    type: string,
    dir: 'upstreamDocs' | 'downstreamDocs' | 'both',
    idPrefix: string
  ): ColumnDef<any, unknown> => {
    const id = `${idPrefix}${type}`;
    return {
      id,
      accessorKey: id,
      header: docTypeLabel(type),
      meta: { searchable: true, filterType: 'text' },
      cell: ({ row }) => {
        const o = row.original as Record<string, any>;
        const pick = (d: 'upstreamDocs' | 'downstreamDocs') =>
          ((o[d] ?? []) as RelatedDocRef[]).filter((x) => x.type === type);
        let mine: RelatedDocRef[];
        if (dir === 'both') {
          // 上游在前、下游在后；同一张单可能两边都出现（如不合格品的退货出库单），按 type+单号去重
          const seen = new Set<string>();
          mine = [];
          for (const d of [...pick('upstreamDocs'), ...pick('downstreamDocs')]) {
            const k = `${d.type}|${d.no}`;
            if (seen.has(k)) continue;
            seen.add(k);
            mine.push(d);
          }
        } else {
          mine = pick(dir);
        }
        if (mine.length === 0) return <span style={{ color: '#CBD5E1' }}>-</span>;
        // 列头已表明单据类型，单元格给「单号 + 该单据当前状态」（V3.115.0）
        // V3.118.0：门户体系类型（/vendor-portal/... 路由）走 onDocClick 接管，其余照常跳路由。
        //   两者在同一列内并存（如「开票申请」列由门户接管、「采购发票」列正常跳转）。
        const portal = opts?.portalDocTypes ?? [];
        if (portal.length > 0) {
          const takeover = mine.filter((d) => portal.includes(d.type));
          const normalDocs = mine.filter((d) => !portal.includes(d.type));
          return (
            <>
              {takeover.length > 0 && (
                <RelatedDocLinks docs={takeover} showStatus onDocClick={opts?.onDocClick} />
              )}
              {takeover.length > 0 && normalDocs.length > 0 && <span style={{ margin: '0 2px', color: '#CBD5E1' }}>、</span>}
              {normalDocs.length > 0 && <RelatedDocLinks docs={normalDocs} showStatus />}
            </>
          );
        }
        return <RelatedDocLinks docs={mine} showStatus onDocClick={opts?.onDocClick} />;
      },
    } as ColumnDef<any, unknown>;
  };

  for (const t of upTypes) {
    // 两个方向都出现的类型：合并成一列，避免表头重名
    const col = bothDirs.includes(t)
      ? makeColumn(t, 'both', REL_UPSTREAM_PREFIX)
      : makeColumn(t, 'upstreamDocs', REL_UPSTREAM_PREFIX);
    columns.push(col);
    ids.push(String(col.id));
  }
  for (const t of downOnly) {
    const col = makeColumn(t, 'downstreamDocs', REL_DOWNSTREAM_PREFIX);
    columns.push(col);
    ids.push(String(col.id));
  }

  const fieldsOf = (row: Record<string, any>): Record<string, string> => {
    // 检索字段值 = 「单号 + 状态中文」（V3.115.0）。
    // 这样在筛选条里输入单号能命中、输入"已入库""已验证"这类状态词也能命中 ——
    // 强哥要的是"能查到其他单据的状态"，只给单号却搜不到状态等于半个功能。
    const statusText = (type: string, no: string): string => {
      const st = getDocStatus(type, no);
      return st ? `${no} ${st.label}` : no;
    };
    const out: Record<string, string> = {};
    for (const t of upTypes) {
      if (bothDirs.includes(t)) {
        // 合并列：检索值必须同时覆盖两个方向，否则在筛选条里搜下游那张单会漏
        const seen = new Set<string>();
        out[`${REL_UPSTREAM_PREFIX}${t}`] = [
          ...((row.upstreamDocs ?? []) as RelatedDocRef[]),
          ...((row.downstreamDocs ?? []) as RelatedDocRef[]),
        ]
          .filter((d) => {
            if (d.type !== t) return false;
            const k = `${d.type}|${d.no}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
          .map((d) => statusText(t, d.no))
          .join(',');
      } else {
        out[`${REL_UPSTREAM_PREFIX}${t}`] = ((row.upstreamDocs ?? []) as RelatedDocRef[])
          .filter((d) => d.type === t)
          .map((d) => statusText(t, d.no))
          .join(',');
      }
    }
    for (const t of downOnly) {
      out[`${REL_DOWNSTREAM_PREFIX}${t}`] = ((row.downstreamDocs ?? []) as RelatedDocRef[])
        .filter((d) => d.type === t)
        .map((d) => statusText(t, d.no))
        .join(',');
    }
    return out;
  };

  return { columns, fieldsOf, ids, defaultHidden: [] };
}
