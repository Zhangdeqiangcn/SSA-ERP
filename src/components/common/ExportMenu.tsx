import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress, Tooltip } from '@mui/material';
import { Download, GridOn, TableChart } from '@mui/icons-material';
import { exportCsv, exportExcel, withStamp, type ExportSheet } from '@/utils/exportUtils';

/**
 * 通用导出菜单（CSV / Excel）— V2.73
 * ------------------------------------------------------------
 * 各分析/报表页只需提供 sheets，即可获得一致的导出入口与按钮文案。
 * sheets 支持传函数，点击时才计算，避免每帧重算大数据集。
 */
export interface ExportMenuProps {
  /** 导出内容；可传函数以懒计算 */
  sheets: ExportSheet[] | (() => ExportSheet[]);
  /** 文件名主体（不含扩展名与时间戳） */
  filename: string;
  /** 按钮文案，默认「导出」 */
  label?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  /** 无数据时的禁用提示 */
  disabledHint?: string;
  /** data-testid 前缀：本体 = testid，菜单项 = `${testid}-csv` / `${testid}-xlsx` */
  testid?: string;
  onExported?: (format: 'csv' | 'xlsx') => void;
  onError?: (e: unknown) => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({
  sheets,
  filename,
  label = '导出',
  size = 'small',
  disabled = false,
  disabledHint = '暂无可导出数据',
  testid = 'export-menu',
  onExported,
  onError,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const open = Boolean(anchorEl);

  const resolveSheets = (): ExportSheet[] => (typeof sheets === 'function' ? sheets() : sheets);
  const hasData = resolveSheets().some((s) => s.rows.length > 0);

  const close = () => setAnchorEl(null);

  const run = async (format: 'csv' | 'xlsx') => {
    close();
    const list = resolveSheets().filter((s) => s.rows.length > 0);
    if (list.length === 0) return;
    setBusy(true);
    try {
      const name = withStamp(filename, format);
      if (format === 'csv') await exportCsv(list, name);
      else await exportExcel(list, name);
      onExported?.(format);
    } catch (e) {
      onError?.(e);
    } finally {
      setBusy(false);
    }
  };

  const btn = (
    <Button
      size={size}
      variant="outlined"
      startIcon={busy ? <CircularProgress size={14} /> : <Download fontSize="small" />}
      onClick={(e) => setAnchorEl(e.currentTarget)}
      disabled={disabled || busy || !hasData}
      data-testid={testid}
    >
      {label}
    </Button>
  );

  return (
    <>
      {!hasData ? <Tooltip title={disabledHint}>{<span>{btn}</span>}</Tooltip> : btn}
      <Menu anchorEl={anchorEl} open={open} onClose={close}>
        <MenuItem onClick={() => run('csv')} data-testid={`${testid}-csv`}>
          <ListItemIcon><TableChart fontSize="small" /></ListItemIcon>
          <ListItemText>导出 CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => run('xlsx')} data-testid={`${testid}-xlsx`}>
          <ListItemIcon><GridOn fontSize="small" /></ListItemIcon>
          <ListItemText>导出 Excel</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportMenu;
