/**
 * 流程追踪器 —— 通用组件
 *
 * 用法：在任意表单页面的标题/操作栏区域放置一个图标按钮，
 * 点击后弹出流程图，展示当前节点在整体流程中的位置及上下游状态。
 *
 * <FlowTracker module="purchase-request" currentStatus="dept_approved" documentNo="PR-2024-001" />
 */
import React, { useState, useMemo } from 'react';
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  Alert,
  IconButton as CloseBtn,
} from '@mui/material';
import { AccountTree, Close, ArrowUpward, ArrowDownward, OpenInNew } from '@mui/icons-material';
import { getFlowDefinition, type FlowNode } from '@/data/flowDefinitions';

// ── 节点图标映射 ────────────────────────────────────────────
type IconType =
  | 'draft' | 'submit' | 'check' | 'approval' | 'finance'
  | 'done' | 'fail' | 'progress' | 'inspect' | 'judge'
  | 'instore' | 'ship' | 'arrive' | 'pick' | 'prep'
  | 'decide' | 'execute';

const NODE_ICONS: Record<IconType, string> = {
  draft:     '📝',
  submit:    '📤',
  check:     '✅',
  approval:  '👤',
  finance:   '💰',
  done:      '🏁',
  fail:      '❌',
  progress:  '⏳',
  inspect:   '🔍',
  judge:     '⚖️',
  instore:   '📦',
  ship:      '🚚',
  arrive:    '📍',
  pick:      '📋',
  prep:      '🔧',
  decide:    '🎯',
  execute:   '⚡',
};

// ── Props ────────────────────────────────────────────────────
interface FlowTrackerProps {
  module: string;
  currentStatus: string;
  documentNo?: string;
  /** 自定义按钮标签（默认"流程追踪"） */
  label?: string;
  /** 若为 true，将显示为带文字的按钮而非纯图标 */
  asButton?: boolean;
  /** 流程节点的状态映射：哪些节点已完成、当前在哪个节点等 */
  statusMap?: 'auto' | Record<string, FlowNodeStatus>;
}

export type FlowNodeStatus = 'completed' | 'current' | 'pending' | 'skipped';

// ── 主组件 ────────────────────────────────────────────────────
const FlowTracker: React.FC<FlowTrackerProps> = ({
  module,
  currentStatus,
  documentNo,
  label = '流程追踪',
  asButton = false,
  statusMap = 'auto',
}) => {
  const [open, setOpen] = useState(false);
  const flowDef = useMemo(() => getFlowDefinition(module), [module]);

  // 计算每个节点的状态
  const nodeStates = useMemo(() => {
    const nodes = flowDef.nodes;
    if (statusMap !== 'auto') return statusMap;

    const result: Record<string, FlowNodeStatus> = {};
    const currentIdx = nodes.findIndex(n => n.id === currentStatus);
    const foundIdx = currentIdx >= 0 ? currentIdx : 0;

    nodes.forEach((node, idx) => {
      if (idx < foundIdx) result[node.id] = 'completed';
      else if (idx === foundIdx) result[node.id] = 'current';
      else result[node.id] = 'pending';
    });

    return result;
  }, [flowDef, currentStatus, statusMap]);

  // 找到当前节点
  const currentNodeIdx = useMemo(() => {
    const idx = flowDef.nodes.findIndex(n => n.id === currentStatus);
    return idx >= 0 ? idx : 0;
  }, [flowDef, currentStatus]);

  const currentNode = flowDef.nodes[currentNodeIdx];
  const completedCount = flowDef.nodes.filter(n => nodeStates[n.id] === 'completed').length;
  const progressPercent = flowDef.nodes.length > 1
    ? Math.round((completedCount / (flowDef.nodes.length - 1)) * 100)
    : 0;

  // ── SVG 水平流程图参数 ──
  const nodeCount = flowDef.nodes.length;
  const svgWidth = Math.max(680, nodeCount * 140 + 40);
  const nodeRadius = 28;
  const startX = 60;
  const nodeSpacing = (svgWidth - startX * 2) / (nodeCount - 1 || 1);
  const centerY = 80;

  const getNodeColor = (status: FlowNodeStatus) => {
    switch (status) {
      case 'completed': return { fill: '#10B981', stroke: '#059669', text: '#065F46' };
      case 'current':   return { fill: '#3B82F6', stroke: '#2563EB', text: '#1E40AF' };
      case 'skipped':   return { fill: '#F59E0B', stroke: '#D97706', text: '#92400E' };
      default:          return { fill: '#E2E8F0', stroke: '#CBD5E1', text: '#94A3B8' };
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const triggerElement = asButton ? (
    <Chip
      icon={<AccountTree />}
      label={label}
      clickable
      color="primary"
      variant="outlined"
      size="small"
      onClick={handleOpen}
      sx={{ fontWeight: 600 }}
    />
  ) : (
    <Tooltip title={label}>
      <IconButton
        onClick={handleOpen}
        size="small"
        sx={{
          color: '#3B82F6',
          bgcolor: '#EFF6FF',
          '&:hover': { bgcolor: '#DBEAFE' },
        }}
      >
        <AccountTree fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  return (
    <>
      {triggerElement}

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
          },
        }}
      >
        {/* 标题栏 */}
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            px: 3,
            py: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AccountTree sx={{ color: '#3B82F6' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>
                {flowDef.moduleLabel} 流程追踪
              </Typography>
              {documentNo && (
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  单据号：{documentNo}
                </Typography>
              )}
            </Box>
          </Box>
          <CloseBtn onClick={handleClose} size="small">
            <Close />
          </CloseBtn>
        </DialogTitle>

        <DialogContent sx={{ py: 3, px: 3 }}>
          {/* 流程进度信息 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              mb: 3,
              p: 2,
              borderRadius: 3,
              bgcolor: '#F0F9FF',
              border: '1px solid #BAE6FD',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B' }}>当前节点</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#1E40AF' }}>
                {currentNode.label}
                {currentNode.subLabel && (
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: '#64748B', fontWeight: 400 }}>
                    ({currentNode.subLabel})
                  </Typography>
                )}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#64748B' }}>整体进度</Typography>
              {/* 微型进度条 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 120,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: '#E2E8F0',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      borderRadius: 3,
                      bgcolor: '#3B82F6',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#3B82F6' }}>
                  {progressPercent}%
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 流程说明 */}
          <Typography
            variant="body2"
            sx={{
              color: '#64748B',
              mb: 2,
              px: 1,
              fontSize: '0.8rem',
              lineHeight: 1.6,
            }}
          >
            📌 流程路径：{flowDef.description}
          </Typography>

          {/* SVG 流程图 */}
          <Box
            sx={{
              overflowX: 'auto',
              bgcolor: '#FAFBFC',
              borderRadius: 3,
              border: '1px solid #E2E8F0',
              p: 1,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: '#CBD5E1' },
            }}
          >
            <svg
              width={svgWidth}
              height={160}
              viewBox={`0 0 ${svgWidth} 160`}
              style={{ display: 'block' }}
            >
              {/* 连接线 */}
              {flowDef.nodes.map((node, idx) => {
                if (idx === nodeCount - 1) return null;
                const currState = getNodeColor(nodeStates[node.id]);
                const nextState = getNodeColor(nodeStates[flowDef.nodes[idx + 1].id]);
                const x1 = startX + idx * nodeSpacing + nodeRadius;
                const x2 = startX + (idx + 1) * nodeSpacing - nodeRadius;
                const y = centerY;

                // 连接线颜色：两个节点都完成 → 绿色；否则灰色
                const lineColor =
                  nodeStates[node.id] === 'completed' &&
                  nodeStates[flowDef.nodes[idx + 1].id] === 'completed'
                    ? '#10B981'
                    : nodeStates[node.id] === 'completed' &&
                      nodeStates[flowDef.nodes[idx + 1].id] === 'current'
                    ? '#3B82F6'
                    : '#E2E8F0';

                return (
                  <g key={`line-${idx}`}>
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke={lineColor}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    {/* 箭头 */}
                    <polygon
                      points={`${x2 - 6},${y - 4} ${x2},${y} ${x2 - 6},${y + 4}`}
                      fill={lineColor}
                    />
                  </g>
                );
              })}

              {/* 节点圆 + 图标 */}
              {flowDef.nodes.map((node, idx) => {
                const state = nodeStates[node.id];
                const colors = getNodeColor(state);
                const cx = startX + idx * nodeSpacing;
                const cy = centerY;
                const icon = NODE_ICONS[node.icon as IconType] || '📌';

                return (
                  <g key={`node-${idx}`}>
                    {/* 脉冲环（仅当前节点） */}
                    {state === 'current' && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={nodeRadius + 6}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        opacity={0.3}
                      >
                        <animate
                          attributeName="r"
                          from={nodeRadius + 4}
                          to={nodeRadius + 10}
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          from={0.4}
                          to={0.05}
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* 节点圆 */}
                    <circle cx={cx} cy={cy} r={nodeRadius} fill={colors.fill} stroke={colors.stroke} strokeWidth={2.5} />
                    {state === 'current' && (
                      <circle cx={cx} cy={cy} r={nodeRadius} fill="none" stroke="#fff" strokeWidth={1.5} strokeDasharray="4 3" />
                    )}

                    {/* 状态图标 */}
                    {state === 'completed' && (
                      <text x={cx} y={cy + 7} textAnchor="middle" fontSize={20} fill="#fff">✓</text>
                    )}
                    {state !== 'completed' && (
                      <text x={cx} y={cy + 7} textAnchor="middle" fontSize={18}>{icon}</text>
                    )}

                    {/* 节点标签 */}
                    <text
                      x={cx}
                      y={cy + nodeRadius + 18}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={state === 'current' ? 700 : 500}
                      fill={state === 'current' ? '#1E40AF' : state === 'completed' ? '#065F46' : '#94A3B8'}
                    >
                      {node.label}
                    </text>
                    {node.subLabel && (
                      <text
                        x={cx}
                        y={cy + nodeRadius + 34}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#94A3B8"
                      >
                        {node.subLabel}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 底部图例 */}
              <g transform={`translate(${startX}, 145)`}>
                {/* 已完成 */}
                <rect x={0} y={0} width={12} height={12} rx={2} fill="#10B981" />
                <text x={16} y={10} fontSize={11} fill="#475569">已完成</text>
                {/* 当前 */}
                <rect x={80} y={0} width={12} height={12} rx={2} fill="#3B82F6" />
                <text x={96} y={10} fontSize={11} fill="#475569">当前节点</text>
                {/* 待处理 */}
                <rect x={180} y={0} width={12} height={12} rx={2} fill="#E2E8F0" />
                <text x={196} y={10} fontSize={11} fill="#94A3B8">待处理</text>
              </g>
            </svg>
          </Box>

          {/* 节点详情表格 */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B', mb: 1.5 }}>
              流程节点详情
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {flowDef.nodes.map((node, idx) => {
                const state = nodeStates[node.id];
                const stateLabel =
                  state === 'completed' ? '已完成' :
                  state === 'current' ? '进行中' :
                  state === 'skipped' ? '已跳过' : '待处理';
                const stateColor =
                  state === 'completed' ? 'success' :
                  state === 'current' ? 'primary' :
                  state === 'skipped' ? 'warning' : 'default';

                return (
                  <Box
                    key={node.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: state === 'current' ? '#EFF6FF' : state === 'completed' ? '#F0FDF4' : 'transparent',
                      border: state === 'current' ? '1px solid #BFDBFE' : state === 'completed' ? '1px solid #BBF7D0' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* 序号 */}
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor:
                          state === 'completed' ? '#10B981' :
                          state === 'current' ? '#3B82F6' :
                          '#E2E8F0',
                        color: state === 'completed' || state === 'current' ? '#fff' : '#94A3B8',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                      }}
                    >
                      {state === 'completed' ? '✓' : idx + 1}
                    </Box>

                    {/* 节点名 */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {node.label}
                      </Typography>
                      {node.subLabel && (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          {node.subLabel}
                        </Typography>
                      )}
                    </Box>

                    {/* 状态标签 */}
                    <Chip
                      label={stateLabel}
                      color={stateColor as any}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* 跨模块流转关系 */}
          {flowDef.crossModuleLinks && flowDef.crossModuleLinks.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                跨模块流转关系
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {flowDef.crossModuleLinks.map((link, idx) => (
                  <Box
                    key={`cross-${idx}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: link.direction === 'upstream' ? '#FFF7ED' : '#F0FDF4',
                      border: link.direction === 'upstream' ? '1px solid #FED7AA' : '1px solid #BBF7D0',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* 方向图标 */}
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: link.direction === 'upstream' ? '#F97316' : '#10B981',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {link.direction === 'upstream' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                    </Box>

                    {/* 模块名 */}
                    <Chip
                      label={link.moduleLabel}
                      size="small"
                      color={link.direction === 'upstream' ? 'warning' : 'success'}
                      variant="outlined"
                      sx={{ fontWeight: 600, flexShrink: 0, minWidth: 80 }}
                    />

                    {/* 说明 */}
                    <Typography variant="caption" sx={{ color: '#475569', flex: 1, lineHeight: 1.5 }}>
                      {link.description}
                    </Typography>

                    {/* 标签 */}
                    <Chip
                      label={link.direction === 'upstream' ? '上游模块' : '下游模块'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        flexShrink: 0,
                        bgcolor: link.direction === 'upstream' ? '#FFF7ED' : '#F0FDF4',
                        color: link.direction === 'upstream' ? '#C2410C' : '#166534',
                      }}
                    />
                  </Box>
                ))}
              </Box>

              {/* 关系总览提示 */}
              <Alert
                severity="info"
                sx={{
                  mt: 1.5,
                  borderRadius: 2,
                  bgcolor: '#EFF6FF',
                  '& .MuiAlert-icon': { color: '#3B82F6' },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  当前模块在整个供应链中的位置：{flowDef.crossModuleLinks.filter(l => l.direction === 'upstream').map(l => l.moduleLabel).join('、') || '无'
                  } → <strong>{flowDef.moduleLabel}</strong> → {flowDef.crossModuleLinks.filter(l => l.direction === 'downstream').map(l => l.moduleLabel).join('、') || '无'
                  }
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FlowTracker;
