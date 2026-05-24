import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/** -1 atrás (clic derecho), 0 quieto, 1 adelante (clic izquierdo). */
export type MouseMoveInput = {
  forward: number;
};

export function createMouseMoveInput(): MouseMoveInput {
  return { forward: 0 };
}

function shouldIgnoreMouseTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "[data-lobby-move-pad], [data-lobby-ui], [data-lobby-screen], button, a, input, textarea, select, label, [role='button']",
    ),
  );
}

const DOUBLE_RIGHT_CLICK_MS = 400;
/** Retraso antes de caminar atrás: permite detectar doble clic derecho sin moverse primero. */
const RIGHT_WALK_HOLD_DELAY_MS = 220;

type LobbyMouseButtonControlsProps = {
  /** Escucha ratón (doble clic derecho = Escape). */
  enabled: boolean;
  /** Clic izquierdo/derecho para caminar (solo con pointer libre, sin pantalla enfocada). */
  movementEnabled?: boolean;
  inputRef: React.MutableRefObject<MouseMoveInput>;
  /** Misma acción que la tecla Escape (doble clic derecho). */
  onEscape?: () => void;
};

/**
 * Ratón en lobby: clic izquierdo = adelante, clic derecho = atrás.
 * Doble clic derecho = Escape (salir de pantalla / soltar pointer-lock).
 * La mirada sigue con movimiento del ratón (pointer-lock o arrastre táctil).
 * El scroll del ratón no se modifica aquí.
 */
export default function LobbyMouseButtonControls({
  enabled,
  movementEnabled = true,
  inputRef,
  onEscape,
}: LobbyMouseButtonControlsProps) {
  useEffect(() => {
    if (!enabled) {
      inputRef.current.forward = 0;
      return;
    }

    const held = { left: false, right: false };
    let lastRightDownAt = 0;
    let rightWalkTimer: ReturnType<typeof setTimeout> | null = null;

    const syncForward = () => {
      if (held.left && held.right) {
        inputRef.current.forward = 0;
        return;
      }
      if (held.left) {
        inputRef.current.forward = 1;
        return;
      }
      if (held.right) {
        inputRef.current.forward = -1;
        return;
      }
      inputRef.current.forward = 0;
    };

    const cancelRightWalkTimer = () => {
      if (rightWalkTimer !== null) {
        clearTimeout(rightWalkTimer);
        rightWalkTimer = null;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (shouldIgnoreMouseTarget(event.target)) return;
      if (event.button === 0) {
        if (movementEnabled) {
          held.left = true;
          syncForward();
        }
        return;
      }
      if (event.button !== 2) return;

      const now = Date.now();
      if (now - lastRightDownAt < DOUBLE_RIGHT_CLICK_MS) {
        cancelRightWalkTimer();
        held.right = false;
        syncForward();
        lastRightDownAt = 0;
        onEscape?.();
        event.preventDefault();
        return;
      }

      if (!movementEnabled) return;

      lastRightDownAt = now;
      cancelRightWalkTimer();
      rightWalkTimer = setTimeout(() => {
        rightWalkTimer = null;
        held.right = true;
        syncForward();
      }, RIGHT_WALK_HOLD_DELAY_MS);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (event.button === 0) {
        held.left = false;
        syncForward();
        return;
      }
      if (event.button !== 2) return;
      cancelRightWalkTimer();
      held.right = false;
      syncForward();
    };

    const onContextMenu = (event: MouseEvent) => {
      if (shouldIgnoreMouseTarget(event.target)) return;
      event.preventDefault();
    };

    const onBlur = () => {
      cancelRightWalkTimer();
      held.left = false;
      held.right = false;
      inputRef.current.forward = 0;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("blur", onBlur);

    return () => {
      cancelRightWalkTimer();
      held.left = false;
      held.right = false;
      inputRef.current.forward = 0;
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled, movementEnabled, inputRef, onEscape]);

  return null;
}

const MOBILE_MOUSE_LOOK_SENSITIVITY = 0.0045;
const WHEEL_ORBIT_FACTOR = 0.0028;

/**
 * Celular + ratón: rueda del ratón = giro horizontal 360° (eje Y, tipo Tierra).
 */
export function LobbyMobileWheelOrbitSpin({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!enabled) return;

    const onWheel = (event: WheelEvent) => {
      if (shouldIgnoreMouseTarget(event.target)) return;
      event.preventDefault();
      const delta = (event.deltaY + event.deltaX) * WHEEL_ORBIT_FACTOR;
      if (delta === 0) return;
      camera.rotation.order = "YXZ";
      camera.rotation.y += delta;
      camera.up.set(0, 1, 0);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [camera, enabled]);

  return null;
}

/**
 * Celular/tablet con ratón: intento de pointer-lock; si no hay lock, movimiento del ratón.
 */
export function LobbyMobileMouseLook({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const lastPosition = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastPosition.current = null;
      return;
    }

    const applyDelta = (dx: number, dy: number) => {
      if (dx === 0 && dy === 0) return;
      camera.rotation.order = "YXZ";
      camera.rotation.y -= dx * MOBILE_MOUSE_LOOK_SENSITIVITY;
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x - dy * MOBILE_MOUSE_LOOK_SENSITIVITY,
        -1.35,
        1.35,
      );
      camera.up.set(0, 1, 0);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      lastPosition.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;

      let dx = event.movementX;
      let dy = event.movementY;

      if (dx === 0 && dy === 0) {
        if (!lastPosition.current) {
          lastPosition.current = { x: event.clientX, y: event.clientY };
          return;
        }
        dx = event.clientX - lastPosition.current.x;
        dy = event.clientY - lastPosition.current.y;
      }

      lastPosition.current = { x: event.clientX, y: event.clientY };
      applyDelta(dx, dy);
    };

    const reset = () => {
      lastPosition.current = null;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("blur", reset);

    return () => {
      reset();
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", reset);
    };
  }, [camera, enabled]);

  return null;
}
