import React, { useMemo } from 'react';
import {
  Autocomplete, TextField, Box, Typography, Paper, Chip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  INCOTERMS_2020, Incoterm, incotermOptionLabel, findIncoterm,
} from '@/constants/incoterms';

interface IncotermsFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** 允许自由输入自定义贸易条件（默认 true） */
  freeSolo?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  /** 是否展示所选术语的中文说明卡片（默认 true） */
  showDescription?: boolean;
  size?: 'small' | 'medium';
  inputProps?: Record<string, any>;
}

/**
 * 贸易条款字段：可选择国际贸易术语（Incoterms 2020）并附带中文说明，
 * 同时允许自由编辑自定义贸易条件（freeSolo）。
 * 存储值为术语缩写（如 FOB）或用户自定义文本。
 */
const IncotermsField: React.FC<IncotermsFieldProps> = ({
  label = '贸易条款',
  value,
  onChange,
  freeSolo = true,
  required = false,
  fullWidth = true,
  placeholder = '选择 Incoterms 2020 术语，或输入自定义贸易条件',
  showDescription = true,
  size = 'small',
  inputProps,
}) => {
  const selected = useMemo<Incoterm | undefined>(() => findIncoterm(value), [value]);

  return (
    <Box>
      <Autocomplete
        size={size}
        freeSolo={freeSolo}
        options={INCOTERMS_2020}
        getOptionLabel={(opt) => (typeof opt === 'string' ? opt : incotermOptionLabel(opt))}
        value={value || ''}
        onChange={(_, v) => {
          if (typeof v === 'string') onChange(v);
          else if (v && typeof v === 'object') onChange((v as Incoterm).code);
          else onChange('');
        }}
        onInputChange={(_, text) => onChange(text)}
        filterOptions={(opts, state) => {
          const q = state.inputValue.trim().toUpperCase();
          if (!q) return opts;
          return opts.filter(
            (o) => o.code.includes(q) || o.cnName.includes(state.inputValue.trim()) || o.enName.toUpperCase().includes(q),
          );
        }}
        renderOption={(props, opt) => (
          <li {...props} key={opt.code}>
            <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {opt.code} - {opt.cnName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {opt.riskTransfer}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Chip size="small" color="primary" label={selected.code} />
            <Typography variant="body2" fontWeight={600}>{selected.cnName}</Typography>
            <Typography variant="caption" color="text.secondary">（{selected.enName} · {selected.transport}）</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <InfoOutlinedIcon fontSize="small" color="action" sx={{ mt: 0.2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              {selected.costSplit}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default IncotermsField;
