import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { accountPath, Paths } from "../../navigation/paths";
import { onboardingAllDone, type OnboardingStored } from "./onboardingStorage";

type Props = {
  state: OnboardingStored;
  dismiss: () => void;
  toggleCollapsed: () => void;
  hasMeta: boolean;
  accountId: string | undefined;
};

type StepDef = {
  key: string;
  done: boolean;
  title: string;
  hint: string;
  to: string;
};

export function OnboardingChecklistCard({ state, dismiss, toggleCollapsed, hasMeta, accountId }: Props) {
  const { t } = useTranslation();

  const billingTo = accountId ? accountPath(accountId, "billing") : Paths.accounts;
  const metaTo = accountId ? accountPath(accountId, "meta") : Paths.accounts;
  const settingsTo = accountId ? accountPath(accountId, "settings") : Paths.accounts;

  const stepsDef = useMemo((): StepDef[] => {
    const base: StepDef[] = [
      {
        key: "business",
        done: state.business,
        title: t("onboarding.stepBusiness"),
        hint: t("onboarding.stepBusinessHint"),
        to: Paths.accounts,
      },
      {
        key: "billing",
        done: state.billing,
        title: t("onboarding.stepBilling"),
        hint: t("onboarding.stepBillingHint"),
        to: billingTo,
      },
    ];
    if (hasMeta) {
      base.push({
        key: "meta",
        done: state.meta,
        title: t("onboarding.stepMeta"),
        hint: t("onboarding.stepMetaHint"),
        to: metaTo,
      });
    }
    base.push({
      key: "settings",
      done: state.settings,
      title: t("onboarding.stepSettings"),
      hint: t("onboarding.stepSettingsHint"),
      to: settingsTo,
    });
    return base;
  }, [state, hasMeta, t, billingTo, metaTo, settingsTo]);

  const { doneCount, total, percent, firstOpen } = useMemo(() => {
    const total = stepsDef.length;
    const doneCount = stepsDef.filter((s) => s.done).length;
    const percent = total ? Math.round((doneCount / total) * 100) : 0;
    const firstOpen = stepsDef.find((s) => !s.done);
    return { doneCount, total, percent, firstOpen };
  }, [stepsDef]);

  if (state.dismissed || onboardingAllDone(state, hasMeta)) {
    return null;
  }

  if (state.collapsed) {
    return (
      <Alert
        data-tour-target="quick-start-card"
        variant="info"
        className="mb-4 rounded-lg"
        title={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="whitespace-nowrap font-semibold">
                {t("onboarding.collapsedTitle", { done: String(doneCount), total: String(total) })}
              </span>
              <div className="flex min-w-30 max-w-55 flex-1 items-center gap-2">
                <Progress value={percent} className="h-1.5" />
                <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {firstOpen ? (
                <Button asChild size="sm">
                  <Link to={firstOpen.to}>{t("onboarding.continueStep")}</Link>
                </Button>
              ) : null}
              <Button variant="link" size="sm" onClick={toggleCollapsed}>
                <ChevronUp aria-hidden="true" />
                {t("onboarding.expand")}
              </Button>
              <Button variant="ghost" size="sm" aria-label={t("onboarding.dismiss")} onClick={dismiss}>
                <X aria-hidden="true" />
              </Button>
            </div>
          </div>
        }
      />
    );
  }

  const firstIncompleteIdx = stepsDef.findIndex((x) => !x.done);

  return (
    <Card
      data-tour-target="quick-start-card"
      className="mb-5 rounded-xl border-border bg-card shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4.5 py-3">
        <div>
          <span className="block text-[15px] font-semibold">{t("onboarding.cardTitle")}</span>
          <span className="text-xs text-muted-foreground">
            {t("onboarding.cardSubtitle", { done: String(doneCount), total: String(total) })}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" aria-label={t("onboarding.minimize")} onClick={toggleCollapsed}>
            <ChevronDown aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" aria-label={t("onboarding.dismiss")} onClick={dismiss}>
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="px-4.5 pb-4.5 pt-4">
        <p className="mb-3.5 text-[13px] leading-relaxed text-muted-foreground">
          {t("onboarding.cardIntro")}
        </p>
        {!hasMeta ? (
          <p className="-mt-1.5 mb-3.5 rounded-md border border-border bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {accountId ? t("onboarding.metaSkippedAccount") : t("onboarding.metaSkippedGlobal")}
          </p>
        ) : null}

        <div className="mb-4 flex items-center gap-2">
          <Progress
            value={percent}
            className={cn("h-2", percent === 100 && "**:data-[slot=progress-indicator]:bg-success")}
          />
          <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
        </div>

        <div className="mb-3.5">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            {t("onboarding.legend")}
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            {[
              t("onboarding.legendBusiness"),
              t("onboarding.legendBilling"),
              ...(hasMeta ? [t("onboarding.legendMeta")] : []),
              t("onboarding.legendSettings"),
              t("onboarding.legendBell"),
            ].join(" · ")}
          </span>
        </div>

        {/* Vertical steps */}
        <ol className="m-0 list-none space-y-4 p-0">
          {stepsDef.map((s, i) => {
            const active = i === firstIncompleteIdx && !s.done;
            return (
              <li key={s.key} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                    s.done
                      ? "border-success/40 bg-(--ds-color-success-surface) text-success"
                      : active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {s.done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0">
                  {s.done ? (
                    <span className="text-sm text-muted-foreground">{s.title}</span>
                  ) : (
                    <Link
                      to={s.to}
                      className={cn(
                        "text-sm font-semibold hover:underline",
                        active ? "text-primary" : "text-foreground",
                      )}
                    >
                      {s.title}
                    </Link>
                  )}
                  <p className="mb-0 mt-1 max-w-130 text-[13px] text-muted-foreground">{s.hint}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {firstOpen ? (
            <Button asChild>
              <Link to={firstOpen.to}>{t("onboarding.ctaContinue")}</Link>
            </Button>
          ) : (
            <span className="font-semibold text-success">{t("onboarding.allDone")}</span>
          )}
          <div className="ms-auto flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline">
              <Link to={Paths.help}>{t("onboarding.openHelpFull")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
