// POST /api/fixed-assets/depreciate — 计提本月折旧（#13 彻底服务端化 V3.17.1）
//
// 旧实现：deprecateAll 在前端算累计折旧、往遗留表 fin_account_entries 写两条中文科目
//   分录，**不产生权威凭证**、可随意改状态绕过结账。现改为服务端权威端点：
//   ① 更新在用资产的累计折旧/净值（D1 fixed_assets）；
//   ② 生成折旧凭证（借 6602 管理费用-折旧 / 贷 1602 累计折旧）进 vouchers；
//   ③ 受「已结账期间禁止记账」硬管控（isPeriodClosed）；
//   ④ 同期间幂等：已存在该期间折旧凭证则直接返回，不重复计提/不重复出凭证。
import { getUserFromRequest, json } from '../../_shared/auth';
import { audit } from '../../_shared/entities';
import { isPeriodClosed } from '../../_shared/appState';
import { buildVoucherStmts } from '../../_shared/voucherWriter';

import { roundAmount } from '../../_shared/money';

/**
 * V3.60.0 P1-3：判断固定资产是否属于「生产用资产」。
 * 生产用资产折旧计入生产成本(5001)；其余（办公/运输/管理用）计入管理费用(6602)。
 * 判定：category 含 生产/制造/车间/机器/机床/产线/厂房/房屋 视为生产用。
 */
function isProductionAsset(category?: string): boolean {
  return /生产|制造|车间|机器|机床|产线|厂房|房屋/.test(String(category || ''));
}

/**
 * 计算两个会计期间（YYYY-MM）之间**相差的月数**（to - from），用于判断折旧是否已到期。
 * ★ V3.45.0 新增并导出：原先折旧计提**完全不判断使用年限**，
 *   资产提满后仍按月继续计提（累计折旧可超原值），对标 SAP FI-AA 的
 *   "折旧基数为 0 / 到期自动停提"，金蝶/用友亦到期自动停提。
 *
 * 命名说明：函数名刻意用 monthsElapsedSince（"自 from 起经过的月数"）而不是
 *   monthsBetween —— 后者易被误读为"含首尾的期间数"（如把 2026-01→2027-01
 *   误当成 1 期，实际是 12 期），这个歧义在写单测时已真实踩过一次。
 *
 * @param fromPeriod 起始期间 YYYY-MM
 * @param toPeriod   目标期间 YYYY-MM
 * @returns 相差月数（from 之前返回 0）；任一入参不可解析时返回 0
 *          （按"未计提过"处理 —— 宁可不停提等人工修，也不能误把在用资产全标已提足）
 */
export function monthsElapsedSince(fromPeriod: string, toPeriod: string): number {
  // ★ 关键：用**命名捕获组**。此前写成 `const m = /^(\d{4})-(\d{2})$/.exec(s)` 后
  //   取 `m[1]` / `m[2]` —— RegExpExecArray 的下标 1、2 是**捕获组**没错，
  //   但一旦正则带命名组，`m.groups` 才是捕获组入口；混用极易取错值。
  //   实测（V3.45.0 单测抓到）：'2026-01'→'2026-12' 曾返回 132、'2026-01'→'2027-01' 返回 1，
  //   两者都会让"已提期数"判断完全失真 —— 折旧要么永不停止、要么立刻全停。
  //   这里显式解构 groups 并对缺项兜底，杜绝再次踩坑。
  const m = /^(?<y>\d{4})-(?<mo>\d{2})$/.exec(String(fromPeriod || '').trim());
  const t = /^(?<y>\d{4})-(?<mo>\d{2})$/.exec(String(toPeriod || '').trim());
  const fy = Number(m?.groups?.y), fm = Number(m?.groups?.mo);
  const ty = Number(t?.groups?.y), tm = Number(t?.groups?.mo);
  if (!Number.isFinite(fy) || !Number.isFinite(fm) || !Number.isFinite(ty) || !Number.isFinite(tm)) return 0;
  // 月份越界（如 13 月）视为非法输入，不参与到期判断
  if (fm < 1 || fm > 12 || tm < 1 || tm > 12) return 0;
  const months = (ty - fy) * 12 + (tm - fm);
  return months > 0 ? months : 0;
}

function rowToFixedAsset(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    assetCode: r.asset_code,
    assetName: r.asset_name,
    category: r.category,
    originalValue: r.original_value,
    residualRate: r.residual_rate,
    usefulLifeMonths: r.useful_life_months,
    startDate: r.start_date,
    monthlyDepreciation: r.monthly_depreciation,
    accumulatedDepreciation: r.accumulated_depreciation,
    netValue: r.net_value,
    depreciationMethod: r.depreciation_method,
    status: r.status,
    scrapDate: r.scrap_date,
    lastDepreciationPeriod: r.last_depreciation_period,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = context.env.DB;
  const b = await context.request.json().catch(() => ({}));
  const period = (b.period || new Date().toISOString().slice(0, 7)) as string;
  if (!/^\d{4}-\d{2}$/.test(period)) return json({ error: '期间格式应为 YYYY-MM' }, 400);

  // ③ 已结账期间禁止记账
  if (await isPeriodClosed(db, user.org_id, period)) {
    return json(
      { error: `会计期间 ${period} 已结账，禁止计提折旧；如需操作请先在「财务→期末结账」反结账该期间` },
      400
    );
  }

  // ④ 同期间幂等：已有该期间折旧凭证则直接返回，不重复出凭证
  const existed = await db
    .prepare('SELECT id, voucher_no, total_debit FROM vouchers WHERE org_id = ? AND source = ? AND source_no = ?')
    .bind(user.org_id, 'asset', period)
    .first();
  if (existed) {
    const rows = await db.prepare('SELECT * FROM fixed_assets WHERE org_id = ? ORDER BY asset_code').bind(user.org_id).all();
    return json({
      data: {
        total: roundAmount(existed.total_debit || 0),
        voucherNo: existed.voucher_no,
        period,
        duplicated: true,
        assets: (rows.results || []).map(rowToFixedAsset),
      },
    });
  }

  // ① 仅计提在用资产
  const assets = await db
    .prepare("SELECT * FROM fixed_assets WHERE org_id = ? AND status = 'in_use'")
    .bind(user.org_id)
    .all();
  const inUse: any[] = assets.results || [];
  if (inUse.length === 0) {
    return json({ data: { total: 0, voucherNo: null, period, assets: [] } });
  }

  let total = 0;
  let productionTotal = 0; // 生产用资产折旧额 → 5001 生产成本
  let adminTotal = 0;      // 管理用资产折旧额 → 6602 管理费用
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const updateStmts: any[] = [];
  const expiredIds: string[] = [];   // 本期新到期、应置为「已提足」的资产
  for (const a of inUse) {
    const dep = roundAmount(a.monthly_depreciation || 0);
    if (dep <= 0) continue;

    // ★ V3.45.0 补「折旧到期」判断（对标 SAP FI-AA：折旧基数为 0 / 到期自动停提）：
    //   原实现只按 status='in_use' 过滤，**不判已提期数与年限**，
    //   于是提满 useful_life_months 之后仍按月继续计提：
    //   net 用 Math.max(0,...) 卡在 0 不变负，但 total 与 accumulated 照旧累加
    //   ⇒ 凭证继续全额计提、累计折旧可超过原值（纯财务硬伤）。
    //   现在三重保护：
    //     ① 已提期数 ≥ 使用年限 → 本期不计提，转入「已提足」；
    //     ② 计提额不得超过「原值 × (1 - 残值率) - 已提累计」；
    //     ③ 计提后净值恰为 0 者标记「已提足」，不再进入后续期间。
    const life = Number(a.useful_life_months) || 0;
    const alreadyMonths = a.last_depreciation_period
      ? monthsElapsedSince(String(a.last_depreciation_period).slice(0, 7), period.slice(0, 7))
      : 0;
    if (life > 0 && alreadyMonths + 1 > life) {
      expiredIds.push(String(a.id));
      continue;
    }

    const residualRate = Number(a.residual_rate) || 0;
    const depreciableBase = roundAmount((a.original_value || 0) * (1 - residualRate));
    const alreadyDep = roundAmount(a.accumulated_depreciation || 0);
    // 剩余可提额度：不得超过基线，同时天然形成"提完即止"
    const remaining = roundAmount(depreciableBase - alreadyDep);
    if (remaining <= 0) {
      expiredIds.push(String(a.id));
      continue;
    }
    const actualDep = Math.min(dep, remaining);
    if (actualDep <= 0) {
      expiredIds.push(String(a.id));
      continue;
    }

    total = roundAmount(total + actualDep);
    // V3.60.0 P1-3：按资产用途分流折旧额（生产用→生产成本，管理用→管理费用）
    if (isProductionAsset(a.category)) productionTotal = roundAmount(productionTotal + actualDep);
    else adminTotal = roundAmount(adminTotal + actualDep);
    const accumulated = roundAmount(alreadyDep + actualDep);
    const net = Math.max(0, roundAmount((a.original_value || 0) - accumulated));
    // 提足后净值归零 → 标记已提足，下期不再计提
    const fullyDepreciated = net <= 0 || roundAmount(accumulated - depreciableBase) >= 0;
    if (fullyDepreciated) expiredIds.push(String(a.id));

    const setClauses = `accumulated_depreciation = ?, net_value = ?, last_depreciation_period = ?, updated_at = ?, updated_by = ?`;
    const binds: any[] = [accumulated, net, period, now, user.name];
    updateStmts.push(
      db
        .prepare(`UPDATE fixed_assets SET ${setClauses}${fullyDepreciated ? ", status = 'fully_depreciated'" : ''} WHERE id = ? AND org_id = ?`)
        .bind(...binds, a.id, user.org_id)
    );
  }
  // 未参与本期计提、但已到期的资产：落状态便于界面显示"已提足"，并排除出后续期间
  for (const aid of expiredIds) {
    updateStmts.push(
      db
        .prepare(`UPDATE fixed_assets SET status = 'fully_depreciated', updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ? AND status = 'in_use'`)
        .bind(now, user.name, aid, user.org_id)
    );
  }
  total = roundAmount(total);

  // ② 生成折旧凭证语句（**构建不执行**，与资产台账同批原子提交，见下）
  const voucherNoConst = 'DEPR-' + period;
  let voucherStmts: any[] = [];
  let voucherId: string | null = null;
  if (total > 0) {
    const built = buildVoucherStmts(db, user.org_id, user, {
      voucherNo: voucherNoConst,
      voucherType: '转',
      date: today,
      period,
      description: `计提固定资产折旧 ${period}`,
      source: 'asset',
      sourceNo: period,
      status: 'posted',
      totalDebit: total,
      totalCredit: total,
      currency: 'CNY',
      remark: `服务端自动计提 ${period} 折旧`,
      items: [
        ...(productionTotal > 0
          ? [{ summary: `生产用资产折旧 ${period}`, accountCode: '5001', accountName: '生产成本', debit: productionTotal, credit: 0 }]
          : []),
        ...(adminTotal > 0
          ? [{ summary: `管理用资产折旧 ${period}`, accountCode: '6602', accountName: '管理费用', debit: adminTotal, credit: 0 }]
          : []),
        { summary: `累计折旧 ${period}`, accountCode: '1602', accountName: '累计折旧', debit: 0, credit: total },
      ],
    });
    if (built.stmts.length) {
      voucherStmts = built.stmts;
      voucherId = built.id;
    }
  }

  // P0-4：资产台账更新 + 折旧凭证收进**同一个原子批次**。
  //   根因：原实现「先 db.batch(资产台账) 再 writeVoucher(凭证)」两步分离，
  //   凭证虽受 UNIQUE(org_id, voucher_no) 保护、并发后到者插不进凭证，
  //   但此时资产累计折旧已被累加且**不回滚** ⇒ 双计提、账实不符。
  //   合并后：凭证头 UNIQUE 冲突会让**整批（含资产更新）一起回滚**，
  //   并发/重试的后到者自动失效，「同期间只提一次」在数据库层得到保证。
  let voucherNo: string | null = null;
  if (updateStmts.length || voucherStmts.length) {
    try {
      await db.batch([...updateStmts, ...voucherStmts]);
    } catch (e: any) {
      const uniq = String(e?.message || '').includes('UNIQUE');
      if (uniq) {
        // 并发/重试：该期间折旧凭证已被先到者提交，本批已整体回滚 → 按「已计提」返回
        const dup = await db
          .prepare('SELECT id, voucher_no, total_debit FROM vouchers WHERE org_id = ? AND source = ? AND source_no = ?')
          .bind(user.org_id, 'asset', period)
          .first();
        if (dup) {
          const dupRows = await db.prepare('SELECT * FROM fixed_assets WHERE org_id = ? ORDER BY asset_code').bind(user.org_id).all();
          return json({
            data: {
              total: roundAmount(dup.total_debit || 0),
              voucherNo: dup.voucher_no,
              period,
              duplicated: true,
              assets: (dupRows.results || []).map(rowToFixedAsset),
            },
          });
        }
      }
      throw e; // 非唯一冲突的数据库错误照常上抛，不吞
    }
    if (voucherId) {
      const v = await db.prepare('SELECT voucher_no FROM vouchers WHERE id = ?').bind(voucherId).first();
      voucherNo = v?.voucher_no || voucherNoConst;
      await audit(db, user.org_id, user, 'vouchers', 'create', `计提折旧生成凭证 ${voucherNo}（${period}）`);
    }
  }

  const rows = await db.prepare('SELECT * FROM fixed_assets WHERE org_id = ? ORDER BY asset_code').bind(user.org_id).all();
  return json({
    data: {
      total,
      voucherNo,
      period,
      duplicated: false,
      assets: (rows.results || []).map(rowToFixedAsset),
    },
  });
}
