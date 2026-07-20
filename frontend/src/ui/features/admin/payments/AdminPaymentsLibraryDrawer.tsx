import { Drawer, Grid, Typography } from "antd";
import type { AdminPaymentsLibraryDrawerModel } from "./adminPaymentsLibraryTypes";
import { AdminPaymentsTemplatesPanel } from "./AdminPaymentsTemplatesPanel";

type Props = {
  model: AdminPaymentsLibraryDrawerModel;
};

export function AdminPaymentsLibraryDrawer({ model }: Props) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Drawer
      title={model.t("admin.payments.libraryDrawerTitle")}
      placement="right"
      width={isMobile ? "100%" : 720}
      open={model.open}
      onClose={model.onClose}
      afterOpenChange={model.afterOpenChange}
      styles={{ body: { paddingTop: 8, paddingBottom: 24 } }}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 0, marginBottom: 10 }}>
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
