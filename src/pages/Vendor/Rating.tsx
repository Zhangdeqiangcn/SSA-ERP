import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Box, Rating, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid } from '@mui/material';
import { PageWrapper } from '@/components/layout';
import { DataTable } from '@/components/common';
import { useVendorStore } from '@/stores/vendorStore';
import { Vendor } from '@/types';

const RatingPage: React.FC = () => {
  const vendors = useVendorStore((s) => s.vendors);
  const updateVendor = useVendorStore((s) => s.updateVendor);
  const addRatingRecord = useVendorStore((s) => s.addRatingRecord);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [ratings, setRatings] = useState({
    deliveryRate: 5,
    qualityRate: 5,
    serviceRate: 5,
    remarks: '',
  });

  const approvedVendors = useMemo(() => {
    return vendors.filter(v => v.status === 'approved');
  }, [vendors]);

  const columns: ColumnDef<Vendor, unknown>[] = useMemo(() => [
    { accessorKey: 'code', header: '供应商编码' },
    { accessorKey: 'name', header: '供应商名称' },
    {
      accessorKey: 'rating',
      header: '当前评级',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Rating value={row.original.rating || 0} readOnly size="small" />
          <Typography variant="body2" sx={{ ml: 1 }}>
            {row.original.rating ? `${row.original.rating}星` : '未评级'}
          </Typography>
        </Box>
      ),
    },
    { accessorKey: 'creditLevel', header: '信用等级' },
  ], []);

  const handleOpenDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setRatings({
      deliveryRate: 5,
      qualityRate: 5,
      serviceRate: 5,
      remarks: '',
    });
    setDialogOpen(true);
  };

  const handleSaveRating = () => {
    if (selectedVendor) {
      const avgRating = (ratings.deliveryRate + ratings.qualityRate + ratings.serviceRate) / 3;
      const rounded = Math.round(avgRating * 10) / 10;
      updateVendor(selectedVendor.id, { rating: rounded });
      addRatingRecord({
        id: `rate-${Date.now()}`,
        vendorId: selectedVendor.id,
        rating: rounded,
        type: 'manual',
        evaluator: 'admin',
        criteria: {
          deliveryRate: ratings.deliveryRate,
          qualityRate: ratings.qualityRate,
          serviceRate: ratings.serviceRate,
        },
        remarks: ratings.remarks,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
    }
    setDialogOpen(false);
  };

  return (
    <PageWrapper title="供应商评级">
      <DataTable
        data={approvedVendors}
        columns={columns}
        enablePagination
        onEdit={(row) => handleOpenDialog(row)}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>供应商评级 - {selectedVendor?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ pt: 2 }}>
            <Grid item xs={12}>
              <Typography component="legend">交货准时率</Typography>
              <Rating
                value={ratings.deliveryRate}
                onChange={(_, value) => setRatings({ ...ratings, deliveryRate: value || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography component="legend">质量合格率</Typography>
              <Rating
                value={ratings.qualityRate}
                onChange={(_, value) => setRatings({ ...ratings, qualityRate: value || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography component="legend">服务响应</Typography>
              <Rating
                value={ratings.serviceRate}
                onChange={(_, value) => setRatings({ ...ratings, serviceRate: value || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="备注"
                value={ratings.remarks}
                onChange={(e) => setRatings({ ...ratings, remarks: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveRating} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default RatingPage;
