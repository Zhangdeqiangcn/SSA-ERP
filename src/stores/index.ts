// 业务 store 统一出口，便于测试/聚合引用
export { useMaterialStore } from './materialStore';
export { useVendorStore } from './vendorStore';
export { useCustomerStore } from './customerStore';
export { usePurchaseStore } from './purchaseStore';
export { usePriceStore } from './priceStore';
export { useAutomationStore } from './automationStore';
// C5 销售价目表 / 折扣 / 促销
export { useSalesPriceStore } from './salesPriceStore';
export { useWarehouseStore } from './warehouseStore';
export { useQualityStore } from './qualityStore';
export { useBOMStore } from './bomStore';
export { useProductionStore } from './productionStore';
export {
  useProductionOperationStore,
  mapCenter,
  DEFAULT_CENTER_NAMES,
  CENTER_COLORS,
  DEFAULT_WORK_CENTERS,
  DEFAULT_LABOR_RATE,
  DEFAULT_MACHINE_RATE,
} from './productionOperationStore';
export { useSalesStore } from './salesStore';
export { useFinanceStore } from './financeStore';
export {
  useFinanceExtensionStore,
  getExchangeRate,
  convertCurrency,
  BASE_CURRENCY_CODE,
} from './financeExtensionStore';
export { useFinanceLedgerStore } from './financeLedgerStore';
export { useProductionVersionStore } from './productionVersionStore';
export { useSubcontractStore } from './subcontractStore';
export { useEquipmentStore } from './equipmentStore';
export { useProductionSchedulingStore } from './productionSchedulingStore';
export type { SchedulingMode, ConflictInfo, RescheduleResult } from './productionSchedulingStore';
export { useFlowStore } from './flowStore';
export { useVendorPerformanceStore } from './vendorPerformanceStore';
export { useVendorPortalStore } from './vendorPortalStore';
export { useDataDictStore } from './dataDictStore';
export { useOrgStore, useCurrentOrg } from './orgStore';
// C3 统一编号规则中心 + 数据权限（行级/组织级）
export { useNumberingStore, DOC_TYPES, type DocType, type NumberingRule } from './numberingStore';
export {
  useDataPermissionStore,
  passDataPermission,
  type PermissionMode,
  type DataPermissionState,
} from './dataPermissionStore';
export { useWarehouseMasterStore, selectWarehousesByOrg, WAREHOUSE_TYPE_LABELS } from './warehouseMasterStore';
export {
  useCustomFieldStore,
  useCustomFields,
  makeFieldKey,
  CUSTOM_FIELD_ENTITY_LABELS,
  CUSTOM_FIELD_TYPE_LABELS,
} from './customFieldStore';
export { usePrintTemplateStore } from './printTemplateStore';
export { useApprovalFlowStore, DEFAULT_APPROVAL_FLOWS } from './approvalFlowStore';
export { useUnitConversionStore } from './unitConversionStore';
export { useOrderTemplateStore } from './orderTemplateStore';
export { useUserStore } from './userStore';
// C7 服务端化：多用户会话 + 落库审计
export { useSessionStore, currentUser, type SessionInfo } from './sessionStore';
export { useAuditStore, recordAudit, AUDIT_ACTION_LABELS, type AuditRecord, type AuditAction } from './auditStore';
export { useSettingsStore } from './settingsStore';
// P3-3 供应链深化：5 个新增 persist store
export { useSalesAdvancedStore } from './salesAdvancedStore';
export { usePurchaseAdvancedStore } from './purchaseAdvancedStore';
export { useWarehouseAdvancedStore } from './warehouseAdvancedStore';
export { useQualityAdvancedStore } from './qualityAdvancedStore';
export { useMaterialExtensionStore } from './materialExtensionStore';
// 采购信息记录（P0-05）
export { usePurchaseInfoRecordStore } from './purchaseInfoRecordStore';
// 货源清单（P0-06）
export { useSourceListStore } from './sourceListStore';
// P3-4 质量深化：质量扩展 store（8D / SPC 控制图 / 实验室设备）
export { useQualityExtensionStore } from './qualityExtensionStore';
// P3-5 平台生态 / 低代码：6 个新增 persist store
export { useLowCodeStore } from './lowCodeStore';
export { useWorkflowStore } from './workflowStore';
export { useIntegrationStore, API_REGISTRY } from './integrationStore';
// V2.86.0 字段权限统一到 dataPermissionStore 引擎（原 fieldPermissionStore 已废弃）
export { maskValue } from './dataPermissionStore';
export { useI18nStore, I18N_DICT, translate } from './i18nStore';
export { useReportPermissionStore } from './reportPermissionStore';
// P3-6 智能分析：分析 store（预测建议 / OCR 凭证历史）
export { useAnalyticsStore } from './analyticsStore';
// P4-4 角色工作区与通知中心：实时通知聚合 + 待办汇总
export { useNotificationStore, useNotificationData } from './notificationStore';
export { useMessageStore, isMine } from './messageStore';
// P1-12 应收应付独立管理
export { useArapStore, computeAging } from './arapStore';
// P4-1 个人工作台：个性化布局持久化
export { useWorkbenchStore, WIDGET_LIBRARY } from './workbenchStore';
// P4-3 全局列表参数体系：查询方案 / 列方案（用户级记忆）
export { useListPrefsStore } from './listPrefsStore';
// P4-2 主题与显示中心：显示偏好（明/暗主题、主题色、密度、字号、高对比）
export {
  useDisplayStore,
  DEFAULT_DISPLAY_PREFS,
  PRIMARY_OPTIONS,
  DENSITY_OPTIONS,
  FONT_SIZE_OPTIONS,
} from './displayStore';
// 条件技术引擎（P1-04）
export { useConditionStore } from './conditionStore';
// ECN 工程变更（P1-06）
export { useECNStore } from './ecnStore';
// 返利管理（P2-11）
export { useRebateStore } from './rebateStore';
// P2-15 FMEA 失效模式分析
export { useFMEAStore } from './fmeaStore';
// 寄售库存（P2-06）
export { useConsignmentStore } from './consignmentStore';
// 呆滞料处置流（P2-24）
export { useSlowMovingStore, DISPOSITION_LABEL, type SlowMovingDisposal, type DispositionAction } from './slowMovingStore';
// COA 产品合格证记录（P2-17）
export { useCOAStore, type COARecord, type COAItem } from './coaStore';
// V2.73 异常预警规则配置（前端可配阈值，对服务端/本地两种数据源同样生效）
export {
  useAlertRuleStore,
  DEFAULT_ALERT_RULES,
  getRule,
  type AlertRule,
  type AlertRuleKey,
  type AlertRuleParams,
} from './alertRuleStore';
// V2.73 数电票核验台账（历史批次留存 + OCR 联动队列）
export {
  useInvoiceVerificationStore,
  type VerifyBatch,
  type VerifyRow,
  type VerifyStatus,
  type OcrQueueItem,
} from './invoiceVerificationStore';
// V2.74.6 波次拣货 + RFID 事件（P2-07）
export { useWaveRfidStore } from './waveRfidStore';
// V2.74.6 重复制造（倒冲）（P2-08）
export { useRepetitiveMfgStore } from './repetitiveMfgStore';
// V2.74.6 MES 集成（连接/设备/WIP/报工）（P2-09）
export { useMesStore } from './mesStore';
// V2.74.7 三方销售（代销结算）（P2-12）
export { useTripartySalesStore } from './tripartySalesStore';
// V2.74.7 COPA 获利分析（P2-13）
export { useCopaStore } from './copaStore';
// V2.74.7 资金管理（账户/流水 + 余额联动）（P2-14）
export { useCashMgmtStore } from './cashMgmtStore';
// V2.74.8 S&OP 销售与运营计划（P2-10）
export { useSopStore } from './sopStore';
// V2.74.8 BI 集成（外部 BI 平台连接 / 同步）（P2-19）
export { useBiStore } from './biStore';
// V2.74.8 ESG 报告（环境/社会/治理指标）（P2-30）
export { useEsgStore } from './esgStore';
