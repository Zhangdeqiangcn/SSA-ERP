import React, { useEffect } from 'react';
import { Drawer, Box, Typography, IconButton, Button, Stack } from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';

/**
 * DetailDrawer —— 列表行点击后「右侧就地滑出」的详情抽屉（对标 SAP/金蝶的侧栏查看器，降「列表→跳详情→回列表」的来回滚动）。
 *
 * 用法：列表页持有 `selectedRow` 状态；行 onRowClick 改为 setSelectedRow(row)（不再 navigate 跳页），
 *       渲染 <DetailDrawer open={!!selectedRow} title={...} onClose={() => setSelectedRow(null)}>{详情内容}</DetailDrawer>。
 *
 * 设计要点：
 *  - 右侧滑出、宽 60%（抽屉内可放下紧凑详情）， Esc / 关闭按钮 / 遮罩点击均关闭。
 *  - `fullPath` 提供时显示「打开完整详情」逃生舱按钮：抽屉内只放速览，需整页编辑/变更/审批时再跳真详情页，
 *    既「就地少滚动」又不牺牲深层操作。
 */

export interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  /** 抽屉顶栏标题（如订单号 / 物料编码） */
  title?: React.ReactNode;
  /** 副标题（如供应商 / 物料名称） */
  subtitle?: React.ReactNode;
  /** 顶栏左侧附加（如 StatusBadge 状态条） */
  status?: React.ReactNode;
  /** 顶栏右侧附加操作按钮 */
  actions?: React.ReactNode;
  /**
   * 「打开完整详情」逃生舱：传入路由 path 则显示按钮，点击后 onClose + 调用 onOpenFull（由调用方 navigate）。
   */
  onOpenFull?: () => void;
  children?: React.ReactNode;
}

const DETAIL_DRAWER_WIDTH = 60; // 屏宽百分比

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  status,
  actions,
  onOpenFull,
  children,
}) => {
  // Esc 关闭（抽屉打开时挂监听，关闭时解绑）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: `${DETAIL_DRAWER_WIDTH}%`,
          minWidth: 420,
          maxWidth: 960,
          ml: 0,
          boxShadow: '-4px 0 24px rgba(15,23,42,.12)',
          overflowY: 'auto',
        },
      }}
    >
      {/* 顶栏：标题 + 状态 + 操作 + 关闭 */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          px: 2.5,
          py: 1.25,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {status}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace' }} noWrap>
              {title}
            </Typography>
          </Stack>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions}
        {onOpenFull && (
          <TooltipTip label="打开完整详情" onClick={onOpenFull} />
        )}
        <IconButton onClick={onClose} aria-label="关闭">
          <Close />
        </IconButton>
      </Box>

      {/* 内容区（调用方塞紧凑详情；可纵向滚动） */}
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Drawer>
  );
};

/** 顶栏的「打开完整详情」小按钮（图标按钮 + tooltip，避免引入额外 import） */
const TooltipTip: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <IconButton size="small" onClick={onClick} aria-label={label} title={label} sx={{ color: 'primary.main' }}>
    <OpenInNew fontSize="small" />
  </IconButton>
);

export default DetailDrawer;
