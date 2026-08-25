import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Chip, Alert, Select, MenuItem, FormControl,
  InputLabel, Switch, Tooltip,
} from '@mui/material';
import {
  Add, Edit, Delete, Key as KeyIcon, CheckCircle,
  OpenInNew, Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAIStore } from '@/stores/aiStore';
import type { AIModelConfig, AIProvider } from '@/types/ai';
import { AI_PROVIDER_TEMPLATES, RECOMMENDED_MODELS } from '@/types/ai';

const AIConfigPage: React.FC = () => {
  const { models, activeModelId, addModel, updateModel, deleteModel, setActiveModel, getActiveModel, isConfigured } = useAIStore();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState<AIProvider>('custom');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formModelId, setFormModelId] = useState('');
  const [formDefault, setFormDefault] = useState(false);

  useEffect(() => {
    if (editingModel) {
      setFormName(editingModel.name);
      setFormProvider(editingModel.provider);
      setFormBaseUrl(editingModel.baseUrl);
      setFormApiKey(editingModel.apiKey);
      setFormModelId(editingModel.modelId);
      setFormDefault(!!editingModel.default);
    }
  }, [editingModel]);

  const handleOpenAdd = () => {
    setEditingModel(null);
    setFormName('');
    setFormProvider('custom');
    setFormBaseUrl('');
    setFormApiKey('');
    setFormModelId('');
    setFormDefault(false);
    setOpenDialog(true);
  };

  const handleOpenEdit = (model: AIModelConfig) => {
    setEditingModel(model);
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此模型配置？')) return;
    deleteModel(id);
  };

  const handleSave = async () => {
    if (!formName || !formProvider || !formModelId) {
      setSaveMessage({ type: 'error', text: '请填写必要字段' });
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      if (editingModel) {
        // 更新
        await updateModel(editingModel.id, {
          name: formName,
          provider: formProvider,
          baseUrl: formBaseUrl,
          apiKey: formApiKey,
          modelId: formModelId,
          default: formDefault,
        });
        setSaveMessage({ type: 'success', text: '更新成功' });
      } else {
        // 新增
        const newModel: AIModelConfig = {
          id: `model-${Date.now()}`,
          name: formName,
          provider: formProvider,
          baseUrl: formBaseUrl,
          apiKey: formApiKey,
          modelId: formModelId,
          default: formDefault,
        };
        await addModel(newModel);
        setSaveMessage({ type: 'success', text: '添加成功' });
      }
      setOpenDialog(false);
    } catch (err) {
      setSaveMessage({ type: 'error', text: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    setFormProvider(provider);
    const template = AI_PROVIDER_TEMPLATES[provider];
    if (template && !editingModel) {
      setFormBaseUrl(template.baseUrl);
    }
  };

  const activeModel = getActiveModel();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SettingsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>AI 大模型配置</Typography>
      </Box>

      {/* 当前状态 */}
      <Alert
        severity={isConfigured() ? 'success' : 'warning'}
        icon={isConfigured() ? <CheckCircle /> : <KeyIcon />}
        sx={{ mb: 3 }}
      >
        {isConfigured() ? (
          <>
            已配置 <strong>{activeModel?.name}</strong>（{activeModel?.modelId}）
            {activeModel?.default && <Chip label="默认" size="small" sx={{ ml: 1 }} />}
          </>
        ) : '尚未配置AI模型，请添加配置后启用'}
      </Alert>

      {/* 模型列表 */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>已配置的模型</Typography>
          <Button startIcon={<Add />} onClick={handleOpenAdd} variant="contained" size="small">
            添加模型
          </Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>提供商</TableCell>
              <TableCell>模型ID</TableCell>
              <TableCell>API地址</TableCell>
              <TableCell>API密钥</TableCell>
              <TableCell>默认</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {model.default && <CheckCircle fontSize="small" color="primary" />}
                    {model.name}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={AI_PROVIDER_TEMPLATES[model.provider]?.name || model.provider} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">{model.modelId}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                    {model.baseUrl}
                  </Typography>
                </TableCell>
                <TableCell>
                  {model.apiKey ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <KeyIcon fontSize="small" color="success" />
                      <Typography variant="caption" color="text.secondary">已配置</Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.disabled">未配置</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {model.default ? (
                    <Chip label="是" size="small" color="primary" />
                  ) : (
                    <Button size="small" onClick={() => setActiveModel(model.id)} disabled={model.default}>
                      设为默认
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleOpenEdit(model)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" onClick={() => handleDelete(model.id)} disabled={model.default}>
                        <Delete fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* 推荐模型 */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>推荐模型</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>提供商</TableCell>
                <TableCell>模型</TableCell>
                <TableCell>说明</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {RECOMMENDED_MODELS.map((m, i) => (
                <TableRow key={i} hover>
                  <TableCell><Chip label={m.provider} size="small" /></TableCell>
                  <TableCell><Typography variant="body2" fontFamily="monospace">{m.model}</Typography></TableCell>
                  <TableCell>{m.desc}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => {
                        setFormProvider(m.provider as AIProvider);
                        setFormModelId(m.model);
                        setOpenDialog(true);
                      }}
                    >
                      使用
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* 添加/编辑对话框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingModel ? '编辑模型配置' : '添加模型配置'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {saveMessage && (
            <Alert severity={saveMessage.type} sx={{ mb: 2 }}>
              {saveMessage.text}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="配置名称"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：DeepSeek V3"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>提供商</InputLabel>
              <Select
                value={formProvider}
                label="提供商"
                onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              >
                {Object.entries(AI_PROVIDER_TEMPLATES).map(([key, val]) => (
                  <MenuItem key={key} value={key}>{val.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="模型ID"
              value={formModelId}
              onChange={(e) => setFormModelId(e.target.value)}
              placeholder="如：deepseek-chat"
              fullWidth
              required
            />
            <TextField
              label="API 地址"
              value={formBaseUrl}
              onChange={(e) => setFormBaseUrl(e.target.value)}
              placeholder="https://api.xxx.com/v1"
              fullWidth
              helperText="OpenAI 兼容接口地址"
            />
            <TextField
              label="API 密钥"
              value={formApiKey}
              onChange={(e) => setFormApiKey(e.target.value)}
              placeholder="sk-..."
              type="password"
              fullWidth
              helperText="从提供商控制台获取"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch
                checked={formDefault}
                onChange={(e) => setFormDefault(e.target.checked)}
              />
              <Typography>设为默认模型</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIConfigPage;
