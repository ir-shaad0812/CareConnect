import arLocale from "@/locales/ar.json";
import enLocale from "@/locales/en.json";
import esLocale from "@/locales/es.json";
import frLocale from "@/locales/fr.json";
import hiLocale from "@/locales/hi.json";
import neLocale from "@/locales/ne.json";

export type SupportedLanguage = "en" | "ne" | "hi" | "es" | "ar" | "fr";

export type TranslationNamespace =
  | "common"
  | "auth"
  | "dashboard"
  | "booking"
  | "payment"
  | "notifications"
  | "admin"
  | "profile"
  | "caregiver"
  | "landing";

type TranslationNamespacePayload = Record<string, unknown>;
type LanguageTranslation = Record<TranslationNamespace, TranslationNamespacePayload>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const asPayload = (value: unknown): TranslationNamespacePayload => {
  return isRecord(value) ? (value as TranslationNamespacePayload) : {};
};

const normalizeLanguage = (value: unknown): LanguageTranslation => {
  const source = isRecord(value) ? value : {};

  return {
    common: asPayload(source.common),
    auth: asPayload(source.auth),
    dashboard: asPayload(source.dashboard),
    booking: asPayload(source.booking),
    payment: asPayload(source.payment),
    notifications: asPayload(source.notifications),
    admin: asPayload(source.admin),
    profile: asPayload(source.profile),
    caregiver: asPayload(source.caregiver),
    landing: asPayload(source.landing),
  };
};

const enTranslations = normalizeLanguage(enLocale);
const neTranslations = normalizeLanguage(neLocale);
const hiTranslations = normalizeLanguage(hiLocale);
const esTranslations = normalizeLanguage(esLocale);
const arTranslations = normalizeLanguage(arLocale);
const frTranslations = normalizeLanguage(frLocale);

export const enCommon = enTranslations.common;
export const enAuth = enTranslations.auth;
export const enDashboard = enTranslations.dashboard;
export const enBooking = enTranslations.booking;
export const enPayment = enTranslations.payment;
export const enNotifications = enTranslations.notifications;
export const enAdmin = enTranslations.admin;
export const enProfile = enTranslations.profile;
export const enCaregiver = enTranslations.caregiver;
export const enLanding = enTranslations.landing;

export const neCommon = neTranslations.common;
export const neAuth = neTranslations.auth;
export const neDashboard = neTranslations.dashboard;
export const neBooking = neTranslations.booking;
export const nePayment = neTranslations.payment;
export const neNotifications = neTranslations.notifications;
export const neAdmin = neTranslations.admin;
export const neProfile = neTranslations.profile;
export const neCaregiver = neTranslations.caregiver;
export const neLanding = neTranslations.landing;

export const hiCommon = hiTranslations.common;
export const hiAuth = hiTranslations.auth;

export const esCommon = esTranslations.common;
export const esAuth = esTranslations.auth;

export const arCommon = arTranslations.common;
export const arAuth = arTranslations.auth;

export const frCommon = frTranslations.common;
export const frAuth = frTranslations.auth;

export const translations: Record<SupportedLanguage, LanguageTranslation> = {
  en: enTranslations,
  ne: neTranslations,
  hi: hiTranslations,
  es: esTranslations,
  ar: arTranslations,
  fr: frTranslations,
};

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";
export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

export const isRTLLanguage = (lang: string): boolean => {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
};
