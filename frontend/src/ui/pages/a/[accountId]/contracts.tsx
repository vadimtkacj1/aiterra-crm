import { Navigate } from "react-router-dom";
import { useApp } from "../../../../app/AppProviders";
import { MemberContractsPage } from "../../../features/contracts/MemberContractsPage";
import { Paths } from "../../../navigation/paths";

/** `/a/:accountId/contracts`: business users only (admins use Admin → Contracts). */
export function AccountContractsPageRoute() {
  const { isAdmin } = useApp();
  if (isAdmin) return <Navigate to={Paths.adminContracts} replace />;
  return <MemberContractsPage />;
}
