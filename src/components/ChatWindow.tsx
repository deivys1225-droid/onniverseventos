import { FormEvent, useEffect, useMemo, useState } from "react";
import { Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatWindowProps = {
  friendshipId: string;
  currentUserId: string;
  friendName: string;
  onClose: () => void;
};

type ChatMessage = {
  id: string;
  friendship_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

const ChatWindow = ({ friendshipId, currentUserId, friendName, onClose }: ChatWindowProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("friendship_id", friendshipId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    };
    void load();

    const channel = supabase
      .channel(`chat-${friendshipId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `friendship_id=eq.${friendshipId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage]),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [friendshipId]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    setText("");
    await supabase.from("chat_messages").insert({
      friendship_id: friendshipId,
      sender_id: currentUserId,
      message,
    });
  };

  const ordered = useMemo(() => messages, [messages]);

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[75] w-[min(92vw,320px)] rounded-2xl border border-cyan-300/35 bg-card/90 shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="truncate text-sm font-semibold text-cyan-100">Chat · {friendName}</p>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="h-44 space-y-1 overflow-y-auto px-3 py-2">
        {ordered.map((m) => {
          const own = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs ${
                  own ? "bg-cyan-500/25 text-cyan-50" : "bg-white/10 text-foreground"
                }`}
              >
                {m.message}
              </div>
            </div>
          );
        })}
      </div>
      <form className="flex gap-2 border-t border-white/10 p-2" onSubmit={onSend}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="h-8 border-cyan-300/30 bg-black/20 text-sm"
        />
        <Button type="submit" size="icon" className="h-8 w-8">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;
