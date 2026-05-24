import { CheckOutlined } from "@ant-design/icons";

export function FeatureList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item) => (
        <li key={item} style={{ padding: "4px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span>{item}</span>
          <CheckOutlined style={{ color: "#52c41a", marginTop: 3 }} />
        </li>
      ))}
    </ul>
  );
}
