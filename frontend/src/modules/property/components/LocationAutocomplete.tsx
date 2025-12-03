// ============================================
// LOCATION AUTOCOMPLETE COMPONENT
// Search input with address suggestions
// ============================================

'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/shared/lib';
import { useClickOutside } from '@/shared/hooks';
import { useLocationSearch } from '../hooks';
import type { LocationSuggestion } from '../types';

interface LocationAutocompleteProps {
  onSelect: (location: LocationSuggestion) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export function LocationAutocomplete({
  onSelect,
  placeholder = 'Search for an address...',
  className,
  initialValue = '',
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setQuery, suggestions, isSearching, clearSuggestions } = useLocationSearch();

  const containerRef = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false);
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setSelectedValue(value);
      setIsOpen(true);
    },
    [setQuery]
  );

  const handleSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      setSelectedValue(suggestion.displayName);
      setIsOpen(false);
      clearSuggestions();
      onSelect(suggestion);
    },
    [clearSuggestions, onSelect]
  );

  const handleClear = useCallback(() => {
    setSelectedValue('');
    setQuery('');
    clearSuggestions();
    inputRef.current?.focus();
  }, [clearSuggestions, setQuery]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={selectedValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300',
            'placeholder:text-gray-400 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            'transition-colors duration-200'
          )}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {selectedValue && !isSearching && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId || index}>
                <button
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{suggestion.displayName}</p>
                    {(suggestion.city || suggestion.state) && (
                      <p className="text-xs text-gray-500 truncate">
                        {[suggestion.city, suggestion.state, suggestion.country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
