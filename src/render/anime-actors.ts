import { blink, catMotion, elbow } from './animation';
import { polygon } from './renderer';
type C=CanvasRenderingContext2D;
const ink='#121b30';
export function oval(c:C,x:number,y:number,rx:number,ry:number,color:string,outline=false){c.beginPath();c.ellipse(x,y,rx,Math.max(.1,ry),0,0,Math.PI*2);c.fillStyle=color;c.fill();if(outline){c.strokeStyle=ink;c.lineWidth=1.8;c.stroke();}}
function shape(c:C,path:string,fill:string,stroke=ink,width=1.8){const p=new Path2D(path);c.fillStyle=fill;c.fill(p);if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p);}}
export function stroke(c:C,path:string,color:string,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke(new Path2D(path));}
export interface CatPose {action?:'idle'|'walk'|'reach'|'jump'|'sleep';emotion?:'curious'|'shock'|'happy'|'determined';quantum?:boolean;ghost?:boolean;reach?:number;turn?:number;back?:boolean;squash?:number;}
function rearCat(c:C,x:number,y:number,s:number,t:number,pose:CatPose){
 const m=catMotion(t,pose.action),fur=pose.quantum?'#d9e4ed':'#eab778',shade=pose.quantum?'#758aa6':'#b98259';
 c.save();c.translate(x,y);c.scale(s,s);oval(c,0,3,40,8,'#06102066');
 c.save();c.translate(-7,-33);c.rotate(m.tail);
 stroke(c,'M 0 0 Q -40 11 -48 -18 Q -51 -41 -37 -41','#142036',14);stroke(c,'M 0 0 Q -40 11 -48 -18 Q -51 -41 -37 -41',fur,10);c.restore();
 for(const side of [-1,1]){c.save();c.translate(side*20,-22);c.rotate(m.stride*side*.15);shape(c,'M -8 -2 Q -13 15 -9 23 Q 0 29 10 23 L 7 -2 Z',shade);c.restore();}
 c.save();c.translate(0,m.breath);
 shape(c,'M -34 -39 Q -38 -79 -22 -92 Q 0 -102 25 -91 Q 40 -70 35 -35 Q 29 -13 0 -14 Q -30 -13 -34 -39 Z',fur);
 shape(c,'M -34 -68 Q -17 -35 32 -38 Q 25 -14 0 -14 Q -32 -14 -34 -39 Z',shade,'');
 stroke(c,'M -16 -88 Q -27 -69 -23 -58 M 0 -93 L -3 -64 M 15 -88 Q 27 -76 25 -62',shade,4);
 if(pose.quantum)shape(c,'M -18 -70 L 0 -80 L 20 -69 L 15 -44 L -13 -44 Z','#294e60','#92eee6');
 c.save();c.translate(0,-104);c.rotate(m.head);
 shape(c,'M -33 -13 L -40 -48 Q -25 -48 -14 -29 L 16 -29 Q 25 -47 39 -48 L 35 -8 Q 44 12 25 25 Q 2 36 -27 25 Q -42 12 -33 -13 Z',fur);
 shape(c,'M -35 -25 Q -18 -8 -2 -12 Q 16 -5 35 -20 L 36 3 Q 39 24 15 29 Q -20 39 -35 16 Z',shade,'');
 stroke(c,'M -28 -23 Q -18 -34 -6 -26 M 6 -26 Q 19 -35 30 -22',fur,3);
 c.restore();stroke(c,'M -24 -78 Q 0 -68 25 -78','#326574',6);c.restore();c.restore();
}
export function animeCat(c:C,x:number,y:number,s:number,t:number,pose:CatPose={}){
 if(pose.back){rearCat(c,x,y,s,t,pose);return;}
 const m=catMotion(t,pose.action),q=pose.quantum,fur=q?'#e4ebf0':'#eab778',light=q?'#fcffff':'#ffe2a9',shade=q?'#8796ae':'#bd8156',eye=q?'#7dece5':'#82c8a0';
 c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=pose.ghost?.5:1;
 oval(c,-14,4,77,10,'#02071655');
 c.scale(1+(pose.squash??0)*.16,1-(pose.squash??0)*.2);
 const jump=pose.action==='jump',sleep=pose.action==='sleep';
 // Tail has overlapping joints and secondary follow-through, separate from the body.
 c.save();c.translate(-67,-34+m.breath);c.rotate(m.tail*(jump?1.8:1));
 stroke(c,'M 0 0 C -43 1 -61 -29 -52 -58 C -49 -70 -39 -77 -35 -67',ink,18);
 stroke(c,'M 0 0 C -43 1 -61 -29 -52 -58 C -49 -70 -39 -77 -35 -67',fur,14);
 stroke(c,'M -39 -27 Q -55 -53 -39 -65',shade,7);c.restore();
 // Far legs, then torso, then near legs; feet swing from hips rather than sliding.
 for(const [px,phase] of [[-48,1],[28,-1]]){c.save();c.translate(px,-28);c.rotate(jump?phase*.55:m.stride*.2*phase);shape(c,'M -10 -10 Q -17 12 -12 26 Q 0 31 12 26 L 8 -5 Z',shade);c.restore();}
 c.save();c.translate(0,m.breath);
 shape(c,'M -77 -28 Q -84 -58 -56 -75 Q -34 -90 -4 -81 L 23 -75 Q 52 -63 51 -39 L 43 -18 Q 11 -5 -36 -12 Q -65 -9 -77 -28 Z',fur);
 shape(c,'M -76 -34 Q -65 -11 -34 -15 Q -2 -7 31 -20 L 40 -38 Q -4 -30 -26 -54 Q -53 -51 -69 -64 Z',shade,'');
 shape(c,'M -12 -77 Q 5 -84 24 -71 L 34 -61 Q 3 -69 -10 -60 Z',light,'');
 for(let i=0;i<3;i++)stroke(c,`M ${-49+i*17} -76 q 5 8 3 18`,shade,5);
 if(q){shape(c,'M -49 -60 L -17 -74 L 8 -54 L -10 -31 L -45 -37 Z','#214953','#7cdedd');stroke(c,'M -40 -49 L -23 -44 L -9 -56','#b0ffff',3);}
 for(const [px,phase] of [[-42,-1],[32,1]]){c.save();c.translate(px,-29);c.rotate(jump?-phase*.7:m.stride*.22*phase);
  if(px===32&&pose.action==='reach'){c.rotate(-(pose.reach??0)*1.2);}
  shape(c,'M -10 -7 Q -15 8 -11 23 Q -7 28 10 25 Q 18 22 12 16 L 9 -9 Z',fur);
  shape(c,'M -11 17 Q -5 12 11 17 L 14 22 Q 2 29 -11 23 Z',light,'');stroke(c,'M -3 20 l 0 4 M 3 20 l 0 4',shade,1);c.restore();}
 // Three-quarter head: independent ears, gaze, lids, mouth and whiskers.
 c.save();c.translate(36,-84+(sleep?11:0));c.rotate((pose.turn??0)+m.head+(sleep?.18:0));
 for(const side of [-1,1]){c.save();c.translate(side*28,-25);c.rotate(side*(m.ear+(pose.emotion==='shock'?.1:0)));
  shape(c,side<0?'M -17 6 L -17 -38 Q -5 -38 15 -2 Z':'M -16 -1 Q 2 -34 16 -39 L 19 10 Z',fur);
  shape(c,side<0?'M -11 -27 L -9 -2 L 6 -5 Z':'M 8 -26 L -8 -2 L 12 2 Z','#c48387','');c.restore();}
 shape(c,'M -43 -19 Q -36 -40 -4 -39 Q 25 -44 42 -22 L 46 -5 L 56 5 L 43 13 L 44 23 Q 27 39 -4 35 L -26 29 L -39 14 L -48 8 L -42 0 Z',fur);
 shape(c,'M -43 -18 Q -25 2 -27 25 L -5 35 Q -28 34 -42 16 L -48 8 L -42 0 Z',shade,'');
 shape(c,'M -7 5 Q 11 0 22 6 Q 36 1 42 13 Q 41 28 23 31 Q 8 37 -5 26 Z',light,'');
 shape(c,'M -12 -34 L -6 -20 L -2 -34 M 3 -35 L 8 -21 L 12 -34','#ac7255','');
 if(pose.back){shape(c,'M -40 -12 Q -8 -42 34 -17 Q 25 14 -5 20 Q -25 22 -40 -12 Z',fur);}
 else{
 const lids=sleep?.04:pose.emotion==='happy'?.35:pose.emotion==='determined'?.65:m.blink;
 for(const [ex,ey,rx] of [[-17,-6,12],[23,-8,14]]){
  if(pose.emotion==='happy'&&!sleep){stroke(c,`M ${ex-rx} ${ey+4} Q ${ex} ${ey-9} ${ex+rx} ${ey+2}`,ink,2.7);continue;}
  c.save();c.translate(ex,ey);c.scale(1,Math.max(.05,lids));
  shape(c,`M ${-rx} 0 Q -6 -13 3 -11 Q 12 -11 ${rx} -2 Q 7 12 -4 10 Q -10 9 ${-rx} 0 Z`,'#fffae7');
  oval(c,2,0,7.5,10,eye);oval(c,3,0,2.3,9,'#19354a');oval(c,-1,-4,2.5,3,'#fff');oval(c,5,4,1,1.3,'#fff');
  stroke(c,`M ${-rx-1} -1 Q -2 -17 ${rx+1} -3`,ink,2.9);c.restore();
 }
 stroke(c,'M -30 -23 Q -20 -26 -12 -22 M 12 -24 Q 23 -29 34 -26',shade,2);
 shape(c,'M 9 11 Q 17 7 23 12 L 16 17 Z','#895061');
 if(pose.emotion==='shock')oval(c,16,24,5,7,'#4d2f46',true);
 else stroke(c,pose.emotion==='happy'?'M 16 17 L 16 21 Q 11 29 6 24 M 16 21 Q 20 28 25 22':'M 16 17 L 16 22 Q 11 26 7 22 M 16 22 Q 21 26 25 21','#754b50',1.3);
 stroke(c,'M -4 18 L -41 12 M -3 23 L -40 27 M 31 18 L 65 9 M 32 23 L 65 25','#f7e5c0',1.3);
 }
 c.restore();
 stroke(c,'M 19 -54 Q 36 -45 50 -52','#225967',7);oval(c,41,-42,6.5,8,'#deb968',true);oval(c,40,-44,2,2,'#ffefb4');
 c.restore();c.restore();
}

function hand(c:C,x:number,y:number,rotation:number,skin:string,open=true){
 c.save();c.translate(x,y);c.rotate(rotation);
 shape(c,open?'M -8 5 L -10 -5 Q -13 -17 -9 -18 L -3 -8 L -4 -22 Q -3 -26 0 -23 L 3 -10 L 5 -24 Q 8 -26 9 -22 L 8 -8 L 12 -20 Q 16 -20 15 -16 L 12 -4 L 16 -12 Q 20 -11 18 -7 L 12 8 Q 4 16 -3 10 Z':'M -9 3 Q -13 -11 -6 -13 L 10 -12 Q 18 -7 12 4 L 6 11 L -3 11 Z',skin);
 stroke(c,'M -4 3 Q 3 -1 8 4','#b67770',1);c.restore();
}
export function animeScientist(c:C,x:number,y:number,s:number,t:number,options:{gesture?:'pet'|'cheer'|'clap'|'idle';talk?:number;variant?:number;hologram?:boolean;facing?:1|-1}={}){
 const variant=options.variant??0,holo=options.hologram,skin=holo?'#82d7db':variant===1?'#d9a98c':'#e4bb9d',hair=holo?'#315d7b':variant===1?'#c3c6d1':'#273044';
 const breath=Math.sin(t*1.7)*1.2,gesture=options.gesture??'idle';
 c.save();c.translate(x,y);c.scale(s*(options.facing??1),s);
 oval(c,0,4,53,8,'#02071144');
 shape(c,'M -26 -62 L -1 -64 L -7 0 L -33 0 Z','#25374e');shape(c,'M 5 -66 L 26 -64 L 35 0 L 9 0 Z','#35455d');
 shape(c,'M -33 -5 Q -48 0 -42 7 L -5 7 L -6 -5 Z',ink);shape(c,'M 9 -4 L 33 -4 Q 47 1 39 8 L 8 7 Z',ink);
 c.translate(0,breath);
 shape(c,'M -15 -162 L 16 -162 L 37 -143 L 45 -53 L 7 -39 L -4 -57 L -12 -40 L -43 -51 L -34 -140 Z',holo?'#548fa0':'#e2e9e7');
 shape(c,'M -7 -154 L 8 -154 L 15 -71 L -11 -71 Z','#36546c');
 shape(c,'M -14 -161 L -31 -146 L -18 -130 L -27 -122 L -7 -76 L -4 -135 Z','#fcfbef');
 shape(c,'M 14 -160 L 32 -145 L 18 -130 L 26 -120 L 5 -73 L 5 -139 Z','#fcfbef');
 stroke(c,'M -37 -90 L -17 -94 M 16 -91 L 36 -86 M -24 -135 L -31 -59','#8aa4b0',1.4);
 c.fillStyle='#e8b964';c.fillRect(23,-121,11,16);c.fillStyle='#8abcb9';c.fillRect(24,-120,8,4);
 for(const side of [-1,1]){
  const sx=side*29,sy=-141;let tx=side*52,ty=-72;
  if(gesture==='cheer'){tx=side*(63+Math.sin(t*2.5+side)*9);ty=-188+Math.sin(t*4+side)*9;}
  if(gesture==='clap'){tx=side*(10+Math.abs(Math.sin(t*3))*30);ty=-129;}
  if(gesture==='pet'&&side===1){tx=74;ty=-98+Math.sin(t*2.5)*5;}
  const e=elbow(sx,sy,tx,ty,43,43,side);
  stroke(c,`M ${sx} ${sy} L ${e.x} ${e.y} L ${tx} ${ty}`,ink,19);
  stroke(c,`M ${sx} ${sy} L ${e.x} ${e.y} L ${tx} ${ty}`,holo?'#6dabba':'#d7e4e3',15);
  stroke(c,`M ${e.x+side*5} ${e.y-3} L ${tx+side*4} ${ty-7}`,'#a1b6c3',3);
  hand(c,tx,ty,gesture==='pet'?1.4:side*.2,skin,gesture!=='idle');
 }
 c.save();c.translate(0,-177);c.rotate(Math.sin(t*.7)*.025+(gesture==='pet'?.12:0));
 shape(c,'M -9 4 L -8 24 Q 1 33 12 23 L 10 3 Z',skin);
 oval(c,-26,-8,6,11,skin,true);oval(c,27,-8,6,11,skin,true);
 shape(c,'M -27 -29 Q -19 -47 3 -45 Q 25 -45 29 -22 L 26 6 Q 18 26 3 32 Q -13 26 -24 10 Z',skin);
 shape(c,'M -26 -19 Q -23 15 4 31 Q -12 28 -24 10 Z','#b8847d','');
 shape(c,variant===1?'M -32 7 L -35 -35 Q -25 -61 8 -57 Q 38 -55 34 -20 L 35 21 L 24 30 L 26 -20 L 15 -33 L -7 -19 L -19 -32 L -23 27 Z':'M -30 -6 L -34 -33 L -27 -29 L -23 -48 L -15 -43 L -8 -61 L 2 -53 L 12 -59 L 21 -48 L 33 -43 L 37 -20 L 29 -3 L 24 -22 L 14 -28 L 11 -13 L -2 -25 L -11 -13 L -17 -27 L -25 -15 Z',hair);
 stroke(c,'M -23 -39 Q -7 -50 10 -43 M 4 -48 L 20 -40',holo?'#8bffff':'#59637d',2.2);
 const lid=blink(t,variant*.8+2.5);
 for(const ex of [-13,14]){c.save();c.translate(ex,-6);c.scale(1,Math.max(.07,lid));shape(c,'M -8 0 Q -1 -9 8 -3 Q 5 6 -2 5 Z','#f7f3df');oval(c,1,-1,3.6,5,holo?'#daffff':'#597c8b');oval(c,2,-1,1.5,4,ink);oval(c,0,-3,1.2,1.5,'#fff');stroke(c,'M -9 0 Q -2 -10 9 -3',ink,1.8);c.restore();}
 stroke(c,'M -22 -18 L -9 -20 M 8 -20 L 23 -17',hair,2);stroke(c,'M 3 -4 L 0 8 L 4 9','#a67c76',1);
 if(variant!==1){stroke(c,'M -25 -11 L -4 -11 L -6 2 L -22 3 Z M 5 -11 L 26 -11 L 23 3 L 8 2 Z M -4 -8 L 5 -8','#526274',1.2);}
 const mouth=options.talk??0;
 if(mouth>.12){oval(c,2,18,6,2+mouth*5,'#653d53',true);stroke(c,'M -3 16 L 6 16','#fff3e0',2);}else stroke(c,gesture==='idle'?'M -3 18 Q 2 20 7 17':'M -5 17 Q 2 24 10 17','#9d626a',1.5);
 stroke(c,'M -18 11 L -14 12 M 14 12 L 19 11','#d48e86',2.3);c.restore();c.restore();
}

export function animePaw(c:C,x:number,y:number,s:number,rotation:number,press:number){
 c.save();c.translate(x,y);c.scale(s,s);c.rotate(rotation);
 shape(c,'M -37 -300 L 26 -300 Q 29 -204 14 -121 L 25 -31 Q 45 -9 22 13 Q 5 24 -22 16 Q -40 13 -42 -6 L -35 -35 L -48 -145 Z','#e7b679');
 shape(c,'M -37 -300 L -17 -300 L -23 -138 L -18 -33 Q -23 -13 -12 17 Q -41 20 -42 -6 L -35 -35 L -48 -145 Z','#b88058','');
 for(let i=0;i<3;i++){oval(c,-24+i*16,-5+press*2,7,9,'#f5dba7');stroke(c,`M ${-18+i*16} -3 l 0 10`,'#b47a60',1.2);}c.restore();
}
