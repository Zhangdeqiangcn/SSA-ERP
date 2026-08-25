import React from 'react';
import { Box, Typography, Breadcrumbs, Link, Paper } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const pathNameMap: Record<string, string> = {
  '/': '首页',
  '/material/categories': '物料分类',
  '/material/list': '物料列表',
  '/material/create': '新增物料',
  '/material/code-rules': '物料分类',
  '/vendor/list': '供应商列表',
  '/vendor/register': '供应商注册',
  '/vendor/blacklist': '黑名单管理',
  '/vendor/rating': '评级管理',
  '/vendor/approvals': '准入审核',
  '/purchase/requests': '采购申请',
  '/purchase/create': '新建采购申请',
  '/purchase/orders': '采购订单',
  '/purchase/track': '交期跟踪',
  '/warehouse/inbound': '入库管理',
  '/warehouse/inbound/create': '新建入库单',
  '/warehouse/outbound': '出库管理',
  '/warehouse/check': '库存盘点',
  '/warehouse/inventory': '库存查询',
  '/settings': '系统设置',
};

const PageWrapper: React.FC<PageWrapperProps> = ({ title, actions, children }) => {
  const location = useLocation();

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: { label: string; path: string }[] = [];
    let currentPath = '';

    paths.forEach((path) => {
      currentPath += `/${path}`;
      const label = pathNameMap[currentPath] || path;
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 1 }}
        >
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            color="inherit"
          >
            首页
          </Link>
          {breadcrumbs.slice(0, -1).map((item) => (
            <Link
              key={item.path}
              component={RouterLink}
              to={item.path}
              underline="hover"
              color="inherit"
            >
              {item.label}
            </Link>
          ))}
          <Typography color="text.primary">{title}</Typography>
        </Breadcrumbs>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {actions && <Box>{actions}</Box>}
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>{children}</Paper>
    </Box>
  );
};

export default PageWrapper;
