import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { FileUpload } from './FileUpload';

/** 与 FileUpload 一致的附件条目结构（无后端，使用本地 objectURL 预览/下载） */
export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface AttachmentUploaderProps {
  label?: string;
  value?: AttachmentItem[];
  onChange?: (files: AttachmentItem[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
  hint?: string;
}

/**
 * 附件上传组件：复用于 FileUpload，提供统一的「附件」分区与说明。
 * 适用于合同扫描件、技术协议、图纸等。无后端时以本地 URL 预览/下载。
 */
const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  label = '附件上传',
  value = [],
  onChange,
  multiple = true,
  maxFiles = 10,
  accept,
  hint = '支持上传合同、技术协议、图纸等；可上传多个文件，点击删除可移除。',
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <AttachFileIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>
        {value.length > 0 && (
          <Typography variant="caption" color="text.secondary">（{value.length} 个文件）</Typography>
        )}
      </Box>
      <FileUpload
        value={value}
        onChange={onChange as (files: any[]) => void}
        multiple={multiple}
        maxFiles={maxFiles}
        accept={accept}
      />
      <Typography variant="caption" color="text.secondary">{hint}</Typography>
    </Paper>
  );
};

export default AttachmentUploader;
