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
import { Chip, Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { resolveRoute, docTypeLabel, type RelatedDocRef } from '@/utils/relations/documentRelations';
import { getDocStatus } from '@/utils/relations/docStatus';

interface Props {
  /** 关联引用数组（可空/空数组 → 显示 '-'） */
  docs?: RelatedDocRef[] | null;
  /**
   * 是否在单号前显示单据类型名（V3.114.0）。
   * 用于「来源单据 / 后续单据」这类混合列：一个格子里可能同时有入库单和发票，
   * 只给单号没人分得清是什么单 —— 明细是什么单就写什么单。
   */
  showType?: boolean;
  /**
   * 是否在单号后显示该单据的当前状态（V3.115.0）。
   * 强哥需求：列表里不只要看到关联单号，还要一眼看出对方单走到哪了
   * （入库单已入库没有、发票验没验、付款付没付）。
   * 状态标签取全站 StatusBadge 字典的同一套语义色，不另造颜色与文案。
   */
  showStatus?: boolean;
  /** 单号之间的分隔符（默认中文顿号） */
  separator?: string;
  /**
   * 覆盖默认跳转行为（V3.116.0）。
   *
   * 为什么需要：主 ERP 里点单号 = 跳路由进详情页，因为用户有 ERP 登录态；
   *   但供应商门户是**另一套身份体系**，门户用户没有主 ERP 权限 —— 若照旧跳
   *   /purchase/orders/po-001 会被 RequireAuth 弹回登录页，等于点了没反应。
   * 传了本回调时：① 一律渲染为可点链接（是否存在由回调自己判断并提示）；
   *   ② 不再走 navigate，改由调用方决定（门户侧是弹只读速览弹窗）。
   */
  onDocClick?: (doc: RelatedDocRef) => void;
}

/** 渲染一组可点击的关联单号；无则显示占位符 */
export default function RelatedDocLinks({
  docs,
  showType = false,
  showStatus = false,
  separator = '、',
  onDocClick,
}: Props) {
  const navigate = useNavigate();
  if (!docs || docs.length === 0) return <>-</>;

  return (
    <>
      {docs.map((d, i) => {
        // V3.113.2：先判定能否解析出真实路由，解析不到 → 灰色纯文本（不可点）
        // V3.116.0：调用方接管点击（门户速览）时不做死链判定 —— 门户能看到什么由它自己算
        const to = onDocClick ? '' : resolveRoute(d.type, d.no);
        const resolvable = onDocClick ? true : !!to && to !== '#';
        const st = showStatus ? getDocStatus(d.type, d.no) : null;
        return (
          <React.Fragment key={`${d.type}-${d.no}-${i}`}>
            {showType ? (
              <Typography
                component="span"
                variant="caption"
                sx={{ color: '#64748B', whiteSpace: 'nowrap', mr: 0.25 }}
              >
                {docTypeLabel(d.type)}
              </Typography>
            ) : null}
            {resolvable ? (
              <Link
                component="button"
                variant="body2"
                underline="hover"
                sx={{ cursor: 'pointer' }}
                title={onDocClick ? `${docTypeLabel(d.type)} ${d.no}：点击查看` : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDocClick) onDocClick(d);
                  else navigate(to);
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
            {st ? (
              <Chip
                label={st.label}
                color={st.color}
                variant="outlined"
                size="small"
                title={`${docTypeLabel(d.type)}当前状态：${st.label}`}
                sx={{
                  height: 16,
                  ml: 0.5,
                  verticalAlign: 'middle',
                  '& .MuiChip-label': { px: 0.5, fontSize: '0.62rem', lineHeight: 1.6 },
                }}
              />
            ) : null}
            {i < docs.length - 1 ? separator : null}
          </React.Fragment>
        );
      })}
    </>
  );
}
