import { useAuthStore } from '@/stores/authStore';

export const hasPermission = (permission: string): boolean => {
  return useAuthStore.getState().hasPermission(permission);
};

export const canAccess = (resource: string): boolean => {
  const resourcePermission = `${resource}.view`;
  return hasPermission(resourcePermission);
};

export const canCreate = (resource: string): boolean => {
  return hasPermission(`${resource}.create`);
};

export const canEdit = (resource: string): boolean => {
  return hasPermission(`${resource}.edit`);
};

export const canDelete = (resource: string): boolean => {
  return hasPermission(`${resource}.delete`);
};

export const canApprove = (resource: string): boolean => {
  return hasPermission(`${resource}.approve`);
};
