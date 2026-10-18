const assert=require('node:assert/strict');
const {Campaign}=require('../campaign-core.js');
function room(){const g=new Campaign();g.start('HOMING');g.beginRoom();g.enemies=[];return g;}
function foe(g,x,y){const e=g.makeEnemy('walker',x,y);e.speed=0;return e;}
const g=room(),near=foe(g,560,430),far=foe(g,900,200);g.attack({x:1000,y:600});assert.equal(g.shots[0].targetId,near.id);assert(g.shots[0].vy<0);assert.equal(g.player.facing,-Math.PI/2);
for(const kind of ['active','paper','follow']){const h=room(),e=foe(h,560,270);h.fire(h.player,e,16,kind);const shot=h.shots[0];e.x=680;h.tick(.02,{autoFire:false});assert(shot.vx>0,kind+' tracks lateral movement');for(let n=0;n<40;n++)h.tick(.02,{autoFire:false});assert(e.hp<e.maxHp,kind+' hits');assert.equal(e.mark,0,kind+' must not invent mark effects');}
const r=room(),dead=foe(r,560,300),live=foe(r,740,350);r.fire(r.player,dead,16);const shot=r.shots[0];dead.hp=0;r.tick(.02,{autoFire:false});assert.equal(shot.targetId,live.id);shot.hits=[live.id];r.trackSword(shot);assert.equal(shot.targetId,null,'never retarget a pierced enemy');
const b=room();foe(b,560,300);b.obstacles=[{x:450,y:390,w:220,h:30}];assert.equal(b.swordTarget(b.player),undefined);b.fire(b.player,{x:560,y:300},16);for(let i=0;i<20;i++)b.tick(.02,{autoFire:false});assert.equal(b.enemies[0].hp,b.enemies[0].maxHp,'walls still block swords');
const hostile={kind:'enemy',x:560,y:300,vx:12,vy:34};b.trackSword(hostile);assert.equal(hostile.vx,12);assert.equal(hostile.vy,34);
console.log('Homing checks passed: cursor-independent acquisition, three sword types, moving target hit, dead-target switching, no repeat pierced hits, wall collision, unchanged hostile shots.');
