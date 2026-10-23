/**
 * V3.95.0 系统设置 —— 自动化设置中心 Tab
 * 物料类别分工驱动的表单自动流转：
 *   · 顶部「全局默认矩阵」：每段 开/关 + 做到哪一步（到步可配）
 *   · 中部「按物料分类覆盖」：选分类 → 配该分类的深度（关键件保守、通用件激进）
 *   · 底部「自动化运行日志」：谁/何时/哪段/结果
 * 各段实际执行逻辑（自动下单/自动领料…）由业务侧调用
 *   isStageActive / stageReaches（types/automation.ts）门控，未开启=静默不触发。
 */
import React, { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Switch, FormControl, InputLabel, Select, MenuItem,
  Stack, Alert, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Button, Tooltip, TablePagination,
} from '@mui/material';
import { AutoAwesome, Delete } from '@mui/icons-material';
import { useAutomationStore } from '@/stores/automationStore';
import { useMaterialStore, flattenCategories } from '@/stores/materialStore';
import { useEffect, useRef } from 'react';
import {
  AutomationStage, ExecuteStep, StageConfig,
  AUTOMATION_STAGE_LABELS, EXECUTE_STEP_LABELS,
} from '@/types/automation';

const STAGES: AutomationStage[] = [
  'mrp_decompose', 'purchase_request', 'inquiry_compare',
  'po_place', 'sourcing', 'requisition', 'work_order',
];

/** 一段落配置行的编辑单元（受控） */
function StageRow({
  stage, value, globalValue, source, onChange,
}: {
  stage: AutomationStage;
  value: StageConfig;
  globalValue: StageConfig;
  source: 'category' | 'global' | 'off';
  onChange: (patch: Partial<StageConfig>) => void;
}) {
  return (
    <TableRow hover sx={{ '&:hover': { bgcolor: 'rgba(30,41,59,0.02)' } }}>
      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2">{AUTOMATION_STAGE_LABELS[stage]}</Typography>
          {source === 'category' && (
            <Tooltip title="该段来自「按分类覆盖」">
              <Chip label="分类覆盖" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell align="center">
        <Switch
          size="small"
          checked={value.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Select
            size="small"
            value={value.enabled ? value.step : 'off'}
            disabled={!value.enabled}
            onChange={(e) => onChange({ step: e.target.value as ExecuteStep })}
            sx={{ width: 150, bgcolor: value.enabled ? 'background.paper' : 'action.disabledBackground' }}
          >
            <MenuItem value="off">不发起</MenuItem>
            <MenuItem value="suggest">{EXECUTE_STEP_LABELS.suggest}</MenuItem>
            <MenuItem value="draft">{EXECUTE_STEP_LABELS.draft}</MenuItem>
            <MenuItem value="post">{EXECUTE_STEP_LABELS.post}</MenuItem>
          </Select>
          {source === 'category' && globalValue.step !== value.step && (
            <Typography variant="caption" color="text.secondary">
              全局默认：{EXECUTE_STEP_LABELS[globalValue.step]}
            </Typography>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

const AutomationTab: React.FC = () => {
  const {
    config, runLogs,
    setGlobalStage, setCategoryStage, clearCategory,
  } = useAutomationStore();
  const { categories } = useMaterialStore();
  // 分类为共享主数据，挂载时从 D1 拉取（离线/未登录回退内存态）
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      void useMaterialStore.getState().loadCategories();
    }
  }, []);

  const flatCats = useMemo(() => flattenCategories(categories), [categories]);
  const [catId, setCatId] = useState<string>('');
  const [logPage, setLogPage] = useState(0);
  const [logRows, setLogRows] = useState(20);

  const catStages: Partial<Record<AutomationStage, StageConfig>> | undefined =
    catId ? config.perCategory[catId] : undefined;

  // 分类某段生效值（含 source 标注：分类覆盖 or 全局 or off）
  const catEffective = (stage: AutomationStage): { v: StageConfig; src: 'category' | 'global' | 'off' } => {
    const ov = catStages?.[stage];
    if (ov) return { v: ov, src: 'category' };
    const g = config.global[stage];
    return g.enabled ? { v: g, src: 'global' } : { v: { enabled: false, step: 'off' }, src: 'off' };
  };

  const pagedLogs = runLogs.slice(logPage * logRows, logPage * logRows + logRows);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        <AutoAwesome sx={{ verticalAlign: 'middle', mr: 0.5 }} />
        自动化设置中心
      </Typography>
      <Typography variant="caption" color="text.secondary">
        销售订单 → BOM → MRP 分解 → 采购需求 / 采购单 / 询价比价 / 寻源提示 / 仓库领料 / 生产工单。
        「是否发起、做到哪一步」由系统管理员在此按物料分类配置；未开启的段落静默不触发。修改即时生效并写入云端（组织共享）。
      </Typography>

      {/* ── 一、全局默认矩阵 ── */}
      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8FAFC' }}>
          <Typography variant="subtitle2" fontWeight={700}>一、全局默认矩阵</Typography>
          <Typography variant="caption" color="text.secondary">
            全公司统一的基线；「做到哪一步」三档：仅建议（不落单据）/ 生成草稿待确认（人工一键生效）/ 直接生效过账（最激进）。
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>段落</TableCell>
                <TableCell align="center" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>是否发起</TableCell>
                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>做到哪一步</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {STAGES.map((stage) => (
                <StageRow
                  key={stage}
                  stage={stage}
                  value={config.global[stage]}
                  globalValue={config.global[stage]}
                  source="global"
                  onChange={(patch) => setGlobalStage(stage, patch)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── 二、按物料分类覆盖 ── */}
      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8FAFC' }}>
          <Typography variant="subtitle2" fontWeight={700}>二、按物料分类覆盖</Typography>
          <Typography variant="caption" color="text.secondary">
            特殊分类可单独调深度（如关键件保守「仅建议」、通用件激进「直接生效」）；未覆盖的段落自动回退全局默认。
          </Typography>
        </Box>
        <Box sx={{ px: 2, pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <FormControl fullWidth size="small">
                <InputLabel>选择物料分类</InputLabel>
                <Select
                  value={catId}
                  label="选择物料分类"
                  onChange={(e) => setCatId(e.target.value)}
                >
                  {flatCats.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {'\u00A0\u00A0'.repeat((c.level || 1) - 1)}
                      {c.name}{c.code ? ` (${c.code})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {catId && (
              <Grid item xs={12} md={7}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label="已配置覆盖"
                    size="small"
                    color={catStages ? 'primary' : 'default'}
                    variant={catStages ? 'filled' : 'outlined'}
                  />
                  {catStages && (
                    <Button size="small" color="error" startIcon={<Delete />}
                      onClick={() => { clearCategory(catId); }}>
                      清除该分类覆盖
                    </Button>
                  )}
                </Stack>
              </Grid>
            )}
          </Grid>

          {catId ? (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>段落</TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>是否发起</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>做到哪一步</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {STAGES.map((stage) => {
                    const { v, src } = catEffective(stage);
                    return (
                      <StageRow
                        key={stage}
                        stage={stage}
                        value={v}
                        globalValue={config.global[stage]}
                        source={src}
                        onChange={(patch) => setCategoryStage(catId, stage, patch)}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
              选择左侧分类即可配置「该分类」的自动化深度；未选分类时，所有分类走上方「全局默认矩阵」。
            </Alert>
          )}
        </Box>
      </Paper>

      {/* ── 三、自动化运行日志 ── */}
      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8FAFC' }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>三、自动化运行日志</Typography>
            <Typography variant="caption" color="text.secondary">
              谁在何时触发了哪段、结果如何（本地保留最近 200 条；完整流水在云端可追溯）。
            </Typography>
          </Box>
        </Box>
        {runLogs.length === 0 ? (
          <Alert severity="info" sx={{ m: 2, fontSize: '0.8rem' }}>
            暂无自动化运行记录。当业务侧（如采购申请提交、MRP 运算）按上方开关触发自动化时，会在此留痕。
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F1F5F9' }}>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>时间</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>段落</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>分类</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>触发人</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>动作</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>结果</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedLogs.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(l.at).toLocaleString('zh-CN', { hour12: false })}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{AUTOMATION_STAGE_LABELS[l.stage] || l.stage}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{l.categoryName || (l.categoryId || '-')}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{l.actor}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', maxWidth: 220 }}>{l.action}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      <Chip label={l.result} size="small"
                        color={l.result === 'success' ? 'success' : l.result === 'skipped' ? 'default' : 'info'}
                        variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={runLogs.length}
              page={logPage}
              onPageChange={(_, p) => setLogPage(p)}
              rowsPerPage={logRows}
              onRowsPerPageChange={(e) => { setLogRows(+e.target.value); setLogPage(0); }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AutomationTab;
