// Luces compartidas. hemisphereLight da la luz ambiental pareja que los materiales
// PBR (modelos Sketchfab) necesitan para no verse apagados.
export default function Lights() {
  return (
    <>
      <hemisphereLight args={["#eaf2ff", "#3a4658", 1.3]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[12, 22, 8]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={90}
      />
      <directionalLight position={[-10, 14, -8]} intensity={0.5} />
    </>
  );
}
