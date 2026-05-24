import { SettingsPage } from '@/ui/features/user/settings/pages/SettingsPage';
import type { AccountModule } from './types';

export const settingsModule: AccountModule = {
  id: 'settings',
  routes: [
    { path: '/a/:accountId/settings', element: <SettingsPage /> },
  ],
  // Nav item is rendered separately in MainLayout (always last, with fallback logic).
};
