import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import {
  salaRoomCardPadding,
  salaRoomDesc,
  salaRoomGrid3ColClass,
  salaRoomImageHeight,
  salaRoomImageWrapMb,
  salaRoomOverlayBar,
  salaRoomOverlayIcon,
  salaRoomTitle,
} from "@/components/salas/salaRoomCardStyles";
import {
  AULA_VIRTUAL_PREVIEW_CARDS,
  type AulaVirtualPreviewCard,
} from "@/lib/aulaVirtualPreviewCards";

function AulaPreviewCard({ card, index }: { card: AulaVirtualPreviewCard; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.06 }}
      className={`flex h-full flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl ${salaRoomCardPadding}`}
    >
      <div className={`relative overflow-hidden rounded-xl border border-primary/20 ${salaRoomImageWrapMb}`}>
        <img
          src={card.image}
          alt={card.title}
          className={`${salaRoomImageHeight} w-full object-cover`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div
          className={`absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/45 text-cyan-200 backdrop-blur-md ${salaRoomOverlayBar}`}
        >
          <span className="flex items-center gap-1">
            <GraduationCap className={`${salaRoomOverlayIcon} text-amber-300`} />
            {card.badge}
          </span>
          <span className="text-slate-300">Vista previa</span>
        </div>
      </div>
      <h3 className={`${salaRoomTitle} line-clamp-2`}>{card.title}</h3>
      <p className={`mt-2 flex-1 ${salaRoomDesc}`}>{card.description}</p>
      <p className="mt-1 text-[8px] text-muted-foreground sm:text-[10px]">{card.detail}</p>
      {card.imageAttribution && card.imageAttributionUrl && card.licenseUrl && (
        <p className="mt-2 text-[8px] leading-snug text-muted-foreground/85 line-clamp-2 sm:text-[9px]">
          Imagen:{" "}
          <a
            href={card.imageAttributionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            {card.imageAttribution}
          </a>{" "}
          (
          <a
            href={card.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            CC BY 4.0
          </a>
          )
        </p>
      )}
    </motion.article>
  );
}

/** Tarjetas informativas: qué contenido 3D encontrarán al entrar al Aula Virtual. */
export default function Galeria3DModelsGrid() {
  return (
    <motion.div className={salaRoomGrid3ColClass}>
      {AULA_VIRTUAL_PREVIEW_CARDS.map((card, index) => (
        <AulaPreviewCard key={card.id} card={card} index={index} />
      ))}
    </motion.div>
  );
}
