// ============================================
// USE LOCATION SEARCH HOOK
// Address autocomplete with debouncing
// ============================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from '@/shared/hooks';
import { locationService } from '../services';
import type { LocationSuggestion } from '../types';

interface UseLocationSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  suggestions: LocationSuggestion[];
  isSearching: boolean;
  error: string | null;
  clearSuggestions: () => void;
}

export function useLocationSearch(debounceMs = 300): UseLocationSearchReturn {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      setError(null);

      try {
        const results = await locationService.searchAddress(debouncedQuery);
        setSuggestions(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isSearching,
    error,
    clearSuggestions,
  };
}
