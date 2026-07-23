import type { UseFormReturn } from "react-hook-form";
import type { TFunction } from "i18next";
import { Form, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/ui/shared/components/AppModal";

type Props = {
  t: TFunction;
  open: boolean;
  form: UseFormReturn<{ password: string }>;
  onCancel: () => void;
  onSave: () => Promise<void>;
};

export function AdminUserResetPasswordModal({ t, open, form, onCancel, onSave }: Props) {
  return (
    <AppModal
      title={t("admin.resetPasswordTitle")}
      open={open}
      onCancel={onCancel}
      okText={t("admin.resetPasswordSubmit")}
      onOk={() => void onSave()}
      scrollableBody={false}
    >
      <Form form={form}>
        <FormItem<{ password: string }, "password">
          name="password"
          label={t("admin.newPassword")}
          rules={{
            required: t("form.validation.passwordRequired"),
            minLength: { value: 8, message: t("form.validation.passwordMinLength", { length: 8 }) },
          }}
        >
          {(field) => <Input {...field} type="password" autoComplete="new-password" dir="ltr" />}
        </FormItem>
      </Form>
    </AppModal>
  );
}
