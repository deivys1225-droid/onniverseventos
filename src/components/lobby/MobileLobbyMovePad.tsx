import { useRef, useState } from "react";

export type MobileMoveInput = {
  forward: number;
  right: number;
};

export function createMobileMoveInput(): MobileMoveInput {
  return { forward: 0, right: 0 };
}

const MAX_DEFLECT = 28;
const DEADZONE = 6;

type MobileLobbyMovePadProps = {
  enabled: boolean;
  inputRef: React.MutableRefObject<MobileMoveInput>;
};

export default function MobileLobbyMovePad({ enabled, inputRef }: MobileLobbyMovePadProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);

  const reset = () => {
    inputRef.current.forward = 0;
    inputRef.current.right = 0;
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
      inputRef.current.forward = 0;
      inputRef.current.right = 0;
      return;
    }

    inputRef.current.forward = -dy / MAX_DEFLECT;
    inputRef.current.right = dx / MAX_DEFLECT;
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

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))]"
      aria-hidden
    >
      <div
        ref={baseRef}
        role="application"
        aria-label="Control de movimiento"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="pointer-events-auto relative h-28 w-28 touch-none rounded-full border border-cyan-300/35 bg-black/45 shadow-[0_0_28px_-8px_rgba(34,211,238,0.75)] backdrop-blur-md"
      >
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,0.16),transparent_62%)]" />
        <div
          className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-cyan-200/45 bg-cyan-400/15 shadow-[0_0_18px_-6px_rgba(34,211,238,0.9)]"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
    </div>
  );
}
