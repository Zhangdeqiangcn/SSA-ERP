// 表单流转 & 供应商全流程相关类型。
// 这些接口的原始定义位于 mock 数据文件 src/mocks/data/flowData.ts（与业务数据同源），
// 此处统一再导出，使 `@/types` 可直接引用，避免各页面重复从 mock 文件导入类型。
export type {
  InspectionNotice,
  VendorOrderConfirm,
  DeliveryShipment,
  VendorQualityIssue,
  VendorImprovementReport,
  VendorStatement,
  VendorInvoiceRequest,
} from '@/mocks/data/flowData';
