import type { RaceState } from './engine';
import { track, trackPoint } from './track';

export type PetImages = HTMLImageElement[];
type TireMark = { x: number; y: number; angle: number; age: number; grass: boolean; strength: number };
export type RaceEffects = { marks: TireMark[]; stamp: number };
export const palette = { paper: '#f7eddf', grass: '#cbd4a7', dark: '#654653', road: '#9b8996', pink: '#d46d96', cream: '#fff2da' };
const carColors = ['#da7297', '#a695c4', '#8ba999', '#d7a366'];
const rect = (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
function heart(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, s = 2) {
  rect(ctx, color, x + s, y, s * 2, s); rect(ctx, color, x + s * 4, y, s * 2, s);
  rect(ctx, color, x, y + s, s * 7, s * 2); rect(ctx, color, x + s, y + s * 3, s * 5, s); rect(ctx, color, x + s * 2, y + s * 4, s * 3, s); rect(ctx, color, x + s * 3, y + s * 5, s, s);
}
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color = palette.dark) {
  ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.fillText(value, x, y);
}
function tree(ctx: CanvasRenderingContext2D, x: number, y: number, pink: boolean) {
  rect(ctx, '#b9c29f', x - 13, y + 21, 39, 8); rect(ctx, '#a68b76', x, y, 7, 26);
  const c = pink ? '#e5b3be' : '#b1c297', shade = pink ? '#cf9fae' : '#9dae87';
  rect(ctx, shade, x - 18, y - 16, 44, 32); rect(ctx, c, x - 23, y - 28, 47, 31); rect(ctx, c, x - 12, y - 36, 27, 10);
  rect(ctx, pink ? '#f4d2ce' : '#c4d0aa', x - 15, y - 25, 10, 5); rect(ctx, pink ? '#f4d2ce' : '#c4d0aa', x + 6, y - 12, 7, 5);
}
export function drawGrandstand(ctx: CanvasRenderingContext2D, pets: PetImages, clock: number, reduced: boolean) {
  rect(ctx, '#bac5a5', 298, 129, 290, 13);
  rect(ctx, '#bd98a3', 300, 70, 280, 62); rect(ctx, '#e8c3c6', 296, 66, 288, 15);
  for (let row = 0; row < 3; row++) { rect(ctx, '#f6ddcf', 300, 85 + row * 17, 280, 5); for (let col = 0; col < 17; col++) rect(ctx, '#b58c9a', 310 + col * 16, 91 + row * 17, 8, 7); }
  pets.forEach((pet, i) => {
    const bounce = reduced ? 0 : Math.round(Math.sin(clock * 4 + i * 1.7) * 3) * 2;
    const size = i === 3 ? 37 : 80;
    const scale = size / Math.max(pet.naturalWidth, pet.naturalHeight);
    const width = pet.naturalWidth * scale, height = pet.naturalHeight * scale;
    ctx.drawImage(pet, (i === 3 ? 542 : 310 + i * 91) + (size - width) / 2, (i === 3 ? 91 : 18) + bounce * (i === 3 ? .5 : 1) + size - height, width, height);
    if (i === 3) return;
    const fx = 320 + i * 91;
    rect(ctx, '#a58381', fx, 90, 2, 25); rect(ctx, ['#d97d9c', '#b1a1cb', '#e5c183'][i], fx + 2, 90, 17, 12);
  });
  rect(ctx, '#fff0db', 309, 132, 262, 14); text(ctx, '♥  ♥  ♥', 440, 144, 12, '#b66b85');
}

export function createScenery(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 620;
  const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  rect(ctx, palette.grass, 0, 0, 960, 620);
  // Deterministic pixel clusters keep the world calm and don't shimmer between frames.
  for (let i = 0; i < 760; i++) {
    const x = (i * 137 + i * i * 17) % 960, y = (i * 83 + i * i * 11) % 620;
    rect(ctx, i % 3 ? '#cad3ac' : '#e2e3c3', x, y, 3 + i % 3, 2);
    if (i % 23 === 0) { rect(ctx, '#f7e7d3', x, y - 2, 5, 5); rect(ctx, '#dca8af', x + 2, y, 2, 2); }
  }
  const path = () => { ctx.beginPath(); track.line.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); };
  path(); ctx.strokeStyle = '#b9bf9d'; ctx.lineWidth = track.width + 22; ctx.lineJoin = 'round'; ctx.stroke();
  path(); ctx.strokeStyle = '#fcf0d9'; ctx.lineWidth = track.width + 12; ctx.stroke();
  for (let d = 0; d < track.length; d += 13) {
    const p = trackPoint(d); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); rect(ctx, Math.floor(d / 13) % 2 ? '#fff1dc' : '#d899aa', -7, -track.width / 2 - 6, 15, track.width + 12); ctx.restore();
  }
  path(); ctx.strokeStyle = palette.road; ctx.lineWidth = track.width - 5; ctx.stroke();
  path(); ctx.strokeStyle = '#c8b7b8'; ctx.lineWidth = 2; ctx.setLineDash([11, 18]); ctx.stroke(); ctx.setLineDash([]);
  for (let d = 140; d < track.length; d += 230) { const p = trackPoint(d); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.strokeStyle = '#e6cfd6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(3, 0); ctx.lineTo(-5, 7); ctx.stroke(); ctx.restore(); }
  // A visible finish line spans the circuit, not the entire scene.
  const start = trackPoint(0); ctx.save(); ctx.translate(start.x, start.y); ctx.rotate(start.angle);
  for (let row = 0; row < 10; row++) for (let col = 0; col < 2; col++) rect(ctx, (row + col) % 2 ? '#785f68' : '#fff2df', col * 7 - 7, row * 8 - 40, 7, 8);
  ctx.restore();
  // Inside the circuit: picnic-coloured flowers and a tiny chequered race emblem.
  rect(ctx, '#c4cfa7', 302, 303, 296, 61); rect(ctx, '#dfe2c1', 309, 296, 282, 60);
  text(ctx, 'GRAND PRIX', 450, 331, 24, '#929e7d');
  heart(ctx, 319, 317, '#d7a4af'); heart(ctx, 565, 317, '#d7a4af');
  [[59, 120], [74, 476], [221, 95], [882, 168], [896, 470], [561, 544], [401, 567], [62, 289], [868, 360]].forEach(([x, y], i) => tree(ctx, x, y, i % 3 !== 0));
  // Pit garage, fabric awning, and small flower boxes.
  rect(ctx, '#b3be9b', 685, 566, 156, 13); rect(ctx, '#ecd4c5', 681, 506, 156, 62);
  for (let i = 0; i < 3; i++) { rect(ctx, '#a89598', 694 + i * 46, 527, 34, 40); rect(ctx, '#c5b2b2', 697 + i * 46, 530, 28, 3); }
  for (let i = 0; i < 10; i++) rect(ctx, i % 2 ? '#fbe8d4' : '#d59baa', 676 + i * 17, 499, 17, 17);
  rect(ctx, '#fff0da', 724, 480, 72, 19); text(ctx, 'PIT LANE', 760, 494, 11);
  rect(ctx, '#d5ac96', 123, 537, 101, 15); for (let i = 0; i < 8; i++) { rect(ctx, '#a9bc8f', 128 + i * 12, 529, 5, 9); rect(ctx, i % 2 ? '#edd2cf' : '#fff0d5', 125 + i * 12, 524, 10, 8); }
  return canvas;
}

export function drawRace(ctx: CanvasRenderingContext2D, state: RaceState, scenery: HTMLCanvasElement, pets: PetImages, reduced: boolean, animationTime = state.clock, effects?: RaceEffects) {
  ctx.clearRect(0, 0, 960, 620); ctx.imageSmoothingEnabled = false; ctx.drawImage(scenery, 0, 0);
  ctx.save();
  if (effects) {
    if (state.clock < effects.stamp) { effects.marks = []; effects.stamp = 0; }
    if (!reduced && state.phase === 'racing' && state.clock - effects.stamp > .045) {
      for (const car of state.cars) if (car.skid > .25 || Math.abs(car.offset) > track.width / 2) { effects.marks.push({ x: car.x, y: car.y, angle: car.heading, age: state.clock, grass: Math.abs(car.offset) > track.width / 2, strength: car.skid }); }
      effects.stamp = state.clock;
    }
    effects.marks = effects.marks.filter(m => state.clock - m.age < 4).slice(-240);
    if (!reduced) for (const mark of effects.marks) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - (state.clock - mark.age) / 4) * .32; ctx.translate(mark.x, mark.y); ctx.rotate(mark.angle); for (const side of [-1, 1]) rect(ctx, mark.grass ? '#ede0bd' : '#5a465d', -12, side * 11, mark.grass ? 7 : 4, mark.grass ? 5 : 2); ctx.restore(); }
  }
  // Draw checkpoint arches across track so player clearly sees gates & active checkpoint
  const gateSize = track.length / 16;
  const playerGates = state.cars[0]?.gates ?? 0;
  const activeGateIndex = (playerGates + 1) % 16;
  for (let g = 1; g < 16; g++) {
    const pt = trackPoint(g * gateSize);
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.angle);
    const isTarget = g === activeGateIndex && state.phase === 'racing';
    // Checkpoint line across track
    ctx.strokeStyle = isTarget ? '#e8789acc' : '#d2c0c788';
    ctx.lineWidth = isTarget ? 3.5 : 1.5;
    if (isTarget) ctx.setLineDash([6, 6]);
    else ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(0, -track.width / 2 + 2);
    ctx.lineTo(0, track.width / 2 - 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Checkpoint side markers / pylons
    rect(ctx, isTarget ? '#e8789a' : '#baa0aa', -4, -track.width / 2 - 4, 8, 5);
    rect(ctx, isTarget ? '#e8789a' : '#baa0aa', -4, track.width / 2 - 1, 8, 5);
    if (isTarget) {
      rect(ctx, '#fff1e0', -2, -track.width / 2 - 2, 4, 2);
      rect(ctx, '#fff1e0', -2, track.width / 2, 4, 2);
    }
    ctx.restore();
  }
  drawGrandstand(ctx, pets, animationTime, reduced);
  for (const car of [...state.cars].sort((a, b) => a.y - b.y)) {
    const p = { x: car.x, y: car.y, angle: car.heading };
    const isBoosting = car.id === 0 ? state.boosting : Boolean(car.boosting);
    if (!reduced && isBoosting) for (let i = 1; i < 5; i++) { rect(ctx, i % 2 ? '#f9d5a3' : '#e98eb2', p.x - Math.cos(p.angle) * i * 11 - 3, p.y - Math.sin(p.angle) * i * 11 - 3, 6, 6); }
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(p.angle);
    rect(ctx, '#725d6628', -15, -6, 36, 21);
    // Open wheels, exposed suspension, narrow nose and two broad wings.
    rect(ctx, '#766772', -9, -11, 22, 22);
    rect(ctx, '#39333f', -11, -14, 10, 7); rect(ctx, '#39333f', -11, 7, 10, 7);
    for (const side of [-1, 1]) { ctx.save(); ctx.translate(13, side * 11); ctx.rotate(car.steering * .45); rect(ctx, '#39333f', -5, -4, 10, 8); rect(ctx, '#a49ba8', -3, -3, 2, 6); ctx.restore(); }
    rect(ctx, '#d1bec1', -9, -13, 2, 5); rect(ctx, '#d1bec1', 11, 8, 2, 5);
    rect(ctx, carColors[car.id], -16, -12, 5, 24); rect(ctx, carColors[car.id], -11, -7, 18, 14); rect(ctx, carColors[car.id], 5, -4, 16, 8); rect(ctx, carColors[car.id], 18, -13, 4, 26);
    rect(ctx, '#fff0dd', -14, -9, 2, 18); rect(ctx, '#f9dfd5', 0, -5, 9, 3); rect(ctx, '#fff0dd', 19, -10, 2, 20);
    rect(ctx, '#69535f', -4, -4, 8, 8); rect(ctx, '#f7e2c5', -2, -3, 5, 6); rect(ctx, '#7c6573', 1, -2, 2, 4);
    ctx.restore();
    if (car.id === 0) { heart(ctx, p.x - 7, p.y - 32, '#c96588', 2); }
  }
  if (state.phase === 'finished' && state.place === 1 && !reduced) for (let i = 0; i < 45; i++) { const x = (i * 71 + animationTime * 13) % 940, y = (i * 103 + animationTime * 32) % 600; rect(ctx, ['#d996ae', '#f4d19d', '#afbd9b'][i % 3], x, y, 4, 7); }
  ctx.restore();
}
