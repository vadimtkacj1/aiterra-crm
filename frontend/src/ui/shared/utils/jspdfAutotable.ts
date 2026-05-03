import type { jsPDF } from "jspdf";

/**
 * jspdf-autotable mutates the jsPDF instance with `lastAutoTable` after each `autoTable()` call.
 * It is not declared on the stock jsPDF type, so we narrow it explicitly.
 */
export type JsPdfWithLastAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

/** Vertical position (mm) immediately below the last autoTable, or `fallbackY` if metadata is missing. */
export function getAutoTableFinalY(doc: jsPDF, fallbackY: number): number {
  const extended = doc as JsPdfWithLastAutoTable;
  const y = extended.lastAutoTable?.finalY;
  return typeof y === "number" && !Number.isNaN(y) ? y : fallbackY;
}
