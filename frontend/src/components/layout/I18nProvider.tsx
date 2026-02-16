'use client';

/**
 * I18n Provider Component
 * Wraps the app with i18next provider and handles RTL/LTR direction
 */

import { useEffect, useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { applyDirection } from '@/lib/i18n';

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    // Wait for i18n to initialize
    if (!i18n.isInitialized) {
      i18n.on('initialized', () => {
        setIsInitialized(true);
        applyDirection(i18n.language);
      });
    } else {
      applyDirection(i18n.language);
    }

    // Cleanup
    return () => {
      i18n.off('initialized');
    };
  }, []);

  // Show loading state while i18n initializes
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}

export default I18nProvider;
