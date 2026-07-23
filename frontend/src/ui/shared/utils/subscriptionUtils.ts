/**
 * Shared utilities for subscription-related functionality
 */

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "ILS").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString();
}

export function getSubscriptionStatusColor(status: string | null): string {
  switch (status) {
    case "active":
      return "success";
    case "past_due":
      return "warning";
    case "canceled":
    case "cancelled":
      return "error";
    case "paused":
      return "warning";
    case "pending":
      return "processing";
    default:
      return "default";
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "error";
    case "pending":
      return "processing";
    default:
      return "default";
  }
}
