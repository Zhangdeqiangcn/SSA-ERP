import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Typography, Paper, TextField, InputAdornment, List, ListItemButton,
  ListItemIcon, ListItemText, Chip, Divider, useTheme, alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Dashboard from '@mui/icons-material/Dashboard';
import Inventory2 from '@mui/icons-material/Inventory2';
import Storefront from '@mui/icons-material/Storefront';
import ShoppingCart from '@mui/icons-material/ShoppingCart';
import MonetizationOn from '@mui/icons-material/MonetizationOn';
import Warehouse from '@mui/icons-material/Warehouse';
import PrecisionManufacturing from '@mui/icons-material/PrecisionManufacturing';
import FactCheck from '@mui/icons-material/FactCheck';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Assessment from '@mui/icons-material/Assessment';
import Settings from '@mui/icons-material/Settings';
import {
  MANUAL_MODULES, BLOCK_LABEL, BLOCK_COLOR,
  type ManualModule, type ManualSection, type ManualBlock,
} from '@/content/manual';

const MODULE_ICON: Record<string, React.ReactNode> = {
  Dashboard: <Dashboard fontSize="small" />,
  Inventory2: <Inventory2 fontSize="small" />,
  Storefront: <Storefront fontSize="small" />,
  ShoppingCart: <ShoppingCart fontSize="small" />,
  MonetizationOn: <MonetizationOn fontSize="small" />,
  Warehouse: <Warehouse fontSize="small" />,
  PrecisionManufacturing: <PrecisionManufacturing fontSize="small" />,
  FactCheck: <FactCheck fontSize="small" />,
  AccountBalance: <AccountBalance fontSize="small" />,
  Assessment: <Assessment fontSize="small" />,
  Settings: <Settings fontSize="small" />,
};

const BlockCard: React.FC<{ block: ManualBlock }> = ({ block }) => {
  const color = BLOCK_COLOR[block.kind];
  return (
    <Paper
      variant="outlined"
      sx={{ mb: 1.5, borderLeft: `4px solid ${color}`, bgcolor: alpha(color, 0.04) }}
    >
      <Box sx={{ px: 2, py: 1 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color, letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          {BLOCK_LABEL[block.kind]}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
          {block.text}
        </Typography>
      </Box>
    </Paper>
  );
};

const SectionCard: React.FC<{ section: ManualSection }> = ({ section }) => (
  <Box
    id={`sec-${section.id}`}
    component="section"
    sx={{ scrollMarginTop: 16, mb: 3 }}
  >
    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
      {section.title}
    </Typography>
    <Divider sx={{ mb: 1.5 }} />
    {section.blocks.map((b, i) => (
      <BlockCard key={i} block={b} />
    ))}
  </Box>
);

const UserManual: React.FC = () => {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const [query, setQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  // V3.70.0：全局搜索跳「/help/manual#sec-xxx」自动定位到命中章节（内容水合后滚一次）
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#sec-')) return;
    const timer = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const filtered: ManualModule[] = useMemo(() => {
    if (!q) return MANUAL_MODULES;
    return MANUAL_MODULES.map((m) => ({
      ...m,
      sections: m.sections.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.blocks.some((b) => b.text.toLowerCase().includes(q) || BLOCK_LABEL[b.kind].toLowerCase().includes(q))
      ),
    })).filter((m) => m.sections.length > 0);
  }, [q]);

  const totalSections = filtered.reduce((acc, m) => acc + m.sections.length, 0);

  const scrollTo = (moduleId: string) => {
    const el = document.getElementById(`mod-${moduleId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, height: '100%', alignItems: 'flex-start' }}>
      {/* 左侧目录 */}
      <Paper
        elevation={0}
        sx={{
          width: 248, flexShrink: 0, position: 'sticky', top: 0,
          maxHeight: 'calc(100vh - 64px - 48px)', overflow: 'auto',
          border: '1px solid', borderColor: 'divider',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MenuBookIcon sx={{ color: p }} /> 使用说明书
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            共 {MANUAL_MODULES.length} 章 / {MANUAL_MODULES.reduce((a, m) => a + m.sections.length, 0)} 节
          </Typography>
        </Box>
        <List dense disablePadding sx={{ py: 1 }}>
          {filtered.map((m) => (
            <ListItemButton key={m.id} onClick={() => scrollTo(m.id)} sx={{ py: 0.75 }}>
              <ListItemIcon sx={{ minWidth: 32, color: p }}>{MODULE_ICON[m.icon]}</ListItemIcon>
              <ListItemText
                primary={m.title}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
              />
              <Chip label={m.sections.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>

      {/* 右侧内容 */}
      <Box ref={contentRef} sx={{ flex: 1, minWidth: 0 }}>
        {/* 搜索条 */}
        <Paper
          elevation={0}
          sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper' }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="在说明书内搜索（如：MRP、三单匹配、信用额度、批次）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: 'background.default', borderRadius: 2 }}
          />
          {q && (
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              匹配到 {totalSections} 节
            </Typography>
          )}
        </Paper>

        {totalSections === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            未找到与「{query}」相关的内容，请尝试其他关键词。
          </Paper>
        )}

        {filtered.map((m) => (
          <Box key={m.id} id={`mod-${m.id}`} sx={{ scrollMarginTop: 16, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
              <Box sx={{ color: p }}>{MODULE_ICON[m.icon]}</Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {m.title}
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {m.sections.map((s) => (
              <SectionCard key={s.id} section={s} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default UserManual;
