import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Paper, Chip, Grid, LinearProgress, Stack,
  Divider, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Alert, Snackbar, Step, StepLabel, Stepper, MenuItem,
} from '@mui/material';
import {
  Warning, Add, CheckCircle, Edit, Error, Timer, TrendingUp, Share,
} from '@mui/icons-material';
import { useSalesStore } from '@/stores/salesStore';
import { useAuthStore } from '@/stores/authStore';
import { ProjectException, ExceptionSeverity } from '@/types';
import { PageWrapper } from '@/components/layout';
import { ConfirmDialog, DetailActions, StatusBadge } from '@/components/common';
import { formatCurrency } from '@/utils/format';
import DemoBanner from '@/components/common/DemoBanner';

// 状态展示统一走 StatusBadge（审计报告 P0/P1 整改：禁止页面内 hex 副本）
const EXC_SEVERITY: Record<ExceptionSeverity, string> = {
  low: 'exc_low', medium: 'exc_medium', high: 'exc_high', critical: 'exc_critical',
};
const EXC_STATUS: Record<string, string> = {
  open: 'exc_open', investigating: 'exc_investigating', resolved: 'exc_resolved', closed: 'exc_closed',
};
const PROJECT_STATUS: Record<string, string> = {
  planned: 'planning', in_progress: 'project_in_progress', completed: 'completed', at_risk: 'at_risk', on_hold: 'suspended',
};

const ProjectDetail: React.FC = () => {
  const { projects } = useSalesStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('分享内容已复制到剪贴板');

  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [newException, setNewException] = useState({
    type: 'schedule' as string, severity: 'medium' as ExceptionSeverity, title: '', description: '',
  });

  if (!project) {
    return <PageWrapper title="项目详情"><Alert severity="error">项目不存在</Alert></PageWrapper>;
  }

  // 防御：历史脏数据/旧版本迁移时可能缺失数组字段，缺省为空数组避免白屏
  const milestones = project.milestones || [];
  const exceptions = project.exceptions || [];
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const activeStep = milestones.findIndex(m => m.status === 'in_progress');
  const currentStep = activeStep >= 0 ? activeStep : completedMilestones;

  const handleShare = () => {
    const text = `项目 ${project.projectNo} - ${project.projectName}\n进度：${project.progress}%`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };

  /** 提交异常：真实写入本项目主数据（落 D1），进入跟踪闭环 */
  const handleSubmitException = async () => {
    const now = new Date().toISOString();
    const reportedBy = useAuthStore.getState().currentUser?.name || '当前用户';
    const ex: ProjectException = {
      id: `EX-${Date.now()}`,
      exceptionNo: `EX-${Date.now()}`,
      type: newException.type as ProjectException['type'],
      severity: newException.severity,
      title: newException.title,
      description: newException.description,
      reportedBy,
      reportedAt: now,
      status: 'open',
    };
    await useSalesStore.getState().updateProject(project.id, {
      exceptions: [...(project.exceptions || []), ex],
    });
    setExceptionOpen(false);
    setSnackbarMsg('异常已提交并记入项目跟踪闭环');
    setSnackbar(true);
  };

  return (
    <PageWrapper
      title={`项目详情 — ${project.projectNo}`}
      actions={
        <DetailActions
          entity="salesProject"
          record={project}
          onBack={() => navigate('/sales/projects')}
          onEdit={() => navigate(`/sales/projects/${id}/edit`)}
          onDelete={() => setDeleteDialog(true)}
          extra={[
            { key: 'share', label: '分享', icon: <Share />, onClick: handleShare },
          ]}
        />
      }
    >
      <DemoBanner reason="项目异常反馈已**真实落库**：「反馈异常 → 提交异常」会把异常写入本项目主数据（status=open，进入跟踪闭环），刷新/换端后仍在、并可在本页异常列表查看。「编辑里程碑」仍为演示按钮、不落库；本页其余项目信息均为真实数据。" />
      {/* 项目头 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1} mb={1}>
              <StatusBadge status={PROJECT_STATUS[project.status] || project.status} />
              {exceptions.filter(e => e.status !== 'closed').length > 0 && (
                <Chip icon={<Warning />} label="有异常" size="small" color="error" variant="outlined" />
              )}
            </Stack>
            <Typography variant="h5" fontWeight={700} color="text.primary" mb={0.5}>{project.projectName}</Typography>
            <Typography variant="body2" color="text.secondary">
              客户：{project.customerName} | 项目经理：{project.manager} | 团队：{project.team.join('、')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" mb={1}>项目进度</Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <LinearProgress variant="determinate" value={project.progress}
                  sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': { bgcolor: project.progress >= 80 ? 'success.main' : 'primary.main' } }} />
                <Typography variant="h6" fontWeight={700} color={project.progress >= 80 ? 'success.main' : 'primary.main'}>
                  {project.progress}%
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: '合同金额', value: formatCurrency(project.contractAmount), color: 'primary.main', icon: <TrendingUp /> },
          { label: '已回款', value: formatCurrency(project.receivedAmount), color: 'success.main', icon: <CheckCircle /> },
          { label: '实际成本', value: formatCurrency(project.actualCost), color: 'warning.main', icon: <Timer /> },
          { label: '项目预算', value: formatCurrency(project.budget), color: 'secondary.main', icon: <TrendingUp /> },
        ].map(kpi => (
          <Paper key={kpi.label} variant="outlined" sx={{ p: 2.5, flex: 1, minWidth: 160 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              <Box sx={{ color: kpi.color, opacity: 0.6 }}>{kpi.icon}</Box>
            </Stack>
            <Typography variant="h6" fontWeight={700} color={kpi.color}>{kpi.value}</Typography>
          </Paper>
        ))}
      </Box>

      <Grid container spacing={3}>
        {/* 里程碑 */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>项目里程碑</Typography>
              <Button size="small" startIcon={<Edit />}>编辑里程碑</Button>
            </Stack>
            <Box sx={{ ml: 2 }}>
              {milestones.map((m, idx) => (
                <Box key={m.id} sx={{ display: 'flex', mb: idx < milestones.length - 1 ? 0 : 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%',
                      bgcolor: m.status === 'completed' ? 'success.main' : m.status === 'in_progress' ? 'primary.main' : m.status === 'delayed' ? 'error.main' : 'grey.300',
                      border: '2px solid white', boxShadow: m.status === 'in_progress' ? 3 : 'none',
                    }} />
                    {idx < milestones.length - 1 && (
                      <Box sx={{ width: 2, flex: 1, bgcolor: m.status === 'completed' ? 'success.main' : 'grey.300', minHeight: 30 }} />
                    )}
                  </Box>
                  <Box sx={{ pb: 2, flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>{m.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.actualDate ? `${m.actualDate}（已完成）` : `计划 ${m.plannedDate}`}
                    </Typography>
                    {m.status === 'delayed' && <Chip label="延期" size="small" color="error" sx={{ ml: 1, height: 20, fontSize: '0.6rem' }} />}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* 异常反馈 */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                <Warning sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle', color: 'error.main' }} />
                异常反馈
              </Typography>
              <Button size="small" startIcon={<Add />} color="error" onClick={() => setExceptionOpen(true)}>
                反馈异常
              </Button>
            </Stack>
            {exceptions.length === 0 ? (
              <Alert severity="success" sx={{ mt: 1 }}>暂无异常，项目运行良好</Alert>
            ) : (
              <Stack spacing={2}>
                {exceptions.map((ex: ProjectException) => (
                  <Paper key={ex.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StatusBadge status={EXC_SEVERITY[ex.severity]} />
                        <Chip label={ex.type === 'schedule' ? '进度' : ex.type === 'cost' ? '成本' : ex.type === 'quality' ? '质量' : ex.type === 'resource' ? '资源' : ex.type === 'customer' ? '客户' : '其他'} size="small" variant="outlined" />
                        <StatusBadge status={EXC_STATUS[ex.status] || ex.status} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{ex.reportedAt}</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={500}>{ex.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{ex.description}</Typography>
                    {ex.impactDescription && (
                      <Typography variant="caption" color="error" display="block" mt={0.5}>影响：{ex.impactDescription}</Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 异常填报弹窗 */}
      <Dialog open={exceptionOpen} onClose={() => setExceptionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Warning sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
          新增异常反馈
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField select fullWidth label="异常类型" value={newException.type}
              onChange={e => setNewException(prev => ({ ...prev, type: e.target.value }))}>
              <MenuItem value="schedule">进度异常</MenuItem>
              <MenuItem value="cost">成本异常</MenuItem>
              <MenuItem value="quality">质量异常</MenuItem>
              <MenuItem value="resource">资源异常</MenuItem>
              <MenuItem value="customer">客户相关</MenuItem>
              <MenuItem value="other">其他</MenuItem>
            </TextField>
            <TextField select fullWidth label="严重程度" value={newException.severity}
              onChange={e => setNewException(prev => ({ ...prev, severity: e.target.value as ExceptionSeverity }))}>
              <MenuItem value="low">低</MenuItem>
              <MenuItem value="medium">中</MenuItem>
              <MenuItem value="high">高</MenuItem>
              <MenuItem value="critical">严重</MenuItem>
            </TextField>
            <TextField fullWidth label="异常标题" value={newException.title}
              onChange={e => setNewException(prev => ({ ...prev, title: e.target.value }))} required />
            <TextField fullWidth label="异常描述" value={newException.description}
              onChange={e => setNewException(prev => ({ ...prev, description: e.target.value }))}
              multiline rows={4} required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExceptionOpen(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={() => void handleSubmitException()}>提交异常</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={deleteDialog}
        title="确认删除"
        content={`确定删除项目"${project.projectNo} - ${project.projectName}"吗？此操作不可撤销。`}
        onConfirm={() => { setDeleteDialog(false); }}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        type="danger"
      />
      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message={snackbarMsg}
      />
    </PageWrapper>
  );
};

export default ProjectDetail;
