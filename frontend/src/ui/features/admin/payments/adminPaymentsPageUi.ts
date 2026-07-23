import type { FormMessage } from "./adminPaymentsFormModel";

export const ADMIN_PAYMENTS_SHELL_RADIUS = 16;
export const ADMIN_PAYMENTS_SHELL_SHADOW =
  "0 1px 2px rgba(15,23,42,0.04), 0 10px 36px rgba(15,23,42,0.07)";

/** Structural subset of antd's GlobalToken still passed down by the wave-4 page hook. */
export type AdminPaymentsTokenLike = {
  colorBgContainer: string;
  colorBorderSecondary: string;
  colorPrimaryBorder: string;
  colorPrimary: string;
};

/** Message sink — satisfied by both antd `App.useApp().message` and `@/lib/toast`. */
type MessageLike = {
  warning: (content: string) => void;
  error: (content: string) => void;
};

export function showAdminPaymentsFormMessage(
  message: MessageLike,
  t: (k: string) => string,
  m: FormMessage,
) {
  if (m.level === "warning") message.warning(t(m.key));
  else message.error(t(m.key));
}
