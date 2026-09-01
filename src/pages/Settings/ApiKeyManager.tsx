import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Alert, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Tooltip, Snackbar,
} from '@mui/material';
import { Add, Delete, Key, ContentCopy, Warning, VpnKey } from '@mui/icons-material';

// 本地回退存储键（DEV / E2E / 后端不可用时使用）
const LS_KEY = 'ssa-erp-apikeys';

interface ApiKeyRow {
  id: string;
  label: string;
  scopes: string;            // 'read' | 'read,write' | '*'
  created_by?: string;
  revoked: boolean;
  rate_limit?: number;
  created_at?: string;
  revoked_at?: string;
  /** 仅本地回退创建时标记，提示未真正落库 */
  localOnly?: boolean;
}

/**
 * API Key 管理（开放网关）
 * ------------------------------------------------------------
 * - 主路径：调用 /api/open/keys（session 管理员鉴权）做增删查。
 * - 回退：后端不可用（DEV/E2E）时读写 localStorage，保证前端可用、可测。
 * - 安全：明文 key 仅在「创建成功」瞬间展示一次，关闭后永不重现。
 */
export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [plain, setPlain] = useState<string | null>(null);   // 明文仅显示一次
  const [dialog, setDialog] = useState(false);
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState('read');
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

  const handleCreate = async () => {
    try {
      const r = await fetch('/api/open/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || '未命名', scopes }),
      });
      if (!r.ok) throw new Error('create');
      const j = await r.json();
      setPlain(j.plainKey);   // 明文仅展示一次
      await load();
      setSnack('API Key 已创建（明文仅显示一次，请立即复制保存）');
    } catch {
      const id = 'ak_' + Math.random().toString(16).slice(2, 10);
      const row: ApiKeyRow = {
        id, label: label || '未命名', scopes, revoked: false,
        created_at: new Date().toISOString(), localOnly: true,
      };
      persistLocal([row, ...keys]);
      setPlain('sk_' + id.slice(3) + Math.random().toString(16).slice(2, 18)); // 本地模拟明文
      setSnack('后端不可用：已在本地创建 Key（仅本地，未落库）');
    }
    setDialog(false); setLabel(''); setScopes('read');
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
          <Chip label="V2.74" size="small" color="info" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          用于 <Box component="code" sx={{ fontFamily: 'monospace' }}>/api/open/*</Box> 端点鉴权（Bearer sk_xxx）。
          Key 视为组织级特权，读写均强制归属当前 org_id 并记审计。明文仅在创建时显示一次。
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
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.map((k) => (
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
                <TableCell>{k.created_at?.slice(0, 10) ?? '—'}</TableCell>
                <TableCell>
                  {!k.revoked && (
                    <Tooltip title="吊销后即刻失效，不可恢复">
                      <IconButton size="small" onClick={() => handleRevoke(k.id)} data-testid={`ak-revoke-${k.id}`}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {keys.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">暂无 API Key，点击「创建 API Key」生成</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialog} onClose={() => setDialog(false)}>
        <DialogTitle>创建 API Key</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <TextField label="标签（用途说明）" value={label}
              onChange={(e) => setLabel(e.target.value)} placeholder="如：ERP 集成-生产系统" />
            <TextField select label="权限范围" value={scopes}
              onChange={(e) => setScopes(e.target.value)}>
              <Key sx={{ mr: 1 }} />
              <option value="read">read（只读）</option>
              <option value="read,write">read,write（读写）</option>
              <option value="*">*（全部）</option>
            </TextField>
            <Typography variant="caption" color="text.secondary">
              写权限（write）可经 /api/open/* 写入物料/供应商/客户/采购单/销售单，系统强制归属当前组织并记审计日志。
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>生成</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}
        message={snack || ''} />
    </Card>
  );
}
