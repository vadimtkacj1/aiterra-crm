import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { AuthSession } from "../../../services/interfaces/IAuthService";
import { Paths } from "../../navigation/paths";
import { loadOnboarding, saveOnboarding, type OnboardingStored } from "./onboardingStorage";

export type { OnboardingStored } from "./onboardingStorage";

function mergeVisits(pathname: string, prev: OnboardingStored): OnboardingStored {
  const next = { ...prev };
  if (pathname === Paths.accounts || /^\/a\/\d+\//.test(pathname)) {
    next.business = true;
  }
  if (pathname.includes("/billing")) {
    next.billing = true;
  }
  if (/\/a\/\d+\/meta(\/|$)/.test(pathname)) {
    next.meta = true;
  }
  if (pathname.includes("/settings")) {
    next.settings = true;
  }
  return next;
}

export function useOnboardingTracker(session: AuthSession | null, isAdmin: boolean) {
  const { pathname } = useLocation();
  const userId = session?.user.id != null ? String(session.user.id) : null;
  const [state, setState] = useState<OnboardingStored | null>(null);

  useEffect(() => {
    if (!userId || isAdmin) {
      setState(null);
      return;
    }
    const base = loadOnboarding(userId);
    const merged = mergeVisits(pathname, base);
    if (
      merged.business !== base.business ||
      merged.billing !== base.billing ||
      merged.meta !== base.meta ||
      merged.settings !== base.settings
    ) {
      saveOnboarding(userId, merged);
    }
    setState(merged);
  }, [pathname, userId, isAdmin]);

  const dismiss = useMemo(() => {
    return () => {
      if (!userId) return;
      const next = { ...loadOnboarding(userId), dismissed: true };
      saveOnboarding(userId, next);
      setState(next);
    };
  }, [userId]);

  const toggleCollapsed = useMemo(() => {
    return () => {
      if (!userId) return;
      const base = loadOnboarding(userId);
      const next = { ...base, collapsed: !base.collapsed };
      saveOnboarding(userId, next);
      setState(next);
    };
  }, [userId]);

  return { state, dismiss, toggleCollapsed };
}
