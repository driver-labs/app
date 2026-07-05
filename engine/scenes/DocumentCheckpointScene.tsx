"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Scenario } from "@/core/scenario-schema";
import type { SceneView } from "../camera/views";
import RainyAmbience from "../env/RainyAmbience";
import { GrassGround, RoadStrip } from "../env/RoadKit";
import AttentionArrow from "../fx/AttentionArrow";
import type { Pack } from "../models/cars";
import type { Phase } from "../types";
import { actorModel, CAR_YAW, Model } from "./IntersectionScene";

const START_Z = 26;
const DECISION_Z = 9;
const PULL_OVER_Z = -9;
const APPROACH_SPEED = 8.2;
const CENTER_DASHES = Array.from({ length: 24 }, (_, index) => -66 + index * 6);

type Props = {
  phase: Phase;
  correct: boolean;
  scenario: Scenario;
  pack: Pack;
  view: SceneView;
  layoutSeed: string;
  onReachStop: () => void;
};

function ease(progress: number) {
  const t = Math.min(1, Math.max(0, progress));
  return t * t * (3 - 2 * t);
}

function SirenLights({ active }: { active: boolean }) {
  const red = useRef<THREE.MeshStandardMaterial | null>(null);
  const blue = useRef<THREE.MeshStandardMaterial | null>(null);

  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 16) > 0;
    if (red.current) red.current.emissiveIntensity = active && pulse ? 5 : 0.4;
    if (blue.current)
      blue.current.emissiveIntensity = active && !pulse ? 5 : 0.4;
  });

  return (
    <>
      <mesh position={[0.34, 1.25, -0.1]} castShadow>
        <boxGeometry args={[0.34, 0.12, 0.24]} />
        <meshStandardMaterial
          ref={red}
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[-0.34, 1.25, -0.1]} castShadow>
        <boxGeometry args={[0.34, 0.12, 0.24]} />
        <meshStandardMaterial
          ref={blue}
          color="#2563eb"
          emissive="#2563eb"
          emissiveIntensity={0.4}
        />
      </mesh>
      {active && (
        <>
          <pointLight
            position={[0.45, 1.45, -0.2]}
            intensity={2.4}
            distance={8}
            color="#ef4444"
          />
          <pointLight
            position={[-0.45, 1.45, -0.2]}
            intensity={2.4}
            distance={8}
            color="#2563eb"
          />
        </>
      )}
    </>
  );
}

function Headlights({ color = "#fff2c0" }: { color?: string }) {
  return (
    <>
      <mesh position={[0.55, 0.56, -2.15]}>
        <boxGeometry args={[0.3, 0.14, 0.08]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.4}
        />
      </mesh>
      <mesh position={[-0.55, 0.56, -2.15]}>
        <boxGeometry args={[0.3, 0.14, 0.08]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.4}
        />
      </mesh>
    </>
  );
}

function BrakeLights() {
  return (
    <>
      <mesh position={[0.52, 0.55, 1.25]}>
        <boxGeometry args={[0.28, 0.14, 0.08]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={2.2}
        />
      </mesh>
      <mesh position={[-0.52, 0.55, 1.25]}>
        <boxGeometry args={[0.28, 0.14, 0.08]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={2.2}
        />
      </mesh>
    </>
  );
}

function Cone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <coneGeometry args={[0.22, 0.56, 18]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[0, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.05, 18]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.5, 0.04, 0.5]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

function OfficerFigure() {
  return (
    <group>
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.86, 16]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <sphereGeometry args={[0.19, 18, 18]} />
        <meshStandardMaterial color="#d6a06d" />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.23, 0.12, 18]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[0.32, 0.72, -0.02]} rotation={[0.2, 0, -0.8]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.68, 12]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
    </group>
  );
}

function DocumentSign() {
  return (
    <group>
      <mesh position={[0, 1.25, -0.08]} castShadow>
        <boxGeometry args={[3.9, 1.25, 0.08]} />
        <meshStandardMaterial color="#111827" roughness={0.72} />
      </mesh>
      <Html center distanceFactor={8} position={[0, 1.2, 0.04]}>
        <div
          style={{
            color: "#f8fafc",
            fontFamily:
              "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "14px",
            fontWeight: 800,
            lineHeight: 1.08,
            textAlign: "center",
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            width: "150px",
          }}
        >
          <span>Documentos, por favor</span>
          <span
            style={{
              color: "#93c5fd",
              display: "block",
              fontSize: "10px",
              fontWeight: 700,
              marginTop: "5px",
            }}
          >
            Control de transito
          </span>
        </div>
      </Html>
    </group>
  );
}

export default function DocumentCheckpointScene({
  phase,
  correct,
  scenario,
  pack,
  view,
  layoutSeed,
  onReachStop,
}: Props) {
  const player = useRef<THREE.Group | null>(null);
  const police = useRef<THREE.Group | null>(null);
  const officer = useRef<THREE.Group | null>(null);
  const requestSign = useRef<THREE.Group | null>(null);
  const reached = useRef(false);
  const consequenceStart = useRef<number | null>(null);

  const roadWidth = Math.max(8, scenario.road.lanes * 3.8);
  const laneX = roadWidth / 4;
  const shoulderX = roadWidth / 2 - 0.45;
  const policeStartX = roadWidth / 2 + 4.4;
  const playerActor = scenario.actors.find((actor) => actor.role === "player");
  const playerModel = actorModel(playerActor, pack.rogue);
  const policeModel = "/models/police.glb";
  const conePositions = useMemo<[number, number, number][]>(
    () => [
      [roadWidth / 2 + 0.45, 0, 5.8],
      [roadWidth / 2 + 0.85, 0, 2.2],
      [roadWidth / 2 + 0.95, 0, -1.4],
      [roadWidth / 2 + 0.95, 0, -5.2],
    ],
    [roadWidth],
  );

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const car = player.current;
    const patrol = police.current;
    if (!car || !patrol) return;

    if (requestSign.current) {
      requestSign.current.visible = false;
    }
    if (officer.current) {
      officer.current.visible = false;
    }

    if (phase === "intro") {
      car.position.set(laneX, 0, START_Z);
      car.rotation.set(0, 0, 0);
      patrol.position.set(policeStartX, 0, START_Z + 10);
      patrol.rotation.set(0, -0.08, 0);
      reached.current = false;
      consequenceStart.current = null;
      return;
    }

    if (phase === "approach") {
      car.position.x = laneX;
      car.position.z = Math.max(
        DECISION_Z,
        car.position.z - APPROACH_SPEED * d,
      );
      car.rotation.set(0, 0, 0);
      patrol.position.set(policeStartX, 0, START_Z + 10);
      patrol.rotation.set(0, -0.08, 0);

      if (!reached.current && car.position.z <= DECISION_Z + 0.02) {
        reached.current = true;
        onReachStop();
      }
      return;
    }

    if (phase === "decision") {
      consequenceStart.current = null;
      return;
    }

    if (consequenceStart.current === null) {
      consequenceStart.current = state.clock.elapsedTime;
    }
    const t = state.clock.elapsedTime - consequenceStart.current;

    if (correct) {
      const pull = ease(t / 1.8);
      car.position.x = THREE.MathUtils.lerp(laneX, shoulderX, pull);
      car.position.z = THREE.MathUtils.lerp(DECISION_Z, DECISION_Z - 2.4, pull);
      car.rotation.y = -0.08 * pull;
      patrol.position.set(policeStartX, 0, START_Z + 10);
      patrol.rotation.set(0, -0.08, 0);
      return;
    }

    const drive = ease(t / 3.1);
    const pullOver = ease((t - 1.9) / 1.4);
    car.position.z = THREE.MathUtils.lerp(DECISION_Z, PULL_OVER_Z, drive);
    car.position.x = THREE.MathUtils.lerp(laneX, shoulderX, pullOver);
    car.rotation.y = -0.1 * pullOver;

    const joinLane = ease((t - 0.25) / 0.9);
    const patrolPullOver = ease((t - 2.2) / 1.25);
    const patrolLaneX = THREE.MathUtils.lerp(policeStartX, laneX, joinLane);
    patrol.position.x = THREE.MathUtils.lerp(
      patrolLaneX,
      shoulderX - 0.2,
      patrolPullOver,
    );
    patrol.position.z = THREE.MathUtils.lerp(
      DECISION_Z + 15,
      PULL_OVER_Z + 5.2,
      ease((t - 0.2) / 3.2),
    );
    patrol.rotation.y = -0.08 * patrolPullOver;

    if (t > 3.2) {
      if (officer.current) officer.current.visible = true;
      if (requestSign.current) requestSign.current.visible = true;
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

      <GrassGround color="#2f8550" size={180} />
      <RoadStrip along="z" length={150} width={roadWidth} />

      {CENTER_DASHES.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, z]}>
          <planeGeometry args={[0.12, 2.8]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
      ))}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[roadWidth / 2 + 0.15, 0.024, 0]}
      >
        <planeGeometry args={[0.18, 150]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-roadWidth / 2 - 0.15, 0.024, 0]}
      >
        <planeGeometry args={[0.18, 150]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {conePositions.map((position) => (
        <Cone key={`${position[0]}-${position[2]}`} position={position} />
      ))}

      <group ref={player} position={[laneX, 0, START_Z]}>
        <Model model={playerModel} scale={pack.scale} yaw={CAR_YAW} />
        <Headlights />
        {phase === "consequence" && <BrakeLights />}
      </group>

      <AttentionArrow target={player} />

      <group ref={police} position={[policeStartX, 0, START_Z + 10]}>
        <Model model={policeModel} scale={pack.scale} yaw={CAR_YAW} />
        <Headlights color="#dbeafe" />
        <BrakeLights />
        <SirenLights active={phase === "consequence" && !correct} />
      </group>

      <group
        ref={officer}
        position={[shoulderX - 0.7, 0, PULL_OVER_Z + 1.8]}
        rotation={[0, -0.35, 0]}
        visible={false}
      >
        <OfficerFigure />
      </group>

      <group
        ref={requestSign}
        position={[shoulderX - 2.85, 0, PULL_OVER_Z + 4.4]}
        visible={false}
      >
        <DocumentSign />
      </group>
    </>
  );
}
