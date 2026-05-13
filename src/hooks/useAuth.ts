import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ensureProfileRowForUser } from "@/lib/profile";
import { clearLocalUser, isLocalUser, readLocalUser } from "@/lib/localAuth";

/**
 * Cap maximo de espera para `supabase.auth.getSession()` durante el arranque.
 * Si la red no responde (modo offline / WebView sin internet), liberamos el splash
 * "Conectando…" en este plazo para que el resto de la app pueda renderizar.
 */
const AUTH_BOOT_TIMEOUT_MS = 1500;

/**
 * Lee la sesión Supabase persistida en localStorage de forma SÍNCRONA, sin tocar la red.
 * Supabase v2 guarda el blob en una clave `sb-<project-ref>-auth-token` (o similar).
 * Si encontramos un `user` válido, lo usamos como estado inicial para que el splash
 * "Conectando..." no aparezca cuando ya hay sesión en disco. Una refresh posterior vía
 * `onAuthStateChange` corrige el estado si la sesión fue revocada server-side.
 */
function readPersistedSupabaseUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as
        | { user?: User; currentSession?: { user?: User } }
        | null;
      const candidate = parsed?.user ?? parsed?.currentSession?.user;
      if (candidate && typeof candidate.id === "string" && candidate.id.length > 0) {
        return candidate;
      }
    }
  } catch {
    /* ignore: storage corrupto, clave parcial, modo privado, etc. */
  }
  return null;
}

/**
 * Estado inicial síncrono: Supabase persistido primero, usuario local como fallback.
 * Devuelve `null` si no hay nada → `PrivateRoute` redirige a `/entrar`.
 */
function readInitialUser(): User | null {
  return readPersistedSupabaseUser() ?? readLocalUser();
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => readInitialUser());
  // Si ya tenemos usuario síncrono → no mostramos splash. Si no hay nada, mostramos splash
  // breve mientras Supabase confirma (con timeout) y/o aparece el flujo `/entrar`.
  const [loading, setLoading] = useState<boolean>(() => readInitialUser() === null);

  useEffect(() => {
    let resolved = readInitialUser() !== null;

    const syncProfile = (sessionUser: User | null) => {
      if (!sessionUser) return;
      if (isLocalUser(sessionUser)) return; // los usuarios locales no tocan Supabase
      void ensureProfileRowForUser(sessionUser).catch((err) => {
        console.warn("[profiles] ensureProfileRowForUser:", err);
      });
    };

    const finalize = (nextUser: User | null) => {
      if (resolved) return;
      resolved = true;
      setUser(nextUser);
      setLoading(false);
      syncProfile(nextUser);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      if (sessionUser) {
        // Si recibimos una sesión Supabase real, descartamos cualquier usuario local previo
        // para evitar dos identidades simultáneas.
        clearLocalUser();
        setUser(sessionUser);
        if (!resolved) {
          resolved = true;
          setLoading(false);
        }
        syncProfile(sessionUser);
        return;
      }
      // Sin sesión Supabase: respetar el usuario local si existe (no desautenticar).
      const fallback = readLocalUser();
      if (fallback) {
        setUser((prev) => prev ?? fallback);
      } else {
        setUser(null);
      }
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const sessionUser = session?.user ?? null;
        if (sessionUser) {
          clearLocalUser();
          finalize(sessionUser);
        } else {
          finalize(readLocalUser());
        }
      })
      .catch(() => finalize(readLocalUser()));

    // Red-offline safety net: libera el splash aunque Supabase no responda.
    const timeoutHandle = window.setTimeout(() => finalize(readLocalUser()), AUTH_BOOT_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutHandle);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign out unificado: limpia sesión Supabase (si hay) Y el usuario local (si hay).
   * Sin red, `supabase.auth.signOut()` puede fallar — capturamos para no bloquear el flujo.
   */
  const signOut = useCallback(async () => {
    clearLocalUser();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[auth] supabase.signOut falló (probablemente offline):", err);
    }
    setUser(null);
  }, []);

  return { user, loading, isLocalUser: isLocalUser(user), signOut };
};
