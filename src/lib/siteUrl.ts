/**
 * URL canónica del sitio para enlaces de Supabase Auth (confirmación de correo, recuperación).
 * Debe coincidir con Auth → URL Configuration en el dashboard (Site URL + Redirect URLs).
 *
 * Producción: define `VITE_SITE_URL=https://onniverso.com` en el entorno de build.
 * En desarrollo local, si no hay env, se usa `window.location.origin`.
 */
const PRODUCTION_SITE = "https://onniverso.com";

function normalizeUrl(raw: string): string {
  const t = raw.trim().replace(/\/+$/, "");
  if (!t) return PRODUCTION_SITE;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

export function getSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv?.trim()) {
    return normalizeUrl(fromEnv);
  }
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return window.location.origin;
  }
  return PRODUCTION_SITE;
}
