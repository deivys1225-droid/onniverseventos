import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { getOpAssistantHint, resolveOpCommand } from "@/lib/opAssistantResolver";
import { useOnniVoice, useOnniVoicePrefs } from "@/hooks/useOnniVoice";
import { toast } from "sonner";

type UiMessage = { role: "user" | "assistant"; text: string };

const ONNI_GREETING = `¡Hola! Soy Onni, estoy aquí para ayudarte.\nDime si quieres ir al lobby, abrir salas, conciertos, reproductor mp4 o el menú.\nDi "Onni" o "Oni" y tu comando. Ejemplo: "Onni, llévame al lobby".`;

export default function OpAiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: "assistant", text: ONNI_GREETING },
  ]);

  const { listenEnabled, setListenEnabled, speakEnabled, setSpeakEnabled } = useOnniVoicePrefs();
  const hint = useMemo(() => getOpAssistantHint(location.pathname), [location.pathname]);

  const runCommand = useCallback(
    (raw: string, source: "text" | "voice") => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: source === "voice" ? `🎤 ${trimmed}` : trimmed },
      ]);

      const result = resolveOpCommand(trimmed, location.pathname);
      if (result.navigateTo) {
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
      if (result.command) dispatchOpCommand(result.command);
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer }]);
      return result.answer;
    },
    [location.pathname, navigate],
  );

  const speakRef = useRef<(text: string) => void>(() => {});

  const onWake = useCallback(
    (command: string) => {
      setOpen(true);
      const answer = runCommand(command, "voice");
      if (answer) speakRef.current(answer);
    },
    [runCommand],
  );

  const onWakeWithoutCommand = useCallback(() => {
    setOpen(true);
    const msg =
      "Te escucho. ¿Quieres ir al lobby, abrir salas, conciertos o el reproductor mp4? Dime qué hacemos.";
    setMessages((prev) => [...prev, { role: "assistant", text: msg }]);
    speakRef.current(msg);
  }, []);

  const { supported, isListening, isSpeaking, lastHeard, speak } = useOnniVoice({
    enabled: listenEnabled,
    speakEnabled,
    onWake,
    onWakeWithoutCommand,
    onError: (msg) => toast.error(msg),
  });

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  const greetedRef = useRef(false);
  useEffect(() => {
    if (!open || greetedRef.current || !speakEnabled || !supported) return;
    greetedRef.current = true;
    speak(
      "Hola, soy Onni. Estoy aquí para ayudarte. Dime si quieres ir al lobby, abrir salas, conciertos o el reproductor mp4.",
    );
  }, [open, speakEnabled, supported, speak]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const answer = runCommand(trimmed, "text");
    if (answer && speakEnabled) speak(answer);
  };

  const listenLabel = !supported
    ? "Voz no disponible en este navegador"
    : listenEnabled
      ? isListening
        ? "Onni escuchando… di: Onni, …"
        : "Reconectando micrófono…"
      : "Escucha desactivada";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] w-[min(92vw,360px)]">
      {!open ? (
        <div className="flex flex-col items-end gap-2">
          {listenEnabled && supported && (
            <span
              className={`pointer-events-none rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur-md ${
                isListening
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                  : "border-white/15 bg-black/40 text-muted-foreground"
              }`}
            >
              {isListening ? "Onni escuchando" : "Onni…"}
              {isSpeaking ? " · hablando" : ""}
            </span>
          )}
          <Button
            type="button"
            className={`pointer-events-auto h-11 rounded-full gap-2 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.65)] ${
              isListening ? "ring-2 ring-cyan-400/70 ring-offset-2 ring-offset-background" : ""
            }`}
            variant="hero"
            onClick={() => setOpen(true)}
          >
            <Bot className="h-4 w-4" />
            Onni
          </Button>
        </div>
      ) : (
        <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-card/90 backdrop-blur-xl shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cyan-100">Onni</p>
              <p className="truncate text-[10px] text-muted-foreground">{listenLabel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={listenEnabled ? "Desactivar escucha" : "Activar escucha"}
                onClick={() => setListenEnabled((v) => !v)}
                disabled={!supported}
              >
                {listenEnabled ? <Mic className="h-4 w-4 text-cyan-300" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={speakEnabled ? "Silenciar respuestas" : "Activar voz de Onni"}
                onClick={() => setSpeakEnabled((v) => !v)}
                disabled={!supported}
              >
                {speakEnabled ? <Volume2 className="h-4 w-4 text-cyan-300" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
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
            {lastHeard && listenEnabled ? (
              <p className="text-[10px] text-cyan-200/70">Último audio: {lastHeard}</p>
            ) : null}
          </div>
          <form onSubmit={onSend} className="flex items-center gap-2 border-t border-white/10 p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='Onni, conciertos… o escribe aquí'
            />
            <Button type="submit" size="icon" variant="hero" aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
