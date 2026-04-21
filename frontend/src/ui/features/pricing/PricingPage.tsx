/**
 * PricingPage — דף תמחור / merchant page ציבורי לאישור Z-Credit.
 *
 * ⚠️  מלא את הפרטים הסמנוים ב-TODO לפני שליחה ל-Z-Credit:
 *    - CONTACT_PHONE   — מספר טלפון
 *    - CONTACT_EMAIL   — כתובת אימייל
 *    - PLAN_PRICE_*    — מחירי תוכניות
 */

import {
  CheckOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  TeamOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { Link } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

// ─── TODO: מלא פרטים אלה ───────────────────────────────────────────────────
const CONTACT_PHONE = "TODO_PHONE"; // לדוגמה: "03-1234567"
const CONTACT_EMAIL = "TODO@aiterra.co.il"; // כתובת אימייל לעסק

const PLAN_PRICE_BASIC = "TODO"; // מחיר בסיסי — לדוגמה: "₪490"
const PLAN_PRICE_PRO = "TODO"; // מחיר PRO — לדוגמה: "₪990"
const PLAN_PRICE_ENTERPRISE = "TODO"; // מחיר Enterprise — לדוגמה: "₪1,990"
// ────────────────────────────────────────────────────────────────────────────

const FEATURES_BASIC = [
  "ניהול עד 3 עסקים",
  "אנליטיקה של קמפיינים ב-Meta",
  "דוחות חודשיים",
  "תמיכה במייל",
];

const FEATURES_PRO = [
  "ניהול עד 15 עסקים",
  "אנליטיקה Meta + Google Ads",
  "ייצוא CSV",
  "גלריית קריאייטיב",
  "תמיכה טלפונית בשעות הפעילות",
];

const FEATURES_ENTERPRISE = [
  "עסקים ללא הגבלה",
  "כל תכונות PRO",
  "API מותאם אישית",
  "מנהל לקוח ייעודי",
  "SLA מוגדר",
  "הדרכה ולחנות",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item) => (
        <li key={item} style={{ padding: "4px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span>{item}</span>
          <CheckOutlined style={{ color: "#52c41a", marginTop: 3 }} />
        </li>
      ))}
    </ul>
  );
}

export function PricingPage() {
  return (
    <div dir="rtl" style={{ fontFamily: "Arial, 'Segoe UI', sans-serif", background: "#f5f7fa" }}>

      {/* ── Header ── */}
      <div style={{ background: "#001529", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Title level={4} style={{ color: "#fff", margin: 0 }}>Aiterra CRM</Title>
        <Space>
          <a href={`tel:${CONTACT_PHONE}`} style={{ color: "#91caff", fontSize: 14 }}>
            {CONTACT_PHONE} <PhoneOutlined />
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#91caff", fontSize: 14 }}>
            {CONTACT_EMAIL} <MailOutlined />
          </a>
        </Space>
      </div>

      {/* ── Hero ── */}
      <div style={{ background: "#001529", padding: "64px 40px", textAlign: "center" }}>
        <Title style={{ color: "#fff", fontSize: 38, marginBottom: 16 }}>
          מערכת CRM לניהול קמפיינים פרסומיים
        </Title>
        <Paragraph style={{ color: "#bfcfe8", fontSize: 18, maxWidth: 640, margin: "0 auto 32px" }}>
          Aiterra CRM מאפשרת לסוכנויות פרסום ועסקים לנהל קמפיינים ב-Meta ו-Google Ads,
          לנתח ביצועים בזמן אמת ולנהל חיוב לקוחות — הכול במקום אחד.
        </Paragraph>
        <Space size={12}>
          <Tag color="blue" style={{ fontSize: 13, padding: "4px 12px" }}>SaaS</Tag>
          <Tag color="green" style={{ fontSize: 13, padding: "4px 12px" }}>עברית ואנגלית</Tag>
          <Tag color="gold" style={{ fontSize: 13, padding: "4px 12px" }}>מנוי חודשי</Tag>
        </Space>
      </div>

      {/* ── Features ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: 40 }}>
          מה כוללת המערכת
        </Title>
        <Row gutter={[24, 24]}>
          {[
            { icon: <BarChartOutlined style={{ fontSize: 32, color: "#1677ff" }} />, title: "אנליטיקה מתקדמת", desc: "סקירה מלאה של קמפיינים ב-Meta וב-Google Ads: חשיפות, קליקים, המרות, ROAS ועוד." },
            { icon: <TeamOutlined style={{ fontSize: 32, color: "#1677ff" }} />, title: "ניהול לקוחות", desc: "ריכוז כל העסקים והלקוחות במקום אחד, עם הפרדה מלאה בין חשבונות." },
            { icon: <RocketOutlined style={{ fontSize: 32, color: "#1677ff" }} />, title: "חיוב וניהול תשלומים", desc: "שליחת חשבוניות, מנויים חודשיים, תשלומים חד-פעמיים ומעקב אחר היסטוריית תשלומים." },
            { icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: "#1677ff" }} />, title: "אבטחה ועמידות", desc: "כניסה מאובטחת עם JWT, הפרדת הרשאות בין מנהלים למשתמשים, גיבויים שוטפים." },
          ].map(({ icon, title, desc }) => (
            <Col xs={24} sm={12} key={title}>
              <Card bordered={false} style={{ height: "100%", border: "1px solid #e5e7eb" }}>
                <Flex gap={16} align="flex-start">
                  <div>
                    <Title level={5} style={{ margin: "0 0 8px" }}>{title}</Title>
                    <Paragraph style={{ margin: 0, color: "#555" }}>{desc}</Paragraph>
                  </div>
                  <div>{icon}</div>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Divider style={{ margin: 0 }} />

      {/* ── Pricing ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>תוכניות מחיר</Title>
        <Paragraph style={{ textAlign: "center", color: "#666", marginBottom: 40 }}>
          מחיר חודשי קבוע, ללא עמלות הפתעה. ביטול בכל עת.
        </Paragraph>

        <Row gutter={[24, 24]} justify="center">
          {/* Basic */}
          <Col xs={24} md={8}>
            <Card
              bordered={false}
              style={{ textAlign: "center", border: "1px solid #e5e7eb" }}
            >
              <Title level={4} style={{ marginBottom: 4 }}>Basic</Title>
              <Paragraph style={{ color: "#888" }}>לעסקים קטנים</Paragraph>
              <div style={{ margin: "16px 0" }}>
                <Text style={{ fontSize: 36, fontWeight: 700 }}>{PLAN_PRICE_BASIC}</Text>
                <Text style={{ color: "#888" }}> / חודש</Text>
              </div>
              <Divider />
              <FeatureList items={FEATURES_BASIC} />
              <Button type="default" block style={{ marginTop: 24 }}>
                התחל עכשיו
              </Button>
            </Card>
          </Col>

          {/* Pro */}
          <Col xs={24} md={8}>
            <Card
              bordered={false}
              style={{ textAlign: "center", border: "2px solid #1677ff" }}
            >
              <Tag color="blue" style={{ marginBottom: 8 }}>הכי פופולרי</Tag>
              <Title level={4} style={{ marginBottom: 4 }}>Pro</Title>
              <Paragraph style={{ color: "#888" }}>לסוכנויות בצמיחה</Paragraph>
              <div style={{ margin: "16px 0" }}>
                <Text style={{ fontSize: 36, fontWeight: 700 }}>{PLAN_PRICE_PRO}</Text>
                <Text style={{ color: "#888" }}> / חודש</Text>
              </div>
              <Divider />
              <FeatureList items={FEATURES_PRO} />
              <Button type="primary" block style={{ marginTop: 24 }}>
                התחל עכשיו
              </Button>
            </Card>
          </Col>

          {/* Enterprise */}
          <Col xs={24} md={8}>
            <Card
              bordered={false}
              style={{ textAlign: "center", border: "1px solid #e5e7eb" }}
            >
              <Title level={4} style={{ marginBottom: 4 }}>Enterprise</Title>
              <Paragraph style={{ color: "#888" }}>לחברות גדולות</Paragraph>
              <div style={{ margin: "16px 0" }}>
                <Text style={{ fontSize: 36, fontWeight: 700 }}>{PLAN_PRICE_ENTERPRISE}</Text>
                <Text style={{ color: "#888" }}> / חודש</Text>
              </div>
              <Divider />
              <FeatureList items={FEATURES_ENTERPRISE} />
              <Button type="default" block style={{ marginTop: 24 }}>
                צור קשר
              </Button>
            </Card>
          </Col>
        </Row>

        <Paragraph style={{ textAlign: "center", color: "#999", marginTop: 24, fontSize: 13 }}>
          כל המחירים כוללים מע"מ. תשלום בכרטיס אשראי בלבד. ניתן לשדרג / לשנמך את התוכנית בכל עת.
        </Paragraph>
      </div>

      <Divider style={{ margin: 0 }} />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
        <Paragraph style={{ marginBottom: 0, color: "#4b5563" }}>
          לתנאי שימוש ומדיניות ביטולים מלאים עברו לעמוד{" "}
          <Link to="/terms">התקנון</Link>.
        </Paragraph>
      </div>


    </div>
  );
}
