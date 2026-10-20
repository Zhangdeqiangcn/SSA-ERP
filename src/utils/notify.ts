// 统一提示调用入口（V3.92.0 · 全站替换浏览器原生 alert/confirm 弹窗）
//
// 为什么要有这层：
//   1) 原生 alert 样式与全站 Material UI 割裂；
//   2) 原生 alert 会阻塞整页操作（模态、无法滚动、无法点其它按钮）；
//   3) 原生 alert 一闪即逝，校验错误无法回查。
//
// 用法（替代 window.alert）：
//   import { notify, notifySuccess, notifyWarning, notifyError } from '@/utils/notify';
//   notify('已保存');                       // 提示级
//   notifySuccess('提交成功');              // 成功级
//   notifyWarning('库存不足，请调整数量');  // 警告级
//   notifyError('保存失败，请重试');        // 错误级
//
// 设计约束：非 React 环境（store / service 层）也能调用 —— 直接取 store 的 getState，
// 不依赖组件挂载；多行文案用 \n 换行，组件侧已设 white-space: pre-line。
import { useGlobalToastStore, type ToastSeverity } from '@/stores/globalToastStore';

/** 通用提示：默认「提示」级别 */
export const notify = (message: string, severity: ToastSeverity = 'info'): void => {
  useGlobalToastStore.getState().show(message, severity);
};

/** 成功提示 */
export const notifySuccess = (message: string): void => notify(message, 'success');

/** 警告提示（库存不足、信用额度不足、供应商黑名单等可继续但需留意的情况） */
export const notifyWarning = (message: string): void => notify(message, 'warning');

/** 错误提示（保存失败、校验不通过、服务端异常） */
export const notifyError = (message: string): void => notify(message, 'error');