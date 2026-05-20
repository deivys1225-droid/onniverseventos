import { lazy, Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import type { MuxBroadcastPanelProps } from "@/components/streaming/MuxBroadcastPanel";

const MuxBroadcastPanelLazy = lazy(() =>
  import("@/components/streaming/MuxBroadcastPanel").then((m) => ({
    default: m.MuxBroadcastPanel,
  })),
);

function BroadcastFallback() {
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-cyan-400/30 bg-black/40 p-6 text-sm text-cyan-100/80">
      Cargando emisor de video…
    </div>
  );
}

/** Emisor Mux: carga diferida + solo cliente (equivalente a next/dynamic ssr: false). */
export function MuxBroadcastClient(props: MuxBroadcastPanelProps) {
  return (
    <ClientOnly fallback={<BroadcastFallback />}>
      <Suspense fallback={<BroadcastFallback />}>
        <MuxBroadcastPanelLazy {...props} />
      </Suspense>
    </ClientOnly>
  );
}
