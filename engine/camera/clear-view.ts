import type { SceneView } from "./views";

export type BuildingLayout = {
  id: string;
  w: number;
  h: number;
  d: number;
  x: number;
  z: number;
  color: string;
};

type Vec3 = { x: number; y: number; z: number };

const DEG = Math.PI / 180;

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len < 1e-6) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function angleBetween(a: Vec3, b: Vec3): number {
  const denom = length(a) * length(b);
  if (denom < 1e-6) return 0;
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b) / denom)));
}

/** PRNG determinista para que el mismo escenario conserve el mismo skyline. */
export function createSeededRandom(seed: string) {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }
  if (state === 0) state = 0x9e3779b9;

  return (min: number, max: number) => {
    state = (1664525 * state + 1013904223) >>> 0;
    const t = state / 0x1_0000_0000;
    return min + t * (max - min);
  };
}

type ClearViewOptions = {
  /** Grados extra sobre el FOV para mantener el borde del encuadre libre. */
  marginDeg?: number;
  /** Radio mínimo alrededor de la cámara sin edificios. */
  cameraClearRadius?: number;
};

/**
 * ¿El punto cae dentro del cono de visión entre cámara y objetivo?
 * Ignora puntos detrás de la cámara o demasiado lejos del tramo útil.
 */
export function pointBlocksView(
  point: Vec3,
  view: SceneView,
  options: ClearViewOptions = {},
): boolean {
  const marginDeg = options.marginDeg ?? 10;
  const cameraClearRadius = options.cameraClearRadius ?? 9;

  const cam = vec3(...view.camera);
  const target = vec3(...view.target);

  const toPoint = subtract(point, cam);
  const distToPoint = length(toPoint);
  if (distToPoint < cameraClearRadius) return true;

  const toTarget = subtract(target, cam);
  const targetDist = length(toTarget);
  if (targetDist < 1e-3) return false;

  // Detrás de la cámara.
  if (dot(toPoint, toTarget) <= 0) return false;

  // Más allá del objetivo: sólo bloquea si sigue dentro del cono (primer plano lejano).
  const along = dot(toPoint, normalize(toTarget));
  if (along > targetDist + 18) return false;

  const halfCone = (view.fov / 2 + marginDeg) * DEG;
  return angleBetween(toPoint, toTarget) < halfCone;
}

/** Muestrea esquinas y centro del AABB del edificio contra el cono de visión. */
export function buildingBlocksView(
  building: Pick<BuildingLayout, "x" | "z" | "w" | "h" | "d">,
  view: SceneView,
  options?: ClearViewOptions,
): boolean {
  const { x, z, w, h, d } = building;
  const halfW = w / 2;
  const halfD = d / 2;
  const samples = [
    vec3(x, 0, z),
    vec3(x, h, z),
    vec3(x - halfW, h * 0.6, z - halfD),
    vec3(x + halfW, h * 0.6, z - halfD),
    vec3(x - halfW, h * 0.6, z + halfD),
    vec3(x + halfW, h * 0.6, z + halfD),
  ];

  return samples.some((point) => pointBlocksView(point, view, options));
}

type GenerateBuildingsOptions = {
  count?: number;
  seed?: string;
  view: SceneView;
};

const BUILDING_COLORS = ["#142436", "#1d2d3c"] as const;

/** Zonas de respaldo lejos del cono de visión típico de intersección urbana. */
function fallbackBuilding(
  index: number,
  rnd: (min: number, max: number) => number,
  view: SceneView,
): BuildingLayout {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const candidate: BuildingLayout = {
      id: `building-fallback-${index}-${attempt}`,
      w: rnd(4, 7),
      h: rnd(5, 12),
      d: rnd(6, 10),
      x: side * rnd(22, 30),
      z: rnd(-48, -22),
      color: BUILDING_COLORS[index % BUILDING_COLORS.length] ?? "#142436",
    };
    if (!buildingBlocksView(candidate, view)) return candidate;
  }

  const side = index % 2 === 0 ? -1 : 1;
  return {
    id: `building-fallback-${index}-safe`,
    w: 5,
    h: 6,
    d: 7,
    x: side * 32,
    z: -46,
    color: BUILDING_COLORS[index % BUILDING_COLORS.length] ?? "#142436",
  };
}

/**
 * Genera edificios de fondo que no interceptan el encuadre inicial cámara → objetivo.
 * Reintenta posiciones aleatorias; si falla, usa bandas laterales/fondo seguras.
 */
export function generateClearanceBuildings({
  count = 12,
  seed = "default",
  view,
}: GenerateBuildingsOptions): BuildingLayout[] {
  const rnd = createSeededRandom(`buildings:${seed}`);
  const layouts: BuildingLayout[] = [];

  for (let i = 0; i < count; i += 1) {
    let placed: BuildingLayout | null = null;

    for (let attempt = 0; attempt < 48; attempt += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const candidate: BuildingLayout = {
        id: `building-${i}-${side}`,
        w: rnd(4, 8),
        h: rnd(6, 16),
        d: rnd(6, 12),
        x: side * rnd(14, 26),
        z: rnd(0, 1) < 0.55 ? rnd(-50, -12) : rnd(14, 44),
        color: BUILDING_COLORS[i % BUILDING_COLORS.length] ?? "#142436",
      };

      if (!buildingBlocksView(candidate, view)) {
        placed = candidate;
        break;
      }
    }

    layouts.push(placed ?? fallbackBuilding(i, rnd, view));
  }

  return layouts;
}
