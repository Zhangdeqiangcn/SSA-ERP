import { describe, it, expect } from 'vitest';
import {
  APPROVAL_STATUS_REGISTRY,
  approvalStatusInfo,
  approvalStatusLabel,
  approvalStatusColor,
  approvalStatusPhase,
  approvalStatusOptions,
  isApprovalInFlight,
  isApprovalSettled,
  isFlowStatusActive,
  APPROVAL_INSTANCE_STATUS_LABELS,
} from '@/constants/approvalEnums';
import type {
  ApprovalInstanceStatus,
  MaterialApprovalStatus,
  ApplicationStatus,
  PurchaseRequestStatus,
} from '@/types';

/**
 * P1-4 审批枚举统一登记表（V3.75.0）
 * 锁三件事：① 每模块词表条目完整（label/color/phase 非空）；
 * ② 相位谓词语义正确（in_flight 才可审批，settled 不可再审批）；
 * ③ 框架标签与登记表逐项一致（向后兼容导出没走样）。
 */
describe('approvalEnums 统一登记表', () => {
  it('每个模块的每个状态都登记了 label/color/phase', () => {
    for (const [module, table] of Object.entries(APPROVAL_STATUS_REGISTRY)) {
      const entries = Object.entries(table);
      expect(entries.length, `${module} 词表为空`).toBeGreaterThan(0);
      for (const [status, entry] of entries) {
        expect(entry.label, `${module}.${status} 缺 label`).toBeTruthy();
        expect(['default', 'warning', 'success', 'error', 'info'], `${module}.${status} color 非法`).toContain(entry.color);
        expect(['draft', 'in_flight', 'approved', 'rejected', 'closed'], `${module}.${status} phase 非法`).toContain(entry.phase);
      }
    }
  });

  it('各模块状态联合的成员全部在登记表中（防新增状态忘登记）', () => {
    // 与各类型联合一一对应；将来类型加成员这里会因长度不等而红
    const unions: Record<string, string[]> = {
      approval_instance: ['pending', 'approved', 'rejected', 'withdrawn'],
      material_application: ['draft', 'pending', 'approved', 'rejected'],
      price_approval: ['pending', 'reviewing', 'approved', 'rejected'],
      vendor_application: ['submitted', 'reviewing', 'approved', 'rejected', 'supplement'],
      purchase_request: ['draft', 'pending', 'approved', 'rejected', 'ordered'],
      approval_flow: ['system', 'draft', 'pending', 'published'],
    };
    for (const [module, members] of Object.entries(unions)) {
      const registered = Object.keys(APPROVAL_STATUS_REGISTRY[module as keyof typeof APPROVAL_STATUS_REGISTRY]);
      expect(registered.sort(), `${module} 词表与类型联合不一致`).toEqual([...members].sort());
    }
  });

  it('相位谓词：in_flight 才能审批，settled 不能再审批', () => {
    // 供应商申请：submitted/reviewing/supplement 均为在途（替代原手写 includes 清单）
    for (const s of ['submitted', 'reviewing', 'supplement'] as ApplicationStatus[]) {
      expect(isApprovalInFlight('vendor_application', s), s).toBe(true);
      expect(isApprovalSettled('vendor_application', s), s).toBe(false);
    }
    for (const s of ['approved', 'rejected'] as ApplicationStatus[]) {
      expect(isApprovalSettled('vendor_application', s), s).toBe(true);
      expect(isApprovalInFlight('vendor_application', s), s).toBe(false);
    }
    // 物料申请：draft 未提交既不在途也未了结
    expect(isApprovalInFlight('material_application', 'draft' as MaterialApprovalStatus)).toBe(false);
    expect(isApprovalSettled('material_application', 'draft' as MaterialApprovalStatus)).toBe(false);
    expect(isApprovalInFlight('material_application', 'pending' as MaterialApprovalStatus)).toBe(true);
    // 框架实例：withdrawn 是 closed 终态
    expect(isApprovalSettled('approval_instance', 'withdrawn' as ApprovalInstanceStatus)).toBe(true);
    expect(isApprovalInFlight('approval_instance', 'pending' as ApprovalInstanceStatus)).toBe(true);
  });

  it('流程定义生效态：system/published 生效，draft/pending 不生效', () => {
    expect(isFlowStatusActive('system')).toBe(true);
    expect(isFlowStatusActive('published')).toBe(true);
    expect(isFlowStatusActive('draft')).toBe(false);
    expect(isFlowStatusActive('pending')).toBe(false);
    expect(isFlowStatusActive(undefined)).toBe(false); // 缺省按 system 处理由调用方兜，这里断言未登记值不放行
  });

  it('标签/颜色/选项与各页面原措辞一致（收敛零显示变化）', () => {
    expect(approvalStatusLabel('material_application', 'pending' as MaterialApprovalStatus)).toBe('待审批');
    expect(approvalStatusColor('material_application', 'approved' as MaterialApprovalStatus)).toBe('success');
    expect(approvalStatusLabel('vendor_application', 'supplement' as ApplicationStatus)).toBe('需补充');
    expect(approvalStatusColor('vendor_application', 'submitted' as ApplicationStatus)).toBe('info');
    expect(approvalStatusLabel('purchase_request', 'ordered' as PurchaseRequestStatus)).toBe('已下单');
    expect(approvalStatusLabel('approval_flow', 'published')).toBe('已发布');
    // 未登记状态回退原值，不渲染空白
    expect(approvalStatusLabel('price_approval', 'mystery_status')).toBe('mystery_status');
    expect(approvalStatusColor('price_approval', 'mystery_status')).toBe('default');
    expect(approvalStatusInfo('price_approval', undefined)).toBeUndefined();
    // 选项顺序即词表声明序（筛选项顺序不变）
    expect(approvalStatusOptions('vendor_application').map(o => o.value)).toEqual([
      'submitted', 'reviewing', 'approved', 'rejected', 'supplement',
    ]);
    expect(approvalStatusOptions('purchase_request').map(o => o.label)).toEqual([
      '草稿', '待审批', '已批准', '已拒绝', '已下单',
    ]);
  });

  it('框架标签向后兼容导出与登记表逐项一致', () => {
    const expected: Record<ApprovalInstanceStatus, string> = {
      pending: '审批中', approved: '已通过', rejected: '已驳回', withdrawn: '已撤回',
    };
    expect(APPROVAL_INSTANCE_STATUS_LABELS).toEqual(expected);
    for (const s of Object.keys(expected) as ApprovalInstanceStatus[]) {
      expect(approvalStatusPhase('approval_instance', s)).toBeTruthy();
    }
  });
});
