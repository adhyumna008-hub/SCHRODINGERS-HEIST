import labUrl from '../assets/anime-lab.png?inline';
import { animeCat, animeScientist, animePaw, oval, stroke } from './anime-actors';
import { clamp, smooth, mix, interval, voiceEnergy } from './animation';
import { polygon, label } from './renderer';
type C=CanvasRenderingContext2D;
const labImage=typeof Image==='undefined'?null:new Image();
if(labImage)labImage.src=labUrl;
const gold='#deb276',aqua='#87dce6',violet='#a79acb';

function background(c:C,t:number,pan=0,warm=false){
 c.fillStyle='#111e36';c.fillRect(0,0,1152,720);
 if(labImage?.complete&&labImage.naturalWidth)c.drawImage(labImage,-65+pan*.22,6,1282,721);
 c.fillStyle=warm?'#f3b75e18':'#18335d25';c.fillRect(0,76,1152,525);
 // Glass streaks and dust move at separate depths; the art plate itself is the far plane.
 c.save();c.beginPath();c.rect(0,76,535,420);c.clip();
 for(let i=0;i<44;i++){const x=(i*127)%540+pan*.3,y=70+(i*67+t*(30+i%7*3))%430;c.strokeStyle='#a1c6e82a';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+10+i%15);c.stroke();}c.restore();
 for(let i=0;i<27;i++){const z=1+(i%3)*.8,x=((i*197+t*7/z)%1250)-45+pan*z*.3,y=130+(i*37)%410;oval(c,x,y,1.1/z,1.1/z,warm?'#ffe4b588':'#b7daef66');}
}
function foreground(c:C,pan:number){
 // Near structural mullions establish a foreground plane passing faster than the room.
 polygon(c,[[-100+pan,76],[-44+pan,76],[25+pan,601],[-55+pan,601]],'#101628','#2f4156');
 polygon(c,[[1215+pan,76],[1255+pan,76],[1157+pan,601],[1134+pan,601]],'#0c1524','#3a485b');
}
function consoleDesk(c:C,x:number,y:number,s=1,t=0){
 c.save();c.translate(x,y);c.scale(s,s);
 polygon(c,[[-210,0],[151,-45],[235,20],[-179,69]],'#243b51','#72989f');
 polygon(c,[[-179,69],[235,20],[232,41],[-179,91]],'#121f33','#475d74');
 polygon(c,[[-151,-2],[64,-28],[109,3],[-115,37]],'#0c2538','#527f8a');
 for(let i=0;i<10;i++)stroke(c,`M ${-133+i*20} 3 l 7 10`,'#6b8999',2);
 polygon(c,[[115,-30],[153,-36],[181,-13],[143,-7]],'#a3e8d1','#d9f3cc');
 stroke(c,'M -163 70 L -159 141 M 207 35 L 209 111','#243447',12);
 c.restore();
}
function cinematicCamera(c:C,zoom:number,x=576,y=335,roll=0){c.translate(576,335);c.rotate(roll);c.scale(zoom,zoom);c.translate(-x,-y);}
function vignette(c:C,strength=.52){const v=c.createRadialGradient(576,315,190,576,315,700);v.addColorStop(0,'#04071a00');v.addColorStop(1,`rgba(3,6,20,${strength})`);c.fillStyle=v;c.fillRect(0,76,1152,525);}
function streaks(c:C,t:number,strength:number){
 c.save();c.globalAlpha=strength;
 for(let i=0;i<50;i++){const a=i*2.399,r=230+((i*91+t*450)%480);const x=576+Math.cos(a)*r,y=320+Math.sin(a)*r*.58;c.strokeStyle=i%2?'#b8dafd55':'#b8a4e755';c.lineWidth=i%3+1;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*90,y+Math.sin(a)*50);c.stroke();}c.restore();
}
export function corridor(c:C,t:number,travel:number=0){
 c.fillStyle='#10162f';c.fillRect(0,76,1152,525);
 const project=(x:number,y:number,z:number)=>[576+x*560/z,305+y*560/z];
 const haze=c.createRadialGradient(576,305,0,576,305,600);haze.addColorStop(0,'#557080');haze.addColorStop(.32,'#252d52');haze.addColorStop(1,'#080f25');c.fillStyle=haze;c.fillRect(0,76,1152,525);
 for(let i=14;i>=0;i--){const z=130+((i*130+travel*100)%1820),corners=[project(-310,-180,z),project(310,-180,z),project(310,210,z),project(-310,210,z)];
  c.globalAlpha=.3+.7*(1-z/2000);polygon(c,corners,'#182c3910',i%2?'#7f7999':'#628a98');
  for(const side of [-1,1]){const a=project(side*310,-155,z),b=project(side*278,185,z+45),w=Math.abs(a[0]-b[0]);c.fillStyle=i%2?'#20374b':'#272e47';c.fillRect(Math.min(a[0],b[0]),a[1],Math.max(2,w),b[1]-a[1]);stroke(c,`M ${a[0]} ${a[1]} L ${a[0]} ${b[1]}`,i%2?'#97c9c6':'#8f7faa',1.5);}
 }
 c.globalAlpha=1;
 for(let x=-600;x<=600;x+=120){const a=project(x,215,100),b=project(x,215,2300);stroke(c,`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`,'#63869866',1);}
 for(let i=0;i<45;i++){const z=100+(i*79+t*85)%1800,p=project(Math.sin(i*17)*350,Math.cos(i*13)*200,z);oval(c,p[0],p[1],700/z,350/z,i%2?'#c1cfdf99':'#b697df88');}
}
function virus(c:C,x:number,y:number,s:number,t:number,energy:number,dying=false){
 c.save();c.translate(x,y);c.scale(s,s);
 for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.045,r=dying?90+t*16:95,dx=Math.cos(a)*r,dy=Math.sin(a)*r;
  c.save();c.rotate(a);const bend=Math.sin(t*1.4+i)*13;
  polygon(c,[[58,0],[91,-25],[139,-15+bend],[179,-43+bend],[153,4+bend],[105,17],[73,15]],'#302337','#9e657a');
  polygon(c,[[139,-15+bend],[176,-43+bend],[166,-15+bend]],'#ad8794','#241c33');c.restore();
 }
 polygon(c,[[-94,-18],[-77,-73],[-33,-103],[0,-78],[37,-101],[84,-64],[95,-17],[64,63],[0,103],[-67,60]],'#392839','#131b30');
 polygon(c,[[-94,-18],[-33,-103],[-24,-12],[0,103],[-67,60]],'#5c3c4b','#171c2e');
 polygon(c,[[-77,-73],[-92,-148],[-38,-93]],'#705064','#ad8999');polygon(c,[[38,-96],[86,-152],[84,-64]],'#41344c','#a68499');
 polygon(c,[[-75,-8],[0,-43-energy*8],[77,-8],[5,33]],'#0a1024','#aa8294');
 oval(c,5,-7,20,29,dying?'#a4e7d2':'#e5ad9a');oval(c,7,-8,5,27,'#30213f');stroke(c,'M -59 -11 Q -5 -55 62 -14','#e1c4bd',2.5);
 if(dying){c.globalAlpha=.4;for(let i=0;i<24;i++){const a=i*2.399,r=t*17+i*4;polygon(c,[[Math.cos(a)*r,Math.sin(a)*r],[Math.cos(a)*r+9,Math.sin(a)*r-16],[Math.cos(a)*r+13,Math.sin(a)*r+4]],'#b7ebe4');}}c.restore();
}
function celebration(c:C,t:number,p:number,talk:number,peace=false){
 const pan=Math.sin(p*Math.PI)*20;background(c,t,pan,true);
 c.save();cinematicCamera(c,1.03+p*.035,576,331);
 animeScientist(c,174+pan*.25,440,1.1,t+.9,{variant:1,gesture:peace?'idle':'clap'});
 animeScientist(c,852+pan*.4,477,1.5,t+1.7,{variant:1,gesture:peace?'idle':'cheer'});
 animeScientist(c,(peace?490:340)+pan*.5,486,1.65,t,{gesture:peace?'pet':'cheer',talk});
 consoleDesk(c,595,477,1.28,t);
 animeCat(c,589,481,1.7,t,{action:peace?'sleep':'idle',emotion:'happy',turn:peace?0:Math.sin(t*.5)*.1});
 oval(c,751,468,25,7,'#d5b779',true);oval(c,751,466,19,4,'#6c4545');
 if(!peace)for(let i=0;i<64;i++){const depth=1+i%3*.4,xx=60+(i*103+t*(7+i%5))%1050,yy=83+(i*47+t*(19+i%4*8))%490;c.save();c.translate(xx,yy);c.rotate(i+t*(.8+i%3*.2));c.fillStyle=[aqua,'#e5bd78','#c2a3d5'][i%3];c.fillRect(-3*depth,-1,5*depth,2+Math.abs(Math.sin(t+i))*3);c.restore();}
 c.restore();foreground(c,pan*1.5);
}
function shadow(c:C,id:string,t:number,p:number,energy:number){
 c.fillStyle='#01030b';c.fillRect(0,76,1152,525);
 const g=c.createRadialGradient(710,355,10,710,355,430);g.addColorStop(0,'#392b4638');g.addColorStop(1,'#02040d00');c.fillStyle=g;c.fillRect(0,76,1152,525);
 if(id==='claw'){
  polygon(c,[[125,489],[636,416],[734,565],[157,638]],'#10172a','#282d41');
  const curl=interval(p,.2,.65);
  for(let i=0;i<3;i++){c.save();c.translate(321+i*91,130+i*18);c.rotate((i-1)*.08-curl*.13);
   const path=`M 0 -90 C -12 28 -24 95 -12 171 Q -16 206 ${10+curl*12} 248 Q ${36+curl*8} 221 30 184 C 20 99 42 41 45 -90 Z`;
   c.fillStyle='#060912';c.fill(new Path2D(path));stroke(c,`M ${10+curl*12} 248 Q 30 227 29 209`,'#c8a2b1',1.6);stroke(c,'M 31 181 C 20 100 38 39 40 -40','#43324c',1.2);c.restore();
  }
  const pressure=interval(p,.57,.83);c.globalAlpha=pressure;stroke(c,'M 432 423 L 471 449 L 530 440 L 584 464 M 471 449 L 455 479 M 530 440 L 551 415','#9b7994',1);c.globalAlpha=1;
 }else{
  c.save();cinematicCamera(c,1+p*.08,582,335);
  const opening=interval(p,.06,.3),height=opening*(7+energy*3),xx=737-p*15;
  c.save();c.translate(xx,291);c.rotate(-.12);c.scale(1,Math.max(.03,opening));
  polygon(c,[[-109,0],[-26,-height],[102,-3],[71,8],[-51,15]],'#846981');
  stroke(c,'M -110 0 Q -18 -19 103 -3','#c9a3b5',1.5);stroke(c,'M 16 -7 L 12 11','#f4d9c9',3);c.restore();
  // Only an edge of a plate and eye are visible. No complete head or body is drawn.
  stroke(c,'M 933 193 Q 929 362 880 394 L 847 431','#282238',2);
  if(id==='threat')stroke(c,`M 113 ${548-p*9} Q 246 520 312 467`,'#71566e',1.2);
  c.restore();
 }
}

export function drawAnimeScene(c:C,id:string,local:number,duration:number,reduced:boolean,ending:boolean,voiceId:string){
 const p=reduced?.52:clamp(local/duration),t=reduced?1:Math.floor(local*24)/24,e=voiceEnergy(voiceId,local);
 c.save();c.beginPath();c.rect(0,76,1152,525);c.clip();
 if(id==='lab'){
  const pan=mix(35,-32,smooth(p));background(c,t,pan);
  c.save();cinematicCamera(c,1.02+p*.035,576,331);
  consoleDesk(c,320+pan*.7,490,1,t);animeCat(c,324+pan*.7,486,1.08,t,{turn:-.08+interval(p,.5,.8)*.18});c.restore();foreground(c,pan*1.5);
 }else if(id==='cat'){
  background(c,t,-15);c.fillStyle='#14264055';c.fillRect(0,76,1152,525);
  const push=interval(p,.35,.88);c.save();cinematicCamera(c,1+push*.12,576+push*18,325-push*15);
  consoleDesk(c,550,510,1.8,t);animeCat(c,551,506,2.65,t,{emotion:'curious',turn:mix(-.08,.10,interval(p,.35,.6))});c.restore();foreground(c,-30);
 }else if(id==='paw'){
  background(c,t,0);c.fillStyle='#10233aac';c.fillRect(0,76,1152,525);
  c.save();cinematicCamera(c,1.06,575,338,-.09);
  polygon(c,[[130,292],[954,250],[1051,505],[156,569]],'#284556','#0d172e');
  polygon(c,[[172,320],[881,292],[935,452],[206,500]],'#152b41','#77949c');
  for(let i=0;i<9;i++)for(let j=0;j<3;j++)polygon(c,[[211+i*71,341+j*43],[261+i*71,338+j*43],[270+i*71,362+j*43],[218+i*71,366+j*43]],'#314e60','#4b687c');
  const press=interval(p,.35,.47)-interval(p,.66,.81),reach=interval(p,.12,.44);
  polygon(c,[[590,362+press*6],[700,356+press*6],[715,398+press*6],[603,409+press*6]],press?'#dafcea':'#80ccb9','#d8f6d8');
  label(c,'RETURN',651,388+press*6,15,'#183445','center');
  animePaw(c,mix(408,650,reach),mix(149,389,reach)-interval(p,.67,.94)*50,1.1,mix(-.35,-.06,reach),press);
  if(p>.45){c.globalAlpha=(1-interval(p,.6,1))*.8;stroke(c,`M 170 317 L 884 284 L 945 458`,'#aefff0',3);c.globalAlpha=1;}
  c.restore();
 }else if(id==='transfer'){
  corridor(c,t,t*2);c.save();c.translate(576,318);c.rotate(reduced?-.12:-.12+p*.45);
  for(let i=7;i>=0;i--){const r=80+i*47;c.strokeStyle=i%2?'#b49a74':'#49667b';c.lineWidth=i%2?9:4;c.beginPath();c.ellipse(0,0,r,r*.64,0,0,Math.PI*2);c.stroke();}
  c.restore();const fall=interval(p,.22,.85);c.save();c.translate(mix(338,577,fall),mix(415,319,fall));c.rotate(-fall*2.2);animeCat(c,0,0,mix(1.65,.13,fall),t,{action:'jump',emotion:'shock',quantum:fall>.52});c.restore();streaks(c,t,Math.sin(fall*Math.PI)*.7);
 }else if(id==='awakening'){
  corridor(c,t,t*.4);const land=interval(p,.02,.4),split=interval(p,.55,.83);
  const y=mix(40,471,land),squash=Math.max(0,1-Math.abs(p-.40)/.065);
  polygon(c,[[331,486],[577,431],[826,486],[578,546]],'#263e55','#729ba6');
  animeCat(c,576-split*136,y,1.7,t,{quantum:true,action:land<.95?'jump':'idle',squash,emotion:p<.5?'shock':'curious'});
  if(split>0){c.save();c.globalAlpha=split;animeCat(c,576+split*142,471,1.7,t+.17,{quantum:true,ghost:true,emotion:'curious',turn:-.12});c.restore();}
 }else if(id==='null'||id==='purged'){
  corridor(c,t,t*.13);c.fillStyle='#1e102c88';c.fillRect(0,76,1152,525);
  c.save();cinematicCamera(c,id==='purged'?1:1+p*.1,576,337,Math.sin(t*.5)*.006);
  virus(c,622,326,id==='purged'?1.25*(1-smooth(p)*.8):1.22,t,e,id==='purged');
  if(id==='null')animeCat(c,240,567,1.35,t,{quantum:true,back:true,emotion:'determined'});c.restore();
 }else if(id==='mission'){
  corridor(c,t,t*.08);c.save();cinematicCamera(c,1.02+p*.035);
  polygon(c,[[175,140],[716,120],[747,491],[153,520]],'#214251','#87b0b2');
  c.save();c.globalAlpha=.78;animeScientist(c,426,516,1.5,t,{variant:1,hologram:true,talk:e});c.restore();
  c.save();c.beginPath();c.rect(174,144,540,351);c.clip();for(let i=0;i<55;i++){c.fillStyle='#97dcd417';c.fillRect(174,144+i*7,542,1);}c.restore();
  label(c,'ADA / RETURN SIGNAL HOLDING',195,170,12,'#afe5df');animeCat(c,891,559,2.05,t,{quantum:true,back:true,turn:-.2});c.restore();
 }else if(id==='heist'){
  corridor(c,t,t*.8);const walk=interval(p,.12,.92);c.save();c.translate(576,510-walk*79);c.scale(1-walk*.2,1-walk*.2);animeCat(c,0,0,1.8,t,{quantum:true,action:'walk',emotion:'determined',back:true});c.restore();
  c.globalAlpha=interval(p,.25,.5)*(1-interval(p,.8,1));label(c,'ONE CAT. FIFTEEN SECTORS. ONE WAY HOME.',576,182,17,'#e8ded3','center');c.globalAlpha=1;
 }else if(id==='return'){
  background(c,t,12,true);consoleDesk(c,568,506,1.5,t);const landing=interval(p,.16,.66);
  const x=558,y=mix(96,496,landing),squash=Math.max(0,1-Math.abs(p-.66)/.08);
  animeCat(c,x,y,1.8,t,{quantum:landing<.9,action:landing<.95?'jump':'idle',emotion:landing<.95?'shock':'happy',squash});
  const dissolve=1-interval(p,.5,.9);c.globalAlpha=dissolve;for(let i=0;i<25;i++){const xx=470+(i*19)%220,yy=100+(i*71+t*155)%420;stroke(c,`M ${xx} ${yy} l -6 22`,'#a0ffec',1);}c.globalAlpha=1;foreground(c,30);
 }else if(id==='reunion'){
  background(c,t,20,true);c.save();cinematicCamera(c,1.05+interval(p,.2,.9)*.07,584,341);
  animeScientist(c,744,526,1.75,t,{gesture:'pet',talk:e,facing:-1});consoleDesk(c,452,519,1.5,t);
  animeCat(c,mix(338,474,interval(p,.06,.60)),514,1.8,t,{action:p<.60?'walk':'idle',emotion:'happy',turn:-.12});c.restore();foreground(c,25);
 }else if(id==='celebrate'||id==='peace')celebration(c,t,p,e,id==='peace');
 else if(id==='anomaly'){
  background(c,t,0);c.fillStyle='#01061be8';c.fillRect(0,76,1152,525);c.save();cinematicCamera(c,1+smooth(p)*.12,587,337);
  polygon(c,[[292,154],[839,131],[870,490],[270,533]],'#111a2b','#384155');
  polygon(c,[[321,183],[809,163],[829,460],[302,497]],'#02060f','#202d40');
  const signal=interval(p,.30,.45);c.globalAlpha=signal;stroke(c,'M 545 341 Q 570 341 578 332 L 584 351 L 591 331 L 600 341 L 625 341','#a48ebc',2);c.globalAlpha=1;
  label(c,'DISCONNECTED',567,430,11,'#5a5a72','center');c.restore();
 }else shadow(c,id,t,p,e);
 vignette(c,id==='claw'||id==='eye'||id==='threat'?.7:.35);
 c.restore();
}
