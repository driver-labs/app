"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Scenario } from "@/core/scenario-schema";
import type { SceneView } from "../camera/views";
import RainyAmbience from "../env/RainyAmbience";
import { GrassGround, RoadStrip } from "../env/RoadKit";
import AttentionArrow from "../fx/AttentionArrow";
import CrashEffect from "../fx/CrashEffect";
import type { Pack } from "../models/cars";
import Pedestrian from "../models/Pedestrian";
import type { Phase } from "../types";
import { actorModel, CAR_YAW, Model } from "./IntersectionScene";

const PLAYER_START_Z = 26;
const DECISION_Z = 10;
const CROSSWALK_Z = 3.8;
const SAFE_WAIT_Z = 7.2;
const APPROACH_SPEED = 8;
const SAFE_SPEED = 5.5;
const WRONG_SPEED = 10;
const PED_CROSS_SECONDS = 2.4;
const IMPACT_GAP = 1.8;
const WRONG_IMPACT_SECONDS = 1.25;

function CrosswalkStripes({ roadWidth }: { roadWidth: number }) {
  const stripes = [-3, -1.8, -0.6, 0.6, 1.8, 3].filter(
    (x) => Math.abs(x) < roadWidth / 2 - 0.4,
  );

  return (
    <>
      {stripes.map((x) => (
        <mesh
          key={`crosswalk-${x}`}
          position={[x, 0.025, CROSSWALK_Z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.62, 4.6]} />
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

export default function CrosswalkScene({
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
  const pedestrian = useRef<THREE.Group | null>(null);
  const reached = useRef(false);
  const pedStarted = useRef(false);
  const pedStartTime = useRef(0);
  const crashed = useRef(false);
  const crashTime = useRef(0);
  const playerSpeed = useRef(WRONG_SPEED);
  const playerCrashZ = useRef(0);
  const pedCrashX = useRef(0);
  const pedCrashZ = useRef(0);
  const impact = useMemo(() => new THREE.Vector3(), []);

  const roadWidth = Math.max(10, scenario.road.lanes * 4.8);
  const laneX = roadWidth / 4;
  const playerActor = scenario.actors.find((actor) => actor.role === "player");
  const playerModel = actorModel(playerActor, pack.rogue);
  const pedStartX = -roadWidth / 2 + 0.8;
  const pedEndX = roadWidth / 2 - 0.8;

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const p = player.current;
    const ped = pedestrian.current;
    if (!p || !ped) return;

    if (phase === "approach") {
      p.position.z -= APPROACH_SPEED * d;
      if (!reached.current && p.position.z <= DECISION_Z) {
        reached.current = true;
        onReachStop();
      }
      return;
    }

    if (phase !== "consequence") return;

    if (!pedStarted.current) {
      pedStarted.current = true;
      pedStartTime.current = state.clock.elapsedTime;
    }
    const t = state.clock.elapsedTime - pedStartTime.current;
    const pedT = Math.min(1, t / PED_CROSS_SECONDS);
    ped.position.x = THREE.MathUtils.lerp(pedStartX, pedEndX, pedT);
    ped.position.z = CROSSWALK_Z;

    if (correct) {
      if (pedT < 0.95) {
        p.position.z = Math.max(SAFE_WAIT_Z, p.position.z - SAFE_SPEED * d);
      } else {
        p.position.z -= SAFE_SPEED * d;
      }
      return;
    }

    if (!crashed.current) {
      p.position.z = THREE.MathUtils.lerp(
        DECISION_Z,
        CROSSWALK_Z + 0.65,
        Math.min(1, t / WRONG_IMPACT_SECONDS),
      );
      const gap = Math.hypot(
        p.position.x - ped.position.x,
        p.position.z - ped.position.z,
      );

      if (gap < IMPACT_GAP || t >= WRONG_IMPACT_SECONDS) {
        ped.position.x = laneX - 0.45;
        ped.position.z = CROSSWALK_Z;
        crashed.current = true;
        crashTime.current = state.clock.elapsedTime;
        playerCrashZ.current = p.position.z;
        pedCrashX.current = ped.position.x;
        pedCrashZ.current = ped.position.z;
        impact.set(
          (p.position.x + ped.position.x) / 2,
          0.45,
          (p.position.z + ped.position.z) / 2,
        );
      }
      return;
    }

    const crashT = state.clock.elapsedTime - crashTime.current;
    playerSpeed.current = Math.max(0, playerSpeed.current - 20 * d);
    p.position.z = playerCrashZ.current - 0.75 * (1 - Math.exp(-crashT * 5));
    p.rotation.x = -0.05 * Math.sin(crashT * 18) * Math.exp(-crashT * 4);

    const push = 1 - Math.exp(-crashT * 6);
    ped.position.x = pedCrashX.current + 1.25 * push;
    ped.position.z = pedCrashZ.current - 1.35 * push;
    ped.position.y = 0.12;
    ped.rotation.z = -Math.PI / 2;
    ped.rotation.y = -0.35;

    if (world.current) {
      if (crashT < 0.35) {
        const amp = 0.12 * (1 - crashT / 0.35);
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
      <OrbitControls
        target={view.target}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={8}
        maxDistance={58}
      />

      <group ref={world}>
        <GrassGround color="#3f7d4f" size={180} />
        <RoadStrip along="z" length={130} width={roadWidth} />
        <CrosswalkStripes roadWidth={roadWidth} />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, CROSSWALK_Z + 3.2]}
        >
          <planeGeometry args={[roadWidth, 0.42]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        <group ref={player} position={[laneX, 0, PLAYER_START_Z]}>
          <Model model={playerModel} scale={pack.scale} yaw={CAR_YAW} />
        </group>

        <group ref={pedestrian} position={[pedStartX, 0, CROSSWALK_Z]}>
          <Pedestrian walking shirtColor="#f59e0b" />
        </group>

        <AttentionArrow height={3.2} target={pedestrian} />
        <CrashEffect impact={impact} crashed={crashed} crashTime={crashTime} />
      </group>
    </>
  );
}
