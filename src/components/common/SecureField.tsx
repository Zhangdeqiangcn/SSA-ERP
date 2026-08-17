import React from 'react';
import { Typography } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';
import { useDataPermissionStore } from '@/stores/dataPermissionStore';

interface SecureFieldProps {
  module: string;
  fieldName: string;
  children: React.ReactNode;
  /** 无权限时显示的内容，默认显示「***」 */
  fallback?: React.ReactNode;
}

/**
 * 敏感字段安全包装组件
 * 根据当前用户角色和 dataPermissionStore 中的敏感字段配置，决定是否显示字段内容。
 * 若当前角色无权查看该模块的该字段，显示掩码「***」或自定义 fallback。
 */
const SecureField: React.FC<SecureFieldProps> = ({
  module,
  fieldName,
  children,
  fallback,
}) => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isFieldVisible = useDataPermissionStore((s) => s.isFieldVisible);

  if (!currentUser) return <>{children}</>;

  const visible = isFieldVisible(currentUser.role, module, fieldName);

  if (!visible) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <Typography
        component="span"
        variant="body2"
        data-testid="secure-field"
        sx={{ color: '#94A3B8', fontFamily: 'monospace', letterSpacing: 2 }}
      >
        ***
      </Typography>
    );
  }

  return <>{children}</>;
};

export default SecureField;
