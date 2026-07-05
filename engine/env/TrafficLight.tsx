import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

type Props = {
  position?: [number, number, number];
  rotationY?: number;
  cycle?: number; // segundos del ciclo completo
  paused?: boolean;
  state?: "red" | "amber" | "green";
};

const COLORS = {
  red: { on: 0xff1c25, off: 0x300000 },
  amber: { on: 0xffc529, off: 0x332000 },
  green: { on: 0x13ef81, off: 0x00341b },
};

function setLamp(
  m: THREE.MeshStandardMaterial | null,
  c: { on: number; off: number },
  on: boolean,
) {
  if (!m) return;
  m.color.setHex(on ? c.on : c.off);
  m.emissive.setHex(on ? c.on : c.off);
  m.emissiveIntensity = on ? 2.2 : 0.35;
}

// Semáforo con luces emisivas que ciclan verde -> amarillo -> rojo.
export default function TrafficLight({
  position = [0, 0, 0],
  rotationY = 0,
  cycle = 7,
  paused = false,
  state,
}: Props) {
  const red = useRef<THREE.MeshStandardMaterial | null>(null);
  const amber = useRef<THREE.MeshStandardMaterial | null>(null);
  const green = useRef<THREE.MeshStandardMaterial | null>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    if (state) {
      setLamp(green.current, COLORS.green, state === "green");
      setLamp(amber.current, COLORS.amber, state === "amber");
      setLamp(red.current, COLORS.red, state === "red");
      return;
    }

    if (paused) return;
    t.current += delta;
    const p = t.current % cycle;
    const isGreen = p < cycle * 0.45;
    const isAmber = p >= cycle * 0.45 && p < cycle * 0.55;
    const isRed = p >= cycle * 0.55;
    setLamp(green.current, COLORS.green, isGreen);
    setLamp(amber.current, COLORS.amber, isAmber);
    setLamp(red.current, COLORS.red, isRed);
  });

  const pole = (
    <meshStandardMaterial color="#6b767f" metalness={0.3} roughness={0.5} />
  );

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* poste */}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 6, 12]} />
        {pole}
      </mesh>
      {/* brazo sobre la calle */}
      <mesh position={[-2, 5.4, 0]} castShadow>
        <boxGeometry args={[4, 0.14, 0.14]} />
        {pole}
      </mesh>
      {/* caja del semáforo al final del brazo */}
      <group position={[-3.8, 4.9, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 1.9, 0.45]} />
          <meshStandardMaterial color="#0f151c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.55, 0.24]}>
          <sphereGeometry args={[0.2, 20, 14]} />
          <meshStandardMaterial
            ref={red}
            color={0x300000}
            emissive={0x300000}
            emissiveIntensity={0.35}
          />
        </mesh>
        <mesh position={[0, 0, 0.24]}>
          <sphereGeometry args={[0.2, 20, 14]} />
          <meshStandardMaterial
            ref={amber}
            color={0x332000}
            emissive={0x332000}
            emissiveIntensity={0.35}
          />
        </mesh>
        <mesh position={[0, -0.55, 0.24]}>
          <sphereGeometry args={[0.2, 20, 14]} />
          <meshStandardMaterial
            ref={green}
            color={0x00341b}
            emissive={0x00341b}
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>
    </group>
  );
}
