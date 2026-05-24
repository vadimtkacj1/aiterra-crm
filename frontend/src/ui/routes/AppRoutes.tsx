import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "@/app/AppProviders";
import { AccountSelectPage } from "@/ui/features/shared/accounts/pages/AccountSelectPage";
import { AdminLayout } from "@/ui/features/admin/layout/AdminLayout";
import { LoginPage } from "@/ui/features/shared/auth/pages/LoginPage";
import { ContractSignPage } from "@/ui/features/user/contracts/pages/ContractSignPage";
import { HelpPage } from "@/ui/features/shared/help/pages/HelpPage";
import { CancellationPolicyPage } from "@/ui/features/shared/legal/pages/CancellationPolicyPage";
import { PrivacyPolicyPage } from "@/ui/features/shared/legal/pages/PrivacyPolicyPage";
import { TermsPage } from "@/ui/features/shared/legal/pages/TermsPage";
import { PricingPage } from "@/ui/features/shared/pricing/pages/PricingPage";
import { MainLayout } from "@/ui/layouts/MainLayout";
import { accountModules, adminModules } from "@/ui/modules";
import { Paths } from "@/ui/navigation/paths";
import { LegacySettingsRedirect } from "@/ui/routes/LegacySettingsRedirect";
import { ProtectedAdminRoute } from "@/ui/shared/components/ProtectedAdminRoute";
import { ProtectedRoute } from "@/ui/shared/components/ProtectedRoute";

export function AppRoutes() {
  const { session, isAdmin } = useApp();

  const homeRedirect = isAdmin ? Paths.adminStatistics : Paths.accounts;

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path={Paths.login}
        element={session ? <Navigate to={homeRedirect} replace /> : <LoginPage />}
      />
      <Route path={Paths.pricing} element={<PricingPage />} />
      <Route path={Paths.terms} element={<TermsPage />} />
      <Route path={Paths.cancelPolicy} element={<CancellationPolicyPage />} />
      <Route path={Paths.privacyPolicy} element={<PrivacyPolicyPage />} />
      <Route path="/contracts/sign/:token" element={<ContractSignPage />} />
      <Route path={Paths.takanon} element={<Navigate to={Paths.terms} replace />} />

      {/* Standalone module routes — outside main layout (e.g. post-payment pages) */}
      {accountModules.flatMap((m) =>
        (m.standaloneRoutes ?? []).map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))
      )}

      {/* Authenticated app shell */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path={Paths.root} element={<Navigate to={homeRedirect} replace />} />
        <Route path={Paths.accounts} element={<AccountSelectPage />} />
        <Route path={Paths.help} element={<HelpPage />} />
        <Route path={Paths.settings} element={<LegacySettingsRedirect />} />

        {/* Feature module routes — registered from modules/index.ts */}
        {accountModules.flatMap((m) =>
          m.routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))
        )}

        {/* Admin panel — nested under AdminLayout */}
        <Route
          path={Paths.admin}
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<Navigate to={Paths.adminStatistics} replace />} />
          {adminModules.map((m) => (
            <Route key={m.id} path={m.path} element={m.element} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={Paths.root} replace />} />
    </Routes>
  );
}
