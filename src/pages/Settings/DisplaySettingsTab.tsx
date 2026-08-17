import React from 'react';
import {
  Box, Typography, Paper, Grid, ToggleButton, ToggleButtonGroup,
  FormControlLabel, Switch, Divider, Button, Stack, Avatar, Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import {
  LightMode, DarkMode, RestartAlt, CheckCircle,
} from '@mui/icons-material';
import {
  useDisplayStore, PRIMARY_OPTIONS, DENSITY_OPTIONS, FONT_SIZE_OPTIONS,
  type ThemeMode, type PrimaryColor, type Density, type FontSize,
} from '@/stores/displayStore';

/**
 * 显示设置 Tab（P4-2 主题与显示中心）
 * 实时调整明/暗主题、主题色、密度、字号、高对比，并持久化。
 */
const DisplaySettingsTab: React.FC = () => {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const {
    mode, primary, density, fontSize, highContrast,
    setMode, setPrimary, setDensity, setFontSize, setHighContrast, reset,
  } = useDisplayStore();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600, color: 'text.primary' }}>
        显示与主题
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        个性化您的界面外观。所有设置实时生效并自动保存到本地，刷新后保留。
      </Typography>

      <Grid container spacing={3}>
        {/* 明暗主题 */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
              主题模式
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={mode}
              onChange={(_, v: ThemeMode | null) => v && setMode(v)}
              sx={{ width: '100%' }}
            >
              <ToggleButton value="light" sx={{ flex: 1, py: 1.5, borderRadius: 2 }}>
                <LightMode sx={{ mr: 1, fontSize: 20 }} /> 浅色
              </ToggleButton>
              <ToggleButton value="dark" sx={{ flex: 1, py: 1.5, borderRadius: 2 }}>
                <DarkMode sx={{ mr: 1, fontSize: 20 }} /> 深色
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
              深色模式降低夜间用眼疲劳；深色下页面框架与组件自动适配，列表/表单沿用语义配色。
            </Typography>
          </Paper>
        </Grid>

        {/* 主题色 */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
              主题色
            </Typography>
            <Stack direction="row" spacing={1.5}>
              {PRIMARY_OPTIONS.map((opt) => {
                const selected = primary === opt.value;
                return (
                  <Tooltip key={opt.value} title={opt.label}>
                    <Button
                      onClick={() => setPrimary(opt.value as PrimaryColor)}
                      sx={{
                        width: 56, height: 56, borderRadius: 2, p: 0,
                        bgcolor: alpha(opt.main, 0.12),
                        border: selected ? `2px solid ${opt.main}` : `2px solid transparent`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Avatar sx={{ bgcolor: opt.main, width: 32, height: 32 }}>
                        {selected ? <CheckCircle sx={{ fontSize: 18, color: '#fff' }} /> : null}
                      </Avatar>
                    </Button>
                  </Tooltip>
                );
              })}
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
              主题色应用于主按钮、选中态、链接与强调元素。
            </Typography>
          </Paper>
        </Grid>

        {/* 密度 */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
              界面密度
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={density}
              onChange={(_, v: Density | null) => v && setDensity(v)}
              sx={{ width: '100%' }}
            >
              {DENSITY_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value} sx={{ flex: 1, py: 1.2, borderRadius: 2 }}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
              {DENSITY_OPTIONS.find((o) => o.value === density)?.desc}
            </Typography>
          </Paper>
        </Grid>

        {/* 字号 + 高对比 */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: 'text.primary' }}>
              字号
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={fontSize}
              onChange={(_, v: FontSize | null) => v && setFontSize(v)}
              sx={{ width: '100%', mb: 2 }}
            >
              {FONT_SIZE_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value} sx={{ flex: 1, py: 1.2, borderRadius: 2 }}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Divider sx={{ my: 1.5, borderColor: 'divider' }} />
            <FormControlLabel
              control={
                <Switch
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: p }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: p } }}
                />
              }
              label={<Box><Typography variant="body2" fontWeight={500} sx={{ color: 'text.primary' }}>高对比模式</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>增强文字与边框对比，提升可读性（WCAG 取向）</Typography></Box>}
            />
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RestartAlt />}
          onClick={reset}
          sx={{ color: 'text.secondary', borderColor: 'divider' }}
        >
          恢复默认显示设置
        </Button>
      </Box>
    </Box>
  );
};

export default DisplaySettingsTab;
