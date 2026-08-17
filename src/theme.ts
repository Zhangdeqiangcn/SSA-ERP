import { createTheme, type Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import {
  DEFAULT_DISPLAY_PREFS,
  type DisplayPrefs,
  type PrimaryColor,
  type ThemeMode,
  type Density,
  type FontSize,
} from './stores/displayStore';

// ────────────────────────────────────────────────
// 主题预设（P4-2 主题与显示中心）
// light 默认值精确还原旧静态主题，保证既有 UI 零回归。
// ────────────────────────────────────────────────
const PRIMARY_PRESETS: Record<PrimaryColor, { main: string; light: string; dark: string }> = {
  blue: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
  green: { main: '#10B981', light: '#34D399', dark: '#059669' },
  indigo: { main: '#6366F1', light: '#818CF8', dark: '#4F46E5' },
};

const FONT_SCALE: Record<FontSize, number> = { small: 0.92, medium: 1, large: 1.08 };

const DENSITY: Record<Density, { btnPy: number; btnPx: number; cellPy: number; radius: number; headFs: string }> = {
  compact: { btnPy: 6, btnPx: 16, cellPy: 0.8, radius: 8, headFs: '0.6875rem' },
  comfortable: { btnPy: 8, btnPx: 20, cellPy: 1.2, radius: 12, headFs: '0.75rem' },
  cozy: { btnPy: 10, btnPx: 24, cellPy: 1.6, radius: 14, headFs: '0.8125rem' },
};

/**
 * 动态主题工厂：根据显示偏好生成 MUI 主题。
 * 默认（light/blue/comfortable/medium/非高对比）输出与历史静态主题完全一致。
 */
export function createAppTheme(prefs: Partial<DisplayPrefs> = {}): Theme {
  const { mode, primary, density, fontSize, highContrast } = { ...DEFAULT_DISPLAY_PREFS, ...prefs };
  const isDark = mode === 'dark';
  const p = PRIMARY_PRESETS[primary];
  const d = DENSITY[density];
  const scale = FONT_SCALE[fontSize];

  const textPrimary = isDark ? (highContrast ? '#FFFFFF' : '#E2E8F0') : (highContrast ? '#0F172A' : '#1E293B');
  const textSecondary = isDark ? (highContrast ? '#CBD5E1' : '#94A3B8') : (highContrast ? '#334155' : '#64748B');
  const bgDefault = isDark ? '#0F172A' : '#F8FAFC';
  const bgPaper = isDark ? '#1E293B' : '#FFFFFF';
  const divider = isDark
    ? highContrast ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.16)'
    : highContrast ? 'rgba(148,163,184,0.9)' : 'rgba(226,232,240,0.8)';
  const selectedBg = alpha(p.main, isDark ? 0.18 : 0.08);
  const selectedBgHover = alpha(p.main, isDark ? 0.26 : 0.12);
  const hoverBg = isDark ? 'rgba(148,163,184,0.10)' : '#F1F5F9';
  const headBg = isDark ? alpha('#FFFFFF', 0.04) : '#F8FAFC';
  const headColor = isDark ? '#CBD5E1' : '#475569';

  return createTheme({
    palette: {
      mode,
      primary: { main: p.main, light: p.light, dark: p.dark, contrastText: '#ffffff' },
      secondary: { main: '#6366F1', light: '#818CF8', dark: '#4F46E5', contrastText: '#ffffff' },
      success: { main: '#10B981', light: '#34D399', dark: '#059669' },
      warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
      error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
      info: { main: '#06B6D4', light: '#22D3EE', dark: '#0891B2' },
      background: { default: bgDefault, paper: bgPaper },
      text: { primary: textPrimary, secondary: textSecondary },
      divider,
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      h1: { fontSize: `${2 * scale}rem`, fontWeight: 600, letterSpacing: '-0.025em' },
      h2: { fontSize: `${1.75 * scale}rem`, fontWeight: 600, letterSpacing: '-0.025em' },
      h3: { fontSize: `${1.5 * scale}rem`, fontWeight: 600, letterSpacing: '-0.025em' },
      h4: { fontSize: `${1.25 * scale}rem`, fontWeight: 600, letterSpacing: '-0.025em' },
      h5: { fontSize: `${1.125 * scale}rem`, fontWeight: 600, letterSpacing: '-0.025em' },
      h6: { fontSize: `${1 * scale}rem`, fontWeight: 600, letterSpacing: '-0.025em' },
      body1: { fontSize: `${0.875 * scale}rem`, lineHeight: 1.6 },
      body2: { fontSize: `${0.8125 * scale}rem`, lineHeight: 1.6 },
      caption: { fontSize: `${0.75 * scale}rem`, letterSpacing: '0.025em' },
    },
    shape: { borderRadius: d.radius },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: Math.max(6, d.radius - 4),
            padding: `${d.btnPy}px ${d.btnPx}px`,
            boxShadow: 'none',
            '&:hover': { boxShadow: `0 4px 12px ${alpha(p.main, 0.25)}` },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.4)'
              : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
            border: `1px solid ${divider}`,
            borderRadius: d.radius,
            transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
            '&:hover': {
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            backgroundColor: headBg,
            color: headColor,
            fontSize: d.headFs,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
          body: { fontSize: `${0.875 * scale}rem`, color: textPrimary },
        },
      },
      MuiDrawer: {
        styleOverrides: { paper: { borderRight: `1px solid ${divider}`, boxShadow: 'none' } },
      },
      MuiAppBar: {
        styleOverrides: { root: { boxShadow: 'none', borderBottom: `1px solid ${divider}` } },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.4)'
              : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
            border: `1px solid ${divider}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 8px',
            padding: `${d.cellPy}px 16px`,
            '&.Mui-selected': {
              bgcolor: selectedBg,
              color: p.main,
              '& .MuiListItemIcon-root': { color: p.main },
              '&:hover': { bgcolor: selectedBgHover },
            },
            '&:hover': { bgcolor: hoverBg },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, color: textSecondary } } },
      MuiAvatar: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 500, borderRadius: 6 } } },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '& fieldset': { borderColor: divider },
              '&:hover fieldset': { borderColor: isDark ? '#94A3B8' : '#CBD5E1' },
              '&.Mui-focused fieldset': { borderColor: p.main },
            },
          },
        },
      },
    },
  });
}

// 向后兼容默认导出（与旧 static theme 完全一致）
const defaultTheme = createAppTheme();
export default defaultTheme;
