import { useEffect } from "react";

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
