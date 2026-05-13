import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

/**
 * WebXR mínimo para el lobby Three.js (`@react-three/fiber`).
 *
 * Cero dependencias nuevas: usa lo que ya viene en `three` (`VRButton`).
 *
 * Flujo:
 * 1. Habilita `gl.xr.enabled = true` para que el WebGLRenderer tenga el módulo
 *    XR listo (es no-op mientras no haya sesión activa).
 * 2. Pregunta a `navigator.xr` si soporta sesión `immersive-vr`.
 *    - Si NO (PC sin headset, Capacitor WebView sin WebXR habilitado, iOS Safari
 *      sin polyfill): no se crea el botón y el lobby queda en mono normal.
 *    - Si SÍ (Chrome Android con Cardboard, Quest, etc.): inyecta el botón
 *      "ENTER VR" que crea `VRButton.createButton(gl)`. El botón es un
 *      `<button>` fixed-positioned que `three` administra (estilos + estado).
 * 3. Al pulsar ENTER VR, `three` pide la sesión XR; R3F 8.x detecta
 *    `gl.xr.isPresenting === true` y conmuta su frameloop a
 *    `gl.setAnimationLoop(...)` que el sistema WebXR controla. La escena pasa
 *    automáticamente a stereoscopic split-screen y head-tracking.
 *
 * Importante: NO requiere Google VR SDK nativo (deprecado, artefacto 404 en
 * Maven). El SDK era para apps OpenGL nativas, irrelevante en WebView/R3F.
 */
export function VrSession() {
  const { gl } = useThree();

  useEffect(() => {
    gl.xr.enabled = true;

    if (typeof navigator === "undefined" || !navigator.xr) return;

    let attached: HTMLElement | null = null;
    let cancelled = false;

    void navigator.xr
      .isSessionSupported("immersive-vr")
      .then((supported: boolean) => {
        if (cancelled || !supported) return;
        const btn = VRButton.createButton(gl);
        // Posición fija sobre la esquina inferior derecha del lobby. El botón
        // que `three` genera es un <button> con estilos en línea (color blanco
        // + borde) que reutilizamos tal cual para no inflar CSS.
        btn.style.position = "fixed";
        btn.style.bottom = "24px";
        btn.style.right = "24px";
        btn.style.left = "auto";
        btn.style.zIndex = "60";
        btn.style.borderRadius = "999px";
        btn.style.fontFamily = "system-ui, sans-serif";
        btn.style.fontWeight = "700";
        btn.style.letterSpacing = "0.05em";
        document.body.appendChild(btn);
        attached = btn;
      })
      .catch(() => {
        /* WebView sin WebXR o permiso denegado — silencio: el botón no aparece. */
      });

    return () => {
      cancelled = true;
      if (attached) attached.remove();
    };
  }, [gl]);

  return null;
}
