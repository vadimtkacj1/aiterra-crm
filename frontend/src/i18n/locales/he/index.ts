import { deepMerge } from "../mergeTranslations";
import coreShell from "./core-shell.json";
import coreAccount from "./core-account.json";
import analyticsShell from "./analytics-shell.json";
import analyticsData from "./analytics-data.json";
import billingUi from "./billing-ui.json";
import billingCheckout from "./billing-checkout.json";
import billingErrors from "./billing-errors.json";
import billingContract from "./billing-contract.json";
import adminShell from "./admin-shell.json";
import adminMetaConnect from "./admin-metaConnect.json";
import adminStats from "./admin-stats.json";
import adminAudit from "./admin-audit.json";
import adminPaymentsA from "./admin-payments-a.json";
import adminPaymentsB from "./admin-payments-b.json";
import adminTopup from "./admin-topup.json";
import adminContracts from "./admin-contracts.json";
import adminInvoices from "./admin-invoices.json";
import meta from "./meta.json";
import legal from "./legal.json";
import errors from "./errors.json";
import memberContracts from "./memberContracts.json";
import contracts from "./contracts.json";
import site from "./site.json";

const merged = deepMerge(
  {},
  coreShell,
  coreAccount,
  analyticsShell,
  analyticsData,
  billingUi,
  billingCheckout,
  billingErrors,
  billingContract,
  adminShell,
  adminMetaConnect,
  adminStats,
  adminAudit,
  adminPaymentsA,
  adminPaymentsB,
  adminTopup,
  adminContracts,
  adminInvoices,
  meta,
  legal,
  errors,
  memberContracts,
  contracts,
  site,
);
export default merged;
