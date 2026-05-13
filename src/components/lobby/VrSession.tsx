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
/**
 * Cap a 60 fps. En celulares modernos con pantalla 90/120 Hz, R3F llama
 * `useFrame` a esa tasa y el CPU/GPU se calienta. Limitar a 60 fps:
 *  - Reduce el temblor de las pantallas 90/120 Hz, donde cada deltaTime es
 *    distinto (8-16 ms variable).
 *  - Da consistencia al filtro de suavizado (un solo paso de slerp por
 *    "ojo humano frame").
 *  - Reduce consumo de batería en sesiones largas.
 */
const TARGET_FPS = 60;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

/**
 * Velocidad del filtro slerp (Hz). Frame-rate independent: el factor por
 * frame se calcula con `1 - exp(-rate * delta)`, que mantiene la misma
 * velocidad de convergencia perceptiva sin importar si el render corre a
 * 30, 60 o 120 fps.
 *
 *   rate = 5  → factor ~0.08 por frame @ 60fps → MUY suave, lag ~400 ms.
 *   rate = 10 → factor ~0.16 por frame @ 60fps → suave, lag ~200 ms.  ← default
 *   rate = 15 → factor ~0.22 por frame @ 60fps → responsivo, lag ~150 ms.
 *   rate = 25 → factor ~0.34 por frame @ 60fps → rápido, lag ~80 ms.
 *
 * 10 Hz es un buen equilibrio entre "no tiembla con el ruido del sensor"
 * y "no se siente como si la cabeza estuviera nadando en aceite".
 */
const HEAD_SMOOTHING_RATE_HZ = 10;

export function ManualStereoRenderer() {
  const { gl, scene, camera, size } = useThree();
  const stereoRef = useRef<StereoEffect | null>(null);
  const orientationRef = useRef<DeviceOrientationEvent | null>(null);
  const targetQuatRef = useRef(new Quaternion());
  const isFirstFrameRef = useRef(true);
  const lastRenderAtRef = useRef(0);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    stereoRef.current = new StereoEffect(gl);
    // El head-tracking espera orden de Euler YXZ; reordenamos por las dudas.
    camera.rotation.reorder("YXZ");
    // Reset del filtro al (re)entrar a VR: el primer evento de gyro se
    // aplica con snap directo (no slerp) para evitar una rotación visible
    // desde "donde estaba mirando la cámara" hasta "donde apunta la cabeza".
    isFirstFrameRef.current = true;
    lastRenderAtRef.current = 0;

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

  useFrame((_, delta) => {
    const stereo = stereoRef.current;
    if (!stereo) return;

    // FPS cap: si el navegador llama useFrame a 120 Hz, omitimos cuadros
    // intermedios para mantener render efectivo en 60 fps. Restamos 1 ms al
    // umbral para no perder frames "casi a tiempo" por jitter del reloj.
    const now = performance.now();
    if (now - lastRenderAtRef.current < FRAME_INTERVAL_MS - 1) return;
    lastRenderAtRef.current = now;

    const evt = orientationRef.current;
    if (evt && evt.alpha != null && evt.beta != null && evt.gamma != null) {
      // Calculamos el quaternion OBJETIVO según el último gyro y luego
      // hacemos slerp hacia él. Esto filtra el ruido del sensor (que es
      // alto en celulares baratos / cuando la mano tiembla) sin perder
      // responsividad.
      applyDeviceOrientationToCamera(
        targetQuatRef.current,
        evt.alpha,
        evt.beta,
        evt.gamma,
        readScreenOrientationDeg(),
      );
      if (isFirstFrameRef.current) {
        camera.quaternion.copy(targetQuatRef.current);
        isFirstFrameRef.current = false;
      } else {
        const factor = 1 - Math.exp(-HEAD_SMOOTHING_RATE_HZ * delta);
        camera.quaternion.slerp(targetQuatRef.current, factor);
      }
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
