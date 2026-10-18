const {Campaign,dist,CHAPTERS}=require('../campaign-core.js');
function simulate(seed,style,ending='inherit'){
 const g=new Campaign();g.start(seed);let steps=0;
 const order=style==='sword'?['inscribe','third','turret','lawblade','chain','force','echo','substitute','thunder','march','pilgrim','borrow']:style==='paper'?['echo','thunder','march','turret','pilgrim','substitute','chain','inscribe','lawblade','force','third','borrow']:['thunder','inscribe','lawblade','chain','third','march','turret','echo','force','substitute','pilgrim','borrow'];
 while(g.phase!=='end'&&steps++<100000){
  if(g.phase==='story')g.continueStory();
  else if(g.phase==='reward')g.chooseSkill([...g.deck].sort((a,b)=>order.indexOf(a)-order.indexOf(b))[0]);
  else if(g.phase==='replace')g.replaceSkill(g.build.find(id=>!require('../campaign-core.js').SKILL[g.buildPending].bridge||require('../campaign-core.js').SKILL[id].bridge)||g.build[0]);
  else if(g.phase==='witnesschoice')g.chooseWitness(true);
  else if(g.phase==='finalchoice'){if(!g.chooseEnding(ending))break;}
  else if(g.phase==='route')g.chooseRoute('normal');
  else if(g.phase==='camp'){g.camp('heal');g.camp('leave');}
  else if(g.phase==='bossreward')g.upgradeBoss(g.build.find(id=>g.levels[id]<3)||null);
  else if(g.phase==='combat'){
   if(!g.edited){g.edit();g.amend('demons');}
   const p=g.player,near=g.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(p,a)-dist(p,b))[0];
   const phase=g.roomTime*.48,goal={x:560+400*Math.cos(phase),y:390+170*Math.sin(phase)};
   if(g.endingMode&&g.endingMode!=='break'&&!g.token){goal.x=560;goal.y=355;if(dist(p,goal)<110)g.interact();}
   if(g.endingMode==='break'&&g.pillars.some(o=>o.hp>0)){const pillar=g.pillars.find(o=>o.hp>0);goal.x=pillar.x;goal.y=pillar.y;if(dist(p,pillar)<90)g.interact();if(dist(p,pillar)<30&&g.lawKind()===0){goal.x=p.x+15;goal.y=p.y+Math.sin(g.roomTime)*30;}}
   const way=g.waypoint(p,goal);let mx=way.x-p.x,my=way.y-p.y,n=Math.hypot(mx,my)||1;mx/=n;my/=n;
   // Circle through the arena; retreat locally from nearby enemies. No stat mutations.
   if(!g.endingMode&&near&&dist(p,near)<100){mx+=(p.x-near.x)/100*2;my+=(p.y-near.y)/100*2;n=Math.hypot(mx,my)||1;mx/=n;my/=n;}
   const bait=g.chapter?g.activeStatue():near||goal;
   if(p.paperCd<=0&&!(g.endingMode==='break'&&g.clock<2.5))g.castPaper(bait);
   g.tick(.033,{mx,my,point:g.endingMode==='break'&&g.lawKind()===1&&g.clock<.35?g.activeStatue():near||goal,fire:true,push:near&&dist(p,near)<160,dash:near&&dist(p,near)<65});
  }else throw Error(g.phase);
 }
 return {seed,style,vow:g.vow,ending,witnesses:g.witnesses,result:g.result,seconds:+g.elapsed.toFixed(1),hp:g.hp,chapter:g.chapter+1,node:g.node+1,build:g.build,stats:g.stats};
}
const results=['A','B','C'].flatMap(seed=>['rules','paper','sword'].map(style=>simulate(seed,style)));
if(require.main===module){console.log(JSON.stringify(results,null,2));}
module.exports={simulate};
