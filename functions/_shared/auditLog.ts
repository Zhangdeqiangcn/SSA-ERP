// 审计写入的统一入口 —— 永不抛出，失败时走「降级通道」留痕。
//
// ── V3.3.0（评测 L-05 整改）：把「静默丢弃」改为「可发现的降级」 ──────────────
// 缺陷原状：审计写入一律 `try { INSERT } catch { /* 静默 */ }`。
//   审计失败时既不报错、不留痕、也不告警，后果有两层：
//     ① 出问题时无人知晓 —— 管理员看到的审计日志是「完整」的，因为缺的那条根本不存在；
//     ② 安全事件（越权尝试、批量删除）之后，恰恰在最需要证据时没有证据。
//
// 现改为三层降级链条（顺序即优先级）：
//   ① 结构化错误日志：console.error('[AUDIT_DEGRADED] ...')，零依赖、永远能执行，
//      云端平台日志可直接检索，是「一定能留下」的那一层；
//   ② 降级留痕表：把「谁 / 哪个实体 / 什么动作 / 原始摘要 / 失败原因」写入
//      独立的 audit_degraded 表（迁移 0048），使失败可被管理端查询与追溯；
//   ③ 永不抛出：审计绝不允许阻断业务主流程，业务请求照常返回成功。
//
// 为什么降级表不能复用 audit_logs：一次 INSERT 失败通常意味着该表或该批次本身有问题
//   （约束冲突、列缺失、库临时不可用），再往同一张表写第二条大概率同样失败；
//   独立表 + 独立 try/catch 才可能「主审计失败但降级留痕仍然成功」。
import { uid } from './auth';

/** 审计主体：既支持登录用户，也支持开放网关的接口密钥调用方 */
export interface AuditActor {
  id?: string | null;
  name?: string | null;
}

export interface AuditInput {
  /** 组织归属（必填，缺失时无法归属，仍会尽力留痕） */
  orgId?: string | null;
  actor: AuditActor;
  entity: string;
  action: string;
  summary: string;
  entityId?: string | null;
  /** 变更明细（可选），仅主审计落库，不写入降级记录（避免降级记录过大） */
  diff?: any;
}

/** 审计写入结果：既如实回报「是否走了降级」，也保留原有调用方需要的记录 id */
export interface AuditResult {
  /** 主审计是否成功落库 */
  ok: boolean;
  /** 主审计成功时为该条记录 id；走了降级通道时为 null（此时降级表另有独立记录） */
  id: string | null;
  /** 是否走了降级通道（等价于 !ok，单独给出便于调用方直接判断） */
  degraded: boolean;
}

/**
 * 业务主流程用的审计写入：返回结果对象，但**绝不抛出**。
 * 注意返回值语义（V3.3.0 修正）：以前返回裸 boolean，改造后引入降级通道时必须同时
 * 回传「记录 id」——`/api/audit/logs` 的既有调用方依赖 id（门禁 09-audit-match 断言），
 * 若只回 boolean 会把这条对外契约打断。故统一返回 `{ ok, id, degraded }`。
 */
/**
 * 计算某实体的下一版本号（V3.83.0 跨端精确回滚地基）。
 * 按 (org_id, entity, entity_id) 维度取当前 MAX(version)+1；
 * entity_id 为空的全局日志（登录/导出等无主键）不编号，恒为 1，避免给无关日志凑版本号。
 * 取数失败不阻断审计（降级为 1）。
 */
async function nextAuditVersion(DB: any, orgId: string | null, entity: string, entityId: string | null): Promise<number> {
  if (!entityId) return 1;
  try {
    const row: any = await DB.prepare(
      `SELECT MAX(version) AS maxv FROM audit_logs
        WHERE org_id = ? AND entity = ? AND entity_id = ?`,
    )
      .bind(orgId ?? null, entity, entityId)
      .first();
    return Math.max(1, Number(row?.maxv ?? 0)) + 1;
  } catch {
    return 1;
  }
}

export async function writeAudit(DB: any, input: AuditInput): Promise<AuditResult> {
  const now = new Date().toISOString();
  const actorId = input.actor?.id ?? null;
  const actorName = input.actor?.name ?? null;
  const id = uid('al');
  const entityId = input.entityId ?? null;
  // V3.83.0：带主键的实体变更按实体维度自增版本（支撑跨端精确回滚）；无主键日志恒 1
  const version = await nextAuditVersion(DB, input.orgId ?? null, input.entity, entityId);

  try {
    await DB.prepare(
      `INSERT INTO audit_logs (id, org_id, user_id, user_name, action, entity, entity_id, summary, diff, version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        input.orgId ?? null,
        actorId,
        actorName,
        input.action,
        input.entity,
        entityId,
        input.summary ?? '',
        input.diff ? JSON.stringify(input.diff) : null,
        version,
        now,
      )
      .run();
    return { ok: true, id, degraded: false };
  } catch (e: any) {
    await recordAuditDegraded(DB, input, e, now);
    return { ok: false, id: null, degraded: true };
  }
}

/**
 * 审计降级留痕（第 ① ② 层）。
 * 注意：本函数**自身也不允许抛出**——它已经在异常路径上，任何二次异常都会打断业务主流程。
 */
export async function recordAuditDegraded(
  DB: any,
  input: AuditInput,
  cause: any,
  at?: string,
): Promise<void> {
  const now = at || new Date().toISOString();
  const reason = String(cause?.message || cause || '未知错误').slice(0, 500);

  // 第 ① 层：结构化日志（零依赖，永远能执行；平台日志可检索 AUDIT_DEGRADED）
  try {
    console.error(
      '[AUDIT_DEGRADED] 审计写入失败，已转入降级留痕。' +
      ' entity=' + input.entity +
      ' action=' + input.action +
      ' org=' + (input.orgId ?? '-') +
      ' actor=' + (input.actor?.id ?? '-') +
      ' reason=' + reason,
    );
  } catch {
    /* 连日志都失败时继续往下，不阻断 */
  }

  // 第 ② 层：降级表留痕（尽力而为）
  try {
    await DB.prepare(
      `INSERT INTO audit_degraded (id, org_id, user_id, user_name, entity, action, summary, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        uid('ad'),
        input.orgId ?? null,
        input.actor?.id ?? null,
        input.actor?.name ?? null,
        input.entity,
        input.action,
        String(input.summary ?? '').slice(0, 1000),
        reason,
        now,
      )
      .run();
  } catch {
    /* 第 ② 层也失败时，只剩结构化日志——这正是第 ① 层必须零依赖的原因 */
  }
}

/**
 * 兼容旧签名的薄封装（位置参数）。
 * `account` 既可以是登录用户对象（取 id / name / username），
 * 也可以是开放网关的接口密钥调用方（传 `{ id: keyId, name: 'api-key' }`）。
 * 新代码优先使用 `writeAudit` 的对象参数形式；本函数专为「不打断既有调用点」而保留，
 * 但内部已统一走同一套降级链条，不再是各文件各自 try/catch 的复制品。
 */
export async function audit(
  DB: any,
  orgId: string | null,
  account: any,
  entity: string,
  action: string,
  summary: string,
): Promise<AuditResult> {
  return writeAudit(DB, {
    orgId,
    actor: { id: account?.id ?? null, name: account?.name || account?.username || null },
    entity,
    action,
    summary,
  });
}

/**
 * 审计降级自动补偿（V3.91.0 · 评测蓝图 2.9 整改）。
 *
 * 背景：writeAudit 主审计失败时，事件被写入 `audit_degraded` 降级表（绝不抛出、不阻断业务）。
 *   但此前「降级后无人回收」——降级记录只能靠人工发现，主审计链路恢复后也不会自动补写，
 *   等于把一次本应入主表的审计证据长期留在「非正常通道」里。
 *
 * 本函数在每次后台 tick（runJobTick）中被调用：扫描降级表，把「现在能落主表」的记录重放写入
 * `audit_logs`，成功即删除该降级行；仍失败则保留（下个 tick 再试）。批量上限受 limit 控制，
 * 避免单次请求耗时过长。失败不入队循环（仅计数），防止与主审计失败时再次降级形成死循环。
 */
export async function replayDegradedAudit(
  DB: any,
  limit = 50,
): Promise<{ processed: number; recovered: number; failed: number }> {
  let processed = 0;
  let recovered = 0;
  let failed = 0;
  try {
    const rows: any = await DB.prepare(
      `SELECT id, org_id, user_id, user_name, entity, action, summary, created_at
         FROM audit_degraded ORDER BY created_at ASC LIMIT ?`,
    )
      .bind(limit)
      .all();
    for (const r of rows?.results || []) {
      processed += 1;
      try {
        const newId = uid('al');
        const version = await nextAuditVersion(DB, r.org_id ?? null, r.entity, null);
        await DB.prepare(
          `INSERT INTO audit_logs (id, org_id, user_id, user_name, action, entity, entity_id, summary, diff, version, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            newId,
            r.org_id ?? null,
            r.user_id ?? null,
            r.user_name ?? null,
            r.action,
            r.entity,
            null,
            String(r.summary ?? '').slice(0, 1000),
            null,
            version,
            r.created_at || new Date().toISOString(),
          )
          .run();
        // 主表补写成功 → 删除降级行（避免重复补写）
        await DB.prepare('DELETE FROM audit_degraded WHERE id = ?').bind(r.id).run();
        recovered += 1;
      } catch {
        // 仍失败：保留降级行，下个 tick 再试
        failed += 1;
      }
    }
  } catch {
    /* audit_degraded 表不存在等异常：静默跳过，不阻断 tick */
  }
  return { processed, recovered, failed };
}

/** 审计健康概览（管理端只读） */export async function auditHealth(DB: any, orgId?: string | null, limit = 20) {
  const scope = orgId ? ' WHERE org_id = ?' : '';
  const args: any[] = orgId ? [orgId] : [];

  const total: any = await DB.prepare(
    `SELECT COUNT(*) AS cnt FROM audit_degraded${scope}`,
  )
    .bind(...args)
    .first();

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const last24h: any = await DB.prepare(
    `SELECT COUNT(*) AS cnt FROM audit_degraded WHERE created_at >= ?` + (orgId ? ' AND org_id = ?' : ''),
  )
    .bind(...(orgId ? [since, orgId] : [since]))
    .first();

  const recent: any = await DB.prepare(
    `SELECT id, org_id, user_id, user_name, entity, action, summary, error, created_at
       FROM audit_degraded${scope}
      ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(...args, limit)
    .all();

  return {
    total: total?.cnt ?? 0,
    last24h: last24h?.cnt ?? 0,
    recent: recent?.results || [],
    note: '本表只记录「审计写入失败」这一事件；为空即表示审计链路正常。',
  };
}
