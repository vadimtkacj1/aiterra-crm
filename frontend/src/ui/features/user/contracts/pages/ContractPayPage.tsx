import { CheckCircle2, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { ContractPublic } from "../../../../../domain/Contract";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "ILS").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

async function fetchContract(token: string): Promise<ContractPublic> {
  const res = await fetch(`/api/contracts/${token}`);
  if (!res.ok) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(data.detail ?? "error");
  }
  return res.json() as Promise<ContractPublic>;
}

async function createContractCheckout(
  token: string,
  combined: boolean,
): Promise<{ paymentUrl?: string | null }> {
  const url = `/api/contracts/${token}/checkout${combined ? "?combined=true" : ""}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(data.detail ?? "error");
  }
  return res.json() as Promise<{ paymentUrl?: string | null }>;
}

const pageBg =
  "linear-gradient(165deg, #eef2f7 0%, #e2e8f0 38%, var(--ds-surface-2) 70%, var(--ds-surface-1) 100%)";
const cardShadow =
  "0 8px 30px -8px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.06)";

export function ContractPayPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();

  const [contract, setContract] = useState<ContractPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchContract(token)
      .then(setContract)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "error"))
      .finally(() => setLoading(false));
  }, [token]);

  const pending = contract?.stages
    .filter((s) => s.status !== "paid")
    .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const handlePay = async (combined: boolean) => {
    if (!token) return;
    setPaying(true);
    try {
      const data = await createContractCheckout(token, combined);
      const url = (data.paymentUrl || "").trim();
      if (!url) {
        message.warning(t("contracts.sign.paymentLinkPending"));
        return;
      }
      window.location.assign(url);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const centeredCard = (children: React.ReactNode) => (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: pageBg }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "40px 32px", background: "#fff", borderRadius: 16, boxShadow: cardShadow, border: "1px solid rgba(15,23,42,.08)" }}>
        {children}
      </div>
    </div>
  );

  if (error || !contract) {
    return centeredCard(
      <>
        <h3 className="mb-2 mt-0 text-2xl font-semibold">{t("contracts.sign.notFound")}</h3>
        <span className="text-sm text-muted-foreground">{error}</span>
      </>
    );
  }

  if (contract.status !== "signed") {
    return centeredCard(
      <span className="text-sm text-muted-foreground">{t("contracts.pay.contractNotSigned")}</span>
    );
  }

  const isSubscription = !!(contract.monthlyAmount && contract.monthlyAmount > 0);
  const subscriptionActive = contract.subscriptionStatus === "active";

  if (pending.length === 0) {
    return centeredCard(
      <>
        <CheckCircle2
          aria-hidden="true"
          className="mx-auto mb-4 size-12"
          style={{ color: "var(--ds-color-success)" }}
        />
        <h4 className="mb-2 mt-0 text-xl font-semibold">{contract.title}</h4>
        <span className="text-sm text-muted-foreground">
          {isSubscription && subscriptionActive
            ? t("contracts.sign.subscriptionActiveNote")
            : t("contracts.sign.paymentStatusPaid")}
        </span>
      </>
    );
  }

  const isMultiple = pending.length > 1;
  const totalAmount = pending.reduce((sum, s) => sum + s.amount, 0);
  const currency = contract.currency;

  return (
    <div style={{ minHeight: "100vh", background: pageBg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        padding: "14px 28px",
        borderBottom: "1px solid rgba(15,23,42,.08)",
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ds-text-secondary)", fontWeight: 500 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", color: "#1d4ed8",
          }}>
            <ShieldCheck aria-hidden="true" className="size-4.5" />
          </span>
          {t("contracts.sign.secureLabel")}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ds-text-tertiary)" }}>
          <Lock aria-hidden="true" className="size-3.5" />
          {t("contracts.sign.encryptionNote")}
        </span>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{
          background: "#fff", borderRadius: 20, border: "1px solid rgba(15,23,42,.08)",
          boxShadow: cardShadow, padding: "40px 36px", maxWidth: 480, width: "100%",
        }}>
          {/* Contract title */}
          <span
            className="mb-1.5 block text-[11px] font-bold uppercase text-(--ds-text-secondary)"
            style={{ letterSpacing: "0.1em" }}
          >
            {t("contracts.sign.contractLabel")}
          </span>
          <h3 className="mb-6 mt-0 text-2xl font-bold" style={{ color: "var(--ds-text-primary)" }}>
            {contract.title}
          </h3>

          {/* Payment breakdown (multiple stages) */}
          {isMultiple ? (
            <div style={{
              padding: "18px 20px",
              borderRadius: 14,
              background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
              border: "1px solid rgba(37, 99, 235, 0.15)",
              marginBottom: 24,
            }}>
              <span className="mb-3 block text-xs text-muted-foreground">
                {t("contracts.pay.breakdown")}
              </span>

              {pending.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < pending.length - 1 ? "1px solid rgba(37,99,235,0.1)" : undefined,
                  }}
                >
                  <span className="text-sm" style={{ color: "#334155" }}>
                    {s.description || t("contracts.sign.stage")}
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: "#1e3a8a" }}>
                    {fmtMoney(s.amount, currency)}
                  </span>
                </div>
              ))}

              <Separator style={{ margin: "12px 0 10px", background: "rgba(37,99,235,0.2)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--ds-text-primary)" }}>
                  {t("contracts.pay.total")}
                </span>
                <h2
                  className="m-0 text-3xl font-extrabold tracking-[-0.03em] tabular-nums"
                  style={{ color: "var(--ds-text-primary)" }}
                >
                  {fmtMoney(totalAmount, currency)}
                </h2>
              </div>
            </div>
          ) : (
            /* Single stage — original simple layout */
            <div style={{
              padding: "20px 22px", borderRadius: 14,
              background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
              border: "1px solid rgba(37, 99, 235, 0.15)", marginBottom: 28,
            }}>
              <span className="mb-1 block text-xs text-muted-foreground">
                {t("contracts.pay.amountDue")}
              </span>
              <h2
                className="m-0 text-3xl font-extrabold tracking-[-0.03em] tabular-nums"
                style={{ color: "var(--ds-text-primary)" }}
              >
                {fmtMoney(pending[0].amount, currency)}
              </h2>
              {pending[0].description && (
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  {pending[0].description}
                </span>
              )}
            </div>
          )}

          {/* Pay button */}
          <Button
            size="lg"
            disabled={paying}
            onClick={() => void handlePay(isMultiple)}
            className="mb-3 h-13 w-full rounded-xl text-[17px] font-bold"
            style={{ boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)" }}
          >
            {paying ? (
              <Spinner size="sm" className="text-current" aria-hidden="true" />
            ) : (
              <CreditCard aria-hidden="true" />
            )}
            {t("contracts.sign.payStageNow", {
              amount: fmtMoney(isMultiple ? totalAmount : pending[0].amount, currency),
            })}
          </Button>

          {/* Hint for combined */}
          {isMultiple && (
            <span className="mb-1 block text-center text-xs text-muted-foreground">
              {t("contracts.pay.combinedHint")}
            </span>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "var(--ds-text-tertiary)" }}>
            <Lock aria-hidden="true" className="size-3.5" />
            {t("contracts.pay.redirectNote")}
          </div>
        </div>
      </main>
    </div>
  );
}
