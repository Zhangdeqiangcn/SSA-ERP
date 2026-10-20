import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
  Checkbox, List, ListItem, ListItemText, ListItemButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import PublishIcon from '@mui/icons-material/Publish';
import { useProductionVersionStore } from '@/stores/productionVersionStore';
import { useECNStore } from '@/stores/ecnStore';
import { ProductionVersion, ProductionVersionStatus, ECN, ECNStatus } from '@/types/production';

const STATUS_LABEL: Record<ProductionVersionStatus, string> = {
  draft: '草稿', active: '生效', obsolete: '作废',
};

const ECN_STATUS_LABEL: Record<ECNStatus, string> = {
  draft: '草稿', released: '已发布',
};

export default function ProductionVersions() {
  const { versions, addVersion, deleteVersion, ecns, releaseECN, linkChange, unlinkChange } = useProductionVersionStore();
  const materialChanges = useECNStore((s) => s.ecns);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // P0-4（V3.74.0）：生产域 ECN ↔ 物料域 ECM 关联对话框
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<string[]>([]);
  const [form, setForm] = useState({
    materialCode: '', materialName: '', bomNo: '', routeNo: '', version: 'V1.0',
    effectiveDate: '2026-01-01', status: 'draft' as ProductionVersionStatus,
  });

  const rows = useMemo(() => versions, [versions]);

  // P0-4（V3.74.0）：打开关联对话框，预勾选当前已关联的物料域 ECM
  const openLinkDialog = (ecnId: string) => {
    const cur = ecns.find((e) => e.id === ecnId);
    setLinkDraft([...(cur?.linkedChangeIds || [])]);
    setLinkFor(ecnId);
  };

  const saveLinkDialog = async () => {
    if (!linkFor) return;
    const cur = ecns.find((e) => e.id === linkFor);
    const before = cur?.linkedChangeIds || [];
    for (const cid of linkDraft) { if (!before.includes(cid)) await linkChange(linkFor, cid); }
    for (const cid of before) { if (!linkDraft.includes(cid)) await unlinkChange(linkFor, cid); }
    setLinkFor(null);
  };

  const handleAdd = () => {
    const v: ProductionVersion = {
      id: `pv-${Date.now()}`,
      version: form.version,
      materialId: `mat-${Date.now()}`,
      materialCode: form.materialCode || 'PRD-NEW',
      materialName: form.materialName || '新产品',
      bomId: 'bom-001',
      bomNo: form.bomNo || 'BOM-2024-001',
      routeId: 'route-001',
      routeNo: form.routeNo || 'R-2024-001',
      status: form.status,
      effectiveDate: form.effectiveDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '当前用户',
      updatedBy: '当前用户',
    };
    addVersion(v);
    setOpen(false);
    setForm({ materialCode: '', materialName: '', bomNo: '', routeNo: '', version: 'V1.0', effectiveDate: '2026-01-01', status: 'draft' });
  };

  return (
    <Box sx={{ p: 2 }} data-testid="production-versions">
      <Typography variant="h5" gutterBottom>生产版本</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        生产版本 = 物料 + BOM + 工艺路线 的组合，用于按产品指定不同的制造配方（对标 SAP 生产版本 / 金蝶 生产用料清单版本）。
      </Alert>
      <Button data-testid="pv-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增版本
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>版本</TableCell>
              <TableCell>物料编码</TableCell>
              <TableCell>物料名称</TableCell>
              <TableCell>BOM</TableCell>
              <TableCell>工艺路线</TableCell>
              <TableCell>生效日期</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id} data-testid="pv-row">
                <TableCell>{v.version}</TableCell>
                <TableCell>{v.materialCode}</TableCell>
                <TableCell>{v.materialName}</TableCell>
                <TableCell>{v.bomNo}</TableCell>
                <TableCell>{v.routeNo}</TableCell>
                <TableCell>{v.effectiveDate}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[v.status]} color={v.status === 'active' ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  <Button size="small" color="error" onClick={() => deleteVersion(v.id)}>删除</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* P0-4（V3.74.0）：生产域 ECN 区块 —— 原本只在 store 里、无任何界面可见，
          与物料域 ECM（/production/ecn）两套并存易混；此处显式列出并支持互相挂钩 */}
      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>工程变更 ECN（生产域）</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        生产域工程变更单：发布时切换关联 BOM 至新版本。通过「关联ECM」与物料域工程变更单（另一页）互相挂钩，两侧都能看到对方并跳转；两套数据各自保留、互不取代。
      </Alert>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>变更单号</TableCell>
              <TableCell>标题</TableCell>
              <TableCell>物料</TableCell>
              <TableCell>BOM</TableCell>
              <TableCell>版本切换</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>关联物料域ECM</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ecns.map((e: ECN) => {
              const linked = (e.linkedChangeIds || [])
                .map((id) => materialChanges.find((m) => m.id === id))
                .filter(Boolean);
              return (
                <TableRow key={e.id} data-testid="pv-ecn-row">
                  <TableCell sx={{ fontFamily: 'monospace' }}>{e.changeNo}</TableCell>
                  <TableCell>{e.title}</TableCell>
                  <TableCell>{e.materialName || e.materialCode || e.materialId}</TableCell>
                  <TableCell>{e.bomNo || e.bomId}</TableCell>
                  <TableCell>{e.oldVersion} → {e.newVersion}</TableCell>
                  <TableCell><Chip size="small" label={ECN_STATUS_LABEL[e.status]} color={e.status === 'released' ? 'success' : 'default'} /></TableCell>
                  <TableCell>
                    {linked.length === 0 ? (
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>未关联</Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {linked.map((m) => (
                          <Chip
                            key={m!.id}
                            size="small"
                            label={m!.changeNo}
                            title={`${m!.title}（点击跳转工程变更单页查看）`}
                            component="button"
                            onClick={() => navigate('/production/ecn')}
                            sx={{ bgcolor: '#EFF6FF', color: '#3B82F6', fontSize: '0.6875rem', cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={() => openLinkDialog(e.id)}>关联ECM</Button>
                      {e.status === 'draft' && (
                        <Button size="small" variant="outlined" color="success" startIcon={<PublishIcon />} onClick={() => releaseECN(e.id)}>发布</Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {ecns.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">暂无生产域 ECN 记录</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* P0-4（V3.74.0）：关联物料域 ECM 对话框（勾选式，保存时差集双向落库） */}
      <Dialog open={linkFor !== null} onClose={() => setLinkFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle>关联物料域工程变更单（ECM）</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            勾选要关联的物料域工程变更单（工程变更单页维护的那一套）。保存后两侧互相挂钩，旧数据不动、只增不减。
          </Alert>
          {materialChanges.length === 0 ? (
            <Typography variant="body2" color="text.secondary">暂无物料域 ECM 记录。</Typography>
          ) : (
            <List dense>
              {materialChanges.map((m) => {
                const checked = linkDraft.includes(m.id);
                return (
                  <ListItem key={m.id} disablePadding>
                    <ListItemButton onClick={() => setLinkDraft((d) => (checked ? d.filter((x) => x !== m.id) : [...d, m.id]))}>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                      <ListItemText
                        primary={`${m.changeNo} · ${m.title}`}
                        secondary={`${m.materialName || m.materialId} ｜ ${m.fromVersion} → ${m.toVersion} ｜ ${m.status}`}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkFor(null)}>取消</Button>
          <Button variant="contained" data-testid="pv-ecn-link-save" onClick={saveLinkDialog}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增生产版本</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="物料编码" value={form.materialCode}
            onChange={(e) => setForm({ ...form, materialCode: e.target.value })} />
          <TextField fullWidth margin="dense" label="物料名称" value={form.materialName}
            onChange={(e) => setForm({ ...form, materialName: e.target.value })} />
          <TextField fullWidth margin="dense" label="BOM 编号" value={form.bomNo}
            onChange={(e) => setForm({ ...form, bomNo: e.target.value })} />
          <TextField fullWidth margin="dense" label="工艺路线编号" value={form.routeNo}
            onChange={(e) => setForm({ ...form, routeNo: e.target.value })} />
          <TextField fullWidth margin="dense" label="版本号" value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })} />
          <TextField fullWidth margin="dense" label="生效日期" type="date" value={form.effectiveDate}
            onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
            InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" select label="状态" value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ProductionVersionStatus })}>
            <MenuItem value="draft">草稿</MenuItem>
            <MenuItem value="active">生效</MenuItem>
            <MenuItem value="obsolete">作废</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="pv-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
