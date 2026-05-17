import { getShuffledEventSalaVideos, type EventSalaVideo } from "@/data/eventSalaVideos";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type MegaCineSplitSide = "master" | "mirror";
export type PhoneMediaMode = "mp3" | "mp4";

export type MegaCinePhoneState = {
  mode: PhoneMediaMode;
  statusText: string;
  isPlaying: boolean;
  mediaSrc: string | null;
};

const defaultPhoneState: MegaCinePhoneState = {
  mode: "mp3",
  statusText: "Pulsa Play y elige una carpeta",
  isPlaying: false,
  mediaSrc: null,
};

type MegaCineSplitValue = {
  eventsPlaylist: EventSalaVideo[];
  eventsIndex: number;
  setEventsIndex: (index: number) => void;
  phone: MegaCinePhoneState;
  setPhone: Dispatch<SetStateAction<MegaCinePhoneState>>;
};

const MegaCineSplitContext = createContext<MegaCineSplitValue | null>(null);
const MegaCineSideContext = createContext<MegaCineSplitSide>("master");

export function MegaCineSplitProvider({ children }: { children: ReactNode }) {
  const eventsPlaylist = useMemo(() => getShuffledEventSalaVideos(), []);
  const [eventsIndex, setEventsIndex] = useState(0);
  const [phone, setPhone] = useState<MegaCinePhoneState>(defaultPhoneState);

  const value = useMemo(
    () => ({ eventsPlaylist, eventsIndex, setEventsIndex, phone, setPhone }),
    [eventsPlaylist, eventsIndex, phone],
  );

  return <MegaCineSplitContext.Provider value={value}>{children}</MegaCineSplitContext.Provider>;
}

export function MegaCineSideProvider({ side, children }: { side: MegaCineSplitSide; children: ReactNode }) {
  return <MegaCineSideContext.Provider value={side}>{children}</MegaCineSideContext.Provider>;
}

export function useMegaCineSplit() {
  return useContext(MegaCineSplitContext);
}

export function useMegaCineSide(): MegaCineSplitSide | null {
  const split = useMegaCineSplit();
  const side = useContext(MegaCineSideContext);
  if (!split) return null;
  return side;
}

export function useMegaCinePhoneSync() {
  const split = useMegaCineSplit();
  const side = useMegaCineSide();

  const publishPhone = useCallback(
    (patch: Partial<MegaCinePhoneState>) => {
      if (!split || side !== "master") return;
      split.setPhone((prev) => ({ ...prev, ...patch }));
    },
    [side, split],
  );

  return { split, side, publishPhone, phone: split?.phone ?? defaultPhoneState };
}
