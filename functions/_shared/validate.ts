/**
 * 写接口统一入参校验
 *
 * 针对评测发现的三类脏数据：
 *   M-03 数值字段传入非数字文本（金额填「一千元」）照样入库
 *   M-04 非法日期（2026-13-45）入库，破坏跨月/跨年统计口径
 *   M-05 超长字段（20 万字符）无长度校验直接入库
 *
 * 设计：字段类型由数据库真实结构生成（fieldSchema.ts），不做人工清单维护；
 *      服务端自管列（id/org_id/时间戳/操作人）一律不校验，避免误伤正常回传。
 */
import { json } from './auth';
import { FIELD_SCHEMA, SERVER_MANAGED_COLS } from './fieldSchema';

/** 单个文本字段的最大长度（超出即拒绝，防超长脏数据与存储膨胀） */
export const MAX_TEXT_LEN = 4000;

/** 结构化字段（对象/数组）序列化后的最大长度 */
const MAX_JSON_LEN = 20000;

export interface FieldError {
  field: string;
  message: string;
}

const camelToSnake = (s: string): string => s.replace(/([A-Z])/g, '_$1').toLowerCase();

const isBlank = (v: any): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** 合法日期：YYYY-MM-DD 需月日真实存在；其余走 Date.parse */
function isValidDate(v: any): boolean {
  if (typeof v !== 'string') {
    // 数字时间戳或 Date 对象：能被解析即合法
    const t = typeof v === 'number' ? v : Date.parse(String(v));
    return !Number.isNaN(t);
  }
  const s = v.trim();
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    // 用回读比对拦截 2026-02-30 这类会进位的日期
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  }
  return !Number.isNaN(Date.parse(s));
}

function isNumeric(v: any): boolean {
  if (typeof v === 'boolean') return true; // 布尔列常见于 0/1 标记
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (s === '') return false;
  return !Number.isNaN(Number(s));
}

const preview = (v: any): string => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return (s || '').slice(0, 20);
};

/** 校验单个对象，返回首个错误 */
export function validateWrite(table: string, body: any): FieldError | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const schema = FIELD_SCHEMA[table];
  if (!schema) return null; // 未登记的表（配置/凭证/日志）不做通用校验

  for (const key of Object.keys(body)) {
    const snake = camelToSnake(key);
    if (SERVER_MANAGED_COLS.has(snake)) continue;

    const v = (body as any)[key];

    // 1) 通用长度上限（所有非自管字段）
    if (typeof v === 'string' && v.length > MAX_TEXT_LEN) {
      return {
        field: key,
        message: `字段「${key}」内容过长（${v.length} 字符），上限 ${MAX_TEXT_LEN} 字符`,
      };
    }
    if (v && typeof v === 'object') {
      const len = JSON.stringify(v).length;
      if (len > MAX_JSON_LEN) {
        return { field: key, message: `字段「${key}」内容过大（${len} 字符）` };
      }
      continue; // 结构化字段不做逐项类型校验
    }

    if (isBlank(v)) continue; // 空值视为「不填」，交由业务默认值处理

    const kind = schema[snake];
    if (!kind) continue; // 该表未登记此列（或为文本列）

    // 2) 数值列必须可转为数字
    if (kind === 'number' && !isNumeric(v)) {
      return {
        field: key,
        message: `字段「${key}」必须是数字，当前为「${preview(v)}」`,
      };
    }
    // 3) 日期列必须是合法日期
    if (kind === 'date' && !isValidDate(v)) {
      return {
        field: key,
        message: `字段「${key}」不是合法日期，当前为「${preview(v)}」`,
      };
    }
  }
  return null;
}

/**
 * 必填字段校验（V3.16.1 · 缺陷 #11 修复）
 *
 * ── 为什么单独做一个、而不是扩进 validateOrReject 的全局规则 ──────
 * 全局校验器只管「类型 / 长度 / 日期」。一旦把「必填」做成全局规则，会波及所有
 * 端点、可能误伤那些合法省略可选字段的创建（如草稿单先不填备注、再补填）。
 * 因此「必填」是**按端点显式声明**的能力，只被明确需要的端点调用，零概率影响
 * 其它接口（与 V3.15.10 的空载荷守卫思路一致：只拦「完全没有业务内容」的请求）。
 *
 * 注：本函数只判「字段是否缺失（空 / undefined / 空串）」，不判业务合法性
 * （如数量必须 > 0、不能同仓调拨），那些留给各端点自身的业务校验。
 *
 * @param body   解析后的请求体（camelCase 键，与前端一致）
 * @param fields 必填的 camelCase 字段名
 * @param labels 可选的中文别名（用于报错文案），缺省用字段名
 */
export function requireFields(
  body: any,
  fields: string[],
  labels?: Record<string, string>,
): Response | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: '请求内容为空，请填写后再提交', code: 'EMPTY_PAYLOAD' }, 400);
  }
  for (const f of fields) {
    if (isBlank(body[f])) {
      const label = labels?.[f] || f;
      return json({ error: `请填写「${label}」后再提交`, code: 'MISSING_REQUIRED', field: f }, 400);
    }
  }
  return null;
}

/**
 * ★ V3.86.0 供不走 validateOrReject 的 POST 端点复用集中必填登记表（REQUIRED_CORE_FIELDS）。
 * 用法：const _req = requireByRegistry('warehouses', body); if (_req) return _req;
 * 目的：让「少数自己解析 body 的端点」与「走 validateOrReject 的端点」共用同一份必填口径，
 *       不制造第二套真相。仅新建路径调用，勿用于 PUT（局部更新会误伤）。
 */
export function requireByRegistry(table: string, body: any): Response | null {
  return requireCoreFields(table, body);
}

/**
 * 子表推断：purchase_orders -> purchase_order_items
 *
 * V3.6.0（C1）：BOM 是例外 —— 表头叫 `bom_headers`、明细叫 `bom_items`，
 *   命名不符合「去复数 + _items」的机械规则（`bom_headers` → `bom_header_items` 是错的，
 *   库里没有这张表）。若不特判，validateOrReject 会静默跳过明细校验（FIELD_SCHEMA 里
 *   查不到 `bom_header_items` 就返回 null），等于「明细行的数值/日期脏数据一律放行」。
 *   因此这里显式登记例外映射，而不是改表名去迁就推断规则 ——
 *   表名表达的是业务语义（一张 BOM 有一个头 + N 行料），不该为校验器让步。
 */
const CHILD_TABLE_OVERRIDE: Record<string, string> = {
  bom_headers: 'bom_items',
  // 财务域两处嵌套：机械推断（去复数 + `_items`）分别会得到不存在的
  // `fin_payment_plan_items` / `fin_project_account_items`，
  // 于是明细校验被静默跳过 —— 金额传文本、非法日期都能入库。
  // V3.47.0 第3批 3-05：发票明细 → 机械推断（fin_invoices 去复数 + _items）恰好能命中
  //   fin_invoice_items，此处**显式登记**而非依赖推断：行级三单匹配依赖明细数据，
  //   一旦有人改表名或推断规则，明细校验会被静默跳过（金额传文本都能入库）。
  fin_invoices: 'fin_invoice_items',
  fin_payment_plans: 'fin_payment_plan_installments',
  fin_project_accounts: 'fin_project_cost_items',
  // 销售域（V3.9.0）三处嵌套，且**字段名都不叫 items**：
  //   sales_prospects.followupRecords → sales_prospect_followups
  //   shipments.items                 → shipment_items（机械推断会得到 shipment_items，恰好对）
  //   projects.milestones / .exceptions → project_milestones / project_exceptions
  // 注意 projects 有**两个**子表，而本映射是单值 —— 见下方 childTablesOf 说明。
  sales_prospects: 'sales_prospect_followups',
  shipments: 'shipment_items',
  projects: 'project_milestones',
  // 审批流域（V3.10.0）：机械推断（去复数 + `_items`）会得到
  // `approval_flow_items` —— 库里没有这张表（真名是 approval_flow_nodes）。
  // 漏登记 = 节点明细校验被静默跳过（condition 传对象以外的东西、
  // timeout 传文本都能入库）。
  approval_flows: 'approval_flow_nodes',
  // 采购域（V3.11.0）两处嵌套。
  // ★ 与前面几处不同：本域机械推断**恰好是对的**
  //   （purchase_requests → purchase_request_items，
  //     vendor_quotes → vendor_quote_items）。
  // 但**仍然显式登记**，理由：机械推断依赖 `FIELD_SCHEMA` 里当时就有
  // 这两张表 —— 它要等 `fieldSchema.ts` 重新生成之后才成立，
  // 而重生成是个人工动作（V3.8.0 就曾因选错 sqlite 文件把它生成为空）。
  // 显式登记把这个隐式依赖消掉：只要这段代码在，校验就不会被静默跳过。
  // 「能推断出来」不等于「应该依赖推断」——登记的成本是一行，漏掉的代价是
  // 「明细数量传字符串也能入库」这种查不出来的脏数据。
  purchase_requests: 'purchase_request_items',
  // 生产域（V3.12.0）：机械推断（去复数 + `_items`）会得到
  // `process_route_items` —— 实际表名是 `process_route_operations`。
  // 漏登记的后果与前面各域同款：**整层子表校验被静默跳过**
  // （工序号传字符串、工时传非法数字都能入库，且返回 201）。
  process_routes: 'process_route_operations',
  vendor_quotes: 'vendor_quote_items',
};

/**
 * 嵌套数组字段名 → 子表名（V3.9.0 新增）。
 *
 * ── 为什么需要这张表 ────────────────────────────────────────────
 * validateOrReject 原先**只校验 body.items**（硬编码字段名）。
 * 销售域的嵌套数组字段名分别是 `followupRecords` / `milestones` /
 * `exceptions`，一个都不叫 items —— 于是明细行的数值/日期校验会
 * **被静默跳过**（函数里 `Array.isArray(body.items)` 为 false，直接 return null），
 * 意味着「发货数量传字符串」「里程碑计划日期传 2026-13-45」都能存进库。
 *
 * 这张表把「父表 → 其全部子数组字段 → 对应子表」显式登记，
 * 校验时逐个别名字段遍历。projects 有两个条目，正好覆盖多子表情形。
 *
 * 为什么键用「父表 + 字段名」而不是只用一个：将来 `projects` 若在别处
 * 又多一个数组，只加一行即可，不需要改函数逻辑。
 */
const CHILD_BY_FIELD: Record<string, Array<[string, string]>> = {
  bom_headers: [['items', 'bom_items']],
  fin_payment_plans: [['installments', 'fin_payment_plan_installments']],
  fin_project_accounts: [['costItems', 'fin_project_cost_items']],
  sales_prospects: [['followupRecords', 'sales_prospect_followups']],
  shipments: [['items', 'shipment_items']],
  projects: [
    ['milestones', 'project_milestones'],
    ['exceptions', 'project_exceptions'],
  ],
  // 审批流域（V3.10.0）：节点数组字段名是 `nodes`，也不叫 items。
  approval_flows: [['nodes', 'approval_flow_nodes']],
  // 采购域（V3.11.0）：两处嵌套字段名**都是 items**。
  // ★ 这里仍必须登记 —— 因为 validateOrReject 的遍历入口是
  //   **CHILD_BY_FIELD**（V3.9.0 起不再硬编码 body.items）。
  //   漏登记的后果不是「少校验一层」，而是**整个子表校验都不执行**：
  //   明细行的 quantity 传字符串、estimatedAmount 传非法数字都能入库，
  //   而且返回 201 成功。这与 CHILD_TABLE_OVERRIDE 是两道独立的门，
  //   只登记其中一道等于没登记。
  purchase_requests: [['items', 'purchase_request_items']],
  vendor_quotes: [['items', 'vendor_quote_items']],
  // 生产域（V3.12.0）：嵌套数组字段名是 `operations`，不叫 items。
  // 不登记 → validateOrReject 的遍历入口找不到它 → **工序校验整层不执行**
  // （与 CHILD_TABLE_OVERRIDE 是两道独立的门，只登记一道等于没登记）。
  process_routes: [['operations', 'process_route_operations']],
};

const childTableOf = (table: string): string | null => {
  if (CHILD_TABLE_OVERRIDE[table]) {
    return FIELD_SCHEMA[CHILD_TABLE_OVERRIDE[table]] ? CHILD_TABLE_OVERRIDE[table] : null;
  }
  const cand = table.replace(/s$/, '') + '_items';
  return FIELD_SCHEMA[cand] ? cand : null;
};

/**
 * 校验请求体；不合法时直接返回 400 响应，合法时返回 null。
 * 若请求体含嵌套子数组（items / followupRecords / milestones / exceptions …），
 * 会连带校验对应子表的每一行。
 *
 * ── V3.9.0 修改：从「只查 body.items」改为「按登记表查全部子数组」────
 * 原实现写死 `Array.isArray(body.items)`。销售域的嵌套字段名都不叫 items，
 * 于是明细校验被静默跳过（详见 CHILD_BY_FIELD 注释）。
 * 现按 CHILD_BY_FIELD 逐字段遍历，并在错误信息里带上字段中文名，
 * 让「哪一行、哪个字段」可定位，而不是只说「明细行不合法」。
 */
export function validateOrReject(table: string, body: any, opts?: { partial?: boolean }): Response | null {
  // ★ V3.46.0：数量非负校验放在最前 —— 负数入库会让成品率/工时等比率算出负值，
  //   而类型与必填都合法，属"能过校验但数据错"的静默缺口。
  const _neg = validateNonNegative(table, body);
  if (_neg) return _neg;

  const err = validateWrite(table, body);
  if (err) return json({ error: err.message, code: 'INVALID_FIELD', field: err.field }, 400);

  if (!body || typeof body !== 'object') return null;

  // ★ V3.86.0 必填校验复用集中登记表 REQUIRED_CORE_FIELDS（经 requireCoreFields），
  //   让所有走 validateOrReject 的 POST 端点自动获得必填能力，单一真相、不造双源。
  //   字段类型先行校验，再判必填。
  //   opts.partial=true 时（PUT 局部更新）降级为"传了才验"语义——详见 requireCoreFields 注释：
  //   V3.86.0 曾因在 PUT 上也执行新建必填，把"仅传单字段的局部更新"误拦成 400（E2E 全线报红）。
  const _core = requireCoreFields(table, body, opts);
  if (_core) return _core;

  const specs = CHILD_BY_FIELD[table];
  if (specs) {
    for (const [field, childTable] of specs) {
      const arr = body[field];
      if (!Array.isArray(arr)) continue;
      // 子表未登记在 FIELD_SCHEMA 时跳过（行为与旧版一致：不因缺 schema 而报错）
      if (!FIELD_SCHEMA[childTable]) continue;
      for (let i = 0; i < arr.length; i++) {
        const cerr = validateWrite(childTable, arr[i]);
        if (cerr) {
          return json(
            {
              error: `${field} 第 ${i + 1} 行：${cerr.message}`,
              code: 'INVALID_FIELD',
              field: cerr.field,
            },
            400
          );
        }
      }
    }
  }

  // 兼容旧调用路径：父表未登记在 CHILD_BY_FIELD、但请求体带 items 的（如 purchase_orders
  // 走机械推断的 *_items 表），保持原有行为不回归。
  if (Array.isArray(body.items) && !specs) {
    const child = childTableOf(table);
    if (child) {
      for (const it of body.items) {
        const cerr = validateWrite(child, it);
        if (cerr) {
          return json(
            { error: `明细行：${cerr.message}`, code: 'INVALID_FIELD', field: cerr.field },
            400
          );
        }
      }
    }
  }
  return null;
}

/**
 * ★ V3.46.0 数量类字段的非负下限规则
 *
 * 为什么需要（真实缺口，由生产守护套件 38 的 E3 断言抓出）：
 *   工序报工的 goodQuantity / scrapQuantity / laborHours 此前**任何负数都能入库**，
 *   而服务端只校验必填与类型。结果：报废数填 -2、合格数填 -5 时，
 *   成品率 = 合格/(合格+报废) 会算出负数或 >100%，而界面上看不出任何异常。
 *   对标金蝶/用友/SAP：所有数量字段在单据层即拒绝负数（数量的"负"只能由红冲
 *   产生一张反向单据，而不是在原单上写负值 —— 后者会让历史统计失去意义）。
 *
 * 为什么做成「按表+列登记」而不是硬编码：
 *   数量列在各表命名不一（quantity / good_quantity / scrap_quantity / labor_hours），
 *   逐处硬编码会漏；登记制可让新表接入时显式声明哪些列不许为负。
 *
 * 范围刻意保守：只登记已确认会算错比率的表，不做「全库数量列一律非负」——
 *   后者会误伤合法的负数场景（如红冲行、调整单的 deltaQty 盘盈为负表示盘亏）。
 */
const NON_NEGATIVE_COLUMNS: Record<string, { cols: string[]; labels?: Record<string, string> }> = {
  // 工序报工：合格/报废/工时。负值会让成品率与单件工时算出负数
  mes_operation_reports: {
    cols: ['good_quantity', 'scrap_quantity', 'labor_hours'],
    labels: { good_quantity: '合格数量', scrap_quantity: '报废数量', labor_hours: '投入工时' },
  },
};

/** 校验数量类字段非负（仅对已登记的表生效） */
export function validateNonNegative(table: string, body: any): Response | null {
  const rule = NON_NEGATIVE_COLUMNS[table];
  if (!rule || !body || typeof body !== 'object') return null;
  for (const col of rule.cols) {
    const camel = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    // 兼容驼峰与下划线两种写法（前端传驼峰、测试可能传下划线）
    const v = body[camel] !== undefined ? body[camel] : body[col];
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue; // 非数值由 validateWrite 负责报类型错
    if (n < 0) {
      const label = rule.labels?.[col] || camel;
      return json(
        { error: `${label}不能为负数（当前 ${n}）。若需冲减，请在单据上做红冲/反向单据，不要在原单填负值`, code: 'NEGATIVE_QUANTITY', field: camel },
        400
      );
    }
  }
  return null;
}

/**
 * 单据类别核心必填项（V3.24.0 新增）
 *
 * 强哥决策：根据单据类别识别核心必填项，其他非核心由管理员自定义
 * 
 * 设计：
 *   · 按业务单据表名登记核心必填字段
 *   · 非核心字段交给前端 / app_state 自定义
 *   · 与现有 requireFields 共用同一 error 结构
 */
export const REQUIRED_CORE_FIELDS: Record<string, { fields: string[]; labels?: Record<string, string> }> = {
  // 采购订单：供应商、物料、数量、单价为核心
  'purchase_orders': {
    fields: ['vendorId', 'orderDate'],
    labels: { vendorId: '供应商', orderDate: '订单日期' },
  },
  // 销售订单：客户、物料、数量为核心
  'sales_orders': {
    fields: ['customerId', 'orderDate'],
    labels: { customerId: '客户', orderDate: '订单日期' },
  },
  // 入库单：供应商、物料、数量
  'inbound_orders': {
    fields: ['vendorId', 'inboundDate'],
    labels: { vendorId: '供应商', inboundDate: '入库日期' },
  },
  // 出库单：客户、物料、数量
  'outbound_orders': {
    fields: ['customerId', 'outboundDate'],
    labels: { customerId: '客户', outboundDate: '出库日期' },
  },
  // 委外订单：委外方、物料
  'subcontracts': {
    fields: ['vendorId', 'orderDate'],
    labels: { vendorId: '委外方', orderDate: '订单日期' },
  },
  // 工单：生产物料（= 产品编码）、计划数量
  // V3.58.0 修复 F-01：原必填 materialId 在 work_orders 表 / 前端 WorkOrder 类型里
  // 根本不存在（实际列是 product_code），导致任何工单建单都被 400 拦下。
  // 现改为校验真实字段 productCode + plannedQuantity。
  'work_orders': {
    fields: ['productCode', 'plannedQuantity'],
    labels: { productCode: '生产物料（产品编码）', plannedQuantity: '计划数量' },
  },
  // ── V3.86.0 主数据（强哥拍板·更严档：编码+名称必填，物料连规格单位也必填）──
  // 判据 A：无编码/名称则任何单据无法引用该主数据，后续全链路断。
  // 供应商端点用的是表名 vendor_master（非 vendors），登记键须与 validateOrReject 的入参一致。
  'materials': {
    fields: ['code', 'name', 'specification', 'unit'],
    labels: { code: '物料编码', name: '物料名称', specification: '规格型号', unit: '单位' },
  },
  'vendor_master': {
    fields: ['code', 'name'],
    labels: { code: '供应商编码', name: '供应商名称' },
  },
  'customers': {
    fields: ['code', 'name'],
    labels: { code: '客户编码', name: '客户名称' },
  },
  'warehouses': {
    fields: ['code', 'name'],
    labels: { code: '仓库编码', name: '仓库名称' },
  },
  // ── V3.87.0 扩面：配置类端点（写配置记录）核心必填收口到集中登记表 ──
  // 设计：把原先散写在各配置端点的必填校验（print-templates 的 name+entity、
  //   unit-conversions 的 fromUnit+toUnit+factor 等）统一收口到此处，单一真相、
  //   不造双源（与强哥「不造双源」工程偏好一致）。字段名用 camelCase，与前端一致。
  // 判据：取各配置项的「核心标识字段」——无它则配置记录无法被引用、无法生效。
  // 动作端点（consolidation 执行合并、tax-gateway 金税 KV 配置）无「新建配置必填」
  //   语义、且已自带校验，本次不纳入收口（详见部署说明）。
  'print_templates': {
    fields: ['name', 'entity'],
    labels: { name: '模板名称', entity: '适用单据类型' },
  },
  'voucher_templates': {
    fields: ['name'],
    labels: { name: '模板名称' },
  },
  'unit_conversions': {
    fields: ['fromUnit', 'toUnit', 'factor'],
    labels: { fromUnit: '源单位', toUnit: '目标单位', factor: '换算系数' },
  },
  // fx 端点（/api/fx）写入的表是 fx_rates，登记键须与 requireByRegistry 入参一致
  'fx_rates': {
    fields: ['quote', 'rate'],
    labels: { quote: '目标币种', rate: '汇率' },
  },
  'framework_agreements': {
    fields: ['vendorId'],
    labels: { vendorId: '供应商' },
  },
  // 审批流核心标识：module（业务模块键，如 purchase/sales）+ moduleLabel（中文名）。
  // 走 pcCreate/pcUpdate，已自动接入 validateOrReject → requireCoreFields，仅登记即生效。
  'approval_flows': {
    fields: ['module', 'moduleLabel'],
    labels: { module: '审批模块', moduleLabel: '审批流名称' },
  },
};

/**
 * 校验单据核心必填项
 * 
 * @param table 表名
 * @param body  请求体
 * @returns null 表示通过，Response 表示 400 错误
 */
/**
 * ★ V3.86.0 必填校验（集中登记表 REQUIRED_CORE_FIELDS）。
 *
 * opts.partial 语义（PUT 局部更新场景，V3.86.0 踩坑后补）：
 *   - 默认（POST 新建）：字段缺失或为空 → 一律拦截；
 *   - partial=true（PUT）：字段**没传** → 放行（局部更新合法省略未改字段）；
 *     字段**传了但为空** → 仍拦截（防编辑时故意清空必填项，前端表单同源兜底）。
 * 为什么必须分两种语义：V3.86.0 曾把新建必填直接用于 PUT，导致「仅传单字段的
 * 局部更新」被必填拦成 400（E2E 回潮护栏全线报红）——新建要求"必须填"，
 * 更新只该要求"要改就别改空"，两者不是同一个契约。
 */
export function requireCoreFields(table: string, body: any, opts?: { partial?: boolean }): Response | null {
  const spec = REQUIRED_CORE_FIELDS[table];
  if (!spec) return null; // 未登记表不做强制校验
  if (!body || typeof body !== 'object') return null;

  for (const f of spec.fields) {
    // partial 语义：本次请求没带上这个字段，视为"无意修改它"，放行
    if (opts?.partial && !Object.prototype.hasOwnProperty.call(body, f)) continue;
    if (isBlank(body[f])) {
      const label = spec.labels?.[f] || f;
      return json({ 
        error: `请填写「${label}」后再提交`, 
        code: 'MISSING_REQUIRED_CORE',
        field: f 
      }, 400);
    }
  }
  return null;
}
