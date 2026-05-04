import { ReloadOutlined } from "@ant-design/icons";
import { App, Button, Card, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import type { ContractMemberRow } from "../../../domain/Contract";
import { useApp } from "../../../app/AppProviders";
import { PageHeader } from "../../shared/components/PageHeader";
import { UserContentLayout } from "../../shared/components/UserContentLayout";

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

export function MemberContractsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services } = useApp();
  const { accountId } = useParams<{ accountId: string }>();
  const [rows, setRows] = useState<ContractMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

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
        const canOpenSign = r.status !== "signed" && r.status !== "voided";
        return (
          <Link to={`/contracts/sign/${encodeURIComponent(r.signToken)}`}>
            {canOpenSign ? t("memberContracts.actionSign") : t("memberContracts.actionView")}
          </Link>
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
