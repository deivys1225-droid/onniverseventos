import type { ReactNode } from "react";
import { Smartphone } from "lucide-react";
import { isNativeAndroid } from "@/lib/nativePlayback";

/**
 * En APK bloquea rutas de reproducción web (/live-stream, /go/*, espectador live).
 * React solo como UI; el video es ExoPlayer nativo.
 */
export function NativePlaybackRouteGuard({ children }: { children: ReactNode }) {
  if (!isNativeAndroid()) {
    return <>{children}</>;
  }

  if (import.meta.env.DEV) {
    console.log("[Onniverso] WEB PLAYER BLOCKED ON ANDROID — route guard");
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Smartphone className="h-12 w-12 text-cyan-300" aria-hidden />
      <h1 className="text-xl font-bold text-cyan-50">Reproducción nativa</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Esta ruta es solo para navegador web. En la app Android usa las tarjetas EN VIVO — se abre SelectorActivity y
        ExoPlayer sin pasar por aquí.
      </p>
    </div>
  );
}
