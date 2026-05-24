import { GoogleOutlined } from '@ant-design/icons';
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
    return [{ key: accountPath(accountId, 'google'), icon: <GoogleOutlined />, label: t('layout.menuGoogle') }];
  },
};
