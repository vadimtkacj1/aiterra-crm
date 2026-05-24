import { Button, Tooltip } from "antd";
import type { ButtonProps } from "antd";
import type { ReactNode } from "react";

interface Props extends Omit<ButtonProps, "type" | "size"> {
  tooltip: string;
  icon: ReactNode;
}

export function TableActionButton({ tooltip, icon, ...rest }: Props) {
  return (
    <Tooltip title={tooltip}>
      <Button type="text" size="small" icon={icon} {...rest} />
    </Tooltip>
  );
}
