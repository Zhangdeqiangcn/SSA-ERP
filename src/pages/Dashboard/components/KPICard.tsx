import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: string;
  suffix?: string;
  formatCurrency?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, trend, color = '#3B82F6', suffix, formatCurrency }) => {
  const displayValue = formatCurrency
    ? new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
    : suffix
      ? `${value}${suffix}`
      : value;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        position: 'relative', 
        overflow: 'hidden',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1, 
                color: '#64748B',
                fontSize: '0.8125rem',
                fontWeight: 500,
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: '#1E293B',
                fontSize: suffix || formatCurrency ? '1.4rem' : '1.875rem',
                letterSpacing: '-0.025em',
              }}
            >
              {displayValue}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5 }}>
                {trend.direction === 'up' ? (
                  <TrendingUp sx={{ fontSize: 16, color: '#10B981', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: '#EF4444', mr: 0.5 }} />
                )}
                <Typography
                  variant="caption"
                  sx={{ 
                    color: trend.direction === 'up' ? '#10B981' : '#EF4444',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                >
                  {trend.direction === 'up' ? '+' : '-'}{trend.value}%
                </Typography>
                <Typography variant="caption" sx={{ ml: 0.5, color: '#94A3B8', fontSize: '0.75rem' }}>
                  较上月
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}15`,
              color,
              width: 52,
              height: 52,
              borderRadius: 3,
            }}
          >
            {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 24 } })}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

export default KPICard;
