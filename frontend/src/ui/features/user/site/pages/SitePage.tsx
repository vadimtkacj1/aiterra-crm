import { GlobalOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Table,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useApp } from "../../../../../app/AppProviders";
import type { SiteConfig, SiteLead } from "../../../../../domain/Site";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../../shared/components/UserContentLayout";

const { Text } = Typography;

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SitePage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();
  const { accountId } = useParams<{ accountId: string }>();
  const messageRef = useRef(message);
  messageRef.current = message;

  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [linksSaving, setLinksSaving] = useState(false);
  const [popupSaving, setPopupSaving] = useState(false);

  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  const [linksForm] = Form.useForm<{ siteUrl: string; gmbUrl: string }>();
  const [popupForm] = Form.useForm<{ popupText: string }>();
  const [popupFileList, setPopupFileList] = useState<UploadFile[]>([]);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await services.site.getConfig(accountId ?? "0");
      setConfig(data);
      linksForm.setFieldsValue({ siteUrl: data.siteUrl ?? "", gmbUrl: data.gmbUrl ?? "" });
      popupForm.setFieldsValue({ popupText: data.popupText ?? "" });
      if (data.popupImageBase64) {
        setPopupFileList([
          {
            uid: "-1",
            name: t("site.popup.currentImage"),
            status: "done",
            url: data.popupImageBase64,
          },
        ]);
      }
    } catch {
      messageRef.current.error(t("site.loadError"));
    } finally {
      setConfigLoading(false);
    }
  }, [services, accountId, linksForm, popupForm, t]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const data = await services.site.listLeads(accountId ?? "0");
      setLeads(data);
    } catch {
      messageRef.current.error(t("site.leads.loadError"));
    } finally {
      setLeadsLoading(false);
    }
  }, [services, accountId, t]);

  useEffect(() => {
    void loadConfig();
    void loadLeads();
  }, [loadConfig, loadLeads]);

  const saveLinks = async () => {
    const values = await linksForm.validateFields();
    setLinksSaving(true);
    try {
      const updated = await services.site.updateConfig(accountId ?? "0", {
        siteUrl: values.siteUrl || null,
        gmbUrl: values.gmbUrl || null,
      });
      setConfig((prev) => (prev ? { ...prev, ...updated } : updated));
      messageRef.current.success(t("site.links.saved"));
    } catch {
      messageRef.current.error(t("site.saveError"));
    } finally {
      setLinksSaving(false);
    }
  };

  const savePopup = async () => {
    const values = await popupForm.validateFields();
    setPopupSaving(true);
    try {
      let imageBase64: string | null = config?.popupImageBase64 ?? null;

      const newFile = popupFileList.find((f) => f.originFileObj);
      if (newFile?.originFileObj) {
        imageBase64 = await toBase64(newFile.originFileObj);
      } else if (popupFileList.length === 0) {
        imageBase64 = null;
      }

      const updated = await services.site.updateConfig(accountId ?? "0", {
        popupText: values.popupText || null,
        popupImageBase64: imageBase64,
      });
      setConfig((prev) => (prev ? { ...prev, ...updated } : updated));
      messageRef.current.success(t("site.popup.saved"));
    } catch {
      messageRef.current.error(t("site.saveError"));
    } finally {
      setPopupSaving(false);
    }
  };

  const leadsColumns: ColumnsType<SiteLead> = [
    { title: t("site.leads.colName"), dataIndex: "name", key: "name" },
    { title: t("site.leads.colPhone"), dataIndex: "phone", key: "phone", render: (v) => v ?? "—" },
    { title: t("site.leads.colEmail"), dataIndex: "email", key: "email", render: (v) => v ?? "—" },
    { title: t("site.leads.colMessage"), dataIndex: "message", key: "message", render: (v) => v ?? "—", ellipsis: true },
    {
      title: t("site.leads.colDate"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleString(),
      width: 180,
    },
  ];

  return (
    <UserContentLayout maxWidth={900} align="start">
      <PageHeader title={t("site.title")} subtitle={t("site.subtitle")} />

      <Row gutter={[0, 24]} style={{ width: "100%" }}>
        {/* Site Links */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <GlobalOutlined />
                {t("site.links.title")}
              </Space>
            }
            loading={configLoading}
          >
            <Form form={linksForm} layout="vertical">
              <Form.Item name="siteUrl" label={t("site.links.siteUrl")}>
                <Input placeholder="https://example.com" />
              </Form.Item>
              <Form.Item name="gmbUrl" label={t("site.links.gmbUrl")}>
                <Input placeholder="https://maps.google.com/..." />
              </Form.Item>
              <Button type="primary" loading={linksSaving} onClick={saveLinks}>
                {t("site.links.save")}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Popup Editor */}
        <Col span={24}>
          <Card title={t("site.popup.title")} loading={configLoading}>
            <Form form={popupForm} layout="vertical">
              <Form.Item label={t("site.popup.imageLabel")}>
                <Upload
                  listType="picture-card"
                  fileList={popupFileList}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setPopupFileList(fileList)}
                  maxCount={1}
                  accept="image/*"
                >
                  {popupFileList.length === 0 && (
                    <div>
                      <div style={{ marginTop: 8 }}>{t("site.popup.uploadBtn")}</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
              <Form.Item name="popupText" label={t("site.popup.textLabel")}>
                <Input.TextArea rows={4} placeholder={t("site.popup.textPlaceholder")} />
              </Form.Item>
              <Button type="primary" loading={popupSaving} onClick={savePopup}>
                {t("site.popup.save")}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Leads Table */}
        <Col span={24}>
          <Card
            title={t("site.leads.title")}
            extra={
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => void loadLeads()}
                loading={leadsLoading}
              >
                {t("common.reload")}
              </Button>
            }
          >
            {leads.length === 0 && !leadsLoading ? (
              <Text type="secondary">{t("site.leads.empty")}</Text>
            ) : (
              <Table<SiteLead>
                dataSource={leads}
                columns={leadsColumns}
                rowKey="id"
                loading={leadsLoading}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
                scroll={{ x: 600 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </UserContentLayout>
  );
}
