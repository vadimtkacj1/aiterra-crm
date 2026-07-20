import type { ReactNode } from "react";
import { Skeleton, theme } from "antd";
import { palette, tokens } from "@/styles/designSystem";

export type StatAccent = "primary" | "green" | "amber" | "red" | "cyan" | "blue" | "teal" | "violet";

const ACCENTS: Record<StatAccent, { fg: string; bg: string }> = {
  primary: { fg: tokens.colors.primary, bg: tokens.colors.primarySurface },
  green: { fg: palette.green.main, bg: palette.green.surface },
  amber: { fg: palette.amber.main, bg: palette.amber.surface },
  red: { fg: palette.red.main, bg: palette.red.surface },
  cyan: { fg: palette.cyan.main, bg: palette.cyan.surface },
  blue: { fg: palette.blue.main, bg: palette.blue.surface },
  teal: { fg: palette.teal.main, bg: palette.teal.surface },
  violet: { fg: palette.violet2.main, bg: palette.violet2.surface },
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
 * Engineered "control-panel" KPI tile: accent icon square, large tabular number,
 * compact caps label. Layered card surface with a hairline ring; lifts on hover
 * when interactive. RTL-safe — uses logical flow only.
 */
export function StatCard({ title, value, icon, accent = "primary", hint, loading, onClick }: StatCardProps) {
  const { token } = theme.useToken();
  const a = ACCENTS[accent];

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
        padding: "16px 18px",
        minHeight: 92,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      {icon ? (
        <div
          aria-hidden
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: tokens.radius.lg,
            background: a.bg,
            color: a.fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          {icon}
        </div>
      ) : null}

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
          <Skeleton.Button active size="small" style={{ width: 72, height: 26, marginTop: 6 }} />
        ) : (
          <div
            style={{
              fontSize: 27,
              fontWeight: tokens.fontWeight.bold,
              lineHeight: 1.15,
              color: tokens.colors.textPrimary,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </div>
        )}

        {hint && !loading ? (
          <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textTertiary, marginTop: 2 }}>{hint}</div>
        ) : null}
      </div>
    </div>
  );
}
