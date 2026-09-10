import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Alert, Stack, TextField, MenuItem, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Tooltip,
} from '@mui/material';
import { Storage, History, DeleteSweep, Person, Restore, Timeline } from '@mui/icons-material';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuditStore, AUDIT_ACTION_LABELS, type AuditRecord, type AuditAction } from '@/stores/auditStore';
import { useUserStore } from '@/stores/userStore';
import { getServerStatus, listCollections } from '@/services/serverService';

const ACTION_COLORS: Record<AuditAction, 'success' | 'info' | 'error' | 'warning' | 'default'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  restore: 'warning',
  login: 'default',
  export: 'warning',
  approve: 'success',
};

// 服务端审计日志行（来自 /api/audit/logs，D1 真实落库，按 org 隔离）
interface ServerAuditRow {
  id: string;
  entity: string;
  entityId: string;
  action: AuditAction | string;
  summary: string;
  userId: string;
  userName: string;
  createdAt: string;
}

const ServerAuditTab: React.FC = () => {
  const session = useSessionStore((s) => s.current);
  const history = useSessionStore((s) => s.history);
  const switchUser = useSessionStore((s) => s.switchUser);
  const users = useUserStore((s) => s.users);
  const records = useAuditStore((s) => s.records);
  const clearAudit = useAuditStore((s) => s.clearAudit);
  const getVersionHistory = useAuditStore((s) => s.getVersionHistory);
  const rollbackTo = useAuditStore((s) => s.rollbackTo);

  // 回滚对话框状态
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<{ entity: string; entityId: string } | null>(null);
  const [versionHistory, setVersionHistory] = useState<AuditRecord[]>([]);

  // P2-B 审计日志真接通：生产态拉取服务端 D1 审计（org 隔离），DEV/离线回退本地
  const [serverLogs, setServerLogs] = useState<ServerAuditRow[] | null>(null);
  const [dataSource, setDataSource] = useState<'local' | 'server'>('local');

  useEffect(() => {
    if (import.meta.env.DEV) return; // DEV 无后端代理，使用本地审计
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/audit/logs?pageSize=200', { credentials: 'include' });
        if (!resp.ok) return;
        const json = await resp.json();
        if (cancelled) return;
        const rows: ServerAuditRow[] = (json.data || []).map((r: any) => ({
          id: r.id,
          entity: r.entity,
          entityId: r.entityId || '',
          action: r.action,
          summary: r.summary,
          userId: r.userId,
          userName: r.userName,
          createdAt: r.createdAt,
        }));
        if (rows.length > 0) {
          setServerLogs(rows);
          setDataSource('server');
        }
      } catch {
        /* 服务端不可达时维持本地审计 */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [filterAction, setFilterAction] = useState<'' | AuditAction>('');
  const [filterUser, setFilterUser] = useState('');

  // 依赖 records 变化重新取一次状态，保证存储体积随写入刷新
  const status = useMemo(() => getServerStatus(), [records.length, session.token]);
  const collections = useMemo(() => listCollections(), [records.length]);

  const displayRecords = dataSource === 'server' && serverLogs ? serverLogs : records;

  const filtered = displayRecords.filter(
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
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>审计日志（{filtered.length}/{displayRecords.length}）</Typography>
          <Chip
            size="small"
            data-testid="audit-source"
            label={dataSource === 'server' ? '服务端 D1 落库' : '本地审计'}
            color={dataSource === 'server' ? 'success' : 'default'}
            variant="outlined"
          />
        </Stack>
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
              <TableCell sx={{ fontWeight: 600 }}>回滚</TableCell>
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
                <TableCell>
                  {'entityId' in r && r.entityId && r.action !== 'create' && (
                    <Tooltip title="查看变更历史">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setRollbackTarget({ entity: r.entity, entityId: r.entityId! });
                          setVersionHistory(getVersionHistory(r.entity, r.entityId));
                          setRollbackOpen(true);
                        }}
                      >
                        <Timeline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  暂无审计记录（新增/修改/删除等操作后会自动记录）
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 回滚对话框 */}
      <Dialog open={rollbackOpen} onClose={() => setRollbackOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Restore />
            变更历史
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {rollbackTarget && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              实体：{rollbackTarget.entity} / ID：{rollbackTarget.entityId}
            </Typography>
          )}
          <List dense>
            {versionHistory.map((rec) => (
              <ListItem key={rec.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={AUDIT_ACTION_LABELS[rec.action]} color={ACTION_COLORS[rec.action]} />
                      <Typography variant="body2">{rec.summary}</Typography>
                      <Typography variant="caption" color="text.secondary">{rec.userName}</Typography>
                    </Stack>
                  }
                  secondary={new Date(rec.createdAt).toLocaleString('zh-CN')}
                />
                {rec.action === 'update' && rec.diff?.changedFields && (
                  <ListItemSecondaryAction>
                    <Chip
                      size="small"
                      label={`${rec.diff.changedFields.length} 字段变更`}
                      variant="outlined"
                    />
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
            {versionHistory.length === 0 && (
              <ListItem>
                <ListItemText primary="暂无变更记录" primaryTypographyProps={{ color: 'text.secondary' }} />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServerAuditTab;
