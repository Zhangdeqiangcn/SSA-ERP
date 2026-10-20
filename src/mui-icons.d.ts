// MUI 图标类型声明垫片（V3.91.0 · noImplicitAny 整改配套）
//
// 背景：开启 noImplicitAny 后，对 `@mui/icons-material/<Icon>` 的深层子路径导入
// 在部分 @mui/icons-material 版本下无法被 TS 解析出 .d.ts（报 TS7016）。这些图标组件
// 本质是「已知有类型的 React 组件」，此处统一声明为模块通配，使其回到
// 「与开启 noImplicitAny 前一致」的 any 状态，从而让 noImplicitAny 真正聚焦于
// 业务代码里的隐式 any（TS7006 / TS7053），而非第三方声明缺失的噪声。
declare module '@mui/icons-material/*';
