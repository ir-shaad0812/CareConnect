'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context';
import type { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { authService } from '@/modules/auth/services';

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
  variant?: 'navbar' | 'dropdown' | 'inline';
}

type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export function LanguageSwitcher({
  compact = false,
  className = '',
  variant = 'dropdown',
}: LanguageSwitcherProps) {
  const { language, setLanguage, languages, translate } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage =
    languages.find((item) => item.code === language) ?? languages[0];

  const selectLanguageLabel =
    translate('common.language.select') || 'common.language.select';
  const changeLanguageLabel =
    translate('common.language.changeLanguage') || 'common.language.changeLanguage';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const changeLanguage = useCallback(
    async (langCode: SupportedLanguageCode) => {
      if (langCode === language) {
        setIsOpen(false);
        return;
      }

      setIsUpdating(true);

      try {
        setLanguage(langCode);

        try {
          const user = authService.getCurrentUser();
          if (user) {
            await authService.updatePreferredLanguage(langCode);
          }
        } catch {
          // User profile sync is best-effort.
        }
      } catch (error) {
        console.error('Failed to change language:', error);
      } finally {
        setIsUpdating(false);
        setIsOpen(false);
      }
    },
    [language, setLanguage],
  );

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code as SupportedLanguageCode)}
            disabled={isUpdating}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              language === lang.code
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`flex items-center gap-2 transition-all ${
          variant === 'navbar'
            ? 'p-2 text-gray-600 hover:bg-gray-100 rounded-lg'
            : 'px-3 py-2 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-sm'
        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={changeLanguageLabel}
      >
        <Globe size={18} className="text-gray-500" />

        {!compact && currentLanguage && (
          <>
            <span className="text-sm font-medium text-gray-700">
              {currentLanguage.name}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}

        {isUpdating && (
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
            role="listbox"
            aria-label={selectLanguageLabel}
          >
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {selectLanguageLabel}
              </p>
            </div>

            <div className="py-1">
              {languages.map((lang) => {
                const isSelected = language === lang.code;

                return (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code as SupportedLanguageCode)}
                    role="option"
                    aria-selected={isSelected}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                      isSelected
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${lang.rtl ? 'font-arabic' : ''}`}>
                        {lang.flag}
                      </span>

                      <div
                        className={`flex flex-col items-start ${lang.rtl ? 'font-arabic' : ''}`}
                      >
                        <span className="text-sm font-medium">{lang.name}</span>
                        <span className="text-xs text-gray-400">{lang.code.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {lang.rtl && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                          RTL
                        </span>
                      )}
                      {isSelected && (
                        <Check size={16} className="text-primary-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-400 text-center">
                {changeLanguageLabel}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LanguageSwitcher;
