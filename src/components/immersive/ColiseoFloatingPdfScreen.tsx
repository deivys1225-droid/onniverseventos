import { Html } from "@react-three/drei";
import { useMemo } from "react";

const PDF_SCREEN_POSITION: [number, number, number] = [-10.5, 1.35, -0.35];
const PDF_SCREEN_ROTATION: [number, number, number] = [0, Math.PI / 2, 0];
const PDF_SCREEN_WIDTH = "min(72vw, 540px)";
const PDF_SCREEN_HEIGHT = "min(80vh, 640px)";
const PDF_FALLBACK_URL =
  "https://drive.google.com/file/d/1IA-S_lyyiblp9iGzDx-qAL2AwXp1lIsY/view?usp=drive_link";

function extractGoogleDriveFileId(url: string): string | null {
  const match = url.match(/\/file\/d\/([^/]+)/i);
  return match?.[1] ?? null;
}

function buildPdfEmbedUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return PDF_FALLBACK_URL;

  const fileId = extractGoogleDriveFileId(raw);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;

  if (/\.pdf(\?|#|$)/i.test(raw)) return raw;

  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(raw)}`;
}

/** Pantalla PDF flotante en el lado izquierdo del Coliseo 360. */
export default function ColiseoFloatingPdfScreen({
  onScreenPointerDown,
}: {
  onScreenPointerDown?: () => void;
}) {
  const pdfUrl = useMemo(() => {
    if (typeof window === "undefined") return PDF_FALLBACK_URL;
    return new URLSearchParams(window.location.search).get("pdf")?.trim() || PDF_FALLBACK_URL;
  }, []);

  const iframeSrc = useMemo(() => buildPdfEmbedUrl(pdfUrl), [pdfUrl]);

  return (
    <group position={PDF_SCREEN_POSITION} rotation={PDF_SCREEN_ROTATION}>
      <Html
        transform
        distanceFactor={8.9}
        center
        zIndexRange={[50, 51]}
        style={{ width: PDF_SCREEN_WIDTH, pointerEvents: "auto" }}
      >
        <div
          data-coliseo-screen="true"
          onPointerDown={(event) => {
            event.stopPropagation();
            onScreenPointerDown?.();
          }}
          className="relative overflow-hidden rounded-lg border border-white/25 bg-black/30 shadow-[0_0_40px_rgba(0,0,0,0.45)] ring-1 ring-cyan-400/30"
          style={{ height: PDF_SCREEN_HEIGHT }}
        >
          <iframe
            src={iframeSrc}
            title="Lector PDF Coliseo"
            className="h-full w-full border-0 bg-white"
            loading="lazy"
            allow="fullscreen"
            referrerPolicy="no-referrer"
          />
          <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">
            PDF
          </div>
        </div>
      </Html>
    </group>
  );
}
