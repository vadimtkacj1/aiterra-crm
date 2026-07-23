import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TranslatableError } from "@/domain/errors";
import { useApp } from "@/app/AppProviders";

interface Props {
  onSuccess: () => void;
  isMobile?: boolean;
}

export function LoginForm({ onSuccess }: Props) {
  const { login } = useApp();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    setSubmitting(true);
    setAuthError(null);
    try {
      await login({ email, password });
      onSuccess();
    } catch (err) {
      if (err instanceof TranslatableError) setAuthError(t(err.i18nKey));
      else setAuthError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("login.email")}</Label>
        {/* email/password are always LTR even when the app is RTL */}
        <div dir="ltr" className="relative">
          <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("login.emailPlaceholder")}
            className="ps-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t("login.password")}</Label>
        <div dir="ltr" className="relative">
          <Lock className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="px-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? t("login.hidePassword", { defaultValue: "Hide password" }) : t("login.showPassword", { defaultValue: "Show password" })}
            className="absolute inset-y-0 end-1 my-auto flex size-8 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {authError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {authError}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" />}
        {t("login.submit")}
      </Button>
    </form>
  );
}
