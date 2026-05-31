import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminService, BillingHistoryWithAccountRow, InvoiceTemplateRow } from "@/services/admin/AdminService";

export function useAdminPaymentsRemoteLists(admin: AdminService) {
  const [allBillingRows, setAllBillingRows] = useState<BillingHistoryWithAccountRow[]>([]);
  const [allBillingLoading, setAllBillingLoading] = useState(false);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const billingLoadingRef = useRef(false);

  // When admin identity changes, reset the in-flight guard so the new admin can load.
  useEffect(() => {
    return () => {
      billingLoadingRef.current = false;
    };
  }, [admin]);

  const loadAllBillingHistory = useCallback(async () => {
    if (billingLoadingRef.current) return;
    billingLoadingRef.current = true;
    setAllBillingLoading(true);
    try {
      const rows = await admin.listAllBillingHistory();
      setAllBillingRows(rows);
    } catch {
      setAllBillingRows([]);
    } finally {
      setAllBillingLoading(false);
      billingLoadingRef.current = false;
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
    void loadAllBillingHistory();
  }, [loadInvoiceTemplates, loadAllBillingHistory]);

  return {
    allBillingRows,
    allBillingLoading,
    loadAllBillingHistory,
    invoiceTemplates,
    templatesLoading,
    loadInvoiceTemplates,
  };
}
