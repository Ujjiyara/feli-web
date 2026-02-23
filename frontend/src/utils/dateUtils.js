/**
 * Date formatting utilities
 * Dates are stored as local time values with UTC suffix,
 * so we display them in UTC to show the original picked time.
 */

const DISPLAY_TIMEZONE = 'UTC';

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: DISPLAY_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateShort = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: DISPLAY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', {
    timeZone: DISPLAY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', {
    timeZone: DISPLAY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
