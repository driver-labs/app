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
import type { Phase } from "../types";
import { actorModel, CAR_YAW, Model } from "./IntersectionScene";

// Escena de DECISIÓN disparada por TIEMPO (no por posición): al segundo
// DECISION_DELAY llega un mensaje. La rama incorrecta simula "no mirar la
// calle" con deriva lateral + una franja en el piso que marca cuánto avanzó
// el auto a ciegas; termina en near-miss con una motocicleta que se mete al
// carril, nunca en choque.

const DECISION_DELAY = 3.2;
const DISTRACTION_DURATION = 2.0;
const APPROACH_SPEED = 8;
const SAFE_SPEED = 8;
const DISTRACTED_SPEED = 8.5;
const DRIFT_X = 1.3;
const BRAKE_DECEL = 12;
const NEAR_MISS_TRIGGER_GAP = 2.2;
const HAZARD_Z = -6;
const HAZARD_START_X = -10;
const HAZARD_TARGET_X = -1.4;

type Props = {
  phase: Phase;
  correct: boolean;
  scenario: Scenario;
  pack: Pack;
  view: SceneView;
  layoutSeed: string;
  onReachStop: () => void;
};

export default function DistractionScene({
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
  const hazard = useRef<THREE.Group | null>(null);
  const driftStrip = useRef<THREE.Mesh | null>(null);
  const phoneGlow = useRef<THREE.MeshStandardMaterial | null>(null);

  const timer = useRef(0);
  const reached = useRef(false);
  const consequenceStarted = useRef(false);
  const consequenceStartTime = useRef(0);
  const blindStarted = useRef(false);
  const blindStartTime = useRef(0);
  const driftStartZ = useRef(0);
  const braking = useRef(false);
  const playerSpeed = useRef(0);
  const nearMiss = useRef(false);
  const nearMissTime = useRef(0);
  const impact = useMemo(() => new THREE.Vector3(), []);

  const roadWidth = Math.max(8, scenario.road.lanes * 4.6);
  const playerActor = scenario.actors.find((actor) => actor.role === "player");
  const hazardActor = scenario.actors.find(
    (actor) => actor.kind === "motorcycle",
  );
  const playerModel = actorModel(playerActor, pack.rogue);
  const hazardModel = actorModel(hazardActor, pack.player);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const p = player.current;
    const hz = hazard.current;
    if (!p || !hz) return;

    if (phase === "intro") return;

    if (phase === "approach") {
      p.position.z -= APPROACH_SPEED * d;
      timer.current += d;
      if (phoneGlow.current) phoneGlow.current.emissiveIntensity = 0.15;
      if (!reached.current && timer.current >= DECISION_DELAY) {
        reached.current = true;
        onReachStop();
      }
      return;
    }

    if (phase === "decision") {
      if (phoneGlow.current) phoneGlow.current.emissiveIntensity = 3;
      return;
    }

    if (phase !== "consequence") return;

    if (!consequenceStarted.current) {
      consequenceStarted.current = true;
      consequenceStartTime.current = state.clock.elapsedTime;
    }
    const ct = state.clock.elapsedTime - consequenceStartTime.current;

    if (correct) {
      if (phoneGlow.current) phoneGlow.current.emissiveIntensity = 0.15;
      p.position.z -= SAFE_SPEED * d;
      const hazardT = Math.min(1, ct / 1.6);
      hz.position.x = THREE.MathUtils.lerp(
        HAZARD_START_X,
        HAZARD_TARGET_X,
        hazardT,
      );
      hz.position.z = HAZARD_Z;
      return;
    }

    // rama incorrecta: distracción por celular
    if (!blindStarted.current) {
      blindStarted.current = true;
      blindStartTime.current = state.clock.elapsedTime;
      driftStartZ.current = p.position.z;
    }
    const bt = state.clock.elapsedTime - blindStartTime.current;
    const blind = bt < DISTRACTION_DURATION && !braking.current;

    if (phoneGlow.current)
      phoneGlow.current.emissiveIntensity = blind ? 3 : 0.15;

    playerSpeed.current = braking.current
      ? Math.max(0, playerSpeed.current - BRAKE_DECEL * d)
      : DISTRACTED_SPEED;
    p.position.z -= playerSpeed.current * d;

    if (blind) {
      p.position.x = THREE.MathUtils.lerp(
        0,
        DRIFT_X,
        Math.min(1, bt / DISTRACTION_DURATION),
      );
      if (driftStrip.current) {
        const startZ = driftStartZ.current;
        const curZ = p.position.z;
        const len = Math.max(0.05, startZ - curZ);
        driftStrip.current.position.set(0, 0.03, (startZ + curZ) / 2);
        driftStrip.current.scale.set(1, len, 1);
        driftStrip.current.visible = true;
      }
    } else if (!braking.current) {
      const dx = 0 - p.position.x;
      const step = 3 * d;
      p.position.x += Math.abs(dx) < step ? dx : Math.sign(dx) * step;
    }

    const hazardT = Math.min(1, bt / (DISTRACTION_DURATION * 0.9));
    hz.position.x = THREE.MathUtils.lerp(
      HAZARD_START_X,
      HAZARD_TARGET_X,
      hazardT,
    );
    hz.position.z = HAZARD_Z;

    if (!braking.current && !blind) {
      const gap = Math.hypot(
        p.position.x - hz.position.x,
        p.position.z - hz.position.z,
      );
      if (gap < NEAR_MISS_TRIGGER_GAP) {
        braking.current = true;
        nearMiss.current = true;
        nearMissTime.current = state.clock.elapsedTime;
        impact.set(
          (p.position.x + hz.position.x) / 2,
          0.3,
          (p.position.z + hz.position.z) / 2,
        );
      }
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
        <GrassGround color="#4a4f57" size={200} />
        <RoadStrip along="z" length={140} width={roadWidth} />

        {/* franja que marca cuánto avanzó el auto mientras no miraba la calle */}
        <mesh ref={driftStrip} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <planeGeometry args={[2.6, 1]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.32} />
        </mesh>

        <group ref={player} position={[0, 0, 30]}>
          <Model model={playerModel} scale={pack.scale} yaw={CAR_YAW} />
          <mesh position={[0, 1.35, -0.1]}>
            <boxGeometry args={[0.22, 0.12, 0.02]} />
            <meshStandardMaterial
              ref={phoneGlow}
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={0.15}
            />
          </mesh>
        </group>

        <group
          ref={hazard}
          position={[HAZARD_START_X, 0, HAZARD_Z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <Model model={hazardModel} scale={pack.scale} yaw={0} />
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
