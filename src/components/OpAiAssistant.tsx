import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnniAvatar, { type OnniAvatarState } from "@/components/OnniAvatar";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { getOnniIntroduction } from "@/data/onniBrain";
import { getOpAssistantHint, resolveOpCommand } from "@/lib/opAssistantResolver";
import { useOnniVoice, useOnniVoicePrefs } from "@/hooks/useOnniVoice";
import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UiMessage = { role: "user" | "assistant"; text: string };

export default function OpAiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: "assistant", text: getOnniIntroduction() },
  ]);
  const sessionRef = useRef<{ lastAnswer?: string }>({});
  const micPromptedRef = useRef(false);

  const { listenEnabled, setListenEnabled, speakEnabled, setSpeakEnabled } = useOnniVoicePrefs();

  const promptMicrophone = useCallback(async () => {
    if (!listenEnabled) return;
    const status = await requestOnniMicrophoneAccess();
    if (status === "denied") {
      toast.error(onniMicDeniedMessage());
    }
  }, [listenEnabled]);
  const hint = useMemo(() => getOpAssistantHint(location.pathname), [location.pathname]);

  const runCommand = useCallback(
    (raw: string, source: "text" | "voice") => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: source === "voice" ? `🎤 ${trimmed}` : trimmed },
      ]);

      const result = resolveOpCommand(trimmed, location.pathname, {
        lastAnswer: sessionRef.current.lastAnswer,
      });
      sessionRef.current.lastAnswer = result.answer;

      if (result.navigateBack) {
        navigate(-1);
      } else if (result.navigateTo) {
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
      "Te escucho. Pregúntame «¿dónde estoy?», «ayuda», o dime lobby, conciertos, reproductor mp4… tú mandas.";
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

  useEffect(() => {
    if (!open || !listenEnabled || !supported || micPromptedRef.current) return;
    micPromptedRef.current = true;
    void promptMicrophone();
  }, [open, listenEnabled, supported, promptMicrophone]);

  const greetedRef = useRef(false);
  useEffect(() => {
    if (!open || greetedRef.current || !speakEnabled || !supported) return;
    greetedRef.current = true;
    speak(
      "Hola, soy Onni. Pregúntame dónde estoy, ayuda, o dime lobby, conciertos, reproductor mp4. Di Onni y tu comando.",
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

  const avatarState: OnniAvatarState = isSpeaking ? "speaking" : isListening ? "listening" : "idle";

  const listenLabel = !supported
    ? "Voz no disponible en este navegador"
    : listenEnabled
      ? isListening
        ? "Escuchando… di: Onni, …"
        : "Reconectando micrófono…"
      : "Escucha desactivada";

  return (
    <div className="pointer-events-none fixed bottom-8 left-10 z-[80] w-[min(92vw,380px)]">
      {!open ? (
        <div className="flex flex-col items-start gap-2">
          {listenEnabled && supported && (
            <span
              className={cn(
                "pointer-events-none rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur-md",
                isListening
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                  : "border-white/15 bg-black/40 text-muted-foreground",
              )}
            >
              {isListening ? "Onni escuchando" : "Di: Onni…"}
              {isSpeaking ? " · hablando" : ""}
            </span>
          )}
          <button
            type="button"
            className="pointer-events-auto group flex flex-col items-center gap-1.5 rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
            onClick={() => {
              setOpen(true);
            }}
            aria-label="Abrir Onni, asistente de voz"
          >
            <OnniAvatar size="lg" state={avatarState} />
          </button>
        </div>
      ) : (
        <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-card/90 backdrop-blur-xl shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)]">
          <div className="flex items-start gap-3 border-b border-white/10 px-3 py-3">
            <OnniAvatar size="md" state={avatarState} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cyan-100">Onni</p>
              <p className="text-[10px] text-muted-foreground">{listenLabel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={listenEnabled ? "Desactivar escucha" : "Activar escucha"}
                onClick={() => {
                  setListenEnabled((v) => {
                    const next = !v;
                    if (next) {
                      micPromptedRef.current = false;
                      void promptMicrophone();
                    }
                    return next;
                  });
                }}
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
