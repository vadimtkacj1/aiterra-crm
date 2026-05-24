import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: number;
  padding?: number;
}

export function PageContainer({ children, maxWidth = 1200, padding = 24 }: PageContainerProps) {
  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
        padding: `${padding}px`,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}
