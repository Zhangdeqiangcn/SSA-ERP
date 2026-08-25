import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Card, CardContent, IconButton, Tooltip,
} from '@mui/material';
import {
  Storage, Download, Upload, DeleteOutline, Refresh, CloudDownload, Sync,
} from '@mui/icons-material';
import { listCollections, estimateStorageKB } from '@/services/serverService';

const STORAGE_PREFIX = 'ssa-erp-';

interface CollectionInfo {
  key: string;
  displayName: string;
  sizeBytes: number;
  sizeKB: number;
}

const formatTimestamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const DataManagement: React.FC = () => {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [totalKB, setTotalKB] = useState(0);
  const [totalKeys, setTotalKeys] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStorageInfo = () => {
    const keys = listCollections();
    const info: CollectionInfo[] = keys.map(k => {
      const raw = localStorage.getItem(k) || '';
      const bytes = raw.length;
      return {
        key: k,
        displayName: k.replace(STORAGE_PREFIX, ''),
        sizeBytes: bytes,
        sizeKB: Math.round((bytes / 1024) * 100) / 100,
      };
    });
    setCollections(info);
    setTotalKB(estimateStorageKB());
    setTotalKeys(keys.length);
  };

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const handleExport = () => {
    try {
      const data: Record<string, string> = {};
      listCollections().forEach(k => {
        data[k] = localStorage.getItem(k) || '';
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ssa-erp-backup-${formatTimestamp()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAlert({ type: 'success', msg: `已导出 ${listCollections().length} 个数据项` });
    } catch (e) {
      setAlert({ type: 'error', msg: `导出失败：${e}` });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          let count = 0;
          Object.entries(data).forEach(([key, val]) => {
            if (key.startsWith(STORAGE_PREFIX)) {
              localStorage.setItem(key, val as string);
              count++;
            }
          });
          loadStorageInfo();
          setAlert({ type: 'success', msg: `已导入 ${count} 个数据项，页面数据已更新` });
        } catch {
          setAlert({ type: 'error', msg: 'JSON 解析失败，请检查文件格式' });
        }
      };
      reader.readAsText(file);
    } catch (e) {
      setAlert({ type: 'error', msg: `导入失败：${e}` });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloudBackup = async () => {
    try {
      const token = localStorage.getItem('ssa-erp-auth-token');
      if (!token) {
        setAlert({ type: 'info', msg: '当前未登录云端，请先登录后再备份' });
        return;
      }
      const res = await fetch('/api/system/backup', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAlert({ type: 'error', msg: `云端备份失败：${err.error || res.status}` });
        return;
      }
      const payload = await res.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ssa-erp-cloud-backup-${formatTimestamp()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAlert({
        type: 'success',
        msg: `已下载云端备份（${payload.counts?.tables ?? 0} 张表，导出时间 ${payload.exportedAt}）`,
      });
    } catch (e) {
      setAlert({ type: 'error', msg: `云端备份失败：${e}` });
    }
  };

  const handleSyncMaterials = async () => {
    try {
      const token = localStorage.getItem('ssa-erp-auth-token');
      if (!token) {
        setAlert({ type: 'info', msg: '当前未登录云端，请先登录后再同步' });
        return;
      }
      const res = await fetch('/api/system/migrate-materials', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAlert({ type: 'error', msg: `同步失败：${err.error || res.status}` });
        return;
      }
      const data = await res.json();
      setAlert({
        type: 'success',
        msg: `物料云端同步完成：${data.message}`,
      });
    } catch (e) {
      setAlert({ type: 'error', msg: `同步失败：${e}` });
    }
  };

  const handleReset = () => {
    try {
      listCollections().forEach(k => localStorage.removeItem(k));
      setResetDialog(false);
      window.location.reload();
    } catch (e) {
      setAlert({ type: 'error', msg: `重置失败：${e}` });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {alert && (
        <Alert
          severity={alert.type}
          onClose={() => setAlert(null)}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {alert.msg}
        </Alert>
      )}

      {/* 操作按钮区 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleExport}
          data-testid="dm-export"
        >
          一键导出
        </Button>
        <Button
          variant="outlined"
          startIcon={<Upload />}
          onClick={() => fileInputRef.current?.click()}
          data-testid="dm-import"
        >
          一键导入
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutline />}
          onClick={() => setResetDialog(true)}
          data-testid="dm-reset"
        >
          重置所有数据
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<CloudDownload />}
          onClick={handleCloudBackup}
          data-testid="dm-cloud-backup"
        >
          云端备份下载
        </Button>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Sync />}
          onClick={handleSyncMaterials}
          data-testid="dm-sync-materials"
        >
          同步物料至云端表
        </Button>
        <Tooltip title="刷新信息">
          <IconButton onClick={loadStorageInfo}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 数据总览卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#E2E8F0' }}>
            <CardContent sx={{ '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary">数据表数量</Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, color: '#1E293B' }}>
                {totalKeys}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#E2E8F0' }}>
            <CardContent sx={{ '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary">存储用量</Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, color: '#1E293B' }}>
                {totalKB} <Typography component="span" variant="body2" color="text.secondary">KB</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 数据表详情 */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B', mb: 2 }}>
        数据表详情
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: '#E2E8F0' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600 }}>Storage Key</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>显示名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">大小 (KB)</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">字符数</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {collections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    暂无数据
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              collections.map(c => (
                <TableRow key={c.key} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.key}
                  </TableCell>
                  <TableCell>{c.displayName}</TableCell>
                  <TableCell align="right">{c.sizeKB}</TableCell>
                  <TableCell align="right">{c.sizeBytes.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 重置确认对话框 */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>确认重置所有数据</DialogTitle>
        <DialogContent>
          <DialogContentText>
            此操作将清空 <strong>所有</strong> ssa-erp-* 前缀的 localStorage 数据，
            包括用户配置、业务数据、审批流程等。<strong>操作不可恢复。</strong>
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            建议先通过"一键导出"备份数据。
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleReset}>
            确认重置
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagement;
