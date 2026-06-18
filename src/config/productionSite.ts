/** Dominio canónico de producción (SEO, auth, deep links web). */
export const PRODUCTION_HOST = "onnivers.online";
export const PRODUCTION_WWW_HOST = `www.${PRODUCTION_HOST}`;
export const PRODUCTION_SITE_URL = `https://${PRODUCTION_HOST}`;
export const PRODUCTION_WWW_SITE_URL = `https://${PRODUCTION_WWW_HOST}`;
export const OFFICIAL_CONTACT_EMAIL = "gerencia@onnivers.online";

export function isProductionWebHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === PRODUCTION_HOST || h === PRODUCTION_WWW_HOST;
}

export function isLocalDevHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

export function isAllowedWebDeepLinkHost(host: string): boolean {
  return isProductionWebHost(host) || isLocalDevHost(host);
}
