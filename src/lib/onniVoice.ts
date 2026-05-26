/** Palabra de activación: Onni u Oni (voz a veces omite la doble ene). */
const WAKE_WORD_RE = /\b(onni|oni)\b/i;

export function normalizeVoiceText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseOnniWakePhrase(transcript: string): { heard: boolean; command: string } {
  const text = normalizeVoiceText(transcript);
  const match = text.match(WAKE_WORD_RE);
  if (!match || match.index === undefined) {
    return { heard: false, command: "" };
  }
  const afterWake = text.slice(match.index + match[0].length).trim();
  return { heard: true, command: afterWake };
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isOnniVoiceSupported(): boolean {
  return getSpeechRecognitionCtor() !== null && typeof window !== "undefined" && "speechSynthesis" in window;
}

const VOICE_PREFERENCE: RegExp[] = [
  /google.*espa[nñ]ol/i,
  /microsoft.*(helena|sabina|elvira|raul)/i,
  /es[-_]co/i,
  /es[-_]mx/i,
  /es[-_]us/i,
  /^spanish/i,
  /\bes\b/i,
];

export function pickOnniSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const re of VOICE_PREFERENCE) {
    const hit = voices.find((v) => re.test(v.name) || re.test(v.lang));
    if (hit) return hit;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("es")) ?? null;
}

export const ONNI_STORAGE_KEYS = {
  listen: "onniverso.onni.listen",
  speak: "onniverso.onni.speak",
} as const;
