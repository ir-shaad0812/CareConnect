'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks';
import { aiMatchService } from '@/services';
import type {
  AIMatchResult,
  AIMatchSearchParams,
  AIMatchFilters,
  SearchSuggestion,
} from '@/types/aiMatch.types';

// ─── Hook State ────────────────────────────────────────────────────
interface UseAISearchState {
  results: AIMatchResult[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  query: string;
  filters: AIMatchFilters;
  sortBy: string;
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  searchMeta: {
    interpretation?: string;
    concepts?: string[];
    confidence?: number;
  } | null;
  hasSearched: boolean;
}

type AIMatchFilterPatch = {
  [K in keyof AIMatchFilters]?: AIMatchFilters[K] | undefined;
};

const DEFAULT_FILTERS: AIMatchFilters = {
  serviceTypes: [],
  skills: [],
  certifications: [],
  languages: [],
  workPreferences: [],
  backgroundCheckRequired: false,
};

export function useAISearch() {
  const [state, setState] = useState<UseAISearchState>({
    results: [],
    total: 0,
    page: 1,
    totalPages: 0,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    query: '',
    filters: { ...DEFAULT_FILTERS },
    sortBy: 'match_score',
    suggestions: [],
    showSuggestions: false,
    searchMeta: null,
    hasSearched: false,
  });

  const debouncedQuery = useDebounce(state.query, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setState(prev => ({ ...prev, suggestions: [], showSuggestions: false }));
      return;
    }

    let cancelled = false;
    const fetchSuggestions = async () => {
      try {
        const suggestions = await aiMatchService.getSuggestions(debouncedQuery);
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            suggestions: Array.isArray(suggestions) ? suggestions : [],
            showSuggestions: true,
          }));
        }
      } catch {
        // Silently fail for suggestions
      }
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ─── Search ────────────────────────────────────────────────────
  const search = useCallback(async (pageOverride?: number) => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const currentPage = pageOverride || 1;
    setState(prev => ({
      ...prev,
      isLoading: currentPage === 1,
      isLoadingMore: currentPage > 1,
      error: null,
      page: currentPage,
      showSuggestions: false,
    }));

    try {
      const params: AIMatchSearchParams = {
        query: state.query,
        page: currentPage,
        limit: 12,
        sortBy: state.sortBy as import('@/types/aiMatch.types').AIMatchSortOption,
        filters: state.filters,
      };

      const data = await aiMatchService.search(params);

      setState(prev => ({
        ...prev,
        results: currentPage === 1 ? (data.results || []) : [...prev.results, ...(data.results || [])],
        total: data.pagination?.total ?? 0,
        page: data.pagination?.page ?? currentPage,
        totalPages: data.pagination?.pages ?? 0,
        searchMeta: data.query ? {
          interpretation: data.query.original,
          concepts: data.query.parsed?.serviceTypes || [],
          confidence: data.query.parsed?.confidence,
        } : null,
        isLoading: false,
        isLoadingMore: false,
        hasSearched: true,
      }));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        error: err instanceof Error ? err.message : 'Search failed. Please try again.',
      }));
    }
  }, [state.query, state.sortBy, state.filters]);

  // ─── Actions ───────────────────────────────────────────────────
  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));
  }, []);

  const setSortBy = useCallback((sortBy: string) => {
    setState(prev => ({ ...prev, sortBy }));
  }, []);

  const setFilters = useCallback((filters: AIMatchFilterPatch) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== undefined)
        ),
      },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: { ...DEFAULT_FILTERS },
    }));
  }, []);

  const loadMore = useCallback(() => {
    if (state.page < state.totalPages && !state.isLoadingMore) {
      search(state.page + 1);
    }
  }, [state.page, state.totalPages, state.isLoadingMore, search]);

  const setPage = useCallback((page: number) => {
    search(page);
  }, [search]);

  const selectSuggestion = useCallback((suggestion: string) => {
    setState(prev => ({ ...prev, query: suggestion, showSuggestions: false }));
  }, []);

  const hideSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, showSuggestions: false }));
  }, []);

  const trackInteraction = useCallback(async (caregiverId: string, action: import('@/types/aiMatch.types').InteractionAction | string) => {
    try {
      const allowed = new Set<import('@/types/aiMatch.types').InteractionAction>([
        "viewed",
        "shortlisted",
        "contacted",
        "booked",
        "reviewed",
        "removed",
        "profile_click",
      ]);

      // Back-compat for older UI event names
      const mappedAction =
        action === "chat_click" || action === "call_click"
          ? "contacted"
          : action === "book_click"
            ? "booked"
            : action;

      if (!allowed.has(mappedAction as import('@/types/aiMatch.types').InteractionAction)) return;

      await aiMatchService.trackInteraction({
        caregiverId,
        action: mappedAction as import('@/types/aiMatch.types').InteractionAction,
        metadata: {
          searchQuery: state.query,
          source: 'ai_search',
        },
      });
    } catch {
      // Silently fail for tracking
    }
  }, [state.query]);

  return {
    ...state,
    search,
    setQuery,
    setSortBy,
    setFilters,
    clearFilters,
    loadMore,
    setPage,
    selectSuggestion,
    hideSuggestions,
    trackInteraction,
  };
}
