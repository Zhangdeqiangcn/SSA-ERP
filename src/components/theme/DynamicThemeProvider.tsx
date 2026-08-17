import React, { useMemo, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useDisplayStore } from '@/stores/displayStore';
import { createAppTheme } from '@/theme';

/**
 * 动态主题 Provider（P4-2）
 * 读取显示偏好 store，按需重算 MUI 主题并注入。
 * 同时把 mode 写到 <html data-theme>，便于全局 CSS（滚动条等）适配。
 */
const DynamicThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mode = useDisplayStore((s) => s.mode);
  const primary = useDisplayStore((s) => s.primary);
  const density = useDisplayStore((s) => s.density);
  const fontSize = useDisplayStore((s) => s.fontSize);
  const highContrast = useDisplayStore((s) => s.highContrast);

  const theme = useMemo(
    () => createAppTheme({ mode, primary, density, fontSize, highContrast }),
    [mode, primary, density, fontSize, highContrast]
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default DynamicThemeProvider;
