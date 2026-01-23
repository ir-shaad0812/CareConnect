/**
 * Semantic Search Service
 * 
 * Provides natural language understanding for caregiver search.
 * Supports embedding-based semantic similarity when configured,
 * with a robust rule-based fallback that works without any external API.
 * 
 * Architecture:
 *   User Query → Parse & Expand → Concept Mapping → Filter Generation
 *                                                → Similarity Ranking
 *   → Apply Match Score → Final Sorted Results
 * 
 * Performance target: <1–2 seconds response time
 */

import { expandSearchTerms, RELATED_CONCEPTS, SKILL_SYNONYMS } from './matchEngine.service.js';

// ─── Concept Embeddings (lightweight TF-IDF-style vectors) ────────
// Pre-computed concept vectors for fast similarity matching
// Each concept has associated terms with weights
const CONCEPT_VECTORS = {
  dementia_care: {
    terms: { dementia: 1.0, alzheimer: 0.9, memory: 0.8, cognitive: 0.7, confusion: 0.6, elderly: 0.5, patience: 0.5, gentle: 0.4, medication: 0.3, supervision: 0.3 },
    label: 'Dementia & Memory Care',
  },
  alzheimers_care: {
    terms: { alzheimer: 1.0, dementia: 0.9, memory: 0.8, cognitive: 0.7, confusion: 0.6, elderly: 0.5, patience: 0.5, gentle: 0.4, medication: 0.3, wandering: 0.3 },
    label: "Alzheimer's Care",
  },
  elderly_care: {
    terms: { elderly: 1.0, senior: 0.9, aging: 0.8, old: 0.7, geriatric: 0.7, grandparent: 0.6, mobility: 0.5, companionship: 0.5, daily: 0.3, living: 0.3 },
    label: 'Elderly / Senior Care',
  },
  child_care: {
    terms: { child: 1.0, baby: 0.9, infant: 0.8, toddler: 0.8, kid: 0.7, nanny: 0.7, babysit: 0.7, pediatric: 0.6, school: 0.4, homework: 0.3 },
    label: 'Child Care',
  },
  special_needs: {
    terms: { special: 0.8, needs: 0.5, disability: 0.7, autism: 0.7, developmental: 0.6, therapy: 0.5, sensory: 0.4, behavioral: 0.4, adaptive: 0.3, inclusion: 0.3 },
    label: 'Special Needs Care',
  },
  disability_care: {
    terms: { disability: 1.0, disabled: 0.9, wheelchair: 0.7, mobility: 0.6, adaptive: 0.5, assistance: 0.5, physical: 0.4, occupational: 0.4, therapy: 0.3, accessible: 0.3 },
    label: 'Disability Care',
  },
  post_surgery: {
    terms: { surgery: 1.0, post: 0.5, operation: 0.8, recovery: 0.8, rehabilitation: 0.7, wound: 0.6, healing: 0.5, medical: 0.5, hospital: 0.4, discharge: 0.4 },
    label: 'Post-Surgery Recovery Care',
  },
  companionship: {
    terms: { companion: 1.0, companionship: 1.0, lonely: 0.7, social: 0.6, friend: 0.6, conversation: 0.5, emotional: 0.5, support: 0.4, activities: 0.4, outings: 0.3 },
    label: 'Companionship',
  },
  respite_care: {
    terms: { respite: 1.0, relief: 0.7, break: 0.6, temporary: 0.5, short: 0.4, caregiver: 0.4, family: 0.4, burnout: 0.3, substitute: 0.3, filling: 0.2 },
    label: 'Respite Care',
  },
  palliative_care: {
    terms: { palliative: 1.0, hospice: 0.8, end: 0.4, life: 0.3, comfort: 0.7, pain: 0.6, terminal: 0.6, dignity: 0.5, quality: 0.4, symptom: 0.4 },
    label: 'Palliative / Hospice Care',
  },
  mobility_assistance: {
    terms: { mobility: 1.0, walking: 0.7, wheelchair: 0.7, transfer: 0.6, balance: 0.6, fall: 0.5, prevention: 0.4, physical: 0.4, exercise: 0.3, stairs: 0.3 },
    label: 'Mobility Assistance',
  },
  medication_management: {
    terms: { medication: 1.0, medicine: 0.9, pill: 0.7, prescription: 0.7, dosage: 0.6, pharmacy: 0.5, drug: 0.4, schedule: 0.4, reminder: 0.3, compliance: 0.3 },
    label: 'Medication Management',
  },
  meal_preparation: {
    terms: { meal: 1.0, cooking: 0.9, food: 0.8, nutrition: 0.7, diet: 0.7, kitchen: 0.5, breakfast: 0.4, lunch: 0.4, dinner: 0.4, dietary: 0.4 },
    label: 'Meal Preparation',
  },
  personal_hygiene: {
    terms: { hygiene: 1.0, bathing: 0.9, grooming: 0.8, shower: 0.7, dressing: 0.7, toileting: 0.7, personal: 0.5, care: 0.3, clean: 0.3, oral: 0.3 },
    label: 'Personal Hygiene Assistance',
  },
  transportation: {
    terms: { transport: 1.0, driving: 0.9, ride: 0.7, appointment: 0.6, errand: 0.6, car: 0.5, vehicle: 0.5, pickup: 0.4, drop: 0.3, commute: 0.3 },
    label: 'Transportation Services',
  },
};

// ─── Trait / Quality keywords → caregiver attributes ───────────────
const QUALITY_MAPPINGS = {
  gentle: { attribute: 'skills', values: ['patience', 'empathy', 'gentle care', 'compassionate'] },
  patient: { attribute: 'skills', values: ['patience', 'calm demeanor', 'understanding'] },
  experienced: { attribute: 'minExperience', value: 5 },
  certified: { attribute: 'requireCertification', value: true },
  verified: { attribute: 'requireVerified', value: true },
  affordable: { attribute: 'sortPreference', value: 'price_low' },
  cheap: { attribute: 'sortPreference', value: 'price_low' },
  nearby: { attribute: 'maxDistance', value: 5 },
  close: { attribute: 'maxDistance', value: 5 },
  immediate: { attribute: 'urgency', value: 'immediate' },
  urgent: { attribute: 'urgency', value: 'immediate' },
  asap: { attribute: 'urgency', value: 'immediate' },
  weekend: { attribute: 'workPreferences', values: ['weekends'] },
  overnight: { attribute: 'workPreferences', values: ['overnight'] },
  'live-in': { attribute: 'workPreferences', values: ['live_in'] },
  'full-time': { attribute: 'workPreferences', values: ['full_time'] },
  'part-time': { attribute: 'workPreferences', values: ['part_time'] },
  female: { attribute: 'preferredGender', value: 'female' },
  male: { attribute: 'preferredGender', value: 'male' },
  bilingual: { attribute: 'requireLanguages', value: true },
};

class SemanticSearchService {
  /**
   * Parse a natural language query into structured search criteria
   * 
   * @param {string} query - Natural language search input
   * @returns {Object} Structured search criteria
   */
  parseQuery(query) {
    if (!query || typeof query !== 'string') {
      return { serviceTypes: [], skills: [], filters: {}, concepts: [], confidence: 0 };
    }

    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/[\s,;.!?]+/).filter(Boolean);

    // 1. Concept similarity matching
    const conceptScores = this._computeConceptSimilarity(words);

    // 2. Service type expansion from matchEngine
    const expanded = expandSearchTerms(normalizedQuery);

    // 3. Extract quality/trait filters
    const qualityFilters = this._extractQualityFilters(words);

    // 4. Merge results
    const serviceTypes = new Set([
      ...expanded.serviceTypes,
      ...conceptScores
        .filter(c => c.score >= 0.3)
        .map(c => c.concept),
    ]);

    const skills = new Set([
      ...expanded.skills,
      ...(qualityFilters.skills || []),
    ]);

    // 5. Confidence score (how well we understood the query)
    const confidence = this._computeConfidence(words, conceptScores, expanded);

    return {
      serviceTypes: [...serviceTypes],
      skills: [...skills],
      filters: qualityFilters.filters,
      concepts: conceptScores.filter(c => c.score >= 0.2).map(c => ({
        concept: c.concept,
        label: CONCEPT_VECTORS[c.concept]?.label || c.concept,
        score: Math.round(c.score * 100),
      })),
      matchedTerms: expanded.matchedConcepts,
      confidence: Math.round(confidence * 100),
      originalQuery: query,
    };
  }

  /**
   * Compute cosine-style similarity between query words and concept vectors
   * @private
   */
  _computeConceptSimilarity(words) {
    const scores = [];

    for (const [concept, vector] of Object.entries(CONCEPT_VECTORS)) {
      let matchScore = 0;
      let maxPossible = 0;

      for (const [term, weight] of Object.entries(vector.terms)) {
        maxPossible += weight;
        for (const word of words) {
          // Exact or partial match
          if (word === term || term.startsWith(word) || word.startsWith(term)) {
            matchScore += weight;
          } else if (this._levenshteinDistance(word, term) <= 2 && word.length >= 4) {
            // Fuzzy match for typos
            matchScore += weight * 0.6;
          }
        }
      }

      const normalizedScore = maxPossible > 0 ? matchScore / maxPossible : 0;
      if (normalizedScore > 0) {
        scores.push({ concept, score: Math.min(1, normalizedScore) });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    return scores;
  }

  /**
   * Extract quality filters from natural language
   * @private
   */
  _extractQualityFilters(words) {
    const filters = {};
    const skills = [];

    for (const word of words) {
      for (const [keyword, mapping] of Object.entries(QUALITY_MAPPINGS)) {
        if (word === keyword || word.includes(keyword) || keyword.includes(word)) {
          if (mapping.attribute === 'skills') {
            skills.push(...(mapping.values || []));
          } else if (mapping.attribute === 'workPreferences') {
            filters.workPreferences = [
              ...(filters.workPreferences || []),
              ...(mapping.values || []),
            ];
          } else if (mapping.values) {
            filters[mapping.attribute] = mapping.values;
          } else {
            filters[mapping.attribute] = mapping.value;
          }
        }
      }
    }

    return { filters, skills };
  }

  /**
   * Compute confidence score for query understanding
   * @private
   */
  _computeConfidence(words, conceptScores, expanded) {
    if (words.length === 0) return 0;

    let matchedWordCount = 0;

    // Count words that matched something
    for (const word of words) {
      const matched =
        conceptScores.some(c => c.score > 0) ||
        expanded.matchedConcepts.some(m => m.term === word) ||
        Object.keys(QUALITY_MAPPINGS).some(k => k.includes(word) || word.includes(k)) ||
        ['for', 'a', 'an', 'the', 'my', 'i', 'need', 'want', 'looking', 'find', 'someone', 'who', 'can', 'with', 'and', 'or'].includes(word);

      if (matched) matchedWordCount++;
    }

    return matchedWordCount / words.length;
  }

  /**
   * Levenshtein distance for fuzzy matching
   * @private
   */
  _levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Generate search suggestions based on partial input
   */
  getSuggestions(partialQuery) {
    if (!partialQuery || partialQuery.length < 2) return [];

    const lower = partialQuery.toLowerCase();
    const suggestions = [];

    // Concept label matches
    for (const [, vector] of Object.entries(CONCEPT_VECTORS)) {
      if (vector.label.toLowerCase().includes(lower)) {
        suggestions.push({
          text: vector.label,
          type: 'service',
        });
      }
    }

    // Concept term matches
    for (const [concept, vector] of Object.entries(CONCEPT_VECTORS)) {
      for (const term of Object.keys(vector.terms)) {
        if (term.includes(lower) && !suggestions.some(s => s.text === vector.label)) {
          suggestions.push({
            text: vector.label,
            type: 'service',
            matchedTerm: term,
          });
        }
      }
    }

    // Quality keyword matches
    for (const keyword of Object.keys(QUALITY_MAPPINGS)) {
      if (keyword.includes(lower)) {
        suggestions.push({
          text: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          type: 'filter',
        });
      }
    }

    // Example queries
    const exampleQueries = [
      'Need someone gentle for Alzheimer\'s patient',
      'Experienced elderly care with medical background',
      'Affordable child care on weekends',
      'Overnight care for post-surgery recovery',
      'Certified dementia care specialist',
      'Part-time companion for elderly parent',
      'Immediate care for disability assistance',
      'Female caregiver for personal hygiene help',
    ];

    for (const example of exampleQueries) {
      if (example.toLowerCase().includes(lower)) {
        suggestions.push({ text: example, type: 'example' });
      }
    }

    return suggestions.slice(0, 8);
  }
}

export default new SemanticSearchService();
export { CONCEPT_VECTORS, QUALITY_MAPPINGS };
