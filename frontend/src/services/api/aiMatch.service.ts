/**
 * AI Match API Service
 * 
 * Frontend service for the AI-powered caregiver matching system.
 * Interfaces with /api/ai-match/* endpoints.
 */

import { apiClient } from './client';
import type {
  AIMatchSearchParams,
  AIMatchSearchResponse,
  AIMatchResult,
  SearchSuggestion,
  AIMatchPreferences,
  TrackInteractionParams,
} from '@/types/aiMatch.types';

class AIMatchService {
  private readonly basePath = '/ai-match';

  /**
   * AI-powered caregiver search
   * Supports natural language queries and structured filters
   */
  async search(params: AIMatchSearchParams): Promise<AIMatchSearchResponse> {
    const response = await apiClient.post<AIMatchSearchResponse>(
      `${this.basePath}/search`,
      params
    );

    if (!response.success || !response.data) {
      throw new Error('Search failed');
    }

    return response.data;
  }

  /**
   * Get match score for a specific caregiver
   */
  async getMatchScore(caregiverId: string): Promise<{
    caregiverId: string;
    matchScore: number;
    breakdown: AIMatchResult['breakdown'];
    reasons: string[];
    category: string;
  }> {
    const response = await apiClient.get<{
      caregiverId: string;
      matchScore: number;
      breakdown: AIMatchResult['breakdown'];
      reasons: string[];
      category: string;
    }>(`${this.basePath}/score/${caregiverId}`);
    if (!response.success || !response.data) {
      throw new Error('Failed to get match score');
    }
    return response.data;
  }

  /**
   * Get search autocomplete suggestions
   */
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    const response = await apiClient.get<{ suggestions: SearchSuggestion[] }>(
      `${this.basePath}/suggestions?q=${encodeURIComponent(query)}`
    );
    return response.data?.suggestions || [];
  }

  /**
   * Track user interaction with a caregiver
   */
  async trackInteraction(params: TrackInteractionParams): Promise<void> {
    await apiClient.post(`${this.basePath}/track`, params);
  }

  /**
   * Get user's AI match preferences
   */
  async getPreferences(): Promise<AIMatchPreferences> {
    const response = await apiClient.get<AIMatchPreferences>(
      `${this.basePath}/preferences`
    );
    if (!response.success || !response.data) {
      throw new Error('Failed to get preferences');
    }
    return response.data;
  }

  /**
   * Update user's AI match preferences
   */
  async updatePreferences(prefs: Partial<AIMatchPreferences>): Promise<AIMatchPreferences> {
    const response = await apiClient.put<AIMatchPreferences>(
      `${this.basePath}/preferences`,
      prefs
    );
    if (!response.success || !response.data) {
      throw new Error('Failed to update preferences');
    }
    return response.data;
  }
}

export const aiMatchService = new AIMatchService();
export default aiMatchService;
