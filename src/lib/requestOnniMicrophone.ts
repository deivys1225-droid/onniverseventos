type MicPermissionStatus = "granted" | "denied" | "unsupported";

function isValidCallbackName(name: string): boolean {
  return /^[a-zA-Z_$][\w$]*$/.test(name);
}

/**
 * Pide permiso de micrófono para Onni.
 * - APK Android: diálogo nativo vía AndroidBridge.
 * - Navegador: getUserMedia.
 */
export function requestOnniMicrophoneAccess(): Promise<MicPermissionStatus> {
  const nativeRequest = window.AndroidBridge?.requestOnniMicrophonePermission;
  if (typeof nativeRequest === "function") {
    return new Promise((resolve) => {
      const callbackName = `__onniMicCb_${Date.now()}`;
      const w = window as Window & Record<string, unknown>;
      w[callbackName] = (granted: boolean) => {
        delete w[callbackName];
        resolve(granted ? "granted" : "denied");
      };
      try {
        nativeRequest(callbackName);
      } catch {
        delete w[callbackName];
        resolve("unsupported");
      }
    });
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return Promise.resolve("unsupported");
  }

  return navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
      return "granted" as const;
    })
    .catch((err: DOMException) => {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        return "denied" as const;
      }
      return "unsupported" as const;
    });
}

export function onniMicDeniedMessage(): string {
  const isNative = typeof window.AndroidBridge?.requestOnniMicrophonePermission === "function";
  if (isNative) {
    return "Activa el micrófono: Ajustes → Apps → ViveVR → Permisos → Micrófono → Permitir.";
  }
  return "Activa el micrófono en la configuración del navegador para que Onni te escuche.";
}

/** Registra callback global (solo para tests). */
export function registerOnniMicCallback(name: string, fn: (granted: boolean) => void): void {
  if (!isValidCallbackName(name)) return;
  (window as Window & Record<string, unknown>)[name] = fn;
}
