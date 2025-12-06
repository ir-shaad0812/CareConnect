// ============================================
// DATE FORMATTING UTILITIES
// ============================================

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date, formatStr = 'MMM d, yyyy'): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return 'Invalid date';
  return format(parsed, formatStr);
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return 'Invalid date';
  return formatDistanceToNow(parsed, { addSuffix: true });
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
  return formatDate(date, 'h:mm a');
}

/**
 * Format for input fields (yyyy-MM-dd)
 */
export function formatDateInput(date: string | Date): string {
  return formatDate(date, 'yyyy-MM-dd');
}
