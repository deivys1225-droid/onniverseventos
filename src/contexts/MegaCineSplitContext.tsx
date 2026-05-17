import { getShuffledEventSalaVideos, type EventSalaVideo } from "@/data/eventSalaVideos";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MegaCineSplitValue = {
  eventsPlaylist: EventSalaVideo[];
  eventsIndex: number;
  setEventsIndex: (index: number) => void;
};

const MegaCineSplitContext = createContext<MegaCineSplitValue | null>(null);

export function MegaCineSplitProvider({ children }: { children: ReactNode }) {
  const eventsPlaylist = useMemo(() => getShuffledEventSalaVideos(), []);
  const [eventsIndex, setEventsIndex] = useState(0);

  const value = useMemo(
    () => ({ eventsPlaylist, eventsIndex, setEventsIndex }),
    [eventsPlaylist, eventsIndex],
  );

  return <MegaCineSplitContext.Provider value={value}>{children}</MegaCineSplitContext.Provider>;
}

export function useMegaCineSplit() {
  return useContext(MegaCineSplitContext);
}
