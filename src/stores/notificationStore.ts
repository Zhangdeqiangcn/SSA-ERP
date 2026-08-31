// P4-4 角色工作区与通知中心：实时聚合业务待办/预警的通知 store
// 聚合来源：financeStore（逾期/待付款、发票待验证）、warehouseStore（库存告急）、
// vendorStore（供应商待审）、qualityStore（检验任务）、materialStore（安全库存对照）
// 用户级状态（已读 / 已忽略）持久化到 localStorage（键 ssa-erp-notify），不持久化业务数据本身。
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { useMemo } from 'react';
import { useFinanceStore } from './financeStore';
import { useWarehouseStore } from './warehouseStore';
import { useVendorStore } from './vendorStore';
import { useQualityStore } from './qualityStore';
import { useMaterialStore } from './materialStore';

export type NotifyLevel = 'error' | 'warning' | 'info' | 'success';

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  level: NotifyLevel;
  path: string;
  time: string;
  category: string;
  source: 'biz' | 'system';
  read: boolean;
  dismissible: boolean;
}

export interface TodoCategory {
  key: string;
  label: string;
  count: number;
  level: NotifyLevel;
  path: string;
}

interface NotificationState {
  readIds: Record<string, boolean>;
  dismissedIds: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  dismiss: (id: string) => void;
  reset: () => void;
}

// 系统级固定公告：非业务数据，read/dismiss 状态持久化
const SYSTEM_NOTICES: Omit<AppNotification, 'read'>[] = [
  {
    id: 'sys:welcome',
    title: '欢迎使用 SSA ERP',
    desc: '个人工作台已上线，可在此集中处理待办与预警。',
    level: 'info',
    path: '/workbench',
    time: '系统公告',
    category: 'system',
    source: 'system',
    dismissible: true,
  },
  {
    id: 'sys:p4',
    title: 'P4 体验升级',
    desc: '新增主题中心、通知中心、个人工作台与无障碍支持。',
    level: 'success',
    path: '/settings',
    time: '系统公告',
    category: 'system',
    source: 'system',
    dismissible: true,
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      readIds: {},
      dismissedIds: [],
      markRead: (id) => set((s) => ({ readIds: { ...s.readIds, [id]: true } })),
      markAllRead: (ids) =>
        set((s) => {
          const next = { ...s.readIds };
          (ids ?? []).forEach((id) => {
            next[id] = true;
          });
          return { readIds: next };
        }),
      dismiss: (id) =>
        set((s) =>
          s.dismissedIds.includes(id)
            ? s
            : { dismissedIds: [...s.dismissedIds, id] }
        ),
      reset: () => set({ readIds: {}, dismissedIds: [] }),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-notify',
      partialize: (s) => ({ readIds: s.readIds, dismissedIds: s.dismissedIds }),
    }
  )
);

/**
 * 实时聚合业务待办/预警 + 系统公告 → 通知列表与待办汇总。
 * 订阅各业务 store 切片，数据变化时自动重算（响应式）。
 */
export function useNotificationData(): {
  notifications: AppNotification[];
  summary: TodoCategory[];
} {
  const invoices = useFinanceStore((s) => s.invoices);
  const paymentPlans = useFinanceStore((s) => s.paymentPlans);
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const vendors = useVendorStore((s) => s.vendors);
  const inspectionTasks = useQualityStore((s) => s.inspectionTasks);
  const materials = useMaterialStore((s) => s.materials);
  const readIds = useNotificationStore((s) => s.readIds);
  const dismissedIds = useNotificationStore((s) => s.dismissedIds);

  return useMemo(() => {
    const items: AppNotification[] = [];

    // 安全库存对照表（materialCode → safetyStock）
    const safetyMap = new Map<string, number>();
    (materials ?? []).forEach((m) => {
      if (m.code) safetyMap.set(m.code, m.safetyStock ?? 0);
    });

    // 1. 逾期付款
    (paymentPlans ?? []).forEach((p) => {
      if (p.status === 'overdue') {
        items.push({
          id: `biz:pay:${p.id}`,
          title: '逾期付款预警',
          desc: `${p.planNo} ${p.vendorName} 应于 ${p.dueDate} 付款`,
          level: 'error',
          path: '/finance/payments',
          time: `应由于 ${p.dueDate}`,
          category: 'overdue_payment',
          source: 'biz',
          read: !!readIds[`biz:pay:${p.id}`],
          dismissible: false,
        });
      }
    });

    // 2. 待付款计划
    (paymentPlans ?? []).forEach((p) => {
      if (p.status === 'pending') {
        items.push({
          id: `biz:payp:${p.id}`,
          title: '待付款计划',
          desc: `${p.planNo} ${p.vendorName} 计划 ${p.dueDate} 付款`,
          level: 'warning',
          path: '/finance/payments',
          time: `计划 ${p.dueDate}`,
          category: 'pending_payment',
          source: 'biz',
          read: !!readIds[`biz:payp:${p.id}`],
          dismissible: false,
        });
      }
    });

    // 3. 库存告急（库存 < 物料安全库存）
    (inventoryRecords ?? []).forEach((r) => {
      const ss = safetyMap.get(r.materialCode) ?? 0;
      if (ss > 0 && r.quantity < ss) {
        items.push({
          id: `biz:inv:${r.id}`,
          title: '库存告急',
          desc: `${r.materialName}（${r.materialCode}）库存 ${r.quantity} 低于安全库存 ${ss}`,
          level: 'warning',
          path: '/warehouse/inventory',
          time: `当前 ${r.quantity} / 安全 ${ss}`,
          category: 'low_stock',
          source: 'biz',
          read: !!readIds[`biz:inv:${r.id}`],
          dismissible: false,
        });
      }
    });

    // 4. 供应商待审核
    (vendors ?? []).forEach((v) => {
      if (v.status === 'pending') {
        items.push({
          id: `biz:ven:${v.id}`,
          title: '供应商待审核',
          desc: `${v.name} 准入申请待审批`,
          level: 'warning',
          path: '/vendor/approvals',
          time: '待审批',
          category: 'vendor_pending',
          source: 'biz',
          read: !!readIds[`biz:ven:${v.id}`],
          dismissible: false,
        });
      }
    });

    // 4.5 供应商资质到期预警（B6）：过期→error，30天内临期→warning
    (vendors ?? []).forEach((v) => {
      if (!v.qualificationExpiry) return;
      const exp = new Date(v.qualificationExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
      if (diffDays < 0) {
        items.push({
          id: `biz:venq:${v.id}`,
          title: '供应商资质已过期',
          desc: `${v.name} 资质有效期 ${v.qualificationExpiry} 已过期，请尽快更新以免影响合作`,
          level: 'error',
          path: '/vendor/risk',
          time: `已过期 ${Math.abs(diffDays)} 天`,
          category: 'vendor_qualification',
          source: 'biz',
          read: !!readIds[`biz:venq:${v.id}`],
          dismissible: false,
        });
      } else if (diffDays <= 30) {
        items.push({
          id: `biz:venq:${v.id}`,
          title: '供应商资质即将到期',
          desc: `${v.name} 资质有效期 ${v.qualificationExpiry} 将于 ${diffDays} 天后到期`,
          level: 'warning',
          path: '/vendor/risk',
          time: `剩 ${diffDays} 天`,
          category: 'vendor_qualification',
          source: 'biz',
          read: !!readIds[`biz:venq:${v.id}`],
          dismissible: false,
        });
      }
    });

    // 5. 检验任务（待检验 / 检验中）
    (inspectionTasks ?? []).forEach((t) => {
      if (t.status === 'pending' || t.status === 'in_progress') {
        items.push({
          id: `biz:qc:${t.id}`,
          title: t.status === 'in_progress' ? '检验进行中' : '待检验任务',
          desc: `${t.taskNo} ${t.materialName}（${t.batchNo}）`,
          level: 'info',
          path: '/quality/inspection',
          time: t.status === 'in_progress' ? '检验中' : '待检验',
          category: 'inspection',
          source: 'biz',
          read: !!readIds[`biz:qc:${t.id}`],
          dismissible: false,
        });
      }
    });

    // 6. 发票待验证
    (invoices ?? []).forEach((inv) => {
      if (inv.status === 'submitted') {
        items.push({
          id: `biz:inv:${inv.id}`,
          title: '发票待验证',
          desc: `${inv.invoiceNo} ${inv.vendorName} 待财务验证`,
          level: 'info',
          path: '/finance/invoices',
          time: `开票 ${inv.invoiceDate}`,
          category: 'invoice_pending',
          source: 'biz',
          read: !!readIds[`biz:inv:${inv.id}`],
          dismissible: false,
        });
      }
    });

    // 系统公告
    SYSTEM_NOTICES.forEach((n) => {
      items.push({ ...n, read: !!readIds[n.id] });
    });

    // 过滤已忽略
    const filtered = items.filter((n) => !dismissedIds.includes(n.id));

    // 排序：未读优先，业务优先于系统公告
    filtered.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      if (a.source !== b.source) return a.source === 'biz' ? -1 : 1;
      return 0;
    });

    // 待办汇总（按分类计数，仅业务类）
    const catCount: Record<string, number> = {};
    filtered.forEach((n) => {
      if (n.source === 'biz') catCount[n.category] = (catCount[n.category] ?? 0) + 1;
    });
    const summary: TodoCategory[] = [
      { key: 'overdue_payment', label: '逾期付款', count: catCount['overdue_payment'] ?? 0, level: 'error', path: '/finance/payments' },
      { key: 'pending_payment', label: '待付款', count: catCount['pending_payment'] ?? 0, level: 'warning', path: '/finance/payments' },
      { key: 'low_stock', label: '库存告急', count: catCount['low_stock'] ?? 0, level: 'warning', path: '/warehouse/inventory' },
      { key: 'vendor_pending', label: '供应商待审', count: catCount['vendor_pending'] ?? 0, level: 'warning', path: '/vendor/approvals' },
      { key: 'vendor_qualification', label: '资质到期', count: catCount['vendor_qualification'] ?? 0, level: catCount['vendor_qualification'] ? 'error' : 'info', path: '/vendor/risk' },
      { key: 'inspection', label: '检验任务', count: catCount['inspection'] ?? 0, level: 'info', path: '/quality/inspection' },
      { key: 'invoice_pending', label: '发票待验证', count: catCount['invoice_pending'] ?? 0, level: 'info', path: '/finance/invoices' },
    ];

    return { notifications: filtered, summary };
  }, [
    invoices,
    paymentPlans,
    inventoryRecords,
    vendors,
    inspectionTasks,
    materials,
    readIds,
    dismissedIds,
  ]);
}
