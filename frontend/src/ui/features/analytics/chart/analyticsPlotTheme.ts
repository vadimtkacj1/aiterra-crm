import { theme } from "antd";

/** Distinct series colors from the active Ant Design theme. */
export function usePlotPalette(): string[] {
  const { token } = theme.useToken();
  return [
    token.colorPrimary,
    token.colorSuccess,
    token.colorWarning,
    token.colorError,
    "#722ed1",
    "#13c2c2",
    "#eb2f96",
    "#2f54eb",
    "#ff7a45",
    "#36cfc9",
  ];
}

export const chartLegendStyle = { fontSize: 12 };
export const chartAxisLabelStyle = { fontSize: 11, fillOpacity: 0.75 };
