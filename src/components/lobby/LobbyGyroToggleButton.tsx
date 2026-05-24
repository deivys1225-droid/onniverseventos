import { useCallback, useRef, type CSSProperties } from "react";

const LONG_PRESS_MS = 550;

type LobbyGyroToggleButtonProps = {
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onRecenter?: () => void;
  errorMessage?: string | null;
};

export default function LobbyGyroToggleButton({
  active,
  onActivate,
  onDeactivate,
  onRecenter,
  errorMessage,
}: LobbyGyroToggleButtonProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const baseStyle: CSSProperties = {
    position: "fixed",
    zIndex: 99999,
    pointerEvents: "auto",
    padding: "11px 18px",
    borderRadius: 999,
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.1em",
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
    color: active ? "#fef3c7" : "#67e8f9",
    background: "rgba(2, 6, 23, 0.92)",
    border: `1px solid ${active ? "rgba(251, 191, 36, 0.7)" : "rgba(34, 211, 238, 0.6)"}`,
    boxShadow: active
      ? "0 0 32px -4px rgba(251, 191, 36, 0.95), inset 0 0 18px -10px rgba(251, 191, 36, 0.55)"
      : "0 0 28px -4px rgba(34, 211, 238, 0.95), inset 0 0 18px -10px rgba(34, 211, 238, 0.55)",
  };

  const hintStyle: CSSProperties = {
    position: "fixed",
    zIndex: 99998,
    pointerEvents: "none",
    bottom: "calc(58px + env(safe-area-inset-bottom, 0px))",
    left: "calc(20px + env(safe-area-inset-left, 0px))",
    fontFamily: "system-ui, sans-serif",
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(254, 243, 199, 0.85)",
    letterSpacing: "0.04em",
  };

  const errorStyle: CSSProperties = {
    ...baseStyle,
    bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
    left: "calc(20px + env(safe-area-inset-left, 0px))",
    maxWidth: 320,
    color: "#fca5a5",
    background: "rgba(2, 6, 23, 0.92)",
    border: "1px solid rgba(248, 113, 113, 0.7)",
    boxShadow: "0 0 28px -4px rgba(248, 113, 113, 0.8)",
    cursor: "default",
    pointerEvents: "none",
    fontSize: 11,
    letterSpacing: "0.04em",
    fontWeight: 600,
  };

  const setWebkitBlur = useCallback((el: HTMLElement | null) => {
    if (el) el.style.setProperty("-webkit-backdrop-filter", "blur(8px)");
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = () => {
    if (!active || !onRecenter) return;
    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      onRecenter();
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearLongPress();
  };

  const handleClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (active) onDeactivate();
    else onActivate();
  };

  return (
    <>
      {errorMessage ? (
        <div ref={setWebkitBlur} style={errorStyle} data-lobby-ui role="alert">
          {errorMessage}
        </div>
      ) : null}
      {active && onRecenter ? (
        <p style={hintStyle} data-lobby-ui>
          Mantén pulsado para recentrar
        </p>
      ) : null}
      <button
        ref={setWebkitBlur}
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={buttonStyle}
        data-lobby-ui
        aria-pressed={active}
        aria-label={
          active
            ? "Desactivar giroscopio. Mantén pulsado para recentrar la vista."
            : "Activar giroscopio para mirar alrededor"
        }
      >
        {active ? "GIRO OFF" : "GIROSCOPIO"}
      </button>
    </>
  );
}
