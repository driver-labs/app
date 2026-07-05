import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import type { Scenario } from "@/core/scenario-schema";
import type { SceneView } from "../camera/views";
import RainyAmbience from "../env/RainyAmbience";
import { GrassGround, RoadStrip } from "../env/RoadKit";
import AttentionArrow from "../fx/AttentionArrow";
import type { Pack } from "../models/cars";
import type { Phase } from "../types";
import { CAR_YAW, Model } from "./IntersectionScene";

type Props = {
  phase: Phase;
  scenario: Scenario;
  pack: Pack;
  view: SceneView;
  onDone: () => void;
};

const SPEED_BY_LEVEL: Record<Scenario["actors"][number]["speed"], number> = {
  fast: 9,
  normal: 7,
  slow: 4,
  speeding: 12,
};

function actorByRole(
  scenario: Scenario,
  role: Scenario["actors"][number]["role"],
) {
  return scenario.actors.find((actor) => actor.role === role);
}

function modelFromActor(
  actor: Scenario["actors"][number] | undefined,
  fallback: string,
) {
  if (!actor?.model) return fallback;
  if (actor.model.startsWith("/")) return actor.model;
  return `/models/${actor.model}.glb`;
}

function CenterLine({
  centerLine,
}: {
  centerLine: Scenario["road"]["centerLine"];
}) {
  if (centerLine === "dashed") {
    return (
      <>
        {Array.from({ length: 34 }, (_, i) => {
          const z = -82 + i * 5;
          return (
            <mesh
              key={`dash-${z}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.02, z]}
            >
              <planeGeometry args={[0.2, 2.4]} />
              <meshStandardMaterial color="#e8c33a" />
            </mesh>
          );
        })}
      </>
    );
  }

  const offsets = centerLine === "double-solid" ? [-0.18, 0.18] : [0];
  return (
    <>
      {offsets.map((x) => (
        <mesh
          key={`solid-line-${x}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.02, 0]}
        >
          <planeGeometry args={[0.16, 200]} />
          <meshStandardMaterial color="#e8c33a" />
        </mesh>
      ))}
    </>
  );
}

// Escena de DIAGNÓSTICO: el auto rojo adelanta cruzando la línea continua (autoplay),
// y al terminar la maniobra se dispara la pregunta.
export default function OvertakeScene({
  phase,
  scenario,
  pack,
  view,
  onDone,
}: Props) {
  const slow = useRef<THREE.Group | null>(null);
  const rogue = useRef<THREE.Group | null>(null);
  const oncoming = useRef<THREE.Group | null>(null);
  const stage = useRef(0);
  const done = useRef(false);
  const slowActor = actorByRole(scenario, "traffic");
  const rogueActor = actorByRole(scenario, "offender");
  const oncomingActor = actorByRole(scenario, "oncoming");
  const slowSpeed = SPEED_BY_LEVEL[slowActor?.speed ?? "slow"];
  const rogueSpeed = SPEED_BY_LEVEL[rogueActor?.speed ?? "fast"];
  const oncomingSpeed = SPEED_BY_LEVEL[oncomingActor?.speed ?? "normal"];
  const roadWidth = Math.max(10, scenario.road.lanes * 4.8);
  const laneX = roadWidth / 4;

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    const s = slow.current;
    const r = rogue.current;
    const o = oncoming.current;
    if (!s || !r || !o) return;
    if (phase !== "approach") return;

    s.position.z -= slowSpeed * d;
    o.position.z +=
      (stage.current >= 3 ? oncomingSpeed * 1.8 : oncomingSpeed) * d;

    const px = r.position.x;
    const pz = r.position.z;

    const toLane = (target: number) => {
      const dx = target - r.position.x;
      const step = 4 * d;
      r.position.x += Math.abs(dx) < step ? dx : Math.sign(dx) * step;
      return Math.abs(target - r.position.x) < 0.05;
    };

    if (stage.current === 0) {
      r.position.z -= rogueSpeed * d;
      if (r.position.z - s.position.z < 9) stage.current = 1;
    } else if (stage.current === 1) {
      r.position.z -= (rogueSpeed + 1) * d;
      if (toLane(-laneX)) stage.current = 2;
    } else if (stage.current === 2) {
      r.position.z -= (rogueSpeed + 3) * d;
      if (s.position.z - r.position.z > 8) stage.current = 3;
    } else if (stage.current === 3) {
      r.position.z -= (rogueSpeed + 1) * d;
      if (toLane(laneX)) stage.current = 4;
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
      <PerspectiveCamera makeDefault position={view.camera} fov={view.fov} />
      <RainyAmbience
        environment={scenario.environment}
        layoutSeed={scenario.id}
        view={view}
        paused={phase === "intro" || phase === "decision"}
      />
      <OrbitControls
        target={view.target}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={8}
        maxDistance={58}
      />

      {/* piso + calzada recta con tiles del kit; la línea central se dibuja
          encima porque su estilo (continua/doble) es la clave didáctica aquí */}
      <GrassGround color="#3f7d4f" size={200} />
      <RoadStrip along="z" length={140} width={roadWidth} />
      <CenterLine centerLine={scenario.road.centerLine} />

      {/* auto lento — carril derecho */}
      <group ref={slow} position={[laneX, 0, 2]}>
        <Model
          model={modelFromActor(slowActor, pack.slow)}
          scale={pack.scale}
          yaw={CAR_YAW}
        />
      </group>
      {/* infractor — su rotation.y la maneja useFrame (por eso yaw 0) */}
      <group ref={rogue} position={[laneX, 0, 18]} rotation={[0, Math.PI, 0]}>
        <Model
          model={modelFromActor(rogueActor, pack.rogue)}
          scale={pack.scale}
          yaw={0}
        />
      </group>
      {/* auto de frente — carril contrario */}
      <group ref={oncoming} position={[-laneX, 0, -38]}>
        <Model
          model={modelFromActor(oncomingActor, pack.oncoming)}
          scale={pack.scale}
          yaw={0}
        />
      </group>

      <AttentionArrow target={rogue} />
    </>
  );
}
