import { useCallback, useEffect, useState } from "react";
import type { AdminService, BillingHistoryWithAccountRow, InvoiceTemplateRow } from "@/services/admin/AdminService";

export function useAdminPaymentsRemoteLists(admin: AdminService) {
  const [allBillingRows, setAllBillingRows] = useState<BillingHistoryWithAccountRow[]>([]);
  const [allBillingLoading, setAllBillingLoading] = useState(false);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const loadAllBillingHistory = useCallback(async () => {
    setAllBillingLoading(true);
    try {
      const rows = await admin.listAllBillingHistory();
      setAllBillingRows(rows);
    } catch {
      setAllBillingRows([]);
    } finally {
      setAllBillingLoading(false);
    }
  }, [admin]);

  const loadInvoiceTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const rows = await admin.listInvoiceTemplates();
      setInvoiceTemplates(rows);
    } catch {
      setInvoiceTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    void loadInvoiceTemplates();
  }, [loadInvoiceTemplates]);

  return {
    allBillingRows,
    allBillingLoading,
    loadAllBillingHistory,
    invoiceTemplates,
    templatesLoading,
    loadInvoiceTemplates,
  };
}
