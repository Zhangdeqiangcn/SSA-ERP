import React from 'react';
import { Chip, Box } from '@mui/material';
import { Status } from '@/types';

interface StatusBadgeProps {
  status: Status | string;
  size?: 'small' | 'medium';
}

export const statusConfig: Record<string, { color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'; label: string }> = {
  // Common statuses
  draft: { color: 'default', label: '草稿' },
  active: { color: 'success', label: '启用' },
  inactive: { color: 'default', label: '停用' },
  pending: { color: 'warning', label: '待处理' },
  approved: { color: 'success', label: '已批准' },
  rejected: { color: 'error', label: '已拒绝' },

  // Vendor statuses
  registered: { color: 'info', label: '已注册' },
  blacklisted: { color: 'error', label: '黑名单' },

  // Material statuses
  // Uses active/inactive/draft

  // Purchase request statuses
  ordered: { color: 'info', label: '已下单' },

  // Purchase order statuses
  created: { color: 'default', label: '已创建' },
  sent: { color: 'info', label: '已发送' },
  vendorConfirmed: { color: 'secondary', label: '供应商已确认' },
  confirmed: { color: 'primary', label: '已确认' },
  partial: { color: 'warning', label: '部分收货' },
  received: { color: 'success', label: '已收货' },
  closed: { color: 'default', label: '已关闭' },
  cancelled: { color: 'error', label: '已取消' },

  // Inbound/Outbound statuses
  processing: { color: 'warning', label: '处理中' },
  completed: { color: 'success', label: '已完成' },

  // Check statuses
  // Uses pending/processing/completed/cancelled

  // Priority
  low: { color: 'default', label: '低' },
  normal: { color: 'info', label: '普通' },
  high: { color: 'warning', label: '高' },
  urgent: { color: 'error', label: '紧急' },

  // Vendor types
  manufacturer: { color: 'primary', label: '生产商' },
  trader: { color: 'info', label: '贸易商' },
  agent: { color: 'warning', label: '代理商' },

  // Quality status
  qualified: { color: 'success', label: '合格' },
  unqualified: { color: 'error', label: '不合格' },

  // Inventory alert types
  low_stock: { color: 'warning', label: '库存不足' },
  overstock: { color: 'info', label: '库存过剩' },
  expiring: { color: 'error', label: '即将过期' },
  frozen: { color: 'default', label: '冻结' },

  // Manual/Auto
  manual: { color: 'primary', label: '手动' },
  auto: { color: 'info', label: '自动' },

  // Contract statuses
  suspended: { color: 'warning', label: '已暂停' },
  terminated: { color: 'error', label: '已终止' },

  // Inventory check type
  full: { color: 'primary', label: '全盘' },
  partial_type: { color: 'info', label: '抽盘' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'small',
}) => {
  const config = statusConfig[status] || { color: 'default' as const, label: status };

  return (
    <Box component="span" sx={{ display: 'inline-flex' }}>
      <Chip
        label={config.label}
        color={config.color}
        size={size}
        sx={{ minWidth: 70 }}
      />
    </Box>
  );
};

export default StatusBadge;
