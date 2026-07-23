import { GoogleIcon } from '@/components/icons/brand';
import { GoogleAnalyticsPage } from '@/ui/features/user/analytics/pages/GoogleAnalyticsPage';
import { Paths, accountPath } from '@/ui/navigation/paths';
import type { AccountModule } from './types';

export const googleModule: AccountModule = {
  id: 'google',
  routes: [
    { path: Paths.google, element: <GoogleAnalyticsPage /> },
  ],
  navItems: ({ accountId, hasGoogle }, t) => {
    if (!hasGoogle) return [];
    return [{ key: accountPath(accountId, 'google'), icon: <GoogleIcon />, label: t('layout.menuGoogle') }];
  },
};
