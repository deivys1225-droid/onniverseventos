import { useCallback, useRef, useState } from "react";
import {
  cancelAzureMicRecording,
  isAzureMicRecording,
  isAzureMicSupported,
  startAzureMicRecording,
  stopAzureMicRecordingAndTranscribe,
} from "@/lib/onniAzureStt";
import { parseOnniWakePhrase } from "@/lib/onniVoice";

export type AzureMicCallbacks = {
  onCommand: (command: string) => void;
  onWakeWithoutCommand?: () => void;
  onError: (message: string) => void;
};

type ManualMicStatus = "idle" | "recording" | "processing";

function applyAzureTranscript(transcript: string, callbacks: AzureMicCallbacks): boolean {
  const trimmed = transcript.trim();
  if (!trimmed) return false;

  const { heard, command } = parseOnniWakePhrase(trimmed);
  if (heard && command) {
    callbacks.onCommand(command);
    return true;
  }
  if (heard) {
    callbacks.onWakeWithoutCommand?.();
    return true;
  }
  if (trimmed.length > 2) {
    callbacks.onCommand(trimmed);
    return true;
  }
  return false;
}

export function useOnniAzureMic(callbacks: AzureMicCallbacks) {
  const [status, setStatus] = useState<ManualMicStatus>("idle");
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const cancel = useCallback(() => {
    cancelAzureMicRecording();
    setStatus("idle");
  }, []);

  const finishManualRecording = useCallback(async () => {
    setStatus("processing");
    try {
      const transcript = await stopAzureMicRecordingAndTranscribe();
      if (!transcript) return;
      applyAzureTranscript(transcript, callbacksRef.current);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pude escuchar. Intenta de nuevo.";
      callbacksRef.current.onError(message);
    } finally {
      setStatus("idle");
    }
  }, []);

  const beginHold = useCallback(async () => {
    if (status === "processing") return;
    if (status === "recording" || isAzureMicRecording()) return;

    if (!isAzureMicSupported()) {
      callbacksRef.current.onError("Micrófono no disponible en este dispositivo.");
      return;
    }

    const started = await startAzureMicRecording();
    if (!started.ok) {
      callbacksRef.current.onError(started.error);
      return;
    }
    setStatus("recording");
  }, [status]);

  const endHold = useCallback(async () => {
    if (status !== "recording" && !isAzureMicRecording()) return;
    await finishManualRecording();
  }, [status, finishManualRecording]);

  const toggle = useCallback(async () => {
    if (status === "processing") return;

    if (status === "recording" || isAzureMicRecording()) {
      await finishManualRecording();
      return;
    }

    if (!isAzureMicSupported()) {
      callbacksRef.current.onError("Micrófono no disponible en este dispositivo.");
      return;
    }

    const started = await startAzureMicRecording();
    if (!started.ok) {
      callbacksRef.current.onError(started.error);
      return;
    }
    setStatus("recording");
  }, [status, finishManualRecording]);

  return {
    isRecording: status === "recording",
    isProcessing: status === "processing",
    toggle,
    beginHold,
    endHold,
    cancel,
    isSupported: isAzureMicSupported(),
  };
}
