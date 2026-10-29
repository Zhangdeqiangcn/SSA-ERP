import { create } from 'zustand';
import { printTemplateApi } from '@/services/printTemplateApi';

/**
 * 打印模板设计器
 * ------------------------------------------------------------
 * 允许管理员为业务实体（采购订单/物料/供应商）设计打印模板：标题、纸张、页眉页脚，
 * 并从字段目录中勾选要打印的字段。各业务页面通过「打印」入口调用 <PrintPreview>，
 * 按所选模板渲染可打印单据并直接打印。
 *
 * ── V3.7.0 C1 数据关系化（本文件本轮的核心改动）────────────────────
 * 数据主源从 `app_state` 的 JSON 大对象改为 D1 的 `print_templates` +
 * `print_template_assets` 两张关系表，**并删除了 persist 中间件**。
 *
 * 为什么必须删 persist（这点我第一版想错了，记下来防止后人加回去）：
 *   `backendStorage` 的落点**就是** `app_state` 那张表 —— 保留 persist 等于
 *   「新表写一份、旧表再写一份」，双通道照旧，C1 白改。既有先例可循：
 *   V2.75.0 的 `sopStore`、V3.6.0 的 `bomStore` 迁 D1 后都同步删除了 persist。
 *
 * 为什么图片要外置（本域与前一个域的本质区别）：
 *   本域 404 KB 里 397.5 KB 是页眉页脚内嵌的 base64 图片，且同一张 Logo
 *   被存了两遍。外置到 `print_template_assets` 后，模板正文只剩 1~2 KB，
 *   列表查询不再拖着 200 KB 的图片走。剥离与还原都在**服务端**完成，
 *   所以本文件看到的 `headerConfig.html` 里仍然是可直接渲染的 data URL。
 *
 * 对外 API 形状保持不变（`getTemplateByEntity` 等 5 个方法签名一字未改），
 * 6 个消费方零改动。
 */

export type PrintEntity =
  | 'purchaseOrder'
  | 'salesOrder'
  | 'salesQuotation'
  | 'salesContract'
  | 'bom'
  | 'inquiry'
  | 'workOrder'
  | 'purchaseRequest'
  | 'material'
  | 'vendor'
  | 'customer'
  | 'salesProject'
  | 'warehouseOutbound';

export type PrintFieldType = 'text' | 'money' | 'items';

export interface PrintFieldCatalog {
  key: string;
  label: string;
  type?: PrintFieldType;
}

export const PRINT_ENTITY_LABELS: Record<PrintEntity, string> = {
  purchaseOrder: '采购订单',
  salesOrder: '销售订单',
  salesQuotation: '销售报价单',
  salesContract: '销售合同',
  bom: 'BOM 物料清单',
  inquiry: '询价单',
  workOrder: '生产工单',
  purchaseRequest: '采购申请',
  material: '物料',
  vendor: '供应商',
  customer: '客户档案',
  salesProject: '销售项目',
  warehouseOutbound: '出库单',
};

export const PRINT_FIELD_CATALOG: Record<PrintEntity, PrintFieldCatalog[]> = {
  purchaseOrder: [
    { key: 'orderNo', label: '订单编号' },
    { key: 'vendorName', label: '供应商' },
    { key: 'orderDate', label: '订单日期' },
    { key: 'expectedDeliveryDate', label: '期望交货日期' },
    { key: 'paymentTerms', label: '付款条件' },
    { key: 'tradeTerms', label: '贸易条件' },
    { key: 'projectName', label: '关联项目' },
    { key: 'totalAmount', label: '订单总金额', type: 'money' },
    { key: 'remarks', label: '备注' },
    { key: 'items', label: '物料明细表', type: 'items' },
  ],
  salesQuotation: [
    { key: 'quotationNo', label: '报价单号' },
    { key: 'customerName', label: '客户' },
    { key: 'validUntil', label: '有效期至' },
    { key: 'salesPerson', label: '业务员' },
    { key: 'currency', label: '币种' },
    { key: 'totalAmount', label: '未税金额', type: 'money' },
    { key: 'grandTotal', label: '含税总额', type: 'money' },
    { key: 'remarks', label: '备注' },
    { key: 'items', label: '物料明细表', type: 'items' },
  ],
  salesContract: [
    { key: 'contractNo', label: '合同编号' },
    { key: 'name', label: '合同名称' },
    { key: 'customerName', label: '客户' },
    { key: 'customerCode', label: '客户编码' },
    { key: 'startDate', label: '开始日期' },
    { key: 'endDate', label: '结束日期' },
    { key: 'salesPerson', label: '销售员' },
    { key: 'amount', label: '合同金额', type: 'money' },
    { key: 'terms', label: '主要条款' },
    { key: 'remarks', label: '备注' },
    { key: 'items', label: '物料明细表', type: 'items' },
  ],
  bom: [
    { key: 'bomNo', label: 'BOM 编号' },
    { key: 'productName', label: '产品名称' },
    { key: 'productCode', label: '产品编码' },
    { key: 'type', label: 'BOM 类型' },
    { key: 'version', label: '版本' },
    { key: 'effectiveDate', label: '生效日期' },
    { key: 'totalCost', label: '总成本', type: 'money' },
    { key: 'description', label: '备注' },
    { key: 'items', label: '物料明细表', type: 'items' },
  ],
  inquiry: [
    { key: 'inquiryNo', label: '询价单号' },
    { key: 'title', label: '询价标题' },
    { key: 'inquirer', label: '询价人' },
    { key: 'department', label: '部门' },
    { key: 'deadline', label: '报价截止' },
    { key: 'currency', label: '币种' },
    { key: 'totalEstimatedAmount', label: '预估总金额', type: 'money' },
    { key: 'remarks', label: '备注' },
    { key: 'items', label: '物料明细表', type: 'items' },
  ],
  workOrder: [
    { key: 'workOrderNo', label: '工单编号' },
    { key: 'productName', label: '产品名称' },
    { key: 'bomName', label: 'BOM' },
    { key: 'quantity', label: '数量' },
    { key: 'plannedStartDate', label: '计划开始' },
    { key: 'plannedEndDate', label: '计划结束' },
    { key: 'status', label: '状态' },
    { key: 'remarks', label: '备注' },
    { key: 'items', label: '物料明细表', type: 'items' },
  ],
  purchaseRequest: [
    { key: 'requestNo', label: '申请单号' },
    { key: 'title', label: '申请标题' },
    { key: 'applicant', label: '申请人' },
    { key: 'department', label: '部门' },
    { key: 'expectedDate', label: '期望日期' },
    { key: 'applicationDate', label: '申请日期' },
    { key: 'priority', label: '优先级' },
    { key: 'status', label: '状态' },
    { key: 'remarks', label: '备注' },
    { key: 'items', label: '物料明细表', type: 'items' },
  ],
  salesOrder: [
    { key: 'orderNo', label: '订单编号' },
    { key: 'customerName', label: '客户' },
    { key: 'customerCode', label: '客户编码' },
    { key: 'orderDate', label: '订单日期' },
    { key: 'expectedDeliveryDate', label: '期望交期' },
    { key: 'paymentTerms', label: '付款条件' },
    { key: 'tradeTerms', label: '贸易条款' },
    { key: 'qualityStandard', label: '质量标准' },
    { key: 'projectName', label: '关联项目' },
    { key: 'salesPerson', label: '销售员' },
    { key: 'grandTotal', label: '含税总额', type: 'money' },
    { key: 'remarks', label: '备注' },
    { key: 'items', label: '物料明细表', type: 'items' },
  ],
  material: [
    { key: 'code', label: '物料编码' },
    { key: 'name', label: '物料名称' },
    { key: 'specification', label: '规格型号' },
    { key: 'unit', label: '单位' },
    { key: 'materialType', label: '物料类型' },
    { key: 'price', label: '单价', type: 'money' },
    { key: 'safetyStock', label: '安全库存' },
    { key: 'currentStock', label: '当前库存' },
    { key: 'remarks', label: '备注' },
  ],
  vendor: [
    { key: 'name', label: '供应商名称' },
    { key: 'code', label: '供应商编码' },
    { key: 'contact', label: '联系人' },
    { key: 'phone', label: '电话' },
    { key: 'email', label: '邮箱' },
    { key: 'address', label: '地址' },
    { key: 'level', label: '评级' },
    { key: 'remarks', label: '备注' },
  ],
  customer: [
    { key: 'name', label: '客户名称' },
    { key: 'code', label: '客户编码' },
    { key: 'contactName', label: '联系人' },
    { key: 'contactPhone', label: '电话' },
    { key: 'creditLevel', label: '信用等级' },
    { key: 'address', label: '地址' },
    { key: 'remarks', label: '备注' },
  ],
  salesProject: [
    { key: 'projectNo', label: '项目编号' },
    { key: 'projectName', label: '项目名称' },
    { key: 'customerName', label: '客户' },
    { key: 'salesPerson', label: '业务员' },
    { key: 'startDate', label: '开始日期' },
    { key: 'endDate', label: '结束日期' },
    { key: 'contractAmount', label: '合同金额', type: 'money' },
    { key: 'remarks', label: '备注' },
  ],
  warehouseOutbound: [
    { key: 'outboundNo', label: '出库单号' },
    { key: 'type', label: '出库类型' },
    { key: 'warehouseName', label: '仓库' },
    { key: 'status', label: '状态' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'totalAmount', label: '总金额', type: 'money' },
    { key: 'items', label: '出库明细表', type: 'items' },
  ],
};

export type PaperSize = 'A4' | 'A5';
export type Orientation = 'portrait' | 'landscape';

/**
 * 页眉/页脚配置（V2.89.0 简化）
 * 仅保留富文本 HTML 与是否自动追加打印时间两项。
 * 富文本由 mui-tiptap 编辑器产出（含内联样式 + 图片 base64），
 * 电子印章/Logo 均为图片，直接嵌入 HTML，不再单独字段。
 */
export interface HeaderFooterConfig {
  /** 富文本 HTML（mui-tiptap 产出，含内联样式与图片 data URL） */
  html: string;
  /** 是否自动追加打印时间 */
  showDate: boolean;
}

/** 打印附加选项（V2.89.0） */
export interface PrintExtraOptions {
  /** 审批记录表格（审批人/节点/时间/状态） */
  approvalRecord: boolean;
  /** 制单人 */
  createdBy: boolean;
  /** 制单时间 */
  createdAt: boolean;
  /** 审核人 */
  approvedBy: boolean;
  /** 审核时间 */
  approvedAt: boolean;
  /** 页码（第 X 页 / 共 Y 页） */
  pageNumber: boolean;
}

export const DEFAULT_EXTRA_OPTIONS: PrintExtraOptions = {
  approvalRecord: false,
  createdBy: false,
  createdAt: true,
  approvedBy: false,
  approvedAt: false,
  pageNumber: false,
};

export const DEFAULT_HEADER_CONFIG: HeaderFooterConfig = { html: '', showDate: false };
export const DEFAULT_FOOTER_CONFIG: HeaderFooterConfig = { html: '', showDate: true };

/** 把多行纯文本转换为居中对齐的富文本 HTML（供默认模板/迁移使用） */
export function textToHtml(text: string, align: 'left' | 'center' | 'right' = 'center'): string {
  if (!text) return '';
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.split('\n').map((l) => `<div>${esc(l)}</div>`).join('');
  return `<div style="text-align:${align}">${lines}</div>`;
}

/** 把 V2.88 的旧 12 字段配置合成为富文本 HTML（迁移用） */
export function legacyConfigToHtml(cfg: any): string {
  if (!cfg) return '';
  const text = cfg.text || '';
  const align = cfg.align || 'center';
  const styleParts: string[] = [];
  if (cfg.fontSize) styleParts.push(`font-size:${cfg.fontSize}px`);
  if (cfg.fontWeight === 'bold') styleParts.push('font-weight:bold');
  if (cfg.color) styleParts.push(`color:${cfg.color}`);
  const textDiv = text ? `<div style="${styleParts.join(';')}">${text.replace(/\n/g, '<br/>')}</div>` : '';
  const logo = cfg.imageUrl
    ? `<img src="${cfg.imageUrl}" style="height:${cfg.imageHeight || 40}px;object-fit:contain;vertical-align:middle" />`
    : '';
  const stamp = cfg.stampUrl
    ? `<img src="${cfg.stampUrl}" style="position:absolute;right:20px;width:${cfg.stampSize || 80}px;height:${cfg.stampSize || 80}px;opacity:0.85" />`
    : '';
  return `<div style="text-align:${align};position:relative">${logo}${textDiv}${stamp}</div>`;
}

export interface PrintTemplate {
  id: string;
  name: string;
  entity: PrintEntity;
  title: string;
  paperSize: PaperSize;
  orientation: Orientation;
  /** @deprecated 仅迁移兼容，新数据用 headerConfig.html */
  headerText: string;
  /** @deprecated 仅迁移兼容，新数据用 footerConfig.html */
  footerText: string;
  /** V2.89.0 页眉富文本配置 */
  headerConfig: HeaderFooterConfig;
  /** V2.89.0 页脚富文本配置 */
  footerConfig: HeaderFooterConfig;
  fieldKeys: string[];
  /** V2.89.0 打印附加选项（审批记录/制单/审核/页码等） */
  extraOptions: PrintExtraOptions;
}

export interface PrintTemplateState {
  templates: PrintTemplate[];
  /** V3.7.0 C1：是否已完成一次云端加载（供列表骨架屏判断） */
  loaded: boolean;
  /** V3.7.0 C1：同步失败原因（中文，直接可展示） */
  syncError: string;
  /** V3.7.0 C1：从 D1 关系表拉取模板；失败保留内存态并置 syncError */
  load: () => Promise<void>;

  addTemplate: (tpl: PrintTemplate) => void;
  updateTemplate: (id: string, patch: Partial<PrintTemplate>) => void;
  removeTemplate: (id: string) => void;
  resetTemplates: () => void;
  getTemplateByEntity: (entity: PrintEntity) => PrintTemplate | undefined;
}

const DEFAULT_TEMPLATES_RAW: Omit<PrintTemplate, 'headerConfig' | 'footerConfig' | 'extraOptions'>[] = [
  {
    id: 'tpl-po-default',
    name: '采购订单（标准）',
    entity: 'purchaseOrder',
    title: '采购订单',
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: 'SSA 制造集团\n采购订单确认函',
    footerText: '本订单经双方确认后生效。\n打印时间：{now}',
    fieldKeys: ['orderNo', 'vendorName', 'orderDate', 'expectedDeliveryDate', 'paymentTerms', 'tradeTerms', 'totalAmount', 'items', 'remarks'],
  },
  {
    id: 'tpl-material-default',
    name: '物料卡片（标准）',
    entity: 'material',
    title: '物料信息卡',
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: 'SSA 制造集团\n物料信息卡',
    footerText: '打印时间：{now}',
    fieldKeys: ['code', 'name', 'specification', 'unit', 'materialType', 'price', 'safetyStock', 'currentStock', 'remarks'],
  },
  {
    id: 'tpl-so-default',
    name: '销售订单（标准）',
    entity: 'salesOrder',
    title: '销售订单',
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: 'SSA 制造集团\n销售订单确认函',
    footerText: '本订单经双方确认后生效。\n打印时间：{now}',
    fieldKeys: ['orderNo', 'customerName', 'customerCode', 'orderDate', 'expectedDeliveryDate', 'paymentTerms', 'tradeTerms', 'qualityStandard', 'salesPerson', 'grandTotal', 'items', 'remarks'],
  },
  {
    id: 'tpl-quotation-default',
    name: '销售报价单（标准）',
    entity: 'salesQuotation',
    title: '销售报价单',
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: 'SSA 制造集团\n销售报价单',
    footerText: '本报价单有效期以文中注明为准。\n打印时间：{now}',
    fieldKeys: ['quotationNo', 'customerName', 'validUntil', 'salesPerson', 'currency', 'totalAmount', 'grandTotal', 'items', 'remarks'],
  },
  {
    id: 'tpl-contract-default',
    name: '销售合同（标准）',
    entity: 'salesContract',
    title: '销售合同',
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: 'SSA 制造集团\n销售合同',
    footerText: '本合同经双方签章后生效。\n打印时间：{now}',
    fieldKeys: ['contractNo', 'name', 'customerName', 'customerCode', 'startDate', 'endDate', 'salesPerson', 'amount', 'terms', 'items', 'remarks'],
  },
  {
    id: 'tpl-bom-default',
    name: 'BOM 物料清单（标准）',
    entity: 'bom',
    title: 'BOM 物料清单',
    paperSize: 'A4',
    orientation: 'landscape',
    headerText: 'SSA 制造集团\nBOM 物料清单',
    footerText: '打印时间：{now}',
    fieldKeys: ['bomNo', 'productName', 'productCode', 'type', 'version', 'effectiveDate', 'totalCost', 'items', 'description'],
  },
  {
    id: 'tpl-inquiry-default',
    name: '询价单（标准）',
    entity: 'inquiry',
    title: '询价单',
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: 'SSA 制造集团\n采购询价单',
    footerText: '请于截止日期前反馈报价。\n打印时间：{now}',
    fieldKeys: ['inquiryNo', 'title', 'inquirer', 'department', 'deadline', 'currency', 'totalEstimatedAmount', 'items', 'remarks'],
  },
  {
    id: 'tpl-workorder-default',
    name: '生产工单（标准）',
    entity: 'workOrder',
    title: '生产工单',
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: 'SSA 制造集团\n生产工单',
    footerText: '打印时间：{now}',
    fieldKeys: ['workOrderNo', 'productName', 'bomName', 'quantity', 'plannedStartDate', 'plannedEndDate', 'status', 'items', 'remarks'],
  },
  {
    id: 'tpl-purchaserequest-default',
    name: '采购申请（标准）',
    entity: 'purchaseRequest',
    title: '采购申请单',
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: 'SSA 制造集团\n采购申请单',
    footerText: '打印时间：{now}',
    fieldKeys: ['requestNo', 'title', 'applicant', 'department', 'applicationDate', 'priority', 'status', 'items', 'remarks'],
  },
];

const DEFAULT_TEMPLATES: PrintTemplate[] = DEFAULT_TEMPLATES_RAW.map((t) => ({
  ...t,
  headerConfig: { html: textToHtml(t.headerText, 'center'), showDate: false },
  footerConfig: { html: textToHtml(t.footerText, 'center'), showDate: true },
  extraOptions: { ...DEFAULT_EXTRA_OPTIONS },
}));

/** 把网络/权限错误翻译成强哥看得懂的话（不出现英文错误码） */
function readableError(e: any): string {
  const status = e?.response?.status ?? e?.status;
  const raw = String(e?.response?.data?.error || e?.message || e || '');
  if (status === 401) return '登录状态已过期，请重新登录后再操作。';
  if (status === 403) return '当前账号没有查看打印模板的权限，请联系管理员。';
  if (status === 409) return '模板编号冲突，请刷新页面后重试。';
  if (/ERR_NETWORK|Network Error|fetch/i.test(raw)) return '网络不可用，正在显示本机暂存内容。';
  return raw || '与服务器同步失败，正在显示本机暂存内容。';
}

export const usePrintTemplateStore = create<PrintTemplateState>()((set, get) => ({
  templates: [...DEFAULT_TEMPLATES],
  loaded: false,
  syncError: '',

  load: async () => {
    try {
      const res: any = await printTemplateApi.list();
      const templates = res?.data?.templates ?? res?.templates;
      if (Array.isArray(templates)) {
        // 云端有数据就用云端；一条都没有时保留默认模板（首次部署的种子），
        // 否则新库加载完会变成空白页，用户以为功能坏了
        set({ templates: templates.length > 0 ? templates : get().templates, loaded: true, syncError: '' });
      } else {
        set({ loaded: true });
      }
    } catch (e) {
      set({ loaded: true, syncError: readableError(e) });
    }
  },

  addTemplate: (tpl) => {
    set((state) => ({ templates: [...state.templates, tpl] }));
    // 乐观更新已在内存生效；写库失败时把原因暴露给界面，不静默丢弃
    printTemplateApi.save(tpl).catch((e) => set({ syncError: readableError(e) }));
  },

  updateTemplate: (id, patch) => {
    const before = get().templates.find((t) => t.id === id);
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
    if (!before) return;
    printTemplateApi
      .update(id, { ...before, ...patch })
      .catch((e) => {
        // 失败回滚，避免界面显示的成功与实际存储不一致
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? before : t)),
          syncError: readableError(e),
        }));
      });
  },

  removeTemplate: (id) => {
    const before = get().templates.find((t) => t.id === id);
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
    printTemplateApi.remove(id).catch((e) => {
      if (before) {
        set((state) => ({ templates: [...state.templates, before], syncError: readableError(e) }));
      } else {
        set({ syncError: readableError(e) });
      }
    });
  },

  // 恢复出厂：把默认模板整批保存回云端（不是只改内存）
  resetTemplates: () => {
    set({ templates: [...DEFAULT_TEMPLATES] });
    Promise.all(DEFAULT_TEMPLATES.map((t) => printTemplateApi.save(t))).catch((e) =>
      set({ syncError: readableError(e) })
    );
  },

  getTemplateByEntity: (entity) => get().templates.find((t) => t.entity === entity),
}));
