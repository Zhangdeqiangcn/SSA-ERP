import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Sidebar from './Sidebar';
import Header from './Header';
import TabBar from './TabBar';
import KeyboardShortcuts from './KeyboardShortcuts';
import { ErrorBoundary, PageFallback } from '@/components/common';
import { useUIStore } from '@/stores/uiStore';
import AIAssistant from '@/components/AI/AIAssistant';
import HelpButton from '@/components/Help/HelpButton';
import GuidedTour from '@/components/Help/GuidedTour';
import SyncStatusBanner from '@/components/common/SyncStatusBanner';
import B2SyncStatus from '@/components/B2SyncStatus';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 72;

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  // P4-6 响应式：移动端(<600)内容占满、平板(600~899)跟随折叠栏
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const ml = isMobile ? 0 : isTablet ? DRAWER_COLLAPSED_WIDTH : sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <KeyboardShortcuts />
      <Header />
      <Sidebar />
      <AIAssistant />
      <HelpButton />
      <GuidedTour />
      <SyncStatusBanner />
      <B2SyncStatus />
      <Box
        component="main"
        aria-label="主内容区"
        sx={{
          flexGrow: 1,
          ml: `${ml}px`,
          mt: '64px',
          transition: 'margin 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {/* 多标签页导航栏 */}
        <TabBar variant="default" />

        {/* 页面内容 */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
