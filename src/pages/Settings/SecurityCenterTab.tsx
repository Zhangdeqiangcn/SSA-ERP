import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardHeader, Accordion, AccordionSummary,
  AccordionDetails, Stack, Button, TextField, MenuItem, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Snackbar, CircularProgress, Divider, Chip, Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuthStore } from '@/stores/authStore';

/**
 * 安全中心（仅超级管理员可见，权限由父级控制，本组件不做权限判断）
 * --------------------------------------------------------------------------
 * 设计目标：把超级管理员账号的安全等级提到最高。
 *  - 改密必须「双邮箱验证码」同时通过（两个邮箱各收一个验证码）；
 *  - 邮件通道、版本更新通知、双邮箱绑定状态集中在此管理，便于审计与排查。
 * 无 token / 接口不可达时给出友好提示，绝不白屏。
 */

// ── 通用请求封装 ───────────────────────────────────────────────
// 与 authStore 的 postJSON 思路一致：统一解析 JSON、返回 { ok, status, data }，
// 让上层只关心业务结果，不需要在每个调用点重复 try/catch 与状态码判断。
async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* 响应体可能不是 JSON，忽略即可 */
  }
  return { ok: res.ok, status: res.status, data };
}

/** 把多行 / 逗号分隔的收件人文本解析成字符串数组 */
function parseRecipients(text: string): string[] {
  return text
    .split(/[\n,，]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ── 类型定义（与后端契约同构）───────────────────────────────────
interface SendCodeEmail {
  email: string; // 脱敏后的邮箱，如 m***@163.com
  label: '主邮箱' | '备用邮箱' | string;
  ok: boolean;
  error?: string;
}

interface SendCodeResult {
  purposeText: string;
  emails: SendCodeEmail[];
  expiresInSeconds: number;
  allFailed: boolean;
  message?: string;
}

interface RecentCode {
  email: string;
  masked: string;
  code: string;
  purpose: string;
  createdAt: string;
  expiresAt: string;
  consumed: boolean;
}

interface MailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: 'on' | 'starttls' | 'off';
  user: string;
  fromName: string;
  notifyRecipients: string[];
  hasPassword: boolean;
  passwordHint?: string;
}

interface NotifyRecord {
  id: string;
  topic: string;
  to: string | string[];
  subject: string;
  status: string;
  error?: string;
  createdAt: string;
}

const SECURE_OPTIONS: { value: MailConfig['secure']; label: string }[] = [
  { value: 'on', label: '隐式加密 (on)' },
  { value: 'starttls', label: '明文升级 (starttls)' },
  { value: 'off', label: '不加密 (off)' },
];

/** 规范化后端返回的加密方式字段，防止异常值导致 select 失控 */
function normalizeSecure(v: any): MailConfig['secure'] {
  return v === 'on' || v === 'starttls' || v === 'off' ? v : 'on';
}

const SecurityCenterTab: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.currentUser);
  // authStore 的 User 接口未声明 email，但登录态对象实际带 email 字段，
  // 用安全 cast 读取，无 token / 无 email 时退化为空串，组件不会崩溃。
  const userEmail = (currentUser as { email?: string } | null)?.email || currentUser?.username || '';

  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  });

  // ====================================================================
  // 区块一：修改密码（双邮箱验证码 · 三步流程）
  // ====================================================================
  const [pwdStep, setPwdStep] = useState<1 | 2 | 3>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [sendResult, setSendResult] = useState<SendCodeResult | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [ticket, setTicket] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [changing, setChanging] = useState(false);

  // 兜底通道（收不到邮件时查看最近生成的验证码）
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackPassword, setFallbackPassword] = useState('');
  const [fallbackList, setFallbackList] = useState<RecentCode[]>([]);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  /** 第 1 步：发送双邮箱验证码 */
  const handleSendCode = useCallback(async () => {
    if (!currentPassword) {
      setPwdError('请先输入当前密码');
      return;
    }
    setSendingCode(true);
    setPwdError(null);
    try {
      const { ok, data } = await apiFetch('/api/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({
          username: currentUser?.username || '',
          purpose: 'change_password',
          password: currentPassword,
        }),
      });
      if (!ok) {
        setPwdError(data?.error || '发送验证码失败，请稍后重试');
        return;
      }
      setSendResult(data as SendCodeResult);
      // 根据返回的邮箱数量生成对应数量的验证码输入框
      setCodes(new Array((data?.emails?.length) || 0).fill(''));
      setPwdStep(2);
    } catch {
      setPwdError('网络异常，发送验证码失败，请检查网络后重试');
    } finally {
      setSendingCode(false);
    }
  }, [currentPassword, currentUser?.username]);

  /** 第 2 步：校验双邮箱验证码 */
  const handleVerifyCode = useCallback(async () => {
    if (codes.some((c) => !c.trim())) {
      setPwdError('请填写所有邮箱收到的验证码');
      return;
    }
    setVerifying(true);
    setPwdError(null);
    try {
      const { ok, data } = await apiFetch('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          username: currentUser?.username || '',
          purpose: 'change_password',
          password: currentPassword,
          codes,
        }),
      });
      if (!ok) {
        setPwdError(data?.error || '验证码校验失败');
        return;
      }
      setTicket(data?.ticket || null);
      setPwdStep(3);
    } catch {
      setPwdError('网络异常，验证码校验失败，请检查网络后重试');
    } finally {
      setVerifying(false);
    }
  }, [codes, currentPassword, currentUser?.username]);

  /** 第 3 步：确认修改密码 */
  const handleChangePassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      setPwdError('请填写新密码与确认密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('两次输入的密码不一致');
      return;
    }
    if (!token) {
      setPwdError('登录状态已失效，请重新登录后再修改密码');
      return;
    }
    setChanging(true);
    setPwdError(null);
    try {
      const { ok, data } = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticket, newPassword }),
      });
      if (!ok) {
        setPwdError(data?.error || '密码修改失败');
        return;
      }
      // 成功后清空整个流程
      setPwdStep(1);
      setCurrentPassword('');
      setSendResult(null);
      setCodes([]);
      setTicket(null);
      setNewPassword('');
      setConfirmPassword('');
      setSnack({ open: true, msg: '密码修改成功', severity: 'success' });
    } catch {
      setPwdError('网络异常，密码修改失败，请检查网络后重试');
    } finally {
      setChanging(false);
    }
  }, [newPassword, confirmPassword, token, ticket]);

  /** 重置修改密码流程 */
  const resetPwdFlow = useCallback(() => {
    setPwdStep(1);
    setCurrentPassword('');
    setSendResult(null);
    setCodes([]);
    setTicket(null);
    setNewPassword('');
    setConfirmPassword('');
    setPwdError(null);
  }, []);

  /** 兜底通道：用当前密码查看最近生成的验证码 */
  const handleFallbackQuery = useCallback(async () => {
    if (!fallbackPassword) {
      setFallbackError('请输入当前登录密码以查看兜底验证码');
      return;
    }
    if (!token) {
      setFallbackError('登录状态已失效，请重新登录后再查看');
      return;
    }
    setFallbackLoading(true);
    setFallbackError(null);
    setFallbackList([]);
    try {
      const { ok, data } = await apiFetch('/api/security/codes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: fallbackPassword }),
      });
      if (!ok) {
        setFallbackError(data?.error || '查询失败');
        return;
      }
      setFallbackList(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setFallbackError('网络异常，查询失败，请检查网络后重试');
    } finally {
      setFallbackLoading(false);
    }
  }, [fallbackPassword, token]);

  // ====================================================================
  // 区块二 & 四：邮件服务配置 / 安全状态（共用 GET /api/system/mail-config）
  // ====================================================================
  const [mailConfig, setMailConfig] = useState<MailConfig | null>(null);
  const [mailLoading, setMailLoading] = useState(false);

  // 邮件表单草稿
  const [mailEnabled, setMailEnabled] = useState(true);
  const [mailHost, setMailHost] = useState('smtp.163.com');
  const [mailPort, setMailPort] = useState(465);
  const [mailSecure, setMailSecure] = useState<MailConfig['secure']>('on');
  const [mailUser, setMailUser] = useState('');
  const [mailPassword, setMailPassword] = useState(''); // 永远显示为空
  const [mailFromName, setMailFromName] = useState('');
  const [mailRecipients, setMailRecipients] = useState(''); // 多行文本框
  const [mailError, setMailError] = useState<string | null>(null);
  const [savingMail, setSavingMail] = useState(false);
  const [testingMail, setTestingMail] = useState(false);

  /** 进入页面时读取邮件配置并回填（同时供区块四使用） */
  const loadMailConfig = useCallback(async () => {
    if (!token) {
      setMailError('未登录或登录状态已失效，邮件配置需要登录后读取');
      return;
    }
    setMailLoading(true);
    setMailError(null);
    try {
      const { ok, status, data } = await apiFetch('/api/system/mail-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!ok) {
        setMailError(status === 401 ? '未登录或登录状态已失效' : (data?.error || `加载邮件配置失败（HTTP ${status}）`));
        return;
      }
      const cfg = (data || {}) as MailConfig;
      setMailConfig(cfg);
      setMailEnabled(!!cfg.enabled);
      setMailHost(cfg.host || 'smtp.163.com');
      setMailPort(typeof cfg.port === 'number' ? cfg.port : 465);
      setMailSecure(normalizeSecure(cfg.secure));
      setMailUser(cfg.user || '');
      // 授权码永远显示空
      setMailPassword('');
      setMailFromName(cfg.fromName || '');
      setMailRecipients((cfg.notifyRecipients || []).join('\n'));
    } catch {
      setMailError('网络异常，加载邮件配置失败，请检查网络后重试');
    } finally {
      setMailLoading(false);
    }
  }, [token]);

  /** 保存邮件配置（PUT，仅传需要修改的字段；授权码留空则不传） */
  const handleSaveMail = useCallback(async () => {
    if (!token) {
      setMailError('未登录或登录状态已失效，无法保存');
      return;
    }
    setSavingMail(true);
    setMailError(null);
    try {
      const body: Record<string, unknown> = {
        enabled: mailEnabled,
        host: mailHost,
        port: Number(mailPort) || 465,
        secure: mailSecure,
        user: mailUser,
        fromName: mailFromName,
        notifyRecipients: parseRecipients(mailRecipients),
      };
      // 授权码留空表示不修改，不传该字段
      if (mailPassword.trim()) body.password = mailPassword;

      const { ok, data } = await apiFetch('/api/system/mail-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!ok) {
        setMailError(data?.error || '保存失败');
        return;
      }
      setSnack({ open: true, msg: '邮件配置已保存', severity: 'success' });
      await loadMailConfig(); // 重新拉取以刷新授权码提示
    } catch {
      setMailError('网络异常，保存失败，请检查网络后重试');
    } finally {
      setSavingMail(false);
    }
  }, [token, mailEnabled, mailHost, mailPort, mailSecure, mailUser, mailFromName, mailRecipients, mailPassword, loadMailConfig]);

  /** 发送测试邮件（POST 同一地址） */
  const handleTestMail = useCallback(async () => {
    if (!token) {
      setMailError('未登录或登录状态已失效，无法发送测试邮件');
      return;
    }
    setTestingMail(true);
    setMailError(null);
    try {
      const recipients = parseRecipients(mailRecipients);
      const { ok, status, data } = await apiFetch('/api/system/mail-config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: recipients.length ? recipients : undefined }),
      });
      if (!ok) {
        setMailError(data?.error || `测试邮件发送失败（HTTP ${status}）`);
        return;
      }
      setSnack({ open: true, msg: '测试邮件已发送，请到邮箱（含垃圾箱）确认', severity: 'success' });
    } catch {
      setMailError('网络异常，测试邮件发送失败，请检查网络后重试');
    } finally {
      setTestingMail(false);
    }
  }, [token, mailRecipients]);

  // ====================================================================
  // 区块三：发送版本更新通知 + 最近发送记录
  // ====================================================================
  const [notifyVersion, setNotifyVersion] = useState('');
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyHighlights, setNotifyHighlights] = useState('');
  const [notifySupplement, setNotifySupplement] = useState('');
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifyRecords, setNotifyRecords] = useState<NotifyRecord[]>([]);
  const [notifyLoading, setNotifyLoading] = useState(false);

  /** 读取最近 30 条通知发送记录 */
  const loadNotifyRecords = useCallback(async () => {
    if (!token) return;
    setNotifyLoading(true);
    try {
      const { ok, data } = await apiFetch('/api/system/notify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ok) {
        setNotifyRecords(Array.isArray(data?.data) ? data.data.slice(0, 30) : []);
      }
    } catch {
      /* 记录加载失败不影响主流程 */
    } finally {
      setNotifyLoading(false);
    }
  }, [token]);

  /** 提交版本更新通知 */
  const handleSendNotify = useCallback(async () => {
    if (!notifyVersion.trim() || !notifySubject.trim() || !notifyHighlights.trim()) {
      setNotifyError('请填写版本号、通知标题与更新要点');
      return;
    }
    if (!token) {
      setNotifyError('未登录或登录状态已失效，无法发送');
      return;
    }
    setSendingNotify(true);
    setNotifyError(null);
    try {
      const { ok, data } = await apiFetch('/api/system/notify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          version: notifyVersion.trim(),
          subject: notifySubject.trim(),
          highlights: notifyHighlights.split('\n').map((s) => s.trim()).filter(Boolean),
          supplement: notifySupplement.trim() || undefined,
        }),
      });
      if (!ok) {
        setNotifyError(data?.error || '通知发送失败');
        return;
      }
      setSnack({ open: true, msg: '版本更新通知已发送', severity: 'success' });
      setNotifyVersion('');
      setNotifySubject('');
      setNotifyHighlights('');
      setNotifySupplement('');
      await loadNotifyRecords();
    } catch {
      setNotifyError('网络异常，通知发送失败，请检查网络后重试');
    } finally {
      setSendingNotify(false);
    }
  }, [notifyVersion, notifySubject, notifyHighlights, notifySupplement, token, loadNotifyRecords]);

  // 进入页面：读取邮件配置（区块二/四）与通知记录（区块三）
  useEffect(() => {
    void loadMailConfig();
    void loadNotifyRecords();
  }, [loadMailConfig, loadNotifyRecords]);

  // 区块四：根据邮件配置与登录态推导安全状态
  const statusInfo = useMemo(() => {
    const cfg = mailConfig;
    const mailEnabledFlag = !!cfg?.enabled;
    const mainEmail = userEmail || cfg?.user || '';
    const backupCount = (cfg?.notifyRecipients || []).length;
    // 双邮箱验证绑定：主邮箱已配置 且 至少存在一个备用收件邮箱
    const dualBound = !!(mainEmail && backupCount >= 1);
    return { mailEnabledFlag, mainEmail, backupCount, dualBound };
  }, [mailConfig, userEmail]);

  return (
    <Box sx={{ p: 3 }} data-testid="security-center">
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
        安全中心
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }} data-testid="security-intro">
        本机制用于把超级管理员账号的安全等级提到最高：修改密码时需要主邮箱与备用邮箱两个验证码同时通过验证，
        任何单点泄露都无法完成改密。请妥善保管双邮箱，并定期通过下方通道验证邮件服务可用性。
      </Typography>

      {/* ==================== 区块一：修改密码 ==================== */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }} data-testid="security-pwd-card">
        <CardHeader
          title="修改密码（双邮箱验证码）"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
          action={
            <Chip size="small" label={`第 ${pwdStep} 步`} color="primary" variant="outlined" data-testid="security-pwd-step" />
          }
        />
        <CardContent>
          {pwdError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} data-testid="security-pwd-error">{pwdError}</Alert>
          )}

          {/* 第 1 步：输入当前密码并发送验证码 */}
          {pwdStep === 1 && (
            <Stack spacing={2} data-testid="security-pwd-step1">
              <TextField
                type="password"
                label="当前密码"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                data-testid="security-current-password"
              />
              <Box>
                <Button
                  variant="contained"
                  startIcon={sendingCode ? <CircularProgress size={16} /> : null}
                  disabled={sendingCode}
                  onClick={() => void handleSendCode()}
                  data-testid="security-send-code-btn"
                >
                  发送验证码
                </Button>
              </Box>
            </Stack>
          )}

          {/* 第 2 步：填写每个邮箱收到的验证码 */}
          {pwdStep === 2 && sendResult && (
            <Stack spacing={2} data-testid="security-pwd-step2">
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {sendResult.purposeText || '验证码已发送至以下邮箱，请分别填入：'}
                {sendResult.expiresInSeconds ? `（${Math.round(sendResult.expiresInSeconds / 60)} 分钟内有效）` : ''}
              </Alert>
              {sendResult.emails.map((em, i) => (
                <Box key={i} data-testid={`security-email-row-${i}`}>
                  <Typography variant="caption" sx={{ color: em.ok ? '#475569' : '#DC2626' }}>
                    {em.label}：{em.email} {em.ok ? '（已发送）' : `（发送失败：${em.error || '未知原因'}）`}
                  </Typography>
                  <TextField
                    value={codes[i] || ''}
                    onChange={(e) => {
                      const next = [...codes];
                      next[i] = e.target.value;
                      setCodes(next);
                    }}
                    fullWidth
                    placeholder="请输入该邮箱收到的 6 位验证码"
                    disabled={!em.ok}
                    inputProps={{ inputMode: 'numeric' }}
                    data-testid={`security-code-input-${i}`}
                  />
                </Box>
              ))}
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={verifying ? <CircularProgress size={16} /> : null}
                  disabled={verifying || sendingCode}
                  onClick={() => void handleVerifyCode()}
                  data-testid="security-verify-code-btn"
                >
                  验证
                </Button>
                <Button variant="text" onClick={resetPwdFlow} data-testid="security-change-pwd-btn">
                  重新填写
                </Button>
              </Stack>
            </Stack>
          )}

          {/* 第 3 步：设置新密码 */}
          {pwdStep === 3 && (
            <Stack spacing={2} data-testid="security-pwd-step3">
              <Alert severity="success" sx={{ borderRadius: 2 }}>双邮箱验证码校验通过，请设置新密码。</Alert>
              <TextField
                type="password"
                label="新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                data-testid="security-new-password"
              />
              <TextField
                type="password"
                label="确认新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                data-testid="security-confirm-password"
              />
              <Box>
                <Button
                  variant="contained"
                  startIcon={changing ? <CircularProgress size={16} /> : null}
                  disabled={changing}
                  onClick={() => void handleChangePassword()}
                  data-testid="security-confirm-change-btn"
                >
                  确认修改
                </Button>
              </Box>
            </Stack>
          )}

          {/* 兜底通道：收不到邮件时查看最近生成的验证码 */}
          <Divider sx={{ my: 2 }} />
          <Accordion
            disableGutters
            elevation={0}
            sx={{ bgcolor: 'transparent' }}
            expanded={fallbackOpen}
            onChange={(_, e) => setFallbackOpen(e)}
            data-testid="security-fallback-accordion"
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} data-testid="security-fallback-toggle">
              <Typography variant="body2" sx={{ fontWeight: 500 }}>收不到邮件？用兜底通道查看</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {fallbackError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} data-testid="security-fallback-error">{fallbackError}</Alert>
              )}
              <Stack spacing={2}>
                <TextField
                  type="password"
                  label="当前登录密码"
                  value={fallbackPassword}
                  onChange={(e) => setFallbackPassword(e.target.value)}
                  fullWidth
                  data-testid="security-fallback-password"
                />
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={fallbackLoading ? <CircularProgress size={16} /> : null}
                    disabled={fallbackLoading}
                    onClick={() => void handleFallbackQuery()}
                    data-testid="security-fallback-confirm-btn"
                  >
                    查看最近验证码
                  </Button>
                </Box>
                {fallbackList.length > 0 && (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }} data-testid="security-fallback-table">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                          <TableCell sx={{ fontWeight: 600 }}>邮箱</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>验证码</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>用途</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>生成时间</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fallbackList.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell>{c.email || c.masked}</TableCell>
                            <TableCell>{c.code}</TableCell>
                            <TableCell>{c.purpose}</TableCell>
                            <TableCell>{c.createdAt}</TableCell>
                            <TableCell>
                              <Chip size="small" label={c.consumed ? '已用' : '未用'} color={c.consumed ? 'default' : 'success'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                {!fallbackLoading && fallbackList.length === 0 && (
                  <Typography variant="caption" color="text.secondary">暂无记录，请先点击「查看最近验证码」。</Typography>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* ==================== 区块二：邮件服务配置 ==================== */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }} data-testid="security-mail-card">
        <CardHeader
          title="邮件服务配置"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
          action={
            <FormControlLabel
              control={
                <Switch
                  checked={mailEnabled}
                  onChange={(e) => setMailEnabled(e.target.checked)}
                  data-testid="security-mail-enabled"
                />
              }
              label="启用邮件通道"
            />
          }
        />
        <CardContent>
          {mailLoading && <Alert severity="info" sx={{ mb: 2 }}>正在加载邮件配置…</Alert>}
          {mailError && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} data-testid="security-mail-error">{mailError}</Alert>
          )}
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="SMTP 服务器地址"
                value={mailHost}
                onChange={(e) => setMailHost(e.target.value)}
                fullWidth
                data-testid="security-mail-host"
              />
              <TextField
                label="端口"
                type="number"
                value={mailPort}
                onChange={(e) => setMailPort(Number(e.target.value))}
                sx={{ width: 140 }}
                data-testid="security-mail-port"
              />
              <TextField
                select
                label="加密方式"
                value={mailSecure}
                onChange={(e) => setMailSecure(e.target.value as MailConfig['secure'])}
                sx={{ width: 220 }}
                data-testid="security-mail-secure"
              >
                {SECURE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="发信账号"
                type="email"
                value={mailUser}
                onChange={(e) => setMailUser(e.target.value)}
                fullWidth
                data-testid="security-mail-user"
              />
              <TextField
                label="授权码"
                type="password"
                value={mailPassword}
                onChange={(e) => setMailPassword(e.target.value)}
                placeholder="留空表示不修改"
                fullWidth
                helperText={
                  mailConfig?.hasPassword
                    ? `已配置${mailConfig.passwordHint ? `（${mailConfig.passwordHint}）` : ''}`
                    : '未配置'
                }
                data-testid="security-mail-password"
              />
            </Stack>
            <TextField
              label="发件人名称"
              value={mailFromName}
              onChange={(e) => setMailFromName(e.target.value)}
              fullWidth
              data-testid="security-mail-fromName"
            />
            <TextField
              label="通知收件邮箱"
              value={mailRecipients}
              onChange={(e) => setMailRecipients(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="可填多个，用逗号或换行分隔"
              helperText="多个收件人用逗号或换行分隔"
              data-testid="security-mail-recipients"
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={savingMail ? <CircularProgress size={16} /> : null}
                disabled={savingMail || testingMail}
                onClick={() => void handleSaveMail()}
                data-testid="security-mail-save-btn"
              >
                保存配置
              </Button>
              <Button
                variant="outlined"
                startIcon={testingMail ? <CircularProgress size={16} /> : null}
                disabled={savingMail || testingMail}
                onClick={() => void handleTestMail()}
                data-testid="security-mail-test-btn"
              >
                发送测试邮件
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ==================== 区块三：发送版本更新通知 ==================== */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }} data-testid="security-notify-card">
        <CardHeader title="发送版本更新通知" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
        <CardContent>
          {notifyError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} data-testid="security-notify-error">{notifyError}</Alert>
          )}
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="版本号（如 V2.96.0）"
                value={notifyVersion}
                onChange={(e) => setNotifyVersion(e.target.value)}
                sx={{ width: 220 }}
                data-testid="security-notify-version"
              />
              <TextField
                label="通知标题"
                value={notifySubject}
                onChange={(e) => setNotifySubject(e.target.value)}
                fullWidth
                data-testid="security-notify-subject"
              />
            </Stack>
            <TextField
              label="更新要点"
              value={notifyHighlights}
              onChange={(e) => setNotifyHighlights(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="每行一条，将按行拆分成列表"
              data-testid="security-notify-highlights"
            />
            <TextField
              label="补充说明（选填）"
              value={notifySupplement}
              onChange={(e) => setNotifySupplement(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              data-testid="security-notify-supplement"
            />
            <Box>
              <Button
                variant="contained"
                startIcon={sendingNotify ? <CircularProgress size={16} /> : null}
                disabled={sendingNotify}
                onClick={() => void handleSendNotify()}
                data-testid="security-notify-submit-btn"
              >
                发送通知
              </Button>
            </Box>
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>最近 30 条发送记录</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }} data-testid="security-notify-table">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600 }}>标题</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>接收人</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifyRecords.map((r) => {
                  const failed = r.status === 'failed';
                  const toText = Array.isArray(r.to) ? r.to.join('、') : (r.to || '—');
                  return (
                    <TableRow
                      key={r.id}
                      sx={failed ? { bgcolor: '#FEF2F2' } : undefined}
                      data-testid={`security-notify-row-${r.id}`}
                    >
                      <TableCell sx={failed ? { color: '#DC2626' } : undefined}>{r.subject}</TableCell>
                      <TableCell sx={failed ? { color: '#DC2626' } : undefined}>{toText}</TableCell>
                      <TableCell sx={failed ? { color: '#DC2626' } : undefined}>
                        {failed ? `失败：${r.error || '未知错误'}` : r.status}
                      </TableCell>
                      <TableCell sx={failed ? { color: '#DC2626' } : undefined}>{r.createdAt}</TableCell>
                    </TableRow>
                  );
                })}
                {notifyRecords.length === 0 && !notifyLoading && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">暂无发送记录</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {notifyLoading && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">正在加载…</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ==================== 区块四：安全状态提示 ==================== */}
      <Card variant="outlined" sx={{ borderRadius: 2 }} data-testid="security-status-card">
        <CardHeader title="安全状态" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
        <CardContent>
          <Alert
            severity={statusInfo.dualBound && statusInfo.mailEnabledFlag ? 'success' : 'warning'}
            sx={{ borderRadius: 2 }}
            data-testid="security-status-alert"
          >
            <Box component="div">
              <div>双邮箱验证：{statusInfo.dualBound ? '已绑定' : '未绑定'}（主邮箱 {statusInfo.mainEmail || '未配置'}{statusInfo.backupCount > 0 ? `，备用收件邮箱 ${statusInfo.backupCount} 个` : '，暂无备用收件邮箱'}）</div>
              <div>邮件通道：{statusInfo.mailEnabledFlag ? '已启用' : '未启用'}</div>
            </Box>
          </Alert>
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.msg}
        data-testid="security-snackbar"
      />
    </Box>
  );
};

export default SecurityCenterTab;
