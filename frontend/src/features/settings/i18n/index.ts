import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ar from "./ar.json";

const settingsI18n = i18n.createInstance();

settingsI18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export function setSettingsLanguage(lang: "en" | "ar") {
  if (settingsI18n.language !== lang) {
    settingsI18n.changeLanguage(lang);
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
  }
}

export default settingsI18n;
