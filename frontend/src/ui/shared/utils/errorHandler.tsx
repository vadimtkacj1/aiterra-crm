import { App, theme } from "antd";
import type { TFunction } from "i18next";
import { tokens } from "@/styles/designSystem";

interface ErrorHandlerOptions {
  title?: string;
  description?: string;
  duration?: number;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function useErrorHandler(t: TFunction) {
  const { notification, message } = App.useApp();
  const { token } = theme.useToken();

  const handleError = (error: unknown, options: ErrorHandlerOptions = {}) => {
    const {
      title = t("errors.operationFailed"),
      description,
      duration = 0,
      onRetry,
      showRetry = true,
    } = options;

    const errorMessage = error instanceof Error ? error.message : t("errors.generic");
    const finalDescription = description || errorMessage;

    if (onRetry && showRetry) {
      notification.error({
        message: title,
        description: finalDescription,
        duration,
        btn: (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => notification.destroy()}
              style={{
                padding: "4px 12px",
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadius,
                background: token.colorBgContainer,
                cursor: "pointer",
              }}
            >
              {t("common.dismiss")}
            </button>
            <button
              type="button"
              onClick={() => {
                notification.destroy();
                onRetry();
              }}
              style={{
                padding: "4px 12px",
                border: "none",
                borderRadius: token.borderRadius,
                background: token.colorPrimary,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {t("common.retry")}
            </button>
          </div>
        ),
      });
    } else {
      notification.error({
        message: title,
        description: finalDescription,
        duration: duration || 4.5,
      });
    }
  };

  const handleSuccess = (messageText: string, duration = 3) => {
    message.success(messageText, duration);
  };

  const handleLoading = (messageText: string) => {
    return message.loading(messageText, 0);
  };

  return {
    handleError,
    handleSuccess,
    handleLoading,
  };
}

// Standalone error handler for use outside components
export function showError(
  notification: ReturnType<typeof App.useApp>["notification"],
  t: TFunction,
  error: unknown,
  options: ErrorHandlerOptions = {}
) {
  const {
    title = t("errors.operationFailed"),
    description,
    duration = 0,
    onRetry,
    showRetry = true,
  } = options;

  const errorMessage = error instanceof Error ? error.message : t("errors.generic");
  const finalDescription = description || errorMessage;

  if (onRetry && showRetry) {
    notification.error({
      message: title,
      description: finalDescription,
      duration,
      btn: (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => notification.destroy()}
            style={{
              padding: "4px 12px",
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.sm,
              background: tokens.colors.bg,
              cursor: "pointer",
            }}
          >
            {t("common.dismiss")}
          </button>
          <button
            type="button"
            onClick={() => {
              notification.destroy();
              onRetry();
            }}
            style={{
              padding: "4px 12px",
              border: "none",
              borderRadius: tokens.radius.sm,
              background: tokens.colors.primary,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      ),
    });
  } else {
    notification.error({
      message: title,
      description: finalDescription,
      duration: duration || 4.5,
    });
  }
}
