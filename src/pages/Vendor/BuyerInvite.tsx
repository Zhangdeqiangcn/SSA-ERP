import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, TextField, MenuItem, Alert, Stack,
  Snackbar, IconButton, Tooltip, Link as MuiLink,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { PageWrapper } from '@/components/layout';
import { useInviteStore, buildInviteLink } from '@/stores/inviteStore';
import { useAuthStore } from '@/stores/authStore';
import type { VendorInvitation } from '@/services/inviteApi';

/**
 * 采购员定向邀请供应商注册（V3.100.0）
 * 路由：/vendor/invite
 *
 * 用途：采购员生成带邀请码的专属注册链接，发给指定供应商。
 *   供应商点开链接进入门户注册页，注册申请自动归属到该采购员，并由该采购员（弱定向）审核。
 * 数据：D1 表 vendor_invitations（迁移 0115），经通用实体路由 vendorInvitation 读写，
 *   走 useInviteStore（RLS 'own' 保证采购员只管自己发出的邀请；admin/super 特权可见全部）。
 */
const SALES_ORG_OPTIONS = ['采购部', '制造采购部', '设备采购部'];
const EXPIRY_OPTIONS: { label: string; value: number | null }[] = [
  { label: '7 天', value: 7 },
  { label: '15 天', value: 15 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 },
  { label: '长期有效', value: null },
];

const statusMeta: Record<string, { label: string; color: 'success' | 'default' | 'error' }> = {
  active: { label: '生效中', color: 'success' },
  used: { label: '已使用', color: 'default' },
  revoked: { label: '已吊销', color: 'error' },
};

function fmtDateTime(s?: string | null): string {
  if (!s) return '—';
  return s.replace('T', ' ').slice(0, 16);
}

export default function BuyerInvite() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { invitations, load, create, revoke } = useInviteStore();
  const [loading, setLoading] = useState(false);
  const [salesOrg, setSalesOrg] = useState(SALES_ORG_OPTIONS[0]);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(30);
  const [createdLink, setCreatedLink] = useState<string>('');
  const [createdInfo, setCreatedInfo] = useState<VendorInvitation | null>(null);
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' | 'info' } | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await create({ salesOrg, expiresInDays });
    setGenerating(false);
    if (!res.ok || !res.item) {
      setToast({ msg: res.error || '生成邀请链接失败', sev: 'error' });
      return;
    }
    setCreatedInfo(res.item);
    setCreatedLink(buildInviteLink(res.item.code));
  };

  const handleCopy = async (link: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setToast({ msg: '邀请链接已复制到剪贴板', sev: 'success' });
    } catch {
      setToast({ msg: '复制失败，请手动选择复制', sev: 'error' });
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('确定吊销该邀请链接？吊销后供应商将无法再用此链接注册（已提交的申请不受影响）。')) return;
    await revoke(id);
    setToast({ msg: '邀请链接已吊销', sev: 'info' });
  };

  return (
    <PageWrapper
      title="采购员邀请供应商"
      actions={
        <Button variant="outlined" startIcon={<OpenInNewIcon />}
          component={MuiLink} href="/vendor-portal/register" target="_blank" rel="noopener"
          sx={{ textTransform: 'none' }}>
          预览供应商注册页
        </Button>
      }
    >
      <Alert severity="info" sx={{ mb: 3, fontSize: '0.8125rem' }}>
        采购员可生成带邀请码的专属注册链接定向邀请供应商。供应商通过该链接注册后，申请会自动归属到您名下，
        并由您（或管理员）审核。链接可设有效期，过期或吊销后失效。
      </Alert>

      {/* ── 生成区 ── */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddAlt1Icon color="primary" /> 生成邀请链接
        </Typography>
        <GridWrap>
          <Field label="采购组织（邀请归属条线）">
            <TextField select fullWidth size="small" value={salesOrg} onChange={(e) => setSalesOrg(e.target.value)}>
              {SALES_ORG_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          </Field>
          <Field label="有效期">
            <TextField select fullWidth size="small" value={expiresInDays === null ? 'null' : String(expiresInDays)}
              onChange={(e) => setExpiresInDays(e.target.value === 'null' ? null : Number(e.target.value))}>
              {EXPIRY_OPTIONS.map((o) => <MenuItem key={o.label} value={o.value === null ? 'null' : String(o.value)}>{o.label}</MenuItem>)}
            </TextField>
          </Field>
          <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleGenerate} disabled={generating}>
              {generating ? '生成中…' : '生成邀请链接'}
            </Button>
          </Box>
        </GridWrap>

        {createdLink && (
          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.4)' }}>
            <Typography variant="caption" color="text.secondary">新生成的邀请链接（请尽快复制发送给供应商）：</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
              <TextField fullWidth size="small" value={createdLink} InputProps={{ readOnly: true, style: { fontFamily: 'monospace' } }} />
              <Button variant="contained" size="small" startIcon={<ContentCopyIcon />} onClick={() => handleCopy(createdLink)}>复制</Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              采购组织：{createdInfo?.salesOrg || '—'} · 邀请码：<Box component="span" sx={{ fontFamily: 'monospace' }}>{createdInfo?.code}</Box>
            </Typography>
          </Box>
        )}
      </Paper>

      {/* ── 我的邀请列表 ── */}
      <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(226,232,240,.8)' }}>
          <Typography variant="subtitle1" fontWeight={600}>我的邀请记录</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>邀请码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>采购组织</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>有效期至</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>使用时间</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>创建时间</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: '#94A3B8', py: 3 }}>
                    暂无邀请记录，使用上方表单生成第一条邀请链接
                  </TableCell>
                </TableRow>
              )}
              {invitations.map((inv) => {
                const meta = statusMeta[inv.status || 'active'] || statusMeta.active;
                const canRevoke = inv.status === 'active';
                return (
                  <TableRow key={inv.id} hover data-testid="invite-row">
                    <TableCell><Typography variant="body2" fontFamily="monospace">{inv.code}</Typography></TableCell>
                    <TableCell>{inv.salesOrg || '—'}</TableCell>
                    <TableCell><Chip label={meta.label} size="small" color={meta.color} variant="outlined" sx={{ fontSize: '0.75rem' }} /></TableCell>
                    <TableCell>{inv.expiresAt ? fmtDateTime(inv.expiresAt) : '长期有效'}</TableCell>
                    <TableCell>{fmtDateTime(inv.usedAt)}</TableCell>
                    <TableCell>{fmtDateTime(inv.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="复制链接">
                          <IconButton size="small" onClick={() => handleCopy(buildInviteLink(inv.code))}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={canRevoke ? '吊销链接' : '已失效，不可吊销'}>
                          <span>
                            <IconButton size="small" color="error" disabled={!canRevoke} onClick={() => handleRevoke(inv.id)}>
                              <LinkOffIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.sev || 'info'} onClose={() => setToast(null)} variant="filled">
          {toast?.msg}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
}

// 简单栅格包装（避免额外引入 Grid 的命名冲突）
function GridWrap({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
      {children}
    </Box>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 220, flex: '1 1 220px' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      {children}
    </Box>
  );
}
