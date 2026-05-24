import type { App } from "antd";
import type { FormMessage } from "./adminPaymentsFormModel";

export const ADMIN_PAYMENTS_SHELL_RADIUS = 16;
export const ADMIN_PAYMENTS_SHELL_SHADOW =
  "0 1px 2px rgba(15,23,42,0.04), 0 10px 36px rgba(15,23,42,0.07)";

export function showAdminPaymentsFormMessage(
  message: ReturnType<typeof App.useApp>["message"],
  t: (k: string) => string,
  m: FormMessage,
) {
  if (m.level === "warning") message.warning(t(m.key));
  else message.error(t(m.key));
}
