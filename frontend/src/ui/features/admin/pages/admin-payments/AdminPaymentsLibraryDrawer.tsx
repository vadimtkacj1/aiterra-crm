import { Divider, Drawer, Typography } from "antd";
import type { AdminPaymentsLibraryDrawerModel } from "./adminPaymentsLibraryTypes";
import { AdminPaymentsHistoryTable } from "./AdminPaymentsHistoryTable";
import { AdminPaymentsTemplatesPanel } from "./AdminPaymentsTemplatesPanel";

type Props = {
  model: AdminPaymentsLibraryDrawerModel;
};

export function AdminPaymentsLibraryDrawer({ model }: Props) {
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

    </Drawer>
  );
}
