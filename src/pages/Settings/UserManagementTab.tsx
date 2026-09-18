import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, TextField, MenuItem, Alert, AlertTitle, Snackbar, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, CircularProgress, Tooltip,
} from '@mui/material';
import {
  Refresh, CheckCircle, Cancel, Edit, Search, AdminPanelSettings,
  Person as PersonIcon, Undo, PowerSettingsNew, SupervisorAccount, ReportProblemOutlined,
} from '@mui/icons-material';
import { ROLE_DEFINITIONS, ROLE_NAMES, UserRole } from '@/types/settings';
import { useAuthStore } from '@/stores/authStore';

/**
 * 用户管理（真实后端数据 · /api/users）
 * ------------------------------------------------------------
 * 替代原「本地演示用户」表格：直接读取 D1 中的真实账号，
 * 支持管理员审批新注册申请、调整已启用账号的角色。
 * 无 token / 接口不可达时给出友好空态，绝不白屏。
 */

/** 后端返回的用户对象（与 GET /api/users 契约同构） */
interface ApiUser {
  id: string;
  username: string;
  name: string;
  role: string;
  department?: string;
  status: string;
  email?: string;
  /** 绑定的备用（抄送）邮箱：超管双邮箱验证用 */
  altEmail?: string;
  phone?: string;
  isOwner?: boolean;
  orgId?: string;
  /** 所属公司名称（V2.96.0 起由后端关联 orgs 返回） */
  orgName?: string;
  /** 所属公司状态：pending 表示新公司尚未获批 */
  orgStatus?: string;
  /** 公司码 */
  orgCode?: string;
  /** 所属公司是否存在启用中的管理员（V3.15.8）；
   *  false 表示该公司暂时没人能审批成员、也没人能管理邀请码，申请会由超级管理员代管 */
  orgHasAdmin?: boolean;
  createdAt?: string;
}

/** 需超管代管的公司（GET /api/users 的 orphanOrgs，V3.15.8） */
interface OrphanOrg {
  orgId: string;
  orgName: string | null;
  orgStatus: string;
  memberCount: number;
  pendingCount: number;
}

/** 状态 → 展示文案与配色（与 PUT 契约的 pending/active/rejected 对齐） */
function statusMeta(status: string): { label: string; color: 'warning' | 'success' | 'error' | 'default' } {
  switch (status) {
    case 'pending':
      return { label: '待审批', color: 'warning' };
    case 'active':
      return { label: '已启用', color: 'success' };
    case 'rejected':
      return { label: '已驳回', color: 'error' };
    default:
      return { label: status || '未知', color: 'default' };
  }
}

function roleInfo(role: string) {
  const def = ROLE_DEFINITIONS.find((r) => r.id === role);
  return {
    name: (ROLE_NAMES as Record<string, string>)[role] || role,
    color: def?.color || '#94A3B8',
  };
}

const UserManagementTab: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logoutAll = useAuthStore((s) => s.logoutAll);

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  // 尚未批准启用的新公司数量（组织状态为 pending），供超管角标提醒
  const [newCompanyCount, setNewCompanyCount] = useState(0);
  // 「需超管代管」的公司清单（V3.15.8）：已生效、内部无管理员、且有真实成员
  const [orphanOrgs, setOrphanOrgs] = useState<OrphanOrg[]>([]);
  const [orphanCompanyCount, setOrphanCompanyCount] = useState(0);
  const [orphanPendingCount, setOrphanPendingCount] = useState(0);
  /** 只看「所在公司暂无管理员」的账号 */
  const [orphanOnly, setOrphanOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  });

  // 角色编辑对话框
  const [roleDialogUser, setRoleDialogUser] = useState<ApiUser | null>(null);
  const [roleDraft, setRoleDraft] = useState<UserRole>('user');

  // 审批对话框（V3.15.5）：批准的同时指定角色——建公司者不再自动成为管理员
  const [approveTarget, setApproveTarget] = useState<ApiUser | null>(null);
  const [approveRole, setApproveRole] = useState<UserRole>('user');

  const canManage = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  /** 仅超级管理员可授予「管理员」角色（与后端提权护栏一致，前端不给出会被拒绝的按钮） */
  const canGrantAdmin = currentUser?.role === 'super_admin';
  /** 需代管清单只对超管有意义：管理员无权处置其它公司，展示给他们只会造成误解 */
  const showOrphanPanel = canGrantAdmin && orphanCompanyCount > 0;
  // 角色下拉禁止出现 super_admin（后端同样会拒绝）
  const assignableRoles = useMemo(
    () => ROLE_DEFINITIONS.filter((r) => r.id !== 'super_admin'),
    []
  );

  const load = useCallback(async () => {
    if (!token) {
      setError('未登录或无法连接服务器，用户管理需要登录后使用');
      setUsers([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (keyword.trim()) qs.set('keyword', keyword.trim());
      if (orphanOnly) qs.set('orphan', '1');
      qs.set('page', '1');
      qs.set('pageSize', '200');
      const res = await fetch(`/api/users?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('未登录或无法连接服务器，用户管理需要登录后使用');
        } else if (res.status === 403) {
          setError('当前账号无权查看用户列表（仅超级管理员 / 系统管理员可用）');
        } else {
          setError(`加载用户失败，请稍后重试（HTTP ${res.status}）`);
        }
        setUsers([]);
        setTotal(0);
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data?.data) ? data.data : []);
      setTotal(typeof data?.total === 'number' ? data.total : (data?.data?.length ?? 0));
      setPendingCount(typeof data?.pendingCount === 'number' ? data.pendingCount : 0);
      setNewCompanyCount(typeof data?.newCompanyCount === 'number' ? data.newCompanyCount : 0);
      setOrphanOrgs(Array.isArray(data?.orphanOrgs) ? data.orphanOrgs : []);
      setOrphanCompanyCount(typeof data?.orphanCompanyCount === 'number' ? data.orphanCompanyCount : 0);
      setOrphanPendingCount(typeof data?.orphanPendingCount === 'number' ? data.orphanPendingCount : 0);
    } catch {
      setError('未登录或无法连接服务器，用户管理需要登录后使用');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, keyword, orphanOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 调用 PUT /api/users/:id 执行审批或改角色 */
  const patchUser = useCallback(
    async (id: string, body: { action?: 'approve' | 'reject'; role?: string }) => {
      if (!token) return false;
      setActingId(id);
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSnack({ open: true, msg: data?.error || `操作失败（HTTP ${res.status}）`, severity: 'error' });
          return false;
        }
        // V3.15.8：把「这家公司现在有没有管理员」如实反馈给操作人。
        // 批准新公司创建人却没选「管理员」时，必须当场说清后果，而不是只回一句「操作成功」。
        let msg = '操作成功';
        if (body.role === 'admin') {
          msg = '已设为管理员：该公司的成员审批与邀请码管理已交还本公司';
        } else if (data?.caretakerMode) {
          msg = '已处理（该公司暂无管理员，本次由您代管）';
        } else if (data?.orgHasAdmin === false) {
          msg = '操作成功；该公司当前仍无管理员，已列入「需代管」清单';
        }
        setSnack({ open: true, msg, severity: 'success' });
        await load();
        return true;
      } catch {
        setSnack({ open: true, msg: '操作失败，请检查网络后重试', severity: 'error' });
        return false;
      } finally {
        setActingId(null);
      }
    },
    [token, load]
  );

  const isProtectedRow = (u: ApiUser) => u.role === 'super_admin' || u.id === currentUser?.id;

  /**
   * 强制下线（V2.98.0 · 评测 M-09）
   * 原实现里登出只作废当前这一枚令牌，员工离职后他在别处的会话仍然有效。
   * 这里一次性清空该账号的全部会话，返回被作废的条数。
   */
  const forceLogout = useCallback(
    async (u: ApiUser) => {
      if (!token) return;
      setActingId(u.id);
      try {
        const r = await logoutAll(u.id);
        if (!r.ok) {
          setSnack({ open: true, msg: r.error || '强制下线失败', severity: 'error' });
          return;
        }
        setSnack({
          open: true,
          msg: `已强制下线 ${u.name || u.username}：作废 ${r.revoked ?? 0} 个设备会话`,
          severity: 'success',
        });
      } finally {
        setActingId(null);
      }
    },
    [token, logoutAll]
  );

  return (
    <Box sx={{ p: 3 }} data-testid="user-management">
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>用户列表</Typography>
        <Chip size="small" label={`共 ${total} 人`} data-testid="um-total" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600 }} />
        <Chip
          size="small"
          color={pendingCount > 0 ? 'warning' : 'default'}
          label={`待审批 ${pendingCount}`}
          data-testid="um-pending"
          sx={{ fontWeight: 600 }}
        />
        {newCompanyCount > 0 && (
          <Chip
            size="small"
            color="error"
            label={`新公司待批 ${newCompanyCount}`}
            data-testid="um-new-company"
            sx={{ fontWeight: 600 }}
          />
        )}
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          select
          label="状态"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 120 }}
          data-testid="um-filter-status"
        >
          <MenuItem value="">全部</MenuItem>
          <MenuItem value="pending">待审批</MenuItem>
          <MenuItem value="active">已启用</MenuItem>
          <MenuItem value="rejected">已驳回</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="搜索姓名 / 用户名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void load(); }}
          InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: '#94A3B8' }} /> }}
          data-testid="um-search"
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          onClick={() => void load()}
          disabled={loading}
          data-testid="um-refresh"
        >
          刷新
        </Button>
      </Box>

      {/* 需超管代管（V3.15.8）：公司无管理员时，其成员审批与邀请码管理无人可做 → 自动上收到超管 */}
      {showOrphanPanel && (
        <Alert
          severity="warning"
          icon={<ReportProblemOutlined />}
          sx={{ mb: 2, borderRadius: 2, alignItems: 'flex-start', '& .MuiAlert-message': { width: '100%' } }}
          data-testid="um-orphan-alert"
          action={
            <Button
              size="small"
              color="inherit"
              variant={orphanOnly ? 'contained' : 'outlined'}
              onClick={() => setOrphanOnly((v) => !v)}
              data-testid="um-orphan-toggle"
              sx={{ whiteSpace: 'nowrap' }}
            >
              {orphanOnly ? '显示全部账号' : '只看需代管'}
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }} data-testid="um-orphan-title">
            有 {orphanCompanyCount} 家公司暂无管理员，需要您代管
          </AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            这些公司已生效，但公司内没有任何「管理员」——本公司没人能审批新成员，也没人能管理邀请码。
            它们的加入申请会自动送到本页由您处理；若某位成员适合负责公司事务，可在其行内一键「设为管理员」交还权限。
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: orphanPendingCount > 0 ? 1 : 0 }}>
            {orphanOrgs.map((o) => (
              <Chip
                key={o.orgId}
                size="small"
                label={`${o.orgName || o.orgId} · ${o.memberCount} 人${o.pendingCount > 0 ? ` · 待批 ${o.pendingCount}` : ''}`}
                data-testid={`um-orphan-org-${o.orgId}`}
                sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 500 }}
              />
            ))}
            {orphanCompanyCount > orphanOrgs.length && (
              <Chip
                size="small"
                label={`…另有 ${orphanCompanyCount - orphanOrgs.length} 家`}
                sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 500 }}
              />
            )}
          </Box>
          {orphanPendingCount > 0 && (
            <Typography variant="body2" sx={{ fontWeight: 600 }} data-testid="um-orphan-pending">
              其中 {orphanPendingCount} 条加入申请正等待代管审批。
            </Typography>
          )}
        </Alert>
      )}

      {!canManage && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} data-testid="um-readonly-alert">
          当前账号无权操作用户，页面为只读状态。审批与角色调整仅超级管理员 / 系统管理员可用。
        </Alert>
      )}

      {error && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} data-testid="um-error">
          {error}
        </Alert>
      )}

      {!error && users.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} data-testid="um-empty">
          {orphanOnly
            ? '当前没有「所在公司暂无管理员」的账号——所有公司都有管理员在管。点击上方按钮可显示全部账号。'
            : '暂无用户数据。'}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" data-testid="um-table">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600 }}>用户</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>角色</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>所属公司</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>部门</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => {
              const st = statusMeta(u.status);
              const ri = roleInfo(u.role);
              const protectedRow = isProtectedRow(u);
              const busy = actingId === u.id;
              return (
                <TableRow key={u.id} hover data-testid={`um-row-${u.id}`}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: ri.color + '20', color: ri.color, fontSize: '0.875rem', fontWeight: 600 }}>
                        {(u.name || u.username || '?').charAt(0)}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{u.name || '—'}</Typography>
                          {u.role === 'super_admin' && (
                            <Chip
                              size="small"
                              icon={<AdminPanelSettings sx={{ fontSize: 14 }} />}
                              label="系统超管"
                              data-testid="um-superadmin-badge"
                              sx={{ height: 20, bgcolor: '#BE185D18', color: '#BE185D', fontWeight: 600, '& .MuiChip-icon': { color: '#BE185D' } }}
                            />
                          )}
                          {u.isOwner && u.role !== 'super_admin' && (
                            <Chip size="small" label="创建者" sx={{ height: 20, bgcolor: '#0EA5E918', color: '#0284C7', fontWeight: 600 }} />
                          )}
                          {u.id === currentUser?.id && (
                            <Chip size="small" icon={<PersonIcon sx={{ fontSize: 14 }} />} label="本人" sx={{ height: 20, bgcolor: '#64748B18', color: '#475569', fontWeight: 600, '& .MuiChip-icon': { color: '#475569' } }} />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          @{u.username}{u.email ? ` · ${u.email}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ri.name}
                      size="small"
                      sx={{ bgcolor: ri.color + '15', color: ri.color, fontWeight: 500, border: 'none' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body2">{u.orgName || '—'}</Typography>
                      {u.orgStatus === 'pending' && (
                        <Chip
                          size="small"
                          label="新公司待批"
                          data-testid={`um-org-pending-${u.id}`}
                          sx={{ height: 20, bgcolor: '#F59E0B18', color: '#B45309', fontWeight: 600 }}
                        />
                      )}
                      {/* V3.15.8 补：待批新公司由紧邻的「新公司待批」角标负责，这里再标「暂无管理员」会让一屏出现两套口径
                          （顶部横幅说 3 家、表格却标 130+ 行，与「只看需代管」的 10 条也对不上）→ 用户会认为功能不准。
                          故此处只标「已生效」公司的行，与 loadOrphanOrgs() 的三条件口径保持一致。 */}
                      {u.orgHasAdmin === false && u.role !== 'super_admin' && !!u.orgName && u.orgStatus !== 'pending' && (
                        <Tooltip title="该公司目前没有任何管理员：没人能审批新成员，也没人能管理邀请码，需由超级管理员代管">
                          <Chip
                            size="small"
                            label="暂无管理员"
                            data-testid={`um-org-orphan-${u.id}`}
                            sx={{ height: 20, bgcolor: '#FEE2E2', color: '#B91C1C', fontWeight: 600 }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{u.department || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={st.label} color={st.color} size="small" variant={st.color === 'default' ? 'outlined' : 'filled'} data-testid={`um-status-${u.id}`} />
                  </TableCell>
                  <TableCell align="right">
                    {protectedRow || !canManage ? (
                      <Typography variant="caption" color="text.secondary">
                        {protectedRow ? '—' : '只读'}
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {u.status === 'pending' && (
                          <>
                            <Button
                              size="small" color="success" variant="outlined"
                              startIcon={busy ? <CircularProgress size={14} /> : <CheckCircle />}
                              disabled={busy}
                              onClick={() => { setApproveTarget(u); setApproveRole('user'); }}
                              data-testid={`um-approve-${u.id}`}
                            >
                              批准
                            </Button>
                            <Button
                              size="small" color="error" variant="outlined"
                              startIcon={<Cancel />}
                              disabled={busy}
                              onClick={() => void patchUser(u.id, { action: 'reject' })}
                              data-testid={`um-reject-${u.id}`}
                            >
                              驳回
                            </Button>
                          </>
                        )}
                        {u.status === 'active' && (
                          <Tooltip title="调整该用户的角色">
                            <Button
                              size="small" variant="outlined"
                              startIcon={<Edit />}
                              disabled={busy}
                              onClick={() => { setRoleDialogUser(u); setRoleDraft((u.role as UserRole) || 'user'); }}
                              data-testid={`um-role-${u.id}`}
                            >
                              改角色
                            </Button>
                          </Tooltip>
                        )}
                        {u.status === 'active' && (
                          <Tooltip title="作废该账号的全部登录会话（含手机等其它设备），用于离职或设备丢失">
                            <Button
                              size="small" variant="outlined" color="warning"
                              startIcon={busy ? <CircularProgress size={14} /> : <PowerSettingsNew />}
                              disabled={busy}
                              onClick={() => void forceLogout(u)}
                              data-testid={`um-logout-${u.id}`}
                            >
                              强制下线
                            </Button>
                          </Tooltip>
                        )}
                        {/* 同上：只对「已生效」公司提供一键交还权限，待批新公司应先走批准流程 */}
                        {canGrantAdmin && u.status === 'active' && u.orgHasAdmin === false && u.role !== 'admin' && !!u.orgName && u.orgStatus !== 'pending' && (
                          <Tooltip title="该公司目前没有管理员，成员审批与邀请码管理无人可做。若此人负责公司事务，可设为管理员把权限交还本公司">
                            <Button
                              size="small" color="success" variant="contained"
                              startIcon={busy ? <CircularProgress size={14} /> : <SupervisorAccount />}
                              disabled={busy}
                              onClick={() => void patchUser(u.id, { role: 'admin' })}
                              data-testid={`um-make-admin-${u.id}`}
                            >
                              设为管理员
                            </Button>
                          </Tooltip>
                        )}
                        {u.status === 'rejected' && (
                          <Button
                            size="small" color="primary" variant="outlined"
                            startIcon={busy ? <CircularProgress size={14} /> : <Undo />}
                            disabled={busy}
                            onClick={() => { setApproveTarget(u); setApproveRole((u.role as UserRole) || 'user'); }}
                            data-testid={`um-restore-${u.id}`}
                          >
                            恢复
                          </Button>
                        )}
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? '正在加载…' : '暂无用户'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 改角色对话框 */}
      <Dialog open={!!roleDialogUser} onClose={() => setRoleDialogUser(null)} maxWidth="xs" fullWidth data-testid="um-role-dialog">
        <DialogTitle sx={{ fontWeight: 600 }}>调整角色</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            将 <strong>{roleDialogUser?.name || roleDialogUser?.username}</strong> 的角色调整为：
          </Typography>
          <TextField
            select
            fullWidth
            label="角色"
            value={roleDraft}
            onChange={(e) => setRoleDraft(e.target.value as UserRole)}
            data-testid="um-role-select"
          >
            {assignableRoles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
                  {r.name}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoleDialogUser(null)}>取消</Button>
          <Button
            variant="contained"
            disabled={!roleDialogUser || actingId === roleDialogUser?.id}
            data-testid="um-role-confirm"
            onClick={async () => {
              if (!roleDialogUser) return;
              const okDone = await patchUser(roleDialogUser.id, { role: roleDraft });
              if (okDone) setRoleDialogUser(null);
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 审批对话框：批准的同时指定角色（V3.15.5，建公司者不再自动成为管理员） */}
      <Dialog open={!!approveTarget} onClose={() => setApproveTarget(null)} maxWidth="xs" fullWidth data-testid="um-approve-dialog">
        <DialogTitle sx={{ fontWeight: 600 }}>批准并分配角色</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            批准 <strong>{approveTarget?.name || approveTarget?.username}</strong>
            {approveTarget?.orgName ? <> 加入「<strong>{approveTarget.orgName}</strong>」</> : null}
            ，并为其分配角色：
          </Typography>
          {(approveTarget?.orgStatus === 'pending' || approveTarget?.isOwner) && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              {approveTarget?.orgStatus === 'pending'
                ? '这是新公司的创建人，批准后该公司即生效。若此处不选「管理员」，该公司将暂无管理员负责审批成员与维护邀请码；此后该公司的成员申请会自动上收到超级管理员代管。'
                : '该用户是公司创建人。'}
            </Alert>
          )}
          {canGrantAdmin && approveTarget?.orgStatus !== 'pending' && approveTarget?.orgHasAdmin === false && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} data-testid="um-approve-caretaker">
              「{approveTarget?.orgName || '该公司'}」目前没有管理员，本次审批由您代管。
              若此人负责公司事务，建议角色选「管理员」，把成员审批与邀请码管理交还本公司。
            </Alert>
          )}
          <TextField
            select
            fullWidth
            label="角色"
            value={approveRole}
            onChange={(e) => setApproveRole(e.target.value as UserRole)}
            data-testid="um-approve-role-select"
          >
            {assignableRoles.map((r) => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApproveTarget(null)}>取消</Button>
          <Button
            variant="contained"
            color="success"
            disabled={!approveTarget || actingId === approveTarget?.id}
            data-testid="um-approve-confirm"
            onClick={async () => {
              if (!approveTarget) return;
              const okDone = await patchUser(approveTarget.id, { action: 'approve', role: approveRole });
              if (okDone) setApproveTarget(null);
            }}
          >
            批准
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.msg}
      />
    </Box>
  );
};

export default UserManagementTab;
