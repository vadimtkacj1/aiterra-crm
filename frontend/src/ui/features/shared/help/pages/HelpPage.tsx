import { Bell, CirclePlay, LayoutGrid, Lock, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FacebookIcon } from "@/components/icons/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/ui/shared/components/PageHeader";
import { UserContentLayout } from "@/ui/shared/components/UserContentLayout";
import { useGuidedTour } from "@/ui/shared/onboarding/guidedTourContext";

function SectionCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center text-(--ds-text-tertiary) [&_svg]:size-4.5">
              {icon}
            </span>
            <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
          </div>
          <p className="m-0 text-sm leading-[1.65] text-(--ds-text-secondary)">
            {body}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function HelpPage() {
  const { t } = useTranslation();
  const { startGuidedTour, guidedTourAvailable } = useGuidedTour();

  return (
    <UserContentLayout align="start" maxWidth={960}>
      <PageHeader
        title={t("help.title")}
        subtitle={t("help.intro")}
        actions={
          guidedTourAvailable ? (
            <Button title={t("help.runTourSub")} onClick={() => startGuidedTour?.()}>
              <CirclePlay />
              {t("tour.start")}
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionCard
          icon={<LayoutGrid />}
          title={t("help.section1Title")}
          body={t("help.section1Body")}
        />
        <SectionCard
          icon={<FacebookIcon />}
          title={t("help.section2Title")}
          body={t("help.section2Body")}
        />
        <SectionCard
          icon={<Wallet />}
          title={t("help.section3Title")}
          body={t("help.section3Body")}
        />
        <SectionCard
          icon={<Lock />}
          title={t("help.section4Title")}
          body={t("help.section4Body")}
        />
        <SectionCard
          icon={<Bell />}
          title={t("help.section5Title")}
          body={t("help.section5Body")}
        />
      </div>
    </UserContentLayout>
  );
}
