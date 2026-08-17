import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Delete,
  Download,
} from '@mui/icons-material';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface FileUploadProps {
  value?: FileItem[];
  onChange?: (files: FileItem[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileUpload: React.FC<FileUploadProps> = ({
  value = [],
  onChange,
  multiple = true,
  maxFiles = 10,
  accept,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<FileItem[]>(value);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles) return;

      const newFiles: FileItem[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        newFiles.push({
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
        });
      }

      setUploading(true);
      setProgress(0);

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setProgress(i);
      }

      const updatedFiles = multiple ? [...files, ...newFiles] : newFiles;
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
      setUploading(false);
      event.target.value = '';
    },
    [files, multiple, onChange]
  );

  const handleDelete = (fileId: string) => {
    const updatedFiles = files.filter((f) => f.id !== fileId);
    setFiles(updatedFiles);
    onChange?.(updatedFiles);
  };

  const handleDownload = (file: FileItem) => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };

  return (
    <Box>
      <Box
        sx={{
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          p: 3,
          textAlign: 'center',
          bgcolor: 'background.default',
          mb: 2,
        }}
      >
        <input
          type="file"
          id="file-upload"
          multiple={multiple}
          accept={accept}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={uploading || (multiple && files.length >= maxFiles)}
        />
        <label htmlFor="file-upload">
          <Button
            component="span"
            variant="outlined"
            startIcon={<CloudUpload />}
            disabled={uploading || (multiple && files.length >= maxFiles)}
          >
            选择文件
          </Button>
        </label>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {multiple ? `最多上传 ${maxFiles} 个文件` : '只能上传一个文件'}
        </Typography>
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary">
              上传中... {progress}%
            </Typography>
          </Box>
        )}
      </Box>

      {files.length > 0 && (
        <List dense>
          {files.map((file) => (
            <ListItem
              key={file.id}
              secondaryAction={
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(file)}
                    disabled={!file.url}
                  >
                    <Download fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <ListItemIcon>
                <InsertDriveFile color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={file.name}
                secondary={formatFileSize(file.size)}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FileUpload;
