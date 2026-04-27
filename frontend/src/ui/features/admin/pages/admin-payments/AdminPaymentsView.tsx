import { CheckOutlined, CopyOutlined, FolderOpenOutlined, LinkOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Flex, Form, Input, Modal, Spin, Typography } from "antd";
import { useState } from "react";
import { AdminPaymentsLibraryDrawer } from "./AdminPaymentsLibraryDrawer";
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
        <div
          style={{
            borderRadius: p.shellRadius,
            padding: "18px 20px",
            background: p.token.colorBgContainer,
            border: `1px solid ${p.token.colorBorderSecondary}`,
            boxShadow: p.shellShadow,
          }}
        >
          <Flex gap={18} align="flex-start" wrap="wrap" justify="space-between">
            <Flex gap={18} align="flex-start" wrap="wrap" style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: p.token.colorBgContainer,
                  border: `1px solid ${p.token.colorPrimaryBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: p.token.colorPrimary,
                  flexShrink: 0,
                }}
              >
                <ShoppingOutlined style={{ fontSize: 22 }} />
              </div>
              <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                <Typography.Title level={3} style={{ margin: "0 0 6px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {p.t("admin.payments.title")}
                </Typography.Title>
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginBottom: 0, fontSize: 13, lineHeight: 1.5, maxWidth: 720 }}
                >
                  {p.t("admin.payments.introShort")}
                </Typography.Paragraph>
              </div>
            </Flex>
            <Button
              type="default"
              icon={<FolderOpenOutlined />}
              onClick={() => p.setLibraryOpen(true)}
              loading={p.loadingUsers}
              style={{ flexShrink: 0, alignSelf: "flex-start", marginTop: 2 }}
            >
              {p.t("admin.payments.libraryDrawerTrigger")}
            </Button>
          </Flex>
        </div>

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
                chargeTypeW={p.chargeTypeW}
                useBreakdownW={Boolean(p.useBreakdownW)}
                currencyW={p.currencyW}
                linesRunningTotal={p.linesRunningTotal}
                canSaveTemplate={p.canSaveTemplate}
                openSaveTemplateModal={p.openSaveTemplateModal}
                presetBundle={p.presetBundle}
                presetServerOnly={p.presetServerOnly}
              />

              <AdminPaymentsLibraryDrawer
                t={p.t}
                open={p.libraryOpen}
                onClose={() => p.setLibraryOpen(false)}
                afterOpenChange={(open) => {
                  if (open) void p.loadAllBillingHistory();
                }}
                admin={p.services.admin}
                message={p.message}
                form={p.form}
                userMeta={p.userMeta}
                allBillingRows={p.allBillingRows}
                allBillingLoading={p.allBillingLoading}
                revokingId={p.revokingId}
                deletingId={p.deletingId}
                setRevokingId={p.setRevokingId}
                setDeletingId={p.setDeletingId}
                setClientLiveBilling={p.setClientLiveBilling}
                loadAllBillingHistory={p.loadAllBillingHistory}
                downloadRowPdf={p.downloadRowPdf}
                invoiceTemplates={p.invoiceTemplates}
                templatesLoading={p.templatesLoading}
                billBlockedForAdmin={p.billBlockedForAdmin}
                loadTemplateIntoForm={p.loadTemplateIntoForm}
                applyTemplateToSelectedClient={p.applyTemplateToSelectedClient}
                loadInvoiceTemplates={p.loadInvoiceTemplates}
              />

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
