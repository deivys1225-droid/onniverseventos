import Navbar from "@/components/Navbar";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import TripleCinemaScreens from "@/components/TripleCinemaScreens";

const TripleCinemaPage = () => {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f2f0ec]">
      <Navbar />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 top-16">
          <TripleCinemaScreens />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4">
          <p className="rounded-full border border-slate-400/50 bg-white/75 px-4 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700 backdrop-blur-md md:text-xs">
            Sala Mega Cine - 3 pantallas
          </p>
        </div>
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 z-10 flex justify-center sm:left-6 sm:right-auto sm:justify-start">
          <BackToProfileHomeButton />
        </div>
      </div>
    </div>
  );
};

export default TripleCinemaPage;
