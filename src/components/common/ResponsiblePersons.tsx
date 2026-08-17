import { useMemo } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useMaterialStore, useUserStore } from '@/stores';
import { UserRole, ROLE_NAMES } from '@/types/settings';
import { SystemUser } from '@/stores/userStore';
import { CATEGORY_RESPONSIBLE_ROLES } from '@/pages/Material/CategoryList';

export interface ResponsiblePersonsProps {
  /**
   * 需要解析责任人的分类 id 列表。
   * - 物料详情页：传入该物料的 categoryId
   * - 单据页：聚合单据行物料所属分类的 id 集合
   */
  categoryIds: string[];
  /**
   * 限定只展示哪些职能角色（如采购页传 ['buyer']、仓库页传 ['warehouse_keeper']）。
   * 不传则展示所有已分配角色。
   */
  roles?: UserRole[];
  /** 没有任何责任人时是否展示占位提示，默认 false（静默不渲染） */
  showEmpty?: boolean;
  /** 区块标题，默认「物料责任人」 */
  title?: string;
}

/**
 * 物料责任人展示组件（V2.55.17 #694）
 * ------------------------------------------------------------
 * 系统按「角色」识别责任人：同一物料在不同职能上可有不同责任人。
 * 本组件给定一组分类 id，从分类的 responsiblePersons（role -> 用户 id[]）
 * 解析出各角色的责任人，并转换为姓名渲染为 Chip。
 *
 * 各业务页只需一行调用并传入该页相关角色即可：
 *   <MaterialResponsiblePersons categoryIds={[material.categoryId]} />
 *   <MaterialResponsiblePersons categoryIds={catIds} roles={['buyer']} />
 */
export default function ResponsiblePersons({
  categoryIds,
  roles,
  showEmpty = false,
  title = '物料责任人',
}: ResponsiblePersonsProps) {
  const getCategoryById = useMaterialStore((s) => s.getCategoryById);
  const getUserName = useUserStore((s) => s.getUserName);
  const users = useUserStore((s) => s.users);

  // 角色顺序固定，保证各页面展示顺序一致（按 CATEGORY_RESPONSIBLE_ROLES 优先级）
  const rolePriority = CATEGORY_RESPONSIBLE_ROLES;

  const userById = useMemo(() => {
    const m = new Map<string, SystemUser>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  // 聚合所有分类下、各角色的责任人（去重）
  const rolesKey = roles ? roles.join(',') : '';
  const grouped = useMemo(() => {
    const map = new Map<UserRole, Set<string>>();
    for (const cid of categoryIds) {
      if (!cid) continue;
      const cat = getCategoryById(cid);
      if (!cat?.responsiblePersons) continue;
      for (const [role, ids] of Object.entries(cat.responsiblePersons)) {
        const r = role as UserRole;
        if (roles && !roles.includes(r)) continue;
        if (!map.has(r)) map.set(r, new Set());
        ids.forEach((id) => map.get(r)!.add(id));
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIds, getCategoryById, rolesKey]);

  if (grouped.size === 0) {
    if (!showEmpty) return null;
    return (
      <Typography variant="body2" color="text.secondary">
        暂无责任人
      </Typography>
    );
  }

  // 按rolePriority排序，未命中优先级的角色排末尾（保持确定顺序）
  const orderedRoles = [...grouped.keys()].sort((a, b) => {
    const ia = rolePriority.indexOf(a);
    const ib = rolePriority.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Stack spacing={1}>
        {orderedRoles.map((role) => {
          const ids = [...(grouped.get(role) as Set<string>)];
          return (
            <Box
              key={role}
              display="flex"
              alignItems="center"
              gap={1}
              flexWrap="wrap"
            >
              <Typography
                variant="body2"
                sx={{ minWidth: 72, color: 'text.secondary', flexShrink: 0 }}
              >
                {ROLE_NAMES[role]}：
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {ids.map((id) => {
                  const u = userById.get(id);
                  const name = u ? u.name : getUserName(id);
                  const inactive = u?.status === 'inactive';
                  return (
                    <Chip
                      key={id}
                      label={inactive ? `${name}（停用）` : name}
                      size="small"
                      color={inactive ? 'default' : 'primary'}
                      variant={inactive ? 'outlined' : 'filled'}
                    />
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
