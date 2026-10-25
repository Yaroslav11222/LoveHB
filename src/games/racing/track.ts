export type Point = { x: number; y: number };
export type TrackPoint = Point & { angle: number; bend: number };

// Change the circuit here; physics and rendering share the same sampled line.
const anchors: Point[] = [
  { x: 190, y: 443 }, { x: 121, y: 330 }, { x: 164, y: 218 },
  { x: 292, y: 186 }, { x: 408, y: 248 }, { x: 532, y: 227 },
  { x: 640, y: 144 }, { x: 783, y: 178 }, { x: 831, y: 296 },
  { x: 754, y: 420 }, { x: 595, y: 453 }, { x: 436, y: 407 },
  { x: 306, y: 479 },
];
const mix = (a: number, b: number, c: number, d: number, t: number) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
const line: Point[] = [];
for (let i = 0; i < anchors.length; i++) {
  const a = anchors[(i + anchors.length - 1) % anchors.length], b = anchors[i], c = anchors[(i + 1) % anchors.length], d = anchors[(i + 2) % anchors.length];
  for (let j = 0; j < 40; j++) line.push({ x: mix(a.x, b.x, c.x, d.x, j / 40), y: mix(a.y, b.y, c.y, d.y, j / 40) });
}
// The shape stays intact: distance zero moves to the road beneath the grandstand.
line.push(...line.splice(0, 4 * 40 + 12));
const lengths = [0];
for (let i = 1; i <= line.length; i++) lengths.push(lengths[i - 1] + Math.hypot(line[i % line.length].x - line[i - 1].x, line[i % line.length].y - line[i - 1].y));
export const track = { width: 84, length: lengths[lengths.length - 1], line };
export const wrap = (value: number, length: number) => ((value % length) + length) % length;
/** Projection measures progress; it never positions or rotates the cars. */
export function projectToTrack(position: Point) {
  let nearest = { distance: 0, offset: 0, separation: Infinity, angle: 0, x: 0, y: 0 };
  for (let i = 0; i < line.length; i++) {
    const a = line[i], b = line[(i + 1) % line.length];
    const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.y - a.y) * dy) / length2));
    const x = a.x + dx * t, y = a.y + dy * t;
    const separation = Math.hypot(position.x - x, position.y - y);
    if (separation < nearest.separation) nearest = { distance: lengths[i] + Math.sqrt(length2) * t, offset: ((position.x - x) * -dy + (position.y - y) * dx) / Math.sqrt(length2), separation, angle: Math.atan2(dy, dx), x, y };
  }
  return nearest;
}
export function trackPoint(distance: number, offset = 0): TrackPoint {
  const s = wrap(distance, track.length);
  let low = 0, high = line.length - 1;
  while (low < high) { const mid = Math.ceil((low + high) / 2); if (lengths[mid] <= s) low = mid; else high = mid - 1; }
  const a = line[low], b = line[(low + 1) % line.length];
  const t = (s - lengths[low]) / (lengths[low + 1] - lengths[low]);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const next = line[(low + 12) % line.length];
  const angleAhead = Math.atan2(next.y - b.y, next.x - b.x);
  const bend = Math.abs(Math.atan2(Math.sin(angleAhead - angle), Math.cos(angleAhead - angle)));
  return { x: a.x + (b.x - a.x) * t - Math.sin(angle) * offset, y: a.y + (b.y - a.y) * t + Math.cos(angle) * offset, angle, bend };
}
