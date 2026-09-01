import React, { lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import VendorPortalLayout from './components/layout/VendorPortalLayout';
import VendorLogin from './pages/Vendor/VendorLogin';
import VendorPortalRegister from './pages/Vendor/VendorPortalRegister';
import Login from './pages/Login/Login';
import { useAuthStore } from './stores/authStore';
import { useVendorStore } from './stores/vendorStore';
// Dashboard 首页含 @mui/x-charts（图表大块），改懒加载以移出首屏包；已在 MainLayout Outlet 的 Suspense 内，安全
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
// P4-1 个人工作台
const Workbench = lazy(() => import('./pages/Workbench/Workbench'));

// 主布局与门户登录保持急加载（路由外壳/入口），其余页面按需懒加载，减小首屏包体、提升运行效率
const FlowSelfTest = lazy(() => import('./pages/Test/FlowSelfTest'));
// 使用说明书（P4 帮助中心）
const UserManual = lazy(() => import('./pages/Help/UserManual'));
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
// 财务
const InvoiceList = lazy(() => import('./pages/Finance/InvoiceList'));
const PaymentPlanPage = lazy(() => import('./pages/Finance/PaymentPlan'));
const AccountingEntries = lazy(() => import('./pages/Finance/AccountingEntries'));
const TrialBalance = lazy(() => import('./pages/Finance/TrialBalance'));
const ChartOfAccounts = lazy(() => import('./pages/Finance/ChartOfAccounts'));
const VoucherList = lazy(() => import('./pages/Finance/VoucherList'));
const ThreeWayMatch = lazy(() => import('./pages/Finance/ThreeWayMatch'));
const FinanceReport = lazy(() => import('./pages/Finance/FinanceReport'));
const TaxAccounting = lazy(() => import('./pages/Finance/TaxAccounting'));
const ProjectAccounting = lazy(() => import('./pages/Finance/ProjectAccounting'));
const CashFlowStatement = lazy(() => import('./pages/Finance/CashFlowStatement'));
// 应收应付独立管理（P1-12）
const ReceivableList = lazy(() => import('./pages/Finance/ReceivableList'));
const PayableList = lazy(() => import('./pages/Finance/PayableList'));
// 财务深化（P2-5）
const FxConfig = lazy(() => import('./pages/Settings/FxConfig'));
const AgingReport = lazy(() => import('./pages/Finance/AgingReport'));
const AuxiliaryAccounting = lazy(() => import('./pages/Finance/AuxiliaryAccounting'));
const BudgetControl = lazy(() => import('./pages/Finance/BudgetControl'));
// 财务深化（P3-1）
const FinancialStatements = lazy(() => import('./pages/Finance/FinancialStatements'));
const FixedAssets = lazy(() => import('./pages/Finance/FixedAssets'));
const PeriodClosing = lazy(() => import('./pages/Finance/PeriodClosing'));
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

// 登录门禁：未登录则跳转登录页（authStore 本地持久化，刷新后免登录）。
// DEV 下不强制：vite dev 供 E2E 回归与离线演示以「未登录纯前端模式」直达业务页（老用例均按此假设编写，
// 且 App 设计本身支持未登录本地数据）；生产构建（import.meta.env.DEV=false）仍强制登录。
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated && !import.meta.env.DEV) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  // V2.74.3：启动即拉取供应商主数据（直连 D1 vendor_master，与网关同源）；离线/未登录回退内存 mockVendors。
  useEffect(() => {
    useVendorStore.getState().loadVendors();
  }, []);
  return (
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

      {/* ── 主 ERP 系统（MainLayout，需登录）──────────────── */}
      <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        {/* P4-1 个人工作台 */}
        <Route path="workbench" element={<Workbench />} />
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
        {/* 财务管理 */}
        <Route path="finance" element={<Navigate to="/finance/invoices" replace />} />
        <Route path="finance/invoices" element={<InvoiceList />} />
        <Route path="finance/payments" element={<PaymentPlanPage />} />
        <Route path="finance/entries" element={<AccountingEntries />} />
        <Route path="finance/trial-balance" element={<TrialBalance />} />
        <Route path="finance/chart-accounts" element={<ChartOfAccounts />} />
        <Route path="finance/vouchers" element={<VoucherList />} />
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
        {/* 财务深化（P3-1）：三大财务报表 + 固定资产 + 期末结账 */}
        <Route path="finance/statements" element={<FinancialStatements />} />
        <Route path="finance/fixed-assets" element={<FixedAssets />} />
        <Route path="finance/closing" element={<PeriodClosing />} />
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
      </Route>
    </Routes>
  );
}

export default App;
