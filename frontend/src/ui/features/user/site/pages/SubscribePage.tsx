import { CheckCircle2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

interface FormValues {
  name: string;
  phone: string;
  email?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function submitLead(token: string, values: FormValues): Promise<void> {
  const res = await fetch("/api/site-leads/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicToken: token,
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      message: values.message || undefined,
      source: window.location.href,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? "error");
  }
}

export function SubscribePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const form = useForm<FormValues>({
    defaultValues: { name: "", phone: "", email: "", message: "" },
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish(values: FormValues) {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitLead(token, values);
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      setError(msg === "invalid_token" ? t("subscribe.errorInvalidToken") : t("subscribe.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={wrapStyle}>
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="size-16" style={{ color: "var(--ds-color-success)" }} aria-hidden="true" />
          <h2 className="m-0 text-2xl font-semibold">{t("subscribe.successTitle")}</h2>
          <p className="m-0 text-sm text-muted-foreground">{t("subscribe.successSubtitle")}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div className="relative w-full" style={{ maxWidth: 420 }}>
        {submitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60">
            <Spinner size="lg" label={t("subscribe.submitBtn")} />
          </div>
        )}
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <MessageCircle
              className="mx-auto mb-2 size-9"
              style={{ color: "#25d366" }}
              aria-hidden="true"
            />
            <h3 className="m-0 text-xl font-semibold">{t("subscribe.title")}</h3>
            <p className="m-0 text-sm text-muted-foreground">{t("subscribe.subtitle")}</p>
          </div>

          {error && (
            <div style={{ color: "var(--ds-color-error)", marginBottom: 16, textAlign: "center" }}>
              {error}
            </div>
          )}

          <Form form={form} onFinish={(v) => void handleFinish(v)}>
            <FormItem<FormValues, "name">
              name="name"
              label={t("subscribe.fieldName")}
              rules={{ required: t("subscribe.fieldNameRequired") }}
            >
              {(field) => <Input {...field} placeholder={t("subscribe.fieldNamePlaceholder")} />}
            </FormItem>

            <FormItem<FormValues, "phone">
              name="phone"
              label={t("subscribe.fieldPhone")}
              rules={{ required: t("subscribe.fieldPhoneRequired") }}
            >
              {(field) => <Input {...field} placeholder="+972501234567" type="tel" />}
            </FormItem>

            <FormItem<FormValues, "email">
              name="email"
              label={t("subscribe.fieldEmail")}
              rules={{
                validate: (v) => !v || EMAIL_RE.test(v) || t("subscribe.fieldEmailInvalid"),
              }}
            >
              {(field) => (
                <Input {...field} placeholder={t("subscribe.fieldEmailPlaceholder")} type="email" />
              )}
            </FormItem>

            <FormItem<FormValues, "message"> name="message" label={t("subscribe.fieldMessage")}>
              {(field) => (
                <Textarea {...field} placeholder={t("subscribe.fieldMessagePlaceholder")} rows={3} />
              )}
            </FormItem>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting && <Spinner size="sm" className="text-primary-foreground" />}
              {t("subscribe.submitBtn")}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--ds-surface-2)",
  padding: 16,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "32px 28px",
  width: "100%",
  boxShadow: "0 2px 16px rgba(0,0,0,0.09)",
};
