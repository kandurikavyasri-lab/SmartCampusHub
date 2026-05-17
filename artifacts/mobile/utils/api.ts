/**
 * Constructs the base API URL for the API server.
 * Uses EXPO_PUBLIC_DOMAIN (= $REPLIT_DEV_DOMAIN) injected by the dev script.
 * Falls back to hostname manipulation for web when the env var is absent.
 */
export function getApiUrl(path: string): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}${path}`;
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    // In Replit Expo web, strip the 'expo.' subdomain part
    const hostname = window.location.hostname.replace(/^[^.]+\.expo\./, "");
    return `https://${hostname}${path}`;
  }
  return `http://localhost:5000${path}`;
}
