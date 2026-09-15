import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { LANDMARKS } from './landmarksData';

/**
 * 3D landmark models rendered through a MapLibre custom layer sharing the
 * map's WebGL context. Each landmark lives in its own THREE scene positioned
 * via mercator coordinates, so models far apart stay numerically stable.
 *
 * This module pulls in three.js (~500 kB) — import it dynamically.
 */

interface LandmarkScene {
  scene: THREE.Scene;
  mercator: maplibregl.MercatorCoordinate;
  scale: number;
}

function buildLights(scene: THREE.Scene, boost = 1): void {
  scene.add(new THREE.AmbientLight(0xb8c4d8, 1.6 * boost));
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.4 * boost);
  sun.position.set(60, 120, 80);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6688cc, 0.8 * boost);
  rim.position.set(-80, 40, -60);
  scene.add(rim);
  if (boost > 1) {
    // Sky/ground fill so boosted models stay bright on faces the sun misses
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x8a7448, 1.2 * boost));
  }
}

/** Fallback if the GLB fails: simple steppe mausoleum (drum + conical dome). */
function buildMausoleumFallback(): THREE.Group {
  const g = new THREE.Group();
  const brick = new THREE.MeshStandardMaterial({ color: 0xc9a876, roughness: 0.8, metalness: 0.05 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 7, 24), brick);
  drum.position.y = 3.5;
  g.add(drum);
  const dome = new THREE.Mesh(new THREE.ConeGeometry(6.2, 6, 24), brick);
  dome.position.y = 10;
  g.add(dome);
  return g;
}

/** Normalises an arbitrary GLB so its base sits at y=0 with a target height. */
function normalizeModel(obj: THREE.Object3D, targetHeight: number): THREE.Group {
  const wrapper = new THREE.Group();
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const s = size.y > 0 ? targetHeight / size.y : 1;
  obj.position.sub(center);          // center at origin
  obj.position.y += size.y / 2;      // base to y=0
  wrapper.add(obj);
  wrapper.scale.setScalar(s);
  return wrapper;
}

export function createLandmarksLayer(): maplibregl.CustomLayerInterface {
  let renderer: THREE.WebGLRenderer | null = null;
  const camera = new THREE.Camera();
  const scenes: LandmarkScene[] = [];

  return {
    id: 'landmarks-3d',
    type: 'custom',
    renderingMode: '3d',

    onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext) {
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;

      const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      // Kabanbai — GLB with procedural fallback
      const kabanbai = LANDMARKS.find((landmark) => landmark.id === 'kabanbai');
      if (!kabanbai) return;
      const kabanbaiScene = new THREE.Scene();
      buildLights(kabanbaiScene);
      scenes.push({
        scene: kabanbaiScene,
        mercator: maplibregl.MercatorCoordinate.fromLngLat(kabanbai.lngLat, 0),
        scale: maplibregl.MercatorCoordinate.fromLngLat(kabanbai.lngLat, 0)
          .meterInMercatorCoordinateUnits(),
      });
      gltfLoader.load(
        '/kabanbay.glb',
        (gltf) => {
          kabanbaiScene.add(normalizeModel(gltf.scene, 36));
          map.triggerRepaint();
        },
        undefined,
        () => {
          kabanbaiScene.add(buildMausoleumFallback());
          map.triggerRepaint();
        },
      );
    },

    render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: unknown) {
      if (!renderer) return;
      // MapLibre v5 passes projection data; older versions pass the matrix directly
      const a = args as { defaultProjectionData?: { mainMatrix: number[] } };
      const matrix: number[] | Float64Array =
        a?.defaultProjectionData?.mainMatrix ?? (args as number[]);
      if (!matrix || typeof (matrix as number[])[0] !== 'number') return;

      const m = new THREE.Matrix4().fromArray(matrix as number[]);

      for (const { scene, mercator, scale } of scenes) {
        const l = new THREE.Matrix4()
          .makeTranslation(mercator.x, mercator.y, mercator.z)
          .scale(new THREE.Vector3(scale, -scale, scale))
          .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

        camera.projectionMatrix = m.clone().multiply(l);
        renderer.resetState();
        renderer.render(scene, camera);
      }
    },

    onRemove() {
      renderer?.dispose();
      renderer = null;
      scenes.length = 0;
    },
  };
}
