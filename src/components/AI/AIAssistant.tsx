import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Fab, Drawer, TextField, IconButton, Typography, Paper,
  Card, CardContent, CardActions, Button, Divider, List, ListItemButton, ListItemText,
  Chip, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import {
  SmartToy, Close, Send, History, DeleteOutline,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAIStore } from '@/stores/aiStore';
import { ERP_SYSTEM_PROMPT } from '@/types/ai';

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

const HISTORY_STORAGE_KEY = 'ssa-erp-ai-chat-history';

const loadHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistory = (items: HistoryItem[]) => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(-50)));
  } catch { /* ignore */ }
};

const AIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是 SSA ERP AI 助手。请告诉我您需要什么帮助？',
      timestamp: Date.now(),
    },
  ]);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const { getActiveModel, isConfigured, models } = useAIStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: AIMessage = { role: 'user', content: q, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    // 存历史
    const newHistory = [...history, { id: `h-${Date.now()}`, query: q, timestamp: Date.now() }];
    setHistory(newHistory);
    saveHistory(newHistory);

    try {
      const model = getActiveModel();
      
      if (!model || !model.apiKey) {
        throw new Error('请先在「设置 → AI大模型配置」中添加并启用模型');
      }

      // 构建消息历史
      const apiMessages = [
        { role: 'system' as const, content: ERP_SYSTEM_PROMPT },
        ...messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: q },
      ];

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          modelId: model.id,
          systemPrompt: ERP_SYSTEM_PROMPT,
        }),
      });

      const data = await resp.json();

      if (!data.success) {
        throw new Error(data.error || '请求失败');
      }

      const assistantMsg: AIMessage = {
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

    } catch (err: any) {
      setError(err.message || '请求失败，请稍后重试');
      const errorMsg: AIMessage = {
        role: 'assistant',
        content: `抱歉，发生错误：${err.message}\n\n请检查：\n1. API密钥是否正确\n2. 网络连接是否正常\n3. 模型服务是否可用`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setInput(item.query);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const clearMessages = () => {
    setMessages([{
      role: 'assistant',
      content: '对话已清空。请问有什么可以帮您？',
      timestamp: Date.now(),
    }]);
  };

  const gotoConfig = () => {
    setOpen(false);
    navigate('/settings/ai-models');
  };

  const model = getActiveModel();

  return (
    <>
      {/* 悬浮按钮 */}
      <Tooltip title={model ? "AI 助手" : "AI 助手（未配置）"} placement="left">
        <Fab
          color={model ? "primary" : "default"}
          data-testid="ai-assistant"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1200,
            boxShadow: 6,
            ...(model ? {} : { opacity: 0.7 }),
          }}
        >
          <SmartToy />
        </Fab>
      </Tooltip>

      {/* 侧边对话面板 */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        data-testid="ai-panel"
        PaperProps={{ sx: { width: 420, maxWidth: '90vw', display: 'flex', flexDirection: 'column' } }}
      >
        {/* 顶栏 */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider',
          bgcolor: 'primary.main', color: 'primary.contrastText',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy />
            <Typography variant="h6" fontSize="1rem">AI 助手</Typography>
            {model && (
              <Chip label={model.name} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {model && (
              <Tooltip title="模型配置">
                <IconButton size="small" sx={{ color: 'inherit' }} onClick={gotoConfig}>
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="历史对话">
              <IconButton size="small" sx={{ color: 'inherit' }} onClick={() => setShowHistory(!showHistory)}>
                <History fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="清空对话">
              <IconButton size="small" sx={{ color: 'inherit' }} onClick={clearMessages}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" sx={{ color: 'inherit' }} onClick={() => setOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* 未配置提示 */}
        {!model && (
          <Box sx={{ p: 2, bgcolor: 'warning.light' }}>
            <Alert severity="warning" action={<Button color="inherit" size="small" onClick={gotoConfig}>去配置</Button>}>
              请先配置 AI 模型
            </Alert>
          </Box>
        )}

        {/* 历史对话面板 */}
        {showHistory && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', maxHeight: 200, overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1 }}>
              <Typography variant="caption" color="text.secondary">历史对话</Typography>
              <Button size="small" onClick={clearHistory} sx={{ minWidth: 0, fontSize: '0.7rem' }}>清空</Button>
            </Box>
            <List dense>
              {history.length === 0 ? (
                <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>
                  暂无历史记录
                </Typography>
              ) : (
                history.slice(-10).reverse().map((item) => (
                  <ListItemButton key={item.id} onClick={() => handleHistoryClick(item)}>
                    <ListItemText
                      primary={item.query}
                      primaryTypographyProps={{ fontSize: '0.8rem', noWrap: true }}
                      secondary={new Date(item.timestamp).toLocaleString()}
                      secondaryTypographyProps={{ fontSize: '0.65rem' }}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          </Box>
        )}

        {/* 错误提示 */}
        {error && (
          <Box sx={{ px: 2, py: 1 }}>
            <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
          </Box>
        )}

        {/* 消息区域 */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.map((msg, idx) => (
            <Box key={idx}>
              <Box sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {msg.role === 'assistant' && <SmartToy sx={{ fontSize: 16, color: 'primary.main' }} />}
                  <Chip
                    label={msg.role === 'user' ? '你' : 'AI'}
                    size="small"
                    color={msg.role === 'user' ? 'default' : 'primary'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                  <Typography variant="caption" color="text.disabled">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Box>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5, ml: msg.role === 'user' ? 4 : 0, mr: msg.role === 'user' ? 0 : 4,
                  bgcolor: msg.role === 'user' ? 'action.hover' : 'background.paper',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">AI 思考中...</Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* 输入区域 */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={'输入问题，如"库存还有多少"...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            inputProps={{ 'data-testid': 'ai-input' }}
            disabled={loading || !model}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading || !model}
            data-testid="ai-send"
          >
            {loading ? <CircularProgress size={20} /> : <Send />}
          </IconButton>
        </Box>
      </Drawer>
    </>
  );
};

export default AIAssistant;
