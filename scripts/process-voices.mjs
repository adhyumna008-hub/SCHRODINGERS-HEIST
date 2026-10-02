import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const input=JSON.parse(fs.readFileSync(root+'src/assets/voice-raw.json','utf8').replace(/^\uFEFF/,''));
const output={},envelopes={};
for(const [id,clip] of Object.entries(input)){
 const wav=Buffer.from(clip.src.split(',')[1],'base64');let offset=12,rate=0,pcm;
 while(offset+8<=wav.length){const kind=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);if(kind==='fmt '){rate=wav.readUInt32LE(offset+12);if(wav.readUInt16LE(offset+8)!==1||wav.readUInt16LE(offset+10)!==1||wav.readUInt16LE(offset+22)!==16)throw Error('Expected mono PCM16');}if(kind==='data')pcm=wav.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
 if(!pcm||!rate)throw Error('Invalid WAV '+id);
 const dark=clip.speaker==='Unknown',nullVoice=clip.speaker==='Null';
 const pitch=dark?.76:nullVoice?.9:1,targetRate=16000,ratio=rate/targetRate*pitch;
 const dryLength=Math.ceil(pcm.length/2/ratio),tail=dark?.48:nullVoice?.2:0;
 const samples=new Float32Array(dryLength+Math.ceil(targetRate*tail));
 for(let i=0;i<dryLength;i++){const at=i*ratio,lo=Math.floor(at),mix=at-lo;const a=pcm.readInt16LE(Math.min(lo*2,pcm.length-2)),b=pcm.readInt16LE(Math.min((lo+1)*2,pcm.length-2));samples[i]=(a+(b-a)*mix)/32768;}
 if(dark||nullVoice){const delay=Math.round(targetRate*(dark?.145:.075));for(let i=samples.length-1;i>=delay;i--)samples[i]=samples[i]*.83+samples[i-delay]*.2+(i>=delay*2?samples[i-delay*2]*.1:0);}
 const bytes=Buffer.alloc(44+samples.length*2);bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(targetRate,24);bytes.writeUInt32LE(targetRate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++)bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),44+i*2);
 output[id]={src:'data:audio/wav;base64,'+bytes.toString('base64'),duration:samples.length/targetRate};
 const values=[],hop=targetRate/24;
 for(let i=0;i<samples.length;i+=hop){let sum=0,n=0;for(let j=Math.floor(i);j<Math.min(i+hop,samples.length);j+=4){sum+=samples[j]*samples[j];n++;}values.push(Math.sqrt(sum/Math.max(1,n)));}
 const peak=Math.max(...values,.01);envelopes[id]=values.map(v=>Math.round(Math.min(1,v/peak*1.4)*100)/100);
}
fs.writeFileSync(root+'src/assets/voices.json',JSON.stringify(output));
fs.writeFileSync(root+'src/assets/voice-envelope.json',JSON.stringify(envelopes));
fs.unlinkSync(root+'src/assets/voice-raw.json');
console.log(`Embedded ${Object.keys(output).length} voice clips; ${Math.round(Object.values(output).reduce((sum,c)=>sum+c.duration,0))} seconds.`);
