// ============================================
// CURRENCY & NUMBER FORMATTING
// ============================================

const CURRENCY_CONFIG = {
  symbol: 'Rs.',
  locale: 'en-NP',
  decimalPlaces: 0,
};

/**
 * Format number as currency (NPR)
 */
export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return `${CURRENCY_CONFIG.symbol} 0`;
  return `${CURRENCY_CONFIG.symbol} ${amount.toLocaleString(CURRENCY_CONFIG.locale, {
    minimumFractionDigits: CURRENCY_CONFIG.decimalPlaces,
    maximumFractionDigits: CURRENCY_CONFIG.decimalPlaces,
  })}`;
}

/**
 * Format currency with rate type
 */
export function formatRate(amount: number, type: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'hourly'): string {
  const suffixes = {
    hourly: '/hr',
    daily: '/day',
    weekly: '/week',
    monthly: '/month',
  };
  return `${formatCurrency(amount)}${suffixes[type]}`;
}

/**
 * Format large numbers with K/M suffix
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}
