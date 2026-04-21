import { Flex } from "antd";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { PageHeader } from "../../../shared/components/PageHeader";

export function AdminLayout() {
  const { t } = useTranslation();

  return (
    <Flex vertical gap="large">
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
      <Outlet />
    </Flex>
  );
}
