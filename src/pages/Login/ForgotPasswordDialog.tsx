import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  InputAdornment,
  IconButton,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Lock, Email, Visibility, VisibilityOff, Send, ArrowBack } from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

/** 登录页「找回密码」对话框：用户名 → 发码到注册邮箱 → 填码 + 新密码重置 */
export default function ForgotPasswordDialog({ open, onClose, onSuccess }: Props) {
  const resetPasswordRequest = useAuthStore((s) => s.resetPasswordRequest);
  const resetPasswordConfirm = useAuthStore((s) => s.resetPasswordConfirm);

  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // 关闭时重置所有状态
  useEffect(() => {
    if (!open) {
      setStep(1);
      setUsername('');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setInfo(null);
      setMaskedEmail('');
      setSuccess(false);
      setCooldown(0);
    }
  }, [open]);

  // 重发冷却倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSend() {
    setError(null);
    setInfo(null);
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    setSending(true);
    const r = await resetPasswordRequest({ username: username.trim() });
    setSending(false);
    if (!r.ok) {
      setError(r.error || '发送失败，请稍后重试');
      return;
    }
    if (r.sent) {
      setMaskedEmail(r.email || '');
      setStep(2);
      setCooldown(60);
    } else {
      // 账号不存在 / 未绑定邮箱 / 邮件通道未启用等：给出引导性提示
      setInfo(r.message || '无法发送验证码，请联系贵公司管理员协助重置密码。');
    }
  }

  function validatePassword(): string | null {
    if (!newPassword) return '请输入新密码';
    if (newPassword.length < MIN_PASSWORD_LENGTH) return `新密码至少 ${MIN_PASSWORD_LENGTH} 位`;
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) return '新密码需同时包含字母和数字';
    if (!confirmPassword) return '请再次输入新密码';
    if (newPassword !== confirmPassword) return '两次输入的密码不一致';
    return null;
  }

  async function handleConfirm() {
    setError(null);
    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }
    const invalid = validatePassword();
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    const r = await resetPasswordConfirm({ username: username.trim(), code: code.trim(), newPassword });
    setSubmitting(false);
    if (!r.ok) {
      setError(r.error || '重置失败，请稍后重试');
      return;
    }
    setSuccess(true);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        {step === 1 ? (
          <><Email fontSize="small" color="primary" />找回密码</>
        ) : (
          <><Lock fontSize="small" color="primary" />重置密码</>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInfo(null)}>
            {info}
          </Alert>
        )}

        {success ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              密码已重置成功，请使用新密码登录。
            </Alert>
          </Box>
        ) : step === 1 ? (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              请输入您的登录用户名，系统将向您注册时填写的邮箱发送一封验证码邮件。
            </Typography>
            <TextField
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              disabled={sending}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Email /></InputAdornment>
                ),
              }}
            />
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              验证码已发送至 <strong>{maskedEmail}</strong>（5 分钟内有效）。请查收邮件并填入验证码，然后设置新密码。
            </Typography>
            <TextField
              label="验证码（6 位数字）"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              fullWidth
              disabled={submitting}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            />
            <TextField
              label={`新密码（至少 ${MIN_PASSWORD_LENGTH} 位，含字母和数字）`}
              type={showPwd ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              disabled={submitting}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwd((s) => !s)} edge="end" size="small">
                      {showPwd ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="确认新密码"
              type={showPwd ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              disabled={submitting}
              error={!!confirmPassword && newPassword !== confirmPassword}
              helperText={confirmPassword && newPassword !== confirmPassword ? '两次输入的密码不一致' : ''}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {success ? (
          <Button variant="contained" onClick={onSuccess} data-testid="forgot-done">
            去登录
          </Button>
        ) : step === 1 ? (
          <>
            <Button onClick={onClose} startIcon={<ArrowBack />}>取消</Button>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={sending}
              startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send />}
              data-testid="forgot-send"
            >
              {sending ? '发送中' : '发送验证码'}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleSend}
              disabled={sending || cooldown > 0}
              startIcon={<Send />}
            >
              {cooldown > 0 ? `重新发送(${cooldown}s)` : '重新发送'}
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Lock />}
              data-testid="forgot-confirm"
            >
              {submitting ? '重置中' : '重置密码'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
