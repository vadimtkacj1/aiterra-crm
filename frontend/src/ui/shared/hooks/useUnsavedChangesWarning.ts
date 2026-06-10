import { Modal } from "antd";
import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Warns the user when they try to leave a page with unsaved form changes.
 * Handles both in-app navigation (React Router blocker + Modal.confirm)
 * and browser close/refresh (beforeunload).
 */
export function useUnsavedChangesWarning(
  isDirty: boolean,
  opts?: { title?: string; content?: string; okText?: string; cancelText?: string },
) {
  const title = opts?.title ?? "Unsaved changes";
  const content = opts?.content ?? "You have unsaved changes. Are you sure you want to leave?";
  const okText = opts?.okText ?? "Leave";
  const cancelText = opts?.cancelText ?? "Stay";

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    Modal.confirm({
      title,
      content,
      okText,
      cancelText,
      okButtonProps: { danger: true },
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    });
  }, [blocker, title, content, okText, cancelText]);

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
