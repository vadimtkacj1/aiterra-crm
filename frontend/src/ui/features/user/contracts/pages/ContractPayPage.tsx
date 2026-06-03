import { CheckCircleOutlined, CreditCardOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { App, Button, Divider, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { ContractPublic } from "../../../../../domain/Contract";

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
  "linear-gradient(165deg, #eef2f7 0%, #e2e8f0 38%, #f1f5f9 70%, #f8fafc 100%)";
const cardShadow =
  "0 8px 30px -8px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.06)";

export function ContractPayPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const { message } = App.useApp();

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
        void message.warning(t("contracts.sign.paymentLinkPending"));
        return;
      }
      window.location.assign(url);
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg }}>
        <Spin size="large" />
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
        <Typography.Title level={3} style={{ marginBottom: 8 }}>{t("contracts.sign.notFound")}</Typography.Title>
        <Typography.Text type="secondary">{error}</Typography.Text>
      </>
    );
  }

  if (contract.status !== "signed") {
    return centeredCard(
      <Typography.Text type="secondary">{t("contracts.pay.contractNotSigned")}</Typography.Text>
    );
  }

  const isSubscription = !!(contract.monthlyAmount && contract.monthlyAmount > 0);
  const subscriptionActive = contract.subscriptionStatus === "active";

  if (pending.length === 0) {
    return centeredCard(
      <>
        <CheckCircleOutlined style={{ fontSize: 48, color: "#16a34a", marginBottom: 16 }} />
        <Typography.Title level={4} style={{ marginBottom: 8 }}>{contract.title}</Typography.Title>
        <Typography.Text type="secondary">
          {isSubscription && subscriptionActive
            ? t("contracts.sign.subscriptionActiveNote")
            : t("contracts.sign.paymentStatusPaid")}
        </Typography.Text>
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
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#475569", fontWeight: 500 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", color: "#1d4ed8",
          }}>
            <SafetyCertificateOutlined />
          </span>
          {t("contracts.sign.secureLabel")}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
          <LockOutlined />
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
          <Typography.Text style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#64748b", display: "block", marginBottom: 6,
          }}>
            {t("contracts.sign.contractLabel")}
          </Typography.Text>
          <Typography.Title level={3} style={{ margin: "0 0 24px", fontWeight: 700, color: "#0f172a" }}>
            {contract.title}
          </Typography.Title>

          {/* Payment breakdown (multiple stages) */}
          {isMultiple ? (
            <div style={{
              padding: "18px 20px",
              borderRadius: 14,
              background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
              border: "1px solid rgba(37, 99, 235, 0.15)",
              marginBottom: 24,
            }}>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                {t("contracts.pay.breakdown")}
              </Typography.Text>

              {pending.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < pending.length - 1 ? "1px solid rgba(37,99,235,0.1)" : undefined,
                  }}
                >
                  <Typography.Text style={{ fontSize: 14, color: "#334155" }}>
                    {s.description || t("contracts.sign.stage")}
                  </Typography.Text>
                  <Typography.Text strong style={{ fontSize: 14, color: "#1e3a8a" }}>
                    {fmtMoney(s.amount, currency)}
                  </Typography.Text>
                </div>
              ))}

              <Divider style={{ margin: "12px 0 10px", borderColor: "rgba(37,99,235,0.2)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography.Text strong style={{ fontSize: 14, color: "#0f172a" }}>
                  {t("contracts.pay.total")}
                </Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a" }}>
                  {fmtMoney(totalAmount, currency)}
                </Typography.Title>
              </div>
            </div>
          ) : (
            /* Single stage — original simple layout */
            <div style={{
              padding: "20px 22px", borderRadius: 14,
              background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
              border: "1px solid rgba(37, 99, 235, 0.15)", marginBottom: 28,
            }}>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                {t("contracts.pay.amountDue")}
              </Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a" }}>
                {fmtMoney(pending[0].amount, currency)}
              </Typography.Title>
              {pending[0].description && (
                <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: "block" }}>
                  {pending[0].description}
                </Typography.Text>
              )}
            </div>
          )}

          {/* Pay button */}
          <Button
            type="primary"
            size="large"
            block
            loading={paying}
            icon={<CreditCardOutlined />}
            onClick={() => void handlePay(isMultiple)}
            style={{
              height: 52, borderRadius: 12, fontWeight: 700, fontSize: 17,
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)", marginBottom: 12,
            }}
          >
            {t("contracts.sign.payStageNow", {
              amount: fmtMoney(isMultiple ? totalAmount : pending[0].amount, currency),
            })}
          </Button>

          {/* Hint for combined */}
          {isMultiple && (
            <Typography.Text type="secondary" style={{ display: "block", textAlign: "center", fontSize: 12, marginBottom: 4 }}>
              {t("contracts.pay.combinedHint")}
            </Typography.Text>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
            <LockOutlined />
            {t("contracts.pay.redirectNote")}
          </div>
        </div>
      </main>
    </div>
  );
}
