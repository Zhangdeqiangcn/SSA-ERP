import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Stack, TextField, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, List, ListItem,
  ListItemText, Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { QrCodeScanner, Search, CheckCircle, ReportProblem } from '@mui/icons-material';
import { useQualityStore } from '@/stores/qualityStore';
import { useAuthStore } from '@/stores/authStore';
import BarcodeScanner from './components/BarcodeScanner';
import type { UnqualifiedDisposition } from '@/types/quality';

/** 编码归一化：条码内容为大写物料编码 */
const norm = (s?: string) => String(s || '').trim().toUpperCase();

const DISPO_LABEL: Record<UnqualifiedDisposition, string> = {
  rework: '返工',
  scrap: '报废',
  return_vendor: '退货供应商',
  conditional_accept: '让步接收',
};

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/**
 * 移动端质检作业（V2.79.0 真功能，非演示）。两个闭环：
 *  ① 检验录入：选检验任务（扫物料条码可直达）→ 录合格/不合格数 + 结论
 *     → updateInspectionTask（status 置 passed/failed，写合格/不合格数、完成时间、结论）。
 *  ② 不合格处置（NCR）：若不合格数 > 0，自动生成不合格品(NCR) 并 disposeUnqualified
 *     联动库存扣减 + 自动凭证（报废/返工/退货/让步），与桌面端 B4 处置同构。
 * 提交前明示后果与未同步风险（未登录时数据仅在本机）。
 */
const MobileQuality: React.FC = () => {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const inspectionTasks = useQualityStore((s) => s.inspectionTasks);
  const unqualifiedItems = useQualityStore((s) => s.unqualifiedItems);
  const updateInspectionTask = useQualityStore((s) => s.updateInspectionTask);
  const addUnqualifiedItem = useQualityStore((s) => s.addUnqualifiedItem);
  const disposeUnqualified = useQualityStore((s) => s.disposeUnqualified);
  const authed = useAuthStore((s) => s.isAuthenticated);

  const [mode, setMode] = useState<'inspect' | 'dispose'>('inspect');

  const openInspects = useMemo(
    () => inspectionTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress'),
    [inspectionTasks],
  );
  const openUnqualified = useMemo(
    () => unqualifiedItems.filter((u) => u.dispositionStatus !== 'completed'),
    [unqualifiedItems],
  );

  // ── 检验录入态 ──
  const taskId = searchParams.get('task') || '';
  const task = useMemo(
    () => openInspects.find((t) => t.id === taskId) || inspectionTasks.find((t) => t.id === taskId) || null,
    [openInspects, inspectionTasks, taskId],
  );
  const [passed, setPassed] = useState('');
  const [failed, setFailed] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [disposition, setDisposition] = useState<UnqualifiedDisposition>('rework');
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── 不合格处置态 ──
  const [uqId, setUqId] = useState('');
  const uq = useMemo(() => openUnqualified.find((u) => u.id === uqId) || null, [openUnqualified, uqId]);
  const [uqDisposition, setUqDisposition] = useState<UnqualifiedDisposition>('rework');
  const [uqRemark, setUqRemark] = useState('');

  const handleScan = (raw: string) => {
    const code = norm(raw);
    if (!code) return;
    const hit = openInspects.find((t) => norm(t.materialCode) === code || norm(t.materialName) === code);
    if (!hit) {
      setFlash({ msg: `未匹配到待检任务：${code}`, ok: false });
      return;
    }
    setSearchParams({ task: hit.id });
    setSearch('');
  };

  const submitInspect = () => {
    if (!task) return;
    const fp = Number(failed) || 0;
    const pp = Number(passed) || 0;
    const user = useAuthStore.getState().currentUser;
    updateInspectionTask(task.id, {
      status: fp > 0 ? 'failed' : 'passed',
      passedQuantity: pp,
      failedQuantity: fp,
      completedDate: new Date().toISOString().slice(0, 10),
      conclusion: conclusion || (fp > 0 ? '移动端判定不合格' : '移动端判定合格'),
    });
    // 不合格 → 自动生成 NCR 并联动处置（与桌面 B4 同构）
    if (fp > 0) {
      const itemId = `uq-m-${task.id}-${Date.now()}`;
      addUnqualifiedItem({
        id: itemId,
        itemNo: `NCR-M-${task.taskNo}`,
        inspectionTaskId: task.id,
        inspectionTaskNo: task.taskNo,
        materialCode: task.materialCode,
        materialName: task.materialName,
        batchNo: task.batchNo,
        defectQuantity: fp,
        defectDescription: conclusion || '移动端质检不合格',
        disposition,
        dispositionStatus: 'pending',
        status: 'open',
        source: 'inspection',
        responsiblePerson: user?.name || '移动端',
        dueDate: '',
        createdAt: nowStr(),
        updatedAt: nowStr(),
        createdBy: user?.name || '移动端',
        updatedBy: user?.name || '移动端',
      });
      disposeUnqualified(itemId, { disposition, operator: user?.name || '移动端', remark: conclusion });
    }
    setFlash({ msg: `已提交检验 ${task.taskNo}：${fp > 0 ? `不合格 ${fp}，已生成 NCR 并${DISPO_LABEL[disposition]}` : '判定合格'}。${authed ? '数据已同步云端。' : '（未登录，仅本机）'}`, ok: true });
    setSearchParams({}, { replace: true });
    setPassed(''); setFailed(''); setConclusion('');
    setTimeout(() => nav('/m'), 900);
  };

  const submitDispose = () => {
    if (!uq) return;
    disposeUnqualified(uq.id, { disposition: uqDisposition, operator: useAuthStore.getState().currentUser?.name || '移动端', remark: uqRemark });
    setFlash({ msg: `已处置 ${uq.itemNo}：${DISPO_LABEL[uqDisposition]}${authed ? '，已同步云端。' : '（未登录，仅本机）'}`, ok: true });
    setUqId(''); setUqRemark('');
    setTimeout(() => nav('/m'), 900);
  };

  return (
    <Box sx={{ p: 1.5 }}>
      <ToggleButtonGroup
        color="primary"
        value={mode}
        exclusive
        onChange={(_, v) => v && setMode(v)}
        size="small"
        sx={{ mb: 1.5, width: '100%' }}
      >
        <ToggleButton value="inspect" sx={{ flex: 1 }}>检验录入</ToggleButton>
        <ToggleButton value="dispose" sx={{ flex: 1 }}>不合格处置</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'inspect' && (
        !task ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>选择检验任务（{openInspects.length}）</Typography>
            {openInspects.length === 0 && (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">暂无待检任务。</Typography>
                <Button sx={{ mt: 1 }} onClick={() => nav('/m')}>返回任务列表</Button>
              </Paper>
            )}
            <Stack spacing={1.5}>
              {openInspects.map((t) => (
                <Paper key={t.id} onClick={() => setSearchParams({ task: t.id })} sx={{ p: 2, borderRadius: 3, cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{t.taskNo}</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Chip size="small" label={t.type === 'incoming' ? '来料检' : t.type === 'process' ? '过程检' : '终检'} variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {[t.materialName, t.batchNo, `抽${t.sampleQuantity}`].filter(Boolean).join(' · ')}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        ) : (
          <Box>
            <Paper sx={{ p: 2, borderRadius: 3, mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{task.taskNo}</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip size="small" color="primary" label="检验中" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {[task.materialName, task.batchNo, `批量 ${task.quantity}`, `抽 ${task.sampleQuantity}`].filter(Boolean).join(' · ')}
              </Typography>
            </Paper>

            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Button data-testid="m-scan-btn" variant="contained" size="large" startIcon={<QrCodeScanner />} onClick={() => setScanOpen(true)} sx={{ flex: 1, py: 1.5, borderRadius: 3, fontWeight: 700 }}>扫码选任务</Button>
            </Stack>
            <TextField inputProps={{ 'data-testid': 'm-search-input' }} size="small" fullWidth placeholder="输入/扫入物料编码后回车" value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleScan(search); } }}
              sx={{ mb: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}
              InputProps={{ startAdornment: <Search fontSize="small" /> }}
            />

            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField label="合格数" type="number" fullWidth value={passed}
                onChange={(e) => setPassed(e.target.value)} inputProps={{ 'data-testid': 'm-passed-input', min: 0, inputMode: 'decimal' }} />
              <TextField label="不合格数" type="number" fullWidth value={failed}
                onChange={(e) => setFailed(e.target.value)} inputProps={{ 'data-testid': 'm-failed-input', min: 0, inputMode: 'decimal' }} />
            </Stack>
            <TextField label="检验结论" fullWidth multiline minRows={2} value={conclusion}
              onChange={(e) => setConclusion(e.target.value)} sx={{ mb: 1 }} inputProps={{ 'data-testid': 'm-conclusion-input' }} />

            {Number(failed) > 0 && (
              <FormControlRow label="不合格处置方式">
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {(Object.keys(DISPO_LABEL) as UnqualifiedDisposition[]).map((d) => (
                    <Chip key={d} data-testid={`m-dispo-${d}`} label={DISPO_LABEL[d]} color={disposition === d ? 'error' : 'default'}
                      variant={disposition === d ? 'filled' : 'outlined'} onClick={() => setDisposition(d)} />
                  ))}
                </Stack>
              </FormControlRow>
            )}

            <Button data-testid="m-submit-btn" variant="contained" color="success" fullWidth size="large"
              disabled={!(Number(passed) > 0 || Number(failed) > 0)} onClick={() => setConfirmOpen(true)}
              sx={{ mt: 2, py: 1.6, borderRadius: 3, fontWeight: 700 }}>提交检验结论</Button>

            <BarcodeScanner open={scanOpen} title="扫码选任务" onClose={() => setScanOpen(false)} onDetect={handleScan} />

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
              <DialogTitle>确认提交？</DialogTitle>
              <DialogContent>
                <Typography variant="body2" component="div" color="text.secondary">
                  · 检验任务标记{Number(failed) > 0 ? '不合格' : '合格'}<br />
                  {Number(failed) > 0 && '· 自动生成不合格品(NCR) 并按所选方式联动库存/凭证<br />'}
                  · {authed ? '数据写入云端 D1' : '当前未登录：仅写入本机'}
                </Typography>
              </DialogContent>
              <DialogActions sx={{ px: 2, pb: 2 }}>
                <Button onClick={() => setConfirmOpen(false)}>再检查一下</Button>
                <Button data-testid="m-submit-confirm" variant="contained" color="success" onClick={submitInspect}>确认提交</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )
      )}

      {mode === 'dispose' && (
        !uq ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>待处置不合格品（{openUnqualified.length}）</Typography>
            {openUnqualified.length === 0 && (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">暂无待处置不合格品。</Typography>
                <Button sx={{ mt: 1 }} onClick={() => nav('/m')}>返回任务列表</Button>
              </Paper>
            )}
            <Stack spacing={1.5}>
              {openUnqualified.map((u) => (
                <Paper key={u.id} onClick={() => setUqId(u.id)} sx={{ p: 2, borderRadius: 3, cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ReportProblem sx={{ color: 'error.main' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{u.itemNo}</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Chip size="small" label={DISPO_LABEL[(u.disposition as UnqualifiedDisposition) || 'rework'] || u.disposition} color="error" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {[u.materialName, u.batchNo, `不合格 ${u.defectQuantity}`].filter(Boolean).join(' · ')}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        ) : (
          <Box>
            <Paper sx={{ p: 2, borderRadius: 3, mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{uq.itemNo}</Typography>
              <Typography variant="caption" color="text.secondary">
                {[uq.materialName, uq.batchNo, `不合格 ${uq.defectQuantity}`].filter(Boolean).join(' · ')}
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">处置方式</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5, mb: 1.5 }} useFlexGap>
              {(Object.keys(DISPO_LABEL) as UnqualifiedDisposition[]).map((d) => (
                <Chip key={d} data-testid={`m-uq-dispo-${d}`} label={DISPO_LABEL[d]} color={uqDisposition === d ? 'error' : 'default'}
                  variant={uqDisposition === d ? 'filled' : 'outlined'} onClick={() => setUqDisposition(d)} />
              ))}
            </Stack>
            <TextField label="处置说明" fullWidth multiline minRows={2} value={uqRemark}
              onChange={(e) => setUqRemark(e.target.value)} sx={{ mb: 1 }} inputProps={{ 'data-testid': 'm-uq-remark' }} />
            <Button data-testid="m-uq-submit" variant="contained" color="error" fullWidth size="large"
              onClick={submitDispose} sx={{ py: 1.6, borderRadius: 3, fontWeight: 700 }}>确认处置（联动库存/凭证）</Button>
          </Box>
        )
      )}

      <Snackbar open={!!flash} autoHideDuration={flash?.ok ? 2500 : 4000} onClose={() => setFlash(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={flash?.ok ? 'success' : 'error'} variant="filled" onClose={() => setFlash(null)}>{flash?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

/** 内联「标签 + 内容」行，避免额外导入 FormControl/FormLabel */
const FormControlRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    {children}
  </Box>
);

export default MobileQuality;
