import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import {
  createSeededRandom,
  generateClearanceBuildings,
} from "../camera/clear-view";
import type { SceneView } from "../camera/views";

const RAIN_COUNT = 900;

type Props = {
  view: SceneView;
  /** Semilla estable por escenario — mismo id ⇒ mismo skyline. */
  layoutSeed?: string;
};

// Ambientación noche lluviosa: fog, luz fría, lluvia y edificios fuera del cono de visión.
export default function RainyAmbience({ view, layoutSeed = "default" }: Props) {
  const rain = useRef<THREE.Points | null>(null);
  const rnd = useMemo(
    () => createSeededRandom(`rain:${layoutSeed}`),
    [layoutSeed],
  );

  const rainPos = useMemo(() => {
    const a = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      a[i * 3] = rnd(-40, 40);
      a[i * 3 + 1] = rnd(2, 32);
      a[i * 3 + 2] = rnd(-60, 55);
    }
    return a;
  }, [rnd]);

  const buildings = useMemo(
    () => generateClearanceBuildings({ view, seed: layoutSeed }),
    [view, layoutSeed],
  );

  useFrame((_, delta) => {
    if (!rain.current) return;
    const d = Math.min(delta, 0.05);
    const p = rain.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < RAIN_COUNT; i++) {
      p[i * 3 + 1] -= d * 26;
      p[i * 3] -= d * 3;
      if (p[i * 3 + 1] < 0.2) {
        p[i * 3] = rnd(-40, 40);
        p[i * 3 + 1] = rnd(16, 32);
        p[i * 3 + 2] = rnd(-60, 55);
      }
    }
    rain.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <fog attach="fog" args={["#0a1622", 22, 110]} />
      <hemisphereLight args={["#7fa8c8", "#0a1420", 1.0]} />
      <directionalLight
        position={[6, 14, -6]}
        intensity={0.5}
        color="#cfe0f0"
      />

      <points ref={rain}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[rainPos, 3]}
            count={RAIN_COUNT}
          />
        </bufferGeometry>
        <pointsMaterial color="#9fd8ff" size={0.06} transparent opacity={0.6} />
      </points>

      {buildings.map((b) => (
        <mesh key={b.id} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}
