"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RTL_LANGUAGES, SUPPORTED_LANGUAGES } from "@/lib/constants";
import enLocale from "@/locales/en.json";
import {
  loadLocale,
  TRANSLATION_NAMESPACES,
  type TranslationNamespace,
  type TranslationResource,
} from "@/lib/localization/locale-loader";

type Language = (typeof SUPPORTED_LANGUAGES)[number]["code"];
type TranslationParams = Record<string, string | number>;

interface LanguageInfo {
  code: string;
  name: string;
  flag: string;
  rtl: boolean;
}

interface LegacyTranslations {
  common: Record<string, string>;
  auth: Record<string, string>;
  nav: Record<string, string>;
  hero: Record<string, string>;
  categories: Record<string, string>;
  trustBadges: Record<string, string>;
  stats: Record<string, string>;
  sections: Record<string, string>;
  howItWorks: Record<string, string>;
  cta: Record<string, string>;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: LegacyTranslations & (
    (
      namespace: TranslationNamespace,
      key: string,
      params?: TranslationParams,
    ) => string
  );
  translate: (key: string, params?: TranslationParams) => string;
  languages: readonly LanguageInfo[];
  currentLanguage: LanguageInfo;
  isRTL: boolean;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "careconnect-language";
const DEFAULT_LANGUAGE: Language = "en";

interface LanguageProviderProps {
  children: React.ReactNode;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getValueByPath = (source: unknown, path: string): unknown => {
  if (!path) {
    return source;
  }

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, source);
};

const asText = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

const interpolate = (template: string, params?: TranslationParams): string => {
  if (!params) {
    return template;
  }

  let output = template;
  Object.entries(params).forEach(([key, value]) => {
    output = output.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  });

  return output;
};

const isKnownNamespace = (value: string): value is TranslationNamespace => {
  return (TRANSLATION_NAMESPACES as readonly string[]).includes(value);
};

const buildLocaleSeed = (value: unknown): TranslationResource => {
  const source = isRecord(value) ? value : {};

  return TRANSLATION_NAMESPACES.reduce((acc, namespace) => {
    acc[namespace] = isRecord(source[namespace])
      ? (source[namespace] as TranslationResource[typeof namespace])
      : {};
    return acc;
  }, {} as TranslationResource);
};

const EMPTY_TRANSLATIONS = buildLocaleSeed(enLocale);

const resolveNamespaceValue = (
  resource: TranslationResource,
  namespace: TranslationNamespace,
  key: string,
): string | undefined => {
  const namespaceData = resource[namespace];

  const directValue = asText(getValueByPath(namespaceData, key));
  if (directValue !== undefined) {
    return directValue;
  }

  if (namespace === "common") {
    return asText(getValueByPath(namespaceData, `common.${key}`));
  }

  return undefined;
};

const resolvePathValue = (
  resource: TranslationResource,
  path: string,
): string | undefined => {
  const [namespace, ...segments] = path.split(".");

  if (!namespace || segments.length === 0 || !isKnownNamespace(namespace)) {
    return undefined;
  }

  return asText(getValueByPath(resource[namespace], segments.join(".")));
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [resource, setResource] = useState<TranslationResource>(EMPTY_TRANSLATIONS);

  const isRTL = useMemo(() => {
    return RTL_LANGUAGES.includes(language as (typeof RTL_LANGUAGES)[number]);
  }, [language]);

  const dir = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    const storedLang = localStorage.getItem(STORAGE_KEY) as Language | null;

    if (
      storedLang &&
      SUPPORTED_LANGUAGES.some((supported) => supported.code === storedLang)
    ) {
      // Hydrate persisted language once after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(storedLang);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const loadResource = async () => {
      try {
        const loadedResource = await loadLocale(language);
        if (isSubscribed) {
          setResource(loadedResource);
        }
      } catch {
        if (!isSubscribed) {
          return;
        }

        try {
          const fallbackResource = await loadLocale(DEFAULT_LANGUAGE);
          setResource(fallbackResource);
        } catch {
          setResource(EMPTY_TRANSLATIONS);
        }
      }
    };

    void loadResource();

    return () => {
      isSubscribed = false;
    };
  }, [language]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.body.classList.toggle("rtl", isRTL);
    document.body.classList.toggle("ltr", !isRTL);
  }, [dir, isHydrated, isRTL, language]);

  const setLanguage = useCallback((lang: Language) => {
    if (!SUPPORTED_LANGUAGES.some((supported) => supported.code === lang)) {
      return;
    }

    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const tFunc = useCallback(
    (
      namespace: TranslationNamespace,
      key: string,
      params?: TranslationParams,
    ): string => {
      const template = resolveNamespaceValue(resource, namespace, key) ?? key;
      return interpolate(template, params);
    },
    [resource],
  );

  const legacyT = useMemo((): LegacyTranslations => {
    const pick = (...paths: string[]): string => {
      for (const path of paths) {
        const value = resolvePathValue(resource, path);
        if (value !== undefined) {
          return value;
        }
      }

      return paths[0] ?? "";
    };

    return {
      common: {
        loading: pick("common.common.loading", "common.loading"),
        error: pick("common.common.error", "common.error"),
        retry: pick("common.common.retry", "common.retry"),
        cancel: pick("common.common.cancel", "common.cancel"),
        save: pick("common.common.save", "common.save"),
        delete: pick("common.common.delete", "common.delete"),
        edit: pick("common.common.edit", "common.edit"),
        view: pick("common.common.view", "common.view"),
        search: pick("common.common.search", "common.search"),
        filter: pick("common.common.filter", "common.filter"),
        sort: pick("common.common.sort", "common.sort"),
        back: pick("common.common.back", "common.back"),
        next: pick("common.common.next", "common.next"),
        previous: pick("common.common.previous", "common.previous"),
        submit: pick("common.common.submit", "common.submit"),
        confirm: pick("common.common.confirm", "common.confirm"),
        yes: pick("common.common.yes", "common.yes"),
        no: pick("common.common.no", "common.no"),
        viewAll: pick("common.common.viewAll", "common.viewAll"),
        learnMore: pick("common.common.learnMore", "common.learnMore"),
      },
      auth: {
        login: pick("auth.login.signIn", "auth.login.title"),
        logout: pick("common.nav.logout"),
        register: pick("auth.register.createAccount", "auth.register.title"),
        forgotPassword: pick("auth.login.forgotPassword", "auth.forgotPassword.title"),
        resetPassword: pick("auth.resetPassword.title"),
        verifyEmail: pick("auth.verifyEmail.title"),
        emailVerified: pick("auth.verifyEmail.success"),
        verifyingEmail: pick("auth.verifyEmail.subtitle"),
      },
      nav: {
        home: pick("common.nav.home"),
        about: pick("common.nav.aboutUs"),
        caregivers: pick("common.nav.findCaregivers"),
        findCaregivers: pick("common.nav.findCaregivers"),
        aboutUs: pick("common.nav.aboutUs"),
        howItWorks: pick("common.nav.howItWorks"),
        myTimetable: pick("common.nav.bookings"),
        myCare: pick("common.nav.bookings"),
        dashboard: pick("common.nav.dashboard"),
        profile: pick("common.nav.profile"),
        logout: pick("common.nav.logout"),
        login: pick("common.nav.login"),
        register: pick("common.nav.signup"),
        signUp: pick("common.nav.signup"),
      },
      hero: {
        title: pick("landing.hero.title"),
        titleHighlight: pick("landing.hero.titleHighlight", "common.nav.findCaregivers"),
        titleSuffix: pick("landing.hero.titleSuffix", "landing.hero.subtitle"),
        subtitle: pick("landing.hero.subtitle"),
        searchPlaceholder: pick(
          "landing.hero.searchPlaceholder",
          "common.common.search",
        ),
        searchButton: pick("landing.hero.searchButton", "common.common.search"),
      },
      categories: {
        childCare: pick("booking.serviceType.child_care"),
        seniorCare: pick("booking.serviceType.elderly_care"),
        medicalCare: pick("booking.serviceType.medical_care"),
        specialNeeds: pick("booking.serviceType.special_needs"),
      },
      trustBadges: {
        backgroundChecked: pick("landing.features.verified.title"),
        verifiedReviews: pick("landing.testimonials.title"),
        securePayments: pick("landing.features.secure.title"),
      },
      stats: {
        trustedCommunity: pick("landing.cta.title"),
        verifiedCaregivers: pick("landing.features.verified.title"),
        happyFamilies: pick("landing.cta.subtitle"),
        averageRating: pick("dashboard.stats.averageRating"),
      },
      sections: {
        browseCategories: pick("common.common.filter"),
        browseCategoriesSubtitle: pick("landing.features.title"),
        caregivers: pick("common.nav.findCaregivers"),
        featuredCaregivers: pick("landing.features.title"),
        featuredCaregiversSubtitle: pick("landing.testimonials.title"),
        reviews: pick("landing.testimonials.title"),
        available: pick("common.common.active"),
        simpleProcess: pick("landing.howItWorks.title"),
        howItWorks: pick("common.nav.howItWorks"),
        howItWorksSubtitle: pick("landing.howItWorks.title"),
      },
      howItWorks: {
        step1Title: pick("landing.howItWorks.step1.title"),
        step1Desc: pick("landing.howItWorks.step1.description"),
        step2Title: pick("landing.howItWorks.step2.title"),
        step2Desc: pick("landing.howItWorks.step2.description"),
        step3Title: pick("landing.howItWorks.step3.title"),
        step3Desc: pick("landing.howItWorks.step3.description"),
        step4Title: pick("landing.howItWorks.step4.title"),
        step4Desc: pick("landing.howItWorks.step4.description"),
      },
      cta: {
        title: pick("landing.cta.title"),
        subtitle: pick("landing.cta.subtitle"),
        button: pick("landing.cta.button"),
        browseCaregivers: pick("landing.hero.findCaregiver"),
        getStarted: pick("common.common.getStarted"),
        becomeCaregiver: pick("landing.hero.becomeCaregiver"),
      },
    };
  }, [resource]);

  const hybridT = useMemo(() => {
    const fn = (
      namespace: TranslationNamespace,
      key: string,
      params?: TranslationParams,
    ): string => {
      return tFunc(namespace, key, params);
    };

    Object.assign(fn, legacyT);
    return fn as LegacyTranslations & typeof fn;
  }, [legacyT, tFunc]);

  const translate = useCallback(
    (key: string, params?: TranslationParams): string => {
      const [namespace, ...segments] = key.split(".");
      if (!namespace || segments.length === 0 || !isKnownNamespace(namespace)) {
        return key;
      }

      return tFunc(namespace, segments.join("."), params);
    },
    [tFunc],
  );

  const currentLanguage = useMemo<LanguageInfo>(() => {
    const selected = SUPPORTED_LANGUAGES.find(
      (supported) => supported.code === language,
    );

    return (selected ?? SUPPORTED_LANGUAGES[0]) as LanguageInfo;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: hybridT,
        translate,
        languages: SUPPORTED_LANGUAGES as readonly LanguageInfo[],
        currentLanguage,
        isRTL,
        dir,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}

export default LanguageContext;
