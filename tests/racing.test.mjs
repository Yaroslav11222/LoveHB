import test from 'node:test';
import assert from 'node:assert/strict';
import {createRace,startRace,stepRace,recoverPlayer,botControl,angleDifference,raceConfig} from '../src/games/racing/engine.ts';
import {track,trackPoint,projectToTrack} from '../src/games/racing/track.ts';
import {finishPresentation,victoryTiming} from '../src/games/racing/finish.ts';
const idle={steer:0,throttle:0,boost:false,brake:false};
const gas={...idle,throttle:1};
function simulate(state,seconds,input=idle){for(let i=0;i<Math.round(seconds*60);i++){const control=typeof input==='function'?input(state):input;state=stepRace(state,control,1/60);}return state;}
function running(){return {...createRace(),phase:'racing'};}
function isolated(){const s=running();s.cars=s.cars.slice(0,1);return s;}

test('circuit projection wraps and measures position without snapping a driver',()=>{
  assert.deepEqual(trackPoint(0),trackPoint(track.length));
  for(let d=0;d<track.length;d+=15){const p=trackPoint(d,12),q=projectToTrack(p);assert.ok(Math.abs(q.offset-12)<.25);assert.ok(Math.abs(angleDifference(q.angle,p.angle))<.1);}
});
test('ready and countdown do not move any car',()=>{
  const s=createRace();assert.equal(stepRace(s,gas,1),s);const c=simulate(startRace(),2,gas);assert.equal(c.phase,'countdown');assert.deepEqual(c.cars,s.cars);
});
test('no input means no automatic driving, while rivals race away',()=>{
  const s=simulate(running(),10);assert.equal(s.cars[0].speed,0);assert.equal(s.cars[0].gates,0);assert.equal(s.place,4);assert.ok(s.cars.slice(1).every(c=>c.gates>4));
});
test('straight throttle does not follow the circuit; steering rotates the vehicle and changes trajectory',()=>{
  const s=isolated(),straight=simulate(s,4,gas),turned=simulate(s,1.4,{...gas,steer:1});
  assert.ok(Math.abs(angleDifference(straight.cars[0].heading,s.cars[0].heading))<.001);assert.ok(Math.abs(straight.cars[0].offset)>42);
  assert.ok(Math.abs(angleDifference(turned.cars[0].heading,s.cars[0].heading))>.8);assert.ok(Math.hypot(turned.cars[0].x-s.cars[0].x,turned.cars[0].y-s.cars[0].y)>40);
});
test('braking stops the car sooner than coasting; releasing throttle preserves momentum',()=>{
  const moving=simulate(isolated(),.8,gas),coast=stepRace(moving,idle,1/60),brake=simulate(moving,.4,{...idle,brake:true}),free=simulate(moving,.4,idle);
  assert.ok(coast.cars[0].speed>moving.cars[0].speed*.95);assert.ok(brake.cars[0].speed<free.cars[0].speed-40);
});
test('boost accelerates, spends charge, cannot override brakes; charge recovers',()=>{
  const s=isolated(),normal=simulate(s,.7,gas),boost=simulate(s,.7,{...gas,boost:true});assert.ok(boost.cars[0].speed>normal.cars[0].speed+25);assert.ok(boost.energy<.85);
  const stopped=stepRace(boost,{...gas,boost:true,brake:true},1/60);assert.equal(stopped.boosting,false);assert.ok(simulate(boost,2,idle).energy>boost.energy);
});
test('cars collide in world space and share the impact without mutating the previous state',()=>{
  let s=running();s.cars[1]={...s.cars[1],x:s.cars[0].x+18,y:s.cars[0].y,vx:-80,vy:0};s.cars[0]={...s.cars[0],vx:80,vy:0,speed:80};
  const old=structuredClone(s),next=stepRace(s,idle,1/60);assert.deepEqual(s,old);assert.ok(next.collision>0);assert.ok(next.cars[0].vx<70);assert.ok(Math.hypot(next.cars[1].x-next.cars[0].x,next.cars[1].y-next.cars[0].y)>=24.9);
});
test('opponent sees slower traffic and chooses a passing lane instead of staying in a queue',()=>{
  const s=running(),c=s.cars[1];c.speed=135;c.trackDistance=200;c.offset=0;const p=trackPoint(200);Object.assign(c,p,{heading:p.angle});
  const target=trackPoint(250);Object.assign(s.cars[0],target,{trackDistance:250,offset:0,speed:90,heading:target.angle});
  const control=botControl(c,[c,s.cars[0]],10);assert.equal(control.intent,'pass');assert.ok(Math.abs(control.lane)>=20);assert.ok(Math.abs(control.steer)>.01);
});
test('reverse driving and a teleport across the circuit cannot award a lap',()=>{
  const s=isolated(),p=trackPoint(track.length-2);Object.assign(s.cars[0],p,{heading:p.angle+Math.PI,vx:0,vy:0});
  const teleported=stepRace(s,idle,1/60);assert.equal(teleported.cars[0].gates,0);assert.equal(teleported.lap,1);assert.equal(simulate(teleported,2,gas).cars[0].gates,0);
});
test('recovery returns to an earned part of the circuit without awarding a gate',()=>{
  const s=simulate(running(),5,gas);const next=recoverPlayer(s);assert.equal(next.clock,s.clock+2);assert.equal(next.cars[0].gates,s.cars[0].gates);assert.equal(next.cars[0].speed,0);assert.ok(Math.abs(next.cars[0].offset)<20);assert.deepEqual(next.cars.slice(1),s.cars.slice(1));
});
test('full physical race clears all ordered gates; opponents stay on course and standings change',()=>{
  let s=startRace(),changes=0,last=4,maxOffset=0;const intents=new Set();
  for(let i=0;i<60*220&&s.phase!=='finished';i++){
    s=stepRace(s,botControl(s.cars[0],s.cars,s.clock),1/60);
    if(s.place!==last){changes++;last=s.place;}for(const c of s.cars){maxOffset=Math.max(maxOffset,Math.abs(c.offset));intents.add(c.intent);assert.ok(Number.isFinite(c.x+c.y+c.speed));}
  }
  assert.equal(s.phase,'finished');assert.equal(s.cars[0].gates,raceConfig.laps*raceConfig.gatesPerLap);assert.equal(s.lap,3);assert.ok(s.clock>30&&s.clock<180);assert.ok(changes>0);assert.ok(intents.has('pass'));assert.ok(maxOffset<60);assert.ok(s.cars.slice(1).every(c=>c.gates>25));
  assert.equal(stepRace(s,gas,.05),s);
});
test('a timestep spike cannot move cars across checkpoints or produce invalid physics',()=>{
  const s=simulate(running(),1,gas),next=stepRace(s,gas,20);assert.ok(Math.hypot(next.cars[0].x-s.cars[0].x,next.cars[0].y-s.cars[0].y)<15);assert.ok(next.cars[0].gates<=s.cars[0].gates+1);assert.equal(startRace().energy,1);
});
test('a clean driving line can win against the easy opponents with the same physical rules',()=>{
  const done=simulate(startRace(),180,s=>{const c=botControl(s.cars[0],[s.cars[0]],s.clock);return {...c,boost:Math.abs(c.steer)<.35&&!c.brake};});
  assert.equal(done.phase,'finished');assert.equal(done.place,1);assert.ok(done.cars.slice(1).every(c=>c.gates>25));
});

test('completed finish unlocks the cinematic and reward on any place',()=>{
  for(const phase of ['ready','countdown','racing'])for(const place of [1,2,3,4])assert.equal(finishPresentation({phase,place}),null);
  for(const place of [1,2,3,4])assert.equal(finishPresentation({phase:'finished',place}),'victory');
  assert.equal(finishPresentation(startRace()),null);
});
test('start/finish is directly below the unchanged grandstand; the cinematic crosses before opening the reward',()=>{
  const p=trackPoint(0);assert.ok(p.x>400&&p.x<530&&p.y>200&&p.y<275);
  const times=Object.values(victoryTiming);for(let i=1;i<times.length;i++)assert.ok(times[i]>times[i-1]);
  assert.ok(-183+(victoryTiming.finishCrossing-victoryTiming.driveIn)*430>731);
});
