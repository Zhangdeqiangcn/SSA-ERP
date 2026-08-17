import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import { useSettingsStore } from '@/stores/settingsStore';
import { MaterialRatingConfig, MaterialRatingWeights } from '@/stores/settingsStore';

type WeightKey = keyof MaterialRatingWeights;

const WEIGHT_LABELS: Record<WeightKey, string> = {
  bomUsage: '更多BOM使用',
  purchaseFreq: '采购频次高',
  shortLead: '交货期短',
  lowMoq: '起订量低',
  goodQuality: '质量好',
};

const WEIGHT_KEYS: WeightKey[] = ['bomUsage', 'purchaseFreq', 'shortLead', 'lowMoq', 'goodQuality'];

const DEFAULT_CONFIG: MaterialRatingConfig = {
  enabled: true,
  weights: { bomUsage: 25, purchaseFreq: 25, shortLead: 20, lowMoq: 15, goodQuality: 15 },
  thresholds: { A: 80, B: 60, C: 40 },
};

const MaterialRatingTab: React.FC = () => {
  const materialRatingConfig = useSettingsStore((s) => s.materialRatingConfig);
  const setMaterialRatingConfig = useSettingsStore((s) => s.setMaterialRatingConfig);

  const [enabled, setEnabled] = useState<boolean>(materialRatingConfig.enabled);
  const [weights, setWeights] = useState<MaterialRatingWeights>({ ...materialRatingConfig.weights });
  const [thresholds, setThresholds] = useState<{ A: number; B: number; C: number }>({
    ...materialRatingConfig.thresholds,
  });

  const handleSave = () => {
    setMaterialRatingConfig({ enabled, weights, thresholds });
  };

  const handleReset = () => {
    setEnabled(DEFAULT_CONFIG.enabled);
    setWeights({ ...DEFAULT_CONFIG.weights });
    setThresholds({ ...DEFAULT_CONFIG.thresholds });
    setMaterialRatingConfig(DEFAULT_CONFIG);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        物料自动评级设置
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        配置各评价指标权重（0-100）与等级阈值，详情页将实时聚合 BOM、采购、质量数据计算评级。
      </Alert>

      <FormControlLabel
        control={
          <Switch
            data-testid="rating-enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        }
        label="启用自动评级"
        sx={{ mb: 2 }}
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>指标权重</Typography>
        <Stack spacing={2}>
          {WEIGHT_KEYS.map((key) => (
            <TextField
              key={key}
              data-testid={`rating-weight-${key}`}
              label={WEIGHT_LABELS[key]}
              type="number"
              value={weights[key]}
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              onChange={(e) => {
                const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                setWeights((prev) => ({ ...prev, [key]: v }));
              }}
              fullWidth
            />
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>等级阈值（总分 ≥ 阈值）</Typography>
        <Stack spacing={2}>
          <TextField
            data-testid="rating-threshold-A"
            label="A 级阈值"
            type="number"
            value={thresholds.A}
            InputProps={{ inputProps: { min: 0, max: 100 } }}
            onChange={(e) => setThresholds((prev) => ({ ...prev, A: Number(e.target.value) || 0 }))}
            fullWidth
          />
          <TextField
            data-testid="rating-threshold-B"
            label="B 级阈值"
            type="number"
            value={thresholds.B}
            InputProps={{ inputProps: { min: 0, max: 100 } }}
            onChange={(e) => setThresholds((prev) => ({ ...prev, B: Number(e.target.value) || 0 }))}
            fullWidth
          />
          <TextField
            data-testid="rating-threshold-C"
            label="C 级阈值"
            type="number"
            value={thresholds.C}
            InputProps={{ inputProps: { min: 0, max: 100 } }}
            onChange={(e) => setThresholds((prev) => ({ ...prev, C: Number(e.target.value) || 0 }))}
            fullWidth
          />
        </Stack>
      </Paper>

      <Divider sx={{ mb: 2 }} />

      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={handleSave}>
          保存
        </Button>
        <Button variant="outlined" onClick={handleReset}>
          恢复默认
        </Button>
      </Stack>
    </Box>
  );
};

export default MaterialRatingTab;
