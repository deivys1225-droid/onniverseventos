import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Flame, Laugh, Mic2, Send, Sparkles, Theater, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SocialArenaTeatro from "@/components/SocialArenaTeatro";
import { Button } from "@/components/ui/button";
import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";
import { toast } from "sonner";

interface TeatroRoom {
  id: string;
  title: string;
  subtitle: string;
  country: string;
  videoUrl: string;
  vipZone: boolean;
}

const teatroRooms: TeatroRoom[] = [
  {
    id: "franco-escamilla",
    title: "Franco Escamilla",
    subtitle: "Stand-Up Sin Censura",
    country: "Mexico",
    videoUrl: SALA_MP4_URL_BY_ID["franco-escamilla"],
    vipZone: false,
  },
  {
    id: "hablando-huevadas",
    title: "Hablando Huevadas",
    subtitle: "Show en vivo con la comunidad",
    country: "Peru",
    videoUrl: SALA_MP4_URL_BY_ID["hablando-huevadas"],
    vipZone: false,
  },
  {
    id: "xavi",
    title: "Xavi",
    subtitle: "Corridos en vivo con la comunidad",
    country: "USA / México",
    videoUrl: SALA_MP4_URL_BY_ID.xavi,
    vipZone: false,
  },
  {
    id: "michael-jackson",
    title: "Michael Jackson",
    subtitle: "Greatest hits en vivo",
    country: "USA",
    videoUrl: SALA_MP4_URL_BY_ID["michael-jackson"],
    vipZone: true,
  },
];

type Reaction = "risas" | "aplausos" | "epico";

const baseMessages = [
  "Que entrada tan epica.",
  "Esta rutina esta brutal.",
  "Saludos desde Medellin!",
];

const reactionStyles: Record<Reaction, { emoji: string; color: string }> = {
  risas: { emoji: "😂", color: "text-yellow-300" },
  aplausos: { emoji: "👏", color: "text-sky-300" },
  epico: { emoji: "🔥", color: "text-orange-300" },
};

const SalaTeatro = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const room = useMemo(() => teatroRooms.find((item) => item.id === id), [id]);
  const [messages, setMessages] = useState(baseMessages);
  const [chatInput, setChatInput] = useState("");
  const [activeReactions, setActiveReactions] = useState<Array<{ id: number; type: Reaction }>>([]);

  useEffect(() => {
    const onShop = () => {
      toast.message("MERCH SHOP", { description: "Abriendo boutique ViveVR…" });
      navigate("/tienda");
    };
    const onVr = () => toast.message("VR SETTINGS", { description: "Calibracion espacial preparada." });
    window.addEventListener("social-arena:shop", onShop);
    window.addEventListener("social-arena:vr", onVr);
    return () => {
      window.removeEventListener("social-arena:shop", onShop);
      window.removeEventListener("social-arena:vr", onVr);
    };
  }, [navigate]);

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="rounded-2xl border border-border/50 bg-card/40 p-8 text-center backdrop-blur-md">
            <h1 className="mb-3 font-display text-2xl font-bold">Sala no encontrada</h1>
            <Link to="/teatro-hub" className="text-primary underline-offset-4 hover:underline">
              Volver a TeatroHub
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const pushReaction = (type: Reaction) => {
    const reaction = { id: Date.now() + Math.floor(Math.random() * 1000), type };
    setActiveReactions((prev) => [...prev, reaction]);
    window.setTimeout(() => {
      setActiveReactions((prev) => prev.filter((item) => item.id !== reaction.id));
    }, 1200);
  };

  const sendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev.slice(-14), trimmed]);
    setChatInput("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <div className="fixed inset-0 z-0">
        <SocialArenaTeatro
          videoUrl={room.videoUrl}
          roomTitle={room.title}
          className="h-dvh min-h-[100svh] w-full"
          messages={messages}
          chatInput={chatInput}
          onChatInput={setChatInput}
          onSend={sendMessage}
        />
      </div>

      {/* HUD fijo estilo gafas VR */}
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-20 flex items-start justify-between gap-4 p-4 md:p-6">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <Link
            to="/teatro-hub"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/45 bg-black/55 px-4 py-2 text-xs font-display font-bold uppercase tracking-wider text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.25)] backdrop-blur-xl transition hover:bg-black/70"
          >
            <ArrowLeft className="h-4 w-4" />
            TeatroHub
          </Link>
          <div className="rounded-2xl border border-emerald-400/35 bg-black/50 px-4 py-2 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
              <Theater className="h-4 w-4" />
              Social VR Arena
            </div>
            <p className="font-display text-lg font-bold text-white">{room.title}</p>
            <p className="text-xs text-slate-400">{room.subtitle}</p>
          </div>
        </div>
        <div className="pointer-events-auto hidden rounded-2xl border border-cyan-500/30 bg-black/50 px-4 py-2 text-right backdrop-blur-xl md:block">
          <p className="text-[10px] uppercase tracking-widest text-cyan-300">Balance</p>
          <p className="font-display text-sm font-bold text-white">1200 ADH Tickets</p>
        </div>
      </header>

      <AnimatePresence>
        {activeReactions.map((reaction) => {
          const style = reactionStyles[reaction.type];
          return (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 0, y: 24, scale: 0.7 }}
              animate={{ opacity: 1, y: -20, scale: 1.05 }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              className={`pointer-events-none fixed left-1/2 top-1/3 z-30 -translate-x-1/2 text-6xl ${style.color} drop-shadow-[0_0_20px_rgba(255,255,255,0.35)]`}
            >
              {style.emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <footer className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 p-4 md:p-6">
        <div className="pointer-events-auto mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full border border-cyan-400/40 bg-gradient-to-br from-cyan-500/30 to-purple-600/30" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Tu avatar</p>
              <p className="text-sm font-semibold text-white">Real-ID conectado</p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-2 md:justify-end">
            <Button variant="heroOutline" size="sm" className="gap-1 border-emerald-400/40" onClick={() => pushReaction("risas")}>
              😂 Risas
            </Button>
            <Button variant="heroOutline" size="sm" className="gap-1 border-sky-400/40" onClick={() => pushReaction("aplausos")}>
              👏 Aplausos
            </Button>
            <Button variant="hero" size="sm" className="gap-1" onClick={() => pushReaction("epico")}>
              🔥 Epico
            </Button>
            {room.vipZone && (
              <Button variant="hero" size="sm" className="ml-1 gap-1 border-amber-400/50 bg-amber-500/25">
                <Sparkles className="h-4 w-4" />
                Subir al Escenario
              </Button>
            )}
          </div>
        </div>
      </footer>

      {/* Minichat lateral opcional en movil / secondary */}
      <aside className="pointer-events-none fixed bottom-24 right-4 z-20 hidden max-w-[200px] md:block lg:bottom-32">
        <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/50 p-3 text-xs text-slate-300 backdrop-blur-md">
          <div className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-wider text-cyan-300">
            <Users className="h-3 w-3" />
            Lobby sync
          </div>
          <div className="max-h-28 space-y-1 overflow-y-auto">
            {messages.slice(-4).map((m, i) => (
              <p key={`${m}-${i}`} className="leading-snug text-[11px]">
                {m}
              </p>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Chat…"
              className="h-7 flex-1 rounded border border-white/10 bg-black/40 px-2 text-[11px] text-white outline-none"
            />
            <Button size="icon" variant="heroOutline" className="h-7 w-7" onClick={sendMessage}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="pointer-events-none fixed left-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-2 text-[10px] text-slate-500 md:flex">
        <Mic2 className="h-4 w-4 text-cyan-400/60" />
        <Flame className="h-4 w-4 text-orange-400/60" />
        <Laugh className="h-4 w-4 text-yellow-300/60" />
      </div>
    </div>
  );
};

export default SalaTeatro;
