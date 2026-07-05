import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Efecto liviano para consecuencias "near-miss" / "hard-brake": marca de
// derrape + flash de luces de freno + puff de polvo. Sin debris — sibling de
// CrashEffect para escenas donde el riesgo es una casi-colisión, no un choque.

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const DUST = 16;
const DUST_LIFE = 0.9;
const FLASH_DUR = 0.35;
const SKID_GROW = 0.5; // tiempo en crecer la marca de derrape

// Textura circular suave (radial), generada en canvas: sin assets externos.
function softTexture() {
  const s = 64;
  const cvs = document.createElement("canvas");
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo crear el contexto 2D para la textura.");
  }
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  return tex;
}

type Props = {
  impact: THREE.Vector3;
  triggered: RefObject<boolean>;
  startTime: RefObject<number>;
  /** Rumbo del vehículo en radianes (0 = -Z) para orientar la marca de derrape. */
  heading?: number;
};

export default function NearMissEffect({
  impact,
  triggered,
  startTime,
  heading = 0,
}: Props) {
  const tex = useMemo(softTexture, []);

  const dustGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(DUST * 3), 3),
    );
    return g;
  }, []);
  const dustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: tex,
        color: new THREE.Color("#c7ccd1"),
        size: 1.1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [tex],
  );
  const dustVel = useMemo(
    () => Array.from({ length: DUST }, () => new THREE.Vector3()),
    [],
  );

  const skidLeft = useRef<THREE.Mesh | null>(null);
  const skidRight = useRef<THREE.Mesh | null>(null);
  const brakeLight = useRef<THREE.PointLight | null>(null);
  const skidMatLeft = useRef<THREE.MeshBasicMaterial | null>(null);
  const skidMatRight = useRef<THREE.MeshBasicMaterial | null>(null);
  const started = useRef(false);

  useFrame((state, delta) => {
    if (!triggered.current) return;
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime - startTime.current;

    if (!started.current) {
      started.current = true;

      const dp = dustGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < DUST; i++) {
        dp[i * 3] = impact.x + rnd(-0.4, 0.4);
        dp[i * 3 + 1] = impact.y + rnd(0, 0.2);
        dp[i * 3 + 2] = impact.z + rnd(-0.4, 0.4);
        dustVel[i].set(rnd(-0.6, 0.6), rnd(0.3, 1.1), rnd(-0.6, 0.6));
      }
      dustGeo.attributes.position.needsUpdate = true;

      const offsetX = Math.cos(heading) * 0.4;
      const offsetZ = -Math.sin(heading) * 0.4;
      if (skidLeft.current) {
        skidLeft.current.rotation.y = heading;
        skidLeft.current.position.set(
          impact.x + offsetX,
          0.021,
          impact.z + offsetZ,
        );
      }
      if (skidRight.current) {
        skidRight.current.rotation.y = heading;
        skidRight.current.position.set(
          impact.x - offsetX,
          0.021,
          impact.z - offsetZ,
        );
      }
      if (brakeLight.current) brakeLight.current.position.copy(impact);
    }

    const dp = dustGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < DUST; i++) {
      dustVel[i].y += 0.3 * d;
      dustVel[i].multiplyScalar(1 - 0.6 * d);
      dp[i * 3] += dustVel[i].x * d;
      dp[i * 3 + 1] += dustVel[i].y * d;
      dp[i * 3 + 2] += dustVel[i].z * d;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity =
      t < 0.1
        ? (t / 0.1) * 0.45
        : Math.max(0, 0.45 * (1 - (t - 0.1) / DUST_LIFE));

    const skidOpacity = Math.min(1, t / SKID_GROW) * 0.6;
    if (skidMatLeft.current) skidMatLeft.current.opacity = skidOpacity;
    if (skidMatRight.current) skidMatRight.current.opacity = skidOpacity;

    if (brakeLight.current) {
      brakeLight.current.intensity =
        t < FLASH_DUR ? 6 * (1 - t / FLASH_DUR) : 0;
    }
  });

  return (
    <>
      <points geometry={dustGeo} material={dustMat} frustumCulled={false} />
      <mesh ref={skidLeft} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.22, 3.2]} />
        <meshBasicMaterial
          ref={skidMatLeft}
          color="#15181c"
          transparent
          opacity={0}
        />
      </mesh>
      <mesh ref={skidRight} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.22, 3.2]} />
        <meshBasicMaterial
          ref={skidMatRight}
          color="#15181c"
          transparent
          opacity={0}
        />
      </mesh>
      <pointLight
        ref={brakeLight}
        intensity={0}
        distance={12}
        decay={0}
        color="#ff3b30"
      />
    </>
  );
}
