import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert,
  Box, Typography, Chip, Stack,
} from '@mui/material';
import { PhotoCamera, Stop, Keyboard } from '@mui/icons-material';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

interface BarcodeDetectorResult { rawValue: string }
interface BarcodeDetectorLike { detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]> }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

interface Props {
  open: boolean;
  onClose: () => void;
  /** 识别成功回调（同码去重由组件内部短窗去重，业务侧仍可再做校验） */
  onDetect: (text: string) => void;
  title?: string;
}

const SCAN_INTERVAL_MS = 300;
const DUP_WINDOW_MS = 1500;

/**
 * 真扫码组件（V2.78.0，取代 MobileTab 时期的「假 PDA 示意」）。
 * 三通道：
 *  ① 原生 BarcodeDetector（Chrome/Edge/新版安卓 PDA，零依赖、速度快）；
 *  ② ZXing 软件解码兜底（覆盖 Safari/旧安卓；支持 Code 39——本项目「条码打印」
 *     生成的是 Code 39 物料标签，jsQR 仅支持 QR 二维码扫不了它，故选 ZXing 超集）；
 *  ③ 手动输入框（外接扫码枪本就是键盘输入，聚焦后扫码即回车提交；无摄像头环境也可用）。
 * 摄像头要求 HTTPS（或 localhost）安全上下文，非安全上下文给出明确提示并降级手动输入。
 */
const BarcodeScanner: React.FC<Props> = ({ open, onClose, onDetect, title = '扫码' }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastHitRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const [engine, setEngine] = useState<'native' | 'zxing' | 'none'>('none');
  const [error, setError] = useState<string>('');
  const [manual, setManual] = useState('');

  const emit = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    const now = Date.now();
    if (lastHitRef.current.text === t && now - lastHitRef.current.at < DUP_WINDOW_MS) return; // 短窗去重
    lastHitRef.current = { text: t, at: now };
    onDetect(t);
  }, [onDetect]);

  // ── 打开/关闭生命周期 ──────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const cleanup = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (zxingRef.current) { try { zxingRef.current.reset(); } catch { /* ignore */ } zxingRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      detectorRef.current = null;
    };

    const start = async () => {
      setError('');
      setManual('');
      // 安全上下文检查（摄像头 getUserMedia 要求 HTTPS / localhost）
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        setEngine('none');
        setError('当前页面不是 HTTPS 安全上下文，浏览器不允许调用摄像头。请用 https:// 地址打开，或直接用下方手动输入 / 扫码枪。');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setEngine('none');
        setError('当前浏览器不支持摄像头调用，请用下方手动输入 / 扫码枪。');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, // 优先后置摄像头
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => { /* autoplay 失败由用户点按恢复 */ });

        const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (Ctor) {
          try {
            detectorRef.current = new Ctor({
              formats: ['code_39', 'code_128', 'qr_code', 'ean_13', 'data_matrix', 'itf'],
            });
            setEngine('native');
            timerRef.current = setInterval(async () => {
              const v = videoRef.current;
              const d = detectorRef.current;
              if (!v || !d || v.readyState < 2) return;
              try {
                const hits = await d.detect(v);
                if (hits.length > 0) emit(hits[0].rawValue);
              } catch { /* 单帧失败忽略，下帧重试 */ }
            }, SCAN_INTERVAL_MS);
            return;
          } catch { /* 原生检测器构造失败 → 降级 ZXing */ }
        }
        // ② ZXing 软件解码兜底
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13, BarcodeFormat.DATA_MATRIX, BarcodeFormat.ITF,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, SCAN_INTERVAL_MS);
        zxingRef.current = reader;
        setEngine('zxing');
        await reader.decodeFromStream(stream, video, (result) => {
          if (result) emit(result.getText());
        });
      } catch (e: unknown) {
        if (cancelled) return;
        const name = (e as DOMException)?.name || '';
        if (name === 'NotAllowedError') setError('摄像头权限被拒绝。请在浏览器地址栏授权摄像头，或直接用下方手动输入 / 扫码枪。');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError('未找到可用摄像头。可直接用下方手动输入 / 外接扫码枪。');
        else setError(`摄像头启动失败：${String((e as Error)?.message || e)}`);
        setEngine('none');
      }
    };
    start();
    return () => { cancelled = true; cleanup(); };
  }, [open, emit]);

  const handleClose = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (zxingRef.current) { try { zxingRef.current.reset(); } catch { /* ignore */ } zxingRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent sx={{ px: 2 }}>
        <Stack spacing={1.5}>
          {error && <Alert severity="warning" icon={<Keyboard />}>{error}</Alert>}
          <Box sx={{
            position: 'relative', width: '100%', pt: '75%', bgcolor: '#0F172A',
            borderRadius: 2, overflow: 'hidden',
          }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* 取景框：中央横线 + 四角提示 */}
            <Box sx={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Box sx={{ position: 'relative', width: '72%', height: '34%' }}>
                <Box sx={{ position: 'absolute', left: '6%', right: '6%', top: '50%', height: 2, bgcolor: 'rgba(59,130,246,.85)', boxShadow: '0 0 8px rgba(59,130,246,.9)' }} />
                {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((k) => {
                  const pos: React.CSSProperties = {
                    topLeft: { top: 0, left: 0, borderLeft: 3, borderTop: 3 },
                    topRight: { top: 0, right: 0, borderRight: 3, borderTop: 3 },
                    bottomLeft: { bottom: 0, left: 0, borderLeft: 3, borderBottom: 3 },
                    bottomRight: { bottom: 0, right: 0, borderRight: 3, borderBottom: 3 },
                  }[k];
                  return <Box key={k} sx={{ position: 'absolute', width: 22, height: 22, borderColor: '#3B82F6', ...pos }} />;
                })}
              </Box>
            </Box>
            {engine !== 'none' && (
              <Chip
                size="small"
                icon={<PhotoCamera />}
                label={engine === 'native' ? '原生扫码引擎' : 'ZXing 扫码引擎'}
                sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(15,23,42,.7)', color: '#E2E8F0' }}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            对准物料标签（Code 39 条码 / 二维码），识别后自动填入。外接扫码枪可在下方输入框直接扫码回车。
          </Typography>
          <form onSubmit={(e) => { e.preventDefault(); emit(manual); setManual(''); }}>
            <TextField
              label="手动输入 / 扫码枪"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              fullWidth
              size="small"
              autoFocus
              placeholder="如 MAT202405010001"
            />
          </form>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button startIcon={<Stop />} onClick={handleClose} variant="contained" fullWidth>结束扫码</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;
