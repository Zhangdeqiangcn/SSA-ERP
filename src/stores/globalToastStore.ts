// 全局提示出口（V3.23.0 起为「唯一一处」全局出口；V3.92.0 扩展为四级通用提示）
//
// 背景：中央请求封装 api.ts 在响应拦截器里只处理 401（跳登录），
// 其余错误虽 Promise.reject，却被各 store 的 .catch 静默吞掉 ——
// 写操作失败时用户既看不到提示、本地状态又与数据库真值永久分歧（最危险的架构隐患）。
//
// V3.92.0 起本 store 不再只服务错误：全站替换浏览器原生 alert/confirm 弹窗
// （原生弹窗样式与全站割裂、会阻塞整页操作、校验提示一闪即逝无法回查），
// 统一改走本出口。支持四种级别：success 成功 / info 提示 / warning 警告 / error 错误。
import { create } from 'zustand';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface GlobalToastState {
  open: boolean;
  message: string;
  /** 提示级别（默认 error，保持历史调用方行为不变） */
  severity: ToastSeverity;
  /** 上一次弹出的时间戳，用于同消息防抖 */
  lastShownAt: number;
  /** 弹出一条提示（自动去重，4 秒内同消息不重复弹） */
  show: (message: string, severity?: ToastSeverity) => void;
  /** 弹出一条错误提示（show 的 error 快捷方式，历史调用方零改动） */
  showError: (message: string) => void;
  /** 关闭（Snackbar 自动消失或用户手动关闭时调用） */
  close: () => void;
}

export const useGlobalToastStore = create<GlobalToastState>((set, get) => ({
  open: false,
  message: '',
  severity: 'error',
  lastShownAt: 0,
  show: (message, severity = 'error') => {
    if (!message) return;
    const now = Date.now();
    if (get().message === message && get().severity === severity && now - get().lastShownAt < 4000) return;
    set({ open: true, message, severity, lastShownAt: now });
  },
  showError: (message) => get().show(message, 'error'),
  close: () => set({ open: false }),
}));