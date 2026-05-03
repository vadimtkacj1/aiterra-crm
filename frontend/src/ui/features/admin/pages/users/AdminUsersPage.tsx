import { Col, Row } from "antd";
import { AdminUserEditModal } from "./AdminUserEditModal";
import { AdminUserResetPasswordModal } from "./AdminUserResetPasswordModal";
import { AdminUsersCreateFormCard } from "./AdminUsersCreateFormCard";
import { AdminUsersListTableCard } from "./AdminUsersListTableCard";
import { useAdminUsersPage } from "./useAdminUsersPage";

export function AdminUsersPage() {
  const p = useAdminUsersPage();

  return (
    <>
      <Row gutter={[24, 24]} align="top">
        <Col xs={24} lg={9}>
          <AdminUsersCreateFormCard
            t={p.t}
            form={p.form}
            metaCampaigns={p.metaCampaigns}
            metaCampaignsLoading={p.metaCampaignsLoading}
            onFinish={p.handleCreateFinish}
          />
        </Col>
        <Col xs={24} lg={15}>
          <AdminUsersListTableCard
            t={p.t}
            users={p.users}
            loading={p.loading}
            onEdit={p.openEditUser}
            onResetPassword={p.openResetPassword}
          />
        </Col>
      </Row>

      <AdminUserEditModal
        t={p.t}
        open={p.editUser != null}
        editMetaLoading={p.editMetaLoading}
        editMetaInfo={p.editMetaInfo}
        editGoogleHasCredentials={p.editGoogleHasCredentials}
        editForm={p.editForm}
        metaCampaigns={p.metaCampaigns}
        metaCampaignsLoading={p.metaCampaignsLoading}
        onCancel={p.closeEditUser}
        onSave={p.handleEditSave}
      />

      <AdminUserResetPasswordModal
        t={p.t}
        open={p.resetUser != null}
        form={p.pwdForm}
        onCancel={() => p.closeResetPassword()}
        onSave={p.handleResetPasswordSave}
      />
    </>
  );
}
