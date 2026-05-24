export type ImmersiveRoomVariant = "lobby" | "aula-virtual";

export type RoomTheme = {
  wallColor: string;
  ceilingColor: string;
  floorColor: string;
  floorGridColor: string | null;
  backgroundColor: string;
  ambientLightIntensity: number;
  directionalLightColor: string;
  directionalLightIntensity: number;
  fillLightColor: string;
  fillLightIntensity: number;
  screenFrameColor: string;
};

export const ROOM_THEMES: Record<ImmersiveRoomVariant, RoomTheme> = {
  lobby: {
    wallColor: "#EAECEE",
    ceilingColor: "#F0F0F0",
    floorColor: "#1a1d24",
    floorGridColor: "#00ffff",
    backgroundColor: "#050510",
    ambientLightIntensity: 0.55,
    directionalLightColor: "#ffffff",
    directionalLightIntensity: 0.4,
    fillLightColor: "#fff4dc",
    fillLightIntensity: 1.8,
    screenFrameColor: "#00ffff",
  },
  "aula-virtual": {
    wallColor: "#E8E4DC",
    ceilingColor: "#F5F2EB",
    floorColor: "#C4B59A",
    floorGridColor: null,
    backgroundColor: "#EDE8DF",
    ambientLightIntensity: 0.72,
    directionalLightColor: "#FFF8EE",
    directionalLightIntensity: 0.55,
    fillLightColor: "#FFE8C8",
    fillLightIntensity: 1.2,
    screenFrameColor: "#2D6A4F",
  },
};
