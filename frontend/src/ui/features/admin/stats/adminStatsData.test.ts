import { describe, expect, it } from "vitest";
import {
  buildCurrencyPieData,
  buildRevenueLineChartData,
  formatRevenueSummary,
  getAdminStatsPeriodRange,
} from "./adminStatsData";

describe("getAdminStatsPeriodRange", () => {
  const fixed = new Date("2026-05-15T12:00:00.000Z");

  it("month uses first day of month through today", () => {
    const r = getAdminStatsPeriodRange("month", fixed);
    expect(r.groupBy).toBe("day");
    expect(r.startDate).toBe("2026-05-01");
    expect(r.endDate).toBe("2026-05-15");
  });

  it("year uses Jan 1 through today with month grouping", () => {
    const r = getAdminStatsPeriodRange("year", fixed);
    expect(r.groupBy).toBe("month");
    expect(r.startDate).toBe("2026-01-01");
    expect(r.endDate).toBe("2026-05-15");
  });

  it("week spans start of week through today (UTC)", () => {
    const r = getAdminStatsPeriodRange("week", fixed);
    expect(r.groupBy).toBe("day");
    expect(r.endDate).toBe("2026-05-15");
    expect(r.startDate).toBe("2026-05-10");
  });
});

describe("formatRevenueSummary", () => {
  it("returns 0.00 when empty", () => {
    expect(formatRevenueSummary([])).toBe("0.00");
    expect(formatRevenueSummary(null)).toBe("0.00");
  });

  it("joins paid currency amounts", () => {
    const s = formatRevenueSummary([
      { currency: "EUR", paidAmount: 24.29, unpaidAmount: 0 },
      { currency: "ILS", paidAmount: 100, unpaidAmount: 5 },
    ]);
    expect(s).toContain("24.29");
    expect(s).toContain("EUR");
  });
});

describe("buildRevenueLineChartData", () => {
  it("returns empty without buckets", () => {
    expect(buildRevenueLineChartData(null, "P", "U")).toEqual([]);
  });

  it("duplicates series per bucket", () => {
    const rows = buildRevenueLineChartData(
      {
        paidCount: 0,
        unpaidCount: 0,
        availableYears: [],
        currencies: [],
        buckets: [{ label: "2026-05", paidCount: 2, unpaidCount: 1 }],
      },
      "Paid",
      "Unpaid",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ label: "2026-05", series: "Paid", value: 2 });
    expect(rows[1]).toEqual({ label: "2026-05", series: "Unpaid", value: 1 });
  });
});

describe("buildCurrencyPieData", () => {
  it("filters zero paid amounts", () => {
    const pie = buildCurrencyPieData({
      paidCount: 1,
      unpaidCount: 0,
      availableYears: [],
      currencies: [
        { currency: "EUR", paidAmount: 10, unpaidAmount: 0 },
        { currency: "USD", paidAmount: 0, unpaidAmount: 99 },
      ],
      buckets: [],
    });
    expect(pie).toEqual([{ type: "EUR", value: 10 }]);
  });
});
