import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnniAvatar from "@/components/OnniAvatar";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { getOnniIntroduction } from "@/data/onniBrain";
import { getOpAssistantHint, resolveOpCommand } from "@/lib/opAssistantResolver";
import { FacebookGlyph, InstagramGlyph } from "@/components/SocialFooterIcons";

type UiMessage = { role: "user" | "assistant"; text: string };

const YouTubeGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.7 15.6V8.4L16 12l-6.3 3.6z"
    />
  </svg>
);

const TikTokBrandGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#25F4EE"
      d="M13.1 4.4v8.2c0 .4-.1.7-.3 1-.4.9-1.2 1.5-2.2 1.5-1.4 0-2.5-1.1-2.5-2.5S9.2 10 10.6 10c.3 0 .6.1.9.2V7.8c-.3-.1-.6-.1-.9-.1-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9c2 0 3.7-1.2 4.5-2.9.3-.6.4-1.3.4-2V8.9c1 .7 2.2 1.1 3.5 1.1V7.6c-.8 0-1.6-.2-2.3-.6-.8-.4-1.5-1-1.9-1.8-.3-.5-.4-1.1-.4-1.8h-2.3z"
    />
    <path
      fill="#FE2C55"
      d="M14 3.6v8.2c0 .4-.1.7-.3 1-.4.9-1.2 1.5-2.2 1.5-.5 0-1-.1-1.4-.4.4.8 1.2 1.3 2.1 1.3 1 0 1.8-.6 2.2-1.5.2-.3.3-.6.3-1V4.5c0 .7.1 1.3.4 1.8.4.8 1.1 1.4 1.9 1.8.7.3 1.5.5 2.3.6V6.3c-1.2 0-2.3-.4-3.2-1.1V3.6H14z"
      opacity="0.95"
    />
    <path
      fill="#fff"
      d="M13.6 4v8.4c0 .4-.1.8-.3 1.1-.4.9-1.3 1.5-2.3 1.5-1.5 0-2.6-1.2-2.6-2.6s1.2-2.6 2.6-2.6c.3 0 .7.1 1 .2V8c-.3-.1-.7-.1-1-.1-2.5 0-4.5 2-4.5 4.5S8.5 17 11 17c1.8 0 3.4-1.1 4.1-2.7.2-.5.4-1.1.4-1.7V9.2c1 .7 2.3 1.1 3.5 1.1V8.2c-.8 0-1.5-.2-2.2-.6-.8-.4-1.4-.9-1.8-1.7-.3-.5-.4-1.2-.4-1.9h-1z"
    />
  </svg>
);

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
    <div className="pointer-events-none fixed bottom-8 left-10 z-[80] w-[min(92vw,380px)]">
      {showSocialIcons && (
      <div className="pointer-events-none absolute bottom-1 left-1/2 z-[81] flex -translate-x-1/2 items-center gap-2 sm:left-[14rem] sm:translate-x-0">
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-red-500/65 bg-[#ff0000] text-white shadow-[0_0_20px_-6px_rgba(255,0,0,0.95)] backdrop-blur-md"
          aria-label="YouTube (pendiente)"
        >
          <YouTubeGlyph />
        </button>
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-blue-500/65 bg-[#1877f2] text-white shadow-[0_0_20px_-6px_rgba(24,119,242,0.95)] backdrop-blur-md"
          aria-label="Facebook (pendiente)"
        >
          <FacebookGlyph />
        </button>
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-fuchsia-500/65 bg-[linear-gradient(135deg,#f58529_0%,#feda77_18%,#dd2a7b_45%,#8134af_72%,#515bd4_100%)] text-white shadow-[0_0_20px_-6px_rgba(221,42,123,0.95)] backdrop-blur-md"
          aria-label="Instagram (pendiente)"
        >
          <InstagramGlyph />
        </button>
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/65 bg-black text-white shadow-[0_0_20px_-6px_rgba(255,255,255,0.6)] backdrop-blur-md"
          aria-label="TikTok (pendiente)"
        >
          <TikTokBrandGlyph />
        </button>
      </div>
      )}
      {!open ? (
        <button
          type="button"
          className="pointer-events-auto group flex flex-col items-center gap-1.5 rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
          onClick={() => setOpen(true)}
          aria-label="Abrir Onni, asistente de texto"
        >
          <OnniAvatar size="lg" state="idle" />
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
    </div>
  );
}
