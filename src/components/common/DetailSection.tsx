import React from 'react';
import { Box, Typography, Grid } from '@mui/material';

interface DetailField {
  label: string;
  value: React.ReactNode;
}

interface DetailSectionProps {
  title?: string;
  fields: DetailField[];
  columns?: 1 | 2 | 3 | 4;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  fields,
  columns = 2,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      <Grid container spacing={2}>
        {fields.map((field, index) => (
          <Grid item xs={12 / columns} key={index}>
            <Box sx={{ display: 'flex' }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  minWidth: 100,
                  flexShrink: 0,
                }}
              >
                {field.label}：
              </Typography>
              {/* 值可能含 Chip/Box 等块级元素，用 div 渲染避免 <p> 内嵌 <div> 的 DOM 嵌套告警 */}
              <Typography variant="body2" component="div">{field.value || '-'}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DetailSection;
