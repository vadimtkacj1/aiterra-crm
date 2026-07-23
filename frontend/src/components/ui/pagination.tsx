import * as React from "react";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Current page (1-based). */
  current: number;
  /** Total number of items. */
  total: number;
  /** Items per page. */
  pageSize: number;
  onChange: (page: number) => void;
  /** Optional total renderer, receives the total and the [start, end] item range. */
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  className?: string;
}

type PageToken = number | "start-ellipsis" | "end-ellipsis";

function buildPages(current: number, pageCount: number): PageToken[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const pages: PageToken[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(pageCount - 1, current + 1);
  if (start > 2) pages.push("start-ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < pageCount - 1) pages.push("end-ellipsis");
  pages.push(pageCount);
  return pages;
}

const pageButtonClass = cn(
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm",
  "transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ current, total, pageSize, onChange, showTotal, className }, ref) => {
    const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
    const page = Math.min(Math.max(1, current), pageCount);
    const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, total);

    const goTo = (p: number) => {
      const next = Math.min(Math.max(1, p), pageCount);
      if (next !== page) onChange(next);
    };

    return (
      <nav
        ref={ref}
        data-slot="pagination"
        className={cn("flex items-center gap-1 text-foreground", className)}
      >
        {showTotal && (
          <span className="me-2 text-sm text-muted-foreground">
            {showTotal(total, [rangeStart, rangeEnd])}
          </span>
        )}
        <button
          type="button"
          className={pageButtonClass}
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
          data-slot="pagination-previous"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        </button>
        {buildPages(page, pageCount).map((token) =>
          typeof token === "number" ? (
            <button
              key={token}
              type="button"
              aria-current={token === page ? "page" : undefined}
              className={cn(
                pageButtonClass,
                token === page && "bg-accent font-medium text-accent-foreground hover:bg-accent",
              )}
              onClick={() => goTo(token)}
            >
              {token}
            </button>
          ) : (
            <span
              key={token}
              aria-hidden="true"
              className="inline-flex h-8 min-w-8 items-center justify-center text-muted-foreground"
            >
              <Ellipsis className="size-4" />
            </span>
          ),
        )}
        <button
          type="button"
          className={pageButtonClass}
          disabled={page >= pageCount}
          onClick={() => goTo(page + 1)}
          data-slot="pagination-next"
        >
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </nav>
    );
  },
);
Pagination.displayName = "Pagination";

export { Pagination };
