import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LivepeerPlayer from "@/components/LivepeerPlayer";
import YouTubePlayer from "@/components/YouTubePlayer";
import TicketPaywall from "@/components/TicketPaywall";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const EventPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["ticket", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const isLoading = eventLoading || authLoading || (user && ticketLoading);
  const hasPaid = ticket?.status === "paid";

  // Determine if this is a YouTube event
  const isYouTube = event?.playback_id?.startsWith("youtube:");
  const youtubeVideoId = isYouTube ? event!.playback_id!.replace("youtube:", "") : null;

  const renderPlayer = () => {
    if (isYouTube && youtubeVideoId) {
      return <YouTubePlayer videoId={youtubeVideoId} title={event!.title} />;
    }
    return <LivepeerPlayer playbackId={event!.playback_id || ""} title={event!.title} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-lg">Evento no encontrado</p>
        <Button variant="hero" onClick={() => navigate("/")}>Volver al inicio</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-6 max-w-5xl">
          {/* Event Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              {event.is_live && (
                <span className="bg-destructive/90 text-destructive-foreground text-xs font-display font-semibold px-3 py-1 rounded-full animate-pulse">
                  🔴 EN VIVO
                </span>
              )}
              <span className="text-muted-foreground text-sm">
                {new Date(event.date).toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
              {event.title}
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl">
              {event.description}
            </p>
          </div>

          {/* Video or Paywall */}
          {!user ? (
            event.price === 0 ? (
              renderPlayer()
            ) : (
              <TicketPaywall price={event.price} eventId={event.id} requiresAuth />
            )
          ) : event.price === 0 ? (
            renderPlayer()
          ) : hasPaid ? (
            renderPlayer()
          ) : (
            <TicketPaywall price={event.price} eventId={event.id} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventPage;
