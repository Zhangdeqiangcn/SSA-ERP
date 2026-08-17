import React, { useMemo } from 'react';
import {
  Autocomplete, TextField, Box, Typography, Paper, Chip,
} from '@mui/material';
import {
  QualityStandard, QUALITY_STANDARDS, qualityOptionLabel, findQualityStandard,
} from '@/constants/qualityStandards';

interface QualityStandardFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  freeSolo?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  showDescription?: boolean;
  size?: 'small' | 'medium';
  inputProps?: Record<string, any>;
}

/**
 * 质量标准字段：可选择常用质量标准（GB / ASTM / JIS / ISO / 企标 等）并附带说明，
 * 同时允许自由编辑自定义标准（freeSolo）。
 * 存储值为标准代号（如 GB/T 19001）或用户自定义文本。
 */
const QualityStandardField: React.FC<QualityStandardFieldProps> = ({
  label = '质量标准',
  value,
  onChange,
  freeSolo = true,
  required = false,
  fullWidth = true,
  placeholder = '选择质量标准，或输入自定义要求',
  showDescription = true,
  size = 'small',
  inputProps,
}) => {
  const selected = useMemo<QualityStandard | undefined>(() => findQualityStandard(value), [value]);

  return (
    <Box>
      <Autocomplete
        size={size}
        freeSolo={freeSolo}
        options={QUALITY_STANDARDS}
        getOptionLabel={(opt) => (typeof opt === 'string' ? opt : qualityOptionLabel(opt))}
        value={value || ''}
        onChange={(_, v) => {
          if (typeof v === 'string') onChange(v);
          else if (v && typeof v === 'object') onChange((v as QualityStandard).code);
          else onChange('');
        }}
        onInputChange={(_, text) => onChange(text)}
        renderOption={(props, opt) => (
          <li {...props} key={opt.code}>
            <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {opt.code} - {opt.cnName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {opt.description}
              </Typography>
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            fullWidth={fullWidth}
            inputProps={{ ...params.inputProps, ...inputProps }}
          />
        )}
      />

      {showDescription && selected && (
        <Paper
          variant="outlined"
          sx={{ mt: 1, p: 1.25, bgcolor: 'background.default', borderColor: 'divider' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
            <Chip size="small" color="secondary" label={selected.code} />
            <Typography variant="body2" fontWeight={600}>{selected.cnName}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {selected.description}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default QualityStandardField;
