import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "../../app/AppProviders";
import { AdminLayout } from "../features/admin/pages/AdminLayout";
import { AccountSelectPage } from "../pages/accounts";
import { AccountBillingPageRoute } from "../pages/a/[accountId]/billing";
import { GoogleAnalyticsPage } from "../pages/a/[accountId]/google";
import { MetaAnalyticsPage } from "../pages/a/[accountId]/meta";
import { MetaCampaignDeepDivePage } from "../pages/a/[accountId]/meta/campaigns/[campaignId]";
import { SettingsPage } from "../pages/a/[accountId]/settings";
import { AdminIndexRedirect } from "../pages/admin";
import { AdminMetaBudgetPage } from "../pages/admin/meta-budget";
import { AdminPaymentsPage } from "../pages/admin/payments";
import { AdminAuditPage } from "../pages/admin/audit";
import { AdminStatisticsPage } from "../pages/admin/statistics";
import { AdminUsersPage } from "../pages/admin/users";
import { HelpPage } from "../pages/help";
import { LoginPage } from "../pages/login";
import { PricingPage } from "../pages/pricing";
import { TermsPage } from "../pages/terms";
import { CancellationPolicyPage } from "../pages/cancel-policy";
import { PrivacyPolicyPage } from "../pages/privacy-policy";
import { TakanonRedirect } from "../pages/takanon";
import { LegacySettingsRedirect } from "../pages/settings";
import { AccountBillingCheckoutPageRoute } from "../pages/a/[accountId]/billing/checkout";
import { MainLayout } from "../layouts/MainLayout";
import { Paths } from "../navigation/paths";
import { ProtectedAdminRoute } from "../shared/components/ProtectedAdminRoute";
import { ProtectedRoute } from "../shared/components/ProtectedRoute";

export function AppRoutes() {
  const { session, isAdmin } = useApp();

  const homeRedirect = isAdmin ? Paths.adminStatistics : Paths.accounts;

  return (
    <Routes>
      <Route
        path={Paths.login}
        element={session ? <Navigate to={homeRedirect} replace /> : <LoginPage />}
      />
      <Route path={Paths.pricing} element={<PricingPage />} />
      <Route path={Paths.terms} element={<TermsPage />} />
      <Route path={Paths.cancelPolicy} element={<CancellationPolicyPage />} />
      <Route path={Paths.privacyPolicy} element={<PrivacyPolicyPage />} />
      <Route path={Paths.takanon} element={<TakanonRedirect />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path={Paths.root} element={<Navigate to={homeRedirect} replace />} />
        <Route path={Paths.accounts} element={<AccountSelectPage />} />
        <Route path={Paths.help} element={<HelpPage />} />
        <Route path={Paths.settings} element={<LegacySettingsRedirect />} />
        <Route path="/a/:accountId/settings" element={<SettingsPage />} />
        <Route path={Paths.meta} element={<MetaAnalyticsPage />} />
        <Route path={Paths.metaCampaign} element={<MetaCampaignDeepDivePage />} />
        <Route path={Paths.google} element={<GoogleAnalyticsPage />} />
        <Route
          path={Paths.billing}
          element={<AccountBillingPageRoute />}
        />
        <Route
          path={Paths.billingCheckout}
          element={<AccountBillingCheckoutPageRoute />}
        />
        <Route
          path={Paths.admin}
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route path="statistics" element={<AdminStatisticsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="meta-budget" element={<AdminMetaBudgetPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={Paths.root} replace />} />
    </Routes>
  );
}
