import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyBox } from "@/components/ui/empty";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
    <div className="relative">
      {p.loadingUsers ? (
        <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/60 pt-24">
          <Spinner size="lg" aria-hidden="true" />
        </div>
      ) : null}
      <div className="mx-auto max-w-300 pb-10">
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
            className="mt-6"
            style={{
              borderRadius: p.shellRadius,
              border: `1px solid ${p.token.colorBorderSecondary}`,
              boxShadow: p.shellShadow,
            }}
          >
            <EmptyBox title={p.t("admin.payments.noUsersAtAll")} />
          </Card>
        ) : (
          <>
            <Form
              form={p.form}
              className="mt-6 space-y-0"
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
                  <div className="mt-6">
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

                  <div className="mt-4 flex justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!p.userMeta?.accountId || p.billBlockedForAdmin}
                    >
                      {p.t("admin.payments.createSubmit")}
                    </Button>
                  </div>
                </>
              )}

              <AdminPaymentsLibraryDrawer model={p.libraryDrawer} />
            </Form>

            {/* Payment History */}
            <Card
              className="mt-6 overflow-hidden"
              style={{
                borderRadius: p.shellRadius,
                border: `1px solid ${p.token.colorBorderSecondary}`,
                boxShadow: p.shellShadow,
              }}
            >
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
                style={{ borderBottomColor: "var(--ds-border-subtle)" }}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  <span>{p.t("admin.payments.historyTitle")}</span>
                  {p.userMeta?.accountId ? (
                    <Badge variant="primary">
                      {p.t("admin.payments.historyFilteredForSelected")}
                    </Badge>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate(Paths.adminInvoices)}
                  className="h-auto p-0"
                >
                  {p.t("admin.payments.historyAllInvoicesLink")}
                </Button>
              </div>
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
              onOk={() => void p.onSaveTemplateOk()}
            >
              <p className="text-sm text-muted-foreground" style={{ marginBottom: "var(--ds-space-3)" }}>
                {p.t("admin.payments.saveTemplateHint")}
              </p>
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
    </div>
  );
}
