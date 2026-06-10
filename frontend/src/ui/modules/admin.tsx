import {
  BarChartOutlined,
  ContainerOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  FormOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import { AdminStatisticsPage } from '@/ui/features/admin/stats/AdminStatisticsPage';
import { AdminAuditPage } from '@/ui/features/admin/audit/AdminAuditPage';
import { AdminUsersPage } from '@/ui/features/admin/users/AdminUsersPage';
import { AdminPaymentsPage } from '@/ui/features/admin/payments/AdminPaymentsView';
import { AdminContractsPage } from '@/ui/features/admin/contracts/AdminContractsPage';
import { AdminInvoicesPage } from '@/ui/features/admin/invoices/AdminInvoicesPage';
import { AdminMetaBudgetPage } from '@/ui/features/admin/meta-budget/AdminMetaBudgetPage';
import { AdminLeadsPage } from '@/ui/features/admin/leads/AdminLeadsPage';
import { AdminWhatsAppPage } from '@/ui/features/admin/whatsapp/AdminWhatsAppPage';
import { Paths } from '@/ui/navigation/paths';
import type { AdminModule } from './types';

export const adminStatisticsModule: AdminModule = {
  id: 'admin-statistics',
  path: 'statistics',
  element: <AdminStatisticsPage />,
  navItem: (t) => ({ key: Paths.adminStatistics, icon: <BarChartOutlined />, label: t('admin.stats.title') }),
};

export const adminAuditModule: AdminModule = {
  id: 'admin-audit',
  path: 'audit',
  element: <AdminAuditPage />,
  navItem: (t) => ({ key: Paths.adminAudit, icon: <SafetyCertificateOutlined />, label: t('admin.audit.menuTitle') }),
};

export const adminUsersModule: AdminModule = {
  id: 'admin-users',
  path: 'users',
  element: <AdminUsersPage />,
  navItem: (t) => ({ key: Paths.adminUsers, icon: <TeamOutlined />, label: t('admin.userListTitle') }),
};

export const adminPaymentsModule: AdminModule = {
  id: 'admin-payments',
  path: 'payments',
  element: <AdminPaymentsPage />,
  navItem: (t) => ({ key: Paths.adminPayments, icon: <FileTextOutlined />, label: t('admin.payments.title') }),
};

export const adminContractsModule: AdminModule = {
  id: 'admin-contracts',
  path: 'contracts',
  element: <AdminContractsPage />,
  navItem: (t) => ({ key: Paths.adminContracts, icon: <ContainerOutlined />, label: t('admin.contracts.title') }),
};

export const adminInvoicesModule: AdminModule = {
  id: 'admin-invoices',
  path: 'invoices',
  element: <AdminInvoicesPage />,
  navItem: (t) => ({ key: Paths.adminInvoices, icon: <DollarOutlined />, label: t('admin.invoices.title') }),
};

export const adminMetaBudgetModule: AdminModule = {
  id: 'admin-meta-budget',
  path: 'meta-budget',
  element: <AdminMetaBudgetPage />,
  navItem: (t) => ({ key: Paths.adminMetaBudget, icon: <CreditCardOutlined />, label: t('admin.topup.title') }),
};

export const adminLeadsModule: AdminModule = {
  id: 'admin-leads',
  path: 'leads',
  element: <AdminLeadsPage />,
  navItem: (t) => ({ key: Paths.adminLeads, icon: <FormOutlined />, label: t('admin.leads.menuTitle') }),
};

export const adminWhatsAppModule: AdminModule = {
  id: 'admin-whatsapp',
  path: 'whatsapp',
  element: <AdminWhatsAppPage />,
  navItem: (t) => ({ key: Paths.adminWhatsApp, icon: <WhatsAppOutlined style={{ color: '#25d366' }} />, label: t('admin.whatsapp.menuTitle') }),
};
