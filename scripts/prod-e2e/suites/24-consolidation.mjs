// 套件 24 · C2 合并报表 / 多账簿护栏（V3.13.0）
//
// ── 本套件防的是什么回潮 ────────────────────────────────────────────
//  C2 是 C1 收口后的第一个"能力型"阶段（不是"迁数据"），地基是：
//    ① 组织集团化 + 多账簿维度（orgs 加层级、vouchers 加 ledger_book）
//    ② 合并引擎（跨账簿/跨组织聚合 + 内部交易抵消）
//  最容易出的三类缺陷：
//    A. 新表没在 RLS 登记 → 通用实体路由返回空集甚至 500（漏登记默认拒绝）。
//       → 用 ledgerBook / consolidationGroup / eliminationRule 三个实体 CRUD 验证。
//    B. 合并引擎"聚合对了但没抵消"：母子公司之间的应收应付原样相加，
//       合并报表虚增内部往来。→ 构造"法定账套应收 100 / 管理账套应付 100"，
//       断言合并后两者余额都归零、抵消明细金额=100。
//    C. 跨账簿根本没汇总：只算了一个账簿。→ 用两个不同 ledger_book 的凭证，
//       断言合并试算平衡表里出现了跨账簿汇总后的科目。
//
// 为什么用"多账簿合并（books）"做主验证路径：
//   生产门禁每轮只建一个隔离组织，跨组织登录成本高。而"同组织跨账簿"是合并报表的
//   同构子集（同样走聚合 + 抵消），单组织即可端到端验证引擎正确性。

export const meta = {
  id: '24-consolidation',
  title: 'C2 合并报表/多账簿（建表+RLS登记 + 跨账簿聚合 + 内部往来抵消）',
};

const stamp = () => Date.now().toString(36).toUpperCase();

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;

  // ══════════════════════════════════════════════════════════════
  // 1. 新表 + RLS 登记：三个配置实体均可 CRUD（隐含验证表存在 + RLS='all'）
  // ══════════════════════════════════════════════════════════════
  const lbList = await req('GET', '/api/entities/ledgerBook', { token });
  s.expectStatus('GET /api/entities/ledgerBook 返回 200（ledger_books 表存在且 RLS 已登记）', lbList, 200);
  if (lbList.status === 200) s.expectListShape('  └ 账簿列表契约 {data,total} ', lbList);

  const cgList = await req('GET', '/api/entities/consolidationGroup', { token });
  s.expectStatus('GET /api/entities/consolidationGroup 返回 200（consolidation_groups RLS 已登记）', cgList, 200);

  const erList = await req('GET', '/api/entities/eliminationRule', { token });
  s.expectStatus('GET /api/entities/eliminationRule 返回 200（elimination_rules RLS 已登记）', erList, 200);

  const anon = await req('GET', '/api/entities/ledgerBook');
  s.expectStatus('未登录访问账簿被拒 401', anon, 401);

  // ══════════════════════════════════════════════════════════════
  // 2. 建两套账簿（法定 / 管理）+ 一条内部往来抵消规则
  // ══════════════════════════════════════════════════════════════
  const st = stamp();
  const lbLegal = await req('POST', '/api/entities/ledgerBook', {
    token, body: { ledgerCode: '0000', name: `法定账套-${st}`, type: 'legal', baseCurrency: 'CNY' },
  });
  const lbLegalOk = s.expectStatus('创建法定账套返回 201', lbLegal, 201);
  const lbMgmt = await req('POST', '/api/entities/ledgerBook', {
    token, body: { ledgerCode: '1000', name: `管理账套-${st}`, type: 'management', baseCurrency: 'CNY' },
  });
  const lbMgmtOk = s.expectStatus('创建管理账套返回 201', lbMgmt, 201);

  // 抵消规则：内部往来（应收 C2ARB vs 应付 C2APB）—— 用 C2 专属科目码避免与其他套件凭证撞码
  const rule = await req('POST', '/api/entities/eliminationRule', {
    token, body: { code: `ELIM-${st}`, name: '内部往来抵消', receivableAccount: 'C2ARB', payableAccount: 'C2APB' },
  });
  const ruleOk = s.expectStatus('创建抵消规则返回 201', rule, 201);

  // 回读校验：证明真的落库（不是回显）
  if (lbLegalOk && lbLegal.data) {
    const back = await req('GET', `/api/entities/ledgerBook/${lbLegal.data.id}`, { token });
    s.expectStatus('GET 账簿单条返回 200（确认真实落库）', back, 200);
    s.expectEq('  └ 回读 ledgerCode 一致', String(back.data?.ledgerCode), '0000', 'ledgerCode');
  }

  // ══════════════════════════════════════════════════════════════
  // 3. 在【两个不同账簿】里各录一笔，构成内部往来镜像
  //    法定账套：借 应收(C2ARB) 100 / 贷 银行存款(C2BANK) 100
  //    管理账套：借 银行存款(C2BANK) 100 / 贷 应付(C2APB) 100
  //    → 合并前：C2ARB=+100(借)，C2APB=+100(贷)，C2BANK 借贷相抵=0
  //    → 合并+抵消后：C2ARB 与 C2APB 各被冲减 100 → 余额归零
  // ══════════════════════════════════════════════════════════════
  const vA = await req('POST', '/api/vouchers', {
    token, body: {
      id: `vch-c2a-${st}`, voucherNo: `C2-A-${st}`, voucherType: '转', date: '2026-09-16', period: '2026-09',
      currency: 'CNY', ledgerBook: '0000', totalDebit: 100, totalCredit: 100,
      items: [
        { lineNo: 1, summary: '内部应收', accountCode: 'C2ARB', accountName: '内部应收', debit: 100, credit: 0, ledgerBook: '0000' },
        { lineNo: 2, summary: '银行', accountCode: 'C2BANK', accountName: '银行存款', debit: 0, credit: 100, ledgerBook: '0000' },
      ],
    },
  });
  s.expectStatus('法定账套凭证返回 201', vA, 201, vA.status !== 201 ? JSON.stringify(vA.data).slice(0, 200) : '');

  const vB = await req('POST', '/api/vouchers', {
    token, body: {
      id: `vch-c2b-${st}`, voucherNo: `C2-B-${st}`, voucherType: '转', date: '2026-09-16', period: '2026-09',
      currency: 'CNY', ledgerBook: '1000', totalDebit: 100, totalCredit: 100,
      items: [
        { lineNo: 1, summary: '银行', accountCode: 'C2BANK', accountName: '银行存款', debit: 100, credit: 0, ledgerBook: '1000' },
        { lineNo: 2, summary: '内部应付', accountCode: 'C2APB', accountName: '内部应付', debit: 0, credit: 100, ledgerBook: '1000' },
      ],
    },
  });
  s.expectStatus('管理账套凭证返回 201', vB, 201, vB.status !== 201 ? JSON.stringify(vB.data).slice(0, 200) : '');

  // ══════════════════════════════════════════════════════════════
  // 3b. 补充更真实的外部业务凭证（不触发抵消，仅验证多科目聚合 + 试算平衡）
  //     法定账套：外部销售收 5000（C2REV）、外部费用 2000（C2EXP）
  //     管理账套：外部销售收 800（C2REV）
  //     → 合并后试算平衡表借贷合计应相等（真实多元数据下引擎仍自洽）
  // ══════════════════════════════════════════════════════════════
  const vA2 = await req('POST', '/api/vouchers', {
    token, body: {
      id: `vch-c2a2-${st}`, voucherNo: `C2-A2-${st}`, voucherType: '转', date: '2026-09-16', period: '2026-09',
      currency: 'CNY', ledgerBook: '0000', totalDebit: 5000, totalCredit: 5000,
      items: [
        { lineNo: 1, summary: '外部销售', accountCode: 'C2BANK', accountName: '银行存款', debit: 5000, credit: 0, ledgerBook: '0000' },
        { lineNo: 2, summary: '营业收入', accountCode: 'C2REV', accountName: '营业收入', debit: 0, credit: 5000, ledgerBook: '0000' },
      ],
    },
  });
  s.expectStatus('法定账套外部销售凭证返回 201', vA2, 201, vA2.status !== 201 ? JSON.stringify(vA2.data).slice(0, 200) : '');

  const vA3 = await req('POST', '/api/vouchers', {
    token, body: {
      id: `vch-c2a3-${st}`, voucherNo: `C2-A3-${st}`, voucherType: '转', date: '2026-09-16', period: '2026-09',
      currency: 'CNY', ledgerBook: '0000', totalDebit: 2000, totalCredit: 2000,
      items: [
        { lineNo: 1, summary: '管理费用', accountCode: 'C2EXP', accountName: '管理费用', debit: 2000, credit: 0, ledgerBook: '0000' },
        { lineNo: 2, summary: '银行', accountCode: 'C2BANK', accountName: '银行存款', debit: 0, credit: 2000, ledgerBook: '0000' },
      ],
    },
  });
  s.expectStatus('法定账套费用凭证返回 201', vA3, 201, vA3.status !== 201 ? JSON.stringify(vA3.data).slice(0, 200) : '');

  const vB2 = await req('POST', '/api/vouchers', {
    token, body: {
      id: `vch-c2b2-${st}`, voucherNo: `C2-B2-${st}`, voucherType: '转', date: '2026-09-16', period: '2026-09',
      currency: 'CNY', ledgerBook: '1000', totalDebit: 800, totalCredit: 800,
      items: [
        { lineNo: 1, summary: '外部销售', accountCode: 'C2BANK', accountName: '银行存款', debit: 800, credit: 0, ledgerBook: '1000' },
        { lineNo: 2, summary: '营业收入', accountCode: 'C2REV', accountName: '营业收入', debit: 0, credit: 800, ledgerBook: '1000' },
      ],
    },
  });
  s.expectStatus('管理账套外部销售凭证返回 201', vB2, 201, vB2.status !== 201 ? JSON.stringify(vB2.data).slice(0, 200) : '');

  // ══════════════════════════════════════════════════════════════
  // 4. ★ 执行多账簿合并（books scope）
  // ══════════════════════════════════════════════════════════════
  const run = await req('POST', '/api/consolidation', { token, body: { scope: 'books', period: '2026-09' } });
  const runOk = s.expectStatus('★ POST /api/consolidation 返回 201', run, 201,
    run.status !== 201 ? JSON.stringify(run.data).slice(0, 240) : '');

  if (runOk && run.data) {
    const tb = run.data.trialBalance || [];
    const byCode = Object.fromEntries(tb.map((r) => [r.code, r]));

    // ★ 跨账簿确实汇总了：同一科目 C2BANK 的借贷来自两个账簿，出现在一行
    s.expectTrue('★ 合并试算平衡表含跨账簿科目 C2BANK（两账簿借贷已汇总到一行）',
      !!byCode['C2BANK'], `codes=${tb.map((r) => r.code).join(',')}`);

    // ★★★ 内部往来抵消：合并前 C2ARB=+100(借)、C2APB=+100(贷)；抵消后两者应归零
    const arb = byCode['C2ARB'];
    const apb = byCode['C2APB'];
    s.expectTrue('★★ 合并试算平衡表含内部应收 C2ARB 与内部应付 C2APB', !!arb && !!apb,
      `arb=${arb?.ending} apb=${apb?.ending}`);
    if (arb) s.expectEq('★★ 抵消后内部应收 C2ARB 余额=0（100 借被冲减）', Number(arb.ending), 0, 'C2ARB.ending');
    if (apb) s.expectEq('★★ 抵消后内部应付 C2APB 余额=0（100 贷被冲减）', Number(apb.ending), 0, 'C2APB.ending');

    // ★ 抵消明细正确：一条规则、金额 100
    const elims = run.data.eliminations || [];
    s.expectTrue('★★ 产生内部交易抵消明细（至少 1 条）', elims.length >= 1,
      `elims=${JSON.stringify(elims).slice(0, 160)}`);
    if (elims.length >= 1) {
      s.expectEq('  └ 抵消金额=100（与镜像内部往来一致）', Number(elims[0].amount), 100, 'elimination.amount');
    }

    // ★ 试算平衡：借贷合计相等（真实多元数据下引擎仍自洽）
    const tot = run.data.totals || {};
    s.expectTrue('★★ 合并试算平衡表借贷合计相等（真实数据下仍自洽）',
      Number(tot.debit) === Number(tot.credit),
      `debit=${tot.debit} credit=${tot.credit}`);
    // ★ 外部收入科目真实出现并被聚合（验证多科目汇总而非只算内部往来）
    s.expectTrue('★★ 合并试算平衡表含营业收入 C2REV（外部交易被聚合）',
      !!byCode['C2REV'], `codes=${tb.map((r) => r.code).join(',')}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 5. GET 取最近一次合并结果（落库快照可读）
  // ══════════════════════════════════════════════════════════════
  const latest = await req('GET', '/api/consolidation', { token });
  const latestOk = s.expectStatus('GET /api/consolidation 返回 200（合并结果快照可读）', latest, 200,
    latest.status !== 200 ? JSON.stringify(latest.data).slice(0, 200) : '');
  if (latestOk && latest.data) {
    s.expectTrue('  └ 快照含合并试算平衡表', Array.isArray(latest.data.trialBalance), 'trialBalance');
  }

  // ══════════════════════════════════════════════════════════════
  // 6. 集团合并（group scope）无范围时返回 404（引导正确，不静默空跑）
  // ══════════════════════════════════════════════════════════════
  const grp = await req('POST', '/api/consolidation', { token, body: { scope: 'group' } });
  s.expectTrue('group scope 无合并范围时返回 404（而非静默成功）',
    grp.status === 404, `status=${grp.status} body=${JSON.stringify(grp.data).slice(0, 120)}`);
}
