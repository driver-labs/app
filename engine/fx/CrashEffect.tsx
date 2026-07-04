import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Efectos caseros del choque (sin motor de física): flash + chispas + humo/polvo.
// Se dispara leyendo el flag `crashed` y el instante `crashTime` que setea Scene.tsx.
// Todo vive dentro del grupo de "shake" de Scene, así que trabaja en coords ~mundo.

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

const SMOKE = 48; // partículas de polvo/humo
const SPARKS = 40; // chispas
const FLASH_DUR = 0.16; // duración del fogonazo (luz)
const FLASH_VIS = 0.34; // duración del sprite de destello
const SPARK_LIFE = 0.7; // vida de las chispas
const SMOKE_LIFE = 2.3; // vida del humo

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
  crashed: RefObject<boolean>;
  crashTime: RefObject<number>;
};

export default function CrashEffect({ impact, crashed, crashTime }: Props) {
  const tex = useMemo(softTexture, []);

  const smokeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(SMOKE * 3), 3),
    );
    return g;
  }, []);
  const sparkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3),
    );
    return g;
  }, []);

  const smokeMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: tex,
        color: new THREE.Color("#c2c7cd"),
        size: 1.6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [tex],
  );
  const sparkMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: tex,
        color: new THREE.Color("#ffb43a"),
        size: 0.55,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        toneMapped: false,
      }),
    [tex],
  );

  const smokeVel = useMemo(
    () => Array.from({ length: SMOKE }, () => new THREE.Vector3()),
    [],
  );
  const sparkVel = useMemo(
    () => Array.from({ length: SPARKS }, () => new THREE.Vector3()),
    [],
  );

  const flashLight = useRef<THREE.PointLight | null>(null);
  const flashSprite = useRef<THREE.Sprite | null>(null);
  const flashMat = useRef<THREE.SpriteMaterial | null>(null);
  const started = useRef(false);

  useFrame((state, delta) => {
    if (!crashed.current) return;
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime - crashTime.current;

    // Inicialización (flanco de subida del choque): posicionar todo en el impacto.
    if (!started.current) {
      started.current = true;

      const sp = smokeGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < SMOKE; i++) {
        sp[i * 3] = impact.x + rnd(-0.7, 0.7);
        sp[i * 3 + 1] = impact.y + rnd(-0.2, 0.6);
        sp[i * 3 + 2] = impact.z + rnd(-0.7, 0.7);
        smokeVel[i].set(rnd(-1.3, 1.3), rnd(0.7, 2.4), rnd(-1.3, 1.3));
      }
      smokeGeo.attributes.position.needsUpdate = true;

      const kp = sparkGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < SPARKS; i++) {
        kp[i * 3] = impact.x + rnd(-0.15, 0.15);
        kp[i * 3 + 1] = impact.y + rnd(0, 0.3);
        kp[i * 3 + 2] = impact.z + rnd(-0.15, 0.15);
        const a = Math.random() * Math.PI * 2;
        const s = rnd(7, 17);
        sparkVel[i].set(Math.cos(a) * s, rnd(5, 13), Math.sin(a) * s);
      }
      sparkGeo.attributes.position.needsUpdate = true;

      if (flashLight.current) flashLight.current.position.copy(impact);
      if (flashSprite.current)
        flashSprite.current.position.set(impact.x, impact.y + 0.4, impact.z);
    }

    // Humo/polvo: sube con flotabilidad, se frena por drag y crece; fade in rápido y fade out largo.
    const sp = smokeGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < SMOKE; i++) {
      smokeVel[i].y += 0.5 * d; // flotabilidad
      smokeVel[i].multiplyScalar(1 - 0.55 * d); // drag horizontal/vertical
      sp[i * 3] += smokeVel[i].x * d;
      sp[i * 3 + 1] += smokeVel[i].y * d;
      sp[i * 3 + 2] += smokeVel[i].z * d;
    }
    smokeGeo.attributes.position.needsUpdate = true;
    smokeMat.opacity =
      t < 0.15
        ? (t / 0.15) * 0.55
        : Math.max(0, 0.55 * (1 - (t - 0.15) / (SMOKE_LIFE - 0.15)));
    smokeMat.size = 1.4 + t * 1.8;

    // Chispas: salen radiales rápido, caen por gravedad, mueren y se apagan enseguida.
    const kp = sparkGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < SPARKS; i++) {
      sparkVel[i].y -= 28 * d; // gravedad
      kp[i * 3] += sparkVel[i].x * d;
      kp[i * 3 + 1] += sparkVel[i].y * d;
      kp[i * 3 + 2] += sparkVel[i].z * d;
      if (kp[i * 3 + 1] < 0.05) {
        kp[i * 3 + 1] = 0.05;
        sparkVel[i].set(0, 0, 0);
      }
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = Math.max(0, 1 - t / SPARK_LIFE);
    sparkMat.size = 0.55 * Math.max(0.25, 1 - t / SPARK_LIFE);

    // Fogonazo naranja: pointLight que aparece ~0.16s y se apaga.
    if (flashLight.current) {
      flashLight.current.intensity =
        t < FLASH_DUR ? 11 * (1 - t / FLASH_DUR) : 0;
    }
    // Destello: sprite additivo que crece y hace fade.
    if (flashSprite.current && flashMat.current) {
      const fe = t / FLASH_VIS;
      if (fe < 1) {
        const sc = 1 + fe * 5.5;
        flashSprite.current.scale.set(sc, sc, sc);
        flashMat.current.opacity = (1 - fe) * 0.95;
        flashSprite.current.visible = true;
      } else if (flashSprite.current.visible) {
        flashSprite.current.visible = false;
      }
    }
  });

  return (
    <>
      <points geometry={smokeGeo} material={smokeMat} frustumCulled={false} />
      <points geometry={sparkGeo} material={sparkMat} frustumCulled={false} />
      <pointLight
        ref={flashLight}
        intensity={0}
        distance={26}
        decay={0}
        color="#ff9a2e"
      />
      <sprite ref={flashSprite} scale={[0.01, 0.01, 0.01]} visible={false}>
        <spriteMaterial
          ref={flashMat}
          map={tex}
          color="#ffcf7a"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </>
  );
}
