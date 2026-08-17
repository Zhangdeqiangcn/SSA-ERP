import { Box, CircularProgress, Typography } from '@mui/material';

/** 路由懒加载时的占位，避免布局（侧边栏/顶栏）闪烁。 */
const PageFallback: React.FC = () => (
  <Box
    sx={{
      flex: 1,
      minHeight: 320,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1.5,
      color: 'text.secondary',
    }}
  >
    <CircularProgress size={28} thickness={4} sx={{ color: '#3B82F6' }} />
    <Typography variant="caption" color="text.secondary">页面加载中…</Typography>
  </Box>
);

export default PageFallback;
