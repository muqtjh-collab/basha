/**
 * Formats a date string or object to an Arabic locale representation.
 * Example: "2026-05-28T00:00:00" -> "٢٨‏/٥‏/٢٠٢٦"
 */
export const formatDate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).format(date);
};

/**
 * Formats a date to include time as well.
 * Example: "2026-05-28T14:30:00" -> "٢٨‏/٥‏/٢٠٢٦ ٢:٣٠ م"
 */
export const formatDateTime = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

/**
 * Returns a relative time string in Arabic.
 * Example: "منذ دقيقتين", "منذ ساعة"
 */
export const formatRelativeTime = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return 'الآن';
  } else if (diffMin === 1) {
    return 'منذ دقيقة';
  } else if (diffMin === 2) {
    return 'منذ دقيقتين';
  } else if (diffMin < 11) {
    return `منذ ${diffMin} دقائق`;
  } else if (diffMin < 60) {
    return `منذ ${diffMin} دقيقة`;
  } else if (diffHr === 1) {
    return 'منذ ساعة';
  } else if (diffHr === 2) {
    return 'منذ ساعتين';
  } else if (diffHr < 11) {
    return `منذ ${diffHr} ساعات`;
  } else if (diffHr < 24) {
    return `منذ ${diffHr} ساعة`;
  } else if (diffDays === 1) {
    return 'منذ يوم';
  } else if (diffDays === 2) {
    return 'منذ يومين';
  } else if (diffDays < 11) {
    return `منذ ${diffDays} أيام`;
  } else {
    return formatDate(date);
  }
};
