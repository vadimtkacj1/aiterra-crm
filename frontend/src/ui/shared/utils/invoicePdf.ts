import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getAutoTableFinalY } from "./jspdfAutotable";

export interface InvoicePdfLineItem {
  code?: string;
  label: string;
  amount: number;
}

export interface InvoicePdfInput {
  invoiceId: string;
  amount: number;
  currency: string;
  status: string;
  description?: string | null;
  chargeType?: string;
  accountId?: string | number;
  customerName?: string;
  lineItems?: InvoicePdfLineItem[] | null;
  createdAt?: string;
  note?: string;
  installmentMonths?: number;
  installmentTotalAmount?: number;
}

function formatMoney(amount: number, currency: string): string {
  const cur = (currency || "ILS").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur.length === 3 ? cur : "ILS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

function safeName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
}

/** jsPDF built-in fonts only support Latin-1. Strip non-Latin chars, keeping ASCII + common punctuation. */
function sanitizeText(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x00-\xFF]/g, "?").trim() || "-";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    paid: "Paid",
    unpaid: "Unpaid",
    pending: "Pending",
    void: "Void",
    open: "Open",
  };
  return map[status.toLowerCase()] ?? status;
}

function chargeTypeLabel(ct: string): string {
  return ct === "monthly" ? "Monthly (recurring)" : "One-time";
}

export function downloadInvoicePdf(input: InvoicePdfInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const dateStr = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const totalText = formatMoney(input.amount, input.currency);
  const items = input.lineItems?.length
    ? input.lineItems
    : [{ label: input.description || "Invoice item", amount: input.amount }];

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(input.invoiceId, pageW - 14, 12, { align: "right" });
  doc.text(dateStr, pageW - 14, 20, { align: "right" });

  // ── Status badge ───────────────────────────────────────────────────────────
  const isPaid = input.status?.toLowerCase() === "paid";
  doc.setFillColor(isPaid ? 34 : 245, isPaid ? 197 : 158, isPaid ? 94 : 11);
  doc.roundedRect(14, 34, 32, 8, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel(input.status).toUpperCase(), 30, 39.5, { align: "center" });

  // ── Info grid (two columns) ────────────────────────────────────────────────
  const infoY = 50;
  const colL = 14;
  const colR = pageW / 2 + 4;

  const infoRows: [string, string][] = [
    ["Customer", sanitizeText(input.customerName || "-")],
    ["Account ID", String(input.accountId ?? "-")],
    ["Charge type", chargeTypeLabel(input.chargeType || "one_time")],
  ];

  if (
    input.installmentMonths != null &&
    input.installmentMonths >= 2 &&
    input.installmentTotalAmount != null
  ) {
    infoRows.push(["Installment plan", `${input.installmentMonths} months`]);
    infoRows.push(["Contract total", formatMoney(input.installmentTotalAmount, input.currency)]);
    infoRows.push(["Per month", totalText]);
  }

  if (input.description) {
    infoRows.push(["Description", sanitizeText(input.description)]);
  }

  let infoMaxY = infoY;
  infoRows.forEach(([label, value], i) => {
    const x = i % 2 === 0 ? colL : colR;
    const y = infoY + Math.floor(i / 2) * 14;
    infoMaxY = Math.max(infoMaxY, y + 10);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x, y);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(value, x, y + 6);
  });

  // ── Divider ────────────────────────────────────────────────────────────────
  const divY = infoMaxY + 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, divY, pageW - 14, divY);

  // ── Line items table ───────────────────────────────────────────────────────
  const tableY = divY + 6;

  autoTable(doc, {
    startY: tableY,
    head: [["Item", "Code", "Amount"]],
    body: items.map((li) => [
      sanitizeText(li.label),
      li.code ? sanitizeText(li.code) : "-",
      formatMoney(li.amount, input.currency),
    ]),
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [100, 116, 139],
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [15, 23, 42],
      cellPadding: { top: 7, bottom: 7, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 35 },
      2: { cellWidth: 45, halign: "right" },
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
    margin: { left: 14, right: 14 },
  });

  // ── Total box ──────────────────────────────────────────────────────────────
  const afterTableY = getAutoTableFinalY(doc, tableY + 20) + 6;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(pageW - 14 - 75, afterTableY, 75, 16, 3, 3, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("TOTAL", pageW - 14 - 75 + 10, afterTableY + 6.5);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(totalText, pageW - 14 - 6, afterTableY + 10, { align: "right" });

  // ── Note / footer ──────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();

  if (input.note) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(`Note: ${sanitizeText(input.note)}`, 14, pageH - 14);
  }

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Generated automatically", pageW - 14, pageH - 14, { align: "right" });

  const suffix = safeName(input.invoiceId || `invoice_${Date.now()}`);
  doc.save(`invoice_${suffix}.pdf`);
}
