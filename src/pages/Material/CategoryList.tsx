import React, { useState, useMemo } from 'react';
import {
  Box, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Paper, Chip, Typography, Stack, Tooltip, Autocomplete, Collapse,
} from '@mui/material';
import {
  Add, Edit, Delete, SubdirectoryArrowRight, ExpandMore, ExpandLess, ChevronRight,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { ConfirmDialog } from '@/components/common';
import { DataTable } from '@/components/common';
import { ColumnDef } from '@tanstack/react-table';
import { useMaterialStore } from '@/stores';
import { useUserStore, type SystemUser } from '@/stores/userStore';
import { MaterialCategory } from '@/types';
import { applyColumnFilters } from '@/utils/listSearch';
import { UserRole, ROLE_NAMES } from '@/types/settings';

type CatRow = MaterialCategory & { _indent: number };

// 递归查找分类
const findCategory = (list: MaterialCategory[], id: string): MaterialCategory | null => {
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findCategory(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// 获取子节点数量（递归）
const countDescendants = (node: MaterialCategory): number => {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.length + node.children.reduce((sum, c) => sum + countDescendants(c), 0);
};

// 按职能维护责任人员时涉及的角色（采购员 / SQE / 工艺工程师 / 研发工程师等），可在此扩展
export const CATEGORY_RESPONSIBLE_ROLES: UserRole[] = [
  'buyer',            // 采购员
  'qa_engineer',      // SQE / 质量工程师
  'process_engineer', // 工艺工程师
  'rd_engineer',      // 研发工程师
  'prod_manager',     // 生产主管
  'warehouse_keeper', // 库管员
];

// 构建分类树下拉选项（用于父级选择）
const buildTreeOptions = (
  nodes: MaterialCategory[],
  depth: number = 0
): { id: string; label: string; depth: number; disabled: boolean }[] => {
  const options: { id: string; label: string; depth: number; disabled: boolean }[] = [];
  nodes.forEach(node => {
    const prefix = '\u00A0\u00A0\u00A0\u00A0'.repeat(depth) + (depth > 0 ? '└ ' : '');
    options.push({
      id: node.id,
      label: prefix + node.name + (node.code ? ` (${node.code})` : ''),
      depth,
      disabled: depth >= 3, // 限制最多4级
    });
    if (node.children) {
      options.push(...buildTreeOptions(node.children, depth + 1));
    }
  });
  return options;
};

const CategoryList: React.FC = () => {
  const { categories: storeCategories } = useMaterialStore();
  const users = useUserStore((s) => s.users);
  const [categories, setCategories] = useState<MaterialCategory[]>(storeCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<MaterialCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MaterialCategory | null>(null);
  const [parentId, setParentId] = useState<string>(''); // 选中的父分类
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // 树形折叠状态：存放「已折叠」节点的 id 集合（默认全部展开）
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // 责任人员区默认折叠（隐藏），需要时由用户展开维护
  const [respOpen, setRespOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    sortOrder: 0,
    sequenceLength: 3,
    responsiblePersons: {} as Record<string, string[]>,
  });

  // 用户 id -> 姓名（用于表格中展示责任人员）
  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    users.forEach((u) => { m[u.id] = u.name; });
    return m;
  }, [users]);

  // 按角色过滤出可指派的用户（仅启用状态）
  const usersByRole = (role: UserRole): SystemUser[] =>
    users.filter((u) => u.role === role && u.status === 'active');

  // 按折叠状态计算可见行（保留父子层级与缩进，折叠节点不展开其子节点）
  const flatRows = useMemo<CatRow[]>(() => {
    const out: CatRow[] = [];
    const walk = (list: MaterialCategory[], lvl: number) => {
      list.forEach(node => {
        const row = { ...node, _indent: lvl } as CatRow;
        out.push(row);
        if (node.children && node.children.length > 0 && !collapsed.has(node.id)) {
          walk(node.children, lvl + 1);
        }
      });
    };
    walk(categories, 0);
    return out;
  }, [categories, collapsed]);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 自动生成子级分类编码：父编码 + 2 位序号段（分类编码即物料编码前缀）
  const buildChildCode = (parentCode: string): string => {
    // 统计与 parentCode 同级且以 parentCode 开头的兄弟段，取下一个序号
    const prefix = parentCode;
    let maxSeg = 0;
    const walk = (nodes: MaterialCategory[]) => {
      for (const n of nodes) {
        if (n.parentId) {
          const p = findCategory(categories, n.parentId);
          if (p && p.code === prefix) {
            const seg = n.code.slice(prefix.length);
            const num = parseInt(seg, 10);
            if (!isNaN(num) && num > maxSeg) maxSeg = num;
          }
        }
        if (n.children) walk(n.children);
      }
    };
    walk(categories);
    return `${prefix}${(maxSeg + 1).toString().padStart(2, '0')}`;
  };

  // 打开新增/编辑弹窗
  const handleOpenDialog = (parentCat?: MaterialCategory, editingCat?: MaterialCategory) => {
    if (editingCat) {
      setEditCategory(editingCat);
      setFormData({
        code: editingCat.code,
        name: editingCat.name,
        description: editingCat.description || '',
        sortOrder: editingCat.sortOrder,
        sequenceLength: editingCat.sequenceLength ?? 3,
        responsiblePersons: { ...(editingCat.responsiblePersons || {}) },
      });
      setParentId(editingCat.parentId || '');
    } else {
      setEditCategory(null);
      const parent = parentCat ? findCategory(categories, parentCat.id) : null;
      const autoCode = parent ? buildChildCode(parent.code) : '';
      setFormData({
        code: autoCode,
        name: '',
        description: '',
        sortOrder: 0,
        sequenceLength: 3,
        responsiblePersons: {},
      });
      setParentId(parentCat ? parentCat.id : '');
    }
    setRespOpen(false);
    setDialogOpen(true);
  };

  // 保存
  const handleSave = () => {
    if (editCategory) {
      // 编辑模式：原地更新
      const updateNode = (nodes: MaterialCategory[]): MaterialCategory[] => {
        return nodes.map(n => {
          if (n.id === editCategory.id) {
            return {
              ...n, ...formData,
              sequenceLength: Number(formData.sequenceLength) || 3,
              parentId: parentId || null,
              updatedAt: new Date().toISOString(),
            };
          }
          if (n.children) return { ...n, children: updateNode(n.children) };
          return n;
        });
      };
      setCategories(updateNode(categories));
    } else {
      // 新增模式
      const parent = parentId ? findCategory(categories, parentId) : null;
      const level = parent ? ((parent.level || 1) + 1) : 1;
      const newCategory: MaterialCategory = {
        id: `cat-${Date.now()}`,
        ...formData,
        sequenceLength: Number(formData.sequenceLength) || 3,
        parentId: parentId || null,
        level,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin',
        updatedBy: 'admin',
      };

      if (parent) {
        // 添加为子节点
        const addToParent = (nodes: MaterialCategory[]): MaterialCategory[] => {
          return nodes.map(n => {
            if (n.id === parentId) {
              return { ...n, children: [...(n.children || []), newCategory] };
            }
            if (n.children) return { ...n, children: addToParent(n.children) };
            return n;
          });
        };
        setCategories(addToParent(categories));
      } else {
        setCategories([...categories, newCategory]);
      }
    }
    setDialogOpen(false);
  };

  // 删除
  const handleDelete = () => {
    if (!deleteConfirm) return;
    const removeNode = (nodes: MaterialCategory[]): MaterialCategory[] => {
      return nodes
        .filter(n => n.id !== deleteConfirm.id)
        .map(n => n.children ? { ...n, children: removeNode(n.children) } : n);
    };
    setCategories(removeNode(categories));
    setDeleteConfirm(null);
  };

  const mapImportRow = (r: Record<string, string>, _headers: string[]): MaterialCategory => ({
    id: `cat-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    parentId: '',
    name: r['分类名称'] || '未命名分类',
    code: r['分类编码'] || '',
    description: r['描述'] || '',
    sortOrder: Number(r['排序']) || 0,
    level: 1,
    responsiblePersons: {},
    children: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin',
  });

  const columns: ColumnDef<CatRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: '分类编码',
        meta: { searchable: true },
        cell: ({ row }) => (
          <Chip label={row.original.code} size="small" variant="outlined" />
        ),
      },
      {
        accessorKey: 'name',
        header: '分类名称',
        meta: { searchable: true },
        cell: ({ row }) => {
          const cat = row.original;
          const hasChildren = !!(cat.children && cat.children.length > 0);
          return (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box
              component="span"
              sx={{
                fontWeight: cat._indent === 0 ? 700 : 400,
                fontSize: cat._indent === 0 ? '0.9rem' : '0.875rem',
                ml: cat._indent * 3,
              }}
            >
              {hasChildren ? (
                <IconButton
                  size="small"
                  onClick={() => toggleCollapse(row.id)}
                  sx={{ p: 0, mr: 0.25, verticalAlign: 'middle' }}
                  data-testid={`cat-toggle-${row.id}`}
                >
                  {collapsed.has(row.id) ? (
                    <ChevronRight sx={{ fontSize: 16 }} />
                  ) : (
                    <ExpandMore sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              ) : cat._indent > 0 ? (
                <SubdirectoryArrowRight
                  sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5, verticalAlign: 'middle' }}
                />
              ) : null}
              {cat.name}
            </Box>
            {hasChildren && (
              <Chip
                label={countDescendants(cat)}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', ml: 1 }}
              />
            )}
          </Stack>
          );
        },
      },
      {
        accessorKey: 'description',
        header: '描述',
        meta: { searchable: true },
        cell: ({ row }) => <Typography variant="body2">{row.original.description || '-'}</Typography>,
      },
      {
        accessorKey: 'level',
        header: '层级',
        meta: { searchable: true },
        cell: ({ row }) => <Typography variant="body2">{(row.original.level || 1)} 级</Typography>,
      },
      {
        id: 'responsiblePersons',
        header: '责任人员',
        accessorFn: (row) => Object.values(row.responsiblePersons || {}).reduce((n, ids) => n + ids.length, 0),
        cell: ({ row }) => {
          const rp = row.original.responsiblePersons || {};
          const assigned = CATEGORY_RESPONSIBLE_ROLES.filter((r) => (rp[r] || []).length > 0);
          if (assigned.length === 0) {
            return <Typography variant="body2" color="text.secondary">-</Typography>;
          }
          const detail = assigned
            .map((r) => `${ROLE_NAMES[r]}：${(rp[r] || []).map((id) => nameById[id] || id).join('、')}`)
            .join('；');
          return (
            <Tooltip title={detail}>
              <Chip size="small" variant="outlined" label={`${assigned.length} 项职责`} />
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'sortOrder',
        header: '排序',
        meta: { searchable: true },
        cell: ({ row }) => <Typography variant="body2">{row.original.sortOrder}</Typography>,
      },
      {
        id: 'actions',
        header: '操作',
        enableSorting: false,
        cell: ({ row }) => {
          const cat = row.original;
          return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            {(cat.level || 1) < 3 && (
              <Tooltip title="添加子分类">
                <IconButton size="small" onClick={() => handleOpenDialog(cat)}>
                  <Add fontSize="small" color="success" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={() => handleOpenDialog(undefined, cat)}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setDeleteConfirm(cat)}>
              <Delete fontSize="small" color="error" />
            </IconButton>
          </Stack>
          );
        },
      },
    ],
    []
  );

  return (
    <PageWrapper
      title="物料分类"
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          新增一级分类
        </Button>
      }
    >
      <Box sx={{ mb: 3 }}>
        <DataTable<CatRow>
          data={flatRows}
          columns={columns}
          enableRowSelection={false}
          enablePagination={true}
          enableSorting={true}
          enableColumnFilter={true}
          enableBlockSelect={true}
          enableExport={true}
          exportFormat="xlsx"
          enableImport={true}
          onImport={(rows, headers) => rows.forEach(r => setCategories(prev => [...prev, mapImportRow(r, headers)]))}
          columnConfigKey="material-category-list"
          hiddenColumns={['responsiblePersons']}
        />
      </Box>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editCategory ? '编辑分类' : '新增分类'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="父级分类"
              value={parentId || ''}
              onChange={e => setParentId(e.target.value)}
              select
              fullWidth
              SelectProps={{ native: true }}
              helperText="一级分类请选择「无」"
            >
              <option value="">无（一级分类）</option>
              {buildTreeOptions(categories, 0)
                .filter(opt => !editCategory || opt.id !== editCategory.id)
                .map(opt => (
                <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </TextField>
            <TextField
              label="分类编码"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              fullWidth required
              helperText={parentId ? '该分类下物料编码的前缀，自动继承父级编码（如父级 01 → 本类 0102）' : '该分类下物料编码的前缀（如：01）'}
            />
            <TextField
              label="分类名称"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              fullWidth required
            />
            <TextField
              label="物料编码流水位数"
              type="number"
              value={formData.sequenceLength}
              onChange={e => setFormData({ ...formData, sequenceLength: Number(e.target.value) })}
              fullWidth
              helperText="该分类下物料的流水号位数（如 3 = 001~999），即「分类编码 + 流水号」生成物料编码"
            />
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" color="text.secondary">该分类下物料编码示例：</Typography>
                <Chip
                  label={formData.code ? `${formData.code}${(1).toString().padStart(Number(formData.sequenceLength) || 3, '0')}` : '（请先填写分类编码）'}
                  color="success"
                  size="small"
                />
              </Stack>
            </Paper>
            <TextField
              label="描述"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              fullWidth multiline rows={2}
            />
            <TextField
              label="排序"
              type="number"
              value={formData.sortOrder}
              onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              fullWidth
            />
            {/* 责任人员：默认折叠隐藏，按需展开按职能维护（采购员/SQE/工艺工程师/研发工程师…） */}
            <Box sx={{ mt: 1, borderTop: '1px dashed', borderColor: 'divider', pt: 1.5 }}>
              <Button
                onClick={() => setRespOpen((v) => !v)}
                endIcon={respOpen ? <ExpandLess /> : <ExpandMore />}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                责任人员（按职能分配，点击展开维护）
              </Button>
              <Collapse in={respOpen}>
                <Stack spacing={1.5} sx={{ pl: 1, pt: 1 }}>
                  {CATEGORY_RESPONSIBLE_ROLES.map((role) => {
                    const opts = usersByRole(role);
                    const value = (formData.responsiblePersons[role] || [])
                      .map((id) => users.find((u) => u.id === id))
                      .filter(Boolean) as SystemUser[];
                    return (
                      <Autocomplete<SystemUser, true>
                        key={role}
                        multiple
                        size="small"
                        disabled={opts.length === 0}
                        options={opts}
                        getOptionLabel={(o) => o.name}
                        value={value}
                        onChange={(_, vals) =>
                          setFormData({
                            ...formData,
                            responsiblePersons: {
                              ...formData.responsiblePersons,
                              [role]: vals.map((v) => v.id),
                            },
                          })
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={ROLE_NAMES[role]}
                            placeholder={opts.length === 0 ? '无该角色用户' : '选择人员'}
                          />
                        )}
                      />
                    );
                  })}
                </Stack>
              </Collapse>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.code || !formData.name}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="确认删除分类"
        content={
          deleteConfirm?.children && deleteConfirm.children.length > 0
            ? `确定要删除分类「${deleteConfirm.name}」及其 ${countDescendants(deleteConfirm)} 个子分类吗？此操作不可恢复！`
            : `确定要删除分类「${deleteConfirm?.name}」吗？`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        type="danger"
      />
    </PageWrapper>
  );
};

export default CategoryList;
