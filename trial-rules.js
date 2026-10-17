'use strict';
// Shared geometry and seeded content selection; usable in browser and Node tests.
(function(root){
 const TAU=Math.PI*2;
 const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 function sees(statue,actor){const dx=actor.x-statue.x,dy=actor.y-statue.y,d=Math.hypot(dx,dy);return d>30&&d<=statue.range&&Math.abs(angleDelta(Math.atan2(dy,dx),statue.angle))<=statue.half;}
 function faces(actor,target){return Math.abs(angleDelta(actor.facing,Math.atan2(target.y-actor.y,target.x-actor.x)))<=Math.PI/3;}
 function guilty(statue,actor,edict='front'){if(actor.paper||actor.blind||actor.hp<=0||!sees(statue,actor))return false;if(edict==='demons'&&actor.player)return false;return edict==='back'?!faces(actor,statue):faces(actor,statue);}
 function random(seed){let a=2166136261;for(const ch of seed)a=Math.imul(a^ch.charCodeAt(0),16777619);return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,a|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 const gifts=[
 {id:'borrow',glyph:'名',name:'偷名符',desc:'震步标记命中的妖物 8 秒。你受神罚时，将这次惩罚转给最近的标记者（90 伤害），消耗标记。'},
 {id:'dance',glyph:'舞',name:'纸人朝圣',desc:'落罚瞬间，纸人令 150 步内的妖物面向神像。与「不得直视」配合；改成「不得背对」后会保护妖物。'},
 {id:'chain',glyph:'连',name:'连坐经',desc:'神罚击杀引爆 125 步内的妖物，造成 45 点规则伤害。连坐不会再次触发连坐。'},
 {id:'seal',glyph:'定',name:'定身敕',desc:'震步命中后，妖物被定身 2 秒，并保持朝向；先诱敌转头，再推入视线。'},
 {id:'mask',glyph:'纸',name:'纸身术',desc:'施放纸人后化纸 2.5 秒。纸人不是生者，因此神罚不追责；普通攻击仍会受伤。'},
 {id:'echo',glyph:'影',name:'留影步',desc:'闪避在原地留下 4 秒纸人，吸引妖物转头；可触发「纸人朝圣」。最多同时存在 4 个纸人。'}
 ];
 const api={TAU,angleDelta,sees,faces,guilty,random,gifts};if(typeof module!=='undefined')module.exports=api;else root.TrialRules=api;
})(typeof window!=='undefined'?window:globalThis);
