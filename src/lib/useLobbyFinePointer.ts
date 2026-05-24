import { useEffect, useState } from "react";
import { hasFinePointerInput, isMobileCoarseDevice } from "@/lib/webglRendererPrefs";

function detectFinePointer(): boolean {
  if (typeof window === "undefined") return !isMobileCoarseDevice();
  return !isMobileCoarseDevice() || hasFinePointerInput();
}

const FINE_POINTER_MEDIA = ["(pointer: fine)", "(any-pointer: fine)"] as const;

/**
 * true en PC o cuando hay ratón conectado al celular/tablet (USB/Bluetooth).
 * Algunos WebView de Android no actualizan matchMedia al conectar el ratón;
 * un pointerdown con pointerType "mouse" también activa el modo PC.
 */
export function useLobbyFinePointer(): boolean {
  const [finePointer, setFinePointer] = useState(detectFinePointer);

  useEffect(() => {
    const sync = () => setFinePointer(detectFinePointer());
    sync();

    const media = FINE_POINTER_MEDIA.map((query) => window.matchMedia(query));
    media.forEach((mq) => mq.addEventListener("change", sync));

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") setFinePointer(true);
    };
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      media.forEach((mq) => mq.removeEventListener("change", sync));
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return finePointer;
}
