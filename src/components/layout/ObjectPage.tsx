import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Stack, Breadcrumbs, Link, Chip, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export interface ObjectPageSection {
  /** 锚点唯一 id（用于滚动定位与导航） */
  id: string;
  /** 分区标题 */
  title: string;
  /** 分区内容 */
  content: React.ReactNode;
}

export interface ObjectPageField {
  label: string;
  value: React.ReactNode;
}

interface ObjectPageProps {
  /** 对象标题（大字号，如物料编码） */
  title: string;
  /** 副标题（如物料名称） */
  subtitle?: string;
  /** 面包屑 */
  breadcrumbs?: { label: string; path: string }[];
  /** 页头关键字段（小字号 label/value 行） */
  headerFields?: ObjectPageField[];
  /** 状态标识（如 StatusBadge） */
  status?: React.ReactNode;
  /** 悬浮操作按钮区（编辑/删除/分享等） */
  actions?: React.ReactNode;
  /** 分区数组 */
  sections: ObjectPageSection[];
  /** 页头额外内容（自定义，置于关键字段下方） */
  headerContent?: React.ReactNode;
}

const ANCHOR_OFFSET = 88; // 锚点定位时预留的吸顶高度（应用栏+TabBar+锚点条）

const ObjectPage: React.FC<ObjectPageProps> = ({
  title,
  subtitle,
  breadcrumbs,
  headerFields,
  status,
  actions,
  sections,
  headerContent,
}) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 滚动监听：通过 IntersectionObserver 实现滚动高亮（对标 SAP Object Page 锚点联动）
  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId((visible[0].target as HTMLElement).id);
        }
      },
      // rootMargin 顶部偏移预留吸顶条高度，避免分区标题刚进入就被判定为激活
      { rootMargin: `-${ANCHOR_OFFSET}px 0px -55% 0px`, threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const handleAnchorClick = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  return (
    <Box>
      {/* 面包屑 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs separator="›" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            首页
          </Link>
          {breadcrumbs.map((b, i) => (
            <Link
              key={b.path}
              component={RouterLink}
              to={b.path}
              underline="hover"
              color={i === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
            >
              {b.label}
            </Link>
          ))}
        </Breadcrumbs>
      )}

      {/* 对象页头（Object Page Header） */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          mb: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-start' }}
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {status && <Box sx={{ mt: 1.5 }}>{status}</Box>}
          </Box>
          {actions && (
            <Box sx={{ flexShrink: 0, display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>
          )}
        </Stack>

        {/* 关键字段行 */}
        {headerFields && headerFields.length > 0 && (
          <Stack
            direction="row"
            flexWrap="wrap"
            spacing={0}
            divider={<Divider orientation="vertical" flexItem sx={{ mx: 2, my: 0.5 }} />}
            sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
          >
            {headerFields.map((f) => (
              <Box key={f.label} sx={{ py: 0.25 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {f.label}
                </Typography>
                <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
                  {f.value ?? '-'}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {headerContent && <Box sx={{ mt: 2 }}>{headerContent}</Box>}
      </Paper>

      {/* 吸顶锚点导航 */}
      <Paper
        variant="outlined"
        square
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          borderTop: 'none',
          borderRadius: 0,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ px: 2, py: 1 }}>
          {sections.map((s) => {
            const active = s.id === activeId;
            return (
              <Box
                key={s.id}
                component="button"
                onClick={() => handleAnchorClick(s.id)}
                aria-label={`跳转到${s.title}`}
                aria-current={active ? 'true' : undefined}
                sx={{
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? 'primary.main' : 'text.secondary',
                  borderBottom: active ? '2px solid' : '2px solid transparent',
                  borderBottomColor: active ? 'primary.main' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                }}
              >
                {s.title}
              </Box>
            );
          })}
        </Stack>
      </Paper>

      {/* 分区内容 */}
      <Box sx={{ pt: 3 }}>
        {sections.map((s) => (
          <Box
            key={s.id}
            id={s.id}
            ref={(el) => (sectionRefs.current[s.id] = el as HTMLElement | null)}
            sx={{ scrollMarginTop: `${ANCHOR_OFFSET}px`, mb: 3 }}
          >
            <Typography
              variant="h6"
              component="h2"
              sx={{ mb: 2, fontWeight: 600 }}
              id={`${s.id}-heading`}
            >
              {s.title}
            </Typography>
            {s.content}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ObjectPage;
