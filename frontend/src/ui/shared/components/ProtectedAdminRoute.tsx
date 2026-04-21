import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../../../app/AppProviders";
import { Paths } from "../../navigation/paths";

export function ProtectedAdminRoute(props: { children: ReactElement }) {
  const { session, isAdmin } = useApp();
  const location = useLocation();

  if (!session) {
    return <Navigate to={Paths.login} state={{ from: location }} replace />;
  }
  if (!isAdmin) {
    return <Navigate to={Paths.accounts} replace />;
  }

  return props.children;
}

