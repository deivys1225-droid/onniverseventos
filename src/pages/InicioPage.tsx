import Navbar from "@/components/Navbar";
import MiMundoVRSection from "@/components/MiMundoVRSection";
import type { ProfileCardConfirmPayload } from "@/components/ProfileCard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { compressProfileImage } from "@/lib/compressProfileImage";
import { upsertProfile, uploadAvatar } from "@/lib/profile";
import { toast } from "sonner";

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
      let avatarUrl = profile?.avatar_url ?? null;
      if (payload.avatarFile) {
        const file = await compressProfileImage(payload.avatarFile);
        avatarUrl = await uploadAvatar(user.id, file);
      }
      await upsertProfile({
        userId: user.id,
        fullName: payload.name.trim() || displayName,
        avatarUrl,
      });
      await refresh();
      toast.success("Perfil guardado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el perfil");
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
