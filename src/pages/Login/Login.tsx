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
} from '@mui/material';
import { AccountCircle, Lock, Business, Person, Badge, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyCode, setCompanyCode] = useState('xg-auto');
  const [orgName, setOrgName] = useState('');
  const [department, setDepartment] = useState('');

  // 已登录（含刷新/重载后从本地会话恢复）则直接进入主系统，避免停留在登录页。
  // 必须放在所有 hook 之后，遵守 Hooks 规则（提前 return 不能跳过后面的 useState）。
  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleLogin() {
    setError(null);
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    const r = await login(username.trim(), password);
    setLoading(false);
    if (!r.ok) setError(r.error || '登录失败');
    // 成功时 authStore 内部会触发整页重载
  }

  async function handleRegister() {
    setError(null);
    if (!username || !password || !name || !companyCode) {
      setError('请填写用户名、密码、姓名与公司码');
      return;
    }
    setLoading(true);
    const r = await register({
      username: username.trim(),
      password,
      name: name.trim(),
      companyCode: companyCode.trim(),
      orgName: orgName.trim() || undefined,
      department: department.trim() || undefined,
    });
    setLoading(false);
    if (!r.ok) setError(r.error || '注册失败');
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
      <Paper elevation={8} sx={{ width: 420, maxWidth: '100%', p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>
          SSA ERP
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
          企业资源计划系统 · 多人协同
        </Typography>

        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(null); }} centered sx={{ mb: 2 }}>
          <Tab label="登录" />
          <Tab label="注册新账号" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {tab === 0 ? (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              InputProps={{ startAdornment: (<InputAdornment position="start"><AccountCircle /></InputAdornment>) }}
            />
            <TextField
              label="密码"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
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
            <Button variant="contained" size="large" onClick={handleLogin} disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : '登 录'}
            </Button>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth
              InputProps={{ startAdornment: (<InputAdornment position="start"><AccountCircle /></InputAdornment>) }} />
            <TextField label="密码（至少6位）" type={showPwd ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} fullWidth
              InputProps={{ startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>),
                endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPwd((s) => !s)} edge="end" size="small">{showPwd ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} />
            <TextField label="姓名" value={name} onChange={(e) => setName(e.target.value)} fullWidth
              InputProps={{ startAdornment: (<InputAdornment position="start"><Person /></InputAdornment>) }} />
            <TextField label="公司码（同事填相同码即共享同一份数据）" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} fullWidth
              InputProps={{ startAdornment: (<InputAdornment position="start"><Business /></InputAdornment>) }} />
            <TextField label="公司名称（选填，首次注册时创建组织）" value={orgName} onChange={(e) => setOrgName(e.target.value)} fullWidth
              InputProps={{ startAdornment: (<InputAdornment position="start"><Badge /></InputAdornment>) }} />
            <TextField label="部门（选填）" value={department} onChange={(e) => setDepartment(e.target.value)} fullWidth />
            <Button variant="contained" size="large" onClick={handleRegister} disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : '注 册 并 登 录'}
            </Button>
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3, textAlign: 'center' }}>
          多人多设备：登录后业务数据按公司码（组织）实时共享；未登录时使用本地数据，离线可用。
        </Typography>
      </Paper>
    </Box>
  );
}
