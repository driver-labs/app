"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Scenario } from "@/core/scenario-schema";
import type { SceneView } from "../camera/views";
import RainyAmbience from "../env/RainyAmbience";
import StreetLamp from "../env/StreetLamp";
import NearMissEffect from "../fx/NearMissEffect";
import type { Pack } from "../models/cars";
import Pedestrian from "../models/Pedestrian";
import type { Phase } from "../types";
import { actorModel, CAR_YAW, Model } from "./IntersectionScene";

// Escena de DECISIÓN: el carro de adelante frena por un peatón en un paso
// peatonal, de noche y con lluvia. La diferencia entre las dos ramas es
// puramente la reacción del jugador (distancia/velocidad), no el evento en sí.

const DECISION_Z = 14;
const LEAD_BRAKE_DECEL = 5.5;
const LEAD_MIN_Z = -4;
const CROSSWALK_Z = -5.4;
const PLAYER_SAFE_DECEL = 8; // frena temprano y con margen porque ya venía con distancia
const PLAYER_RISK_DECEL = 10; // frena tarde y fuerte porque venía pegado
const REACTION_DELAY = 0.45;
const MIN_GAP = 1.3;
const NEAR_MISS_GAP = 2.3;
const APPROACH_SPEED_LEAD = 8;
const APPROACH_SPEED_PLAYER = 9;

function CrosswalkStripes({ roadWidth, z }: { roadWidth: number; z: number }) {
  const stripes = [-3, -1.8, -0.6, 0.6, 1.8, 3].filter(
    (x) => Math.abs(x) < roadWidth / 2 - 0.4,
  );
  return (
    <>
      {stripes.map((x) => (
        <mesh
          key={`crosswalk-${x}`}
          position={[x, 0.025, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.62, 4]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
    </>
  );
}

type Props = {
  phase: Phase;
  correct: boolean;
  scenario: Scenario;
  pack: Pack;
  view: SceneView;
  layoutSeed: string;
  onReachStop: () => void;
};

export default function RainBrakingScene({
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
  const lead = useRef<THREE.Group | null>(null);
  const ped = useRef<THREE.Group | null>(null);

  const leadSpeed = useRef(APPROACH_SPEED_LEAD);
  const playerSpeed = useRef(APPROACH_SPEED_PLAYER);
  const reached = useRef(false);
  const reactionTimer = useRef(0);
  const pedStarted = useRef(false);
  const pedStartTime = useRef(0);
  const nearMiss = useRef(false);
  const nearMissTime = useRef(0);
  const impact = useMemo(() => new THREE.Vector3(), []);

  const roadWidth = Math.max(8, scenario.road.lanes * 3.8);
  const laneX = roadWidth / 4;
  const playerActor = scenario.actors.find((actor) => actor.role === "player");
  const leadActor = scenario.actors.find(
    (actor) => actor.kind === "car" && actor.role !== "player",
  );
  const playerModel = actorModel(playerActor, pack.rogue);
  const leadModel = actorModel(leadActor, pack.oncoming);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const p = player.current;
    const l = lead.current;
    const pd = ped.current;
    if (!p || !l || !pd) return;

    if (phase === "approach") {
      l.position.z -= APPROACH_SPEED_LEAD * d;
      p.position.z -= APPROACH_SPEED_PLAYER * d;
      p.position.z = Math.max(p.position.z, l.position.z + MIN_GAP);
      if (!reached.current && p.position.z <= DECISION_Z) {
        reached.current = true;
        onReachStop();
      }
      return;
    }

    if (phase !== "consequence") return;

    leadSpeed.current = Math.max(0, leadSpeed.current - LEAD_BRAKE_DECEL * d);
    l.position.z = Math.max(LEAD_MIN_Z, l.position.z - leadSpeed.current * d);

    if (!pedStarted.current && leadSpeed.current < 2) {
      pedStarted.current = true;
      pedStartTime.current = state.clock.elapsedTime;
    }
    if (pedStarted.current) {
      const pt = state.clock.elapsedTime - pedStartTime.current;
      pd.position.x = THREE.MathUtils.lerp(
        -roadWidth / 2 + 0.6,
        roadWidth / 2 - 0.6,
        Math.min(1, pt / 2.2),
      );
      pd.position.z = CROSSWALK_Z;
    }

    if (correct) {
      playerSpeed.current = Math.max(
        0,
        playerSpeed.current - PLAYER_SAFE_DECEL * d,
      );
    } else {
      reactionTimer.current += d;
      const decel =
        reactionTimer.current > REACTION_DELAY ? PLAYER_RISK_DECEL : 0;
      playerSpeed.current = Math.max(0, playerSpeed.current - decel * d);
    }
    p.position.z -= playerSpeed.current * d;
    const minZ = l.position.z + MIN_GAP;
    if (p.position.z < minZ) p.position.z = minZ;

    const gap = p.position.z - l.position.z;
    if (!correct && !nearMiss.current && gap < NEAR_MISS_GAP) {
      nearMiss.current = true;
      nearMissTime.current = state.clock.elapsedTime;
      impact.set(
        (p.position.x + l.position.x) / 2,
        0.25,
        (p.position.z + l.position.z) / 2,
      );
    }

    if (nearMiss.current && world.current) {
      const t = state.clock.elapsedTime - nearMissTime.current;
      if (t < 0.3) {
        const amp = 0.08 * (1 - t / 0.3);
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
        paused={phase === "intro" || phase === "decision"}
      />
      <OrbitControls target={view.target} maxPolarAngle={Math.PI / 2.15} />

      <group ref={world}>
        <StreetLamp
          position={[laneX + 4, 0, -8]}
          rotationY={(-3 * Math.PI) / 4}
        />
        <StreetLamp position={[-laneX - 4, 0, 10]} rotationY={Math.PI / 4} />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.02, 0]}
          receiveShadow
        >
          <planeGeometry args={[160, 200]} />
          <meshStandardMaterial color="#2c3a33" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[roadWidth, 200]} />
          <meshStandardMaterial color="#33363c" />
        </mesh>
        {[-roadWidth / 2 + 0.15, roadWidth / 2 - 0.15].map((x) => (
          <mesh
            key={`edge-${x}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x, 0.02, 0]}
          >
            <planeGeometry args={[0.14, 200]} />
            <meshStandardMaterial color="#dcdcdc" />
          </mesh>
        ))}
        <CrosswalkStripes roadWidth={roadWidth} z={CROSSWALK_Z} />

        <group ref={player} position={[laneX, 0, 34]}>
          <Model model={playerModel} scale={pack.scale} yaw={CAR_YAW} />
          <pointLight
            position={[0, 0.9, -4]}
            intensity={1.6}
            distance={16}
            decay={0}
            color="#fff2c0"
          />
        </group>

        <group ref={lead} position={[laneX, 0, 20]}>
          <Model model={leadModel} scale={pack.scale} yaw={CAR_YAW} />
          <mesh position={[0.5, 0.6, 1.1]}>
            <boxGeometry args={[0.3, 0.15, 0.08]} />
            <meshStandardMaterial
              color="#ff4d4d"
              emissive="#ff2020"
              emissiveIntensity={2.4}
            />
          </mesh>
          <mesh position={[-0.5, 0.6, 1.1]}>
            <boxGeometry args={[0.3, 0.15, 0.08]} />
            <meshStandardMaterial
              color="#ff4d4d"
              emissive="#ff2020"
              emissiveIntensity={2.4}
            />
          </mesh>
        </group>

        <group ref={ped} position={[-roadWidth / 2 - 0.8, 0, CROSSWALK_Z]}>
          <Pedestrian walking shirtColor="#f59e0b" />
        </group>

        <NearMissEffect
          impact={impact}
          triggered={nearMiss}
          startTime={nearMissTime}
          heading={0}
        />
      </group>
    </>
  );
}
