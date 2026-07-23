import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  icon?: ReactNode;
  /** Optional — omit for toolbar-style cards where the page header already names the list. */
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  loading?: boolean;
};

export function ListCard({ icon, title, extra, children, loading }: Props) {
  const hasHeader = title != null || extra != null;

  return (
    <Card>
      {hasHeader && (
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-6 py-3">
          <div className="flex min-w-0 items-center gap-2 font-semibold text-foreground [&_svg]:size-4">
            {icon}
            {title}
          </div>
          {extra && <div className="shrink-0">{extra}</div>}
        </div>
      )}
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
