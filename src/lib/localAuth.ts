import type { User } from "@supabase/supabase-js";

/**
 * Sesión local "offline-first": permite entrar a la app (Tierra, Lobby, Mi Mundo) sin
 * pasar por Supabase / onniverso.com. Útil cuando:
 *   - El usuario quiere usar la app sin conexión y nunca creó cuenta.
 *   - El dispositivo está offline en el primer arranque tras instalar el APK.
 *
 * El usuario local es 100% privado al dispositivo: vive en `localStorage`. Las features
 * que requieren red (Supabase profiles, Agora streaming, PayPal, Storage) simplemente
 * fallarán con sus errores normales (try/catch ya presentes); el cuerpo offline de la
 * app (escena Tierra/Luna, lobby NeonRoom, scroll de tienda) funciona sin red.
 */

export const LOCAL_USER_STORAGE_KEY = "onniverso.local_user.v1";

/** Discriminador que añadimos a `user_metadata` para reconocer al usuario local en runtime. */
const LOCAL_USER_METADATA_FLAG = "onniverso_local_user";

/** Una sesión local cumple la forma mínima de `User` de Supabase para no romper consumidores. */
export type LocalUser = User & {
  user_metadata: {
    full_name: string;
    [LOCAL_USER_METADATA_FLAG]: true;
  };
};

function safeRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** `local-...` es nuestro prefijo reservado para distinguir sin parsear el JSON. */
export function isLocalUserId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("local-");
}

export function isLocalUser(user: User | null | undefined): user is LocalUser {
  if (!user) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return meta[LOCAL_USER_METADATA_FLAG] === true || isLocalUserId(user.id);
}

export function readLocalUser(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalUser> | null;
    if (!parsed || typeof parsed.id !== "string" || !isLocalUserId(parsed.id)) return null;
    return parsed as LocalUser;
  } catch {
    return null;
  }
}

export function persistLocalUser(user: LocalUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* quota / private mode: ignore — la app sigue usable en memoria */
  }
}

export function clearLocalUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function createLocalUser(displayName?: string): LocalUser {
  const now = new Date().toISOString();
  const cleanName = (displayName ?? "").trim() || "Explorador VR";
  const user: LocalUser = {
    id: `local-${safeRandomId()}`,
    aud: "local",
    role: "authenticated",
    email: undefined,
    phone: undefined,
    app_metadata: { provider: "local", providers: ["local"] },
    user_metadata: {
      full_name: cleanName,
      [LOCAL_USER_METADATA_FLAG]: true,
    },
    created_at: now,
    updated_at: now,
    confirmed_at: now,
    email_confirmed_at: undefined,
    last_sign_in_at: now,
    identities: [],
    is_anonymous: true,
    factors: [],
  } as LocalUser;

  persistLocalUser(user);
  return user;
}
