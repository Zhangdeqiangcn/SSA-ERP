import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Grid,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Lock,
  Person,
  Email,
  Visibility,
  VisibilityOff,
  Logout,
  Save,
  Edit,
  PhoneAndroid,
  LockOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_NAMES, type UserRole } from '@/types/settings';
// V3.15.0：个人中心与个人工作台合并 —— 直接复用工作台组件作为其中一个标签页
import Workbench from '@/pages/Workbench/Workbench';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^1[3-9]\d{9}$/;

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}
function TabPanel({ value, index, children }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

/** 个人中心（V3.15.0 起 = 个人工作台 + 个人资料 + 账号安全 合并页） */
export default function PersonalCenter() {
  const { currentUser, changePasswordSelf, logout, updateProfile } = useAuthStore();
  const user = currentUser;

  const [tab, setTab] = useState(0);

  // ── 个人资料：编辑态 ─────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', altEmail: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── 账号安全：改密态 ─────────────────────────────────────
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 密码强度简易评估（仅用于提示）
  function strength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
    if (!pw) return { level: 0, label: '', color: '#E2E8F0' };
    let score = 0;
    if (pw.length >= MIN_PASSWORD_LENGTH) score++;
    if (pw.length >= 12) score++;
    if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: '弱', color: '#EF4444' };
    if (score <= 3) return { level: 2, label: '中', color: '#F59E0B' };
    return { level: 3, label: '强', color: '#10B981' };
  }
  const st = strength(newPwd);

  // ── 个人资料编辑 ─────────────────────────────────────────
  const startEdit = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
      altEmail: user?.altEmail || '',
    });
    setProfileMsg(null);
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    if (!form.name.trim()) { setProfileMsg({ type: 'error', text: '姓名不能为空' }); return; }
    if (form.phone && !PHONE_RE.test(form.phone.trim())) { setProfileMsg({ type: 'error', text: '手机号格式不正确' }); return; }
    if (form.email && !EMAIL_RE.test(form.email.trim())) { setProfileMsg({ type: 'error', text: '主邮箱格式不正确' }); return; }
    if (form.altEmail && !EMAIL_RE.test(form.altEmail.trim())) { setProfileMsg({ type: 'error', text: '备用邮箱格式不正确' }); return; }
    setSavingProfile(true);
    const r = await updateProfile({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      altEmail: form.altEmail.trim(),
    });
    setSavingProfile(false);
    if (!r.ok) { setProfileMsg({ type: 'error', text: r.error || '保存失败' }); return; }
    setProfileMsg({ type: 'success', text: '个人资料已更新' });
    setEditMode(false);
  };

  // ── 账号安全改密 ─────────────────────────────────────────
  async function handleChangePassword() {
    setError(null);
    setSuccess(null);
    if (!curPwd) { setError('请输入当前密码'); return; }
    if (newPwd.length < MIN_PASSWORD_LENGTH) { setError(`新密码至少 ${MIN_PASSWORD_LENGTH} 位`); return; }
    if (!/[A-Za-z]/.test(newPwd) || !/\d/.test(newPwd)) { setError('新密码需同时包含字母和数字'); return; }
    if (newPwd !== confirmPwd) { setError('两次输入的新密码不一致'); return; }
    if (newPwd === curPwd) { setError('新密码不能与当前密码相同'); return; }
    setSaving(true);
    const r = await changePasswordSelf({ currentPassword: curPwd, newPassword: newPwd });
    setSaving(false);
    if (!r.ok) { setError(r.error || '密码修改失败'); return; }
    setSuccess('密码修改成功，下次登录请使用新密码。');
    setCurPwd(''); setNewPwd(''); setConfirmPwd('');
  }

  const roleLabel = user?.role ? ROLE_NAMES[user.role as UserRole] || user.role : '操作员';

  // 管理员锁定字段（只读，由管理员在用户管理里设置）
  const AdminField = ({ label, value }: { label: string; value: string }) => (
    <Grid item xs={12} sm={6}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
        <LockOutlined fontSize="small" sx={{ opacity: 0.5 }} />
        <Box>
          <Typography variant="caption" display="block">
            {label}
            <Chip label="管理员设置" size="small" sx={{ ml: 1, height: 18, fontSize: '0.625rem', bgcolor: 'action.hover' }} />
          </Typography>
          <Typography variant="body2" fontWeight={500}>{value || '-'}</Typography>
        </Box>
      </Box>
    </Grid>
  );

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* 顶部身份条 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: '1.4rem', fontWeight: 700 }}>
          {(user?.name || user?.username || 'U').charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
            {user?.name || '用户'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            @{user?.username || '-'} · {roleLabel}
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Button variant="outlined" color="inherit" startIcon={<Logout />} onClick={() => logout()}>
            退出登录
          </Button>
        </Box>
      </Box>

      {/* 合并页三标签页 */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="我的工作台" />
        <Tab label="个人资料" />
        <Tab label="账号安全" />
      </Tabs>

      {/* ① 我的工作台 */}
      <TabPanel value={tab} index={0}>
        <Workbench />
      </TabPanel>

      {/* ② 个人资料 */}
      <TabPanel value={tab} index={1}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
              个人资料
            </Typography>
            {!editMode ? (
              <Button variant="outlined" startIcon={<Edit />} onClick={startEdit}>
                编辑
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button variant="text" onClick={() => { setEditMode(false); setProfileMsg(null); }}>取消</Button>
                <Button
                  variant="contained"
                  startIcon={savingProfile ? <CircularProgress size={18} color="inherit" /> : <Save />}
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? '保存中' : '保存'}
                </Button>
              </Stack>
            )}
          </Box>

          {profileMsg && (
            <Alert severity={profileMsg.type} sx={{ mb: 2 }} onClose={() => setProfileMsg(null)}>
              {profileMsg.text}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* 姓名（可改） */}
            <Grid item xs={12} sm={6}>
              {editMode ? (
                <TextField label="姓名" fullWidth value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                  <Person fontSize="small" />
                  <Box><Typography variant="caption" display="block">姓名</Typography>
                    <Typography variant="body2" fontWeight={500}>{user?.name || '-'}</Typography></Box>
                </Box>
              )}
            </Grid>

            {/* 手机号（可改，V3.15.0 新增） */}
            <Grid item xs={12} sm={6}>
              {editMode ? (
                <TextField label="手机号" fullWidth placeholder="11 位手机号，可留空"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><PhoneAndroid /></InputAdornment>) }} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                  <PhoneAndroid fontSize="small" />
                  <Box><Typography variant="caption" display="block">手机号</Typography>
                    <Typography variant="body2" fontWeight={500}>{user?.phone || '未绑定'}</Typography></Box>
                </Box>
              )}
            </Grid>

            {/* 主邮箱（可改） */}
            <Grid item xs={12} sm={6}>
              {editMode ? (
                <TextField label="主邮箱" fullWidth placeholder="如 name@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Email /></InputAdornment>) }} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                  <Email fontSize="small" />
                  <Box><Typography variant="caption" display="block">主邮箱</Typography>
                    <Typography variant="body2" fontWeight={500}>{user?.email || '未绑定'}</Typography></Box>
                </Box>
              )}
            </Grid>

            {/* 备用邮箱（可改） */}
            <Grid item xs={12} sm={6}>
              {editMode ? (
                <TextField label="备用邮箱" fullWidth placeholder="用于双邮箱验证抄送，可留空"
                  value={form.altEmail}
                  onChange={(e) => setForm({ ...form, altEmail: e.target.value })}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><Email /></InputAdornment>) }} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                  <Email fontSize="small" />
                  <Box><Typography variant="caption" display="block">备用邮箱</Typography>
                    <Typography variant="body2" fontWeight={500}>{user?.altEmail || '未绑定'}</Typography></Box>
                </Box>
              )}
            </Grid>

            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

            {/* 以下为管理员锁定字段（只读） */}
            <AdminField label="用户名" value={user?.username || '-'} />
            <AdminField label="部门" value={user?.department || '未设置'} />
            <AdminField label="角色" value={roleLabel} />
          </Grid>

          {editMode && (
            <Alert severity="info" sx={{ mt: 2 }}>
              姓名、手机号、主邮箱、备用邮箱可自行修改；用户名、部门、角色由管理员在「用户管理」中设置，此处不可更改。
            </Alert>
          )}
        </Paper>
      </TabPanel>

      {/* ③ 账号安全 */}
      <TabPanel value={tab} index={2}>
        <Paper sx={{ p: 3, borderRadius: 3, maxWidth: 560 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock fontSize="small" color="primary" />
            修改密码
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            请输入当前密码以验证身份，然后设置新密码。修改后其他设备的登录状态将被注销。
          </Typography>

          {error && (<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>)}
          {success && (<Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>)}

          <Stack spacing={2}>
            <TextField
              label="当前密码" type={showCur ? 'text' : 'password'} value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)} fullWidth
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                endAdornment: (<InputAdornment position="end">
                  <IconButton onClick={() => setShowCur((s) => !s)} edge="end" size="small">
                    {showCur ? <VisibilityOff /> : <Visibility />}
                  </IconButton></InputAdornment>),
              }}
            />
            <TextField
              label={`新密码（至少 ${MIN_PASSWORD_LENGTH} 位，含字母和数字）`} type={showNew ? 'text' : 'password'}
              value={newPwd} onChange={(e) => setNewPwd(e.target.value)} fullWidth
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                endAdornment: (<InputAdornment position="end">
                  <IconButton onClick={() => setShowNew((s) => !s)} edge="end" size="small">
                    {showNew ? <VisibilityOff /> : <Visibility />}
                  </IconButton></InputAdornment>),
              }}
            />
            {newPwd && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} sx={{ height: 4, flex: 1, borderRadius: 2, bgcolor: st.level >= i ? st.color : '#E2E8F0', transition: 'background-color .2s' }} />
                  ))}
                </Box>
                <Typography variant="caption" sx={{ color: st.color, fontWeight: 600, minWidth: 24 }}>{st.label}</Typography>
              </Box>
            )}
            <TextField
              label="确认新密码" type={showNew ? 'text' : 'password'} value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} fullWidth
              error={!!confirmPwd && newPwd !== confirmPwd}
              helperText={confirmPwd && newPwd !== confirmPwd ? '两次输入的密码不一致' : ''}
            />
            <Box>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                onClick={handleChangePassword} disabled={saving} data-testid="change-password-submit">
                {saving ? '保存中' : '保存修改'}
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            忘记密码？可在登录页点击「找回密码」，通过注册邮箱接收验证码重置。
          </Typography>
        </Box>
      </TabPanel>
    </Box>
  );
}
