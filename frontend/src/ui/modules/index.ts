// ════════════════════════════════════════════════════════════════════════════
// Module Registry
//
// To add a new account feature module:
//   1. Create  frontend/src/ui/modules/<name>.tsx  (copy _template.tsx)
//   2. Add its path constants to  ui/navigation/paths.ts
//   3. Import the module here and push it into accountModules (or adminModules)
//   4. Backend: add routes in  backend/app/api/routes/<name>/routes.py
//              register the router in  backend/app/api/router.py
// ════════════════════════════════════════════════════════════════════════════

export type { AccountModule, AdminModule, AccountModuleCtx, NavItem, RouteConfig } from './types';

import type { AccountModule, AdminModule } from './types';

// ── Account feature modules ──────────────────────────────────────────────────
import { metaModule } from './meta';
import { googleModule } from './google';
import { billingModule } from './billing';
import { contractsModule } from './contracts';
import { settingsModule } from './settings';
import { siteModule } from './site';

export const accountModules: AccountModule[] = [
  metaModule,
  googleModule,
  billingModule,
  contractsModule,
  siteModule,
  settingsModule,
  // ← ADD NEW ACCOUNT MODULE HERE
];

// ── Admin panel sections ─────────────────────────────────────────────────────
import {
  adminStatisticsModule,
  adminAuditModule,
  adminUsersModule,
  adminPaymentsModule,
  adminContractsModule,
  adminInvoicesModule,
  adminMetaBudgetModule,
  adminLeadsModule,
  adminWhatsAppModule,
} from './admin';

export const adminModules: AdminModule[] = [
  adminStatisticsModule,
  adminAuditModule,
  adminUsersModule,
  adminPaymentsModule,
  adminContractsModule,
  adminInvoicesModule,
  adminMetaBudgetModule,
  adminLeadsModule,
  adminWhatsAppModule,
  // ← ADD NEW ADMIN MODULE HERE
];
