import { CheckOutlined, CopyOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Flex, Form, Input, Modal, Spin, Typography } from "antd";
import { useState } from "react";
import { AdminPaymentsLibraryDrawer } from "./AdminPaymentsLibraryDrawer";
import { AdminPaymentsPageHeader } from "./AdminPaymentsPageHeader";
import { InvoiceComposerCard } from "./InvoiceComposerCard";
import { RecipientStepCard } from "./RecipientStepCard";
import { useAdminPaymentsPage } from "./useAdminPaymentsPage";

/** Admin payments & invoices — layout only; logic lives in `useAdminPaymentsPage` and `adminPaymentsFormModel`. */
export function AdminPaymentsPage() {
  const p = useAdminPaymentsPage();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!p.paymentLinkModal) return;
    void navigator.clipboard.writeText(p.paymentLinkModal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Spin spinning={p.loadingUsers}>
      <Flex vertical gap={18} style={{ maxWidth: 1024, margin: "0 auto", paddingBottom: 20 }}>
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
            variant="borderless"
            style={{
              borderRadius: p.shellRadius,
              border: `1px solid ${p.token.colorBorderSecondary}`,
              boxShadow: p.shellShadow,
            }}
          >
            <Empty description={p.t("admin.payments.noUsersAtAll")} />
          </Card>
        ) : (
          <>
            <Form
              form={p.form}
              layout="vertical"
              initialValues={{
                chargeType: "none",
                currency: "USD",
                useBreakdown: true,
                lineItems: [],
                splitAcrossMonths: undefined,
              }}
              onFinish={(values) => void p.onFormFinish(values)}
            >
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

              <AdminPaymentsLibraryDrawer model={p.libraryDrawer} />

              <Flex
                justify={p.selectedUser ? "flex-end" : "space-between"}
                align="center"
                wrap="wrap"
                gap={12}
                style={{ marginTop: 4 }}
              >
                {!p.selectedUser ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {p.t("admin.payments.selectUserPlaceholder")}
                  </Typography.Text>
                ) : null}
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  disabled={!p.userMeta?.accountId || p.billBlockedForAdmin}
                >
                  {p.t("admin.payments.createSubmit")}
                </Button>
              </Flex>
            </Form>

            <Modal
              title={
                <Flex align="center" gap={8}>
                  <LinkOutlined style={{ color: p.token.colorPrimary }} />
                  {p.t("admin.payments.payLinkModalTitle")}
                </Flex>
              }
              open={Boolean(p.paymentLinkModal)}
              onCancel={() => { p.setPaymentLinkModal(null); setCopied(false); }}
              footer={
                <Flex justify="flex-end" gap={8}>
                  <Button onClick={() => { p.setPaymentLinkModal(null); setCopied(false); }}>
                    {p.t("common.cancel")}
                  </Button>
                  <Button
                    type="primary"
                    icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={handleCopy}
                  >
                    {copied ? p.t("admin.payments.payLinkCopied") : p.t("admin.payments.payLinkCopy")}
                  </Button>
                </Flex>
              }
            >
              <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                {p.t("admin.payments.payLinkModalHint")}
              </Typography.Paragraph>
              <Input
                readOnly
                value={p.paymentLinkModal ?? ""}
                addonAfter={
                  <a href={p.paymentLinkModal ?? "#"} target="_blank" rel="noopener noreferrer">
                    <LinkOutlined />
                  </a>
                }
                style={{ fontFamily: "monospace", fontSize: 13 }}
              />
            </Modal>

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
      </Flex>
    </Spin>
  );
}
