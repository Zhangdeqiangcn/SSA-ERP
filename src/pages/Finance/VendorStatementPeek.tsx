/**
 * 门户体系单据的主 ERP 只读速览（V3.118.0）
 * ─────────────────────────────────────────────────────────────────────────────
 * 为什么需要单独一个组件（而不复用门户的 PortalDocPeek）：
 *   门户的速览组件是给**门户身份**用的 —— 它在里面继续点关联单据时仍然弹速览，
 *   因为门户用户没有主 ERP 权限。但主 ERP 用户有这个权限，从对账单点到采购订单
 *   应该直接跳采购订单详情页（那里字段完整、能看审批流），只弹一个速览反而是降级。
 *
 * 本组件只处理**登记在门户身份体系下的两类单据**：
 *   · vendorStatement      供应商对账单 → 路由 /vendor-portal/purchase/statements
 *   · vendorInvoiceRequest 开票申请     → 路由 /vendor-portal/finance/invoices
 * 主 ERP 内点它们的默认结果是被 RequireAuth 踹到 /vendor-portal/login（实测复现），
 * 故改为就地弹只读速览。其余类型（采购订单/入库单/发票/付款计划）一律走默认跳转。
 *
 * 诚实边界：速览只读、只列关键字段；绝不做审批/修改等写操作。
 */
import React from 'react';
import {
  Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Button,
  Divider, Grid, Stack, Typography, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RelatedDocLinks from '@/components/common/RelatedDocLinks';
import { withRelatedDocNos, type RelatedDocRef } from '@/utils/relations/documentRelations';
import { findDocEntity, getDocStatus } from '@/utils/relations/docStatus';
import { formatCurrency, formatDate } from '@/utils/format';

/** 门户状态 → 中文（与对账管理页同一份字典口径） */
const PORTAL_STATUS_LABEL: Record<string, string> = {
  draft: '草稿', submitted: '待审批', reviewing: '审批中', sent: '已发送',
  confirmed: '已确认', disputed: '有争议', closed: '已关闭',
};

/** 发票类型 → 中文（与财务发票页同一口径；未登记的回落原值） */
const INVOICE_TYPE_LABEL: Record<string, string> = {
  vat_special: '增值税专用发票',
  vat_normal: '增值税普通发票',
  electronic: '电子发票',
  receipt: '收据',
};

interface Props {
  /** 要速览的关联单据；null 表示关闭 */
  doc: RelatedDocRef | null;
  onClose: () => void;
  /** 速览内继续点关联单据（默认走路由跳转，由 RelatedDocLinks 处理） */
  onOpen?: (doc: RelatedDocRef) => void;
}

export default function VendorStatementPeek({ doc, onClose }: Props) {
  if (!doc) return null;

  const entity = findDocEntity(doc.type, doc.no);
  const status = getDocStatus(doc.type, doc.no);
  const related = entity
    ? withRelatedDocNos(doc.type, [entity as Record<string, any>])[0]
    : null;
  const isInvoiceReq = doc.type === 'vendorInvoiceRequest';
  // 明细：对账单有 items（采购订单/入库/物料），开票申请也有 items（description/qty/amount 结构不同）
  const items = Array.isArray((entity as Record<string, any>)?.items)
    ? ((entity as Record<string, any>).items as Record<string, any>[])
    : [];

  /** 头部关键字段：按单据类型给不同集合（两类的字段几乎不重叠，共用一套会显示一堆 '-'） */
  const headFields = isInvoiceReq
    ? [
        { label: '供应商', value: String(entity?.vendorName || '-') },
        { label: '对账单号', value: String(entity?.statementNo || '-') },
        { label: '发票类型', value: INVOICE_TYPE_LABEL[String(entity?.invoiceType)] ?? String(entity?.invoiceType ?? '-') },
        { label: '开票金额', value: formatCurrency(Number(entity?.invoiceAmount) || 0) },
        { label: '税额', value: formatCurrency(Number(entity?.taxAmount) || 0) },
        { label: '价税合计', value: formatCurrency(Number(entity?.totalAmount) || 0) },
        { label: '发票号码', value: String(entity?.invoiceNo || '未开票') },
        { label: '开票时间', value: entity?.issuedAt ? String(entity.issuedAt) : '-' },
      ]
    : [
        { label: '供应商', value: String(entity?.vendorName || '-') },
        { label: '对账周期', value: String(entity?.statementPeriod || '-') },
        { label: '门户状态', value: PORTAL_STATUS_LABEL[String(entity?.status)] ?? String(entity?.status ?? '-') },
        { label: '不含税金额', value: formatCurrency(Number(entity?.subtotal) || 0) },
        { label: '税额', value: formatCurrency(Number(entity?.taxTotal) || 0) },
        { label: '价税合计', value: formatCurrency(Number(entity?.grandTotal) || 0) },
        { label: '供应商确认时间', value: entity?.vendorConfirmedAt ? formatDate(String(entity.vendorConfirmedAt)) : '-' },
        { label: '争议说明', value: String(entity?.disputeItems || '-') },
      ];

  return (
    <Dialog open maxWidth="md" fullWidth onClose={onClose} data-testid="erp-vendor-statement-peek">
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        <ReceiptLongIcon color="primary" fontSize="small" />
        {isInvoiceReq ? '开票申请' : '供应商对账单'} · {doc.no}
        {status ? <Chip size="small" label={status.label} color={status.color} sx={{ ml: 'auto', fontWeight: 600 }} /> : null}
      </DialogTitle>
      <Divider />
      <DialogContent dividers>
        {!entity ? (
          <Alert severity="warning" data-testid="erp-vendor-statement-peek-missing">
            本系统未找到该单据（{doc.no}）。可能尚未同步，或该单号只记录在对方系统里。
          </Alert>
        ) : (
          <>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {headFields.map((f) => (
                <Grid item xs={6} sm={3} key={f.label}>
                  <Typography variant="caption" color="text.secondary" display="block">{f.label}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-all' }}>{f.value}</Typography>
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              {isInvoiceReq ? '开票明细' : '对账明细'}
            </Typography>
            <TableContainer sx={{ maxHeight: 260, mb: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {isInvoiceReq ? (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>品名</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>单位</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>数量</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>单价</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>采购订单</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>入库单</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>数量</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>单价</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>发票号</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isInvoiceReq ? 5 : 7} align="center">
                        <Typography variant="caption" color="text.secondary">无明细行</Typography>
                      </TableCell>
                    </TableRow>
                  ) : isInvoiceReq ? items.map((it, i) => (
                    // 开票申请明细结构：{ description, unit, qty, unitPrice, amount }
                    <TableRow key={String(it.id ?? i)} hover>
                      <TableCell><Typography variant="caption">{it.description || '-'}</Typography></TableCell>
                      <TableCell>{it.unit || '-'}</TableCell>
                      <TableCell align="right">{Number(it.qty) || 0}</TableCell>
                      <TableCell align="right">{formatCurrency(Number(it.unitPrice) || 0)}</TableCell>
                      <TableCell align="right">{formatCurrency(Number(it.amount) || 0)}</TableCell>
                    </TableRow>
                  )) : items.map((it, i) => (
                    <TableRow key={String(it.id ?? i)} hover>
                      <TableCell>
                        <Typography variant="caption" display="block">{it.materialName || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">{it.materialCode}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="caption" fontFamily="monospace">{it.purchaseOrderNo || '-'}</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontFamily="monospace">{it.inboundNo || '-'}</Typography></TableCell>
                      <TableCell align="right">{Number(it.qty) || 0}</TableCell>
                      <TableCell align="right">{formatCurrency(Number(it.unitPrice) || 0)}</TableCell>
                      <TableCell align="right">{formatCurrency(Number(it.amount) || 0)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">{it.invoiceNo || '未开票'}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>本单关联的其他单据</Typography>
            {related && (related.upstreamDocs.length > 0 || related.downstreamDocs.length > 0) ? (
              <Stack spacing={1}>
                {related.upstreamDocs.length > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="caption" sx={{ color: '#64748B', minWidth: 64 }}>来源单据</Typography>
                    {/* 主 ERP 内：点采购订单/入库单直接跳详情页（不再弹速览） */}
                    <RelatedDocLinks docs={related.upstreamDocs} showType showStatus />
                  </Stack>
                )}
                {related.downstreamDocs.length > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="caption" sx={{ color: '#64748B', minWidth: 64 }}>后续单据</Typography>
                    <RelatedDocLinks docs={related.downstreamDocs} showType showStatus />
                  </Stack>
                )}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">暂无关联单据</Typography>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                提示：主 ERP 内点「发票/付款计划」会跳到财务页面；点灰色单号表示该单在本系统查不到。
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
