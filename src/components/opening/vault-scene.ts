import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * "The Vault Mechanism" — a procedural gold vault coin that explodes into
 * layered parts, opens into a particle price-world, then reassembles.
 * Driven by one number `p` in [0, 3] (0 = coin, 1 = exploded, 2 = inside, 3 = reassembled).
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface LayerLabel {
  key: string;
  title: string;
  detail: string;
}

/** Live Market categories, one per exploded layer (see Opening for the live quote under each). */
export const LAYER_LABELS: LayerLabel[] = [
  { key: "rim", title: "Commodities", detail: "Gold, silver, oil, gas, copper, agriculture" },
  { key: "gear", title: "Crypto", detail: "Bitcoin, Ether, Solana and 17 more" },
  { key: "dial", title: "US stocks", detail: "Nvidia, Apple, Microsoft and 11 more" },
  { key: "train", title: "Income & FX", detail: "Treasuries, real estate, euro" },
];

function gearShape(outer: number, inner: number, teeth: number, hole: number, spokes = 0, spokeHole = 0) {
  const shape = new THREE.Shape();
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = i % 4 < 2 ? outer : inner;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  shape.holes.push(h);
  for (let s = 0; s < spokes; s++) {
    const a = (s / spokes) * Math.PI * 2;
    const c = (inner * 0.82 + hole) / 2 + spokeHole * 0.2;
    const sh = new THREE.Path();
    sh.absarc(Math.cos(a) * c, Math.sin(a) * c, spokeHole, 0, Math.PI * 2, true);
    shape.holes.push(sh);
  }
  return shape;
}

function annulus(outer: number, inner: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.absarc(0, 0, inner, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0.012) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 64,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Engraved coin face drawn on a canvas, used as a bump map. */
function faceTexture(fontFamily: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, 1024, 1024);
  g.translate(512, 512);
  // concentric guilloché rings
  for (let r = 60; r < 330; r += 9) {
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.strokeStyle = r % 2 ? "#8c8c8c" : "#747474";
    g.lineWidth = 3;
    g.stroke();
  }
  g.beginPath();
  g.arc(0, 0, 350, 0, Math.PI * 2);
  g.lineWidth = 10;
  g.strokeStyle = "#ffffff";
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 470, 0, Math.PI * 2);
  g.lineWidth = 8;
  g.stroke();
  // ring legend
  const legend = "RIALTYCOON  ·  REAL WORLD ASSETS  ·  VAULT 001  ·  SERIES ONE  ·  ";
  g.fillStyle = "#ffffff";
  g.font = `600 46px ${fontFamily}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const chars = legend.split("");
  chars.forEach((ch, i) => {
    g.save();
    g.rotate((i / chars.length) * Math.PI * 2);
    g.translate(0, -410);
    g.fillText(ch, 0, 0);
    g.restore();
  });
  // monogram
  g.font = `600 500px ${getComputedStyle(document.body).fontFamily}`;
  g.fillStyle = "#ffffff";
  g.fillText("R", 0, 24);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

export class VaultScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  private mech = new THREE.Group();
  private layers: Record<string, THREE.Object3D> = {};
  private smallGears: THREE.Mesh[] = [];
  private core!: THREE.Mesh;
  private particles!: THREE.Points;
  private particleBase!: Float32Array;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private clock = new THREE.Clock();
  private width = 1;
  private height = 1;
  private dpr = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio, 1.75);
  private frameTimes: number[] = [];
  private lastFrame = 0;
  private faceMat!: THREE.MeshPhysicalMaterial;
  p = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xfff1d6, 2.2);
    key.position.set(3, 4, 5);
    const rim = new THREE.DirectionalLight(0xffd28a, 1.6);
    rim.position.set(-4, -2, -3);
    this.scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15));

    this.buildMechanism();
    this.buildParticles();
    this.scene.add(this.mech);
  }

  private buildMechanism() {
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.24, clearcoat: 0.4, clearcoatRoughness: 0.2 });
    const brushed = new THREE.MeshStandardMaterial({ color: 0xcf9a3a, metalness: 1, roughness: 0.38 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xd6d7db, metalness: 1, roughness: 0.2 });
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2a2724, metalness: 0.85, roughness: 0.35 });
    const ruby = new THREE.MeshStandardMaterial({ color: 0xb0122b, metalness: 0.1, roughness: 0.08, emissive: 0x3a0008 });

    // Face plate with engraved monogram
    const bump = faceTexture(getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono") || "monospace");
    const faceMat = gold.clone();
    this.faceMat = faceMat;
    faceMat.bumpMap = bump;
    faceMat.bumpScale = 6;
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.06, 96), [gold, faceMat, gold]);
    face.rotation.x = Math.PI / 2;
    const faceG = new THREE.Group();
    faceG.add(face);
    this.layers.face = faceG;

    // Rim with reeded edge
    const rimG = new THREE.Group();
    rimG.add(new THREE.Mesh(extrude(annulus(1.0, 0.9), 0.16), gold));
    const reeds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.03, 0.15), gold, 180);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      m.makeRotationZ(a);
      m.setPosition(Math.cos(a) * 1.012, Math.sin(a) * 1.012, 0);
      reeds.setMatrixAt(i, m);
    }
    rimG.add(reeds);
    this.layers.rim = rimG;

    // Big spoked gear
    const gearG = new THREE.Group();
    gearG.add(new THREE.Mesh(extrude(gearShape(0.86, 0.8, 48, 0.2, 6, 0.13), 0.05, 0.006), brushed));
    this.layers.gear = gearG;

    // Steel dial with ticks
    const dialG = new THREE.Group();
    dialG.add(new THREE.Mesh(extrude(annulus(0.8, 0.56), 0.03, 0.006), steel));
    const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.07, 0.02), gunmetal, 60);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      m.makeRotationZ(a - Math.PI / 2);
      m.setPosition(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.022);
      if (i % 5 === 0) m.scale(new THREE.Vector3(2, 1.4, 1));
      ticks.setMatrixAt(i, m);
    }
    dialG.add(ticks);
    this.layers.dial = dialG;

    // Gear train: three small steel gears with ruby jewels
    const trainG = new THREE.Group();
    const small = extrude(gearShape(0.2, 0.17, 16, 0.035), 0.04, 0.004);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const gm = new THREE.Mesh(small, steel);
      gm.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 16), ruby);
      jewel.position.copy(gm.position).setZ(0.03);
      trainG.add(gm, jewel);
      this.smallGears.push(gm);
    }
    this.layers.train = trainG;

    // Glowing asset core
    const coreG = new THREE.Group();
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 48, 32),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb02e, emissiveIntensity: 2.2, metalness: 0.2, roughness: 0.3 }),
    );
    coreG.add(this.core, new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 16, 96), gold));
    this.layers.core = coreG;

    // Back plate with grooves
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 96), gunmetal);
    back.rotation.x = Math.PI / 2;
    const backG = new THREE.Group();
    backG.add(back);
    for (let r = 0.3; r < 0.9; r += 0.12) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 96), gold);
      ring.position.z = 0.03;
      backG.add(ring);
    }
    this.layers.back = backG;

    for (const k of ["face", "rim", "gear", "dial", "train", "core", "back"]) this.mech.add(this.layers[k]);
  }

  /** Closed (z) and exploded (z) positions per layer, front to back. */
  private static STACK: Record<string, [number, number]> = {
    face: [0.06, 2.1],
    rim: [0, 1.4],
    gear: [0.01, 0.7],
    dial: [0.03, 0],
    train: [0.0, -0.7],
    core: [-0.1, -1.35],
    back: [-0.06, -2.0],
  };

  private buildParticles() {
    // Line-art price paths, like ink strokes of a market chart.
    const lines = 18;
    const per = 900;
    const pos = new Float32Array(lines * per * 3);
    for (let l = 0; l < lines; l++) {
      let y = (l / (lines - 1) - 0.5) * 7;
      const z = -9 - Math.random() * 9;
      const vol = 0.04 + Math.random() * 0.08;
      for (let i = 0; i < per; i++) {
        y += (Math.random() - 0.5) * vol * 2 + Math.sin(i * 0.02 + l) * 0.004;
        const idx = (l * per + i) * 3;
        pos[idx] = (i / per - 0.5) * 26;
        pos[idx + 1] = y;
        pos[idx + 2] = z + (Math.random() - 0.5) * 0.15;
      }
    }
    this.particleBase = pos.slice();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dc = document.createElement("canvas");
    dc.width = dc.height = 64;
    const dg = dc.getContext("2d")!;
    const grad = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.8)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    dg.fillStyle = grad;
    dg.fillRect(0, 0, 64, 64);
    const dot = new THREE.CanvasTexture(dc);
    this.particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xffe2a8, size: 0.09, map: dot, alphaTest: 0.01, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.scene.add(this.particles);
  }

  setPointer(nx: number, ny: number) {
    this.pointer.tx = nx;
    this.pointer.ty = ny;
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.updateBump();
  }

  /** Screen positions (CSS px) of each labelled layer, for the HTML labels. */
  labelPositions() {
    const v = new THREE.Vector3();
    return LAYER_LABELS.map((l) => {
      this.layers[l.key].getWorldPosition(v);
      v.y += 1.05 * this.mech.scale.x * (this.portrait ? 0 : 1);
      v.x += this.portrait ? 1.05 * this.mech.scale.x : 0;
      v.project(this.camera);
      return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, visible: v.z < 1 };
    });
  }

  get portrait() {
    return this.width / this.height < 0.85;
  }

  private updateBump() {
    if (this.faceMat) this.faceMat.bumpScale = Math.max(1.5, (6 * Math.min(this.width, this.height) * this.dpr) / 900);
  }

  /** Lowers resolution when frames are slow, so low-end devices stay smooth. */
  private adapt() {
    const now = performance.now();
    if (this.lastFrame) this.frameTimes.push(now - this.lastFrame);
    this.lastFrame = now;
    if (this.frameTimes.length < 30) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes = [];
    if (avg > 34 && this.dpr > 0.6) {
      this.dpr = Math.max(0.6, this.dpr * 0.75);
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(this.width, this.height, false);
      this.updateBump();
    }
  }

  render() {
    this.adapt();
    const t = this.clock.getElapsedTime();
    const p = this.p;
    const portrait = this.portrait;

    // Chapter weights
    const explode = ease(seg(p, 0.05, 0.95)) * (1 - ease(seg(p, 2.1, 2.9)));
    const turn = ease(seg(p, 0.05, 0.95)) * (1 - ease(seg(p, 1.05, 1.6)));
    const dive = ease(seg(p, 1.1, 1.95)) * (1 - ease(seg(p, 2.05, 2.8)));
    const inside = seg(p, 1.55, 1.95) * (1 - seg(p, 2.05, 2.45));
    const final = ease(seg(p, 2.2, 3));

    // Layer stacking
    for (const [k, [closed, open]] of Object.entries(VaultScene.STACK)) {
      const L = this.layers[k];
      L.position.z = lerp(closed, open, explode);
      // During the dive the solid plates slide out of the way.
      const away = dive * (k === "face" ? 1 : k === "back" ? -1 : 0);
      L.position.y = away * 3.2;
      L.visible = !(k === "core" && dive > 0.45);
      if (k === "core") L.scale.setScalar(0.25 + 0.75 * explode);
    }

    // Mechanism orientation
    const sway = Math.sin(t * 0.5) * 0.12 * (1 - turn) * (1 - dive);
    const side = 1;
    this.mech.rotation.y = lerp(sway + 0.15 * (1 - final) - 0.1, -1.1, turn * side) + t * 0.0;
    this.mech.rotation.x = lerp(Math.cos(t * 0.4) * 0.06, 1.05, turn * (1 - side));
    this.mech.rotation.z = turn * (portrait ? 0 : 0.08);
    const scale = portrait ? 0.82 : 1;
    this.mech.scale.setScalar(scale * lerp(1, 1.15, dive) * lerp(1, portrait ? 0.5 : 0.74, turn) * lerp(1, portrait ? 0.62 : 1, final));
    this.mech.position.x = portrait ? 0.12 * turn : (1 - final) * (0.95 * (1 - turn) + 0.75 * turn) + 1.25 * final;
    this.mech.position.y = portrait ? lerp(0.35, 1.45, final) - 1.05 * turn : -0.18 * turn;

    // Moving parts
    this.layers.gear.rotation.z = t * 0.15 + p * 0.8;
    this.layers.dial.rotation.z = -t * 0.05 - p * 0.4;
    this.smallGears.forEach((g, i) => (g.rotation.z = (i % 2 ? -1 : 1) * (t * 0.9 + p * 2)));
    (this.core.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8 + Math.sin(t * 2) * 0.5 + final * 0.8;

    // Camera: frame the coin, then fly through the rings
    const baseZ = portrait ? 8.2 : 6;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.05;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.05;
    this.camera.position.set(this.pointer.x * 0.25 * (1 - dive), -this.pointer.y * 0.18 * (1 - dive), lerp(baseZ, -5.5, dive));
    this.camera.lookAt(this.pointer.x * 0.1 * (1 - dive), 0, lerp(0, -12, dive));

    // Particle world
    const mat = this.particles.material as THREE.PointsMaterial;
    mat.opacity = inside;
    this.particles.visible = mat.opacity > 0.01;
    if (this.particles.visible) {
      const arr = this.particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        let x = this.particleBase[i] - ((t * 0.6 + p * 3) % 26);
        if (x < -13) x += 26;
        arr[i] = x;
        arr[i + 1] = this.particleBase[i + 1] + Math.sin(t * 0.8 + this.particleBase[i] * 0.4) * 0.05;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.rotation.z = Math.sin(t * 0.1) * 0.03;
    }
    this.mech.visible = !(dive > 0.97);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((mm) => mm.dispose());
    });
    this.renderer.dispose();
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
