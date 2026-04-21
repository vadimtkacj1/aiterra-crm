import { Navigate } from "react-router-dom";
import { BillingPage } from "../../../features/billing/pages/BillingPage";
import { Paths } from "../../../navigation/paths";
import { useApp } from "../../../../app/AppProviders";

/** `/a/:accountId/billing` page with admin redirect. */
export function AccountBillingPageRoute() {
  const { isAdmin } = useApp();
  if (isAdmin) return <Navigate to={Paths.adminStatistics} replace />;
  return <BillingPage />;
}

