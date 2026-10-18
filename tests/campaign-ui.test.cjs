// DOM harness for real UI handlers. Browser rendering is checked separately.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const api=require('../campaign-core.js');
function boot(store=new Map(),blocked=false,debug=true){
 const elements=new Map(),listeners={},winListeners={};
 const context2d=new Proxy({}, {get:(o,k)=>o[k]||(o[k]=k.startsWith('create')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 function el(id){if(!elements.has(id)){const item={id,tagName:'DIV',style:{},value:'',disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},getContext:()=>context2d,getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:1120,height:680})};let html='';Object.defineProperty(item,'innerHTML',{get:()=>html,set:v=>{html=v;for(const m of v.matchAll(/id="([^"]+)"/g))el(m[1]);}});elements.set(id,item);}return elements.get(id);}
 const ctx={CelestialCampaign:api,console,Math,JSON,URL,URLSearchParams,Blob,setTimeout,location:{search:debug?'?test':''},document:{body:{dataset:{},appendChild(){}} ,getElementById:el,addEventListener:(k,f)=>listeners[k]=f,createElement:()=>el('created')},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return store.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');store.set(k,v);},removeItem:k=>store.delete(k)},addEventListener:(k,f)=>winListeners[k]=f,requestAnimationFrame:f=>{ctx.frame=f;}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../campaign.js'),'utf8'),ctx);
 return {ctx,el,store,click:id=>{assert.equal(typeof el(id).onclick,'function',id);el(id).onclick();},g:()=>ctx.__campaign.get(),frame:()=>ctx.frame(20),render:()=>ctx.__campaign.render(),key:(key)=>listeners.keydown({key,repeat:false,target:{tagName:'BODY'},preventDefault(){}})};
}
const u=boot();u.el('seedInput').value='UI-FLOW';u.click('newBtn');assert.equal(u.g().story,'opening');u.click('storyNext');const offered=[...u.g().deck];
const reloaded=boot(u.store);reloaded.click('continueBtn');assert.deepEqual(reloaded.g().deck,offered);
u.click('pick-thunder');const entry=u.store.get('tiangui-campaign-run-v1-test');u.g().tick(.02,{mx:1});u.key('p');assert.equal(u.g().phase,'paused');u.click('resumeBtn');assert.equal(u.store.get('tiangui-campaign-run-v1-test'),entry,'pause must not overwrite room entrance checkpoint');
u.click('editBtn');u.click('amend-cancel');assert(!u.g().edited);u.click('bookBtn');assert(u.el('overlay').innerHTML.includes('二十四项功法'));u.click('bookClose');assert.equal(u.g().phase,'combat');
function clear(){while(u.g().phase==='combat'){u.g().enemies.forEach(e=>u.g().damage(e,10000,'sword'));u.g().tick(.02);}u.ctx.__campaign.save();u.render();}
let steps=0;
while(u.g().phase!=='end'&&steps++<100){const g=u.g();switch(g.phase){
 case 'combat':u.click('testClear');break;
 case 'story':u.click('storyNext');break;
 case 'route':u.click('route-normal');break;
 case 'reward':u.click('pick-'+g.deck[0]);break;
 case 'replace':{const candidate=g.build.find(id=>!api.SKILL[g.buildPending].bridge||api.SKILL[id].bridge)||g.build[0];u.click('replace-'+candidate);break;}
 case 'witnesschoice':u.click('witness-yes');break;
 case 'camp':u.click('camp-leave');break;
 case 'bossreward':u.click('boss-skip');break;
 case 'finalchoice':u.click('ending-inherit');break;
 default:throw Error(g.phase);
}}
assert(u.g().result.win);assert.equal(u.g().result.ending,'inherit');assert.equal(u.g().stats.rooms,16);assert.equal(u.g().witnesses.length,4);assert(!u.store.has('tiangui-campaign-run-v1-test'));assert(u.el('overlay').innerHTML.includes('四案终审'));
u.click('sameBtn');assert.equal(u.g().seed,'UI-FLOW');assert.equal(u.g().build.length,0);assert(JSON.parse(u.store.get('tiangui-campaign-evidence-v1-test')).includes('testimony'));
const craft=boot();craft.click('newBtn');craft.click('storyNext');craft.click('pick-echo');assert.equal(craft.g().vow,'paper');craft.click('testClear');craft.click('route-normal');craft.click('testClear');const sealed=craft.g().deck[0];craft.click('banish-'+sealed);assert.equal(craft.g().banishCharges,1);assert(!craft.g().deck.includes(sealed));assert(craft.el('overlay').innerHTML.includes('剩余 1 次'));const resumed=boot(craft.store);resumed.click('continueBtn');assert(resumed.g().banished.includes(sealed));assert.equal(resumed.g().vow,'paper');
const noStore=boot(new Map(),true);noStore.click('newBtn');noStore.click('storyNext');noStore.click('pick-thunder');assert.equal(noStore.g().phase,'combat');assert(noStore.el('saveStatus').textContent.includes('存储不可用'));
const normal=boot(new Map(),false,false);assert.equal(normal.ctx.__campaign,undefined);
console.log('UI flow passed: opening, rewards, restored offers, pause checkpoint, edit cancel, codex, four chapters and final judgment, victory, restart, persistent evidence, storage failure, no normal debug hook.');
