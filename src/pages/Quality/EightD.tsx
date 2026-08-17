import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Alert, TextField, MenuItem, Grid,
} from '@mui/material';
import { useQualityExtensionStore } from '@/stores/qualityExtensionStore';
import { EightDRecord, EightDStatus } from '@/types';

const STATUS_LABEL: Record<EightDStatus, string> = { open: '未开始', in_progress: '进行中', closed: '已关闭' };
const PRIORITY_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' };

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function EightDPage() {
  const { eightDRecords, addEightD, closeEightD, deleteEightD } = useQualityExtensionStore();
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [sourceNo, setSourceNo] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [owner, setOwner] = useState('');

  const submit = () => {
    if (!code || !title) return;
    const rec: EightDRecord = {
      id: uid('d8'), code, title, sourceType: 'unqualified', sourceNo: sourceNo || undefined,
      priority, status: 'open', owner: owner || '当前用户', team: [],
      createdAt: today(), updatedAt: today(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    addEightD(rec);
    setAdding(false); setCode(''); setTitle(''); setSourceNo(''); setOwner('');
  };

  return (
    <Box sx={{ p: 2 }} data-testid="eight-d">
      <Typography variant="h5" gutterBottom>8D 问题求解</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        8D（D0–D8）结构化根本原因分析与纠正预防，可关联不合格品 / 客诉来源，闭环质量问题。
      </Alert>
      <Chip data-testid="d8-count" label={`8D 记录 ${eightDRecords.length}`} sx={{ mb: 1 }} />
      <Button variant="contained" sx={{ ml: 1, mb: 1 }} data-testid="d8-add" onClick={() => setAdding(true)}>新增 8D</Button>

      {adding && (
        <Paper sx={{ p: 2, mb: 2 }} data-testid="d8-form">
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}><TextField fullWidth label="8D 编号" data-testid="d8-code" value={code} onChange={(e) => setCode(e.target.value)} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth label="问题标题" data-testid="d8-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Grid>
            <Grid item xs={6} md={3}><TextField fullWidth label="来源单号" data-testid="d8-source" value={sourceNo} onChange={(e) => setSourceNo(e.target.value)} /></Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth select label="优先级" data-testid="d8-priority" value={priority} onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}>
                <MenuItem value="high">高</MenuItem><MenuItem value="medium">中</MenuItem><MenuItem value="low">低</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}><TextField fullWidth label="负责人" data-testid="d8-owner" value={owner} onChange={(e) => setOwner(e.target.value)} /></Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" data-testid="d8-add-confirm" onClick={submit}>确认新增</Button>
            <Button sx={{ ml: 1 }} data-testid="d8-cancel" onClick={() => setAdding(false)}>取消</Button>
          </Box>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>编号</TableCell><TableCell>标题</TableCell><TableCell>来源</TableCell>
              <TableCell>优先级</TableCell><TableCell>负责人</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eightDRecords.map((r) => (
              <TableRow key={r.id} data-testid="d8-row">
                <TableCell>{r.code}</TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.sourceNo || '—'}</TableCell>
                <TableCell><Chip size="small" label={PRIORITY_LABEL[r.priority]} color={r.priority === 'high' ? 'error' : 'default'} /></TableCell>
                <TableCell>{r.owner}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[r.status]} color={r.status === 'closed' ? 'success' : r.status === 'in_progress' ? 'warning' : 'default'} /></TableCell>
                <TableCell>
                  {r.status !== 'closed' && <Button size="small" color="success" data-testid="d8-close" onClick={() => closeEightD(r.id)}>关闭</Button>}
                  <Button size="small" color="error" data-testid="d8-delete" onClick={() => deleteEightD(r.id)}>删除</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
