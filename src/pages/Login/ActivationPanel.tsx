// 超级管理员首次激活面板
// 触发时机：登录校验通过，但该账号 security_initialized=0（尚未完成安全初始化）。
//
// 流程（三步）：
//   1) 系统向该账号绑定的每个邮箱「分别」发送一枚互不相同的验证码；
//   2) 用户把每个邮箱收到的验证码都填写正确 —— 缺任何一个邮箱的码都无法通过；
//   3) 验证通过后服务端签发一次性凭证，据此设置新密码，随后自动登录进入系统。
//
// 安全要点：整个流程中后端都不签发会话，因此「不完成验证就无法进入系统」；
//   同时提供「收不到邮件」的兜底提示，避免邮件通道故障时把管理员锁在系统外。
import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  TextField,
  Button,
  Stack,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import {
  Lock,
  Visibility,
  VisibilityOff,
  Shield,
  Email,
  Business,
  Replay,
} from '@mui/icons-material';
import { useAuthStore, type ActivationInfo } from '@/stores/authStore';

const STEPS = ['发送验证码', '验证双邮箱', '设置新密码'];

/** 与后端一致的新密码强度要求 */
function validatePassword(pw: string, confirm: string): string | null {
  if (!pw) return '请输入新密码';
  if (pw.length < 8) return '新密码至少 8 位';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return '新密码需同时包含字母和数字';
  if (pw !== confirm) return '两次输入的新密码不一致';
  return null;
}

interface SentItem {
  email: string;
  label: string;
  ok: boolean;
  error?: string;
}

interface Props {
  info: ActivationInfo;
  /** 登录时已校验通过的密码：发送验证码与校验验证码都需要它二次确认身份 */
  password: string;
  onCancel: () => void;
}

export default function ActivationPanel({ info, password, onCancel }: Props) {
  const sendCode = useAuthStore((s) => s.sendCode);
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const activate = useAuthStore((s) => s.activate);

  const emailCount = Math.max(1, info.emails.length);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [sent, setSent] = useState<SentItem[]>([]);
  const [codes, setCodes] = useState<string[]>(() => Array(emailCount).fill(''));
  const [ticket, setTicket] = useState('');
  const [seconds, setSeconds] = useState(0);

  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // 安全邮箱备用通道（收不到验证码时的异地取码后路；验证码不在本页显示）
  const securityMailbox = useAuthStore((s) => s.securityMailbox);
  const [smLoading, setSmLoading] = useState(false);
  const [smMsg, setSmMsg] = useState<string | null>(null);
  const [smOk, setSmOk] = useState(false);

  /** 申请启用安全邮箱备用通道：把新验证码延时投递到独立安全邮箱 */
  async function handleSecMailEnqueue() {
    setSmMsg(null);
    setSmLoading(true);
    const r = await securityMailbox({
      username: info.username,
      password,
      purpose: 'activate',
      action: 'enqueue',
    });
    setSmLoading(false);
    if (!r.ok) {
      setSmOk(false);
      setSmMsg(r.error || '申请失败，请稍后重试');
      return;
    }
    setSmOk(true);
    setSmMsg(
      r.data?.message ||
        `已登记：验证码将在 ${r.data?.delayHours ?? 8} 小时后投递到安全邮箱，并在 ${r.data?.intervalMin ?? 10} 分钟后再投递一次`
    );
  }

  // 重发倒计时（与后端 60 秒冷却对齐）
  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [seconds]);

  /** 第 1 步：发送验证码 */
  async function handleSend() {
    setError(null);
    setNotice(null);
    setLoading(true);
    const r = await sendCode({ username: info.username, password, purpose: 'activate' });
    setLoading(false);
    if (!r.ok) {
      setError(r.error || '验证码发送失败');
      return;
    }
    const list: SentItem[] = Array.isArray(r.data?.emails) ? r.data.emails : [];
    setSent(list);
    setCodes(Array(list.length || emailCount).fill(''));
    setSeconds(60);
    setStep(1);
    const failed = list.filter((x) => !x.ok);
    if (list.length && failed.length === list.length) {
      setError(
        '两个邮箱的邮件都未能发出，请稍后重试；也可以启用下方「安全邮箱备用通道」，系统会把新验证码延时投递到独立的安全邮箱'
      );
    } else if (failed.length) {
      setNotice(
        `已发送。其中 ${failed.map((f) => f.email).join('、')} 发送失败，请确认该邮箱地址是否正确`
      );
    } else {
      setNotice('验证码已分别发送到以下邮箱，请查收（含垃圾箱）');
    }
  }

  /** 第 2 步：校验全部验证码 */
  async function handleVerify() {
    setError(null);
    setNotice(null);
    const list = codes.map((c) => c.trim());
    if (list.some((c) => !c)) {
      setError('请填写每个邮箱收到的验证码，一个都不能少');
      return;
    }
    setLoading(true);
    const r = await verifyCode({
      username: info.username,
      password,
      purpose: 'activate',
      codes: list,
    });
    setLoading(false);
    if (!r.ok || !r.ticket) {
      setError(r.error || '验证码校验失败');
      return;
    }
    setTicket(r.ticket);
    setStep(2);
    setNotice('验证通过，请设置新的登录密码');
  }

  /** 第 3 步：设置新密码并完成激活 */
  async function handleActivate() {
    setError(null);
    setNotice(null);
    const invalid = validatePassword(pwd, pwd2);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    const r = await activate({ username: info.username, ticket, newPassword: pwd });
    setLoading(false);
    if (!r.ok) {
      setError(r.error || '激活失败，请重试');
      return;
    }
    // 成功后 authStore 会触发整页重载，直接进入系统
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
        p: 2,
      }}
    >
      <Paper elevation={8} sx={{ width: 520, maxWidth: '100%', p: 4, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Shield color="primary" />
          <Typography variant="h6" fontWeight={700}>
            账户安全初始化
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          出于安全考虑，超级管理员首次登录必须完成双邮箱验证并设置密码，之后才能进入系统。
        </Typography>

        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }} data-testid="activation-stepper">
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} data-testid="activation-error">
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNotice(null)} data-testid="activation-notice">
            {notice}
          </Alert>
        )}

        {/* ── 绑定邮箱展示 ─────────────────────────────────── */}
        <Box sx={{ mb: 2.5, p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 1.5 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            验证码将分别发送到以下 {info.emails.length || 0} 个邮箱，每个邮箱的验证码都需填写：
          </Typography>
          <Stack spacing={0.75}>
            {info.emails.map((e) => (
              <Stack key={e.email} direction="row" alignItems="center" spacing={1}>
                <Email fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontFamily: 'Menlo, Consolas, monospace' }}>
                  {e.email}
                </Typography>
                <Chip size="small" label={e.label} variant="outlined" />
              </Stack>
            ))}
            {!info.emails.length && (
              <Typography variant="body2" color="error">
                该账号尚未绑定验证邮箱，请联系系统运维
              </Typography>
            )}
          </Stack>
        </Box>

        {/* ── 第 1 步：发送验证码 ───────────────────────────── */}
        {step === 0 && (
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSend}
              disabled={loading || !info.emails.length}
              data-testid="activation-send-code"
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : '发送验证码'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              点击后系统会向上述邮箱各发送一个不同的验证码，5 分钟内有效。
            </Typography>
          </Stack>
        )}

        {/* ── 第 2 步：填写各邮箱验证码 ─────────────────────── */}
        {step === 1 && (
          <Stack spacing={2}>
            {sent.map((item, idx) => (
              <TextField
                key={item.email}
                label={`${item.label} ${item.email} 收到的验证码`}
                value={codes[idx] ?? ''}
                onChange={(e) => {
                  const next = [...codes];
                  next[idx] = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCodes(next);
                }}
                fullWidth
                inputProps={{ inputMode: 'numeric', maxLength: 6, 'data-testid': `activation-code-${idx}` }}
                error={!item.ok}
                helperText={
                  item.ok
                    ? ''
                    : `该邮箱发送失败${item.error ? '：' + item.error : ''}`
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            ))}

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                onClick={handleVerify}
                disabled={loading}
                data-testid="activation-verify"
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : '验证并继续'}
              </Button>
              <Button
                variant="text"
                startIcon={<Replay />}
                onClick={handleSend}
                disabled={loading || seconds > 0}
                data-testid="activation-resend"
              >
                {seconds > 0 ? `重新发送（${seconds} 秒）` : '重新发送验证码'}
              </Button>
            </Stack>
          </Stack>
        )}

        {/* ── 第 3 步：设置新密码 ───────────────────────────── */}
        {step === 2 && (
          <Stack spacing={2}>
            <TextField
              label="新密码（至少 8 位，需含字母和数字）"
              type={showPwd ? 'text' : 'password'}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              fullWidth
              data-testid="activation-new-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock fontSize="small" />
                  </InputAdornment>
                ),
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
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              fullWidth
              error={!!pwd2 && pwd !== pwd2}
              helperText={pwd2 && pwd !== pwd2 ? '两次输入的新密码不一致' : ''}
              data-testid="activation-confirm-password"
            />
            <Button
              variant="contained"
              size="large"
              onClick={handleActivate}
              disabled={loading}
              data-testid="activation-submit"
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : '完成设置并进入系统'}
            </Button>
          </Stack>
        )}

        <Divider sx={{ my: 2.5 }} />

        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Business fontSize="small" sx={{ color: 'text.disabled', mt: 0.25 }} />
          <Typography variant="caption" color="text.secondary">
            收不到验证码？请先检查垃圾邮件箱。若两个邮箱都收不到，可启用下方的「安全邮箱备用通道」——
            系统会把新的一批验证码延时投递到独立的安全邮箱（验证码不会在本页或系统任何界面显示），
            或联系系统运维协助。
          </Typography>
        </Stack>

        {step < 2 && (
          <Box sx={{ mt: 1.5 }} data-testid="activation-security-mailbox">
            <Button
              size="small"
              variant="outlined"
              startIcon={smLoading ? <CircularProgress size={16} /> : null}
              disabled={smLoading}
              onClick={() => void handleSecMailEnqueue()}
              data-testid="activation-security-mailbox-btn"
            >
              启用安全邮箱备用通道
            </Button>
            {smMsg && (
              <Alert
                severity={smOk ? 'success' : 'error'}
                sx={{ mt: 1 }}
                data-testid="activation-security-mailbox-msg"
              >
                {smMsg}
              </Alert>
            )}
          </Box>
        )}

        <Button
          variant="text"
          size="small"
          onClick={onCancel}
          sx={{ mt: 1 }}
          data-testid="activation-cancel"
        >
          返回登录
        </Button>
      </Paper>
    </Box>
  );
}
