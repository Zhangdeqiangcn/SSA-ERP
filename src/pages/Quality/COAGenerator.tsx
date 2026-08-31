import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, FormControl, InputLabel, Select, MenuItem, Grid, Alert, Divider, Stack, IconButton,
} from '@mui/material';
import { Print, PictureAsPdf, History, Delete } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useQualityStore } from '@/stores/qualityStore';
import { useCOAStore, type COARecord, type COAItem } from '@/stores/coaStore';

const COMPANY_NAME = '新光精密制造（武汉）有限公司';
const DEFAULT_DISCLAIMER =
  '本证书所检项目均依据相应检验标准判定；本报告仅对受检批次负责，未经授权不得部分复制。';

const COAGenerator: React.FC = () => {
  const { inspectionTasks } = useQualityStore();
  const { records: coaRecords, saveCoa, removeCoa } = useCOAStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [coa, setCoa] = useState<COARecord | null>(null);
  const [feedback, setFeedback] = useState('');

  // 仅显示已完成（合格/不合格）的检验任务
  const completedTasks = useMemo(
    () => inspectionTasks.filter((t) => t.status === 'passed' || t.status === 'failed'),
    [inspectionTasks]
  );

  const selectedTask = useMemo(
    () => inspectionTasks.find((t) => t.id === selectedTaskId),
    [inspectionTasks, selectedTaskId]
  );

  const handleGenerate = () => {
    if (!selectedTask) {
      setFeedback('请先选择一个已完成的检验任务。');
      return;
    }
    setFeedback('');

    const items: COAItem[] = (selectedTask.defectItems || []).length > 0
      ? selectedTask.defectItems!.map((d) => ({
          inspectionItem: d.defectName,
          standard: d.severity === 'critical' ? '零缺陷' : d.severity === 'major' ? '≤0' : '≤标准',
          result: `${d.quantity} 件`,
          unit: '件',
          conclusion: d.quantity === 0 ? 'pass' as const : 'fail' as const,
        }))
      : [
          {
            inspectionItem: '外观检查',
            standard: '无划痕/无锈蚀',
            result: '合格',
            unit: '-',
            conclusion: 'pass' as const,
          },
          {
            inspectionItem: '尺寸测量',
            standard: `符合 ${selectedTask.inspectionStandardName}`,
            result: '合格',
            unit: '-',
            conclusion: 'pass' as const,
          },
        ];

    const newCoa: COARecord = {
      id: `COA-${Date.now()}`,
      taskId: selectedTask.id,
      taskNo: selectedTask.taskNo,
      productName: selectedTask.materialName,
      batchNo: selectedTask.batchNo,
      standardName: selectedTask.inspectionStandardName || '-',
      items,
      overallConclusion: selectedTask.status === 'passed' ? '检验合格，准予放行' : '检验不合格，详见不合格项',
      generatedDate: new Date().toISOString().slice(0, 10),
      inspector: selectedTask.assignedTo || '检验员',
      companyName: COMPANY_NAME,
      disclaimer: DEFAULT_DISCLAIMER,
    };
    setCoa(newCoa);
    saveCoa(newCoa);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageWrapper title="COA 产品合格证生成器" subtitle="根据检验任务自动生成 Certificate of Analysis">
      <Grid container spacing={3}>
        {/* 选择检验任务 */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              选择检验任务
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>检验任务</InputLabel>
              <Select
                value={selectedTaskId}
                label="检验任务"
                onChange={(e) => setSelectedTaskId(e.target.value)}
                data-testid="coa-inspection"
              >
                {completedTasks.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.taskNo} - {t.materialName} ({t.status === 'passed' ? '合格' : '不合格'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedTask && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  物料：{selectedTask.materialName} ({selectedTask.materialCode})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  批次：{selectedTask.batchNo} | 检验标准：{selectedTask.inspectionStandardName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  合格数：{selectedTask.passedQuantity || 0} | 不合格数：{selectedTask.failedQuantity || 0}
                </Typography>
              </Box>
            )}
            <Button
              variant="contained"
              onClick={handleGenerate}
              data-testid="coa-generate"
              disabled={!selectedTaskId}
              fullWidth
              sx={{ bgcolor: '#3B82F6' }}
            >
              生成 COA
            </Button>
            {feedback && (
              <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setFeedback('')}>
                {feedback}
              </Alert>
            )}

            {/* 已生成 COA 历史 */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <History fontSize="small" /> 已生成 COA（{coaRecords.length}）
              </Typography>
              {coaRecords.length === 0 ? (
                <Typography variant="caption" color="text.secondary">暂无历史记录，生成后将自动留存。</Typography>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: 260, overflow: 'auto' }}>
                  {coaRecords.map((rec) => (
                    <Paper key={rec.id} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{rec.productName}</Typography>
                          <Typography variant="caption" color="text.secondary">批号 {rec.batchNo} · {rec.generatedDate}</Typography>
                        </Box>
                        <Box>
                          <Button size="small" data-testid={`coa-open-${rec.id}`} onClick={() => setCoa(rec)}>查看</Button>
                          <IconButton size="small" color="error" data-testid={`coa-del-${rec.id}`} onClick={() => removeCoa(rec.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* COA 预览 */}
        <Grid item xs={12} md={7}>
          {coa ? (
            <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#fff' }} id="coa-preview">
              {/* 标题 */}
              <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px solid #1E293B' }}>
                <Typography variant="body2" fontWeight={700} color="#1E293B">
                  {coa.companyName || COMPANY_NAME}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B', letterSpacing: 2, mt: 0.5 }}>
                  CERTIFICATE OF ANALYSIS
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  产品合格证 / 分析证书
                </Typography>
                <Typography variant="caption" color="text.secondary">编号：{coa.id}</Typography>
              </Box>

              {/* 基本信息 */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: '产品名称', value: coa.productName },
                  { label: '批号', value: coa.batchNo },
                  { label: '检验编号', value: coa.taskNo },
                  { label: '检验标准', value: coa.standardName },
                  { label: '检验员', value: coa.inspector },
                  { label: '签发日期', value: coa.generatedDate },
                ].map((info) => (
                  <Grid item xs={6} key={info.label}>
                    <Typography variant="caption" color="text.secondary">
                      {info.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {info.value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* 检验项目表 */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 600 }}>检验项目</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>标准要求</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>检验结果</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>判定</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {coa.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.inspectionItem}</TableCell>
                        <TableCell>{item.standard}</TableCell>
                        <TableCell>{item.result}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.conclusion === 'pass' ? '合格' : '不合格'}
                            color={item.conclusion === 'pass' ? 'success' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 3 }} />

              {/* 总体结论 */}
              <Box sx={{ p: 2, bgcolor: coa.overallConclusion.includes('合格') ? '#ECFDF5' : '#FEF2F2', borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ color: coa.overallConclusion.includes('合格') ? '#059669' : '#DC2626' }}>
                  检验结论：{coa.overallConclusion}
                </Typography>
              </Box>

              {/* 签章区 */}
              <Grid container spacing={4} sx={{ mt: 4 }}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">检验员</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">审核人</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">批准人</Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* 声明 */}
              <Box sx={{ mt: 3, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                  {coa.disclaimer || DEFAULT_DISCLAIMER}
                </Typography>
              </Box>

              {/* 操作按钮 */}
              <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center', '@media print': { display: 'none' } }}>
                <Button variant="contained" startIcon={<Print />} onClick={handlePrint} sx={{ bgcolor: '#3B82F6' }}>
                  打印 COA
                </Button>
                <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={handlePrint}>
                  导出 PDF
                </Button>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center', bgcolor: '#F8FAFC', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">
                请选择检验任务并点击"生成 COA"以预览合格证
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </PageWrapper>
  );
};

export default COAGenerator;
