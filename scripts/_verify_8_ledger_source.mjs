// 缺陷 #8「报表改读凭证表」（路线 A）生产域核对脚本 —— **只读，不写任何数据**
//
// 背景：改造前系统有「两套账」——旧表 fin_account_entries（无校验，报表真源）
//       与 vouchers（有服务端借贷平衡闸门）。本版把报表真源切到 vouchers。
//
// 这个脚本做两件事，让「切换」这件事可被检验、可被判断：
//   ① 按科目对比「旧表口径」与「凭证口径」的科目余额，差异一眼可见；
//   ② 校验凭证口径自身借贷平衡（Σ借 = Σ贷）。
//
// 建议用法：部署前先跑一次留底，部署后再跑一次对比，确认报表数字变化在预期范围内。
//   用法：node scripts/_verify_8_ledger_source.mjs
import { spawnSync } from 'node:child_process';

const NODE = process.execPath;

function query(sql) {
  const r = spawnSync(NODE, ['scripts/_d1q.mjs', sql], { encoding: 'utf8' });
  const out = (r.stdout || '').trim();
  const s = out.indexOf('[');
  const e = out.lastIndexOf(']');
  if (s < 0 || e < 0) return [];
  try { return JSON.parse(out.slice(s, e + 1)); } catch { return []; }
}
const num = (v) => Number(v ?? 0);
const fmt = (v) => num(v).toFixed(2).padStart(14, ' ');

// ① 规模：行数
const oldCnt = query(`SELECT COUNT(*) AS cnt FROM fin_account_entries`)[0] || {};
const newCnt = query(`SELECT COUNT(*) AS cnt FROM voucher_items vi JOIN vouchers v ON v.id = vi.voucher_id WHERE v.status IN ('posted','reversed')`)[0] || {};
const vStat = query(`SELECT status, COUNT(*) AS cnt FROM vouchers GROUP BY status`);

// ② 旧表口径：按科目汇总余额（借 + amount，贷 - amount）
const oldBal = query(`SELECT acc, ROUND(SUM(bal),2) AS bal FROM (SELECT debit_account AS acc, amount AS bal FROM fin_account_entries WHERE debit_account IS NOT NULL AND debit_account <> '' UNION ALL SELECT credit_account AS acc, -amount AS bal FROM fin_account_entries WHERE credit_account IS NOT NULL AND credit_account <> '') GROUP BY acc ORDER BY acc`);

// ③ 凭证口径：按科目汇总余额（同一套符号约定）
const newBal = query(`SELECT acc, ROUND(SUM(bal),2) AS bal FROM (SELECT vi.account_name AS acc, vi.debit AS bal FROM voucher_items vi JOIN vouchers v ON v.id = vi.voucher_id WHERE v.status IN ('posted','reversed') AND vi.debit <> 0 UNION ALL SELECT vi.account_name AS acc, -vi.credit AS bal FROM voucher_items vi JOIN vouchers v ON v.id = vi.voucher_id WHERE v.status IN ('posted','reversed') AND vi.credit <> 0) GROUP BY acc ORDER BY acc`);

console.log('==== 缺陷 #8 报表真源切换：口径核对（只读）====\n');
console.log('【旧表 fin_account_entries】分录行数：' + num(oldCnt.cnt));
console.log('【凭证表 vouchers（进账状态 posted / reversed）】分录行数：' + num(newCnt.cnt));
console.log('\n凭证按状态分布：');
for (const r of vStat) console.log('  ' + String(r.status).padEnd(10) + num(r.cnt) + ' 张');

const oldMap = new Map(oldBal.map((r) => [String(r.acc), num(r.bal)]));
const newMap = new Map(newBal.map((r) => [String(r.acc), num(r.bal)]));
const accounts = [...new Set([...oldMap.keys(), ...newMap.keys()])].sort();

const sumOld = [...oldMap.values()].reduce((a, b) => a + b, 0);
const sumNew = [...newMap.values()].reduce((a, b) => a + b, 0);

console.log('\n科目余额对比（借为正、贷为负）：');
console.log('  ' + '科目'.padEnd(22) + '旧表口径'.padStart(14) + '凭证口径'.padStart(14) + '差异'.padStart(14));
for (const acc of accounts) {
  const o = oldMap.get(acc) ?? 0;
  const n = newMap.get(acc) ?? 0;
  const diff = n - o;
  const flag = Math.abs(diff) > 0.01 ? '  ←『差异』' : '';
  console.log('  ' + acc.padEnd(22) + fmt(o) + fmt(n) + fmt(diff) + flag);
}
console.log('  ' + '—'.repeat(64));
console.log('  ' + '全表合计'.padEnd(22) + fmt(sumOld) + fmt(sumNew) + fmt(sumNew - sumOld));

const balanced = Math.abs(sumNew) < 0.01;
console.log(`\n${balanced ? '✅' : '❌'} 凭证口径全表借贷平衡（Σ借 − Σ贷）：${sumNew.toFixed(2)}`);

console.log('\n判断标准：');
console.log('  · 差异列出即代表「旧表有、凭证表没有」或反之的历史数据；');
console.log('  · 若差异为 0 或全在合理解释范围内（如旧的手工分录），可放心切换；');
console.log('  · 若差异较大，先评估是否需要把旧表数据迁移成凭证后再切换。');
