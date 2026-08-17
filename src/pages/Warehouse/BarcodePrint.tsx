import React, { useState, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button, Select, MenuItem, FormControl,
  InputLabel, Alert, Stack, Divider, IconButton, Chip,
} from '@mui/material';
import { Print, Delete, Refresh, QrCode2 } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useMaterialStore } from '@/stores/materialStore';

// ===== Code 39（3-of-9）编码表 =====
// 每个字符 = 9 个元素（bar,space,bar,space,bar,space,bar,space,bar），
// 恰好 3 个为宽（w），其余为窄（n）。起始/终止符为 '*'。
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw',
  'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn', 'G': 'nnnnwnwnw', 'H': 'wnnnwnwnn',
  'I': 'nnwnwnwnn', 'J': 'nnnnwwnwnn',
  'K': 'wnnnnnwnw', 'L': 'nnwnnnwnw', 'M': 'wnwnnnwnn', 'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn', 'Q': 'nnnnwnnwn', 'R': 'wnnnwnnwn',
  'S': 'nnwnnwnwn', 'T': 'nnnnwwnwn',
  'U': 'wwnnnnnwn', 'V': 'nwwnnnnwn', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnwn',
  'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
  '-': 'nnnwnwnwn', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn', '/': 'wnwnwnnnn', '+': 'nwnwnnnwn', '%': 'nwnnnwnwn',
  '*': 'nwnnwnwnw',
};

const NARROW = 2;
const WIDE = 6;
const QUIET = 10;
const GAP = 2;
const BAR_HEIGHT = 80;
const STORAGE_KEY = 'ssa-erp-barcodes';

interface RecentLabel { content: string; savedAt: string; }

const ALLOWED = /^[A-Z0-9\-.$/+% ]*$/;

interface BarRect { x: number; w: number; }

function buildBarcode(content: string): { rects: BarRect[]; width: number; display: string } {
  const data = content.toUpperCase();
  const chars = ['*', ...data.split(''), '*'];
  const rects: BarRect[] = [];
  let x = QUIET;
  for (const ch of chars) {
    const pattern = CODE39[ch];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const isWide = pattern[i] === 'w';
      const w = isWide ? WIDE : NARROW;
      if (i % 2 === 0) {
        rects.push({ x, w });
      }
      x += w;
    }
    x += GAP;
  }
  const width = x + QUIET;
  return { rects, width, display: data };
}

const BarcodePrint: React.FC = () => {
  const materials = useMaterialStore((s) => s.materials);
  const [content, setContent] = useState<string>('');
  const [rendered, setRendered] = useState<{ rects: BarRect[]; width: number; display: string } | null>(null);
  const [recent, setRecent] = useState<RecentLabel[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RecentLabel[]) : [];
    } catch {
      return [];
    }
  });

  const invalid = useMemo(() => {
    const up = content.toUpperCase();
    return up.length > 0 && !ALLOWED.test(up);
  }, [content]);

  const handleGenerate = () => {
    if (!content.trim() || invalid) return;
    const result = buildBarcode(content);
    setRendered(result);
    const entry: RecentLabel = { content: content.toUpperCase(), savedAt: new Date().toISOString() };
    const next = [entry, ...recent.filter((r) => r.content !== entry.content)].slice(0, 30);
    setRecent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleReprint = (c: string) => {
    setContent(c);
    setRendered(buildBarcode(c));
  };

  const handleDelete = (idx: number) => {
    const next = recent.filter((_, i) => i !== idx);
    setRecent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleMaterial = (code: string) => {
    setContent(code);
  };

  return (
    <PageWrapper title="条码打印（Code 39）">
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Stack spacing={2.5}>
            <FormControl fullWidth>
              <InputLabel>从物料选择（可选）</InputLabel>
              <Select
                value=""
                label="从物料选择（可选）"
                onChange={(e) => handleMaterial(e.target.value)}
              >
                {materials.map((m) => (
                  <MenuItem key={m.id} value={m.code}>{m.code} · {m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="条码内容"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="仅支持 A-Z 0-9 及 - . $ / + % 和空格"
              fullWidth
              error={invalid}
              helperText={invalid ? '包含非法字符，请仅使用大写字母、数字及 - . $ / + % 与空格' : ''}
            />
            {invalid && (
              <Alert severity="warning">条码内容包含不支持的字符，将不能生成。</Alert>
            )}
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<QrCode2 />}
                disabled={!content.trim() || invalid}
                onClick={handleGenerate}
                sx={{ bgcolor: '#3B82F6' }}
              >
                生成条码
              </Button>
              <Button
                variant="outlined"
                startIcon={<Print />}
                disabled={!rendered}
                onClick={() => window.print()}
              >
                打印标签
              </Button>
            </Stack>
          </Stack>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!rendered ? (
              <Typography color="text.secondary">输入内容后点击“生成条码”预览标签。</Typography>
            ) : (
              <Box id="barcode-label" sx={{ width: '100%', overflowX: 'auto' }}>
                <svg
                  width={rendered.width}
                  height={BAR_HEIGHT + 24}
                  viewBox={`0 0 ${rendered.width} ${BAR_HEIGHT + 24}`}
                  role="img"
                  aria-label={`条形码 ${rendered.display}`}
                >
                  <rect x={0} y={0} width={rendered.width} height={BAR_HEIGHT + 24} fill="#ffffff" />
                  {rendered.rects.map((r, i) => (
                    <rect key={i} x={r.x} y={0} width={r.w} height={BAR_HEIGHT} fill="#000000" />
                  ))}
                  <text
                    x={rendered.width / 2}
                    y={BAR_HEIGHT + 18}
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontSize="16"
                    fill="#000000"
                  >
                    {rendered.display}
                  </text>
                </svg>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>最近标签</Typography>
          {recent.length === 0 ? (
            <Typography variant="body2" color="text.secondary">暂无生成的标签。</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {recent.map((r, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 200 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Chip label={r.content} size="small" sx={{ mb: 0.5, fontFamily: 'monospace' }} />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {new Date(r.savedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Stack direction="row">
                      <IconButton size="small" color="primary" onClick={() => handleReprint(r.content)}>
                        <Refresh fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Box>
          )}
        </Grid>
      </Grid>
    </PageWrapper>
  );
};

export default BarcodePrint;
