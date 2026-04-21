import { Navigate } from "react-router-dom";
import { PaymentCheckoutPage } from "../../../../features/billing/pages/PaymentCheckoutPage";
import { Paths } from "../../../../navigation/paths";
import { useApp } from "../../../../../app/AppProviders";

/** `/a/:accountId/billing/checkout` page with admin redirect. */
export function AccountBillingCheckoutPageRoute() {
  const { isAdmin } = useApp();
  if (isAdmin) return <Navigate to={Paths.adminStatistics} replace />;
  return <PaymentCheckoutPage />;
}

