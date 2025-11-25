// ============================================
// LOCATION-BASED PRICING — Frontend mirror of backend constants
// ============================================

export interface PricingRule {
  min: number;
  max: number;
  currency: string;
  label: string;
}

export const LOCATION_PRICING: Record<string, PricingRule> = {
  Kathmandu:    { min: 150, max: 500, currency: 'NPR', label: 'Kathmandu' },
  Lalitpur:     { min: 150, max: 500, currency: 'NPR', label: 'Lalitpur' },
  Bhaktapur:    { min: 120, max: 450, currency: 'NPR', label: 'Bhaktapur' },
  Pokhara:      { min: 120, max: 400, currency: 'NPR', label: 'Pokhara' },
  Gorkha:       { min: 100, max: 300, currency: 'NPR', label: 'Gorkha' },
  Butwal:       { min: 100, max: 350, currency: 'NPR', label: 'Butwal' },
  Bhairahawa:   { min: 100, max: 350, currency: 'NPR', label: 'Bhairahawa' },
  Janakpur:     { min: 80,  max: 280, currency: 'NPR', label: 'Janakpur' },
  Birgunj:      { min: 80,  max: 280, currency: 'NPR', label: 'Birgunj' },
  Biratnagar:   { min: 100, max: 350, currency: 'NPR', label: 'Biratnagar' },
  Dharan:       { min: 90,  max: 300, currency: 'NPR', label: 'Dharan' },
  Itahari:      { min: 80,  max: 280, currency: 'NPR', label: 'Itahari' },
  Dhangadhi:    { min: 80,  max: 280, currency: 'NPR', label: 'Dhangadhi' },
  Mahendranagar:{ min: 80,  max: 280, currency: 'NPR', label: 'Mahendranagar' },
  default:      { min: 80,  max: 500, currency: 'NPR', label: 'Nepal' },
};

export function getPricingForCity(city = ''): PricingRule {
  const key = Object.keys(LOCATION_PRICING).find(
    k => k.toLowerCase() === city.trim().toLowerCase()
  );
  return LOCATION_PRICING[key ?? 'default'];
}

export function validateRate(rate: number, city = ''): { valid: boolean; min: number; max: number; message: string | null } {
  const rules = getPricingForCity(city);
  if (rate < rules.min) return { valid: false, min: rules.min, max: rules.max, message: `Minimum rate in ${rules.label} is Rs. ${rules.min}/hr` };
  if (rate > rules.max) return { valid: false, min: rules.min, max: rules.max, message: `Maximum rate in ${rules.label} is Rs. ${rules.max}/hr` };
  return { valid: true, min: rules.min, max: rules.max, message: null };
}

export function suggestRate(opts: { city?: string; experienceYears?: number; averageRating?: number; reviewCount?: number } = {}): { suggested: number; min: number; max: number; currency: string; city: string } {
  const { city = '', experienceYears = 0, averageRating = 0, reviewCount = 0 } = opts;
  const rules = getPricingForCity(city);
  const range = rules.max - rules.min;
  const expScore = Math.min(experienceYears / 10, 1);
  const ratingScore = averageRating > 0 ? (averageRating - 1) / 4 : 0;
  const demandBonus = reviewCount >= 20 ? 0.1 : reviewCount >= 10 ? 0.05 : 0;
  const compositeScore = expScore * 0.5 + ratingScore * 0.4 + demandBonus;
  const suggested = Math.round(rules.min + range * compositeScore);
  return { suggested: Math.min(Math.max(suggested, rules.min), rules.max), min: rules.min, max: rules.max, currency: rules.currency, city: rules.label };
}

export function formatNPR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-NP')}`;
}

export const NEPAL_CITIES = Object.keys(LOCATION_PRICING).filter(k => k !== 'default');
