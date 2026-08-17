/**
 * ApprovalFlow.tsx  —  V2.0 审批流可视化组件
 * 对标 SAP Fiori / 金蝶云星空 的审批流程可视化，支持横向节点展示
 */
import React from 'react';
import {
  Box, Typography, Avatar, Tooltip, Chip,
} from '@mui/material';
import {
  CheckCircle, Cancel, AccessTime, RadioButtonUnchecked, Person,
} from '@mui/icons-material';

export type ApprovalNodeStatus = 'approved' | 'rejected' | 'pending' | 'waiting' | 'skipped';

export interface ApprovalNode {
  id: string;
  role: string;         // 审批角色，例如"采购主管"
  approver?: string;    // 具体审批人名称
  status: ApprovalNodeStatus;
  comment?: string;     // 审批意见
  time?: string;        // 审批时间
}

interface ApprovalFlowProps {
  nodes: ApprovalNode[];
  currentStep?: number; // 当前激活步骤索引（0-based）
  compact?: boolean;    // 紧凑模式（用于列表内嵌）
}

const statusConfig: Record<ApprovalNodeStatus, {
  icon: React.ReactNode;
  color: string;
  bg: string;
  label: string;
}> = {
  approved: { icon: <CheckCircle sx={{ fontSize: 18, color: '#fff' }} />, color: '#10B981', bg: '#10B981', label: '已通过' },
  rejected: { icon: <Cancel sx={{ fontSize: 18, color: '#fff' }} />, color: '#EF4444', bg: '#EF4444', label: '已拒绝' },
  pending:  { icon: <AccessTime sx={{ fontSize: 18, color: '#fff' }} />, color: '#F59E0B', bg: '#F59E0B', label: '审批中' },
  waiting:  { icon: <RadioButtonUnchecked sx={{ fontSize: 18, color: '#94A3B8' }} />, color: '#94A3B8', bg: '#F1F5F9', label: '待审批' },
  skipped:  { icon: <RadioButtonUnchecked sx={{ fontSize: 18, color: '#CBD5E1' }} />, color: '#CBD5E1', bg: '#F8FAFC', label: '已跳过' },
};

const ApprovalFlow: React.FC<ApprovalFlowProps> = ({ nodes, currentStep, compact = false }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        overflowX: 'auto',
        pb: compact ? 0 : 1,
      }}
    >
      {nodes.map((node, idx) => {
        const cfg = statusConfig[node.status];
        const isLast = idx === nodes.length - 1;
        const isCurrent = idx === currentStep;

        return (
          <Box key={node.id} sx={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
            {/* 节点 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: compact ? 72 : 96 }}>
              {/* 圆形状态图标 */}
              <Tooltip title={cfg.label + (node.comment ? `：${node.comment}` : '')} arrow>
                <Avatar
                  sx={{
                    width: compact ? 32 : 40,
                    height: compact ? 32 : 40,
                    bgcolor: cfg.bg,
                    border: isCurrent ? `2.5px solid ${cfg.color}` : '2px solid transparent',
                    boxShadow: isCurrent ? `0 0 0 3px ${cfg.color}30` : 'none',
                    transition: 'all .2s',
                    cursor: 'default',
                  }}
                >
                  {cfg.icon}
                </Avatar>
              </Tooltip>

              {/* 角色名 */}
              <Typography
                variant="caption"
                sx={{
                  mt: 0.8, textAlign: 'center', fontSize: compact ? '0.65rem' : '0.75rem',
                  color: isCurrent ? cfg.color : '#475569',
                  fontWeight: isCurrent ? 600 : 400,
                  lineHeight: 1.3,
                  maxWidth: compact ? 68 : 88,
                  wordBreak: 'keep-all',
                }}
              >
                {node.role}
              </Typography>

              {/* 审批人 */}
              {node.approver && !compact && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.3 }}>
                  <Person sx={{ fontSize: 11, color: '#94A3B8' }} />
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>
                    {node.approver}
                  </Typography>
                </Box>
              )}

              {/* 时间 */}
              {node.time && !compact && (
                <Typography variant="caption" sx={{ color: '#CBD5E1', fontSize: '0.6rem', mt: 0.2 }}>
                  {node.time}
                </Typography>
              )}

              {/* 状态标签 */}
              {!compact && (
                <Chip
                  label={cfg.label}
                  size="small"
                  sx={{
                    mt: 0.5, fontSize: '0.6rem', height: 18,
                    bgcolor: `${cfg.color}15`,
                    color: cfg.color,
                  }}
                />
              )}
            </Box>

            {/* 连接线 */}
            {!isLast && (
              <Box sx={{
                display: 'flex', alignItems: 'center', mt: compact ? 1 : 1.3,
                width: compact ? 24 : 32, flexShrink: 0,
              }}>
                <Box sx={{
                  flex: 1, height: '2px',
                  bgcolor: node.status === 'approved'
                    ? '#10B981'
                    : node.status === 'rejected'
                      ? '#EF4444'
                      : '#E2E8F0',
                  transition: 'background-color .3s',
                }} />
                {/* 箭头三角 */}
                <Box sx={{
                  width: 0, height: 0,
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderLeft: `5px solid ${
                    node.status === 'approved' ? '#10B981'
                    : node.status === 'rejected' ? '#EF4444'
                    : '#E2E8F0'
                  }`,
                }} />
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default ApprovalFlow;
