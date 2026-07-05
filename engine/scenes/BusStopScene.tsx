"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Scenario } from "@/core/scenario-schema";
import type { SceneView } from "../camera/views";
import RainyAmbience from "../env/RainyAmbience";
import { GrassGround, RoadStrip } from "../env/RoadKit";
import NearMissEffect from "../fx/NearMissEffect";
import type { Pack } from "../models/cars";
import Pedestrian from "../models/Pedestrian";
import type { Phase } from "../types";
import { actorModel, CAR_YAW, Model } from "./IntersectionScene";

// Escena de DECISIÓN: un bus detenido oculta a un peatón que va a cruzar por
// delante. La rama correcta espera visibilidad antes de adelantar; la
// incorrecta adelanta a ciegas y frena de golpe cuando el peatón aparece
// (near-miss, no choque — así lo pide la política editorial del proyecto).

const BUS_Z = 0;
const DECISION_Z = 14;
const WAIT_Z = 6;
const PED_HIDDEN_Z = -1.6;
const APPROACH_SPEED = 8;
const CREEP_SPEED = 3;
const RESUME_SPEED = 6;
const OVERTAKE_SPEED = 9;
const LANE_STEP = 4;
const PED_CROSS_DURATION = 2.2;
const BRAKE_DECEL = 14;
const NEAR_MISS_TRIGGER_GAP = 2.6;

type Props = {
  phase: Phase;
  correct: boolean;
  scenario: Scenario;
  pack: Pack;
  view: SceneView;
  layoutSeed: string;
  onReachStop: () => void;
};

export default function BusStopScene({
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
  const ped = useRef<THREE.Group | null>(null);

  const reached = useRef(false);
  const waiting = useRef(false);
  const pedStarted = useRef(false);
  const pedStartTime = useRef(0);
  const overtakeStage = useRef(0);
  const braking = useRef(false);
  const brakeSpeed = useRef(0);
  const nearMiss = useRef(false);
  const nearMissTime = useRef(0);
  const impact = useMemo(() => new THREE.Vector3(), []);

  const roadWidth = Math.max(10, scenario.road.lanes * 4.8);
  const laneX = roadWidth / 4;
  const playerActor = scenario.actors.find((actor) => actor.role === "player");
  const busActor = scenario.actors.find((actor) => actor.kind === "bus");
  const playerModel = actorModel(playerActor, pack.rogue);
  const busModel = actorModel(busActor, pack.slow);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const p = player.current;
    const pd = ped.current;
    if (!p || !pd) return;

    if (phase === "approach") {
      p.position.z -= APPROACH_SPEED * d;
      if (!reached.current && p.position.z <= DECISION_Z) {
        reached.current = true;
        onReachStop();
      }
      return;
    }

    if (phase !== "consequence") return;

    if (correct) {
      if (!waiting.current) {
        p.position.z = Math.max(WAIT_Z, p.position.z - CREEP_SPEED * d);
        if (p.position.z <= WAIT_Z + 0.05) waiting.current = true;
        return;
      }
      if (!pedStarted.current) {
        pedStarted.current = true;
        pedStartTime.current = state.clock.elapsedTime;
      }
      const pt = state.clock.elapsedTime - pedStartTime.current;
      pd.position.x = THREE.MathUtils.lerp(
        laneX,
        -laneX - 1.2,
        Math.min(1, pt / PED_CROSS_DURATION),
      );
      pd.position.z = BUS_Z + PED_HIDDEN_Z;

      if (pt > PED_CROSS_DURATION + 0.4) {
        if (overtakeStage.current === 0) overtakeStage.current = 1;
        if (overtakeStage.current === 1) {
          p.position.z -= RESUME_SPEED * d;
          const dx = -laneX - p.position.x;
          const step = LANE_STEP * d;
          p.position.x += Math.abs(dx) < step ? dx : Math.sign(dx) * step;
          if (p.position.z < BUS_Z - 3) overtakeStage.current = 2;
        } else if (overtakeStage.current === 2) {
          p.position.z -= RESUME_SPEED * d;
          const dx = laneX - p.position.x;
          const step = LANE_STEP * d;
          p.position.x += Math.abs(dx) < step ? dx : Math.sign(dx) * step;
        }
      }
      return;
    }

    // rama incorrecta: adelanta sin esperar visibilidad
    if (!braking.current) {
      p.position.z -= OVERTAKE_SPEED * d;
      const dx = -laneX - p.position.x;
      const step = LANE_STEP * d;
      p.position.x += Math.abs(dx) < step ? dx : Math.sign(dx) * step;

      if (!pedStarted.current && p.position.z < BUS_Z + 3) {
        pedStarted.current = true;
        pedStartTime.current = state.clock.elapsedTime;
      }
      if (pedStarted.current) {
        const pt = state.clock.elapsedTime - pedStartTime.current;
        pd.position.x = THREE.MathUtils.lerp(
          laneX,
          -laneX - 1.2,
          Math.min(1, pt / (PED_CROSS_DURATION * 0.7)),
        );
        pd.position.z = BUS_Z + PED_HIDDEN_Z;

        const gap = Math.abs(p.position.z - pd.position.z);
        if (gap < NEAR_MISS_TRIGGER_GAP) {
          braking.current = true;
          brakeSpeed.current = OVERTAKE_SPEED;
          nearMiss.current = true;
          nearMissTime.current = state.clock.elapsedTime;
          impact.set(
            (p.position.x + pd.position.x) / 2,
            0.3,
            (p.position.z + pd.position.z) / 2,
          );
        }
      }
    } else {
      brakeSpeed.current = Math.max(0, brakeSpeed.current - BRAKE_DECEL * d);
      p.position.z -= brakeSpeed.current * d;
      const pt = state.clock.elapsedTime - pedStartTime.current;
      pd.position.x = THREE.MathUtils.lerp(
        laneX,
        -laneX - 1.2,
        Math.min(1, pt / (PED_CROSS_DURATION * 0.7)),
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
        <GrassGround color="#3f7d4f" size={200} />
        <RoadStrip along="z" length={140} width={roadWidth} />
        {/* línea central amarilla: el adelantamiento al bus la cruza */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[0.16, 200]} />
          <meshStandardMaterial color="#e8c33a" />
        </mesh>

        <group ref={player} position={[laneX, 0, 34]}>
          <Model model={playerModel} scale={pack.scale} yaw={CAR_YAW} />
        </group>

        <group position={[laneX, 0, BUS_Z]}>
          <Model model={busModel} scale={pack.scale} yaw={CAR_YAW} />
          <mesh position={[0.5, 0.55, 1.4]}>
            <boxGeometry args={[0.28, 0.14, 0.08]} />
            <meshStandardMaterial
              color="#ffb020"
              emissive="#ff9800"
              emissiveIntensity={2.2}
            />
          </mesh>
          <mesh position={[-0.5, 0.55, 1.4]}>
            <boxGeometry args={[0.28, 0.14, 0.08]} />
            <meshStandardMaterial
              color="#ffb020"
              emissive="#ff9800"
              emissiveIntensity={2.2}
            />
          </mesh>
        </group>

        <group ref={ped} position={[laneX, 0, BUS_Z + PED_HIDDEN_Z]}>
          <Pedestrian walking shirtColor="#dc2626" />
        </group>

        <NearMissEffect
          impact={impact}
          triggered={nearMiss}
          startTime={nearMissTime}
        />
      </group>
    </>
  );
}
