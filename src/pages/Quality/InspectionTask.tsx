import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button,
  TextField,
  Stepper, Step, StepLabel, Alert, Snackbar,
} from '@mui/material';
import { ArrowBack, Save, CheckCircle, Cancel, Warning } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { FlowTracker } from '@/components/common';
import ResponsiblePersons from '@/components/common/ResponsiblePersons';
import { useQualityStore } from '@/stores/qualityStore';
import { useMaterialStore } from '@/stores';
import MaterialLineItemsGrid, { GridColumn } from '@/components/common/MaterialLineItemsGrid';

const InspectionTask: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspectionTasks, updateInspectionTask, inspectionStandards, addUnqualifiedItem } = useQualityStore();
  // V3.109.0：移除原 `|| inspectionTasks[2]` 掩盖性兜底——id 查不到时报不存在，
  // 避免错误 id（如历史坏链传报检单 id）静默落到无关任务上继续录入
  const task = inspectionTasks.find((t) => t.id === id);
  const standard = task ? inspectionStandards.find((s) => s.id === task.inspectionStandardId) : undefined;
  const materials = useMaterialStore(s => s.materials);
  // 物料 -> 分类 -> 用于展示物料责任人（质量视角：SQE / 质量工程师）
  const taskCategoryId = useMemo(() => {
    if (!task?.materialId) return '';
    const m = materials.find((mm) => mm.id === task.materialId);
    return m?.categoryId ?? '';
  }, [task?.materialId, materials]);

  const [results, setResults] = useState<Record<string, string>>(
    Object.fromEntries(standard?.inspectionItems.map(i => [i.id, '']) || [])
  );
  const [conclusion, setConclusion] = useState<'passed' | 'failed' | 'conditional_pass' | ''>('');
  const [snackbar, setSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // 检验项目明细行（行由检验标准模板固定生成，不可增删；对齐采购域 MaterialLineItemsGrid 风格）
  const inspectionRows = useMemo(
    () => (standard?.inspectionItems || []).map((item) => ({
      id: item.id,
      itemName: item.name,
      method: item.method,
      spec: item.spec,
      isCritical: item.isCritical,
      actualValue: results[item.id] || '',
    })),
    [standard, results],
  );
  const handleInspectionRows = (rows: Record<string, any>[]) => {
    const next: Record<string, string> = {};
    rows.forEach((r) => { next[r.id] = r.actualValue ?? ''; });
    setResults(next);
  };
  const inspectionColumns: GridColumn[] = [
    { key: 'itemName', label: '检验项目', width: 150, editable: false, fixed: true },
    { key: 'method', label: '检验方法', width: 130, editable: false },
    { key: 'spec', label: '规格要求', width: 150, editable: false },
    {
      key: 'isCritical', label: '是否关键', width: 90, editable: false, align: 'center',
      renderCell: (row) => (row.isCritical
        ? <Chip label="关键" size="small" sx={{ bgcolor: '#FEF2F2', color: '#EF4444', fontSize: '0.6875rem' }} />
        : <Chip label="一般" size="small" sx={{ bgcolor: '#F8FAFC', color: '#94A3B8', fontSize: '0.6875rem' }} />),
    },
    { key: 'actualValue', label: '实测值/结果', width: 150, required: true, placeholder: '填入实测值' },
    {
      key: 'judgment', label: '判定', width: 80, editable: false, align: 'center',
      renderCell: (row) => (row.actualValue
        ? <Chip label="填写" size="small" sx={{ bgcolor: '#EFF6FF', color: '#3B82F6', fontSize: '0.6875rem' }} />
        : <Typography variant="caption" sx={{ color: '#CBD5E1' }}>待填</Typography>),
    },
  ];

  const steps = ['接收任务', '准备样品', '执行检验', '填写结论', '提交审批'];
  const activeStep = task?.status === 'pending' ? 0 : task?.status === 'in_progress' ? 2 : 4;

  const statusToFlowMap: Record<string, string> = {
    pending: 'it_received',
    in_progress: 'it_testing',
    passed: 'it_completed',
    failed: 'it_result',
    conditional_pass: 'it_approved',
  };
  const flowStatus = (task ? statusToFlowMap[task.status] : '') || task?.status || '';

  const handleDraft = () => {
    if (!id) return;
    updateInspectionTask(id, { status: 'in_progress', conclusion });
    setSnackbarMsg('检验结果已暂存');
    setSnackbar(true);
  };

  const handleSubmit = () => {
    if (!conclusion || !id || !task) return;
    const formResults = { conclusion };
    updateInspectionTask(id, {
      status: conclusion,
      completedDate: new Date().toISOString(),
      ...formResults,
    });
    // 不合格 → 自动生成不合格品记录(NCR)，打通「检验 → 不合格品」闭环
    if (conclusion === 'failed') {
      addUnqualifiedItem({
        id: `uq-${Date.now()}`,
        itemNo: `UQ-${Date.now()}`,
        inspectionTaskId: task.id,
        inspectionTaskNo: task.taskNo,
        materialCode: task.materialCode,
        materialName: task.materialName,
        batchNo: task.batchNo,
        defectQuantity: task.sampleQuantity || 1,
        defectDescription: `检验任务 ${task.taskNo} 判定不合格`,
        disposition: 'return_vendor',
        dispositionStatus: 'pending',
        responsiblePerson: task.assignedTo || '质量工程师',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin',
        updatedBy: 'admin',
      });
      setSnackbarMsg('检验不合格，已自动生成不合格品记录(NCR)');
      setSnackbar(true);
    }
    navigate('/quality/inspection');
  };

  if (!task) {
    return (
      <Box>
        <Alert severity="warning">检验任务不存在或链接已失效，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/inspection')} sx={{ mt: 2 }}>返回检验列表</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ color: '#64748B' }}>返回</Button>
        <FlowTracker module="inspection-task" currentStatus={flowStatus} documentNo={task.taskNo} />
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>
          检验执行 — {task.taskNo}
        </Typography>
      </Box>

      {/* 进度步骤 */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Grid container spacing={3}>
        {/* 左侧：任务信息 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>任务基本信息</Typography>
            {[
              { label: '任务编号', value: task.taskNo },
              { label: '检验类型', value: task.type === 'incoming' ? '来料检验' : task.type === 'process' ? '过程检验' : '成品检验' },
              { label: '物料编码', value: task.materialCode },
              { label: '物料名称', value: task.materialName },
              { label: '批次号', value: task.batchNo },
              { label: '来料数量', value: `${task.quantity} 件` },
              { label: '抽样数量', value: `${task.sampleQuantity} 件` },
              { label: '检验标准', value: task.inspectionStandardName },
              ...(task.projectNo ? [{ label: '项目编号', value: task.projectNo }, { label: '项目名称', value: task.projectName || '-' }] : []),
              { label: '负责人', value: task.assignedTo },
              { label: '计划日期', value: task.plannedDate },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
              </Box>
            ))}
            {task.aqlCode && (
              <Box
                data-testid="aql-plan-detail"
                sx={{ mt: 1.5, p: 2, borderRadius: 2, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E40AF', mb: 0.5 }}>
                  AQL 抽样方案（GB/T 2828.1）
                </Typography>
                <Typography variant="body2" sx={{ color: '#1E3A8A' }}>
                  检验水平 {task.inspectionLevel} · AQL {task.aql}% · 字码 {task.aqlCode} · 样本量 n={task.sampleQuantity} · 接收数 Ac={task.aqlAc} · 拒收数 Re={task.aqlRe}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* 物料责任人（质量视角：SQE/质量工程师）—— 按物料分类自动识别 */}
          <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
            <ResponsiblePersons
              categoryIds={taskCategoryId ? [taskCategoryId] : []}
              roles={['qa_engineer', 'process_engineer']}
              title="物料责任人（质量）"
            />
          </Paper>
        </Grid>

        {/* 右侧：检验项目 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>检验项目记录</Typography>
            {standard ? (
              <MaterialLineItemsGrid
                title="检验项目记录"
                columns={inspectionColumns}
                value={inspectionRows}
                onChange={handleInspectionRows}
                rowIdKey="id"
                removable={false}
                showAdd={false}
                testIdPrefix="inspect-item"
              />
            ) : (
              <Typography variant="body2" color="text.secondary">暂无检验标准</Typography>
            )}
          </Paper>

          {/* 检验结论 */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>检验结论</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {[
                    { value: 'passed', label: '合格', color: '#10B981', icon: <CheckCircle /> },
                    { value: 'failed', label: '不合格', color: '#EF4444', icon: <Cancel /> },
                    { value: 'conditional_pass', label: '条件接收', color: '#F59E0B', icon: <Warning /> },
                  ].map(({ value, label, color, icon }) => (
                    <Button
                      key={value}
                      variant={conclusion === value ? 'contained' : 'outlined'}
                      startIcon={icon}
                      onClick={() => setConclusion(value as typeof conclusion)}
                      sx={{
                        borderColor: color,
                        color: conclusion === value ? '#fff' : color,
                        bgcolor: conclusion === value ? color : 'transparent',
                        '&:hover': { bgcolor: color + '15', borderColor: color },
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="检验备注"
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="填写检验说明、异常描述等..."
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button variant="outlined" onClick={() => navigate(-1)}>取消</Button>
                  <Button variant="outlined" onClick={handleDraft}>暂存</Button>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    disabled={!conclusion}
                    onClick={handleSubmit}
                  >
                    提交检验结果
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar}
        autoHideDuration={2500}
        onClose={() => setSnackbar(false)}
        message={snackbarMsg}
      />
    </Box>
  );
};

export default InspectionTask;
