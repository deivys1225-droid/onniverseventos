import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProfileCard, { type ProfileCardConfirmPayload } from "@/components/ProfileCard";
import SocialMenu from "@/components/SocialMenu";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { LOCKED_PROFILE_CARD_WRAPPER_CLASS } from "@/config/lockedHomeLayout";
import { compressProfileImage } from "@/lib/compressProfileImage";
import { upsertProfile, uploadAvatar } from "@/lib/profile";
import { isLocalUser } from "@/lib/localAuth";
import { invokeOpenGalleryDirect } from "@/lib/galleryOpenDirect";
import { toast } from "sonner";

function getProfileSaveErrorMessage(error: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Sin internet. Revisamos tu conexion y vuelve a intentar.";
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("timeout")
    ) {
      return "No pudimos conectar con el servidor. Tu foto sigue local; intenta guardar de nuevo en unos segundos.";
    }
    return error.message;
  }
  return "No se pudo guardar el perfil. Intenta de nuevo.";
}

/** Perfil de inicio autenticado: Onni centrado + iconos de redes (OpAiAssistant en `/`). */
const InicioPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, refresh } = useProfile(user?.id);
  const [socialMenuOpen, setSocialMenuOpen] = useState(false);

  const displayName =
    profile?.full_name?.trim() ||
    (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "") ||
    user?.email?.split("@")[0] ||
    "Explorador VR";

  const handleProfilePersist = async (payload: ProfileCardConfirmPayload) => {
    if (!user) return;

    if (isLocalUser(user)) {
      toast.success("Guardado en este dispositivo");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      let avatarUrlToPersist: string | null | undefined = undefined;
      if (payload.avatarFile) {
        const file = await compressProfileImage(payload.avatarFile);
        avatarUrlToPersist = await uploadAvatar(user.id, file);
      }
      await upsertProfile({
        userId: user.id,
        fullName: payload.name.trim() || displayName,
        avatarUrl: avatarUrlToPersist,
      });
      await refresh();
      toast.success("Perfil guardado");
    } catch (e: unknown) {
      toast.error(getProfileSaveErrorMessage(e));
    }
  };

  const onEmitirLiveClick = useCallback(() => {
    navigate("/conciertos-live/config");
  }, [navigate]);

  const onLocalPlayerClick = useCallback(() => {
    if (invokeOpenGalleryDirect()) return;
    navigate("/reproductor-galeria");
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 size-full overflow-x-clip overflow-y-hidden overscroll-none bg-black [width:100%] [max-width:100%]"
      data-camera-page-root
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}onnivers-home-bg.png)` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-background/50 to-background/90" aria-hidden />

      <Navbar />

      <div className={`fixed bottom-[28%] left-1/2 z-20 -translate-x-1/2 ${LOCKED_PROFILE_CARD_WRAPPER_CLASS}`}>
        <ProfileCard
          initialName={displayName}
          initialAvatarSrc={profile?.avatar_url}
          onConfirm={handleProfilePersist}
          liveNavPath="/pc"
        />
      </div>

      <div className="pointer-events-none absolute bottom-32 right-4 z-20 flex flex-col items-center gap-3 md:bottom-6">
        <button
          type="button"
          onClick={onEmitirLiveClick}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-fuchsia-300/85 bg-[radial-gradient(circle_at_30%_30%,#ff66e5_0%,#d946ef_45%,#7e22ce_100%)] text-white shadow-[0_0_32px_rgba(236,72,153,0.8),0_0_60px_rgba(217,70,239,0.45)] backdrop-blur-md transition hover:scale-105"
          aria-label="Configurar Live"
          title="Configurar Live"
        >
          <Radio className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onLocalPlayerClick}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/70 bg-[#1877f2] text-white shadow-[0_0_24px_rgba(24,119,242,0.55)] backdrop-blur-md transition hover:border-blue-300"
          aria-label="Abrir reproductor local"
          title="Reproductor local"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.7 15.6V8.4L16 12l-6.3 3.6z"
            />
          </svg>
        </button>
      </div>

      {user ? (
        <SocialMenu userId={user.id} open={socialMenuOpen} onClose={() => setSocialMenuOpen(false)} />
      ) : null}
    </div>
  );
};

export default InicioPage;
