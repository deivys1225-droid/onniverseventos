import { useEffect, useRef, useState } from "react";

const ONNIVERS_WEB_URL = "https://onnivers.com";
/** Resolución virtual de escritorio para que la web se vea como en PC. */
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 720;

export default function CinemaScreenThreeWebsite() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);
  const [loaded, setLoaded] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoadTimedOut((prev) => prev || !loaded);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  const viewW = DESKTOP_WIDTH * scale;
  const viewH = DESKTOP_HEIGHT * scale;

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
      <div
        className="relative overflow-hidden rounded-[1px] bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
        style={{ width: viewW, height: viewH }}
      >
        {!loaded && !loadTimedOut && (
          <p className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1a1a] text-[10px] text-white/70">
            Cargando onnivers.com…
          </p>
        )}
        {loadTimedOut && !loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#1a1a1a] px-2 text-center">
            <p className="text-[10px] text-white/80">No se pudo incrustar la web aquí.</p>
            <a
              href={ONNIVERS_WEB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold text-cyan-300 underline"
            >
              Abrir onnivers.com
            </a>
          </div>
        )}
        <iframe
          src={ONNIVERS_WEB_URL}
          title="OnniVers — onnivers.com"
          className="absolute left-0 top-0 border-0 bg-white"
          style={{
            width: DESKTOP_WIDTH,
            height: DESKTOP_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
