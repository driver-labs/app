"use client";

import { Clone, Preload, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import Lights from "@/engine/env/Lights";
import { Crossroad, GrassGround, RoadStrip } from "@/engine/env/RoadKit";

const VEHICLES = [
  "/models/sedan.glb",
  "/models/suv.glb",
  "/models/hatchback-sports.glb",
  "/models/taxi.glb",
  "/models/van.glb",
] as const;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function CameraRig() {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const drift = Math.sin(clock.elapsedTime * 0.22) * 0.55;
    camera.position.set(15.5 + drift, 10.8, 15.5 - drift * 0.5);
    camera.lookAt(0, 0.2, 0);
  });

  return null;
}

type VehicleConfig = {
  model: string;
  axis: "x" | "z";
  direction: -1 | 1;
  offset: number;
  speed: number;
  scale?: number;
  laneOffset?: number;
};

const VEHICLE_CONFIGS: VehicleConfig[] = [
  { model: VEHICLES[0], axis: "x", direction: 1, offset: 2, speed: 6.4 },
  { model: VEHICLES[1], axis: "x", direction: -1, offset: 18, speed: 5.8 },
  { model: VEHICLES[2], axis: "z", direction: 1, offset: 34, speed: 5.1 },
  { model: VEHICLES[3], axis: "z", direction: -1, offset: 52, speed: 4.9 },
  {
    model: VEHICLES[4],
    axis: "x",
    direction: 1,
    offset: 26,
    speed: 3.2,
    scale: 1.75,
  },
];

const TRACK_RANGE = 78;
const DEFAULT_LANE_OFFSET = 2.65;
// Distance (in track-progress units) at which a faster car reacts to the one ahead.
const FOLLOW_GAP = 6;
// Hysteresis so a car doesn't flicker in/out of "overtaking" right at the threshold.
const RESUME_GAP = FOLLOW_GAP * 1.6;
// Minimum clearance required in the oncoming lane before pulling out to pass.
const OVERTAKE_CLEAR_GAP = 10;
// Fraction of the remaining lane-shift covered per frame while steering in/out.
const LANE_STEER_LERP = 0.045;

function laneCenter(axis: "x" | "z", direction: -1 | 1, laneOffset: number) {
  return axis === "x" ? direction * laneOffset : -direction * laneOffset;
}

function trackPosition(progress: number, direction: -1 | 1) {
  return (progress - TRACK_RANGE / 2) * direction;
}

function staticHeading(axis: "x" | "z", direction: -1 | 1) {
  if (axis === "x") return direction === 1 ? Math.PI / 2 : -Math.PI / 2;
  return direction === 1 ? 0 : Math.PI;
}

function cyclicGap(from: number, to: number) {
  return (((to - from) % TRACK_RANGE) + TRACK_RANGE) % TRACK_RANGE;
}

type CarState = {
  progress: number;
  speed: number;
  lane: number;
  appliedLane: number;
  overtaking: boolean;
  x: number;
  z: number;
};

function initialCarState(config: VehicleConfig): CarState {
  const lane = laneCenter(
    config.axis,
    config.direction,
    config.laneOffset ?? DEFAULT_LANE_OFFSET,
  );
  const progress = config.offset % TRACK_RANGE;
  const forward = trackPosition(progress, config.direction);
  return {
    progress,
    speed: config.speed,
    lane,
    appliedLane: lane,
    overtaking: false,
    x: config.axis === "x" ? forward : lane,
    z: config.axis === "x" ? lane : forward,
  };
}

// Cars share only 4 physical lanes (2 roads x 2 directions), so a 5th car on
// a lane already in use must react to whoever is ahead of it: slow down and
// follow, or swing into the oncoming lane to pass when it's clear.
function TrafficSystem() {
  const reducedMotion = useReducedMotion();
  const scenes = [
    useGLTF(VEHICLE_CONFIGS[0].model).scene,
    useGLTF(VEHICLE_CONFIGS[1].model).scene,
    useGLTF(VEHICLE_CONFIGS[2].model).scene,
    useGLTF(VEHICLE_CONFIGS[3].model).scene,
    useGLTF(VEHICLE_CONFIGS[4].model).scene,
  ];
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const carStateRef = useRef<CarState[] | null>(null);
  const staticPoseApplied = useRef(false);
  if (!carStateRef.current) {
    carStateRef.current = VEHICLE_CONFIGS.map(initialCarState);
  }
  const carState = carStateRef.current;

  useFrame((_, rawDelta) => {
    if (reducedMotion) {
      if (staticPoseApplied.current) return;
      VEHICLE_CONFIGS.forEach((config, i) => {
        const group = groupRefs.current[i];
        const me = carState[i];
        if (!group) return;
        group.position.set(me.x, 0.22, me.z);
        group.rotation.y = staticHeading(config.axis, config.direction);
      });
      staticPoseApplied.current = true;
      return;
    }

    const delta = Math.min(rawDelta, 0.1);

    // Pass 1: decide each car's effective speed / overtaking intent from
    // last frame's positions only, so evaluation order doesn't matter.
    const effectiveSpeeds = VEHICLE_CONFIGS.map((config, i) => {
      const me = carState[i];
      let leaderGap = Infinity;
      let leaderSpeed = Infinity;

      VEHICLE_CONFIGS.forEach((other, j) => {
        if (
          j === i ||
          other.axis !== config.axis ||
          other.direction !== config.direction
        )
          return;
        const gap = cyclicGap(me.progress, carState[j].progress);
        if (gap < leaderGap) {
          leaderGap = gap;
          leaderSpeed = carState[j].speed;
        }
      });

      if (leaderGap > FOLLOW_GAP) {
        if (me.overtaking && leaderGap > RESUME_GAP) me.overtaking = false;
        return config.speed;
      }

      if (config.speed <= leaderSpeed) return config.speed;

      if (!me.overtaking) {
        const myForward = trackPosition(me.progress, config.direction);
        const oncomingClear = VEHICLE_CONFIGS.every((other, j) => {
          if (
            j === i ||
            other.axis !== config.axis ||
            other.direction === config.direction
          )
            return true;
          const otherForward = trackPosition(
            carState[j].progress,
            other.direction,
          );
          return Math.abs(otherForward - myForward) > OVERTAKE_CLEAR_GAP;
        });
        me.overtaking = oncomingClear;
      }

      return me.overtaking ? config.speed : leaderSpeed;
    });

    // Pass 2: integrate motion and apply to the actual object3Ds.
    VEHICLE_CONFIGS.forEach((config, i) => {
      const group = groupRefs.current[i];
      const me = carState[i];
      if (!group) return;

      me.speed = effectiveSpeeds[i];
      me.progress = (me.progress + me.speed * delta) % TRACK_RANGE;

      const targetLane = me.overtaking ? -me.lane : me.lane;
      me.appliedLane += (targetLane - me.appliedLane) * LANE_STEER_LERP;

      const forward = trackPosition(me.progress, config.direction);
      const prevX = me.x;
      const prevZ = me.z;
      const x = config.axis === "x" ? forward : me.appliedLane;
      const z = config.axis === "x" ? me.appliedLane : forward;

      const dx = x - prevX;
      const dz = z - prevZ;
      if (dx * dx + dz * dz > 1e-8) group.rotation.y = Math.atan2(dx, dz);

      group.position.set(x, 0.22, z);
      me.x = x;
      me.z = z;
    });
  });

  return (
    <>
      {VEHICLE_CONFIGS.map((config, i) => (
        <group
          key={config.model}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          <Clone
            object={scenes[i]}
            scale={config.scale ?? 1.65}
            castShadow
            receiveShadow
          />
        </group>
      ))}
    </>
  );
}

function LaneMarkings() {
  const zMarks = useMemo(
    () => Array.from({ length: 9 }, (_, index) => -32 + index * 8),
    [],
  );
  const xMarks = useMemo(
    () => Array.from({ length: 9 }, (_, index) => -32 + index * 8),
    [],
  );

  return (
    <>
      {zMarks.map((z) => (
        <mesh
          key={`z-${z}`}
          position={[0, 0.055, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.22, 3.6]} />
          <meshStandardMaterial color="#f9d047" roughness={0.62} />
        </mesh>
      ))}
      {xMarks.map((x) => (
        <mesh
          key={`x-${x}`}
          position={[x, 0.058, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        >
          <planeGeometry args={[0.22, 3.6]} />
          <meshStandardMaterial color="#f9d047" roughness={0.62} />
        </mesh>
      ))}
    </>
  );
}

function Crosswalk() {
  return (
    <>
      {[-4.6, -3.3, -2, -0.7, 0.6, 1.9, 3.2, 4.5].map((x) => (
        <mesh
          key={`crosswalk-${x}`}
          position={[x, 0.075, -8.4]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.56, 4.5]} />
          <meshStandardMaterial color="#f7fbff" roughness={0.74} />
        </mesh>
      ))}
    </>
  );
}

function StopSign() {
  return (
    <group position={[-8.2, 0, -8.2]} rotation={[0, Math.PI / 5, 0]}>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.08, 8]} />
        <meshStandardMaterial color="#f04444" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.95, 12]} />
        <meshStandardMaterial
          color="#e6eef8"
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

function TrafficLights() {
  return (
    <group position={[8.2, 0, 7.2]}>
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[0.35, 1.1, 0.24]} />
        <meshStandardMaterial color="#101826" roughness={0.5} />
      </mesh>
      {[
        ["#ef4444", 1.48],
        ["#facc15", 1.18],
        ["#22c55e", 0.88],
      ].map(([color, y]) => (
        <mesh key={color} position={[0, Number(y), -0.13]}>
          <sphereGeometry args={[0.105, 18, 18]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={color === "#22c55e" ? 1.2 : 0.35}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 1, 12]} />
        <meshStandardMaterial
          color="#d5deea"
          metalness={0.25}
          roughness={0.36}
        />
      </mesh>
    </group>
  );
}

function CityBlocks() {
  const blocks = useMemo(
    () => [
      [-20, -19, 3.4, 4.8, 3.8],
      [-14, -22, 4.2, 7.5, 4.2],
      [17, -21, 4.8, 6.2, 3.8],
      [23, -14, 3.6, 5.2, 4.6],
      [-23, 15, 4.4, 5.5, 4.4],
      [-16, 22, 3.2, 8.4, 3.6],
      [18, 19, 4.4, 7.2, 4],
      [25, 13, 3.8, 4.8, 4.4],
    ],
    [],
  );

  return (
    <>
      {blocks.map(([x, z, width, height, depth], index) => (
        <mesh
          key={`${x}-${z}`}
          position={[x, height / 2 - 0.02, z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#224762" : "#2a5972"}
            emissive={index % 3 === 0 ? "#0d2435" : "#0a1a28"}
            roughness={0.72}
          />
        </mesh>
      ))}
    </>
  );
}

function HeroWorld() {
  return (
    <>
      <CameraRig />
      <Lights />
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 14, 10]} intensity={1.1} />
      <fog attach="fog" args={["#0a1d30", 42, 110]} />
      <color attach="background" args={["#0a1d30"]} />

      <GrassGround color="#1a6f45" size={140} />
      <RoadStrip along="z" length={104} width={12} gap={12} />
      <RoadStrip along="x" length={104} width={12} gap={12} />
      <Crossroad size={12} />
      <LaneMarkings />
      <Crosswalk />
      <StopSign />
      <TrafficLights />
      <CityBlocks />

      <TrafficSystem />

      <Preload all />
    </>
  );
}

export default function LandingHeroScene() {
  return (
    <div className="absolute inset-0" data-landing-hero-canvas="true">
      <Canvas
        aria-hidden="true"
        className="absolute inset-0"
        dpr={[1, 1.6]}
        camera={{ position: [15.5, 10.8, 15.5], fov: 48, near: 0.1, far: 120 }}
        shadows
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>
          <HeroWorld />
        </Suspense>
      </Canvas>
    </div>
  );
}

for (const model of VEHICLES) {
  useGLTF.preload(model);
}
