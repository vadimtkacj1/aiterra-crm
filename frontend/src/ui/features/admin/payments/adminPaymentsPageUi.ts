import type { FormMessage } from "./adminPaymentsFormModel";

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
