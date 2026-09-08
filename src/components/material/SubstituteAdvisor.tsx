import { Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useMaterialStore, evaluateSubstitutes, type SubstituteRecommendation } from '@/stores/materialStore';

const COVERAGE_META: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' }> = {
  full: { label: '可完全替代', color: 'success' },
  partial: { label: '部分可替代', color: 'warning' },
  none: { label: '库存不足', color: 'default' },
  expired: { label: '已过期', color: 'error' },
};

interface Props {
  /** 主物料编码 */
  materialCode: string;
  /** 本次需求数量（用于计算「满足需求所需替代料量」与覆盖度）；不传则仅展示可用量 */
  neededQty?: number;
  /** dense=true 时只渲染单行可替代 Chip（用于 MRP 净需求行、移动出库行） */
  dense?: boolean;
}

/**
 * 替代料建议组件（V2.85.0 C9 深化）：复用 materialStore.evaluateSubstitutes，
 * 按优先级展示各替代料的可用量 / 满足需求所需量 / 覆盖状态（可完全替代 / 部分 / 不足 / 已过期）。
 * - 非 dense：完整表格（用于工单缺料预警）。
 * - dense：单行可替代 Chip，hover 显示明细（用于 MRP 净需求行、移动出库行）。
 * 无替代料配置时返回 null，不占用界面。
 */
export default function SubstituteAdvisor({ materialCode, neededQty, dense }: Props) {
  const substitutes = useMaterialStore((s) => s.substitutes);
  const materials = useMaterialStore((s) => s.materials);
  const recs = evaluateSubstitutes(substitutes, materials, materialCode, neededQty || 0);
  if (!recs.length) return null;

  if (dense) {
    const best = recs.find((r) => r.coverage === 'full') || recs.find((r) => r.coverage === 'partial');
    if (!best) return null;
    const title = recs
      .map(
        (r) =>
          `P${r.priority} ${r.substituteName || r.substituteCode}：可用${r.availableStock}` +
          (r.coverage === 'full' ? '（可完全替代）' : r.coverage === 'partial' ? '（部分可替代）' : r.coverage === 'expired' ? '（已过期）' : '（不足）'),
      )
      .join('\n');
    return (
      <Tooltip
        title={
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0, fontFamily: 'inherit', fontSize: 12 }}>
            {title}
          </Box>
        }
      >
        <Chip
          size="small"
          variant="outlined"
          color={best.coverage === 'full' ? 'success' : 'warning'}
          icon={<SwapHorizIcon />}
          label={`可替代：${best.substituteName || best.substituteCode}（P${best.priority}）`}
        />
      </Tooltip>
    );
  }

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>优先级</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>替代料</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>可用量</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>满足需求</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recs.map((r: SubstituteRecommendation) => (
              <TableRow key={r.substituteCode} hover>
                <TableCell>
                  <Typography variant="body2">P{r.priority}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {r.substituteCode}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.substituteName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={r.substituteType === 'full' ? '完全' : '部分'} variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{r.availableStock}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{neededQty ? r.requiredForNeed : '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={COVERAGE_META[r.coverage].label} color={COVERAGE_META[r.coverage].color} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
