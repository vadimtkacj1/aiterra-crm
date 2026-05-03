import { jsPDF } from "jspdf";

export interface CheckoutContractPdfInput {
  title: string;
  paymentHeading: string;
  summaryLine: string;
  amountLine: string;
  lines?: { label: string; amount: string }[];
  englishClauses: string[];
  footerNote: string;
}

/** Compact English PDF for on-screen preview (numbers + short clauses; UTF-8 Latin only). */
export function buildCheckoutContractPdfBlob(input: CheckoutContractPdfInput): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const textW = pageW - margin * 2;
  let y = 18;

  doc.setFontSize(15);
  doc.text(input.title, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(input.paymentHeading, margin, y);
  y += 7;
  doc.setTextColor(0);
  doc.text(input.summaryLine, margin, y);
  y += 6;
  doc.text(input.amountLine, margin, y);
  y += 8;

  if (input.lines?.length) {
    doc.setFontSize(9);
    doc.setTextColor(90);
    for (const row of input.lines) {
      const line = `${row.label}  ${row.amount}`;
      const wrapped = doc.splitTextToSize(line, textW);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.5 + 1;
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
    }
    doc.setTextColor(0);
    y += 6;
  }

  doc.setFontSize(10);
  for (const clause of input.englishClauses) {
    const wrapped = doc.splitTextToSize(clause, textW);
    if (y + wrapped.length * 4.8 > 285) {
      doc.addPage();
      y = 18;
    }
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.8 + 3;
  }

  doc.setFontSize(8);
  doc.setTextColor(120);
  const foot = doc.splitTextToSize(input.footerNote, textW);
  if (y + foot.length * 4 > 285) {
    doc.addPage();
    y = 18;
  }
  doc.text(foot, margin, y + 6);

  return doc.output("blob");
}
