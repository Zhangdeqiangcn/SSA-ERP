// 关联单号可点击链接组件（V3.113.0 新增；V3.113.2 增强死链降级）
// 把"上游/下游单号"渲染成蓝色可点击链接：点击跳转到对应单据详情页。
// 用于详情页（替换原"来源单号"纯文本）与列表的上下游列单元格。
//
// ★ V3.113.2 增强：解析不到真实目标的单号不再伪装成可点链接。
//   背景：前端 mock 里存在采购单号（如 PO-2024-0330），数据库中根本没有此单。
//         若照样渲染成蓝色按钮，用户点下去毫无反应，只能困惑地以为按钮坏了。
//   现在：渲染前先 resolveRoute 判定，解析不到则渲染为灰色纯文本 ——
//         明确表达"这是单号，但目标不存在"，而不是给一个点不动的假按钮。

import React from 'react';
import { Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { resolveRoute, type RelatedDocRef } from '@/utils/relations/documentRelations';

interface Props {
  /** 关联引用数组（可空/空数组 → 显示 '-'） */
  docs?: RelatedDocRef[] | null;
}

/** 渲染一组可点击的关联单号；无则显示占位符 */
export default function RelatedDocLinks({ docs }: { docs?: RelatedDocRef[] | null }) {
  const navigate = useNavigate();
  if (!docs || docs.length === 0) return <>-</>;

  return (
    <>
      {docs.map((d, i) => {
        // V3.113.2：先判定能否解析出真实路由，解析不到 → 灰色纯文本（不可点）
        const to = resolveRoute(d.type, d.no);
        const resolvable = !!to && to !== '#';
        return (
          <React.Fragment key={`${d.type}-${d.no}-${i}`}>
            {resolvable ? (
              <Link
                component="button"
                variant="body2"
                underline="hover"
                sx={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(to);
                }}
              >
                {d.no}
              </Link>
            ) : (
              // 目标不存在：灰色纯文本，鼠标悬停提示「目标单据不存在」
              <Typography
                component="span"
                variant="body2"
                color="text.disabled"
                title={`${d.no}：目标单据不存在或尚未加载，无法跳转`}
                sx={{ cursor: 'default' }}
              >
                {d.no}
              </Typography>
            )}
            {i < docs.length - 1 ? '、' : null}
          </React.Fragment>
        );
      })}
    </>
  );
}
