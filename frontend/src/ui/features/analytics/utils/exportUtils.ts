import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import type { CampaignSummaryRow, AdCreative } from "../../../../domain/CampaignAnalytics";

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

function safeFilenameBase(raw: string): string {
  const s = String(raw || "").trim() || "report";
  return s.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  orientation: "portrait" | "landscape",
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
  });

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight) {
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
    doc.save(filename);
    return;
  }

  const pxPerMm = canvas.width / pageWidth;
  const pagePxHeight = Math.floor(pageHeight * pxPerMm);
  let renderedPx = 0;
  let page = 0;

  while (renderedPx < canvas.height) {
    const sliceHeight = Math.min(pagePxHeight, canvas.height - renderedPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    const sliceMmHeight = (sliceHeight * imgWidth) / canvas.width;
    if (page > 0) doc.addPage();
    doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, sliceMmHeight, undefined, "FAST");
    renderedPx += sliceHeight;
    page += 1;
  }

  doc.save(filename);
}

function safeCell(v: string | number | undefined | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

// ─── Campaign list exports ────────────────────────────────────────────────────

export function exportCampaignListCsv(rows: CampaignSummaryRow[], currency: string) {
  const headers = [
    "Campaign", "Status", "Objective",
    `Spend (${currency})`, "Leads", "Purchases", "ROAS",
    "Impressions", "Clicks", "CTR %", "Reach",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        safeCell(r.campaignName),
        r.status ?? "",
        (r.objective ?? "").replace(/_/g, " "),
        r.spend.toFixed(2),
        r.leads ?? 0,
        r.purchases ?? 0,
        (r.roas ?? 0).toFixed(2),
        r.impressions,
        r.clicks,
        r.ctr.toFixed(2),
        r.reach ?? 0,
      ].join(","),
    ),
  ];
  downloadBlob(lines.join("\n"), `campaigns_${dateStamp()}.csv`, "text/csv;charset=utf-8;");
}

export function exportCampaignListPdf(
  rows: CampaignSummaryRow[],
  currency: string,
  periodLabel?: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(14);
  doc.text("Campaign Report", 14, 16);

  if (periodLabel) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(periodLabel, 14, 22);
    doc.setTextColor(0);
  }

  const head = [[
    "Campaign", "Status", "Objective",
    `Spend (${currency})`, "Leads", "Purchases", "ROAS",
    "Impressions", "Clicks", "CTR %",
  ]];

  const body = rows.map((r) => [
    r.campaignName,
    r.status ?? "—",
    (r.objective ?? "—").replace(/_/g, " "),
    r.spend.toFixed(2),
    (r.leads ?? 0).toLocaleString(),
    (r.purchases ?? 0).toLocaleString(),
    (r.roas ?? 0).toFixed(2) + "x",
    r.impressions.toLocaleString(),
    r.clicks.toLocaleString(),
    r.ctr.toFixed(2) + "%",
  ]);

  autoTable(doc, {
    startY: periodLabel ? 26 : 20,
    head,
    body,
    headStyles: { fillColor: [24, 144, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 55 },
      2: { cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
  });

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.getHeight() - 6);

  doc.save(`campaigns_${dateStamp()}.pdf`);
}

// ─── Campaign deep-dive exports ───────────────────────────────────────────────

export function exportCampaignDetailCsv(
  campaign: CampaignSummaryRow,
  currency: string,
  ads: AdCreative[],
) {
  const sections: string[] = [];

  // Campaign summary
  sections.push("Campaign Summary");
  sections.push([
    "Name", "Status", "Objective",
    `Spend (${currency})`, "Leads", "Purchases", "ROAS",
    "Impressions", "Clicks", "CTR %", "Reach",
    `CPC (${currency})`, `CPM (${currency})`,
  ].join(","));
  sections.push([
    safeCell(campaign.campaignName),
    campaign.status ?? "",
    (campaign.objective ?? "").replace(/_/g, " "),
    campaign.spend.toFixed(2),
    campaign.leads ?? 0,
    campaign.purchases ?? 0,
    (campaign.roas ?? 0).toFixed(2),
    campaign.impressions,
    campaign.clicks,
    campaign.ctr.toFixed(2),
    campaign.reach ?? 0,
    (campaign.cpc ?? 0).toFixed(4),
    (campaign.cpm ?? 0).toFixed(4),
  ].join(","));

  // Ad breakdown
  if (ads.length) {
    sections.push("");
    sections.push("Ad Creatives");
    const objective = campaign.objective ?? "";
    const obj = objective.toUpperCase();
    let resultCol = "Results";
    if (obj.includes("LEAD")) resultCol = "Leads";
    else if (obj.includes("CONVERS") || obj.includes("PURCHASE")) resultCol = "Purchases";

    sections.push([
      "Ad Name", `Spend (${currency})`, resultCol, "CTR %", "Impressions", "Clicks", `Cost / ${resultCol}`,
    ].join(","));
    for (const ad of ads) {
      const cpr = ad.results > 0 ? (ad.spend / ad.results).toFixed(2) : "—";
      sections.push([
        safeCell(ad.adName),
        ad.spend.toFixed(2),
        ad.results,
        ad.ctr.toFixed(2),
        ad.impressions,
        ad.clicks,
        cpr,
      ].join(","));
    }
  }

  const filename = `${campaign.campaignName.replace(/[^a-z0-9]/gi, "_")}_${dateStamp()}.csv`;
  downloadBlob(sections.join("\n"), filename, "text/csv;charset=utf-8;");
}

export function exportCampaignDetailPdf(
  campaign: CampaignSummaryRow,
  currency: string,
  ads: AdCreative[],
  periodLabel?: string,
) {
  if (containsHebrew(campaign.campaignName)) {
    const metaLine = [campaign.status, campaign.objective?.replace(/_/g, " "), periodLabel]
      .filter(Boolean)
      .join(" · ");

    const obj = (campaign.objective ?? "").toUpperCase();
    let resultCol = "Results";
    if (obj.includes("LEAD")) resultCol = "Leads";
    else if (obj.includes("CONVERS") || obj.includes("PURCHASE")) resultCol = "Purchases";

    const wrap = document.createElement("div");
    wrap.dir = "rtl";
    wrap.style.position = "fixed";
    wrap.style.left = "-10000px";
    wrap.style.top = "0";
    wrap.style.width = "1120px";
    wrap.style.padding = "18px";
    wrap.style.background = "#ffffff";
    wrap.style.color = "#111827";
    wrap.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

    const money = (v: number) => `${v.toFixed(2)} ${currency}`;
    const kpiBox = (label: string, value: string) => `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;min-width:0">
        <div style="font-size:11px;color:#6b7280">${label}</div>
        <div style="font-size:18px;font-weight:700;margin-top:6px">${value}</div>
      </div>
    `;

    const kpis = [
      kpiBox(`Spend (${currency})`, money(campaign.spend)),
      kpiBox("Impressions", campaign.impressions.toLocaleString()),
      kpiBox("Clicks", campaign.clicks.toLocaleString()),
      kpiBox("CTR", `${campaign.ctr.toFixed(2)}%`),
    ];
    if (obj.includes("LEAD") && (campaign.leads ?? 0) > 0) {
      kpis.push(kpiBox("Leads", (campaign.leads ?? 0).toLocaleString()));
      if (campaign.spend > 0) kpis.push(kpiBox("Cost / Lead", (campaign.spend / (campaign.leads ?? 1)).toFixed(2)));
    } else if ((obj.includes("CONVERS") || obj.includes("PURCHASE")) && (campaign.purchases ?? 0) > 0) {
      kpis.push(kpiBox("Purchases", (campaign.purchases ?? 0).toLocaleString()));
      kpis.push(kpiBox("ROAS", `${(campaign.roas ?? 0).toFixed(2)}x`));
    }

    const metricsRow = `
      <tr>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${money(campaign.spend)}</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${(campaign.leads ?? 0).toLocaleString()}</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${(campaign.purchases ?? 0).toLocaleString()}</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${(campaign.roas ?? 0).toFixed(2)}x</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${campaign.impressions.toLocaleString()}</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${campaign.clicks.toLocaleString()}</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${campaign.ctr.toFixed(2)}%</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${(campaign.reach ?? 0).toLocaleString()}</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${(campaign.cpc ?? 0).toFixed(4)}</td>
        <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${(campaign.cpm ?? 0).toFixed(4)}</td>
      </tr>
    `;

    const adsRows = ads
      .map((ad) => {
        const cpr = ad.results > 0 ? (ad.spend / ad.results).toFixed(2) : "—";
        return `
          <tr>
            <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${ad.adName}</td>
            <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${money(ad.spend)}</td>
            <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${ad.results.toLocaleString()}</td>
            <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${ad.ctr.toFixed(2)}%</td>
            <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${ad.impressions.toLocaleString()}</td>
            <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${ad.clicks.toLocaleString()}</td>
            <td style="padding:8px 10px;border-top:1px solid #e5e7eb">${cpr}</td>
          </tr>
        `;
      })
      .join("");

    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div>
          <div style="font-size:20px;font-weight:800;line-height:1.2">${campaign.campaignName}</div>
          <div style="margin-top:6px;font-size:12px;color:#6b7280">${metaLine}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-top:14px">
        ${kpis.join("")}
      </div>

      <div style="margin-top:16px;font-weight:700">Campaign Metrics</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Spend (${currency})</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Leads</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Purchases</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">ROAS</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Impressions</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Clicks</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">CTR %</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Reach</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">CPC</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">CPM</th>
          </tr>
        </thead>
        <tbody>
          ${metricsRow}
        </tbody>
      </table>

      <div style="margin-top:16px;font-weight:700">Ad Creatives</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Ad Name</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Spend (${currency})</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">${resultCol}</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">CTR %</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Impressions</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Clicks</th>
            <th style="text-align:start;padding:8px 10px;border:1px solid #e5e7eb">Cost / ${resultCol}</th>
          </tr>
        </thead>
        <tbody>
          ${adsRows || `<tr><td colspan="7" style="padding:10px;color:#6b7280;border-top:1px solid #e5e7eb">—</td></tr>`}
        </tbody>
      </table>

      <div style="margin-top:10px;font-size:10px;color:#9ca3af;text-align:start">
        Generated ${new Date().toLocaleString()}
      </div>
    `;

    document.body.appendChild(wrap);
    const filename = `${safeFilenameBase(campaign.campaignName)}_${dateStamp()}.pdf`;
    void exportElementToPdf(wrap, filename, "landscape").finally(() => {
      wrap.remove();
    });
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(15);
  doc.text(campaign.campaignName, 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(120);
  const metaLine = [
    campaign.status,
    campaign.objective?.replace(/_/g, " "),
    periodLabel,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(metaLine, 14, 22);
  doc.setTextColor(0);

  // KPI summary bar
  const kpis: [string, string][] = [
    [`Spend (${currency})`, campaign.spend.toFixed(2)],
    ["Impressions", campaign.impressions.toLocaleString()],
    ["Clicks", campaign.clicks.toLocaleString()],
    ["CTR", `${campaign.ctr.toFixed(2)}%`],
  ];
  const obj = (campaign.objective ?? "").toUpperCase();
  if (obj.includes("LEAD") && (campaign.leads ?? 0) > 0) {
    kpis.push(["Leads", (campaign.leads ?? 0).toLocaleString()]);
    if (campaign.spend > 0) kpis.push(["Cost / Lead", (campaign.spend / (campaign.leads ?? 1)).toFixed(2)]);
  } else if ((obj.includes("CONVERS") || obj.includes("PURCHASE")) && (campaign.purchases ?? 0) > 0) {
    kpis.push(["Purchases", (campaign.purchases ?? 0).toLocaleString()]);
    kpis.push(["ROAS", `${(campaign.roas ?? 0).toFixed(2)}x`]);
    if (campaign.spend > 0) kpis.push(["Cost / Purchase", (campaign.spend / (campaign.purchases ?? 1)).toFixed(2)]);
  }

  const kpiY = 28;
  const kpiBoxW = (pageWidth - 28) / kpis.length;
  kpis.forEach(([label, value], i) => {
    const x = 14 + i * kpiBoxW;
    doc.setFillColor(245, 248, 255);
    doc.roundedRect(x, kpiY, kpiBoxW - 2, 16, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(label, x + 3, kpiY + 5);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(value, x + 3, kpiY + 12);
  });

  let currentY = kpiY + 22;

  // Campaign metrics table (full row)
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("Campaign Metrics", 14, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [[
      `Spend (${currency})`, "Leads", "Purchases", "ROAS",
      "Impressions", "Clicks", "CTR %", "Reach",
      `CPC (${currency})`, `CPM (${currency})`,
    ]],
    body: [[
      campaign.spend.toFixed(2),
      (campaign.leads ?? 0).toLocaleString(),
      (campaign.purchases ?? 0).toLocaleString(),
      `${(campaign.roas ?? 0).toFixed(2)}x`,
      campaign.impressions.toLocaleString(),
      campaign.clicks.toLocaleString(),
      `${campaign.ctr.toFixed(2)}%`,
      (campaign.reach ?? 0).toLocaleString(),
      (campaign.cpc ?? 0).toFixed(4),
      (campaign.cpm ?? 0).toFixed(4),
    ]],
    headStyles: { fillColor: [24, 144, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 248, 255] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Ad creatives table
  if (ads.length) {
    doc.setFontSize(10);
    doc.text("Ad Creatives", 14, currentY);
    currentY += 4;

    let resultCol = "Results";
    if (obj.includes("LEAD")) resultCol = "Leads";
    else if (obj.includes("CONVERS") || obj.includes("PURCHASE")) resultCol = "Purchases";

    autoTable(doc, {
      startY: currentY,
      head: [["Ad Name", `Spend (${currency})`, resultCol, "CTR %", "Impressions", "Clicks", `Cost / ${resultCol}`]],
      body: ads.map((ad) => {
        const cpr = ad.results > 0 ? (ad.spend / ad.results).toFixed(2) : "—";
        return [
          ad.adName,
          ad.spend.toFixed(2),
          ad.results.toLocaleString(),
          `${ad.ctr.toFixed(2)}%`,
          ad.impressions.toLocaleString(),
          ad.clicks.toLocaleString(),
          cpr,
        ];
      }),
      headStyles: { fillColor: [82, 196, 26], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 70 } },
      alternateRowStyles: { fillColor: [246, 255, 237] },
    });
  }

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.getHeight() - 6);

  const filename = `${safeFilenameBase(campaign.campaignName)}_${dateStamp()}.pdf`;
  doc.save(filename);
}
