import { onRequestPost as __api_auth_login_ts_onRequestPost } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\auth\\login.ts"
import { onRequestPost as __api_auth_logout_ts_onRequestPost } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\auth\\logout.ts"
import { onRequestGet as __api_auth_me_ts_onRequestGet } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\auth\\me.ts"
import { onRequestPost as __api_auth_register_ts_onRequestPost } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\auth\\register.ts"
import { onRequestPost as __api_vendor_login_ts_onRequestPost } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\vendor\\login.ts"
import { onRequestPost as __api_vendor_register_ts_onRequestPost } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\vendor\\register.ts"
import { onRequestDelete as __api_state__key__ts_onRequestDelete } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\state\\[key].ts"
import { onRequestGet as __api_state__key__ts_onRequestGet } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\state\\[key].ts"
import { onRequestPut as __api_state__key__ts_onRequestPut } from "C:\\Users\\zhangdeqiang\\WorkBuddy\\2026-05-08-task-1\\ssa-erp\\functions\\api\\state\\[key].ts"

export const routes = [
    {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_me_ts_onRequestGet],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_register_ts_onRequestPost],
    },
  {
      routePath: "/api/vendor/login",
      mountPath: "/api/vendor",
      method: "POST",
      middlewares: [],
      modules: [__api_vendor_login_ts_onRequestPost],
    },
  {
      routePath: "/api/vendor/register",
      mountPath: "/api/vendor",
      method: "POST",
      middlewares: [],
      modules: [__api_vendor_register_ts_onRequestPost],
    },
  {
      routePath: "/api/state/:key",
      mountPath: "/api/state",
      method: "DELETE",
      middlewares: [],
      modules: [__api_state__key__ts_onRequestDelete],
    },
  {
      routePath: "/api/state/:key",
      mountPath: "/api/state",
      method: "GET",
      middlewares: [],
      modules: [__api_state__key__ts_onRequestGet],
    },
  {
      routePath: "/api/state/:key",
      mountPath: "/api/state",
      method: "PUT",
      middlewares: [],
      modules: [__api_state__key__ts_onRequestPut],
    },
  ]