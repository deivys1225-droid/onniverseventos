import NeonRoom from "@/components/lobby/NeonRoom";
import VirtualCursor from "@/components/VirtualCursor";

const LobbyImmersivePage = () => (
  <div className="h-[100dvh] w-full overflow-hidden bg-black">
    <VirtualCursor />
    <NeonRoom />
  </div>
);

export default LobbyImmersivePage;
