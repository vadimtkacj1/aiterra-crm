import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

export function downloadInvoicePdf(input: InvoicePdfInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const createdAt = input.createdAt ?? new Date().toISOString();
  const totalText = formatMoney(input.amount, input.currency);
  const items = input.lineItems?.length
    ? input.lineItems
    : [{ label: input.description || "Invoice item", amount: input.amount }];

  doc.setFontSize(18);
  doc.text("Invoice", 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Generated: ${new Date(createdAt).toLocaleString()}`, 14, 24);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 30,
    head: [["Field", "Value"]],
    body: [
      ["Invoice ID", input.invoiceId],
      ["Status", input.status],
      ["Charge type", input.chargeType || "one_time"],
      ["Account ID", String(input.accountId ?? "—")],
      ["Customer", input.customerName || "—"],
      ["Description", input.description || "—"],
      ["Total", totalText],
    ],
    theme: "grid",
    headStyles: { fillColor: [31, 41, 55], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 135 } },
  });

  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Item", "Code", "Amount"]],
    body: items.map((li) => [li.label, li.code || "—", formatMoney(li.amount, input.currency)]),
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 30 }, 2: { cellWidth: 50 } },
  });

  if (input.note) {
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(`Note: ${input.note}`, 14, doc.internal.pageSize.getHeight() - 10);
  }

  const suffix = safeName(input.invoiceId || `invoice_${Date.now()}`);
  doc.save(`invoice_${suffix}.pdf`);
}
