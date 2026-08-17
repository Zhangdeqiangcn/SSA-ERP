import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 打印模板设计器（P2-1 剩余）
 * ------------------------------------------------------------
 * 允许管理员为业务实体（采购订单/物料/供应商）设计打印模板：标题、纸张、页眉页脚，
 * 并从字段目录中勾选要打印的字段。各业务页面通过「打印」入口调用 <PrintPreview>，
 * 按所选模板渲染可打印单据并直接打印。
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

export interface PrintTemplate {
  id: string;
  name: string;
  entity: PrintEntity;
  title: string;
  paperSize: PaperSize;
  orientation: Orientation;
  headerText: string;
  footerText: string;
  fieldKeys: string[];
}

export interface PrintTemplateState {
  templates: PrintTemplate[];
  addTemplate: (tpl: PrintTemplate) => void;
  updateTemplate: (id: string, patch: Partial<PrintTemplate>) => void;
  removeTemplate: (id: string) => void;
  resetTemplates: () => void;
  getTemplateByEntity: (entity: PrintEntity) => PrintTemplate | undefined;
}

const DEFAULT_TEMPLATES: PrintTemplate[] = [
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
    fieldKeys: ['requestNo', 'title', 'applicant', 'department', 'expectedDate', 'priority', 'status', 'items', 'remarks'],
  },
];

export const usePrintTemplateStore = create<PrintTemplateState>()(
  persist(
    (set, get) => ({
      templates: [...DEFAULT_TEMPLATES],

      addTemplate: (tpl) =>
        set((state) => ({ templates: [...state.templates, tpl] })),

      updateTemplate: (id, patch) =>
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      removeTemplate: (id) =>
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),

      resetTemplates: () => set({ templates: [...DEFAULT_TEMPLATES] }),

      getTemplateByEntity: (entity) => get().templates.find((t) => t.entity === entity),
    }),
    {
      name: 'ssa-erp-printtemplate',
      version: 1,
      partialize: (state) => ({ templates: state.templates }),
    }
  )
);
