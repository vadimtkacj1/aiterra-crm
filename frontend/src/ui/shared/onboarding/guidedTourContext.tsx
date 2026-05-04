import { App } from "antd";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { launchAccountGuidedTour, type GuidedDriver } from "./guidedTourRun";

import "driver.js/dist/driver.css";
import "./guidedTourOverrides.css";

type GuidedTourContextValue = {
  /** Starts spotlight tour when business context is available (non-admin). */
  startGuidedTour: (() => void) | null;
  guidedTourAvailable: boolean;
};

const GuidedTourContext = createContext<GuidedTourContextValue>({
  startGuidedTour: null,
  guidedTourAvailable: false,
});

export function useGuidedTour(): GuidedTourContextValue {
  return useContext(GuidedTourContext);
}

type ProviderProps = {
  children: ReactNode;
  isAdmin: boolean;
  showAccountContext: boolean;
};

export function GuidedTourProvider({ children, isAdmin, showAccountContext }: ProviderProps) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { message } = App.useApp();
  const driverRef = useRef<GuidedDriver | null>(null);

  const destroyDriver = useCallback(() => {
    try {
      driverRef.current?.destroy();
    } finally {
      driverRef.current = null;
    }
  }, []);

  useEffect(() => () => destroyDriver(), [destroyDriver]);

  const pathEpoch = useRef(0);
  useEffect(() => {
    pathEpoch.current += 1;
    if (pathEpoch.current === 1) return;
    destroyDriver();
  }, [pathname, destroyDriver]);

  const startGuidedTour = useCallback(() => {
    if (isAdmin || !showAccountContext) return;
    destroyDriver();
    const d = launchAccountGuidedTour({
      t,
      rtl: i18n.dir() === "rtl",
      onDestroyed: () => {
        driverRef.current = null;
      },
    });
    if (!d) {
      void message.warning(t("tour.unavailableHint"));
      return;
    }
    driverRef.current = d;
  }, [isAdmin, showAccountContext, t, i18n, destroyDriver, message]);

  const value = useMemo(
    (): GuidedTourContextValue => ({
      startGuidedTour: !isAdmin && showAccountContext ? startGuidedTour : null,
      guidedTourAvailable: !isAdmin && showAccountContext,
    }),
    [isAdmin, showAccountContext, startGuidedTour],
  );

  return <GuidedTourContext.Provider value={value}>{children}</GuidedTourContext.Provider>;
}
