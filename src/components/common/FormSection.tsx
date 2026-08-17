import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  defaultValues?: Record<string, unknown>;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  defaultValues,
}) => {
  const methods = useForm({ defaultValues });

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <FormProvider {...methods}>
        <Box sx={{ pl: 1 }}>{children}</Box>
      </FormProvider>
    </Box>
  );
};

export default FormSection;
