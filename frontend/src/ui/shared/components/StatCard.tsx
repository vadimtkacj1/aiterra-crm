import type { ReactNode } from "react";
import { Skeleton, theme } from "antd";
import { palette, tokens } from "@/styles/designSystem";

export type StatAccent = "primary" | "green" | "amber" | "red" | "cyan" | "blue" | "teal" | "violet";

/**
 * Only truly semantic statuses tint the icon (quietly). Everything else stays
 * muted — violet/brand color is reserved for interactive states, not ambient
 * tile decoration.
 */
const SEMANTIC_ICON_COLOR: Partial<Record<StatAccent, string>> = {
  green: palette.green.main,
  amber: palette.amber.main,
  red: palette.red.main,
};

interface StatCardProps {
  /** Small caps label above the value. */
  title: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  accent?: StatAccent;
  /** Supporting line under the value (context, or a delta). */
  hint?: ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

/**
 * KPI tile: caps-XS muted label, large tabular number, optional context line,
 * and a subtle muted icon at the tile's end. White surface, hairline border,
 * card shadow. RTL-safe — uses logical flow only.
 */
export function StatCard({ title, value, icon, accent = "primary", hint, loading, onClick }: StatCardProps) {
  const { token } = theme.useToken();
  const iconColor = SEMANTIC_ICON_COLOR[accent] ?? tokens.colors.textTertiary;

  return (
    <div
      className={onClick ? "ds-card-interactive" : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        background: token.colorBgContainer,
        borderRadius: tokens.radius.xl,
        boxShadow: tokens.shadow.card,
        border: `1px solid ${tokens.colors.borderSubtle}`,
        padding: "16px 18px",
        minHeight: 96,
        height: "100%",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: tokens.fontSize.xs,
            fontWeight: tokens.fontWeight.medium,
            color: tokens.colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>

        {loading ? (
          <Skeleton.Button active size="small" style={{ width: 72, height: 28, marginTop: 8 }} />
        ) : (
          <div
            style={{
              fontSize: 30,
              fontWeight: tokens.fontWeight.bold,
              lineHeight: 1.15,
              color: tokens.colors.textPrimary,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              marginTop: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </div>
        )}

        {hint && !loading ? (
          <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textTertiary, marginTop: 4 }}>{hint}</div>
        ) : null}
      </div>

      {icon ? (
        <div
          aria-hidden
          style={{
            flexShrink: 0,
            fontSize: 18,
            lineHeight: 1,
            color: iconColor,
            marginBlockStart: 2,
          }}
        >
          {icon}
        </div>
      ) : null}
    </div>
  );
}
