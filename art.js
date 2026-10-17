'use strict';
// Visual layer only: never consumes the seeded gameplay random stream.
window.TianguiArt = (() => {
  const images = {}, status = {};
  const ready = Promise.all(['courtyard','characters','title'].map(name => new Promise(resolve => {
    const im = images[name] = new Image();
    im.onload = () => { status[name] = 'ready'; resolve(); };
    im.onerror = () => { status[name] = 'failed'; resolve(); };
    im.src = 'assets/' + name + '.png';
  })));
  const tau = Math.PI * 2;
  function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
  function background(c,t){
    if(status.courtyard!=='ready')return false;
    c.drawImage(images.courtyard,0,0,1120,680);
    c.fillStyle='#07151a24';c.fillRect(0,0,1120,680);
    c.save();c.globalCompositeOperation='screen';
    for(const x of [438,688])glow(c,x,40,85,'rgba(238,145,58,'+(.12+Math.sin(t*3+x)*.025)+')');
    for(let i=0;i<6;i++)glow(c,((i*240+t*8)%1500)-160,130+i*95,160,'rgba(112,157,167,.045)');
    for(let i=0;i<25;i++){const x=(i*173+t*(4+i%3))%1120,y=(i*97-t*8+6800)%680;c.fillStyle=i%3?'#bbd4d14a':'#e5b77590';c.fillRect(x,y,1.5,1.5)}
    c.restore();return true;
  }
  const cells={player:0,walker:1,paper:1,charger:2,shooter:3,brute:4,boss:5};
  function figure(c,x,y,type,flash,alpha,t){
    if(status.characters!=='ready')return false;
    const n=cells[type]??1,size=type==='boss'?146:type==='brute'?110:type==='player'?88:78;
    const friendly=type==='player'||type==='paper';
    c.save();c.translate(x,y);c.globalAlpha=alpha;
    const shadow=c.createRadialGradient(0,10,1,0,10,size*.31);shadow.addColorStop(0,'#000a');shadow.addColorStop(1,'#0000');c.fillStyle=shadow;c.beginPath();c.ellipse(0,10,size*.34,12,0,0,tau);c.fill();
    c.strokeStyle=friendly?'#a6ead5bb':'#e5846970';c.lineWidth=friendly?1.6:1;c.beginPath();c.ellipse(0,9,type==='boss'?37:16,6,0,0,tau);c.stroke();
    const bob=Math.sin(t*3+x*.03)*1.4;
    if(type==='paper')c.globalAlpha*=.72;
    if(flash){c.shadowColor=friendly?'#d9ffef':'#ffd4a3';c.shadowBlur=13;}
    c.drawImage(images.characters,n%3*512,Math.floor(n/3)*512,512,512,-size/2,-size+19+bob,size,size);
    if(type==='player'){c.fillStyle='#c3f8e7';c.beginPath();c.moveTo(0,24);c.lineTo(-4,29);c.lineTo(4,29);c.fill();}
    c.restore();return true;
  }
  return {ready,status,background,figure};
})();
