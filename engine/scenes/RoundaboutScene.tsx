"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Scenario } from "@/core/scenario-schema";
import type { SceneView } from "../camera/views";
import RainyAmbience from "../env/RainyAmbience";
import {
  GrassGround,
  ROUNDABOUT_TILE,
  RoadStrip,
  Roundabout,
} from "../env/RoadKit";
import CrashEffect from "../fx/CrashEffect";
import type { Pack } from "../models/cars";
import type { Phase } from "../types";
import { actorModel, CAR_YAW, Model } from "./IntersectionScene";

// Escena de DECISIÓN: primera vía curva del proyecto. El anillo se arma con
// primitivas nativas de three (ringGeometry/circleGeometry), y los actores que
// circulan se ubican con un ángulo paramétrico (no con un timeline de
// posiciones a mano). El jugador entra por el brazo sur; la moto y el bus ya
// circulan dentro del anillo. Ceder el paso = esperar a que la moto pase antes
// de fundirse al anillo; no ceder = choque lateral con la moto.

const RING_MID_R = 9;
const RING_OUTER_R = 12.6;
const STUB_LENGTH = 26;
const STUB_WIDTH = 8.2;

const PLAYER_START_Z = 24;
const DECISION_Z = RING_OUTER_R + 2.2;
const WAIT_Z = RING_OUTER_R + 0.6;
const APPROACH_SPEED_PLAYER = 9;
const PLAYER_RING_SPEED = 6;
const PLAYER_ANGULAR_SPEED = PLAYER_RING_SPEED / RING_MID_R;
const EXIT_ANGLE = -Math.PI / 2;

const MOTO_ANGULAR_SPEED = 0.6;
const MOTO_START_ANGLE = 0.95;
const BUS_ANGULAR_SPEED = 0.28;
const BUS_START_ANGLE = Math.PI + 0.8;

const CRASH_TRIGGER_DIST = 2.4;
const MOTO_CLEAR_ANGLE = -0.35;

// Escala del tile de rotonda para que su carril de circulación quede en RING_MID_R.
const ROUNDABOUT_SCALE = RING_MID_R / ROUNDABOUT_TILE.laneRadius;
// Huella del tile 3x3: sirve de hueco central para encajar los brazos rectos.
const ARM_GAP = 3 * ROUNDABOUT_SCALE;
const ARM_LENGTH = 2 * (RING_OUTER_R + STUB_LENGTH * 0.7);

function ringPos(angle: number, radius = RING_MID_R): [number, number, number] {
  return [radius * Math.sin(angle), 0, radius * Math.cos(angle)];
}

// Rotación del grupo exterior para que el modelo (con yaw interno CAR_YAW)
// quede tangente a la circunferencia en el sentido de circulación.
function ringHeading(angle: number) {
  return angle + Math.PI / 2;
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

export default function RoundaboutScene({
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
  const bus = useRef<THREE.Group | null>(null);

  const reached = useRef(false);
  const playerStage = useRef(0); // 0 recto sur, 1 esperando, 2 en el anillo, 3 saliendo oeste
  const playerAngle = useRef(0);
  const motoAngle = useRef(MOTO_START_ANGLE);
  const busAngle = useRef(BUS_START_ANGLE);
  const crashed = useRef(false);
  const crashTime = useRef(0);
  const motoBaseX = useRef(0);
  const motoBaseZ = useRef(0);
  const impact = useMemo(() => new THREE.Vector3(), []);

  const playerActor = scenario.actors.find((actor) => actor.role === "player");
  const motoActor = scenario.actors.find(
    (actor) => actor.kind === "motorcycle",
  );
  const busActor = scenario.actors.find((actor) => actor.kind === "bus");
  const playerModel = actorModel(playerActor, pack.rogue);
  const motoModel = actorModel(motoActor, pack.player);
  const busModel = actorModel(busActor, pack.slow);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const p = player.current;
    const m = moto.current;
    const b = bus.current;
    if (!p || !m || !b) return;

    const trafficCanMove =
      phase === "approach" || (phase === "consequence" && !crashed.current);
    if (trafficCanMove) {
      motoAngle.current -= MOTO_ANGULAR_SPEED * d;
      busAngle.current -= BUS_ANGULAR_SPEED * d;
    }
    const [mx, , mz] = ringPos(motoAngle.current);
    m.position.set(mx, 0, mz);
    m.rotation.y = ringHeading(motoAngle.current);
    const [bx, , bz] = ringPos(busAngle.current);
    b.position.set(bx, 0, bz);
    b.rotation.y = ringHeading(busAngle.current);

    if (phase === "approach") {
      p.position.z -= APPROACH_SPEED_PLAYER * d;
      if (!reached.current && p.position.z <= DECISION_Z) {
        reached.current = true;
        onReachStop();
      }
      return;
    }

    if (phase !== "consequence") return;

    if (correct) {
      if (playerStage.current === 0) {
        p.position.z = Math.max(
          WAIT_Z,
          p.position.z - APPROACH_SPEED_PLAYER * d,
        );
        if (p.position.z <= WAIT_Z + 0.05) playerStage.current = 1;
      } else if (playerStage.current === 1) {
        if (motoAngle.current < MOTO_CLEAR_ANGLE) {
          playerStage.current = 2;
          playerAngle.current = 0;
        }
      } else if (playerStage.current === 2) {
        playerAngle.current -= PLAYER_ANGULAR_SPEED * d;
        const [x, , z] = ringPos(playerAngle.current);
        p.position.set(x, 0, z);
        p.rotation.y = ringHeading(playerAngle.current);
        if (playerAngle.current <= EXIT_ANGLE) {
          const [ex, , ez] = ringPos(EXIT_ANGLE);
          p.position.set(ex, 0, ez);
          p.rotation.y = Math.PI / 2;
          playerStage.current = 3;
        }
      } else if (playerStage.current === 3) {
        p.position.x -= PLAYER_RING_SPEED * d;
      }
      return;
    }

    // rama incorrecta: entra sin ceder el paso
    if (playerStage.current === 0) {
      p.position.z = Math.max(WAIT_Z, p.position.z - APPROACH_SPEED_PLAYER * d);
      if (p.position.z <= WAIT_Z + 0.05) {
        playerStage.current = 2;
        playerAngle.current = 0;
      }
    } else if (playerStage.current === 2 && !crashed.current) {
      playerAngle.current -= PLAYER_ANGULAR_SPEED * d;
      const [x, , z] = ringPos(playerAngle.current);
      p.position.set(x, 0, z);
      p.rotation.y = ringHeading(playerAngle.current);

      const dist = Math.hypot(
        p.position.x - m.position.x,
        p.position.z - m.position.z,
      );
      if (dist < CRASH_TRIGGER_DIST) {
        crashed.current = true;
        crashTime.current = state.clock.elapsedTime;
        motoBaseX.current = m.position.x;
        motoBaseZ.current = m.position.z;
        impact.copy(p.position).lerp(m.position, 0.5);
        impact.y = 0.6;
      }
    }

    if (crashed.current) {
      const t = state.clock.elapsedTime - crashTime.current;
      const push = 1 - Math.exp(-t * 7);
      const away = new THREE.Vector2(
        motoBaseX.current - p.position.x,
        motoBaseZ.current - p.position.z,
      ).normalize();
      m.position.x = motoBaseX.current + away.x * 1.6 * push;
      m.position.z = motoBaseZ.current + away.y * 1.6 * push;
      m.rotation.z = 0.6 * push;
      p.rotation.z = 0.14 * Math.sin(t * 16) * Math.exp(-t * 4);

      if (world.current) {
        if (t < 0.45) {
          const amp = 0.15 * (1 - t / 0.45);
          world.current.position.set(
            (Math.random() - 0.5) * amp,
            (Math.random() - 0.5) * amp * 0.6,
            (Math.random() - 0.5) * amp,
          );
        } else if (world.current.position.lengthSq() !== 0) {
          world.current.position.set(0, 0, 0);
        }
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
        {/* piso + rotonda del kit; los brazos rectos se encajan a ras del tile */}
        <GrassGround size={160} />
        <Roundabout scale={ROUNDABOUT_SCALE} />
        <RoadStrip
          along="z"
          length={ARM_LENGTH}
          width={STUB_WIDTH}
          gap={ARM_GAP}
        />
        <RoadStrip
          along="x"
          length={ARM_LENGTH}
          width={STUB_WIDTH}
          gap={ARM_GAP}
        />

        {/* línea de "cede el paso" en la entrada sur */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, RING_OUTER_R + 0.3]}
        >
          <planeGeometry args={[STUB_WIDTH, 0.5]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        <group ref={player} position={[0, 0, PLAYER_START_Z]}>
          <Model model={playerModel} scale={pack.scale} yaw={CAR_YAW} />
        </group>

        <group ref={moto} position={ringPos(MOTO_START_ANGLE)}>
          <Model model={motoModel} scale={pack.scale} yaw={CAR_YAW} />
        </group>

        <group ref={bus} position={ringPos(BUS_START_ANGLE)}>
          <Model model={busModel} scale={pack.scale} yaw={CAR_YAW} />
        </group>

        <CrashEffect impact={impact} crashed={crashed} crashTime={crashTime} />
      </group>
    </>
  );
}
