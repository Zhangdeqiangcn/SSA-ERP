/**
 * 多标签页导航栏
 * 集成到 MainLayout 和 VendorPortalLayout 顶部
 */
import React, { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Chip, Stack, IconButton, Tooltip, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import {
  Close, CloseFullscreen, PushPin,
} from '@mui/icons-material';
import { useTabStore, TabItem, getTabLabel } from '@/stores/tabStore';

/** TabBar 会自动监听路由变化并添加标签 */
export const TabBar: React.FC<{ variant?: 'default' | 'vendor' }> = ({ variant = 'default' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, closeOtherTabs } = useTabStore();
  const theme = useTheme();
  const p = theme.palette.primary.main;

  // 自动同步：当前路由变化时添加标签
  React.useEffect(() => {
    const path = location.pathname + location.search;
    const label = getTabLabel(location.pathname);
    addTab({ id: path, label, path, icon: undefined });
  }, [location.pathname, location.search, addTab]);

  const handleTabClick = useCallback((tab: TabItem) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  }, [navigate, setActiveTab]);

  const handleClose = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const currentPath = location.pathname;
    removeTab(id);
    const store = useTabStore.getState();
    // 如果关闭的是当前标签，导航到新激活的标签
    if (id === currentPath && store.tabs.length > 1) {
      const remaining = store.tabs.filter(t => t.id !== id);
      const newActiveIdx = remaining.findIndex(t => t.id === store.activeTabId);
      if (newActiveIdx >= 0 && remaining[newActiveIdx]) {
        navigate(remaining[newActiveIdx].path);
      } else if (remaining.length > 0) {
        navigate(remaining[0].path);
      }
    }
  }, [location.pathname, navigate, removeTab]);

  const handleCloseOthers = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeOtherTabs(id);
  }, [closeOtherTabs]);

  if (tabs.length <= 1) return null; // 仅一个标签时不显示

  const isVendor = variant === 'vendor';
  const bgColor = isVendor ? '#1E293B' : 'background.paper';
  const borderColor = isVendor ? 'rgba(255,255,255,0.08)' : 'divider';
  const activeBg = isVendor ? alpha(p, 0.15) : alpha(p, 0.12);
  const textColor = isVendor ? '#94A3B8' : 'text.secondary';
  const activeTextColor = isVendor ? p : 'text.primary';

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0,
      bgcolor: bgColor,
      borderBottom: `1px solid ${borderColor}`,
      px: 0.5, py: 0,
      overflow: 'hidden',
      minHeight: 38,
      flexShrink: 0,
    }}>
      {/* 标签列表 — 可水平滚动 */}
      <Box sx={{
        display: 'flex', alignItems: 'stretch', gap: 0.5,
        flex: 1, overflowX: 'auto', overflowY: 'hidden',
        '&::-webkit-scrollbar': { height: 3 },
        '&::-webkit-scrollbar-thumb': { bgcolor: isVendor ? '#334155' : 'text.disabled', borderRadius: 4 },
        px: 0.5,
      }}>
        {tabs.map((tab) => {
          const isActive = tab.id === location.pathname;
          return (
            <Box
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              aria-label={`切换到标签 ${tab.label}`}
              onContextMenu={(e) => {
                e.preventDefault();
                handleCloseOthers(e, tab.id);
              }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1.2, py: 0.5,
                cursor: 'pointer',
                borderRadius: '6px 6px 0 0',
                border: `1px solid ${isActive ? borderColor : 'transparent'}`,
                borderBottom: isActive ? `2px solid ${p}` : '2px solid transparent',
                bgcolor: isActive ? activeBg : 'transparent',
                whiteSpace: 'nowrap',
                fontSize: '0.7875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? activeTextColor : textColor,
                transition: 'all 0.15s',
                userSelect: 'none',
                minWidth: 0,
                maxWidth: 180,
                '&:hover': {
                  bgcolor: isActive ? activeBg : (isVendor ? 'rgba(255,255,255,0.05)' : 'action.hover'),
                },
              }}
            >
              <Typography
                variant="caption"
                noWrap
                sx={{
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  lineHeight: 1.5,
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tab.label}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => handleClose(e, tab.id)}
                aria-label={`关闭标签 ${tab.label}`}
                sx={{
                  p: 0, ml: 0.2,
                  width: 16, height: 16,
                  color: textColor,
                  '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.1)' },
                }}
              >
                <Close sx={{ fontSize: 13 }} />
              </IconButton>
            </Box>
          );
        })}
      </Box>

      {/* 右侧操作按钮 */}
      {tabs.length > 2 && (
        <Tooltip title="关闭所有标签" placement="bottom">
          <IconButton
            size="small"
            onClick={() => {
              useTabStore.getState().closeAllTabs();
              navigate('/');
            }}
            aria-label="关闭所有标签"
            sx={{ p: 0.5, color: textColor, mr: 0.5,
              '&:hover': { color: 'error.main' } }}
          >
            <CloseFullscreen sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default TabBar;
