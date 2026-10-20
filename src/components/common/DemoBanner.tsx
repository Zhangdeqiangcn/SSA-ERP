import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface DemoBannerProps {
  /** 可选的补充说明，用于解释该页面「未落地」的具体含义（如：表单提交不写库 / 执行引擎未开发 / 模拟接口） */
  reason?: string;
  /** 是否紧凑样式（用于空间紧张的工具页） */
  compact?: boolean;
}

/** 把 `**文本**` 渲染为加粗，便于在各页 reason 中强调关键词 */
function renderEmphasis(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    return <React.Fragment key={i}>{m ? <b>{m[1]}</b> : part}</React.Fragment>;
  });
}

/**
 * 「功能演示 · 未落地」页面级警示横幅。
 *
 * 用途：明确标记「仅是功能演示、表单提交不会真正写入业务系统」的页面，
 * 避免使用者误判为已上线的真实功能。
 *
 * 使用约定：
 * - 仅用于确凿的「演示 / 开发中 / 提交不落库 / 模拟接口」页面，不要用于降级通道
 *   （如 DEV 环境演示汇率、演示账号兜底、测试造数工具、打印样例数据等，
 *    这些不是「未落地的业务功能」，误标会吓退使用者）。
 * - 放在页面主容器顶部第一个子元素。
 */
const DemoBanner: React.FC<DemoBannerProps> = ({ reason, compact }) => (
  <Alert
    severity="warning"
    icon={<WarningAmberIcon />}
    sx={{
      mb: compact ? 1 : 2,
      bgcolor: 'rgba(255, 167, 38, 0.14)',
      border: '1px solid',
      borderColor: '#B45309',
      color: '#B45309',
      '& .MuiAlert-message': { width: '100%' },
      '& .MuiAlert-icon': { color: '#B45309' },
    }}
  >
    <AlertTitle sx={{ fontWeight: 700, fontSize: compact ? '0.875rem' : '1rem' }}>
      ⚠ 功能演示 · 未落地
    </AlertTitle>
    <Box
      component="div"
      sx={{ fontSize: compact ? '0.75rem' : '0.875rem', lineHeight: 1.6 }}
    >
      {reason ? (
        renderEmphasis(reason)
      ) : (
        '本页面当前仅为功能演示：表单提交不会真正写入业务系统，请勿当作已上线功能使用。'
      )}
    </Box>
  </Alert>
);

export default DemoBanner;
