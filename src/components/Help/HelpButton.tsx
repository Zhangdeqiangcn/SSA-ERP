import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Fab, Paper, Typography, IconButton, Divider,
  Accordion, AccordionSummary, AccordionDetails, Chip, Zoom,
} from '@mui/material';
import { HelpOutline, Close, Keyboard } from '@mui/icons-material';
import { useUIStore } from '@/stores/uiStore';

/** 路由到帮助提示的映射 */
const PAGE_HELP: Record<string, { title: string; tips: string[] }> = {
  '/': {
    title: '仪表盘',
    tips: [
      '概览关键经营指标（收入、订单、库存等）',
      '点击 KPI 卡片可下钻查看明细',
      '待办事项区域可快速处理审批、提醒',
    ],
  },
  '/sales/orders': {
    title: '销售订单列表',
    tips: [
      '使用筛选栏按状态、客户、日期过滤订单',
      '点击行进入详情，工具栏可修改、删除、分享',
      '草稿状态的订单可继续编辑提交',
    ],
  },
  '/purchase/orders': {
    title: '采购订单列表',
    tips: [
      '按供应商、状态、日期条件筛选',
      '可录入采购订单、审批或入库',
      '信用额度超限时系统会拦截',
    ],
  },
  '/material/list': {
    title: '物料管理',
    tips: [
      '支持物料编码、规格、单位等维护',
      '可按类型、分组筛选，支持批量导入导出',
      '物料编码生成规则在设置中配置',
    ],
  },
  '/bom/list': {
    title: 'BOM 管理',
    tips: [
      '点击创建 BOM 可从零或从销售订单导入',
      '支持多层 BOM（EBOM/MBOM）',
      'BOM 可关联工艺路线，计算标准成本',
    ],
  },
  '/production/orders': {
    title: '生产工单',
    tips: [
      '从销售订单/MRP 转工单或手动创建',
      '可追踪工单状态：待排产→生产中→完成',
      '工单成本在完工后自动归集',
    ],
  },
  '/finance/invoices': {
    title: '财务管理',
    tips: [
      '发票管理：销售开票与采购收票双向',
      '应收应付管理、费用报销、总账',
      '月度结账前请确认所有凭证已过账',
    ],
  },
  '/workbench': {
    title: '个人工作台',
    tips: [
      '一站式待办中心，聚合各模块的待处理事项',
      '审批流程在此集中处理',
      '支持自定义面板布局',
    ],
  },
  '/settings': {
    title: '系统设置',
    tips: [
      '可配置数据权限、审批流程、自定义字段',
      '编号规则、打印模板、显示设置在此维护',
      '修改后即时生效（部分需刷新页面）',
    ],
  },
  '/warehouse/inventory': {
    title: '库存管理',
    tips: [
      '实时库存查询与批次追溯',
      '支持盘点、调拨、出入库操作',
      '库存预警阈值在物料主数据中设置',
    ],
  },
  '/quality/inspection': {
    title: '质量管理',
    tips: [
      '来料/过程/成品检验任务列表',
      '不合格品处理流程：退货/让步/返工/报废',
      '检验标准可在质量设置中维护',
    ],
  },
};

const FAQ_ITEMS = [
  {
    q: '如何快速搜索数据？',
    a: '在任意页面按 Ctrl+K（Mac: Cmd+K）打开全局搜索，输入关键字即可搜索物料、订单、客户等。',
  },
  {
    q: '快捷键怎么用？',
    a: '按 ? 键（Shift+/）打开快捷键帮助面板。g 组合键可快速跳转模块（如 g+s 跳销售订单）。',
  },
  {
    q: '订单提交失败怎么办？',
    a: '检查如下常见原因：1) 客户信用额度是否充足；2) 必填字段是否完整；3) 供应商是否被拉黑。',
  },
  {
    q: '如何配置审批流程？',
    a: '进入「设置 → 审批流配置」选择业务模块，拖拽节点即可自定义审批链。',
  },
  {
    q: '数据权限如何生效？',
    a: '进入「设置 → 数据权限」开启开关，选择模式（全部可见/仅当前组织），并勾选需要过滤的业务模块。',
  },
  {
    q: '如何导出报表？',
    a: '在列表页顶部工具栏点击「导出」，支持 Excel/CSV 格式。报表中心可设计自定义报表。',
  },
  {
    q: '密码忘记了怎么办？',
    a: '联系系统管理员重置密码，或在登录页点击「忘记密码」按提示操作（需配置邮件服务）。',
  },
  {
    q: 'BOM 版本如何管理？',
    a: '每个 BOM 可创建多个版本，生效后历史版本仍可查看但不可编辑。ECN 管理工程变更审批。',
  },
];

const HelpButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsHelpOpen);

  /** 根据当前路由匹配页面帮助 */
  const currentHelp = PAGE_HELP[location.pathname];

  return (
    <>
      {/* 浮动帮助按钮 */}
      <Zoom in={!open}>
        <Fab
          color="primary"
          size="small"
          aria-label="帮助"
          data-testid="help-btn"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 140, // 靠 AI 按钮上方
            zIndex: 1100,
            width: 40,
            height: 40,
            minHeight: 40,
          }}
        >
          <HelpOutline sx={{ fontSize: 22 }} />
        </Fab>
      </Zoom>

      {/* 帮助面板 */}
      {open && (
        <Paper
          elevation={8}
          data-testid="help-panel"
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 140,
            width: 380,
            maxHeight: '60vh',
            zIndex: 1200,
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 面板标题栏 */}
          <Box
            sx={{
              px: 2, py: 1.5,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              bgcolor: 'primary.main', color: 'primary.contrastText',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpOutline fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>帮助中心</Typography>
            </Box>
            <IconButton size="small" sx={{ color: 'inherit' }} onClick={() => setOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* 面板内容 */}
          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            {/* 当前页面快捷帮助 */}
            {currentHelp && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  当前页面：{currentHelp.title}
                </Typography>
                {currentHelp.tips.map((tip, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                    <Chip label={i + 1} size="small" sx={{ mt: 0.25, height: 18, fontSize: '0.65rem' }} />
                    <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>{tip}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            <Divider />

            {/* 快捷键 */}
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>键盘快捷键</Typography>
                <Chip
                  icon={<Keyboard fontSize="small" />}
                  label="查看全部"
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => setShortcutsOpen(true)}
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {['Ctrl+K', 'Ctrl+S', 'Esc', 'g+n', '?', 'Tab'].map((key) => (
                  <Chip
                    key={key}
                    label={key}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                      bgcolor: 'action.hover',
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Divider />

            {/* FAQ */}
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>常见问题 FAQ</Typography>
              {FAQ_ITEMS.map((item, i) => (
                <Accordion key={i} disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
                  <AccordionSummary sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>{item.q}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.6 }}>{item.a}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default HelpButton;
