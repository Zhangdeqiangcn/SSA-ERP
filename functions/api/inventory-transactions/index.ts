// GET /api/inventory-transactions — 库存变动流水查询（只读）
//
// V3.46.0 第2批① · 对标 SAP MATDOC / 金蝶库存流水账
// ------------------------------------------------------------------
// 为什么需要这个端点：
//   余额表（inventory_records）只回答"现在有多少"，流水表回答"为什么变成这样"。
//   缺了查询入口，流水建了也没人看 —— 追溯仍要靠人工查库。
//
// 能力：
//   · 按物料 / 仓库 / 库位 / 批次 / 单据 / 会计期间 / 事务类型 过滤
//   · balance=1 时返回「按流水重建的余额」，与 inventory_records 互为校验
//     （两者不一致即说明有差异被静默吸收，是排查账实不符的第一入口）
import { getUserFromRequest, json } from '../../_shared/auth';
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';

export async function onRequestGet(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(200, parseInt(url.searchParams.get('pageSize') || '50', 10));
  const offset = (page - 1) * pageSize;

  const where: string[] = ['org_id = ?'];
  const params: any[] = [user.org_id];

  const addEq = (col: string, val: any) => {
    if (val === undefined || val === null || val === '') return;
    where.push(`AND ${col} = ?`);
    params.push(val);
  };
  addEq('material_id', url.searchParams.get('materialId'));
  addEq('warehouse_id', url.searchParams.get('warehouseId'));
  addEq('location_id', url.searchParams.get('locationId'));
  addEq('batch_no', url.searchParams.get('batchNo'));
  addEq('txn_type', url.searchParams.get('txnType'));
  addEq('doc_type', url.searchParams.get('docType'));
  addEq('doc_no', url.searchParams.get('docNo'));
  addEq('period', url.searchParams.get('period'));
  if (url.searchParams.get('includeVoided') !== '1') where.push('AND is_voided = 0');

  const keyword = safeKeyword(url.searchParams.get('keyword'));
  if (keyword) {
    where.push('AND (material_code LIKE ? ESCAPE \'\\\' OR material_name LIKE ? ESCAPE \'\\\')');
    params.push(likePattern(keyword), likePattern(keyword));
  }

  const whereSql = where.join(' ');

  const rows = await db
    .prepare(`SELECT * FROM inventory_transactions WHERE ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .bind(...params, pageSize, offset)
    .all();
  const count = await db
    .prepare(`SELECT COUNT(*) AS cnt FROM inventory_transactions WHERE ${whereSql}`)
    .bind(...params)
    .first();

  // 余额重建：按流水汇总（带符号求和）。与 inventory_records 比对即得差异。
  let rebuilt: any[] = [];
  const materialId = url.searchParams.get('materialId');
  if (url.searchParams.get('balance') === '1' && materialId) {
    const agg = await db
      .prepare(
        `SELECT warehouse_id, warehouse_name, location_id,
                SUM(qty_delta) AS qty, SUM(value_delta) AS value, COUNT(*) AS entries
           FROM inventory_transactions
          WHERE org_id = ? AND material_id = ? AND is_voided = 0
          GROUP BY warehouse_id, warehouse_name, location_id
          ORDER BY warehouse_id`
      )
      .bind(user.org_id, materialId)
      .all();
    rebuilt = (agg.results || []).map((r: any) => ({
      warehouseId: r.warehouse_id,
      warehouseName: r.warehouse_name,
      locationId: r.location_id,
      qty: Number(r.qty || 0),
      value: Number(r.value || 0),
      entries: Number(r.entries || 0),
    }));
  }

  return json({
    data: (rows.results || []).map((r: any) => ({
      id: r.id,
      materialId: r.material_id,
      materialCode: r.material_code,
      materialName: r.material_name,
      warehouseId: r.warehouse_id,
      warehouseName: r.warehouse_name,
      locationId: r.location_id,
      batchNo: r.batch_no,
      unit: r.unit,
      qtyDelta: Number(r.qty_delta || 0),
      valueDelta: Number(r.value_delta || 0),
      unitCost: Number(r.unit_cost || 0),
      txnType: r.txn_type,
      docType: r.doc_type,
      docNo: r.doc_no,
      docId: r.doc_id,
      docDate: r.doc_date,
      period: r.period,
      deptId: r.dept_id,
      userName: r.user_name,
      remark: r.remark,
      isVoided: Number(r.is_voided || 0),
      createdAt: r.created_at,
    })),
    rebuiltBalance: rebuilt,
    pagination: { page, pageSize, total: Number(count?.cnt || 0) },
  });
}
