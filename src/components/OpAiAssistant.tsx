import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnniAvatar from "@/components/OnniAvatar";
import HomeSocialRedesRow from "@/components/HomeSocialRedesRow";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { getOnniIntroduction } from "@/data/onniBrain";
import { getOpAssistantHint, resolveOpCommand } from "@/lib/opAssistantResolver";

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

  const hint = useMemo(() => getOpAssistantHint(location.pathname), [location.pathname]);
  const showSocialIcons = location.pathname === "/";

  const runCommand = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);

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

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    runCommand(trimmed);
  };

  return (
    <div className="pointer-events-none fixed bottom-3 left-4 z-[80] w-[min(92vw,380px)] max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-2 sm:bottom-8 sm:left-10 sm:block">
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
              <p className="text-[10px] text-muted-foreground">Asistente por texto</p>
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
              placeholder="conciertos, lobby, ayuda…"
            />
            <Button type="submit" size="icon" variant="hero" aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      {showSocialIcons && <HomeSocialRedesRow />}
    </div>
  );
}
