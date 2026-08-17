import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 页面渲染错误:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 4,
            textAlign: 'center',
          }}
        >
          <ErrorOutline sx={{ fontSize: 64, color: '#EF4444', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: '#1E293B' }}>
            页面渲染异常
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 1 }}>
            当前页面发生错误，请尝试刷新
          </Typography>
          <Alert severity="error" sx={{ mb: 3, maxWidth: 600, textAlign: 'left', fontSize: '0.8rem' }}>
            {this.state.error?.message || '未知错误'}
          </Alert>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => {
              this.handleReset();
              window.location.reload();
            }}
          >
            刷新页面
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
