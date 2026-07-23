import { useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AdminPaymentsLibraryDrawerModel } from "./adminPaymentsLibraryTypes";
import { AdminPaymentsTemplatesPanel } from "./AdminPaymentsTemplatesPanel";

type Props = {
  model: AdminPaymentsLibraryDrawerModel;
};

export function AdminPaymentsLibraryDrawer({ model }: Props) {
  // antd Drawer `afterOpenChange` compat: notify on every open/close transition.
  const prevOpen = useRef(model.open);
  const afterOpenChange = model.afterOpenChange;
  useEffect(() => {
    if (prevOpen.current !== model.open) {
      prevOpen.current = model.open;
      afterOpenChange(model.open);
    }
  }, [model.open, afterOpenChange]);

  return (
    <Sheet
      open={model.open}
      onOpenChange={(open) => {
        if (!open) model.onClose();
      }}
    >
      <SheetContent
        side="end"
        closeLabel={model.t("common.close")}
        className="w-full max-w-full gap-3 sm:w-180 sm:max-w-[calc(100vw-2rem)]"
      >
        <SheetHeader>
          <SheetTitle>{model.t("admin.payments.libraryDrawerTitle")}</SheetTitle>
          <SheetDescription className="text-xs">
            {model.t("admin.payments.templatesHint")}
          </SheetDescription>
        </SheetHeader>

        <AdminPaymentsTemplatesPanel
          t={model.t}
          admin={model.admin}
          message={model.message}
          userMeta={model.userMeta}
          templates={model.invoiceTemplates}
          templatesLoading={model.templatesLoading}
          billBlockedForAdmin={model.billBlockedForAdmin}
          loadTemplateIntoForm={model.loadTemplateIntoForm}
          applyTemplateToSelectedClient={model.applyTemplateToSelectedClient}
          loadInvoiceTemplates={model.loadInvoiceTemplates}
        />
      </SheetContent>
    </Sheet>
  );
}
