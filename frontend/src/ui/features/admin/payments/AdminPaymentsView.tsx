import { Button, Card, Empty, Flex, Form, Input, Spin, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { Paths } from "@/ui/navigation/paths";
import { AppModal } from "@/ui/shared/components/AppModal";
import { AdminPaymentsHistoryTable } from "./AdminPaymentsHistoryTable";
import { AdminPaymentsLibraryDrawer } from "./AdminPaymentsLibraryDrawer";
import { AdminPaymentsPageHeader } from "./AdminPaymentsPageHeader";
import { InvoiceComposerCard } from "./InvoiceComposerCard";
import { RecipientStepCard } from "./RecipientStepCard";
import { useAdminPaymentsPage } from "./useAdminPaymentsPage";

/** Admin payments & invoices: layout only; logic lives in `useAdminPaymentsPage` and `adminPaymentsFormModel`. */
export function AdminPaymentsPage() {
  const p = useAdminPaymentsPage();
  const navigate = useNavigate();

  const hasBillableClient = Boolean(p.selectedUser && p.userMeta?.accountId);

  return (
    <Spin spinning={p.loadingUsers}>
      <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
        <AdminPaymentsPageHeader
          t={p.t}
          token={p.token}
          shellRadius={p.shellRadius}
          shellShadow={p.shellShadow}
          loadingUsers={p.loadingUsers}
          onOpenLibrary={() => p.setLibraryOpen(true)}
        />

        {p.users.length === 0 && !p.loadingUsers ? (
          <Card
            style={{
              borderRadius: p.shellRadius,
              border: `1px solid ${p.token.colorBorderSecondary}`,
              boxShadow: p.shellShadow,
              marginTop: 24,
            }}
          >
            <Empty description={p.t("admin.payments.noUsersAtAll")} />
          </Card>
        ) : (
          <>
            <Form
              form={p.form}
              layout="vertical"
              style={{ marginTop: 24 }}
              initialValues={{
                chargeType: "one_time",
                currency: "ILS",
                useBreakdown: false,
                lineItems: [],
                splitAcrossMonths: undefined,
                billingSchedule: undefined,
                billingDay: undefined,
                billingWeekDay: undefined,
                testIntervalMinutes: undefined,
              }}
              onFinish={(values) => void p.onFormFinish(values)}
            >
              {/* Recipient */}
              <RecipientStepCard
                t={p.t}
                token={p.token}
                shellRadius={p.shellRadius}
                shellShadow={p.shellShadow}
                loadingUsers={p.loadingUsers}
                users={p.users}
                onUserChange={p.onUserChange}
                selectedIsAdmin={Boolean(p.selectedIsAdmin)}
                selectedUser={p.selectedUser}
                userMeta={p.userMeta}
                metaLoading={p.metaLoading}
                clientLiveBilling={p.clientLiveBilling}
                importLiveBillingIntoForm={p.importLiveBillingIntoForm}
              />

              {/* Composer — appears once a billable client is selected */}
              {hasBillableClient && (
                <>
                  <div style={{ marginTop: 24 }}>
                    <InvoiceComposerCard
                      t={p.t}
                      token={p.token}
                      shellRadius={p.shellRadius}
                      shellShadow={p.shellShadow}
                      form={p.form}
                      chargeTypeW={p.chargeTypeW}
                      useBreakdownW={Boolean(p.useBreakdownW)}
                      currencyW={p.currencyW}
                      linesRunningTotal={p.linesRunningTotal}
                      canSaveTemplate={p.canSaveTemplate}
                      openSaveTemplateModal={p.openSaveTemplateModal}
                      presetBundle={p.presetBundle}
                      presetServerOnly={p.presetServerOnly}
                    />
                  </div>

                  <Flex justify="flex-end" style={{ marginTop: 16 }}>
                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      disabled={!p.userMeta?.accountId || p.billBlockedForAdmin}
                    >
                      {p.t("admin.payments.createSubmit")}
                    </Button>
                  </Flex>
                </>
              )}

              <AdminPaymentsLibraryDrawer model={p.libraryDrawer} />
            </Form>

            {/* Payment History */}
            <Card
              title={
                p.userMeta?.accountId ? (
                  <Flex align="center" gap={8} wrap="wrap">
                    <span>{p.t("admin.payments.historyTitle")}</span>
                    <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                      {p.t("admin.payments.historyFilteredForSelected")}
                    </Tag>
                  </Flex>
                ) : (
                  p.t("admin.payments.historyTitle")
                )
              }
              extra={
                <Button type="link" onClick={() => navigate(Paths.adminInvoices)} style={{ paddingInline: 0 }}>
                  {p.t("admin.payments.historyAllInvoicesLink")}
                </Button>
              }
              size="small"
              style={{
                marginTop: 24,
                borderRadius: p.shellRadius,
                border: `1px solid ${p.token.colorBorderSecondary}`,
                boxShadow: p.shellShadow,
              }}
              styles={{ body: { padding: 0 } }}
            >
              <AdminPaymentsHistoryTable
                t={p.t}
                admin={p.services.admin}
                message={p.message}
                userMeta={p.userMeta}
                rows={p.visibleBillingRows}
                loading={p.allBillingLoading}
                revokingId={p.revokingId}
                deletingId={p.deletingId}
                setRevokingId={p.setRevokingId}
                setDeletingId={p.setDeletingId}
                refreshBillingFormForAccount={p.refreshBillingFormForAccount}
                loadAllBillingHistory={p.loadAllBillingHistory}
                downloadRowPdf={p.downloadRowPdf}
              />
            </Card>

            <AppModal
              title={p.t("admin.payments.saveTemplateModalTitle")}
              open={p.saveTemplateOpen}
              onCancel={() => {
                p.setSaveTemplateOpen(false);
                p.setSaveTemplateTitle("");
              }}
              okText={p.t("admin.payments.saveTemplateOk")}
              cancelText={p.t("common.cancel")}
              confirmLoading={p.savingTemplate}
              onOk={() => p.onSaveTemplateOk()}
            >
              <Typography.Paragraph type="secondary" style={{ marginBottom: "var(--ds-space-3)" }}>
                {p.t("admin.payments.saveTemplateHint")}
              </Typography.Paragraph>
              <Input
                value={p.saveTemplateTitle}
                onChange={(e) => p.setSaveTemplateTitle(e.target.value)}
                placeholder={p.t("admin.payments.saveTemplateTitlePlaceholder")}
                maxLength={200}
              />
            </AppModal>
          </>
        )}
      </div>
    </Spin>
  );
}
