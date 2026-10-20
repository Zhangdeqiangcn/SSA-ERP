import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, List, ListItem, ListItemIcon, ListItemText,
  Divider, IconButton, CircularProgress,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageWrapper } from '@/components/layout';
import { globalSearch, type GlobalHit, type GlobalSearchResult } from '@/config/globalSearch';
import { useAuthStore } from '@/stores/authStore';

const HIT_ICON: Record<GlobalHit['kind'], React.ReactNode> = {
  page: <AssignmentIcon fontSize="small" />,
  manual: <HelpOutlineIcon fontSize="small" />,
  record: <Inventory2Icon fontSize="small" />,
};

/** 命中词高亮（子串定位，同 Header 下拉口径） */
const Highlight: React.FC<{ text: string; q: string }> = ({ text, q }) => {
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'transparent', color: '#2563eb', fontWeight: 700 }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
};

const GroupSection: React.FC<{
  title: string;
  hits: GlobalHit[];
  q: string;
  onSelect: (h: GlobalHit) => void;
}> = ({ title, hits, q, onSelect }) => {
  if (hits.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em' }}>
        {title}（{hits.length}）
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <List dense disablePadding>
          {hits.map((h, i) => (
            <React.Fragment key={h.key}>
              <ListItem
                button
                onClick={() => onSelect(h)}
                sx={{ py: 1, px: 2, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{HIT_ICON[h.kind]}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      {h.recordType && <Chip label={h.recordType} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />}
                      <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                        <Highlight text={h.title} q={q} />
                      </Typography>
                    </Box>
                  }
                  secondary={h.sub}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem', color: 'text.secondary' }}
                />
              </ListItem>
              {i < hits.length - 1 && <Divider sx={{ mx: 2 }} />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

/**
 * V3.70.0 全局搜索结果页（顶栏搜索框回车后的独立临时页面）
 * 读 ?q= 关键词，调 globalSearch 引擎（三源：菜单页 / 模块说明 / 权限内记录），
 * 全量分组展示命中；每条点击直达详情/列表/说明书锚点。
 */
const SearchResultsPage: React.FC = () => {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    setLoading(true);
    globalSearch(q, { isAdmin, recordLimit: 200 })
      .then((r) => { if (!cancelled) setResult(r); })
      .catch(() => { if (!cancelled) setResult(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, isAdmin]);

  const handleSelect = (h: GlobalHit) => {
    if (!h.path) return;
    navigate(h.hash ? `${h.path}#${h.hash}` : h.path, { replace: false });
  };

  const groups = useMemo(() => ({
    pages: result?.pages ?? [],
    manuals: result?.manuals ?? [],
    records: result?.records ?? [],
  }), [result]);

  return (
    <PageWrapper title="搜索结果" subtitle="顶栏搜索框回车后的全量命中（页面 / 模块说明 / 权限内记录）">
      <Box sx={{ maxWidth: 900 }}>
        {/* 页头 */}
        <Paper
          elevation={0}
          sx={{
            p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5,
            border: '1px solid', borderColor: 'divider', borderRadius: 2,
            bgcolor: alpha(p, 0.03),
          }}
        >
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <SearchIcon sx={{ color: p }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              「{q}」的搜索结果
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              共 {result?.total ?? 0} 条命中：页面 {groups.pages.length} · 模块说明 {groups.manuals.length} ·
              记录 {groups.records.length}（记录仅限本人数据权限范围内）
            </Typography>
          </Box>
          {loading && <CircularProgress size={20} />}
        </Paper>

        {!loading && result && result.total === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              未找到与「{q}」相关的内容。试试更短的关键词（如「采购」「SO」「物料编码」），
              或检查是否需要登录以搜索业务记录。
            </Typography>
          </Paper>
        )}

        {!loading && result && result.total > 0 && (
          <>
            <GroupSection title="页面 / 功能" hits={groups.pages} q={q} onSelect={handleSelect} />
            <GroupSection title="模块使用说明" hits={groups.manuals} q={q} onSelect={handleSelect} />
            <GroupSection title="业务记录（权限内）" hits={groups.records} q={q} onSelect={handleSelect} />
            {!result.recordsAvailable && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  提示：业务记录搜索仅在登录后且属于本人数据权限范围内可用。
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </PageWrapper>
  );
};

export default SearchResultsPage;
