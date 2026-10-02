import script from './script.json';
import { voiceDuration } from '../core/voice';
export const levelStory=script.levels;
export const openingFilm=script.opening.map(s=>({...s,voiceId:'intro-'+s.id,duration:Math.max(s.duration,voiceDuration('intro-'+s.id)+1.4)}));
export const endingFilm=script.ending.map(s=>({...s,voiceId:'ending-'+s.id,duration:Math.max(s.duration,voiceDuration('ending-'+s.id)+1.4)}));
export function briefingDuration(index:number){return Math.max(7,voiceDuration('level-'+(index+1)+'-brief')+1.5);}
