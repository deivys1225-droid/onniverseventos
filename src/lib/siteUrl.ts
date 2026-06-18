import {
  PRODUCTION_SITE_URL,
  isLocalDevHost,
  isProductionWebHost,
} from "@/config/productionSite";

/**
 * URL canónica del sitio para enlaces de Supabase Auth (confirmación de correo, recuperación).
 * Debe coincidir con Auth → URL Configuration en el dashboard (Site URL + Redirect URLs).
 *
 * Producción: define `VITE_SITE_URL=https://onnivers.online` en el entorno de build (Vercel).
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
  if (isProductionWebHost(host) || isLocalDevHost(host)) {
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
