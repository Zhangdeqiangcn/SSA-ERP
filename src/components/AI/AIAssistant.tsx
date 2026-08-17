import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Fab, Drawer, TextField, IconButton, Typography, Paper,
  Card, CardContent, CardActions, Button, Divider, List, ListItemButton, ListItemText,
  Chip, Tooltip,
} from '@mui/material';
import {
  SmartToy, Close, Send, History, Inventory2, Assignment,
  Category, TrendingUp, HelpOutline, DeleteOutline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  cards?: AICard[];
}

interface AICard {
  title: string;
  description: string;
  action?: string;
  actionPath?: string;
}

interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

const HISTORY_STORAGE_KEY = 'ssa-erp-ai-history';

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
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(-20)));
  } catch { /* ignore */ }
};

const COMMAND_KEYWORDS: Record<string, { title: string; description: string; action: string; actionPath: string }> = {
  '库存': { title: '库存查询', description: '当前库存量 Top5 物料：\n1. 冷轧板 SPCC 1.0 — 1250吨\n2. 热轧卷 Q235B 2.0 — 980吨\n3. 镀锌板 DX51D 0.8 — 760吨\n4. 不锈钢 304 1.5 — 520吨\n5. 角钢 L50×5 — 430吨', action: '跳转到库存页', actionPath: '/warehouse/inventory' },
  '查库存': { title: '库存查询', description: '当前库存量 Top5 物料：\n1. 冷轧板 SPCC 1.0 — 1250吨\n2. 热轧卷 Q235B 2.0 — 980吨\n3. 镀锌板 DX51D 0.8 — 760吨\n4. 不锈钢 304 1.5 — 520吨\n5. 角钢 L50×5 — 430吨', action: '跳转到库存页', actionPath: '/warehouse/inventory' },
  '工单': { title: '工单创建', description: '已为您创建工单草稿，请补全信息后提交。\n\n工单类型：生产工单\n产品：冷轧板 SPCC 1.0\n计划数量：100吨\n计划开工日期：2026-08-15', action: '跳转到工单页', actionPath: '/production/orders' },
  '创建工单': { title: '工单创建', description: '已为您创建工单草稿，请补全信息后提交。\n\n工单类型：生产工单\n产品：冷轧板 SPCC 1.0\n计划数量：100吨\n计划开工日期：2026-08-15', action: '跳转到工单页', actionPath: '/production/orders' },
  '物料': { title: '物料搜索', description: '搜索到以下物料（共 128 条）：\n- SPCC 冷轧板（16条）\n- Q235B 热轧卷（12条）\n- DX51D 镀锌板（8条）\n- 304 不锈钢（15条）\n点击下方按钮查看完整列表', action: '跳转到物料列表', actionPath: '/material/list' },
  '搜物料': { title: '物料搜索', description: '搜索到以下物料（共 128 条）：\n- SPCC 冷轧板（16条）\n- Q235B 热轧卷（12条）\n- DX51D 镀锌板（8条）\n- 304 不锈钢（15条）\n点击下方按钮查看完整列表', action: '跳转到物料列表', actionPath: '/material/list' },
  '销售': { title: '本月销售概览', description: '本月（2026年8月）销售额汇总：\n\n总销售额：¥8,560万元\n订单数：126笔\n同比增长：+15.3%\n主要客户：XX重工、YY钢铁\n\n销售趋势：上升', action: '跳转到销售分析', actionPath: '/sales/analysis' },
  '本月销售': { title: '本月销售概览', description: '本月（2026年8月）销售额汇总：\n\n总销售额：¥8,560万元\n订单数：126笔\n同比增长：+15.3%\n主要客户：XX重工、YY钢铁\n\n销售趋势：上升', action: '跳转到销售分析', actionPath: '/sales/analysis' },
  '帮助': { title: 'AI 助手帮助', description: '【模拟/Demo】SSA ERP AI 助手\n\n支持的命令：\n• "库存" / "查库存" — 查看当前库存\n• "工单" / "创建工单" — 创建生产工单\n• "物料" / "搜物料" — 搜索物料\n• "销售" / "本月销售" — 查看销售概览\n• "帮助" — 显示此帮助\n\n更多智能功能即将上线…', action: '', actionPath: '' },
};

const matchCommand = (text: string): AICard[] => {
  const matched = Object.entries(COMMAND_KEYWORDS).find(([key]) => text.includes(key));
  if (!matched) {
    return [{
      title: '未识别指令',
      description: '抱歉，我暂时无法理解您的指令。请尝试：\n• "库存" — 查询库存\n• "工单" — 创建工单\n• "物料" — 搜索物料\n• "销售" — 本月销售\n• "帮助" — 查看帮助',
    }];
  }
  const result = matched[1];
  return [{
    title: result.title,
    description: result.description,
    action: result.action || undefined,
    actionPath: result.actionPath || undefined,
  }];
};

const AIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([{
    role: 'assistant',
    content: '你好！我是 SSA ERP AI 助手（模拟/Demo）。请问有什么可以帮您？',
    timestamp: Date.now(),
  }]);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const q = input.trim();
    if (!q) return;

    const userMsg: AIMessage = { role: 'user', content: q, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    // 存历史
    const newHistory = [...history, { id: `h-${Date.now()}`, query: q, timestamp: Date.now() }];
    setHistory(newHistory);
    saveHistory(newHistory);

    const cards = matchCommand(q);
    const assistantMsg: AIMessage = {
      role: 'assistant',
      content: cards.map((c) => `${c.title}: ${c.description}`).join('\n\n'),
      timestamp: Date.now(),
      cards,
    };
    setTimeout(() => setMessages((prev) => [...prev, assistantMsg]), 400);

    setInput('');
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setInput(item.query);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const deleteMessages = () => {
    setMessages([{
      role: 'assistant',
      content: '对话已清空。请问有什么可以帮您？',
      timestamp: Date.now(),
    }]);
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <Tooltip title="AI 助手（模拟/Demo）" placement="left">
        <Fab
          color="primary"
          data-testid="ai-assistant"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1200,
            boxShadow: 6,
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
        PaperProps={{ sx: { width: 420, maxWidth: '90vw' } }}
      >
        {/* 顶栏 */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider',
          bgcolor: 'primary.main', color: 'primary.contrastText',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy />
            <Typography variant="h6" fontSize="1rem">AI 助手（模拟/Demo）</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="历史对话">
              <IconButton size="small" sx={{ color: 'inherit' }} onClick={() => setShowHistory(!showHistory)}>
                <History fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="清空对话">
              <IconButton size="small" sx={{ color: 'inherit' }} onClick={deleteMessages}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" sx={{ color: 'inherit' }} onClick={() => setOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

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

              {/* 响应卡片 */}
              {msg.cards && msg.cards.map((card, ci) => (
                <Card key={ci} variant="outlined" sx={{ mt: 1, ml: 1, mr: 4, borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" gutterBottom>{card.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {card.description}
                    </Typography>
                  </CardContent>
                  {card.actionPath && (
                    <CardActions sx={{ px: 2, pb: 1.5 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          navigate(card.actionPath!);
                          setOpen(false);
                        }}
                      >
                        {card.action}
                      </Button>
                    </CardActions>
                  )}
                </Card>
              ))}
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* 输入区域 */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={'输入指令，如"查库存"、"创建工单"...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            inputProps={{ 'data-testid': 'ai-input' }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim()}
            data-testid="ai-send"
          >
            <Send />
          </IconButton>
        </Box>
      </Drawer>
    </>
  );
};

export default AIAssistant;
