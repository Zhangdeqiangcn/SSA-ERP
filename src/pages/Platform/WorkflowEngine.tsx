import React, { useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Paper, Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PlayArrow, ArrowForward, Block } from '@mui/icons-material';
import { useWorkflowStore } from '@/stores';
import type { WorkflowNode } from '@/types';

const makeDefaultNodes = (): WorkflowNode[] => [
  { id: 'n1', name: '发起', type: 'start' },
  { id: 'n2', name: '审批', type: 'approval' },
  { id: 'n3', name: '执行', type: 'task' },
  { id: 'n4', name: '结束', type: 'end' },
];

const WorkflowEngine: React.FC = () => {
  const { definitions, instances, addDefinition, deleteDefinition, startInstance, advanceInstance, rejectInstance } =
    useWorkflowStore();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selDef, setSelDef] = useState(definitions[0]?.id ?? '');

  const handleConfirm = () => {
    if (!name.trim()) return;
    const nodes = makeDefaultNodes();
    addDefinition({
      name: name.trim(),
      nodes,
      transitions: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' },
        { from: 'n3', to: 'n4' },
      ],
    });
    setName(''); setOpen(false);
  };

  const statusColor = (s: string) => (s === 'done' ? 'success' : s === 'rejected' ? 'error' : 'warning');

  return (
    <Box sx={{ p: 3 }} data-testid="workflow">
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>工作流引擎 (BPMN-lite)</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        这是<strong>通用流程设计器（实验性）</strong>，用于自定义非标流程（起止节点 + 任意流转）的沙盒演练。
        业务审批（采购申请 / 供应商准入 / 价格审批 / 物料新增等）由独立的「审批流引擎」驱动，
        请到<strong>设置中心 → 审批流配置</strong>维护，两者<strong>不互通、不合并</strong>。
      </Alert>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="流程定义" />
        <Tab label="流程实例" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Button data-testid="wf-def-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
            新建流程
          </Button>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>流程名称</TableCell>
                <TableCell>节点数</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {definitions.map((d) => (
                <TableRow key={d.id} data-testid="wf-def-row">
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{d.nodes.length}</TableCell>
                  <TableCell>
                    <IconButton data-testid="wf-def-del" onClick={() => deleteDefinition(d.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 240 }}>
              <InputLabel>选择流程</InputLabel>
              <Select data-testid="wf-inst-def" value={selDef} label="选择流程"
                onChange={(e) => setSelDef(e.target.value)}>
                {definitions.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Button data-testid="wf-inst-start" variant="contained" startIcon={<PlayArrow />}
              onClick={() => selDef && startInstance(selDef, '当前用户')}>发起实例</Button>
          </Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>流程</TableCell>
                <TableCell>当前节点</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {instances.map((inst) => (
                <TableRow key={inst.id} data-testid="wf-inst-row">
                  <TableCell>{inst.defName}</TableCell>
                  <TableCell>{inst.history[inst.history.length - 1]?.nodeName}</TableCell>
                  <TableCell><Chip size="small" label={inst.status} color={statusColor(inst.status)} /></TableCell>
                  <TableCell>
                    <IconButton data-testid="wf-inst-advance" onClick={() => advanceInstance(inst.id)} size="small"
                      disabled={inst.status !== 'running'}><ArrowForward /></IconButton>
                    <IconButton data-testid="wf-inst-reject" onClick={() => rejectInstance(inst.id)} size="small"
                      disabled={inst.status !== 'running'}><Block /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新建流程</DialogTitle>
        <DialogContent>
          <TextField data-testid="wf-def-name" fullWidth label="流程名称" value={name}
            onChange={(e) => setName(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button data-testid="wf-def-add-confirm" variant="contained" onClick={handleConfirm}>确定</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowEngine;
