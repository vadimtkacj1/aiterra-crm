import { CheckOutlined } from "@ant-design/icons";
import { theme } from "antd";

export function FeatureList({ items }: { items: string[] }) {
  const { token } = theme.useToken();
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item) => (
        <li key={item} style={{ padding: "4px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span>{item}</span>
          <CheckOutlined style={{ color: token.colorSuccess, marginTop: 3 }} />
        </li>
      ))}
    </ul>
  );
}
