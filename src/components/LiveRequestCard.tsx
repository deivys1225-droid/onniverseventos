import { useId, useRef, useState } from "react";
import { Radio, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LiveRequestPayload = {
  email: string;
  artistName: string;
  ticketPrice: number;
  stadiumName: string;
  eventImageFile: File;
};

type LiveRequestCardProps = {
  onSubmit: (payload: LiveRequestPayload) => Promise<void> | void;
  isSubmitting?: boolean;
};

const LiveRequestCard = ({ onSubmit, isSubmitting = false }: LiveRequestCardProps) => {
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [artistName, setArtistName] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [stadiumName, setStadiumName] = useState("");
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);

  const canSubmit =
    email.trim().length > 3 &&
    artistName.trim().length > 1 &&
    stadiumName.trim().length > 1 &&
    Number(ticketPrice) > 0 &&
    eventImageFile !== null &&
    !isSubmitting;

  return (
    <div className="w-[min(92vw,360px)] rounded-2xl border border-cyan-300/45 bg-card/70 p-5 shadow-[0_0_45px_-14px_rgba(34,211,238,0.85)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/15 text-cyan-200">
          <Radio className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">LIVE Request</p>
          <p className="text-xs text-muted-foreground">Solicitud para emitir en vivo con ticketing OnniVers.</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo de contacto"
          className="border-cyan-300/35 bg-black/25"
          disabled={isSubmitting}
        />
        <Input
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Nombre del artista"
          className="border-cyan-300/35 bg-black/25"
          disabled={isSubmitting}
        />
        <Input
          type="number"
          min={1}
          value={ticketPrice}
          onChange={(e) => setTicketPrice(e.target.value)}
          placeholder="Valor del ticket (USD)"
          className="border-cyan-300/35 bg-black/25"
          disabled={isSubmitting}
        />
        <Input
          value={stadiumName}
          onChange={(e) => setStadiumName(e.target.value)}
          placeholder="Nombre en estadio virtual"
          className="border-cyan-300/35 bg-black/25"
          disabled={isSubmitting}
        />

        <input
          ref={fileRef}
          id={fileId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setEventImageFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2 border-cyan-300/40 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
          onClick={() => fileRef.current?.click()}
          disabled={isSubmitting}
        >
          <Upload className="h-4 w-4" />
          {eventImageFile ? `Foto: ${eventImageFile.name}` : "Subir foto del evento"}
        </Button>

        <Button
          type="button"
          disabled={!canSubmit}
          className="w-full border border-cyan-300/45 bg-cyan-500/20 font-display text-xs font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_24px_-8px_rgba(34,211,238,0.95)] hover:bg-cyan-500/30"
          onClick={() =>
            canSubmit &&
            onSubmit({
              email: email.trim(),
              artistName: artistName.trim(),
              ticketPrice: Number(ticketPrice),
              stadiumName: stadiumName.trim(),
              eventImageFile: eventImageFile!,
            })
          }
        >
          {isSubmitting ? "Enviando..." : "Enviar solicitud"}
        </Button>
      </div>
    </div>
  );
};

export default LiveRequestCard;
