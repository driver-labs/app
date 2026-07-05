"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

type Props = {
  scale?: number;
  yaw?: number;
  walking?: boolean;
  shirtColor?: string;
  pantsColor?: string;
  skinColor?: string;
};

// Peatón low-poly armado con primitivas (cápsulas + esfera): no depende de un
// asset GLB externo, así que no hay licencia/tamaño que resolver para el MVP.
export default function Pedestrian({
  scale = 1,
  yaw = 0,
  walking = false,
  shirtColor = "#2563eb",
  pantsColor = "#1f2937",
  skinColor = "#e0ac69",
}: Props) {
  const leftLeg = useRef<THREE.Group | null>(null);
  const rightLeg = useRef<THREE.Group | null>(null);
  const leftArm = useRef<THREE.Group | null>(null);
  const rightArm = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    if (!walking) return;
    const swing = Math.sin(state.clock.elapsedTime * 8) * 0.5;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing;
    if (rightArm.current) rightArm.current.rotation.x = swing;
  });

  return (
    <group scale={scale} rotation={[0, yaw, 0]}>
      <group ref={leftLeg} position={[0.12, 0.5, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          <meshStandardMaterial color={pantsColor} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[-0.12, 0.5, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          <meshStandardMaterial color={pantsColor} />
        </mesh>
      </group>

      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>

      <group ref={leftArm} position={[0.3, 1.15, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.4, 4, 8]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
      </group>
      <group ref={rightArm} position={[-0.3, 1.15, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.4, 4, 8]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
      </group>

      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
    </group>
  );
}
