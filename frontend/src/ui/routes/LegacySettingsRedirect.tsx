import { Navigate } from "react-router-dom";
import { Paths, accountPath, readLastVisitedAccountId } from "../navigation/paths";

/** Old bookmark `/settings` → account-scoped settings or business picker. */
export function LegacySettingsRedirect() {
  const id = readLastVisitedAccountId();
  if (id) {
    return <Navigate to={accountPath(id, "settings")} replace />;
  }
  return <Navigate to={Paths.accounts} replace />;
}
