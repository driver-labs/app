import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { useRef } from "react";
import type * as THREE from "three";

// Flecha flotante que marca qué actor mirar. Sigue la posición de `target`
// cada frame (debe ser sibling en el mismo grupo/coordenadas locales) con un
// rebote y giro suaves para llamar la atención sin tapar la escena. Usa
// meshBasicMaterial (no afectado por luces) para que se vea igual de nítida
// de día, de noche o bajo lluvia.

type Props = {
  target: RefObject<THREE.Object3D | null>;
  height?: number;
  color?: string;
};

export default function AttentionArrow({
  target,
  // Los modelos del pack activo se escalan ~2.2x (pack.scale), así que un
  // auto/moto con jinete anda por los 3-4u de alto real. 4.2 asegura que la
  // flecha flote arriba del techo/casco en vez de quedar tapada dentro.
  height = 4.2,
  // Magenta: no coincide con ningún color de carrocería/casco del catálogo
  // de modelos, así que nunca se camufla contra el vehículo que señala.
  color = "#ec4899",
}: Props) {
  const group = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    const g = group.current;
    const t = target.current;
    if (!g) return;
    if (!t) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const bob = Math.sin(state.clock.elapsedTime * 2.6) * 0.2;
    g.position.set(t.position.x, height + bob, t.position.z);
    g.rotation.y = state.clock.elapsedTime * 1.4;
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.34, 0.7, 4]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
