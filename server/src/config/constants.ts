export const TOKEN_EXPIRY = {
  ACCESS: 15 * 60, // 15 minutes in seconds
  REFRESH: 7 * 24 * 60 * 60, // 7 days in seconds
  REFRESH_MS: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export const FILE_LIMITS = {
  IMAGE: 10 * 1024 * 1024,      // 10MB
  PDF: 20 * 1024 * 1024,        // 20MB
  VIDEO: 100 * 1024 * 1024,     // 100MB
};

export const ALLOWED_MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  PDF: ['application/pdf'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'],
};
