import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Si no hay `.env` / variables en Vercel, usamos la URL y la clave publishable del proyecto.
 * (La clave es pública en el navegador por diseño; la service_role nunca va aquí.)
 * Puedes sobreescribir con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
 */
const PROJECT_DEFAULT_URL = "https://rwyhakcsvdbsavignogh.supabase.co";
const PROJECT_DEFAULT_PUBLISHABLE_KEY =
  "sb_publishable_cVkZfMul6QDuFIzVlgtaaA_C-2wcGju";

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

const url = hasCustomUrl ? normalizeSupabaseUrl(envUrlRaw!) : PROJECT_DEFAULT_URL;
const key = hasCustomKey ? envKeyRaw!.trim() : PROJECT_DEFAULT_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
    detectSessionInUrl: true,
  },
});
