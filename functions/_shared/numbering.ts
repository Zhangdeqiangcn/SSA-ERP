// ═════════════════════════════════════════════════════════════════════════
// V3.67.0 立项① 服务端原子取号（numbering_rules D1 权威源）
// ---------------------------------------------------------------------------
// 背景：单号此前由前端 numberingStore.nextNo 生成后随 body 传入各建单端点，
// 前端本地序号（水合后与 D1 同步，但存在「本地已取号、建单失败未回退」的窗口）
// 在多终端并发下有撞号/跳号风险。本模块提供 D1 侧权威取号：
//   - 序号列原子自增（UPDATE ... RETURNING，数据库内完成，无竞态窗口）
//   - 规则缺失时用内置默认（与前端 numberingStore seedRules 对齐）自动建行
//   - 任何失败（表未建/离线）返回 null → 端点回退「单号必填」400，绝不因取号打挂建单
//
// 调用约定（5 个建单端点：purchase/sales/work/inbound/outbound）：
//   body.<xxNo> 缺省时调用 nextDocNo 服务端取号；已传则保持既有 dedupe 查重（向后兼容）。
//
// 诚实边界：
//   - 前端 nextNo 与 here 共写 numbering_rules.current_seq（V3.66 P0-2 已 D1 化），
//     两端共享同一序号列；「前端取号后建单失败」只产生跳号（可接受），不产生撞号。
//   - 多组织（V3.68.0 立项③ 落地）：自然键 id = orgId::docType（复合键，迁移 0097），
//     各组织序号独立、互不串号；SELECT/UPDATE/INSERT 除按复合主键定位外，org_id 列
//     同时入 WHERE 做双保险（防复合键写错导致跨组织越权读）。前后端两侧键值必须一致，
//     否则同一序号列会被拆成两条、各记各的号。
//   - 日期段用服务端时间（UTC），与前端本地时区存在日期边界差异（跨零点建单），
//     与既有单据日期字段（服务端 new Date().toISOString().slice(0,10) 兜底）口径一致。
// ═════════════════════════════════════════════════════════════════════════

/** 多组织复合自然键：orgId::docType（与前端 numberingStore ruleKey 严格一致） */
const ruleKey = (orgId: string, docType: string): string => `${orgId}::${docType}`;
interface ServerRule {
  prefix: string;
  separator: string;
  datePattern: 'none' | 'YYYY' | 'YYYYMM' | 'YYYYMMDD';
  seqLength: number;
  label?: string;
}

// 与前端 numberingStore.seedRules 对齐（本模块只覆盖 5 个建单端点消费的 docType，
// 其余（PR/FG/QC/MRP/TPS/ACC/SOP/BI/ESG）仍走前端取号，不在本版扩大范围）
const DEFAULT_RULES: Record<string, ServerRule> = {
  PO: { prefix: 'PO', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, label: '采购订单' },
  // V3.93.0：采购申请（PR）接入服务端权威取号。此前该单号完全由前端扫本地已有编号
  // 取最大号加一，多终端并发必然撞号；此处与 PO 同款规则，空库首次自动建行。
  PR: { prefix: 'PR', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, label: '采购申请' },
  SO: { prefix: 'SO', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, label: '销售订单' },
  WO: { prefix: 'WO', separator: '-', datePattern: 'YYYY', seqLength: 4, label: '生产工单' },
  IN: { prefix: 'IN', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, label: '入库单' },
  OUT: { prefix: 'OUT', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, label: '出库单' },
};

const datePart = (pattern: ServerRule['datePattern'], now: Date): string => {
  if (!pattern || pattern === 'none') return '';
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  switch (pattern) {
    case 'YYYY': return y;
    case 'YYYYMM': return `${y}${m}`;
    case 'YYYYMMDD': return `${y}${m}${d}`;
    default: return '';
  }
};

const formatNo = (rule: ServerRule, seq: number, now: Date): string => {
  const seqStr = String(seq).padStart(Math.max(1, rule.seqLength), '0');
  const dp = datePart(rule.datePattern, now);
  if (!dp) return `${rule.prefix}${rule.separator}${seqStr}`;
  return `${rule.prefix}${rule.separator}${dp}${rule.separator}${seqStr}`;
};

/**
 * D1 原子取号：numbering_rules 内 current_seq 自增并返回格式化单号。
 * 规则缺失 → 用内置默认建一行（序号从 1 起）；docType 未登记或 DB 异常 → 返回 null。
 */
export async function nextDocNo(db: any, orgId: string, docType: string): Promise<string | null> {
  try {
    if (!db || !orgId || !DEFAULT_RULES[docType]) return null;
    const now = new Date();
    const nowIso = now.toISOString().replace(/\.\d{3}Z$/, '');
    // V3.68.0 立项③：多组织复合键定位（orgId::docType），org_id 列同时入 WHERE 双保险
    const key = ruleKey(orgId, docType);
    const row: any = await db
      .prepare(`SELECT id, prefix, separator, date_pattern, seq_length FROM numbering_rules WHERE id = ? AND org_id = ?`)
      .bind(key, orgId)
      .first()
      .catch(() => null);

    let rule: ServerRule;
    let seq: number;
    if (row) {
      // 命中既有规则：数据库内原子自增（RETURNING 消除「读→算→写」竞态窗口）
      rule = {
        prefix: row.prefix || DEFAULT_RULES[docType].prefix,
        separator: row.separator ?? '-',
        datePattern: (row.date_pattern || DEFAULT_RULES[docType].datePattern) as ServerRule['datePattern'],
        seqLength: Number(row.seq_length) > 0 ? Number(row.seq_length) : DEFAULT_RULES[docType].seqLength,
      };
      const inc: any = await db
        .prepare(`UPDATE numbering_rules SET current_seq = current_seq + 1, updated_at = ? WHERE id = ? AND org_id = ? RETURNING current_seq`)
        .bind(nowIso, key, orgId)
        .first();
      seq = Number(inc?.current_seq ?? 1);
    } else {
      // 空库首次：内置默认建行（序号从 1 起，与前端 seed currentSeq=0 下一号=1 对齐）
      const d = DEFAULT_RULES[docType];
      await db
        .prepare(
          `INSERT INTO numbering_rules (id, org_id, doc_type, prefix, separator, date_pattern, seq_length, current_seq, label, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
        )
        .bind(key, orgId, docType, d.prefix, d.separator, d.datePattern, d.seqLength, d.label || '', nowIso, nowIso)
        .run();
      rule = d;
      seq = 1;
    }
    return formatNo(rule, seq, now);
  } catch {
    return null; // 取号失败绝不阻断建单主流程（端点回退必填校验）
  }
}
