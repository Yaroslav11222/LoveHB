import { drawGrandstand, palette } from './render';
import type { PetImages } from './render';
import { victoryTiming } from './finish';

const block = (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h); };

function sideCar(ctx: CanvasRenderingContext2D,x: number,y: number,time: number,reduced: boolean) {
  ctx.save();ctx.translate(Math.round(x),y);
  const bob=reduced?0:Math.round(Math.sin(time*45));
  ctx.translate(0,bob);
  block(ctx,'#74576528',-115,35,235,13);
  // Low sidepods, tapered nose, raised rear wing and exposed slick tyres.
  block(ctx,'#b9577e',-108,-25,13,57);block(ctx,'#eb98b8',-123,-32,48,10);
  block(ctx,'#d9759d',-99,-2,143,34);block(ctx,'#f3b2c9',-75,-11,91,16);
  ctx.fillStyle='#db81a3';ctx.beginPath();ctx.moveTo(16,3);ctx.lineTo(105,25);ctx.lineTo(105,34);ctx.lineTo(12,32);ctx.fill();
  block(ctx,'#e59ab5',94,22,27,13);block(ctx,'#fff0db',-85,10,81,6);
  block(ctx,'#755465',-32,-24,34,24);block(ctx,'#f5e6c6',-27,-39,25,22);block(ctx,'#685563',-6,-32,10,9);
  block(ctx,'#fff1dc',-44,-4,60,7);
  for(const wx of [-72,72]){
    block(ctx,'#423847',wx-24,12,48,40);block(ctx,'#423847',wx-19,7,38,50);
    block(ctx,'#706171',wx-11,17,22,30);block(ctx,'#b8a4b1',wx-6,24,12,16);
    if(!reduced){const a=time*34;block(ctx,'#e2c4ce',wx+Math.round(Math.cos(a)*7)-2,31+Math.round(Math.sin(a)*10),4,7);}
  }
  if(!reduced)for(let i=0;i<6;i++)block(ctx,i%2?'#eeadbe':'#fff0d5',-140-i*27,10+i%3*12,20+i*2,3);
  ctx.restore();
}

/** A separate scripted side view; it cannot change the result or race physics. */
export function drawVictoryScene(ctx: CanvasRenderingContext2D,pets: PetImages,time: number,reduced: boolean) {
  ctx.imageSmoothingEnabled=false;
  block(ctx,'#f6e4df',0,0,960,620);block(ctx,'#e5dfc3',0,250,960,370);
  for(let i=0;i<5;i++){const x=80+i*208;block(ctx,'#fff3e8',x,51+i%2*35,80,17);block(ctx,'#fff3e8',x+17,41+i%2*35,46,16);}
  ctx.save();ctx.translate(-224,54);ctx.scale(1.6,1.6);drawGrandstand(ctx,pets,reduced?0:time*1.4,reduced);ctx.restore();
  for(let i=0;i<32;i++){block(ctx,i%2?'#d99bb0':'#fce9d4',i*31,321,31,26);block(ctx,'#b5bf99',i*31,347,31,5);}
  block(ctx,palette.road,0,352,960,166);
  for(let i=0;i<18;i++)block(ctx,'#e0c7d0',i*64,491,38,4);
  block(ctx,'#e8d3bd',0,518,960,102);
  for(let i=0;i<24;i++)block(ctx,i%2?'#f9e5ce':'#dba2b3',i*41,518,41,17);
  // Finish gantry and the chequered stripe in front of our stand.
  block(ctx,'#ad8397',688,231,9,283);block(ctx,'#fae8d4',697,238,4,276);
  block(ctx,'#b5879e',872,231,9,283);
  block(ctx,'#ffeddb',679,217,208,45);
  for(let row=0;row<3;row++)for(let col=0;col<16;col++)block(ctx,(row+col)%2?'#806574':'#fff0da',683+col*12,221+row*12,12,12);
  for(let row=0;row<11;row++)for(let col=0;col<2;col++)block(ctx,(row+col)%2?'#725567':'#fff1dc',731+col*9,353+row*15,9,15);
  const carX=-183+Math.max(0,time-victoryTiming.driveIn)*430;
  sideCar(ctx,reduced?770:carX,431,time,reduced);
  if(time>victoryTiming.finishCrossing&&!reduced)for(let i=0;i<42;i++){const age=time-victoryTiming.finishCrossing;const x=470+(i*79)%410+Math.sin(i)*age*37,y=250+age*age*50+(i*29)%85;block(ctx,['#cf7e9c','#f6cf91','#9dae8a'][i%3],x,y,5,8);}
}
