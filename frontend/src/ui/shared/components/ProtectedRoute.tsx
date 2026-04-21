import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../../../app/AppProviders";
import { Paths } from "../../navigation/paths";

export function ProtectedRoute(props: { children: ReactElement }) {
  const { session } = useApp();
  const location = useLocation();

  if (!session) {
    return <Navigate to={Paths.login} state={{ from: location }} replace />;
  }

  return props.children;
}

