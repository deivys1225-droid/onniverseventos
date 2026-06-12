import { getSpeechRecognitionCtor } from "@/lib/onniVoice";

export type WebVoiceCaptureHandlers = {
  onStart?: () => void;
  onPartial?: (transcript: string) => void;
  onFinal?: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

export function startWebVoiceCapture(handlers: WebVoiceCaptureHandlers): (() => void) | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    handlers.onError?.("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
    return null;
  }

  let stopped = false;
  let recognition: SpeechRecognition | null = null;

  const stop = () => {
    stopped = true;
    recognition?.stop();
    recognition = null;
  };

  recognition = new Ctor();
  recognition.lang = "es-CO";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => handlers.onStart?.();

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const chunk = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) finalText += chunk;
      else interim += chunk;
    }
    const combined = `${finalText}${interim}`.trim();
    if (!combined) return;
    if (finalText.trim()) handlers.onFinal?.(finalText.trim());
    else handlers.onPartial?.(combined);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === "aborted") return;
    if (event.error === "not-allowed") {
      handlers.onError?.("Permite el micrófono en el navegador para hablar con Onni.");
    } else {
      handlers.onError?.("No pude escuchar. Intenta de nuevo.");
    }
    stop();
  };

  recognition.onend = () => {
    handlers.onEnd?.();
    recognition = null;
  };

  try {
    recognition.start();
  } catch {
    handlers.onError?.("No se pudo iniciar el micrófono.");
    return null;
  }

  return stop;
}
