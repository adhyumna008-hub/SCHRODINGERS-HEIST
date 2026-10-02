import { label, polygon, CYAN } from './renderer';
import { oval as ellipse } from './anime-actors';
import { drawAnimeScene } from './anime-scenes';
import { openingFilm, endingFilm } from '../story/story';
export const storyShots=openingFilm;
export const endingShots=endingFilm;
function line(c:CanvasRenderingContext2D,p:number[][],color:string,width=1){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
export function cinematicShot(time:number,ending=false){const shots=ending?endingShots:storyShots;let offset=0;for(let i=0;i<shots.length;i++){if(time<offset+shots[i].duration)return {index:i,local:time-offset,shot:shots[i],done:false};offset+=shots[i].duration;}return {index:shots.length-1,local:shots[shots.length-1].duration,shot:shots[shots.length-1],done:true};}
export function nextShotTime(time:number,ending=false){const shots=ending?endingShots:storyShots;const s=cinematicShot(time,ending);return shots.slice(0,s.index+1).reduce((a,b)=>a+b.duration,0);}
export function drawNull(c:CanvasRenderingContext2D,x:number,y:number,s:number,t:number,cleansed=false){
 c.save();c.translate(x,y);c.scale(s,s);const color=cleansed?CYAN:'#ec927e';
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9+t*.12;line(c,[[Math.cos(a)*40,Math.sin(a)*40],[Math.cos(a)*90,Math.sin(a)*90],[Math.cos(a+.23)*130,Math.sin(a+.23)*130]],color,2);polygon(c,[[Math.cos(a)*100,Math.sin(a)*100],[Math.cos(a)*116+8,Math.sin(a)*116],[Math.cos(a)*116-8,Math.sin(a)*116+10]],'#6c393e',color);}
 polygon(c,[[-65,0],[-30,-55],[35,-49],[69,4],[25,57],[-40,48]],cleansed?'#193f42':'#321e2d',color);
 polygon(c,[[-45,0],[0,-23],[46,0],[0,23]],'#09151d',color);ellipse(c,Math.sin(t)*5,0,7,19,color);c.restore();
}
export function drawCinematic(c:CanvasRenderingContext2D,time:number,reduced:boolean,ending=false){
 const {index,local,shot}=cinematicShot(time,ending);
 c.fillStyle='#030817';c.fillRect(0,0,1152,720);
 if(ending&&shot.id==='cut'){
  c.fillStyle='#000';c.fillRect(0,0,1152,720);
  if(local>1.2)label(c,'TO BE CONTINUED',576,370,17,'#a69aae','center');
  return;
 }
 drawAnimeScene(c,shot.id,local,shot.duration,reduced,ending,shot.voiceId);
 // Consistent cinematic mattes, subtitles, and an unobtrusive shot-progress rail.
 const shade=c.createLinearGradient(0,465,0,630);shade.addColorStop(0,'#06111a00');shade.addColorStop(1,'#06111a');c.fillStyle=shade;c.fillRect(0,465,1152,165);
 c.fillStyle='#050d14';c.fillRect(0,0,1152,76);c.fillRect(0,601,1152,119);
 label(c,'SCHRÖDINGER’S HEIST / MISO & THE NULL PROTOCOL',36,43,12,'#b8c9c2');label(c,String(index+1).padStart(2,'0')+' / '+(ending?endingShots.length:storyShots.length),1114,43,12,CYAN,'right');
 label(c,shot.title,576,576,12,shot.speaker==='Unknown'?'#b597bb':CYAN,'center');
 label(c,shot.speaker==='Unknown'?'???':shot.speaker.toUpperCase(),576,622,10,shot.speaker==='Unknown'?'#b597bb':CYAN,'center');
 c.font='20px Georgia';c.textAlign='center';c.fillStyle='#efe7d6';
 const words=shot.caption.split(' ');let text='',lines:string[]=[];
 for(const word of words){if(c.measureText(text+' '+word).width>1010){lines.push(text);text=word;}else text+=(text?' ':'')+word;}if(text)lines.push(text);
 lines.forEach((line,i)=>c.fillText(line,576,lines.length>1?647+i*24:655));
 label(c,'SPACE / NEXT SHOT     ·     ESC / SKIP     ·     P / PAUSE',576,687,10,'#7b9aa5','center');
 const shots=ending?endingShots:storyShots;for(let i=0;i<shots.length;i++){c.fillStyle=i<index?CYAN:i===index?'#dfc293':'#2c424c';c.fillRect(36+i*(1080/shots.length),708,(1080/shots.length)-5,2);}
 if(!reduced){const fade=Math.max(0,1-local/.45,ending&&index===8?0:(local-shot.duration+.45)/.45);c.fillStyle=`rgba(5,13,20,${fade})`;c.fillRect(0,76,1152,525);}
}

