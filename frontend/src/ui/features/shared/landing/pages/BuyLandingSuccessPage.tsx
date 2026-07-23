import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/ui/shared/components/SiteFooter";
import { Paths } from "@/ui/navigation/paths";

export function BuyLandingSuccessPage() {
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-muted">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-[460px] p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h1 className="mb-2 mt-5 text-2xl font-bold tracking-tight">התשלום התקבל, תודה!</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            קיבלנו את ההזמנה לדף הנחיתה. צוות Aiterra יצור אתכם קשר במייל בהקדם עם הפרטים והשלבים הבאים.
          </p>
          <Button asChild size="lg">
            <Link to={Paths.root}>חזרה לאתר</Link>
          </Button>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
