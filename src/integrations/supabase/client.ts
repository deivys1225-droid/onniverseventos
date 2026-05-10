import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * URL y clave publishable del proyecto (públicas en el navegador).
 * Sobrescribe con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env`.
 * Para enlaces de correo (confirmación / recuperación), define también `VITE_SITE_URL` (p. ej. https://onniverso.com).
 */
const PROJECT_DEFAULT_URL = "https://rwyhakcsvdbsavignogh.supabase.co";
const PROJECT_DEFAULT_PUBLISHABLE_KEY =
  "sb_publishable_cVkZfMul6QDuFIzVlgtaaA_C-2wcGju";

function trimEnv(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const t = String(value)
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .trim();
  return t === "" ? undefined : t;
}

function normalizeSupabaseUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  const noTrail = t.replace(/\/+$/, "");
  if (!/^https:\/\//i.test(noTrail)) {
    return `https://${noTrail.replace(/^\/+/, "")}`;
  }
  return noTrail;
}

const envUrl =
  trimEnv(import.meta.env.VITE_SUPABASE_URL) ?? trimEnv(import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined);
const envKey =
  trimEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ??
  trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY) ??
  trimEnv(import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  trimEnv(import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined);

const hasCustomUrl = Boolean(envUrl);
const hasCustomKey = Boolean(envKey);

export const supabasePublicUrl = hasCustomUrl ? normalizeSupabaseUrl(envUrl!) : PROJECT_DEFAULT_URL;
const url = supabasePublicUrl;
export const supabasePublishableKey = hasCustomKey ? envKey! : PROJECT_DEFAULT_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(url, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
    detectSessionInUrl: true,
  },
});
