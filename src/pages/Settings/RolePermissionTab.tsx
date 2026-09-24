import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, FormControlLabel, Chip, Button,
  Alert, Stack, IconButton, Tooltip,
} from '@mui/material';
import { Delete, CheckCircle, Warning } from '@mui/icons-material';
import { useDataPermissionStore, type RoleModuleOperation } from '@/stores/dataPermissionStore';
import { ROLE_DEFINITIONS } from '@/types/settings';

const MODULE_LABELS: Record<string, string> = {
  material: '物料',
  vendor: '供应商',
  customer: '客户',
  purchase: '采购',
  sales: '销售',
  warehouse: '仓储',
  quality: '质量',
  production: '生产',
  finance: '财务',
};

const OPERATION_KEYS = ['create', 'read', 'update', 'delete'] as const;
const OPERATION_LABELS: Record<string, string> = {
  create: '新增',
  read: '查看',
  update: '修改',
  delete: '删除',
};

const OPERATION_COLORS = {
  create: 'success' as const,
  read: 'info' as const,
  update: 'warning' as const,
  delete: 'error' as const,
};

/**
 * 角色操作权限配置页（V2.91.0 新增）
 * ------------------------------------------------------------
 * 每个角色 × 模块配置增/删/改/查开关。
 * - admin/owner/boss 默认全权限，不可修改（只读展示）
 * - 其他角色可按需调整
 */
const RolePermissionTab: React.FC = () => {
  const { roleModuleOps, setRoleModuleOp } = useDataPermissionStore();

  // 构建操作权限表格数据
  const opsData = ROLE_DEFINITIONS.map((roleDef) => {
    const roleOps = roleModuleOps.filter((op) => op.role === roleDef.id);
    const hasWildcard = roleOps.some((op) => op.module === '*');
    return {
      role: roleDef.id,
      roleName: roleDef.name,
      isPrivileged: ['super_admin', 'admin'].includes(roleDef.id),
      modules: Object.entries(MODULE_LABELS).map(([key, label]) => {
        const op = roleOps.find((o) => o.module === key) || (hasWildcard ? roleOps.find((o) => o.module === '*') : null);
        return {
          key,
          label,
          operations: op?.operations ?? { create: false, read: true, update: false, delete: false },
        };
      }),
    };
  });

  // 切换某个角色某模块的某个操作权限
  const handleToggle = (role: string, module: string, operation: keyof RoleModuleOperation['operations']) => {
    const roleOps = roleModuleOps.filter((op) => op.role === role);
    const existing = roleOps.find((op) => op.module === module);
    const newOps = existing
      ? { ...existing.operations, [operation]: !existing.operations[operation] }
      : { create: false, read: true, update: false, delete: false };
    newOps[operation] = !newOps[operation];
    setRoleModuleOp(role, module, newOps);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>角色操作权限</Typography>
      <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
        配置每个角色对各业务模块的增/删/改/查权限（仅前端展示，当前服务端尚未强制生效，详见下方说明）。
      </Typography>

      <Alert severity="warning" sx={{ mb: 2, alignItems: 'center' }}>
        <Warning fontSize="small" sx={{ mr: 1 }} />
        本配置<strong>仅为前端展示，服务端尚未强制生效</strong>：即使在此关闭某角色的某项操作，
        该角色仍可直接调用接口完成对应动作。真正启用需后端逐接口接入权限校验（属专项改造），请不要在「已禁用」上误以为已封锁。
      </Alert>

      <Alert severity="info" sx={{ mb: 2, alignItems: 'center' }}>
        <Warning fontSize="small" sx={{ mr: 1 }} />
        管理员/老板角色（admin/owner/boss）默认拥有全部权限，此处仅展示不可修改。
      </Alert>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>角色</TableCell>
              {Object.entries(MODULE_LABELS).map(([key, label]) => (
                <TableCell key={key} sx={{ fontWeight: 600 }} align="center">
                  {label}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell />
              {Object.entries(MODULE_LABELS).map(([key]) => (
                <TableCell key={key} sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }} align="center">
                  新增/查看/修改/删除
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {opsData.map((row) => (
              <React.Fragment key={row.role}>
                <TableRow hover>
                  <TableCell>
                    <Chip
                      label={row.roleName}
                      size="small"
                      color={row.isPrivileged ? 'primary' : 'default'}
                      variant={row.isPrivileged ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  {row.modules.map((mod) => (
                    <TableCell key={mod.key} align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {OPERATION_KEYS.map((op) => (
                          <Tooltip
                            key={op}
                            title={`${mod.label} ${OPERATION_LABELS[op]}${mod.operations[op] ? '' : '（已禁用）'}`}
                          >
                            <IconButton
                              size="small"
                              disabled={row.isPrivileged}
                              onClick={() => handleToggle(row.role, mod.key, op)}
                              color={mod.operations[op] ? OPERATION_COLORS[op] : 'default'}
                              sx={{ p: 0.25 }}
                            >
                              {mod.operations[op] ? (
                                <CheckCircle fontSize="small" />
                              ) : (
                                <Delete fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Stack>
                    </TableCell>
                  ))}
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>说明</Typography>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#64748B', fontSize: '0.875rem' }}>
          <li>绿色勾 = 有权限，红色叉 = 无权限</li>
          <li><strong>当前状态：本页配置仅作前端展示，服务端未强制。</strong>列表页按钮是否按此隐藏、详情页编辑/删除是否拦截，均以各页面实际实现为准；若某页面未读取本配置，则配置不影响其功能。</li>
          <li>字段级敏感信息仍由「字段级权限」配置控制（同样为前端隐藏，服务端强制已在 V3.21.0 落地）。</li>
        </ul>
      </Box>
    </Box>
  );
};

export default RolePermissionTab;
