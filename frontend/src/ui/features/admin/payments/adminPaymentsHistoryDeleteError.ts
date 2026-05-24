import axios from "axios";
import type { TFunction } from "i18next";

export function billingHistoryDeleteErrorMessage(t: TFunction, e: unknown): string {
  let msg = t("errors.generic");
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as { detail?: unknown } | undefined;
    const detail = typeof d?.detail === "string" ? d.detail : "";
    if (detail === "billing_history_delete_revoke_first") {
      msg = t("admin.payments.deleteNeedRevoke");
    } else if (detail) {
      msg = detail;
    } else if (e.message) {
      msg = e.message;
    }
  } else if (e instanceof Error) {
    msg = e.message;
  }
  return msg;
}
