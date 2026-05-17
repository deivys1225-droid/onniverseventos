import { useEffect, useRef, useState } from "react";

const ONNIVERS_WEB_URL = "https://onnivers.com";
/** Resolución virtual de escritorio para que la web se vea como en PC. */
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 720;

export default function CinemaScreenThreeWebsite() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateScale = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const fit = Math.min(width / DESKTOP_WIDTH, height / DESKTOP_HEIGHT);
      setScale(Math.min(fit, 1));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const viewW = DESKTOP_WIDTH * scale;
  const viewH = DESKTOP_HEIGHT * scale;

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0c0c0c]">
      <div
        className="relative overflow-hidden rounded-[1px] bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
        style={{ width: viewW, height: viewH }}
      >
        <iframe
          src={ONNIVERS_WEB_URL}
          title="OnniVers — onnivers.com"
          className="absolute left-0 top-0 border-0"
          style={{
            width: DESKTOP_WIDTH,
            height: DESKTOP_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          allow="fullscreen"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
