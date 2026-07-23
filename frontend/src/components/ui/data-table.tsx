/* DataTable — antd <Table> compat on a styled plain table.
   Supports the subset the app actually uses: columns[{title,dataIndex,key,render,
   width,align,onCell,responsive}], dataSource, rowKey, loading, client-side
   pagination, rowSelection (checkboxes), expandable rows, scroll.x, size.
   Migrated call sites keep their column definitions nearly verbatim. */
import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";

type Key = string | number;
type Breakpoint = "sm" | "md" | "lg" | "xl";

/* Hide-below-breakpoint helpers (RTL-safe, pure CSS) */
const RESPONSIVE_CELL: Record<Breakpoint, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export interface DataTableColumn<T> {
  title?: React.ReactNode;
  dataIndex?: keyof T | string;
  key?: string;
  width?: number | string;
  align?: "start" | "end" | "center" | "left" | "right";
  responsive?: Breakpoint[];
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  onCell?: (record: T) => { style?: React.CSSProperties; className?: string };
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  dataSource: T[];
  rowKey: keyof T | ((record: T) => Key);
  loading?: boolean;
  size?: "middle" | "small";
  locale?: { emptyText?: React.ReactNode };
  pagination?: false | {
    pageSize?: number;
    showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  };
  rowSelection?: {
    selectedRowKeys: Key[];
    onChange: (keys: Key[]) => void;
  };
  expandable?: {
    expandedRowRender: (record: T) => React.ReactNode;
    rowExpandable?: (record: T) => boolean;
    onExpand?: (expanded: boolean, record: T) => void;
  };
  scroll?: { x?: number | string };
  className?: string;
}

function getKey<T>(record: T, rowKey: DataTableProps<T>["rowKey"], index: number): Key {
  if (typeof rowKey === "function") return rowKey(record);
  const v = (record as Record<string, unknown>)[rowKey as string];
  return (v as Key) ?? index;
}

function alignClass(align?: DataTableColumn<never>["align"]): string {
  switch (align) {
    case "center": return "text-center";
    case "end": case "right": return "text-end";
    default: return "text-start";
  }
}

export function DataTable<T>({
  columns, dataSource, rowKey, loading, size = "middle", locale,
  pagination = {}, rowSelection, expandable, scroll, className,
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(1);
  const [expandedKeys, setExpandedKeys] = React.useState<Set<Key>>(new Set());
  const pageSize = pagination === false ? dataSource.length || 1 : (pagination.pageSize ?? 10);

  // Clamp page when data shrinks (e.g. after filtering)
  const totalPages = Math.max(1, Math.ceil(dataSource.length / pageSize));
  const current = Math.min(page, totalPages);
  const rows = pagination === false ? dataSource : dataSource.slice((current - 1) * pageSize, current * pageSize);

  const cellPad = size === "small" ? "px-3 py-2" : "px-4 py-3";
  const allKeys = rows.map((r, i) => getKey(r, rowKey, i));
  const selected = rowSelection ? new Set(rowSelection.selectedRowKeys) : null;
  const allSelected = Boolean(selected && allKeys.length > 0 && allKeys.every((k) => selected.has(k)));

  const toggleAll = () => {
    if (!rowSelection) return;
    if (allSelected) {
      rowSelection.onChange(rowSelection.selectedRowKeys.filter((k) => !allKeys.includes(k)));
    } else {
      rowSelection.onChange([...new Set([...rowSelection.selectedRowKeys, ...allKeys])]);
    }
  };

  const toggleExpand = (key: Key, record: T) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      const expanding = !next.has(key);
      if (expanding) next.add(key); else next.delete(key);
      expandable?.onExpand?.(expanding, record);
      return next;
    });
  };

  const colCount =
    columns.length + (rowSelection ? 1 : 0) + (expandable ? 1 : 0);

  return (
    <div className={cn("relative", className)}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <Spinner />
        </div>
      )}
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-sm"
          style={scroll?.x ? { minWidth: scroll.x } : undefined}
        >
          <thead>
            <tr className="border-b border-border bg-muted/60">
              {rowSelection && (
                <th className={cn(cellPad, "w-10")}>
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="select all" />
                </th>
              )}
              {expandable && <th className={cn(cellPad, "w-8")} />}
              {columns.map((c, i) => (
                <th
                  key={c.key ?? String(c.dataIndex ?? i)}
                  className={cn(
                    cellPad, alignClass(c.align),
                    "text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                    c.responsive?.length ? RESPONSIVE_CELL[c.responsive[0]] : undefined,
                  )}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-muted-foreground">
                  {locale?.emptyText ?? "—"}
                </td>
              </tr>
            ) : (
              rows.map((record, ri) => {
                const key = getKey(record, rowKey, ri);
                const canExpand = expandable ? (expandable.rowExpandable?.(record) ?? true) : false;
                const isExpanded = expandedKeys.has(key);
                return (
                  <React.Fragment key={key}>
                    <tr className="border-b border-border transition-colors hover:bg-muted/50">
                      {rowSelection && (
                        <td className={cellPad}>
                          <Checkbox
                            checked={Boolean(selected?.has(key))}
                            onCheckedChange={() => {
                              const has = selected?.has(key);
                              rowSelection.onChange(
                                has
                                  ? rowSelection.selectedRowKeys.filter((k) => k !== key)
                                  : [...rowSelection.selectedRowKeys, key],
                              );
                            }}
                            aria-label="select row"
                          />
                        </td>
                      )}
                      {expandable && (
                        <td className={cn(cellPad, "w-8")}>
                          {canExpand && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(key, record)}
                              aria-expanded={isExpanded}
                              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            >
                              {isExpanded
                                ? <ChevronDown className="size-3.5" />
                                : <ChevronRight className="size-3.5 rtl:rotate-180" />}
                            </button>
                          )}
                        </td>
                      )}
                      {columns.map((c, ci) => {
                        const raw = c.dataIndex != null
                          ? (record as Record<string, unknown>)[c.dataIndex as string]
                          : undefined;
                        const cell = c.onCell?.(record);
                        return (
                          <td
                            key={c.key ?? String(c.dataIndex ?? ci)}
                            className={cn(
                              cellPad, alignClass(c.align),
                              c.responsive?.length ? RESPONSIVE_CELL[c.responsive[0]] : undefined,
                              cell?.className,
                            )}
                            style={cell?.style}
                          >
                            {c.render ? c.render(raw, record, ri) : (raw as React.ReactNode)}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border bg-muted/30">
                        <td colSpan={colCount} className="px-4 py-3">
                          {expandable!.expandedRowRender(record)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination !== false && dataSource.length > pageSize && (
        <div className="flex items-center justify-end gap-3 pt-3">
          {pagination.showTotal && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {pagination.showTotal(dataSource.length, [
                (current - 1) * pageSize + 1,
                Math.min(current * pageSize, dataSource.length),
              ])}
            </span>
          )}
          <Pagination
            current={current}
            total={dataSource.length}
            pageSize={pageSize}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
