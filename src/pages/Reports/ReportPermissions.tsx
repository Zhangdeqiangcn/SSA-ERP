import React, { useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Button, FormGroup, FormControlLabel, Checkbox, Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useReportPermissionStore } from '@/stores';
import { useAuthStore } from '@/stores/authStore';
import type { ReportRole, SubscriptionFrequency } from '@/types';
import { ROLE_NAMES, UserRole } from '@/types/settings';

const ROLES: ReportRole[] = ['admin', 'manager', 'user', 'finance', 'warehouse'];
const FREQS: SubscriptionFrequency[] = ['daily', 'weekly', 'monthly'];

const ReportPermissions: React.FC = () => {
  const { reportPermissions, subscriptions, setReportRoles, addSubscription, deleteSubscription } =
    useReportPermissionStore();
  const { currentUser } = useAuthStore();
  // 报表权限写入 ssa-erp-report-perm，已收口到管理员；非管理员仅展示无权限提示，避免被后端 403 静默拦截
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }} data-testid="report-permissions">
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>报表权限与订阅</Typography>
        <Alert severity="info" sx={{ borderRadius: 2, maxWidth: 720 }}>
          报表权限与订阅仅对<strong>系统管理员</strong>开放配置。当前账号角色为
          「{ROLE_NAMES[currentUser?.role as UserRole] || currentUser?.role || '未知'}」，
          如需调整报表权限或订阅，请联系系统管理员。
        </Alert>
      </Box>
    );
  }
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [reportId, setReportId] = useState(reportPermissions[0]?.reportId ?? '');
  const [freq, setFreq] = useState<SubscriptionFrequency>('daily');
  const [recipients, setRecipients] = useState('');
  const [channel, setChannel] = useState<'email' | 'webhook'>('email');

  const toggleRole = (rpId: string, rpName: string, role: ReportRole, checked: boolean) => {
    const rp = reportPermissions.find((r) => r.reportId === rpId);
    const next = checked ? [...(rp?.allowedRoles ?? []), role] : (rp?.allowedRoles ?? []).filter((x) => x !== role);
    setReportRoles(rpId, rpName, Array.from(new Set(next)));
  };

  const handleConfirm = () => {
    if (!reportId.trim() || !recipients.trim()) return;
    const rp = reportPermissions.find((r) => r.reportId === reportId);
    addSubscription({ reportId, reportName: rp?.reportName ?? reportId, frequency: freq, recipients, channel, enabled: true });
    setRecipients(''); setOpen(false);
  };

  return (
    <Box sx={{ p: 3 }} data-testid="report-permissions">
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>报表权限与订阅</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="报表权限" />
        <Tab label="订阅管理" />
      </Tabs>

      {tab === 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>报表</TableCell>
              <TableCell>允许角色</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportPermissions.map((rp) => (
              <TableRow key={rp.reportId} data-testid="rp-perm-row">
                <TableCell>{rp.reportName}</TableCell>
                <TableCell>
                  <FormGroup row>
                    {ROLES.map((role) => (
                      <FormControlLabel key={role}
                        control={<Checkbox size="small" data-testid={`rp-role-${rp.reportId}-${role}`}
                          checked={rp.allowedRoles.includes(role)}
                          onChange={(e) => toggleRole(rp.reportId, rp.reportName, role, e.target.checked)} />}
                        label={role} />
                    ))}
                  </FormGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {tab === 1 && (
        <Box>
          <Button data-testid="rp-sub-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
            新建订阅
          </Button>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>报表</TableCell>
                <TableCell>频率</TableCell>
                <TableCell>接收人</TableCell>
                <TableCell>渠道</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id} data-testid="rp-sub-row">
                  <TableCell>{sub.reportName}</TableCell>
                  <TableCell><Chip size="small" label={sub.frequency} /></TableCell>
                  <TableCell>{sub.recipients}</TableCell>
                  <TableCell>{sub.channel}</TableCell>
                  <TableCell>
                    <IconButton data-testid="rp-sub-del" onClick={() => deleteSubscription(sub.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建订阅</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>报表</InputLabel>
            <Select data-testid="rp-sub-report" value={reportId} label="报表"
              onChange={(e) => setReportId(e.target.value)}>
              {reportPermissions.map((rp) => <MenuItem key={rp.reportId} value={rp.reportId}>{rp.reportName}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>频率</InputLabel>
            <Select data-testid="rp-sub-freq" value={freq} label="频率"
              onChange={(e) => setFreq(e.target.value as SubscriptionFrequency)}>
              {FREQS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField data-testid="rp-sub-recipients" fullWidth label="接收人（逗号分隔）" value={recipients}
            onChange={(e) => setRecipients(e.target.value)} sx={{ mb: 2 }} />
          <FormControl fullWidth>
            <InputLabel>渠道</InputLabel>
            <Select data-testid="rp-sub-channel" value={channel} label="渠道"
              onChange={(e) => setChannel(e.target.value as 'email' | 'webhook')}>
              <MenuItem value="email">邮件</MenuItem>
              <MenuItem value="webhook">Webhook</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button data-testid="rp-sub-add-confirm" variant="contained" onClick={handleConfirm}>确定</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportPermissions;
