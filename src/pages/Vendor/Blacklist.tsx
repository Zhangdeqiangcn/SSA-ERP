import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Block } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, ConfirmDialog } from '@/components/common';
import { useVendorStore } from '@/stores/vendorStore';
import { Vendor } from '@/types';
import { formatDate } from '@/utils/format';

const Blacklist: React.FC = () => {
  const navigate = useNavigate();
  const vendors = useVendorStore((s) => s.vendors);
  const setVendorBlacklist = useVendorStore((s) => s.setVendorBlacklist);
  const [removeConfirm, setRemoveConfirm] = useState<Vendor | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addVendorId, setAddVendorId] = useState<string | null>(null);
  const [addReason, setAddReason] = useState('');

  const blacklistedVendors = useMemo(
    () => vendors.filter((v) => v.status === 'blacklisted'),
    [vendors]
  );

  const candidates = useMemo(
    () => vendors.filter((v) => v.status !== 'blacklisted').map((v) => ({ id: v.id, label: `${v.code} ${v.name}` })),
    [vendors]
  );

  const columns: ColumnDef<Vendor, unknown>[] = useMemo(
    () => [
      { accessorKey: 'code', header: '供应商编码' },
      { accessorKey: 'name', header: '供应商名称' },
      { accessorKey: 'contact', header: '联系人' },
      { accessorKey: 'phone', header: '电话' },
      {
        accessorKey: 'blacklistedAt',
        header: '加入黑名单时间',
        cell: ({ row }) => formatDate(row.original.blacklistedAt),
      },
      { accessorKey: 'blacklistReason', header: '原因' },
      {
        id: 'history',
        header: '处置留痕',
        cell: ({ row }) => {
          const history = row.original.blacklistReasonHistory ?? [];
          if (history.length === 0) return <Chip size="small" label="无记录" variant="outlined" />;
          return (
            <Tooltip
              title={
                <Box>
                  {history.map((h, idx) => (
                    <Typography key={idx} variant="caption" component="div">
                      {h.operatedAt} · {h.operator}：{h.reason}
                    </Typography>
                  ))}
                </Box>
              }
            >
              <Chip size="small" color="warning" label={`${history.length} 条`} />
            </Tooltip>
          );
        },
      },
    ],
    []
  );

  const handleRemoveFromBlacklist = () => {
    if (removeConfirm) {
      setVendorBlacklist(removeConfirm.id, false);
      setRemoveConfirm(null);
    }
  };

  const handleAddToBlacklist = () => {
    if (!addVendorId || !addReason.trim()) return;
    setVendorBlacklist(addVendorId, true, addReason.trim(), '采购部');
    setAddOpen(false);
    setAddVendorId(null);
    setAddReason('');
  };

  return (
    <PageWrapper
      title="黑名单管理"
      actions={
        <Button
          variant="contained"
          color="error"
          startIcon={<Block />}
          data-testid="blacklist-add-btn"
          onClick={() => setAddOpen(true)}
        >
          加入黑名单
        </Button>
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        黑名单供应商将被系统硬拦截：无法作为采购订单主供应商、无法被询价单选为目标供应商、无法在供应商门户提交报价。
      </Typography>
      <DataTable
        data={blacklistedVendors}
        columns={columns}
        enablePagination
        onView={(row) => navigate(`/vendor/${row.id}`)}
        onEdit={(row) => setRemoveConfirm(row)}
      />
      <ConfirmDialog
        open={!!removeConfirm}
        title="确认移除黑名单"
        content={`确定要将供应商 "${removeConfirm?.name}" 从黑名单中移除吗？移除后该供应商可正常参与询价与下单。`}
        onConfirm={handleRemoveFromBlacklist}
        onCancel={() => setRemoveConfirm(null)}
        type="warning"
      />
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>加入黑名单</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={candidates}
              value={candidates.find((c) => c.id === addVendorId) ?? null}
              onChange={(_, val) => setAddVendorId(val?.id ?? null)}
              renderInput={(params) => (
                <TextField {...params} label="选择供应商" data-testid="blacklist-vendor-input" />
              )}
            />
            <TextField
              label="拉黑原因"
              multiline
              rows={3}
              value={addReason}
              onChange={(e) => setAddReason(e.target.value)}
              data-testid="blacklist-reason-input"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!addVendorId || !addReason.trim()}
            onClick={handleAddToBlacklist}
            data-testid="blacklist-confirm-btn"
          >
            确认拉黑
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default Blacklist;
