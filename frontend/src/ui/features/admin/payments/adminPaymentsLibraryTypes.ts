import type { TFunction } from "i18next";
import type {
  AdminService,
  BillingHistoryWithAccountRow,
  InvoiceTemplateRow,
  UserBusinessMeta,
} from "@/services/admin/AdminService";
export type AdminPaymentsMessageLike = { success: (c: string) => void; error: (c: string) => void };

/** Single prop bag for `AdminPaymentsLibraryDrawer`; avoids long prop drilling from the page hook. */
export type AdminPaymentsLibraryDrawerModel = {
  t: TFunction;
  open: boolean;
  onClose: () => void;
  afterOpenChange: (open: boolean) => void;
  admin: AdminService;
  message: AdminPaymentsMessageLike;
  userMeta: UserBusinessMeta | null;
  allBillingRows: BillingHistoryWithAccountRow[];
  allBillingLoading: boolean;
  revokingId: number | null;
  deletingId: number | null;
  setRevokingId: (id: number | null) => void;
  setDeletingId: (id: number | null) => void;
  refreshBillingFormForAccount: (accountId: number) => Promise<void>;
  loadAllBillingHistory: () => Promise<void>;
  downloadRowPdf: (row: BillingHistoryWithAccountRow) => void;
  invoiceTemplates: InvoiceTemplateRow[];
  templatesLoading: boolean;
  billBlockedForAdmin: boolean;
  loadTemplateIntoForm: (tpl: InvoiceTemplateRow) => void;
  applyTemplateToSelectedClient: (templateId: number) => Promise<void>;
  loadInvoiceTemplates: () => Promise<void>;
};
