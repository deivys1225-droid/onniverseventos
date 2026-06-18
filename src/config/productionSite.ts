/**
 * Dos dominios, un mismo Supabase (rwyhakcsvdbsavignogh):
 * - onnivers.com  → plataforma original (Site URL en Supabase Auth; no cambiar)
 * - onnivers.online → este deploy (SEO + Vercel); solo Redirect URLs extra en Supabase
 */

/** Plataforma original: Site URL fija en Supabase Dashboard → Authentication. */
export const PRIMARY_PLATFORM_HOST = "onnivers.com";
export const PRIMARY_PLATFORM_WWW_HOST = "www.onnivers.com";
export const PRIMARY_AUTH_SITE_URL = `https://${PRIMARY_PLATFORM_HOST}`;

/** Este deploy (Vercel / indexación Google). */
export const PRODUCTION_HOST = "onnivers.online";
export const PRODUCTION_WWW_HOST = `www.${PRODUCTION_HOST}`;
export const PRODUCTION_SITE_URL = `https://${PRODUCTION_HOST}`;
export const PRODUCTION_WWW_SITE_URL = `https://${PRODUCTION_WWW_HOST}`;

export const OFFICIAL_CONTACT_EMAIL = "gerencia@onnivers.online";

export function isPrimaryPlatformHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === PRIMARY_PLATFORM_HOST || h === PRIMARY_PLATFORM_WWW_HOST;
}

export function isProductionWebHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === PRODUCTION_HOST || h === PRODUCTION_WWW_HOST;
}

/** Cualquier dominio web que comparte la misma sesión Supabase. */
export function isSharedSupabaseWebHost(host: string): boolean {
  return isPrimaryPlatformHost(host) || isProductionWebHost(host);
}

export function isLocalDevHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

export function isAllowedWebDeepLinkHost(host: string): boolean {
  return isSharedSupabaseWebHost(host) || isLocalDevHost(host);
}
