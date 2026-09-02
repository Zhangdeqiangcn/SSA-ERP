// 通用实体资源注册表 + 行列映射（根治双通道：config 驱动，每业务域只配一张表 + 注册，无需新增 Functions）
import { json, uid } from './auth';

export interface EntityColumn {
  snake: string;
  camel: string;
}

export interface EntityResource {
  table: string;
  columns: EntityColumn[];
  /** RLS 可见性范围（缺省 'all' 共享主数据） */
  rlsScope?: 'all' | 'own' | 'dept';
}

// 所有关系表统一的主键 + 审计列（camel 映射）
const BASE_COLS: EntityColumn[] = [
  { snake: 'id', camel: 'id' },
  { snake: 'org_id', camel: 'org_id' },
  { snake: 'created_at', camel: 'createdAt' },
  { snake: 'updated_at', camel: 'updatedAt' },
  { snake: 'created_by', camel: 'createdBy' },
  { snake: 'updated_by', camel: 'updatedBy' },
];

// W0 参考实现：S&OP 计划。后续 W1/W2 业务域只需在此登记（table + 业务列 + rlsScope），
// 前端用 createEntityStore 配置同名 resource 即可接管，后端零新增代码。
export const ENTITY_RESOURCES: Record<string, EntityResource> = {
  sop: {
    table: 'sop_plans',
    rlsScope: 'all',
    columns: [
      { snake: 'plan_no', camel: 'planNo' },
      { snake: 'period', camel: 'period' },
      { snake: 'demand_forecast', camel: 'demandForecast' },
      { snake: 'supply_plan', camel: 'supplyPlan' },
      { snake: 'balance_qty', camel: 'balanceQty' },
      { snake: 'status', camel: 'status' },
      { snake: 'owner', camel: 'owner' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
};

export function allColumns(res: EntityResource): EntityColumn[] {
  return [...BASE_COLS, ...res.columns];
}

/** 行 → camelCase 对象（前端类型直接消费） */
export function rowToCamel(row: any, res: EntityResource): any {
  const out: any = {};
  for (const c of allColumns(res)) {
    if (row[c.snake] !== undefined && row[c.snake] !== null) out[c.camel] = row[c.snake];
  }
  return out;
}

/** 仅提取已注册业务列（client 以 camel 传参 → snake 落库） */
export function pickSnake(body: any, res: EntityResource): { cols: string[]; vals: any[] } {
  const cols: string[] = [];
  const vals: any[] = [];
  for (const c of res.columns) {
    if (body[c.camel] !== undefined) {
      cols.push(c.snake);
      vals.push(body[c.camel]);
    }
  }
  return { cols, vals };
}

export function badResource(): Response {
  return json({ error: '不支持的资源，可选: ' + Object.keys(ENTITY_RESOURCES).join(', ') }, 404);
}

/** 探测表实际存在的审计列（各关系表 NOT NULL 审计列不一致，避免 500） */
export async function presentCols(DB: any, table: string): Promise<Set<string>> {
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((info.results || []).map((r: any) => r.name));
}

/** 写操作审计（失败不阻断主流程） */
export async function audit(
  DB: any,
  org_id: string,
  user: any,
  entity: string,
  action: string,
  summary: string,
) {
  try {
    await DB.prepare(
      `INSERT INTO audit_logs (id, org_id, user_id, user_name, entity, action, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(uid('al'), org_id, user.id, user.name || user.username, entity, action, summary, new Date().toISOString())
      .run();
  } catch {
    /* 审计失败不阻断主流程 */
  }
}
