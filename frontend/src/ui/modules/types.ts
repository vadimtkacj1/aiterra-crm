import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  icon: ReactNode;
  label: string;
}

export interface RouteConfig {
  path: string;
  element: ReactNode;
}

export interface AccountModuleCtx {
  accountId: string;
  isAdmin: boolean;
  hasMeta: boolean;
  hasGoogle: boolean;
  hasSite: boolean;
  totalAccounts: number;
}

type TFn = (key: string, options?: Record<string, unknown>) => string;

/** A feature module rendered inside the authenticated MainLayout. */
export interface AccountModule {
  id: string;
  /** Routes inside the authenticated layout. Path uses React Router params (e.g. /a/:accountId/meta). */
  routes: RouteConfig[];
  /** Routes rendered standalone, outside any layout (e.g. post-payment redirects). */
  standaloneRoutes?: RouteConfig[];
  /** Returns sidebar nav items for the current context. Return [] to hide the item. */
  navItems?: (ctx: AccountModuleCtx, t: TFn) => NavItem[];
}

/** An admin panel section rendered inside AdminLayout under /admin/. */
export interface AdminModule {
  id: string;
  /** Relative path under /admin/ (e.g. "statistics") */
  path: string;
  element: ReactNode;
  navItem: (t: TFn) => NavItem;
}
