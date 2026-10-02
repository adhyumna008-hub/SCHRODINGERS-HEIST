import { levelStory } from '../story/story';
import type { RoomData, SecurityCamera, GateType } from './types';
import { createDoor, createPanel, createPressurePlate, createSwitch } from './doors';
import { createRoom1a } from './rooms/room1a';
import { createRoom1b } from './rooms/room1b';
import { createRoom2 } from './rooms/room2';
import { createRoom3 } from './rooms/room3';

const camera=(x:number,y:number,angle=90,range=5):SecurityCamera=>({pos:{x,y},baseAngle:angle,currentAngle:angle,amplitude:25,period:6,halfAngle:18,range,lockOn:{active:false,targetPos:{x:0,y:0},timer:0}});
const circuit=(x:number,y:number,type:GateType,id:string,seq:GateType[])=>({...createPanel(x,y,type,[id]),requiredSequence:seq});
function base(n:number,name:string,story:string):RoomData{return {
 id:'sector'+n,name,chapter:n>=9?3:2,subtitle:story,accentColor:n>=9?'#d99ae9':'#6ce8d2',
 objective:n<9?'Restore the circuits and release the sector exit.':'Restore every circuit. Transfer through the receiver-only membrane.',
 requireAllCircuits:true,walls:[],cameras:[],lasers:[],panels:[],pressurePlates:[],switches:[],doors:[],
 playerStart:{x:2,y:6},exitTrigger:{pos:{x:22,y:6},size:{x:1,y:1}},parTime:70+n*3,
 labNote:story,missionControlLine:story,
};}
function laser(r:RoomData,x:number,id:string){r.lasers.push({id,group:id,start:{x,y:0},end:{x,y:13},active:true});}
function partition(r:RoomData,x:number,y:number){r.walls.push({x,y:0,w:1,h:y},{x,y:y+3,w:1,h:13-y-3});}
function build(n:number):RoomData{
 const names=['Twin memory','The dead register','Interference engine','Watchdog alley','The missing bit','Cold storage','Echo archive','Firewall relay','The last backup','Null perimeter','The heart of Null'];
 const stories=[
  'ADA: Miso, those two memory cells remember the lab. Hold them together.',
  'NULL has rewritten the register. A bit flip can restore the first clean backup.',
  'ADA: Cancel two Hadamards, then flip the bit. The interference engine still works.',
  'NULL: I see every possibility. ADA: Then give it the wrong one to watch.',
  'ADA: The receiver survived. The cat-shaped state arriving is still you.',
  'A sealed archive holds ADA’s voice. Open its shutter and carry the signal inside.',
  'Miso finds a memory of a warm windowsill. There is still a home to return to.',
  'NULL is defending the relay. Repair the outer circuit before opening its receiver.',
  'ADA: One last backup. One more chance. I am keeping the return channel open.',
  'The virus has fallen back to its core. Cut the firewall and restore the correction circuit.',
  'ADA: Repair all three seals, transfer inside, then use the purge switch. Bring yourself home.'
 ];
 const r=base(n,names[n-5],stories[n-5]);
 if(n===5){
  r.walls=[{x:7,y:3,w:2,h:7},{x:13,y:0,w:2,h:5},{x:13,y:8,w:2,h:5},{x:21,y:5,w:2,h:1},{x:21,y:7,w:2,h:1}];
  r.pressurePlates=[createPressurePlate(18,3,['exit']),createPressurePlate(18,9,['exit'])];
  r.doors=[createDoor('exit',21,6,2,1,[], 'all',true)];
  r.cameras=[camera(10,1,90,5)];r.vents=[{from:{x:5,y:2},to:{x:10,y:2}}];
  r.objective='Reach the paired cells. Split on one plate and hold the other.';
  r.hints=['Cross the memory maze as one cat to conserve coherence.','Reach the two plates on the right before splitting. The exit has five seconds of grace.','Go around the first wall at its top, cross the middle gap at row 6, then stand on the upper plate. Space splits; move down to the lower plate, then head right and up to the exit.'];
 }else if(n<9){
  const gap=n===6?2:n===7?7:5;
  partition(r,8,gap);laser(r,8,'bank');
  r.panels=[circuit(5,gap+1,'X','bank',n===7?['H','H','X']:n===8?['X','X','X']:['X'])];
  partition(r,16,5);r.doors=[createDoor('shutter',16,5,1,3,[])];
  r.panels.push(circuit(13,9,'H','shutter',n===6?['H']:n===7?['X','H']:['X','X','H']));
  r.cameras=[camera(11,1,90,n===8?7:4)];
  if(n===8){r.walls.push({x:11,y:5,w:1,h:2});r.cameras.push(camera(20,11,-90,4));}
  r.objective=`Left circuit: ${r.panels[0].requiredSequence!.join(' → ')}. Right shutter: ${r.panels[1].requiredSequence!.join(' → ')}.`;
  r.hints=['Each laser bank and shutter has its own circuit. Repair from left to right.','Use Space at the left terminal, enter its engraved sequence, then cross the gap. Keep your distance from the observer.',`Program ${r.panels[0].requiredSequence!.join(' → ')} at the left terminal. Cross the wall through its ${gap===2?'upper':gap===7?'lower':'middle'} gap. Reach the lower-right H terminal and run ${r.panels[1].requiredSequence!.join(' → ')}. Cross the middle-right shutter and reach the exit.`];
 }else{
  r.beaconPickup={x:4,y:6};r.beaconTarget={pos:{x:19,y:6}};
  r.walls=[{x:17,y:2,w:6,h:1},{x:17,y:10,w:6,h:1},{x:22,y:3,w:1,h:7},{x:17,y:3,w:1,h:2},{x:17,y:7,w:1,h:3}];
  r.membranes=[{x:17,y:5,w:1,h:2}];r.exitTrigger={pos:{x:21,y:8},size:{x:1,y:1}};
  r.doors=[createDoor('receiver',17,5,1,2,[])];
  const seq:GateType[]=n%3===0?['X','H']:n%3===1?['H']:['X','X','H'];
  r.panels=[circuit(15,8,'H','receiver',seq)];
  if(n>=10){const y=n%2?3:8;partition(r,8,y);laser(r,8,'outer');r.panels.unshift(circuit(5,y+1,'X','outer',n===12?['H','H','X']:['X']));}
  if(n>=12){r.cameras.push(camera(11,1,90,4));r.walls.push({x:12,y:4,w:1,h:2});}
  if(n===11||n===13){r.lasers.push({id:'sweep',group:'sweep',start:{x:20,y:3},end:{x:20,y:7},active:true,sweeping:{axis:'x',min:19,max:21,speed:1.1,pos:20,direction:1}});}
  if(n===14||n===15){laser(r,13,'inner');r.panels.splice(1,0,circuit(11,9,'X','inner',['H','H','X']));}
  if(n===15){r.virusCore={x:20,y:5};r.switches=[createSwitch(20,8,['purge'])];r.doors.push(createDoor('purge',21,8,1,1,[], 'all',true));r.objective='Repair X, H → H → X, then X → H. Transfer inside. Space at PURGE. Escape.';}
  const sequence=r.panels.map(p=>p.requiredSequence!.join(' → ')).join('; then ');
  r.hints=['Pick up the receiver near the start. Restore every terminal before entering the sealed archive.',`Work left to right: ${sequence}. The dotted membrane stops your body, but allows a receiver through.`,`Collect the receiver. Repair terminals left to right (${sequence}). Stand just left of the membrane at row 6, face right and press E. Wait for landing, then E again.${n===11||n===13?' Wait until the moving laser is away from your landing spot.':''}${n===15?' Inside, approach the PURGE switch below the core and press Space.':''} Walk to the lower-right exit.`];
 }
 return r;
}
const tutorials=[createRoom1a,createRoom1b,createRoom2,createRoom3];
const tutorialNames=['Calibration annex','The Witness Gallery','The Switchyard','The Sealed Receiver'];
const tutorialObjectives=['Split so one cat holds each plate, then reach the exit while it is open.','Activate the upper switch, split, leave one cat on the lower plate, then escape.','Program X at the first terminal to disable the lasers; program X → X → H at the shutter.','Collect the receiver, program X → H, throw it through the marked gap, transfer, then reach the exit.'];
const tutorialHints=[
 ['Travel to the two plates on the right before splitting.','Leave one cat on the upper plate and walk the other to the lower one. Both presences are needed.','At the upper-right plate, press Space. Move down to the lower-right plate. Once the exit opens, go right and up into it within five seconds.'],
 ['The lower-left plate and upper-right switch control the same door.','First activate the upper-right switch. It stays on. Then return to the lower-left plate.','Activate the switch with Space. Return to the lower-left plate and split. Leave one cat there; take the other along the bottom, around the walls and up to the right-hand exit.'],
 ['The X terminal disables the laser bank. The H terminal controls the final shutter.','Run X at the lower-left terminal. Cross the disabled laser bank and use the lower-right terminal.','At the first terminal press Space, X, Enter. At the second, Space, X, X, H, Enter. Cross the shutter through its middle opening and reach the exit. Avoid the upper cameras.'],
 ['Walk onto the marked receiver near your starting point. It is collected automatically. The dotted membrane blocks Miso.','At the H terminal above the pickup, press Space, type X then H, and press Enter. The terminal opens a quantum path for the receiver.','Collect the receiver; program X → H. Go to column 15, row 5, just left of the middle gap, and face right. Wait until the sweeping laser is at the far left and moving right, then press E to throw. Wait for landing, press E again to transfer. Go down to row 6, move right below the beam, then go up to the exit at column 21, row 5.']
];
const layouts:(()=>RoomData)[]=[...tutorials.map((make,i)=>()=>{const r=make();r.name=tutorialNames[i];r.objective=tutorialObjectives[i];r.hints=tutorialHints[i];return r;}),...Array.from({length:11},(_,i)=>()=>build(i+5))];
export const campaignActs=['I / A CAT OUT OF PLACE','II / RECOVER THE MEMORY','III / ERASE NULL'];

// Story objectives are attached to the existing maps; save IDs remain stable.
export const campaign=layouts.map((make,index)=>()=>{
 const r=make(),beat=levelStory[index];r.missionControlLine=beat.speaker+': '+beat.brief;
 const memory=index===4?{pos:{x:18,y:3},label:'IDENTITY'}:index===9?{pos:{x:19,y:8},label:'DESTINATION'}:index===12?{pos:{x:19,y:8},label:'RETURN KEY'}:null;
 if(memory){
  r.storyMemories=[{...memory,collected:false}];
  r.objective=index===4?'Recover IDENTITY at the upper plate. Hold both plates, then escape.':'Repair the circuits. Transfer inside, recover '+memory.label+', then escape.';
  r.hints=r.hints!.map((hint,tier)=>hint+(tier===2?' Collect the '+memory.label+' archive '+(index===4?'on the upper plate':'at the lower-left corner inside the receiver chamber')+' before leaving.':''));
 }
 if([6,10,13].includes(index))r.storyMark={x:index===6?12:20,y:3};
 if(index===14){
  r.switches=[{...createSwitch(19,4,['purge']),label:'ISOLATE',requiresPanels:true},{...createSwitch(20,8,['purge']),label:'PURGE',requiresPanels:true,requiresSwitches:[0]}];
  r.objective='Repair three seals. Transfer in. ISOLATE above the core, then PURGE below. Return home.';
  r.hints=[
   'Cut the two firewall banks and repair the receiver. The core needs isolation before it can be purged.',
   'Repair X, H → H → X, then X → H. Transfer at the middle gap. Use the upper ISOLATE switch first.',
   'Repair the three terminals left to right. At row 6, face right from just left of the membrane; E, wait, E. Inside, use Space at ISOLATE above the core, then Space at PURGE below. Take the lower-right exit.'
  ];
 }
 return r;
});
