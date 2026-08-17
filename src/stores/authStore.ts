import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole, ROLE_PERMISSIONS } from '@/types/settings';

interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  switchRole: (role: UserRole, name: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: {
        id: 'user-001',
        name: '张德强',
        role: 'admin',
        department: '信息技术部',
      },
      isAuthenticated: true,
      login: (user) => set({ currentUser: user, isAuthenticated: true }),
      logout: () => set({ currentUser: null, isAuthenticated: false }),
      hasPermission: (permission: string) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        const userPermissions = ROLE_PERMISSIONS[currentUser.role] || [];
        return userPermissions.includes('*') || userPermissions.includes(permission);
      },
      switchRole: (role: UserRole, name: string) => {
        set((state) => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, role, name }
            : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
