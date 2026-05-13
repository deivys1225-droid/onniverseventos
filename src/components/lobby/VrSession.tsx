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
        // Posición: esquina inferior-IZQUIERDA del lobby. El joystick mobile
        // (`MobileLobbyMovePad`) vive en bottom-left pero más arriba (con
        // pb-[6.5rem]), así que pegado al borde inferior no choca.
        // env(safe-area-inset-*) evita que se corte en iPhone con notch.
        btn.style.position = "fixed";
        btn.style.bottom = "calc(20px + env(safe-area-inset-bottom, 0px))";
        btn.style.left = "calc(20px + env(safe-area-inset-left, 0px))";
        btn.style.right = "auto";
        btn.style.top = "auto";
        btn.style.zIndex = "60";
        // Paleta neon-cyan del lobby (mismo tono que el botón "atrás" del HUD
        // y el joystick: cyan-400/cyan-300 sobre slate-950 con glow exterior).
        btn.style.padding = "12px 22px";
        btn.style.borderRadius = "999px";
        btn.style.fontFamily = "system-ui, -apple-system, sans-serif";
        btn.style.fontSize = "13px";
        btn.style.fontWeight = "700";
        btn.style.letterSpacing = "0.12em";
        btn.style.color = "#67e8f9";
        btn.style.background = "rgba(2, 6, 23, 0.92)";
        btn.style.border = "1px solid rgba(34, 211, 238, 0.6)";
        btn.style.boxShadow =
          "0 0 28px -4px rgba(34, 211, 238, 0.95), inset 0 0 18px -10px rgba(34, 211, 238, 0.55)";
        btn.style.backdropFilter = "blur(8px)";
        // `-webkit-backdrop-filter` no esta tipado en CSSStyleDeclaration;
        // usamos setProperty para evitar `as any` y mantener type-safety.
        btn.style.setProperty("-webkit-backdrop-filter", "blur(8px)");
        btn.style.cursor = "pointer";
        btn.style.transition =
          "color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease";
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
