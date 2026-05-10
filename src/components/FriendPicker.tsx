import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FriendCandidate = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

type FriendPickerProps = {
  open: boolean;
  candidates: FriendCandidate[];
  onClose: () => void;
  onSelect: (candidate: FriendCandidate) => void;
};

const FriendPicker = ({ open, candidates, onClose, onSelect }: FriendPickerProps) => {
  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed bottom-20 left-1/2 z-[72] w-[min(92vw,340px)] -translate-x-1/2 rounded-2xl border border-cyan-300/35 bg-card/90 p-3 shadow-[0_0_40px_-16px_rgba(34,211,238,0.8)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">Agregar amigo</p>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-52 space-y-1.5 overflow-y-auto">
        {candidates.length === 0 && <p className="text-xs text-muted-foreground">No hay perfiles disponibles en sala.</p>}
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left transition hover:border-cyan-300/50"
          >
            <img
              src={c.avatarUrl?.trim() || "/placeholder.svg"}
              alt={`Avatar de ${c.name}`}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/15"
            />
            <span className="flex-1 truncate text-sm text-foreground">{c.name}</span>
            <UserPlus className="h-4 w-4 text-cyan-200" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default FriendPicker;
