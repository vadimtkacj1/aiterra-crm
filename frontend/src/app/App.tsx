import { App as AntdApp, ConfigProvider, theme } from "antd";
import enUS from "antd/locale/en_US";
import heIL from "antd/locale/he_IL";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { i18n } from "../i18n";
import { AppProviders } from "./AppProviders";
import { AppRoutes } from "../ui/routes/AppRoutes";

const appTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#2563eb",
    colorInfo: "#2563eb",
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    colorBgLayout: "#f5f5f5",
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      headerHeight: 56,
      headerPadding: "0 20px",
    },
    Card: {
      headerFontSize: 15,
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 12,
      itemHeight: 40,
    },
    Button: {
      borderRadius: 8,
    },
  },
};

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
    <ConfigProvider locale={antdLocale} direction={dir} theme={appTheme}>
      {children}
    </ConfigProvider>
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
            </AppProviders>
          </BrowserRouter>
        </AntdApp>
      </DirectionAndAntLocale>
    </I18nextProvider>
  );
}
