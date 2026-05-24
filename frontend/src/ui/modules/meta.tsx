import { FacebookOutlined } from '@ant-design/icons';
import { MetaAnalyticsPage } from '@/ui/features/user/analytics/pages/MetaAnalyticsPage';
import { MetaCampaignDeepDivePage } from '@/ui/features/user/analytics/pages/MetaCampaignDeepDivePage';
import { Paths, accountPath } from '@/ui/navigation/paths';
import type { AccountModule } from './types';

export const metaModule: AccountModule = {
  id: 'meta',
  routes: [
    { path: Paths.meta, element: <MetaAnalyticsPage /> },
    { path: Paths.metaCampaign, element: <MetaCampaignDeepDivePage /> },
  ],
  navItems: ({ accountId, hasMeta }, t) => {
    if (!hasMeta) return [];
    return [{ key: accountPath(accountId, 'meta'), icon: <FacebookOutlined />, label: t('layout.menuMeta') }];
  },
};
