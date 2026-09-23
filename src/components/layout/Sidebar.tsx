import React, { useState, useMemo, useEffect } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Collapse, Box, Tooltip, Divider, Typography, Badge,
  IconButton, Chip, useMediaQuery, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Button, Snackbar, Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import {
  Dashboard, Inventory2, People, Person, ShoppingCart, Warehouse, Settings,
  ExpandLess, ExpandMore, AssignmentTurnedIn, Category, ListAlt, Rule,
  Block, Star, Approval, RequestQuote, LocalShipping, Assignment,
  MoveToInbox, CallReceived, Inventory, PlaylistAddCheck, FactCheck,
  ReportProblem, Autorenew, BarChart, ChecklistRtl, AccountTree,
  AttachMoney, PrecisionManufacturing, Route, EventNote, QueryStats,
  AccountBalance, Receipt, CreditCard, MenuBook, Summarize, Assessment,
  VerifiedUser, QrCode2, OpenInNew, MonetizationOn, CompareArrows,
  PersonSearch, Storefront, Analytics, Workspaces, TrackChanges,
  Science, Schedule, Hub, Description,
  SwapHoriz as SwapHorizIcon, Timeline as TimelineIcon, Savings,
  AccountBalanceWallet, Lock, Layers, ChangeCircle, Outbound, Speed,
  Build, Insights, ViewTimeline, Article, FilterAlt,
  Chat, WarningAmber, AddCircle, Check, Close,
  Undo, NotificationsActive, SwitchAccount,
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/i18n/useTranslation';
import { GROUP_LABEL_KEY } from '@/i18n/catalog';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useMaterialApprovalStore } from '@/stores/materialApprovalStore';
import { useVendorStore } from '@/stores/vendorStore';
import { usePriceStore } from '@/stores/priceStore';
import {
  useApprovalInstanceStore,
  MODULE_BY_APPROVAL_TYPE,
} from '@/stores/approvalInstanceStore';
import { approvalModuleLabel } from '@/types/approval';
import { authHeaders } from '@/utils/authHeaders';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 72;

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  badge?: number;
  adminOnly?: boolean;
}

interface MenuGroup {
  groupLabel?: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    items: [
      { label: '仪表盘', icon: <Dashboard />, path: '/' },
      { label: '个人中心', icon: <Workspaces />, path: '/profile' },
    ],
  },
  {
    groupLabel: '主数据',
    items: [
      {
        label: '物料管理', icon: <Inventory2 />,
        children: [
          { label: '物料分类', icon: <Category />, path: '/material/categories' },
          { label: '物料列表', icon: <ListAlt />, path: '/material/list' },
          { label: '评估类与价控', icon: <Layers />, path: '/material/valuation' },
        ],
      },
      {
        label: '供应商管理', icon: <People />, badge: 2,
        children: [
          { label: '供应商列表', icon: <ListAlt />, path: '/vendor/list' },
          { label: '黑名单', icon: <Block />, path: '/vendor/blacklist' },
          { label: '评级管理', icon: <Star />, path: '/vendor/rating' },
          { label: '绩效考核', icon: <Assessment />, path: '/vendor/performance' },
          { label: '风险评分', icon: <WarningAmber />, path: '/vendor/risk' },
          { label: '供应商门户', icon: <OpenInNew />, path: '/vendor-portal/login' },
        ],
      },
    ],
  },
  {
    groupLabel: '供应链',
    items: [
      {
        label: '采购管理', icon: <ShoppingCart />,
        children: [
          { label: '采购申请', icon: <RequestQuote />, path: '/purchase/requests' },
          { label: '采购订单', icon: <Assignment />, path: '/purchase/orders' },
          { label: '交期跟踪', icon: <LocalShipping />, path: '/purchase/track' },
          { label: '框架协议', icon: <Description />, path: '/purchase/framework' },
          { label: '采购信息记录', icon: <Description />, path: '/purchase/info-records' },
          { label: '货源清单', icon: <ListAlt />, path: '/purchase/source-list' },
          { label: '采购退货', icon: <SwapHorizIcon />, path: '/purchase/returns' },
        ],
      },
      {
        label: '价格管理', icon: <MonetizationOn />,
        children: [
          { label: '询价单', icon: <RequestQuote />, path: '/price/inquiry' },
          { label: '比价单', icon: <CompareArrows />, path: '/price/comparisons' },
          { label: '价目表', icon: <AttachMoney />, path: '/price/list' },
        ],
      },
      {
        label: '仓储物流', icon: <Warehouse />,
        children: [
          { label: '报检单', icon: <VerifiedUser />, path: '/warehouse/inspection-notice' },
          { label: '采购入库', icon: <MoveToInbox />, path: '/warehouse/inbound' },
          { label: '成品入库', icon: <QrCode2 />, path: '/warehouse/fg-inbound' },
          { label: '出库管理', icon: <CallReceived />, path: '/warehouse/outbound' },
          { label: '库存盘点', icon: <PlaylistAddCheck />, path: '/warehouse/check' },
          { label: '库存查询', icon: <Inventory />, path: '/warehouse/inventory' },
          { label: '批次管理', icon: <QrCode2 />, path: '/warehouse/batch' },
          { label: '库龄分析', icon: <Schedule />, path: '/warehouse/aging' },
          { label: '条码打印', icon: <QrCode2 />, path: '/warehouse/barcode' },
          { label: '仓库主数据', icon: <Warehouse />, path: '/warehouse/master' },
          { label: '跨组织转储', icon: <SwapHorizIcon />, path: '/warehouse/transfer' },
          { label: '库存调整', icon: <Rule />, path: '/warehouse/adjustment' },
          { label: '序列号/HU', icon: <QrCode2 />, path: '/warehouse/serial' },
          { label: '批次追溯穿透', icon: <AccountTree />, path: '/warehouse/trace' },
          { label: '寄售库存', icon: <Storefront />, path: '/warehouse/consignment' },
          { label: '波次RFID', icon: <QrCode2 />, path: '/warehouse/wave-rfid' },
        ],
      },
    ],
  },
  {
    groupLabel: '销售管理',
    items: [
      {
        label: '销售管理', icon: <Storefront />,
        children: [
          { label: '意向客户', icon: <PersonSearch />, path: '/sales/prospects' },
          { label: '客户主数据', icon: <Person />, path: '/sales/customers' },
          { label: '销售订单', icon: <Assignment />, path: '/sales/orders' },
          { label: '销售合同', icon: <Article />, path: '/sales/contracts' },
          { label: '物流发货', icon: <LocalShipping />, path: '/sales/logistics' },
          { label: '销售报价', icon: <RequestQuote />, path: '/sales/quotation' },
          { label: '销售开票', icon: <Receipt />, path: '/sales/invoices' },
          { label: '销售退货', icon: <SwapHorizIcon />, path: '/sales/returns' },
          { label: '可用量承诺', icon: <QueryStats />, path: '/sales/atp' },
          { label: '销售漏斗', icon: <FilterAlt />, path: '/sales/funnel' },
          { label: '返利管理', icon: <MonetizationOn />, path: '/sales/rebates' },
          { label: '客户ABC分析', icon: <Star />, path: '/sales/customer-abc' },
          { label: '三方销售', icon: <Storefront />, path: '/sales/triparty' },
        ],
      },
      {
        label: '市场分析', icon: <Analytics />, path: '/sales/analysis',
      },
      {
        label: '项目管理', icon: <Workspaces />, path: '/sales/projects',
      },
    ],
  },
  {
    groupLabel: '生产与质量',
    items: [
      {
        label: '质量管理', icon: <FactCheck />, badge: 3,
        children: [
          { label: '检验任务', icon: <ChecklistRtl />, path: '/quality/inspection', badge: 3 },
          { label: '检验标准', icon: <Rule />, path: '/quality/standards' },
          { label: 'AQL抽样', icon: <ChecklistRtl />, path: '/quality/aql' },
          { label: '检验批/COQ', icon: <ChecklistRtl />, path: '/quality/inspection-lot' },
          { label: '不合格品', icon: <ReportProblem />, path: '/quality/unqualified' },
          { label: 'PDCA改进', icon: <Autorenew />, path: '/quality/pdca' },
          { label: '8D问题求解', icon: <ChecklistRtl />, path: '/quality/8d' },
          { label: 'SPC控制图', icon: <Insights />, path: '/quality/spc' },
          { label: '实验室设备', icon: <Science />, path: '/quality/lab' },
          { label: 'FMEA分析', icon: <WarningAmber />, path: '/quality/fmea' },
          { label: 'COA合格证', icon: <VerifiedUser />, path: '/quality/coa' },
          { label: '质量报表', icon: <BarChart />, path: '/quality/report' },
        ],
      },
      {
        label: 'BOM管理', icon: <AccountTree />,
        children: [
          { label: 'BOM列表', icon: <ListAlt />, path: '/bom/list' },
          { label: '成本卷积', icon: <AttachMoney />, path: '/bom/cost-rollup' },
        ],
      },
      {
        label: '生产管理', icon: <PrecisionManufacturing />,
        children: [
          { label: '工单管理', icon: <EventNote />, path: '/production/orders' },
          { label: '工艺路线', icon: <Route />, path: '/production/routes' },
          { label: 'MRP计划', icon: <Assignment />, path: '/production/mrp' },
          { label: '生产报表', icon: <QueryStats />, path: '/production/report' },
          { label: '产能排产', icon: <Hub />, path: '/production/capacity' },
          { label: '工序报工', icon: <PlaylistAddCheck />, path: '/production/operation-reporting' },
          { label: 'WIP看板', icon: <Hub />, path: '/production/wip' },
          { label: '成本归集', icon: <AttachMoney />, path: '/production/cost' },
          { label: 'APS排程', icon: <Schedule />, path: '/production/aps' },
          { label: '生产版本', icon: <Layers />, path: '/production/versions' },
          { label: '工程变更ECN', icon: <ChangeCircle />, path: '/production/ecn' },
          { label: '委外加工', icon: <Outbound />, path: '/production/subcontract' },
          { label: 'CRP产能计划', icon: <Speed />, path: '/production/crp' },
          { label: '设备工装', icon: <Build />, path: '/production/equipment' },
          { label: 'MTO生成', icon: <PlaylistAddCheck />, path: '/production/mto' },
          { label: '详细排程', icon: <TimelineIcon />, path: '/production/scheduling' },
          { label: '甘特排产', icon: <ViewTimeline />, path: '/production/gantt' },
          { label: '工序SPC', icon: <Insights />, path: '/production/spc' },
          { label: '重复制造', icon: <Hub />, path: '/production/repetitive' },
          { label: 'MES集成', icon: <ViewTimeline />, path: '/production/mes' },
          { label: 'S&OP销售与运营计划', icon: <CompareArrows />, path: '/production/sop' },
        ],
      },
    ],
  },
  {
    groupLabel: '财务与报表',
    items: [
      {
        label: '财务管理', icon: <AccountBalance />, badge: 2,
        children: [
          { label: '发票管理', icon: <Receipt />, path: '/finance/invoices', badge: 2 },
          { label: '付款计划', icon: <CreditCard />, path: '/finance/payments' },
          { label: '会计分录', icon: <MenuBook />, path: '/finance/entries' },
          { label: '科目余额表', icon: <Summarize />, path: '/finance/trial-balance' },
          { label: '科目表', icon: <ListAlt />, path: '/finance/chart-accounts' },
          { label: '凭证列表', icon: <MenuBook />, path: '/finance/vouchers' },
          { label: '三单匹配', icon: <CompareArrows />, path: '/finance/three-way' },
          { label: '财务报表', icon: <BarChart />, path: '/finance/report' },
          { label: '税务核算', icon: <AttachMoney />, path: '/finance/tax' },
          { label: '项目核算', icon: <TrackChanges />, path: '/finance/project-accounting' },
          { label: '现金流量表', icon: <Summarize />, path: '/finance/cash-flow' },
          { label: '汇率管理', icon: <SwapHorizIcon />, path: '/finance/exchange-rates' },
          { label: '账龄分析', icon: <TimelineIcon />, path: '/finance/aging' },
          { label: '辅助核算', icon: <AccountTree />, path: '/finance/auxiliary' },
          { label: '预算控制', icon: <Savings />, path: '/finance/budget' },
          { label: '三大财务报表', icon: <BarChart />, path: '/finance/statements' },
          { label: '合并报表', icon: <AccountBalance />, path: '/finance/consolidated' },
          { label: '固定资产', icon: <AccountBalanceWallet />, path: '/finance/fixed-assets' },
          { label: '期末结账', icon: <Lock />, path: '/finance/closing' },
          { label: '应收管理', icon: <CallReceived />, path: '/finance/receivables' },
          { label: '应付管理', icon: <Outbound />, path: '/finance/payables' },
          { label: 'COPA获利分析', icon: <Assessment />, path: '/finance/copa' },
          { label: '资金管理', icon: <AccountBalanceWallet />, path: '/finance/cash' },
          { label: 'BI集成', icon: <Insights />, path: '/finance/bi' },
          { label: 'ESG报告', icon: <Summarize />, path: '/finance/esg' },
        ],
      },
    ],
  },
  {
    groupLabel: '分析与报表',
    items: [
      {
        label: '报表中心', icon: <Assessment />,
        children: [
          { label: '报表中心', icon: <ListAlt />, path: '/reports' },
          { label: '报表设计器', icon: <Description />, path: '/reports/designer' },
          { label: 'BI自助分析', icon: <Analytics />, path: '/reports/bi' },
        ],
      },
      { label: '报表权限与订阅', icon: <Assessment />, path: '/reports/permissions', adminOnly: true },
      { label: '经营驾驶舱', icon: <Insights />, path: '/analytics/cockpit' },
      { label: '需求预测与补货', icon: <Analytics />, path: '/analytics/forecast' },
      { label: '发票OCR与凭证', icon: <Receipt />, path: '/analytics/ocr' },
      { label: 'ChatBI对话分析', icon: <Chat />, path: '/analytics/chatbi' },
      { label: '异常检测预警', icon: <WarningAmber />, path: '/analytics/alerts' },
      { label: '价格趋势分析', icon: <TimelineIcon />, path: '/analytics/price' },
    ],
  },
  {
    items: [
      { label: '系统设置', icon: <Settings />, path: '/settings' },
    ],
  },
  {
    groupLabel: '测试与诊断',
    items: [
      { label: '全流程自检', icon: <Science />, path: '/test/flow' },
      { label: '使用说明书', icon: <MenuBook />, path: '/help/manual' },
    ],
  },
];

// ── 待审批项目类型定义 ────────────────────────────────────────────────
interface PendingApprovalItem {
  id: string;
  flowName: string; // 审批流程名称
  title: string;    // 标题/内容摘要
  subtitle?: string; // 副标题
  time: string;     // 提交时间
  type: 'purchase' | 'material' | 'vendor' | 'price' | 'finance' | 'warehouse' | 'sales' | 'custom'; // 类型
}

// ── 动态审批中心 ────────────────────────────────────────────────────
//
// V3.17.9 修复差距 9/10/11 后，这里承担三件事，且都**有服务端权威**：
//   ① 待我审批：业务 store 的待办 + 服务端审批实例（含「别人委托给我的」）；
//   ② 我提交的：可撤回、可催办 —— 这两个动作以前完全没有，提交错了只能等审批人拒绝；
//   ③ 委托管理：出差/请假时把审批权交给同事，委托期内由他代批。
//
// 设计取舍：待办列表仍以业务 store 为主源（各模块状态散落、短期不重构），
// 只有「撤回/催办/委托」走服务端实例表 —— 这三件事本来就没有本地替代品。
const ApprovalCenterSection: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submittedOpen, setSubmittedOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' | 'info' } | null>(null);

  // 委托管理对话框
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [delegateForm, setDelegateForm] = useState({
    delegateId: '', delegateName: '', module: '', startDate: '', endDate: '', reason: '',
  });
  const [userOptions, setUserOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);

  const { purchaseRequests } = usePurchaseStore();
  const { materialApplications } = useMaterialApprovalStore();
  const { vendors } = useVendorStore();
  const { priceApprovals } = usePriceStore();
  const currentUserId = useAuthStore((s) => s.currentUser?.id);
  const {
    pendingForMe, submittedByMe, delegatedToMe, delegators,
    myDelegates, loadAll,
    approve: approveInstance, reject: rejectInstance,
    withdraw: withdrawInstance, urge: urgeInstance,
    createDelegate, revokeDelegate,
  } = useApprovalInstanceStore();

  // 挂载时拉一次；登录态变化后由各页面触发 refresh（这里不轮询，避免无谓请求）
  useEffect(() => {
    void loadAll({ silent: true });
    const timer = setInterval(() => void loadAll({ silent: true }), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadAll]);

  // 聚合所有待审批项目
  const pendingItems = useMemo<PendingApprovalItem[]>(() => {
    const items: PendingApprovalItem[] = [];

    // 采购申请
    if (Array.isArray(purchaseRequests)) {
      purchaseRequests
        .filter(r => ['pending', 'reviewing'].includes(r.status))
        .forEach(r => items.push({
          id: r.id,
          flowName: '采购申请审批',
          title: r.title || '采购申请',
          subtitle: r.requestNo ? `单号：${r.requestNo}` : undefined,
          time: r.createdAt || '',
          type: 'purchase',
        }));
    }

    // 物料申请
    if (Array.isArray(materialApplications)) {
      materialApplications
        .filter(a => a.status === 'pending')
        .forEach(a => items.push({
          id: a.id,
          flowName: '物料申请审批',
          title: a.draft?.name || '新物料申请',
          subtitle: `提交人：${a.applicant || '未知'}`,
          time: a.createdAt || '',
          type: 'material',
        }));
    }

    // 供应商注册
    if (Array.isArray(vendors)) {
      vendors
        .filter(v => v.status === 'pending')
        .forEach(v => items.push({
          id: v.id,
          flowName: '供应商注册审批',
          title: v.name || '新供应商申请',
          subtitle: v.contact ? `联系人：${v.contact}` : undefined,
          time: v.createdAt || '',
          type: 'vendor',
        }));
    }

    // 价格审批
    if (Array.isArray(priceApprovals)) {
      priceApprovals
        .filter(a => a.status === 'pending' || a.status === 'reviewing')
        .forEach(a => items.push({
          id: a.id,
          flowName: '价格变更审批',
          title: a.title || a.approvalNo || '价格变更申请',
          subtitle: `申请人：${a.applicant || '未知'}`,
          time: a.applicationDate || a.createdAt || '',
          type: 'price',
        }));
    }

    // 按时间倒序排列
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [purchaseRequests, materialApplications, vendors, priceApprovals]);

  const totalCount = pendingItems.length;

  // 我提交且仍在审批中的实例 —— 这些才能撤回/催办
  const myInFlight = useMemo(
    () => submittedByMe.filter((i) => i.status === 'pending'),
    [submittedByMe],
  );

  // 走了委托落到我头上的实例（currentApprover ≠ 配置审批人）
  const delegatedIds = useMemo(
    () => new Set(delegatedToMe.map((i) => i.id)),
    [delegatedToMe],
  );

  if (totalCount === 0 && myInFlight.length === 0 && myDelegates.length === 0) return null;

  // 格式化时间
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}小时前`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}天前`;
      return date.toLocaleDateString('zh-CN');
    } catch {
      return '';
    }
  };

  /** 找到某个业务待办对应的服务端审批实例（有实例才谈得上服务端审批） */
  const findInstance = (item: PendingApprovalItem) => {
    const module = MODULE_BY_APPROVAL_TYPE[item.type];
    if (!module) return undefined;
    return [...pendingForMe, ...delegatedToMe].find(
      (i) => i.module === module && i.entityId === item.id,
    );
  };

  /**
   * 处理审批操作。
   *
   * 为什么不再是一句 console.log：原实现是两个 TODO 占位，按钮点下去**什么都不发生**、
   * 也不报错 —— 这类「看起来能用其实没用」的界面比缺少功能更危险（用户以为批了，
   * 单子其实还挂着）。现在的语义是：
   *   · 该单据在服务端有审批实例 → 真正调用实例的 approve/reject；
   *   · 没有实例（该模块审批仍在前端 store）→ 明确告知「请到对应页处理」并跳转，
   *     不假装成功。
   */
  const handleApprove = async (item: PendingApprovalItem) => {
    const inst = findInstance(item);
    if (!inst) {
      setToast({ msg: `「${item.title}」的审批在 ${item.flowName} 页面处理`, sev: 'info' });
      handleViewDetail(item);
      return;
    }
    const r = await approveInstance(inst.id, { version: inst.version });
    setToast(r.ok
      ? { msg: `已同意：${item.title}`, sev: 'success' }
      : { msg: r.error || '审批失败', sev: 'error' });
  };

  const handleReject = async (item: PendingApprovalItem) => {
    const inst = findInstance(item);
    if (!inst) {
      setToast({ msg: `「${item.title}」的审批在 ${item.flowName} 页面处理`, sev: 'info' });
      handleViewDetail(item);
      return;
    }
    const r = await rejectInstance(inst.id, '侧边栏快捷驳回', inst.version);
    setToast(r.ok
      ? { msg: `已驳回：${item.title}`, sev: 'success' }
      : { msg: r.error || '驳回失败', sev: 'error' });
  };

  /** 撤回：把单据收回来（服务端会同时把业务单据退回草稿） */
  const handleWithdraw = async (instanceId: string, title: string) => {
    const r = await withdrawInstance(instanceId, '提交后有误，撤回修改');
    setToast(r.ok
      ? { msg: `已撤回：${title}`, sev: 'success' }
      : { msg: r.error || '撤回失败', sev: 'error' });
  };

  /** 催办：提醒当前审批人（服务端限流，30 分钟内只能催一次） */
  const handleUrge = async (instanceId: string, title: string) => {
    const r = await urgeInstance(instanceId, '请尽快处理，谢谢');
    setToast(r.ok
      ? { msg: `已催办：${title}`, sev: 'success' }
      : { msg: r.error || '催办失败', sev: 'error' });
  };

  /** 打开委托对话框时按需拉取同组织成员名录（懒加载，避免每次进页面都请求）
   *  用 /api/org-members 而非 /api/users：后者仅管理员可访问，
   *  普通审批人拉不到人选列表，「委托」对他们等于不可用。 */
  const openDelegateDialog = async () => {
    setDelegateOpen(true);
    if (userOptions.length > 0) return;
    try {
      const res = await fetch('/api/org-members?pageSize=500', { headers: authHeaders() });
      if (!res.ok) return;
      const payload = await res.json();
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      setUserOptions(
        (list as any[])
          .filter((u) => u && u.id && u.id !== currentUserId)
          .map((u) => ({ id: String(u.id), name: String(u.name || u.username || u.id) })),
      );
    } catch {
      /* 拉不到成员列表时保持空列表，用户可手填 —— 不阻断委托 */
    }
  };

  const handleSaveDelegate = async () => {
    if (!delegateForm.delegateId || !delegateForm.startDate || !delegateForm.endDate) {
      setToast({ msg: '请填写受委托人与起止日期', sev: 'error' });
      return;
    }
    setSaving(true);
    const r = await createDelegate({
      delegateId: delegateForm.delegateId,
      delegateName: delegateForm.delegateName,
      module: delegateForm.module || null,
      startDate: delegateForm.startDate,
      endDate: delegateForm.endDate,
      reason: delegateForm.reason,
    });
    setSaving(false);
    if (r.ok) {
      setDelegateOpen(false);
      setDelegateForm({ delegateId: '', delegateName: '', module: '', startDate: '', endDate: '', reason: '' });
      setToast({ msg: '委托已建立，委托期内的待办将转交对方', sev: 'success' });
    } else {
      setToast({ msg: r.error || '建立委托失败', sev: 'error' });
    }
  };

  // 跳转到对应详情页
  const handleViewDetail = (item: PendingApprovalItem) => {
    switch (item.type) {
      case 'purchase':
        navigate('/purchase/approvals');
        break;
      case 'material':
        navigate('/material/approvals');
        break;
      case 'vendor':
        navigate('/vendor/approvals');
        break;
      case 'price':
        navigate('/price/approvals');
        break;
      default:
        break;
    }
  };

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" sx={{ display: 'block', px: 3, pb: 0.5, fontSize: '0.6875rem', fontWeight: 600, color: 'text.disabled', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        审批中心
      </Typography>
      <List sx={{ px: 0.5, py: 0 }}>
        {/* 总览按钮 */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setOpen(!open)}
            sx={{
              pl: 2, py: 1, borderRadius: 2, mx: 1, my: 0.3,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Badge badgeContent={totalCount} color="error" max={9}>
                <AssignmentTurnedIn />
              </Badge>
            </ListItemIcon>
            <ListItemText
              primary="待我审批"
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
            />
            {open ? <ExpandLess sx={{ color: 'text.disabled', fontSize: 18 }} /> : <ExpandMore sx={{ color: 'text.disabled', fontSize: 18 }} />}
          </ListItemButton>
        </ListItem>

        {/* 折叠内容 - 显示具体待审批项目 */}
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ maxHeight: 300, overflow: 'auto' }}>
            {pendingItems.map((item) => (
              <Box key={item.id} sx={{ mb: 0.5 }}>
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleApprove(item); }}
                        sx={{ color: 'success.main' }}
                      >
                        <Check fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleReject(item); }}
                        sx={{ color: 'error.main' }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                  disablePadding
                  sx={{
                    px: 3,
                    py: 0.75,
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleViewDetail(item)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                          {item.title}
                        </Typography>
                        <Chip
                          label={item.flowName}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.625rem',
                            bgcolor: 'primary.light',
                            color: 'primary.contrastText',
                          }}
                        />
                        {/* 「代批」标记：这张单是别人委托给我的，代批要看得见（责任可追溯） */}
                        {(() => {
                          const inst = findInstance(item);
                          if (!inst || !delegatedIds.has(inst.id)) return null;
                          const from = inst.originalApproverId
                            ? delegators.find((d) => d.delegatorId === inst.originalApproverId)?.delegatorName
                            : '';
                          return (
                            <Chip
                              label={from ? `代${from}批` : '代批'}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.625rem',
                                bgcolor: 'warning.light',
                                color: 'warning.contrastText',
                              }}
                            />
                          );
                        })()}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        {item.subtitle && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                            {item.subtitle}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.625rem' }}>
                          · {formatTime(item.time)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Collapse>

        {/* ── 我提交的（可撤回 / 可催办）── V3.17.9 修复差距 9/10 ── */}
        {myInFlight.length > 0 && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => setSubmittedOpen(!submittedOpen)}
                sx={{ pl: 2, py: 1, borderRadius: 2, mx: 1, my: 0.3, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <Badge badgeContent={myInFlight.length} color="info" max={9}>
                    <AssignmentTurnedIn />
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary="我提交的"
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                />
                {submittedOpen ? <ExpandLess sx={{ color: 'text.disabled', fontSize: 18 }} /> : <ExpandMore sx={{ color: 'text.disabled', fontSize: 18 }} />}
              </ListItemButton>
            </ListItem>
            <Collapse in={submittedOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ maxHeight: 260, overflow: 'auto' }}>
                {myInFlight.map((inst) => (
                  <ListItem
                    key={inst.id}
                    disablePadding
                    sx={{ px: 3, py: 0.75, borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                            {inst.title || inst.entityNo || inst.entityId}
                          </Typography>
                          <Chip
                            label={approvalModuleLabel(inst.module)}
                            size="small"
                            sx={{ height: 18, fontSize: '0.625rem', bgcolor: 'primary.light', color: 'primary.contrastText' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                            待 {inst.currentApproverName || '审批人'} 处理
                            {inst.currentNodeName ? ` · ${inst.currentNodeName}` : ''}
                            {inst.urgeCount > 0 ? ` · 已催 ${inst.urgeCount} 次` : ''}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 0.25, ml: 1 }}>
                      <Tooltip title={inst.urgeCount > 0 ? `已催办 ${inst.urgeCount} 次，30 分钟内不可再催` : '催办当前审批人'}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleUrge(inst.id, inst.title || inst.entityNo || '该单据')}
                            sx={{ color: 'warning.main' }}
                          >
                            <NotificationsActive fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="撤回（单据将退回草稿）">
                        <IconButton
                          size="small"
                          onClick={() => handleWithdraw(inst.id, inst.title || inst.entityNo || '该单据')}
                          sx={{ color: 'text.secondary' }}
                        >
                          <Undo fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}

        {/* ── 委托管理 ── V3.17.9 修复差距 11 ── */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={openDelegateDialog}
            sx={{ pl: 2, py: 0.75, borderRadius: 2, mx: 1, my: 0.3, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <SwitchAccount sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="审批委托"
              secondary={myDelegates.some((d) => d.effective) ? '委托生效中' : undefined}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              secondaryTypographyProps={{ fontSize: '0.6875rem' }}
            />
          </ListItemButton>
        </ListItem>
      </List>

      {/* ── 委托管理对话框 ── */}
      <Dialog open={delegateOpen} onClose={() => setDelegateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem' }}>审批委托</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
            委托期内，原本轮到你审批的单据会自动转交给受委托人；委托前已提交的单子也会一并转过去。
          </Typography>

          {myDelegates.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>我委托出去的</Typography>
              {myDelegates.map((d) => (
                <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                  <Chip
                    size="small"
                    label={d.effective ? '生效中' : d.active ? '未到生效日' : '已撤销'}
                    color={d.effective ? 'success' : 'default'}
                    sx={{ height: 20, fontSize: '0.625rem' }}
                  />
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8125rem' }}>
                    {d.delegateName || d.delegateId} · {d.startDate} ~ {d.endDate}
                    {d.module ? ` · ${approvalModuleLabel(d.module)}` : ' · 全部模块'}
                  </Typography>
                  {d.active === 1 && (
                    <Button size="small" onClick={() => void revokeDelegate(d.id)}>撤销</Button>
                  )}
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
            </Box>
          )}

          <Typography variant="subtitle2" sx={{ mb: 1 }}>新建委托</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              select
              size="small"
              label="受委托人"
              value={delegateForm.delegateId}
              onChange={(e) => {
                const id = e.target.value;
                const u = userOptions.find((x) => x.id === id);
                setDelegateForm((f) => ({ ...f, delegateId: id, delegateName: u?.name || '' }));
              }}
              helperText={userOptions.length === 0 ? '未能加载用户列表，可在下方直接填写姓名' : undefined}
            >
              {userOptions.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="受委托人姓名（用户列表加载失败时手填）"
              value={delegateForm.delegateName}
              onChange={(e) => setDelegateForm((f) => ({ ...f, delegateName: e.target.value }))}
            />
            <TextField
              select
              size="small"
              label="委托范围"
              value={delegateForm.module}
              onChange={(e) => setDelegateForm((f) => ({ ...f, module: e.target.value }))}
            >
              <MenuItem value="">全部模块</MenuItem>
              {Object.entries({ purchase_request: '采购申请', price_approval: '价格变更', material_application: '物料申请', vendor_profile: '供应商注册', sales_order: '销售订单' }).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                type="date"
                label="开始日期"
                InputLabelProps={{ shrink: true }}
                value={delegateForm.startDate}
                onChange={(e) => setDelegateForm((f) => ({ ...f, startDate: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="date"
                label="结束日期"
                InputLabelProps={{ shrink: true }}
                value={delegateForm.endDate}
                onChange={(e) => setDelegateForm((f) => ({ ...f, endDate: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              size="small"
              label="事由（如：出差）"
              value={delegateForm.reason}
              onChange={(e) => setDelegateForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelegateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveDelegate} disabled={saving}>
            {saving ? '保存中…' : '建立委托'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.sev || 'info'} onClose={() => setToast(null)} variant="filled">
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ── 菜单自定义落地 ──────────────────────────────────────────────────
const applyMenuConfig = (groups: MenuGroup[], cfg: { order?: Record<string, number>; visible?: Record<string, boolean> } | null | undefined): MenuGroup[] => {
  if (!cfg || (!cfg.order && !cfg.visible)) return groups;
  const order = cfg.order || {};
  const visible = cfg.visible || {};
  const byOrder = (a: MenuItem, b: MenuItem) => (order[a.path ?? ''] ?? 9999) - (order[b.path ?? ''] ?? 9999);
  return groups
    .map((g) => {
      const items = g.items
        .map((item) => {
          if (item.children) {
            const children = item.children
              .filter((c) => visible[c.path ?? ''] !== false)
              .sort(byOrder);
            return children.length ? { ...item, children } : null;
          }
          if (visible[item.path ?? ''] === false) return null;
          return item;
        })
        .filter((x): x is MenuItem => x !== null)
        .sort(byOrder);
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);
};

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const mobileOpen = useUIStore((state) => state.mobileOpen);
  const setMobileOpen = useUIStore((state) => state.setMobileOpen);
  const menuConfig = useSettingsStore((state) => state.menuConfig);
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { currentUser } = useAuthStore();
  const { t, nav } = useTranslation();
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const L = React.useCallback(
    (zh: string, path?: string) => (path ? nav(path, zh) : zh),
    [nav],
  );
  void t;

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleToggle = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = !!item.children?.length;
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.path);

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.label} title={L(item.label, item.path)} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              component={item.path ? NavLink : 'button'}
              to={item.path || undefined}
              aria-label={L(item.label, item.path)}
              onClick={hasChildren ? () => handleToggle(item.label) : (isMobile ? () => setMobileOpen(false) : undefined)}
              selected={active}
              sx={{
                minHeight: 44, justifyContent: 'center', px: 2.5,
                borderRadius: 2, mx: 1, my: 0.3,
                '&.Mui-selected': {
                  bgcolor: alpha(p, 0.12), color: p,
                  '& .MuiListItemIcon-root': { color: p },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: 0, justifyContent: 'center', color: active ? p : 'text.secondary' }}>
                <Badge badgeContent={item.badge} color="error" max={9}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14 } }}>
                  {item.icon}
                </Badge>
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </Tooltip>
      );
    }

    return (
      <React.Fragment key={item.label}>
        <ListItem disablePadding>
          <ListItemButton
            component={item.path ? NavLink : 'button'}
            to={item.path || undefined}
            aria-label={L(item.label, item.path)}
            onClick={hasChildren ? () => handleToggle(item.label) : (isMobile ? () => setMobileOpen(false) : undefined)}
            selected={active}
            sx={{
              pl: level === 0 ? 2 : 3.5,
              py: level === 0 ? 1 : 0.8,
              borderRadius: 2, mx: 1, my: 0.3,
              position: 'relative',
              '&.Mui-selected': {
                bgcolor: alpha(p, 0.12), color: p,
                '&::before': {
                  content: '""', position: 'absolute',
                  left: 4, top: '25%', bottom: '25%',
                  width: 3, borderRadius: 4, bgcolor: p,
                },
                '& .MuiListItemIcon-root': { color: p },
              },
              '&:hover:not(.Mui-selected)': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: active ? p : 'text.secondary' }}>
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error" max={9}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14 } }}>
                  {item.icon}
                </Badge>
              ) : item.icon}
            </ListItemIcon>
            <ListItemText
              primary={L(item.label, item.path)}
              primaryTypographyProps={{
                fontSize: level === 0 ? '0.875rem' : '0.8125rem',
                fontWeight: active ? 600 : level === 0 ? 500 : 400,
                color: active ? p : level === 0 ? 'text.primary' : 'text.secondary',
              }}
            />
            {hasChildren && (
              isExpanded
                ? <ExpandLess sx={{ color: 'text.disabled', fontSize: 18 }} />
                : <ExpandMore sx={{ color: 'text.disabled', fontSize: 18 }} />
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const effectiveWidth = isMobile
    ? DRAWER_WIDTH
    : isTablet
      ? DRAWER_COLLAPSED_WIDTH
      : sidebarCollapsed
        ? DRAWER_COLLAPSED_WIDTH
        : DRAWER_WIDTH;

  const visibleMenuGroups = isAdmin
    ? menuGroups
    : menuGroups
        .map((g) => ({
          ...g,
          items: g.items
            .map((item) => {
              if (item.adminOnly) return null;
              if (item.children) {
                const children = item.children.filter((c) => !c.adminOnly);
                return children.length ? { ...item, children } : null;
              }
              return item;
            })
            .filter((x): x is MenuItem => x !== null),
        }))
        .filter((g) => g.items.length > 0);

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : undefined}
      onClose={() => setMobileOpen(false)}
      ModalProps={isMobile ? { keepMounted: true } : undefined}
      sx={{
        width: effectiveWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: effectiveWidth,
          boxSizing: 'border-box',
          top: 64,
          height: 'calc(100% - 64px)',
          transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
          overflowX: 'hidden',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', py: 1 }}>
        {/* 动态审批中心 */}
        {!sidebarCollapsed && <ApprovalCenterSection />}
        
        {applyMenuConfig(visibleMenuGroups, menuConfig).map((group, gIdx) => (
          <Box key={gIdx}>
            {/* 分组标题 */}
            {group.groupLabel && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block', px: 3, pt: gIdx === 0 ? 1 : 2, pb: 0.5,
                  fontSize: '0.6875rem', fontWeight: 600,
                  color: 'text.disabled', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >
                {t(GROUP_LABEL_KEY[group.groupLabel] ?? group.groupLabel, group.groupLabel)}
              </Typography>
            )}
            {group.groupLabel && sidebarCollapsed && gIdx > 0 && (
              <Divider sx={{ mx: 2, my: 1, borderColor: 'divider' }} />
            )}
            <List sx={{ px: 0.5, py: 0 }}>
              {group.items.map((item) => renderMenuItem(item))}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'divider', mx: 2, mt: 'auto' }} />
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem', letterSpacing: '0.05em' }}>
          {sidebarCollapsed ? '' : 'SSA ERP · 钢材供应链管理平台'}
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
