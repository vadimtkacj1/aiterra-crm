import { Drawer, Typography } from "antd";
import type { AdminPaymentsLibraryDrawerModel } from "./adminPaymentsLibraryTypes";
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
        {model.t("admin.payments.templatesTitle")}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 10 }}>
        {model.t("admin.payments.templatesHint")}
      </Typography.Paragraph>

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
