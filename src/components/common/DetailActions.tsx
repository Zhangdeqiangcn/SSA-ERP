import React from 'react';
import { Button, Stack } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import PrintPreviewButton from './PrintPreviewButton';
import type { PrintEntity } from '@/stores/printTemplateStore';

/**
 * 详情页操作的「扩展按钮」插槽。
 * 用于在默认的「返回 / 编辑 / 删除 / 打印 / 打印预览」之外，注入业务专属按钮（如分享、提交、复制等）。
 */
export interface DetailActionExtra {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  /** "inherit" | "primary" | "error" 等；默认 inherit */
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  disabled?: boolean;
}

export interface DetailActionsProps {
  /** 业务实体标识，决定用哪份打印模板（可任意 PrintEntity；未注册的会自动 fallback） */
  entity: PrintEntity;
  /** 当前详情记录，会作为打印预览的字段来源 */
  record: Record<string, any>;
  /** 返回按钮：不传则不显示 */
  onBack?: () => void;
  /** 返回按钮文案，默认「返回」 */
  backText?: string;
  /** 编辑按钮：不传则不显示 */
  onEdit?: () => void;
  /** 删除按钮：不传则不显示 */
  onDelete?: () => void;
  /** 自定义按钮插槽（分享、提交、复制等） */
  extra?: DetailActionExtra[];
  /** 是否显示打印+打印预览（默认 true） */
  printable?: boolean;
  /** 是否只显示「打印」一个按钮（默认 false：打印 + 打印预览两个） */
  printOnlyOne?: boolean;
  /** 按钮尺寸，默认 small（与既有详情页一致） */
  size?: 'small' | 'medium';
  /** 按钮样式变体，默认 outlined */
  variant?: 'outlined' | 'contained' | 'text';
  /** Stack 的 sx */
  sx?: any;
  /** 堆叠间距，默认 1 */
  spacing?: number;
}

/**
 * 详情页通用操作栏：一行接入即可获得「返回 / 编辑 / 删除 / 打印 / 打印预览」全套按钮。
 *
 * 设计原则：
 * 1. 80% 详情页都有「返回 / 编辑 / 删除」三件套 → 用 onBack/onEdit/onDelete 三个 callback 简化调用
 * 2. 打印能力内置：基于 entity 自动选择模板；未注册模板则用 record 字段 fallback
 * 3. 业务专属按钮（分享、提交、复制等）通过 extra 数组追加，避免组件预设过度
 * 4. 视觉风格与既有详情页保持一致（outlined + small）
 *
 * 用法示例：
 * ```tsx
 * <DetailActions
 *   entity="vendor"
 *   record={vendor}
 *   onBack={() => navigate('/vendor/list')}
 *   onEdit={openEdit}
 *   onDelete={() => setDeleteDialog(true)}
 *   extra={[{ key:'share', label:'分享', icon:<ShareIcon />, onClick:handleShare }]}
 * />
 * ```
 */
const DetailActions: React.FC<DetailActionsProps> = ({
  entity,
  record,
  onBack,
  backText = '返回',
  onEdit,
  onDelete,
  extra = [],
  printable = true,
  printOnlyOne = false,
  size = 'small',
  variant = 'outlined',
  sx,
  spacing = 1,
}) => {
  return (
    <Stack direction="row" spacing={spacing} sx={sx} data-testid="detail-actions" data-entity={entity}>
      {onBack && (
        <Button
          variant={variant}
          size={size}
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          data-testid={`detail-action-back-${entity}`}
        >
          {backText}
        </Button>
      )}
      {onEdit && (
        <Button
          variant={variant}
          size={size}
          startIcon={<EditIcon />}
          onClick={onEdit}
          data-testid={`detail-action-edit-${entity}`}
        >
          编辑
        </Button>
      )}
      {extra.map((act) => (
        <Button
          key={act.key}
          variant={variant}
          size={size}
          startIcon={act.icon}
          onClick={act.onClick}
          color={act.color ?? 'inherit'}
          disabled={act.disabled}
          data-testid={`detail-action-${act.key}-${entity}`}
        >
          {act.label}
        </Button>
      ))}
      {onDelete && (
        <Button
          variant={variant}
          size={size}
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onDelete}
          data-testid={`detail-action-delete-${entity}`}
        >
          删除
        </Button>
      )}
      {printable && (
        <PrintPreviewButton
          entity={entity}
          record={record}
          showBoth={!printOnlyOne}
          size={size}
          variant={variant}
        />
      )}
    </Stack>
  );
};

export default DetailActions;
