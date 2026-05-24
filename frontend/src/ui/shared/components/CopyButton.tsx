import { Button, Tooltip, message } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { useState } from "react";
import type { TFunction } from "i18next";

interface CopyButtonProps {
  text: string;
  t: TFunction;
  tooltip?: string;
  successMessage?: string;
  size?: "small" | "middle" | "large";
  type?: "primary" | "default" | "dashed" | "link" | "text";
}

export function CopyButton({
  text,
  t,
  tooltip,
  successMessage,
  size = "small",
  type = "text",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      message.success(successMessage || t("common.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      message.error(t("common.copyFailed"));
    }
  };

  return (
    <Tooltip title={tooltip || t("common.copyToClipboard")}>
      <Button
        type={type}
        size={size}
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        onClick={handleCopy}
      />
    </Tooltip>
  );
}
