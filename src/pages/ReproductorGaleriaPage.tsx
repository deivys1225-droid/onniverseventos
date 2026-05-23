import { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import SectionHeader from "@/components/salas/SectionHeader";
import { LobbyScreenOneHub } from "@/components/lobby/LobbyScreenOneHub";

const ReproductorGaleriaPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerSize, setPlayerSize] = useState({ width: 390, height: 720 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setPlayerSize({
        width: Math.max(280, Math.floor(rect.width)),
        height: Math.max(480, Math.floor(rect.height)),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background"
      data-camera-page-root
    >
      <Navbar />

      <div className="pointer-events-none fixed inset-0" data-camera-decorative-bg>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_85%_95%,hsl(290_80%_60%/0.16),transparent_40%)]" />
      </div>

      <main className="relative z-20 px-4 pt-20 pb-16 sm:px-6">
        <div className="container mx-auto max-w-lg">
          <div className="mb-4">
            <BackToProfileHomeButton />
          </div>

          <SectionHeader
            badge="Multimedia"
            icon={Music2}
            title="REPRODUCTOR"
            highlight="GALERÍA"
            subtitle="Elige una carpeta con MP3 o MP4 y reprodúcela con controles de play, pausa y siguiente."
            accent="border-violet-400/40 bg-violet-500/10 text-violet-200"
          />

          <div
            ref={containerRef}
            className="mx-auto w-full overflow-hidden rounded-2xl border border-cyan-300/45 shadow-[0_0_55px_-12px_rgba(34,211,238,0.85)]"
            style={{ height: "min(78dvh, 820px)" }}
          >
            <LobbyScreenOneHub width={playerSize.width} height={playerSize.height} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReproductorGaleriaPage;
