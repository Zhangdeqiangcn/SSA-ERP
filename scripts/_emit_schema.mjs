// 由 _schema_raw.json 生成 functions/_shared/fieldSchema.ts（保证与数据库结构一致）
import fs from 'fs';
const raw = JSON.parse(fs.readFileSync('scripts/_schema_raw.json', 'utf8'));

// 不做通用入参校验的表：配置/凭证/日志/身份类（结构非业务单据，长度与类型不受业务约束）
const EXCLUDE_TABLES = new Set([
  'app_state', 'system_config', 'org_settings', 'messages', 'mail_logs',
  'audit_logs', 'api_keys', 'security_mail_queue', 'security_tickets',
  'email_verifications', 'sessions', 'orgs', 'users',
]);
const SERVER_MANAGED = ['id','org_id','created_at','updated_at','created_by','updated_by','owner_id','dept_id'];

const lines = [];
lines.push('/**');
lines.push(' * 字段类型表（由数据库真实结构自动生成，请勿手工修改）');
lines.push(' *');
lines.push(' * 生成方式：scripts/_gen_schema.py 读取库结构 → scripts/_emit_schema.mjs 生成本文件。');
lines.push(' * 判定规则：声明类型为数值型 → number；列名含 _at/_date/date/expiry → date。');
lines.push(' * 文本长度不在此登记，由 validate.ts 按统一上限处理。');
lines.push(' * 用途：写接口入参校验（数值传文本 / 非法日期 / 超长字段 三类脏数据）');
lines.push(' */');
lines.push('export type FieldKind = \'number\' | \'date\';');
lines.push('');
lines.push('/** 表 -> 列名 -> 字段类型 */');
lines.push('export const FIELD_SCHEMA: Record<string, Record<string, FieldKind>> = {');

const tables = Object.keys(raw).filter((t) => !EXCLUDE_TABLES.has(t)).sort();
for (const t of tables) {
  const cols = raw[t];
  const entries = Object.keys(cols)
    .filter((c) => !SERVER_MANAGED.includes(c) && cols[c].t !== 'text')
    .sort()
    .map((c) => `    ${c}: '${cols[c].t}',`);
  if (!entries.length) { lines.push(`  ${t}: {},`); continue; }
  lines.push(`  ${t}: {`);
  entries.forEach((e) => lines.push(e));
  lines.push('  },');
}
lines.push('};');
lines.push('');
lines.push('/** 服务端自管列：不参与入参校验（客户端回传也不作为依据） */');
lines.push('export const SERVER_MANAGED_COLS = new Set([');
SERVER_MANAGED.forEach((c) => lines.push(`  '${c}',`));
lines.push(']);');
lines.push('');

fs.writeFileSync('functions/_shared/fieldSchema.ts', lines.join('\n'), 'utf8');
const cnt = tables.length;
console.log(`已生成 fieldSchema.ts：${cnt} 张表`);
