import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import TripleCinemaScreens from "@/components/TripleCinemaScreens";
import { CameraToggleButton, useCameraBackground } from "@/contexts/CameraBackgroundContext";
import { cn } from "@/lib/utils";

const TripleCinemaPage = () => {
  const { cameraBgActive } = useCameraBackground();

  return (
    <div
      data-camera-page-root
      data-mega-cine-page
      className={cn(
        "fixed inset-0 z-20 flex flex-col overflow-hidden",
        cameraBgActive ? "bg-transparent" : "bg-[#f2f0ec]",
      )}
    >
      <div className="pointer-events-auto absolute left-4 top-4 z-[90]">
        <BackToProfileHomeButton iconOnly />
      </div>
      <div className="relative z-20 min-h-0 flex-1">
        <div className="absolute inset-0">
          <TripleCinemaScreens />
        </div>
      </div>
      <CameraToggleButton />
    </div>
  );
};

export default TripleCinemaPage;
