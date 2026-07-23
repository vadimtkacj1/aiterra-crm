import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { MetaPaymentPanel } from "./MetaPaymentPanel";

export function AdminMetaBudgetPage() {
  const { t } = useTranslation();
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.topup.title")}
        subtitle={t("admin.topup.subtitle")}
        actions={
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("common.reload")}
                  disabled={loading}
                  onClick={() => setRefreshToken((x) => x + 1)}
                >
                  {loading
                    ? <Spinner size="sm" className="text-current" aria-hidden="true" />
                    : <RefreshCw aria-hidden="true" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("common.reload")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />
      <MetaPaymentPanel refreshToken={refreshToken} onLoadingChange={setLoading} />
    </PageContainer>
  );
}
