import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import type { SceneView } from "../camera/views";
import Lights from "../env/Lights";
import type { Pack } from "../models/cars";
import type { Phase } from "../types";
import { CAR_YAW, Model } from "./IntersectionScene";

type Props = {
  phase: Phase;
  pack: Pack;
  view: SceneView;
  onDone: () => void;
};

// Escena de DIAGNÓSTICO: el auto rojo adelanta cruzando la línea continua (autoplay),
// y al terminar la maniobra se dispara la pregunta.
export default function OvertakeScene({ phase, pack, view, onDone }: Props) {
  const slow = useRef<THREE.Group | null>(null);
  const rogue = useRef<THREE.Group | null>(null);
  const oncoming = useRef<THREE.Group | null>(null);
  const stage = useRef(0);
  const done = useRef(false);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    const s = slow.current;
    const r = rogue.current;
    const o = oncoming.current;
    if (!s || !r || !o) return;
    if (phase !== "approach") return;

    s.position.z -= 3 * d;
    o.position.z += (stage.current >= 3 ? 13 : 3) * d;

    const px = r.position.x;
    const pz = r.position.z;

    const toLane = (target: number) => {
      const dx = target - r.position.x;
      const step = 4 * d;
      r.position.x += Math.abs(dx) < step ? dx : Math.sign(dx) * step;
      return Math.abs(target - r.position.x) < 0.05;
    };

    if (stage.current === 0) {
      r.position.z -= 8 * d;
      if (r.position.z - s.position.z < 9) stage.current = 1;
    } else if (stage.current === 1) {
      r.position.z -= 9 * d;
      if (toLane(-2)) stage.current = 2;
    } else if (stage.current === 2) {
      r.position.z -= 12 * d;
      if (s.position.z - r.position.z > 8) stage.current = 3;
    } else if (stage.current === 3) {
      r.position.z -= 9 * d;
      if (toLane(2)) stage.current = 4;
    } else if (!done.current) {
      done.current = true;
      onDone();
    }

    const dx = r.position.x - px;
    const dz = r.position.z - pz;
    if (dx * dx + dz * dz > 1e-6) r.rotation.y = Math.atan2(dx, dz);
  });

  return (
    <>
      <color attach="background" args={["#87b6d9"]} />
      <PerspectiveCamera makeDefault position={view.camera} fov={view.fov} />
      <Lights />
      <OrbitControls target={view.target} maxPolarAngle={Math.PI / 2.15} />

      {/* pasto */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
      >
        <planeGeometry args={[160, 200]} />
        <meshStandardMaterial color="#3f7d4f" />
      </mesh>
      {/* calle (a lo largo de Z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 200]} />
        <meshStandardMaterial color="#3a3a3f" />
      </mesh>
      {/* doble línea CONTINUA amarilla */}
      {[-0.18, 0.18].map((x) => (
        <mesh
          key={`solid-line-${x}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.02, 0]}
        >
          <planeGeometry args={[0.16, 200]} />
          <meshStandardMaterial color="#e8c33a" />
        </mesh>
      ))}
      {/* bordes blancos */}
      {[-3.85, 3.85].map((x) => (
        <mesh
          key={`edge-line-${x}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.02, 0]}
        >
          <planeGeometry args={[0.14, 200]} />
          <meshStandardMaterial color="#dcdcdc" />
        </mesh>
      ))}

      {/* auto lento — carril derecho */}
      <group ref={slow} position={[2, 0, 2]}>
        <Model model={pack.slow} scale={pack.scale} yaw={CAR_YAW} />
      </group>
      {/* infractor — su rotation.y la maneja useFrame (por eso yaw 0) */}
      <group ref={rogue} position={[2, 0, 18]} rotation={[0, Math.PI, 0]}>
        <Model model={pack.rogue} scale={pack.scale} yaw={0} />
      </group>
      {/* auto de frente — carril contrario */}
      <group ref={oncoming} position={[-2, 0, -38]}>
        <Model model={pack.oncoming} scale={pack.scale} yaw={0} />
      </group>
    </>
  );
}
