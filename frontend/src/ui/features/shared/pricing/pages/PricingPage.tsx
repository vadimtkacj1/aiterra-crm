import { Mail, Phone, ShieldCheck, BarChart3, Users, Rocket, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/ui/shared/components/SiteFooter";
import { Paths } from "@/ui/navigation/paths";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  FEATURES_BASIC,
  FEATURES_ENTERPRISE,
  FEATURES_PRO,
  PLAN_PRICE_BASIC,
  PLAN_PRICE_ENTERPRISE,
  PLAN_PRICE_PRO,
} from "../utils/pricingConfig";

/** Show a real price, or an honest fallback while a plan price is unset (placeholder). */
function displayPrice(price: string): string {
  return /\d/.test(price) ? price : "לפי בקשה";
}

const hasContactPhone = /\d/.test(CONTACT_PHONE);

const FEATURES = [
  { icon: BarChart3, title: "אנליטיקה מתקדמת", desc: "סקירה מלאה של קמפיינים ב-Meta וב-Google Ads: חשיפות, קליקים, המרות, ROAS ועוד." },
  { icon: Users, title: "ניהול לקוחות", desc: "ריכוז כל העסקים והלקוחות במקום אחד, עם הפרדה מלאה בין חשבונות." },
  { icon: Rocket, title: "חיוב וניהול תשלומים", desc: "שליחת חשבוניות, מנויים חודשיים, תשלומים חד-פעמיים ומעקב אחר היסטוריית תשלומים." },
  { icon: ShieldCheck, title: "אבטחה ועמידות", desc: "כניסה מאובטחת עם JWT, הפרדת הרשאות בין מנהלים למשתמשים, גיבויים שוטפים." },
];

function PlanCard({
  name, audience, price, features, highlight = false, cta,
}: { name: string; audience: string; price: string; features: string[]; highlight?: boolean; cta: string }) {
  return (
    <Card className={highlight ? "text-center shadow-lg ring-1 ring-primary/15" : "text-center"}>
      <div className="p-6">
        {highlight && (
          <span className="mb-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            הכי פופולרי
          </span>
        )}
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground">{audience}</p>
        <div className="my-4">
          <span className="text-4xl font-extrabold tracking-tight tabular-nums">{displayPrice(price)}</span>
          {/\d/.test(price) && <span className="text-sm text-muted-foreground"> / חודש</span>}
        </div>
        <div className="my-5 h-px bg-border" />
        <ul className="mb-6 grid gap-2 text-start text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button variant={highlight ? "default" : "outline"} className="w-full">{cta}</Button>
      </div>
    </Card>
  );
}

export function PricingPage({ hidePlans = false }: { hidePlans?: boolean } = {}) {
  return (
    <div dir="rtl" className="min-h-screen bg-muted">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#2e1fa3] px-6 py-4 sm:px-10">
        <span className="text-lg font-bold text-white">Aiterra CRM</span>
        <div className="flex flex-wrap items-center gap-4">
          {hasContactPhone && (
            <a href={`tel:${CONTACT_PHONE}`} className="inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white">
              <Phone className="size-4" /> <span dir="ltr">{CONTACT_PHONE}</span>
            </a>
          )}
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white">
            <Mail className="size-4" /> {CONTACT_EMAIL}
          </a>
          <Button asChild variant="outline" className="hover:bg-white/10" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}>
            <Link to={Paths.login}>כניסה / הרשמה</Link>
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-[#2e1fa3] px-6 py-16 text-center sm:px-10">
        <h1 className="mx-auto mb-4 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
          מערכת CRM לניהול קמפיינים פרסומיים
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-white/65">
          Aiterra CRM מאפשרת לסוכנויות פרסום ועסקים לנהל קמפיינים ב-Meta ו-Google Ads,
          לנתח ביצועים בזמן אמת ולנהל חיוב לקוחות. הכול במקום אחד.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {["SaaS", "עברית ואנגלית", "מנוי חודשי"].map((label) => (
            <span key={label} className="rounded-md bg-white/15 px-3 py-1 text-sm text-white">{label}</span>
          ))}
        </div>
        <div className="mt-7">
          <Button asChild size="lg" className="shadow-sm hover:opacity-90" style={{ background: "#ffffff", color: "#2e1fa3" }}>
            <Link to={Paths.buyLanding}>רכישת דף נחיתה</Link>
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">מה כוללת המערכת</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="h-full shadow-sm">
              <div className="flex items-start justify-between gap-4 p-6">
                <div>
                  <h3 className="mb-2 text-base font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Icon className="size-8 shrink-0 text-primary" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing (hidden on the public root landing) */}
      {!hidePlans && (
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="mb-2 text-center text-2xl font-bold tracking-tight">תוכניות מחיר</h2>
          <p className="mb-10 text-center text-muted-foreground">מחיר חודשי קבוע, ללא עמלות הפתעה. ביטול בכל עת.</p>
          <div className="grid gap-6 md:grid-cols-3">
            <PlanCard name="Basic" audience="לעסקים קטנים" price={PLAN_PRICE_BASIC} features={FEATURES_BASIC} cta="התחל עכשיו" />
            <PlanCard name="Pro" audience="לסוכנויות בצמיחה" price={PLAN_PRICE_PRO} features={FEATURES_PRO} highlight cta="התחל עכשיו" />
            <PlanCard name="Enterprise" audience="לחברות גדולות" price={PLAN_PRICE_ENTERPRISE} features={FEATURES_ENTERPRISE} cta="צור קשר" />
          </div>
          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            כל המחירים כוללים מע"מ. תשלום בכרטיס אשראי בלבד. ניתן לשדרג / לשנמך את התוכנית בכל עת.
          </p>
        </div>
      )}

      {/* Policy links */}
      <div className="mx-auto max-w-3xl px-6 py-10 text-center text-sm text-muted-foreground">
        <Link to={Paths.terms} className="text-primary hover:underline">תקנון ותנאי שימוש</Link>
        {" · "}
        <Link to={Paths.cancelPolicy} className="text-primary hover:underline">מדיניות ביטולים</Link>
        {" · "}
        <Link to={Paths.privacyPolicy} className="text-primary hover:underline">מדיניות פרטיות</Link>
      </div>

      <SiteFooter />
    </div>
  );
}
