import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Alert, Stack, TextField, MenuItem, Divider,
} from '@mui/material';
import { Storage, History, DeleteSweep, Person } from '@mui/icons-material';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuditStore, AUDIT_ACTION_LABELS, type AuditAction } from '@/stores/auditStore';
import { useUserStore } from '@/stores/userStore';
import { getServerStatus, listCollections } from '@/services/serverService';

const ACTION_COLORS: Record<AuditAction, 'success' | 'info' | 'error' | 'warning' | 'default'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  login: 'default',
  export: 'warning',
  approve: 'success',
};

const ServerAuditTab: React.FC = () => {
  const session = useSessionStore((s) => s.current);
  const history = useSessionStore((s) => s.history);
  const switchUser = useSessionStore((s) => s.switchUser);
  const users = useUserStore((s) => s.users);
  const records = useAuditStore((s) => s.records);
  const clearAudit = useAuditStore((s) => s.clearAudit);

  const [filterAction, setFilterAction] = useState<'' | AuditAction>('');
  const [filterUser, setFilterUser] = useState('');

  // 依赖 records 变化重新取一次状态，保证存储体积随写入刷新
  const status = useMemo(() => getServerStatus(), [records.length, session.token]);
  const collections = useMemo(() => listCollections(), [records.length]);

  const filtered = records.filter(
    (r) => (!filterAction || r.action === filterAction) && (!filterUser || r.userId === filterUser)
  );

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        C7 服务端化雏形：多用户会话 + 写操作落库审计 + 持久化抽象层。当前存储驱动为
        <strong> {status.driver === 'local' ? '本地（localStorage）' : '远端服务'}</strong>，
        所有经 <code>serverService</code> / store 的写操作都会记录「谁在什么时候改了什么」。
      </Alert>

      {/* 服务端状态 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: '存储驱动', value: status.driver === 'local' ? 'local（浏览器）' : 'remote', icon: <Storage fontSize="small" />, testid: 'srv-driver' },
          { label: '数据表数量', value: String(status.collections), icon: <Storage fontSize="small" />, testid: 'srv-collections' },
          { label: '已用存储', value: `${status.storageKB} KB`, icon: <Storage fontSize="small" />, testid: 'srv-storage' },
          { label: '审计条数', value: String(records.length), icon: <History fontSize="small" />, testid: 'srv-audit-count' },
        ].map((c) => (
          <Grid item xs={6} md={3} key={c.label}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', mb: 0.5 }}>
                {c.icon}
                <Typography variant="caption">{c.label}</Typography>
              </Stack>
              <Typography variant="h6" fontWeight={700} data-testid={c.testid}>{c.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 当前会话 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>当前会话</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Chip icon={<Person />} label={session.userName} color="primary" data-testid="srv-current-user" />
          <Typography variant="body2" color="text.secondary">
            角色 {session.role} / {session.department}
          </Typography>
          <Typography variant="caption" color="text.secondary" data-testid="srv-token">
            token: {session.token}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            select size="small" label="切换用户" value={session.userId}
            onChange={(e) => switchUser(e.target.value)} sx={{ minWidth: 160 }}
            SelectProps={{ SelectDisplayProps: { 'data-testid': 'srv-switch-user' } as React.HTMLAttributes<HTMLDivElement> }}
          >
            {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
          </TextField>
        </Stack>
        {history.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary">
              最近会话：{history.slice(0, 5).map((h) => h.userName).join(' → ')}
            </Typography>
          </>
        )}
      </Paper>

      {/* 数据表清单 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>数据表（localStorage collections）</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {collections.map((c) => (
            <Chip key={c} size="small" label={c.replace('ssa-erp-', '')} variant="outlined" />
          ))}
          {collections.length === 0 && <Typography variant="body2" color="text.secondary">暂无数据表</Typography>}
        </Box>
      </Paper>

      {/* 审计日志 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight={600}>审计日志（{filtered.length}/{records.length}）</Typography>
        <Stack direction="row" spacing={1}>
          <TextField select size="small" label="操作类型" value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as '' | AuditAction)} sx={{ minWidth: 120 }}>
            <MenuItem value="">全部</MenuItem>
            {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
              <MenuItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="操作人" value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">全部</MenuItem>
            {users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
          </TextField>
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteSweep />}
            onClick={clearAudit} data-testid="srv-clear-audit">清空</Button>
        </Stack>
      </Box>
      <TableContainer component={Paper} sx={{ borderRadius: 2, maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>时间</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>操作人</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>实体</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>动作</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>摘要</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} data-testid={`audit-row-${r.id}`}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="caption">{new Date(r.createdAt).toLocaleString('zh-CN')}</Typography>
                </TableCell>
                <TableCell>{r.userName}</TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{r.entity}</Typography></TableCell>
                <TableCell><Chip size="small" label={AUDIT_ACTION_LABELS[r.action]} color={ACTION_COLORS[r.action]} /></TableCell>
                <TableCell>{r.summary}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  暂无审计记录（新增/修改/删除销售价目表等操作后会自动记录）
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ServerAuditTab;
