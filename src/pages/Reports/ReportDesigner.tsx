import React, { useMemo, useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, Divider, Card,
} from '@mui/material';
import { Save, Delete, PlayArrow, ViewColumn } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable } from '@/components/common';
import { DATASETS, useReportDataMap } from '@/utils/reportData';

interface ReportDef {
  id: string;
  name: string;
  dataset: string;
  fields: string[];
  filter: { field: string; operator: 'contains' | 'equals'; value: string };
}

const STORAGE_KEY = 'ssa-erp-report-defs';

const ReportDesigner: React.FC = () => {
  const DATA_MAP = useReportDataMap();

  const [dataset, setDataset] = useState<string>('material');
  const [selectedFields, setSelectedFields] = useState<string[]>(['code', 'name', 'price']);
  const [filterField, setFilterField] = useState<string>('name');
  const [filterOperator, setFilterOperator] = useState<'contains' | 'equals'>('contains');
  const [filterValue, setFilterValue] = useState<string>('');
  const [reportName, setReportName] = useState<string>('');
  const [saved, setSaved] = useState<ReportDef[]>([]);
  const [loaded, setLoaded] = useState<ReportDef | null>(null);

  // 读取已保存报表
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw) as ReportDef[]);
    } catch {
      setSaved([]);
    }
  }, []);

  const fields = DATASETS[dataset].fields;

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const previewData = useMemo(() => {
    let rows = [...(DATA_MAP[dataset] || [])];
    if (filterField && filterValue.trim()) {
      const v = filterValue.trim().toLowerCase();
      rows = rows.filter((r) => {
        const cell = String(r[filterField] ?? '');
        return filterOperator === 'equals' ? cell === v : cell.toLowerCase().includes(v);
      });
    }
    return rows;
  }, [dataset, filterField, filterOperator, filterValue]);

  const columns: ColumnDef<Record<string, unknown>, unknown>[] = useMemo(
    () =>
      selectedFields.map((key) => {
        const f = fields.find((x) => x.key === key);
        return {
          accessorKey: key,
          header: f ? f.label : key,
        } as ColumnDef<Record<string, unknown>, unknown>;
      }),
    [selectedFields, fields]
  );

  const saveReport = () => {
    if (!reportName.trim()) return;
    const def: ReportDef = {
      id: `rpt-${Date.now()}`,
      name: reportName.trim(),
      dataset,
      fields: selectedFields,
      filter: { field: filterField, operator: filterOperator, value: filterValue },
    };
    const next = [...saved, def];
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setReportName('');
    setLoaded(def);
  };

  const loadReport = (def: ReportDef) => {
    setDataset(def.dataset);
    setSelectedFields(def.fields);
    setFilterField(def.filter.field);
    setFilterOperator(def.filter.operator);
    setFilterValue(def.filter.value);
    setLoaded(def);
  };

  const deleteReport = (id: string) => {
    const next = saved.filter((d) => d.id !== id);
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (loaded?.id === id) setLoaded(null);
  };

  return (
    <PageWrapper title="报表自定义设计器">
      <Grid container spacing={3}>
        {/* 左侧：配置 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>1. 选择数据集</Typography>
            <FormControl fullWidth size="small">
              <InputLabel>数据集</InputLabel>
              <Select
                label="数据集"
                value={dataset}
                onChange={(e) => {
                  setDataset(e.target.value);
                  setSelectedFields([]);
                }}
              >
                {Object.entries(DATASETS).map(([key, d]) => (
                  <MenuItem key={key} value={key}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              <ViewColumn sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              2. 选择字段（点击切换）
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              {fields.map((f) => {
                const active = selectedFields.includes(f.key);
                return (
                  <Chip
                    key={f.key}
                    label={f.label}
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    onClick={() => toggleField(f.key)}
                  />
                );
              })}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>3. 筛选条件（可选）</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <InputLabel>字段</InputLabel>
              <Select label="字段" value={filterField} onChange={(e) => setFilterField(e.target.value)}>
                {fields.map((f) => (
                  <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <InputLabel>匹配方式</InputLabel>
              <Select
                label="匹配方式"
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value as 'contains' | 'equals')}
              >
                <MenuItem value="contains">包含</MenuItem>
                <MenuItem value="equals">等于</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="筛选值"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          </Paper>
        </Grid>

        {/* 右侧：预览 + 保存 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={600}>
                4. 实时预览（共 {previewData.length} 条）
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="报表名称"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  sx={{ width: 180 }}
                />
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  disabled={!reportName.trim() || selectedFields.length === 0}
                  onClick={saveReport}
                  sx={{ bgcolor: '#3B82F6' }}
                >
                  保存报表
                </Button>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            {selectedFields.length === 0 ? (
              <Alert severity="info">请先在左侧选择至少一个字段。</Alert>
            ) : (
              <DataTable
                data={previewData}
                columns={columns}
                enableRowSelection
                enablePagination
                enableExport
                pageSize={8}
              />
            )}
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              已保存报表（{saved.length}）
            </Typography>
            {saved.length === 0 ? (
              <Alert severity="info">暂无已保存报表，配置后点击「保存报表」。</Alert>
            ) : (
              <Stack spacing={1}>
                {saved.map((d) => (
                  <Card key={d.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {DATASETS[d.dataset]?.label} · {d.fields.length} 个字段
                          {d.filter.value ? ` · 筛选: ${d.filter.value}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<PlayArrow />} onClick={() => loadReport(d)}>
                          载入
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => deleteReport(d.id)}
                        >
                          删除
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageWrapper>
  );
};

export default ReportDesigner;
