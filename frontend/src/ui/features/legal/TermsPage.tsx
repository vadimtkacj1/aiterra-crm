import { ArrowRightOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "transparent", color: "#111827" }}>
      <Button
        type="default"
        icon={<ArrowRightOutlined />}
        onClick={() => navigate(-1)}
        style={{
          position: "fixed",
          top: 20,
          right: 24,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        חזרה
      </Button>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 56px", display: "grid", gap: 32 }}>
        <header style={{ display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>תקנון</h1>
          <p style={{ margin: 0, lineHeight: 1.7, color: "#374151" }}>
            אנחנו עוזרים לך לנהל פעילות שיווק בצורה ברורה ומסודרת: לעקוב אחרי ביצועים, לשמור על סדר בחיובים ולחסוך זמן
            תפעולי ביום-יום.
          </p>
        </header>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Terms of Service</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            השירות מיועד לעסקים שרוצים תמונת מצב ברורה של הקמפיינים והחיובים שלהם במקום אחד. לאחר רכישה, תקבל גישה
            לכלי הניהול לפי החבילה שבחרת, כולל דוחות ומעקב שוטף אחרי הפעילות.
          </p>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            אנחנו מתחייבים לסביבת עבודה יציבה, לשקיפות במידע ולתמיכה פרקטית. הלקוח מתחייב להשתמש במערכת בצורה חוקית,
            לשמור על פרטי הגישה ולעדכן אותנו כשנדרש טיפול מהיר או שינוי בפרטי החשבון.
          </p>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Cancellation & Refund Policy (מדיניות ביטולים)</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            ניתן לבטל שירות בכל עת דרך התמיכה או דרך אזור הלקוח. הביטול עוצר חיובים עתידיים ונכנס לתוקף מסוף תקופת החיוב
            הנוכחית, אלא אם צוין אחרת בכתב.
          </p>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            כאשר מתבקש זיכוי, אנחנו בודקים את המקרה לפי מצב השימוש בפועל, מועד הבקשה והתחייבויות השירות. המטרה שלנו היא
            לספק פתרון הוגן וברור שמאפשר המשכיות עסקית ללא אי-ודאות.
          </p>
        </section>
      </main>

    </div>
  );
}
