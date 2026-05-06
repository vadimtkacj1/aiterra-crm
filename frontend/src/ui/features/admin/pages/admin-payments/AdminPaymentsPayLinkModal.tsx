import { CheckOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Flex, Input, Modal, Typography } from "antd";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction;
  url: string | null;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
};

export function AdminPaymentsPayLinkModal(_props: Props) {
  return null; // Payment link modal disabled per request
}
