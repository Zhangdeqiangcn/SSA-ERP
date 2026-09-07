import React, { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Box, BottomNavigation, BottomNavigationAction, Paper, CircularProgress,
} from '@mui/material';
import { Home, QrCodeScanner, LocalShipping, Inventory2, Verified, Notifications } from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';

/**
 * 移动门户布局（PWA，V2.78.0）。与 /vendor-portal 同构的独立门户：
 * 移动优先 UI、底部 Tab 导航、适配刘海屏安全区（safe-area）。
 * 登录态复用主应用（RequireAuth 包裹）；数据直连真实 D1。
 */
const MobilePortalLayout: React.FC = () => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.currentUser);
  const tab =
    ['/m/outbound', '/m/stocktake', '/m/quality', '/m/inbound', '/m/messages'].find((p) => pathname.startsWith(p)) || '/m';

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" sx={{ bgcolor: '#1E293B' }}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, fontSize: '1.05rem' }}>
            SSA ERP 移动门户
          </Typography>
          <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
            {user?.name || '未登录（本地模式）'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, pb: 'calc(56px + env(safe-area-inset-bottom))' }}>
        <Suspense fallback={(
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        >
          <Outlet />
        </Suspense>
      </Box>

      <Paper
        elevation={8}
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: (t) => t.zIndex.appBar }}
      >
        <BottomNavigation
          showLabels
          value={tab}
          onChange={(_, v: string) => { if (v) nav(v); }}
          sx={{ pb: 'env(safe-area-inset-bottom)' }}
        >
          <BottomNavigationAction label="首页" value="/m" icon={<Home />} />
          <BottomNavigationAction label="扫码入库" value="/m/inbound" icon={<QrCodeScanner />} />
          <BottomNavigationAction label="出库" value="/m/outbound" icon={<LocalShipping />} />
          <BottomNavigationAction label="盘点" value="/m/stocktake" icon={<Inventory2 />} />
          <BottomNavigationAction label="质检" value="/m/quality" icon={<Verified />} />
          <BottomNavigationAction label="消息" value="/m/messages" icon={<Notifications />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default MobilePortalLayout;
