import { Button, Card, Empty, Flex, Form, Input, Modal, Spin, Steps, Typography } from "antd";
import { useState } from "react";
import { AdminPaymentsLibraryDrawer } from "./AdminPaymentsLibraryDrawer";
import { AdminPaymentsPageHeader } from "./AdminPaymentsPageHeader";
import { InvoiceComposerCard } from "./InvoiceComposerCard";
import { RecipientStepCard } from "./RecipientStepCard";
import { useAdminPaymentsPage } from "./useAdminPaymentsPage";

/** Admin payments & invoices: layout only; logic lives in `useAdminPaymentsPage` and `adminPaymentsFormModel`. */
export function AdminPaymentsPage() {
  const p = useAdminPaymentsPage();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: p.t("admin.payments.step1Title"),
      description: p.t("admin.payments.step1Desc"),
    },
    {
      title: p.t("admin.payments.step2Title"),
      description: p.t("admin.payments.step2Desc"),
    },
  ];

  const canProceedToStep2 = p.selectedUser && p.userMeta?.accountId;

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
            {/* Progress Steps */}
            <Card
              style={{
                borderRadius: p.shellRadius,
                border: `1px solid ${p.token.colorBorderSecondary}`,
                boxShadow: p.shellShadow,
                marginBottom: 24,
                marginTop: 24,
              }}
            >
              <Steps
                current={currentStep}
                items={steps}
                onChange={(step) => {
                  if (step === 0 || (step === 1 && canProceedToStep2)) {
                    setCurrentStep(step);
                  }
                }}
                style={{ maxWidth: 600, margin: "0 auto" }}
              />
            </Card>

            <Form
              form={p.form}
              layout="vertical"
              initialValues={{
                chargeType: "one_time",
                currency: "USD",
                useBreakdown: true,
                lineItems: [],
                splitAcrossMonths: undefined,
              }}
              onFinish={(values) => void p.onFormFinish(values)}
            >
              {/* Step 1: Select Recipient */}
              {currentStep === 0 && (
                <>
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

                  <Flex justify="flex-end" style={{ marginTop: 16 }}>
                    <Button
                      type="primary"
                      size="large"
                      disabled={!canProceedToStep2}
                      onClick={() => setCurrentStep(1)}
                    >
                      {p.t("admin.payments.nextStep")}
                    </Button>
                  </Flex>
                </>
              )}

              {/* Step 2: Create Invoice */}
              {currentStep === 1 && (
                <>
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

                  <Flex justify="space-between" align="center" style={{ marginTop: 16 }}>
                    <Button size="large" onClick={() => setCurrentStep(0)}>
                      {p.t("admin.payments.backStep")}
                    </Button>
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

            <Modal
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
              <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                {p.t("admin.payments.saveTemplateHint")}
              </Typography.Paragraph>
              <Input
                value={p.saveTemplateTitle}
                onChange={(e) => p.setSaveTemplateTitle(e.target.value)}
                placeholder={p.t("admin.payments.saveTemplateTitlePlaceholder")}
                maxLength={200}
              />
            </Modal>
          </>
        )}
      </div>
    </Spin>
  );
}
