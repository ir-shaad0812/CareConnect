import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import i18nConfig from "@/locales/config.json";
import {
  loadLocale,
  TRANSLATION_NAMESPACES,
  type SupportedLanguage as LocaleCode,
} from "@/lib/localization/locale-loader";

type SupportedLanguageConfig = {
  code: LocaleCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: "ltr" | "rtl";
};

const LANGUAGE_DEFINITIONS =
  i18nConfig.supportedLanguages as SupportedLanguageConfig[];

export const SUPPORTED_LANGUAGES = LANGUAGE_DEFINITIONS;
export type SupportedLanguage = LocaleCode;
export const RTL_LANGUAGES = i18nConfig.rtlLanguages as SupportedLanguage[];

export const NAMESPACES = TRANSLATION_NAMESPACES;
export type Namespace = (typeof NAMESPACES)[number];

export const isRTL = (lang: string): boolean => {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
};

export const getDirection = (lang: string): "rtl" | "ltr" => {
  return isRTL(lang) ? "rtl" : "ltr";
};

export const applyDirection = (lang: string): void => {
  if (typeof document === "undefined") {
    return;
  }

  const dir = getDirection(lang);
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;

  if (dir === "rtl") {
    document.body.classList.add("rtl");
    document.body.classList.remove("ltr");
  } else {
    document.body.classList.add("ltr");
    document.body.classList.remove("rtl");
  }
};

const initializeI18n = async (): Promise<void> => {
  const resourcesEntries = await Promise.all(
    SUPPORTED_LANGUAGES.map(async (language) => {
      const resource = await loadLocale(language.code);
      return [language.code, resource] as const;
    }),
  );

  const resources = Object.fromEntries(resourcesEntries);

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: i18nConfig.defaultLanguage,
      supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
      defaultNS: "common",
      ns: NAMESPACES as unknown as string[],
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: "careconnect-language",
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
        bindI18n: "languageChanged",
        bindI18nStore: "",
        transEmptyNodeValue: "",
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p", "span"],
      },
      debug: process.env.NODE_ENV === "development",
    });
};

i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
});

if (typeof window !== "undefined") {
  const storedLanguage = localStorage.getItem("careconnect-language");
  applyDirection(storedLanguage || i18nConfig.defaultLanguage);
}

void initializeI18n().catch(() => {
  // Keep app running even if i18n bootstrap fails.
});

export default i18n;
