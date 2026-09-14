import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Alert, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Tooltip, Snackbar, MenuItem,
} from '@mui/material';
import { Add, Delete, Key, ContentCopy, Warning, VpnKey, Autorenew } from '@mui/icons-material';

// 本地回退存储键（DEV / E2E / 后端不可用时使用）
const LS_KEY = 'ssa-erp-apikeys';

/** 有效期选项（V3.2.0 · 评测 M-12 / L-02 整改） */
const EXPIRY_OPTIONS: { value: string; label: string }[] = [
  { value: '30', label: '30 天' },
  { value: '90', label: '90 天（默认）' },
  { value: '180', label: '180 天' },
  { value: '365', label: '365 天' },
  { value: 'forever', label: '永久（不推荐，请定期轮换）' },
];

interface ApiKeyRow {
  id: string;
  label: string;
  scopes: string;            // 'read' | 'read,write' | '*'
  created_by?: string;
  revoked: boolean;
  rate_limit?: number;
  created_at?: string;
  revoked_at?: string;
  expires_at?: string | null;  // 空 = 永久
  rotated_at?: string | null;  // 最近一次轮换时间
  /** 仅本地回退创建时标记，提示未真正落库 */
  localOnly?: boolean;
}

/** 到期状态的展示口径：吊销优先 > 永久 > 已过期 > 即将到期(≤30 天) > 有效 */
function expiryView(k: ApiKeyRow): { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' } {
  if (k.revoked) return { label: '已吊销', color: 'default' };
  if (!k.expires_at) return { label: '永久', color: 'info' };
  const t = new Date(k.expires_at).getTime();
  if (!Number.isFinite(t)) return { label: '永久', color: 'info' };
  const days = Math.ceil((t - Date.now()) / 86400000);
  if (days <= 0) return { label: '已过期', color: 'error' };
  if (days <= 30) return { label: `${days} 天后到期`, color: 'warning' };
  return { label: '有效', color: 'success' };
}

/**
 * API Key 管理（开放网关）
 * ------------------------------------------------------------
 * - 主路径：调用 /api/open/keys（session 管理员鉴权）做增删查 + 轮换。
 * - 回退：后端不可用（DEV/E2E）时读写 localStorage，保证前端可用、可测。
 * - 安全：明文 key 仅在「创建 / 轮换成功」瞬间展示一次，关闭后永不重现。
 * - 有效期与轮换（V3.2.0 · 评测 M-12 / L-02 整改）：创建时可选有效期，
 *   到期后网关自动拒绝；支持一键轮换，旧密钥即时失效、无需重建集成配置。
 */
export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [plain, setPlain] = useState<string | null>(null);   // 明文仅显示一次
  const [plainHint, setPlainHint] = useState<string>('');
  const [dialog, setDialog] = useState(false);
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState('read');
  const [expiry, setExpiry] = useState('90');
  const [snack, setSnack] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/open/keys');
      if (!r.ok) throw new Error('load');
      const j = await r.json();
      setKeys(j.data || []);
    } catch {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        try { setKeys(JSON.parse(raw)); } catch { /* ignore */ }
      }
      setErr('后端不可用（DEV/E2E），已显示本地缓存的 Key；创建/吊销仅本地生效，生产态请连后端');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const persistLocal = (rows: ApiKeyRow[]) => {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
    setKeys(rows);
  };

  /** 把界面上的有效期选项转成接口参数：'forever' → null（永久），其余 → 天数 */
  const expiryPayload = () => (expiry === 'forever' ? null : Number(expiry));

  const handleCreate = async () => {
    try {
      const r = await fetch('/api/open/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || '未命名', scopes, expiresInDays: expiryPayload() }),
      });
      if (!r.ok) throw new Error('create');
      const j = await r.json();
      setPlain(j.plainKey);   // 明文仅展示一次
      setPlainHint(
        j.expiresAt
          ? `有效期至 ${String(j.expiresAt).slice(0, 10)}（到期后网关自动拒绝，可提前轮换）`
          : '有效期为永久，建议尽快改为限期并定期轮换'
      );
      await load();
      setSnack('API Key 已创建（明文仅显示一次，请立即复制保存）');
    } catch {
      const id = 'ak_' + Math.random().toString(16).slice(2, 10);
      const days = expiryPayload();
      const row: ApiKeyRow = {
        id, label: label || '未命名', scopes, revoked: false,
        created_at: new Date().toISOString(),
        expires_at: days === null ? null : new Date(Date.now() + days * 86400000).toISOString(),
        localOnly: true,
      };
      persistLocal([row, ...keys]);
      setPlain('sk_' + id.slice(3) + Math.random().toString(16).slice(2, 18)); // 本地模拟明文
      setPlainHint('本地模拟：未落库，故无真实有效期校验');
      setSnack('后端不可用：已在本地创建 Key（仅本地，未落库）');
    }
    setDialog(false); setLabel(''); setScopes('read'); setExpiry('90');
  };

  const handleRevoke = async (id: string) => {
    try {
      const r = await fetch('/api/open/keys/' + id, { method: 'DELETE' });
      if (!r.ok) throw new Error('revoke');
      await load();
      setSnack('已吊销');
    } catch {
      persistLocal(keys.map((k) =>
        k.id === id ? { ...k, revoked: true, revoked_at: new Date().toISOString() } : k
      ));
      setSnack('后端不可用：已本地标记吊销');
    }
  };

  const handleRotate = async (k: ApiKeyRow) => {
    try {
      const r = await fetch('/api/open/keys/' + k.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error('rotate');
      const j = await r.json();
      setPlain(j.plainKey);
      setPlainHint(
        j.expiresAt
          ? `轮换完成，新密钥有效期至 ${String(j.expiresAt).slice(0, 10)}；旧密钥已即时失效`
          : '轮换完成，新密钥长期有效；旧密钥已即时失效'
      );
      await load();
      setSnack('已轮换：旧密钥即时失效，请把新密钥更新到调用方配置');
    } catch {
      setSnack('后端不可用：轮换仅生产态可用');
    }
  };

  const copyPlain = () => {
    if (plain && navigator.clipboard) navigator.clipboard.writeText(plain).catch(() => {});
    setSnack('已复制明文到剪贴板');
  };

  const scopeColor = (s: string) =>
    s.includes('write') || s === '*' ? 'error' : 'default';

  return (
    <Card sx={{ mt: 3 }} data-testid="api-key-manager">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <VpnKey color="primary" />
          <Typography variant="h6">开放 API 网关 · API Key 管理</Typography>
          <Chip label="V3.2" size="small" color="info" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          用于 <Box component="code" sx={{ fontFamily: 'monospace' }}>/api/open/*</Box> 端点鉴权。
          <strong>密钥只能放在请求头</strong>
          （<Box component="code" sx={{ fontFamily: 'monospace' }}>Authorization: Bearer sk_xxx</Box>），
          通过网址参数传递会被直接拒绝——网址会留在浏览器历史、访问日志和 Referer 里，
          等于把凭据四处散播。Key 视为组织级特权，读写均强制归属当前 org_id 并记审计；明文仅在创建或轮换时显示一次。
        </Typography>

        {err && <Alert severity="warning" sx={{ mb: 1 }} onClose={() => setErr(null)}>{err}</Alert>}

        {plain && (
          <Alert
            severity="error"
            icon={<Warning />}
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" startIcon={<ContentCopy />} onClick={copyPlain}>
                复制
              </Button>
            }
          >
            <strong>请立即复制保存此 API Key（关闭后不可再查看）：</strong>
            {plainHint && (
              <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                {plainHint}
              </Typography>
            )}
            <Box component="code" sx={{ display: 'block', fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-all' }}>
              {plain}
            </Box>
            <Button color="inherit" size="small" sx={{ mt: 0.5 }} onClick={() => setPlain(null)}>我已保存，关闭</Button>
          </Alert>
        )}

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Button startIcon={<Add />} variant="contained" onClick={() => setDialog(true)}
            disabled={loading} data-testid="ak-create">创建 API Key</Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>标签</TableCell>
              <TableCell>权限</TableCell>
              <TableCell>限流/分</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>有效期</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.map((k) => {
              const ev = expiryView(k);
              return (
                <TableRow key={k.id}>
                  <TableCell>
                    {k.label}
                    {k.localOnly && <Chip size="small" label="本地" color="warning" sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} />}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={k.scopes} color={scopeColor(k.scopes)} />
                  </TableCell>
                  <TableCell>{k.rate_limit ?? (k.localOnly ? '—' : 60)}</TableCell>
                  <TableCell>
                    {k.revoked
                      ? <Chip size="small" label="已吊销" color="default" />
                      : <Chip size="small" label="有效" color="success" />}
                  </TableCell>
                  <TableCell data-testid={`ak-expiry-${k.id}`}>
                    <Chip size="small" color={ev.color} label={ev.label} sx={{ mr: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {k.expires_at ? String(k.expires_at).slice(0, 10) : '—'}
                    </Typography>
                    {k.rotated_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        最近轮换 {String(k.rotated_at).slice(0, 10)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{k.created_at?.slice(0, 10) ?? '—'}</TableCell>
                  <TableCell>
                    {!k.revoked && (
                      <>
                        <Tooltip title="轮换：立即生成新密钥并使旧密钥失效，无需重建集成配置">
                          <IconButton size="small" onClick={() => handleRotate(k)} data-testid={`ak-rotate-${k.id}`}>
                            <Autorenew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="吊销后即刻失效，不可恢复">
                          <IconButton size="small" onClick={() => handleRevoke(k.id)} data-testid={`ak-revoke-${k.id}`}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {keys.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">暂无 API Key，点击「创建 API Key」生成</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialog} onClose={() => setDialog(false)}>
        <DialogTitle>创建 API Key</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <TextField label="标签（用途说明）" value={label}
              onChange={(e) => setLabel(e.target.value)} placeholder="如：ERP 集成-生产系统" />
            <TextField select label="权限范围" value={scopes}
              onChange={(e) => setScopes(e.target.value)} data-testid="ak-scopes">
              <MenuItem value="read">read（只读）</MenuItem>
              <MenuItem value="read,write">read,write（读写）</MenuItem>
              <MenuItem value="*">*（全部）</MenuItem>
            </TextField>
            <TextField select label="有效期" value={expiry}
              onChange={(e) => setExpiry(e.target.value)} data-testid="ak-expiry-select"
              helperText="到期后网关自动拒绝该密钥，无需人工记得吊销；建议不超过 1 年并定期轮换">
              {EXPIRY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <Typography variant="caption" color="text.secondary">
              写权限（write）可经 /api/open/* 写入物料/供应商/客户/采购单/销售单，系统强制归属当前组织并记审计日志。
              <Key sx={{ ml: 0.5, fontSize: 14, verticalAlign: 'text-bottom' }} />
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} data-testid="ak-create-confirm">生成</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}
        message={snack || ''} />
    </Card>
  );
}
