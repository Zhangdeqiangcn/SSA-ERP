// 详情弹窗内的「来源/关联单号」可点渲染（V3.113.2 新增）
// 财务域的详情是居中弹窗（Dialog）而非独立 *Detail.tsx 页面，
// 因此无法复用 ObjectPage 的「关联单据」区块，这里提供轻量复用件：
//   - RelatedSourceField：单个字段位（如「关联采购单」）渲染成可点链接
//   - RelatedDocsBlock：整块「关联单据」区块（上游/下游两栏），样式与 ObjectPage 保持一致
//
// 与 ObjectPage 同源：都用 useRelatedDocs + RelatedDocLinks，
// 因此同样享有 V3.113.1 的「store 水合后重算」能力（不会残留 mock 期的失效单号）。

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useRelatedDocs } from '@/utils/relations/useRelatedDocs';
import RelatedDocLinks from './RelatedDocLinks';
import type { RelatedDocRef } from '@/utils/relations/documentRelations';
import { docTypeLabel } from '@/utils/relations/documentRelations';

interface FieldProps {
  /** 目标单据类型（DOC_SOURCES / DOC_RELATIONS 的 key） */
  docType: string;
  /** 当前单据对象；为空则不渲染任何链接 */
  entity: Record<string, any> | null | undefined;
  /** 只取上游（默认）或下游 */
  side?: 'upstream' | 'downstream';
  /** 只渲染该类型的一个来源分量（如付款计划同时关联采购单与发票） */
  filterType?: string;
  /** 无关联时显示的占位符 */
  fallback?: string;
}

/** 详情弹窗里的单个「来源单号」字段：渲染为可点击链接 */
export function RelatedSourceField({ docType, entity, side = 'upstream', filterType, fallback = '-' }: FieldProps) {
  const rel = useRelatedDocs(docType, entity);
  let docs: RelatedDocRef[] = side === 'upstream' ? (rel?.upstreamDocs ?? []) : (rel?.downstreamDocs ?? []);
  if (filterType) docs = docs.filter((d) => d.type === filterType);
  if (!entity || docs.length === 0) return <>{fallback}</>;
  return <RelatedDocLinks docs={docs} />;
}

interface BlockProps {
  docType: string;
  entity: Record<string, any> | null | undefined;
}

/** 详情弹窗里的「关联单据」区块：来源/后续两栏，各自按单据类型命名（V3.114.0） */
export function RelatedDocsBlock({ docType, entity }: BlockProps) {
  const rel = useRelatedDocs(docType, entity);
  if (!entity || !rel) return null;
  if (rel.upstreamDocs.length === 0 && rel.downstreamDocs.length === 0) return null;

  const groupByType = (docs: RelatedDocRef[]) => {
    const map = new Map<string, RelatedDocRef[]>();
    for (const d of docs) {
      const arr = map.get(d.type);
      if (arr) arr.push(d);
      else map.set(d.type, [d]);
    }
    return Array.from(map.entries());
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>关联单据</Typography>
      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {groupByType(rel.upstreamDocs).length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>来源单据</Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 0.5 }}>
              {groupByType(rel.upstreamDocs).map(([type, docs]) => (
                <Box key={type}>
                  <Typography variant="body2" color="text.secondary">{docTypeLabel(type)}</Typography>
                  <Box sx={{ mt: 0.5 }}><RelatedDocLinks docs={docs} /></Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        {groupByType(rel.downstreamDocs).length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>后续单据</Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 0.5 }}>
              {groupByType(rel.downstreamDocs).map(([type, docs]) => (
                <Box key={type}>
                  <Typography variant="body2" color="text.secondary">{docTypeLabel(type)}</Typography>
                  <Box sx={{ mt: 0.5 }}><RelatedDocLinks docs={docs} /></Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

export default RelatedSourceField;
