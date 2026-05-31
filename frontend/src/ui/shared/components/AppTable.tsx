import { Grid, Table } from "antd";
import type { TableProps } from "antd";

/**
 * Drop-in replacement for Ant Design Table with project-wide defaults.
 * Callers can override any prop — defaults are applied first, then spread.
 */
export function AppTable<T extends object>({
  size = "small",
  pagination,
  rowKey = "id",
  scroll,
  ...rest
}: TableProps<T>) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const resolvedPagination =
    pagination === false
      ? false
      : {
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total: number, range: [number, number]) =>
            `${range[0]}-${range[1]} / ${total}`,
          simple: isMobile,
          ...pagination,
        };

  return (
    <Table<T>
      size={size}
      pagination={resolvedPagination}
      rowKey={rowKey}
      scroll={scroll ?? { x: "max-content" }}
      {...rest}
    />
  );
}
