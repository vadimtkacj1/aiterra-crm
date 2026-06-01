import { CreditCardOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { App, Button, Spin, Typography } from "antd";
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

async function createContractCheckout(token: string): Promise<{ paymentUrl?: string | null }> {
  const res = await fetch(`/api/contracts/${token}/checkout`, { method: "POST" });
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

  const nextStage = contract?.stages.find((s) => s.status !== "paid") ?? null;

  const handlePay = async () => {
    if (!token) return;
    setPaying(true);
    try {
      const data = await createContractCheckout(token);
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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: pageBg,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: pageBg,
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 400,
            padding: "40px 32px",
            background: "#fff",
            borderRadius: 16,
            boxShadow: cardShadow,
            border: "1px solid rgba(15,23,42,.08)",
          }}
        >
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            {t("contracts.sign.notFound")}
          </Typography.Title>
          <Typography.Text type="secondary">{error}</Typography.Text>
        </div>
      </div>
    );
  }

  if (contract.status !== "signed") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: pageBg,
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 400,
            padding: "40px 32px",
            background: "#fff",
            borderRadius: 16,
            boxShadow: cardShadow,
          }}
        >
          <Typography.Text type="secondary">
            {t("contracts.pay.contractNotSigned")}
          </Typography.Text>
        </div>
      </div>
    );
  }

  if (!nextStage) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: pageBg,
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 400,
            padding: "40px 32px",
            background: "#fff",
            borderRadius: 16,
            boxShadow: cardShadow,
          }}
        >
          <Typography.Text type="secondary">
            {t("contracts.sign.paymentStatusPaid")}
          </Typography.Text>
        </div>
      </div>
    );
  }

  const amountLabel = fmtMoney(nextStage.amount, contract.currency);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: pageBg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "14px 28px",
          borderBottom: "1px solid rgba(15,23,42,.08)",
          background: "rgba(255,255,255,.92)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 14,
            color: "#475569",
            fontWeight: 500,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)",
              color: "#1d4ed8",
            }}
          >
            <SafetyCertificateOutlined />
          </span>
          {t("contracts.sign.secureLabel")}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#94a3b8",
          }}
        >
          <LockOutlined />
          {t("contracts.sign.encryptionNote")}
        </span>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid rgba(15,23,42,.08)",
            boxShadow: cardShadow,
            padding: "40px 36px",
            maxWidth: 460,
            width: "100%",
          }}
        >
          <Typography.Text
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#64748b",
              display: "block",
              marginBottom: 6,
            }}
          >
            {t("contracts.sign.contractLabel")}
          </Typography.Text>
          <Typography.Title
            level={3}
            style={{ margin: "0 0 24px", fontWeight: 700, color: "#0f172a" }}
          >
            {contract.title}
          </Typography.Title>

          <div
            style={{
              padding: "20px 22px",
              borderRadius: 14,
              background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
              border: "1px solid rgba(37, 99, 235, 0.15)",
              marginBottom: 28,
            }}
          >
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, display: "block", marginBottom: 4 }}
            >
              {t("contracts.pay.amountDue")}
            </Typography.Text>
            <Typography.Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#0f172a",
              }}
            >
              {amountLabel}
            </Typography.Title>
            {nextStage.description ? (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, marginTop: 6, display: "block" }}
              >
                {nextStage.description}
              </Typography.Text>
            ) : null}
          </div>

          <Button
            type="primary"
            size="large"
            block
            loading={paying}
            icon={<CreditCardOutlined />}
            onClick={() => void handlePay()}
            style={{
              height: 52,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 17,
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
              marginBottom: 16,
            }}
          >
            {t("contracts.sign.payStageNow", { amount: amountLabel })}
          </Button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            <LockOutlined />
            {t("contracts.pay.redirectNote")}
          </div>
        </div>
      </main>
    </div>
  );
}
