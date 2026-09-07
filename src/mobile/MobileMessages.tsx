import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Stack, List, ListItem, ListItemText, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, IconButton, Divider,
} from '@mui/material';
import { Notifications, MarkChatRead, Send, ArrowBack } from '@mui/icons-material';
import { useMessageStore, isMine } from '@/stores/messageStore';
import { useAuthStore } from '@/stores/authStore';

const TYPE_LABEL: Record<string, string> = { approval: '审批', alert: '预警', announce: '公告', system: '系统' };

/**
 * 移动端消息中心（V2.80.0 W2 真功能，非演示）：
 * 拉取云端 D1 消息（按当前用户可见性过滤），点击标记已读，每 30 秒轮询拉取新消息。
 * 管理员可发布全员公告，演示「真多人共享、移动端即时收到」。
 */
const MobileMessages: React.FC = () => {
  const nav = useNavigate();
  const all = useMessageStore((s) => s.all);
  const loaded = useMessageStore((s) => s.loaded);
  const load = useMessageStore((s) => s.load);
  const send = useMessageStore((s) => s.send);
  const markRead = useMessageStore((s) => s.markRead);
  const markAllRead = useMessageStore((s) => s.markAllRead);
  const user = useAuthStore((s) => s.currentUser);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 30000); // 轮询拉取新消息
    return () => clearInterval(t);
  }, [load]);

  const mine = useMemo(
    () => all.filter((m) => isMine(m, user)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [all, user],
  );
  const unread = mine.filter((m) => !m.read).length;
  const isAdmin = user?.role === 'admin';

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <IconButton onClick={() => nav('/m')} aria-label="返回"><ArrowBack /></IconButton>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          消息中心{unread > 0 && <Chip size="small" color="error" label={unread} sx={{ ml: 1 }} />}
        </Typography>
        {unread > 0 && (
          <Button size="small" startIcon={<MarkChatRead />} onClick={() => markAllRead()}>全部已读</Button>
        )}
      </Stack>

      {!loaded && (
        <Typography variant="caption" color="text.secondary">加载中…</Typography>
      )}

      {loaded && mine.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Notifications sx={{ fontSize: 44, color: '#CBD5E1' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            暂无消息。审批与预警将推送至此。
          </Typography>
        </Paper>
      )}

      <List disablePadding sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {mine.map((m, i) => (
          <React.Fragment key={m.id}>
            {i > 0 && <Divider />}
            <ListItem
              button
              onClick={() => { if (!m.read) markRead(m.id); }}
              sx={{ ...(m.read ? {} : { bgcolor: '#EFF6FF' }) }}
            >
              <ListItemText
                primary={(
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={TYPE_LABEL[m.type] || m.type} color={m.read ? 'default' : 'primary'} />
                    <Typography variant="body2" fontWeight={700}>{m.title}</Typography>
                  </Stack>
                )}
                secondary={(
                  <>
                    <span>{m.body}</span>
                    <br />
                    <Typography component="span" variant="caption" color="text.secondary">
                      {m.senderName} · {m.createdAt?.slice(0, 16).replace('T', ' ')}
                    </Typography>
                  </>
                )}
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          </React.Fragment>
        ))}
      </List>

      {isAdmin && (
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2, borderRadius: 3 }}
          startIcon={<Send />}
          onClick={() => setOpen(true)}
        >
          发布全员公告
        </Button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>发布全员公告</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="标题" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mt: 1 }} />
          <TextField
            fullWidth multiline minRows={3} size="small" label="内容" value={body}
            onChange={(e) => setBody(e.target.value)} sx={{ mt: 1.5 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button
            variant="contained"
            disabled={!title.trim()}
            onClick={() => {
              send({ title: title.trim(), body: body.trim(), type: 'announce', recipientRole: null });
              setOpen(false); setTitle(''); setBody('');
            }}
          >
            发布
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileMessages;
