import { FileText } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/app/AppProviders';
import { MemberContractsPage } from '@/ui/features/user/contracts/pages/MemberContractsPage';
import { Paths, accountPath } from '@/ui/navigation/paths';
import type { AccountModule } from './types';

function ContractsRoute() {
  const { isAdmin } = useApp();
  if (isAdmin) return <Navigate to={Paths.adminContracts} replace />;
  return <MemberContractsPage />;
}

export const contractsModule: AccountModule = {
  id: 'contracts',
  routes: [
    { path: Paths.contracts, element: <ContractsRoute /> },
  ],
  navItems: ({ accountId, isAdmin }, t) => {
    if (isAdmin) return [];
    return [{ key: accountPath(accountId, 'contracts'), icon: <FileText />, label: t('layout.menuContracts') }];
  },
};
