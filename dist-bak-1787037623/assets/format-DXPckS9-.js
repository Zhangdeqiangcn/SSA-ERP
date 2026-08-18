import { d as dayjs } from "./vendor-date-DI3D_gXa.js";
const formatDate = (date, format = "YYYY-MM-DD") => {
  if (!date) return "-";
  return dayjs(date).format(format);
};
const formatCurrency = (amount, currency = "CNY") => {
  if (amount === void 0 || amount === null) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};
const formatPhone = (phone) => {
  if (!phone) return "-";
  return phone;
};
export {
  formatDate as a,
  formatPhone as b,
  formatCurrency as f
};
