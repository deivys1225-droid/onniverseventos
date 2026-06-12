import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { OnniAvatarState } from "@/components/OnniAvatar";

type OnniAvatarDotsProps = {
  size?: "sm" | "md" | "lg" | "hero";
  state?: OnniAvatarState;
  className?: string;
  title?: string;
};

const sizeBox = {
  sm: "h-12 w-12",
  md: "h-[72px] w-[72px]",
  lg: "h-[96px] w-[96px]",
  hero: "h-[240px] w-[240px]",
} as const;

const CANVAS_PX_BY_SIZE = {
  sm: 96,
  md: 144,
  lg: 192,
  hero: 240,
} as const;

type Vec3 = { x: number; y: number; z: number };

const PARTICLE_COUNT = 168;
const SPARKLE_COUNT = 104;
const MORPH_MS = 5200;
const WORLD_SCALE = 0.36;
/** Margen interno del canvas para brillo, wobble y rotación sin recorte */
const CANVAS_INSET_RATIO = 0.12;
/** Tiempo en cada figura antes de empezar a transformarse */
const HOLD_RATIO = 0.74;

function vecLen(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z) || 1;
}

function sortBySpherical(pts: Vec3[]): Vec3[] {
  return [...pts].sort((a, b) => {
    const la = vecLen(a);
    const lb = vecLen(b);
    const pa = Math.acos(Math.max(-1, Math.min(1, a.y / la)));
    const pb = Math.acos(Math.max(-1, Math.min(1, b.y / lb)));
    if (Math.abs(pa - pb) > 0.0001) return pa - pb;
    return Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x);
  });
}

function scaleToFit(pts: Vec3[], target = 0.9): Vec3[] {
  let maxR = 0;
  for (const p of pts) maxR = Math.max(maxR, vecLen(p));
  if (maxR < 0.001) return pts;
  const s = target / maxR;
  return pts.map((p) => ({ x: p.x * s, y: p.y * s, z: p.z * s }));
}

function buildSphere(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  const r = 0.9;
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    pts.push({ x: Math.cos(theta) * ring * r, y: y * r, z: Math.sin(theta) * ring * r });
  }
  return pts;
}

function buildCube(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const half = 0.82;
  const perFace = Math.ceil(count / 6);
  const grid = Math.ceil(Math.sqrt(perFace));

  for (let face = 0; face < 6 && pts.length < count; face += 1) {
    for (let gi = 0; gi < grid && pts.length < count; gi += 1) {
      for (let gj = 0; gj < grid && pts.length < count; gj += 1) {
        const a = grid === 1 ? 0 : (gi / (grid - 1)) * 2 - 1;
        const b = grid === 1 ? 0 : (gj / (grid - 1)) * 2 - 1;
        switch (face) {
          case 0:
            pts.push({ x: a * half, y: b * half, z: half });
            break;
          case 1:
            pts.push({ x: a * half, y: b * half, z: -half });
            break;
          case 2:
            pts.push({ x: half, y: a * half, z: b * half });
            break;
          case 3:
            pts.push({ x: -half, y: a * half, z: b * half });
            break;
          case 4:
            pts.push({ x: a * half, y: half, z: b * half });
            break;
          default:
            pts.push({ x: a * half, y: -half, z: b * half });
        }
      }
    }
  }

  while (pts.length < count) {
    const t = pts.length;
    const edge = t % 12;
    const u = (edge / 12) * Math.PI * 2;
    pts.push({ x: Math.cos(u) * half, y: Math.sin(u * 2) * half * 0.3, z: Math.sin(u) * half });
  }

  return sortBySpherical(pts.slice(0, count));
}

function buildTorus(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const R = 0.56;
  const r = 0.24;
  const uSteps = Math.ceil(Math.sqrt(count * (R / r)));
  const vSteps = Math.ceil(count / uSteps);

  for (let ui = 0; ui < uSteps && pts.length < count; ui += 1) {
    for (let vi = 0; vi < vSteps && pts.length < count; vi += 1) {
      const u = (ui / uSteps) * Math.PI * 2;
      const v = (vi / vSteps) * Math.PI * 2;
      pts.push({
        x: (R + r * Math.cos(v)) * Math.cos(u),
        y: r * Math.sin(v),
        z: (R + r * Math.cos(v)) * Math.sin(u),
      });
    }
  }

  while (pts.length < count) {
    const i = pts.length;
    const u = (i / count) * Math.PI * 2;
    const v = ((i * 0.618) % 1) * Math.PI * 2;
    pts.push({
      x: (R + r * Math.cos(v)) * Math.cos(u),
      y: r * Math.sin(v),
      z: (R + r * Math.cos(v)) * Math.sin(u),
    });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function buildHelix(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const turns = 2.5;
  const height = 1.72;
  const helixR = 0.42;
  const strandQuota = Math.floor(count * 0.34);
  const rungSteps = 5;

  for (let strand = 0; strand < 2; strand += 1) {
    for (let i = 0; i < strandQuota; i += 1) {
      const t = i / Math.max(strandQuota - 1, 1);
      const angle = t * Math.PI * 2 * turns + strand * Math.PI;
      const y = t * height - height / 2;
      pts.push({
        x: Math.cos(angle) * helixR,
        y,
        z: Math.sin(angle) * helixR,
      });
    }
  }

  const rungSlots = Math.max(8, Math.floor((count - pts.length) / rungSteps));
  for (let ri = 0; ri < rungSlots && pts.length < count; ri += 1) {
    const t = (ri + 0.5) / rungSlots;
    const angle = t * Math.PI * 2 * turns;
    const y = t * height - height / 2;
    const ax = Math.cos(angle) * helixR;
    const az = Math.sin(angle) * helixR;
    const bx = Math.cos(angle + Math.PI) * helixR;
    const bz = Math.sin(angle + Math.PI) * helixR;

    for (let step = 0; step <= rungSteps && pts.length < count; step += 1) {
      const u = step / rungSteps;
      pts.push({
        x: ax + (bx - ax) * u,
        y,
        z: az + (bz - az) * u,
      });
    }
  }

  while (pts.length < count) {
    const t = pts.length / count;
    const angle = t * Math.PI * 2 * turns;
    const y = t * height - height / 2;
    pts.push({
      x: Math.cos(angle) * helixR * 0.55,
      y,
      z: Math.sin(angle) * helixR * 0.55,
    });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function trianglePoint(a: Vec3, b: Vec3, c: Vec3, u: number, v: number): Vec3 {
  const w = 1 - u - v;
  return {
    x: a.x * w + b.x * u + c.x * v,
    y: a.y * w + b.y * u + c.y * v,
    z: a.z * w + b.z * u + c.z * v,
  };
}

function fillTriangle(
  pts: Vec3[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  count: number,
  max: number,
): void {
  const grid = Math.ceil(Math.sqrt(count * 2));
  for (let gi = 0; gi < grid && pts.length < max; gi += 1) {
    for (let gj = 0; gj < grid && pts.length < max; gj += 1) {
      const u = grid === 1 ? 0 : gi / (grid - 1);
      const v = grid === 1 ? 0 : gj / (grid - 1);
      if (u + v > 1) continue;
      pts.push(trianglePoint(a, b, c, u, v));
    }
  }
}

function buildPyramid(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const b = 0.78;
  const baseY = -0.52;
  const apex: Vec3 = { x: 0, y: 0.88, z: 0 };
  const corners = [
    { x: -b, z: -b },
    { x: b, z: -b },
    { x: b, z: b },
    { x: -b, z: b },
  ];

  const baseQuota = Math.floor(count * 0.22);
  const grid = Math.ceil(Math.sqrt(baseQuota));
  for (let gi = 0; gi < grid && pts.length < baseQuota; gi += 1) {
    for (let gj = 0; gj < grid && pts.length < baseQuota; gj += 1) {
      const a = grid === 1 ? 0 : (gi / (grid - 1)) * 2 - 1;
      const c = grid === 1 ? 0 : (gj / (grid - 1)) * 2 - 1;
      pts.push({ x: a * b, y: baseY, z: c * b });
    }
  }

  const sideQuota = Math.ceil((count - pts.length) / 4);
  for (let face = 0; face < 4 && pts.length < count; face += 1) {
    const c0 = corners[face]!;
    const c1 = corners[(face + 1) % 4]!;
    const p0: Vec3 = { x: c0.x, y: baseY, z: c0.z };
    const p1: Vec3 = { x: c1.x, y: baseY, z: c1.z };
    fillTriangle(pts, p0, p1, apex, sideQuota, count);
  }

  while (pts.length < count) {
    const t = pts.length / count;
    pts.push({ x: Math.cos(t * 9) * b * 0.4, y: baseY + t * 1.3, z: Math.sin(t * 9) * b * 0.4 });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function buildOctahedron(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const top: Vec3 = { x: 0, y: 0.88, z: 0 };
  const bottom: Vec3 = { x: 0, y: -0.88, z: 0 };
  const px: Vec3 = { x: 0.78, y: 0, z: 0 };
  const nx: Vec3 = { x: -0.78, y: 0, z: 0 };
  const pz: Vec3 = { x: 0, y: 0, z: 0.78 };
  const nz: Vec3 = { x: 0, y: 0, z: -0.78 };

  const faces: [Vec3, Vec3, Vec3][] = [
    [top, px, pz],
    [top, pz, nx],
    [top, nx, nz],
    [top, nz, px],
    [bottom, pz, px],
    [bottom, nx, pz],
    [bottom, nz, nx],
    [bottom, px, nz],
  ];

  const perFace = Math.ceil(count / faces.length);
  for (const [a, b, c] of faces) {
    if (pts.length >= count) break;
    fillTriangle(pts, a, b, c, perFace, count);
  }

  while (pts.length < count) {
    const t = pts.length / count;
    const a = t * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 0.55, y: Math.sin(t * 14) * 0.75, z: Math.sin(a) * 0.55 });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function buildCone(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const apexY = 0.88;
  const baseY = -0.52;
  const baseR = 0.74;

  const ringCount = Math.floor(count * 0.28);
  for (let i = 0; i < ringCount; i += 1) {
    const a = (i / ringCount) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * baseR, y: baseY, z: Math.sin(a) * baseR });
  }

  const sideCount = count - ringCount;
  const rings = Math.max(2, Math.ceil(Math.sqrt(sideCount)));
  for (let ri = 1; ri <= rings && pts.length < count; ri += 1) {
    const t = ri / rings;
    const y = baseY + (apexY - baseY) * t;
    const r = baseR * (1 - t);
    const onRing = Math.ceil(sideCount / rings);
    for (let ai = 0; ai < onRing && pts.length < count; ai += 1) {
      const a = (ai / onRing) * Math.PI * 2 + t * 0.6;
      pts.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r });
    }
  }

  while (pts.length < count) {
    const t = pts.length / count;
    const y = baseY + (apexY - baseY) * t;
    const r = baseR * (1 - t) * 0.85;
    pts.push({ x: Math.cos(t * 16) * r, y, z: Math.sin(t * 16) * r });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function buildGalaxy(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const arms = 3;
  const coreQuota = Math.floor(count * 0.14);

  for (let i = 0; i < coreQuota; i += 1) {
    const t = i / Math.max(coreQuota - 1, 1);
    const r = t * 0.2;
    const a = t * Math.PI * 7;
    pts.push({
      x: Math.cos(a) * r,
      y: Math.sin(t * 15) * 0.07,
      z: Math.sin(a) * r,
    });
  }

  const armQuota = count - coreQuota;
  const perArm = Math.ceil(armQuota / arms);
  const turns = 2.6;

  for (let arm = 0; arm < arms; arm += 1) {
    const armPhase = (arm / arms) * Math.PI * 2;
    for (let i = 0; i < perArm && pts.length < count; i += 1) {
      const t = (i + 1) / perArm;
      const radius = 0.18 + t * 0.74;
      const angle = armPhase + t * Math.PI * 2 * turns;
      const lift = (t - 0.5) * 0.42;
      const wobbleY = Math.sin(t * 11 + arm * 1.7) * 0.05 * (1 - t * 0.35);
      pts.push({
        x: Math.cos(angle) * radius,
        y: lift + wobbleY,
        z: Math.sin(angle) * radius,
      });
    }
  }

  while (pts.length < count) {
    const t = pts.length / count;
    const radius = 0.22 + t * 0.58;
    const angle = t * Math.PI * 2 * 3.2;
    pts.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(t * 9) * 0.18,
      z: Math.sin(angle) * radius,
    });
  }

  return sortBySpherical(scaleToFit(pts.slice(0, count), 0.9));
}

function addStrokePoints(
  pts: Vec3[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  n: number,
  max: number,
  zBase = 0,
): void {
  for (let i = 0; i < n && pts.length < max; i += 1) {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    pts.push({
      x: ax + (bx - ax) * t,
      y: ay + (by - ay) * t,
      z: zBase + Math.sin(pts.length * 0.91) * 0.01,
    });
  }
}

function addThickStroke(
  pts: Vec3[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  n: number,
  max: number,
): void {
  for (const zBase of [-0.055, 0, 0.055]) {
    addStrokePoints(pts, ax, ay, bx, by, n, max, zBase);
  }
}

/** Yod paleo (𐤉): tallo con brazos superiores. */
function addPaleoYod(pts: Vec3[], cx: number, segN: number, max: number): void {
  addThickStroke(pts, cx, -0.18, cx, 0.28, segN, max);
  addThickStroke(pts, cx, 0.18, cx - 0.14, 0.44, Math.max(5, Math.ceil(segN * 0.55)), max);
  addThickStroke(pts, cx, 0.18, cx + 0.14, 0.44, Math.max(5, Math.ceil(segN * 0.55)), max);
}

/** He paleo (𐤄): ventana con travesaño bajo. */
function addPaleoHe(pts: Vec3[], cx: number, hw: number, hh: number, segN: number, max: number): void {
  addThickStroke(pts, cx - hw, -hh, cx - hw, hh, segN, max);
  addThickStroke(pts, cx - hw, hh, cx + hw, hh, segN, max);
  addThickStroke(pts, cx + hw, hh, cx + hw, hh * 0.08, segN, max);
  addThickStroke(pts, cx - hw, -hh * 0.08, cx + hw, -hh * 0.08, segN, max);
}

/** Vav paleo (𐤅): clavo vertical con gancho. */
function addPaleoVav(pts: Vec3[], cx: number, hh: number, segN: number, max: number): void {
  addThickStroke(pts, cx, -hh, cx, hh * 0.82, segN, max);
  addThickStroke(pts, cx, hh * 0.82, cx - hh * 0.34, hh, Math.max(6, Math.ceil(segN * 0.55)), max);
}

/** Palabra יהוה en hebreo paleo/arcaico, de derecha a izquierda, una sola figura. */
function buildArchaicHebrewWord(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const hh = 0.46;
  const hw = 0.15;
  const nHe = Math.ceil(count * 0.19);
  const nVav = Math.ceil(count * 0.17);
  const nYod = Math.ceil(count * 0.13);

  addPaleoYod(pts, 0.6, nYod, count);
  addPaleoHe(pts, 0.2, hw, hh, nHe, count);
  addPaleoVav(pts, -0.2, hh, nVav, count);
  addPaleoHe(pts, -0.6, hw, hh, nHe, count);

  while (pts.length < count) {
    const src = pts[pts.length % Math.max(pts.length, 1)]!;
    const t = pts.length / count;
    pts.push({
      x: src.x + Math.sin(t * 17) * 0.008,
      y: src.y + Math.cos(t * 11) * 0.006,
      z: src.z,
    });
  }

  return scaleToFit(pts.slice(0, count), 0.9);
}

/** Puntitos pequeños alrededor de las figuras (no morphan; efecto brillo). */
function buildSparkleCloud(count: number): Vec3[] {
  const pts: Vec3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i * 1.07;
    const r = 0.72 + ((i * 0.137) % 0.42);
    pts.push({
      x: Math.cos(theta) * ring * r,
      y: y * r * 0.88 + Math.sin(i * 1.41) * 0.07,
      z: Math.sin(theta) * ring * r,
    });
  }
  return pts;
}

const GEOMETRIC_SHAPE_COUNT = 8;
const ARCHAIC_HEBREW_WORD_INDEX = GEOMETRIC_SHAPE_COUNT;

const SHAPES: Vec3[][] = [
  ...[
    buildSphere,
    buildCube,
    buildTorus,
    buildHelix,
    buildPyramid,
    buildOctahedron,
    buildCone,
    buildGalaxy,
  ].map((fn) => sortBySpherical(fn(PARTICLE_COUNT))),
  buildArchaicHebrewWord(PARTICLE_COUNT),
];

const SPARKLES = buildSparkleCloud(SPARKLE_COUNT);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** 0 = figura pura; sube solo en la ventana final del ciclo */
function morphBlendT(localT: number): number {
  if (localT < HOLD_RATIO) return 0;
  return easeInOut((localT - HOLD_RATIO) / (1 - HOLD_RATIO));
}

function morphShapes(from: Vec3[], to: Vec3[], t: number): Vec3[] {
  if (t <= 0) return from;
  if (t >= 1) return to;
  return from.map((p, i) => {
    const q = to[i] ?? p;
    return {
      x: lerp(p.x, q.x, t),
      y: lerp(p.y, q.y, t),
      z: lerp(p.z, q.z, t),
    };
  });
}

function wobble(p: Vec3, i: number, elapsed: number, morphing: boolean, ampScale = 1): Vec3 {
  const t = elapsed * 0.0016;
  const amp = (morphing ? 0.028 : 0.006) * ampScale;
  return {
    x: p.x + Math.sin(t + i * 0.73) * amp,
    y: p.y + Math.cos(t * 1.07 + i * 0.51) * amp,
    z: p.z + Math.sin(t * 0.89 + i * 0.37) * amp,
  };
}

function projectPoint(
  p: Vec3,
  i: number,
  elapsed: number,
  morphing: boolean,
  rotY: number,
  rotX: number,
  rotZ: number,
  ampScale = 1,
) {
  let v = wobble(p, i, elapsed, morphing, ampScale);
  v = rotateY(v, rotY);
  v = rotateX(v, rotX);
  v = rotateZ(v, rotZ);
  const depth = 2.6 / (2.6 + v.z);
  return { x: v.x * depth, y: v.y * depth, z: v.z, depth };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

const AURORA_RAY_COUNT = 18;
const AURORA_RIBBON_COUNT = 4;

/** Líneas aurora blancas desde el centro — visibles sobre y alrededor de la figura. */
function drawAuroraRays(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  shapeRadius: number,
  canvasRadius: number,
  elapsed: number,
  state: OnniAvatarState,
) {
  const baseAlpha =
    state === "listening" ? 0.82 : state === "speaking" ? 0.76 : 0.62;
  const rot = elapsed * 0.00028;
  const pulse = 1 + Math.sin(elapsed * 0.0018) * 0.08;
  const maxLen = canvasRadius * 0.92 * pulse;
  const innerStart = shapeRadius * 0.12;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
  ctx.shadowBlur = 10;

  for (let i = 0; i < AURORA_RAY_COUNT; i += 1) {
    const phase = i * 2.173 + elapsed * 0.00085;
    const angle =
      rot + (i / AURORA_RAY_COUNT) * Math.PI * 2 + Math.sin(phase) * 0.16;
    const len = maxLen * (0.78 + Math.sin(elapsed * 0.0011 + i * 1.63) * 0.2);
    const waveAmp = maxLen * 0.055 * (0.7 + Math.sin(phase * 1.3) * 0.3);
    const perp = angle + Math.PI / 2;

    const startX = cx + Math.cos(angle) * innerStart;
    const startY = cy + Math.sin(angle) * innerStart;
    const endX = cx + Math.cos(angle) * len;
    const endY = cy + Math.sin(angle) * len;
    const midDist = innerStart + (len - innerStart) * 0.52;
    const wave = Math.sin(elapsed * 0.0022 + i * 0.91) * waveAmp;
    const midX = cx + Math.cos(angle) * midDist + Math.cos(perp) * wave;
    const midY = cy + Math.sin(angle) * midDist + Math.sin(perp) * wave;

    const rayAlpha = baseAlpha * (0.78 + Math.sin(elapsed * 0.0016 + i * 0.55) * 0.22);
    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, `rgba(255, 255, 255, ${rayAlpha * 0.35})`);
    grad.addColorStop(0.18, `rgba(255, 255, 255, ${rayAlpha * 0.95})`);
    grad.addColorStop(0.55, `rgba(255, 255, 255, ${rayAlpha * 0.55})`);
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.strokeStyle = grad;
    ctx.lineWidth = i % 3 === 0 ? 1.6 : 1.05;
    ctx.globalAlpha = 0.92;
    ctx.globalCompositeOperation = "screen";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.globalAlpha = 0.38;
    ctx.lineWidth = (i % 3 === 0 ? 1.6 : 1.05) + 2.5;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = `rgba(255, 255, 255, ${rayAlpha * 0.5})`;
    ctx.stroke();
    ctx.shadowBlur = 10;
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 8;

  for (let r = 0; r < AURORA_RIBBON_COUNT; r += 1) {
    const ribbonPhase = elapsed * 0.0005 + r * 2.07;
    const ribbonAlpha = baseAlpha * 0.72;
    const segments = 32;

    ctx.beginPath();
    for (let s = 0; s <= segments; s += 1) {
      const t = s / segments;
      const radius = innerStart + (maxLen - innerStart) * (0.15 + t * 0.85);
      const a =
        ribbonPhase +
        t * (1.85 + r * 0.42) +
        Math.sin(t * 7 + ribbonPhase * 2) * 0.28;
      const drift = Math.sin(t * 9 + elapsed * 0.0014 + r) * maxLen * 0.06;
      const x = cx + Math.cos(a) * radius + Math.cos(a + Math.PI / 2) * drift;
      const y = cy + Math.sin(a) * radius + Math.sin(a + Math.PI / 2) * drift;
      if (s === 0) ctx.moveTo(cx + Math.cos(a) * innerStart, cy + Math.sin(a) * innerStart);
      else ctx.lineTo(x, y);
    }

    const tailAngle = ribbonPhase + 1.85 + r * 0.42;
    const tailX = cx + Math.cos(tailAngle) * maxLen * 0.88;
    const tailY = cy + Math.sin(tailAngle) * maxLen * 0.88;
    const ribbonGrad = ctx.createLinearGradient(cx, cy, tailX, tailY);
    ribbonGrad.addColorStop(0, `rgba(255, 255, 255, ${ribbonAlpha * 0.4})`);
    ribbonGrad.addColorStop(0.35, `rgba(255, 255, 255, ${ribbonAlpha * 0.85})`);
    ribbonGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.strokeStyle = ribbonGrad;
    ctx.lineWidth = 1.15;
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.88;
    ctx.stroke();
  }

  ctx.restore();
}

/** Morph: Esfera → … → Galaxia → יהוה (paleo) → Esfera… */
export default function OnniAvatarDots({
  size = "md",
  state = "idle",
  className,
  title = "Onni",
}: OnniAvatarDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let canvasPx = CANVAS_PX_BY_SIZE[size];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const syncCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const cssSize = Math.round(Math.min(rect.width, rect.height));
      canvasPx = Math.max(1, cssSize || CANVAS_PX_BY_SIZE[size]);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvasPx * dpr;
      canvas.height = canvasPx * dpr;
      canvas.style.width = `${canvasPx}px`;
      canvas.style.height = `${canvasPx}px`;
    };

    syncCanvasSize();
    const resizeObserver = new ResizeObserver(syncCanvasSize);
    resizeObserver.observe(container);

    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = now - start;
      const morphSpeed =
        stateRef.current === "listening" ? 0.9 : stateRef.current === "speaking" ? 1.08 : 1;

      const cycle = (elapsed * morphSpeed) / MORPH_MS;
      const shapeIndex = ((Math.floor(cycle) % SHAPES.length) + SHAPES.length) % SHAPES.length;
      const nextIndex = (shapeIndex + 1) % SHAPES.length;
      const localT = cycle - Math.floor(cycle);
      const blendT = morphBlendT(localT);
      const morphing = blendT > 0.02;

      const base = morphShapes(SHAPES[shapeIndex]!, SHAPES[nextIndex]!, blendT);

      const showingArchaicWord =
        (shapeIndex === ARCHAIC_HEBREW_WORD_INDEX && blendT < 0.35) ||
        (nextIndex === ARCHAIC_HEBREW_WORD_INDEX && blendT > 0.65);
      const rotY = showingArchaicWord ? elapsed * 0.00012 : elapsed * 0.00062 * morphSpeed;
      const rotX = showingArchaicWord ? 0.05 : 0.52 + Math.sin(elapsed * 0.00041) * 0.28;
      const rotZ = showingArchaicWord ? 0 : 0.18 + Math.sin(elapsed * 0.00033 + 1.2) * 0.14;

      const projected = base.map((p, i) => ({
        ...projectPoint(p, i, elapsed, morphing, rotY, rotX, rotZ),
        kind: "main" as const,
        index: i,
      }));

      const sparkles = SPARKLES.map((p, i) => ({
        ...projectPoint(p, i + 1000, elapsed, morphing, rotY, rotX, rotZ, 1.35),
        kind: "sparkle" as const,
        index: i,
      }));

      const allPts = [...projected, ...sparkles].sort((a, b) => a.z - b.z);

      const w = canvasPx;
      const h = canvasPx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const inset = w * CANVAS_INSET_RATIO;
      const scale = (w - inset * 2) * WORLD_SCALE;
      const pulse =
        stateRef.current === "speaking" ? 1 + Math.sin(elapsed * 0.012) * 0.05 : 1;

      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.95);
      halo.addColorStop(0, "rgba(34, 211, 238, 0.12)");
      halo.addColorStop(1, "rgba(34, 211, 238, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      for (const pt of allPts) {
        const px = cx + pt.x * scale * pulse;
        const py = cy + pt.y * scale * pulse;
        const depthNorm = (pt.z + 1.15) / 2.3;

        if (pt.kind === "sparkle") {
          const twinkle = 0.42 + Math.sin(elapsed * 0.0055 + pt.index * 1.83) * 0.28;
          const radius = Math.max(
            0.38,
            (0.48 + pt.depth * 0.75) * twinkle * (stateRef.current === "listening" ? 1.08 : 1),
          );
          const alpha = Math.max(0.18, (0.22 + depthNorm * 0.35) * twinkle);
          const g = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.2);
          g.addColorStop(0, `rgba(236, 254, 255, ${alpha})`);
          g.addColorStop(0.5, `rgba(34, 211, 238, ${alpha * 0.75})`);
          g.addColorStop(1, "rgba(99, 102, 241, 0)");
          ctx.beginPath();
          ctx.fillStyle = g;
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        const radius = Math.max(
          0.72,
          (0.9 + pt.depth * 1.45) * (stateRef.current === "listening" ? 1.12 : 1),
        );
        const alpha = Math.max(0.38, 0.4 + depthNorm * 0.52);
        const g = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.4);
        g.addColorStop(0, `rgba(224, 254, 255, ${alpha})`);
        g.addColorStop(0.45, `rgba(34, 211, 238, ${alpha * 0.88})`);
        g.addColorStop(1, "rgba(99, 102, 241, 0)");
        ctx.beginPath();
        ctx.fillStyle = g;
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      drawAuroraRays(
        ctx,
        cx,
        cy,
        scale * pulse,
        Math.min(w, h) / 2 - inset * 0.35,
        elapsed,
        stateRef.current,
      );

      const coreR = Math.max(2, 2.1 * pulse * (stateRef.current === "listening" ? 1.15 : 1));
      ctx.beginPath();
      ctx.fillStyle = "rgba(34, 211, 238, 0.92)";
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "rgba(236, 254, 255, 0.85)";
      ctx.arc(cx, cy, coreR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [size]);

  return (
    <div
      className={cn("onni-dots-avatar relative shrink-0 overflow-visible", sizeBox[size], className)}
      data-state={state}
      role="img"
      aria-label={title}
    >
      <canvas
        ref={canvasRef}
        className="onni-dots-avatar__canvas block max-h-full max-w-full"
        aria-hidden
      />
    </div>
  );
}
