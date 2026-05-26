/**
 * URL canónica del sitio para enlaces de Supabase Auth (confirmación de correo, recuperación).
 * Debe coincidir con Auth → URL Configuration en el dashboard (Site URL + Redirect URLs).
 *
 * Producción: define `VITE_SITE_URL=https://onnivers.com` en el entorno de build (Vercel).
 * En desarrollo local, si no hay env, se usa `window.location.origin`.
 */
const PRODUCTION_SITE = "https://onnivers.com";

function normalizeUrl(raw: string): string {
  const t = raw.trim().replace(/\/+$/, "");
  if (!t) return PRODUCTION_SITE;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

function siteUrlFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  if (
    host === "onnivers.com" ||
    host === "www.onnivers.com" ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
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
  return PRODUCTION_SITE;
}
