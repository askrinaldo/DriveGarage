import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { no } from "./translations/no";
import { sv } from "./translations/sv";
import { da } from "./translations/da";
import { en } from "./translations/en";

export const LANG_STORAGE_KEY = "vg-lang";

export const supportedLanguages = ["no", "sv", "da", "en"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageMeta: Record<SupportedLanguage, { flag: string; flagUrl: string; label: string; locale: string }> = {
  no: { flag: "🇳🇴", flagUrl: "https://flagcdn.com/w40/no.png", label: "Norsk", locale: "no-NO" },
  sv: { flag: "🇸🇪", flagUrl: "https://flagcdn.com/w40/se.png", label: "Svenska", locale: "sv-SE" },
  da: { flag: "🇩🇰", flagUrl: "https://flagcdn.com/w40/dk.png", label: "Dansk", locale: "da-DK" },
  en: { flag: "🇬🇧", flagUrl: "https://flagcdn.com/w40/gb.png", label: "English", locale: "en-GB" },
};

function getSavedLang(): SupportedLanguage {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && supportedLanguages.includes(saved as SupportedLanguage)) {
    return saved as SupportedLanguage;
  }
  return "no";
}

void i18n.use(initReactI18next).init({
  resources: {
    no: { translation: no },
    sv: { translation: sv },
    da: { translation: da },
    en: { translation: en },
  },
  lng: getSavedLang(),
  fallbackLng: "no",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: SupportedLanguage) {
  void i18n.changeLanguage(lang);
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}

export function getCurrentLocale(): string {
  const lang = (i18n.language ?? "no") as SupportedLanguage;
  return languageMeta[lang]?.locale ?? "no-NO";
}

export default i18n;
