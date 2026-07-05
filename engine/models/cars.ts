// Pack de modelos del simulador. Mapea ROLES del juego a archivos 3D.
export type Pack = {
  label: string;
  scale: number;
  player: string;
  traffic: [string, string, string, string, string, string]; // 6 autos de tráfico
  slow: string;
  rogue: string;
  oncoming: string;
};

export const BIKE_PLAYER_MODEL =
  "/bike/low%20poly%20dirta%20bike%20with%20rider%201_FBX/DirtBike_With_Player.FBX";

export const PACKS: Record<"kenney", Pack> = {
  kenney: {
    label: "Simples",
    scale: 2.2,
    player: BIKE_PLAYER_MODEL,
    traffic: [
      "/models/van.glb",
      "/models/suv.glb",
      "/models/hatchback-sports.glb",
      "/models/delivery.glb",
      "/models/police.glb",
      "/models/taxi.glb",
    ],
    slow: "/models/van.glb",
    rogue: "/models/sedan.glb",
    oncoming: "/models/suv.glb",
  },
};

export type PackKey = keyof typeof PACKS;
