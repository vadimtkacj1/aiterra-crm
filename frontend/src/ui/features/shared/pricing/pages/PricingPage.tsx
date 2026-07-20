import {
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
  theme,
} from "antd";
import { Link } from "react-router-dom";
import { FeatureList } from "../components/FeatureList";
import { SiteFooter } from "@/ui/shared/components/SiteFooter";
import { Paths } from "@/ui/navigation/paths";
import { tokens } from "@/styles/designSystem";
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

const { Title, Paragraph, Text } = Typography;

/** Show a real price, or an honest fallback while a plan price is unset (placeholder). */
function displayPrice(price: string): string {
  return /\d/.test(price) ? price : "לפי בקשה";
}

const hasContactPhone = /\d/.test(CONTACT_PHONE);

export function PricingPage() {
  const { token } = theme.useToken();

  return (
    <div dir="rtl" style={{ background: token.colorBgLayout }}>

      {/* ── Header ── */}
      <div style={{ background: tokens.colors.primaryDark, padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Title level={4} style={{ color: "#fff", margin: 0 }}>Aiterra CRM</Title>
        <Space size={16} wrap>
          {hasContactPhone ? (
            <a href={`tel:${CONTACT_PHONE}`} style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
              {CONTACT_PHONE} <PhoneOutlined />
            </a>
          ) : null}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
            {CONTACT_EMAIL} <MailOutlined />
          </a>
          <Link to={Paths.login}>
            <Button type="primary" ghost style={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}>
              כניסה / הרשמה
            </Button>
          </Link>
        </Space>
      </div>

      {/* ── Hero ── */}
      <div style={{ background: tokens.colors.primaryDark, padding: "64px 40px", textAlign: "center" }}>
        <Title style={{ color: "#fff", fontSize: 38, marginBottom: 16 }}>
          מערכת CRM לניהול קמפיינים פרסומיים
        </Title>
        <Paragraph style={{ color: "rgba(255,255,255,0.65)", fontSize: 18, maxWidth: 640, margin: "0 auto 32px" }}>
          Aiterra CRM מאפשרת לסוכנויות פרסום ועסקים לנהל קמפיינים ב-Meta ו-Google Ads,
          לנתח ביצועים בזמן אמת ולנהל חיוב לקוחות. הכול במקום אחד.
        </Paragraph>
        <Space size={12}>
          {["SaaS", "עברית ואנגלית", "מנוי חודשי"].map((label) => (
            <Tag key={label} style={{ fontSize: 13, padding: "4px 12px", background: "rgba(255,255,255,0.14)", color: "#fff", border: "none" }}>
              {label}
            </Tag>
          ))}
        </Space>
      </div>

      {/* ── Features ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: 40 }}>
          מה כוללת המערכת
        </Title>
        <Row gutter={[24, 24]}>
          {[
            { icon: <BarChartOutlined style={{ fontSize: 32, color: token.colorPrimary }} />, title: "אנליטיקה מתקדמת", desc: "סקירה מלאה של קמפיינים ב-Meta וב-Google Ads: חשיפות, קליקים, המרות, ROAS ועוד." },
            { icon: <TeamOutlined style={{ fontSize: 32, color: token.colorPrimary }} />, title: "ניהול לקוחות", desc: "ריכוז כל העסקים והלקוחות במקום אחד, עם הפרדה מלאה בין חשבונות." },
            { icon: <RocketOutlined style={{ fontSize: 32, color: token.colorPrimary }} />, title: "חיוב וניהול תשלומים", desc: "שליחת חשבוניות, מנויים חודשיים, תשלומים חד-פעמיים ומעקב אחר היסטוריית תשלומים." },
            { icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: token.colorPrimary }} />, title: "אבטחה ועמידות", desc: "כניסה מאובטחת עם JWT, הפרדת הרשאות בין מנהלים למשתמשים, גיבויים שוטפים." },
          ].map(({ icon, title, desc }) => (
            <Col xs={24} sm={12} key={title}>
              <Card variant="borderless" style={{ height: "100%", boxShadow: tokens.shadow.card }}>
                <Flex gap={16} align="flex-start">
                  <div>
                    <Title level={5} style={{ margin: "0 0 8px" }}>{title}</Title>
                    <Paragraph style={{ margin: 0 }} type="secondary">{desc}</Paragraph>
                  </div>
                  <div>{icon}</div>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* ── Pricing ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>תוכניות מחיר</Title>
        <Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 40 }}>
          מחיר חודשי קבוע, ללא עמלות הפתעה. ביטול בכל עת.
        </Paragraph>

        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ textAlign: "center", boxShadow: tokens.shadow.card }}>
              <Title level={4} style={{ marginBottom: 4 }}>Basic</Title>
              <Paragraph type="secondary">לעסקים קטנים</Paragraph>
              <div style={{ margin: "16px 0" }}>
                <Text style={{ fontSize: 36, fontWeight: 700 }}>{displayPrice(PLAN_PRICE_BASIC)}</Text>
                {/\d/.test(PLAN_PRICE_BASIC) ? <Text type="secondary"> / חודש</Text> : null}
              </div>
              <Divider />
              <FeatureList items={FEATURES_BASIC} />
              <Button type="default" block style={{ marginTop: 24 }}>התחל עכשיו</Button>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ textAlign: "center", boxShadow: tokens.shadow.cardHover }}>
              <Tag color="purple" style={{ marginBottom: 8 }}>הכי פופולרי</Tag>
              <Title level={4} style={{ marginBottom: 4 }}>Pro</Title>
              <Paragraph type="secondary">לסוכנויות בצמיחה</Paragraph>
              <div style={{ margin: "16px 0" }}>
                <Text style={{ fontSize: 36, fontWeight: 700 }}>{displayPrice(PLAN_PRICE_PRO)}</Text>
                {/\d/.test(PLAN_PRICE_PRO) ? <Text type="secondary"> / חודש</Text> : null}
              </div>
              <Divider />
              <FeatureList items={FEATURES_PRO} />
              <Button type="primary" block style={{ marginTop: 24 }}>התחל עכשיו</Button>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ textAlign: "center", boxShadow: tokens.shadow.card }}>
              <Title level={4} style={{ marginBottom: 4 }}>Enterprise</Title>
              <Paragraph type="secondary">לחברות גדולות</Paragraph>
              <div style={{ margin: "16px 0" }}>
                <Text style={{ fontSize: 36, fontWeight: 700 }}>{displayPrice(PLAN_PRICE_ENTERPRISE)}</Text>
                {/\d/.test(PLAN_PRICE_ENTERPRISE) ? <Text type="secondary"> / חודש</Text> : null}
              </div>
              <Divider />
              <FeatureList items={FEATURES_ENTERPRISE} />
              <Button type="default" block style={{ marginTop: 24 }}>צור קשר</Button>
            </Card>
          </Col>
        </Row>

        <Paragraph type="secondary" style={{ textAlign: "center", marginTop: 24, fontSize: 13 }}>
          כל המחירים כוללים מע"מ. תשלום בכרטיס אשראי בלבד. ניתן לשדרג / לשנמך את התוכנית בכל עת.
        </Paragraph>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
        <Paragraph style={{ marginBottom: 0, color: token.colorTextSecondary }}>
          <Link to={Paths.terms}>תקנון ותנאי שימוש</Link>
          {" · "}
          <Link to={Paths.cancelPolicy}>מדיניות ביטולים</Link>
          {" · "}
          <Link to={Paths.privacyPolicy}>מדיניות פרטיות</Link>
        </Paragraph>
      </div>

      {/* Business details + legal/policy links (visible without login,
          for payment-processor / credit-card-company review) */}
      <SiteFooter />

    </div>
  );
}
