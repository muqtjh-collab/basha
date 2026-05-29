/**
  * Formats a USD amount stored in cents.
  * Example: 100050 -> 1,000.50 $
  */
export const formatUSD = (cents: number | null | undefined): string => {
  if (cents === null || cents === undefined) return '-';
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
  return `${formatted} $`;
};

/**
  * Formats an IQD amount stored in fils.
  * Example: 1500000000 -> 1,500,000 د.ع
  */
export const formatIQD = (fils: number | null | undefined, useArabicDigits = false): string => {
  if (fils === null || fils === undefined) return '-';
  const dinars = Math.round(fils / 1000);
  
  // Format with thousand separators
  const formatted = new Intl.NumberFormat(useArabicDigits ? 'ar-IQ' : 'en-US', {
    useGrouping: true,
  }).format(dinars);
  
  return `${formatted} د.ع`;
};
