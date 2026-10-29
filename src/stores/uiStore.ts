import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  globalLoading: boolean;
  toggleSidebar: () => void;
  setGlobalLoading: (loading: boolean) => void;

  // P4-6 响应式：移动端抽屉开关（仅移动断点生效，非持久化会话态）
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;

  // P4-7 无障碍：快捷键帮助面板开关
  shortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  globalLoading: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  mobileOpen: false,
  setMobileOpen: (open) => set({ mobileOpen: open }),
  toggleMobileOpen: () => set((state) => ({ mobileOpen: !state.mobileOpen })),

  shortcutsHelpOpen: false,
  setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),
}));
