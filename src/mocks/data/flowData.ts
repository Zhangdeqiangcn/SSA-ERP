/**
 * 扩展 Mock 数据 —— 表单流转体系 & 供应商全流程
 * 生产工单 → MRP → 采购申请 → 采购订单 → 报检单 → 检验单 → 入库单 → 不合格品 → 出库单 → 成品入库
 */

import { FinishedGoodsInbound } from '@/types';

// ──────────────────────────────────────────────
// 报检单 (Inspection Notice)
// ──────────────────────────────────────────────
export interface InspectionNotice {
  id: string;
  noticeNo: string;           // 报检单号 QN-
  sourceType: 'purchase' | 'production' | 'return'; // 来源
  sourceNo: string;           // 来源单号（采购订单/生产工单）
  purchaseOrderId?: string;
  workOrderId?: string;
  vendorId?: string;
  vendorName?: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  noticeQty: number;          // 报检数量
  batchNo: string;
  warehouseId: string;
  warehouseName: string;
  status: 'pending' | 'inspecting' | 'passed' | 'failed' | 'partial';
  inspectionTaskId?: string;  // 关联检验单
  reportedBy: string;
  reportedAt: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ──────────────────────────────────────────────
// 成品入库单 (Finished Goods Inbound) —— 类型已上提至 @/types
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// 供应商门户相关类型
// ──────────────────────────────────────────────

/** 供应商登录注册申请 */
export interface VendorApplication {
  id: string;
  applicationNo: string;      // VA-
  companyName: string;
  unifiedCode: string;        // 统一社会信用代码
  businessLicense: string;    // 营业执照号
  legalRepresentative: string;
  registeredCapital: string;
  contact: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  supplyCategories: string[]; // 供货类目
  mainProducts: string;
  annualRevenue?: string;
  certifications?: string[];  // ISO等认证
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  attachments: { name: string; url: string; type: string }[];
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'supplement';
  reviewerId?: string;
  reviewedAt?: string;
  reviewComment?: string;
  approvalRecords?: { approver: string; action: string; comment: string; at: string }[];
  /** 当前审批步骤索引（按 ApprovalFlowTab 配置驱动） */
  currentStep?: number;
  /** 各步骤审批历史（含步骤序号、角色、动作） */
  stepHistory?: { step: number; role: string; label: string; action: 'submit' | 'approve' | 'reject' | 'supplement'; comment?: string; at: string }[];
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** 供应商订单确认 */
export interface VendorOrderConfirm {
  id: string;
  confirmNo: string;          // VOC-
  purchaseOrderId: string;
  purchaseOrderNo: string;
  vendorId: string;
  vendorName: string;
  status: 'pending' | 'confirmed' | 'modified' | 'rejected';
  confirmedDeliveryDate?: string;
  confirmedItems: {
    itemId: string;
    materialCode: string;
    materialName: string;
    orderedQty: number;
    confirmedQty: number;
    unitPrice: number;
    canDeliverDate: string;
    remark?: string;
  }[];
  vendorRemark?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 发货物流 */
export interface DeliveryShipment {
  id: string;
  shipmentNo: string;         // SHP-
  purchaseOrderId: string;
  purchaseOrderNo: string;
  vendorOrderConfirmId?: string;
  vendorId: string;
  vendorName: string;
  logisticsCompany: string;
  trackingNo: string;
  shipper: string;
  shipDate: string;
  estimatedArrival: string;
  actualArrival?: string;
  status: 'preparing' | 'shipped' | 'in_transit' | 'arrived' | 'signed';
  items: {
    id: string;
    materialCode: string;
    materialName: string;
    specification: string;
    unit: string;
    shippedQty: number;
    packagingQty: number; // 箱数/包数
  }[];
  receivingWarehouse: string;
  receivingAddress: string;
  inboundOrderId?: string;    // 关联入库单
  attachments?: { name: string; url: string }[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/** 供应商质量问题单 */
export interface VendorQualityIssue {
  id: string;
  issueNo: string;            // VQI-
  vendorId: string;
  vendorName: string;
  purchaseOrderId?: string;
  inboundOrderId?: string;
  inspectionTaskId?: string;
  materialCode: string;
  materialName: string;
  batchNo: string;
  issueType: 'dimension' | 'appearance' | 'performance' | 'documentation' | 'other';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  defectQty: number;
  totalQty: number;
  defectRate: number;
  photos?: { name: string; url: string }[];
  status: 'open' | 'responded' | 'improving' | 'closed' | 'escalated';
  vendorResponse?: string;
  vendorRespondedAt?: string;
  disposalMethod?: 'return' | 'rework' | 'concession' | 'scrap';
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/** 供应商改善报告 (8D) */
export interface VendorImprovementReport {
  id: string;
  reportNo: string;           // VIR-8D-
  issueId: string;
  vendorId: string;
  vendorName: string;
  d1_team: string;            // D1 成立小组
  d2_description: string;     // D2 问题描述
  d3_containment: string;     // D3 临时遏制措施
  d4_rootcause: string;       // D4 根本原因
  d5_solution: string;        // D5 永久纠正措施
  d6_implementation: string;  // D6 实施计划
  d7_verification: string;    // D7 效果验证
  d8_prevention: string;      // D8 防止再发
  status: 'draft' | 'submitted' | 'reviewing' | 'accepted' | 'rejected' | 'closed';
  submittedAt?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/** 供应商对账单 */
export interface VendorStatement {
  id: string;
  statementNo: string;        // VS-
  vendorId: string;
  vendorName: string;
  statementPeriod: string;    // 对账周期 2024-05
  items: {
    id: string;
    purchaseOrderNo: string;
    inboundNo: string;
    materialCode: string;
    materialName: string;
    specification: string;
    unit: string;
    qty: number;
    unitPrice: number;
    amount: number;
    inboundDate: string;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    invoiced: boolean;
    invoiceNo?: string;
  }[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status: 'draft' | 'submitted' | 'reviewing' | 'sent' | 'confirmed' | 'disputed' | 'closed';
  vendorConfirmedAt?: string;
  disputeItems?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/** 供应商开票申请 */
export interface VendorInvoiceRequest {
  id: string;
  requestNo: string;          // VIR-
  vendorId: string;
  vendorName: string;
  statementId: string;
  statementNo: string;
  invoiceType: 'vat_special' | 'vat_normal' | 'electronic'; // 增值税专票/普票/电子
  taxRate: number;
  invoiceAmount: number;
  taxAmount: number;
  totalAmount: number;
  buyerName: string;
  buyerTaxId: string;
  buyerAddress: string;
  buyerBank: string;
  buyerBankAccount: string;
  items: { description: string; unit: string; qty: number; unitPrice: number; amount: number }[];
  status: 'draft' | 'pending' | 'submitted' | 'approved' | 'issued' | 'received' | 'verified' | 'rejected';
  invoiceNo?: string;
  invoiceCode?: string;
  issuedAt?: string;
  receivedAt?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  submittedAt?: string;  // 提交/发起时间
  scheduledAt?: string;  // 定时发起时间（为空则立即发起）
}

// ──────────────────────────────────────────────
// Mock 数据
// ──────────────────────────────────────────────

export const inspectionNotices: InspectionNotice[] = [
  {
    id: 'qn-001',
    noticeNo: 'QN20240510001',
    sourceType: 'purchase',
    sourceNo: 'PO20240506001',
    purchaseOrderId: 'po-001',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    materialId: 'mat-001',
    materialCode: 'MAT202405010001',
    materialName: '钢板 Q235B',
    specification: '10mm*1500mm*6000mm',
    unit: '吨',
    noticeQty: 30,
    batchNo: 'B20240510A',
    warehouseId: 'wh-001',
    warehouseName: '主仓库-A区',
    status: 'passed',
    inspectionTaskId: 'insp-001',
    reportedBy: '李强',
    reportedAt: '2024-05-10 09:00:00',
    createdAt: '2024-05-10 09:00:00',
    updatedAt: '2024-05-10 16:00:00',
    createdBy: '李强',
    updatedBy: '李强',
  },
  {
    id: 'qn-002',
    noticeNo: 'QN20240514001',
    sourceType: 'purchase',
    sourceNo: 'PO20240503001',
    purchaseOrderId: 'po-003',
    vendorId: 'ven-004',
    vendorName: '深圳华强电气有限公司',
    materialId: 'mat-009',
    materialCode: 'MAT202405010009',
    materialName: '交流接触器 CJX2',
    specification: 'CJX2-0910 AC220V',
    unit: '个',
    noticeQty: 20,
    batchNo: 'HQ20240508',
    warehouseId: 'wh-001',
    warehouseName: '主仓库-B区',
    status: 'partial',
    reportedBy: '王芳',
    reportedAt: '2024-05-14 08:30:00',
    createdAt: '2024-05-14 08:30:00',
    updatedAt: '2024-05-14 14:00:00',
    createdBy: '王芳',
    updatedBy: '王芳',
  },
  {
    id: 'qn-003',
    noticeNo: 'QN20240520001',
    sourceType: 'production',
    sourceNo: 'WO20240515001',
    workOrderId: 'wo-001',
    materialId: 'mat-001',
    materialCode: 'MAT202405010001',
    materialName: '钢板 Q235B',
    specification: '钢结构件成品',
    unit: '件',
    noticeQty: 50,
    batchNo: 'FG20240520',
    warehouseId: 'wh-002',
    warehouseName: '成品仓库',
    status: 'inspecting',
    reportedBy: '赵生产',
    reportedAt: '2024-05-20 14:00:00',
    createdAt: '2024-05-20 14:00:00',
    updatedAt: '2024-05-20 14:00:00',
    createdBy: '赵生产',
    updatedBy: '赵生产',
  },
];

export const finishedGoodsInbounds: FinishedGoodsInbound[] = [
  {
    id: 'fin-001',
    inboundNo: 'FIN20240522001',
    workOrderId: 'wo-001',
    workOrderNo: 'WO20240515001',
    productId: 'mat-pro-001',
    productCode: 'FG202405001',
    productName: '钢结构框架 A型',
    specification: '1200*800*600mm 钢结构',
    unit: '件',
    plannedQty: 50,
    actualQty: 48,
    qualifiedQty: 46,
    rejectedQty: 2,
    batchNo: 'FG20240522',
    warehouseId: 'wh-002',
    warehouseName: '成品仓库',
    locationId: 'loc-fg-001',
    locationName: 'FG-A-01',
    status: 'completed',
    operator: '赵生产',
    inboundDate: '2024-05-22',
    createdAt: '2024-05-22 09:00:00',
    updatedAt: '2024-05-22 16:00:00',
    createdBy: '赵生产',
    updatedBy: '赵生产',
  },
  // ── C1 追溯链路种子：成品批次 F20240620X 由工单 WO20240601001 产出入库（耗用原料批次 B20240601X）──
  {
    id: 'fin-002',
    inboundNo: 'FIN20240620001',
    workOrderId: 'wo-c1-001',
    workOrderNo: 'WO20240601001',
    productId: 'mat-pro-001',
    productCode: 'FG202405001',
    productName: '钢结构框架 A型',
    specification: '1200*800*600mm 钢结构',
    unit: '件',
    plannedQty: 30,
    actualQty: 28,
    qualifiedQty: 27,
    rejectedQty: 1,
    batchNo: 'F20240620X',
    warehouseId: 'wh-002',
    warehouseName: '成品仓库',
    locationId: 'loc-fg-001',
    locationName: 'FG-A-01',
    status: 'completed',
    operator: '赵生产',
    inboundDate: '2024-06-20',
    createdAt: '2024-06-20 09:00:00',
    updatedAt: '2024-06-20 16:00:00',
    createdBy: '赵生产',
    updatedBy: '赵生产',
  },
];

export const vendorApplications: VendorApplication[] = [
  {
    id: 'va-001',
    applicationNo: 'VA20240601001',
    companyName: '广州创新电子科技有限公司',
    unifiedCode: '91440101MA9ABCDE1X',
    businessLicense: 'GZ-2019-123456',
    legalRepresentative: '陈伟明',
    registeredCapital: '500万元人民币',
    contact: '林晓华',
    contactPhone: '020-87654321',
    contactEmail: 'linxh@gzcreate.com',
    address: '广州市天河区科技园A栋501室',
    supplyCategories: ['电气元件', '控制系统', '传感器'],
    mainProducts: '工业控制器、PLC、变频器、传感器',
    annualRevenue: '2000万元',
    certifications: ['ISO9001:2015', 'CE认证'],
    bankName: '中国工商银行广州天河支行',
    bankAccount: '6222021234567891234',
    bankAccountName: '广州创新电子科技有限公司',
    attachments: [
      { name: '营业执照.pdf', url: '/uploads/va-001/license.pdf', type: 'license' },
      { name: 'ISO9001证书.pdf', url: '/uploads/va-001/iso9001.pdf', type: 'cert' },
    ],
    status: 'reviewing',
    submittedAt: '2024-06-01 10:00:00',
    createdAt: '2024-06-01 09:30:00',
    updatedAt: '2024-06-01 10:00:00',
  },
  {
    id: 'va-002',
    applicationNo: 'VA20240605001',
    companyName: '成都西部机械制造有限公司',
    unifiedCode: '91510104MA61XXXX1Y',
    businessLicense: 'CD-2020-654321',
    legalRepresentative: '王大明',
    registeredCapital: '1000万元人民币',
    contact: '赵小刚',
    contactPhone: '028-87654321',
    contactEmail: 'zhaoxg@cdwestmech.com',
    address: '成都市金牛区工业大道100号',
    supplyCategories: ['机械零件', '精密加工件', '结构件'],
    mainProducts: '精密机械零件、定制加工件',
    annualRevenue: '5000万元',
    certifications: ['ISO9001:2015', 'IATF16949'],
    bankName: '中国建设银行成都金牛支行',
    bankAccount: '6227001234567891234',
    bankAccountName: '成都西部机械制造有限公司',
    attachments: [
      { name: '营业执照.pdf', url: '/uploads/va-002/license.pdf', type: 'license' },
    ],
    status: 'approved',
    reviewerId: 'user-admin',
    reviewedAt: '2024-06-08 14:00:00',
    reviewComment: '资质齐全，供货能力符合要求，同意注册',
    approvalRecords: [
      { approver: '采购部主管', action: 'approve', comment: '供货品类匹配，同意', at: '2024-06-06 10:00:00' },
      { approver: '供应链总监', action: 'approve', comment: '综合评估通过', at: '2024-06-08 14:00:00' },
    ],
    submittedAt: '2024-06-05 11:00:00',
    createdAt: '2024-06-05 10:30:00',
    updatedAt: '2024-06-08 14:00:00',
  },
];

export const vendorOrderConfirms: VendorOrderConfirm[] = [
  {
    id: 'voc-001',
    confirmNo: 'VOC20240507001',
    purchaseOrderId: 'po-001',
    purchaseOrderNo: 'PO20240506001',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    status: 'confirmed',
    confirmedDeliveryDate: '2024-05-10',
    confirmedItems: [
      {
        itemId: 'poi-001',
        materialCode: 'MAT202405010001',
        materialName: '钢板 Q235B',
        orderedQty: 30,
        confirmedQty: 30,
        unitPrice: 4150,
        canDeliverDate: '2024-05-10',
        remark: '库存充足，按时发货',
      },
    ],
    vendorRemark: '已安排发货，预计5月10日到达',
    confirmedBy: '张建国',
    confirmedAt: '2024-05-07 14:00:00',
    createdAt: '2024-05-07 08:00:00',
    updatedAt: '2024-05-07 14:00:00',
  },
  {
    id: 'voc-002',
    confirmNo: 'VOC20240508001',
    purchaseOrderId: 'po-002',
    purchaseOrderNo: 'PO20240507001',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    status: 'pending',
    confirmedItems: [
      {
        itemId: 'poi-002',
        materialCode: 'MAT202405010003',
        materialName: 'H型钢 Q345B',
        orderedQty: 15,
        confirmedQty: 15,
        unitPrice: 4750,
        canDeliverDate: '2024-05-20',
        remark: '本批仅能发12吨，剩余3吨下批补发',
      },
    ],
    vendorRemark: '部分库存调拨中，分两批交货',
    createdAt: '2026-07-15 06:00:00',
    updatedAt: '2026-07-15 06:00:00',
  },
];

export const deliveryShipments: DeliveryShipment[] = [
  {
    id: 'shp-001',
    shipmentNo: 'SHP20240509001',
    purchaseOrderId: 'po-001',
    purchaseOrderNo: 'PO20240506001',
    vendorOrderConfirmId: 'voc-001',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    logisticsCompany: '上海中通物流',
    trackingNo: 'ZT2024050901234',
    shipper: '张建国',
    shipDate: '2024-05-09',
    estimatedArrival: '2024-05-10',
    actualArrival: '2024-05-10',
    status: 'signed',
    items: [
      {
        id: 'shi-001',
        materialCode: 'MAT202405010001',
        materialName: '钢板 Q235B',
        specification: '10mm*1500mm*6000mm',
        unit: '吨',
        shippedQty: 30,
        packagingQty: 6,
      },
    ],
    receivingWarehouse: '主仓库-A区',
    receivingAddress: '上海市浦东新区工业园区88号',
    inboundOrderId: 'in-001',
    createdAt: '2024-05-09 10:00:00',
    updatedAt: '2024-05-10 15:00:00',
    createdBy: 'ven-user-001',
    updatedBy: 'ven-user-001',
  },
  {
    id: 'shp-002',
    shipmentNo: 'SHP20240515001',
    purchaseOrderId: 'po-002',
    purchaseOrderNo: 'PO20240507001',
    vendorOrderConfirmId: 'voc-002',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    logisticsCompany: '德邦快递',
    trackingNo: 'DB20240515005678',
    shipper: '张建国',
    shipDate: '2024-05-15',
    estimatedArrival: '2024-05-18',
    status: 'in_transit',
    items: [
      {
        id: 'shi-002',
        materialCode: 'MAT202405010003',
        materialName: 'H型钢 Q345B',
        specification: 'HM300*200*8*12',
        unit: '吨',
        shippedQty: 12,
        packagingQty: 3,
      },
    ],
    receivingWarehouse: '主仓库-A区',
    receivingAddress: '上海市浦东新区工业园区88号',
    createdAt: '2024-05-15 09:00:00',
    updatedAt: '2024-05-15 09:00:00',
    createdBy: 'ven-user-001',
    updatedBy: 'ven-user-001',
  },
];

export const vendorQualityIssues: VendorQualityIssue[] = [
  {
    id: 'vqi-001',
    issueNo: 'VQI20240514001',
    vendorId: 'ven-004',
    vendorName: '深圳华强电气有限公司',
    purchaseOrderId: 'po-003',
    inboundOrderId: 'in-002',
    materialCode: 'MAT202405010009',
    materialName: '交流接触器 CJX2',
    batchNo: 'HQ20240508',
    issueType: 'performance',
    severity: 'major',
    description: '抽检发现2个接触器线圈绝缘电阻不符合要求（<100MΩ），存在安全隐患',
    defectQty: 2,
    totalQty: 20,
    defectRate: 10,
    status: 'improving',
    vendorResponse: '已确认问题，本批次存在工艺缺陷，将对剩余库存100%检验后再发货，针对此批次提出换货申请',
    vendorRespondedAt: '2024-05-16 10:00:00',
    disposalMethod: 'return',
    createdAt: '2024-05-14 16:00:00',
    updatedAt: '2024-05-16 10:00:00',
    createdBy: '王芳',
    updatedBy: '王芳',
  },
];

export const vendorImprovementReports: VendorImprovementReport[] = [
  {
    id: 'vir-001',
    reportNo: 'VIR-8D-20240520001',
    issueId: 'vqi-001',
    vendorId: 'ven-004',
    vendorName: '深圳华强电气有限公司',
    d1_team: '品质部王工、生产部张工、技术部李工联合小组',
    d2_description: '2024-05-14贵司来料检验发现CJX2接触器2只线圈绝缘电阻低于100MΩ，批次号HQ20240508',
    d3_containment: '1.对本批次20只产品全部隔离，暂停使用；2.紧急对仓库同批次库存100%检验；3.补发合格品10只',
    d4_rootcause: '原材料供应商更换，新批次漆包线绝缘层厚度不足（设计0.08mm，实测0.05mm），导致绝缘电阻下降',
    d5_solution: '1.更换漆包线供应商至原认可供应商；2.增加来料漆包线绝缘厚度检验；3.修订IQC检验规程',
    d6_implementation: '1.本周完成供应商切换；2.下周起执行新IQC标准；3.对问题批次全部返工处理',
    d7_verification: '新批次漆包线绝缘厚度检验报告已提交，全部符合≥0.08mm要求，绝缘电阻100%>500MΩ',
    d8_prevention: '将漆包线绝缘厚度纳入供应商年度审核关键指标；在生产作业指导书中增加线圈绝缘自检工序',
    status: 'submitted',
    submittedAt: '2024-05-20 14:00:00',
    createdAt: '2024-05-18 09:00:00',
    updatedAt: '2024-05-20 14:00:00',
    createdBy: 'ven-user-004',
    updatedBy: 'ven-user-004',
  },
];

export const vendorStatements: VendorStatement[] = [
  {
    id: 'vs-001',
    statementNo: 'VS20240531001',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    statementPeriod: '2024-05',
    items: [
      {
        id: 'vsi-001',
        purchaseOrderNo: 'PO20240506001',
        inboundNo: 'IN20240510001',
        materialCode: 'MAT202405010001',
        materialName: '钢板 Q235B',
        specification: '10mm*1500mm*6000mm',
        unit: '吨',
        qty: 30,
        unitPrice: 4150,
        amount: 124500,
        inboundDate: '2024-05-10',
        taxRate: 13,
        taxAmount: 16185,
        totalAmount: 140685,
        invoiced: true,
        invoiceNo: 'FP20240510001',
      },
    ],
    subtotal: 124500,
    taxTotal: 16185,
    grandTotal: 140685,
    status: 'confirmed',
    vendorConfirmedAt: '2024-06-02 10:00:00',
    createdAt: '2024-05-31 17:00:00',
    updatedAt: '2024-06-02 10:00:00',
    createdBy: 'admin',
    updatedBy: 'admin',
  },
];

export const vendorInvoiceRequests: VendorInvoiceRequest[] = [
  {
    id: 'vir-001',
    requestNo: 'VIR20240602001',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    statementId: 'vs-001',
    statementNo: 'VS20240531001',
    invoiceType: 'vat_special',
    taxRate: 13,
    invoiceAmount: 124500,
    taxAmount: 16185,
    totalAmount: 140685,
    buyerName: 'SSA制造有限公司',
    buyerTaxId: '91310115XXXXXXXXXX',
    buyerAddress: '上海市浦东新区工业园区88号',
    buyerBank: '中国工商银行浦东新区支行',
    buyerBankAccount: '6222031234567890001',
    items: [
      { description: '钢板 Q235B 10mm*1500mm*6000mm', unit: '吨', qty: 30, unitPrice: 4150, amount: 124500 },
    ],
    status: 'received',
    invoiceNo: '02300245',
    invoiceCode: '3100244130',
    issuedAt: '2024-06-02 09:00:00',
    receivedAt: '2024-06-04 10:00:00',
    createdAt: '2024-06-02 08:00:00',
    updatedAt: '2024-06-04 10:00:00',
    createdBy: 'ven-user-001',
    updatedBy: 'admin',
  },
];
