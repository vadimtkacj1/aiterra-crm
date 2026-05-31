# CRM — Project Guide

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI · SQLAlchemy (SQLite) · Pydantic · APScheduler |
| Frontend | React 19 · Vite · Ant Design v6 · react-router-dom · react-i18next |
| Auth | JWT (access + refresh tokens) |
| Payments | zCredit webhooks |
| Ads | Meta Graph API (mock mode via `meta_snapshot_mock=true`) |

---

## How to add a new feature module

### 1 — Frontend

**Copy the template:**
```
frontend/src/ui/modules/_template.tsx  →  frontend/src/ui/modules/<name>.tsx
```

Fill in `routes` and `navItems` (hide the nav item by returning `[]` under certain conditions):

```tsx
// frontend/src/ui/modules/crm.tsx
import { UsergroupAddOutlined } from '@ant-design/icons';
import { CrmPage } from '../features/crm/pages/CrmPage';
import type { AccountModule } from './types';

export const crmModule: AccountModule = {
  id: 'crm',
  routes: [
    { path: '/a/:accountId/crm', element: <CrmPage /> },
  ],
  navItems: ({ accountId }, t) => [
    { key: `/a/${accountId}/crm`, icon: <UsergroupAddOutlined />, label: t('layout.menuCrm') },
  ],
};
```

**Register in the registry** (only file to edit):
```ts
// frontend/src/ui/modules/index.ts
import { crmModule } from './crm';          // ← add import

export const accountModules: AccountModule[] = [
  metaModule,
  googleModule,
  crmModule,                                 // ← add here
  ...
];
```

**Add i18n labels:**
```json
// frontend/src/i18n/locales/en.json
{ "layout": { "menuCrm": "CRM" } }

// frontend/src/i18n/locales/he.json
{ "layout": { "menuCrm": "CRM" } }
```

**Add path helpers (optional but recommended):**
```ts
// frontend/src/ui/navigation/paths.ts
export const Paths = {
  ...
  crm: "/a/:accountId/crm",   // ← add
};
```

---

### 2 — Backend

**Create the route file:**
```
backend/app/api/routes/<name>/
├── __init__.py
└── routes.py        ← FastAPI APIRouter with your endpoints
```

**Create models, services, schemas as needed:**
```
backend/app/models/<name>/
backend/app/services/<name>/
backend/app/schemas/<name>.py
```

**Register the router** (only file to edit):
```python
# backend/app/api/router.py

from app.api.routes.crm.routes import router as crm_router   # ← add import

# ── Register feature modules here ──────────────────────────────────────────
api_router.include_router(crm_router, prefix="/crm", tags=["crm"])   # ← add
```

---

## How to add a new admin panel section

**Create the page component** in `frontend/src/ui/features/admin/pages/`.

**Register in `admin.tsx` and `index.ts`:**

```ts
// frontend/src/ui/modules/admin.tsx
export const adminCrmModule: AdminModule = {
  id: 'admin-crm',
  path: 'crm',
  element: <AdminCrmPage />,
  navItem: (t) => ({ key: Paths.adminCrm, icon: <UsergroupAddOutlined />, label: t('admin.crm.title') }),
};

// frontend/src/ui/modules/index.ts
export const adminModules: AdminModule[] = [
  ...
  adminCrmModule,   // ← add
];
```

Add the path:
```ts
// frontend/src/ui/navigation/paths.ts
adminCrm: "/admin/crm",
```

---

## Key file map

```
frontend/src/ui/
  modules/
    index.ts          ← REGISTRY — edit this to add/remove modules
    types.ts          ← AccountModule / AdminModule interfaces
    meta.tsx          ← Meta Ads module
    google.tsx        ← Google Ads module
    billing.tsx       ← Billing & checkout module
    contracts.tsx     ← Contracts module
    settings.tsx      ← Settings module
    admin.tsx         ← All /admin panel sections
    _template.tsx     ← Copy this for a new module
  features/           ← All UI components, grouped by domain
  layouts/
    MainLayout.tsx    ← Reads nav items from module registry
  routes/
    AppRoutes.tsx     ← Reads routes from module registry
  navigation/
    paths.ts          ← All URL path constants

backend/app/
  api/
    router.py         ← REGISTRY — add new routers here
    routes/           ← One folder per module (routes.py inside)
  models/             ← SQLAlchemy models, grouped by domain
  services/           ← Business logic, grouped by domain
  schemas/            ← Pydantic schemas
```

---

## Running locally

```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

Set `meta_snapshot_mock=true` in `backend/.env` to use mock Meta API data without real credentials.
