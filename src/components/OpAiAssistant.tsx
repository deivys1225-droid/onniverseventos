import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dispatchOpCommand, type OpCommand } from "@/lib/opCommandBus";

type UiMessage = { role: "user" | "assistant"; text: string };

function normalize(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function pickCommand(textRaw: string): { command?: OpCommand; answer: string; navigateTo?: string } {
  const text = normalize(textRaw);
  if (!text) return { answer: "Escribe un comando, por ejemplo: “llévame al lobby” o “abre el menú”." };

  // --- Menú ---
  if (/\b(menu|men[uú])\b/.test(text)) {
    if (/\b(abr|abre|abrir|despliega|mostrar)\b/.test(text)) {
      return { command: { type: "ui.menu.open" }, answer: "Listo: abrí el menú." };
    }
    if (/\b(cierra|cerrar|oculta|esconde)\b/.test(text)) {
      return { command: { type: "ui.menu.close" }, answer: "Listo: cerré el menú." };
    }
    if (/\b(toggle|alternar)\b/.test(text) || /\b(menu)\b/.test(text)) {
      return { command: { type: "ui.menu.toggle" }, answer: "Listo: alterné el menú." };
    }
  }

  // --- Navegación ---
  if (/\b(inicio|home|principal)\b/.test(text)) return { navigateTo: "/", answer: "Te llevo al inicio." };
  if (/\b(concierto|conciertos|live)\b/.test(text)) return { navigateTo: "/nuestras-salas", answer: "Te llevo a Conciertos Live." };
  if (/\b(aula)\b/.test(text)) return { navigateTo: "/aula-virtual", answer: "Te llevo al Aula Virtual." };
  if (/\b(lobby)\b/.test(text)) return { navigateTo: "/lobby-inmersivo", answer: "Te llevo al Lobby inmersivo." };
  if (/\b(eventos)\b/.test(text)) return { navigateTo: "/eventos", answer: "Te llevo a Eventos." };
  if (/\b(tienda)\b/.test(text)) return { navigateTo: "/tienda", answer: "Te llevo a la Tienda." };
  if (/\b(comunidad|chat)\b/.test(text)) return { navigateTo: "/comunidad", answer: "Te llevo a Comunidad." };

  // --- Lobby (operaciones) ---
  if (/\b(pantalla)\b/.test(text)) {
    if (/\b(uno|1)\b/.test(text)) return { command: { type: "lobby.focusScreen", screen: 1 }, answer: "Listo: enfocando pantalla 1." };
    if (/\b(dos|2)\b/.test(text)) return { command: { type: "lobby.focusScreen", screen: 2 }, answer: "Listo: enfocando pantalla 2." };
    if (/\b(tres|3)\b/.test(text)) return { command: { type: "lobby.focusScreen", screen: 3 }, answer: "Listo: enfocando pantalla 3." };
    if (/\b(salir|cerrar|quitar)\b/.test(text)) return { command: { type: "lobby.unfocusScreen" }, answer: "Listo: saliendo de la pantalla." };
  }

  if (/\b(gyro|giroscopio)\b/.test(text)) {
    if (/\b(activar|enciende|prende|habilita)\b/.test(text)) return { command: { type: "lobby.gyro.enable" }, answer: "Listo: activé el giroscopio." };
    if (/\b(desactivar|apaga|deshabilita)\b/.test(text)) return { command: { type: "lobby.gyro.disable" }, answer: "Listo: desactivé el giroscopio." };
    if (/\b(recentrar|centrar|recenter)\b/.test(text)) return { command: { type: "lobby.gyro.recenter" }, answer: "Listo: recentré la vista." };
    return { command: { type: "lobby.gyro.toggle" }, answer: "Listo: alterné el giroscopio." };
  }

  return {
    answer:
      "Aún no tengo esa acción conectada. Prueba con: “llévame al lobby”, “abre el menú”, “pantalla 1”, “activar giroscopio”.",
  };
}

export default function OpAiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: "assistant", text: "Hola. Dime qué hago: “llévame al lobby”, “abre el menú”, “pantalla 1”…" },
  ]);

  const hint = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/lobby-inmersivo")) return "En lobby: “pantalla 1/2/3”, “activar giroscopio”, “recentrar”.";
    return "Ejemplos: “inicio”, “conciertos live”, “aula virtual”, “abre el menú”.";
  }, [location.pathname]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const raw = text;
    const trimmed = raw.trim();
    if (!trimmed) return;
    setText("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);

    const result = pickCommand(trimmed);
    if (result.navigateTo) navigate(result.navigateTo);
    if (result.command) dispatchOpCommand(result.command);
    setMessages((prev) => [...prev, { role: "assistant", text: result.answer }]);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] w-[min(92vw,360px)]">
      {!open ? (
        <div className="flex justify-end">
          <Button
            type="button"
            className="pointer-events-auto h-11 rounded-full gap-2 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.65)]"
            variant="hero"
            onClick={() => setOpen(true)}
          >
            <Bot className="h-4 w-4" />
            Asistente
          </Button>
        </div>
      ) : (
        <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-card/90 backdrop-blur-xl shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <p className="text-sm font-semibold text-cyan-100">Asistente operacional</p>
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
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe: “llévame al lobby”" />
            <Button type="submit" size="icon" variant="hero" aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

