import { GlobalOutlined } from "@ant-design/icons";
import { Select } from "antd";
import { useTranslation } from "react-i18next";
import { defaultLanguage } from "../../../i18n";

const options = [
  { value: "en", labelKey: "common.english" as const },
  { value: "he", labelKey: "common.hebrew" as const },
];

export function LanguageSwitcher(props: { variant?: "default" | "sidebar" }) {
  const { t, i18n } = useTranslation();
  const sidebar = props.variant === "sidebar";

  return (
    <Select
      value={i18n.language.startsWith("he") ? "he" : "en"}
      style={sidebar ? { width: "100%", minWidth: 0 } : { minWidth: 130 }}
      variant={sidebar ? "filled" : "outlined"}
      suffixIcon={<GlobalOutlined />}
      aria-label={t("common.language")}
      options={options.map((o) => ({
        value: o.value,
        label: t(o.labelKey),
      }))}
      onChange={(lng: string) => void i18n.changeLanguage(lng ?? defaultLanguage)}
    />
  );
}

