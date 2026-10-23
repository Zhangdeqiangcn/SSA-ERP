import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, Alert, Snackbar,
  Switch, Collapse,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Save, Lock,
  Tune, Notifications, Security, People, Assignment, ExpandMore, ExpandLess,
  ShoppingCart, Menu as MenuIcon, AccountTree, Description,
  SwapHoriz, Hub, PhoneAndroid, FactCheck, StarRate, Storage, DarkMode, Storefront,
  Api, Business, Palette, Inventory2, Code, Backup, Search, ChevronRight, VerifiedUser, Translate, Assessment,
  Route, HelpOutline, MenuBook, SmartToy, InfoOutlined,
} from '@mui/icons-material';
import { ROLE_DEFINITIONS, ROLE_NAMES, UserRole } from '@/types/settings';
import { useAuthStore } from '@/stores/authStore';
import BasicConfigTab from './BasicConfigTab';
import MenuConfigTab from './MenuConfigTab';
import ApprovalFlowTab from './ApprovalFlowTab';
import OrderTemplateTab from './OrderTemplateTab';
import UnitConversionTab from './UnitConversionTab';
import IntegrationTab from './IntegrationTab';
import MobileTab from './MobileTab';
import DataDictTab from './DataDictTab';
import OrgTab from './OrgTab';
import CustomFieldTab from './CustomFieldTab';
import PrintTemplateTab from './PrintTemplateTab';
// 物料审批已合并到审批流程，不再单独展示
import MaterialRatingTab from '@/pages/Material/MaterialRatingTab';
import DisplaySettingsTab from './DisplaySettingsTab';
import VendorRatingTab from '@/pages/Vendor/VendorRatingTab';
import InspectionStandardConfigTab from './InspectionStandardConfigTab';
import VendorPortalConfigTab from './VendorPortalConfigTab';
import NumberingTab from './NumberingTab';
import DataPermissionTab from './DataPermissionTab';
import RolePermissionTab from './RolePermissionTab';
import SalesPriceTab from './SalesPriceTab';
import ServerAuditTab from './ServerAuditTab';
import DataManagement from './DataManagement';
import ConditionTab from './ConditionTab';
import APIDocTab from './APIDocTab';
import LowCodeDesigner from '@/pages/Platform/LowCodeDesigner';
import WorkflowEngine from '@/pages/Platform/WorkflowEngine';
import IntegrationHub from '@/pages/Platform/IntegrationHub';
import FieldPermissions from '@/pages/Platform/FieldPermissions';
import I18nSettings from '@/pages/Platform/I18nSettings';
import AIConfigPage from '@/pages/Settings/AIConfig/AIConfigPage';
import ChannelAuthTab from '@/pages/Settings/ChannelAuthTab';
import AutomationTab from '@/pages/Settings/AutomationTab';
import TaxConfigPage from '@/pages/Settings/TaxConfig/TaxConfigPage';
import UserManagementTab from './UserManagementTab';
import OrgInviteCodeTab from './OrgInviteCodeTab';
import SecurityCenterTab from './SecurityCenterTab';
import SystemInfoTab from './SystemInfoTab';

// ── 表单权限配置 ──────────────────────────────────────────────
const FORM_PERMISSIONS = [
  {
    group: '生产管理',
    color: '#8B5CF6',
    forms: [
      { id: 'work_order', name: '生产工单', desc: '工单创建、工序派工、完工报告' },
      { id: 'mrp', name: 'MRP计划', desc: 'MRP运算、需求查看、计划调整' },
      { id: 'process_route', name: '工艺路线', desc: '路线定义、工序参数管理' },
    ],
  },
  {
    group: '采购管理',
    color: '#3B82F6',
    forms: [
      { id: 'purchase_request', name: '采购申请', desc: '申请创建、提交审批、审批' },
      { id: 'purchase_order', name: '采购订单', desc: '订单创建、确认、变更、关闭' },
      { id: 'price_compare', name: '比价管理', desc: '报价比较、定价决策' },
      { id: 'order_track', name: '订单跟踪', desc: '交货进度查看、催货' },
    ],
  },
  {
    group: '销售管理',
    color: '#F97316',
    forms: [
      { id: 'sales_order', name: '销售订单', desc: '订单创建、审批、跟踪' },
      { id: 'sales_prospect', name: '意向客户', desc: '客户开发、跟进、转化' },
      { id: 'sales_project', name: '项目管理', desc: '项目进度、异常反馈' },
      { id: 'sales_logistics', name: '物流发货', desc: '发货计划、物流跟踪' },
    ],
  },
  {
    group: '供应商管理',
    color: '#F59E0B',
    forms: [
      { id: 'vendor_register', name: '供应商注册', desc: '新供应商注册申请（含供应商自助）' },
      { id: 'vendor_approval', name: '供应商审批', desc: '注册审批、资质审核' },
      { id: 'vendor_order_confirm', name: '订单确认', desc: '供应商侧确认采购订单（供应商界面）' },
      { id: 'delivery_shipment', name: '发货物流', desc: '发货通知、物流跟踪（供应商界面）' },
      { id: 'vendor_quality_issue', name: '质量问题单', desc: '质量问题创建、响应、关闭' },
      { id: 'vendor_8d', name: '8D改善报告', desc: '改善报告提交与审核（供应商界面）' },
      { id: 'vendor_statement', name: '对账单', desc: '月度对账单生成与确认' },
      { id: 'vendor_invoice', name: '开票申请', desc: '发票申请、审核、认证（供应商界面）' },
    ],
  },
  {
    group: '仓储物流',
    color: '#10B981',
    forms: [
      { id: 'inbound', name: '采购入库单', desc: '入库单创建、实收录入' },
      { id: 'outbound', name: '出库单', desc: '出库申请、发料确认' },
      { id: 'fg_inbound', name: '成品入库单', desc: '成品入库、关联生产工单' },
      { id: 'inventory_check', name: '库存盘点单', desc: '盘点任务、差异处理' },
    ],
  },
  {
    group: '质量管理',
    color: '#EF4444',
    forms: [
      { id: 'inspection_notice', name: '报检单', desc: '来料/成品报检，关联检验单' },
      { id: 'inspection_task', name: '检验单', desc: '检验结果录入、判定' },
      { id: 'unqualified', name: '不合格品处理单', desc: '不合格品隔离、让步/退货/报废处理' },
      { id: 'pdca', name: 'PDCA改善单', desc: '质量改善立项与跟踪' },
    ],
  },
  {
    group: '财务管理',
    color: '#6366F1',
    forms: [
      { id: 'invoice_mgmt', name: '发票管理', desc: '发票登记、验证、归档' },
      { id: 'payment_plan', name: '付款计划', desc: '付款计划制定与审批' },
      { id: 'accounting', name: '会计凭证', desc: '凭证录入、审核、过账' },
      { id: 'tax_accounting', name: '税务核算', desc: '税单管理、税务申报' },
      { id: 'project_accounting', name: '项目核算', desc: '项目成本、预算跟踪' },
    ],
  },
];

const PERMISSION_ACTIONS = ['查看', '新建', '编辑', '删除', '审批', '导出'];

const rolePermMap: Record<string, Record<string, boolean[]>> = {
  admin: Object.fromEntries(FORM_PERMISSIONS.flatMap(g => g.forms.map(f => [f.id, [true, true, true, true, true, true]]))),
  buyer: Object.fromEntries(
    FORM_PERMISSIONS.flatMap(g => g.forms.map(f => {
      if (['purchase_request', 'purchase_order', 'price_compare', 'order_track', 'sales_order', 'sales_prospect'].includes(f.id)) return [f.id, [true, true, true, false, false, true]];
      if (['vendor_order_confirm', 'delivery_shipment', 'vendor_quality_issue', 'vendor_statement'].includes(f.id)) return [f.id, [true, false, false, false, false, true]];
      return [f.id, [true, false, false, false, false, false]];
    }))
  ),
  qa_engineer: Object.fromEntries(
    FORM_PERMISSIONS.flatMap(g => g.forms.map(f => {
      if (['inspection_notice', 'inspection_task', 'unqualified', 'pdca', 'vendor_quality_issue', 'vendor_8d'].includes(f.id)) return [f.id, [true, true, true, false, true, true]];
      return [f.id, [true, false, false, false, false, false]];
    }))
  ),
  warehouse_keeper: Object.fromEntries(
    FORM_PERMISSIONS.flatMap(g => g.forms.map(f => {
      if (['inbound', 'outbound', 'fg_inbound', 'inventory_check'].includes(f.id)) return [f.id, [true, true, true, false, false, true]];
      return [f.id, [true, false, false, false, false, false]];
    }))
  ),
};

/** 表单权限矩阵面板 */
function FormPermissionPanel() {
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleGroup = (g: string) => setExpanded(prev => ({ ...prev, [g]: !prev[g] }));
  const currentPerms = rolePermMap[selectedRole] || rolePermMap.admin;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>选择角色：</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {ROLE_DEFINITIONS.slice(0, 6).map(r => (
            <Chip key={r.id} label={r.name} size="small"
              color={selectedRole === r.id ? 'primary' : 'default'}
              onClick={() => setSelectedRole(r.id)}
              sx={{ cursor: 'pointer', fontWeight: selectedRole === r.id ? 600 : 400 }} />
          ))}
        </Box>
      </Box>

      {FORM_PERMISSIONS.map(group => {
        const isOpen = expanded[group.group] !== false;
        return (
          <Paper key={group.group} elevation={0}
            sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, mb: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: group.color + '10', display: 'flex', alignItems: 'center',
              cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleGroup(group.group)}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: group.color, mr: 1.5 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>{group.group}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>{group.forms.length} 个表单</Typography>
              {isOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
            </Box>
            <Collapse in={isOpen}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', minWidth: 180 }}>表单名称</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>说明</TableCell>
                      {PERMISSION_ACTIONS.map(a => (
                        <TableCell key={a} align="center" sx={{ fontWeight: 600, fontSize: '0.8rem', minWidth: 56 }}>{a}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.forms.map(form => {
                      const perms = currentPerms[form.id] || [false, false, false, false, false, false];
                      return (
                        <TableRow key={form.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{form.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{form.desc}</Typography>
                          </TableCell>
                          {PERMISSION_ACTIONS.map((a, i) => (
                            <TableCell key={a} align="center">
                              <Switch
                                size="small"
                                checked={perms[i] || false}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': { color: group.color },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: group.color },
                                }}
                                disabled={selectedRole === 'admin'}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Paper>
        );
      })}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button variant="contained" startIcon={<Save />}>保存权限配置</Button>
      </Box>
    </Box>
  );
}

// ── 设置项分组数据模型 ──────────────────────────────────────
interface SettingItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  render: () => React.ReactNode;
  /** 仅管理员（super_admin / admin）可见，对应后端已收口的特权配置键 */
  adminOnly?: boolean;
}
interface SettingGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: SettingItem[];
}

const Settings: React.FC = () => {
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const [switchDialog, setSwitchDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [selectedName, setSelectedName] = useState('');
  const { currentUser, switchRole } = useAuthStore();
  const navigate = useNavigate();

  // 管理员判定：与后端收口一致（super_admin / admin）。非管理员不展示特权配置入口。
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  // 左侧导航状态
  // 支持 ?tab=xxx 直达某个设置项（供全局搜索 / 帮助中心指引使用，例：/settings?tab=sysinfo）
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'basic';
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(initialTab);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    enterprise: true, user: false, oa: false, ux: false, supply: false, integration: false, dataops: false,
    help: initialTab === 'sysinfo' || initialTab === 'manual',
  });

  // 组件已挂载时再次通过 ?tab= 跳入（如从全局搜索点「系统信息」）也要生效
  useEffect(() => {
    const t = searchParams.get('tab');
    if (!t) return;
    setActiveId(t);
    if (t === 'sysinfo' || t === 'manual') {
      setExpandedGroups(prev => ({ ...prev, help: true }));
    }
  }, [searchParams]);

  const handleSave = () => setSnackbar({ open: true, msg: '设置已保存' });

  const handleSwitchRole = () => {
    if (selectedName && selectedRole) {
      switchRole(selectedRole, selectedName);
      setSwitchDialog(false);
      setSnackbar({ open: true, msg: `已切换到角色：${ROLE_NAMES[selectedRole]}` });
    }
  };

  // ── 内联内容（原扁平 Tab 中直接写在 Settings 内的部分） ──
  const renderProcurementStrategy = () => (
    <Grid container spacing={3} sx={{ p: 3 }}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1E293B' }}>价格抓取策略</Typography>
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          设置创建采购订单时自动从价目表抓取物料价格的规则。采购员可在订单中手动覆盖自动抓取的价格。
        </Alert>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>价格来源优先级</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>价格抓取规则</InputLabel>
            <Select defaultValue="latest-valid" label="价格抓取规则">
              <MenuItem value="latest-valid">有效期内的最新价格（推荐）</MenuItem>
              <MenuItem value="lowest-valid">有效期内最低价格</MenuItem>
              <MenuItem value="latest-approved">最新审批通过价格</MenuItem>
              <MenuItem value="manual">不自动抓取（全部手工输入）</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            默认为「有效期内的最新价格」：系统自动匹配物料编码，查找状态为「有效」且在有效期内的价目表记录，按生效日期降序取最新一条。
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>供应商匹配规则</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>默认供应商选择</InputLabel>
            <Select defaultValue="auto-price" label="默认供应商选择">
              <MenuItem value="auto-price">跟随价目表（按价格策略自动匹配）</MenuItem>
              <MenuItem value="last-order">最近一次采购的供应商</MenuItem>
              <MenuItem value="manual-select">手工选择</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>多供应商策略</InputLabel>
            <Select defaultValue="allow-multi" label="多供应商策略">
              <MenuItem value="allow-multi">允许不同物料选择不同供应商</MenuItem>
              <MenuItem value="single-vendor">整单统一供应商</MenuItem>
            </Select>
          </FormControl>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>价格有效期校验</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>严格校验价格有效期</Typography>
                <Typography variant="caption" color="text.secondary">仅抓取当前日期在有效期内的价格</Typography>
              </Box>
              <Switch defaultChecked />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>允许抓取即将过期价格</Typography>
                <Typography variant="caption" color="text.secondary">到期前30天内的价格仍可使用</Typography>
              </Box>
              <Switch defaultChecked />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>过期价格预警</Typography>
                <Typography variant="caption" color="text.secondary">抓取的价格距过期不足15天时提示</Typography>
              </Box>
              <Switch defaultChecked />
            </Box>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>价格允许浮动范围</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="允许上浮比例"
              defaultValue="5"
              type="number"
              InputProps={{ endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>%</Typography> }}
              helperText="采购订单价格超过价目表价格的上限，超出需审批"
            />
            <TextField
              label="允许下浮比例"
              defaultValue="20"
              type="number"
              InputProps={{ endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>%</Typography> }}
              helperText="采购订单价格低于价目表的优惠下限，可不审批自动通过"
            />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderNotification = () => (
    <Grid container spacing={3} sx={{ p: 3 }}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1E293B' }}>联系方式</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="管理员邮箱" defaultValue="admin@ssa.com" fullWidth type="email" />
          <TextField label="联系电话" defaultValue="400-888-8888" fullWidth />
          <TextField label="运维群" defaultValue="SSA-ERP-维护群" fullWidth />
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1E293B' }}>推送配置</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>采购到期提醒</InputLabel>
            <Select defaultValue="3" label="采购到期提醒">
              <MenuItem value="1">提前1天</MenuItem>
              <MenuItem value="3">提前3天</MenuItem>
              <MenuItem value="7">提前7天</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>库存预警阈值</InputLabel>
            <Select defaultValue="20" label="库存预警阈值">
              <MenuItem value="10">低于10%时预警</MenuItem>
              <MenuItem value="20">低于20%时预警</MenuItem>
              <MenuItem value="30">低于30%时预警</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Grid>
    </Grid>
  );

  // 「用户管理」Tab：接入真实账号管理（UserManagementTab，数据来自 /api/users）。
  // 「切换当前角色」是演示工具，仅开发环境或超管可见——系统已有真实审批与角色，普通员工不应能自行切换身份视角。
  const renderUserManagement = () => (
    <Box>
      {(import.meta.env.DEV || currentUser?.role === 'super_admin') && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 3, pt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Lock />}
            onClick={() => setSwitchDialog(true)}
            size="small"
            data-testid="user-switch-role"
          >
            切换当前角色（测试用）
          </Button>
        </Box>
      )}
      <UserManagementTab />
    </Box>
  );

  // 「安全中心」Tab：超级管理员的账号安全设置（双邮箱验证改密、邮件通道配置、版本通知）。
  // 仅超管可用——其它角色看到明确的说明，避免误以为功能缺失。
  const renderSecurityCenter = () => {
    if (currentUser?.role !== 'super_admin' && !import.meta.env.DEV) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            安全中心仅对<strong>超级管理员</strong>开放。当前账号角色为
            「{ROLE_NAMES[currentUser?.role as UserRole] || currentUser?.role || '未知'}」，
            如需调整账号安全设置，请联系系统超级管理员。
          </Alert>
        </Box>
      );
    }
    return <SecurityCenterTab />;
  };

  const renderRolePermissions = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1E293B' }}>角色权限矩阵</Typography>
      <Grid container spacing={2}>
        {ROLE_DEFINITIONS.map((role) => (
          <Grid item xs={12} sm={6} md={4} key={role.id}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                borderColor: role.color + '40',
                bgcolor: role.color + '08',
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: role.color + '20', color: role.color, fontSize: '0.875rem' }}>
                  {role.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B' }}>{role.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>{role.description}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {role.permissions.includes('*') ? (
                  <Chip label="全部权限" size="small" sx={{ bgcolor: role.color + '20', color: role.color, fontSize: '0.6875rem' }} />
                ) : (
                  role.permissions.slice(0, 6).map(p => (
                    <Chip key={p} label={p} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontSize: '0.6875rem' }} />
                  ))
                )}
                {role.permissions.length > 6 && !role.permissions.includes('*') && (
                  <Chip label={`+${role.permissions.length - 6}`} size="small" sx={{ bgcolor: role.color + '15', color: role.color, fontSize: '0.6875rem' }} />
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // ── 分组导航模型 ───────────────────────────────────────────
  const groups: SettingGroup[] = [
    {
      id: 'enterprise', label: '企业基础', icon: <Business fontSize="small" />,
      items: [
        { id: 'basic', label: '基本设置', icon: <Tune fontSize="small" />, render: () => <BasicConfigTab /> },
        { id: 'org', label: '组织账套', icon: <Hub fontSize="small" />, render: () => <OrgTab /> },
        { id: 'datadict', label: '数据字典', icon: <Storage fontSize="small" />, render: () => <DataDictTab /> },
        { id: 'numbering', label: '编号规则', icon: <Description fontSize="small" />, render: () => <NumberingTab /> },
      ],
    },
    {
      id: 'user', label: '用户与权限', icon: <People fontSize="small" />,
      items: [
        { id: 'users', label: '用户管理', icon: <People fontSize="small" />, adminOnly: true, render: renderUserManagement },
        { id: 'invitecode', label: '公司与邀请码', icon: <Business fontSize="small" />, adminOnly: true, render: () => <OrgInviteCodeTab /> },
        { id: 'security', label: '安全中心', icon: <VerifiedUser fontSize="small" />, render: renderSecurityCenter },
        { id: 'roles', label: '角色权限', icon: <Security fontSize="small" />, adminOnly: true, render: renderRolePermissions },
        { id: 'forms', label: '表单权限', icon: <Assignment fontSize="small" />, adminOnly: true, render: () => <FormPermissionPanel /> },
        { id: 'dataperm', label: '数据权限', icon: <Security fontSize="small" />, adminOnly: true, render: () => <DataPermissionTab /> },
        { id: 'roleperm', label: '角色操作权限', icon: <VerifiedUser fontSize="small" />, adminOnly: true, render: () => <RolePermissionTab /> },
        { id: 'fieldperm', label: '字段级权限', icon: <VerifiedUser fontSize="small" />, adminOnly: true, render: () => <FieldPermissions /> },
      ],
    },
    {
      id: 'oa', label: 'OA流程定制', icon: <AccountTree fontSize="small" />,
      items: [
        { id: 'approval', label: '审批流程', icon: <AccountTree fontSize="small" />, adminOnly: true, render: () => <ApprovalFlowTab /> },
        { id: 'workflowEngine', label: '工作流引擎', icon: <Route fontSize="small" />, render: () => <WorkflowEngine /> },
        { id: 'lowcode', label: '表单设计器', icon: <Description fontSize="small" />, render: () => <LowCodeDesigner /> },
        { id: 'material_rating', label: '物料评级', icon: <StarRate fontSize="small" />, render: () => <MaterialRatingTab /> },
        { id: 'vendor_rating', label: '供应商评级', icon: <StarRate fontSize="small" />, render: () => <VendorRatingTab /> },
        { id: 'inspection_standard', label: '检验标准配置', icon: <StarRate fontSize="small" />, render: () => <InspectionStandardConfigTab /> },
        { id: 'condition', label: '条件技术', icon: <Tune fontSize="small" />, render: () => <ConditionTab /> },
      ],
    },
    {
      id: 'ux', label: '界面与体验', icon: <Palette fontSize="small" />,
      items: [
        { id: 'menu', label: '菜单配置', icon: <MenuIcon fontSize="small" />, render: () => <MenuConfigTab /> },
        { id: 'display', label: '显示与主题', icon: <DarkMode fontSize="small" />, render: () => <DisplaySettingsTab /> },
        { id: 'mobile', label: '移动端', icon: <PhoneAndroid fontSize="small" />, render: () => <MobileTab /> },
        { id: 'customfield', label: '自定义字段', icon: <Tune fontSize="small" />, render: () => <CustomFieldTab /> },
        { id: 'print', label: '打印模板', icon: <Description fontSize="small" />, render: () => <PrintTemplateTab /> },
        { id: 'ordertemplate', label: '订单模板', icon: <Description fontSize="small" />, render: () => <OrderTemplateTab /> },
        { id: 'notify', label: '通知设置', icon: <Notifications fontSize="small" />, render: renderNotification },
        { id: 'i18n', label: '多语言', icon: <Translate fontSize="small" />, render: () => <I18nSettings /> },
      ],
    },
    {
      id: 'supply', label: '供应链策略', icon: <Inventory2 fontSize="small" />,
      items: [
        { id: 'purchase', label: '采购策略', icon: <ShoppingCart fontSize="small" />, render: renderProcurementStrategy },
        { id: 'automation', label: '自动化设置中心', icon: <Assessment fontSize="small" />, adminOnly: true, render: () => <AutomationTab /> },
        { id: 'salesprice', label: '销售价目表', icon: <ShoppingCart fontSize="small" />, render: () => <SalesPriceTab /> },
        { id: 'unit', label: '单位换算', icon: <SwapHoriz fontSize="small" />, render: () => <UnitConversionTab /> },
        { id: 'vendorportal', label: '供应商门户', icon: <Storefront fontSize="small" />, render: () => <VendorPortalConfigTab /> },
      ],
    },
    {
      id: 'integration', label: '集成与开发', icon: <Code fontSize="small" />,
      items: [
          { id: 'channel-auth', label: '电商平台连接', icon: <Storefront fontSize="small" />, adminOnly: true, render: () => <ChannelAuthTab /> },
          { id: 'integration', label: '第三方对接通道', icon: <Hub fontSize="small" />, render: () => <IntegrationTab /> },
        { id: 'integrationHub', label: '开放接口与Webhook', icon: <Api fontSize="small" />, render: () => <IntegrationHub /> },
        { id: 'api', label: 'API接口文档', icon: <Code fontSize="small" />, render: () => <APIDocTab /> },
        { id: 'ai', label: 'AI大模型配置', icon: <SmartToy fontSize="small" />, render: () => <AIConfigPage /> },
        { id: 'tax', label: '金税系统配置', icon: <FactCheck fontSize="small" />, render: () => <TaxConfigPage /> },
        { id: 'server', label: '服务端与审计', icon: <Security fontSize="small" />, adminOnly: true, render: () => <ServerAuditTab /> },
      ],
    },
    {
      id: 'dataops', label: '数据与运维', icon: <Backup fontSize="small" />,
      items: [
        { id: 'datamgmt', label: '数据管理', icon: <Storage fontSize="small" />, render: () => <DataManagement /> },
      ],
    },
    {
      id: 'help', label: '帮助中心', icon: <HelpOutline fontSize="small" />,
      items: [
        {
          id: 'sysinfo',
          label: '系统信息',
          icon: <InfoOutlined fontSize="small" />,
          render: () => <SystemInfoTab />,
        },
        {
          id: 'manual',
          label: '使用说明书',
          icon: <MenuBook fontSize="small" />,
          render: () => (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>SSA ERP 使用说明书</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
                覆盖每个表单的用途、为何这样操作、关键字段、操作流程与注意事项；并提供「版本更新记录」供每次升级后查阅变更。
              </Typography>
              <Button variant="contained" startIcon={<MenuBook />} onClick={() => navigate('/help/manual')}>
                打开使用说明书
              </Button>
            </Box>
          ),
        },
      ],
    },
  ];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // 角色门控：非管理员剔除 adminOnly 配置项（与后端 403 收口保持一致），搜索过滤叠加生效
  const roleFilteredGroups = useMemo(
    () => (isAdmin
      ? groups
      : groups.map(g => ({ ...g, items: g.items.filter(it => !it.adminOnly) }))),
    [isAdmin] // groups 为组件内常量，仅角色变化时重算
  );

  const q = query.trim().toLowerCase();
  const filteredGroups = q
    ? roleFilteredGroups
        .map(g => ({ ...g, items: g.items.filter(it => it.label.toLowerCase().includes(q)) }))
        .filter(g => g.items.length > 0)
    : roleFilteredGroups;

  // 若当前选中的 Tab 因角色过滤变得不可见，自动回退到第一个可见项，避免内容区空白
  const roleVisibleIds = useMemo(
    () => roleFilteredGroups.flatMap(g => g.items.map(it => it.id)),
    [roleFilteredGroups]
  );
  useEffect(() => {
    if (!roleVisibleIds.includes(activeId)) {
      setActiveId(roleVisibleIds[0] ?? '');
    }
  }, [roleVisibleIds, activeId]);

  const activeGroup = filteredGroups.find(g => g.items.some(it => it.id === activeId)) || roleFilteredGroups.find(g => g.items.some(it => it.id === activeId));
  const activeItem = activeGroup?.items.find(it => it.id === activeId);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>系统设置</Typography>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave}>保存设置</Button>
      </Box>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 620 }}>
          {/* 左侧分组导航 */}
          <Box sx={{
            width: { xs: '100%', md: 280 },
            borderRight: { md: '1px solid rgba(226,232,240,0.8)' },
            borderBottom: { xs: '1px solid rgba(226,232,240,0.8)', md: 'none' },
            p: 1.5, overflowY: 'auto', maxHeight: { xs: 300, md: 'calc(100vh - 200px)' },
          }}>
            <TextField
              fullWidth size="small" placeholder="搜索设置项"
              value={query} onChange={(e) => setQuery(e.target.value)}
              InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: '#94A3B8' }} /> }}
              sx={{ mb: 1.5 }}
            />
            {filteredGroups.map(g => (
              <Accordion key={g.id} expanded={expandedGroups[g.id] !== false} onChange={() => toggleGroup(g.id)} sx={{ mb: 0.5, boxShadow: 'none', border: '1px solid rgba(226,232,240,0.6)' }}>
                <AccordionSummary expandIcon={<ExpandMore sx={{ fontSize: 18 }} />} sx={{ bgcolor: '#F8FAFC', py: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Box sx={{ color: '#94A3B8' }}>{g.icon}</Box>
                    <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.72rem', flex: 1 }}>
                      {g.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{g.items.length}项</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0.5, py: 0.5 }}>
                  {g.items.map(it => {
                    const active = it.id === activeId;
                    return (
                      <Button
                        key={it.id}
                        fullWidth
                        startIcon={it.icon}
                        onClick={() => {
                          if (it.id === 'manual') { navigate('/help/manual'); return; }
                          setActiveId(it.id);
                        }}
                        sx={{
                          justifyContent: 'flex-start', textTransform: 'none', fontSize: '0.875rem',
                          py: 0.9, px: 1.5, mb: 0.25, borderRadius: 1,
                          color: active ? 'primary.main' : '#475569',
                          bgcolor: active ? 'primary.main' + '10' : 'transparent',
                          fontWeight: active ? 600 : 400,
                          '&:hover': { bgcolor: active ? 'primary.main' + '18' : 'rgba(148,163,184,0.12)' },
                        }}
                      >
                        {it.label}
                      </Button>
                    );
                  })}
                </AccordionDetails>
              </Accordion>
            ))}
            {filteredGroups.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 2 }}>
                未找到匹配「{query}」的设置项
              </Typography>
            )}
          </Box>

          {/* 右侧内容区 */}
          <Box sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
            {activeGroup && activeItem && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, color: '#94A3B8' }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{activeGroup.label}</Typography>
                <ChevronRight sx={{ fontSize: 16 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1E293B' }}>{activeItem.label}</Typography>
              </Box>
            )}
            {activeItem ? activeItem.render() : null}
          </Box>
        </Box>
      </Paper>

      {/* 切换角色对话框 */}
      <Dialog open={switchDialog} onClose={() => setSwitchDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>切换角色（测试用）</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>选择角色</InputLabel>
              <Select
                value={selectedRole}
                label="选择角色"
                onChange={(e) => {
                  setSelectedRole(e.target.value as UserRole);
                  const def = ROLE_DEFINITIONS.find(r => r.id === e.target.value);
                  if (def) setSelectedName(def.name);
                }}
              >
                {ROLE_DEFINITIONS.map(r => (
                  <MenuItem key={r.id} value={r.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
                      {r.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="显示名称"
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSwitchDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSwitchRole}>切换</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ open: false, msg: '' })}
        message={snackbar.msg}
      />
    </Box>
  );
};

export default Settings;
