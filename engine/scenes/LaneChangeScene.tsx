"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Scenario } from "@/core/scenario-schema";
import type { SceneView } from "../camera/views";
import RainyAmbience from "../env/RainyAmbience";
import CrashEffect from "../fx/CrashEffect";
import type { Pack } from "../models/cars";
import type { Phase } from "../types";
import { actorModel, CAR_YAW, Model } from "./IntersectionScene";

// Escena de DECISIÓN: una moto viaja en el punto ciego del carril izquierdo
// mientras el jugador quiere cambiar de carril. En el punto de decisión, la
// cámara corta a una vista cenital que resalta la zona ciega — un corte
// deliberado (no un paneo), así que se resuelve con dos <PerspectiveCamera>
// mutuamente excluyentes en vez de pelear con OrbitControls.

const PLAYER_START_Z = 26;
const MOTO_START_Z = 33;
const DECISION_Z = 10;
const APPROACH_SPEED_PLAYER = 9;
const APPROACH_SPEED_MOTO = 11;
const SAFE_STRAIGHT_SPEED = 7;
const LANE_STEP = 3.2;
const CRASH_TRIGGER_GAP = 2;
const CLEAR_GAP = 6;

type Props = {
  phase: Phase;
  correct: boolean;
  scenario: Scenario;
  pack: Pack;
  view: SceneView;
  layoutSeed: string;
  onReachStop: () => void;
};

export default function LaneChangeScene({
  phase,
  correct,
  scenario,
  pack,
  view,
  layoutSeed,
  onReachStop,
}: Props) {
  const world = useRef<THREE.Group | null>(null);
  const player = useRef<THREE.Group | null>(null);
  const moto = useRef<THREE.Group | null>(null);

  const reached = useRef(false);
  const crashed = useRef(false);
  const crashTime = useRef(0);
  const motoBaseX = useRef(0);
  const impact = useMemo(() => new THREE.Vector3(), []);

  const roadWidth = Math.max(8, scenario.road.lanes * 3.8);
  const laneX = roadWidth / 4;
  const playerActor = scenario.actors.find((actor) => actor.role === "player");
  const motoActor = scenario.actors.find(
    (actor) => actor.kind === "motorcycle",
  );
  const playerModel = actorModel(playerActor, pack.rogue);
  const motoModel = actorModel(motoActor, pack.player);

  const toLane = (group: THREE.Group, target: number, d: number): boolean => {
    const dx = target - group.position.x;
    const step = LANE_STEP * d;
    group.position.x += Math.abs(dx) < step ? dx : Math.sign(dx) * step;
    return Math.abs(target - group.position.x) < 0.05;
  };

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const p = player.current;
    const m = moto.current;
    if (!p || !m) return;

    if (phase === "approach") {
      p.position.z -= APPROACH_SPEED_PLAYER * d;
      m.position.z -= APPROACH_SPEED_MOTO * d;
      if (!reached.current && p.position.z <= DECISION_Z) {
        reached.current = true;
        onReachStop();
      }
      return;
    }

    if (phase !== "consequence") return;

    m.position.z -= APPROACH_SPEED_MOTO * d;

    if (correct) {
      const motoCleared = m.position.z < p.position.z - CLEAR_GAP;
      if (motoCleared) {
        p.position.z -= SAFE_STRAIGHT_SPEED * d;
        toLane(p, -laneX, d);
      } else {
        p.position.z -= SAFE_STRAIGHT_SPEED * 0.9 * d;
      }
      return;
    }

    // rama incorrecta: cambia de carril sin revisar el punto ciego
    if (!crashed.current) {
      p.position.z -= SAFE_STRAIGHT_SPEED * d;
      toLane(p, -laneX, d);
      const gap = Math.hypot(
        p.position.x - m.position.x,
        p.position.z - m.position.z,
      );
      if (gap < CRASH_TRIGGER_GAP) {
        crashed.current = true;
        crashTime.current = state.clock.elapsedTime;
        motoBaseX.current = m.position.x;
        impact.set(
          (p.position.x + m.position.x) / 2,
          0.6,
          (p.position.z + m.position.z) / 2,
        );
      }
      return;
    }

    const t = state.clock.elapsedTime - crashTime.current;
    const push = 1 - Math.exp(-t * 7);
    m.position.x = motoBaseX.current - 1.7 * push;
    m.rotation.z = 0.65 * push;
    p.rotation.z = 0.12 * Math.sin(t * 16) * Math.exp(-t * 5);

    if (world.current) {
      if (t < 0.4) {
        const amp = 0.13 * (1 - t / 0.4);
        world.current.position.set(
          (Math.random() - 0.5) * amp,
          (Math.random() - 0.5) * amp * 0.6,
          (Math.random() - 0.5) * amp,
        );
      } else if (world.current.position.lengthSq() !== 0) {
        world.current.position.set(0, 0, 0);
      }
    }
  });

  return (
    <>
      <RainyAmbience
        environment={scenario.environment}
        layoutSeed={layoutSeed}
        view={view}
        paused={phase === "intro"}
      />

      {phase === "decision" ? (
        <PerspectiveCamera
          makeDefault
          position={[laneX * -0.5, 24, DECISION_Z + 1]}
          fov={48}
          onUpdate={(self) => self.lookAt(-laneX * 0.5, 0, DECISION_Z + 3)}
        />
      ) : (
        <PerspectiveCamera makeDefault position={view.camera} fov={view.fov} />
      )}
      <OrbitControls
        target={view.target}
        maxPolarAngle={Math.PI / 2.15}
        enabled={phase !== "decision"}
      />

      <group ref={world}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.02, 0]}
          receiveShadow
        >
          <planeGeometry args={[160, 200]} />
          <meshStandardMaterial color="#5f6b57" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[roadWidth, 200]} />
          <meshStandardMaterial color="#3a3a3f" />
        </mesh>
        {[0, -roadWidth / 2 + 0.15, roadWidth / 2 - 0.15].map((x) => (
          <mesh
            key={`line-${x}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x, 0.02, 0]}
          >
            <planeGeometry args={[0.14, 200]} />
            <meshStandardMaterial color={x === 0 ? "#e8c33a" : "#dcdcdc"} />
          </mesh>
        ))}

        <group ref={player} position={[laneX, 0, PLAYER_START_Z]}>
          <Model model={playerModel} scale={pack.scale} yaw={CAR_YAW} />
          {phase === "decision" && (
            <mesh
              position={[-laneX * 2, 0.03, 3]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[laneX * 1.3, 6]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.35} />
            </mesh>
          )}
        </group>

        <group ref={moto} position={[-laneX, 0, MOTO_START_Z]}>
          <Model model={motoModel} scale={pack.scale} yaw={CAR_YAW} />
        </group>

        <CrashEffect impact={impact} crashed={crashed} crashTime={crashTime} />
      </group>
    </>
  );
}
