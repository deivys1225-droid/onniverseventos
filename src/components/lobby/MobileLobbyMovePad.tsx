import { useRef, useState } from "react";

export type MobileMoveInput = {
  forward: number;
  right: number;
};

export type MobileLookInput = {
  yaw: number;
  pitch: number;
};

export function createMobileMoveInput(): MobileMoveInput {
  return { forward: 0, right: 0 };
}

export function createMobileLookInput(): MobileLookInput {
  return { yaw: 0, pitch: 0 };
}

const MAX_DEFLECT = 28;
const DEADZONE = 6;

type LobbyTouchPadProps = {
  enabled: boolean;
  side: "left" | "right";
  ariaLabel: string;
  onInput: (x: number, y: number) => void;
  onReset: () => void;
};

function LobbyTouchPad({ enabled, side, ariaLabel, onInput, onReset }: LobbyTouchPadProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);

  const reset = () => {
    onReset();
    setKnob({ x: 0, y: 0 });
    activePointer.current = null;
  };

  const updateFromPointer = (event: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;

    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const length = Math.hypot(dx, dy);

    if (length > MAX_DEFLECT) {
      dx = (dx / length) * MAX_DEFLECT;
      dy = (dy / length) * MAX_DEFLECT;
    }

    setKnob({ x: dx, y: dy });

    if (length < DEADZONE) {
      onInput(0, 0);
      return;
    }

    onInput(dx / MAX_DEFLECT, dy / MAX_DEFLECT);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || activePointer.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    baseRef.current?.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    updateFromPointer(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || activePointer.current !== event.pointerId) return;
    event.preventDefault();
    updateFromPointer(event);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    if (baseRef.current?.hasPointerCapture(event.pointerId)) {
      baseRef.current.releasePointerCapture(event.pointerId);
    }
    reset();
  };

  if (!enabled) {
    return null;
  }

  const sideClass =
    side === "left"
      ? "left-0 pl-[max(1rem,env(safe-area-inset-left,0px))]"
      : "right-0 pr-[max(1rem,env(safe-area-inset-right,0px))]";

  const accentClass =
    side === "left"
      ? "border-cyan-300/35 shadow-[0_0_28px_-8px_rgba(34,211,238,0.75)]"
      : "border-violet-300/35 shadow-[0_0_28px_-8px_rgba(167,139,250,0.75)]";

  const knobClass =
    side === "left"
      ? "border-cyan-200/45 bg-cyan-400/15 shadow-[0_0_18px_-6px_rgba(34,211,238,0.9)]"
      : "border-violet-200/45 bg-violet-400/15 shadow-[0_0_18px_-6px_rgba(167,139,250,0.9)]";

  return (
    <div
      className={`pointer-events-none fixed bottom-0 z-30 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] ${sideClass}`}
      aria-hidden
    >
      <div
        ref={baseRef}
        role="application"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className={`pointer-events-auto relative h-28 w-28 touch-none rounded-full border bg-black/45 backdrop-blur-md ${accentClass}`}
      >
        <div
          className={`absolute inset-0 rounded-full ${
            side === "left"
              ? "bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,0.16),transparent_62%)]"
              : "bg-[radial-gradient(circle_at_50%_38%,rgba(167,139,250,0.16),transparent_62%)]"
          }`}
        />
        <div
          className={`absolute left-1/2 top-1/2 h-12 w-12 rounded-full border ${knobClass}`}
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
    </div>
  );
}

type MobileLobbyControlsProps = {
  enabled: boolean;
  moveInputRef: React.MutableRefObject<MobileMoveInput>;
  lookInputRef: React.MutableRefObject<MobileLookInput>;
};

export default function MobileLobbyControls({
  enabled,
  moveInputRef,
  lookInputRef,
}: MobileLobbyControlsProps) {
  return (
    <>
      <LobbyTouchPad
        enabled={enabled}
        side="left"
        ariaLabel="Control de movimiento"
        onInput={(x, y) => {
          moveInputRef.current.forward = -y;
          moveInputRef.current.right = x;
        }}
        onReset={() => {
          moveInputRef.current.forward = 0;
          moveInputRef.current.right = 0;
        }}
      />
      <LobbyTouchPad
        enabled={enabled}
        side="right"
        ariaLabel="Control de camara"
        onInput={(x, y) => {
          lookInputRef.current.yaw = x;
          lookInputRef.current.pitch = -y;
        }}
        onReset={() => {
          lookInputRef.current.yaw = 0;
          lookInputRef.current.pitch = 0;
        }}
      />
    </>
  );
}
