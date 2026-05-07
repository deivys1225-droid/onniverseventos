import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { startNativeLiveStreaming } from "@/lib/liveStreamingNative";
import { stopMyActiveStream } from "@/lib/activeStreams";
import { updateProfileLiveState } from "@/lib/profile";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";

const TransmitirPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const launchedRef = useRef(false);
  const streamKey = useMemo(() => searchParams.get("key")?.trim() ?? "", [searchParams]);
  const stoppedFlag = useMemo(() => searchParams.get("stopped") === "1", [searchParams]);

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;

    if (stoppedFlag) {
      void stopMyActiveStream()
        .then(async () => {
          if (user) {
            await updateProfileLiveState({ userId: user.id, isLive: false, streamKey: null, playbackId: null });
          }
          toast.success("Live finalizado.");
          navigate("/inicio", { replace: true });
        })
        .catch(() => {
          navigate("/inicio", { replace: true });
        });
      return;
    }

    if (!streamKey) {
      toast.error("No se recibió stream key para transmitir.");
      navigate("/inicio", { replace: true });
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      toast.error("La transmisión nativa solo está disponible en la app Android.");
      navigate("/inicio", { replace: true });
      return;
    }

    void startNativeLiveStreaming(streamKey)
      .then(() => {
        toast.success("Abriendo cámara nativa para transmitir...");
        navigate("/inicio", { replace: true });
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, "No se pudo abrir transmisión nativa."));
        navigate("/inicio", { replace: true });
      });
  }, [navigate, stoppedFlag, streamKey, user]);

  return <div className="min-h-screen bg-background" />;
};

export default TransmitirPage;
