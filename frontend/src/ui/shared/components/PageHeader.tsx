import { theme, Typography } from "antd";
import type { ReactNode } from "react";

export function PageHeader(props: { title: string; subtitle?: string; extra?: ReactNode }) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 16,
        width: "100%",
        paddingBottom: 20,
        borderBottom: `1px solid ${token.colorSplit}`,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <Typography.Title level={3} style={{ margin: 0, lineHeight: 1.25, fontWeight: 600 }}>
          {props.title}
        </Typography.Title>
        {props.subtitle ? (
          <Typography.Paragraph
            type="secondary"
            style={{
              marginBottom: 0,
              marginTop: 8,
              fontSize: 14,
              lineHeight: 1.55,
              maxWidth: 720,
            }}
          >
            {props.subtitle}
          </Typography.Paragraph>
        ) : null}
      </div>
      {props.extra ? <div style={{ flexShrink: 0, paddingTop: 2 }}>{props.extra}</div> : null}
    </div>
  );
}

