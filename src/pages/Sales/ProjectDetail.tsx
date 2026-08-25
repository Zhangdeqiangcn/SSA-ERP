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
import { ProjectException, ExceptionSeverity } from '@/types';
import { PageWrapper } from '@/components/layout';
import { ConfirmDialog, DetailActions } from '@/components/common';
import { formatCurrency } from '@/utils/format';

const SEVERITY_COLORS: Record<ExceptionSeverity, string> = {
  low: '#F59E0B', medium: '#F97316', high: '#EF4444', critical: '#DC2626',
};
const SEVERITY_LABELS: Record<ExceptionSeverity, string> = {
  low: '低', medium: '中', high: '高', critical: '严重',
};

const ProjectDetail: React.FC = () => {
  const { projects } = useSalesStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

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
      {/* 项目头 */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1} mb={1}>
              <Chip label={project.status === 'in_progress' ? '执行中' : project.status} size="small"
                color={project.status === 'in_progress' ? 'primary' : project.status === 'completed' ? 'success' : 'default'} />
              {exceptions.filter(e => e.status !== 'closed').length > 0 && (
                <Chip icon={<Warning />} label="有异常" size="small" color="error" variant="outlined" />
              )}
            </Stack>
            <Typography variant="h5" fontWeight={700} color="#1E293B" mb={0.5}>{project.projectName}</Typography>
            <Typography variant="body2" color="text.secondary">
              客户：{project.customerName} | 项目经理：{project.manager} | 团队：{project.team.join('、')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#F8FAFC' }}>
              <Typography variant="subtitle2" mb={1}>项目进度</Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <LinearProgress variant="determinate" value={project.progress}
                  sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: '#E2E8F0',
                    '& .MuiLinearProgress-bar': { bgcolor: project.progress >= 80 ? '#10B981' : '#3B82F6' } }} />
                <Typography variant="h6" fontWeight={700} color={project.progress >= 80 ? '#10B981' : '#3B82F6'}>
                  {project.progress}%
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: '合同金额', value: formatCurrency(project.contractAmount), color: '#3B82F6', icon: <TrendingUp /> },
          { label: '已回款', value: formatCurrency(project.receivedAmount), color: '#10B981', icon: <CheckCircle /> },
          { label: '实际成本', value: formatCurrency(project.actualCost), color: '#F59E0B', icon: <Timer /> },
          { label: '项目预算', value: formatCurrency(project.budget), color: '#8B5CF6', icon: <TrendingUp /> },
        ].map(kpi => (
          <Paper key={kpi.label} sx={{ p: 2.5, borderRadius: 3, flex: 1, border: `1px solid ${kpi.color}20` }}>
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
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={600}>项目里程碑</Typography>
              <Button size="small" startIcon={<Edit />}>编辑里程碑</Button>
            </Stack>
            <Box sx={{ ml: 2 }}>
              {milestones.map((m, idx) => (
                <Box key={m.id} sx={{ display: 'flex', mb: idx < milestones.length - 1 ? 0 : 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%',
                      bgcolor: m.status === 'completed' ? '#10B981' : m.status === 'in_progress' ? '#3B82F6' : m.status === 'delayed' ? '#EF4444' : '#E2E8F0',
                      border: '2px solid white', boxShadow: m.status === 'in_progress' ? '0 0 0 2px #3B82F6' : 'none',
                    }} />
                    {idx < milestones.length - 1 && (
                      <Box sx={{ width: 2, flex: 1, bgcolor: m.status === 'completed' ? '#10B981' : '#E2E8F0', minHeight: 30 }} />
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
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                <Warning sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle', color: '#EF4444' }} />
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
                  <Paper key={ex.id} sx={{ p: 2, bgcolor: '#FFF5F5', borderLeft: `4px solid ${SEVERITY_COLORS[ex.severity]}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={SEVERITY_LABELS[ex.severity]} size="small"
                          sx={{ bgcolor: SEVERITY_COLORS[ex.severity] + '20', color: SEVERITY_COLORS[ex.severity], fontWeight: 600 }} />
                        <Chip label={ex.type === 'schedule' ? '进度' : ex.type === 'cost' ? '成本' : ex.type === 'quality' ? '质量' : ex.type === 'resource' ? '资源' : ex.type === 'customer' ? '客户' : '其他'} size="small" variant="outlined" />
                        <Chip label={ex.status === 'open' ? '待处理' : ex.status === 'investigating' ? '调查中' : ex.status === 'resolved' ? '已解决' : '关闭'} size="small"
                          color={ex.status === 'closed' || ex.status === 'resolved' ? 'success' : ex.status === 'investigating' ? 'warning' : 'error'} />
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
          <Warning sx={{ mr: 1, verticalAlign: 'middle', color: '#EF4444' }} />
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
          <Button variant="contained" color="error" onClick={() => {
            alert('异常已提交！（演示模式）');
            setExceptionOpen(false);
          }}>提交异常</Button>
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
        message="分享内容已复制到剪贴板"
      />
    </PageWrapper>
  );
};

export default ProjectDetail;
