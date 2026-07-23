import { DirectionProvider } from "@radix-ui/react-direction";
import { App as AntdApp, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import heIL from "antd/locale/he_IL";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { i18n } from "@/i18n";
import { ConfirmHost } from "@/lib/confirm";
import { AppProviders } from "./AppProviders";
import { AppRoutes } from "@/ui/routes/AppRoutes";
import { appTheme } from "@/styles/designSystem";

function DirectionAndAntLocale({ children }: { children: ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  const isRtl = i18nInstance.language.startsWith("he");
  const dir = isRtl ? "rtl" : "ltr";
  const antdLocale = isRtl ? heIL : enUS;

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", isRtl ? "he" : "en");
  }, [dir, isRtl]);

  return (
    <DirectionProvider dir={dir}>
      {/* antd wrappers stay until the last antd page is migrated (final wave) */}
      <ConfigProvider locale={antdLocale} direction={dir} theme={appTheme}>
        {children}
      </ConfigProvider>
    </DirectionProvider>
  );
}

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <DirectionAndAntLocale>
        <AntdApp>
          <BrowserRouter>
            <AppProviders>
              <AppRoutes />
              {/* shadcn toast host (used by migrated pages; antd message still
                  serves un-migrated pages during the incremental migration) */}
              <Toaster position="top-center" richColors closeButton />
              {/* imperative confirm() host (antd modal.confirm compat) */}
              <ConfirmHost />
            </AppProviders>
          </BrowserRouter>
        </AntdApp>
      </DirectionAndAntLocale>
    </I18nextProvider>
  );
}
