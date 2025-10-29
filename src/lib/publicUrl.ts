export const getPublicBaseUrl = (): string => {
  // Check if VITE_PUBLIC_SITE_URL is set in environment
  const envUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Fallback: Use current origin (works when already on public site)
  return window.location.origin;
};
