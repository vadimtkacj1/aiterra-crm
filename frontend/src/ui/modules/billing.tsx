import { Wallet } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/app/AppProviders';
import { BillingPage } from '@/ui/features/user/billing/pages/BillingPage';
import { PaymentCheckoutPage } from '@/ui/features/user/billing/checkout/PaymentCheckoutPage';
import { PaymentSuccessPage } from '@/ui/features/user/billing/pages/PaymentSuccessPage';
import { PaymentFailedPage } from '@/ui/features/user/billing/pages/PaymentFailedPage';
import { Paths, accountPath } from '@/ui/navigation/paths';
import type { AccountModule } from './types';

function BillingRoute() {
  const { isAdmin } = useApp();
  if (isAdmin) return <Navigate to={Paths.adminStatistics} replace />;
  return <BillingPage />;
}

export const billingModule: AccountModule = {
  id: 'billing',
  routes: [
    { path: Paths.billing, element: <BillingRoute /> },
    { path: Paths.billingCheckout, element: <PaymentCheckoutPage /> },
  ],
  standaloneRoutes: [
    { path: Paths.billingSuccess, element: <PaymentSuccessPage /> },
    { path: Paths.billingFailed, element: <PaymentFailedPage /> },
  ],
  navItems: ({ accountId, isAdmin }, t) => {
    if (isAdmin) return [];
    return [{ key: accountPath(accountId, 'billing'), icon: <Wallet />, label: t('layout.menuBilling') }];
  },
};
