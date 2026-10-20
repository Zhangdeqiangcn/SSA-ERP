import React, { useState } from 'react';
import {
  Box, Stack, Typography, Switch, FormControlLabel, TextField, Button, Paper,
  Divider, Alert, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSettingsStore, InspectionStandardConfig, DEFAULT_INSPECTION_STANDARD_CONFIG } from '@/stores/settingsStore';

/**
 * V3.65.0 立项③：检验标准配置引擎（系统设置 · 配置 Tab）。
 *
 * 背景（根治 P1-5「检验标准未纳入配置引擎统一管理」）：
 *   此前质量模块建检验任务时，AQL/检验水平要么写死 'N/A'、要么逐单手填，
 *   不同组织、不同物料类别的标准互不一致，供应商绩效扣分口径也缺统一基准。
 *   本 Tab 把「默认抽样方案 + 按物料类别的 AQL/检验水平覆盖」收进 settingsStore
 *   配置引擎，质量模块（qualityStore.addInspectionTask）经
 *   resolveInspectionConfig(cfg, materialCategory) 消费：
 *     · 命中类别覆盖 → 用类别值；
 *     · 未命中 → 用默认；
 *     · 配置停用/数据残缺 → 回退安全默认（fromConfig=false，绝不卡业务）。
 *   与凭证模板「未命中回退内置」、自动审批「无启用流程静默跳过」同口径：
 *   配置驱动但不绑架业务。
 */
const CATEGORY_SUGGESTIONS = ['关键件', '标准件', '外观件', '冷轧板', '热轧卷', '不锈钢板', '镀锌板', '辅料五金', '包装材料'];

const InspectionStandardConfigTab: React.FC = () => {
  const cfg = useSettingsStore((s) => s.inspectionStandardConfig);
  const setCfg = useSettingsStore((s) => s.setInspectionStandardConfig);

  const [draft, setDraft] = useState<InspectionStandardConfig>(JSON.parse(JSON.stringify(cfg)));
  const [newCategory, setNewCategory] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setCfg(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  const handleReset = () => {
    setDraft(JSON.parse(JSON.stringify(DEFAULT_INSPECTION_STANDARD_CONFIG)));
    setCfg(JSON.parse(JSON.stringify(DEFAULT_INSPECTION_STANDARD_CONFIG)));
  };

  const updateCategory = (key: string, patch: Partial<{ aql: number; level: string }>) => {
    setDraft((d) => ({
      ...d,
      perCategory: { ...d.perCategory, [key]: { aql: d.perCategory[key]?.aql ?? 1.0, level: d.perCategory[key]?.level ?? 'II', ...patch } },
    }));
  };
  const addCategory = () => {
    const c = newCategory.trim();
    if (!c || draft.perCategory[c]) return;
    setDraft((d) => ({ ...d, perCategory: { ...d.perCategory, [c]: { aql: d.defaultAql, level: d.defaultLevel } } }));
    setNewCategory('');
  };
  const removeCategory = (key: string) => {
    setDraft((d) => {
      const next = { ...d.perCategory };
      delete next[key];
      return { ...d, perCategory: next };
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>检验标准配置（抽样方案引擎）</Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        配置质量模块建检验任务时自动套用的 AQL（接收质量限）与检验水平。
        可按<b>物料类别</b>设覆盖：命中类别用类别值，否则用下方默认值。
        配置停用或数据残缺时，质量模块自动回退到安全默认（不会阻断建任务）。
      </Alert>

      <FormControlLabel
        control={
          <Switch
            data-testid="inspection-cfg-enabled"
            checked={draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
          />
        }
        label="启用检验标准配置引擎"
        sx={{ mb: 2 }}
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>默认抽样方案（未命中类别时套用）</Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            data-testid="inspection-cfg-default-aql"
            label="默认 AQL（%）"
            type="number"
            value={draft.defaultAql}
            InputProps={{ inputProps: { min: 0, max: 100 } }}
            onChange={(e) => setDraft((d) => ({ ...d, defaultAql: Math.max(0, Number(e.target.value) || 0) }))}
            sx={{ width: 180 }}
          />
          <TextField
            data-testid="inspection-cfg-default-level"
            label="默认检验水平（S-1..S-4 / I / II / III）"
            value={draft.defaultLevel}
            onChange={(e) => setDraft((d) => ({ ...d, defaultLevel: e.target.value || 'II' }))}
            sx={{ width: 240 }}
          />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>按物料类别覆盖</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          提示：{CATEGORY_SUGGESTIONS.join(' / ')}（点击添加到列表）
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {CATEGORY_SUGGESTIONS.map((c) => (
            <Button key={c} size="small" startIcon={<AddIcon />} variant={draft.perCategory[c] ? 'outlined' : 'text'}
              disabled={!!draft.perCategory[c]} onClick={() => { setNewCategory(c); addCategory(); }}>
              {c}
            </Button>
          ))}
        </Stack>

        {(Object.keys(draft.perCategory).length > 0 ? Object.keys(draft.perCategory) : []).map((cat) => (
          <Stack key={cat} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 90, fontWeight: 600 }}>{cat}</Typography>
            <TextField data-testid={`inspection-cfg-cat-${cat}-aql`} label="AQL" type="number" size="small"
              value={draft.perCategory[cat]?.aql ?? 1.0}
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              onChange={(e) => updateCategory(cat, { aql: Math.max(0, Number(e.target.value) || 0) })}
              sx={{ width: 120 }} />
            <TextField data-testid={`inspection-cfg-cat-${cat}-level`} label="水平" size="small"
              value={draft.perCategory[cat]?.level ?? 'II'}
              onChange={(e) => updateCategory(cat, { level: e.target.value || 'II' })}
              sx={{ width: 120 }} />
            <IconButton aria-label="删除" onClick={() => removeCategory(cat)}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        ))}
      </Paper>

      <Divider sx={{ mb: 2 }} />
      {saved && <Alert severity="success" sx={{ mb: 2 }}>检验标准配置已保存，质量模块建任务即时生效</Alert>}
      <Stack direction="row" spacing={2}>
        <Button variant="contained" data-testid="inspection-cfg-save" onClick={handleSave}>保存</Button>
        <Button variant="outlined" onClick={handleReset}>恢复默认</Button>
      </Stack>
    </Box>
  );
};

export default InspectionStandardConfigTab;
