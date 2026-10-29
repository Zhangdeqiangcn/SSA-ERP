// GET/PUT/DELETE /api/vouchers/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { validateOrReject } from '../../_shared/validate';
import { guardVoucherItems } from '../../_shared/voucherGuard';
import { guardStatusTransition } from '../../_shared/statusMachine';

import { audit } from '../../_shared/auditLog';
import { isPeriodClosed, toPeriod } from '../../_shared/appState';
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM vouchers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '凭证不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM voucher_items WHERE voucher_id = ? ORDER BY line_no`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, voucher_id: r.voucher_id, line_no: Number(r.line_no), summary: r.summary,
      account_code: r.account_code, account_name: r.account_name,
      debit: Number(r.debit), credit: Number(r.credit),
      currency: r.currency || 'CNY', exchange_rate: r.exchange_rate ? Number(r.exchange_rate) : 1,
      // ★ V3.45.0 补返回三列：否则前端编辑凭证时拿不到 projectId/costCenterId/ledgerBook，
      //   回写时又写成 null → 预算闸门取数恒为 0（GET 不给 = 前端无法保值）。
      cost_center_id: r.cost_center_id, project_id: r.project_id, ledger_book: r.ledger_book || '0000',
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT id, date, period, status FROM vouchers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '凭证不存在' }, 404);

  // V3.28.0: 操作权限服务端守卫（财务模块 — 财务主管/会计可改凭证，越权返回 403）
  const _opGuard = await guardOperation(user, 'finance', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('vouchers', body, { partial: true });

  // ★ #13 期末结账服务端强制管控：已结账期间的凭证禁止任何变更（含过账/审核/红冲/改分录）。
  // ★ V3.45.0 修正为**双期间校验**（对标 SAP OB52）：
  //   原实现 `toPeriod(body.date) || toPeriod(existing.date)` 只在本次**未携带日期**时
  //   才回落到原期间 → 一张属于 2026-01（已结账）的凭证，只要提交 body.date='2026-02'
  //   就能算出"未结账的目标期间"从而放行，一条 UPDATE 就把已结账凭证挪进了未结账期，
  //   已结账月份的报表随之改变（SAP/金蝶/用友均锁期间，不允许跨期挪动）。
  //   现在源期间与目标期间**都**校验，任一已结账即拒绝。
  //   注：前端 checkPeriodWritable 早已正确做了双侧（blockedOld + blockedNew），
  //   是服务端比前端更宽松 —— 典型的"服务端漏拦"，本次补齐。
  const _oldPeriod = toPeriod((existing as any).date, (existing as any).period);
  const _newPeriod = toPeriod(body?.date, body?.period);
  for (const _p of Array.from(new Set([_oldPeriod, _newPeriod].filter(Boolean)))) {
    if (await isPeriodClosed(db, user.org_id, _p as string)) {
      return json({ error: `会计期间 ${_p} 已结账，禁止修改凭证；如需操作请先在「财务→期末结账」反结账该期间` }, 400);
    }
  }

  if (_invalid) return _invalid;

  // ★ V3.15.9 服务端借贷平衡闸门：与写入接口同口径。
  //   只在本次请求**携带分录行**时生效 —— 仅改状态（过账／审核／红冲标记）的请求
  //   不带 items，不能因为它们没有分录就拒绝。
  //   注意：过账与红冲走的是"整单回写"，会带上原分录，此时校验的是同一批已平分录，天然通过。
  const _guard = guardVoucherItems(body);
  if (_guard) return json(_guard.response, 400);

  // #9 服务端状态机：硬拦非法状态流转——已过账凭证不可改回草稿/已审核（只能红冲），
  //   已红冲凭证完全锁定。绕开界面亦生效。
  const _statusGuard = guardStatusTransition('voucher', (existing as any).status, body);
  if (_statusGuard) return json(_statusGuard.response, 400);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  // ★ 与 index.ts 同口径修正：原先把 totalDebit / createdBy / reviewedBy 等映射到
  //   同名的**驼峰数据库列**（该表历史遗留 9 个驼峰列），与同表蛇形映射混用。
  //   现统一为蛇形，配合迁移 0064 删除驼峰列。
  // ★ `createdBy` 移除：创建人由审计列在 INSERT 时写入，UPDATE 不该改创建人。
  const fields = ['voucherNo', 'voucherType', 'date', 'period', 'description', 'source', 'status', 'totalDebit', 'totalCredit', 'currency', 'attachmentCount', 'sourceNo', 'reviewedBy', 'reviewedAt', 'postedBy', 'postedAt', 'reversed', 'reversedBy', 'reversedAt', 'reversalVoucherNo', 'remark', 'remarks'];
  const setClauses: string[] = [];
  const values: (string | number)[] = [];

  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'voucherNo' ? 'voucher_no' : f === 'voucherType' ? 'voucher_type' : f === 'date' ? 'date' :
        f === 'period' ? 'period' : f === 'description' ? 'description' : f === 'source' ? 'source' : f === 'status' ? 'status' :
        f === 'totalDebit' ? 'total_debit' : f === 'totalCredit' ? 'total_credit' : f === 'currency' ? 'currency' :
        f === 'attachmentCount' ? 'attachment_count' : f === 'sourceNo' ? 'source_no' :
        f === 'reviewedBy' ? 'reviewed_by' : f === 'reviewedAt' ? 'reviewed_at' : f === 'postedBy' ? 'posted_by' :
        f === 'postedAt' ? 'posted_at' : f === 'reversed' ? 'reversed' : f === 'reversedBy' ? 'reversed_by' :
        f === 'reversedAt' ? 'reversed_at' : f === 'reversalVoucherNo' ? 'reversal_voucher_no' :
        f === 'remark' ? 'remarks' : f === 'remarks' ? 'remarks' :
        f.toLowerCase();
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  // ★ DB-002 收口：把「改头 + 删分录 + 插分录」包进同一 D1 batch（原子，all-or-nothing），
  //   杜绝中途失败导致「头已改、分录却残缺」的不一致（此前是三个独立 .run()）。
  //   注：D1 batch 单次上限 100 条语句；会计凭证分录极少超此数，与 writeVoucher 保持一致。
  // ★ V3.49.0 R6 纵深防御：改/删前已有 `SELECT … WHERE id=? AND org_id=?` 兜底（跨组织 404），
  //   但内部 UPDATE/DELETE 仍裸写 `WHERE id=?`（跨组织同 id 理论可误改，违设计）。补 org_id 收严。
  const stmts: any[] = [
    db.prepare(`UPDATE vouchers SET ${setClauses.join(', ')} WHERE id = ? AND org_id = ?`).bind(...values, id, user.org_id),
  ];
  if (body.items && Array.isArray(body.items)) {
    // ★ V3.45.0：已过账/已红冲的凭证**禁止携带分录**改写。
    //   已记账凭证的分录是账实依据，改它必须走红字冲销后重新入账（对标 SAP：
    //   过账后分录行受凭证头锁定，只能整体冲销）。此前这条路径可被任意调用。
    const _st = String((existing as any).status || '');
    if (Array.isArray(body.items) && body.items.length > 0 && (_st === 'posted' || _st === 'reversed')) {
      return json({ error: '已过账凭证不可直接修改分录，请通过红字冲销后重新录入' }, 400);
    }
    stmts.push(db.prepare(`DELETE FROM voucher_items WHERE voucher_id = ?`).bind(id));
    for (const [idx, item] of body.items.entries()) {
      // ★ V3.45.0 补齐三列（cost_center_id / project_id / ledger_book）。
      //   原 INSERT 只写 10 列，而表里有这三列；又因 PUT 是"先 DELETE 再全量 INSERT"，
      //   **任何一次编辑都会把这三列整体清空** —— 其中 project_id 正是预算闸门
      //   guardBudget 的取数列，清空即让超预算永不触发（与 voucherWriter 的写死 null 同源）。
      stmts.push(
        db.prepare(`INSERT INTO voucher_items (id, voucher_id, line_no, summary, account_code, account_name, debit, credit, currency, exchange_rate, cost_center_id, project_id, ledger_book) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          item.id || `vi-${id}-${Math.random().toString(36).slice(2, 6)}`,
          id, item.lineNo || idx + 1, item.summary || null, item.accountCode || null, item.accountName || null,
          item.debit || 0, item.credit || 0,
          item.currency || body.currency || 'CNY', Number(item.exchangeRate) > 0 ? item.exchangeRate : 1,
          item.costCenterId || null,
          item.projectId || null,
          item.ledgerBook || body.ledgerBook || '0000'
        )
      );
    }
  }
  await db.batch(stmts);

  await audit(db, user.org_id, user, 'vouchers', 'update', `更新记账凭证 ${id}`);
  return json({ success: true });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id, date, period FROM vouchers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '凭证不存在' }, 404);

  // V3.28.0: 操作权限服务端守卫（财务模块 — 财务主管/会计可删凭证，越权返回 403）
  const _opGuard = await guardOperation(user, 'finance', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  // ★ #13 期末结账服务端强制管控：已结账期间的凭证禁止删除。
  const _delPeriod = toPeriod((row as any).date, (row as any).period);
  if (_delPeriod && (await isPeriodClosed(db, user.org_id, _delPeriod))) {
    return json({ error: `会计期间 ${_delPeriod} 已结账，禁止删除凭证；如需操作请先在「财务→期末结账」反结账该期间` }, 400);
  }

  // ★ DB-002 收口：把「删头 + 删分录」包进同一 D1 batch（原子），
  //   杜绝中途失败导致「头已删、分录却残留」的孤儿分录（此前是两个独立 .run()）。
  //   审计(audit)不进 batch —— 审计失败按降级铁律不得回滚业务。
  // ★ V3.49.0 R6：删头补 org_id 收严（voucher_items 无 org_id 列，按凭证 id 删即可）。
  await db.batch([
    db.prepare(`DELETE FROM vouchers WHERE id = ? AND org_id = ?`).bind(id, user.org_id),
    db.prepare(`DELETE FROM voucher_items WHERE voucher_id = ?`).bind(id),
  ]);
  await audit(db, user.org_id, user, 'vouchers', 'delete', `删除记账凭证 ${id}`);

  return json({ success: true });
}
