import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useApp } from "../../app/AppProviders";
import { LAST_VISITED_ACCOUNT_STORAGE_KEY, readLastVisitedAccountId } from "../navigation/paths";
import type { AccountLayoutOutletContext } from "./accountLayoutContext";

function isValidAccountId(id: string | undefined): id is string {
  return Boolean(id && id !== "0" && /^\d+$/.test(id));
}

export function useLayoutAccount() {
  const { accountId: routeAccountId } = useParams<{ accountId: string }>();
  const location = useLocation();
  const { services } = useApp();

  useEffect(() => {
    const m = location.pathname.match(/^\/a\/(\d+)(?:\/|$)/);
    if (m) {
      try {
        sessionStorage.setItem(LAST_VISITED_ACCOUNT_STORAGE_KEY, m[1]);
      } catch {
        /* ignore */
      }
    }
  }, [location.pathname]);

  const layoutAccountId = isValidAccountId(routeAccountId)
    ? routeAccountId
    : (readLastVisitedAccountId() ?? undefined);
  const layoutAccountValid = isValidAccountId(layoutAccountId);

  const [fetchState, setFetchState] = useState<{
    loadedForId: string | undefined;
    accountLoading: boolean;
    currentAccount: AccountLayoutOutletContext["currentAccount"];
    totalAccountCount: number;
  }>({
    loadedForId: undefined,
    accountLoading: true,
    currentAccount: null,
    totalAccountCount: 0,
  });

  useEffect(() => {
    if (!layoutAccountValid || !layoutAccountId) {
      setFetchState({ loadedForId: undefined, accountLoading: false, currentAccount: null, totalAccountCount: 0 });
      return;
    }
    let cancelled = false;
    setFetchState((s) => ({ ...s, accountLoading: true }));
    void (async () => {
      try {
        const rows = await services.accounts.listMyAccounts();
        if (cancelled) return;
        const found = rows.find((r) => String(r.id) === layoutAccountId);
        setFetchState({
          loadedForId: layoutAccountId,
          accountLoading: false,
          currentAccount: found
            ? {
                id: found.id,
                name: found.name,
                hasMeta: found.hasMeta ?? false,
                hasGoogle: found.hasGoogle ?? false,
              }
            : null,
          totalAccountCount: rows.length,
        });
      } catch {
        if (!cancelled) {
          setFetchState({ loadedForId: layoutAccountId, accountLoading: false, currentAccount: null, totalAccountCount: 0 });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [layoutAccountValid, layoutAccountId, services.accounts]);

  const accountOutletCtx: AccountLayoutOutletContext = {
    accountLoading:
      fetchState.accountLoading ||
      (layoutAccountValid ? fetchState.loadedForId !== layoutAccountId : false),
    currentAccount: fetchState.loadedForId === layoutAccountId ? fetchState.currentAccount : null,
    totalAccountCount: fetchState.totalAccountCount,
  };

  return { layoutAccountId, layoutAccountValid, accountOutletCtx };
}
