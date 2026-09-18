import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Chip, Alert, Snackbar, Divider, Stack,
} from '@mui/material';
import {
  MenuBook, History, ContentCopy, InfoOutlined, Storage, CloudQueue, Code,
} from '@mui/icons-material';
import { APP_NAME, APP_VERSION, APP_VERSION_LABEL, APP_BUILD_DATE } from '@/version';

/**
 * 系统信息（设置 → 帮助中心 → 系统信息）
 * ------------------------------------------------------------
 * 背景：早期把版本号直接印在顶栏、侧边栏、工作台页头等处（多为硬编码），
 * 每次升级都要改多处、极易漏改，导致界面显示「v2.0」这类过期版本号，反而误导用户。
 * 现约定：**界面不再展示版本号**，版本信息统一在本页查询（单一出口、单一数据源
 * src/version.ts），需要报障时可直接「复制版本信息」发给维护人员。
 */

const COPY_TEXT_LABEL = '复制版本信息';

interface InfoRow {
  label: string;
  value: string;
  hint?: string;
}

const SystemInfoTab: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const isProd = import.meta.env.PROD;
  const host = typeof window !== 'undefined' ? window.location.host : '-';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  // 浏览器信息只取「名称 + 主版本」，避免把整条 UA 甩给用户
  const browser = (() => {
    const m = ua.match(/(Edg|Chrome|Firefox|Safari)\/([\d.]+)/);
    if (!m) return '未知浏览器';
    const nameMap: Record<string, string> = { Edg: 'Edge', Chrome: 'Chrome', Firefox: 'Firefox', Safari: 'Safari' };
    const ver = m[1] === 'Safari' ? (ua.match(/Version\/([\d.]+)/)?.[1] ?? m[2]) : m[2];
    return `${nameMap[m[1]] ?? m[1]} ${ver.split('.').slice(0, 2).join('.')}`;
  })();

  const releaseDate = APP_BUILD_DATE;

  const rows: InfoRow[] = [
    { label: '产品名称', value: APP_NAME },
    { label: '系统版本', value: `${APP_VERSION_LABEL}（${APP_VERSION}）`, hint: '系统唯一版本来源，界面其他地方不再展示版本号' },
    { label: '发布日期', value: releaseDate, hint: '当前运行版本的构建日期' },
    { label: '运行环境', value: isProd ? '生产环境' : '本地开发环境', hint: isProd ? `站点：${host}` : `访问地址：${host}` },
    { label: '浏览器', value: browser, hint: '报障时建议一并提供' },
  ];

  const arch: InfoRow[] = [
    { label: '前端架构', value: 'React 18 + TypeScript + Vite + MUI v5' },
    { label: '后端服务', value: 'Cloudflare Pages Functions（无服务器函数）' },
    { label: '数据存储', value: 'Cloudflare D1（SQLite 兼容数据库）' },
  ];

  const copyAll = async () => {
    const text = [
      `产品名称：${APP_NAME}`,
      `系统版本：${APP_VERSION_LABEL}（${APP_VERSION}）`,
      `发布日期：${releaseDate}`,
      `运行环境：${isProd ? '生产环境' : '本地开发环境'}（${host}）`,
      `浏览器：${browser}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>系统信息</Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.3 }}>
            这里可以查到当前正在使用的系统版本；为免版本号过期误导，界面其他位置不再显示版本号。
          </Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<ContentCopy />} onClick={copyAll}>
          {COPY_TEXT_LABEL}
        </Button>
      </Box>

      <Alert severity="info" icon={<InfoOutlined fontSize="inherit" />} sx={{ mb: 2.5, borderRadius: 2 }}>
        需要反馈问题或申请支持时，请点击右上角「{COPY_TEXT_LABEL}」，把版本与运行环境信息一并提供给维护人员，便于快速定位。
      </Alert>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1E293B' }}>版本与运行环境</Typography>
        <Stack divider={<Divider flexItem />} spacing={0}>
          {rows.map((r) => (
            <Box key={r.label} sx={{ display: 'flex', alignItems: 'flex-start', py: 1.2, gap: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748B', minWidth: 96, flexShrink: 0 }}>{r.label}</Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: '#1E293B', fontWeight: 600, wordBreak: 'break-all' }}>
                  {r.label === '系统版本'
                    ? (
                      <Chip
                        label={r.value}
                        size="small"
                        data-testid="sys-version-chip"
                        sx={{ bgcolor: '#EFF6FF', color: '#3B82F6', fontWeight: 600 }}
                      />
                    )
                    : r.value}
                </Typography>
                {r.hint && (
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.3 }}>{r.hint}</Typography>
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#1E293B' }}>技术架构</Typography>
        <Stack divider={<Divider flexItem />} spacing={0}>
          {arch.map((r, i) => (
            <Box key={r.label} sx={{ display: 'flex', alignItems: 'center', py: 1.2, gap: 2 }}>
              <Box sx={{ color: '#94A3B8', display: 'flex' }}>
                {i === 0 ? <Code fontSize="small" /> : i === 1 ? <CloudQueue fontSize="small" /> : <Storage fontSize="small" />}
              </Box>
              <Typography variant="body2" sx={{ color: '#64748B', minWidth: 80, flexShrink: 0 }}>{r.label}</Typography>
              <Typography variant="body2" sx={{ color: '#1E293B' }}>{r.value}</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#1E293B' }}>文档与变更记录</Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
          每次升级都会在「使用说明书 → 版本更新记录」中登记本次变更内容与原因，建议升级后先查阅该章节。
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" size="small" startIcon={<MenuBook />} onClick={() => navigate('/help/manual')}>
            打开使用说明书
          </Button>
          <Button variant="outlined" size="small" startIcon={<History />} onClick={() => navigate('/help/manual')}>
            查看版本更新记录
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="版本信息已复制到剪贴板"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default SystemInfoTab;
