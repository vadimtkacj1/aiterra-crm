import {
  Table,
  Input,
  Button,
  Space,
  Dropdown,
  Alert,
  Typography,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { TableProps, ColumnsType } from "antd/es/table";
import { useState, useMemo } from "react";
import type { TFunction } from "i18next";
import { exportToCSV, exportToExcel, exportToJSON } from "../utils/exportUtils";
import { ResponsiveCardView, useMobileView } from "./ResponsiveCardView";
import type { CardViewItem } from "./ResponsiveCardView";

interface EnhancedTableProps<T> extends Omit<TableProps<T>, "columns"> {
  columns: ColumnsType<T>;
  t: TFunction;
  searchable?: boolean;
  searchPlaceholder?: string;
  exportable?: boolean;
  exportFilename?: string;
  bulkActions?: Array<{
    label: string;
    onClick: (selectedKeys: React.Key[], selectedRows: T[]) => void;
    danger?: boolean;
  }>;
  filters?: React.ReactNode;
  mobileCardView?: (item: T) => CardViewItem;
  onSearch?: (value: string) => void;
}

export function EnhancedTable<T extends { id?: string | number; [key: string]: any }>({
  columns,
  dataSource = [],
  t,
  searchable = true,
  searchPlaceholder,
  exportable = true,
  exportFilename = "export",
  bulkActions,
  filters,
  mobileCardView,
  onSearch,
  ...tableProps
}: EnhancedTableProps<T>) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const isMobile = useMobileView();

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return dataSource;

    const searchLower = searchValue.toLowerCase();
    return dataSource.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchLower)
      )
    );
  }, [dataSource, searchValue]);

  const selectedRows = useMemo(() => {
    return filteredData.filter((item) =>
      selectedRowKeys.includes(item.id || item.key)
    );
  }, [filteredData, selectedRowKeys]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    onSearch?.("");
  };

  const handleExport = (format: "csv" | "excel" | "json") => {
    const dataToExport = [...(selectedRowKeys.length > 0 ? selectedRows : filteredData)];

    switch (format) {
      case "csv":
        exportToCSV(dataToExport, `${exportFilename}.csv`);
        break;
      case "excel":
        exportToExcel(dataToExport, `${exportFilename}.xlsx`);
        break;
      case "json":
        exportToJSON(dataToExport, `${exportFilename}.json`);
        break;
    }
  };

  const rowSelection = bulkActions
    ? {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
      }
    : undefined;

  // Mobile card view
  if (isMobile && mobileCardView) {
    const cardItems = filteredData.map(mobileCardView);
    return (
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        {searchable && (
          <Input.Search
            placeholder={searchPlaceholder || t("common.search")}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            onClear={handleClearSearch}
          />
        )}
        {filters}
        <ResponsiveCardView
          items={cardItems}
          loading={typeof tableProps.loading === "boolean" ? tableProps.loading : !!tableProps.loading}
          emptyText={t("common.noData")}
        />
      </Space>
    );
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      {/* Search and Actions Bar */}
      {(searchable || exportable || filters) && (
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            {searchable && (
              <Input.Search
                placeholder={searchPlaceholder || t("common.search")}
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                onClear={handleClearSearch}
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
              />
            )}
            {filters}
          </Space>

          {exportable && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: "csv",
                    label: t("export.csv"),
                    onClick: () => handleExport("csv"),
                  },
                  {
                    key: "excel",
                    label: t("export.excel"),
                    onClick: () => handleExport("excel"),
                  },
                  {
                    key: "json",
                    label: t("export.json"),
                    onClick: () => handleExport("json"),
                  },
                ],
              }}
            >
              <Button icon={<DownloadOutlined />}>
                {t("common.export")}
              </Button>
            </Dropdown>
          )}
        </Space>
      )}

      {/* Bulk Actions Bar */}
      {bulkActions && selectedRowKeys.length > 0 && (
        <Alert
          message={
            <Space>
              <Typography.Text>
                {t("table.selectedCount", { count: selectedRowKeys.length })}
              </Typography.Text>
              {bulkActions.map((action, index) => (
                <Button
                  key={index}
                  size="small"
                  danger={action.danger}
                  onClick={() => action.onClick(selectedRowKeys, selectedRows)}
                >
                  {action.label}
                </Button>
              ))}
              <Button
                size="small"
                type="link"
                onClick={() => setSelectedRowKeys([])}
              >
                {t("common.clearSelection")}
              </Button>
            </Space>
          }
          type="info"
          showIcon
        />
      )}

      {/* Table */}
      <Table<T>
        {...tableProps}
        columns={columns}
        dataSource={filteredData}
        rowSelection={rowSelection}
        rowKey={(record) => record.id || record.key || Math.random()}
      />
    </Space>
  );
}
