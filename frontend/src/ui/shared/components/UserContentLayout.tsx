import type { ReactNode } from "react";

const DEFAULT_MAX = 1200;

export function UserContentLayout({
  children,
  maxWidth = DEFAULT_MAX,
  /** `start` = flush to the logical start (left in LTR); default keeps centered column. */
  align = "center",
}: {
  children: ReactNode;
  /** Content max width in px (narrower e.g. for account picker). */
  maxWidth?: number;
  align?: "center" | "start";
}) {
  return (
    <div
      style={{
        maxWidth,
        width: "100%",
        marginInlineStart: align === "center" ? "auto" : 0,
        marginInlineEnd: align === "center" ? "auto" : "auto",
        paddingBottom: 8,
      }}
    >
      {children}
    </div>
  );
}
