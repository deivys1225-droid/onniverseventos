import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Shield, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listVaultItems, type VaultItem, type VaultItemType } from "@/lib/vaultItems";

type VaultCardProps = {
  userId?: string;
  onClose?: () => void;
};

const typeLabel: Record<VaultItemType, string> = {
  biblioteca: "Libro",
  cursos: "Curso",
  ticket: "Ticket",
  skin: "Skin",
};

const iconByType: Record<VaultItemType, JSX.Element> = {
  biblioteca: <BookOpen className="h-3.5 w-3.5" />,
  cursos: <GraduationCap className="h-3.5 w-3.5" />,
  ticket: <Ticket className="h-3.5 w-3.5" />,
  skin: <Shield className="h-3.5 w-3.5" />,
};

export default function VaultCard({ userId, onClose }: VaultCardProps) {
  const [items, setItems] = useState<VaultItem[]>([]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    setItems(listVaultItems(userId));
    const onStorage = () => setItems(listVaultItems(userId));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const groupedCount = useMemo(() => {
    return {
      biblioteca: items.filter((item) => item.type === "biblioteca").length,
      cursos: items.filter((item) => item.type === "cursos").length,
      ticket: items.filter((item) => item.type === "ticket").length,
      skin: items.filter((item) => item.type === "skin").length,
    };
  }, [items]);

  return (
    <div className="w-[min(92vw,620px)] rounded-2xl border border-cyan-300/45 bg-black/65 p-4 shadow-[0_0_45px_-14px_rgba(34,211,238,0.82)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Boveda OnniVers</p>
          <h3 className="text-lg font-semibold text-cyan-50">Tus compras en miniatura</h3>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onClose?.()}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] text-cyan-100 md:grid-cols-4">
        <span className="rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-2 py-1">Biblioteca: {groupedCount.biblioteca}</span>
        <span className="rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-2 py-1">Cursos: {groupedCount.cursos}</span>
        <span className="rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-2 py-1">Tickets: {groupedCount.ticket}</span>
        <span className="rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-2 py-1">Skins: {groupedCount.skin}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/5 px-4 py-10 text-center text-sm text-cyan-100/90">
          Aun no hay compras en tu boveda. Cuando compres en Tienda o tickets, apareceran aqui.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {items.slice(0, 12).map((item) => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-cyan-300/30 bg-black/40">
              <div className="h-20 w-full bg-slate-900">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-cyan-200/85">{iconByType[item.type]}</div>
                )}
              </div>
              <div className="space-y-1 p-2">
                <p className="line-clamp-1 text-xs font-semibold text-cyan-50">{item.title}</p>
                <p className="text-[10px] text-cyan-200/90">{typeLabel[item.type]}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
