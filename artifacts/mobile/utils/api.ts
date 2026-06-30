/**
 * Constructs the base API URL for the API server.
 * Defaults to the local API server used during development.
 */
export function getApiUrl(path: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (baseUrl) {
    return baseUrl.replace(/\/+$/, "") + path;
  }

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
