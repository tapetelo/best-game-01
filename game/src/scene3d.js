// EMBERWARDEN v3 — the village of Ashwick rendered in true 3D (Three.js,
// vendored locally under game/vendor/three/). The simulation stays 2D:
// world.js thinks in a 1280x720 field, and this module maps that field onto
// a low-poly 3D village seen from a fixed high angle, like a tabletop
// diorama. One 3D unit = 40 pixels. The 2D HUD in render.js draws on top.
//
//   2D (x: 0..1280, y: 0..720)  ->  3D (X = (x-640)/40, Z = (y-360)/40)
import * as THREE from 'three';
import {
  BEACON, BOSS, ENEMY_TYPES, FIELD, HEDGES, HOUSES, LAMP_LIGHT_RADIUS,
  LAMPS, PLAYER, TREES,
} from './config.js';

const S = 40; // pixels per 3D unit
const toX = (x) => (x - FIELD.width / 2) / S;
const toZ = (y) => (y - FIELD.height / 2) / S;

/** Warm radial glow texture, shared by every light halo in the scene. */
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowSprite(tex, color, scale) {
  const mat = new THREE.SpriteMaterial({
    map: tex, color, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(scale, scale, 1);
  return spr;
}

function lambert(color, emissive = 0x000000, emissiveIntensity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, emissive, emissiveIntensity });
}

export function createScene3D(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a18);
  scene.fog = new THREE.Fog(0x070a18, 48, 95);

  // Fixed high-angle camera: the whole 32x18 village fits in frame.
  const camera = new THREE.PerspectiveCamera(36, FIELD.width / FIELD.height, 0.1, 220);
  camera.position.set(0, 26, 15.5);
  camera.lookAt(0, 0, -0.8);

  function resize() {
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- lights ------------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x3a4a86, 1.2));
  const moon = new THREE.DirectionalLight(0x93aaff, 1.05);
  moon.position.set(16, 30, -14);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -22;
  moon.shadow.camera.right = 22;
  moon.shadow.camera.top = 22;
  moon.shadow.camera.bottom = -22;
  moon.shadow.camera.far = 90;
  moon.shadow.bias = -0.002;
  scene.add(moon);

  const glowTex = makeGlowTexture();

  // ---- sky: stars and a low moon ----------------------------------------
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 55 + Math.random() * 35;
    const y = 14 + Math.random() * 30;
    starPos.push(Math.cos(a) * r, y, Math.sin(a) * r - 10);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xcdd8ff, size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.9, fog: false,
  })));
  const moonDisc = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false }),
  );
  moonDisc.position.set(-17, 19, -34);
  moonDisc.lookAt(camera.position);
  scene.add(moonDisc);
  const moonGlow = glowSprite(glowTex, 0xbfd0ff, 13);
  moonGlow.material.fog = false;
  moonGlow.position.copy(moonDisc.position);
  scene.add(moonGlow);

  // ---- ground ------------------------------------------------------------
  const farGround = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    lambert(0x070a18),
  );
  farGround.rotation.x = -Math.PI / 2;
  farGround.position.y = -0.06;
  scene.add(farGround);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 30),
    lambert(0x1a3325),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // Stone paths: a cross from the Beacon to the lamps and the edges.
  const pathMat = lambert(0x2a3352);
  const pathH = new THREE.Mesh(new THREE.BoxGeometry(33, 0.04, 0.7), pathMat);
  pathH.position.set(0, 0.02, toZ(BEACON.y));
  pathH.receiveShadow = true;
  scene.add(pathH);
  const pathV = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 19), pathMat);
  pathV.position.set(0, 0.02, 0);
  pathV.receiveShadow = true;
  scene.add(pathV);
  // Beacon plaza: stone ring.
  const plaza = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.85, 40), lambert(0x3a4668));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(toX(BEACON.x), 0.03, toZ(BEACON.y));
  scene.add(plaza);

  // Wild trees ringing the village, outside the playfield — the frame ends
  // in forest, never in void.
  const wildTrees = [
    [-21, -12], [-19, -6], [-21, 2], [-19, 8], [-21, 13], [-16, -13.5],
    [-10, -14], [-4, -13.5], [3, -14], [9, -13.5], [15, -14], [20, -12],
    [21, -5], [21, 3], [21, 10], [18, 13.5], [12, 14], [5, 13.5],
    [-2, 14], [-9, 13.5], [-15, 14],
  ];
  for (const [wx, wz] of wildTrees) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 6), lambert(0x241c14));
    trunk.position.y = 0.25;
    trunk.castShadow = true;
    g.add(trunk);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.2, 8), lambert(0x14301c));
    c1.position.y = 1.1;
    c1.castShadow = true;
    g.add(c1);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.85, 8), lambert(0x1d4527));
    c2.position.y = 1.75;
    c2.castShadow = true;
    g.add(c2);
    g.position.set(wx, 0, wz);
    scene.add(g);
  }

  // ---- houses ------------------------------------------------------------
  for (const h of HOUSES) {
    const g = new THREE.Group();
    const w = h.w / S;
    const d = h.h / S;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), lambert(0x232a42));
    body.position.y = 0.55;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 0.75, 4), lambert(new THREE.Color(h.roof)));
    roof.position.y = 1.45;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);
    // Two lit windows on the south face.
    for (const wx of [-w * 0.28, w * 0.28]) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xffc86e }),
      );
      win.position.set(wx, 0.62, d / 2 + 0.01);
      g.add(win);
      const winGlow = glowSprite(glowTex, 0xffc86e, 0.8);
      winGlow.position.set(wx, 0.62, d / 2 + 0.12);
      winGlow.material.opacity = 0.35;
      g.add(winGlow);
    }
    g.position.set(toX(h.x + h.w / 2), 0, toZ(h.y + h.h / 2));
    scene.add(g);
  }

  // ---- trees and hedges ---------------------------------------------------
  for (const tr of TREES) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.45, 6), lambert(0x2a2118));
    trunk.position.y = 0.22;
    trunk.castShadow = true;
    g.add(trunk);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.0, 8), lambert(0x1e4a2c));
    c1.position.y = 0.95;
    c1.castShadow = true;
    g.add(c1);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 8), lambert(0x2c6338));
    c2.position.y = 1.5;
    c2.castShadow = true;
    g.add(c2);
    g.position.set(toX(tr.x), 0, toZ(tr.y));
    scene.add(g);
  }
  for (const hd of HEDGES) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(hd.w / S, 0.45, hd.h / S), lambert(0x1d3a24));
    box.position.y = 0.22;
    box.castShadow = true;
    g.add(box);
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lambert(0x2c5232));
      puff.position.set(-hd.w / S / 2 + 0.2 + i * (hd.w / S - 0.4) / 4, 0.48, 0);
      g.add(puff);
    }
    g.position.set(toX(hd.x + hd.w / 2), 0, toZ(hd.y + hd.h / 2));
    scene.add(g);
  }

  // ---- the Beacon ---------------------------------------------------------
  const beacon = new THREE.Group();
  const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 0.9, 10), lambert(0x2c3550));
  beaconBase.position.y = 0.45;
  beaconBase.castShadow = true;
  beacon.add(beaconBase);
  const beaconCage = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.95), lambert(0x1c2338));
  beaconCage.position.y = 1.15;
  beaconCage.castShadow = true;
  beacon.add(beaconCage);
  const beaconFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.75, 10),
    new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff9a1e, emissiveIntensity: 2.4, roughness: 0.4 }),
  );
  beaconFlame.position.y = 1.75;
  beacon.add(beaconFlame);
  const beaconGlow = glowSprite(glowTex, 0xffb347, 7);
  beaconGlow.position.y = 1.7;
  beacon.add(beaconGlow);
  const beaconLight = new THREE.PointLight(0xffb347, 55, 30, 1.7);
  beaconLight.position.y = 1.8;
  beacon.add(beaconLight);
  beacon.position.set(toX(BEACON.x), 0, toZ(BEACON.y));
  scene.add(beacon);

  // ---- lamp posts ----------------------------------------------------------
  const lampLights = [];
  const lampFlames = [];
  const lampGlows = [];
  for (const l of LAMPS) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.15, 8), lambert(0x2c3550));
    pole.position.y = 0.57;
    pole.castShadow = true;
    g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.36), lambert(0x1c2338));
    head.position.y = 1.2;
    g.add(head);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff9a1e, emissiveIntensity: 2.2 }),
    );
    flame.position.y = 1.2;
    flame.visible = false;
    g.add(flame);
    const glow = glowSprite(glowTex, 0xffb347, 3.2);
    glow.position.y = 1.2;
    glow.visible = false;
    g.add(glow);
    const light = new THREE.PointLight(0xffb347, 0, 13, 1.7);
    light.position.y = 1.3;
    g.add(light);
    lampLights.push(light);
    lampFlames.push(flame);
    lampGlows.push(glow);
    g.position.set(toX(l.x), 0, toZ(l.y));
    scene.add(g);
  }

  // ---- the warden ----------------------------------------------------------
  const warden = new THREE.Group();
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.05, 8), lambert(0x6b4a2f));
  cloak.position.y = 0.52;
  cloak.castShadow = true;
  warden.add(cloak);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), lambert(0x3d2b1f));
  hood.position.y = 1.12;
  hood.castShadow = true;
  warden.add(hood);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  face.position.set(0, 1.1, 0.16);
  warden.add(face);
  const lantern = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.24, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xffc857, emissive: 0xff9a1e, emissiveIntensity: 2.6 }),
  );
  lantern.position.set(0.34, 0.62, 0.2);
  warden.add(lantern);
  const lanternGlow = glowSprite(glowTex, 0xffd27a, 2.2);
  lanternGlow.position.copy(lantern.position);
  warden.add(lanternGlow);
  const wardenLight = new THREE.PointLight(0xffd27a, 14, 11, 1.7);
  wardenLight.position.set(0, 1.4, 0);
  warden.add(wardenLight);
  const wardenRing = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.64, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
  );
  wardenRing.rotation.x = -Math.PI / 2;
  wardenRing.position.y = 0.05;
  warden.add(wardenRing);
  warden.scale.set(1.5, 1.5, 1.5);
  scene.add(warden);
  const wardenSpot = new THREE.SpotLight(0xffe9a8, 0, 20, 0.55, 0.55, 1.1);
  wardenSpot.position.set(0, 1.2, 0);
  scene.add(wardenSpot);
  scene.add(wardenSpot.target);

  // ---- flare wedge: a pool of light on the ground, apex at the lantern ----
  // Texture: a wedge opening to the right, bright at the apex, fading out.
  const wedgeCanvas = document.createElement('canvas');
  wedgeCanvas.width = 256;
  wedgeCanvas.height = 256;
  {
    const g = wedgeCanvas.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    const half = 0.52;
    g.beginPath();
    g.moveTo(0, 128);
    g.arc(0, 128, 256, -half, half);
    g.closePath();
    const grad = g.createRadialGradient(0, 128, 4, 0, 128, 256);
    grad.addColorStop(0, 'rgba(255, 244, 200, 0.9)');
    grad.addColorStop(0.3, 'rgba(255, 230, 160, 0.42)');
    grad.addColorStop(0.65, 'rgba(255, 220, 140, 0.12)');
    grad.addColorStop(1, 'rgba(255, 220, 140, 0)');
    g.fillStyle = grad;
    g.fill();
  }
  const wedgeTex = new THREE.CanvasTexture(wedgeCanvas);
  const flareWedgeGroup = new THREE.Group();
  const flareWedge = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({
      map: wedgeTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  flareWedge.rotation.x = -Math.PI / 2;
  flareWedge.position.set(8, 0.07, 0);
  flareWedgeGroup.add(flareWedge);
  flareWedgeGroup.visible = false;
  scene.add(flareWedgeGroup);
  const flareLight = new THREE.PointLight(0xffe9a8, 0, 16, 1.4);
  scene.add(flareLight);

  // ---- pulse ring -----------------------------------------------------------
  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 48),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.06;
  pulseRing.visible = false;
  scene.add(pulseRing);

  // ---- enemies ---------------------------------------------------------------
  function eyePair(parent, dx, y, z) {
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(sx * dx, y, z);
      parent.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0x10131f }));
      pupil.position.set(sx * dx, y, z + 0.05);
      parent.add(pupil);
    }
  }

  function buildEnemyMesh(type) {
    const def = ENEMY_TYPES[type];
    const g = new THREE.Group();
    const base = new THREE.Color(def.color);
    const bodyMat = lambert(base.clone());
    let body;
    if (type === 'gloomite') {
      body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), bodyMat);
      body.position.y = 0.34;
    } else if (type === 'gnawer') {
      body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.72), bodyMat);
      body.position.y = 0.3;
      for (let i = -1; i <= 1; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        tooth.position.set(i * 0.18, 0.14, 0.38);
        tooth.rotation.x = Math.PI;
        g.add(tooth);
      }
    } else if (type === 'douser') {
      body = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.85, 10), bodyMat);
      body.position.y = 0.45;
      body.rotation.x = Math.PI;
    } else if (type === 'flicker') {
      body = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), bodyMat);
      body.position.y = 0.45;
    } else if (type === 'hollow') {
      body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), bodyMat);
      body.position.y = 0.5;
    } else { // wispmother
      body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 12), bodyMat);
      body.position.y = 0.62;
      for (let i = -1; i <= 1; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), lambert(new THREE.Color(def.dark)));
        spike.position.set(i * 0.3, 1.3, 0);
        g.add(spike);
      }
    }
    body.castShadow = true;
    g.add(body);
    eyePair(g, 0.13, type === 'wispmother' ? 0.7 : 0.42, 0.26);
    if (type === 'hollow') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.05, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xe8eefc }),
      );
      ring.name = 'shieldRing';
      ring.position.y = 0.5;
      g.add(ring);
    }
    // HP pips for the tough ones, floating above.
    if (def.hp > 1) {
      for (let i = 0; i < def.hp; i++) {
        const pip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff5d5d }));
        pip.name = `pip${i}`;
        pip.position.set((i - (def.hp - 1) / 2) * 0.22, 1.15, 0);
        g.add(pip);
      }
    }
    const aura = glowSprite(glowTex, base, 1.6);
    aura.position.y = 0.4;
    aura.material.opacity = 0.4;
    g.add(aura);
    g.userData = { type, bodyMat, base, aura };
    return g;
  }

  // ---- the boss ---------------------------------------------------------------
  function buildBossMesh() {
    const g = new THREE.Group();
    const mass = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), lambert(0x2a0a3d));
    mass.position.y = 1.25;
    mass.scale.y = 1.25;
    mass.castShadow = true;
    g.add(mass);
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 4), lambert(0x12041f));
      spike.position.set(i * 0.42, 2.6, 0);
      g.add(spike);
    }
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff4d6d, emissiveIntensity: 2.5 }));
      eye.position.set(sx * 0.42, 1.45, 0.95);
      g.add(eye);
    }
    const aura = glowSprite(glowTex, 0x5a145a, 6);
    aura.position.y = 1.25;
    aura.material.opacity = 0.5;
    g.add(aura);
    g.userData = { smoke: [] };
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a0526, transparent: true, opacity: 0.7 }));
      puff.position.set(Math.cos(i) * 1.3, 0.9 + (i % 3) * 0.5, Math.sin(i) * 1.3);
      g.add(puff);
      g.userData.smoke.push(puff);
    }
    return g;
  }

  // ---- pooled meshes: enemies, embers, particles -------------------------------
  const enemyMeshes = [];
  let bossMesh = null;
  const emberMeshes = [];
  const emberGeo = new THREE.OctahedronGeometry(0.17);
  const emberMat = new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0xff7a10, emissiveIntensity: 2.2 });
  const particlePool = [];
  for (let i = 0; i < 90; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
    );
    m.visible = false;
    scene.add(m);
    particlePool.push(m);
  }

  function syncList(pool, items, make) {
    while (pool.length < items.length) {
      const m = make();
      pool.push(m);
      scene.add(m);
    }
    while (pool.length > items.length) {
      const m = pool.pop();
      scene.remove(m);
    }
    return pool;
  }

  const _v = new THREE.Vector3();
  const _aim = new THREE.Vector3();

  return {
    resize,
    /** Map a 2D field point to logical 1280x720 screen pixels, or null. */
    project(x, y) {
      _v.set(toX(x), 0.7, toZ(y)).project(camera);
      if (_v.z > 1) return null;
      return { x: (_v.x + 1) / 2 * FIELD.width, y: (1 - _v.y) / 2 * FIELD.height };
    },
    update(s, time) {
      // Beacon flame flickers with its remaining flame.
      const flick = 1 + Math.sin(time * 9) * 0.09 + Math.sin(time * 23) * 0.04;
      const flameFrac = 0.5 + 0.5 * (s.flame / Math.max(1, s.flameMax));
      beaconFlame.scale.set(flick, flick * flameFrac, flick);
      beaconGlow.material.opacity = 0.55 + 0.25 * flameFrac;
      beaconGlow.scale.set(7 * flick * (0.6 + 0.4 * flameFrac), 7 * flick * (0.6 + 0.4 * flameFrac), 1);
      beaconLight.intensity = 55 * flick * (0.35 + 0.65 * flameFrac);

      // Lamps: light comes on with the flame.
      s.lamps.forEach((l, i) => {
        lampLights[i].visible = l.lit;
        lampLights[i].intensity = l.lit ? 26 : 0;
        lampFlames[i].visible = l.lit;
        lampGlows[i].visible = l.lit;
        if (l.lit) {
          const f = 1 + Math.sin(time * 10 + l.x) * 0.1;
          lampFlames[i].scale.set(f, f, f);
        }
      });

      // The warden: position, facing, lantern light.
      const p = s.player;
      warden.position.set(toX(p.x), Math.sin(time * 4) * 0.03, toZ(p.y));
      warden.rotation.y = -s.flareAngle;
      warden.visible = !(s.invulnerable > 0 && Math.floor(time * 10) % 2 === 0);
      wardenLight.intensity = 14 * (1 + Math.sin(time * 11) * 0.06);
      _aim.set(Math.cos(s.flareAngle), 0, Math.sin(s.flareAngle));
      wardenSpot.position.set(toX(p.x), 1.2, toZ(p.y));
      wardenSpot.target.position.set(toX(p.x) + _aim.x * 6, 0.4, toZ(p.y) + _aim.z * 6);
      wardenSpot.visible = s.flareFlash > 0;
      wardenSpot.intensity = s.flareFlash > 0 ? 170 : 0;

      // Flare wedge: a pool of light on the ground while the flash lasts.
      if (s.flareFlash > 0) {
        flareWedgeGroup.visible = true;
        flareWedgeGroup.position.set(toX(p.x), 0, toZ(p.y));
        flareWedgeGroup.rotation.y = -s.flareAngle;
        flareWedge.material.opacity = (s.flareFlash / 0.4) * 0.55;
        flareLight.visible = true;
        flareLight.position.set(toX(s.flareX), 1.2, toZ(s.flareY));
        flareLight.intensity = 26 * (s.flareFlash / 0.4);
      } else {
        flareWedgeGroup.visible = false;
        flareLight.visible = false;
        flareLight.intensity = 0;
      }

      // Pulse ring expands and fades just after a pulse.
      if (s.pulseCooldown > 5.2) {
        const k = (6 - s.pulseCooldown) / 0.8;
        pulseRing.visible = true;
        pulseRing.position.set(toX(p.x), 0.06, toZ(p.y));
        pulseRing.scale.set(1 + k * 6.5, 1 + k * 6.5, 1);
        pulseRing.material.opacity = 0.8 * (1 - k);
      } else {
        pulseRing.visible = false;
      }

      // Enemies: reconcile the pool, then sync every mesh.
      syncList(enemyMeshes, s.enemies, () => buildEnemyMesh('gloomite'));
      s.enemies.forEach((e, i) => {
        let m = enemyMeshes[i];
        if (m.userData.type !== e.type) {
          scene.remove(m);
          m = buildEnemyMesh(e.type);
          enemyMeshes[i] = m;
          scene.add(m);
        }
        const def = ENEMY_TYPES[e.type];
        m.position.set(toX(e.x), Math.sin(time * 4 + e.wobble) * 0.06, toZ(e.y));
        m.rotation.y = -Math.atan2(e.y - p.y, e.x - p.x) + Math.PI / 2;
        const frozen = e.frozen > 0;
        m.userData.bodyMat.color.copy(frozen ? new THREE.Color(0xaebfff) : m.userData.base);
        m.userData.aura.material.color.copy(frozen ? new THREE.Color(0x9fd8ff) : m.userData.base);
        const ring = m.getObjectByName('shieldRing');
        if (ring) ring.visible = e.shield;
        for (let j = 0; j < def.hp; j++) {
          const pip = m.getObjectByName(`pip${j}`);
          if (pip) pip.material.color.set(j < e.hp ? 0xff5d5d : 0x333a52);
        }
        const sc = (e.type === 'wispmother' ? 1.15 : 1) * 1.35;
        m.scale.set(sc, sc, sc);
      });

      // The boss: one big figure, or none.
      if (s.boss) {
        if (!bossMesh) {
          bossMesh = buildBossMesh();
          scene.add(bossMesh);
        }
        const b = s.boss;
        bossMesh.position.set(toX(b.x), Math.sin(time * 2) * 0.08, toZ(b.y));
        bossMesh.rotation.y = -Math.atan2(b.y - p.y, b.x - p.x) + Math.PI / 2;
        bossMesh.userData.smoke.forEach((puff, i) => {
          const a = time * 0.8 + i * 1.05;
          puff.position.set(Math.cos(a) * 1.35, 0.9 + (i % 3) * 0.5 + Math.sin(time * 2 + i) * 0.15, Math.sin(a) * 1.35);
        });
      } else if (bossMesh) {
        scene.remove(bossMesh);
        bossMesh = null;
      }

      // Ground embers: bobbing octahedra.
      syncList(emberMeshes, s.groundEmbers, () => {
        const m = new THREE.Mesh(emberGeo, emberMat);
        m.add(glowSprite(glowTex, 0xff9a3c, 1.1));
        return m;
      });
      s.groundEmbers.forEach((e, i) => {
        const m = emberMeshes[i];
        m.position.set(toX(e.x), 0.22 + Math.sin(time * 3 + e.phase) * 0.07, toZ(e.y));
        m.rotation.y = time * 1.5 + e.phase;
      });

      // Particles: small glowing spheres that fade.
      s.particles.forEach((pt, i) => {
        if (i >= particlePool.length) return;
        const m = particlePool[i];
        m.visible = true;
        m.position.set(toX(pt.x), 0.3, toZ(pt.y));
        m.material.color.set(pt.color);
        m.material.opacity = Math.max(0, pt.life / pt.max);
        const r = (pt.size / S) * 1.6;
        m.scale.set(r / 0.09, r / 0.09, r / 0.09);
      });
      for (let i = s.particles.length; i < particlePool.length; i++) particlePool[i].visible = false;

      renderer.render(scene, camera);
    },
  };
}
