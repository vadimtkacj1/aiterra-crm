import { Form, Input, Modal } from "antd";
import type { FormInstance } from "antd/es/form";
import type { TFunction } from "i18next";
type Props = {
  t: TFunction;
  open: boolean;
  form: FormInstance<{ password: string }>;
  onCancel: () => void;
  onSave: () => Promise<void>;
};

export function AdminUserResetPasswordModal({ t, open, form, onCancel, onSave }: Props) {
  return (
    <Modal
      title={t("admin.resetPasswordTitle")}
      open={open}
      onCancel={onCancel}
      okText={t("admin.resetPasswordSubmit")}
      onOk={() => void onSave()}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="password" label={t("admin.newPassword")} rules={[{ required: true, min: 8 }]}>
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
}
