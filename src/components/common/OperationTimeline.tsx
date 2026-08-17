import React from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import { Box, Typography, Paper } from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Info,
} from '@mui/icons-material';

interface TimelineEvent {
  id: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'info';
  operator: string;
  time: string;
  description: string;
}

interface OperationTimelineProps {
  title?: string;
  events: TimelineEvent[];
}

const actionIcons = {
  create: <Add />,
  update: <Edit />,
  delete: <Delete />,
  approve: <CheckCircle />,
  reject: <Cancel />,
  info: <Info />,
};

const actionColors = {
  create: 'success',
  update: 'primary',
  delete: 'error',
  approve: 'success',
  reject: 'error',
  info: 'info',
} as const;

export const OperationTimeline: React.FC<OperationTimelineProps> = ({
  title,
  events,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      <Timeline position="alternate">
        {events.map((event) => (
          <TimelineItem key={event.id}>
            <TimelineOppositeContent sx={{ m: 'auto 0' }}>
              {event.time}
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineConnector />
              <TimelineDot color={actionColors[event.action]}>
                {actionIcons[event.action]}
              </TimelineDot>
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2">{event.operator}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {event.description}
                </Typography>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Box>
  );
};

export default OperationTimeline;
