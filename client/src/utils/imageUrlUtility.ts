// ========================================
// 🔧 IMAGE URL UTILITY
// ========================================

/**
 * Converts an absolute backend URL to a relative path for proxied requests
 * In development: uses Vite proxy (/uploads/...)
 * In production: uses absolute backend URL or CDN
 */
export const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) return '';

  // If already a relative path, return as-is
  if (imagePath.startsWith('/')) {
    return imagePath;
  }

  // If it's a full backend URL, convert to relative path
  if (imagePath.includes('localhost:5000')) {
    return imagePath.replace(/^https?:\/\/[^/]+/, '');
  }

  if (imagePath.startsWith('http://')) {
    // Production absolute URL - return as-is
    return imagePath;
  }

  if (imagePath.startsWith('https://')) {
    // CDN or external URL - return as-is
    return imagePath;
  }

  // Assume it's a relative path without leading slash
  return `/${imagePath}`;
};

/**
 * Gets the backend base URL
 * For image uploads and API requests
 */
export const getBackendBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  // Check environment variable
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // In development (localhost), use relative paths via Vite proxy
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }

  // In production, use absolute URL
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
};

/**
 * Constructs full image URL for display
 */
export const buildImageUrl = (imagePath: string | undefined): string => {
  return getImageUrl(imagePath);
};

/**
 * Checks if a URL is valid and accessible
 */
export const isValidImageUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  
  try {
    new URL(url, window.location.origin);
    return true;
  } catch {
    return url.startsWith('/');
  }
};