import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOnniSpeechPitch,
  getSpeechRecognitionCtor,
  isOnniVoiceSupported,
  ONNI_STORAGE_KEYS,
  parseOnniWakePhrase,
  pickOnniSpanishVoice,
} from "@/lib/onniVoice";
import { isDesktopWebBrowser, isOnniAndroidVoice } from "@/lib/deviceDetection";
import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";

type UseOnniVoiceOptions = {
  enabled: boolean;
  speakEnabled: boolean;
  onWake: (command: string, rawTranscript: string) => void;
  onWakeWithoutCommand?: () => void;
  onError?: (message: string) => void;
};

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "1" || v === "true";
  } catch {
    return fallback;
  }
}

function readListenEnabledDefault(): boolean {
  if (isOnniAndroidVoice()) return false;
  if (isDesktopWebBrowser()) {
    const desktop = localStorage.getItem(ONNI_STORAGE_KEYS.listenDesktop);
    // Una copia rota guardó "0" sin UI para reactivarlo; restaurar escucha en PC.
    if (desktop === "0") {
      try {
        localStorage.setItem(ONNI_STORAGE_KEYS.listenDesktop, "1");
      } catch {
        /* ignore */
      }
      return true;
    }
    if (desktop !== null) return desktop === "1" || desktop === "true";
    const legacy = localStorage.getItem(ONNI_STORAGE_KEYS.listen);
    if (legacy !== null) return legacy === "1" || legacy === "true";
    return true;
  }
  return readBool(ONNI_STORAGE_KEYS.listen, false);
}

function resolveListenStorageKey(): string | null {
  if (isOnniAndroidVoice()) return null;
  if (isDesktopWebBrowser()) return ONNI_STORAGE_KEYS.listenDesktop;
  return ONNI_STORAGE_KEYS.listen;
}

export function useOnniVoicePrefs() {
  const [listenEnabled, setListenEnabled] = useState(readListenEnabledDefault);
  const [speakEnabled, setSpeakEnabled] = useState(() => readBool(ONNI_STORAGE_KEYS.speak, true));

  useEffect(() => {
    const key = resolveListenStorageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, listenEnabled ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [listenEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(ONNI_STORAGE_KEYS.speak, speakEnabled ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [speakEnabled]);

  return { listenEnabled, setListenEnabled, speakEnabled, setSpeakEnabled };
}

const WAKE_REPEAT_COOLDOWN_MS = 2_500;
/** Tras TTS de Onni, no procesar wake (evita que el mic oiga a Onni y repita). */
const SPEAK_END_BUFFER_MS = 700;

export function useOnniVoice({ enabled, speakEnabled, onWake, onWakeWithoutCommand, onError }: UseOnniVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastHandledRef = useRef("");
  const lastHandledAtRef = useRef(0);
  const speakPauseUntilRef = useRef(0);
  const enabledRef = useRef(enabled);
  const callbacksRef = useRef({ onWake, onWakeWithoutCommand, onError });

  enabledRef.current = enabled;
  callbacksRef.current = { onWake, onWakeWithoutCommand, onError };

  const supported = isOnniVoiceSupported();

  const loadVoices = useCallback(() => {
    if (!supported) return;
    const voices = window.speechSynthesis.getVoices();
    voiceRef.current = pickOnniSpanishVoice(voices);
  }, [supported]);

  useEffect(() => {
    loadVoices();
    if (!supported) return;
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [loadVoices, supported]);

  useEffect(() => {
    const onSpeakEnd = () => {
      speakPauseUntilRef.current = Date.now() + SPEAK_END_BUFFER_MS;
    };
    window.addEventListener("voice:speak-end", onSpeakEnd);
    return () => window.removeEventListener("voice:speak-end", onSpeakEnd);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || !supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/\n+/g, ". "));
      utterance.lang = voiceRef.current?.lang ?? "es-CO";
      utterance.rate = 0.96;
      utterance.pitch = getOnniSpeechPitch(voiceRef.current);
      utterance.volume = 1;
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [speakEnabled, supported],
  );

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!enabledRef.current || !supported) return;
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return;
    if (Date.now() < speakPauseUntilRef.current) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      callbacksRef.current.onError?.("Tu navegador no soporta comandos de voz.");
      return;
    }

    stopListening();

    const recognition = new Ctor();
    recognition.lang = "es-CO";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript ?? "";
      }
      const trimmed = transcript.trim();
      if (!trimmed) return;

      const lastIdx = event.results.length - 1;
      const isFinal = event.results[lastIdx]?.isFinal ?? false;
      if (!isFinal) return;

      if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return;
      if (Date.now() < speakPauseUntilRef.current) return;

      setLastHeard(trimmed);
      const { heard, command } = parseOnniWakePhrase(trimmed);
      if (!heard) return;

      const signature = `${command}|${trimmed}`;
      const now = Date.now();
      if (
        signature === lastHandledRef.current &&
        now - lastHandledAtRef.current < WAKE_REPEAT_COOLDOWN_MS
      ) {
        return;
      }
      lastHandledRef.current = signature;
      lastHandledAtRef.current = now;
      speakPauseUntilRef.current = Date.now() + 120_000;

      if (!command) {
        callbacksRef.current.onWakeWithoutCommand?.();
        return;
      }

      callbacksRef.current.onWake(command, trimmed);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        callbacksRef.current.onError?.(onniMicDeniedMessage());
        stopListening();
        return;
      }
      if (event.error === "aborted" || event.error === "no-speech") return;
      if (event.error === "audio-capture") {
        callbacksRef.current.onError?.("No pude captar audio. Revisa que el micrófono esté conectado.");
        return;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (!enabledRef.current) return;
      const delay =
        typeof window !== "undefined" && window.speechSynthesis?.speaking
          ? 600
          : Math.max(450, speakPauseUntilRef.current - Date.now());
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current) startListening();
      }, delay);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current) startListening();
      }, 800);
    }
  }, [stopListening, supported]);

  useEffect(() => {
    if (!enabled || !supported) {
      stopListening();
      return undefined;
    }

    let cancelled = false;
    void requestOnniMicrophoneAccess().then((permission) => {
      if (cancelled) return;
      if (permission === "denied") {
        callbacksRef.current.onError?.(onniMicDeniedMessage());
        stopListening();
        return;
      }
      if (permission === "unsupported") {
        callbacksRef.current.onError?.("Micrófono no disponible en este navegador.");
        stopListening();
        return;
      }
      startListening();
    });

    return () => {
      cancelled = true;
      stopListening();
    };
  }, [enabled, supported, startListening, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  return {
    supported,
    isListening,
    isSpeaking,
    lastHeard,
    speak,
    stopListening,
    startListening,
  };
}
