/**
 * 大对象键容量守护（A5 · 数据底座可观测性）
 *
 * ── 第一性原理：这里要防的到底是什么？ ─────────────────────────
 * 60 个业务域目前以「一个键 = 一整个 JSON 大对象」的形式存在 app_state 表。
 * 这种形态有两个必然会发生的故障，且现状是**静默发生**：
 *
 *   ① 静默截断 / 静默失败：D1 单值有容量上限（SQLITE 层是 1 GB，但 Cloudflare 单次
 *      响应与请求体另有上限，实际可控量远小于此）。当某个域（例如财务凭证、库存流水）
 *      累积到阈值以上，写入会失败或半失败，而前端 persistStorage 对此是静默吞掉的
 *      —— 用户看到「保存成功」的提示，数据却没上云，下一次刷新回滚，无人知晓。
 *
 *   ② 无法预警的增长：没有任何地方记录「这个键现在多大、多久翻一倍」，
 *      等到真的写不进去时，已经积压了大量未上云的本地数据。
 *
 * ── 本模块的做法（分级处置，不做「一刀切拦截」）──────────────
 *   · 软阈值（4 MB）：写入照常成功，但响应里带 warning，前端可在同步状态栏提示，
 *     管理端也能看到「接近上限」清单 —— 提前几个星期就能发现哪个域要爆。
 *   · 硬阈值（8 MB）：拒绝写入并返回 413，附上诊断信息（当前大小、键名、建议动作）。
 *     为什么不干脆放开：静默丢数据比明确报错严重得多。报错至少可发现、可干预。
 *   · 增长监测：把每次写入的体积记入 app_state_metrics（迁移 0049），
 *     管理端据此看「哪些键在持续变大」，这是判断「该不该迁关系表」的客观依据，
 *     而不是拍脑袋说「这个域该迁了」。
 *
 * ⚠️ 这套机制不解决大对象本身的架构问题（那要靠 C1 逐域迁关系表）。
 *    它的价值是把一个「静默的、发生在未来的」故障，变成「显式的、提前可见的」故障。
 */

/** 软阈值：4 MB —— 超过只告警不拦截 */
export const SOFT_LIMIT_BYTES = 4 * 1024 * 1024;
/** 硬阈值：8 MB —— 超过拒绝写入 */
export const HARD_LIMIT_BYTES = 8 * 1024 * 1024;

export interface SizeCheckResult {
  /** UTF-8 实际字节数 */
  bytes: number;
  /** 人类可读体积 */
  human: string;
  level: 'ok' | 'warn' | 'reject';
  /** 拒绝时给用户看的中文原因（含可操作的下一步） */
  message?: string;
}

/** 字节数 → 人类可读（1.23 MB / 456 KB / 789 B） */
export function humanBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 按 UTF-8 计字节数。
 * 不用 value.length：JS 字符串长度按 UTF-16 码元算，中文占 3 字节却只算 1 个长度，
 * 用 length 判断会严重低估中文业务数据（本系统的数据几乎全是中文）。
 */
export function byteLength(value: string): number {
  // TextEncoder 在 Workerd 运行时可用；退化路径按码点手算，保证老运行时也能工作
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    let bytes = 0;
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      if (c < 0x80) bytes += 1;
      else if (c < 0x800) bytes += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { bytes += 4; i++; } // 代理对（emoji 等）
      else bytes += 3;
    }
    return bytes;
  }
}

/** 体积分级判定 */
export function checkSize(value: string): SizeCheckResult {
  const bytes = byteLength(value);
  const human = humanBytes(bytes);
  if (bytes > HARD_LIMIT_BYTES) {
    return {
      bytes,
      human,
      level: 'reject',
      message:
        `数据体积 ${human} 已超过单键上限 ${humanBytes(HARD_LIMIT_BYTES)}，本次保存被拒绝（未写入）。` +
        `原因：该数据域目前以「整块 JSON」存在单个键里，体积已接近存储单值上限，` +
        `继续写入会导致静默丢数据。处理建议：① 先导出该模块数据留底（模块内「导出」按钮）；` +
        `② 联系管理员安排该域迁移到关系表（主计划 C1）；③ 迁移完成前，请勿在该模块继续大量新增记录。`,
    };
  }
  if (bytes > SOFT_LIMIT_BYTES) {
    return {
      bytes,
      human,
      level: 'warn',
      message:
        `数据体积 ${human} 已超过预警线 ${humanBytes(SOFT_LIMIT_BYTES)}，本次保存成功，` +
        `但该数据域建议尽快迁移到关系表（主计划 C1），否则达到 ${humanBytes(HARD_LIMIT_BYTES)} 后将无法保存。`,
    };
  }
  return { bytes, human, level: 'ok' };
}

/**
 * 体积指标落库（失败绝不阻断业务 —— 指标是观测手段，不是业务前置条件）。
 * 采用「只保留每键最新值 + 累计写入次数」，避免指标表本身膨胀成新的大对象问题。
 */
export async function recordSizeMetric(
  db: any,
  orgId: string,
  key: string,
  bytes: number,
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO app_state_metrics (org_id, key, bytes, writes, peak_bytes, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)
         ON CONFLICT(org_id, key) DO UPDATE SET
           bytes = excluded.bytes,
           writes = app_state_metrics.writes + 1,
           peak_bytes = MAX(app_state_metrics.peak_bytes, excluded.bytes),
           updated_at = excluded.updated_at`
      )
      .bind(orgId, key, bytes, bytes, new Date().toISOString())
      .run();
  } catch {
    // 指标表不存在（迁移未执行）或临时故障 → 静默跳过，绝不影响业务写入
  }
}
