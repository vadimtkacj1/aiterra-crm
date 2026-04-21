import { EnvironmentOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

const BUSINESS_CONTACTS = {
  phone: "03-0000000",
  email: "support@example.co.il",
  address: "רחוב לדוגמה 10, תל אביב",
  legalEntityNumber: "000000000",
};

const PAYMENT_METHODS = [
  { src: "/images/visa.svg", alt: "Visa" },
  { src: "/images/mastercard.svg", alt: "Mastercard" },
  { src: "/images/isracard.svg", alt: "Isracard" },
];

export function SiteFooter() {
  return (
    <footer
      dir="rtl"
      style={{
        borderTop: "none",
        background: "transparent",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 24px",
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>פרטי התקשרות</h3>

          <a
            href={`tel:${BUSINESS_CONTACTS.phone}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#111827", textDecoration: "none" }}
          >
            <span>{BUSINESS_CONTACTS.phone}</span>
            <PhoneOutlined />
          </a>

          <a
            href={`mailto:${BUSINESS_CONTACTS.email}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#111827", textDecoration: "none" }}
          >
            <span>{BUSINESS_CONTACTS.email}</span>
            <MailOutlined />
          </a>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#111827" }}>
            <span>{BUSINESS_CONTACTS.address}</span>
            <EnvironmentOutlined />
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>אמצעי תשלום</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {PAYMENT_METHODS.map((method) => (
              <img
                key={method.src}
                src={method.src}
                alt={method.alt}
                width={54}
                height={34}
                style={{ border: "none", borderRadius: 0, background: "transparent" }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: "none",
            paddingTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "space-between",
            color: "#4b5563",
            fontSize: 13,
          }}
        >
          <span>ח.פ / עוסק מורשה: {BUSINESS_CONTACTS.legalEntityNumber}</span>
          <Link to="/terms" style={{ color: "#111827", textDecoration: "none" }}>
            תקנון ותנאי שימוש
          </Link>
        </div>
      </div>
    </footer>
  );
}
