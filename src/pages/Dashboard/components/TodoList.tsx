import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  RequestQuote,
  MoveToInbox,
  ArrowForward,
} from '@mui/icons-material';

interface Task {
  type: string;
  title: string;
  priority: string;
  dueDate: string;
}

interface TodoListProps {
  tasks: Task[];
}

const typeIcons: Record<string, React.ReactNode> = {
  '采购审批': <RequestQuote color="primary" />,
  '入库待确认': <MoveToInbox color="warning" />,
};

const priorityColors: Record<string, 'default' | 'warning' | 'error' | 'info'> = {
  low: 'default',
  normal: 'info',
  high: 'warning',
  urgent: 'error',
};

const priorityLabels: Record<string, string> = {
  low: '低',
  normal: '普通',
  high: '高',
  urgent: '紧急',
};

const TodoList: React.FC<TodoListProps> = ({ tasks }) => {
  return (
    <List>
      {tasks.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">暂无待办事项</Typography>
        </Box>
      ) : (
        tasks.map((task, index) => (
          <ListItem
            key={index}
            sx={{
              borderBottom: index < tasks.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              py: 2,
            }}
            secondaryAction={
              <IconButton edge="end">
                <ArrowForward />
              </IconButton>
            }
          >
            <ListItemIcon sx={{ minWidth: 48 }}>
              {typeIcons[task.type] || <RequestQuote />}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{task.title}</Typography>
                  <Chip
                    label={priorityLabels[task.priority] || task.priority}
                    color={priorityColors[task.priority] || 'default'}
                    size="small"
                  />
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {task.type} · 截止日期：{task.dueDate}
                </Typography>
              }
            />
          </ListItem>
        ))
      )}
    </List>
  );
};

export default TodoList;
