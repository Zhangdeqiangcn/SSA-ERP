import React from 'react';
import {
  Box, Typography, Grid, TextField, MenuItem, FormControlLabel, Switch, Divider,
} from '@mui/material';
import { useCustomFields, CustomFieldEntity } from '@/stores/customFieldStore';

interface CustomFieldsSectionProps {
  entity: CustomFieldEntity;
  value?: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  /** 是否校验必填（保存时传 true） */
  validate?: boolean;
  onError?: (msg: string | null) => void;
}

/**
 * 自定义字段渲染区：根据设置页配置的字段定义，在当前实体表单上动态渲染并收集值。
 * 用法：在表单中维护 customFields state，传 value/onChange 即可。
 */
const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  entity,
  value = {},
  onChange,
  validate = false,
  onError,
}) => {
  const defs = useCustomFields(entity);

  if (defs.length === 0) return null;

  const setVal = (key: string, v: unknown) => {
    onChange({ ...value, [key]: v });
  };

  // 必填校验
  let requiredError: string | null = null;
  if (validate) {
    for (const def of defs) {
      if (def.required) {
        const v = value[def.key];
        const empty = v === undefined || v === null || v === '' || (def.type === 'checkbox' && v === false);
        if (empty) {
          requiredError = `「${def.label}」为必填项`;
          break;
        }
      }
    }
  }
  if (onError) onError(requiredError);

  return (
    <Box>
      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">自定义字段</Typography>
      </Divider>
      <Grid container spacing={2}>
        {defs.map((def) => {
          const v = value[def.key];
          switch (def.type) {
            case 'number':
              return (
                <Grid item xs={12} md={6} key={def.key}>
                  <TextField
                    fullWidth type="number" label={def.label}
                    placeholder={def.placeholder} value={v ?? ''}
                    onChange={(e) => setVal(def.key, Number(e.target.value))}
                    required={def.required}
                  />
                </Grid>
              );
            case 'date':
              return (
                <Grid item xs={12} md={6} key={def.key}>
                  <TextField
                    fullWidth type="date" label={def.label}
                    InputLabelProps={{ shrink: true }}
                    value={(v as string) ?? ''}
                    onChange={(e) => setVal(def.key, e.target.value)}
                    required={def.required}
                  />
                </Grid>
              );
            case 'textarea':
              return (
                <Grid item xs={12} key={def.key}>
                  <TextField
                    fullWidth multiline rows={3} label={def.label}
                    placeholder={def.placeholder} value={(v as string) ?? ''}
                    onChange={(e) => setVal(def.key, e.target.value)}
                    required={def.required}
                  />
                </Grid>
              );
            case 'select':
              return (
                <Grid item xs={12} md={6} key={def.key}>
                  <TextField
                    fullWidth select label={def.label}
                    value={(v as string) ?? ''}
                    onChange={(e) => setVal(def.key, e.target.value)}
                    required={def.required}
                  >
                    {(def.options || []).map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              );
            case 'checkbox':
              return (
                <Grid item xs={12} md={6} key={def.key}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!v}
                        onChange={(e) => setVal(def.key, e.target.checked)}
                      />
                    }
                    label={def.label}
                  />
                </Grid>
              );
            case 'text':
            default:
              return (
                <Grid item xs={12} md={6} key={def.key}>
                  <TextField
                    fullWidth label={def.label}
                    placeholder={def.placeholder}
                    value={(v as string) ?? ''}
                    onChange={(e) => setVal(def.key, e.target.value)}
                    required={def.required}
                  />
                </Grid>
              );
          }
        })}
      </Grid>
    </Box>
  );
};

export default CustomFieldsSection;
