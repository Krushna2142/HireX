import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface HeroCanvas3DProps {
  pointerNorm: { x: number; y: number };
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export default function HeroCanvas3D({ pointerNorm }: HeroCanvas3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef(pointerNorm);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    pointerRef.current = pointerNorm;
  }, [pointerNorm]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSoftwareGl = detectSoftwareWebGL();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04070d, 0.042);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 13.0);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Balanced warm/cool 3-point lighting rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x050914, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
    keyLight.position.set(6, 7, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 2.4);
    rimLight.position.set(-7, -3, -5);
    scene.add(rimLight);

    const violetAccent = new THREE.PointLight(0x8b5cf6, 1.8, 18);
    violetAccent.position.set(3.5, -2.5, 4);
    scene.add(violetAccent);

    // Composite Hero Sculpture Group (Primary + Secondary + Accent Silhouette)
    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    // 1. Primary Silhouette: Faceted Obsidian Glass Core + Inner Neural Lattice
    const coreGeo = new THREE.IcosahedronGeometry(1.7, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.2,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    heroGroup.add(coreMesh);

    const wireframeGeo = new THREE.IcosahedronGeometry(1.77, 1);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
    heroGroup.add(wireframeMesh);

    // Inner luminous energy nucleus
    const nucleusGeo = new THREE.OctahedronGeometry(0.7, 0);
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.35,
      metalness: 0.4,
      roughness: 0.2,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    heroGroup.add(nucleusMesh);

    // 2. Secondary Read: Three Precision Titanium & Glass Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(2.65, 0.03, 16, 96);
    const ringGeo2 = new THREE.TorusGeometry(3.2, 0.022, 16, 96);
    const ringGeo3 = new THREE.TorusGeometry(3.75, 0.018, 16, 96);

    const brushedTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.24,
    });
    const cyanRingMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.6,
      metalness: 0.65,
      roughness: 0.3,
    });
    const violetRingMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.45,
      metalness: 0.5,
      roughness: 0.35,
    });

    const ring1 = new THREE.Mesh(ringGeo1, brushedTitaniumMat);
    ring1.rotation.set(Math.PI / 3.2, Math.PI / 6, 0);
    heroGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo2, cyanRingMat);
    ring2.rotation.set(-Math.PI / 3.8, Math.PI / 4, Math.PI / 8);
    heroGroup.add(ring2);

    const ring3 = new THREE.Mesh(ringGeo3, violetRingMat);
    ring3.rotation.set(Math.PI / 6, -Math.PI / 3, 0);
    heroGroup.add(ring3);

    // 3. Accent Detail: Instanced Orbiting Talent & Opportunity Nodes
    const nodeCount = 24;
    const nodeGeo = new THREE.OctahedronGeometry(0.1, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.75,
      metalness: 0.6,
      roughness: 0.2,
    });
    const instancedNodes = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    instancedNodes.frustumCulled = false;

    const nodeMeta = Array.from({ length: nodeCount }, (_, i) => {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 2.65 + (i % 3) * 0.6;
      const tilt = ((i % 5) - 2) * 0.28;
      const speed = 0.22 + (i % 4) * 0.07;
      const scale = 0.8 + (i % 3) * 0.22;
      return { angle, radius, tilt, speed, scale };
    });

    const _dummy = new THREE.Object3D();
    const _color = new THREE.Color();
    for (let i = 0; i < nodeCount; i++) {
      const palette = i % 3 === 0 ? 0x22d3ee : i % 3 === 1 ? 0x93c5fd : 0xa78bfa;
      _color.setHex(palette);
      instancedNodes.setColorAt(i, _color);
    }
    if (instancedNodes.instanceColor) {
      instancedNodes.instanceColor.needsUpdate = true;
    }
    heroGroup.add(instancedNodes);

    // Ambient Deep Field Points
    const starCount = 140;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = Math.sin(i * 12.9898) * 0.5 * 26;
      starPositions[i * 3 + 1] = Math.cos(i * 78.233) * 0.5 * 16;
      starPositions[i * 3 + 2] = -2 - (i % 10) * 1.4;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.042,
      transparent: true,
      opacity: 0.48,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Frame 3D orbital core subtly behind the right-column student showcase at >= 768px
    const updateHeroOffset = (vw: number) => {
      if (vw >= 1024) {
        heroGroup.position.set(2.9, 0.05, -0.8);
        heroGroup.scale.setScalar(0.68);
      } else if (vw >= 768) {
        heroGroup.position.set(2.35, 0.05, -1.0);
        heroGroup.scale.setScalar(0.54);
      } else {
        heroGroup.position.set(0, -1.9, -1.2);
        heroGroup.scale.setScalar(0.46);
      }
    };
    updateHeroOffset(width);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    let frameId = 0;
    let isDisposed = false;
    const startTimeMs = performance.now();
    let prevTimeMs = startTimeMs;

    const updateScene = (elapsed: number, dt: number) => {
      const targetRotY = pointerRef.current.x * 0.35;
      const targetRotX = -pointerRef.current.y * 0.22;

      heroGroup.rotation.y = THREE.MathUtils.damp(heroGroup.rotation.y, targetRotY, 4.5, dt);
      heroGroup.rotation.x = THREE.MathUtils.damp(heroGroup.rotation.x, targetRotX, 4.5, dt);

      coreMesh.rotation.y = elapsed * 0.16;
      coreMesh.rotation.x = Math.sin(elapsed * 0.2) * 0.18;
      wireframeMesh.rotation.copy(coreMesh.rotation);

      nucleusMesh.rotation.y = -elapsed * 0.45;
      nucleusMesh.rotation.z = elapsed * 0.3;

      ring1.rotation.z = elapsed * 0.18;
      ring2.rotation.z = -elapsed * 0.14;
      ring3.rotation.y = elapsed * 0.11;

      for (let i = 0; i < nodeCount; i++) {
        const m = nodeMeta[i];
        const a = m.angle + elapsed * m.speed;
        _dummy.position.set(
          Math.cos(a) * m.radius,
          Math.sin(a) * m.radius * Math.sin(m.tilt + 0.5),
          Math.sin(a) * m.radius * Math.cos(m.tilt),
        );
        _dummy.rotation.set(elapsed * 0.6 + i, elapsed * 0.4, 0);
        _dummy.scale.setScalar(m.scale);
        _dummy.updateMatrix();
        instancedNodes.setMatrixAt(i, _dummy.matrix);
      }
      instancedNodes.instanceMatrix.needsUpdate = true;

      starField.rotation.y = elapsed * 0.015;
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 90);
      }
    };

    const tick = () => {
      if (isDisposed) return;
      const nowMs = performance.now();
      const dt = Math.min((nowMs - prevTimeMs) / 1000, 0.1);
      prevTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) / 1000;
      updateScene(elapsed, dt);
      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    if (prefersReducedMotion) {
      updateScene(1.2, 0.016);
      renderer.render(scene, camera);
    } else {
      tick();
    }

    const handleResize = () => {
      if (!container || isDisposed) return;
      const nextW = container.clientWidth || window.innerWidth;
      const nextH = container.clientHeight || window.innerHeight;
      camera.aspect = nextW / nextH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH);
      updateHeroOffset(nextW);
      if (prefersReducedMotion) {
        renderer.render(scene, camera);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      coreGeo.dispose();
      coreMat.dispose();
      wireframeGeo.dispose();
      wireframeMat.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      ringGeo3.dispose();
      brushedTitaniumMat.dispose();
      cyanRingMat.dispose();
      violetRingMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (contextLost) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(34,211,238,0.16),rgba(139,92,246,0.08)_38%,transparent_70%)]"
      />
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="hero-3d-canvas"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2]"
    />
  );
}
