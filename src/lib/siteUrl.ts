import {
  PRODUCTION_SITE_URL,
  isLocalDevHost,
  isSharedSupabaseWebHost,
} from "@/config/productionSite";

/**
 * URL del sitio donde está el usuario (para OAuth redirectTo, emails, etc.).
 * En navegador usa el origen actual (onnivers.com u onnivers.online).
 * En build SSR/Vercel usa VITE_SITE_URL (p. ej. https://onnivers.online).
 *
 * Supabase Site URL en el dashboard sigue siendo https://onnivers.com;
 * onnivers.online solo necesita estar en Redirect URLs.
 */
function normalizeUrl(raw: string): string {
  const t = raw.trim().replace(/\/+$/, "");
  if (!t) return PRODUCTION_SITE_URL;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

function siteUrlFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  if (isSharedSupabaseWebHost(host) || isLocalDevHost(host)) {
    return window.location.origin;
  }
  return null;
}

export function getSiteUrl(): string {
  const fromBrowser = siteUrlFromBrowser();
  if (fromBrowser) return fromBrowser;

  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv?.trim()) {
    return normalizeUrl(fromEnv);
  }
  return PRODUCTION_SITE_URL;
}
