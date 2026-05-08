import Navbar from "@/components/Navbar";
import AgoraLiveStreaming from "@/components/AgoraLiveStreaming";

const EmisorView = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 pb-10 pt-24 md:px-6">
        <AgoraLiveStreaming />
      </main>
    </div>
  );
};

export default EmisorView;

