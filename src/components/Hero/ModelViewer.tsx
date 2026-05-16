import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function Model() {
  const { scene } = useGLTF('/kabanbay.glb');
  const ref = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={ref} scale={2.5} position={[0, -0.5, 0]}>
        <primitive object={scene} />
      </group>
    </Float>
  );
}

useGLTF.preload('/kabanbay.glb');

export default function ModelViewer() {
  return (
    <Canvas
      camera={{ position: [0, 2, 6], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} color="#4d8aad" />
      <pointLight position={[2, 3, 4]} intensity={0.8} color="#d4a85e" distance={15} />
      <spotLight
        position={[0, 10, 0]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
        color="#d4a85e"
      />
      <Model />
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        scale={10}
        blur={2.5}
        far={4}
      />
      <Environment preset="night" />
    </Canvas>
  );
}
