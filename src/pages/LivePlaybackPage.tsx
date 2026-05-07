import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LivepeerPlayer from "@/components/LivepeerPlayer";

const LivePlaybackPage = () => {
  const { playbackId } = useParams<{ playbackId: string }>();
  const id = useMemo(() => (playbackId ?? "").trim(), [playbackId]);

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto max-w-5xl px-6">
          <h1 className="mb-6 font-display text-3xl font-bold text-foreground md:text-4xl">Transmision en vivo</h1>
          <LivepeerPlayer playbackId={id} title={`Live ${id}`} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LivePlaybackPage;
