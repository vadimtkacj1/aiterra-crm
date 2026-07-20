import { App } from "antd";
import { useContext, useEffect } from "react";
import { UNSAFE_DataRouterContext, useBlocker } from "react-router-dom";

/**
 * Warns the user when they try to leave a page with unsaved form changes.
 * Handles both in-app navigation (React Router blocker + Modal.confirm)
 * and browser close/refresh (beforeunload).
 *
 * `useBlocker` requires a data router; under the app's <BrowserRouter> it throws.
 * We only engage the in-app blocker when a data router is present — otherwise we
 * rely on the beforeunload guard alone. Router presence is fixed for the app's
 * lifetime, so gating the hook call here is stable across renders.
 */
export function useUnsavedChangesWarning(
  isDirty: boolean,
  opts?: { title?: string; content?: string; okText?: string; cancelText?: string },
) {
  const title = opts?.title ?? "Unsaved changes";
  const content = opts?.content ?? "You have unsaved changes. Are you sure you want to leave?";
  const okText = opts?.okText ?? "Leave";
  const cancelText = opts?.cancelText ?? "Stay";

  const { modal } = App.useApp();
  const hasDataRouter = useContext(UNSAFE_DataRouterContext) != null;

  const blocker = hasDataRouter
    ? // eslint-disable-next-line react-hooks/rules-of-hooks -- router presence is fixed for the app lifetime
      useBlocker(
        ({ currentLocation, nextLocation }) =>
          isDirty && currentLocation.pathname !== nextLocation.pathname,
      )
    : null;

  useEffect(() => {
    if (!blocker || blocker.state !== "blocked") return;
    modal.confirm({
      title,
      content,
      okText,
      cancelText,
      okButtonProps: { danger: true },
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    });
  }, [blocker, title, content, okText, cancelText, modal]);

  // Browser close / hard refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = content;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, content]);
}
