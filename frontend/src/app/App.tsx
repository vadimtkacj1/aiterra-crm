import { DirectionProvider } from "@radix-ui/react-direction";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { i18n } from "@/i18n";
import { ConfirmHost } from "@/lib/confirm";
import { AppProviders } from "./AppProviders";
import { AppRoutes } from "@/ui/routes/AppRoutes";

function Direction({ children }: { children: ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  const isRtl = i18nInstance.language.startsWith("he");
  const dir = isRtl ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", isRtl ? "he" : "en");
  }, [dir, isRtl]);

  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Direction>
        <BrowserRouter>
          <AppProviders>
            <AppRoutes />
            <Toaster position="top-center" richColors closeButton />
            <ConfirmHost />
          </AppProviders>
        </BrowserRouter>
      </Direction>
    </I18nextProvider>
  );
}
