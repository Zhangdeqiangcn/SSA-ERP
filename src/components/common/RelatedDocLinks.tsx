// 关联单号可点击链接组件（V3.113.0 新增）
// 把"上游/下游单号"渲染成蓝色可点击链接：点击跳转到对应单据详情页。
// 用于详情页（替换原"来源单号"纯文本）与列表的上下游列单元格。

import React from 'react';
import { Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { resolveRoute, type RelatedDocRef } from '@/utils/relations/documentRelations';

interface Props {
  /** 关联引用数组（可空/空数组 → 显示 '-'） */
  docs?: RelatedDocRef[] | null;
}

/** 渲染一组可点击的关联单号；无则显示占位符 */
export default function RelatedDocLinks({ docs }: Props) {
  const navigate = useNavigate();
  if (!docs || docs.length === 0) return <>-</>;

  return (
    <>
      {docs.map((d, i) => (
        <React.Fragment key={`${d.type}-${d.no}-${i}`}>
          <Link
            component="button"
            variant="body2"
            underline="hover"
            sx={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              const to = resolveRoute(d.type, d.no);
              if (to && to !== '#') navigate(to);
            }}
          >
            {d.no}
          </Link>
          {i < docs.length - 1 ? '、' : null}
        </React.Fragment>
      ))}
    </>
  );
}
