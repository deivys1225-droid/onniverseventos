import { useRef, useState } from "react";
import { BookOpen, GraduationCap, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type StorePublishPayload = {
  itemType: "biblioteca" | "cursos";
  title: string;
  salePrice: number;
  coverFile: File;
  bookFile?: File | null;
  videoUrl?: string | null;
};

type StorePublishCardProps = {
  onClose?: () => void;
  onSubmit: (payload: StorePublishPayload) => Promise<void> | void;
  isSubmitting?: boolean;
  initialItemType?: "biblioteca" | "cursos";
  lockedItemType?: boolean;
};

const StorePublishCard = ({
  onClose,
  onSubmit,
  isSubmitting = false,
  initialItemType = "biblioteca",
  lockedItemType = false,
}: StorePublishCardProps) => {
  const [itemType, setItemType] = useState<"biblioteca" | "cursos">(initialItemType);
  const [title, setTitle] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const bookRef = useRef<HTMLInputElement>(null);

  const price = Number(salePrice);
  const canSubmit =
    title.trim().length >= 3 &&
    Number.isFinite(price) &&
    price > 0 &&
    coverFile !== null &&
    (itemType === "biblioteca" ? bookFile !== null : videoUrl.trim().length > 8) &&
    !isSubmitting;

  return (
    <div className="w-[min(92vw,380px)] rounded-2xl border border-cyan-300/35 bg-card/85 p-4 shadow-[0_0_45px_-16px_rgba(34,211,238,0.82)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">Tienda</p>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => onClose?.()}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {lockedItemType ? (
        <div className="mb-3 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-cyan-100">
          {itemType === "biblioteca" ? "Publicar en Biblioteca" : "Publicar en Cursos Virtuales"}
        </div>
      ) : (
        <div className="mb-3 flex gap-2 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-2">
          <button
            type="button"
            className={`flex-1 rounded-md px-2 py-1 text-xs ${itemType === "biblioteca" ? "bg-cyan-500/35 text-cyan-50" : "text-cyan-200"}`}
            onClick={() => setItemType("biblioteca")}
          >
            <BookOpen className="mr-1 inline h-3.5 w-3.5" />
            Biblioteca
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-2 py-1 text-xs ${itemType === "cursos" ? "bg-cyan-500/35 text-cyan-50" : "text-cyan-200"}`}
            onClick={() => setItemType("cursos")}
          >
            <GraduationCap className="mr-1 inline h-3.5 w-3.5" />
            Curso virtual
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={itemType === "biblioteca" ? "Nombre del libro" : "Nombre del curso"} />
        <Input
          type="number"
          step="0.01"
          min={1}
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          onBlur={() => {
            const v = Number(salePrice);
            if (Number.isFinite(v) && v > 0) setSalePrice(v.toFixed(2));
          }}
          placeholder="Valor de venta (ej: 9.00)"
        />

        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" className="w-full gap-2" onClick={() => coverRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {coverFile ? `Portada: ${coverFile.name}` : "Subir foto de presentacion"}
        </Button>

        {itemType === "biblioteca" ? (
          <>
            <input
              ref={bookRef}
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              onChange={(e) => setBookFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" className="w-full gap-2" onClick={() => bookRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {bookFile ? `PDF: ${bookFile.name}` : "Subir libro PDF"}
            </Button>
          </>
        ) : (
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="URL del video del curso" />
        )}

        <Button
          type="button"
          className="w-full border border-cyan-300/40 bg-cyan-500/20 text-cyan-100"
          disabled={!canSubmit}
          onClick={() =>
            canSubmit &&
            onSubmit({
              itemType,
              title: title.trim(),
              salePrice: Number(salePrice),
              coverFile: coverFile!,
              bookFile: itemType === "biblioteca" ? bookFile : null,
              videoUrl: itemType === "cursos" ? videoUrl.trim() : null,
            })
          }
        >
          {isSubmitting ? "Publicando..." : "Publicar en Tienda"}
        </Button>
      </div>
    </div>
  );
};

export default StorePublishCard;
