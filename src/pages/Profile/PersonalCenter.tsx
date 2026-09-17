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
} from '@mui/material';
import {
  Lock,
  Person,
  Email,
  Badge,
  Visibility,
  VisibilityOff,
  Logout,
  Save,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_NAMES, type UserRole } from '@/types/settings';

const MIN_PASSWORD_LENGTH = 8;

/** 个人中心：展示当前账号资料，并提供「修改密码」（凭当前密码，全角色可用） */
export default function PersonalCenter() {
  const { currentUser, changePasswordSelf, logout } = useAuthStore();
  const user = currentUser;

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

  async function handleChangePassword() {
    setError(null);
    setSuccess(null);
    if (!curPwd) {
      setError('请输入当前密码');
      return;
    }
    if (newPwd.length < MIN_PASSWORD_LENGTH) {
      setError(`新密码至少 ${MIN_PASSWORD_LENGTH} 位`);
      return;
    }
    if (!/[A-Za-z]/.test(newPwd) || !/\d/.test(newPwd)) {
      setError('新密码需同时包含字母和数字');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (newPwd === curPwd) {
      setError('新密码不能与当前密码相同');
      return;
    }
    setSaving(true);
    const r = await changePasswordSelf({ currentPassword: curPwd, newPassword: newPwd });
    setSaving(false);
    if (!r.ok) {
      setError(r.error || '密码修改失败');
      return;
    }
    setSuccess('密码修改成功，下次登录请使用新密码。');
    setCurPwd('');
    setNewPwd('');
    setConfirmPwd('');
  }

  return (
    <Box sx={{ maxWidth: 880, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B', mb: 3 }}>
        个人中心
      </Typography>

      {/* 账号资料卡片 */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.main',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {(user?.name || user?.username || 'U').charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {user?.name || '用户'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{user?.username || '-'}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label={user?.role ? ROLE_NAMES[user.role as UserRole] || user.role : '操作员'}
              color="primary"
              size="small"
            />
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
              <Person fontSize="small" />
              <Box>
                <Typography variant="caption" display="block">姓名</Typography>
                <Typography variant="body2" fontWeight={500}>{user?.name || '-'}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
              <Badge fontSize="small" />
              <Box>
                <Typography variant="caption" display="block">部门</Typography>
                <Typography variant="body2" fontWeight={500}>{user?.department || '未设置'}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
              <Email fontSize="small" />
              <Box>
                <Typography variant="caption" display="block">邮箱</Typography>
                <Typography variant="body2" fontWeight={500}>{user?.email || '未绑定'}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 修改密码卡片 */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock fontSize="small" color="primary" />
          修改密码
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          请输入当前密码以验证身份，然后设置新密码。修改后其他设备的登录状态将被注销。
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="当前密码"
            type={showCur ? 'text' : 'password'}
            value={curPwd}
            onChange={(e) => setCurPwd(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowCur((s) => !s)} edge="end" size="small">
                    {showCur ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label={`新密码（至少 ${MIN_PASSWORD_LENGTH} 位，含字母和数字）`}
            type={showNew ? 'text' : 'password'}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowNew((s) => !s)} edge="end" size="small">
                    {showNew ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {newPwd && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                {[1, 2, 3].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      height: 4, flex: 1, borderRadius: 2,
                      bgcolor: st.level >= i ? st.color : '#E2E8F0',
                      transition: 'background-color .2s',
                    }}
                  />
                ))}
              </Box>
              <Typography variant="caption" sx={{ color: st.color, fontWeight: 600, minWidth: 24 }}>
                {st.label}
              </Typography>
            </Box>
          )}
          <TextField
            label="确认新密码"
            type={showNew ? 'text' : 'password'}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            fullWidth
            error={!!confirmPwd && newPwd !== confirmPwd}
            helperText={confirmPwd && newPwd !== confirmPwd ? '两次输入的密码不一致' : ''}
          />
          <Box>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
              onClick={handleChangePassword}
              disabled={saving}
              data-testid="change-password-submit"
            >
              {saving ? '保存中' : '保存修改'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<Logout />}
          onClick={() => logout()}
          data-testid="personal-logout"
        >
          退出登录
        </Button>
      </Box>
    </Box>
  );
}
