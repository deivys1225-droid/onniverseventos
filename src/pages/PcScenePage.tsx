import Navbar from "@/components/Navbar";
import MuxLiveStreaming from "@/components/MuxLiveStreaming";

const PcScenePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 pb-10 pt-24 md:px-6">
        <MuxLiveStreaming />
      </main>
    </div>
  );
};

export default PcScenePage;
