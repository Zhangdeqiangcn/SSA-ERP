import React from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Alert, IconButton,
} from '@mui/material';
import { Close, Download, VisibilityOff } from '@mui/icons-material';

export interface PreviewFile {
  id?: string;
  name: string;
  url?: string;
  type: string;
  size?: number;
  uploadedAt?: string;
}

interface FilePreviewModalProps {
  open: boolean;
  file: PreviewFile | null;
  /** 是否允许下载（由系统设置的下载策略决定） */
  downloadAllowed: boolean;
  onClose: () => void;
}

const isImage = (f: PreviewFile) =>
  (f.type && f.type.startsWith('image/')) ||
  /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name);
const isPdf = (f: PreviewFile) =>
  f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ open, file, downloadAllowed, onClose }) => {
  if (!file) return null;
  const previewable = isImage(file) || isPdf(file);

  const handleDownload = () => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {previewable ? (
          isPdf(file) ? (
            <Box sx={{ width: '100%', height: '60vh', bgcolor: '#525659', borderRadius: 1 }}>
              {file.url ? (
                <iframe src={file.url} title={file.name} width="100%" height="100%" style={{ border: 0, borderRadius: 4 }} />
              ) : (
                <Box sx={{ p: 3, color: '#fff' }}>预览地址不可用</Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              {file.url ? (
                <img src={file.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 4 }} />
              ) : (
                <Alert severity="warning">预览地址不可用</Alert>
              )}
            </Box>
          )
        ) : (
          <Alert severity="info" icon={<VisibilityOff />}>
            该文件格式（{file.type || '未知'}）不支持在线预览，请{downloadAllowed ? '点击下方按钮下载后查看' : '联系发件方获取'}。
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {!previewable && downloadAllowed && (
          <Button variant="contained" startIcon={<Download />} onClick={handleDownload} disabled={!file.url}>下载文件</Button>
        )}
        {!downloadAllowed && !previewable && (
          <Button disabled startIcon={<VisibilityOff />}>下载受限</Button>
        )}
        {previewable && downloadAllowed && (
          <Button variant="outlined" startIcon={<Download />} onClick={handleDownload} disabled={!file.url}>下载</Button>
        )}
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreviewModal;
