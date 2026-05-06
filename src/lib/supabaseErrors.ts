/** Mensajes claros para fallos de red / configuración de Supabase (sin exponer datos sensibles). */
export function formatSupabaseAuthError(err: unknown): string {
  const raw =
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : err instanceof Error
        ? err.message
        : "";

  const lower = raw.toLowerCase();

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed")
  ) {
    return "No se pudo conectar con Supabase. Comprueba internet y que en Vercel (o un archivo .env local) estén bien VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.";
  }

  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password")) {
    return "Correo o contraseña incorrectos.";
  }

  if (raw) return raw;
  return "Algo salió mal. Intenta de nuevo.";
}
