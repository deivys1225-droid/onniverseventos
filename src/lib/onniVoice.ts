/** Palabras de activación (orden: más específicas primero). */
export const ONNI_WAKE_WORDS = ["onni", "hony", "honi", "oni", "ono", "ony"] as const;

const WAKE_WORD_RE = new RegExp(`\\b(${ONNI_WAKE_WORDS.join("|")})\\b`, "i");

/** Saludos + nombre: «hola onni», «oye oni», etc. */
const GREETING_WAKE_RE = new RegExp(
  `\\b(hola|oye|hey|buenas)(?:\\s+(?:buenos dias|buenas tardes|buenas noches))?\\s+(${ONNI_WAKE_WORDS.join("|")})\\b(?:\\s+(.+))?$`,
  "i",
);

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

/** Corrige errores típicos de Whisper al transcribir «Onni». */
export function normalizeWhisperWakeText(input: string): string {
  let text = normalizeVoiceText(input);
  const replacements: Array<[RegExp, string]> = [
    [/\bhola?\s+only\b/g, "hola onni"],
    [/\bhola?\s+uni\b/g, "hola onni"],
    [/\bhola?\s+omni\b/g, "hola onni"],
    [/\boye\s+only\b/g, "oye onni"],
    [/\boye\s+uni\b/g, "oye onni"],
    [/\bhony\b/g, "onni"],
    [/\bhoni\b/g, "onni"],
    [/\boh ni\b/g, "onni"],
    [/\bo ni\b/g, "onni"],
  ];
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export function parseOnniWakePhrase(transcript: string): { heard: boolean; command: string } {
  const text = normalizeWhisperWakeText(transcript);

  const greetingHit = text.match(GREETING_WAKE_RE);
  if (greetingHit) {
    return { heard: true, command: (greetingHit[3] ?? "").trim() };
  }

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

const FEMALE_VOICE_PATTERNS: RegExp[] = [
  /salome|helena|sabina|elvira|laura|maria|lucia|sofia|paloma|valentina|dalia|paulina|esmeralda/i,
  /female|woman|mujer|femenin/i,
];

const MALE_VOICE_PATTERNS: RegExp[] = [
  /\b(raul|pablo|jorge|diego|alvaro|enrique|tomas|male|hombre|masculin)\b/i,
];

const SPANISH_LANG_PREFERENCE: RegExp[] = [
  /es[-_]co/i,
  /es[-_]mx/i,
  /es[-_]us/i,
  /es[-_]es/i,
];

function voiceBlob(voice: SpeechSynthesisVoice): string {
  return `${voice.name} ${voice.voiceURI} ${voice.lang}`.toLowerCase();
}

function isSpanishVoice(voice: SpeechSynthesisVoice): boolean {
  const blob = voiceBlob(voice);
  return voice.lang.toLowerCase().startsWith("es") || /espa[nñ]ol|spanish/.test(blob);
}

function isLikelyFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const blob = voiceBlob(voice);
  return FEMALE_VOICE_PATTERNS.some((re) => re.test(blob));
}

function isLikelyMaleVoice(voice: SpeechSynthesisVoice): boolean {
  const blob = voiceBlob(voice);
  return MALE_VOICE_PATTERNS.some((re) => re.test(blob));
}

function pickByLangPreference(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const re of SPANISH_LANG_PREFERENCE) {
    const hit = voices.find((v) => re.test(v.lang) || re.test(v.name));
    if (hit) return hit;
  }
  return voices[0] ?? null;
}

export function pickOnniSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const spanish = voices.filter(isSpanishVoice);
  if (spanish.length === 0) return null;

  const femaleSpanish = spanish.filter((v) => isLikelyFemaleVoice(v) && !isLikelyMaleVoice(v));
  const femalePick = pickByLangPreference(femaleSpanish);
  if (femalePick) return femalePick;

  const nonMaleSpanish = spanish.filter((v) => !isLikelyMaleVoice(v));
  const neutralPick = pickByLangPreference(nonMaleSpanish);
  if (neutralPick) return neutralPick;

  return pickByLangPreference(spanish);
}

/** Tono ligeramente más alto solo si la voz no es claramente femenina. */
export function getOnniSpeechPitch(voice: SpeechSynthesisVoice | null): number {
  if (!voice) return 1.05;
  if (isLikelyFemaleVoice(voice) && !isLikelyMaleVoice(voice)) return 1;
  return 1.08;
}

export const ONNI_STORAGE_KEYS = {
  listen: "onniverso.onni.listen",
  /** Escucha «Hola Onni» en Chrome/Edge PC — separado del celular. */
  listenDesktop: "onniverso.onni.listen.desktop",
  speak: "onniverso.onni.speak",
} as const;
