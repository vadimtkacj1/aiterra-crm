/** First-run checklist for non-admin users; persisted per user in localStorage. */

export type OnboardingStored = {
  business: boolean;
  billing: boolean;
  meta: boolean;
  settings: boolean;
  dismissed: boolean;
  /** User minimized the checklist bar (progress still tracked). */
  collapsed?: boolean;
};

const STORAGE_PREFIX = "crm_onboarding_v1_";

function defaultState(): OnboardingStored {
  return {
    business: false,
    billing: false,
    meta: false,
    settings: false,
    dismissed: false,
    collapsed: false,
  };
}

export function loadOnboarding(userId: string): OnboardingStored {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<OnboardingStored>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveOnboarding(userId: string, state: OnboardingStored): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

/** All required steps visited (Meta step only if `hasMeta`). */
export function onboardingAllDone(state: OnboardingStored | null, hasMeta: boolean): boolean {
  if (!state || state.dismissed) return true;
  if (!state.business || !state.billing || !state.settings) return false;
  if (hasMeta && !state.meta) return false;
  return true;
}
