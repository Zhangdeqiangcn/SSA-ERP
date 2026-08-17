/**
 * 供应商门户登录页
 * 路由：/vendor-portal/login
 * 独立页面，不在 MainLayout 内，供应商单独访问
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, Button, Typography, Stack, Divider,
  Alert, InputAdornment, IconButton, Chip, CircularProgress,
} from '@mui/material';
import {
  Business, Lock, Visibility, VisibilityOff, Login,
  Language, Support, Phone,
} from '@mui/icons-material';

const DEMO_ACCOUNTS = [
  { name: '钢铁联合集团', code: 'V001', password: 'vendor123', role: '正式供应商' },
  { name: '华东铝业有限公司', code: 'V002', password: 'vendor123', role: '正式供应商' },
  { name: '新申请演示账号', code: 'V-NEW', password: 'demo2026', role: '申请中' },
];

const VendorLogin: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!code || !password) {
      setError('请输入供应商代码和密码');
      return;
    }
    setLoading(true);
    setError('');
    // 模拟登录验证
    setTimeout(() => {
      const account = DEMO_ACCOUNTS.find(a => a.code === code && a.password === password);
      if (account) {
        // 存储供应商信息到 sessionStorage
        sessionStorage.setItem('vendorPortalUser', JSON.stringify(account));
        navigate('/vendor-portal');
      } else {
        setError('供应商代码或密码错误，请重试');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#0F172A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景装饰 */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.1) 0%, transparent 50%)',
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, px: 2 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Business sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>SSA ERP</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', letterSpacing: '0.05em' }}>供应商协同门户</Typography>
            </Box>
          </Stack>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
            请使用企业供应商代码登录
          </Typography>
        </Box>

        {/* 登录卡 */}
        <Paper sx={{
          p: 4, borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          bgcolor: 'rgba(30,41,59,0.9)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, '& .MuiAlert-message': { fontSize: '0.875rem' } }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="供应商代码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business sx={{ color: '#64748B', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#E2E8F0',
                  '& fieldset': { borderColor: 'rgba(100,116,139,0.5)' },
                  '&:hover fieldset': { borderColor: '#3B82F6' },
                },
                '& .MuiInputLabel-root': { color: '#94A3B8' },
              }}
            />
            <TextField
              fullWidth
              type={showPwd ? 'text' : 'password'}
              label="登录密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#64748B', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small"
                      sx={{ color: '#64748B' }}>
                      {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#E2E8F0',
                  '& fieldset': { borderColor: 'rgba(100,116,139,0.5)' },
                  '&:hover fieldset': { borderColor: '#3B82F6' },
                },
                '& .MuiInputLabel-root': { color: '#94A3B8' },
              }}
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              onClick={handleLogin}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Login />}
              sx={{
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                borderRadius: 2, py: 1.5, fontSize: '1rem', fontWeight: 700,
                '&:hover': { background: 'linear-gradient(135deg, #2563EB, #4F46E5)' },
              }}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </Stack>

          <Divider sx={{ my: 2.5, borderColor: 'rgba(100,116,139,0.3)' }}>
            <Typography variant="caption" sx={{ color: '#475569' }}>测试账号</Typography>
          </Divider>

          {/* 演示账号 */}
          <Stack spacing={1}>
            {DEMO_ACCOUNTS.map((a) => (
              <Box
                key={a.code}
                onClick={() => { setCode(a.code); setPassword(a.password); }}
                sx={{
                  p: 1.5, borderRadius: 2, cursor: 'pointer',
                  border: '1px solid rgba(100,116,139,0.3)',
                  bgcolor: code === a.code ? 'rgba(59,130,246,0.1)' : 'rgba(15,23,42,0.5)',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: '#3B82F6', bgcolor: 'rgba(59,130,246,0.08)' },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#CBD5E1' }}>{a.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                      {a.code} / {a.password}
                    </Typography>
                  </Box>
                  <Chip label={a.role} size="small"
                    sx={{ bgcolor: a.role === '正式供应商' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                      color: a.role === '正式供应商' ? '#10B981' : '#F59E0B', fontSize: '0.7rem' }} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* 底部 */}
        <Stack direction="row" spacing={2.5} justifyContent="center" sx={{ mt: 3 }}>
          <Button size="small" startIcon={<Language />} sx={{ color: '#64748B', fontSize: '0.75rem' }}
            onClick={() => navigate('/vendor-portal/register')}>
            注册成为供应商
          </Button>
          <Button size="small" startIcon={<Support />} sx={{ color: '#64748B', fontSize: '0.75rem' }}>
            联系采购支持
          </Button>
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#334155', mt: 2 }}>
          SSA ERP v2.1 · 钢材供应链管理平台 · © 2026
        </Typography>
      </Box>
    </Box>
  );
};

export default VendorLogin;
