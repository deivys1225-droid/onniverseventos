import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Cursor virtual solo en lobby inmersivo (WebView Android / proyección).
 * No intercepta clics: pointer-events: none.
 */
export default function VirtualCursor() {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("virtual-cursor-active");

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      setPosition({ x: touch.clientX, y: touch.clientY });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      document.body.classList.remove("virtual-cursor-active");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      id="cursor-virtual"
      aria-hidden
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 1v12l3.5-3 2.5 4 2-1-2.5-3.5 4.5H1z"
          fill="#fff"
          stroke="#000"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    document.body,
  );
}
