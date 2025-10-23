export const getPublicBaseUrl = (): string => {
  // Prefer env if provided at build time
  const envUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  // If on Lovable preview/staging, use the live public domain
  const host = typeof window !== 'undefined' ? window.location.host : '';
  if (host.includes('lovableproject.com')) {
    return 'https://getkeystate.com';
  }

  // Fallback: Use current origin (works when already on public site)
  return typeof window !== 'undefined' ? window.location.origin : '';
};
