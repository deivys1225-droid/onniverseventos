import type { ReactNode } from "react";
import { shouldUseWebLivePlayer } from "@/lib/nativePlayback";

type WebLivePlayerGateProps = {
  children: ReactNode;
  /** Panel alternativo en APK (sin reproductor web). */
  nativeFallback?: ReactNode;
};

/**
 * Bloquea montaje de MuxPlayer / video antes de cualquier player en Android nativo.
 */
export function WebLivePlayerGate({ children, nativeFallback = null }: WebLivePlayerGateProps) {
  if (!shouldUseWebLivePlayer()) {
    return <>{nativeFallback}</>;
  }
  if (import.meta.env.DEV) {
    console.log("[Onniverso] RENDER PLAYER WEB");
  }
  return <>{children}</>;
}
