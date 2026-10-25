import { track, trackPoint, projectToTrack, wrap } from './track.ts';

export const raceConfig = {
  laps: 5, speed: 211, boostSpeed: 263, botSpeeds: [155, 150, 145], countdown: 3,
  acceleration: 145, braking: 285, rollingDrag: 32, grip: 9, steeringRate: 2.9,
  boostDrain: .3, boostRecharge: .10, gatesPerLap: 16,
};
export type Driver = {
  id: number; x: number; y: number; vx: number; vy: number; heading: number;
  speed: number; steering: number; distance: number; trackDistance: number; offset: number;
  gates: number; finishTime: number | null; skid: number; targetLane: number; intent: 'race' | 'pass' | 'defend';
  energy?: number; boosting?: boolean;
};
export type RaceState = { phase: 'ready' | 'countdown' | 'racing' | 'finished'; clock: number; countdown: number; cars: Driver[]; energy: number; boosting: boolean; collision: number; place: number; lap: number; slipstream: boolean };
export type RaceInput = { steer: number; throttle: number; boost: boolean; brake: boolean };
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const yawRate = (speed: number) => raceConfig.steeringRate * Math.min(speed / 62, 1) * (1 - .23 * Math.min(speed / raceConfig.speed, 1));

function makeDriver(id: number, distance: number, offset: number): Driver {
  const p = trackPoint(distance, offset);
  return { id, x: p.x, y: p.y, vx: 0, vy: 0, heading: p.angle, speed: 0, steering: 0, distance, trackDistance: distance, offset, gates: 0, finishTime: null, skid: 0, targetLane: offset, intent: 'race', energy: 1, boosting: false };
}
export function createRace(): RaceState {
  return { phase: 'ready', clock: 0, countdown: raceConfig.countdown, cars: [makeDriver(0, 0, -14), makeDriver(1, 30, 14), makeDriver(2, 62, -14), makeDriver(3, 92, 14)], energy: 1, boosting: false, collision: 0, place: 4, lap: 1, slipstream: false };
}
export function startRace(): RaceState { return { ...createRace(), phase: 'countdown' }; }

/** Local perception, passing lanes and corner braking. Opponents use the player's physics. */
export function botControl(car: Driver, cars: Driver[], clock: number): RaceInput & { lane: number; intent: Driver['intent'] } {
  const nearby = cars.filter(c => c.id !== car.id && c.finishTime === null);
  const relative = nearby.map(c => ({ car: c, gap: wrap(c.trackDistance - car.trackDistance + track.length / 2, track.length) - track.length / 2 }));
  const ahead = relative.filter(o => o.gap > 0 && o.gap < 105 && Math.abs(o.car.offset - car.offset) < 23).sort((a, b) => a.gap - b.gap)[0];
  const passing = car.intent === 'pass' && relative.some(o => o.gap > -38 && o.gap < 90);
  const behind = nearby.find(c => wrap(car.trackDistance - c.trackDistance, track.length) < 85 && c.speed > car.speed + 3);
  let lane = [0, 6, -10, 12][car.id], intent: Driver['intent'] = 'race';
  if (passing) { lane = car.targetLane; intent = 'pass'; }
  else if (ahead) {
    const traffic = nearby.filter(c => Math.hypot(c.x - car.x, c.y - car.y) < 85);
    const cost = (offset: number) => traffic.reduce((sum, c) => sum + 1 / (Math.abs(offset - c.offset) + 3), 0);
    lane = cost(-23) < cost(23) ? -23 : 23; intent = 'pass';
  } else if (behind && car.id !== 0 && wrap(car.trackDistance - behind.trackDistance, track.length) > 32) { lane = clamp(behind.offset, -17, 17); intent = 'defend'; }
  const lookahead = 29 + car.speed * .30, target = trackPoint(car.trackDistance + lookahead, lane);
  const error = angleDifference(Math.atan2(target.y - car.y, target.x - car.x), car.heading);
  const steering = clamp(2 * Math.max(45, car.speed) * Math.sin(error) / (lookahead * Math.max(.8, yawRate(car.speed))), -1, 1);
  let curvature = 0;
  for (let d = 20; d <= 150; d += 25)curvature = Math.max(curvature, Math.abs(angleDifference(trackPoint(car.trackDistance + d + 22).angle, trackPoint(car.trackDistance + d).angle)) / 22);

  // First 2 laps: relaxed baseline. From lap 3 onward: progressive speed and cornering confidence.
  const botLap = Math.floor(car.gates / raceConfig.gatesPerLap);
  const diffMultiplier = botLap < 2 ? 1.0 : Math.min(1.22, 1.0 + (botLap - 1) * 0.04);
  const cornerGripFactor = botLap < 2 ? 155 : 155 * (1 + (botLap - 1) * 0.05);
  const cornerSpeed = Math.sqrt((car.id === 0 ? 235 : cornerGripFactor) / Math.max(.001, curvature));
  const baseSpeed = car.id === 0 ? raceConfig.speed : raceConfig.botSpeeds[car.id - 1];
  const maxSpeed = car.id === 0 ? raceConfig.speed : baseSpeed * diffMultiplier;
  let targetSpeed = Math.min(maxSpeed, cornerSpeed) * (car.id === 0 ? 1 : 1 + .018 * Math.sin(clock * .8 + car.id));
  if (Math.abs(error) > .75) targetSpeed = Math.min(targetSpeed, 96);
  if (ahead && ahead.gap < 31 && Math.abs(ahead.car.offset - car.offset) < 18) targetSpeed = Math.min(targetSpeed, ahead.car.speed * .83);
  if (Math.abs(car.offset) > track.width * .55) targetSpeed = Math.min(targetSpeed, 100);

  // Opponents can boost on straightaways after lap 2 when chasing or leading
  const wantBoost = car.id !== 0 && botLap >= 1 && curvature < 0.008 && Math.abs(error) < 0.15 && (car.energy ?? 1) > 0.35 && Math.abs(car.offset) < track.width / 2 - 5;
  return { steer: steering, throttle: car.speed < targetSpeed ? 1 : .2, brake: car.speed > targetSpeed + 10, boost: wantBoost, lane, intent };
}

function drive(car: Driver, input: RaceInput, dt: number, boosted: boolean) {
  if (car.finishTime !== null) return;
  const onGrass = Math.abs(car.offset) > track.width / 2 - 5;
  car.steering += (clamp(input.steer, -1, 1) - car.steering) * Math.min(1, dt * 12);
  let forward = car.vx * Math.cos(car.heading) + car.vy * Math.sin(car.heading);
  let lateral = -car.vx * Math.sin(car.heading) + car.vy * Math.cos(car.heading);
  const limit = onGrass ? 95 : boosted ? raceConfig.boostSpeed : raceConfig.speed;
  const acceleration = input.brake ? -raceConfig.braking : clamp(input.throttle, 0, 1) * (boosted ? 208 : raceConfig.acceleration) - raceConfig.rollingDrag;
  forward = Math.max(0, forward + acceleration * dt);
  if (forward > limit) forward = Math.max(limit, forward - (onGrass ? 260 : 180) * dt);
  const yaw = car.steering * yawRate(forward) * (onGrass ? .78 : 1);
  car.heading = angleDifference(car.heading + yaw * dt, 0);
  lateral -= yaw * forward * dt;
  const grip = onGrass ? 3.5 : raceConfig.grip * (input.brake ? .72 : 1);
  lateral *= Math.exp(-grip * dt);
  if (onGrass) forward *= Math.exp(-.6 * dt);
  car.vx = Math.cos(car.heading) * forward - Math.sin(car.heading) * lateral;
  car.vy = Math.sin(car.heading) * forward + Math.cos(car.heading) * lateral;
  car.x = clamp(car.x + car.vx * dt, 25, 935); car.y = clamp(car.y + car.vy * dt, 25, 595);
  if (car.x === 25 || car.x === 935) car.vx *= -.2;
  if (car.y === 25 || car.y === 595) car.vy *= -.2;
  car.speed = Math.hypot(car.vx, car.vy);
  car.skid = Math.abs(lateral) > 13 && car.speed > 90 ? Math.min(1, Math.abs(lateral) / 42) : 0;
}

function updateProgress(car: Driver, clock: number) {
  const p = projectToTrack(car);
  const delta = wrap(p.distance - car.trackDistance + track.length / 2, track.length) - track.length / 2;
  const gateSize = track.length / raceConfig.gatesPerLap, nextGate = wrap((car.gates + 1) * gateSize, track.length);
  const toGate = wrap(nextGate - car.trackDistance, track.length);
  // Ordered gates and physical crossing prevent shortcuts, reverse laps, and teleport wins.
  // Generous width tolerance (track.width/2 + 28) and lookahead window (gateSize * 0.75)
  // ensure that drifting slightly wide or fast ticks never miss counting a checkpoint.
  if (p.separation < track.width / 2 + 28 && delta > 0 && toGate <= Math.max(delta + 5, gateSize * .75) && toGate > 0) car.gates++;
  car.trackDistance = p.distance; car.offset = p.offset;
  const base = car.gates * gateSize;
  const fraction = wrap(p.distance - wrap(base, track.length) + track.length / 2, track.length) - track.length / 2;
  car.distance = base + clamp(fraction, -gateSize, gateSize);
  if (car.gates >= raceConfig.gatesPerLap * raceConfig.laps) { car.finishTime = clock; car.distance = track.length * raceConfig.laps; }
}

export function recoverPlayer(state: RaceState): RaceState {
  if (state.phase !== 'racing') return state;
  const car = state.cars[0], gateSize = track.length / raceConfig.gatesPerLap;
  const distance = car.gates * gateSize + 6, p = trackPoint(distance, -14);
  return { ...state, clock: state.clock + 2, collision: 0, cars: state.cars.map(c => c.id === 0 ? { ...c, x: p.x, y: p.y, vx: 0, vy: 0, speed: 0, steering: 0, heading: p.angle, offset: -14, trackDistance: wrap(distance, track.length), distance, skid: 0 } : c) };
}

export function stepRace(state: RaceState, input: RaceInput, delta: number): RaceState {
  if (state.phase === 'ready' || state.phase === 'finished') return state;
  const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, .05);
  if (state.phase === 'countdown') return { ...state, countdown: Math.max(0, state.countdown - dt), phase: state.countdown <= dt ? 'racing' : 'countdown' };
  const cars = state.cars.map(c => ({ ...c })), player = cars[0], clock = state.clock + dt;
  const slipstream = cars.slice(1).some(c => { const dx = c.x - player.x, dy = c.y - player.y, forward = dx * Math.cos(player.heading) + dy * Math.sin(player.heading), side = -dx * Math.sin(player.heading) + dy * Math.cos(player.heading); return forward > 23 && forward < 110 && Math.abs(side) < 17 && Math.abs(angleDifference(c.heading, player.heading)) < .4; });
  const boosting = input.boost && input.throttle > 0 && state.energy > .025 && !input.brake && Math.abs(player.offset) < track.width / 2 - 5;
  const energy = clamp(state.energy + (boosting ? -raceConfig.boostDrain : raceConfig.boostRecharge) * (slipstream && !boosting ? 2 : 1) * dt, 0, 1);
  let collision = Math.max(0, state.collision - dt);
  const controls: (RaceInput & { lane?: number; intent?: Driver['intent'] })[] = cars.map(c => c.id === 0 ? input : botControl(c, state.cars, clock));
  for (const car of cars) {
    const control = controls[car.id];
    if (control.lane !== undefined) { car.targetLane = control.lane; car.intent = control.intent!; }
    let isCarBoosting = false;
    if (car.id === 0) {
      isCarBoosting = boosting;
    } else {
      isCarBoosting = Boolean(control.boost && (car.energy ?? 1) > 0.05);
      const botDrain = isCarBoosting ? -raceConfig.boostDrain : raceConfig.boostRecharge * 0.8;
      car.energy = clamp((car.energy ?? 1) + botDrain * dt, 0, 1);
      car.boosting = isCarBoosting;
    }
    drive(car, control, dt, isCarBoosting);
  }
  for (let i = 0; i < cars.length; i++)for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j]; if (a.finishTime !== null || b.finishTime !== null) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 25;
    if (d >= min) continue;
    const nx = d > .001 ? dx / d : 1, ny = d > .001 ? dy / d : 0, overlap = (min - d) * .5;
    a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
    const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (relative < 0) { const impulse = -relative * .6; a.vx -= nx * impulse; a.vy -= ny * impulse; b.vx += nx * impulse; b.vy += ny * impulse; }
    a.speed = Math.hypot(a.vx, a.vy); b.speed = Math.hypot(b.vx, b.vy);
    if (a.id === 0 || b.id === 0) collision = .2;
  }
  for (const car of cars) if (car.finishTime === null) updateProgress(car, clock);
  const order = [...cars].sort((a, b) => a.finishTime !== null && b.finishTime !== null ? a.finishTime - b.finishTime : b.distance - a.distance);
  return { phase: player.finishTime !== null ? 'finished' : 'racing', clock, countdown: 0, cars, energy, boosting, collision, place: order.findIndex(c => c.id === 0) + 1, lap: Math.min(raceConfig.laps, Math.floor(player.gates / raceConfig.gatesPerLap) + 1), slipstream };
}
