// ============================================
// LOCATION-BASED PRICING CONSTANTS — Nepal
// Central source of truth for min/max hourly rates per city.
// Used in: profile validation, booking creation, search filters.
// ============================================

export const LOCATION_PRICING = {
  // Bagmati Province
  Kathmandu:   { min: 150, max: 500, currency: 'NPR', label: 'Kathmandu' },
  Lalitpur:    { min: 150, max: 500, currency: 'NPR', label: 'Lalitpur' },
  Bhaktapur:   { min: 120, max: 450, currency: 'NPR', label: 'Bhaktapur' },
  // Gandaki Province
  Pokhara:     { min: 120, max: 400, currency: 'NPR', label: 'Pokhara' },
  Gorkha:      { min: 100, max: 300, currency: 'NPR', label: 'Gorkha' },
  // Lumbini Province
  Butwal:      { min: 100, max: 350, currency: 'NPR', label: 'Butwal' },
  Bhairahawa:  { min: 100, max: 350, currency: 'NPR', label: 'Bhairahawa' },
  // Madhesh Province
  Janakpur:    { min: 80,  max: 280, currency: 'NPR', label: 'Janakpur' },
  Birgunj:     { min: 80,  max: 280, currency: 'NPR', label: 'Birgunj' },
  // Koshi Province
  Biratnagar:  { min: 100, max: 350, currency: 'NPR', label: 'Biratnagar' },
  Dharan:      { min: 90,  max: 300, currency: 'NPR', label: 'Dharan' },
  Itahari:     { min: 80,  max: 280, currency: 'NPR', label: 'Itahari' },
  // Sudurpashchim Province
  Dhangadhi:   { min: 80,  max: 280, currency: 'NPR', label: 'Dhangadhi' },
  Mahendranagar: { min: 80, max: 280, currency: 'NPR', label: 'Mahendranagar' },
  // Default fallback
  default:     { min: 80,  max: 500, currency: 'NPR', label: 'Nepal' },
};

/**
 * Return pricing rules for a given city.
 * Case-insensitive match; falls back to default.
 */
export function getPricingForCity(city = '') {
  const key = Object.keys(LOCATION_PRICING).find(
    k => k.toLowerCase() === city.trim().toLowerCase()
  );
  return LOCATION_PRICING[key] ?? LOCATION_PRICING.default;
}

/**
 * Validate a rate against the pricing rules for a city.
 * Returns { valid, min, max, message }.
 */
export function validateRate(rate, city = '') {
  const rules = getPricingForCity(city);
  if (rate < rules.min) {
    return {
      valid: false,
      min: rules.min,
      max: rules.max,
      message: `Minimum rate in ${rules.label} is Rs. ${rules.min}/hr`,
    };
  }
  if (rate > rules.max) {
    return {
      valid: false,
      min: rules.min,
      max: rules.max,
      message: `Maximum rate in ${rules.label} is Rs. ${rules.max}/hr`,
    };
  }
  return { valid: true, min: rules.min, max: rules.max, message: null };
}

/**
 * Smart pricing suggestion based on experience + rating + demand.
 * Returns a suggested hourly rate within city limits.
 */
export function suggestRate({ city = '', experienceYears = 0, averageRating = 0, reviewCount = 0 } = {}) {
  const rules = getPricingForCity(city);
  const range = rules.max - rules.min;

  // Score 0–1 from experience (caps at 10 years = full credit)
  const expScore = Math.min(experienceYears / 10, 1);

  // Score 0–1 from rating (0–5 stars)
  const ratingScore = averageRating > 0 ? (averageRating - 1) / 4 : 0;

  // Demand bonus — small uplift for caregivers with many reviews
  const demandBonus = reviewCount >= 20 ? 0.1 : reviewCount >= 10 ? 0.05 : 0;

  const compositeScore = expScore * 0.5 + ratingScore * 0.4 + demandBonus;
  const suggested = Math.round(rules.min + range * compositeScore);

  return {
    suggested: Math.min(Math.max(suggested, rules.min), rules.max),
    min: rules.min,
    max: rules.max,
    currency: rules.currency,
    city: rules.label,
  };
}

export const PLATFORM_COMMISSION_PCT = 10; // 10% platform fee
