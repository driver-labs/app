import type { Scenario } from "@/core/scenario-schema";

type SceneKind = Scenario["sceneKind"];

/** Posición inicial de cámara + punto de mira para OrbitControls. */
export type SceneView = {
  camera: [number, number, number];
  target: [number, number, number];
  fov: number;
};

/** Vistas por tipo de escena — única fuente para Canvas y colocación de props. */
export const SCENE_VIEWS: Record<
  Extract<
    SceneKind,
    | "intersection-stop"
    | "straight-overtake"
    | "roundabout"
    | "bus-stop"
    | "lane-change"
    | "rain-braking"
    | "distraction"
  >,
  SceneView
> = {
  "intersection-stop": {
    camera: [15, 12, 23],
    target: [0, 0, 2],
    fov: 50,
  },
  "straight-overtake": {
    camera: [16, 11, 14],
    target: [0, 0, -2],
    fov: 50,
  },
  roundabout: {
    camera: [0, 24, 30],
    target: [0, 0, 4],
    fov: 50,
  },
  "bus-stop": {
    camera: [15, 11, 20],
    target: [0, 0, 0],
    fov: 50,
  },
  "lane-change": {
    camera: [18, 12, 24],
    target: [0, 0, 8],
    fov: 62,
  },
  "rain-braking": {
    camera: [15, 11, 26],
    target: [0, 0, 8],
    fov: 50,
  },
  distraction: {
    camera: [13, 10, 24],
    target: [0, 0, 4],
    fov: 50,
  },
};

const DEFAULT_VIEW = SCENE_VIEWS["intersection-stop"];

export function getSceneView(sceneKind: SceneKind): SceneView {
  if (sceneKind in SCENE_VIEWS) {
    return SCENE_VIEWS[sceneKind as keyof typeof SCENE_VIEWS];
  }
  return DEFAULT_VIEW;
}
