import { Globe } from 'lucide-react';
import { SitePage } from '@/ui/features/user/site/pages/SitePage';
import { Paths, accountPath } from '@/ui/navigation/paths';
import type { AccountModule } from './types';

export const siteModule: AccountModule = {
  id: 'site',
  routes: [
    { path: Paths.site, element: <SitePage /> },
  ],
  navItems: ({ accountId, hasSite }, t) => {
    if (!hasSite) return [];
    return [{ key: accountPath(accountId, 'site'), icon: <Globe />, label: t('layout.menuSite') }];
  },
};
