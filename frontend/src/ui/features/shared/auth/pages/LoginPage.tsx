import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import logoUrl from "@/assets/logo-black.svg";
import { defaultLanguage } from "@/i18n";
import { Paths } from "@/ui/navigation/paths";
import { Card } from "@/components/ui/card";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? Paths.accounts;
  const currentLang = i18n.language.startsWith("he") ? "he" : "en";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted p-4 sm:p-6">
      {/* Language switcher — fixed so it's always visible */}
      <div className="fixed end-4 top-4 z-50 flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-sm">
        <Globe className="size-4 text-muted-foreground" />
        <select
          value={currentLang}
          onChange={(e) => void i18n.changeLanguage(e.target.value || defaultLanguage)}
          aria-label={t("common.language")}
          className="cursor-pointer bg-transparent text-sm text-foreground outline-none"
        >
          <option value="he">{t("common.hebrew")}</option>
          <option value="en">{t("common.english")}</option>
        </select>
      </div>

      <Card className="w-full max-w-[420px] p-8 shadow-lg sm:p-9">
        <div className="mb-6 flex justify-center">
          <img src={logoUrl} alt={t("layout.brand")} className="size-20 sm:size-24" />
        </div>

        <h1 className="mb-1.5 text-center text-2xl font-bold tracking-tight text-foreground">
          {t("login.title")}
        </h1>
        <p className="mb-7 text-center text-sm text-muted-foreground">
          {t("login.hint")}
        </p>

        <LoginForm onSuccess={() => navigate(from, { replace: true })} />
      </Card>
    </div>
  );
}
