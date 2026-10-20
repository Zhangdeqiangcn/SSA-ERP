import React, { lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import VendorPortalLayout from './components/layout/VendorPortalLayout';
import VendorLogin from './pages/Vendor/VendorLogin';
import VendorPortalRegister from './pages/Vendor/VendorPortalRegister';
import Login from './pages/Login/Login';
import { useAuthStore } from './stores/authStore';
import { useVendorStore } from './stores/vendorStore';
import { useMaterialStore } from './stores/materialStore';
import { useCustomerStore } from './stores/customerStore';
import { useWarehouseAdvancedStore } from './stores/warehouseAdvancedStore';
import { useSubcontractStore } from './stores/subcontractStore';
import { useProductionOperationStore } from './stores/productionOperationStore';
// W1 根治双通道：采购订单 / 销售订单 / 工单 / 凭证 直连真实 D1（启动期拉取在下方 useEffect）
import { usePurchaseStore } from './stores/purchaseStore';
import { useSalesStore } from './stores/salesStore';
import { useProductionStore } from './stores/productionStore';
import { useFinanceStore } from './stores/financeStore';
import { useApprovalFlowStore } from './stores/approvalFlowStore';
import { useWarehouseStore } from './stores/warehouseStore';
// Dashboard 首页含 @mui/x-charts（图表大块），改懒加载以移出首屏包；已在 MainLayout Outlet 的 Suspense 内，安全
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));

// P4-1 个人工作台：已并入个人中心（PersonalCenter 内嵌 Workbench），此处不再单独懒加载
// 主布局与门户登录保持急加载（路由外壳/入口），其余页面按需懒加载，减小首屏包体、提升运行效率
const FlowSelfTest = lazy(() => import('./pages/Test/FlowSelfTest'));
// 使用说明书（P4 帮助中心）
const UserManual = lazy(() => import('./pages/Help/UserManual'));
// V3.70.0 全局搜索结果页（顶栏搜索回车后的独立临时页）
const SearchResultsPage = lazy(() => import('./pages/Help/SearchResults'));
// 物料
const CategoryList = lazy(() => import('./pages/Material/CategoryList'));
const MaterialList = lazy(() => import('./pages/Material/MaterialList'));
const MaterialForm = lazy(() => import('./pages/Material/MaterialForm'));
const MaterialDetail = lazy(() => import('./pages/Material/MaterialDetail'));
// 供应链深化（P3-3）：评估类/价控/工厂维度
const MaterialValuation = lazy(() => import('./pages/Material/MaterialValuation'));
const MaterialApprovalQueue = lazy(() => import('./pages/Material/MaterialApprovalQueue'));
// 供应商（采购方视角）
const VendorList = lazy(() => import('./pages/Vendor/VendorList'));
const VendorRegister = lazy(() => import('./pages/Vendor/VendorRegister'));
const VendorDetail = lazy(() => import('./pages/Vendor/VendorDetail'));
const Blacklist = lazy(() => import('./pages/Vendor/Blacklist'));
const Rating = lazy(() => import('./pages/Vendor/Rating'));
const ApprovalQueue = lazy(() => import('./pages/Vendor/ApprovalQueue'));
const VendorPerformance = lazy(() => import('./pages/Vendor/VendorPerformance'));
// P2-22 供应商风险评分卡
const VendorRisk = lazy(() => import('./pages/Vendor/VendorRisk'));
// 供应商门户（独立路由）
const VendorWorkbench = lazy(() => import('./pages/Vendor/VendorWorkbench'));
const VendorOrderConfirmList = lazy(() => import('./pages/Vendor/VendorOrderConfirm'));
const DeliveryShipmentList = lazy(() => import('./pages/Vendor/DeliveryShipment'));
const VendorQualityPage = lazy(() => import('./pages/Vendor/VendorQualityPage'));
const VendorFinancePage = lazy(() => import('./pages/Vendor/VendorFinancePage'));
const VendorPaymentPlan = lazy(() => import('./pages/Vendor/VendorPaymentPlan'));
const VendorProfilePage = lazy(() => import('./pages/Vendor/VendorProfilePage'));
const VendorPermissionsPage = lazy(() => import('./pages/Vendor/VendorPermissionsPage'));
const VendorQuotation = lazy(() => import('./pages/Vendor/VendorQuotation'));
// 个人中心（账号资料 + 修改密码）
const PersonalCenter = lazy(() => import('./pages/Profile/PersonalCenter'));
// 采购
const PurchaseList = lazy(() => import('./pages/Purchase/PurchaseList'));
const PurchaseForm = lazy(() => import('./pages/Purchase/PurchaseForm'));
const PurchaseDetail = lazy(() => import('./pages/Purchase/PurchaseDetail'));
const PriceCompare = lazy(() => import('./pages/Purchase/PriceCompare'));
const OrderList = lazy(() => import('./pages/Purchase/OrderList'));
const OrderForm = lazy(() => import('./pages/Purchase/OrderForm'));
const OrderDetail = lazy(() => import('./pages/Purchase/OrderDetail'));
const OrderTrack = lazy(() => import('./pages/Purchase/OrderTrack'));
const PurchaseApproval = lazy(() => import('./pages/Purchase/PurchaseApproval'));
// 供应链深化（P3-3）：采购框架协议/退货
const FrameworkAgreement = lazy(() => import('./pages/Purchase/FrameworkAgreement'));
const PurchaseReturnPage = lazy(() => import('./pages/Purchase/PurchaseReturn'));
// 采购信息记录（P0-05）
const InfoRecordList = lazy(() => import('./pages/Purchase/InfoRecordList'));
// 货源清单（P0-06）
const SourceListPage = lazy(() => import('./pages/Purchase/SourceListPage'));
// 价格管理
const InquiryList = lazy(() => import('./pages/Price/InquiryList'));
const InquiryDetail = lazy(() => import('./pages/Price/InquiryDetail'));
const InquiryForm = lazy(() => import('./pages/Price/InquiryForm'));
const PriceComparison = lazy(() => import('./pages/Price/PriceComparison'));
const ComparisonsList = lazy(() => import('./pages/Price/ComparisonsList'));
const PriceApproval = lazy(() => import('./pages/Price/PriceApproval'));
const ApprovalList = lazy(() => import('./pages/Price/ApprovalList'));
const PriceListPage = lazy(() => import('./pages/Price/PriceList'));
// 仓储物流
const InboundList = lazy(() => import('./pages/Warehouse/InboundList'));
const InboundForm = lazy(() => import('./pages/Warehouse/InboundForm'));
const OutboundList = lazy(() => import('./pages/Warehouse/OutboundList'));
const OutboundForm = lazy(() => import('./pages/Warehouse/OutboundForm'));
const OutboundDetail = lazy(() => import('./pages/Warehouse/OutboundDetail'));
const CheckList = lazy(() => import('./pages/Warehouse/CheckList'));
const CheckTask = lazy(() => import('./pages/Warehouse/CheckTask'));
const Inventory = lazy(() => import('./pages/Warehouse/Inventory'));
const FinishedGoodsInbound = lazy(() => import('./pages/Warehouse/FinishedGoodsInbound'));
const BatchManage = lazy(() => import('./pages/Warehouse/BatchManage'));
const InventoryAging = lazy(() => import('./pages/Warehouse/InventoryAging'));
const BarcodePrint = lazy(() => import('./pages/Warehouse/BarcodePrint'));
const InspectionNoticeWarehouse = lazy(() => import('./pages/Warehouse/InspectionNotice'));
const WarehouseMaster = lazy(() => import('./pages/Warehouse/WarehouseMaster'));
// 供应链深化（P3-3）：跨组织转储/库存调整/序列号HU
const StockTransfer = lazy(() => import('./pages/Warehouse/StockTransfer'));
const InventoryAdjustment = lazy(() => import('./pages/Warehouse/InventoryAdjustment'));
const SerialHU = lazy(() => import('./pages/Warehouse/SerialHU'));
// C1 批次正反向追溯穿透视图
const TraceBatch = lazy(() => import('./pages/Warehouse/TraceBatch'));
// 设置
const Settings = lazy(() => import('./pages/Settings/Settings'));
// 质量
const InspectionList = lazy(() => import('./pages/Quality/InspectionList'));
const InspectionTask = lazy(() => import('./pages/Quality/InspectionTask'));
const UnqualifiedList = lazy(() => import('./pages/Quality/UnqualifiedList'));
const PDCAList = lazy(() => import('./pages/Quality/PDCAList'));
const QualityReport = lazy(() => import('./pages/Quality/QualityReport'));
const InspectionStandard = lazy(() => import('./pages/Quality/InspectionStandard'));
const AqlSampling = lazy(() => import('./pages/Quality/AqlSampling'));
// 供应链深化（P3-3）：检验批/COQ/批次追溯/QM评级回流
const InspectionLot = lazy(() => import('./pages/Quality/InspectionLot'));
// 质量深化（P3-4）：8D / SPC 控制图 / 实验室设备
const EightD = lazy(() => import('./pages/Quality/EightD'));
const SPCChartPage = lazy(() => import('./pages/Quality/SPCChart'));
const LabEquipment = lazy(() => import('./pages/Quality/LabEquipment'));
// P2-15 FMEA 失效模式与影响分析
const FMEA = lazy(() => import('./pages/Quality/FMEA'));
// P2-17 COA 产品合格证生成器
const COAGenerator = lazy(() => import('./pages/Quality/COAGenerator'));
// BOM
const BOMList = lazy(() => import('./pages/BOM/BOMList'));
const BOMDetail = lazy(() => import('./pages/BOM/BOMDetail'));
const BOMForm = lazy(() => import('./pages/BOM/BOMForm'));
const CostRollup = lazy(() => import('./pages/BOM/CostRollup'));
// 销售
const ProspectList = lazy(() => import('./pages/Sales/ProspectList'));
const SalesOrderList = lazy(() => import('./pages/Sales/SalesOrderList'));
const SalesOrderForm = lazy(() => import('./pages/Sales/SalesOrderForm'));
const SalesOrderDetail = lazy(() => import('./pages/Sales/SalesOrderDetail'));
// A3 客户主数据
const CustomerList = lazy(() => import('./pages/Customer/CustomerList'));
const CustomerForm = lazy(() => import('./pages/Customer/CustomerForm'));
const CustomerDetail = lazy(() => import('./pages/Customer/CustomerDetail'));
// 供应链深化（P3-3）：销售报价/开票/退货/ATP
const Quotation = lazy(() => import('./pages/Sales/Quotation'));
const SalesInvoicePage = lazy(() => import('./pages/Sales/SalesInvoice'));
const SalesReturnPage = lazy(() => import('./pages/Sales/SalesReturn'));
const ATPPage = lazy(() => import('./pages/Sales/ATP'));
// 销售合同管理（P1-13）
const SalesContractList = lazy(() => import('./pages/Sales/SalesContractList'));
const SalesContractForm = lazy(() => import('./pages/Sales/SalesContractForm'));
const SalesContractDetail = lazy(() => import('./pages/Sales/SalesContractDetail'));
const ProjectList = lazy(() => import('./pages/Sales/ProjectList'));
const ProjectDetail = lazy(() => import('./pages/Sales/ProjectDetail'));
const MarketAnalysis = lazy(() => import('./pages/Sales/MarketAnalysis'));
const SalesFunnel = lazy(() => import('./pages/Sales/SalesFunnel'));
const LogisticsList = lazy(() => import('./pages/Sales/LogisticsList'));
// 整页补齐 B 轮（P2-12 三方销售）
const TripartySalesList = lazy(() => import('./pages/Sales/TripartySalesList'));
// 生产
const WorkOrderList = lazy(() => import('./pages/Production/WorkOrderList'));
const WorkOrderDetail = lazy(() => import('./pages/Production/WorkOrderDetail'));
const ProcessRouteList = lazy(() => import('./pages/Production/ProcessRouteList'));
const MRPPlan = lazy(() => import('./pages/Production/MRPPlan'));
const ProductionReport = lazy(() => import('./pages/Production/ProductionReport'));
const CapacityScheduling = lazy(() => import('./pages/Production/CapacityScheduling'));
// 生产执行 / P2-3
const OperationReporting = lazy(() => import('./pages/Production/OperationReporting'));
const WipBoard = lazy(() => import('./pages/Production/WipBoard'));
const CostCollection = lazy(() => import('./pages/Production/CostCollection'));
const FiniteCapacity = lazy(() => import('./pages/Production/FiniteCapacity'));
// 生产深化（P3-2）
const ProductionVersions = lazy(() => import('./pages/Production/ProductionVersions'));
const ECNList = lazy(() => import('./pages/Production/ECNList'));
const Subcontract = lazy(() => import('./pages/Production/Subcontract'));
const CRP = lazy(() => import('./pages/Production/CRP'));
const Equipment = lazy(() => import('./pages/Production/Equipment'));
const MTOCreate = lazy(() => import('./pages/Production/MTOCreate'));
const DetailedScheduling = lazy(() => import('./pages/Production/DetailedScheduling'));
const ProcessSPC = lazy(() => import('./pages/Production/ProcessSPC'));
const GanttSchedule = lazy(() => import('./pages/Production/GanttSchedule'));
// 整页补齐 A 轮（P2-07/08/09）
const WaveRfidList = lazy(() => import('./pages/Warehouse/WaveRfidList'));
const LogisticsWaybill = lazy(() => import('./pages/Warehouse/LogisticsWaybill'));
const RepetitiveMfgList = lazy(() => import('./pages/Production/RepetitiveMfgList'));
const MesIntegrationList = lazy(() => import('./pages/Production/MesIntegrationList'));
const SopPlan = lazy(() => import('./pages/Production/SopPlan'));
// 财务
const InvoiceList = lazy(() => import('./pages/Finance/InvoiceList'));
const PaymentPlanPage = lazy(() => import('./pages/Finance/PaymentPlan'));
const AccountingEntries = lazy(() => import('./pages/Finance/AccountingEntries'));
const TrialBalance = lazy(() => import('./pages/Finance/TrialBalance'));
const ChartOfAccounts = lazy(() => import('./pages/Finance/ChartOfAccounts'));
const VoucherList = lazy(() => import('./pages/Finance/VoucherList'));
const VoucherTemplateList = lazy(() => import('./pages/Finance/VoucherTemplateList'));
const ThreeWayMatch = lazy(() => import('./pages/Finance/ThreeWayMatch'));
const FinanceReport = lazy(() => import('./pages/Finance/FinanceReport'));
const TaxAccounting = lazy(() => import('./pages/Finance/TaxAccounting'));
const ProjectAccounting = lazy(() => import('./pages/Finance/ProjectAccounting'));
const CashFlowStatement = lazy(() => import('./pages/Finance/CashFlowStatement'));
// 应收应付独立管理（P1-12）
const ReceivableList = lazy(() => import('./pages/Finance/ReceivableList'));
const PayableList = lazy(() => import('./pages/Finance/PayableList'));
// 整页补齐 B 轮（P2-13 COPA 获利分析 / P2-14 资金管理）
const CopaAnalysis = lazy(() => import('./pages/Finance/CopaAnalysis'));
const CashMgmtList = lazy(() => import('./pages/Finance/CashMgmtList'));
const BiIntegration = lazy(() => import('./pages/Finance/BiIntegration'));
const EsgReport = lazy(() => import('./pages/Finance/EsgReport'));
// 财务深化（P2-5）
const FxConfig = lazy(() => import('./pages/Settings/FxConfig'));
const AgingReport = lazy(() => import('./pages/Finance/AgingReport'));
const AuxiliaryAccounting = lazy(() => import('./pages/Finance/AuxiliaryAccounting'));
const BudgetControl = lazy(() => import('./pages/Finance/BudgetControl'));
// 财务深化（P3-1）
const FinancialStatements = lazy(() => import('./pages/Finance/FinancialStatements'));
const FixedAssets = lazy(() => import('./pages/Finance/FixedAssets'));
const PeriodClosing = lazy(() => import('./pages/Finance/PeriodClosing'));
// C2 合并报表 / 多账簿（V3.13.0）
const ConsolidatedReport = lazy(() => import('./pages/Finance/ConsolidatedReport'));
// 报表
const ReportCenter = lazy(() => import('./pages/Reports/ReportCenter'));
const ReportDesigner = lazy(() => import('./pages/Reports/ReportDesigner'));
const BISelfService = lazy(() => import('./pages/Reports/BISelfService'));
// 平台能力（低代码 / 工作流 / 集成 / 字段权限 / 多语言 / 报表权限）—— 现统一并入系统设置 › OA流程定制 等分组
const LowCodeDesigner = lazy(() => import('./pages/Platform/LowCodeDesigner'));
const WorkflowEngine = lazy(() => import('./pages/Platform/WorkflowEngine'));
const IntegrationHub = lazy(() => import('./pages/Platform/IntegrationHub'));
const FieldPermissions = lazy(() => import('./pages/Platform/FieldPermissions'));
const I18nSettings = lazy(() => import('./pages/Platform/I18nSettings'));
const DataCapacity = lazy(() => import('./pages/Platform/DataCapacity'));
const ReportPermissions = lazy(() => import('./pages/Reports/ReportPermissions'));
// 智能分析（P3-6）：经营驾驶舱 / 需求预测与智能补货 / 发票 OCR 与智能凭证
const AnalyticsCockpit = lazy(() => import('./pages/Analytics/Cockpit'));
const DemandForecast = lazy(() => import('./pages/Analytics/Forecast'));
const InvoiceOcr = lazy(() => import('./pages/Analytics/InvoiceOcr'));
// P2 智能分析
const ChatBI = lazy(() => import('./pages/Analytics/ChatBI'));
const AlertMonitor = lazy(() => import('./pages/Analytics/AlertMonitor'));
// P2-25 价格趋势分析
const PriceAnalysis = lazy(() => import('./pages/Analytics/PriceAnalysis'));
// P2-11 返利管理
const RebateManager = lazy(() => import('./pages/Sales/RebateManager'));
// P2-26 客户ABC分析
const CustomerABC = lazy(() => import('./pages/Sales/CustomerABC'));
// P2-06 寄售采购
const ConsignmentStock = lazy(() => import('./pages/Warehouse/ConsignmentStock'));
// P2-06 发票批量核验
const InvoiceVerification = lazy(() => import('./pages/Analytics/InvoiceVerification'));
// V2.78.0 移动门户（PWA /m，独立于 MainLayout；真扫码入库）
const MobilePortalLayout = lazy(() => import('./mobile/MobilePortalLayout'));
const MobileHome = lazy(() => import('./mobile/MobileHome'));
const MobileInbound = lazy(() => import('./mobile/MobileInbound'));
const MobileOutbound = lazy(() => import('./mobile/MobileOutbound'));
const MobileStocktake = lazy(() => import('./mobile/MobileStocktake'));
const MobileQuality = lazy(() => import('./mobile/MobileQuality'));
const MobileMessages = lazy(() => import('./mobile/MobileMessages'));

// 登录门禁：未登录则跳转登录页（authStore 本地持久化，刷新后免登录）。
// DEV 下不强制：vite dev 供 E2E 回归与离线演示以「未登录纯前端模式」直达业务页（老用例均按此假设编写，
// 且 App 设计本身支持未登录本地数据）；生产构建（import.meta.env.DEV=false）仍强制登录。
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated && !import.meta.env.DEV) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

import GlobalErrorToast from '@/components/common/GlobalErrorToast';

function App() {
  // ★★ V3.10.1 修复「登录页频繁刷新、无法登录」（严重缺陷，根因见下）
  //
  // 缺陷链（三层叠加，缺一不可）：
  //   ① 本 useEffect 挂在 <App> 顶层，**位于所有路由之外** → 打开 /login 也会执行；
  //   ② 启动期这批 load() 全部直连业务端点，**未登录时必然 401**；
  //      且它们走的是各自的服务层（apiService / xxxApi），**不经过 persistStorage**，
  //      所以拿不到 persistStorage 里那层「无 token 直接回退本地」的保护；
  //   ③ persistStorage 收到 401 → handleUnauthorized() → authStore 执行
  //      `window.location.href = '/login'`（**整页跳转**）。整页加载会把模块级
  //      变量 `expiredHandled` 重置为 false，于是 /login 上的这批请求再次 401、
  //      再次整页跳转 → **无限刷新循环，用户根本没机会输入密码**。
  //
  // 修法：启动拉取本身是「登录后才有意义」的动作，**必须由登录态驱动**。
  //   未登录（含停在 /login 时）一律不拉，登录成功后的整页重载会自然带上 token 再拉。
  //   这也是各 store 内部 `load()` 的语义前提（它们都按「有会话」编写）。
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // 未登录：不发起任何业务拉取（避免 401 → 会话失效 → 整页跳转的循环）
    if (!isAuthenticated) return;
    // V3.15.0：登录态启动时先从 /api/auth/me 刷新当前用户资料，
    //   补齐「部门/邮箱/备用邮箱/手机号」等登录接口历史未返回的字段，
    //   否则已登录的旧会话会一直显示「未设置/未绑定」。
    useAuthStore.getState().refreshUser();
    // V2.74.3/V2.74.5：启动即拉取主数据（直连 D1，与开放网关同源）；离线/未登录回退内存 mock。
    // 物料/客户/供应商三张主数据表全收口到 D1，根治 app_state Blob 双通道。
    useVendorStore.getState().loadVendors();
    useMaterialStore.getState().loadMaterials();
    useCustomerStore.getState().loadCustomers();
    // W1-B1：序列号 / 委外订单直连 D1（根治双通道），启动期拉取
    useWarehouseAdvancedStore.getState().loadSerialMasters();
    useSubcontractStore.getState().loadOrders();
    // W1 根治双通道：采购订单 / 销售订单 / 工单 / 凭证 直连真实 D1 关系表
    usePurchaseStore.getState().loadPurchaseOrders();
    // C1 采购域关系化（V3.11.0）：采购申请 / 供应商报价 两个切片从 app_state
    // 大对象迁入 D1 关系表（申请含 items 明细、报价含 quoteItems 明细）。
    // 与 loadPurchaseOrders 分开调用、互不覆盖 —— 三个切片三条独立回填标记，
    // 合并会让「订单拉取失败」误伤另两个切片的状态。
    usePurchaseStore.getState().load();
    // C1 销售域关系化（V3.9.0）：意向客户/发货单/项目 三个切片从 app_state
    // 大对象迁入 D1 关系表；load() 内含 loadSalesOrders()，取代单独调用（避免重复拉取）。
    useSalesStore.getState().load();
    // C1 生产域关系化（V3.12.0）：工艺路线（带 operations 嵌套）+ MRP 建议（平表）
    // 两个切片从 app_state 大对象迁入 D1 关系表；load() 内含 loadWorkOrders()，
    // 取代单独调用（避免重复拉取）。
    // ★ 注意：工单（workOrders）早在 V2.75.x 就已直连 D1，本轮**不重复处理** ——
    //   「生产域」这个说法容易误导，真正还在 Blob 里的只有上面两个切片。
    useProductionStore.getState().load();
    // ★ V3.46.0 第2批③：生产运营域落库（工序报工 / 工作中心 / 成本费率）。
    //   此前这三类数据只存在用户浏览器里 —— 换台电脑费率就变、报工就看不到，
    //   于是「同一批产品的成本」在不同机器上算出不同数字且无法复算。
    //   载入放在启动期，与其它主数据同批，避免首屏先显示本机旧值再跳变。
    useProductionOperationStore.getState().load();
    // C1 财务域关系化（V3.8.0）：发票/付款计划/分录/税务/项目核算/科目 六个切片
    // 从 app_state 大对象迁入 D1 关系表；load() 内含凭证拉取，取代原 loadVouchers()。
    useFinanceStore.getState().load();
    // C1 审批流域关系化（V3.10.0）：20 个流程定义 + 全部节点从 app_state
    // 大对象迁入 D1 关系表。这是**公司级公共配置**，必须在启动期同步，
    // 否则「张三关掉的审批、李四那边照走」这类配置不一致会长期潜伏。
    useApprovalFlowStore.getState().load();
    // W1 仓库战役：入库单/出库单直连真实 D1（根治 Blob 双通道），启动期拉取
    useWarehouseStore.getState().loadWarehouseOrders();
    // V2.81.0 盘点任务直连真实 D1（根治 Blob 双通道），启动期拉取
    useWarehouseStore.getState().loadCheckTasks();
    // V2.82.0 库存预警/产成品入库直连真实 D1（根治 Blob 双通道最后两块），启动期拉取
    useWarehouseStore.getState().loadInventoryAlerts();
    useWarehouseStore.getState().loadFinishedGoodsInbounds();
    // W2 收尾：仓库高级三切片（转储/调整/质检扣留）直连真实 D1（根治 Blob 双通道），启动期拉取
    useWarehouseAdvancedStore.getState().loadWarehouseAdvanced();
    // 依赖 isAuthenticated：登录成功后的整页重载会以 true 重新进入，
    // 从而在「已建立会话」的前提下完成这批拉取。
  }, [isAuthenticated]);
  return (
    <>
    <Routes>
      {/* ── 登录页 ───────────────────────────────────── */}
      <Route path="/login" element={<Login />} />

      {/* ── 供应商门户（独立路由，不在 MainLayout 内）─────── */}
      <Route path="/vendor-portal/login" element={<VendorLogin />} />
      <Route path="/vendor-portal/register" element={<VendorPortalRegister />} />
      <Route path="/vendor-portal" element={<VendorPortalLayout />}>
        <Route index element={<VendorWorkbench />} />
        {/* 订单管理 */}
        <Route path="orders/confirm" element={<VendorOrderConfirmList />} />
        <Route path="orders/shipment" element={<DeliveryShipmentList />} />
        {/* 质量管理 */}
        <Route path="quality" element={<Navigate to="/vendor-portal/quality/issues" replace />} />
        <Route path="quality/issues" element={<VendorQualityPage />} />
        <Route path="quality/8d" element={<VendorQualityPage />} />
        {/* 财务管理 */}
        <Route path="finance" element={<Navigate to="/vendor-portal/finance/statements" replace />} />
        <Route path="finance/statements" element={<VendorFinancePage />} />
        <Route path="finance/invoices" element={<VendorFinancePage />} />
        <Route path="finance/payments" element={<VendorPaymentPlan />} />
        {/* 企业管理 */}
        <Route path="profile" element={<VendorProfilePage />} />
        <Route path="permissions" element={<VendorPermissionsPage />} />
        {/* 询价报价 */}
        <Route path="quotation" element={<VendorQuotation />} />
      </Route>

      {/* ── 移动门户（PWA，独立路由；V2.78.0 真扫码入库）──── */}
      <Route path="/m" element={<MobilePortalLayout />}>
        <Route index element={<MobileHome />} />
        <Route path="inbound" element={<MobileInbound />} />
        <Route path="outbound" element={<MobileOutbound />} />
        <Route path="stocktake" element={<MobileStocktake />} />
        <Route path="quality" element={<MobileQuality />} />
        <Route path="messages" element={<MobileMessages />} />
      </Route>

      {/* ── 主 ERP 系统（MainLayout，需登录）──────────────── */}
      <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        {/* P4-1 个人工作台：已并入个人中心，保留 /workbench 路径重定向以兼容旧书签 */}
        <Route path="workbench" element={<Navigate to="/profile" replace />} />
        {/* 个人中心（个人工作台 + 个人资料 + 账号安全 合并页） */}
        <Route path="profile" element={<PersonalCenter />} />
        {/* 物料管理 */}
        <Route path="material" element={<Navigate to="/material/list" replace />} />
        <Route path="material/categories" element={<CategoryList />} />
        <Route path="material/list" element={<MaterialList />} />
        <Route path="material/approvals" element={<MaterialApprovalQueue />} />
        <Route path="material/create" element={<MaterialForm />} />
        <Route path="material/:id" element={<MaterialDetail />} />
        <Route path="material/:id/edit" element={<MaterialForm />} />
        {/* 供应链深化（P3-3）：评估类/价控/工厂维度 */}
        <Route path="material/valuation" element={<MaterialValuation />} />
        {/* 供应商管理（采购方视角）*/}
        <Route path="vendor" element={<Navigate to="/vendor/list" replace />} />
        <Route path="vendor/list" element={<VendorList />} />
        <Route path="vendor/register" element={<VendorRegister />} />
        <Route path="vendor/:id" element={<VendorDetail />} />
        <Route path="vendor/blacklist" element={<Blacklist />} />
        <Route path="vendor/rating" element={<Rating />} />
        <Route path="vendor/performance" element={<VendorPerformance />} />
        <Route path="vendor/risk" element={<VendorRisk />} />
        <Route path="vendor/approvals" element={<ApprovalQueue />} />
        {/* 采购管理 */}
        <Route path="purchase" element={<Navigate to="/purchase/requests" replace />} />
        <Route path="purchase/requests" element={<PurchaseList />} />
        <Route path="purchase/create" element={<PurchaseForm />} />
        <Route path="purchase/:id/edit" element={<PurchaseForm />} />
        <Route path="purchase/:id" element={<PurchaseDetail />} />
        <Route path="purchase/compare/:id" element={<PriceCompare />} />
        <Route path="purchase/orders" element={<OrderList />} />
        <Route path="purchase/orders/create" element={<OrderForm />} />
        <Route path="purchase/orders/:id/edit" element={<OrderForm />} />
        <Route path="purchase/orders/:id" element={<OrderDetail />} />
        <Route path="purchase/track" element={<OrderTrack />} />
        <Route path="purchase/approvals" element={<PurchaseApproval />} />
        {/* 供应链深化（P3-3）：框架协议/退货 */}
        <Route path="purchase/framework" element={<FrameworkAgreement />} />
        <Route path="purchase/returns" element={<PurchaseReturnPage />} />
        <Route path="purchase/info-records" element={<InfoRecordList />} />
        <Route path="purchase/source-list" element={<SourceListPage />} />
        {/* 价格管理 */}
        <Route path="price" element={<Navigate to="/price/inquiry" replace />} />
        <Route path="price/inquiry" element={<InquiryList />} />
        <Route path="price/inquiry/create" element={<InquiryForm />} />
        <Route path="price/inquiry/:id" element={<InquiryDetail />} />
        <Route path="price/comparisons" element={<ComparisonsList />} />
        <Route path="price/comparison/new/:inquiryId" element={<PriceComparison />} />
        <Route path="price/comparison/:id" element={<PriceComparison />} />
        <Route path="price/approvals" element={<ApprovalList />} />
        <Route path="price/approval/new" element={<PriceApproval />} />
        <Route path="price/approval/:id" element={<PriceApproval />} />
        <Route path="price/list" element={<PriceListPage />} />
        {/* 仓储物流（含报检单）*/}
        <Route path="warehouse" element={<Navigate to="/warehouse/inbound" replace />} />
        <Route path="warehouse/inspection-notice" element={<InspectionNoticeWarehouse />} />  {/* ← 报检单在此 */}
        <Route path="warehouse/inbound" element={<InboundList />} />
        <Route path="warehouse/inbound/create" element={<InboundForm />} />
        <Route path="warehouse/outbound" element={<OutboundList />} />
        <Route path="warehouse/outbound/create" element={<OutboundForm />} />
        <Route path="warehouse/outbound/:id" element={<OutboundDetail />} />
        <Route path="warehouse/fg-inbound" element={<FinishedGoodsInbound />} />
        <Route path="warehouse/check" element={<CheckList />} />
        <Route path="warehouse/check/:id" element={<CheckTask />} />
        <Route path="warehouse/inventory" element={<Inventory />} />
        <Route path="warehouse/batch" element={<BatchManage />} />
        <Route path="warehouse/aging" element={<InventoryAging />} />
        <Route path="warehouse/barcode" element={<BarcodePrint />} />
        <Route path="warehouse/master" element={<WarehouseMaster />} />
        {/* 供应链深化（P3-3）：跨组织转储/库存调整/序列号HU */}
        <Route path="warehouse/transfer" element={<StockTransfer />} />
        <Route path="warehouse/adjustment" element={<InventoryAdjustment />} />
        <Route path="warehouse/serial" element={<SerialHU />} />
        {/* C1 批次正反向追溯穿透视图 */}
        <Route path="warehouse/trace" element={<TraceBatch />} />
        {/* P2-06 寄售采购 */}
        <Route path="warehouse/consignment" element={<ConsignmentStock />} />
        {/* 质量管理（检验任务从仓库报检流入，不含报检单）*/}
        <Route path="quality" element={<Navigate to="/quality/inspection" replace />} />
        <Route path="quality/inspection" element={<InspectionList />} />
        <Route path="quality/inspection/:id" element={<InspectionTask />} />
        <Route path="quality/inspection/:id/execute" element={<InspectionTask />} />
        <Route path="quality/unqualified" element={<UnqualifiedList />} />
        <Route path="quality/pdca" element={<PDCAList />} />
        <Route path="quality/report" element={<QualityReport />} />
        <Route path="quality/standards" element={<InspectionStandard />} />
        <Route path="quality/aql" element={<AqlSampling />} />
        {/* 供应链深化（P3-3）：检验批/COQ/批次追溯/QM评级回流 */}
        <Route path="quality/inspection-lot" element={<InspectionLot />} />
        {/* 质量深化（P3-4）：8D / SPC 控制图 / 实验室设备 */}
        <Route path="quality/8d" element={<EightD />} />
        <Route path="quality/spc" element={<SPCChartPage />} />
        <Route path="quality/lab" element={<LabEquipment />} />
        {/* P2-15 FMEA 分析 */}
        <Route path="quality/fmea" element={<FMEA />} />
        {/* P2-17 COA 产品合格证 */}
        <Route path="quality/coa" element={<COAGenerator />} />
        {/* BOM */}
        <Route path="bom" element={<Navigate to="/bom/list" replace />} />
        <Route path="bom/list" element={<BOMList />} />
        <Route path="bom/create" element={<BOMForm />} />
        <Route path="bom/:id/edit" element={<BOMForm />} />
        <Route path="bom/cost-rollup" element={<CostRollup />} />
        <Route path="bom/:id" element={<BOMDetail />} />
        {/* 销售管理 */}
        <Route path="sales" element={<Navigate to="/sales/prospects" replace />} />
        <Route path="sales/prospects" element={<ProspectList />} />
        <Route path="sales/customers" element={<CustomerList />} />
        <Route path="sales/customers/create" element={<CustomerForm />} />
        <Route path="sales/customers/:id/edit" element={<CustomerForm />} />
        <Route path="sales/customers/:id" element={<CustomerDetail />} />
        <Route path="sales/orders" element={<SalesOrderList />} />
        <Route path="sales/orders/create" element={<SalesOrderForm />} />
        <Route path="sales/orders/:id/edit" element={<SalesOrderForm />} />
        <Route path="sales/orders/:id" element={<SalesOrderDetail />} />
        <Route path="sales/analysis" element={<MarketAnalysis />} />
        <Route path="sales/funnel" element={<SalesFunnel />} />
        <Route path="sales/projects" element={<ProjectList />} />
        <Route path="sales/projects/:id" element={<ProjectDetail />} />
        <Route path="sales/logistics" element={<LogisticsList />} />
        {/* 供应链深化（P3-3）：报价/开票/退货/ATP */}
        <Route path="sales/quotation" element={<Quotation />} />
        <Route path="sales/invoices" element={<SalesInvoicePage />} />
        <Route path="sales/returns" element={<SalesReturnPage />} />
        <Route path="sales/atp" element={<ATPPage />} />
        {/* 销售合同管理（P1-13） */}
        <Route path="sales/contracts" element={<SalesContractList />} />
        <Route path="sales/contracts/create" element={<SalesContractForm />} />
        <Route path="sales/contracts/:id/edit" element={<SalesContractForm />} />
        <Route path="sales/contracts/:id" element={<SalesContractDetail />} />
        {/* P2-11 返利管理 */}
        <Route path="sales/rebates" element={<RebateManager />} />
        {/* P2-26 客户ABC分析 */}
        <Route path="sales/customer-abc" element={<CustomerABC />} />
        {/* 整页补齐 B 轮（P2-12 三方销售） */}
        <Route path="sales/triparty" element={<TripartySalesList />} />
        {/* 生产管理 */}
        <Route path="production" element={<Navigate to="/production/orders" replace />} />
        <Route path="production/orders" element={<WorkOrderList />} />
        <Route path="production/orders/:id" element={<WorkOrderDetail />} />
        <Route path="production/routes" element={<ProcessRouteList />} />
        <Route path="production/mrp" element={<MRPPlan />} />
        <Route path="production/report" element={<ProductionReport />} />
        <Route path="production/capacity" element={<CapacityScheduling />} />
        {/* 生产执行（P2-3） */}
        <Route path="production/operation-reporting" element={<OperationReporting />} />
        <Route path="production/wip" element={<WipBoard />} />
        <Route path="production/cost" element={<CostCollection />} />
        <Route path="production/aps" element={<FiniteCapacity />} />
        {/* 生产深化（P3-2） */}
        <Route path="production/versions" element={<ProductionVersions />} />
        <Route path="production/ecn" element={<ECNList />} />
        <Route path="production/subcontract" element={<Subcontract />} />
        <Route path="production/crp" element={<CRP />} />
        <Route path="production/equipment" element={<Equipment />} />
        <Route path="production/mto" element={<MTOCreate />} />
        <Route path="production/scheduling" element={<DetailedScheduling />} />
        <Route path="production/spc" element={<ProcessSPC />} />
        <Route path="production/gantt" element={<GanttSchedule />} />
        {/* 整页补齐 A 轮（P2-07/08/09） */}
        <Route path="warehouse/wave-rfid" element={<WaveRfidList />} />
        {/* P1-6 电商物流面单 / 轨迹看板 */}
        <Route path="warehouse/waybill" element={<LogisticsWaybill />} />
        <Route path="production/repetitive" element={<RepetitiveMfgList />} />
        <Route path="production/mes" element={<MesIntegrationList />} />
        <Route path="production/sop" element={<SopPlan />} />
        {/* 财务管理 */}
        <Route path="finance" element={<Navigate to="/finance/invoices" replace />} />
        <Route path="finance/invoices" element={<InvoiceList />} />
        <Route path="finance/payments" element={<PaymentPlanPage />} />
        <Route path="finance/entries" element={<AccountingEntries />} />
        <Route path="finance/trial-balance" element={<TrialBalance />} />
        <Route path="finance/chart-accounts" element={<ChartOfAccounts />} />
        <Route path="finance/vouchers" element={<VoucherList />} />
        <Route path="finance/voucher-templates" element={<VoucherTemplateList />} />
        <Route path="finance/three-way" element={<ThreeWayMatch />} />
        <Route path="finance/report" element={<FinanceReport />} />
        <Route path="finance/tax" element={<TaxAccounting />} />
        <Route path="finance/project-accounting" element={<ProjectAccounting />} />
        <Route path="finance/cash-flow" element={<CashFlowStatement />} />
        {/* 财务深化（P2-5） */}
        <Route path="finance/exchange-rates" element={<FxConfig />} />
        <Route path="finance/aging" element={<AgingReport />} />
        <Route path="finance/auxiliary" element={<AuxiliaryAccounting />} />
        <Route path="finance/budget" element={<BudgetControl />} />
        {/* 应收应付独立管理（P1-12） */}
        <Route path="finance/receivables" element={<ReceivableList />} />
        <Route path="finance/payables" element={<PayableList />} />
        {/* 整页补齐 B 轮（P2-13 COPA 获利分析 / P2-14 资金管理） */}
        <Route path="finance/copa" element={<CopaAnalysis />} />
        <Route path="finance/cash" element={<CashMgmtList />} />
        <Route path="finance/bi" element={<BiIntegration />} />
        <Route path="finance/esg" element={<EsgReport />} />
        {/* 财务深化（P3-1）：三大财务报表 + 固定资产 + 期末结账 */}
        <Route path="finance/statements" element={<FinancialStatements />} />
        <Route path="finance/fixed-assets" element={<FixedAssets />} />
        <Route path="finance/closing" element={<PeriodClosing />} />
        {/* C2 合并报表 / 多账簿（V3.13.0） */}
        <Route path="finance/consolidated" element={<ConsolidatedReport />} />
        {/* 报表中心 */}
        <Route path="reports" element={<ReportCenter />} />
        <Route path="reports/designer" element={<ReportDesigner />} />
        <Route path="reports/bi" element={<BISelfService />} />
        {/* 报表权限与订阅（现并入系统设置 › 数据与运维） */}
        <Route path="reports/permissions" element={<ReportPermissions />} />
        {/* 平台能力页面（现统一在系统设置内以 Tab 形式直达，路由保留以兼容深链） */}
        <Route path="platform/lowcode" element={<LowCodeDesigner />} />
        <Route path="platform/workflow" element={<WorkflowEngine />} />
        <Route path="platform/integrations" element={<IntegrationHub />} />
        <Route path="platform/field-permissions" element={<FieldPermissions />} />
        <Route path="platform/i18n" element={<I18nSettings />} />
        {/* A5 数据容量守护：60 个业务域的大对象体积监控 */}
        <Route path="platform/data-capacity" element={<DataCapacity />} />
        {/* 智能分析（P3-6）：经营驾驶舱 / 需求预测补货 / 发票 OCR 凭证 */}
        <Route path="analytics" element={<Navigate to="/analytics/cockpit" replace />} />
        <Route path="analytics/cockpit" element={<AnalyticsCockpit />} />
        <Route path="analytics/forecast" element={<DemandForecast />} />
        <Route path="analytics/ocr" element={<InvoiceOcr />} />
        <Route path="analytics/chatbi" element={<ChatBI />} />
        <Route path="analytics/alerts" element={<AlertMonitor />} />
        {/* P2-25 价格趋势分析 */}
        <Route path="analytics/price" element={<PriceAnalysis />} />
        <Route path="analytics/invoice-verify" element={<InvoiceVerification />} />
        {/* 系统设置 */}
        <Route path="settings" element={<Settings />} />
        <Route path="test/flow" element={<FlowSelfTest />} />
        {/* 使用说明书 */}
        <Route path="help/manual" element={<UserManual />} />
        <Route path="help/search-results" element={<SearchResultsPage />} />
      </Route>
    </Routes>
    <GlobalErrorToast />
    </>
  );
}

export default App;
