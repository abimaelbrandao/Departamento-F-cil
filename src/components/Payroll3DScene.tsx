import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { formatarMoeda } from '../utils/formatters';
import { RotateCcw, Box, Layers, Building } from 'lucide-react';

export interface Payroll3DCostItem {
  id: string;
  label: string;
  shortLabel: string;
  valor: number;
  percentual: number;
  colorHex: number;
  cssColor: string;
}

export interface Payroll3DDeptoItem {
  id: string;
  nome: string;
  qtd: number;
  massa: number;
  share: number;
}

interface Payroll3DSceneProps {
  temFolha: boolean;
  desembolsoTotal: number;
  segmentos: Payroll3DCostItem[];
  departamentos: Payroll3DDeptoItem[];
}

interface SceneItemMeta {
  id: string;
  grupo: 'CUSTO' | 'SETOR';
  titulo: string;
  valor: number;
  detalhe: string;
  cssColor: string;
}

interface AnimatedBarEntry {
  meta: SceneItemMeta;
  coreMesh: THREE.Mesh;
  shellMesh?: THREE.Mesh;
  capMesh: THREE.Mesh;
  haloMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  group: THREE.Group;
  targetHeight: number;
  currentHeight: number;
  baseEmissive: number;
}

type CameraPreset = 'GERAL' | 'CUSTOS' | 'SETORES';

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  GERAL: { pos: [0.2, 5.4, 9.6], target: [0.0, 1.0, 0.0] },
  CUSTOS: { pos: [-2.4, 4.2, 6.9], target: [-2.1, 1.15, 0.0] },
  SETORES: { pos: [2.5, 4.4, 6.9], target: [2.1, 1.1, 0.0] },
};

function detectSoftwareGl(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|llvmpipe|softpipe|mesa|software/i.test(rendererStr)) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

function createRoundedRectShape(width: number, depth: number, radius: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw, hd);
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}

export const Payroll3DScene: React.FC<Payroll3DSceneProps> = ({
  temFolha,
  desembolsoTotal,
  segmentos,
  departamentos,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('GERAL');
  const [activeItem, setActiveItem] = useState<SceneItemMeta | null>(null);
  const [lockedItemId, setLockedItemId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  // Refs mutáveis lidas pelo loop Three.js sem recriar o WebGLRenderer
  const presetTriggerRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS.GERAL.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.GERAL.target),
  });
  const lockedIdRef = useRef<string | null>(null);
  const isDarkRef = useRef<boolean>(isDark);
  const requestRenderRef = useRef<() => void>(() => {});

  useEffect(() => {
    lockedIdRef.current = lockedItemId;
    requestRenderRef.current();
  }, [lockedItemId]);

  // Observa alternância de tema Claro/Escuro na raiz do documento
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      isDarkRef.current = dark;
      setIsDark(dark);
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const handleSelectPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const cfg = CAMERA_PRESETS[preset];
    presetTriggerRef.current.pos.set(...cfg.pos);
    presetTriggerRef.current.target.set(...cfg.target);
    presetTriggerRef.current.active = true;
    requestRenderRef.current();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: isSoftwareGl ? 'default' : 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const initWidth = Math.max(container.clientWidth, 300);
    const initHeight = Math.max(container.clientHeight, 260);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(initWidth, initHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.outline = 'none';

    const scene = new THREE.Scene();

    // Studio IBL com RoomEnvironment para reflexos metálicos e vidro realistas
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = isDarkRef.current ? 0.72 : 0.92;

    const camera = new THREE.PerspectiveCamera(36, initWidth / initHeight, 0.1, 60);
    camera.position.set(...CAMERA_PRESETS.GERAL.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.GERAL.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 5.5;
    controls.maxDistance = 16;
    controls.minPolarAngle = Math.PI / 8;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.enablePan = false;
    controls.update();

    // Iluminação de estúdio em 3 pontos
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x334155, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.55);
    keyLight.position.set(5.5, 9.0, 6.0);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 25;
      keyLight.shadow.camera.left = -6;
      keyLight.shadow.camera.right = 6;
      keyLight.shadow.camera.top = 6;
      keyLight.shadow.camera.bottom = -6;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.65);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    // Coleção para limpeza segura de geometrias e materiais no unmount
    const disposables: Array<{ dispose: () => void }> = [];

    // Plano de chão suave + grade sutil
    const floorGeo = new THREE.CircleGeometry(14, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x0b1220 : 0xf1f5f9,
      roughness: 0.92,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.24;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);
    disposables.push(floorGeo, floorMat);

    // Base arquitetônica chanfrada (plinto)
    const plinthShape = createRoundedRectShape(8.8, 3.6, 0.35);
    const plinthGeo = new THREE.ExtrudeGeometry(plinthShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    plinthGeo.rotateX(Math.PI / 2);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x162136 : 0xffffff,
      roughness: 0.36,
      metalness: 0.14,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.set(0, 0.0, 0);
    plinthMesh.receiveShadow = !isSoftwareGl;
    plinthMesh.castShadow = !isSoftwareGl;
    scene.add(plinthMesh);
    disposables.push(plinthGeo, plinthMat);

    // Friso metálico central dividindo Custos (Esquerda) e Setores (Direita)
    const dividerGeo = new THREE.BoxGeometry(0.045, 0.06, 2.95);
    const dividerMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x38bdf8 : 0x64748b,
      roughness: 0.22,
      metalness: 0.78,
    });
    const dividerMesh = new THREE.Mesh(dividerGeo, dividerMat);
    dividerMesh.position.set(-0.05, 0.05, 0);
    scene.add(dividerMesh);
    disposables.push(dividerGeo, dividerMat);

    // Placa de subtítulo esquerda & direita (anéis embutidos no plinto)
    const zoneMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x1e293b : 0xe2e8f0,
      roughness: 0.55,
      metalness: 0.18,
    });
    const leftDeckGeo = new THREE.BoxGeometry(3.85, 0.03, 2.7);
    const leftDeck = new THREE.Mesh(leftDeckGeo, zoneMat);
    leftDeck.position.set(-2.15, 0.035, 0);
    leftDeck.receiveShadow = !isSoftwareGl;
    scene.add(leftDeck);

    const rightDeckGeo = new THREE.BoxGeometry(3.85, 0.03, 2.7);
    const rightDeck = new THREE.Mesh(rightDeckGeo, zoneMat);
    rightDeck.position.set(2.1, 0.035, 0);
    rightDeck.receiveShadow = !isSoftwareGl;
    scene.add(rightDeck);
    disposables.push(leftDeckGeo, rightDeckGeo, zoneMat);

    // Construção das colunas compostas
    const animatedBars: AnimatedBarEntry[] = [];
    const hitTargets: THREE.Mesh[] = [];

    const padGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.08, 24);
    const coreGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.0, 24);
    const shellGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.0, 24);
    const capGeo = new THREE.CylinderGeometry(0.29, 0.31, 0.07, 24);
    const haloGeo = new THREE.TorusGeometry(0.39, 0.024, 10, 32);
    haloGeo.rotateX(Math.PI / 2);
    const hitGeo = new THREE.BoxGeometry(0.84, 3.6, 1.2);
    disposables.push(padGeo, coreGeo, shellGeo, capGeo, haloGeo, hitGeo);

    const padMatShared = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x0f172a : 0xcbd5e1,
      roughness: 0.32,
      metalness: 0.65,
    });
    const capMatShared = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      metalness: 0.85,
    });
    const hitMatShared = new THREE.MeshBasicMaterial({ visible: false });
    disposables.push(padMatShared, capMatShared, hitMatShared);

    // 1) Pilares da Esquerda: Composição do Custo
    const maxSegValor = Math.max(...segmentos.map(s => s.valor), 1);
    const segCount = segmentos.length;
    segmentos.forEach((seg, idx) => {
      const x = -3.45 + idx * (2.65 / Math.max(segCount - 1, 1));
      const z = idx % 2 === 0 ? -0.25 : 0.28;
      const normalized = temFolha && seg.valor > 0 ? Math.max(0.22, seg.valor / maxSegValor) : 0.14;
      const targetHeight = 0.25 + normalized * 2.55;

      const barGroup = new THREE.Group();
      barGroup.position.set(x, 0.06, z);
      scene.add(barGroup);

      const pad = new THREE.Mesh(padGeo, padMatShared);
      pad.position.y = 0.03;
      pad.receiveShadow = !isSoftwareGl;
      barGroup.add(pad);

      const coreMat = new THREE.MeshStandardMaterial({
        color: seg.colorHex,
        emissive: seg.colorHex,
        emissiveIntensity: temFolha ? 0.28 : 0.08,
        roughness: 0.24,
        metalness: 0.32,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.castShadow = !isSoftwareGl;
      barGroup.add(coreMesh);
      disposables.push(coreMat);

      let shellMesh: THREE.Mesh | undefined;
      if (!isSoftwareGl) {
        const shellMat = new THREE.MeshPhysicalMaterial({
          color: seg.colorHex,
          roughness: 0.08,
          metalness: 0.05,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        });
        shellMesh = new THREE.Mesh(shellGeo, shellMat);
        barGroup.add(shellMesh);
        disposables.push(shellMat);
      }

      const capMesh = new THREE.Mesh(capGeo, capMatShared);
      capMesh.castShadow = !isSoftwareGl;
      barGroup.add(capMesh);

      const haloMat = new THREE.MeshBasicMaterial({
        color: seg.colorHex,
        transparent: true,
        opacity: 0.0,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.y = 0.08;
      barGroup.add(haloMesh);
      disposables.push(haloMat);

      const meta: SceneItemMeta = {
        id: `custo-${seg.id}`,
        grupo: 'CUSTO',
        titulo: seg.label,
        valor: seg.valor,
        detalhe: temFolha
          ? `${seg.percentual.toFixed(1)}% do custo total (${formatarMoeda(desembolsoTotal)})`
          : 'Aguardando cálculo da folha',
        cssColor: seg.cssColor,
      };

      const hitMesh = new THREE.Mesh(hitGeo, hitMatShared);
      hitMesh.position.y = 1.6;
      hitMesh.userData.meta = meta;
      barGroup.add(hitMesh);
      hitTargets.push(hitMesh);

      animatedBars.push({
        meta,
        coreMesh,
        shellMesh,
        capMesh,
        haloMesh,
        hitMesh,
        group: barGroup,
        targetHeight,
        currentHeight: prefersReducedMotion ? targetHeight : 0.1,
        baseEmissive: temFolha ? 0.28 : 0.08,
      });
    });

    // 2) Pilares da Direita: Departamentos (até 5 setores)
    const deptosVisiveis = departamentos.slice(0, 5);
    const maxDeptoMassa = Math.max(...deptosVisiveis.map(d => d.massa), 1);
    const deptoColors = [0x6366f1, 0x3b82f6, 0x0ea5e9, 0x10b981, 0xf59e0b];
    const deptoCssColors = ['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b'];

    const deptoPadGeo = new THREE.CylinderGeometry(0.35, 0.39, 0.08, 6);
    const deptoCoreGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.0, 6);
    const deptoCapGeo = new THREE.CylinderGeometry(0.27, 0.29, 0.065, 6);
    disposables.push(deptoPadGeo, deptoCoreGeo, deptoCapGeo);

    deptosVisiveis.forEach((depto, idx) => {
      const count = deptosVisiveis.length;
      const spread = count > 1 ? (idx / (count - 1)) * 2.85 : 1.42;
      const x = 0.72 + spread;
      const z = idx % 2 === 0 ? 0.26 : -0.26;
      const normalized = depto.massa > 0 ? Math.max(0.2, depto.massa / maxDeptoMassa) : 0.15;
      const targetHeight = 0.25 + normalized * 2.45;
      const colorHex = deptoColors[idx % deptoColors.length];
      const cssColor = deptoCssColors[idx % deptoCssColors.length];

      const barGroup = new THREE.Group();
      barGroup.position.set(x, 0.06, z);
      scene.add(barGroup);

      const pad = new THREE.Mesh(deptoPadGeo, padMatShared);
      pad.position.y = 0.03;
      pad.receiveShadow = !isSoftwareGl;
      barGroup.add(pad);

      const coreMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.24,
        roughness: 0.26,
        metalness: 0.38,
      });
      const coreMesh = new THREE.Mesh(deptoCoreGeo, coreMat);
      coreMesh.castShadow = !isSoftwareGl;
      barGroup.add(coreMesh);
      disposables.push(coreMat);

      const capMesh = new THREE.Mesh(deptoCapGeo, capMatShared);
      capMesh.castShadow = !isSoftwareGl;
      barGroup.add(capMesh);

      const haloMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.0,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.y = 0.08;
      barGroup.add(haloMesh);
      disposables.push(haloMat);

      const meta: SceneItemMeta = {
        id: `setor-${depto.id}`,
        grupo: 'SETOR',
        titulo: `Setor: ${depto.nome}`,
        valor: depto.massa,
        detalhe: `${depto.qtd} colaborador(es) · ${depto.share}% da massa salarial`,
        cssColor,
      };

      const hitMesh = new THREE.Mesh(hitGeo, hitMatShared);
      hitMesh.position.y = 1.6;
      hitMesh.userData.meta = meta;
      barGroup.add(hitMesh);
      hitTargets.push(hitMesh);

      animatedBars.push({
        meta,
        coreMesh,
        capMesh,
        haloMesh,
        hitMesh,
        group: barGroup,
        targetHeight,
        currentHeight: prefersReducedMotion ? targetHeight : 0.1,
        baseEmissive: 0.24,
      });
    });

    // Pré-alocações para loop sem alocação de objetos
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    const bgColorTarget = new THREE.Color();
    const floorColorTarget = new THREE.Color();
    const plinthColorTarget = new THREE.Color();
    const deckColorTarget = new THREE.Color();
    const clock = new THREE.Clock();

    let hoveredId: string | null = null;
    let rafId: number | null = null;
    let needsRender = true;
    let lastDarkState = isDarkRef.current;

    const applyThemeColors = (dark: boolean) => {
      bgColorTarget.setHex(dark ? 0x0b1220 : 0xf1f5f9);
      scene.background = bgColorTarget.clone();
      scene.environmentIntensity = dark ? 0.72 : 0.92;
      floorColorTarget.setHex(dark ? 0x0b1220 : 0xf1f5f9);
      floorMat.color.copy(floorColorTarget);
      plinthColorTarget.setHex(dark ? 0x162136 : 0xffffff);
      plinthMat.color.copy(plinthColorTarget);
      deckColorTarget.setHex(dark ? 0x1e293b : 0xe2e8f0);
      zoneMat.color.copy(deckColorTarget);
      padMatShared.color.setHex(dark ? 0x0f172a : 0xcbd5e1);
      dividerMat.color.setHex(dark ? 0x38bdf8 : 0x64748b);
    };
    applyThemeColors(lastDarkState);

    const requestRender = () => {
      needsRender = true;
      if (rafId === null) {
        clock.getDelta();
        rafId = requestAnimationFrame(tick);
      }
    };
    requestRenderRef.current = requestRender;

    const updateMouseNDC = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    let lastHoverCheck = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 30) return;
      lastHoverCheck = now;

      updateMouseNDC(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      const nextMeta: SceneItemMeta | null =
        hits.length > 0 ? (hits[0].object.userData.meta as SceneItemMeta) : null;
      const nextId = nextMeta?.id ?? null;

      if (nextId !== hoveredId) {
        hoveredId = nextId;
        renderer.domElement.style.cursor = nextId ? 'pointer' : 'grab';
        if (!lockedIdRef.current) {
          setActiveItem(nextMeta);
        }
        requestRender();
      }
    };

    const handlePointerLeave = () => {
      if (hoveredId !== null) {
        hoveredId = null;
        renderer.domElement.style.cursor = 'grab';
        if (!lockedIdRef.current) {
          setActiveItem(null);
        }
        requestRender();
      }
    };

    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      presetTriggerRef.current.active = false;
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // foi arraste de câmera, não clique

      updateMouseNDC(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      if (hits.length > 0) {
        const clicked = hits[0].object.userData.meta as SceneItemMeta;
        if (lockedIdRef.current === clicked.id) {
          setLockedItemId(null);
          setActiveItem(clicked);
        } else {
          setLockedItemId(clicked.id);
          setActiveItem(clicked);
        }
      } else {
        setLockedItemId(null);
        setActiveItem(null);
      }
      requestRender();
    };

    const handleControlsChange = () => {
      requestRender();
    };

    controls.addEventListener('change', handleControlsChange);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.style.cursor = 'grab';

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.max(Math.round(entry.contentRect.width), 280);
        const h = Math.max(Math.round(entry.contentRect.height), 240);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    // Theme observer dentro do WebGL para atualizar cores sem recriar cena
    const themePollObserver = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      if (dark !== lastDarkState) {
        lastDarkState = dark;
        applyThemeColors(dark);
        requestRender();
      }
    });
    themePollObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const tick = () => {
      rafId = null;
      const dt = Math.min(clock.getDelta(), 0.05);
      let stillAnimating = false;

      // 1) Atualiza transição suave de alturas e destaque hover/selecionado
      const focusId = lockedIdRef.current || hoveredId;
      for (let i = 0; i < animatedBars.length; i++) {
        const bar = animatedBars[i];
        const isFocus = focusId === bar.meta.id;
        const goalHeight = isFocus ? bar.targetHeight * 1.07 : bar.targetHeight;
        const diff = Math.abs(goalHeight - bar.currentHeight);

        if (diff > 0.002 && !prefersReducedMotion) {
          bar.currentHeight = THREE.MathUtils.damp(bar.currentHeight, goalHeight, 8.5, dt);
          stillAnimating = true;
        } else {
          bar.currentHeight = goalHeight;
        }

        const h = Math.max(0.08, bar.currentHeight);
        bar.coreMesh.scale.y = h;
        bar.coreMesh.position.y = 0.07 + h / 2;

        if (bar.shellMesh) {
          bar.shellMesh.scale.y = h + 0.06;
          bar.shellMesh.position.y = 0.07 + (h + 0.06) / 2;
          const targetScaleXZ = isFocus ? 1.08 : 1.0;
          bar.shellMesh.scale.x = targetScaleXZ;
          bar.shellMesh.scale.z = targetScaleXZ;
        }

        bar.capMesh.position.y = 0.07 + h + 0.04;

        const coreMat = bar.coreMesh.material as THREE.MeshStandardMaterial;
        const targetEmissive = isFocus ? 0.65 : bar.baseEmissive;
        if (Math.abs(coreMat.emissiveIntensity - targetEmissive) > 0.005) {
          coreMat.emissiveIntensity = THREE.MathUtils.damp(
            coreMat.emissiveIntensity,
            targetEmissive,
            10,
            dt
          );
          stillAnimating = true;
        } else {
          coreMat.emissiveIntensity = targetEmissive;
        }

        const haloMat = bar.haloMesh.material as THREE.MeshBasicMaterial;
        const targetHaloOpacity = isFocus ? 0.85 : 0.0;
        if (Math.abs(haloMat.opacity - targetHaloOpacity) > 0.01) {
          haloMat.opacity = THREE.MathUtils.damp(haloMat.opacity, targetHaloOpacity, 10, dt);
          stillAnimating = true;
        } else {
          haloMat.opacity = targetHaloOpacity;
        }
        bar.haloMesh.position.y = 0.08 + h + 0.12;
      }

      // 2) Atualiza transição de preset de câmera
      if (presetTriggerRef.current.active) {
        const camDist = camera.position.distanceTo(presetTriggerRef.current.pos);
        const tgtDist = controls.target.distanceTo(presetTriggerRef.current.target);
        if (camDist > 0.02 || tgtDist > 0.02) {
          const factor = prefersReducedMotion ? 1 : 1 - Math.exp(-7 * dt);
          camera.position.lerp(presetTriggerRef.current.pos, factor);
          controls.target.lerp(presetTriggerRef.current.target, factor);
          stillAnimating = true;
        } else {
          camera.position.copy(presetTriggerRef.current.pos);
          controls.target.copy(presetTriggerRef.current.target);
          presetTriggerRef.current.active = false;
        }
      }

      if (controls.enableDamping) {
        const prevCamX = camera.position.x;
        const prevCamZ = camera.position.z;
        controls.update();
        if (
          Math.abs(camera.position.x - prevCamX) > 0.0005 ||
          Math.abs(camera.position.z - prevCamZ) > 0.0005
        ) {
          stillAnimating = true;
        }
      } else {
        controls.update();
      }

      renderer.render(scene, camera);
      needsRender = false;

      if (stillAnimating || needsRender) {
        rafId = requestAnimationFrame(tick);
      }
    };

    requestRender();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      themePollObserver.disconnect();
      controls.removeEventListener('change', handleControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      disposables.forEach(d => d.dispose());
      envRT.dispose();
      roomEnv.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [temFolha, desembolsoTotal, segmentos, departamentos]);

  if (webglError) {
    return (
      <div className="h-[300px] rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-600 dark:text-slate-300">
        <Box className="w-7 h-7 text-blue-500 mb-2" />
        <p className="font-bold">Renderização WebGL 3D indisponível neste dispositivo</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Utilize o modo 2D acima para visualizar os gráficos da competência.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0b1220]">
      {/* Palco WebGL 3D */}
      <div
        ref={containerRef}
        className="w-full h-[310px] sm:h-[340px]"
        aria-label="Visualização 3D interativa de custos da folha e setores"
      />

      {/* Título discreto no canto superior esquerdo (Sem backdrop-blur!) */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-100 shadow-sm">
          <Box className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Palco 3D Interativo · Arraste para girar</span>
        </div>
      </div>

      {/* Cartão de Detalhe do Pilar Selecionado ou em Hover (Sem backdrop-blur!) */}
      {activeItem && (
        <div className="absolute top-3 right-3 max-w-[260px] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-lg text-xs">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: activeItem.cssColor }}
              />
              {activeItem.grupo === 'CUSTO' ? 'Composição do Custo' : 'Departamento'}
            </span>
            {lockedItemId === activeItem.id && (
              <button
                onClick={() => {
                  setLockedItemId(null);
                  setActiveItem(null);
                }}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {activeItem.titulo}
          </div>
          <div className="text-base font-black font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
            {formatarMoeda(activeItem.valor)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {activeItem.detalhe}
          </div>
        </div>
      )}

      {/* Dock de Presets de Câmera + Legenda Rápida */}
      <div className="px-3 py-2.5 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSelectPreset('GERAL')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              cameraPreset === 'GERAL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Visão Geral
          </button>
          <button
            onClick={() => handleSelectPreset('CUSTOS')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              cameraPreset === 'CUSTOS'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3 h-3" />
            Focar Custos
          </button>
          <button
            onClick={() => handleSelectPreset('SETORES')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              cameraPreset === 'SETORES'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Building className="w-3 h-3" />
            Focar Setores
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
          {segmentos.map(seg => (
            <span key={seg.id} className="inline-flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: seg.cssColor }}
              />
              <span className="font-medium">{seg.shortLabel}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
