import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, MathUtils, Quaternion, Vector3 } from "three";
import { StereoEffect } from "three/examples/jsm/effects/StereoEffect.js";

/**
 * VR ESTEREO MANUAL (pre-WebXR) — 100% confiable en cualquier WebGL + giro.
 *
 * Por qué reemplazamos `THREE.VRButton` y la sesión WebXR del polyfill:
 *
 * El polyfill `webxr-polyfill` declara `navigator.xr` y reporta que soporta
 * `immersive-vr`, pero su implementación de Cardboard NO se traduce
 * limpiamente al pipeline `gl.xr` de Three.js dentro del WebView de
 * Capacitor: en la práctica el botón nativo ENTER VR responde, el sistema
 * dice "presenting", pero la imagen sigue MONO. En el navegador externo
 * sí divide porque Chrome Android tiene WebXR nativo.
 *
 * Solución (instrucción explícita del usuario): ignorar la "compatibilidad"
 * del sistema y forzar un modo estéreo MANUAL que solo requiere:
 *   - WebGL (universal).
 *   - `DeviceOrientationEvent` (disponible en cualquier WebView Android
 *     moderno y en iOS 13+ con permiso vía requestPermission).
 *
 * Composición técnica:
 *  - `THREE.StereoEffect` (existe en three 0.183) divide la pantalla con
 *    `setScissor/setViewport` y renderiza la escena dos veces con los dos
 *    ojos de un `StereoCamera` interno.
 *  - Head-tracking inline: replicamos la matemática del viejo
 *    `DeviceOrientationControls` (removido de three desde 0.131) leyendo
 *    `deviceorientation` (alpha/beta/gamma) y compensando la rotación de
 *    pantalla con `screen.orientation.angle` (o `window.orientation`).
 *  - `useFrame(callback, 1)` toma el control del render-loop de R3F: con
 *    priority > 0, R3F deja de auto-renderear y nosotros llamamos
 *    `stereo.render(scene, camera)` cada frame.
 *  - `FirstPersonController` (WASD) sigue moviendo `camera.position`
 *    libremente; nosotros solo tocamos `camera.quaternion` con el gyro.
 *    Por eso WASD + gyro coexisten sin pelearse.
 */

const Z_AXIS = new Vector3(0, 0, 1);

/**
 * Aplica una orientación de dispositivo al `quaternion` de la cámara,
 * compensando la rotación física de la pantalla. Réplica de la matemática
 * que hacía `DeviceOrientationControls` antes de ser removido de three.
 */
function applyDeviceOrientationToCamera(
  quaternion: Quaternion,
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenOrientationDeg: number,
): void {
  const alpha = MathUtils.degToRad(alphaDeg);
  const beta = MathUtils.degToRad(betaDeg);
  const gamma = MathUtils.degToRad(gammaDeg);
  const orient = MathUtils.degToRad(screenOrientationDeg);

  const euler = new Euler(beta, alpha, -gamma, "YXZ");
  quaternion.setFromEuler(euler);
  // -PI/2 alrededor de X para que "cabeza recta" mire al horizonte (no al techo).
  quaternion.multiply(new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2));
  // Compensa rotación de pantalla (landscape vs portrait).
  quaternion.multiply(new Quaternion().setFromAxisAngle(Z_AXIS, -orient));
}

function readScreenOrientationDeg(): number {
  if (typeof window === "undefined") return 0;
  const fromApi = window.screen?.orientation?.angle;
  if (typeof fromApi === "number") return fromApi;
  // `window.orientation` está deprecado pero todavía aparece en WebViews antiguos.
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

/**
 * Componente que vive DENTRO del `<Canvas>` de R3F. Cuando se monta:
 *  - Crea `StereoEffect` sobre el `WebGLRenderer` actual.
 *  - Suscribe `deviceorientation` (en captura para no perder eventos).
 *  - Sustituye el render-loop de R3F (priority=1) por uno que llama
 *    `stereo.render(scene, camera)` cada frame.
 *  - Aplica el último gyro al `camera.quaternion` ANTES de renderizar.
 *
 * Al desmontarse:
 *  - Quita listeners y libera StereoEffect.
 *  - Resetea viewport/scissor del renderer (StereoEffect los deja en el
 *    último ojo renderizado).
 *  - R3F retoma su render-loop normal (mono).
 */
export function ManualStereoRenderer() {
  const { gl, scene, camera, size } = useThree();
  const stereoRef = useRef<StereoEffect | null>(null);
  const orientationRef = useRef<DeviceOrientationEvent | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    stereoRef.current = new StereoEffect(gl);
    // El head-tracking espera orden de Euler YXZ; reordenamos por las dudas.
    camera.rotation.reorder("YXZ");

    const onOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = event;
    };
    // `true` (capture): asegura que llegue aunque algo en mid-DOM pare la propagación.
    window.addEventListener("deviceorientation", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      orientationRef.current = null;
      stereoRef.current = null;
      // Restaurar viewport completo para que R3F renderee mono normal otra vez.
      gl.setScissorTest(false);
      gl.setScissor(0, 0, sizeRef.current.width, sizeRef.current.height);
      gl.setViewport(0, 0, sizeRef.current.width, sizeRef.current.height);
    };
  }, [gl, camera]);

  useFrame(() => {
    const stereo = stereoRef.current;
    if (!stereo) return;
    const evt = orientationRef.current;
    if (evt && evt.alpha != null && evt.beta != null && evt.gamma != null) {
      applyDeviceOrientationToCamera(
        camera.quaternion,
        evt.alpha,
        evt.beta,
        evt.gamma,
        readScreenOrientationDeg(),
      );
    }
    stereo.render(scene, camera);
  }, 1);

  return null;
}

interface VrToggleButtonProps {
  vrMode: boolean;
  onEnter: () => void;
  onExit: () => void;
  errorMessage?: string;
}

/**
 * Botón flotante bottom-LEFT con paleta neon (cyan en off, amber en on).
 * SIEMPRE visible — no consulta `navigator.xr.isSessionSupported` ni nada
 * parecido. Al toque arranca el modo estéreo manual incluso si el sistema
 * dice "no soportado", tal como pidió el usuario.
 */
export function VrToggleButton({
  vrMode,
  onEnter,
  onExit,
  errorMessage,
}: VrToggleButtonProps) {
  const baseStyle: CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    pointerEvents: "auto",
    padding: "12px 22px",
    borderRadius: 999,
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.12em",
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "rgba(34,211,238,0.5)",
    userSelect: "none",
    WebkitUserSelect: "none",
    backdropFilter: "blur(8px)",
    transition: "color 0.2s, border-color 0.2s, box-shadow 0.2s",
  };

  const buttonStyle: CSSProperties = {
    ...baseStyle,
    bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
    left: "calc(20px + env(safe-area-inset-left, 0px))",
    color: vrMode ? "#fef3c7" : "#67e8f9",
    background: "rgba(2, 6, 23, 0.92)",
    border: `1px solid ${
      vrMode ? "rgba(251, 191, 36, 0.7)" : "rgba(34, 211, 238, 0.6)"
    }`,
    boxShadow: vrMode
      ? "0 0 32px -4px rgba(251, 191, 36, 0.95), inset 0 0 18px -10px rgba(251, 191, 36, 0.55)"
      : "0 0 28px -4px rgba(34, 211, 238, 0.95), inset 0 0 18px -10px rgba(34, 211, 238, 0.55)",
  };

  const errorStyle: CSSProperties = {
    ...baseStyle,
    bottom: "calc(78px + env(safe-area-inset-bottom, 0px))",
    left: "calc(20px + env(safe-area-inset-left, 0px))",
    maxWidth: 320,
    color: "#fca5a5",
    background: "rgba(2, 6, 23, 0.92)",
    border: "1px solid rgba(248, 113, 113, 0.7)",
    boxShadow: "0 0 28px -4px rgba(248, 113, 113, 0.8)",
    cursor: "default",
    pointerEvents: "none",
  };

  const handleClick = useCallback(() => {
    if (vrMode) onExit();
    else onEnter();
  }, [vrMode, onEnter, onExit]);

  // `-webkit-backdrop-filter` no esta tipado en CSSStyleDeclaration; el
  // hack es aplicarlo via `ref` callback con setProperty.
  const setWebkitBlur = useCallback((el: HTMLElement | null) => {
    if (el) el.style.setProperty("-webkit-backdrop-filter", "blur(8px)");
  }, []);

  return (
    <>
      {errorMessage ? (
        <div ref={setWebkitBlur} style={errorStyle} data-lobby-ui role="alert">
          {errorMessage}
        </div>
      ) : null}
      <button
        ref={setWebkitBlur}
        type="button"
        onClick={handleClick}
        style={buttonStyle}
        data-lobby-ui
        aria-label={vrMode ? "Salir del modo VR" : "Entrar al modo VR estéreo"}
      >
        {vrMode ? "SALIR VR" : "ENTRAR VR"}
      </button>
    </>
  );
}
