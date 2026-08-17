import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, MenuItem, Select, FormControl,
  InputLabel, Button, Stack, Alert, Divider, Chip, IconButton, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { Save, Delete, Info, CheckCircle, Warning } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { computeAqlPlan, getCodeLetter, resolvePlan, LEVELS, AQLS } from '@/utils/aql';
import { useQualityStore } from '@/stores/qualityStore';

// 抽样方案计算逻辑已抽到 @/utils/aql（GB/T 2828.1），本页仅负责展示与保存。
const STORAGE_KEY = 'ssa-erp-aql-plans';

interface SavedPlan {
  lotSize: number;
  inspectionLevel: string;
  aql: number;
  code: string;
  n: number;
  ac: number;
  re: number;
  savedAt: string;
}

// 动态检验规则类型
type DynamicRuleMode = 'normal' | 'tightened' | 'reduced' | 'skip';

const RULE_LABELS: Record<DynamicRuleMode, string> = {
  normal: '正常检验',
  tightened: '加严检验',
  reduced: '放宽检验',
  skip: '跳批检验',
};

const RULE_DESCRIPTIONS: Record<DynamicRuleMode, string> = {
  normal: '默认检验方案，按 GB/T 2828.1 正常检验一次抽样执行。',
  tightened: '连续5批中有2批不合格时切换至加严检验，使用更严格的 AQL 或提升检验水平。',
  reduced: '连续10批正常检验合格时切换至放宽检验，可降低样本量。需连续5批放宽检验合格方可维持。',
  skip: '连续10批放宽检验合格时可切换至跳批检验，每N批抽检1批。一旦1批不合格立即返回正常检验。',
};

const AqlSampling: React.FC = () => {
  const [lotSize, setLotSize] = useState<string>('500');
  const [inspectionLevel, setInspectionLevel] = useState<string>('II');
  const [aql, setAql] = useState<number>(2.5);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedPlan[]) : [];
    } catch {
      return [];
    }
  });
  const [feedback, setFeedback] = useState<string>('');
  const [sampleSize, setSampleSize] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);

  // 从 qualityStore 读取检验批次计数器
  const { inspectionTasks } = useQualityStore();

  // 统计分析检验结果
  const batchStats = useMemo(() => {
    const sorted = [...inspectionTasks]
      .filter((t) => t.status === 'passed' || t.status === 'failed')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

    const last10 = sorted.slice(0, 10);
    const consecutivePassed = (() => {
      let count = 0;
      for (const t of sorted) {
        if (t.status === 'passed') count++;
        else break;
      }
      return count;
    })();

    const consecutiveFailed = (() => {
      let count = 0;
      for (const t of sorted) {
        if (t.status === 'failed') count++;
        else break;
      }
      return count;
    })();

    const recentFailCount = last10.filter((t) => t.status === 'failed').length;
    const recentPassCount = last10.filter((t) => t.status === 'passed').length;

    return {
      total: sorted.length,
      last10,
      consecutivePassed,
      consecutiveFailed,
      recentFailCount,
      recentPassCount,
    };
  }, [inspectionTasks]);

  // 根据规则判断当前应使用的检验模式
  const dynamicMode: DynamicRuleMode = useMemo(() => {
    const { consecutivePassed, consecutiveFailed, recentFailCount } = batchStats;
    // 加严条件：连续5批中有2批不合格
    if (recentFailCount >= 2 && batchStats.last10.length >= 5) return 'tightened';
    // 跳批条件：连续10批放宽合格
    if (consecutivePassed >= 20) return 'skip';
    // 放宽条件：连续10批正常合格
    if (consecutivePassed >= 10 && consecutiveFailed === 0) return 'reduced';
    return 'normal';
  }, [batchStats]);

  // 根据动态模式调整 AQL 和检验水平
  const effectiveLevel = useMemo(() => {
    switch (dynamicMode) {
      case 'tightened':
        // 加严：提升检验水平（如 II→III）
        const levelIdx = LEVELS.indexOf(inspectionLevel);
        return levelIdx < LEVELS.length - 1 ? LEVELS[levelIdx + 1] : inspectionLevel;
      case 'reduced':
        // 放宽：降低检验水平
        const ri = LEVELS.indexOf(inspectionLevel);
        return ri > 0 ? LEVELS[ri - 1] : inspectionLevel;
      default:
        return inspectionLevel;
    }
  }, [dynamicMode, inspectionLevel]);

  const effectiveAql = useMemo(() => {
    switch (dynamicMode) {
      case 'tightened': {
        // 加严：AQL 减半（使用更严格的值）
        const idx = AQLS.indexOf(aql);
        return idx > 0 ? AQLS[idx - 1] : aql;
      }
      case 'reduced': {
        // 放宽：AQL 加倍
        const idx = AQLS.indexOf(aql);
        return idx < AQLS.length - 1 ? AQLS[idx + 1] : aql;
      }
      default:
        return aql;
    }
  }, [dynamicMode, aql]);

  const lotNum = Number(lotSize);
  const result = useMemo(() => {
    if (!lotSize || isNaN(lotNum) || lotNum < 2) return null;
    const code = getCodeLetter(lotNum, effectiveLevel);
    if (!code) return null;
    const plan = resolvePlan(code, effectiveAql);
    return { code, ...plan };
  }, [lotSize, lotNum, effectiveLevel, effectiveAql]);

  // 选定抽样方案后，自动回填样本量，便于直接带入检验任务
  useEffect(() => {
    if (result) setSampleSize(String(result.n));
  }, [result]);

  const handleSave = () => {
    if (!result) {
      setFeedback('请先输入有效的批量大小（≥2）。');
      return;
    }
    const plan: SavedPlan = {
      lotSize: lotNum,
      inspectionLevel,
      aql,
      code: result.code,
      n: result.n,
      ac: result.ac,
      re: result.re,
      savedAt: new Date().toISOString(),
    };
    const next = [plan, ...savedPlans].slice(0, 50);
    setSavedPlans(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setFeedback('方案已保存。');
  };

  const handleDelete = (idx: number) => {
    const next = savedPlans.filter((_, i) => i !== idx);
    setSavedPlans(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <PageWrapper title="AQL 抽样检验方案" subtitle="GB/T 2828.1 动态检验规则引擎">
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="抽样方案" />
        <Tab label="动态检验规则" />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* 输入区 */}
          <Grid item xs={12} md={5}>
            <Stack spacing={2.5}>
              <TextField
                label="批量大小"
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                InputProps={{ inputProps: { min: 2 } }}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>检验水平</InputLabel>
                <Select
                  value={inspectionLevel}
                  label="检验水平"
                  onChange={(e) => setInspectionLevel(e.target.value)}
                >
                  {LEVELS.map((lv) => (
                    <MenuItem key={lv} value={lv}>{lv}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>AQL（接收质量限 %）</InputLabel>
                <Select
                  value={aql}
                  label="AQL（接收质量限 %）"
                  onChange={(e) => setAql(Number(e.target.value))}
                >
                  {AQLS.map((a) => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<Save />} onClick={handleSave} sx={{ bgcolor: '#3B82F6' }}>
                保存方案
              </Button>
              <TextField
                label="样本量 n（从抽样方案自动回填）"
                type="number"
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                inputProps={{ 'data-testid': 'aql-sample-size' }}
                fullWidth
              />
              {feedback && <Alert severity="success" onClose={() => setFeedback('')}>{feedback}</Alert>}
            </Stack>
          </Grid>

          {/* 结果区 */}
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: '#F8FAFC' }}>
              {!result ? (
                <Alert severity="info">请输入 ≥2 的批量大小以计算结果。</Alert>
              ) : (
                <>
                  <Typography variant="h6" sx={{ mb: 2, color: '#1E293B' }}>抽样方案结果</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: '样本量代码', value: result.code },
                      { label: '样本量 n', value: result.n },
                      { label: '接收数 Ac', value: result.ac },
                      { label: '拒收数 Re', value: result.re },
                    ].map((item) => (
                      <Grid item xs={6} sm={3} key={item.label}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#3B82F6' }}>{item.value}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Info color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      从批量中抽取 {result.n} 件进行检验，若不合格品数 ≤ {result.ac} 则接收该批，若 ≥ {result.re} 则拒收。
                      （本方案依据 GB/T 2828.1 正常检验一次抽样，AQL={effectiveAql}%，水平 {effectiveLevel}）
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>

          {/* 已保存方案 */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>已保存方案</Typography>
            {savedPlans.length === 0 ? (
              <Typography variant="body2" color="text.secondary">暂无保存的方案。</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {savedPlans.map((p, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 220 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Chip label={`${p.code} · n=${p.n}`} size="small" sx={{ bgcolor: '#3B82F6', color: '#fff', mb: 0.5 }} />
                        <Typography variant="caption" display="block" color="text.secondary">
                          批量 {p.lotSize} / {p.inspectionLevel} / AQL {p.aql}% / Ac {p.ac} Re {p.re}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDelete(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Box data-testid="aql-dynamic-rules">
          {/* 当前动态模式 */}
          <Alert
            severity={dynamicMode === 'normal' ? 'info' : dynamicMode === 'tightened' ? 'error' : dynamicMode === 'reduced' ? 'success' : 'warning'}
            sx={{ mb: 3 }}
            icon={dynamicMode === 'normal' ? <Info /> : dynamicMode === 'tightened' ? <Warning /> : <CheckCircle />}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              当前检验模式：{RULE_LABELS[dynamicMode]}
            </Typography>
            <Typography variant="body2">
              {RULE_DESCRIPTIONS[dynamicMode]}
              {dynamicMode !== 'normal' && (
                <> 当前应用 AQL={effectiveAql}%，检验水平={effectiveLevel}。</>
              )}
            </Typography>
          </Alert>

          {/* 检验批次统计 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: '检验批总数', value: batchStats.total, color: '#3B82F6' },
              { label: '连续合格批', value: batchStats.consecutivePassed, color: '#10B981' },
              { label: '连续不合格批', value: batchStats.consecutiveFailed, color: '#EF4444' },
              { label: '近10批不合格数', value: batchStats.recentFailCount, color: batchStats.recentFailCount >= 2 ? '#EF4444' : '#F59E0B' },
            ].map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* 动态规则说明 */}
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>动态检验规则（GB/T 2828.1 转移规则）</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>规则</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>触发条件</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>转移方向</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>正常 → 加严</TableCell>
                    <TableCell>连续5批中有2批不合格</TableCell>
                    <TableCell>提升检验水平 / 降低AQL</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={batchStats.recentFailCount >= 2 ? '已触发' : '未触发'}
                        color={batchStats.recentFailCount >= 2 ? 'error' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>正常 → 放宽</TableCell>
                    <TableCell>连续10批正常检验合格</TableCell>
                    <TableCell>降低检验水平 / 提高AQL</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={batchStats.consecutivePassed >= 10 ? '已触发' : '未触发'}
                        color={batchStats.consecutivePassed >= 10 ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>放宽 → 正常</TableCell>
                    <TableCell>1批不合格即返回正常</TableCell>
                    <TableCell>恢复正常检验方案</TableCell>
                    <TableCell>
                      <Chip size="small" label="自动" color="info" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>跳批检验</TableCell>
                    <TableCell>连续10批放宽检验合格</TableCell>
                    <TableCell>每N批抽检1批</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={batchStats.consecutivePassed >= 20 ? '已触发' : '未触发'}
                        color={batchStats.consecutivePassed >= 20 ? 'warning' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* 最近的检验批次 */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>近10批检验记录</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>编号</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>批次</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>结果</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchStats.last10.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">{t.taskNo}</Typography>
                      </TableCell>
                      <TableCell>{t.materialName}</TableCell>
                      <TableCell>{t.batchNo}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={t.status === 'passed' ? '合格' : '不合格'}
                          color={t.status === 'passed' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{t.updatedAt || t.createdAt}</TableCell>
                    </TableRow>
                  ))}
                  {batchStats.last10.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94A3B8' }}>
                        暂无检验记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </PageWrapper>
  );
};

export default AqlSampling;
