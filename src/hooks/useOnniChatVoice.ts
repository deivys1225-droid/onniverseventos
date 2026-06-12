import { useCallback, useEffect, useRef, useState } from "react";
import { isDesktopWebBrowser, isOnniAndroidVoice } from "@/lib/deviceDetection";
import {
  parseNativeVoiceErrorDetail,
  isNativeVoiceSoftError,
  shouldShowNativeVoiceError,
} from "@/lib/onniNativeVoiceErrors";
import {
  getOnniVoiceMode,
  isNativeVoiceAvailable,
  markPreferNativeVoice,
  speakOnniAnswer,
  startNativeVoiceListening,
  stopNativeVoiceListening,
  stopOnniSpokenVoice,
  type OnniSpeakOptions,
  type OnniVoiceMode,
} from "@/lib/onniVoiceRuntime";
import { parseOnniWakePhrase } from "@/lib/onniVoice";
import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import { startWebVoiceCapture } from "@/lib/onniWebVoiceCapture";

type VoiceCaptureCallbacks = {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onFallbackToNative?: () => void;
};

export type NativeWakeCallbacks = {
  onWake: (command: string) => void;
  onWakeWithoutCommand?: () => void;
  onError?: (message: string) => void;
};

const NATIVE_RESTART_MS = 900;
const NATIVE_MIC_HANDOFF_MS = 480;
/** Bloquea el mic mientras Onni habla; se libera con evento voice:spoke al terminar TTS. */
const TTS_MIC_BLOCK_MS = 120_000;
const TTS_END_BUFFER_MS = 500;
/** Tras «Hola Onni», aceptar el siguiente pedido sin repetir la palabra clave. */
const NATIVE_FOLLOW_UP_MS = 30_000;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function useOnniChatVoice() {
  const [voiceMode, setVoiceMode] = useState<OnniVoiceMode>(() => getOnniVoiceMode());
  const voiceModeRef = useRef(voiceMode);
  const [voiceListening, setVoiceListening] = useState(false);
  const [nativeWakeListening, setNativeWakeListening] = useState(false);
  const [nativeFollowUpActive, setNativeFollowUpActive] = useState(false);
  const [voiceCaptureActive, setVoiceCaptureActive] = useState(false);
  const stopWebCaptureRef = useRef<(() => void) | null>(null);
  const pendingTranscriptRef = useRef("");
  const captureCallbacksRef = useRef<VoiceCaptureCallbacks | null>(null);
  const wakeCallbacksRef = useRef<NativeWakeCallbacks | null>(null);
  const captureActiveRef = useRef(false);
  const wakeActiveRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWakeHandledRef = useRef("");
  const speakPauseUntilRef = useRef(0);
  const followUpUntilRef = useRef(0);
  const nativeHandoffRef = useRef<Promise<void>>(Promise.resolve());

  const usesOneShotNativeMic = voiceMode === "native";
  /** Switch «Hola Onni»; sin micrófono en APK Android. */
  const supportsNativeWakeSwitch = usesOneShotNativeMic && !isOnniAndroidVoice();

  useEffect(() => {
    const tick = () => {
      setNativeFollowUpActive(Date.now() < followUpUntilRef.current);
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  const isNativeSessionActive = useCallback(
    () => captureActiveRef.current || wakeActiveRef.current,
    [],
  );

  const clearNativeRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const pauseNativeRecognizer = useCallback(() => {
    clearNativeRestartTimer();
    stopNativeVoiceListening();
  }, [clearNativeRestartTimer]);

  const queueNativeHandoff = useCallback(
    (task: () => void | Promise<void>) => {
      nativeHandoffRef.current = nativeHandoffRef.current
        .catch(() => undefined)
        .then(async () => {
          pauseNativeRecognizer();
          await sleep(NATIVE_MIC_HANDOFF_MS);
          await task();
        });
      return nativeHandoffRef.current;
    },
    [pauseNativeRecognizer],
  );

  const releaseCaptureSession = useCallback(() => {
    captureActiveRef.current = false;
    setVoiceCaptureActive(false);
    pendingTranscriptRef.current = "";
    clearNativeRestartTimer();
    pauseNativeRecognizer();
    setVoiceListening(false);
  }, [clearNativeRestartTimer, pauseNativeRecognizer]);

  const scheduleNativeRestart = useCallback(() => {
    if (isOnniAndroidVoice()) return;
    clearNativeRestartTimer();
    if (!isNativeSessionActive() || voiceModeRef.current !== "native") return;

    const delay = Math.max(NATIVE_RESTART_MS, speakPauseUntilRef.current - Date.now());
    restartTimerRef.current = setTimeout(() => {
      if (!isNativeSessionActive() || voiceModeRef.current !== "native") return;
      if (Date.now() < speakPauseUntilRef.current) {
        scheduleNativeRestart();
        return;
      }
      void queueNativeHandoff(() => {
        if (!isNativeSessionActive()) return;
        if (!startNativeVoiceListening()) {
          throw new Error("restart_failed");
        }
        setVoiceListening(true);
        if (wakeActiveRef.current) setNativeWakeListening(true);
      }).catch(() => {
        if (!wakeActiveRef.current) {
          setVoiceListening(false);
          setNativeWakeListening(false);
          return;
        }
        restartTimerRef.current = setTimeout(() => {
          if (wakeActiveRef.current && isNativeSessionActive()) scheduleNativeRestart();
        }, 2_000);
      });
    }, delay);
  }, [clearNativeRestartTimer, isNativeSessionActive, queueNativeHandoff]);

  const switchToNativeVoice = useCallback(() => {
    if (isDesktopWebBrowser()) return false;
    if (!isNativeVoiceAvailable()) return false;
    markPreferNativeVoice();
    setVoiceMode("native");
    return true;
  }, []);

  const speakAnswer = useCallback(
    (text: string, options?: OnniSpeakOptions) => {
      if (voiceModeRef.current === "native" && text.trim() && !isOnniAndroidVoice()) {
        speakPauseUntilRef.current = Date.now() + TTS_MIC_BLOCK_MS;
        pauseNativeRecognizer();
      }
      speakOnniAnswer(
        text,
        voiceMode,
        () => {
          if (switchToNativeVoice()) {
            /* speakOnniAnswer ya reprodujo con nativa en el callback */
          }
        },
        options,
      );
    },
    [voiceMode, pauseNativeRecognizer, switchToNativeVoice],
  );

  const stopVoiceCapture = useCallback(() => {
    const wasCapturing = captureActiveRef.current;
    if (wasCapturing) {
      releaseCaptureSession();
      return "";
    }

    clearNativeRestartTimer();

    if (voiceModeRef.current === "web") {
      stopWebCaptureRef.current?.();
      stopWebCaptureRef.current = null;
      setVoiceCaptureActive(false);
      setVoiceListening(false);
      return pendingTranscriptRef.current.trim();
    }

    if (!wakeActiveRef.current) {
      pauseNativeRecognizer();
      setVoiceListening(false);
    } else {
      setVoiceListening(true);
      setNativeWakeListening(true);
      scheduleNativeRestart();
    }
    return "";
  }, [clearNativeRestartTimer, pauseNativeRecognizer, releaseCaptureSession, scheduleNativeRestart]);

  const stopNativeWakeListening = useCallback(() => {
    wakeActiveRef.current = false;
    setNativeWakeListening(false);
    lastWakeHandledRef.current = "";
    followUpUntilRef.current = 0;
    clearNativeRestartTimer();

    if (captureActiveRef.current) {
      return;
    }

    pauseNativeRecognizer();
    setVoiceListening(false);
  }, [clearNativeRestartTimer, pauseNativeRecognizer]);

  const beginNativeCapture = useCallback(async (callbacks: VoiceCaptureCallbacks): Promise<boolean> => {
    if (isOnniAndroidVoice()) return false;

    captureCallbacksRef.current = callbacks;

    const micPermission = await requestOnniMicrophoneAccess();
    if (!captureActiveRef.current) return false;

    if (micPermission === "denied") {
      releaseCaptureSession();
      callbacks.onError(onniMicDeniedMessage());
      return false;
    }
    if (micPermission === "unsupported") {
      releaseCaptureSession();
      callbacks.onError("Este dispositivo no soporta micrófono para Onni.");
      return false;
    }

    try {
      await queueNativeHandoff(() => {
        if (!captureActiveRef.current) return;
        if (!startNativeVoiceListening()) {
          throw new Error("start_failed");
        }
        setVoiceListening(true);
      });
      return captureActiveRef.current;
    } catch {
      releaseCaptureSession();
      callbacks.onError("No se pudo iniciar el micrófono nativo.");
      return false;
    }
  }, [queueNativeHandoff, releaseCaptureSession]);

  const startNativeWakeListening = useCallback(
    async (callbacks: NativeWakeCallbacks): Promise<boolean> => {
      if (isOnniAndroidVoice()) return false;
      if (voiceModeRef.current !== "native") return false;
      if (captureActiveRef.current) return false;

      if (wakeActiveRef.current) {
        wakeCallbacksRef.current = callbacks;
        return true;
      }

      wakeCallbacksRef.current = callbacks;
      lastWakeHandledRef.current = "";

      const micPermission = await requestOnniMicrophoneAccess();
      if (captureActiveRef.current) return false;

      if (micPermission === "denied") {
        callbacks.onError?.(onniMicDeniedMessage());
        return false;
      }
      if (micPermission === "unsupported") {
        callbacks.onError?.("Este dispositivo no soporta micrófono para Onni.");
        return false;
      }

      wakeActiveRef.current = true;
      setNativeWakeListening(true);

      try {
        await queueNativeHandoff(() => {
          if (!wakeActiveRef.current || captureActiveRef.current) return;
          if (!startNativeVoiceListening()) {
            throw new Error("start_failed");
          }
          setVoiceListening(true);
        });
        return wakeActiveRef.current;
      } catch {
        wakeActiveRef.current = false;
        setNativeWakeListening(false);
        callbacks.onError?.("No se pudo iniciar el micrófono nativo.");
        return false;
      }
    },
    [queueNativeHandoff],
  );

  const deliverCaptureTranscript = useCallback(
    (text: string) => {
      pendingTranscriptRef.current = "";
      captureCallbacksRef.current?.onTranscript(text);
      releaseCaptureSession();
    },
    [releaseCaptureSession],
  );

  const handleNativeTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (captureActiveRef.current) {
        if (isFinal) {
          deliverCaptureTranscript(trimmed);
        } else {
          pendingTranscriptRef.current = trimmed;
        }
        return;
      }

      if (!wakeActiveRef.current) return;

      if (!isFinal) {
        pendingTranscriptRef.current = trimmed;
        return;
      }

      pendingTranscriptRef.current = "";
      const { heard, command } = parseOnniWakePhrase(trimmed);
      const inFollowUp = Date.now() < followUpUntilRef.current;

      if (!heard && inFollowUp && trimmed.length > 2) {
        followUpUntilRef.current = Date.now() + NATIVE_FOLLOW_UP_MS;
        speakPauseUntilRef.current = Date.now() + TTS_MIC_BLOCK_MS;
        lastWakeHandledRef.current = `${trimmed}|${trimmed}`;
        wakeCallbacksRef.current?.onWake(trimmed);
        return;
      }

      if (!heard) return;

      const signature = `${command}|${trimmed}`;
      if (signature === lastWakeHandledRef.current) return;
      lastWakeHandledRef.current = signature;

      speakPauseUntilRef.current = Date.now() + TTS_MIC_BLOCK_MS;
      followUpUntilRef.current = Date.now() + NATIVE_FOLLOW_UP_MS;

      if (!command) {
        wakeCallbacksRef.current?.onWakeWithoutCommand?.();
      } else {
        wakeCallbacksRef.current?.onWake(command);
      }
    },
    [deliverCaptureTranscript, scheduleNativeRestart],
  );

  const startVoiceCapture = useCallback(
    (callbacks: VoiceCaptureCallbacks) => {
      captureCallbacksRef.current = callbacks;
      if (!captureActiveRef.current) pendingTranscriptRef.current = "";

      if (voiceModeRef.current === "native") {
        void beginNativeCapture(callbacks);
        return true;
      }

      if (voiceModeRef.current === "web") {
        stopWebCaptureRef.current?.();
        const stop = startWebVoiceCapture({
          onStart: () => {
            setVoiceCaptureActive(true);
            setVoiceListening(true);
          },
          onPartial: (text) => {
            pendingTranscriptRef.current = text;
          },
          onFinal: (text) => {
            pendingTranscriptRef.current = text;
          },
          onEnd: () => {
            setVoiceCaptureActive(false);
            setVoiceListening(false);
            stopWebCaptureRef.current = null;
            const transcript = pendingTranscriptRef.current.trim();
            pendingTranscriptRef.current = "";
            if (transcript) callbacks.onTranscript(transcript);
          },
          onError: (message) => {
            setVoiceCaptureActive(false);
            setVoiceListening(false);
            stopWebCaptureRef.current = null;
            pendingTranscriptRef.current = "";
            if (switchToNativeVoice()) {
              callbacks.onFallbackToNative?.();
              void beginNativeCapture(callbacks);
              return;
            }
            callbacks.onError(message);
          },
        });

        if (!stop) {
          if (switchToNativeVoice()) {
            callbacks.onFallbackToNative?.();
            void beginNativeCapture(callbacks);
            return true;
          }
          callbacks.onError("Tu navegador no soporta reconocimiento de voz.");
          return false;
        }
        stopWebCaptureRef.current = stop;
        return true;
      }

      callbacks.onError("No encuentro voz disponible en este dispositivo.");
      return false;
    },
    [beginNativeCapture, switchToNativeVoice],
  );

  const toggleVoiceCapture = useCallback(
    async (callbacks: VoiceCaptureCallbacks) => {
      if (isOnniAndroidVoice()) return false;

      captureCallbacksRef.current = callbacks;

      if (captureActiveRef.current) {
        stopVoiceCapture();
        return false;
      }

      pendingTranscriptRef.current = "";
      wakeActiveRef.current = false;
      setNativeWakeListening(false);
      lastWakeHandledRef.current = "";
      captureActiveRef.current = true;
      setVoiceCaptureActive(true);

      if (voiceModeRef.current === "native") {
        return beginNativeCapture(callbacks);
      }

      return startVoiceCapture(callbacks);
    },
    [beginNativeCapture, startVoiceCapture, stopVoiceCapture],
  );

  const notifyVoiceError = useCallback((message: string | null) => {
    if (!shouldShowNativeVoiceError(message)) return;
    captureCallbacksRef.current?.onError(message);
    wakeCallbacksRef.current?.onError?.(message);
  }, []);

  useEffect(() => {
    if (!isNativeVoiceAvailable() || isOnniAndroidVoice()) return;

    const onVoiceStart = () => {
      if (voiceModeRef.current !== "native") return;
      if (!isNativeSessionActive()) pendingTranscriptRef.current = "";
      setVoiceListening(true);
      if (wakeActiveRef.current && !captureActiveRef.current) setNativeWakeListening(true);
    };

    const onVoiceResult = (event: Event) => {
      if (voiceModeRef.current !== "native") return;
      const custom = event as CustomEvent<unknown>;
      const detail = custom.detail;
      let text = "";
      let isFinal = true;
      if (typeof detail === "string") {
        text = detail.trim();
      } else if (detail && typeof detail === "object") {
        const payload = detail as { text?: string; transcript?: string; final?: boolean; isFinal?: boolean };
        text =
          typeof payload.text === "string"
            ? payload.text.trim()
            : typeof payload.transcript === "string"
              ? payload.transcript.trim()
              : "";
        isFinal =
          typeof payload.isFinal === "boolean"
            ? payload.isFinal
            : typeof payload.final === "boolean"
              ? payload.final
              : true;
      }
      handleNativeTranscript(text, isFinal);
    };

    const onVoiceEnd = () => {
      if (voiceModeRef.current !== "native") return;

      const transcript = pendingTranscriptRef.current.trim();
      pendingTranscriptRef.current = "";
      if (transcript) handleNativeTranscript(transcript, true);

      if (!isNativeSessionActive()) {
        setVoiceListening(false);
        setNativeWakeListening(false);
        return;
      }

      if (captureActiveRef.current) {
        setVoiceListening(true);
        return;
      }

      setVoiceListening(true);
      if (wakeActiveRef.current) setNativeWakeListening(true);
      scheduleNativeRestart();
    };

    const onVoiceSpoke = () => {
      if (voiceModeRef.current !== "native" || isOnniAndroidVoice()) return;
      speakPauseUntilRef.current = Date.now() + TTS_END_BUFFER_MS;
      if (wakeActiveRef.current && !captureActiveRef.current && isNativeSessionActive()) {
        scheduleNativeRestart();
      }
    };

    const onVoiceError = (event: Event) => {
      if (voiceModeRef.current !== "native") return;

      const custom = event as CustomEvent<unknown>;
      const { code, message } = parseNativeVoiceErrorDetail(custom.detail);
      pendingTranscriptRef.current = "";

      if (isNativeVoiceSoftError(code) || message === null) {
        if (captureActiveRef.current) {
          releaseCaptureSession();
        } else if (isNativeSessionActive()) {
          scheduleNativeRestart();
        }
        return;
      }

      if (
        wakeActiveRef.current &&
        !captureActiveRef.current &&
        code === "stt_failed"
      ) {
        notifyVoiceError(message);
        scheduleNativeRestart();
        return;
      }

      captureActiveRef.current = false;
      wakeActiveRef.current = false;
      setVoiceCaptureActive(false);
      clearNativeRestartTimer();
      setVoiceListening(false);
      setNativeWakeListening(false);

      notifyVoiceError(message ?? "No pude escuchar. Intenta de nuevo.");
    };

    window.addEventListener("voice:start", onVoiceStart);
    window.addEventListener("voice:result", onVoiceResult);
    window.addEventListener("voice:end", onVoiceEnd);
    window.addEventListener("voice:spoke", onVoiceSpoke);
    window.addEventListener("voice:error", onVoiceError);
    return () => {
      window.removeEventListener("voice:start", onVoiceStart);
      window.removeEventListener("voice:result", onVoiceResult);
      window.removeEventListener("voice:end", onVoiceEnd);
      window.removeEventListener("voice:spoke", onVoiceSpoke);
      window.removeEventListener("voice:error", onVoiceError);
    };
  }, [
    clearNativeRestartTimer,
    handleNativeTranscript,
    isNativeSessionActive,
    notifyVoiceError,
    releaseCaptureSession,
    scheduleNativeRestart,
  ]);

  useEffect(() => {
    if (!isOnniAndroidVoice()) return;
    stopNativeVoiceListening();
    wakeActiveRef.current = false;
    setNativeWakeListening(false);
    setVoiceListening(false);
  }, []);

  useEffect(
    () => () => {
      captureActiveRef.current = false;
      wakeActiveRef.current = false;
      setVoiceCaptureActive(false);
      clearNativeRestartTimer();
      stopWebCaptureRef.current?.();
      stopNativeVoiceListening();
      stopOnniSpokenVoice();
    },
    [clearNativeRestartTimer],
  );

  const voiceLabel =
    voiceMode === "web"
      ? "Voz del navegador"
      : voiceMode === "native"
        ? isOnniAndroidVoice()
          ? "Voz nativa + Azure (Android)"
          : "Voz nativa Android"
        : "Voz no disponible";

  return {
    voiceMode,
    voiceListening,
    nativeWakeListening,
    voiceCaptureActive,
    setVoiceListening,
    speakAnswer,
    startVoiceCapture,
    stopVoiceCapture,
    toggleVoiceCapture,
    startNativeWakeListening,
    stopNativeWakeListening,
    nativeFollowUpActive,
    usesContinuousMic: false,
    usesOneShotNativeMic,
    supportsNativeWakeSwitch,
    canListen: voiceMode !== "none" && !isOnniAndroidVoice(),
    canSpeak: voiceMode !== "none",
    voiceLabel,
  };
};
