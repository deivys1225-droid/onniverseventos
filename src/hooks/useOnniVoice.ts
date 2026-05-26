import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSpeechRecognitionCtor,
  isOnniVoiceSupported,
  ONNI_STORAGE_KEYS,
  parseOnniWakePhrase,
  pickOnniSpanishVoice,
} from "@/lib/onniVoice";

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

export function useOnniVoicePrefs() {
  const [listenEnabled, setListenEnabled] = useState(() => readBool(ONNI_STORAGE_KEYS.listen, true));
  const [speakEnabled, setSpeakEnabled] = useState(() => readBool(ONNI_STORAGE_KEYS.speak, true));

  useEffect(() => {
    try {
      localStorage.setItem(ONNI_STORAGE_KEYS.listen, listenEnabled ? "1" : "0");
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

export function useOnniVoice({ enabled, speakEnabled, onWake, onWakeWithoutCommand, onError }: UseOnniVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastHandledRef = useRef("");
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

  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || !supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/\n+/g, ". "));
      utterance.lang = voiceRef.current?.lang ?? "es-CO";
      utterance.rate = 0.96;
      utterance.pitch = 1.02;
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
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (!transcript.trim()) return;

      setLastHeard(transcript.trim());
      const { heard, command } = parseOnniWakePhrase(transcript);
      if (!heard) return;

      const signature = `${command}|${transcript}`;
      if (signature === lastHandledRef.current) return;
      lastHandledRef.current = signature;

      if (!command) {
        callbacksRef.current.onWakeWithoutCommand?.();
        return;
      }

      callbacksRef.current.onWake(command, transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        callbacksRef.current.onError?.("Activa el micrófono para que Onni te escuche.");
        stopListening();
        return;
      }
      if (event.error === "aborted") return;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (!enabledRef.current) return;
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current) startListening();
      }, 450);
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
    if (enabled && supported) {
      startListening();
      return () => stopListening();
    }
    stopListening();
    return undefined;
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
