import type { SUPPORTED_LANGUAGES } from "@/lib/constants";

export const TRANSLATION_NAMESPACES = [
  "common",
  "auth",
  "dashboard",
  "booking",
  "payment",
  "notifications",
  "admin",
  "profile",
  "caregiver",
  "landing",
] as const;

export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export type TranslationNode =
  | string
  | number
  | boolean
  | null
  | TranslationTree
  | TranslationNode[];

export interface TranslationTree {
  [key: string]: TranslationNode;
}

export type TranslationResource = Record<TranslationNamespace, TranslationTree>;

type PartialTranslationResource = Partial<
  Record<TranslationNamespace, TranslationTree>
>;

type LocaleModule = {
  default: PartialTranslationResource;
};

const localeLoaders: Record<SupportedLanguage, () => Promise<LocaleModule>> = {
  en: () => import("@/locales/en.json"),
  ne: () => import("@/locales/ne.json"),
  hi: () => import("@/locales/hi.json"),
  es: () => import("@/locales/es.json"),
  ar: () => import("@/locales/ar.json"),
  fr: () => import("@/locales/fr.json"),
};

const localeCache = new Map<SupportedLanguage, PartialTranslationResource>();

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const asTree = (value: unknown): TranslationTree => {
  return isPlainObject(value) ? (value as TranslationTree) : {};
};

const mergeTrees = (
  fallbackTree: TranslationTree,
  overrideTree: TranslationTree,
): TranslationTree => {
  const merged: TranslationTree = { ...fallbackTree };

  Object.entries(overrideTree).forEach(([key, overrideValue]) => {
    const fallbackValue = merged[key];

    if (isPlainObject(fallbackValue) && isPlainObject(overrideValue)) {
      merged[key] = mergeTrees(
        fallbackValue as TranslationTree,
        overrideValue as TranslationTree,
      );
      return;
    }

    merged[key] = overrideValue as TranslationNode;
  });

  return merged;
};

const normalizeResource = (
  resource: PartialTranslationResource,
  fallback: PartialTranslationResource,
): TranslationResource => {
  const normalized = {} as TranslationResource;

  TRANSLATION_NAMESPACES.forEach((namespace) => {
    const fallbackNamespace = asTree(fallback[namespace]);
    const resourceNamespace = asTree(resource[namespace]);

    normalized[namespace] = mergeTrees(fallbackNamespace, resourceNamespace);
  });

  return normalized;
};

const loadRawLocale = async (
  language: SupportedLanguage,
): Promise<PartialTranslationResource> => {
  const cachedLocale = localeCache.get(language);
  if (cachedLocale) {
    return cachedLocale;
  }

  const localeModule = await localeLoaders[language]();
  const locale = localeModule.default ?? {};

  localeCache.set(language, locale);
  return locale;
};

export const loadLocale = async (
  language: SupportedLanguage,
): Promise<TranslationResource> => {
  const fallbackLocale = await loadRawLocale("en");

  if (language === "en") {
    return normalizeResource(fallbackLocale, fallbackLocale);
  }

  const requestedLocale = await loadRawLocale(language);
  return normalizeResource(requestedLocale, fallbackLocale);
};

export const clearLocaleCache = (): void => {
  localeCache.clear();
};
