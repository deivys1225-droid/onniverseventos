import { ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { COLOSSEO_HOME_URL, COLOSSEO_SCENE_TITLE, coliseoBrowserFrameSrc } from "@/data/coliseoScene";
import {
  COLOSSEO_NATIVE_BROWSER_SLOT_ID,
  isColiseoNativeWebViewAvailable,
  useColiseoNativeWebViewSlot,
} from "@/lib/coliseoNativeWebView";
import { normalizeColiseoBrowserUrl } from "@/lib/coliseoBrowserUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ColiseoBrowserPanelProps = {
  variant: "floating" | "native";
  screenFocused: boolean;
  onFocusScreen: () => void;
  onUnfocusScreen?: () => void;
};

export default function ColiseoBrowserPanel({
  variant,
  screenFocused,
  onFocusScreen,
  onUnfocusScreen,
}: ColiseoBrowserPanelProps) {
  const isNativeOverlay = variant === "native";
  const nativeSlotRef = useRef<HTMLDivElement | null>(null);
  const useNativeWebView = isColiseoNativeWebViewAvailable();

  const [history, setHistory] = useState<string[]>([COLOSSEO_HOME_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [addressValue, setAddressValue] = useState(COLOSSEO_HOME_URL);
  const [reloadToken, setReloadToken] = useState(0);

  const currentUrl = history[historyIndex] ?? COLOSSEO_HOME_URL;
  const screenPointerEvents = screenFocused ? "auto" : "none";
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  useColiseoNativeWebViewSlot(nativeSlotRef, {
    enabled: useNativeWebView && screenFocused && isNativeOverlay,
    url: currentUrl,
    reloadToken,
  });

  const navigate = useCallback(
    (raw: string) => {
      const url = normalizeColiseoBrowserUrl(raw);
      setHistory((prev) => {
        const base = prev.slice(0, historyIndex + 1);
        if (base[base.length - 1] === url) return prev;
        const next = [...base, url];
        setHistoryIndex(next.length - 1);
        return next;
      });
      setAddressValue(url);
      setReloadToken(0);
    },
    [historyIndex],
  );

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const nextIndex = historyIndex - 1;
    const url = history[nextIndex] ?? COLOSSEO_HOME_URL;
    setHistoryIndex(nextIndex);
    setAddressValue(url);
    setReloadToken((t) => t + 1);
  }, [canGoBack, history, historyIndex]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const nextIndex = historyIndex + 1;
    const url = history[nextIndex] ?? COLOSSEO_HOME_URL;
    setHistoryIndex(nextIndex);
    setAddressValue(url);
    setReloadToken((t) => t + 1);
  }, [canGoForward, history, historyIndex]);

  const reload = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  const onSubmitAddress = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      navigate(addressValue);
    },
    [addressValue, navigate],
  );

  const wrapperClass = isNativeOverlay
    ? "flex min-h-0 flex-1 flex-col px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    : `rounded-2xl border bg-black/55 p-2 shadow-[0_40px_120px_rgba(0,0,0,0.9)] backdrop-blur-md transition-colors ${
        screenFocused ? "border-amber-300 ring-2 ring-amber-400/70" : "border-amber-400/35"
      }`;

  const viewportClass = isNativeOverlay
    ? "min-h-0 flex-1 w-full"
    : "h-[min(42vh,340px)] w-full overflow-hidden rounded-xl border border-white/15 bg-black";

  return (
    <div
      data-coliseo-screen
      className={wrapperClass}
      style={{ pointerEvents: screenPointerEvents, touchAction: screenFocused ? "auto" : "none" }}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (!screenFocused && !isNativeOverlay) onFocusScreen();
      }}
    >
      {!screenFocused && !isNativeOverlay && (
        <p className="pointer-events-none mb-1 text-center text-[10px] font-display uppercase tracking-wider text-amber-200/90">
          Clic para usar el navegador
        </p>
      )}

      <form
        onSubmit={onSubmitAddress}
        className={`flex flex-wrap items-center gap-1.5 ${isNativeOverlay ? "mb-2 shrink-0 bg-black/80 py-1" : "mb-2"}`}
        style={{ pointerEvents: screenPointerEvents }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {isNativeOverlay && onUnfocusScreen && (
          <Button
            type="button"
            size="sm"
            variant="heroOutline"
            className="h-8 shrink-0 px-2 text-[10px] uppercase"
            onClick={onUnfocusScreen}
          >
            Vista 360°
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="heroOutline"
          className="h-8 w-8 shrink-0"
          disabled={!canGoBack || !screenFocused}
          onClick={goBack}
          title="Atrás"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="heroOutline"
          className="h-8 w-8 shrink-0"
          disabled={!canGoForward || !screenFocused}
          onClick={goForward}
          title="Adelante"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="heroOutline"
          className="h-8 w-8 shrink-0"
          disabled={!screenFocused}
          onClick={reload}
          title="Recargar"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
        <Input
          value={addressValue}
          onChange={(event) => setAddressValue(event.target.value)}
          onFocus={onFocusScreen}
          placeholder="Buscar o escribir una dirección web"
          className="h-8 min-w-0 flex-1 border-white/15 bg-black/40 text-xs text-white placeholder:text-slate-500"
          style={{ pointerEvents: screenPointerEvents }}
          disabled={!screenFocused}
        />
        <Button type="submit" size="sm" variant="hero" className="h-8 shrink-0 px-3 text-xs" disabled={!screenFocused}>
          Ir
        </Button>
      </form>

      <div className={viewportClass} style={{ pointerEvents: isNativeOverlay ? "none" : screenPointerEvents }}>
        {useNativeWebView && isNativeOverlay ? (
          <div
            ref={nativeSlotRef}
            id={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
            data-native-webview-slot={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
            className="h-full w-full"
            aria-hidden
          />
        ) : (
          <iframe
            key={`${coliseoBrowserFrameSrc(currentUrl)}::${reloadToken}`}
            title={`${COLOSSEO_SCENE_TITLE} — navegador`}
            src={coliseoBrowserFrameSrc(currentUrl)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full w-full border-0 bg-white"
            style={{ pointerEvents: screenPointerEvents }}
          />
        )}
      </div>

      {screenFocused && !isNativeOverlay && (
        <p className="pointer-events-none mt-1 text-center text-[10px] text-slate-400">
          {useNativeWebView
            ? "YouTube nativo (Android) · Clic fuera para girar la vista · Escape también sale"
            : "Navega con la barra · Clic fuera para girar la vista · Escape también sale"}
        </p>
      )}
    </div>
  );
}
