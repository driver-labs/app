import {
  Clone,
  OrbitControls,
  Text,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { FBXLoader, SkeletonUtils, TGALoader } from "three-stdlib";
import type { Scenario } from "@/core/scenario-schema";
import type { SceneView } from "../camera/views";
import RainyAmbience from "../env/RainyAmbience";
import { Crossroad, GrassGround, RoadStrip } from "../env/RoadKit";
import StreetLamp from "../env/StreetLamp";
import TrafficLight from "../env/TrafficLight";
import AttentionArrow from "../fx/AttentionArrow";
import CrashEffect from "../fx/CrashEffect";
import type { Pack } from "../models/cars";
import type { Phase } from "../types";

const START_Z = 24;
const STOP_Z = 7; // línea de ALTO
const EXIT_Z = -26;

export const CAR_YAW = Math.PI; // frente del modelo hacia -Z

// Geometría del tráfico (el modelo viene del pack activo). dir +1 => +X, -1 => -X.
const TRAFFIC_LAYOUT = [
  { id: "near-a", z: 2.2, dir: 1, speed: 13, x0: -34 },
  { id: "near-b", z: 2.2, dir: 1, speed: 13, x0: -6 },
  { id: "near-c", z: 2.2, dir: 1, speed: 13, x0: 22 },
  { id: "far-a", z: -2.2, dir: -1, speed: 12, x0: 34 },
  { id: "far-b", z: -2.2, dir: -1, speed: 12, x0: 4 },
  { id: "far-c", z: -2.2, dir: -1, speed: 12, x0: -24 },
];
const LOOP_X = 38;
const CLEAR_X = 11;

// Pool de escombros: más piezas y tamaños variados para un choque más contundente.
const DEBRIS: { model: string; scale: number }[] = [
  { model: "/models/debris-bumper.glb", scale: 2.2 },
  { model: "/models/debris-door.glb", scale: 2.2 },
  { model: "/models/debris-door-window.glb", scale: 2.2 },
  { model: "/models/debris-tire.glb", scale: 1.8 },
  { model: "/models/debris-spoiler-a.glb", scale: 2.4 },
  { model: "/models/debris-spoiler-b.glb", scale: 2.4 },
  { model: "/models/debris-plate-a.glb", scale: 2.6 },
  { model: "/models/debris-plate-b.glb", scale: 2.6 },
  { model: "/models/debris-plate-small-a.glb", scale: 3 },
  { model: "/models/debris-plate-small-b.glb", scale: 3 },
  { model: "/models/debris-drivetrain.glb", scale: 1.6 },
  { model: "/models/debris-drivetrain-axle.glb", scale: 1.6 },
  { model: "/models/debris-bolt.glb", scale: 4 },
  { model: "/models/debris-nut.glb", scale: 4 },
  { model: "/models/wheel-default.glb", scale: 1.8 },
  { model: "/models/wheel-dark.glb", scale: 1.8 },
  { model: "/models/wheel-racing.glb", scale: 1.8 },
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const BIKE_TEXTURE =
  "/bike/low%20poly%20dirta%20bike%20with%20rider%201_Textures/Dirt%20Bike_D1.png";
const PLAYER_TEXTURE =
  "/bike/low%20poly%20dirta%20bike%20with%20rider%201_Textures/Player_D1.png";
const BIKE_TGA =
  "/bike/low%20poly%20dirta%20bike%20with%20rider%201_Textures/Dirt%20Bike_D1.tga";
const PLAYER_TGA =
  "/bike/low%20poly%20dirta%20bike%20with%20rider%201_Textures/Player_D1.tga";

const MODEL_BY_KIND: Record<Scenario["actors"][number]["kind"], string> = {
  bus: "/models/van.glb",
  car: "/models/sedan.glb",
  motorcycle:
    "/bike/low%20poly%20dirta%20bike%20with%20rider%201_FBX/DirtBike_With_Player.FBX",
  pedestrian: "/models/cone.glb",
  truck: "/models/truck.glb",
};

const MODEL_SLUGS: Record<string, string> = {
  ambulance: "/models/ambulance.glb",
  bus: "/models/van.glb",
  compact: "/models/hatchback-sports.glb",
  coupe: "/models/sedan-sports.glb",
  firetruck: "/models/firetruck.glb",
  hatchback: "/models/hatchback-sports.glb",
  motorcycle:
    "/bike/low%20poly%20dirta%20bike%20with%20rider%201_FBX/DirtBike_With_Player.FBX",
  pickup: "/models/truck.glb",
  police: "/models/police.glb",
  sedan: "/models/sedan.glb",
  sport: "/models/sedan-sports.glb",
  suv: "/models/suv.glb",
  taxi: "/models/taxi.glb",
  truck: "/models/truck.glb",
  van: "/models/van.glb",
};

const SPEED_BY_LEVEL: Record<Scenario["actors"][number]["speed"], number> = {
  fast: 11,
  normal: 9,
  slow: 6,
  speeding: 13,
};
const CROSSWALK_STRIPES = [-3, -1.8, -0.6, 0.6, 1.8, 3];

export function actorModel(
  actor: Scenario["actors"][number] | undefined,
  fallback: string,
) {
  if (!actor) return fallback;
  if (actor.model?.startsWith("/")) return actor.model;
  if (actor.model && actor.model in MODEL_SLUGS)
    return MODEL_SLUGS[actor.model];
  return MODEL_BY_KIND[actor.kind] ?? fallback;
}

function actorByRole(
  scenario: Scenario,
  roles: Scenario["actors"][number]["role"][],
) {
  return scenario.actors.find((actor) => roles.includes(actor.role));
}

export function Model({
  model,
  scale,
  yaw = 0,
}: {
  model: string;
  scale: number;
  yaw?: number;
}) {
  if (model.toLowerCase().endsWith(".fbx")) {
    return <FbxModel model={model} scale={scale} yaw={yaw} />;
  }

  return <GltfModel model={model} scale={scale} yaw={yaw} />;
}

function GltfModel({
  model,
  scale,
  yaw,
}: {
  model: string;
  scale: number;
  yaw: number;
}) {
  const { scene } = useGLTF(model);
  return (
    <Clone
      object={scene}
      scale={scale}
      rotation={[0, yaw, 0]}
      castShadow
      receiveShadow
    />
  );
}

function FbxModel({
  model,
  scale,
  yaw,
}: {
  model: string;
  scale: number;
  yaw: number;
}) {
  const source = useLoader(FBXLoader, model, (loader) => {
    loader.manager.addHandler(/\.tga$/i, new TGALoader());
    loader.manager.setURLModifier((url) => {
      const normalized = url.replaceAll("\\", "/");
      if (normalized.endsWith("Dirt Bike_D1.tga")) return BIKE_TGA;
      if (normalized.endsWith("Player_D1.tga")) return PLAYER_TGA;
      return url;
    });
  });
  const bikeTexture = useTexture(BIKE_TEXTURE);
  const playerTexture = useTexture(PLAYER_TEXTURE);
  const scene = useMemo(() => {
    bikeTexture.colorSpace = THREE.SRGBColorSpace;
    playerTexture.colorSpace = THREE.SRGBColorSpace;
    bikeTexture.needsUpdate = true;
    playerTexture.needsUpdate = true;

    const clone = SkeletonUtils.clone(source);
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const name = child.name.toLowerCase();
      const map = name.includes("low_player") ? playerTexture : bikeTexture;
      child.material = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.62,
        metalness: 0.08,
      });
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return clone;
  }, [source, bikeTexture, playerTexture]);

  return <primitive object={scene} scale={scale} rotation={[0, yaw, 0]} />;
}
DEBRIS.forEach((d) => {
  useGLTF.preload(d.model);
});

function Crosswalk({ z }: { z: number }) {
  return (
    <>
      {CROSSWALK_STRIPES.map((x) => (
        <mesh
          key={`crosswalk-${x}`}
          position={[x, 0.025, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.62, 4.8]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
    </>
  );
}

function SpeedLimitSign({ limit }: { limit: number }) {
  return (
    <group position={[-5.8, 0, 13.2]} rotation={[0, Math.PI / 10, 0]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 2.2]} />
        <meshStandardMaterial color="#747b83" />
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.06, 40]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 2.35, 0.035]} castShadow>
        <ringGeometry args={[0.56, 0.68, 40]} />
        <meshStandardMaterial color="#c0281f" side={THREE.DoubleSide} />
      </mesh>
      <Text
        color="#111827"
        fontSize={0.34}
        fontWeight={800}
        position={[0, 2.35, 0.08]}
      >
        {limit}
      </Text>
    </group>
  );
}

function StopSign() {
  return (
    <group position={[5.6, 0, STOP_Z + 1]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.4]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh
        position={[0, 2.4, 0]}
        rotation={[Math.PI / 2, Math.PI / 8, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.7, 0.7, 0.08, 8]} />
        <meshStandardMaterial color="#c0281f" />
      </mesh>
    </group>
  );
}

function YieldSign() {
  return (
    <group position={[5.6, 0, STOP_Z + 1]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.2]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh position={[0, 2.35, 0]} rotation={[0, 0, Math.PI]} castShadow>
        <coneGeometry args={[0.85, 0.12, 3]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 2.35, 0.07]} rotation={[0, 0, Math.PI]} castShadow>
        <coneGeometry args={[0.74, 0.14, 3]} />
        <meshStandardMaterial color="#c0281f" wireframe />
      </mesh>
    </group>
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

export default function Scene({
  phase,
  correct,
  scenario,
  pack,
  view,
  layoutSeed,
  onReachStop,
}: Props) {
  const car = useRef<THREE.Group | null>(null);
  const trafficRefs = useRef<THREE.Group[]>([]);
  const debrisRefs = useRef<THREE.Group[]>([]);
  const trafficX = useRef<number[]>(TRAFFIC_LAYOUT.map((t) => t.x0));

  const world = useRef<THREE.Group | null>(null); // grupo de "shake" de cámara (offset temporal)

  const reached = useRef(false);
  const yielded = useRef(false);
  const clearing = useRef(false);
  const crashed = useRef(false);
  const debrisInit = useRef(false);
  const crashTime = useRef(0); // instante del choque (clock.elapsedTime)
  const hitIdx = useRef(0); // índice del auto de tráfico impactado
  const playerCrashZ = useRef(0); // z del jugador al momento del choque
  const hitBaseX = useRef(0); // x base del auto impactado
  const hitBaseRotY = useRef(0); // yaw base del auto impactado
  const impact = useMemo(() => new THREE.Vector3(), []);
  const playerActor = actorByRole(scenario, ["player", "offender"]);
  const playerModel = actorModel(playerActor, pack.player);
  const playerSpeed = SPEED_BY_LEVEL[playerActor?.speed ?? "normal"];
  const shouldCrashOnWrongAnswer = scenario.event.outcome === "crash";
  const roadWidth = Math.max(8, scenario.road.lanes * 4.6);
  const laneX = roadWidth / 4;
  const showTrafficLight =
    scenario.road.control === "traffic-light" ||
    scenario.sceneKind === "intersection-light";
  const showStopSign = scenario.road.control === "stop-sign";
  const showYieldSign = scenario.road.control === "yield";
  const showStreetLights = scenario.environment.timeOfDay !== "day";
  const debrisState = useMemo(
    () =>
      DEBRIS.map(() => ({ v: new THREE.Vector3(), spin: new THREE.Vector3() })),
    [],
  );

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const c = car.current;
    if (!c) return;

    // En intro y decision se congela el tráfico; la escena arranca tras el título.
    const trafficCanMove = phase === "approach" || phase === "consequence";
    if (!crashed.current && trafficCanMove) {
      for (let i = 0; i < TRAFFIC_LAYOUT.length; i++) {
        const g = trafficRefs.current[i];
        if (!g) continue;
        let x =
          trafficX.current[i] +
          TRAFFIC_LAYOUT[i].dir * TRAFFIC_LAYOUT[i].speed * d;
        if (!clearing.current) {
          if (x > LOOP_X) x = -LOOP_X;
          else if (x < -LOOP_X) x = LOOP_X;
        }
        trafficX.current[i] = x;
        g.position.x = x;
      }
    }

    if (phase === "approach") {
      c.position.z = Math.max(STOP_Z, c.position.z - playerSpeed * d);
      if (!reached.current && c.position.z <= STOP_Z + 0.02) {
        reached.current = true;
        onReachStop();
      }
    } else if (phase === "consequence" && correct) {
      clearing.current = true;
      if (!yielded.current) {
        const blocked = trafficX.current.some((x) => Math.abs(x) < CLEAR_X);
        if (!blocked) yielded.current = true;
      } else {
        c.position.z = Math.max(EXIT_Z, c.position.z - 10 * d);
      }
    } else if (
      phase === "consequence" &&
      !correct &&
      !shouldCrashOnWrongAnswer
    ) {
      c.position.z = Math.max(1.2, c.position.z - 7 * d);
      c.rotation.x = -0.03 * Math.sin(state.clock.elapsedTime * 18);
    } else if (phase === "consequence" && !correct && !crashed.current) {
      c.position.z -= 8 * d;
      let hit = 0;
      let best = Infinity;
      for (let i = 0; i < TRAFFIC_LAYOUT.length; i++) {
        const dist = Math.hypot(
          trafficX.current[i] - c.position.x,
          TRAFFIC_LAYOUT[i].z - c.position.z,
        );
        if (dist < best) {
          best = dist;
          hit = i;
        }
      }
      if (best < 2.6 || c.position.z <= 0.2) {
        crashed.current = true;
        crashTime.current = state.clock.elapsedTime;
        hitIdx.current = hit;
        playerCrashZ.current = c.position.z;
        const g = trafficRefs.current[hit];
        impact.set(
          ((g ? g.position.x : 0) + c.position.x) / 2,
          0.6,
          (c.position.z + TRAFFIC_LAYOUT[hit].z) / 2,
        );
        hitBaseX.current = g ? g.position.x : 0;
        hitBaseRotY.current = g ? g.rotation.y : 0;
      }
    }

    if (crashed.current) {
      if (!debrisInit.current) {
        debrisInit.current = true;
        for (let i = 0; i < DEBRIS.length; i++) {
          const g = debrisRefs.current[i];
          if (!g) continue;
          // dispersión radial explosiva + mayor altura
          g.position.set(
            impact.x + rnd(-0.8, 0.8),
            impact.y + rnd(0.1, 1.0),
            impact.z + rnd(-0.8, 0.8),
          );
          const a = Math.random() * Math.PI * 2;
          const s = rnd(3, 10);
          debrisState[i].v.set(Math.cos(a) * s, rnd(5, 12), Math.sin(a) * s);
          debrisState[i].spin.set(rnd(-11, 11), rnd(-11, 11), rnd(-11, 11));
        }
      }
      for (let i = 0; i < DEBRIS.length; i++) {
        const g = debrisRefs.current[i];
        if (!g) continue;
        const st = debrisState[i];
        st.v.y -= 15 * d;
        g.position.addScaledVector(st.v, d);
        if (g.position.y < 0.15) {
          g.position.y = 0.15;
          st.v.y *= -0.42;
          st.v.x *= 0.75;
          st.v.z *= 0.75;
        }
        g.rotation.x += st.spin.x * d;
        g.rotation.y += st.spin.y * d;
        g.rotation.z += st.spin.z * d;
      }

      const t = state.clock.elapsedTime - crashTime.current;

      // Shake de cámara: offset temporal del grupo del mundo que decae en ~0.5s.
      // No toca OrbitControls (que maneja la cámara), así que no se rompe.
      if (world.current) {
        if (t < 0.5) {
          const amp = 0.16 * (1 - t / 0.5);
          world.current.position.set(
            rnd(-amp, amp),
            rnd(-amp, amp) * 0.6,
            rnd(-amp, amp),
          );
        } else if (world.current.position.lengthSq() !== 0) {
          world.current.position.set(0, 0, 0);
        }
      }

      // Reacción del jugador: crunch (escala), recoil hacia atrás y bamboleo que decae.
      const decay = Math.exp(-t * 5);
      const sq = Math.exp(-t * 7);
      c.position.z = playerCrashZ.current + 0.9 * (1 - Math.exp(-t * 9));
      c.rotation.y = 0.25 * Math.sin(t * 20) * decay;
      c.rotation.z = 0.14 * Math.sin(t * 16) * Math.exp(-t * 4);
      c.scale.set(1 + 0.14 * sq, 1 - 0.12 * sq, 1 - 0.2 * sq);

      // Reacción del auto impactado: empuje en su dirección + giro que queda torcido.
      const hg = trafficRefs.current[hitIdx.current];
      if (hg) {
        const dir = TRAFFIC_LAYOUT[hitIdx.current].dir;
        const push = 1 - Math.exp(-t * 7);
        hg.position.x = hitBaseX.current + dir * 1.6 * push;
        hg.rotation.y = hitBaseRotY.current + dir * 0.7 * push;
        const sq2 = Math.exp(-t * 7);
        hg.scale.set(1 - 0.15 * sq2, 1 - 0.1 * sq2, 1 + 0.08 * sq2);
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

      {/* Grupo del mundo: se desplaza unos frames para simular el shake del choque. */}
      <group ref={world}>
        {showTrafficLight && (
          <TrafficLight position={[6, 0, 6]} paused={phase === "decision"} />
        )}
        {showStreetLights && (
          <>
            <StreetLamp position={[8, 0, -8]} rotationY={(-3 * Math.PI) / 4} />
            <StreetLamp position={[-8, 0, 8]} rotationY={Math.PI / 4} />
            <StreetLamp position={[-8, 0, -8]} rotationY={(-1 * Math.PI) / 4} />
          </>
        )}

        {/* piso + cruce en X con tiles del kit modular */}
        <GrassGround size={160} />
        <Crossroad size={roadWidth} />
        <RoadStrip along="z" length={120} width={roadWidth} gap={roadWidth} />
        <RoadStrip along="x" length={120} width={roadWidth} gap={roadWidth} />

        {scenario.road.crosswalk && <Crosswalk z={STOP_Z - 1.1} />}

        {/* línea de ALTO */}
        {scenario.road.control !== "none" && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, STOP_Z + 0.6]}
          >
            <planeGeometry args={[roadWidth, 0.5]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        )}

        {showStopSign && <StopSign />}
        {showYieldSign && <YieldSign />}
        {scenario.road.speedLimit && (
          <SpeedLimitSign limit={scenario.road.speedLimit} />
        )}

        {/* auto del jugador (con faros encendidos + luz hacia adelante) */}
        <group ref={car} position={[laneX, 0, START_Z]}>
          <Model model={playerModel} scale={pack.scale} yaw={CAR_YAW} />
          <mesh position={[0.55, 0.6, -2.2]}>
            <boxGeometry args={[0.32, 0.16, 0.1]} />
            <meshStandardMaterial
              color="#fff6d5"
              emissive="#fff2c0"
              emissiveIntensity={3}
            />
          </mesh>
          <mesh position={[-0.55, 0.6, -2.2]}>
            <boxGeometry args={[0.32, 0.16, 0.1]} />
            <meshStandardMaterial
              color="#fff6d5"
              emissive="#fff2c0"
              emissiveIntensity={3}
            />
          </mesh>
          <pointLight
            position={[0, 0.9, -4]}
            intensity={1.8}
            distance={18}
            decay={0}
            color="#fff2c0"
          />
        </group>

        <AttentionArrow target={car} />

        {/* tráfico que cruza */}
        {TRAFFIC_LAYOUT.map((t, i) => (
          <group
            key={t.id}
            ref={(el) => {
              if (el) trafficRefs.current[i] = el;
            }}
            position={[t.x0, 0, t.z]}
            rotation={[0, t.dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <Model model={pack.traffic[i]} scale={pack.scale} yaw={CAR_YAW} />
          </group>
        ))}

        {/* pool de debris */}
        {DEBRIS.map((dbr, i) => (
          <group
            key={dbr.model}
            ref={(el) => {
              if (el) debrisRefs.current[i] = el;
            }}
            position={[0, -100, 0]}
          >
            <Model model={dbr.model} scale={dbr.scale} />
          </group>
        ))}

        <CrashEffect impact={impact} crashed={crashed} crashTime={crashTime} />
      </group>
    </>
  );
}
