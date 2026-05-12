import Navbar from "@/components/Navbar";
import MiMundoVRSection from "@/components/MiMundoVRSection";
import type { ProfileCardConfirmPayload } from "@/components/ProfileCard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { compressProfileImage } from "@/lib/compressProfileImage";
import { upsertProfile, uploadAvatar } from "@/lib/profile";
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

const InicioPage = () => {
  const { user } = useAuth();
  const { profile, refresh } = useProfile(user?.id);

  const displayName =
    profile?.full_name?.trim() ||
    (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "") ||
    user?.email?.split("@")[0] ||
    "Explorador VR";

  const handleProfilePersist = async (payload: ProfileCardConfirmPayload) => {
    if (!user) return;
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

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-16">
        <MiMundoVRSection
          profileDisplayName={displayName}
          profileAvatarUrl={profile?.avatar_url}
          onProfilePersist={handleProfilePersist}
        />
      </main>
    </div>
  );
};

export default InicioPage;
