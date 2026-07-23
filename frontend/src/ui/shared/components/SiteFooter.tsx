import { Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const BUSINESS_CONTACTS = {
  phone: "+972 52-678-0739",
  email: "office@aiterra.co.il",
  legalEntityNumber: "000000000", // ← still a placeholder: replace with real ח.פ / עוסק מורשה
};

const PAYMENT_METHODS = [
  { src: "/images/visa.svg", alt: "Visa" },
  { src: "/images/mastercard.svg", alt: "Mastercard" },
  { src: "/images/isracard.svg", alt: "Isracard" },
];

export function SiteFooter() {
  return (
    <footer dir="rtl" className="bg-transparent">
      <div className="mx-auto grid max-w-5xl gap-4 px-6 py-7">
        <div className="grid gap-2">
          <h3 className="m-0 text-base font-semibold">פרטי התקשרות</h3>

          <a href={`tel:${BUSINESS_CONTACTS.phone}`} className="inline-flex items-center gap-2 text-foreground no-underline">
            <span dir="ltr">{BUSINESS_CONTACTS.phone}</span>
            <Phone className="size-4" />
          </a>

          <a href={`mailto:${BUSINESS_CONTACTS.email}`} className="inline-flex items-center gap-2 text-foreground no-underline">
            <span>{BUSINESS_CONTACTS.email}</span>
            <Mail className="size-4" />
          </a>
        </div>

        <div className="grid gap-2">
          <h3 className="m-0 text-base font-semibold">אמצעי תשלום</h3>
          <div className="flex flex-wrap gap-3">
            {PAYMENT_METHODS.map((m) => (
              <img key={m.src} src={m.src} alt={m.alt} width={54} height={34} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-3 text-[13px] text-muted-foreground">
          <span>ח.פ / עוסק מורשה: {BUSINESS_CONTACTS.legalEntityNumber}</span>
          <Link to="/terms" className="text-foreground no-underline hover:underline">תקנון ותנאי שימוש</Link>
          <Link to="/cancel-policy" className="text-foreground no-underline hover:underline">מדיניות ביטולים</Link>
          <Link to="/privacy-policy" className="text-foreground no-underline hover:underline">מדיניות פרטיות</Link>
        </div>
      </div>
    </footer>
  );
}
