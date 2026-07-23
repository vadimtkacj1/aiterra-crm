// ════════════════════════════════════════════════════════════════════════════
// New Module Template
// Copy this file → rename to <your-module>.tsx, then:
//
//   Frontend:
//     1. Create pages in  ui/pages/a/[accountId]/<your-module>/
//     2. Create feature components in  ui/features/<your-module>/
//     3. Add path constants to  ui/navigation/paths.ts
//     4. Add i18n label key to  i18n/locales/en.json + he.json
//     5. Import this module in  ui/modules/index.ts  and push to accountModules
//
//   Backend:
//     6. Create  backend/app/api/routes/<name>/routes.py  with FastAPI router
//     7. Add models in  backend/app/models/<name>/
//     8. Add services in  backend/app/services/<name>/
//     9. Add schemas in  backend/app/schemas/<name>.py
//    10. Register router in  backend/app/api/router.py
// ════════════════════════════════════════════════════════════════════════════

import { Star } from 'lucide-react';
// import { YourModulePage } from '../pages/a/[accountId]/your-module';
import type { AccountModule } from './types';

export const yourModule: AccountModule = {
  id: 'your-module',

  routes: [
    // { path: '/a/:accountId/your-module', element: <YourModulePage /> },
  ],

  navItems: ({ accountId }, t) => [
    {
      key: `/a/${accountId}/your-module`,
      icon: <Star />,
      label: t('layout.menuYourModule'), // add to en.json + he.json
    },
  ],
};
