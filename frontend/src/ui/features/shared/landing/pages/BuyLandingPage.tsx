import { Check, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/ui/shared/components/SiteFooter";
import { Paths } from "@/ui/navigation/paths";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const PRODUCT = {
  title: "דף נחיתה מקצועי — מנוי ל‑12 חודשים",
  priceLabel: "₪2,400",
  vatNote: 'כולל מע"מ · חיוב חד‑פעמי ל‑12 חודשים',
  features: [
    "עיצוב ובניית דף נחיתה מותאם אישית",
    "אחסון, דומיין ותחזוקה ל‑12 חודשים",
    "טופס לידים עם התראות WhatsApp ואימייל",
    "חיבור ל‑Meta / Google Ads ואנליטיקה",
  ],
};

export function BuyLandingPage() {
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/landing-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { paymentUrl?: string };
      const url = (data.paymentUrl || "").trim();
      if (!url) throw new Error("no_payment_url");
      window.location.assign(url); // hand off to Z-Credit hosted payment page
    } catch (err) {
      toast.error(
        err instanceof Error && err.message === "zcredit_not_configured"
          ? "התשלום אינו זמין כרגע. נסו שוב מאוחר יותר."
          : "אירעה שגיאה בפתיחת עמוד התשלום. נסו שוב.",
      );
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-muted">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#2e1fa3] px-6 py-4 sm:px-10">
        <Link to={Paths.root} className="text-lg font-bold text-white">Aiterra CRM</Link>
        <Link to={Paths.login} className="text-sm text-white/75 hover:text-white">כניסה / הרשמה</Link>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <Card className="w-full max-w-[520px] p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{PRODUCT.title}</h1>

          <div className="mb-1 mt-3">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight">{PRODUCT.priceLabel}</span>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">{PRODUCT.vatNote}</p>

          <div className="mb-5 grid gap-2.5 border-b border-border pb-5">
            {PRODUCT.features.map((f) => (
              <div key={f} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">שם מלא</Label>
              <Input id="name" name="name" required minLength={2} placeholder="ישראל ישראלי" autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" name="email" type="email" required placeholder="you@company.co.il" autoComplete="email" inputMode="email" />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              <Lock className="size-4" />
              המשך לתשלום מאובטח · {PRODUCT.priceLabel}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            התשלום מתבצע בעמוד מאובטח (Z‑Credit). בלחיצה על המשך אתם מאשרים את{" "}
            <Link to={Paths.terms} className="text-primary hover:underline">התקנון</Link>,{" "}
            <Link to={Paths.cancelPolicy} className="text-primary hover:underline">מדיניות הביטולים</Link> ו
            <Link to={Paths.privacyPolicy} className="text-primary hover:underline">מדיניות הפרטיות</Link>.
          </p>
        </Card>
      </div>

      <SiteFooter />
    </div>
  );
}
