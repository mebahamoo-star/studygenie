import settingsI18n, { setSettingsLanguage } from "@/features/settings/i18n";
import en from "./en.json";
import ar from "./ar.json";

// Unconditionally deep-merge `postExam` into both translation bundles.
// Avoid gating on `i18n.exists(..., { lng: "ar" })` because `fallbackLng: "en"` causes false positives.
settingsI18n.addResourceBundle("en", "translation", en, true, true);
settingsI18n.addResourceBundle("ar", "translation", ar, true, true);

export function syncPostExamLanguage(lang: "en" | "ar") {
  setSettingsLanguage(lang);
}

export default settingsI18n;
