import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, ExternalLink, Loader2, Lock, Radio, Save, Sparkles, Mic2, CalendarClock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { compressProfileImage } from "@/lib/compressProfileImage";
import {
  datetimeLocalValueToIso,
  draftConciertoCardFromProfile,
  fetchConciertoEmitStatus,
  fetchConciertoLiveState,
  formatConciertoEventDisplay,
  isConciertoLiveTestMode,
  isoToDatetimeLocalValue,
  saveConciertoLiveCard,
  uploadConciertoCardImage,
  type ConciertoEmitStatus,
  type ConciertoLiveCardConfig,
  type ConciertoLiveProfileRow,
} from "@/lib/conciertoLiveCard";
import {
  salaRoomCardPadding,
  salaRoomDesc,
  salaRoomImageHeight,
  salaRoomImageWrapMb,
  salaRoomOverlayBar,
  salaRoomOverlayIcon,
  salaRoomTitle,
} from "@/components/salas/salaRoomCardStyles";
import { toast } from "sonner";

const glassPanel =
  "rounded-2xl border border-amber-400/35 bg-card/40 p-6 shadow-[0_0_45px_-12px_rgba(250,204,21,0.35)] backdrop-blur-xl sm:p-8";

const applyConfigToForm = (
  config: ConciertoLiveCardConfig,
  setters: {
    setTitle: (v: string) => void;
    setSubtitle: (v: string) => void;
    setDescription: (v: string) => void;
    setImageUrl: (v: string) => void;
    setPublished: (v: boolean) => void;
    setEventLocal: (v: string) => void;
  },
) => {
  setters.setTitle(config.title);
  setters.setSubtitle(config.subtitle);
  setters.setDescription(config.description);
  setters.setImageUrl(config.imageUrl);
  setters.setPublished(config.published);
  setters.setEventLocal(isoToDatetimeLocalValue(config.eventAt));
};

function PremiumPlansFooter({ highlight }: { highlight?: boolean }) {
  const navigate = useNavigate();
  return (
    <motion.section
      id="conciertos-premium-plans"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`mt-10 text-center ${glassPanel} border-amber-400/50 ${
        highlight ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-background" : ""
      }`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10">
        <Lock className="h-7 w-7 text-amber-300" />
      </div>
      <h2 className="font-display text-xl font-semibold text-amber-50 md:text-2xl">Publicar en Conciertos Live es premium</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
        Diseña y previsualiza tu tarjeta sin costo. Para que aparezca en el listado de Conciertos Live debes activar un
        plan premium. Muy pronto podrás elegir el plan que prefieras.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" className="gap-2 font-display">
          <Link to="/tienda">
            <Sparkles className="h-4 w-4" />
            Elegir planes
          </Link>
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </div>
    </motion.section>
  );
}

const EXAMPLE_DESCRIPTION = "Crea tu evento live y transmite en modo premium.";

const ConciertosLiveConfigPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [highlightPlans, setHighlightPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("Live Premium");
  const [description, setDescription] = useState(EXAMPLE_DESCRIPTION);
  const [imageUrl, setImageUrl] = useState("/placeholder.svg");
  const [published, setPublished] = useState(true);
  const [eventLocal, setEventLocal] = useState("");
  const [emitStatus, setEmitStatus] = useState<ConciertoEmitStatus | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const [state, emit] = await Promise.all([
          fetchConciertoLiveState(user.id),
          fetchConciertoEmitStatus(user.id),
        ]);
        const access = Boolean(state?.hasAccess);
        setHasAccess(access);
        setEmitStatus(emit);
        const toApply =
          state?.config ??
          state?.draftDefaults ??
          (profile
            ? draftConciertoCardFromProfile({
                id: user.id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
              } as ConciertoLiveProfileRow)
            : null);
        if (toApply) {
          applyConfigToForm(toApply, {
            setTitle,
            setSubtitle,
            setDescription,
            setImageUrl,
            setPublished,
            setEventLocal,
          });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo cargar tu tarjeta.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id, profile]);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    try {
      const compressed = await compressProfileImage(file);
      setPendingImageFile(compressed);
      setPreviewBlob((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(compressed);
      });
    } catch {
      toast.error("No se pudo procesar la imagen.");
    }
    e.target.value = "";
  };

  const previewImage = previewBlob ?? imageUrl;
  const testMode = isConciertoLiveTestMode();
  const canEmitLive =
    Boolean(emitStatus?.isLiveNow) ||
    Boolean(emitStatus?.canEmit) ||
    (testMode && Boolean(title.trim()));

  const onSave = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      toast.error("Escribe un título para tu tarjeta.");
      return;
    }
    if (published && !hasAccess) {
      setHighlightPlans(true);
      document.getElementById("conciertos-premium-plans")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    try {
      let finalImage = imageUrl;
      if (pendingImageFile) {
        finalImage = await uploadConciertoCardImage(user.id, pendingImageFile);
      }

      const eventAt = datetimeLocalValueToIso(eventLocal);
      if (!eventAt) {
        toast.error("Indica la fecha y hora de tu evento.");
        setSaving(false);
        return;
      }

      const config: ConciertoLiveCardConfig = {
        title: title.trim(),
        subtitle: subtitle.trim() || "Live Premium",
        description: description.trim(),
        imageUrl: finalImage,
        published: hasAccess ? published : false,
        eventAt,
        eventTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Lima",
      };

      await saveConciertoLiveCard(user.id, config);
      setEmitStatus(await fetchConciertoEmitStatus(user.id));
      setImageUrl(finalImage);
      setPendingImageFile(null);
      if (previewBlob?.startsWith("blob:")) URL.revokeObjectURL(previewBlob);
      setPreviewBlob(null);
      if (hasAccess && published) {
        toast.success("Tarjeta guardada. Ya aparece en Conciertos Live.");
      } else if (!hasAccess && !published) {
        toast.success("Borrador guardado en tu cuenta.");
      }
    } catch (e) {
      if (e instanceof Error && e.message === "PREMIUM_REQUIRED") {
        setHighlightPlans(true);
        document.getElementById("conciertos-premium-plans")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background">
      <Navbar />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(45_90%_55%/0.14),transparent_40%),radial-gradient(circle_at_90%_100%,hsl(var(--primary)/0.12),transparent_45%)]" />
      </div>

      <main className="relative z-20 px-6 pt-20 pb-20">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <BackToProfileHomeButton />
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/nuestras-salas">
                <ExternalLink className="h-4 w-4" />
                Ver Conciertos Live
              </Link>
            </Button>
          </div>

          {isConciertoLiveTestMode() && (
            <p className="mb-4 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-2 text-center text-xs text-emerald-100">
              Modo prueba activo: premium, publicar y emitir live habilitados (solo en desarrollo).
            </p>
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-[0.2em] text-amber-200">
              <Radio className="h-4 w-4" />
              Conciertos Live
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Configura tu <span className="text-gradient-neon">tarjeta</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              Personaliza tu tarjeta con tu foto y datos de ejemplo. Al guardar y publicar en Conciertos Live se
              activará tu acceso premium.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando…
            </div>
          ) : (
            <>
              <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
                <section className={glassPanel}>
                  <h2 className="mb-5 font-display text-lg font-semibold text-amber-50">Datos de tu tarjeta</h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cl-title">Título</Label>
                      <Input
                        id="cl-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Tu nombre o evento"
                        maxLength={80}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cl-subtitle">Etiqueta (ej. Live Premium)</Label>
                      <Input
                        id="cl-subtitle"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Live Premium"
                        maxLength={40}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cl-desc">Descripción corta</Label>
                      <Textarea
                        id="cl-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={200}
                        placeholder={EXAMPLE_DESCRIPTION}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cl-event" className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-amber-300" />
                        Fecha y hora del evento
                      </Label>
                      <Input
                        id="cl-event"
                        type="datetime-local"
                        value={eventLocal}
                        onChange={(e) => setEventLocal(e.target.value)}
                        className="border-amber-400/25"
                      />
                      <p className="text-xs text-muted-foreground">
                        El botón Emitir live se activa el día del evento (2 h antes hasta 6 h después).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Imagen de la tarjeta</Label>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                      <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                        <Camera className="h-4 w-4" />
                        Cambiar imagen
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">Visible en Conciertos Live</p>
                        <p className="text-xs text-muted-foreground">Actívalo cuando quieras aparecer en el listado.</p>
                      </div>
                      <Switch checked={published} onCheckedChange={setPublished} />
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button type="button" className="gap-2" onClick={() => void onSave()} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar tarjeta
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => navigate("/nuestras-salas")}>
                        Cancelar
                      </Button>
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                      <p className="text-sm font-medium text-amber-50">Emitir live</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {emitStatus?.message ??
                          (formatConciertoEventDisplay(datetimeLocalValueToIso(eventLocal)) ??
                            "Guarda la fecha de tu evento.")}
                      </p>
                      <Button
                        type="button"
                        variant="hero"
                        className="mt-3 w-full gap-2 sm:w-auto"
                        disabled={!canEmitLive}
                        onClick={() => navigate("/conciertos-live/emitir")}
                      >
                        <Mic2 className="h-4 w-4" />
                        {emitStatus?.isLiveNow ? "Ir al panel en vivo" : "Emitir live"}
                      </Button>
                    </div>
                  </div>
                </section>

                <section className={glassPanel}>
                  <h2 className="mb-4 font-display text-lg font-semibold text-amber-50">Vista previa</h2>
                  <article
                    className={`group w-full select-none rounded-xl border border-amber-400/45 bg-card/40 shadow-[0_0_36px_-14px_rgba(250,204,21,0.5)] ${salaRoomCardPadding}`}
                  >
                    <div className={`relative overflow-hidden rounded-xl border border-amber-400/25 ${salaRoomImageWrapMb}`}>
                      <img src={previewImage} alt="" className={`${salaRoomImageHeight} w-full object-cover`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
                    </div>
                    <div
                      className={`flex items-center justify-between rounded-lg border border-amber-200/20 bg-black/50 text-amber-100 backdrop-blur-md ${salaRoomOverlayBar}`}
                    >
                      <span className="flex items-center gap-1">
                        <Radio className={`${salaRoomOverlayIcon} text-amber-300`} aria-hidden />
                        Live
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-200/90">
                        <Sparkles className={salaRoomOverlayIcon} aria-hidden />
                        {subtitle.trim() || "Premium"}
                      </span>
                    </div>
                    <h3 className={`${salaRoomTitle} mt-3 line-clamp-2 text-amber-50`}>{title || "Tu título"}</h3>
                    {description ? <p className={`mt-2 ${salaRoomDesc}`}>{description}</p> : null}
                  </article>
                </section>
              </div>

              {!hasAccess && <PremiumPlansFooter highlight={highlightPlans} />}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConciertosLiveConfigPage;
