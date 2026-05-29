import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnniAvatar from "@/components/OnniAvatar";
import HomeSocialRedesRow from "@/components/HomeSocialRedesRow";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { getOnniIntroduction } from "@/data/onniBrain";
import { getOpAssistantHint, resolveOpCommand } from "@/lib/opAssistantResolver";
import { invokeOpenGalleryDirect } from "@/lib/galleryOpenDirect";
import { invokeOpenColiceoDirect } from "@/lib/coliseoOpenDirect";
import { publishOnniAulaKnowledge } from "@/lib/onniAulaKnowledgeBoard";
import { extractWikipediaTopic, fetchWikipediaSummary } from "@/lib/wikipediaSummary";
import {
  getHomeSocialUrl,
  loadHomeSocialRedesConfig,
  type HomeSocialIconId,
} from "@/lib/homeSocialRedesConfig";
import { openHomeSocialRedes } from "@/lib/homeSocialRedesOpen";

type UiMessage = { role: "user" | "assistant"; text: string };
type VoiceDetail = string | { text?: string; transcript?: string; final?: boolean; isFinal?: boolean };
type VoiceErrorDetail = string | { code?: string; message?: string };
type NativeVoiceBridge = {
  startListening?: () => void;
  stopListening?: () => void;
  speak?: (text: string) => void;
  stopSpeaking?: () => void;
};

function parseVoiceResult(detail: unknown): { text: string; isFinal: boolean } {
  if (typeof detail === "string") {
    return { text: detail.trim(), isFinal: true };
  }
  if (detail && typeof detail === "object") {
    const payload = detail as VoiceDetail;
    const text =
      typeof payload.text === "string"
        ? payload.text.trim()
        : typeof payload.transcript === "string"
          ? payload.transcript.trim()
          : "";
    const isFinal =
      typeof payload.isFinal === "boolean"
        ? payload.isFinal
        : typeof payload.final === "boolean"
          ? payload.final
          : true;
    return { text, isFinal };
  }
  return { text: "", isFinal: false };
}

function parseVoiceError(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const payload = detail as VoiceErrorDetail;
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
    if (typeof payload.code === "string" && payload.code.trim()) return `Error de voz: ${payload.code.trim()}`;
  }
  return "No se pudo activar la voz nativa en este momento.";
}

function getNativeVoiceBridge(): NativeVoiceBridge | null {
  if (typeof window === "undefined") return null;
  const android = window.Android;
  if (android && (typeof android.startListening === "function" || typeof android.speak === "function")) {
    return android;
  }
  const bridge = window.AndroidBridge as NativeVoiceBridge | undefined;
  if (bridge && (typeof bridge.startListening === "function" || typeof bridge.speak === "function")) {
    return bridge;
  }
  return null;
}

export default function OpAiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: "assistant", text: getOnniIntroduction() },
  ]);
  const sessionRef = useRef<{ lastAnswer?: string }>({});
  const pendingVoiceRef = useRef("");

  const hint = useMemo(() => getOpAssistantHint(location.pathname), [location.pathname]);
  const showSocialIcons = location.pathname === "/";
  const voiceSupported = typeof getNativeVoiceBridge()?.startListening === "function";
  const voiceUiEnabled = true;

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setProcessing(true);

      const wikiTopic = extractWikipediaTopic(trimmed);
      if (wikiTopic) {
        try {
          const wiki = await fetchWikipediaSummary(wikiTopic);
          const shortAnswer = wiki
            ? `${wiki.title}: ${wiki.shortText}`
            : "No encontré un resultado claro en Wikipedia para eso. Prueba con otro nombre.";
          setMessages((prev) => [...prev, { role: "assistant", text: shortAnswer }]);
          sessionRef.current.lastAnswer = shortAnswer;

          if (wiki && location.pathname.startsWith("/aula-virtual")) {
            publishOnniAulaKnowledge({
              title: wiki.title,
              shortText: wiki.shortText,
              fullText: wiki.fullText,
              sourceUrl: wiki.canonicalUrl,
            });
          }

          const voiceBridge = getNativeVoiceBridge();
          if (typeof voiceBridge?.speak === "function") {
            try {
              voiceBridge.stopSpeaking?.();
              voiceBridge.speak(shortAnswer);
            } catch {
              /* ignore voice bridge failures */
            }
          }
          return shortAnswer;
        } catch {
          const failAnswer = "Ahora mismo no pude consultar Wikipedia. Inténtalo de nuevo en unos segundos.";
          setMessages((prev) => [...prev, { role: "assistant", text: failAnswer }]);
          sessionRef.current.lastAnswer = failAnswer;
          return failAnswer;
        } finally {
          setProcessing(false);
        }
      }

      try {
        const result = resolveOpCommand(trimmed, location.pathname, {
          lastAnswer: sessionRef.current.lastAnswer,
        });
        sessionRef.current.lastAnswer = result.answer;

        if (result.navigateBack) {
          navigate(-1);
        } else if (result.navigateTo) {
          if (result.navigateTo === "/reproductor-galeria" && invokeOpenGalleryDirect()) {
            // Mantener exactamente la misma experiencia del icono de inicio en Android.
          } else if (result.navigateTo === "/coliseo" && invokeOpenColiceoDirect()) {
            // Mantener exactamente la misma experiencia del icono Coliseo en Android.
          } else if (result.navigateTo.startsWith("home-social:")) {
            const iconId = result.navigateTo.replace("home-social:", "").trim() as HomeSocialIconId;
            const icons = loadHomeSocialRedesConfig();
            openHomeSocialRedes(getHomeSocialUrl(icons, iconId, "redes"));
          } else {
            const [path, hash] = result.navigateTo.split("#");
            if (hash) {
              navigate(path);
              window.setTimeout(() => {
                document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 400);
            } else {
              navigate(result.navigateTo);
            }
          }
        }
        if (result.command) dispatchOpCommand(result.command);
        setMessages((prev) => [...prev, { role: "assistant", text: result.answer }]);
        const voiceBridge = getNativeVoiceBridge();
        if (typeof voiceBridge?.speak === "function") {
          try {
            voiceBridge.stopSpeaking?.();
            voiceBridge.speak(result.answer);
          } catch {
            /* ignore voice bridge failures */
          }
        }
        return result.answer;
      } finally {
        setProcessing(false);
      }
    },
    [location.pathname, navigate],
  );

  useEffect(() => {
    const onVoiceStart = () => {
      pendingVoiceRef.current = "";
      setVoiceListening(true);
    };
    const onVoiceResult = (event: Event) => {
      const custom = event as CustomEvent<unknown>;
      const { text: transcript } = parseVoiceResult(custom.detail);
      if (!transcript) return;
      pendingVoiceRef.current = transcript;
      setText(transcript);
    };
    const onVoiceEnd = () => {
      setVoiceListening(false);
      const transcript = pendingVoiceRef.current.trim();
      pendingVoiceRef.current = "";
      setText("");
      if (transcript) void runCommand(transcript);
    };
    const onVoiceError = (event: Event) => {
      const custom = event as CustomEvent<unknown>;
      setVoiceListening(false);
      pendingVoiceRef.current = "";
      const errorText = parseVoiceError(custom.detail);
      setMessages((prev) => [...prev, { role: "assistant", text: errorText }]);
    };

    window.addEventListener("voice:start", onVoiceStart);
    window.addEventListener("voice:result", onVoiceResult);
    window.addEventListener("voice:end", onVoiceEnd);
    window.addEventListener("voice:error", onVoiceError);
    return () => {
      window.removeEventListener("voice:start", onVoiceStart);
      window.removeEventListener("voice:result", onVoiceResult);
      window.removeEventListener("voice:end", onVoiceEnd);
      window.removeEventListener("voice:error", onVoiceError);
    };
  }, [runCommand]);

  const onToggleVoice = useCallback(() => {
    const voiceBridge = getNativeVoiceBridge();
    if (typeof voiceBridge?.startListening !== "function") {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "No encuentro el puente de voz nativo en esta compilación Android." },
      ]);
      return;
    }
    try {
      if (voiceListening) {
        voiceBridge.stopListening?.();
      } else {
        pendingVoiceRef.current = "";
        setText("");
        voiceBridge.startListening();
      }
    } catch {
      setVoiceListening(false);
    }
  }, [voiceListening]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    void runCommand(trimmed);
  };

  return (
    <div className="pointer-events-none fixed bottom-10 left-4 z-[80] w-[min(92vw,380px)] max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-2 sm:bottom-8 sm:left-10 sm:block">
      {!open ? (
        <button
          type="button"
          className="pointer-events-auto relative z-[90] order-1 group flex flex-col items-center gap-1.5 rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
          onClick={() => setOpen(true)}
          aria-label="Abrir Onni, asistente de texto"
        >
          <OnniAvatar size="lg" state="idle" className="max-sm:h-16" />
        </button>
      ) : (
        <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-card/90 backdrop-blur-xl shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)]">
          <div className="flex items-start gap-3 border-b border-white/10 px-3 py-3">
            <OnniAvatar size="md" state="idle" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cyan-100">Onni</p>
              <p className="text-[10px] text-muted-foreground">Asistente por voz y texto</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <div className="h-52 space-y-2 overflow-y-auto px-3 py-2">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 text-xs ${
                    m.role === "user" ? "bg-cyan-500/25 text-cyan-50" : "bg-white/10 text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">{hint}</p>
          </div>
          <form onSubmit={onSend} className="flex items-center gap-2 border-t border-white/10 p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="conciertos, lobby, ayuda o: quien fue Simón Bolívar"
            />
            {voiceUiEnabled && (
              <Button
                type="button"
                size="icon"
                variant={voiceListening ? "secondary" : "outline"}
                onClick={onToggleVoice}
                aria-label={voiceListening ? "Detener micrófono de Onni" : "Hablar con Onni"}
              >
                {voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button type="submit" size="icon" variant="hero" aria-label="Enviar" disabled={processing}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      {showSocialIcons && <HomeSocialRedesRow />}
    </div>
  );
}
