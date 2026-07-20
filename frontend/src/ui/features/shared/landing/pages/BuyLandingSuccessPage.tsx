import { CheckCircleFilled } from "@ant-design/icons";
import { Button, Card, Typography } from "antd";
import { Link } from "react-router-dom";
import { SiteFooter } from "@/ui/shared/components/SiteFooter";
import { Paths } from "@/ui/navigation/paths";
import { tokens } from "@/styles/designSystem";

const { Title, Paragraph } = Typography;

export function BuyLandingSuccessPage() {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: tokens.colors.surface1, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <Card
          style={{ width: "100%", maxWidth: 460, borderRadius: 16, boxShadow: tokens.shadow.lg, border: "none", textAlign: "center" }}
          styles={{ body: { padding: 40 } }}
        >
          <CheckCircleFilled style={{ fontSize: 56, color: tokens.colors.success }} />
          <Title level={3} style={{ marginTop: 20, marginBottom: 8 }}>התשלום התקבל, תודה!</Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            קיבלנו את ההזמנה לדף הנחיתה. צוות Aiterra יצור אתכם קשר במייל בהקדם עם הפרטים והשלבים הבאים.
          </Paragraph>
          <Link to={Paths.root}>
            <Button type="primary" size="large">חזרה לאתר</Button>
          </Link>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
