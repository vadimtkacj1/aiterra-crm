import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { AdminUserEditModal } from "./AdminUserEditModal";
import { AdminUserResetPasswordModal } from "./AdminUserResetPasswordModal";
import { AdminUsersCreateModal } from "./AdminUsersCreateModal";
import { AdminUsersListTableCard } from "./AdminUsersListTableCard";
import { useAdminUsersPage } from "./useAdminUsersPage";

export function AdminUsersPage() {
  const p = useAdminUsersPage();

  return (
    <PageContainer>
      <PageHeader
        title={p.t("admin.users.title")}
        description={p.t("admin.users.description")}
      />
      <AdminUsersListTableCard
        t={p.t}
        users={p.users}
        loading={p.loading}
        onEdit={p.openEditUser}
        onResetPassword={p.openResetPassword}
        onDelete={p.handleDeleteUser}
        onCreateUser={p.openCreate}
      />

      <AdminUsersCreateModal
        t={p.t}
        open={p.createOpen}
        form={p.form}
        metaCampaigns={p.metaCampaigns}
        metaCampaignsLoading={p.metaCampaignsLoading}
        onFinish={p.handleCreateFinish}
        onCancel={p.closeCreate}
      />

      <AdminUserEditModal
        t={p.t}
        open={p.editUser != null}
        editMetaLoading={p.editMetaLoading}
        editMetaInfo={p.editMetaInfo}
        editGoogleHasCredentials={p.editGoogleHasCredentials}
        editSiteInfo={p.editSiteInfo}
        editForm={p.editForm}
        metaCampaigns={p.metaCampaigns}
        metaCampaignsLoading={p.metaCampaignsLoading}
        onCancel={p.closeEditUser}
        onSave={p.handleEditSave}
        onSiteTokenRegenerated={(newToken) =>
          p.setEditSiteInfo((prev) => prev ? { ...prev, publicToken: newToken } : prev)
        }
        regenerateSiteToken={(accountId) => p.services.site.regenerateToken(accountId)}
      />

      <AdminUserResetPasswordModal
        t={p.t}
        open={p.resetUser != null}
        form={p.pwdForm}
        onCancel={() => p.closeResetPassword()}
        onSave={p.handleResetPasswordSave}
      />
    </PageContainer>
  );
}
