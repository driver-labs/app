"use client";

import { Clone, useGLTF } from "@react-three/drei";
import { memo, useMemo } from "react";
import * as THREE from "three";

// Kit modular de carreteras (Kenney "City Kit Roads", CC0). Reemplaza el piso y
// las calles que antes se dibujaban con planos planos. Todos los tiles comparten
// una sola textura (atlas variation-a.png) y se apoyan en y=0, así que encajan
// sobre el plano de pasto sin retocar la geometría de juego.
//
// Grid del kit (medido sobre POSITION del GLB):
//   - tiles base (straight, crossroad): 1x1u, planos (alto ~0.02u)
//   - road-curve: 2x2u  ·  road-roundabout: 3x3u
// El factor `scale` es el escalado uniforme de three: para los tiles de 1u
// coincide con la huella en el mundo (por eso `width`/`size` == `scale`).

const BASE = "/kenney_city-kit-roads/Models/GLB%20format";

export const ROAD_MODELS = {
  straight: `${BASE}/road-straight.glb`,
  crossroad: `${BASE}/road-crossroad.glb`,
  roundabout: `${BASE}/road-roundabout.glb`,
} as const;

// Radios de la calzada del tile de rotonda en unidades locales (medidos sobre el
// GLB). Sirven para derivar la escala a partir del radio de circulación de juego.
export const ROUNDABOUT_TILE = {
  islandRadius: 0.45,
  laneRadius: 0.8,
  outerRadius: 1.15,
} as const;

// El modelo road-straight trae la calzada (y su línea central) corriendo a lo
// largo de su eje X local; esta rotación base la deja corriendo a lo largo de Z
// del mundo, que es el eje de avance por defecto de las escenas.
const STRAIGHT_BASE_YAW = Math.PI / 2;

// Altura local (tile de 1u) de la superficie de rodadura: los vértices dominantes
// del kit están en y=0.01 (calzada), 0.02 (cordón) y 0 (base). Bajando el tile
// esta cantidad la calzada queda exactamente en y=0, así los autos y las marcas
// viales (que ya viven en y≈0) encajan sin tocar sus coordenadas.
const SURFACE_LOCAL_Y = 0.01;

// El kit trae materiales PBR (MeshStandard) con una única textura atlas. Las
// carreteras no necesitan PBR, así que se cambian a MeshLambert: mucho más barato
// por fragmento (clave en dispositivos sin GPU potente) manteniendo la textura y
// las sombras recibidas. Se muta la escena cacheada una sola vez (idempotente),
// así todas las instancias comparten el material aligerado.
function useLightweightGltf(url: string): THREE.Object3D {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const source = Array.isArray(obj.material)
        ? obj.material[0]
        : obj.material;
      if (!(source instanceof THREE.MeshStandardMaterial)) return;
      obj.material = new THREE.MeshLambertMaterial({
        map: source.map,
        color: source.color,
      });
    });
    return scene;
  }, [scene]);
}

type PieceProps = {
  url: string;
  position?: [number, number, number];
  rotationY?: number;
  scale: number;
};

// Instancia un tile del kit con escalado uniforme `scale`, alineado para que la
// calzada quede en el `y` pedido (0 por defecto).
function RoadPiece({
  url,
  position = [0, 0, 0],
  rotationY = 0,
  scale,
}: PieceProps) {
  const scene = useLightweightGltf(url);
  const y = position[1] - SURFACE_LOCAL_Y * scale;
  // Reciben sombra (los autos la proyectan sobre la calzada) pero no la proyectan:
  // son planos, así que evitar el paso de shadow map como emisor ahorra sin costo
  // visual.
  return (
    <Clone
      object={scene}
      position={[position[0], y, position[2]]}
      rotation={[0, rotationY, 0]}
      scale={scale}
      receiveShadow
      castShadow={false}
    />
  );
}

type GrassGroundProps = {
  /** Color del pasto/entorno. Cada escena puede ajustarlo por ambientación. */
  color?: string;
  /** Tamaño del plano (cuadrado). */
  size?: number;
};

// Plano de pasto que sirve de base bajo los tiles de calle.
export const GrassGround = memo(function GrassGround({
  color = "#3f7d4f",
  size = 200,
}: GrassGroundProps) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.02, 0]}
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
});

type RoadStripProps = {
  /** Eje por el que corre la calzada. */
  along: "x" | "z";
  /** Largo total a cubrir con tiles. */
  length: number;
  /** Ancho de la calzada (= huella de cada tile). */
  width: number;
  /** Desplazamiento perpendicular del centro de la calzada. */
  offset?: number;
  /** Hueco central libre (ancho completo) para encajar a ras de un cruce/rotonda. */
  gap?: number;
};

// Tira recta de tiles a lo largo de un eje, generada desde el centro hacia afuera
// para encajar a ras de un cruce/rotonda cuando se indica `gap`.
export const RoadStrip = memo(function RoadStrip({
  along,
  length,
  width,
  offset = 0,
  gap = 0,
}: RoadStripProps) {
  const yaw =
    along === "x" ? STRAIGHT_BASE_YAW + Math.PI / 2 : STRAIGHT_BASE_YAW;
  const positions = useMemo(() => {
    const half = length / 2;
    const result: number[] = [];
    if (gap <= 0) {
      result.push(0);
      for (let p = width; p <= half; p += width) {
        result.push(p, -p);
      }
    } else {
      for (let p = gap / 2 + width / 2; p <= half; p += width) {
        result.push(p, -p);
      }
    }
    return result;
  }, [length, width, gap]);

  return (
    <>
      {positions.map((p) => {
        const position: [number, number, number] =
          along === "z" ? [offset, 0, p] : [p, 0, offset];
        return (
          <RoadPiece
            key={`${along}-${p}`}
            url={ROAD_MODELS.straight}
            position={position}
            rotationY={yaw}
            scale={width}
          />
        );
      })}
    </>
  );
});

type CrossroadProps = {
  /** Huella del cruce en el mundo (tile de 1u ⇒ escala == tamaño). */
  size: number;
  position?: [number, number, number];
  rotationY?: number;
};

// Cruce en X (4 ramas). Un solo tile del kit escalado a `size`.
export const Crossroad = memo(function Crossroad({
  size,
  position = [0, 0, 0],
  rotationY = 0,
}: CrossroadProps) {
  return (
    <RoadPiece
      url={ROAD_MODELS.crossroad}
      position={position}
      rotationY={rotationY}
      scale={size}
    />
  );
});

type RoundaboutProps = {
  /** Escala uniforme del tile 3x3. Deriva de RING_MID / ROUNDABOUT_TILE.laneRadius. */
  scale: number;
  position?: [number, number, number];
  rotationY?: number;
};

// Rotonda. Un solo tile 3x3 del kit; la escala se calcula en la escena para que
// el carril de circulación coincida con el radio de juego.
export const Roundabout = memo(function Roundabout({
  scale,
  position = [0, 0, 0],
  rotationY = 0,
}: RoundaboutProps) {
  return (
    <RoadPiece
      url={ROAD_MODELS.roundabout}
      position={position}
      rotationY={rotationY}
      scale={scale}
    />
  );
});

for (const url of Object.values(ROAD_MODELS)) {
  useGLTF.preload(url);
}
