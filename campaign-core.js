'use strict';
// Pure simulation shared by the browser and node tests. No DOM, audio or wall clock.
(function(root) {
  const VERSION = '0.6.0', TAU = Math.PI * 2;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const angleDelta = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const clone = x => JSON.parse(JSON.stringify(x));
  const SKILLS = [
    {id:'inscribe',name:'篆剑诀',glyph:'印',group:'施印',in:['activeSword'],out:['mark'],desc:'主动飞剑命中施加 6 秒律印。纸人剑和追击剑不能再次施印。'},
    {id:'third',name:'三叠浪',glyph:'浪',group:'位移',in:['activeSword'],out:['move'],desc:'每第三次主动飞剑命中，将目标推开。重型妖物受半量推力，灵牌可完整推动。'},
    {id:'force',name:'撼山步',glyph:'撼',group:'位移',in:['push'],out:['move'],desc:'震步范围增加 25%，推力增加 20%。也能推动报丧人的归责灵牌。'},
    {id:'echo',name:'留影步',glyph:'影',group:'替身',in:['dash'],out:['paper'],desc:'闪避在原地留下 4 秒纸人。与 E 共用最多 3 个纸人的上限。'},
    {id:'substitute',name:'替身契',glyph:'替',group:'归责',in:['paper'],out:['protect'],desc:'你受裁决时，消耗 180 步内最近的纸人代罚。冷却 8 秒；偷名转罚优先。'},
    {id:'pilgrim',name:'纸人朝圣',glyph:'朝',group:'替身',in:['paper'],out:['facing'],desc:'目律裁决前，纸人周围 150 步妖物面朝神像。钟律场中，放纸人使近敌转头并短暂减速。背对修订会保护妖物。'},
    {id:'turret',name:'借尸还剑',glyph:'剑',group:'飞剑',in:['paper','mark'],out:['projectile'],desc:'纸人每 1.2 秒向有印目标发剑，伤害为基础飞剑的 60%。没有律印时，每 2.4 秒攻击近敌。'},
    {id:'thunder',name:'追雷印',glyph:'雷',group:'裁决',in:['move','mark'],out:['mark','law'],desc:'震步施加律印。有印敌人被你实际推动后，1 秒后落雷，造成 35 规则伤害并消耗印。每目标冷却 3 秒。'},
    {id:'chain',name:'连坐经',glyph:'连',group:'裁决',in:['law'],out:['area'],desc:'规则击杀使周围 125 步妖物承受 30 规则伤害。连坐本身不会继续触发连坐或追击剑。'},
    {id:'borrow',name:'偷名符',glyph:'名',group:'桥接',bridge:true,in:['push'],out:['transfer','law'],desc:'震步给最近命中妖物缔结 6 秒名契。你受罚时改由它承受 80% 对敌裁决伤害。一次一个名契，冷却 8 秒。'},
    {id:'march',name:'纸上行军',glyph:'行',group:'桥接',bridge:true,in:['paper'],out:['move'],desc:'纸人出现 1 秒后，向周围 100 步妖物发出一次推击。留影步同样生效，脉冲不直接伤害。'},
    {id:'lawblade',name:'借律成剑',glyph:'敕',group:'桥接',bridge:true,in:['mark','law'],out:['projectile'],desc:'规则伤害命中有印目标时，从你的位置发出追击剑。每次裁决最多 3 剑；追击不会施印、推击或递归触发。'},
    {id:'pierce',name:'穿山引',glyph:'穿',group:'飞剑',in:['activeSword'],out:['activeSword'],desc:'主动剑额外贯穿两敌；后续命中为首击的 70%，保留施印与主动命中效果。'},
    {id:'return',name:'回锋诀',glyph:'回',group:'飞剑',in:['activeSword','mark'],out:['dash'],desc:'主动剑命中有印目标，缩短闪避冷却 0.04 秒；每秒最多 0.4 秒。'},
    {id:'seal',name:'定身敕',glyph:'定',group:'位移',in:['push','mark'],out:['still'],desc:'震步命中有印目标，推移结束后定身 1.2 秒并保持朝向；无印目标减速 25%。'},
    {id:'wind',name:'回风诀',glyph:'风',group:'位移',in:['move','law'],out:['push'],desc:'被你推动后的 2 秒内承受规则伤害，震步冷却缩短 0.8 秒；每次裁决最多 3 次。'},
    {id:'burn',name:'焚身经',glyph:'焚',group:'替身',in:['paper'],out:['move','area'],desc:'纸人被击毁或替身代罚后，对周围 120 步敌人造成 35 直接伤害并推开。自然消散与超额替换不触发。'},
    {id:'drink',name:'饮雷经',glyph:'饮',group:'裁决',in:['law'],out:['ember'],desc:'每个规则事件首次伤敌获得 1 灯烬，上限 3。每获得 3 次恢复 3 命火，每房最多回复 12。复制伤害不产烬。'},
    {id:'mandate',name:'代天行罚',glyph:'罚',group:'裁决',in:['mark','law'],out:['law'],desc:'环境裁决或追雷命中律印目标，消耗印使该次伤害提高 30%。借律成剑仍读取命中前的律印。'},
    {id:'mask',name:'纸身术',glyph:'身',group:'桥接',bridge:true,in:['paper'],out:['protect'],desc:'E 后 2 秒化为纸身，免生者裁决；普通伤害照常。纸身期间主动剑减伤 30%，不能施印。'},
    {id:'emberblade',name:'灯尽剑生',glyph:'烬',group:'桥接',bridge:true,in:['activeSword','ember'],out:['mark'],desc:'每第三次主动剑命中消耗 1 灯烬，伤害翻倍并施印；无灯烬时该击增伤 15%。'},
    {id:'rebirth',name:'还魂纸',glyph:'魂',group:'桥接',bridge:true,in:['paper','ember'],out:['paper'],desc:'纸人被击毁或代罚时，消耗 1 灯烬使 E 冷却减少 2 秒；无烬减少 0.5 秒。冷却 3 秒，不自动生成纸人。'},
    {id:'shared',name:'同罪牒',glyph:'罪',group:'桥接',bridge:true,in:['push','law'],out:['area'],desc:'Q 命中至少两敌，连接最近两敌 4 秒；规则伤害向另一方复制 30%，复制不触发任何连锁。'},
    {id:'verdict',name:'断案诀',glyph:'断',group:'桥接',bridge:true,in:['activeSword','mark'],out:['mark','law'],desc:'主动剑击杀有印敌人，将印转给最近敌人并造成 25 规则伤害。冷却 2 秒。'}
  ];
  const SKILL = Object.fromEntries(SKILLS.map(s=>[s.id,s]));
  const CHAPTERS = [
    {name:'报丧村',seal:'钟',nodes:['止步巷','棺阵侧院','转运簿','押灵路','残香庙','祖祠 · 报丧人']},
    {name:'回首祠',seal:'目',nodes:['独眼庭','屏风廊','盲证人','驱纸院','祠外灯亭','背神台 · 守祠人']},
    {name:'倒悬寺',seal:'镜',nodes:['分影阶','移镜廊','执笔旧档','倒影庭','闻烛灯室','悬镜殿 · 映身僧']},
    {name:'无名城',seal:'名',nodes:['寄名门','归责坊','无名者名册','夺名街','众灯亭','销名府 · 司名官']},
    {name:'登天台',seal:'审',nodes:['四案合卷','最后一盏香','终审 · 执衡']}
  ];
  const EVIDENCE = {
    archive:{name:'执笔旧档',text:'你曾写下“无主之罚，由无名者承受”。阿照抹去你的名字，却发现你仍会被当作无主之罚的容器。'},
    confession:{name:'闻烛的证言',text:'闻烛保留了原稿。旧律不是天生如此；写下它的人，也必须承担改写它的责任。'},
    registry:{name:'无名者名册',text:'四地证人的名字可以由本人确认登记。保护需要同意，纸人的代罚不能代替证人的同意。'},
    statute:{name:'天规原本',text:'执衡只能执行已登记的判词。以证据归责，方能要求执行者接受相同的审判。'},
    ribbon:{name:'红绳纸人',text:'阿照的字迹：“天亮之前，别让他们把最后一笔写完。”纸人只是传话的空壳，并不是她的生命。'},
    manifest:{name:'天灯转运簿',text:'转运簿没有绑缚记录。阿照签了自己的名字，主动去回首祠替一位无名者承罚。'},
    signature:{name:'报丧人的归责印',text:'执行者同样被名册约束。灵牌移动，也会被记为报丧人的行动。'},
    witness:{name:'盲证人的口供',text:'“她不是来求免罚。她问的是：把一个人的名字抹去，能不能救他？”'},
    testimony:{name:'神像背面的证词',text:'阿照替被抹名的人上了天灯。证词末尾留着你熟悉的笔锋，指向倒悬寺的旧律档。'}
  };
  const STORIES = {
    archive:{speaker:'闻烛 · 倒悬寺旧档',title:'那一笔，是你写的。',lines:['你认出了原稿：“无主之罚，由无名者承受。”当年你以为这能让有名者不再无辜受罚。','闻烛说：“你没问，无名者是谁。”阿照抹去了你的名字，却把自己签进了天灯名册，拦下追来的无主之罚。','殿中的映身僧藏着你的原稿。镜中人与你共用一条命；移动镜架，才能改变同一人的两种位置。'],next:'带走原稿，护送抄经人'},
    monastery:{speaker:'你 · 悬镜殿',title:'我不能只把她换下来。',lines:['你把原稿收进案卷，第一次承认自己是旧律的执笔者。','闻烛递来一盏残灯：“去无名城。只有还在的人，能说出他们愿意接受怎样的保护。”','阿照的声音从灯里传来：“不要再替所有人签字。”'],next:'进入无名城'},
    registry:{speaker:'素娘 · 无名城寄名处',title:'姓名不是承罚的器皿。',lines:['司名官给每个进城者挂上寄名牌。没有名字，也不能躲过对生者的裁决。','你找到被删去的名册。报丧村的引路人、回首祠的盲证人、倒悬寺的抄经人、城里的守灯人，都可以亲自作证。','保护他们走过两轮裁决后，他们才愿意把名字留在合议簿上。四份证言齐备，就可以在登天台确认共律。'],next:'带守灯人走过夺名街'},
    ascent:{speaker:'阿照 · 登天台下',title:'这一次，由我们自己回答。',lines:['天规原本在你手中。阿照还在天灯里，但她的名字已重新出现在纸上。','执衡等在台上。它将重演钟与目，再以镜与名审你；打败两重审判后，你必须选择怎样收尾。','继律：接过天灯。断律：亲手拆去四律。共律：让四地证人共同确认新约。每一种选择，都必须在场上完成。'],next:'合卷，作最后整备'} ,
    opening:{speaker:'素娘 · 无名观纸扎匠',title:'没有人记得你的妹妹。',lines:['阿照被选作天灯后，她的名字从家谱上消失。你腕上的红绳，是她留下的最后一件东西。','素娘把纸人递给你：“她的字还在。先去报丧村，夺回转运簿。纸人毁了也不会伤到她——那只是空壳。”','纸人忽然出声：“天亮之前，别让他们把最后一笔写完。”'],next:'选一项功法，入村'},
    manifest:{speaker:'你 · 转运簿前',title:'她是自己走进去的。',lines:['没有押送，没有锁链。转运簿最后一行写着：阿照，自愿入祠，代无名者承罚。','素娘的纸笺夹在账页间：“别急着替她决定。先问清楚，她想救谁。”','报丧人守着去祠堂的路。拿到它的归责印，才能打开祠门。'],next:'带上转运簿'},
    crossing:{speaker:'阿照 · 纸人中的声音',title:'别只看他们让你看的那一面。',lines:['报丧人倒下时，灵牌上的字没有消失。执行判词的人，也在判词之中。','你把归责印贴上祠门。纸人的声音终于清晰：“我来这里，不是为了成仙。”','前面是回首祠。钟声留在身后；新的判词审问你的目光。功法与命火随你入祠，本章朱墨重新获得。'],next:'进入回首祠'},
    witness:{speaker:'盲证人 · 屏风后',title:'她想救一个没有名字的人。',lines:['“她问我：天规找不到姓名，还能不能罚一个人？”','你望向神像。纸人不是生者，却能让真正的生者回头。禁令辨认的是条件，并不理解人。','证人请你带走口供。守祠人背后的石壁上，还有阿照亲手刻下的最后一句话。'],next:'记录口供，继续前行'},
    ending:{speaker:'阿照 · 神像背面',title:'被抹去的名字，是你的。',lines:['神像背面刻着：“我愿承这一次罚。请把他的名字还给他。”末尾是阿照的落款。','落款旁的旧条款，笔锋竟与你相同。你不是偶然闯入这宗旧案的人。','倒悬寺，藏着你遗失的影子和执笔的那一夜。你收起纸人：“这一次，我会问清楚，再动笔。”'],next:'带着证词，进入倒悬寺'}
  };
  class RNG {
    constructor(seed){let a=2166136261;for(const ch of seed)a=Math.imul(a^ch.charCodeAt(0),16777619);this.state=a>>>0;}
    next(){this.state=(this.state+0x6D2B79F5)>>>0;let t=this.state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
    shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(this.next()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  }
  function segmentRect(a,b,r){
    let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
    for(const [p,q] of [[-dx,a.x-r.x],[dx,r.x+r.w-a.x],[-dy,a.y-r.y],[dy,r.y+r.h-a.y]]){
      if(Math.abs(p)<1e-9){if(q<0)return false;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}
    }return true;
  }
  class Campaign {
    constructor(seed=''){this.reset(seed);}
    reset(seed){
      this.rng=new RNG(seed);this.aiRng=new RNG(seed+':actors');this.phase='menu';this.chapter=0;this.node=0;this.edict='original';this.edited=false;
      this.finalEdicts={};this.witnesses=[];this.protect=false;this.witnessTask=null;this.embers=0;this.emberGains=0;this.roomHealing=0;this.finalStage=0;this.endingMode=null;this.endingRounds=0;this.pact=false;this.pillars=[];this.seals=[];this.token=false;this.boundPillar=-1;this.buildPending=null;
      this.seed=seed;this.build=[];this.levels={};this.hp=100;this.coins=0;this.rerolls=2;this.elapsed=0;this.uid=0;this.rootId=0;this.attackCount=0;this.hitCount=0;
      this.enemies=[];this.papers=[];this.shots=[];this.effects=[];this.obstacles=[];this.proxy=null;this.deck=[];this.evidence=[];this.story='opening';this.route='normal';this.chapterRoutes=[];
      this.stats={kills:0,lawKills:0,lawDamage:0,swordDamage:0,transfers:0,substitutions:0,chains:0,thunders:0,followups:0,playerFines:0,rooms:0,chapters:[]};
      this.log=[];this.sounds=[];this.message='跟着红绳，找到阿照。';this.clock=7;this.roomTime=0;this.statueIndex=0;this.wave=1;this.waveTotal=1;this.statues=[];this.previous='combat';this.result=null;this.retrySeed=seed;
      this.player={id:0,x:560,y:555,r:14,facing:-Math.PI/2,player:true,hp:100,moved:0,blind:false,inv:0,dash:0,dx:0,dy:-1,shotCd:0,pushCd:0,paperCd:0,dashCd:0,borrowCd:0,subCd:0};
    }
    has(id){return this.build.includes(id);}
    scale(id){return 1+.15*((this.levels[id]||1)-1);}
    say(text){this.message=text;this.log.push({at:+this.elapsed.toFixed(2),text});if(this.log.length>120)this.log.shift();}
    sound(name){this.sounds.push(name);if(this.sounds.length>30)this.sounds.shift();}
    event(source){return {id:++this.rootId,source,followups:0,wind:0,ember:false};}
    record(id){if(!this.evidence.includes(id))this.evidence.push(id);}
    start(seed){this.reset(String(seed||'RED-THREAD').slice(0,24));this.phase='story';this.story='opening';this.record('ribbon');}
    continueStory(){
      if(this.phase!=='story')return false;
      if(this.story==='opening')this.offer('start');
      else if(['manifest','witness','archive','registry'].includes(this.story)){this.node=3;this.phase='witnesschoice';}
      else if(this.story==='ascent'){this.chapter=4;this.node=1;this.phase='camp';this.campBought=false;this.pact=this.witnesses.length===4;if(this.pact)this.say('四名证人亲自确认：同意共同立约，可选择共律。');}
      else {this.chapter++;this.node=0;this.edict='original';this.edited=false;this.hp=Math.min(100,this.hp+25);this.beginRoom();}
      return true;
    }
    chooseWitness(accept){if(this.phase!=='witnesschoice')return false;this.protect=!!accept;this.phase='route';return true;}
    nextReward(){const ctx=this.rewardContext;this.deck=[];this.buildPending=null;
      if(ctx==='start')this.beginRoom();
      else if(ctx==='branch'){this.node=2;this.phase='story';this.story=['manifest','witness','archive','registry'][this.chapter];this.record(this.story);}
      else {this.node=4;this.phase='camp';this.campBought=false;}
    }
    skipReward(){if(this.phase!=='reward')return false;this.coins+=15;this.nextReward();return true;}
    replaceSkill(old){if(this.phase!=='replace'||!this.has(old)||!this.buildPending)return false;const id=this.buildPending;
      if(SKILL[id].bridge&&!SKILL[old].bridge&&this.build.filter(k=>SKILL[k].bridge).length>=2)return false;
      this.build=this.build.filter(k=>k!==old);delete this.levels[old];this.build.push(id);this.levels[id]=1;this.nextReward();return true;
    }
    connections(id){const s=SKILL[id];return this.build.filter(k=>k!==id&&(SKILL[k].out.some(x=>s.in.includes(x))||s.out.some(x=>SKILL[k].in.includes(x))));}
    offer(context){
      this.phase='reward';this.rewardContext=context;
      let pool=SKILLS.filter(s=>!this.has(s.id)&&(!s.bridge||this.build.length>=8||this.build.filter(k=>SKILL[k].bridge).length<2));
      if(context==='start')pool=pool.filter(s=>['inscribe','third','thunder'].includes(s.id));
      else pool=pool.filter(s=>!s.bridge||s.in.some(x=>['push','paper','activeSword','dash'].includes(x)||this.build.some(k=>SKILL[k].out.includes(x))));
      let ids=this.rng.shuffle(pool.map(s=>s.id));const linked=ids.find(id=>this.connections(id).length);
      if(context!=='start'&&linked)ids=[linked,...ids.filter(id=>id!==linked)];
      this.deck=ids.slice(0,3);
    }
    chooseSkill(id){
      if(this.phase!=='reward'||!this.deck.includes(id)||!SKILL[id]||this.has(id))return false;
      if(this.build.length>=8){this.buildPending=id;this.phase='replace';return true;}
      if(SKILL[id].bridge&&this.build.filter(k=>SKILL[k].bridge).length>=2)return false;
      this.build.push(id);this.levels[id]=1;this.sound('reward');this.nextReward();return true;
    }
    reroll(){if(this.phase!=='reward'||this.rerolls<=0||this.rewardContext==='start')return false;this.rerolls--;this.offer(this.rewardContext);return true;}
    chooseRoute(route){if(this.phase!=='route'||!['normal','elite'].includes(route))return false;this.route=route;this.chapterRoutes.push({chapter:this.chapter,node:this.node,route});this.beginRoom();return true;}
    camp(action,id){
      if(this.phase!=='camp')return false;
      if(action==='leave'){this.node=this.chapter===4?2:5;this.beginRoom();return true;}
      if(this.campBought)return false;
      if(action==='heal'){this.hp=Math.min(100,this.hp+32);this.campBought=true;this.say('温香续命，恢复 32 命火。');return true;}
      if(action==='upgrade'&&this.has(id)&&(this.levels[id]||1)<3&&this.coins>=35){this.coins-=35;this.levels[id]++;this.campBought=true;this.say(SKILL[id].name+'升至 '+this.levels[id]+' 级：数值 +15%，触发上限不变。');return true;}
      return false;
    }
    upgradeBoss(id){
      if(this.phase!=='bossreward')return false;if(id!==null&&(!this.has(id)||(this.levels[id]||1)>=3))return false;
      if(id!==null)this.levels[id]++;this.phase='story';this.story=['crossing','ending','monastery','ascent'][this.chapter];return true;
    }
    lawKind(){if(this.chapter<4)return this.chapter;if(this.endingMode==='break')return this.pillars.find(p=>p.hp>0)?.law??0;return this.finalStage===0?(this.judgments||0)%2:2+(this.judgments||0)%2;}
    lawText(){const k=this.lawKind(),r=this.edict==='reverse',who=this.edict==='demons'?'妖物':'生者';return [r?'钟响之刻，静者受罚':`钟响之刻，移动的${who}受罚`,r?'神像视线内，生者不得背对':`神像视线内，${who}不得直视`,`${who}本体与镜影${r?'同侧':'异侧'}者受罚；压线安全`,`${r?'无登记':'有登记'}的被点名者受罚`][k];}
    lawHint(){return ['以实际移动判定；钟前敌人会停步，Q 可让它们犯规。','视线无遮挡且面向神像才犯规；Shift 闭目只免目律。','F 牵引镜架，Q 推镜影；本体与镜影任一距红线 12 步内安全。','点名牌绑定一人。靠近牌按 F，再靠近敌人按 F 转移；每轮仅一次。'][this.lawKind()];}
    edit(){if(this.phase!=='combat'||this.edited)return false;this.phase='edit';return true;}
    amend(value){if(this.phase!=='edit')return false;if(value==='cancel'){this.phase='combat';return true;}if(!['reverse','demons'].includes(value)||this.edited)return false;this.edict=value;if(this.chapter===4)this.finalEdicts[this.lawKind()]=value;this.edited=true;this.phase='combat';this.say('判词已改：'+this.lawText());return true;}
    pause(){if(this.phase==='combat'){this.phase='paused';return true;}if(this.phase==='paused'){this.phase='combat';return true;}return false;}
    openBook(){if(['book','end','menu'].includes(this.phase))return false;this.previous=this.phase;this.phase='book';return true;}
    closeBook(){if(this.phase!=='book')return false;this.phase=this.previous;return true;}
    makeEnemy(type,x,y){
      const boss=type==='boss',hp=boss?(this.chapter?1050:850):(this.chapter?135:105)+(this.node===3?20:0)+(this.route==='elite'&&[1,3].includes(this.node)?24:0);
      const e={id:++this.uid,type,x,y,r:boss?29:16,hp,maxHp:hp,facing:Math.PI/2,vx:0,vy:0,moved:0,mark:0,name:0,thunder:0,thunderCd:0,pushed:0,slow:0,attackCd:0,shotCd:2+this.aiRng.next(),charge:0,chargeCd:3,speed:boss?48:type==='charger'?90:62,phase:1,wardBreak:0};for(const box of this.obstacles)if(e.x>box.x-e.r&&e.x<box.x+box.w+e.r&&e.y>box.y-e.r&&e.y<box.y+box.h+e.r)e.y=box.y-e.r-4;
      this.enemies.push(e);return e;
    }
    beginRoom(){
      this.phase='combat';this.enemies=[];this.papers=[];this.shots=[];this.effects=[];this.proxy=null;this.clock=7;this.roomTime=0;this.statueIndex=0;this.wave=1;this.waveTotal=this.chapter<4&&[1,3].includes(this.node)?2:1;this.embers=0;this.emberGains=0;this.roomHealing=0;this.judgments=0;this.mirror={x:560,y:460,r:18,vx:0,vy:0,drag:false};this.redLine=560;this.namePlate={owner:0,registered:true,moved:false};this.witnessTask=this.protect&&this.node===3?{hp:2,rounds:0,x:560,y:495}:null;this.protect=false;
      Object.assign(this.player,{x:560,y:570,hp:this.hp,facing:-Math.PI/2,moved:0,blind:false,inv:1,dash:0,shotCd:0,pushCd:0,paperCd:0,dashCd:0,borrowCd:0,subCd:0});
      this.obstacles=this.chapter===0?(this.node===1?[{x:300,y:280,w:100,h:90},{x:720,y:280,w:100,h:90}]:this.node===3?[{x:430,y:270,w:260,h:48}]:[]):(this.node===1?[{x:360,y:320,w:150,h:26},{x:660,y:410,w:130,h:26}]:this.node===3?[{x:230,y:330,w:100,h:30},{x:790,y:330,w:100,h:30}]:[]);
      if(this.chapter===2&&[1,3].includes(this.node))this.obstacles=[{x:315,y:260,w:65,h:160},{x:740,y:260,w:65,h:160}];if(this.chapter===3&&[1,3].includes(this.node))this.obstacles=[{x:200,y:300,w:200,h:30},{x:720,y:300,w:200,h:30}];
      this.statues=[{x:560,y:205,angle:Math.PI/2,target:Math.PI/2,range:430,half:.66}];
      if(this.chapter===4)this.edict=this.finalEdicts[this.lawKind()]||'original';
      const n=this.chapter===4?2:this.node===5?3:this.node===0?4:this.node===1?5:7;
      for(let i=0;i<n;i++){
        const type=this.chapter&&this.node===3&&i===0?'cleaner':i%3===2?'shooter':(!this.chapter&&this.node!==0&&i%3===1)?'charger':'walker';
        this.makeEnemy(type,200+i*720/Math.max(1,n-1),230+(i%2)*85);
      }
      if(this.node===5||this.chapter===4){this.makeEnemy('boss',560,310);this.sound('boss');}
      this.say(this.chapter>=2?this.lawHint():this.chapter===0?'钟前妖物也会停步：靠近按 Q，把它推入天罚。闭目不能躲钟律。':'E 将纸人放到神像旁，让妖物面神；锁定前移出视线或按住 Shift。');
    }
    activeStatue(){return this.statues[this.statueIndex%Math.max(1,this.statues.length)];}
    sees(a,statue=this.activeStatue()){
      if(!statue)return false;const d=dist(a,statue);
      return d>30&&d<=statue.range&&Math.abs(angleDelta(Math.atan2(a.y-statue.y,a.x-statue.x),statue.angle))<=statue.half&&!this.obstacles.some(r=>segmentRect(statue,a,r));
    }
    guilty(a){
      if(a.hp<=0||a.paper||(a.player&&(this.edict==='demons'||a.paperForm>0)))return false;
      const kind=this.lawKind();
      if(kind===2){const image=this.mirrorImage(a);const left=a.x-this.redLine,right=image.x-this.redLine;if(Math.abs(left)<=12||Math.abs(right)<=12)return false;return this.edict==='reverse'?left*right>0:left*right<0;}
      if(kind===3)return this.namePlate?.owner===a.id&&(this.edict==='reverse'?!this.namePlate.registered:this.namePlate.registered);
      if(kind===0){let speed=a.moved||0;if(a.type==='boss'&&this.proxy)speed=Math.max(speed,this.proxy.moved);return this.edict==='reverse'?speed<=16:speed>16;}
      if(a.blind||!this.sees(a))return false;
      const s=this.activeStatue(),front=Math.abs(angleDelta(a.facing,Math.atan2(s.y-a.y,s.x-a.x)))<=Math.PI/3;
      return this.edict==='reverse'?!front:front;
    }
    waypoint(actor,target){
      const r=(actor.r||14)+3,boxes=this.obstacles.map(b=>({x:b.x-r,y:b.y-r,w:b.w+r*2,h:b.h+r*2}));
      const clear=(a,b)=>!boxes.some(box=>segmentRect(a,b,box));
      if(clear(actor,target))return target;
      const nodes=[actor,target];for(const b of boxes)for(const x of [b.x-2,b.x+b.w+2])for(const y of [b.y-2,b.y+b.h+2])nodes.push({x,y});
      const costs=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),seen=new Set();costs[0]=0;
      while(seen.size<nodes.length){let u=-1;for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&(u<0||costs[i]<costs[u]))u=i;
        if(u<0||!Number.isFinite(costs[u]))break;if(u===1)break;seen.add(u);
        for(let v=0;v<nodes.length;v++)if(v!==u&&!seen.has(v)&&clear(nodes[u],nodes[v])){const n=costs[u]+dist(nodes[u],nodes[v]);if(n<costs[v]){costs[v]=n;prev[v]=u;}}
      }
      if(prev[1]<0)return target;let n=1;while(prev[n]>0)n=prev[n];return nodes[n];
    }
    move(a,dx,dy){
      let x=clamp(a.x+dx,65,1055),y=clamp(a.y+dy,115,615),r=a.r||14;
      for(const box of this.obstacles)if(x>box.x-r&&x<box.x+box.w+r&&a.y>box.y-r&&a.y<box.y+box.h+r)x=a.x;
      for(const box of this.obstacles)if(x>box.x-r&&x<box.x+box.w+r&&y>box.y-r&&y<box.y+box.h+r)y=a.y;
      a.x=x;a.y=y;
    }
    impulse(e,from,power){const d=Math.max(1,dist(e,from)),factor=e.type==='boss'?.5:1;e.vx+=(e.x-from.x)/d*power*factor;e.vy+=(e.y-from.y)/d*power*factor;e.pushed=2;if(e.type==='boss')e.wardBreak=2;}
    addPaper(x,y,life=8){
      const o={id:++this.uid,x,y,r:12,hp:2,life,age:0,pulsed:false,shotCd:1.2,paper:true};this.papers.push(o);if(this.papers.length>3)this.papers.shift();return o;
    }
    castPaper(point){
      const p=this.player;if(this.phase!=='combat'||p.paperCd>0)return false;
      const d=Math.max(1,dist(p,point)),f=Math.min(1,260/d),o=this.addPaper(clamp(p.x+(point.x-p.x)*f,70,1050),clamp(p.y+(point.y-p.y)*f,120,610));p.paperCd=6;if(this.has('mask'))p.paperForm=2*this.scale('mask');
      // Do not put an inaccessible bait inside a solid screen.
      if(this.obstacles.some(r=>o.x>r.x-12&&o.x<r.x+r.w+12&&o.y>r.y-12&&o.y<r.y+r.h+12)){o.x=p.x;o.y=p.y;}
      if(this.has('pilgrim')&&!this.chapter)for(const e of this.enemies)if(dist(o,e)<150*this.scale('pilgrim')){e.facing=Math.atan2(o.y-e.y,o.x-e.x);e.slow=1;}
      this.sound('paper');return true;
    }
    push(){
      const p=this.player;if(this.phase!=='combat'||p.pushCd>0||p.blind)return false;p.pushCd=3.5;const range=165*(this.has('force')?1.25*this.scale('force'):1),power=400*(this.has('force')?1.2:1);
      const hits=this.enemies.filter(e=>e.hp>0&&dist(p,e)<=range);for(const e of hits){if(this.has('thunder'))e.mark=6;if(this.has('seal')){if(e.mark>0)e.pendingSeal=true;else e.slow=2;}this.impulse(e,p,power);}
      if(this.has('shared')&&hits.length>=2){const pair=[...hits].sort((a,b)=>dist(p,a)-dist(p,b)).slice(0,2);pair[0].linked=pair[1].id;pair[1].linked=pair[0].id;pair.forEach(e=>e.linkTime=4);}
      if(this.has('borrow')&&hits.length){this.enemies.forEach(e=>e.name=0);hits.sort((a,b)=>dist(p,a)-dist(p,b))[0].name=6;}
      if(this.lawKind()===2){for(const e of this.enemies){const im=this.mirrorImage(e);if(dist(p,im)<=range){const d=Math.max(1,dist(p,im));e.mirrorOffset=(e.mirrorOffset||0)+(im.x-p.x)/d*90; e.wardBreak=2;}}}
      if(this.proxy&&dist(p,this.proxy)<=range)this.impulse(this.proxy,p,power);
      this.effects.push({type:'ring',x:p.x,y:p.y,r:range,life:.4,max:.4,color:'#b1e5ce'});this.sound('push');return true;
    }
    dash(mx=0,my=0){const p=this.player;if(this.phase!=='combat'||p.dashCd>0)return false;const n=Math.hypot(mx,my);p.dx=n?mx/n:Math.cos(p.facing);p.dy=n?my/n:Math.sin(p.facing);p.dash=.16;p.inv=.25;p.dashCd=2;if(this.has('echo'))this.addPaper(p.x,p.y,4*this.scale('echo'));this.sound('dash');return true;}
    swordTarget(from,hits=[]){
      return this.enemies.filter(e=>e.hp>0&&!hits.includes(e.id)&&!this.obstacles.some(r=>segmentRect(from,e,r))).sort((a,b)=>dist(from,a)-dist(from,b))[0];
    }
    fire(from,target,damage,kind='active',extra={}){
      const homing=['active','paper','follow'].includes(kind);
      const locked=homing?(this.enemies.find(e=>e===target&&e.hp>0)||this.swordTarget(from,extra.hits)):null;
      const aim=locked||target,a=Math.atan2(aim.y-from.y,aim.x-from.x);
      this.shots.push({x:from.x,y:from.y,vx:Math.cos(a)*640,vy:Math.sin(a)*640,damage,kind,life:1.8,homing,targetId:locked?.id??null,...extra});
    }
    trackSword(shot){
      if(!['active','paper','follow'].includes(shot.kind))return;
      // Keep a lock while it lives; piercing and dead targets retarget only unhit enemies.
      const target=this.enemies.find(e=>e.id===shot.targetId&&e.hp>0&&!(shot.hits||[]).includes(e.id))||this.swordTarget(shot,shot.hits);
      shot.targetId=target?.id??null;if(!target)return;
      const angle=Math.atan2(target.y-shot.y,target.x-shot.x);
      shot.vx=Math.cos(angle)*640;shot.vy=Math.sin(angle)*640;
    }
    attack(point){const p=this.player;if(this.phase!=='combat'||p.shotCd>0||p.blind)return false;p.shotCd=.34;this.attackCount++;this.fire(p,this.swordTarget(p)||point,16*(p.paperForm>0?.7:1),'active',{third:this.attackCount%3===0,hits:[],pierce:this.has('pierce')?2:0});this.sound('sword');return true;}
    interact(){if(this.phase!=='combat')return false;if(this.specialInteract())return true;if(!this.proxy)return false;if(this.proxy.drag){this.proxy.drag=false;this.say('已放下归责灵牌。');return true;}if(dist(this.player,this.proxy)>130)return false;this.proxy.drag=true;this.say('正在牵引灵牌：你的移动将记在报丧人名下。再次 F 放下。');return true;}
    damage(e,n,source,root=this.event(source),terminal=false){
      if(e.hp<=0)return;if(this.chapter===4&&this.endingMode==='common'&&e.type==='boss')n=Math.min(n,Math.max(0,e.hp-1));const marked=e.mark>0,law=['law','thunder','transfer','chain','shared','verdict'].includes(source);
      if(law&&marked&&this.has('mandate')&&['law','thunder'].includes(source)){n*=1+.3*this.scale('mandate');e.mark=0;}
      if(law&&!terminal){if(this.has('drink')&&!root.ember){root.ember=true;this.embers=Math.min(3,this.embers+1);this.emberGains++;if(this.emberGains%3===0&&this.roomHealing<12){this.hp=Math.min(100,this.hp+3);this.player.hp=this.hp;this.roomHealing+=3;}}if(this.has('wind')&&e.pushed>0&&(root.wind||0)<3){root.wind=(root.wind||0)+1;this.player.pushCd=Math.max(0,this.player.pushCd-.8*this.scale('wind'));}if(this.has('shared')&&e.linkTime>0){const pair=this.enemies.find(o=>o.id===e.linked&&o.hp>0);if(pair)this.damage(pair,n*.3*this.scale('shared'),'shared',root,true);}}
      if(!law&&e.type==='boss'&&this.chapter&&this.clock<1.5&&e.wardBreak<=0&&!marked)n*=.5;
      if(this.chapter===4&&this.endingMode==='common'&&e.type==='boss')n=Math.min(n,Math.max(0,e.hp-1));const dealt=Math.min(e.hp,n);e.hp-=n;this.stats[law?'lawDamage':'swordDamage']+=dealt;
      this.effects.push({type:'number',x:e.x,y:e.y-60,text:Math.round(n),life:.65,max:.65,color:law?'#f6d187':'#cbf4e5'});
      if(law){this.effects.push({type:'bolt',x:e.x,y:e.y,life:.3,max:.3,color:'#f6d187'});this.sound('thunder');}
      else this.sound('hit');
      if(law&&marked&&!terminal&&this.has('lawblade')&&root.followups<3){root.followups++;this.stats.followups++;const followTarget=e.hp>0?e:this.enemies.filter(o=>o.hp>0).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(followTarget)this.fire(this.player,followTarget,16*.6*this.scale('lawblade'),'follow');this.say('律印 → '+(source==='thunder'?'追雷':'裁决')+' → 借律成剑');}
      if(e.hp<=0){if(source==='active'&&marked&&this.has('verdict')&&!(this.player.verdictCd>0)){const other=this.enemies.filter(o=>o!==e&&o.hp>0).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(other){this.player.verdictCd=2;other.mark=6;this.damage(other,25*this.scale('verdict'),'verdict');}}this.stats.kills++;if(law){this.stats.lawKills++;if(source==='chain')this.stats.chains++;
        if(this.has('chain')&&!terminal){for(const other of this.enemies)if(other!==e&&other.hp>0&&dist(e,other)<=125)this.damage(other,30*this.scale('chain'),'chain',root,true);this.say('规则击杀 → 连坐经');}}
      }
    }
    hurt(n,cause,law=false){const p=this.player;if(this.phase!=='combat'||this.hp<=0||(!law&&p.inv>0))return;this.hp=Math.max(0,this.hp-n);p.hp=this.hp;p.inv=.65;if(law)this.stats.playerFines++;this.sound('hurt');this.say(cause);if(this.hp<=0)this.finish(false,cause);}
    judge(){
      if(this.phase!=='combat')return;
      this.lastJudgedLaw=this.lawKind();const root=this.event('law'),before=this.stats.lawKills,s=this.activeStatue();this.sound('bell');
      if(this.lawKind()===1&&this.has('pilgrim'))for(const e of this.enemies)if(e.hp>0&&this.papers.some(o=>dist(o,e)<=150*this.scale('pilgrim')))e.facing=Math.atan2(s.y-e.y,s.x-e.x);
      // Snapshot before any transfer/kill modifies the actors.
      const guilty=this.enemies.filter(e=>this.guilty(e)),playerGuilty=this.guilty(this.player),base=this.chapter?110:88,amount=base*(this.edict==='demons'? .65:1);
      let transferred=false,substituted=false;
      if(playerGuilty){
        const target=this.has('borrow')&&this.player.borrowCd<=0?this.enemies.find(e=>e.hp>0&&e.name>0):null;
        const paper=this.has('substitute')&&this.player.subCd<=0?this.papers.filter(o=>dist(o,this.player)<=180*this.scale('substitute')).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0]:null;
        const pillar=this.endingMode==='break'?this.pillars[this.boundPillar]:null;
        if(pillar&&pillar.hp>0&&pillar.law===this.lastJudgedLaw){transferred=true;}
        else if(target){target.name=0;this.player.borrowCd=8;this.stats.transfers++;transferred=true;this.damage(target,amount*.8*this.scale('borrow'),'transfer',root);}
        else if(paper){this.destroyPaper(paper);this.papers=this.papers.filter(o=>o!==paper);this.player.subCd=8;this.stats.substitutions++;substituted=true;}
        else this.hurt(16,'触犯判词：'+this.lawText(),true);
      }
      if(this.phase!=='combat')return;
      for(const e of guilty)if(e.hp>0)this.damage(e,amount,'law',root);
      const killed=this.stats.lawKills-before;
      this.say((transferred?'偷名转罚 → ':substituted?'纸人代罚 → ':'')+(killed?'规则击杀 ×'+killed:guilty.length?'裁决命中 '+guilty.length+' 个妖物':playerGuilty?'本次你触犯判词':'本次无人犯规；调整诱饵与推击时机。'));
      this.clock+=7;this.judgments=(this.judgments||0)+1;this.specialJudgment(playerGuilty);if(this.chapter===4)this.edict=this.finalEdicts[this.lawKind()]||'original';this.namePlate.moved=false;if(this.lawKind()===3&&this.judgments%2===0)this.namePlate={owner:0,registered:true,moved:false};
      if(this.chapter){this.statueIndex=(this.statueIndex+1)%this.statues.length;this.activeStatue().target=Math.PI/2+(this.aiRng.next()-.5)*(this.node===0?.3:1.15);}
    }
    cleared(){
      if(this.chapter===4){if(!this.endingMode){this.finalStage++;if(this.finalStage===1){this.hp=Math.min(100,this.hp+25);this.beginRoom();this.say('二审：镜与名。F 操作镜架与点名牌。');}else this.phase='finalchoice';}else if(this.endingMode==='break'&&this.pillars.every(p=>p.hp<=0))this.completeEnding();return;}
      if(this.witnessTask&&this.witnessTask.rounds<2&&this.witnessTask.hp>0)return;
      this.stats.rooms++;this.coins+=this.route==='elite'&&[1,3].includes(this.node)?45:25;this.hp=Math.min(100,this.hp+10);this.player.hp=this.hp;this.sound('reward');
      if(this.node===0){this.node=1;this.phase='route';}
      else if(this.node===1)this.offer('branch');
      else if(this.node===3)this.offer('challenge');
      else if(this.node===5){this.stats.chapters.push({chapter:this.chapter,hp:this.hp,elapsed:+this.elapsed.toFixed(1),build:[...this.build],edict:this.edict});this.record(['signature','testimony','confession','statute'][this.chapter]);
        if(this.chapter===0)this.phase='bossreward';else {this.phase='story';this.story=['crossing','ending','monastery','ascent'][this.chapter];}}
    }

    finish(win,cause){if(this.phase==='end')return;this.result={win,cause};this.phase='end';this.sound(win?'win':'death');}
    tick(dt,input={}){
      if(this.phase!=='combat')return;dt=clamp(dt,0,.05);if(!dt)return;
      this.elapsed+=dt;this.roomTime+=dt;const old=this.clock;this.clock-=dt;if(old>1.5&&this.clock<=1.5)this.sound('warning');
      const p=this.player,point=input.point||{x:p.x+Math.cos(p.facing)*200,y:p.y+Math.sin(p.facing)*200};
      for(const k of ['inv','shotCd','pushCd','paperCd','dashCd','dash','borrowCd','subCd','paperForm','rebirthCd','verdictCd','returnWindow'])p[k]=Math.max(0,(p[k]||0)-dt);
      p.blind=!!input.blind;p.facing=Math.atan2(point.y-p.y,point.x-p.x);
      const mx=input.mx||0,my=input.my||0,n=Math.max(1,Math.hypot(mx,my)),speed=(p.blind?105:210)*(this.proxy?.drag ? .65 : 1),px=p.x,py=p.y;
      this.move(p,p.dash>0?p.dx*700*dt:mx/n*speed*dt,p.dash>0?p.dy*700*dt:my/n*speed*dt);p.moved=Math.hypot(p.x-px,p.y-py)/dt;
      if(input.autoFire!==false&&!p.blind&&p.shotCd<=0){const target=this.swordTarget(p);if(target)this.attack(target);}if(input.push)this.push();if(input.paper)this.castPaper(point);if(input.dash)this.dash(mx,my);
      this.specialTick(dt);
      const s=this.activeStatue();if(this.lawKind()===1&&this.clock>1.5)s.angle+=clamp(angleDelta(s.target,s.angle),-dt*.5,dt*.5);
      if(this.proxy){const o=this.proxy,ox=o.x,oy=o.y;if(o.drag){const d=dist(o,p);if(d>55)this.move(o,(p.x-o.x)/d*Math.min(d-55,220*dt),(p.y-o.y)/d*Math.min(d-55,220*dt));}this.move(o,o.vx*dt,o.vy*dt);o.vx*=Math.exp(-5*dt);o.vy*=Math.exp(-5*dt);o.moved=Math.hypot(o.x-ox,o.y-oy)/dt;}
      for(const o of this.papers){o.life-=dt;o.age+=dt;o.shotCd-=dt;
        if(this.has('march')&&!o.pulsed&&o.age>=1){o.pulsed=true;for(const e of this.enemies)if(e.hp>0&&dist(o,e)<=100*this.scale('march'))this.impulse(e,o,220);if(this.proxy&&dist(o,this.proxy)<=100)this.impulse(this.proxy,o,220);this.effects.push({type:'ring',x:o.x,y:o.y,r:100,life:.4,max:.4,color:'#b6e5c7'});}
        if(this.has('turret')&&o.shotCd<=0){const marked=this.enemies.filter(e=>e.hp>0&&e.mark>0),pool=marked.length?marked:this.enemies.filter(e=>e.hp>0);const target=pool.sort((a,b)=>dist(a,o)-dist(b,o))[0];if(target){this.fire(o,target,16*.6*this.scale('turret'),'paper');o.shotCd=marked.length?1.2:2.4;}}
      }
      for(const o of this.papers)if(o.hp<=0)this.destroyPaper(o);this.papers=this.papers.filter(o=>o.life>0&&o.hp>0);
      for(const e of this.enemies){if(e.hp<=0)continue;
        const ex=e.x,ey=e.y;for(const k of ['mark','name','pushed','slow','attackCd','shotCd','chargeCd','thunderCd','wardBreak','stun','linkTime'])e[k]=Math.max(0,(e[k]||0)-dt);
        const target=this.papers.length?this.papers.reduce((a,b)=>dist(e,a)<dist(e,b)?a:b):p,a=Math.atan2(target.y-e.y,target.x-e.x),way=this.waypoint(e,target),walkAngle=Math.atan2(way.y-e.y,way.x-e.x);if(!e.stun)e.facing=a;e.lure=target!==p;
        if(e.pendingSeal&&Math.hypot(e.vx,e.vy)<16){e.pendingSeal=false;e.stun=1.2*this.scale('seal');}
        const stopped=e.stun>0||(this.lawKind()===0&&this.clock<=.9&&this.edict!=='reverse');
        let vx=0,vy=0;
        if(e.type==='charger'&&e.chargeCd<=0){e.charge=.55;e.chargeCd=3.3;e.cx=Math.cos(a);e.cy=Math.sin(a);}
        if(e.charge>0&&!e.stun){e.charge-=dt;vx=e.cx*250;vy=e.cy*250;}
        else if(!stopped&&(dist(e,target)>30||this.edict==='reverse'&&!this.chapter)){const speed=e.speed*(e.slow>0?.75:1);vx=Math.cos(walkAngle)*speed;vy=Math.sin(walkAngle)*speed;}
        this.move(e,vx*dt,vy*dt);const beforePush={x:e.x,y:e.y};this.move(e,e.vx*dt,e.vy*dt);const forcedSpeed=dist(e,beforePush)/dt;e.moved=Math.hypot(e.x-ex,e.y-ey)/dt;
        // Only actual player-induced displacement can start a delayed strike.
        if(this.has('thunder')&&e.mark>0&&e.pushed>0&&forcedSpeed>16&&e.thunderCd<=0){e.thunder=1;e.thunderCd=3;}
        e.vx*=Math.exp(-5*dt);e.vy*=Math.exp(-5*dt);
        if(e.thunder>0){e.thunder-=dt;if(e.thunder<=0){this.stats.thunders++;this.damage(e,35*this.scale('thunder'),'thunder');e.mark=0;}}
        if(e.hp<=0)continue;
        if(e.attackCd<=0&&dist(e,p)<e.r+p.r+3){this.hurt(e.type==='boss'?14:7,'被妖物近身击中；纸人可以引开追击。');e.attackCd=1;}
        if(this.phase!=='combat')break;
        if(target.paper&&dist(e,target)<40&&e.attackCd<=0){target.hp-=e.type==='cleaner'?2:1;e.attackCd=1.2;}
        if(['shooter','boss'].includes(e.type)&&e.shotCd<=0&&!stopped){const shotAngle=Math.atan2(p.y-e.y,p.x-e.x);this.shots.push({x:e.x,y:e.y,vx:Math.cos(shotAngle)*160,vy:Math.sin(shotAngle)*160,life:4,kind:'enemy',damage:8});e.shotCd=e.type==='boss'?1.8:3.5;}
        if(e.type==='boss'&&e.hp<e.maxHp*.5&&e.phase===1){e.phase=2;if(this.chapter===0){this.proxy={id:++this.uid,x:700,y:430,r:18,vx:0,vy:0,moved:0,drag:false};this.say('灵牌显形！Q 可推，靠近 F 牵引；灵牌移动也让报丧人触犯钟律。');}else if(this.chapter===1){this.statues=[{x:380,y:205,angle:Math.PI/2,target:Math.PI/2,range:430,half:.66},{x:740,y:205,angle:Math.PI/2,target:Math.PI/2,range:430,half:.66}];this.statueIndex=0;this.clock=Math.max(2,this.clock);this.say('双神像交替落罚；亮起的那一尊才是本轮裁决者。');}else if(this.chapter===2){this.mirror.x=650;this.clock=Math.max(3,this.clock);this.say('镜轴东移！三秒后裁决，F 拖动镜架改变倒影。');}else if(this.chapter===3){this.namePlate={owner:0,registered:true,moved:false};this.clock=Math.max(3,this.clock);this.say('司名官点你的寄名牌；靠近妖物按 F 将责任退还。');}}
      }
      if(this.phase!=='combat')return;
      for(const shot of [...this.shots]){
        shot.life-=dt;if(shot.life<=0)continue;this.trackSword(shot);const before={x:shot.x,y:shot.y};shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
        if(this.obstacles.some(r=>segmentRect(before,shot,r))){shot.life=0;continue;}
        if(shot.kind==='enemy'){if(dist(shot,p)<20){this.hurt(shot.damage,'被游火击中；闪避可避开普通攻击。');shot.life=0;}else{const o=this.papers.find(o=>dist(o,shot)<18);if(o){o.hp--;shot.life=0;}}}
        else {
          if(this.proxy&&dist(this.proxy,shot)<25){if(shot.kind==='active')shot.third=++this.hitCount%3===0;if(shot.third&&this.has('third'))this.impulse(this.proxy,before,380*this.scale('third'));shot.life=0;continue;}
          const e=this.enemies.find(e=>e.hp>0&&!(shot.hits||[]).includes(e.id)&&(dist(shot,e)<e.r+8||(this.lawKind()===2&&dist(shot,this.mirrorImage(e))<e.r+8)));
          if(e){let amount=shot.damage;if(shot.kind==='active'){const wasMarked=e.mark>0;shot.third=++this.hitCount%3===0;
            if(this.has('return')&&wasMarked){if(!(p.returnWindow>0)){p.returnWindow=1;p.returnUsed=0;}const refund=Math.min(.04*this.scale('return'),.4-(p.returnUsed||0));p.returnUsed+=refund;p.dashCd=Math.max(0,p.dashCd-refund);}
            if(this.has('inscribe')&&!(p.paperForm>0))e.mark=6*this.scale('inscribe');
            if(shot.third&&this.has('emberblade')){if(this.embers>0){this.embers--;amount*=2;if(!(p.paperForm>0))e.mark=6;}else amount*=1.15;}
            if(shot.third&&this.has('third'))this.impulse(e,before,380*this.scale('third'));
          }this.damage(e,amount,shot.kind==='active'?'active':'sword');shot.hits=shot.hits||[];shot.hits.push(e.id);if(shot.pierce>0){if(shot.pierce===2)shot.damage*=.7;shot.pierce--;}else shot.life=0;}

        }
        if(this.phase!=='combat')break;
      }
      if(this.phase!=='combat')return;
      this.shots=this.shots.filter(s=>s.life>0&&s.x>40&&s.x<1080&&s.y>80&&s.y<650);
      if(this.clock<=0){if(this.endingMode==='break'&&this.pillars.every(p=>p.hp<=0))this.clock=7;else this.judge();}if(this.phase!=='combat')return;
      this.enemies=this.enemies.filter(e=>e.hp>0);this.effects.forEach(e=>e.life-=dt);this.effects=this.effects.filter(e=>e.life>0).slice(-100);
      if(!this.enemies.length){if(this.wave<this.waveTotal){this.wave++;this.clock=Math.max(this.clock,3);for(let i=0;i<4;i++)this.makeEnemy(this.chapter&&i===0?'cleaner':i===2?'shooter':'walker',180+i*250,170+(i%2)*45);this.say('第二批妖物入场：保持你的构筑，重新布置诱饵。');}else this.cleared();}
    }
    mirrorImage(a){return {x:2*this.mirror.x-a.x+(a.mirrorOffset||0),y:a.y,r:a.r};}
    destroyPaper(o){if(o.destroyed)return;o.destroyed=true;
      if(this.has('burn'))for(const e of this.enemies)if(e.hp>0&&dist(o,e)<=120){this.damage(e,35*this.scale('burn'),'burn');this.impulse(e,o,225);}
      if(this.has('rebirth')&&!(this.player.rebirthCd>0)){this.player.rebirthCd=3;this.player.paperCd=Math.max(0,this.player.paperCd-(this.embers>0?2:.5)*this.scale('rebirth'));if(this.embers>0)this.embers--;}
    }
    specialInteract(){const p=this.player;
      if(this.endingMode&&this.endingMode!=='break'&&dist(p,{x:560,y:355})<120){this.token=true;if(this.endingMode==='common'){const boss=this.enemies.find(e=>e.type==='boss'&&e.hp>0);if(boss)this.namePlate={owner:boss.id,registered:true,moved:true};}this.say(this.endingMode==='inherit'?'已接过天灯，守住四印，等待三轮裁决。':'无主之罚已退回执衡名下，守住三轮公议。');return true;}
      if(this.endingMode==='break'){const i=this.pillars.findIndex(o=>o.hp>0&&dist(p,o)<120);if(i>=0){this.boundPillar=i;this.say('已接通'+['钟','目','镜','名'][i]+'律柱：对应判词裁决时，自己犯规即可把罚退入律柱。');return true;}}
      if(this.lawKind()===2){if(this.mirror.drag){this.mirror.drag=false;return true;}if(dist(p,this.mirror)<130){this.mirror.drag=true;this.say('牵引镜架中，F 放下。镜影与本体共命。');return true;}}
      if(this.lawKind()===3&&dist(p,{x:560,y:190})<90){this.namePlate.registered=!this.namePlate.registered;this.say('点名牌登记状态：'+(this.namePlate.registered?'已登记':'已撤销')+'。');return true;}
      if(this.lawKind()===3&&!this.namePlate.moved){const owner=this.namePlate.owner===0?p:this.enemies.find(e=>e.id===this.namePlate.owner);if(owner&&dist(p,owner)<150){const target=this.enemies.filter(e=>e.hp>0&&e!==owner&&dist(p,e)<150).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(target){this.namePlate.owner=target.id;this.namePlate.moved=true;this.say('点名牌已转给'+(target.type==='boss'?'司律者':'妖物')+'；本轮不能再转。');return true;}}}
      return false;
    }
    specialTick(dt){if(this.mirror?.drag){this.mirror.x=clamp(this.player.x,280,840);this.mirror.y=clamp(this.player.y-50,150,550);}
      if(this.endingMode&&this.endingMode!=='break'&&this.enemies.filter(e=>e.hp>0).length<2&&this.clock>4)this.makeEnemy('walker',220+this.aiRng.next()*680,180);
    }
    specialJudgment(playerGuilty){
      const w=this.witnessTask;if(w&&w.hp>0&&w.rounds<2){if(this.enemies.some(e=>e.hp>0&&dist(e,w)<110))w.hp--;w.rounds++;if(w.rounds===2&&w.hp>0){if(!this.witnesses.includes(this.chapter))this.witnesses.push(this.chapter);this.say('证人安全通过两轮裁决，亲自签下证言。');}else if(w.hp<=0)this.say('护证失败，主线仍可继续；重访旧案可补证。');}
      if(!this.endingMode)return;
      if(this.endingMode==='break'){const pillar=this.pillars[this.boundPillar];if(pillar&&pillar.hp>0&&pillar.law===this.lastJudgedLaw&&playerGuilty){pillar.hp=0;this.hp=Math.min(100,this.hp+12);this.player.hp=this.hp;this.boundPillar=-1;this.say('律柱已断。余 '+this.pillars.filter(o=>o.hp>0).length+' 柱。');}return;}
      if(!this.token)return;
      for(const seal of this.seals)if(this.enemies.some(e=>e.hp>0&&dist(e,seal)<125))seal.hp--;
      if(this.seals.some(o=>o.hp<=0)){this.finish(false,'一方证印熄灭。先引开近敌，再接过天灯或发起公议。');return;}
      if(this.endingMode==='common'){const boss=this.enemies.find(e=>e.type==='boss'&&e.hp>0);if(!boss)return;this.damage(boss,55,'transfer');this.token=false;}
      this.endingRounds++;this.say('四印尚存 · '+this.endingRounds+' / 3 轮');if(this.endingRounds>=3)this.completeEnding();
    }
    chooseEnding(mode){if(this.phase!=='finalchoice'||!['inherit','break','common'].includes(mode)||(mode==='common'&&(!this.pact||this.witnesses.length<4)))return false;
      if(mode==='break')this.finalEdicts={};this.endingMode=mode;this.endingRounds=0;this.token=false;this.edict='original';this.edited=this.edited||mode==='break';this.hp=Math.min(100,this.hp+40);this.beginRoom();
      this.pillars=[{x:260,y:440},{x:440,y:440},{x:680,y:440},{x:860,y:440}].map((o,i)=>({...o,law:i,hp:1}));this.seals=[{x:240,y:480},{x:440,y:480},{x:680,y:480},{x:880,y:480}].map(o=>({...o,hp:3}));
      this.say(mode==='break'?'F 接通当前律柱，再触犯对应判词，退罚毁柱。四柱尽毁后击败执衡。':'靠近中央天灯按 F 开始，守住四印三轮裁决。');return true;
    }
    completeEnding(){const texts={inherit:'继律 · 你接过天灯，阿照的名字回到人间。你成为新执律者，保留证言，承担每一次判罚。',break:'断律 · 四柱尽毁，执衡倒下。阿照与你走下天台；旧灾仍在，你们与众人一起修复失去天规的世界。',common:'共律 · 四名证人共同确认新约。无主之罚归回执律者，保护可撤回、判词可复议。你与阿照都取回了自己的名字。'};this.finish(true,texts[this.endingMode]);this.result.ending=this.endingMode;}
    snapshot(){return {version:VERSION,data:clone({...this,rng:undefined,aiRng:undefined,sounds:[],effects:[]}),rng:this.rng.state,aiRng:this.aiRng.state};}
    static restore(save){
      if(![VERSION,'0.5.0'].includes(save?.version)||!save.data||!['combat','story','reward','route','camp','bossreward','paused','edit','witnesschoice','replace','finalchoice'].includes(save.data.phase))throw new Error('存档版本或阶段无效');
      const d=save.data;if(!Array.isArray(d.build)||d.build.length>8||new Set(d.build).size!==d.build.length||d.build.some(id=>!SKILL[id])||![0,1,2,3,4].includes(d.chapter)||!Number.isInteger(d.node)||d.node<0||d.node>5||!Number.isFinite(d.hp)||d.hp<=0||d.hp>100)throw new Error('存档内容无效');
      if(!d.player||!Number.isFinite(d.player.x)||!Number.isFinite(d.player.y)||!d.levels||d.build.some(id=>![1,2,3].includes(d.levels[id]))||!['enemies','papers','shots','obstacles','statues','deck','evidence','log'].every(k=>Array.isArray(d[k]))||!d.stats||!Number.isFinite(save.rng)||!Number.isFinite(save.aiRng)||d.build.filter(id=>SKILL[id].bridge).length>2)throw new Error('存档结构无效');
      const game=new Campaign(d.seed);Object.assign(game,clone(d));if(save.version==='0.5.0'){game.mirror={x:560,y:460,r:18,vx:0,vy:0,drag:false};game.redLine=560;game.namePlate={owner:0,registered:true,moved:false};game.judgments=0;}game.rng=new RNG('');game.aiRng=new RNG('');game.rng.state=save.rng>>>0;game.aiRng.state=save.aiRng>>>0;game.sounds=[];game.effects=[];return game;
    }
  }
  const api={Campaign,SKILLS,SKILL,CHAPTERS,EVIDENCE,STORIES,VERSION,dist,angleDelta,segmentRect};
  if(typeof module!=='undefined')module.exports=api;else root.CelestialCampaign=api;
})(typeof window!=='undefined'?window:globalThis);
