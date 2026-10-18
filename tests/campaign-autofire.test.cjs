const assert=require('node:assert/strict');const {Campaign}=require('../campaign-core.js');
function room(){const g=new Campaign();g.start('AUTO');g.beginRoom();g.enemies=[];const e=g.makeEnemy('walker',560,300);e.hp=e.maxHp=1000;e.speed=0;return {g,e};}
let {g,e}=room();g.tick(.02);assert.equal(g.attackCount,1);assert.equal(g.shots[0].targetId,e.id);for(let i=0;i<50;i++)g.tick(.02);assert(e.hp<1000);assert.equal(g.attackCount,3,'preserve 0.34s cadence without any fire input');
({g,e}=room());g.tick(.02,{blind:true});assert.equal(g.attackCount,0);g.tick(.02,{blind:false});assert.equal(g.attackCount,1,'opening eyes resumes fire');
({g,e}=room());g.obstacles=[{x:450,y:390,w:220,h:30}];g.tick(.02);assert.equal(g.attackCount,0,'no target through wall');g.obstacles=[];g.tick(.02);assert.equal(g.attackCount,1);
({g,e}=room());e.hp=0;g.tick(.02);assert.equal(g.attackCount,0,'no shots at dead enemies');
for(const phase of ['paused','story','reward','edit','book','end']){({g,e}=room());g.phase=phase;g.tick(.02);assert.equal(g.attackCount,0,phase+' stops autofire');}
console.log('Autofire checks passed: no input, cooldown cadence, homing, blind/resume, walls, dead enemies, noncombat phases.');
