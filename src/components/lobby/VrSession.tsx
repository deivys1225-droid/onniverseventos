import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

/**
 * WebXR para el lobby Three.js (`@react-three/fiber`).
 *
 * Cero deps NPM directas para el botón: usa `THREE.VRButton` que ya viene en
 * el paquete `three` instalado.
 *
 * Para hacer que funcione DENTRO del APK de Capacitor (donde el WebView de
 * Android NO expone `navigator.xr` nativamente en muchas versiones de Android
 * System WebView), `src/main.tsx` carga `webxr-polyfill` de forma lazy *solo*
 * cuando detecta ausencia de XR nativo. El polyfill instala `navigator.xr` y
 * emula sesiones inmersivas usando `DeviceOrientationEvent` (giroscopio del
 * teléfono) + `requestFullscreen()` + render estéreo split-screen. En
 * navegadores con XR nativo (Chrome Android moderno) el polyfill no se
 * descarga y se usa la API nativa.
 *
 * Flujo en runtime:
 * 1. `gl.xr.enabled = true` (no-op mientras no haya sesión).
 * 2. `navigator.xr.isSessionSupported("immersive-vr")` ahora responde true
 *    tanto en Chrome Android nativo como en APK con polyfill.
 * 3. Si responde true, inyectamos `THREE.VRButton` estilado con la paleta
 *    cyan-400 / cyan-300 / slate-950 del HUD (mismo tono que el botón
 *    "atrás" en top-left y el joystick mobile).
 * 4. Al pulsar el botón, three.js arranca la sesión XR. R3F 8.x detecta
 *    `gl.xr.isPresenting === true` y conmuta su frameloop a
 *    `gl.setAnimationLoop(...)` que el sistema WebXR controla, pasando la
 *    escena a stereoscopic split-screen + head-tracking.
 * 5. Los controles PC (`PointerLockControls`, `FirstPersonController` WASD,
 *    `MobileTouchLook`) siguen activos en modo normal; al entrar a VR el
 *    head-tracking los sustituye temporalmente y al salir vuelven solos.
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
        /* WebView sin WebXR ni polyfill (improbable) o permiso denegado. */
      });

    return () => {
      cancelled = true;
      if (attached) attached.remove();
    };
  }, [gl]);

  return null;
}
