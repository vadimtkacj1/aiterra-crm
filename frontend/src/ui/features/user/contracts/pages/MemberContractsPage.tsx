import { ReloadOutlined } from "@ant-design/icons";
import { App, Button, Card, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { ContractMemberRow } from "../../../../../domain/Contract";
import { useApp } from "../../../../../app/AppProviders";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../../shared/components/UserContentLayout";
import { ResponsiveCardView, useMobileView } from "../../../../shared/components/ResponsiveCardView";

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "ILS").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function statusMeta(status: ContractMemberRow["status"]): [string, string] {
  const map: Record<string, [string, string]> = {
    draft: ["default", "admin.contracts.status.draft"],
    pending_signature: ["processing", "admin.contracts.status.pending_signature"],
    signed: ["success", "admin.contracts.status.signed"],
    voided: ["error", "admin.contracts.status.voided"],
  };
  return map[status] ?? ["default", status];
}

function paymentMeta(contract: ContractMemberRow): [string, string] {
  const total = contract.totalAmount ?? 0;
  const paidAmount =
    contract.stages?.reduce((sum, stage) => (stage.status === "paid" ? sum + stage.amount : sum), 0) ?? 0;
  const roundedTotal = Math.round((total || 0) * 100);
  const roundedPaid = Math.round(paidAmount * 100);

  if (roundedPaid <= 0) {
    return ["error", "memberContracts.paymentStatusUnpaid"];
  }
  if (roundedPaid >= roundedTotal) {
    return ["success", "memberContracts.paymentStatusPaid"];
  }
  return ["warning", "memberContracts.paymentStatusPartial"];
}

function hasUnpaidStage(contract: ContractMemberRow): boolean {
  return Boolean(contract.stages?.some((stage) => stage.status !== "paid"));
}

function paidCounts(contract: ContractMemberRow) {
  const stagesTotal = contract.stages?.length ?? 0;
  const stagesPaid =
    contract.stages?.reduce((sum, stage) => (stage.status === "paid" ? sum + 1 : sum), 0) ?? 0;
  const paidAmount =
    contract.stages?.reduce((sum, stage) => (stage.status === "paid" ? sum + stage.amount : sum), 0) ?? 0;
  return { stagesPaid, stagesTotal, paidAmount };
}

export function MemberContractsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services } = useApp();
  const { accountId } = useParams<{ accountId: string }>();
  const [rows, setRows] = useState<ContractMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payLoadingId, setPayLoadingId] = useState<number | null>(null);
  const isMobile = useMobileView();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.billing.fetchAccountContracts(accountId ?? "0");
      setRows(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("memberContracts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.billing, accountId, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleContractPay = useCallback(
    async (contract: ContractMemberRow) => {
      if (!contract.signToken) return;
      setPayLoadingId(contract.id);
      try {
        const res = await fetch(`/api/contracts/${encodeURIComponent(contract.signToken)}/checkout`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = (await res.json()) as { detail?: string };
          throw new Error(data.detail ?? "error");
        }
        const payload = await res.json() as { paymentUrl?: string | null };
        const url = (payload.paymentUrl || "").trim();
        if (!url) {
          void message.warning(t("contracts.sign.paymentLinkPending"));
          return;
        }
        window.location.assign(url);
      } catch (e) {
        void message.error(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setPayLoadingId(null);
      }
    },
    [message, t],
  );

  const columns: ColumnsType<ContractMemberRow> = [
    {
      title: t("memberContracts.colTitle"),
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (title: string) => (
        <Typography.Text strong>{title}</Typography.Text>
      ),
    },
    {
      title: t("memberContracts.colTotal"),
      key: "total",
      width: 140,
      render: (_, r) => fmtMoney(r.totalAmount, r.currency),
    },
    {
      title: t("memberContracts.colStages"),
      key: "stages",
      width: 96,
      render: (_, r) => r.stages?.length ?? 0,
    },
    {
      title: t("memberContracts.colPaymentStatus"),
      key: "paymentStatus",
      width: 130,
      render: (_, r) => {
        const [color, key] = paymentMeta(r);
        const { stagesPaid, stagesTotal, paidAmount } = paidCounts(r);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Tag color={color} style={{ margin: 0, alignSelf: "flex-start" }}>
              {t(key)}
            </Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("memberContracts.paymentProgress", {
                paid: stagesPaid,
                total: stagesTotal,
                paidAmount: fmtMoney(paidAmount, r.currency),
                totalAmount: fmtMoney(r.totalAmount, r.currency),
              })}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: t("memberContracts.colStatus"),
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status: ContractMemberRow["status"]) => {
        const [color, i18nKey] = statusMeta(status);
        return <Tag color={color}>{t(i18nKey)}</Tag>;
      },
    },
    {
      title: t("memberContracts.colSigned"),
      key: "signedAt",
      width: 120,
      render: (_, r) =>
        r.signedAt
          ? new Date(r.signedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "-",
    },
    {
      title: t("memberContracts.colAction"),
      key: "action",
      width: 140,
      fixed: "right",
      render: (_, r) => {
        const payAvailable = hasUnpaidStage(r) && r.status === "signed";
        return (
          <Space size={6}>
            {r.status === "signed" && (
              <Button
                type="link"
                size="small"
                href={`/contracts/sign/${encodeURIComponent(r.signToken)}`}
                target="_blank"
              >
                {t("memberContracts.actionDownload")}
              </Button>
            )}
            {payAvailable && (
              <Button
                type="primary"
                size="small"
                loading={payLoadingId === r.id}
                onClick={() => void handleContractPay(r)}
              >
                {t("memberContracts.actionPay")}
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <UserContentLayout>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <PageHeader
          title={t("memberContracts.title")}
          subtitle={t("memberContracts.subtitle")}
          extra={
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              {t("common.reload")}
            </Button>
          }
        />
        <Card>
          {!loading && rows.length === 0 ? (
            <Empty description={t("memberContracts.empty")} />
          ) : isMobile ? (
            <ResponsiveCardView
              items={rows.map((r) => {
                const [statusColor, statusKey] = statusMeta(r.status);
                const [paymentColor, paymentKey] = paymentMeta(r);
                const { stagesPaid, stagesTotal, paidAmount } = paidCounts(r);
                const payAvailable = hasUnpaidStage(r) && r.status === "signed";

                return {
                  id: r.id,
                  title: r.title,
                  subtitle: r.signedAt
                    ? new Date(r.signedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : t("memberContracts.notSigned"),
                  description: t("memberContracts.paymentProgress", {
                    paid: stagesPaid,
                    total: stagesTotal,
                    paidAmount: fmtMoney(paidAmount, r.currency),
                    totalAmount: fmtMoney(r.totalAmount, r.currency),
                  }),
                  tags: [
                    { label: t(statusKey), color: statusColor },
                    { label: t(paymentKey), color: paymentColor },
                  ],
                  extra: (
                    <Typography.Text strong style={{ fontSize: 14 }}>
                      {fmtMoney(r.totalAmount, r.currency)}
                    </Typography.Text>
                  ),
                  actions: [
                    ...(r.status === "signed"
                      ? [{
                          label: t("memberContracts.actionDownload"),
                          onClick: () => window.open(`/contracts/sign/${encodeURIComponent(r.signToken)}`, "_blank"),
                          type: "link" as const,
                        }]
                      : []),
                    ...(payAvailable
                      ? [{
                          label: t("memberContracts.actionPay"),
                          onClick: () => void handleContractPay(r),
                          type: "primary" as const,
                        }]
                      : []),
                  ],
                };
              })}
              loading={loading}
              emptyText={t("memberContracts.empty")}
            />
          ) : (
            <Table<ContractMemberRow>
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              pagination={rows.length > 10 ? { pageSize: 10 } : false}
              scroll={{ x: 720 }}
            />
          )}
        </Card>
      </Space>
    </UserContentLayout>
  );
}
