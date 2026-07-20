import { CheckCircleFilled, LockOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Typography, App } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SiteFooter } from "@/ui/shared/components/SiteFooter";
import { Paths } from "@/ui/navigation/paths";
import { tokens } from "@/styles/designSystem";

const { Title, Paragraph, Text } = Typography;

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const PRODUCT = {
  title: "דף נחיתה מקצועי — מנוי ל‑12 חודשים",
  priceLabel: "₪2,400",
  vatNote: "כולל מע\"מ · חיוב חד‑פעמי ל‑12 חודשים",
  features: [
    "עיצוב ובניית דף נחיתה מותאם אישית",
    "אחסון, דומיין ותחזוקה ל‑12 חודשים",
    "טופס לידים עם התראות WhatsApp ואימייל",
    "חיבור ל‑Meta / Google Ads ואנליטיקה",
  ],
};

type FormValues = { name: string; email: string };

export function BuyLandingPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/landing-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name.trim(), email: values.email.trim() }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { paymentUrl?: string };
      const url = (data.paymentUrl || "").trim();
      if (!url) throw new Error("no_payment_url");
      // Hand off to the secure Z-Credit hosted payment page
      window.location.assign(url);
    } catch (e) {
      void message.error(
        e instanceof Error && e.message === "zcredit_not_configured"
          ? "התשלום אינו זמין כרגע. נסו שוב מאוחר יותר."
          : "אירעה שגיאה בפתיחת עמוד התשלום. נסו שוב.",
      );
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: tokens.colors.surface1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: tokens.colors.primaryDark, padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to={Paths.root} style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
          Aiterra CRM
        </Link>
        <Link to={Paths.login} style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
          כניסה / הרשמה
        </Link>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px" }}>
        <Card
          style={{ width: "100%", maxWidth: 520, borderRadius: 16, boxShadow: tokens.shadow.lg, border: "none" }}
          styles={{ body: { padding: 32 } }}
        >
          <Title level={3} style={{ marginBottom: 4 }}>{PRODUCT.title}</Title>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "12px 0 4px" }}>
            <Text style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {PRODUCT.priceLabel}
            </Text>
          </div>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>{PRODUCT.vatNote}</Paragraph>

          <div style={{ display: "grid", gap: 10, paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid var(--ds-border-subtle)" }}>
            {PRODUCT.features.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <CheckCircleFilled style={{ color: tokens.colors.success, marginTop: 3 }} />
                <Text>{f}</Text>
              </div>
            ))}
          </div>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="name"
              label="שם מלא"
              rules={[{ required: true, min: 2, message: "נא להזין שם מלא" }]}
            >
              <Input size="large" placeholder="ישראל ישראלי" autoComplete="name" />
            </Form.Item>
            <Form.Item
              name="email"
              label="אימייל"
              rules={[{ required: true, type: "email", message: "נא להזין כתובת אימייל תקינה" }]}
            >
              <Input size="large" placeholder="you@company.co.il" autoComplete="email" inputMode="email" />
            </Form.Item>

            <Button type="primary" size="large" htmlType="submit" block loading={loading} icon={<LockOutlined />}>
              המשך לתשלום מאובטח · {PRODUCT.priceLabel}
            </Button>
          </Form>

          <Paragraph type="secondary" style={{ fontSize: 12, textAlign: "center", marginTop: 16, marginBottom: 0 }}>
            התשלום מתבצע בעמוד מאובטח (Z‑Credit). בלחיצה על המשך אתם מאשרים את{" "}
            <Link to={Paths.terms}>התקנון</Link>, <Link to={Paths.cancelPolicy}>מדיניות הביטולים</Link> ו
            <Link to={Paths.privacyPolicy}>מדיניות הפרטיות</Link>.
          </Paragraph>
        </Card>
      </div>

      <SiteFooter />
    </div>
  );
}
