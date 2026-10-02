import {label,drawCat,CYAN,PINK} from './renderer';
export function drawTitleScreen(ctx: CanvasRenderingContext2D, t:number) {

  ctx.fillStyle='#0d1c25';ctx.fillRect(0,0,1152,720);
  const glow=ctx.createRadialGradient(836,300,10,836,300,420);glow.addColorStop(0,'#275b574d');glow.addColorStop(1,'#0d1c2500');ctx.fillStyle=glow;ctx.fillRect(0,0,1152,720);
  ctx.strokeStyle='#2d464d';ctx.lineWidth=1;
  for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(535+i*30,0);ctx.lineTo(535+i*30,100+i*20);ctx.lineTo(665+i*30,230+i*20);ctx.lineTo(1152,230+i*20);ctx.stroke();}
  label(ctx,'RESTRICTED EXPERIMENT / F–01',60,72,12,CYAN);
  label(ctx,'THE MILLIKELVIN',60,139,18,'#aec5c7');
  ctx.font='bold 92px Georgia';ctx.fillStyle='#e7e7d7';ctx.textAlign='left';ctx.fillText('VAULT',52,230);
  ctx.fillStyle=CYAN;ctx.fillRect(60,262,46,3);
  label(ctx,'One cat. Two possibilities.',60,312,22,'#d7ded7');
  label(ctx,'Zero permission to be here.',60,345,22,'#d7ded7');
  label(ctx,'Restore 15 sectors. Erase Null. Bring Miso home.',60,395,13,'#8ea8b0');
  label(ctx,'An animated story. A quantum puzzle adventure.',60,419,13,'#8ea8b0');
  ctx.fillStyle='#79dec4';ctx.fillRect(60,461,265,54);label(ctx,'BEGIN THE HEIST   →',83,494,16,'#0b2429');
  label(ctx,'SPACE / ENTER / CLICK TO BEGIN',60,541,10,'#7e9ba4');
  // Layered dilution-refrigerator illustration.
  ctx.save();ctx.translate(833,303);
  for(let layer=3;layer>=0;layer--){const yy=layer*48-110;
    ctx.strokeStyle='#aa8c65';ctx.lineWidth=5;
    for(const x of [-102,-56,56,102]){ctx.beginPath();ctx.moveTo(x,yy-60);ctx.lineTo(x,yy+52);ctx.stroke();}
    ctx.fillStyle='#152a34';ctx.beginPath();ctx.ellipse(0,yy+10,161,49,0,0,Math.PI*2);ctx.fill();
    const metal=ctx.createLinearGradient(-160,yy,160,yy+20);metal.addColorStop(0,'#8f7155');metal.addColorStop(.5,'#d9ba84');metal.addColorStop(1,'#584b42');ctx.fillStyle=metal;ctx.beginPath();ctx.ellipse(0,yy,161,43,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e1c697';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#193943';ctx.beginPath();ctx.ellipse(0,yy,119,28,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#6ec1b780';ctx.beginPath();ctx.ellipse(0,yy,92,20,0,0,Math.PI*2);ctx.stroke();
  }
  for(let i=0;i<8;i++){ctx.strokeStyle=i%2?'#779391':'#977954';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-100+i*29,-190);ctx.bezierCurveTo(-120+i*30,-220,-110+i*30,-252,-80+i*22,-280);ctx.stroke();}
  ctx.restore();
  drawCat(ctx,801,449,3.1,-.2,t,CYAN,true);
  drawCat(ctx,979,484,1.45,-.2,t,PINK,false,true);
  ctx.strokeStyle='#c699dc66';ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(860,462);ctx.bezierCurveTo(910,416,931,540,976,486);ctx.stroke();ctx.setLineDash([]);
  label(ctx,'|0⟩',714,526,16,CYAN);label(ctx,'|1⟩',993,537,16,PINK);
  label(ctx,'MISO / SPECIMEN F–01',765,588,10,'#a3b8bc');label(ctx,'FOIL FAMILIAR / STATE CARRIER',765,608,9,'#6e8c96');
  ctx.strokeStyle='#2c454e';ctx.beginPath();ctx.moveTo(60,637);ctx.lineTo(1092,637);ctx.stroke();
  label(ctx,'01  SPLIT',60,674,12,CYAN);label(ctx,'02  MANIPULATE',260,674,12,'#d8bb8f');label(ctx,'03  TRANSFER',497,674,12,PINK);label(ctx,'16 mK  /  ARCHIVE ONLINE',1092,674,10,'#6b9399','right');
}

