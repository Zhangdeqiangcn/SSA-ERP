/**
 * 供应商门户工作台首页
 * 路由：/vendor-portal
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Stack, Chip, Button, Avatar,
  Divider, Alert,
} from '@mui/material';
import {
  Assignment, LocalShipping, FactCheck, Receipt, Warning,
  CheckCircle, TrendingUp, Notifications, ArrowForward,
  Handshake, AttachMoney,
} from '@mui/icons-material';
import { formatCurrency } from '@/utils/format';

interface VendorUser { name: string; code: string; role: string; }

const VendorWorkbench: React.FC = () => {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorUser | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('vendorPortalUser');
    if (stored) setVendor(JSON.parse(stored));
    else navigate('/vendor-portal/login');
  }, [navigate]);

  if (!vendor) return null;

  const stats = [
    { label: '待确认订单', count: 3, color: '#3B82F6', bg: '#EFF6FF', icon: <Handshake />, path: '/vendor-portal/orders/confirm' },
    { label: '在途物流', count: 2, color: '#F59E0B', bg: '#FFFBEB', icon: <LocalShipping />, path: '/vendor-portal/orders/shipment' },
    { label: '质量问题单', count: 2, color: '#EF4444', bg: '#FEF2F2', icon: <Warning />, path: '/vendor-portal/quality/issues' },
    { label: '待开票金额', amount: 128500, color: '#10B981', bg: '#ECFDF5', icon: <AttachMoney />, path: '/vendor-portal/finance/invoices' },
  ];

  const todoItems = [
    { type: 'order', label: '采购订单 PO-2026-0231 待确认', urgency: 'high', path: '/vendor-portal/orders/confirm' },
    { type: 'order', label: '采购订单 PO-2026-0228 待确认', urgency: 'medium', path: '/vendor-portal/orders/confirm' },
    { type: 'quality', label: '质量问题单 VQI-2026-003 需响应（严重）', urgency: 'high', path: '/vendor-portal/quality/issues' },
    { type: 'finance', label: '对账单 VS-2026-001 已发送，请确认', urgency: 'medium', path: '/vendor-portal/finance/statements' },
    { type: 'finance', label: '开票申请 VIR-2026-002 已审批，请开票', urgency: 'low', path: '/vendor-portal/finance/invoices' },
  ];

  const urgencyMap: Record<string, { label: string; color: 'error' | 'warning' | 'info' }> = {
    high:   { label: '紧急', color: 'error' },
    medium: { label: '重要', color: 'warning' },
    low:    { label: '一般', color: 'info' },
  };

  const typeIconMap: Record<string, React.ReactNode> = {
    order:   <Handshake sx={{ color: '#3B82F6', fontSize: 18 }} />,
    quality: <Warning sx={{ color: '#EF4444', fontSize: 18 }} />,
    finance: <Receipt sx={{ color: '#10B981', fontSize: 18 }} />,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 欢迎 */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', mb: 0.5 }}>
              欢迎回来，{vendor.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                供应商代码：{vendor.code}
              </Typography>
              <Chip label={vendor.role} size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.7rem' }} />
            </Stack>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>今日</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* 统计卡 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              onClick={() => navigate(s.path)}
              sx={{ p: 2.5, borderRadius: 3, cursor: 'pointer', bgcolor: s.bg, border: `1px solid ${s.color}20`,
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${s.color}20` } }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  {s.amount !== undefined ? (
                    <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>{formatCurrency(s.amount)}</Typography>
                  ) : (
                    <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                  )}
                </Box>
                <Avatar sx={{ bgcolor: `${s.color}20`, color: s.color, width: 40, height: 40 }}>
                  {s.icon}
                </Avatar>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 待办事项 */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid #E2E8F0' }}>
              <Typography variant="subtitle1" fontWeight={700}>待处理事项</Typography>
              <Chip label={`${todoItems.length} 项`} size="small" color="error" sx={{ fontWeight: 600 }} />
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                {todoItems.map((item, idx) => (
                  <Box
                    key={idx}
                    onClick={() => navigate(item.path)}
                    sx={{
                      p: 1.5, borderRadius: 2, cursor: 'pointer',
                      border: '1px solid #E2E8F0', bgcolor: '#F8FAFC',
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: '#3B82F6', bgcolor: '#EFF6FF' },
                    }}
                  >
                    {typeIconMap[item.type]}
                    <Typography variant="body2" sx={{ flex: 1 }}>{item.label}</Typography>
                    <Chip label={urgencyMap[item.urgency].label} size="small"
                      color={urgencyMap[item.urgency].color} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                    <ArrowForward sx={{ color: '#94A3B8', fontSize: 16 }} />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* 快捷入口 */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #E2E8F0' }}>
              <Typography variant="subtitle1" fontWeight={700}>快捷入口</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Grid container spacing={1.5}>
                {[
                  { label: '订单确认', icon: <Handshake />, path: '/vendor-portal/orders/confirm', color: '#3B82F6' },
                  { label: '发货物流', icon: <LocalShipping />, path: '/vendor-portal/orders/shipment', color: '#F59E0B' },
                  { label: '质量问题', icon: <Warning />, path: '/vendor-portal/quality/issues', color: '#EF4444' },
                  { label: '8D报告', icon: <Assignment />, path: '/vendor-portal/quality/8d', color: '#6366F1' },
                  { label: '对账单', icon: <AttachMoney />, path: '/vendor-portal/finance/statements', color: '#10B981' },
                  { label: '开票申请', icon: <Receipt />, path: '/vendor-portal/finance/invoices', color: '#059669' },
                ].map(({ label, icon, path, color }) => (
                  <Grid item xs={6} key={label}>
                    <Paper
                      onClick={() => navigate(path)}
                      sx={{
                        p: 1.5, borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                        border: '1px solid #E2E8F0',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: color, bgcolor: `${color}08`, transform: 'translateY(-1px)' },
                      }}
                    >
                      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
                      <Typography variant="caption" fontWeight={600} sx={{ color: '#475569' }}>{label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>

          {/* 通知 */}
          <Paper sx={{ borderRadius: 3, mt: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #E2E8F0' }}>
              <Typography variant="subtitle2" fontWeight={700}>系统通知</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  <Typography variant="caption">质量问题单 VQI-2026-003 已升级，请尽快响应</Typography>
                </Alert>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="caption">2026年6月账期对账单已发送，请于7月10日前确认</Typography>
                </Alert>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VendorWorkbench;
