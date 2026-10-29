/**
 * 供应商门户 · 关联单据只读速览（V3.116.0 新增）
 * ─────────────────────────────────────────────────────────────────────────────
 * 为什么需要它（而不是直接跳主 ERP 详情页）：
 *   门户是**独立的身份体系**（供应商账号），没有主 ERP 登录态。若沿用主 ERP 的做法
 *   直接 navigate('/purchase/orders/po-001')，会被 RequireAuth 拦下弹回登录页 ——
 *   用户看到的就是"点了没反应"。上一版财务域就是这个毛病。
 *
 * 解法：门户里点关联单号 → 就地弹出这张单据的**只读速览**（状态 + 关键字段 +
 *   本单自己的关联单据）。数据取自已注册的 DOC_SOURCES（与列表同一口径），
 *   因此不需要为 6 类单据各写一个门户详情页，也不会与主 ERP 详情页出现两套口径。
 *
 * 诚实边界：这是**速览**，不是完整单据页 —— 只列关键字段；也绝不做审批/修改等写操作。
 *   查不到实体时明确提示"未同步到本系统"，而不是假装空白。
 */
import React from 'react';
import {
  Box, Chip, Dialog, DialogContent, DialogTitle, Divider, Grid, Stack,
  Typography, Alert, DialogActions, Button,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RelatedDocLinks from '@/components/common/RelatedDocLinks';
import {
  withRelatedDocNos, docTypeLabel, type RelatedDocRef,
} from '@/utils/relations/documentRelations';
import { findDocEntity, getDocStatus } from '@/utils/relations/docStatus';
import { formatCurrency, formatDate } from '@/utils/format';

/** 各单据类型在速览里展示哪些字段（顺序即展示顺序；未列出的字段不展示，避免露出英文技术字段） */
const PEEK_FIELDS: Record<string, string[]> = {
  vendorStatement: ['statementNo', 'vendorName', 'statementPeriod', 'subtotal', 'taxTotal', 'grandTotal'],
  vendorInvoiceRequest: ['requestNo', 'statementNo', 'invoiceType', 'invoiceAmount', 'taxAmount', 'totalAmount', 'issuedAt'],
  purchaseOrder: ['orderNo', 'vendorName', 'orderDate', 'expectedDeliveryDate', 'totalAmount'],
  purchaseRequest: ['requestNo', 'applicant', 'requestDate', 'status'],
  inbound: ['inboundNo', 'sourceNo', 'vendorName', 'warehouseName', 'inboundDate', 'operator'],
  finInvoice: ['invoiceNo', 'vendorName', 'invoiceType', 'invoiceDate', 'amount', 'taxAmount', 'totalAmount', 'purchaseOrderNo'],
  paymentPlan: ['planNo', 'vendorName', 'invoiceNo', 'purchaseOrderNo', 'totalAmount', 'paidAmount', 'dueDate', 'paymentMethod'],
};

/** 字段中文名（只在这里维护一份，避免各页各写一套） */
const FIELD_LABELS: Record<string, string> = {
  statementNo: '对账单号',
  statementPeriod: '对账周期',
  requestNo: '申请单号',
  vendorName: '供应商',
  subtotal: '不含税金额',
  taxTotal: '税额',
  grandTotal: '价税合计',
  invoiceType: '发票类型',
  invoiceAmount: '开票金额',
  issuedAt: '开票时间',
  orderNo: '订单号',
  orderDate: '下单日期',
  expectedDeliveryDate: '期望到货日',
  applicant: '申请人',
  requestDate: '申请日期',
  inboundNo: '入库单号',
  sourceNo: '来源单号',
  warehouseName: '收货仓库',
  inboundDate: '入库日期',
  operator: '操作人',
  invoiceNo: '发票号码',
  invoiceDate: '开票日期',
  amount: '不含税金额',
  taxAmount: '税额',
  totalAmount: '价税合计',
  purchaseOrderNo: '关联采购单',
  planNo: '付款计划号',
  paidAmount: '已付金额',
  dueDate: '到期日',
  paymentMethod: '付款方式',
};

/** 金额类字段（按人民币格式渲染） */
const MONEY_KEYS = new Set([
  'subtotal', 'taxTotal', 'grandTotal', 'invoiceAmount', 'amount', 'taxAmount',
  'totalAmount', 'paidAmount',
]);
/** 日期类字段（含时间戳的按日期渲染） */
const DATE_KEYS = new Set([
  'orderDate', 'expectedDeliveryDate', 'requestDate', 'inboundDate', 'invoiceDate',
  'dueDate', 'issuedAt',
]);
/** 取值即中文标签的枚举字段 */
const ENUM_LABELS: Record<string, Record<string, string>> = {
  invoiceType: {
    vat_special: '增值税专用发票',
    vat_normal: '增值税普通发票',
    electronic: '电子发票',
    receipt: '收据',
  },
};

function renderValue(key: string, value: unknown): string {
  if (value == null || value === '') return '-';
  if (MONEY_KEYS.has(key)) return formatCurrency(Number(value));
  if (DATE_KEYS.has(key)) return formatDate(String(value));
  const mapped = ENUM_LABELS[key]?.[String(value)];
  return mapped ?? String(value);
}

interface Props {
  /** 要速览的关联单据；null 表示关闭 */
  doc: RelatedDocRef | null;
  onClose: () => void;
  /** 速览内继续下钻（点本单的关联单据时递归打开） */
  onOpen?: (doc: RelatedDocRef) => void;
}

/**
 * 关联单据只读速览弹窗。
 * 找不到实体时不白屏、不编造：明确告诉用户"本系统没有这张单"。
 */
export default function PortalDocPeek({ doc, onClose, onOpen }: Props) {
  if (!doc) return null;

  const entity = findDocEntity(doc.type, doc.no);
  const status = getDocStatus(doc.type, doc.no);
  const fields = PEEK_FIELDS[doc.type] ?? [];
  // 本单自己的关联单据（复用同一套关系表；这样从对账单→发票→付款计划可以一路点下去）
  const related = entity
    ? withRelatedDocNos(doc.type, [entity as Record<string, any>])[0]
    : null;

  return (
    <Dialog open maxWidth="sm" fullWidth onClose={onClose} data-testid="portal-doc-peek">
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        <VisibilityIcon color="primary" fontSize="small" />
        {docTypeLabel(doc.type)} · {doc.no}
        {status ? (
          <Chip size="small" label={status.label} color={status.color} sx={{ ml: 'auto', fontWeight: 600 }} />
        ) : null}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {!entity ? (
          <Alert severity="warning" data-testid="portal-doc-peek-missing">
            本系统未找到该{docTypeLabel(doc.type)}（{doc.no}）。
            可能尚未同步、已被删除，或该单号只记录在对方系统里。
          </Alert>
        ) : (
          <>
            <Grid container spacing={2}>
              {fields.map((key) => {
                const value = (entity as Record<string, any>)[key];
                if (value === undefined) return null;
                return (
                  <Grid item xs={6} key={key}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {FIELD_LABELS[key] ?? key}
                    </Typography>
                    <Typography variant="body2" fontWeight={key.endsWith('No') ? 600 : 400}
                      sx={{ fontFamily: key.endsWith('No') ? 'monospace' : undefined, wordBreak: 'break-all' }}>
                      {renderValue(key, value)}
                    </Typography>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ mt: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                本单关联的其他单据
              </Typography>
              {related && (related.upstreamDocs.length > 0 || related.downstreamDocs.length > 0) ? (
                <Stack spacing={1}>
                  {related.upstreamDocs.length > 0 && (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="caption" sx={{ color: '#64748B', minWidth: 56 }}>来源单据</Typography>
                      <RelatedDocLinks docs={related.upstreamDocs} showType showStatus onDocClick={onOpen} />
                    </Stack>
                  )}
                  {related.downstreamDocs.length > 0 && (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="caption" sx={{ color: '#64748B', minWidth: 56 }}>后续单据</Typography>
                      <RelatedDocLinks docs={related.downstreamDocs} showType showStatus onDocClick={onOpen} />
                    </Stack>
                  )}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">暂无关联单据</Typography>
              )}
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
