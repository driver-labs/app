type Props = {
  position: [number, number, number];
  rotationY?: number;
};

// Farola: poste + brazo + lámpara emisiva + luz real (pointLight) que ilumina la intersección.
// decay=0 => intensidad predecible (no depende de las unidades físicas de three).
export default function StreetLamp({ position, rotationY = 0 }: Props) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 6, 10]} />
        <meshStandardMaterial color="#39424b" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[1.1, 5.9, 0]} castShadow>
        <boxGeometry args={[2.4, 0.12, 0.12]} />
        <meshStandardMaterial color="#39424b" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* lámpara */}
      <mesh position={[2.1, 5.72, 0]}>
        <boxGeometry args={[0.55, 0.2, 0.34]} />
        <meshStandardMaterial
          color="#fff3d0"
          emissive="#ffcf87"
          emissiveIntensity={3}
        />
      </mesh>
      <pointLight
        position={[2.1, 5.4, 0]}
        intensity={2.8}
        distance={40}
        decay={0}
        color="#ffdca8"
      />
    </group>
  );
}
