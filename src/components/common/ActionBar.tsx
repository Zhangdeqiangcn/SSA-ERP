import React from 'react';
import { Box, Stack, Button } from '@mui/material';
import { Add } from '@mui/icons-material';

interface ActionBarProps {
  primary?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaries?: {
    label: string;
    onClick: () => void;
    variant?: 'outlined' | 'contained' | 'text';
  }[];
  children?: React.ReactNode;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  primary,
  secondaries = [],
  children,
}) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Stack direction="row" spacing={2}>
        {primary && (
          <Button
            variant="contained"
            startIcon={primary.icon || <Add />}
            onClick={primary.onClick}
          >
            {primary.label}
          </Button>
        )}
        {secondaries.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'outlined'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
      {children}
    </Box>
  );
};

export default ActionBar;
