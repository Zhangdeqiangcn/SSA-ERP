/**
 * 全局键盘快捷键与无障碍支持（P4-7）
 * - 快捷键帮助面板（? 或顶栏「?」按钮打开）
 * - g 组合键快速跳转常用模块（对标 Gmail 风格键盘导航）
 * - 忽略输入框内的按键，避免干扰表单输入
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, List, ListItem,
  ListItemIcon, ListItemText, Box, Typography, Divider, Chip,
} from '@mui/material';
import { Keyboard, Dashboard, Inventory2, Assignment, Storefront, Workspaces, AccountTree, FactCheck, Receipt, EventNote, Assessment, Search, Save, Delete, Print, Refresh, Add, Edit, Undo, Redo, Close } from '@mui/icons-material';
import { useUIStore } from '@/stores/uiStore';

/** g 组合键 → 路由映射 */
const G_NAV: Record<string, { path: string; label: string; icon: React.ReactNode }> = {
  d: { path: '/', label: '仪表盘', icon: <Dashboard fontSize="small" /> },
  m: { path: '/material/list', label: '物料列表', icon: <Inventory2 fontSize="small" /> },
  o: { path: '/purchase/orders', label: '采购订单', icon: <Assignment fontSize="small" /> },
  s: { path: '/sales/orders', label: '销售订单', icon: <Storefront fontSize="small" /> },
  w: { path: '/profile', label: '个人中心', icon: <Workspaces fontSize="small" /> },
  b: { path: '/bom/list', label: 'BOM 列表', icon: <AccountTree fontSize="small" /> },
  q: { path: '/quality/inspection', label: '检验任务', icon: <FactCheck fontSize="small" /> },
  f: { path: '/finance/invoices', label: '发票管理', icon: <Receipt fontSize="small" /> },
  p: { path: '/production/orders', label: '工单管理', icon: <EventNote fontSize="small" /> },
  r: { path: '/reports', label: '报表中心', icon: <Assessment fontSize="small" /> },
};

const isEditableTarget = (el: EventTarget | null): boolean => {
  if (!el || !(el as HTMLElement).tagName) return false;
  const tag = (el as HTMLElement).tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return (el as HTMLElement).isContentEditable === true;
};

const KeyboardShortcuts: React.FC = () => {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.shortcutsHelpOpen);
  const setOpen = useUIStore((s) => s.setShortcutsHelpOpen);
  const pendingGRef = useRef(false);
  const gTimerRef = useRef<number | null>(null);

  const clearG = () => {
    pendingGRef.current = false;
    if (gTimerRef.current) {
      window.clearTimeout(gTimerRef.current);
      gTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      // ? 打开快捷键帮助（Shift + /）
      if (e.key === '?') {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // g 组合键：先按 g，1 秒内再按目标键跳转
      if (pendingGRef.current && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = G_NAV[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          navigate(target.path);
          clearG();
          return;
        }
        clearG();
      }

      if ((!e.ctrlKey && !e.metaKey && !e.altKey) && e.key.toLowerCase() === 'g') {
        pendingGRef.current = true;
        if (gTimerRef.current) window.clearTimeout(gTimerRef.current);
        gTimerRef.current = window.setTimeout(clearG, 1000);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearG();
    };
  }, [navigate, setOpen]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      aria-label="键盘快捷键帮助"
      maxWidth="sm"
      fullWidth
      data-testid="kbd-shortcuts"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Keyboard fontSize="small" />
        键盘快捷键
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          使用键盘即可快速导航与操作。在输入框内按键不会触发快捷键。
        </Typography>
        <List dense disablePadding>
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>K</Box>
                </Box>
              }
              secondary="打开全局搜索"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>?</Box>
                  <Typography variant="caption" color="text.secondary">（Shift + /）</Typography>
                </Box>
              }
              secondary="打开本快捷键帮助面板"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={<Box component="kbd" sx={kbdStyle}>Esc</Box>}
              secondary="关闭弹窗 / 搜索框"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Tab</Box>
                  <Typography variant="caption" color="text.secondary">/</Typography>
                  <Box component="kbd" sx={kbdStyle}>Shift</Box>
                  <Box component="kbd" sx={kbdStyle}>Tab</Box>
                </Box>
              }
              secondary="在界面元素间向前 / 向后移动焦点"
            />
          </ListItem>
        </List>

        {/* 常用操作快捷键 */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>常用操作</Typography>
        <List dense disablePadding>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Search fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>K</Box>
                </Box>
              }
              secondary="打开全局搜索"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Save fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>S</Box>
                </Box>
              }
              secondary="保存当前表单（在编辑页时生效）"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Delete fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>D</Box>
                </Box>
              }
              secondary="删除当前选中项（需确认）"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Print fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>P</Box>
                </Box>
              }
              secondary="打印/预览当前页面"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Refresh fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>R</Box>
                </Box>
              }
              secondary="刷新当前列表数据"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Add fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>N</Box>
                </Box>
              }
              secondary="新建记录（当前模块）"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Edit fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>E</Box>
                </Box>
              }
              secondary="编辑当前记录"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Undo fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>Z</Box>
                </Box>
              }
              secondary="撤销上一步操作"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Redo fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>Y</Box>
                </Box>
              }
              secondary="重做已撤销的操作"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Close fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="kbd" sx={kbdStyle}>Ctrl</Box>
                  <Box component="kbd" sx={kbdStyle}>W</Box>
                </Box>
              }
              secondary="关闭当前标签页"
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 1.5 }} />
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          <Box component="kbd" sx={kbdStyle}>g</Box> 组合键 · 快速跳转模块
        </Typography>
        <List dense disablePadding>
          {Object.entries(G_NAV).map(([key, nav]) => (
            <ListItem key={key}>
              <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{nav.icon}</ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="kbd" sx={kbdStyle}>g</Box>
                    <Box component="kbd" sx={kbdStyle}>{key}</Box>
                  </Box>
                }
                secondary={`跳转到${nav.label}`}
              />
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 1.5 }}>
          <Chip label="提示：先按 g，再在 1 秒内按目标字母即可跳转" size="small" variant="outlined" />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 22,
  height: 22,
  paddingInline: 6,
  fontSize: '0.72rem',
  fontFamily: 'monospace',
  backgroundColor: 'rgba(0, 0, 0, 0.06)',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
};

export default KeyboardShortcuts;
