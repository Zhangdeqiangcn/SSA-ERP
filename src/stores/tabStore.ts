/**
 * 多标签页管理 Store
 * 用于主 ERP 系统和供应商门户同时打开多个页面/表单
 * P4-6：接入 persist 实现「顶栏多 Tab 会话持久化」（刷新后保留已打开标签）
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TabItem {
  id: string;       // 唯一标识 = path
  label: string;    // 标签显示名
  path: string;     // 路由路径
  icon?: string;    // 可选的图标标识
}

interface TabState {
  tabs: TabItem[];
  activeTabId: string | null;
  addTab: (tab: TabItem) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (id: string) => void;
}

/** 路径→标签名映射（通用） */
const PATH_LABEL_MAP: Record<string, string> = {
  '/': '仪表盘',
  '/material/list': '物料列表',
  '/material/categories': '物料分类',
  '/material/code-rules': '物料分类',
  '/vendor/list': '供应商列表',
  '/vendor/register': '供应商注册',
  '/vendor/approvals': '准入审核',
  '/vendor/blacklist': '供应商黑名单',
  '/vendor/rating': '供应商评级',
  '/purchase/requests': '采购申请',
  '/purchase/orders': '采购订单',
  '/purchase/track': '交期跟踪',
  '/warehouse/inspection-notice': '报检单',
  '/warehouse/inbound': '采购入库',
  '/warehouse/outbound': '出库管理',
  '/warehouse/check': '库存盘点',
  '/warehouse/inventory': '库存查询',
  '/warehouse/fg-inbound': '成品入库',
  '/quality/inspection': '检验任务',
  '/quality/unqualified': '不合格品',
  '/quality/pdca': 'PDCA改进',
  '/quality/report': '质量报表',
  '/quality/standards': '检验标准',
  '/bom/list': 'BOM列表',
  '/bom/cost-rollup': '成本卷积',
  '/production/orders': '工单管理',
  '/production/routes': '工艺路线',
  '/production/mrp': 'MRP计划',
  '/production/report': '生产报表',
  '/finance/invoices': '发票管理',
  '/finance/payments': '付款计划',
  '/finance/entries': '会计分录',
  '/finance/trial-balance': '科目余额表',
  '/finance/report': '财务报表',
  '/reports': '报表中心',
  '/settings': '系统设置',

  // 供应商门户
  '/vendor-portal': '供应商工作台',
  '/vendor-portal/orders/confirm': '订单确认',
  '/vendor-portal/orders/shipment': '发货物流',
  '/vendor-portal/quality/issues': '质量问题单',
  '/vendor-portal/quality/8d': '8D改善报告',
  '/vendor-portal/finance/statements': '对账单管理',
  '/vendor-portal/finance/invoices': '开票申请',
  '/vendor-portal/finance/payments': '付款计划查询',
  '/vendor-portal/profile': '供应商资料',
  '/vendor-portal/permissions': '权限管理',
};

/** 根据路径获取标签名 */
export function getTabLabel(path: string): string {
  // 精确匹配
  if (PATH_LABEL_MAP[path]) return PATH_LABEL_MAP[path];
  // 动态路由匹配（例如 /material/MAT001, /purchase/P001）
  if (path.startsWith('/material/') && !path.includes('/edit')) return '物料详情';
  if (path.includes('/edit')) return '物料编辑';
  if (path.startsWith('/material/create')) return '新建物料';
  if (path.startsWith('/vendor/') && path !== '/vendor/list' && path !== '/vendor/register' && path !== '/vendor/approvals' && path !== '/vendor/blacklist' && path !== '/vendor/rating') return '供应商详情';
  if (path.startsWith('/purchase/') && path !== '/purchase/requests' && path !== '/purchase/orders' && path !== '/purchase/track' && path !== '/purchase/create' && !path.includes('compare')) return '采购详情';
  if (path.startsWith('/purchase/create')) return '新建采购申请';
  if (path.includes('compare')) return '比价分析';
  if (path.startsWith('/warehouse/inbound/create')) return '新建入库单';
  if (path.startsWith('/warehouse/outbound/create')) return '新建出库单';
  if (path.startsWith('/warehouse/check/')) return '盘点任务';
  if (path.startsWith('/quality/inspection/')) return '检验任务详情';
  if (path.startsWith('/bom/')) return 'BOM详情';
  if (path.startsWith('/production/orders/')) return '工单详情';
  // fallback
  const seg = path.split('/').filter(Boolean).pop() || '';
  return seg || '未命名页面';
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (tab) => {
        set((state) => {
          const exists = state.tabs.find((t) => t.path === tab.path);
          if (exists) {
            // 已存在则仅切换激活
            return { activeTabId: tab.id };
          }
          // 限制最多打开 15 个标签（防内存溢出）
          const newTabs = state.tabs.length >= 15
            ? [...state.tabs.slice(state.tabs.length - 14), tab]
            : [...state.tabs, tab];
          return { tabs: newTabs, activeTabId: tab.id };
        });
      },

      removeTab: (id) => {
        set((state) => {
          const idx = state.tabs.findIndex((t) => t.id === id);
          const newTabs = state.tabs.filter((t) => t.id !== id);
          let newActive = state.activeTabId;
          if (state.activeTabId === id) {
            // 激活相邻的标签
            if (newTabs.length === 0) {
              newActive = null;
            } else if (idx >= newTabs.length) {
              newActive = newTabs[newTabs.length - 1].id;
            } else {
              newActive = newTabs[Math.max(0, idx > 0 ? idx - 1 : 0)].id;
            }
          }
          return { tabs: newTabs, activeTabId: newActive };
        });
      },

      setActiveTab: (id) => set({ activeTabId: id }),

      closeAllTabs: () => set({ tabs: [], activeTabId: null }),

      closeOtherTabs: (id) => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.id === id),
          activeTabId: id,
        }));
      },
    }),
    {
      name: 'ssa-erp-tabs',
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
    }
  )
);
