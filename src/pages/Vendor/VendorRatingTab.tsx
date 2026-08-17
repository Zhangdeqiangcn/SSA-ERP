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
import { useSettingsStore, VendorRatingConfig, VendorRatingWeights } from '@/stores/settingsStore';

type WeightKey = keyof VendorRatingWeights;

const WEIGHT_LABELS: Record<WeightKey, string> = {
  quality: '质量合格率（来料检验通过率 / NCR）',
  delivery: '交期达成率（按约交付占比）',
  price: '价格竞争力（对比同物料最低价）',
};

const WEIGHT_KEYS: WeightKey[] = ['quality', 'delivery', 'price'];

const DEFAULT_CONFIG: VendorRatingConfig = {
  enabled: true,
  weights: { quality: 40, delivery: 35, price: 25 },
  thresholds: { A: 80, B: 60, C: 40 },
};

const VendorRatingTab: React.FC = () => {
  const vendorRatingConfig = useSettingsStore((s) => s.vendorRatingConfig);
  const setVendorRatingConfig = useSettingsStore((s) => s.setVendorRatingConfig);

  const [enabled, setEnabled] = useState<boolean>(vendorRatingConfig.enabled);
  const [weights, setWeights] = useState<VendorRatingWeights>({ ...vendorRatingConfig.weights });
  const [thresholds, setThresholds] = useState<{ A: number; B: number; C: number }>({
    ...vendorRatingConfig.thresholds,
  });

  const handleSave = () => {
    setVendorRatingConfig({ enabled, weights, thresholds });
  };

  const handleReset = () => {
    setEnabled(DEFAULT_CONFIG.enabled);
    setWeights({ ...DEFAULT_CONFIG.weights });
    setThresholds({ ...DEFAULT_CONFIG.thresholds });
    setVendorRatingConfig(DEFAULT_CONFIG);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        供应商绩效自动评级设置
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        配置各绩效指标权重（0-100）与等级阈值。供应商详情页将实时聚合质量（来料检验）、交期（采购订单）、价格（价目表）数据自动计算 A/B/C/D 评级，无需人工干预。
      </Alert>

      <FormControlLabel
        control={
          <Switch
            data-testid="vendor-rating-enabled"
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
              data-testid={`vendor-rating-weight-${key}`}
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
            data-testid="vendor-rating-threshold-A"
            label="A 级阈值"
            type="number"
            value={thresholds.A}
            InputProps={{ inputProps: { min: 0, max: 100 } }}
            onChange={(e) => setThresholds((prev) => ({ ...prev, A: Number(e.target.value) || 0 }))}
            fullWidth
          />
          <TextField
            data-testid="vendor-rating-threshold-B"
            label="B 级阈值"
            type="number"
            value={thresholds.B}
            InputProps={{ inputProps: { min: 0, max: 100 } }}
            onChange={(e) => setThresholds((prev) => ({ ...prev, B: Number(e.target.value) || 0 }))}
            fullWidth
          />
          <TextField
            data-testid="vendor-rating-threshold-C"
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

export default VendorRatingTab;
