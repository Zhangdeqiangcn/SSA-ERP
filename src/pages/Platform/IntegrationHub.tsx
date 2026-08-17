import React, { useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Paper, FormGroup, FormControlLabel, Checkbox,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Send } from '@mui/icons-material';
import { useIntegrationStore, API_REGISTRY } from '@/stores';
import type { WebhookEvent, WebhookAuthType } from '@/types';
import { WEBHOOK_AUTH_LABELS, WEBHOOK_EVENT_LABELS } from '@/types';

const EVENTS: WebhookEvent[] = [
  'sales.order.created',
  'purchase.order.created',
  'quality.inspection.lot.created',
  'production.workorder.created',
  'material.changed',
  'inbound_completed',
  'outbound_completed',
  'inspection_completed',
  'invoice_generated',
  'payment_completed',
  'voucher_posted',
  'workorder_completed',
  'shipment_completed',
  'reconciliation_confirmed',
  'contract_expiring',
];
const AUTH_TYPES: WebhookAuthType[] = ['none', 'bearer', 'basic'];

const IntegrationHub: React.FC = () => {
  const { webhooks, webhookLogs, addWebhook, deleteWebhook, triggerWebhook } = useIntegrationStore();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>(['sales.order.created']);
  const [authType, setAuthType] = useState<WebhookAuthType>('none');
  const [authToken, setAuthToken] = useState('');
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [retry, setRetry] = useState(0);
  const [triggerEvent, setTriggerEvent] = useState<WebhookEvent>('sales.order.created');

  const resetForm = () => {
    setName(''); setUrl(''); setEvents(['sales.order.created']);
    setAuthType('none'); setAuthToken(''); setAuthUser(''); setAuthPass(''); setRetry(0);
  };

  const handleConfirm = () => {
    if (!name.trim() || !url.trim()) return;
    addWebhook({
      name: name.trim(), url: url.trim(), events, enabled: true,
      authType, authToken: authToken || undefined, authUser: authUser || undefined,
      authPass: authPass || undefined, retry: retry || 0,
    });
    resetForm(); setOpen(false);
  };

  const handleTrigger = () => triggerWebhook(triggerEvent, { test: true, at: new Date().toISOString() });

  return (
    <Box sx={{ p: 3 }} data-testid="integration">
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>集成中心 (OpenAPI / Webhook)</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="OpenAPI 目录" />
        <Tab label="Webhook 管理" />
        <Tab label="调用日志" />
      </Tabs>

      {tab === 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>方法</TableCell>
              <TableCell>路径</TableCell>
              <TableCell>模块</TableCell>
              <TableCell>说明</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {API_REGISTRY.map((api, i) => (
              <TableRow key={i} data-testid="ih-api-row">
                <TableCell><Chip size="small" label={api.method} color={api.method === 'GET' ? 'info' : 'success'} /></TableCell>
                <TableCell>{api.path}</TableCell>
                <TableCell>{api.module}</TableCell>
                <TableCell>{api.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {tab === 1 && (
        <Box>
          <Button data-testid="ih-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
            新建 Webhook
          </Button>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>订阅事件</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {webhooks.map((w) => (
                <TableRow key={w.id} data-testid="ih-webhook-row">
                  <TableCell>{w.name}</TableCell>
                  <TableCell>{w.url}</TableCell>
                  <TableCell>{w.events.map(e => WEBHOOK_EVENT_LABELS[e]).join('，')}</TableCell>
                  <TableCell>
                    <IconButton data-testid="ih-webhook-del" onClick={() => deleteWebhook(w.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 260 }}>
              <InputLabel>事件</InputLabel>
              <Select data-testid="ih-event" value={triggerEvent} label="事件"
                onChange={(e) => setTriggerEvent(e.target.value as WebhookEvent)}>
                {EVENTS.map((ev) => <MenuItem key={ev} value={ev}>{ev}</MenuItem>)}
              </Select>
            </FormControl>
            <Button data-testid="ih-trigger" variant="contained" startIcon={<Send />} onClick={handleTrigger}>
              模拟触发
            </Button>
          </Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>事件</TableCell>
                <TableCell>Webhook</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>详情</TableCell>
                <TableCell>时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {webhookLogs.map((l) => (
                <TableRow key={l.id} data-testid="ih-log-row">
                  <TableCell>{l.event}</TableCell>
                  <TableCell>{l.webhookName}</TableCell>
                  <TableCell>
                    <Chip size="small" label={l.status}
                      color={l.status === 'success' ? 'success' : l.status === 'failed' ? 'error' : 'warning'} />
                  </TableCell>
                  <TableCell>{l.detail}</TableCell>
                  <TableCell>{l.at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建 Webhook</DialogTitle>
        <DialogContent>
          <TextField data-testid="ih-name" fullWidth label="名称" value={name}
            onChange={(e) => setName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <TextField data-testid="ih-url" fullWidth label="回调 URL" value={url}
            onChange={(e) => setUrl(e.target.value)} sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>鉴权配置</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>鉴权方式</InputLabel>
            <Select data-testid="ih-auth-type" value={authType} label="鉴权方式"
              onChange={(e) => setAuthType(e.target.value as WebhookAuthType)}>
              {AUTH_TYPES.map((a) => <MenuItem key={a} value={a}>{WEBHOOK_AUTH_LABELS[a]}</MenuItem>)}
            </Select>
          </FormControl>
          {authType === 'bearer' && (
            <TextField data-testid="ih-auth-token" fullWidth label="Bearer Token" value={authToken}
              onChange={(e) => setAuthToken(e.target.value)} sx={{ mb: 2 }} />
          )}
          {authType === 'basic' && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField data-testid="ih-auth-user" fullWidth label="用户名" value={authUser}
                onChange={(e) => setAuthUser(e.target.value)} />
              <TextField data-testid="ih-auth-pass" fullWidth label="密码" type="password" value={authPass}
                onChange={(e) => setAuthPass(e.target.value)} />
            </Box>
          )}
          <TextField data-testid="ih-retry" fullWidth label="失败重试次数" type="number" value={retry}
            onChange={(e) => setRetry(Number(e.target.value) || 0)} sx={{ mb: 2 }}
            helperText="投递失败时自动重试的次数（0 表示不重试）" />
          <Typography variant="caption" sx={{ color: '#64748B' }}>订阅事件</Typography>
          <FormGroup>
            {EVENTS.map((ev) => (
              <FormControlLabel key={ev} control={
                <Checkbox checked={events.includes(ev)}
                  onChange={(e) => setEvents((prev) => e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev))} />
              } label={WEBHOOK_EVENT_LABELS[ev]} />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button data-testid="ih-add-confirm" variant="contained" onClick={handleConfirm}>确定</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationHub;
