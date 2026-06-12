import { isDesktopWebBrowser, isOnniAndroidVoice } from "@/lib/deviceDetection";
import { speakWithAzureVoice, stopAzureVoice } from "@/lib/onniAzureTts";
import { isOnniVoiceSupported, getOnniSpeechPitch, pickOnniSpanishVoice } from "@/lib/onniVoice";

export type OnniVoiceMode = "web" | "native" | "none";

export type OnniSpeakOptions = {
  /** Respuesta generada por Gemini — usa Azure TTS en Android. */
  fromGemini?: boolean;
};

const ONNI_AZURE_TTS_MIN_LINES = 3;

const ONNI_VOICE_USE_NATIVE_KEY = "onniverso.onni.voiceUseNative";

type NativeVoiceBridge = {
  startListening?: () => void;
  stopListening?: () => void;
  speak?: (text: string) => void;
  stopSpeaking?: () => void;
};

export function getNativeVoiceBridge(): NativeVoiceBridge | null {
  if (typeof window === "undefined") return null;
  const android = window.Android;
  if (android && (typeof android.startListening === "function" || typeof android.speak === "function")) {
    return android;
  }
  const bridge = window.AndroidBridge as NativeVoiceBridge | undefined;
  if (bridge && (typeof bridge.startListening === "function" || typeof bridge.speak === "function")) {
    return bridge;
  }
  return null;
}

export function isNativeVoiceAvailable(): boolean {
  const native = getNativeVoiceBridge();
  return typeof native?.speak === "function" && typeof native?.startListening === "function";
}

export function prefersNativeVoiceFallback(): boolean {
  try {
    return sessionStorage.getItem(ONNI_VOICE_USE_NATIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPreferNativeVoice(): void {
  if (isDesktopWebBrowser()) return;
  try {
    sessionStorage.setItem(ONNI_VOICE_USE_NATIVE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function getOnniVoiceMode(): OnniVoiceMode {
  if (isDesktopWebBrowser()) {
    return isOnniVoiceSupported() ? "web" : "none";
  }
  if (isNativeVoiceAvailable()) return "native";
  if (isOnniVoiceSupported()) return "web";
  return "none";
}

export function startNativeVoiceListening(): boolean {
  const bridge = getNativeVoiceBridge();
  if (typeof bridge?.startListening !== "function") return false;
  try {
    bridge.startListening();
    return true;
  } catch {
    return false;
  }
}

export function stopNativeVoiceListening(): void {
  try {
    getNativeVoiceBridge()?.stopListening?.();
  } catch {
    /* ignore */
  }
}

let cachedWebVoice: SpeechSynthesisVoice | null = null;

function ensureWebSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return cachedWebVoice;
  cachedWebVoice = pickOnniSpanishVoice(voices);
  return cachedWebVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    ensureWebSpanishVoice();
  };
}

export function speakWithWebVoice(text: string, onFailed?: () => void): boolean {
  if (!isOnniVoiceSupported() || !text.trim()) return false;
  const clean = text.replace(/\n+/g, ". ").trim();
  if (!clean) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = ensureWebSpanishVoice();
  utterance.lang = voice?.lang ?? "es-CO";
  utterance.rate = 1;
  utterance.pitch = getOnniSpeechPitch(voice);
  utterance.volume = 1;
  if (voice) utterance.voice = voice;
  const signalDone = () => {
    window.dispatchEvent(new CustomEvent("voice:speak-end"));
  };
  utterance.onend = signalDone;
  utterance.onerror = () => {
    onFailed?.();
    signalDone();
  };
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopWebVoice(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakWithNativeVoice(text: string): boolean {
  const bridge = getNativeVoiceBridge();
  if (typeof bridge?.speak !== "function") return false;
  try {
    bridge.stopSpeaking?.();
    bridge.speak(text);
    return true;
  } catch {
    return false;
  }
}

export function stopOnniSpokenVoice(): void {
  stopWebVoice();
  stopAzureVoice();
  try {
    getNativeVoiceBridge()?.stopSpeaking?.();
  } catch {
    /* ignore */
  }
}

function countOnniAnswerLines(text: string): number {
  return text
    .trim()
    .split(/\n+/)
    .filter((line) => line.trim().length > 0).length;
}

/** Android: Azure solo para Gemini o respuestas largas (>2 líneas); lo demás va nativo. */
export function shouldUseAzureTtsOnAndroid(text: string, options?: OnniSpeakOptions): boolean {
  if (options?.fromGemini) return true;
  return countOnniAnswerLines(text) >= ONNI_AZURE_TTS_MIN_LINES;
}

export function speakOnniAnswer(
  text: string,
  mode: OnniVoiceMode,
  onPreferNative?: () => void,
  options?: OnniSpeakOptions,
): boolean {
  if (mode === "native" && isOnniAndroidVoice() && text.trim()) {
    stopOnniSpokenVoice();
    if (shouldUseAzureTtsOnAndroid(text, options)) {
      void speakWithAzureVoice(text);
    } else {
      speakWithNativeVoice(text);
    }
    return true;
  }
  if (mode === "web") {
    if (isDesktopWebBrowser()) {
      return speakWithWebVoice(text);
    }
    const fallback = () => {
      if (!isNativeVoiceAvailable()) return;
      markPreferNativeVoice();
      onPreferNative?.();
      speakWithNativeVoice(text);
    };
    const started = speakWithWebVoice(text, fallback);
    if (!started && isNativeVoiceAvailable()) {
      fallback();
      return true;
    }
    return started;
  }
  if (mode === "native") return speakWithNativeVoice(text);
  return false;
}
