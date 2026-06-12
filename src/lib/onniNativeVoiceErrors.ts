/** Códigos Android SpeechRecognizer (numéricos) y mapOnniSpeechError (texto). */
const NATIVE_SOFT_CODES = new Set([
  "no_match",
  "speech_timeout",
  "busy",
  "client",
  "network",
  "network_timeout",
  "2",
  "5",
  "1",
  "8",
  "start_failed",
  "empty_audio",
]);

export function normalizeNativeVoiceErrorCode(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string") return raw.trim().toLowerCase();
  return "";
}

export function isNativeVoiceSoftError(code: string): boolean {
  return NATIVE_SOFT_CODES.has(code);
}

/** Mensaje claro para el usuario; null = reintentar en silencio. */
export function formatNativeVoiceErrorMessage(code: string, fallback?: string): string | null {
  switch (code) {
    case "2":
    case "network":
      return "Sin internet para reconocer voz. Conéctate a Wi‑Fi o datos e inténtalo de nuevo.";
    case "1":
    case "network_timeout":
      return "La red tardó demasiado. Revisa tu conexión e inténtalo otra vez.";
    case "5":
    case "client":
    case "8":
    case "busy":
    case "no_match":
    case "7":
    case "speech_timeout":
    case "6":
    case "start_failed":
      return null;
    case "9":
    case "permission_denied":
      return "Activa el micrófono: Ajustes → Apps → OnniVers → Permisos → Micrófono.";
    case "not_available":
      return (
        fallback?.trim() ||
        "Activa el reconocimiento de voz en español: Configuración → Hora e idioma → Voz."
      );
    case "4":
    case "server":
      return "El servicio de voz no respondió. Inténtalo en unos segundos.";
    case "audio":
      return "No se pudo captar audio. Revisa que ninguna otra app use el micrófono.";
    case "stt_failed":
      return fallback?.trim() || "No pude entender tu voz. Inténtalo otra vez.";
    case "empty_audio":
      return fallback?.trim() || null;
    default:
      if (fallback?.trim()) return fallback.trim();
      return code ? `No pude escuchar (${code}). Intenta de nuevo.` : "No pude escuchar. Intenta de nuevo.";
  }
}

export function parseNativeVoiceErrorDetail(detail: unknown): { code: string; message: string | null } {
  if (typeof detail === "number" && Number.isFinite(detail)) {
    const code = String(detail);
    return { code, message: formatNativeVoiceErrorMessage(code) };
  }

  if (typeof detail === "string") {
    const trimmed = detail.trim();
    const errorNumber = trimmed.match(/^error\s*(\d+)$/i);
    if (errorNumber) {
      const code = errorNumber[1];
      return { code, message: formatNativeVoiceErrorMessage(code) };
    }
    const asCode = normalizeNativeVoiceErrorCode(trimmed);
    if (/^\d+$/.test(asCode)) {
      return { code: asCode, message: formatNativeVoiceErrorMessage(asCode) };
    }
    return { code: "", message: trimmed || null };
  }

  if (detail && typeof detail === "object") {
    const payload = detail as { message?: unknown; code?: unknown };
    const code = normalizeNativeVoiceErrorCode(payload.code);
    const rawMessage = typeof payload.message === "string" ? payload.message.trim() : "";
    const mapped = formatNativeVoiceErrorMessage(code, rawMessage);
    if (rawMessage && mapped === null) {
      return { code, message: rawMessage };
    }
    return { code, message: mapped };
  }

  return { code: "", message: "No se pudo activar la voz nativa en este momento." };
}

/** Oculta códigos internos tipo «Error 5» en el chat. */
export function shouldShowNativeVoiceError(message: string | null | undefined): message is string {
  if (!message?.trim()) return false;
  if (/^error\s*\d+$/i.test(message.trim())) return false;
  return true;
}
