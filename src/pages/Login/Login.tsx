import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  AccountCircle, Lock, Business, Person, Badge, Visibility, VisibilityOff,
  Email, Phone, HelpOutline, Apartment,
} from '@mui/icons-material';
import { useAuthStore, type ActivationInfo } from '@/stores/authStore';
import ActivationPanel from './ActivationPanel';

// 部门下拉选项（与系统内组织架构常用部门保持一致）
const DEPARTMENT_OPTIONS = [
  '信息技术部', '采购部', '仓储部', '生产部', '质量部',
  '财务部', '研发部', '工艺部', '销售部', '行政部', '其他',
];

/** 密码强度简易评估：仅用于提示，不引入额外依赖 */
function pwdStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '#E2E8F0' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: '弱', color: '#EF4444' };
  if (score <= 3) return { level: 2, label: '中', color: '#F59E0B' };
  return { level: 3, label: '强', color: '#10B981' };
}

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // V3.1.0（评测 H-03）：账号停用 / 会话失效被踢回登录页时，明确告知原因，
  // 避免用户以为「系统把我登出了」而反复重试。提示只显示一次。
  const [expiredNotice, setExpiredNotice] = useState<string | null>(() => {
    try {
      const v = sessionStorage.getItem('ssa-erp-session-expired');
      if (v) sessionStorage.removeItem('ssa-erp-session-expired');
      return v ? '登录状态已失效（账号可能已被停用），本机缓存的临时数据已清空，请重新登录。' : null;
    } catch {
      return null;
    }
  });

  // 登录 Tab 独立字段，避免与注册表单互相污染
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 注册表单字段
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [agreed, setAgreed] = useState(false);

  const strength = pwdStrength(password);

  // 已登录（含刷新/重载后从本地会话恢复）则直接进入主系统，避免停留在登录页。
  // 必须放在所有 hook 之后，遵守 Hooks 规则（提前 return 不能跳过后面的 useState）。
  if (isAuthenticated) return <Navigate to="/" replace />;

  function resetRegisterForm() {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setCompanyCode('');
    setOrgName('');
    setAgreed(false);
    setShowPwd(false);
    setShowConfirmPwd(false);
  }

  /** 注册前逐项校验，返回第一条具体错误信息 */
  function validateRegister(): string | null {
    if (username.trim().length < 3) return '用户名至少 3 个字符';
    if (!password) return '请输入密码';
    if (password.length < 6) return '密码至少 6 位';
    if (!confirmPassword) return '请再次输入密码';
    if (password !== confirmPassword) return '两次输入的密码不一致';
    if (!name.trim()) return '请填写姓名';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return '邮箱格式不正确';
    if (phone.trim() && !/^\d{6,20}$/.test(phone.trim())) return '手机号需为 6–20 位数字';
    if (!companyCode.trim()) return '请填写公司码';
    if (!agreed) return '请先阅读并同意《服务条款》与《隐私政策》';
    return null;
  }

  async function handleLogin() {
    setError(null);
    setSuccess(null);
    if (!loginUsername || !loginPassword) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    const r = await login(loginUsername.trim(), loginPassword);
    setLoading(false);
    if (!r.ok) setError(r.error || '登录失败');
    // 成功时 authStore 内部会触发整页重载
  }

  async function handleRegister() {
    setError(null);
    setSuccess(null);
    const invalid = validateRegister();
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    const r = await register({
      username: username.trim(),
      password,
      name: name.trim(),
      companyCode: companyCode.trim(),
      orgName: orgName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      department: department || undefined,
    });
    if (!r.ok) {
      setLoading(false);
      setError(r.error || '注册失败');
      return;
    }
    // 待审批：后端未签发 token，不能进系统；提示后切回登录 Tab 并清空表单
    if (r.pending) {
      setLoading(false);
      const org = r.orgName?.trim();
      setSuccess(
        org
          ? `注册申请已提交，等待「${org}」的管理员审批通过后即可登录`
          : (r.message || '注册申请已提交，等待管理员审批通过后即可登录')
      );
      resetRegisterForm();
      setTab(0);
      return;
    }
    // 首次注册成功：authStore 已在 applySession() 里触发整页重载。
    // 这里保持 loading，且不再 setState，避免重载前闪烁/报错。
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
      <Paper elevation={8} sx={{ width: 460, maxWidth: '100%', p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>
          SSA ERP
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
          企业资源计划系统 · 多人协同
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)} data-testid="register-success">
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)} data-testid="auth-error">
            {error}
          </Alert>
        )}
        {expiredNotice && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            onClose={() => setExpiredNotice(null)}
            data-testid="auth-expired-notice"
          >
            {expiredNotice}
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setError(null); }}
          centered
          sx={{ mb: 2 }}
          data-testid="auth-tabs"
        >
          <Tab label="登录" />
          <Tab label="注册新账号" />
        </Tabs>

        {tab === 0 ? (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="用户名"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              fullWidth
              data-testid="login-username"
              InputProps={{ startAdornment: (<InputAdornment position="start"><AccountCircle /></InputAdornment>) }}
            />
            <TextField
              label="密码"
              type={showPwd ? 'text' : 'password'}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              fullWidth
              data-testid="login-password"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
            <Button variant="contained" size="large" onClick={handleLogin} disabled={loading} data-testid="login-submit">
              {loading ? <CircularProgress size={22} color="inherit" /> : '登 录'}
            </Button>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="用户名（至少 3 个字符）"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              data-testid="reg-username"
              InputProps={{ startAdornment: (<InputAdornment position="start"><AccountCircle /></InputAdornment>) }}
            />

            <Box>
              <TextField
                label="密码（至少 6 位）"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                data-testid="reg-password"
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
              {password && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                    {[1, 2, 3].map((i) => (
                      <Box
                        key={i}
                        sx={{
                          height: 4, flex: 1, borderRadius: 2,
                          bgcolor: strength.level >= i ? strength.color : '#E2E8F0',
                          transition: 'background-color .2s',
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600, minWidth: 28 }} data-testid="reg-pwd-strength">
                    {strength.label}
                  </Typography>
                </Box>
              )}
            </Box>

            <TextField
              label="确认密码"
              type={showConfirmPwd ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              data-testid="reg-confirm-password"
              error={!!confirmPassword && password !== confirmPassword}
              helperText={confirmPassword && password !== confirmPassword ? '两次输入的密码不一致' : ''}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirmPwd((s) => !s)} edge="end" size="small">
                      {showConfirmPwd ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              data-testid="reg-name"
              InputProps={{ startAdornment: (<InputAdornment position="start"><Person /></InputAdornment>) }}
            />

            <TextField
              label="邮箱（选填）"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              data-testid="reg-email"
              InputProps={{ startAdornment: (<InputAdornment position="start"><Email /></InputAdornment>) }}
            />

            <TextField
              label="手机号（选填，6–20 位数字）"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              data-testid="reg-phone"
              InputProps={{ startAdornment: (<InputAdornment position="start"><Phone /></InputAdornment>) }}
            />

            <TextField
              select
              label="部门"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              fullWidth
              data-testid="reg-department"
              InputProps={{ startAdornment: (<InputAdornment position="start"><Apartment /></InputAdornment>) }}
            >
              {DEPARTMENT_OPTIONS.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="公司码（请与同事约定统一）"
              placeholder="例如：ssa2026（英文小写 + 数字）"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              fullWidth
              data-testid="reg-company-code"
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Business /></InputAdornment>),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setHelpOpen(true)}
                      aria-label="公司码说明"
                      data-testid="reg-company-code-help"
                    >
                      <HelpOutline fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="公司名称（选填，首次注册时创建组织）"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              fullWidth
              data-testid="reg-org-name"
              InputProps={{ startAdornment: (<InputAdornment position="start"><Badge /></InputAdornment>) }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  size="small"
                  data-testid="reg-agree-terms"
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  我已阅读并同意《服务条款》与《隐私政策》
                </Typography>
              }
            />

            <Button
              variant="contained"
              size="large"
              onClick={handleRegister}
              disabled={loading || !agreed}
              data-testid="reg-submit"
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : '注 册'}
            </Button>
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3, textAlign: 'center' }}>
          多人多设备：登录后业务数据按公司码（组织）实时共享；未登录时使用本地数据，离线可用。
          <br />
          新建公司需经系统超级管理员批准；加入已有公司需由该公司管理员审批，批准后方可登录。
        </Typography>
      </Paper>

      {/* 公司码说明对话框 */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business fontSize="small" color="primary" />
          什么是公司码？
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div" variant="body2" color="text.secondary">
            <Stack spacing={1.25}>
              <span>· <strong>首次填写</strong>某个公司码：系统会以该码创建一家新公司，你将<strong>自动成为该公司的管理员</strong>，注册后直接进入系统。</span>
              <span>· 同事填写<strong>同一个</strong>公司码：视为「申请加入同一家公司」，需要该公司的管理员<strong>审批通过</strong>后才能登录，届时你填写申请时会立即收到待审批提示。</span>
              <span>· 请与同事<strong>约定统一</strong>的公司码，建议使用「英文小写 + 数字」的组合（例如 ssa2026），避免使用空格或中文。</span>
              <span>· 公司码只用于识别企业（组织），同一个公司的人共享同一份业务数据。</span>
            </Stack>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setHelpOpen(false)} data-testid="company-code-help-ok">
            我知道了
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
