import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Proyecto demo solo para que la app compile si faltan env.
 * El login real SIEMPRE requiere VITE_SUPABASE_URL + clave publishable en .env o Vercel.
 */
const FALLBACK_URL = "https://demo.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function normalizeSupabaseUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  const noTrail = t.replace(/\/+$/, "");
  if (!/^https:\/\//i.test(noTrail)) {
    return `https://${noTrail.replace(/^\/+/, "")}`;
  }
  return noTrail;
}

const envUrlRaw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKeyRaw =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

const hasCustomUrl = typeof envUrlRaw === "string" && envUrlRaw.trim() !== "";
const hasCustomKey = typeof envKeyRaw === "string" && envKeyRaw.trim() !== "";

/** True cuando hay URL y clave propias del proyecto (no modo demo). */
export const isSupabaseConfigured = hasCustomUrl && hasCustomKey;

const url = hasCustomUrl ? normalizeSupabaseUrl(envUrlRaw!) : FALLBACK_URL;
const key = hasCustomKey ? envKeyRaw!.trim() : FALLBACK_KEY;

if (import.meta.env.DEV && !isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] Sin VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY: usando proyecto demo; el login con tu cuenta no funcionará. Crea .env en la raíz del proyecto (ver .env.example).",
  );
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
    detectSessionInUrl: true,
  },
});
