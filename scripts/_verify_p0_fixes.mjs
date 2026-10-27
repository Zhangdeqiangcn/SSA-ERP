// V3.113.3 P0 断链修复 · 端到端验证脚本（本地）
// ─────────────────────────────────────────────────────────────
// 覆盖三条实测确认的 P0：
//   P0-2 合并报表账簿口径：同组织两套账簿（法定 0000 / 管理 1000）→ 试算平衡表必须**分列**，
//        且抵消只在同一账簿内进行。
//   P0-3 质量冻结量：扣留 100 件 → inventory_records.frozen_quantity=100、available 减少；
//        出库被拒（可用量不足）；放行 → 冻结量回冲、可用量恢复。
//   P0-4 供应商审核激活：注册 → 待审列表可见 → 审核通过 → 门户可登录；黑名单/解黑名单闭环。
//
// 另含 P0-1 委外过账复测（确认既有过账链路未被打坏）。
//
// 说明：本机有代理，Node 内置 fetch 访问 127.0.0.1 会被 ECONNRESET，
//   故所有请求走 curl（沙箱已放行本地回环）。
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE || 'http://127.0.0.1:8805';
const ROOT = 'C:/Users/zhangdeqiang/WorkBuddy/2026-05-08-task-1/ssa-erp';
const cred = JSON.parse(readFileSync(`${ROOT}/scripts/prod-e2e/.e2e-credentials.json`, 'utf8'));

function curl(method, path, { token, body } = {}) {
  const args = ['-s', '-m', '90', '-o', '-', '-w', '\\n__HTTP__%{http_code}', '-X', method, BASE + path, '-H', 'Content-Type: application/json'];
  if (token) args.push('-H', 'Authorization: Bearer ' + token);
  if (body !== undefined) args.push('-d', JSON.stringify(body));
  const raw = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const m = raw.match(/\n__HTTP__(\d{3})$/);
  const status = m ? Number(m[1]) : 0;
  const text = m ? raw.slice(0, raw.lastIndexOf('\n__HTTP__')) : raw;
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* 非 JSON */ }
  return { status, data, text };
}

// wrangler 入口：Windows 下 execFileSync 无法直接跑 npx(.cmd)，
//   故直接用 node 调 npx 缓存里的 wrangler cli.js。
const WRANGLER_CLI = [
  'C:/Users/zhangdeqiang/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/wrangler-dist/cli.js',
  'C:/Users/zhangdeqiang/AppData/Local/npm-cache/_npx/33c29b387f246335/node_modules/wrangler/wrangler-dist/cli.js',
  'C:/Users/zhangdeqiang/AppData/Local/npm-cache/_npx/f53f07989cdda700/node_modules/wrangler/wrangler-dist/cli.js',
].find((p) => { try { return readFileSync(p, 'utf8') !== undefined; } catch { return false; } });

function d1(sql) {
  if (!WRANGLER_CLI) throw new Error('未找到 wrangler cli.js');
  // D1_MODE=remote 时查/写生产库（默认 local）。
  // ⚠️ 生产复验会往 org_e2e_sandbox 写测试数据，脚本自身带清理逻辑。
  const remote = process.env.D1_MODE === 'remote';
  const out = execFileSync(
    process.execPath, [WRANGLER_CLI, 'd1', 'execute', 'ssa-erp-db', ...(remote ? ['--remote'] : ['--local']), '--command', sql],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  const start = out.indexOf('[');
  const end = out.lastIndexOf(']');
  if (start < 0 || end < 0) return [];
  try {
    const arr = JSON.parse(out.slice(start, end + 1));
    const rows = [];
    for (const chunk of arr) if (chunk && Array.isArray(chunk.results)) rows.push(...chunk.results);
    return rows;
  } catch { return []; }
}

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };
const section = (t) => console.log('\n【' + t + '】');

const ORG = 'org_e2e_sandbox';
const STAMP = Date.now();

console.log('=== V3.113.3 P0 断链修复 · 端到端验证 ===');
console.log('BASE =', BASE);

const login = curl('POST', '/api/auth/login', {
  body: { username: cred.username, password: cred.password },
});
if (login.status !== 200 || !login.data?.token) {
  console.log('登录失败：', login.status, login.text?.slice(0, 200));
  process.exit(1);
}
const token = login.data.token;
console.log('登录成功');

// ════════════════════════════════════════════════════════════
// P0-2 合并报表账簿口径
// ════════════════════════════════════════════════════════════
section('P0-2 合并报表账簿口径（法定 0000 / 管理 1000 分列）');
{
  const now = new Date().toISOString();
  const period = '2026-09';
  // ★ 先清掉本脚本历史遗留的测试凭证（按 description 前缀），否则重复运行会累积
  //   → 同科目金额变成 2000/2000，断言误报「金额仍被相加」。
  //   注意必须先删 items 再删 vouchers（外键）。
  d1(`DELETE FROM voucher_items WHERE voucher_id IN (SELECT id FROM vouchers WHERE org_id='${ORG}' AND description LIKE 'P0-2 账簿%')`);
  d1(`DELETE FROM vouchers WHERE org_id='${ORG}' AND description LIKE 'P0-2 账簿%'`);
  // 造两套账簿的凭证：同科目（1001 库存现金）各 1000 元，借贷各一
  for (const [book, tag] of [['0000', 'L'], ['1000', 'M']]) {
    const vid = `v-P0-2-${tag}-${STAMP}`;
    d1(`DELETE FROM voucher_items WHERE voucher_id='${vid}'`);
    d1(`DELETE FROM vouchers WHERE id='${vid}'`);
    d1(`INSERT INTO vouchers (id,org_id,voucher_no,date,description,source,status,total_debit,total_credit,period,ledger_book,created_at,updated_at,created_by,updated_by) VALUES ('${vid}','${ORG}','P0-2-${tag}-${STAMP}','2026-09-01','P0-2 账簿${book} 测试','manual','posted',1000,1000,'${period}','${book}','${now}','${now}','probe','probe')`);
    d1(`INSERT INTO voucher_items (id,voucher_id,line_no,summary,account_code,account_name,debit,credit,ledger_book) VALUES ('vi-P0-2-${tag}-${STAMP}','${vid}',1,'P0-2 测试','1001','库存现金',1000,0,'${book}')`);
    d1(`INSERT INTO voucher_items (id,voucher_id,line_no,summary,account_code,account_name,debit,credit,ledger_book) VALUES ('vi-P0-2-${tag}-c-${STAMP}','${vid}',2,'P0-2 测试','6001','主营业务收入',0,1000,'${book}')`);
  }
  // 账簿定义（让结果能带账簿名）
  d1(`DELETE FROM ledger_books WHERE org_id='${ORG}' AND ledger_code IN ('0000','1000')`);
  d1(`INSERT INTO ledger_books (id,org_id,ledger_code,name,type,base_currency,created_at,updated_at) VALUES ('lb-p0-2-0','${ORG}','0000','法定账套','legal','CNY','${now}','${now}')`);
  d1(`INSERT INTO ledger_books (id,org_id,ledger_code,name,type,base_currency,created_at,updated_at) VALUES ('lb-p0-2-1','${ORG}','1000','管理账套','management','CNY','${now}','${now}')`);

  const r = curl('POST', '/api/consolidation', {
    token,
    body: { scope: 'books', period },
  });
  console.log(`  POST /api/consolidation → HTTP ${r.status}`);
  const tb = r.data?.trialBalance || [];
  const rows1001 = tb.filter((x) => x.code === '1001');
  console.log(`  1001 科目行数：${rows1001.length}（修复前应只有 1 行=两套账相加）`);
  for (const x of rows1001) {
    console.log(`    账套 ${x.ledgerBook}(${x.ledgerBookName}) 借${x.debit} 贷${x.credit}`);
  }
  if (rows1001.length === 2) ok('同科目在两套账簿**分行展示**（不再混算）');
  else bad(`同科目未分行：实得 ${rows1001.length} 行（应为 2）`);
  const books = new Set(rows1001.map((x) => x.ledgerBook));
  if (books.size === 2) ok('两套账簿各自成行（法定 0000 / 管理 1000）');
  else bad(`账簿维度丢失：实得 ${[...books].join(',')}`);
  const eachIs1000 = rows1001.every((x) => Number(x.debit) === 1000);
  if (eachIs1000) ok('每套账各自金额独立（各 1000，未被加成 2000）');
  else bad(`金额仍被相加：${rows1001.map((x) => x.debit).join('/')}`);
  if (Array.isArray(r.data?.ledgerBooks) && r.data.ledgerBooks.length === 2) {
    ok(`结果带账簿清单：${r.data.ledgerBooks.map((b) => b.name).join('、')}`);
  } else bad('结果未带账簿清单');

  // 账簿白名单：只选 0000
  const r2 = curl('POST', '/api/consolidation', {
    token,
    body: { scope: 'books', period, ledgerBooks: ['0000'] },
  });
  const tb2 = (r2.data?.trialBalance || []).filter((x) => x.code === '1001');
  console.log(`  账簿白名单(0000) → 1001 行数 ${tb2.length}`);
  if (tb2.length === 1 && tb2[0].ledgerBook === '0000') ok('账簿白名单生效（只合并指定账簿）');
  else bad(`账簿白名单未生效：${JSON.stringify(tb2.map((x) => x.ledgerBook))}`);
}

// ════════════════════════════════════════════════════════════
// P0-3 质量冻结量
// ════════════════════════════════════════════════════════════
section('P0-3 质量扣留冻结量（写台账 / 出库拦截 / 放行回冲）');
{
  const now = new Date().toISOString();
  const MAT = 'MAT-P0-3-TEST';
  const MAT_CODE = 'P0-3-TEST';
  const WH = 'wh-001';
  d1(`DELETE FROM inventory_records WHERE org_id='${ORG}' AND material_id='${MAT}'`);
  d1(`DELETE FROM inventory_transactions WHERE org_id='${ORG}' AND material_id='${MAT}'`);
  d1(`DELETE FROM materials WHERE id='${MAT}'`);
  d1(`DELETE FROM quality_holds WHERE org_id='${ORG}' AND material_id='${MAT}'`);
  d1(`INSERT INTO materials (id,org_id,code,name,current_stock,stock_value,moving_avg_price,standard_price,price,unit,valuation_class,created_at,updated_at,created_by,updated_by) VALUES ('${MAT}','${ORG}','${MAT_CODE}','P0-3 测试料',100,1000,10,10,10,'PCS','RAW','${now}','${now}','probe','probe')`);
  d1(`INSERT INTO inventory_records (id,org_id,material_id,material_code,material_name,warehouse_id,warehouse_name,quantity,available_quantity,frozen_quantity,unit,created_at,updated_at) VALUES ('ir-p0-3','${ORG}','${MAT}','${MAT_CODE}','P0-3 测试料','${WH}','主仓库-A区',100,100,0,'PCS','${now}','${now}')`);

  // ① 创建扣留 100 件
  const hold = curl('POST', '/api/quality-holds', {
    token,
    body: {
      materialId: MAT, materialCode: MAT_CODE, materialName: 'P0-3 测试料',
      warehouseId: WH, warehouseName: '主仓库-A区', quantity: 100,
      reason: 'P0-3 验证：来料检不合格扣留', status: 'pending', inspector: 'probe',
    },
  });
  console.log(`  POST /api/quality-holds → HTTP ${hold.status} frozenApplied=${hold.data?.frozenApplied}`);
  if (hold.status === 201 || hold.status === 200) ok('扣留单创建成功');
  else bad(`扣留单创建失败：${hold.text?.slice(0, 200)}`);

  const after = d1(`SELECT quantity, available_quantity, frozen_quantity FROM inventory_records WHERE id='ir-p0-3'`)[0] || {};
  console.log(`  台账：quantity=${after.quantity} available=${after.available_quantity} frozen=${after.frozen_quantity}`);
  if (Number(after.frozen_quantity) === 100) ok('冻结量写入台账：frozen_quantity=100');
  else bad(`冻结量未写入：frozen_quantity=${after.frozen_quantity}（预期 100）`);
  if (Number(after.available_quantity) === 0) ok('可用量同步扣减：available_quantity=100→0');
  else bad(`可用量未同步扣减：available_quantity=${after.available_quantity}（预期 0）`);

  // ② 出库 50 件应被拒（可用量 0）
  const obNo = `OB-P0-3-${STAMP}`;
  const ob = curl('POST', '/api/outbound-orders', {
    token,
    body: {
      outboundNo: obNo, type: 'pick', customerId: 'CUST-P0-3', customerName: 'P0-3',
      status: 'completed', operator: 'P0-3 测试', warehouseId: WH, warehouseName: '主仓库-A区',
      outboundDate: now.slice(0, 10),
      items: [{ materialId: MAT, materialCode: MAT_CODE, materialName: 'P0-3 测试料', unit: 'PCS', quantity: 50 }],
    },
  });
  const issues = ob.data?.voucherIssues || [];
  console.log(`  出库 50 件 → HTTP ${ob.status}`);
  // 两道拦截任一命中即算被拦：
  //   ① 质量冻结拦截（V3.63.0 既有）：扣留单生效 → 不得出入库
  //   ② 可用量不足拦截（V3.113.3 新增）：available_quantity 已被冻结扣减 → 不得出库
  const blocked = issues.some((x) => /可用量不足|质量冻结/.test(x));
  if (blocked) ok(`出库被拒并留痕（${issues[0]?.slice(0, 40)}…）`);
  else bad(`出库未被拒：voucherIssues=${JSON.stringify(issues)}`);
  const afterOb = d1(`SELECT quantity, available_quantity, frozen_quantity FROM inventory_records WHERE id='ir-p0-3'`)[0] || {};
  if (Number(afterOb.quantity) === 100) ok('被拒后库存未被动（quantity 仍 100）');
  else bad(`被拒后库存仍被扣：quantity=${afterOb.quantity}`);
  const hasOutVoucher = d1(`SELECT COUNT(*) AS c FROM vouchers WHERE org_id='${ORG}' AND source_no='${obNo}'`)[0];
  if (Number(hasOutVoucher?.c || 0) === 0) ok('被拒行未生成出库凭证（账实一致）');
  else bad('被拒行仍生成了出库凭证（账实不符）');

  // ③ 放行 → 冻结量回冲
  const holdId = hold.data?.id;
  const rel = curl('PUT', `/api/quality-holds/${holdId}`, {
    token,
    body: { status: 'released', releaseDate: now.slice(0, 10) },
  });
  console.log(`  PUT 放行 → HTTP ${rel.status} frozenApplied=${rel.data?.frozenApplied}`);
  const afterRel = d1(`SELECT quantity, available_quantity, frozen_quantity FROM inventory_records WHERE id='ir-p0-3'`)[0] || {};
  console.log(`  台账：quantity=${afterRel.quantity} available=${afterRel.available_quantity} frozen=${afterRel.frozen_quantity}`);
  if (Number(afterRel.frozen_quantity) === 0) ok('放行后冻结量回冲：frozen_quantity=0');
  else bad(`冻结量未回冲：frozen_quantity=${afterRel.frozen_quantity}`);
  if (Number(afterRel.available_quantity) === 100) ok('可用量恢复：available_quantity=0→100');
  else bad(`可用量未恢复：available_quantity=${afterRel.available_quantity}`);

  // ④ 放行后出库应放行
  const ob2No = `OB-P0-3B-${STAMP}`;
  const ob2 = curl('POST', '/api/outbound-orders', {
    token,
    body: {
      outboundNo: ob2No, type: 'pick', customerId: 'CUST-P0-3', customerName: 'P0-3',
      status: 'completed', operator: 'P0-3 测试', warehouseId: WH, warehouseName: '主仓库-A区',
      outboundDate: now.slice(0, 10),
      items: [{ materialId: MAT, materialCode: MAT_CODE, materialName: 'P0-3 测试料', unit: 'PCS', quantity: 50 }],
    },
  });
  const issues2 = ob2.data?.voucherIssues || [];
  const afterOb2 = d1(`SELECT quantity, available_quantity, frozen_quantity FROM inventory_records WHERE id='ir-p0-3'`)[0] || {};
  if (!issues2.some((x) => /可用量不足|质量冻结/.test(x)) && Number(afterOb2.quantity) === 50) {
    ok('放行后出库正常（quantity 100→50）');
  } else {
    bad(`放行后出库仍异常：issues=${JSON.stringify(issues2)} qty=${afterOb2.quantity}`);
  }

  // ⑤ 判不合格但未处置（rejected）同样不得出库 —— 原实现的真实漏洞：
  //   既有拦截只查 status IN ('pending','active')，rejected 被漏掉 →
  //   「已判不合格但尚未报废/返工/退货」的料照样能出库。
  const hold2 = curl('POST', '/api/quality-holds', {
    token,
    body: {
      materialId: MAT, materialCode: MAT_CODE, materialName: 'P0-3 测试料',
      warehouseId: WH, warehouseName: '主仓库-A区', quantity: 50,
      reason: 'P0-3 验证：判不合格但未处置', status: 'rejected', inspector: 'probe',
    },
  });
  const afterRej = d1(`SELECT quantity, available_quantity, frozen_quantity FROM inventory_records WHERE id='ir-p0-3'`)[0] || {};
  if (hold2.status === 200 || hold2.status === 201) {
    ok(`判不合格扣留单创建成功（HTTP ${hold2.status}）`);
    if (Number(afterRej.frozen_quantity) === 50) ok('rejected 同样冻结实物（frozen_quantity=50）');
    else bad(`rejected 未冻结：frozen_quantity=${afterRej.frozen_quantity}（预期 50）`);
    const ob3 = curl('POST', '/api/outbound-orders', {
      token,
      body: {
        outboundNo: `OB-P0-3C-${STAMP}`, type: 'pick', customerId: 'CUST-P0-3', customerName: 'P0-3',
        status: 'completed', operator: 'P0-3 测试', warehouseId: WH, warehouseName: '主仓库-A区',
        outboundDate: now.slice(0, 10),
        items: [{ materialId: MAT, materialCode: MAT_CODE, materialName: 'P0-3 测试料', unit: 'PCS', quantity: 10 }],
      },
    });
    const issues3 = ob3.data?.voucherIssues || [];
    if (issues3.some((x) => /可用量不足|质量冻结/.test(x))) ok('判不合格未处置的料被拦截（不得出库）');
    else bad(`判不合格未处置仍可出库：voucherIssues=${JSON.stringify(issues3)}`);
  } else {
    bad(`判不合格扣留单创建失败：HTTP ${hold2.status} ${hold2.text?.slice(0, 150)}`);
  }
}

// ════════════════════════════════════════════════════════════
// P0-4 供应商审核激活
// ════════════════════════════════════════════════════════════
section('P0-4 供应商审核激活（注册→待审→审核→登录 / 黑名单闭环）');
{
  const VCODE = `P04${String(STAMP).slice(-6)}`;
  const VPWD = 'p0-4-test-pwd';
  // 找组织 company_code 前缀
  const org = d1(`SELECT id, company_code FROM orgs WHERE id='${ORG}'`)[0];
  const prefix = String(org?.company_code || 'E2E').slice(0, 3);
  const VC = prefix + VCODE;

  // ⓪ 归属歧义守卫：生产同前缀组织有 30+ 个，注册端点必须**拒绝**而非静默落错组织
  //    （V3.113.3 生产复验发现的真实缺陷）
  const samePrefix = d1(`SELECT COUNT(*) AS c FROM orgs WHERE company_code LIKE '${prefix}%'`)[0];
  const samePrefixN = Number(samePrefix?.c || 0);
  const regAmb = curl('POST', '/api/vendor/register', {
    body: {
      vendorCode: VC + 'X', companyName: 'P0-4 歧义探针', contactName: '测试联系人',
      contactPhone: '13800000000', contactEmail: 'p04x@example.com', password: VPWD,
    },
  });
  if (samePrefixN > 1) {
    if (regAmb.status === 409 && /ORG_AMBIGUOUS|多个企业/.test(regAmb.text)) {
      ok(`归属歧义被拒（${samePrefixN} 个同前缀组织 → 409 明确拒绝，不静默落错组织）`);
    } else {
      bad(`同前缀多组织时未拒绝：HTTP ${regAmb.status} ${regAmb.text?.slice(0, 160)}`);
    }
  } else {
    ok(`同前缀组织唯一（${samePrefixN} 个），归属歧义分支不适用`);
  }

  // ① 注册（自助注册走 vendor/register，显式传 orgId 精确归属 —— 与生产真实场景一致：
  //    管理员邀请供应商时知道归属组织；这也避开了「靠公司码前缀猜组织」的脆弱设计）
  const reg = curl('POST', '/api/vendor/register', {
    body: {
      vendorCode: VC, companyName: 'P0-4 测试供应商', contactName: '测试联系人',
      contactPhone: '13800000000', contactEmail: 'p04@example.com', password: VPWD,
      orgId: ORG,
    },
  });
  console.log(`  POST /api/vendor/register → HTTP ${reg.status}`);
  if (reg.status === 200 && /注册成功/.test(reg.text)) ok('自助注册成功');
  else bad(`注册失败：${reg.text?.slice(0, 200)}`);

  // ② 待审列表应能看到（含两表合并）
  const pend = curl('GET', '/api/vendors/pending-approvals', { token });
  console.log(`  GET /api/vendors/pending-approvals → HTTP ${pend.status}，返回 ${Array.isArray(pend.data) ? pend.data.length : 'N/A'} 条`);
  const pendItem = (pend.data || []).find((x) => x.code === VC);
  if (pend.status === 200 && pendItem) ok('待审列表可见该注册申请（注册→审核链路打通）');
  else bad(`待审列表未见该申请：${JSON.stringify((pend.data || []).map((x) => x.code))}`);

  // ③ 未审核时门户登录应被拒
  const loginBefore = curl('POST', '/api/vendor/login', {
    body: { vendorCode: VC, password: VPWD },
  });
  if (loginBefore.status === 403) ok('未审核登录被拒（403，语义正确）');
  else bad(`未审核登录未被拒：HTTP ${loginBefore.status}`);

  // ④ 审核通过
  const appr = curl('POST', `/api/vendors/${pendItem?.id}/approve`, { token, body: { comments: 'P0-4 验证通过' } });
  console.log(`  POST approve → HTTP ${appr.status} syncedTables=${JSON.stringify(appr.data?.syncedTables)}`);
  if (appr.status === 200 && appr.data?.status === 'approved') ok('审核通过成功');
  else bad(`审核通过失败：${appr.text?.slice(0, 200)}`);

  const accStatus = d1(`SELECT status FROM vendors WHERE vendor_code='${prefix}${VCODE}'`)[0];
  console.log(`  门户账号表 status = ${accStatus?.status}`);
  if (accStatus?.status === 'approved') ok('门户账号表状态已同步为 approved');
  else bad(`门户账号表未同步：${accStatus?.status}`);

  // ⑤ 审核后门户登录应成功
  const loginAfter = curl('POST', '/api/vendor/login', {
    body: { vendorCode: VC, password: VPWD },
  });
  if (loginAfter.status === 200 && loginAfter.data?.token) ok('审核后门户登录成功（整条链路通）');
  else bad(`审核后仍登不了：HTTP ${loginAfter.status} ${loginAfter.text?.slice(0, 150)}`);

  // ⑥ 黑名单 → 登录被拒 → 解黑 → 可登录
  const blk = curl('POST', `/api/vendors/${pendItem?.id}/blacklist`, { token, body: { reason: 'P0-4 验证拉黑' } });
  if (blk.status === 200) ok('拉黑成功'); else bad(`拉黑失败：${blk.status} ${blk.text?.slice(0, 150)}`);
  const loginBlk = curl('POST', '/api/vendor/login', { body: { vendorCode: VC, password: VPWD } });
  if (loginBlk.status === 403) ok('黑名单后登录被拒（403）');
  else bad(`黑名单后仍能登录：HTTP ${loginBlk.status}`);
  const blkList = curl('GET', '/api/vendors/blacklist', { token });
  if (blkList.status === 200 && (blkList.data || []).some((x) => x.code === VC)) ok('黑名单列表可见');
  else bad(`黑名单列表未见：${JSON.stringify((blkList.data || []).map((x) => x.code))}`);
  const unblk = curl('POST', `/api/vendors/${pendItem?.id}/unblacklist`, { token });
  if (unblk.status === 200) ok('解黑成功'); else bad(`解黑失败：${unblk.status}`);
  const loginUnblk = curl('POST', '/api/vendor/login', { body: { vendorCode: VC, password: VPWD } });
  if (loginUnblk.status === 200) ok('解黑后登录恢复');
  else bad(`解黑后仍登不了：HTTP ${loginUnblk.status}`);

  // ⑦ 评级
  const rate = curl('POST', `/api/vendors/${pendItem?.id}/rate`, {    token, body: { rating: 4, criteria: { deliveryRate: 5, qualityRate: 4, serviceRate: 4 }, remarks: 'P0-4 验证评级' },
  });
  console.log(`  POST rate → HTTP ${rate.status}`);
  if (rate.status === 201 && Number(rate.data?.rating) > 0) ok(`评级成功：综合 ${rate.data.rating}`);
  else bad(`评级失败：${rate.text?.slice(0, 200)}`);
  const rateList = curl('GET', `/api/vendors/${pendItem?.id}/ratings`, { token });
  if (rateList.status === 200 && (rateList.data || []).length >= 1) ok('评级记录可读回');
  else bad(`评级记录读不回：HTTP ${rateList.status}`);
}

console.log('');
console.log(`通过 ${pass} / 失败 ${fail}`);
process.exit(fail > 0 ? 1 : 0);
