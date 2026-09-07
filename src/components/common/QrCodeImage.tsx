import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { toDataURL } from 'qrcode';

interface Props {
  /** 二维码内容（如移动门户完整 URL） */
  value: string;
  /** 显示尺寸（px） */
  size?: number;
  /** 深色模块颜色 */
  dark?: string;
  /** 背景色 */
  light?: string;
}

/**
 * 真实二维码组件（qrcode 库生成、可被任意手机/扫码器识别）。
 * 取代 V2.76.x MobileTab 里的「伪二维码点阵」（那是确定性随机图形，不可扫）。
 */
const QrCodeImage: React.FC<Props> = ({ value, size = 160, dark = '#0F172A', light = '#FFFFFF' }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let alive = true;
    setError('');
    setDataUrl('');
    toDataURL(value, {
      width: Math.max(size * 2, 256), // 2x 渲染保清晰
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark, light },
    })
      .then((url) => { if (alive) setDataUrl(url); })
      .catch((e: unknown) => { if (alive) setError(String((e as Error)?.message || e)); });
    return () => { alive = false; };
  }, [value, size, dark, light]);

  if (error) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff', borderRadius: 1 }}>
        <Typography variant="caption" color="error">二维码生成失败</Typography>
      </Box>
    );
  }
  if (!dataUrl) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff', borderRadius: 1 }}>
        <CircularProgress size={22} />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={dataUrl}
      alt={`二维码：${value}`}
      sx={{ width: size, height: size, borderRadius: 1, display: 'block' }}
    />
  );
};

export default QrCodeImage;
