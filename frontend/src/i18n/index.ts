import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en/index.ts";
import he from "@/i18n/locales/he/index.ts";

export const defaultLanguage = "he";

export const i18nReady = i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: localStorage.getItem("crm_lang") ?? defaultLanguage,
  fallbackLng: defaultLanguage,
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("crm_lang", lng);
});

export { i18n };
