import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Radio } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MuxLiveStreaming from "@/components/MuxLiveStreaming";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  CONCIERTO_LIVE_STREAM_CATEGORY,
  canOpenConciertoEmitPanel,
  conciertoMuxChannelSlug,
  fetchConciertoEmitStatus,
  fetchConciertoLiveState,
  isConciertoLiveTestMode,
  isoToDatetimeLocalValue,
  loadConciertoEmitDraft,
  saveConciertoLiveCard,
} from "@/lib/conciertoLiveCard";

const glassPanel =
  "rounded-2xl border border-amber-400/35 bg-card/40 p-6 text-center shadow-[0_0_45px_-12px_rgba(250,204,21,0.35)] backdrop-blur-xl sm:p-8";

const ConciertosLiveEmitirPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [emitStatus, setEmitStatus] = useState<Awaited<ReturnType<typeof fetchConciertoEmitStatus>>>(null);
  const [cardTitle, setCardTitle] = useState("Concierto Live");

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const draft = loadConciertoEmitDraft(user.id);
      const [status, state] = await Promise.all([
        fetchConciertoEmitStatus(user.id),
        fetchConciertoLiveState(user.id),
      ]);
      setEmitStatus(status);
      setCardTitle(
        state?.config?.title ?? draft?.title ?? state?.draftDefaults?.title ?? "Concierto Live",
      );

      if (draft && !state?.hasSavedCard) {
        try {
          await saveConciertoLiveCard(user.id, {
            title: draft.title,
            subtitle: draft.subtitle,
            description: draft.description,
            imageUrl: draft.imageUrl,
            published: draft.published,
            eventAt: draft.eventAt,
            eventTimezone: draft.eventTimezone,
          });
          setEmitStatus(await fetchConciertoEmitStatus(user.id));
        } catch (e) {
          console.warn("[conciertos-live] auto-guardado borrador:", e);
        }
      }

      setLoading(false);
    };
    void load();
  }, [user?.id]);

  const draft = user?.id ? loadConciertoEmitDraft(user.id) : null;
  const testMode = isConciertoLiveTestMode();
  const canOpenEmitter = canOpenConciertoEmitPanel({
    userId: user?.id,
    title: draft?.title ?? cardTitle,
    eventLocal: draft?.eventAt ? isoToDatetimeLocalValue(draft.eventAt) : "",
    emitStatus,
  });

  const initialEventSetup = canOpenEmitter
    ? {
        title: cardTitle,
        rawChannelName: conciertoMuxChannelSlug(user!.id),
        ticketPrice: 0,
        isFree: true,
      }
    : null;

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background">
      <Navbar />

      <main className="relative z-20 px-4 pb-16 pt-20 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => navigate("/conciertos-live/config")}>
              <ArrowLeft className="h-4 w-4" />
              Volver a mi tarjeta
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/nuestras-salas">Ver Conciertos Live</Link>
            </Button>
          </div>

          <div className="mb-6 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-[0.2em] text-amber-200">
              <Radio className="h-4 w-4" />
              Emisión
            </span>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              Panel <span className="text-gradient-neon">Emitir live</span>
            </h1>
            {testMode && (
              <p className="mt-2 text-xs text-emerald-200/90">Modo prueba · mismo flujo Mux/OBS que Live en PC</p>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando…
            </div>
          ) : canOpenEmitter && initialEventSetup ? (
            <MuxLiveStreaming
              variant="conciertos-live"
              streamCategory={CONCIERTO_LIVE_STREAM_CATEGORY}
              initialEventSetup={initialEventSetup}
            />
          ) : (
            <section className={`mx-auto max-w-lg ${glassPanel}`}>
              <p className="text-sm text-muted-foreground">{emitStatus?.message ?? "No puedes emitir en este momento."}</p>
              {emitStatus?.formattedEvent ? (
                <p className="mt-2 font-display text-lg text-amber-100">{emitStatus.formattedEvent}</p>
              ) : null}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button type="button" onClick={() => navigate("/conciertos-live/config")}>
                  Configurar tarjeta
                </Button>
                {!emitStatus?.hasAccess && !testMode && (
                  <Button asChild variant="outline">
                    <Link to="/tienda">Elegir planes</Link>
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConciertosLiveEmitirPage;
