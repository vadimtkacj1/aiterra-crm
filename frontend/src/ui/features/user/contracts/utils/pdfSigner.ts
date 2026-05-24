import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

export interface SignatureStampOptions {
  pdfBase64: string;
  signerName: string;
  signerPosition?: string;
  signaturePngBase64: string;
  contractTitle?: string;
  signedAt?: string;
}

/** Draws signature block onto the bottom of the last page of the PDF. */
export async function stampSignaturePdf(opts: SignatureStampOptions): Promise<string> {
  const { pdfBase64, signerName, signerPosition, signaturePngBase64, signedAt } = opts;

  const pdfBytes = base64ToBytes(pdfBase64);
  const doc = await PDFDocument.load(pdfBytes);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const sigBytes = base64ToBytes(signaturePngBase64);
  const sigImage = await doc.embedPng(sigBytes);

  // Draw on the last existing page — no new page added
  const pages = doc.getPages();
  const page = pages[pages.length - 1];

  drawSignatureBlock(page, {
    font,
    fontBold,
    signerName,
    signerPosition,
    signedAt: signedAt ?? new Date().toISOString(),
    sigImage,
    sigImageDims: sigImage.scale(1),
  });

  const outBytes = await doc.save();
  return bytesToBase64(outBytes);
}

// ─── drawing ─────────────────────────────────────────────────────────────────

interface BlockOptions {
  font: PDFFont;
  fontBold: PDFFont;
  signerName: string;
  signerPosition?: string;
  signedAt: string;
  sigImage: ReturnType<PDFDocument["embedPng"]> extends Promise<infer T> ? T : never;
  sigImageDims: { width: number; height: number };
}

// Draws a compact two-column signature block at the bottom of the page.
// Left col: name + signature image. Right col: date.
// Block occupies roughly y=80..220 from page bottom (above any footer area).
function drawSignatureBlock(page: PDFPage, opts: BlockOptions) {
  const { font, fontBold, signerName, signerPosition, signedAt, sigImage, sigImageDims } = opts;
  const { width } = page.getSize();

  const marginL = 40;
  const colRight = 320;
  const gray = rgb(0.45, 0.48, 0.52);
  const black = rgb(0.08, 0.08, 0.1);
  const divColor = rgb(0.78, 0.82, 0.88);

  // ── Divider line ──────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: marginL, y: 218 },
    end: { x: width - marginL, y: 218 },
    thickness: 0.6,
    color: divColor,
  });

  // ── Left column: name & position ─────────────────────────────────────────
  page.drawText("SIGNED BY", { x: marginL, y: 203, size: 7, font, color: gray });
  page.drawText(signerName, { x: marginL, y: 189, size: 11, font: fontBold, color: black, maxWidth: 260 });

  let sigTop = 172;
  if (signerPosition) {
    page.drawText(signerPosition, { x: marginL, y: 174, size: 9, font, color: gray, maxWidth: 260 });
    sigTop = 158;
  }

  // ── Right column: date ───────────────────────────────────────────────────
  page.drawText("DATE SIGNED", { x: colRight, y: 203, size: 7, font, color: gray });
  page.drawText(formatDate(signedAt), { x: colRight, y: 189, size: 9, font, color: black, maxWidth: 220 });

  // ── Signature image ───────────────────────────────────────────────────────
  page.drawText("SIGNATURE", { x: marginL, y: sigTop, size: 7, font, color: gray });
  sigTop -= 4;

  const maxW = 200;
  const maxH = 65;
  const scale = Math.min(maxW / sigImageDims.width, maxH / sigImageDims.height, 1);
  const sigW = sigImageDims.width * scale;
  const sigH = sigImageDims.height * scale;

  page.drawRectangle({
    x: marginL,
    y: sigTop - sigH - 4,
    width: sigW + 8,
    height: sigH + 8,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.82, 0.85, 0.9),
    borderWidth: 0.8,
  });

  page.drawImage(sigImage, {
    x: marginL + 4,
    y: sigTop - sigH,
    width: sigW,
    height: sigH,
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
