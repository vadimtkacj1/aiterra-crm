import * as React from "react";

/** Reactive matchMedia hook (SSR-safe: snapshot is `false` on the server). */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True below the `md` breakpoint (antd Grid.useBreakpoint `!screens.md` equivalent). */
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 768px)");
}
