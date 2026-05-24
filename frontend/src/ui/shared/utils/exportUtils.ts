import type { TFunction } from "i18next";

// CSV Export
export function exportToCSV(data: any[], filename: string, columns?: string[]) {
  if (data.length === 0) return;

  const headers = columns || Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      }).join(",")
    ),
  ].join("\n");

  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
}

// Excel Export (CSV format compatible with Excel)
export function exportToExcel(data: any[], filename: string, columns?: string[]) {
  exportToCSV(data, filename.replace(/\.xlsx?$/, ".csv"), columns);
}

// JSON Export
export function exportToJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, "application/json;charset=utf-8;");
}

// Helper function to trigger download
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format data for export (flatten nested objects)
export function flattenForExport(data: any[]): any[] {
  return data.map((item) => {
    const flattened: any = {};
    Object.keys(item).forEach((key) => {
      const value = item[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        // Flatten nested objects
        Object.keys(value).forEach((nestedKey) => {
          flattened[`${key}_${nestedKey}`] = value[nestedKey];
        });
      } else if (Array.isArray(value)) {
        // Convert arrays to comma-separated strings
        flattened[key] = value.join(", ");
      } else {
        flattened[key] = value;
      }
    });
    return flattened;
  });
}

// Export with column mapping (translate headers)
export function exportWithMapping(
  data: any[],
  filename: string,
  columnMapping: Record<string, string>,
  t: TFunction
) {
  const mappedData = data.map((row) => {
    const mapped: any = {};
    Object.keys(columnMapping).forEach((key) => {
      const translatedKey = t(columnMapping[key]);
      mapped[translatedKey] = row[key];
    });
    return mapped;
  });

  exportToCSV(mappedData, filename);
}

// Format date for export
export function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

// Format money for export
export function formatMoneyForExport(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}
