import { Divider, Drawer, Typography } from "antd";
import { useState } from "react";
import type { BillingHistoryWithAccountRow } from "@/services/admin/AdminService";
import type { AdminPaymentsLibraryDrawerModel } from "./adminPaymentsLibraryTypes";
import { AdminPaymentsHistoryTable } from "./AdminPaymentsHistoryTable";
import { AdminPaymentsPayLinkModal } from "./AdminPaymentsPayLinkModal";
import { AdminPaymentsTemplatesPanel } from "./AdminPaymentsTemplatesPanel";

type Props = {
  model: AdminPaymentsLibraryDrawerModel;
};

export function AdminPaymentsLibraryDrawer({ model }: Props) {
  const [linkModal, setLinkModal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const openLinkModal = (row: BillingHistoryWithAccountRow) => {
    const raw = row.paymentUrl;
    const url = raw?.startsWith("http")
      ? raw
      : `${window.location.origin}/a/${row.accountId}/billing/checkout`;
    setLinkModal(url);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!linkModal) return;
    void navigator.clipboard.writeText(linkModal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const closeLinkModal = () => {
    setLinkModal(null);
    setCopied(false);
  };

  return (
    <Drawer
      title={model.t("admin.payments.libraryDrawerTitle")}
      placement="right"
      width={720}
      open={model.open}
      onClose={model.onClose}
      afterOpenChange={model.afterOpenChange}
      styles={{ body: { paddingTop: 8, paddingBottom: 24 } }}
    >
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {model.t("admin.payments.allInvoicesTitle")}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 10 }}>
        {model.t("admin.payments.allInvoicesHint")}
      </Typography.Paragraph>

      <AdminPaymentsHistoryTable
        t={model.t}
        admin={model.admin}
        message={model.message}
        userMeta={model.userMeta}
        rows={model.allBillingRows}
        loading={model.allBillingLoading}
        revokingId={model.revokingId}
        deletingId={model.deletingId}
        setRevokingId={model.setRevokingId}
        setDeletingId={model.setDeletingId}
        refreshBillingFormForAccount={model.refreshBillingFormForAccount}
        loadAllBillingHistory={model.loadAllBillingHistory}
        downloadRowPdf={model.downloadRowPdf}
        onOpenPayLink={openLinkModal}
      />

      <Divider style={{ margin: "18px 0" }} />

      <AdminPaymentsTemplatesPanel
        t={model.t}
        admin={model.admin}
        message={model.message}
        userMeta={model.userMeta}
        templates={model.invoiceTemplates}
        templatesLoading={model.templatesLoading}
        billBlockedForAdmin={model.billBlockedForAdmin}
        loadTemplateIntoForm={model.loadTemplateIntoForm}
        applyTemplateToSelectedClient={model.applyTemplateToSelectedClient}
        loadInvoiceTemplates={model.loadInvoiceTemplates}
      />

      <AdminPaymentsPayLinkModal
        t={model.t}
        url={linkModal}
        copied={copied}
        onClose={closeLinkModal}
        onCopy={handleCopy}
      />
    </Drawer>
  );
}
