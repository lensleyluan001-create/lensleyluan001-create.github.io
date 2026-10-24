// SUPER TRADING OS · OFFICE (own tab, 2026-10-24 redesign). PAPER ONLY, read-only display.
// Each station = a real part of the system, fed only by real rows: bot_state (heartbeat, alerts, challenge_check, scoreboard,
// rnd_workers, research, research_engine, intel, indie_intel) + the published bot state (/api/state or the Overview's /api/all) + the live pulse feed.
// Missing data is labelled "no data"; nothing is invented. The spider = web crawler, driven by scanner / research sweep / intel refresh timestamps.
// Rendering: Three.js r160 (self-hosted, lazy) on desktop with WebGL; 2D canvas on small screens, without WebGL, or on request.
// Loop capped at ~30fps, paused when off screen, tab hidden or document hidden; prefers-reduced-motion = still frame.
// No polling: data loads on tab entry (max once a minute) and when the app's existing heartbeat read fires 'nl-hb'. Never touches engine, sizing or risk.
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const ms=t=>{if(t==null||t==='')return 0;if(typeof t==='number')return t<1e11?t*1000:t;const s=String(t).trim();return Date.parse(s.length<=16?s.replace(' ','T')+':00+02:00':s.replace(' ','T')+(/[Z+]/.test(s.slice(19))?'':'+02:00'))||0;};
const ago=m=>{if(!m)return 'never';const a=(Date.now()-m)/60000;return a<1?'just now':a<90?Math.round(a)+' min ago':a<48*60?(a/60).toFixed(1)+' h ago':Math.round(a/1440)+' d ago';};
const hm=m=>m?new Date(m+7200e3).toISOString().slice(5,16).replace('T',' ')+' SAST':'—';
const usd=v=>v==null||!isFinite(+v)?'—':(+v<0?'−$':'$')+Math.abs(+v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const ND='<span class="dim">no data published</span>';
// layout on a 100 x 64 floor (x right, y down). w/h = room size.
const ROOMS=[
 {id:'brain',name:'BRAIN',x:8,y:6,w:24,h:18,tab:'machines',sec:'t-brain'},
 {id:'pulse',name:'PULSE ENGINE',x:38,y:6,w:24,h:18,tab:'markets',sec:'t-engine'},
 {id:'research',name:'RESEARCH',x:68,y:6,w:24,h:18,tab:'research'},
 {id:'risk',name:'RISK',x:8,y:28,w:16,h:14,tab:'machines',sec:'t-guards'},
 {id:'bots',name:'PAPER BOTS',x:28,y:28,w:44,h:30,tab:'machines',sec:'t-bot'},
 {id:'desk',name:'DESK',x:76,y:28,w:16,h:14,tab:'money',sec:'t-proof'},
 {id:'guard',name:'GUARD',x:8,y:46,w:16,h:12,tab:'machines',sec:'t-guards'},
 {id:'heartbeat',name:'HEARTBEAT',x:76,y:46,w:16,h:12,tab:'money'}];
const LAND=ROOMS.map(r=>({...r})),PORT={brain:[2,2,30,16],pulse:[34,2,28,16],research:[2,20,30,16],risk:[34,20,28,16],bots:[2,38,60,40],desk:[2,80,20,18],guard:[23,80,18,18],heartbeat:[42,80,20,18]};
let FW_=100,FH_=64;function layout(port){ROOMS.forEach((r,i)=>{const q=port?PORT[r.id]:[LAND[i].x,LAND[i].y,LAND[i].w,LAND[i].h];r.x=q[0];r.y=q[1];r.w=q[2];r.h=q[3];});FW_=port?64:100;FH_=port?100:64;}
const RID=Object.fromEntries(ROOMS.map(r=>[r.id,r]));const ctr=r=>[r.x+r.w/2,r.y+r.h/2];
// spider strands: crawler activity -> which stations it links
const CRAWL=[{k:'scanner',name:'volatility scanner',a:'research',b:'pulse',fresh:90},{k:'workers',name:'R&D workers sweep',a:'research',b:'bots',fresh:60},
 {k:'sweep',name:'research engine sweep',a:'research',b:'brain',fresh:180},{k:'lab',name:'strategy lab batch',a:'brain',b:'bots',fresh:120},
 {k:'intel',name:'market intel refresh',a:'research',b:'guard',fresh:120},{k:'indie',name:'independent intel fetch',a:'guard',b:'risk',fresh:120}];
const COL={ok:'#39ff88',warn:'#ffb347',bad:'#ff5a5a',idle:'#6f8a80',none:'#3a4743',info:'#3ad7ff'};
let D={},G=null,R3=null,R2=null,mode=null,force2d=localStorage.getItem('nl_office2d')==='1',loadedAt=0,sel=null,io=null,visible=true;
// ---------- data ----------
function tok(){try{const a=JSON.parse(localStorage.getItem('nl_auth')||'null');return a&&a.mode==='supabase'&&a.exp>Date.now()/1000+30?a.token:null;}catch{return null;}}
async function rows(){const s=window.NL_SB,t=tok();if(!s||!t)return null;try{const r=await fetch(s.url+'/rest/v1/bot_state?select=id,data&id=in.(heartbeat,alerts,challenge_check,scoreboard,rnd_workers,research,research_engine,intel,indie_intel)',{cache:'no-store',headers:{apikey:s.key,Authorization:'Bearer '+t}});if(!r.ok)return null;const o={};for(const x of await r.json()||[])if(x&&x.id&&x.data&&typeof x.data==='object')o[x.id]=x.data;return o;}catch{return null;}}
async function load(force){if(!force&&Date.now()-loadedAt<60000)return;loadedAt=Date.now();
 let st=window.S?.d?.state||null;if(!st){try{const r=await fetch('/api/state',{cache:'no-store'});st=r.ok?await r.json():null;}catch{st=null;}}if(st&&st.error)st=null;
 const o=await rows(),H=window.NL_HB||{};D={st,signed:!!tok(),pulse:window.S?.d?.pulse||null,...Object.fromEntries(['heartbeat','alerts','challenge_check','scoreboard','rnd_workers','research','research_engine','intel','indie_intel'].map(k=>[k,o?.[k]??H[k]??null]))};derive();}
function stat(ok,warn){return ok?'ok':warn?'warn':'bad';}
function derive(){const s=D.st,hb=D.heartbeat,cc=D.challenge_check,sb=D.scoreboard?.bots||null,b=s?.brain,ch=s?.challenge||{},bot=s?.bot||{},h=s?.bot_health||{},pr=s?.proof||{};
 const S={},now=Date.now();
 // heartbeat
 {const t=ms(hb?.epoch),age=t?(now-t)/60000:null;S.heartbeat=hb?{st:age>75||hb.consecutive_fails?'bad':age>40?'warn':'ok',big:age!=null?Math.round(age)+'m':'—',sub:'since last tick',bpm:age!=null&&age<=75?60:age!=null?20:0,
  lines:[`last tick <b>${esc(hb.ts)}</b> SAST (${ago(t)})`,`tick rc <b class="${hb.last_tick_rc===0?'g':'r'}">${esc(hb.last_tick_rc)}</b> · ${hb.tick_done?'tick done':hb.skipped_lock?'skipped (lock)':'<b class="r">not done</b>'} · consecutive fails <b>${esc(hb.consecutive_fails)}</b>`,
  cc?`challenge check (${esc(cc.source||'box job')}): equity <b>${usd(cc.equity_usd)}</b> · ${esc(cc.progress_pct)}% to ${usd(cc.goal_usd)} · updated ${esc(cc.updated_sast)} SAST`:'challenge check: '+ND,
  'alert rule: BOT DOWN if no tick for 75 min'],src:'bot_state.heartbeat + challenge_check',at:t}:{st:'none',big:'—',sub:D.signed?'row missing':'sign in',lines:[D.signed?'heartbeat row not published':'Sign in to read the heartbeat row (owner only).'],src:'bot_state.heartbeat'};}
 // guard
 {const p=cc?.processes||null,att=cc?.attention||[],nt=D.intel?.no_trade,al=D.alerts;const up=p?Object.values(p).filter(Boolean).length:0,n=p?Object.keys(p).length:0;
  S.guard=p||al||nt?{st:p&&up<n?'bad':(al?.needs_attention||att.length||nt?.active)?'warn':'ok',big:p?`${up}/${n}`:'—',sub:'processes up',
  lines:[p?Object.entries(p).map(([k,v])=>`${esc(k)} <b class="${v?'g':'r'}">${v?'up':'DOWN'}</b>`).join(' · '):'processes: '+ND,att.length?'attention: '+att.map(x=>`<b class="a">${esc(x)}</b>`).join(' · '):'attention: none',
  nt?`news no-trade window: ${nt.active?'<b class="a">ACTIVE</b> '+esc((nt.why||[]).join(', ')):'not active'}`:'news guard: '+ND,al?`alerts: ${al.needs_attention?`<b class="r">${(al.events||[]).length} open</b>`:'<b class="g">none open</b>'} (${esc(al.updated)} SAST)`:'alerts: '+ND],src:'bot_state.challenge_check.processes + alerts + intel.no_trade',at:ms(cc?.updated_epoch)}:{st:'none',big:'—',sub:D.signed?'no data':'sign in',lines:[D.signed?'guard data not published':'Sign in to read the guard rows (owner only).'],src:'bot_state.challenge_check'};}
 // brain
 S.brain=b?{st:(now-ms(s.generated_at))/60000<90?'ok':'warn',big:(b.obs_total??0).toLocaleString(),sub:'observations',
  lines:[`${esc(b.label||'')}`,`${(b.ticks??0).toLocaleString()} ticks · ${(b.setups_seen??0).toLocaleString()} setups seen · ${(b.pending_obs??0).toLocaleString()} pending`,`trusted ${(b.trusted||[]).length} · learning ${(b.learning||[]).length} · retired ${(b.retired||[]).length} (trust needs n≥${esc(b.n_trust)} & z≥${esc(b.z_trust)})`,`horizon ${esc(b.primary_horizon)} · round-trip cost ${b.cost_round_trip!=null?(b.cost_round_trip*100).toFixed(2)+'%':'—'}`],src:'published bot state · brain',at:ms(s.generated_at)}:{st:'none',big:'—',sub:'no state',lines:['bot state not published'],src:'/api/state'};
 // pulse engine
 {const lp=s?.last_bot_pulse,v=Object.values(lp?.verdicts||{}),P=D.pulse?.pairs||null,best=P?Object.entries(P).sort((a,c)=>c[1].score-a[1].score)[0]:null,eng=s?.engine||{};
  S.pulse=s||P?{st:eng.hash==='cb3ed0d29ecbe129'||!s?(P?'ok':'warn'):'bad',big:best?best[1].score.toFixed(1):'—',sub:best?'best pulse · '+best[0].replace(/USD$/,'').replace('XBT','BTC').replace('XDG','DOGE'):'live feed off',
  lines:[`engine ${esc(eng.version||'—')} · hash <code>${esc(eng.hash||'—')}</code> ${eng.hash==='cb3ed0d29ecbe129'?'<b class="g">matches</b>':s?'<b class="r">check</b>':''}`,P?`live feed ${hm(ms(D.pulse.fetched_at))}: `+Object.entries(Object.values(P).reduce((m,u)=>(m[u.verdict]=(m[u.verdict]||0)+1,m),{})).map(([k,n])=>`${esc(k.replace('_',' '))} ${n}`).join(' · '):'live pulse feed: '+ND,
  lp?`last bot pulse ${esc(lp.time_sast)} SAST: ${v.filter(x=>x==='STAND_ASIDE').length}/${v.length} pairs stand aside`:'last bot pulse: '+ND,`entry rule: ${esc(String(bot.entry||'—').slice(0,90))}`],src:'live pulse feed (/api/all) + bot state engine/last_bot_pulse',at:P?ms(D.pulse.fetched_at):ms(s?.generated_at)}:{st:'none',big:'—',sub:'no data',lines:['no pulse data'],src:'/api/all'};}
 // risk
 {const rf=h.risk_fuel||{};S.risk=s?{st:rf.remaining_pct!=null&&rf.remaining_pct<25?'warn':'ok',big:rf.remaining_pct!=null?rf.remaining_pct+'%':'—',sub:'risk fuel left today',
  lines:[`daily loss limit ${bot.daily_loss_frac!=null?(bot.daily_loss_frac*100)+'%':'—'} · budget ${usd(rf.budget_usd)} · max ${usd(bot.max_usd_per_trade)}/trade · max open ${esc(bot.max_open??'—')}`,`stop ${bot.sl_pct!=null?(bot.sl_pct*100)+'%':'—'} · target ${bot.tp_pct!=null?(bot.tp_pct*100)+'%':'—'} · death below ${usd(ch.death_below_usd)}`,`<span class="small">${esc(ch.risk_label||'')}</span>`,'read-only: the office never changes risk or sizing'],src:'published bot state · bot rules + bot_health.risk_fuel',at:ms(s.generated_at)}:{st:'none',big:'—',sub:'no state',lines:['bot state not published'],src:'/api/state'};}
 // research
 {const re=D.research_engine,rs=D.research,sl=s?.strategy_lab||{},c=re?.counts||{};S.research=re||rs||sl.last_run_sast?{st:'ok',big:c.total!=null?String(c.total):'—',sub:'ideas today',
  lines:[re?`research engine: ${c.total??0} ideas · ${c.died??0} died · ${c.advanced??0} advanced · ${c.not_testable??0} not testable (${esc(re.updated_sast)} SAST)`:'research engine: '+ND,rs?.miner?`miner: ${rs.miner.variants_tried?.toLocaleString?.()??'—'} variants · ${rs.miner.in_sample_pass} passed · ${rs.miner.survivors} survived`:'miner: '+ND,
  sl.variants_tested!=null?`strategy lab: ${sl.variants_tested.toLocaleString()} variants tested (${esc(sl.coverage_pct)}%) · last batch ${esc(sl.last_run_sast)} SAST`:'strategy lab: '+ND,rs?.scanner?`scanner model trained ${esc(rs.scanner.model_trained)} · ${(rs.scanner.alerts||[]).length} alerts`:'scanner: '+ND],src:'bot_state.research_engine + research + bot state strategy_lab',at:Math.max(ms(re?.updated_epoch),ms(rs?.updated_sast))}:{st:'none',big:'—',sub:D.signed?'no data':'sign in',lines:[D.signed?'research rows not published':'Sign in to read the research rows (owner only).'],src:'bot_state.research'};}
 // desk
 {const tr=pr.all_trades||[],last=tr[tr.length-1],today=new Date(now+7200e3).toISOString().slice(0,10),nt=tr.filter(x=>String(x.time_SAST||'').startsWith(today)).length,st2=s?.stats||{};
  S.desk=s?{st:'ok',big:String(pr.trade_count??tr.length),sub:'trades in ledger',lines:[`proof ledger: ${pr.trade_count??tr.length} trades · chain head <code>${esc(String(pr.chain_head||'').slice(0,10))}…</code>`,last?`last booked: ${esc(last.action)} ${esc(last.pair)} @ ${esc(last.price)} (${esc(last.time_SAST)} SAST)`:'last booked: '+ND,`today: ${nt} fills · ${(ch.open_positions||[]).length} open · ${st2.closed_trades??0} closed this version · realised ${usd(st2.realized_pnl_usd)}`,`paper equity ${usd(ch.equity_usd)} vs start ${usd(ch.start_usd)}`],src:'published bot state · proof + stats + challenge',at:last?ms(last.time_SAST):0}:{st:'none',big:'—',sub:'no state',lines:['bot state not published'],src:'/api/state'};}
 // paper bots: live/retired from scoreboard status (real); fallback to the squad roster names only
 {const all=sb?Object.entries(sb):[],ret=all.filter(([,v])=>v?.status==='RETIRED'),live=all.filter(([,v])=>v?.status!=='RETIRED');
  const pods=live.map(([id,v])=>({id,v,st:v.net_pnl_after_fees==null?'idle':v.net_pnl_after_fees>0?'ok':v.net_pnl_after_fees<0?'bad':'idle'})),rp=ret.map(([id,v])=>({id,v,st:'none',ret:1}));
  S.bots=sb?{st:'ok',big:String(live.length),sub:`live slots · ${ret.length} retired`,pods,rp,
  lines:[`${live.length} live slots${live.length!==14?` <span class="dim">(brief expected 14; showing the real count)</span>`:''} · ${ret.length} retired: ${ret.map(r=>esc(r[0])).join(', ')||'none'}`,`net after fees: ${pods.filter(p=>p.st==='ok').length} up · ${pods.filter(p=>p.st==='bad').length} down · ${pods.filter(p=>p.st==='idle').length} flat / no trades`,'tap a pod for that bot · colours: green up, red down, grey flat'],src:'bot_state.scoreboard (status RETIRED = retired corner)',at:0}:{st:'none',big:'—',sub:D.signed?'no scoreboard':'sign in',pods:[],rp:[],lines:[D.signed?'scoreboard row not published':'Sign in to read the scoreboard (owner only).'],src:'bot_state.scoreboard'};}
 // crawler activity
 const W=D.rnd_workers?.workers||{},A={scanner:Math.max(ms(W.scanner?.last_run),ms(D.research?.scanner?.model_trained)),workers:Math.max(0,...Object.values(W).map(w=>ms(w?.last_run))),sweep:ms(D.research_engine?.updated_epoch),lab:ms(s?.strategy_lab?.last_run_sast),intel:ms(D.intel?.updated_epoch),indie:ms(D.indie_intel?.intel_fetched_sast)};
 const crawl=CRAWL.map(c=>({...c,at:A[c.k]||0,live:A[c.k]&&(now-A[c.k])/60000<c.fresh}));
 G={S,crawl,active:crawl.filter(c=>c.live),last:Math.max(0,...crawl.map(c=>c.at))};
 const st=$('#ofStat');if(st)st.innerHTML=`${D.signed?'signed in':'<b class="a">signed out: owner rows hidden, shown as “sign in”</b>'} · ${Object.values(S).filter(x=>x.st==='ok').length}/${ROOMS.length} stations healthy · crawler ${G.active.length?`<b class="g">crawling</b> (${G.active.map(c=>esc(c.name)).join(', ')})`:`resting · last activity ${ago(G.last)}`}`;
 legend();if(sel)card(sel);mode==='3d'?R3?.data():R2?.size();}
function legend(){const el=$('#ofLeg');if(!el||!G)return;el.innerHTML=ROOMS.map(r=>{const x=G.S[r.id];return`<button class="of2-li" data-st="${r.id}"><i style="background:${COL[x.st]}"></i><b>${r.name}</b><span>${esc(x.big)}</span><em>${esc(x.sub)}</em></button>`}).join('')+
 `<div class="of2-crawl"><b>WEB CRAWLER</b> ${G.crawl.map(c=>`<span class="${c.live?'g':'dim'}">${c.live?'●':'○'} ${esc(c.name)} · ${ago(c.at)}</span>`).join('')}</div>`;}
function card(id){sel=id;const el=$('#ofCard');if(!el||!G)return;let x,t,go,sec;if(id.startsWith('bot:')){const b=id.slice(4),p=[...G.S.bots.pods,...G.S.bots.rp].find(q=>q.id===b);if(!p)return;const v=p.v||{};
  t=`${esc(b)} ${p.ret?'· RETIRED':'· live slot'}`;x={st:p.st,src:'bot_state.scoreboard.bots.'+b,lines:[p.ret?`retired ${esc(v.retired_date||'')} · ${esc(v.retired_reason||'')}`:'live paper slot',`balance ${usd(v.balance)} · net after fees ${usd(v.net_pnl_after_fees)}`,`closed trades ${esc(v.closed_trades??'—')} · win rate after fees ${v.win_rate_after_fees!=null?esc(v.win_rate_after_fees)+(v.win_rate_after_fees<=1?'':'%'):'—'} · ${esc(v.trades_to_judgement??'—')} trades to judgement`]};go='machines';sec='t-bot';}
 else{x=G.S[id];const r=RID[id];t=r.name;go=r.tab;sec=r.sec;}
 el.innerHTML=`<button class="of-x" aria-label="close">×</button><div class="of-cr" style="color:${COL[x.st]}">● ${{ok:'HEALTHY',warn:'CHECK',bad:'PROBLEM',idle:'IDLE',none:'NO DATA'}[x.st]}</div><h4>${t}</h4>${x.lines.map(l=>`<div class="small">${l}</div>`).join('')}<div class="dim small of2-src">source: ${esc(x.src)}${x.at?' · '+hm(x.at):''}</div><a class="ibtn" data-go="${go}"${sec?` data-sec="${sec}"`:''} href="/${go==='money'?'':go}">open ${esc(go)} →</a>`;el.hidden=false;}
// ---------- shell ----------
function shell(){return`<div class="of of2"><div class="panel of-hero of2-hero"><div id="ofStage" class="of-stage"></div><div class="of-ov"><div class="br-t">SUPER TRADING OS//<b>OFFICE</b></div><div class="br-honest">PAPER ONLY · EVERY NUMBER FROM A LIVE ROW · NO DATA = SAID SO</div><div id="ofStat" class="dim small">opening the office…</div></div>
 <div id="ofLabels" class="of-labels"></div><div id="ofCard" class="of-card" hidden></div><div class="br-ctl of-ctl"><span class="dim" id="ofHint"></span><button id="of2d" type="button">2D</button></div></div>
 <div class="panel"><div class="ph"><b class="c">STATIONS</b><span class="dim small">tap for detail · status colour: green healthy, amber check, red problem, grey no data</span></div><div id="ofLeg" class="of2-leg"></div></div></div>`;}
function wire(){$('#ofCard').addEventListener('click',e=>{if(e.target.closest('.of-x')){sel=null;$('#ofCard').hidden=true;return;}const a=e.target.closest('[data-go]');if(a){e.preventDefault();window.go&&window.go(a.dataset.go);const s=a.dataset.sec;if(s)setTimeout(()=>document.getElementById(s)?.scrollIntoView({block:'start',behavior:'smooth'}),300);}});
 $('#ofLeg').onclick=e=>{const b=e.target.closest('[data-st]');if(b)card(b.dataset.st);};
 $('#of2d').onclick=()=>{force2d=mode==='3d';localStorage.setItem('nl_office2d',force2d?'1':'0');start();};
 addEventListener('nl-hb',()=>{if(!$('#t-office')?.classList.contains('hidden')){loadedAt=0;load();}});
 document.addEventListener('visibilitychange',kick);RM.addEventListener?.('change',kick);
 io=new IntersectionObserver(es=>{visible=es.some(e=>e.isIntersecting);kick();});io.observe($('#ofStage'));addEventListener('resize',()=>{(mode==='3d'?R3:R2)?.size();kick();});}
const running=()=>visible&&!document.hidden&&!$('#t-office')?.classList.contains('hidden');
function kick(){const r=mode==='3d'?R3:R2;if(!r)return;if(running()&&!RM.matches)r.loop();else{r.halt();if(running())r.frame(0);}}
function webgl(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}}
async function start(){R3?.dispose();R2?.dispose();R3=R2=null;$('#ofStage').innerHTML='';$('#ofLabels').innerHTML='';
 const small=$('#ofStage').clientWidth<700||matchMedia('(max-width: 699px)').matches;let why='';
 if(!force2d&&!small&&webgl()){try{const THREE=await import('/vendor/three.module.min.js');R3=make3d(THREE);mode='3d';}catch(e){why='3D failed to load';}}else why=force2d?'2D chosen':small?'small screen: light 2D view':'no WebGL: 2D view';
 if(!R3){R2=make2d();mode='2d';}$('#of2d').textContent=mode==='3d'?'2D':'3D';$('#of2d').hidden=mode==='2d'&&(small||!webgl());
 $('#ofHint').textContent=(mode==='3d'?'tap a station · drag to turn · scroll to zoom':'tap a station')+(why?' · '+why:'')+(RM.matches?' · reduced motion: still':'');
 (mode==='3d'?R3:R2).size();(mode==='3d'?R3:R2).data();kick();}
// shared spider state: walks strands of active crawls, spinning them out; rests at the research nest when idle
function spiderSim(){const nest=[RID.research.x+RID.research.w-3,RID.research.y+RID.research.h-3];let seg=null,t=0,pos=nest.slice(),spun={},idx=0,rest=0;
 return{pos:()=>pos,spun:()=>spun,step(dt){const act=G?.active||[];for(const k in spun)if(!act.find(c=>c.k===k))delete spun[k];
  if(!act.length){if(seg){seg=null;}const dx=nest[0]-pos[0],dy=nest[1]-pos[1],d=Math.hypot(dx,dy);if(d>.2){const s=Math.min(d,dt*6);pos=[pos[0]+dx/d*s,pos[1]+dy/d*s];}return d>.2;}
  if(!seg){const c=act[idx++%act.length],A=ctr(RID[c.a]),B=ctr(RID[c.b]);const rev=Math.hypot(pos[0]-B[0],pos[1]-B[1])<Math.hypot(pos[0]-A[0],pos[1]-A[1]);seg={c,from:pos.slice(),A:rev?B:A,B:rev?A:B,ph:0};t=0;}
  const L=(p,q)=>Math.hypot(q[0]-p[0],q[1]-p[1]);
  if(seg.ph===0){const d=L(pos,seg.A);if(d<.3){seg.ph=1;t=0;}else{const s=Math.min(d,dt*9);pos=[pos[0]+(seg.A[0]-pos[0])/d*s,pos[1]+(seg.A[1]-pos[1])/d*s];}}
  else if(seg.ph===1){const len=L(seg.A,seg.B);t=Math.min(1,t+dt*7/len);pos=[seg.A[0]+(seg.B[0]-seg.A[0])*t,seg.A[1]+(seg.B[1]-seg.A[1])*t];spun[seg.c.k]=Math.max(spun[seg.c.k]||0,t);if(t>=1){seg.ph=2;rest=.8;}}
  else{rest-=dt;if(rest<=0)seg=null;}return true;},
  heading:()=>seg?Math.atan2((seg.ph===0?seg.A:seg.B)[1]-pos[1],(seg.ph===0?seg.A:seg.B)[0]-pos[0]):-Math.PI/2,moving:()=>!!(G?.active?.length)};}
function looper(frame){let raf=0,last=0;const f=t=>{raf=requestAnimationFrame(f);if(t-last<33)return;const dt=last?Math.min(.1,(t-last)/1000):.033;last=t;frame(dt,t);};
 return{loop(){if(!raf){last=0;raf=requestAnimationFrame(f);}},halt(){cancelAnimationFrame(raf);raf=0;}};}
// ---------- 2D canvas ----------
function make2d(){const st=$('#ofStage'),cv=document.createElement('canvas');cv.className='of2-cv';st.appendChild(cv);const x=cv.getContext('2d');const sp=spiderSim();let sc=1,ox=0,oy=0,W=0,H=0,dpr=1,hit=[];
 const P=(a,b)=>[ox+a*sc,oy+b*sc];
 function size(){dpr=Math.min(devicePixelRatio||1,2);W=st.clientWidth;H=st.clientHeight;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';const top=(document.querySelector('#office .of-ov')?.offsetHeight||64)+16;const port=W<600&&H>W;layout(port);sc=Math.max(1,Math.min(W/(FW_+4),(H-top-34)/(FH_+2)));ox=(W-FW_*sc)/2;oy=top+Math.max(0,((H-top-34)-FH_*sc)/2);}
 function frame(dt,tm=performance.now()){if(dt)sp.step(dt);x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);hit=[];
  x.strokeStyle='rgba(57,255,136,.05)';x.lineWidth=1;for(let i=0;i<=FW_;i+=4){const[a,b]=P(i,0),[c,d]=P(i,FH_);x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();}for(let j=0;j<=FH_;j+=4){const[a,b]=P(0,j),[c,d]=P(FW_,j);x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();}
  for(const r of ROOMS){const s=G?.S[r.id]||{st:'none'},c=COL[s.st],[a,b]=P(r.x,r.y);x.fillStyle='rgba(10,20,17,.85)';x.strokeStyle=c;x.globalAlpha=1;x.lineWidth=sel===r.id?2.5:1.2;x.beginPath();x.roundRect(a,b,r.w*sc,r.h*sc,6);x.fill();x.stroke();
   x.fillStyle=c;x.font=`600 ${Math.max(9,sc*1.7)}px Inter,system-ui`;x.fillText(r.name,a+6,b+Math.max(12,sc*2.6));
   if(r.id!=='bots'){const[cx,cy]=P(...ctr(r)),pulse=s.st==='ok'&&!RM.matches?1+.12*Math.sin(tm/(r.id==='heartbeat'?300:900)):1;x.beginPath();x.arc(cx,cy+sc,sc*2.4*pulse,0,7);x.globalAlpha=.25;x.fill();x.globalAlpha=1;x.beginPath();x.arc(cx,cy+sc,sc*1.3,0,7);x.fill();
    x.fillStyle='#e9fff4';x.font=`700 ${Math.max(11,sc*2.6)}px Inter,system-ui`;x.textAlign='center';x.fillText(s.big||'—',cx,b+r.h*sc-Math.max(14,sc*3.6));x.font=`${Math.max(8,sc*1.45)}px Inter,system-ui`;x.fillStyle='#9fb8ae';x.fillText(s.sub||'',cx,b+r.h*sc-Math.max(5,sc*1.3));x.textAlign='left';}
   hit.push({id:r.id,a,b,w:r.w*sc,h:r.h*sc});}
  // pods
  const B=G?.S.bots;if(B){const r=RID.bots,cols=Math.max(1,Math.floor((r.w-2)/5.6)),pw=4.6,ph=4.4;B.pods.forEach((p,i)=>{const[a,b]=P(r.x+2+(i%cols)*5.6,r.y+5+Math.floor(i/cols)*6);x.fillStyle=COL[p.st];x.globalAlpha=.85;x.beginPath();x.roundRect(a,b,pw*sc,ph*sc,3);x.fill();x.globalAlpha=1;x.fillStyle='#04110b';x.font=`700 ${Math.max(8,sc*1.5)}px Inter`;x.fillText(p.id,a+3,b+ph*sc/2+4);hit.unshift({id:'bot:'+p.id,a,b,w:pw*sc,h:ph*sc});});
   const[ra,rb]=P(r.x+r.w-14,r.y+r.h-9);x.strokeStyle=COL.none;x.setLineDash([4,3]);x.strokeRect(ra,rb,13*sc,8*sc);x.setLineDash([]);x.fillStyle='#6f8a80';x.font=`${Math.max(8,sc*1.3)}px Inter`;x.fillText('RETIRED CORNER',ra+3,rb+Math.max(10,sc*1.8));
   B.rp.forEach((p,i)=>{const[a,b]=P(r.x+r.w-13+i*4.2,r.y+r.h-6);x.fillStyle='#2a3532';x.beginPath();x.roundRect(a,b,3.6*sc,3.6*sc,3);x.fill();x.fillStyle='#8aa199';x.fillText(p.id,a+2,b+3.6*sc/2+4);hit.unshift({id:'bot:'+p.id,a,b,w:3.6*sc,h:3.6*sc});});
   x.fillStyle='#9fb8ae';x.font=`${Math.max(9,sc*1.5)}px Inter`;x.fillText(`${B.big} live · ${B.rp.length} retired · ${B.pods.filter(p=>p.st==='ok').length} up / ${B.pods.filter(p=>p.st==='bad').length} down`,...P(r.x+2,r.y+r.h-2));}
  // strands
  for(const c of G?.crawl||[]){const A=P(...ctr(RID[c.a])),Bp=P(...ctr(RID[c.b])),f=sp.spun()[c.k]||0;x.strokeStyle=c.live?'rgba(220,240,255,.75)':'rgba(220,240,255,.08)';x.lineWidth=c.live?1.2:1;x.setLineDash(c.live?[]:[2,4]);x.beginPath();x.moveTo(...A);x.lineTo(A[0]+(Bp[0]-A[0])*(c.live?f:1),A[1]+(Bp[1]-A[1])*(c.live?f:1));x.stroke();x.setLineDash([]);}
  // spider
  const[sx,sy]=P(...sp.pos()),h=sp.heading(),k=sc*.9,mv=sp.moving()&&!RM.matches;x.save();x.translate(sx,sy);x.rotate(h+Math.PI/2);x.strokeStyle='#e8f1ff';x.lineWidth=1.3;
  for(let s of[-1,1])for(let i=0;i<4;i++){const w=mv?Math.sin(tm/90+i*1.7+(s>0?Math.PI:0))*.35:0,an=(-.9+i*.6+w)*s;x.beginPath();x.moveTo(0,0);const kx=s*k*1.4,ky=(i-1.5)*k*.9;x.lineTo(kx,ky);x.lineTo(kx+Math.sin(an)*k*1.3*s,ky+(i-1.5)*k*.7);x.stroke();}
  x.fillStyle='#0b0f14';x.strokeStyle=mv?'#3ad7ff':'#8aa199';x.beginPath();x.ellipse(0,k*.7,k*.8,k*1.1,0,0,7);x.fill();x.stroke();x.beginPath();x.arc(0,-k*.5,k*.55,0,7);x.fill();x.stroke();x.fillStyle=mv?'#ff5a5a':'#555';x.beginPath();x.arc(-k*.2,-k*.7,k*.12,0,7);x.arc(k*.2,-k*.7,k*.12,0,7);x.fill();x.restore();
  x.fillStyle=mv?'#3ad7ff':'#8aa199';x.font=`${Math.max(9,sc*1.4)}px Inter`;x.fillText(mv?'crawler spinning':'crawler resting',sx+k*2,sy-k*1.5);}
 const L=looper((dt,t)=>frame(dt,t));
 cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,h=hit.find(q=>px>=q.a&&px<=q.a+q.w&&py>=q.b&&py<=q.b+q.h);if(h){card(h.id);frame(0);}});
 return{size(){size();frame(0);},data(){frame(0);},frame,loop:L.loop,halt:L.halt,dispose(){L.halt();cv.remove();}};}
// ---------- 3D (Three.js) ----------
function make3d(T){layout(false);const st=$('#ofStage'),R=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});R.setPixelRatio(Math.min(devicePixelRatio||1,1.5));R.setClearColor(0x030605);st.appendChild(R.domElement);R.domElement.style.touchAction='none';
 const S=new T.Scene();S.fog=new T.Fog(0x030605,70,150);const C=new T.PerspectiveCamera(40,1,.5,400);S.add(new T.HemisphereLight(0xbfffe0,0x061210,1.1));const dl=new T.DirectionalLight(0xffffff,.8);dl.position.set(30,60,20);S.add(dl);
 const W=(x,y)=>new T.Vector3(x-50,0,y-32),objs=[],pick=[],labels=$('#ofLabels'),lab={};const col=c=>new T.Color(COL[c]);
 const floor=new T.Mesh(new T.PlaneGeometry(110,74),new T.MeshStandardMaterial({color:0x07110d,roughness:1}));floor.rotation.x=-Math.PI/2;S.add(floor);const grid=new T.GridHelper(110,44,0x0f3a28,0x0b2219);grid.position.y=.02;S.add(grid);
 const rooms={};for(const r of ROOMS){const g=new T.Group(),c=W(...ctr(r));g.position.copy(c);S.add(g);
  const base=new T.Mesh(new T.BoxGeometry(r.w-.6,.4,r.h-.6),new T.MeshStandardMaterial({color:0x0c1915,roughness:.9}));base.position.y=.2;base.userData.id=r.id;g.add(base);pick.push(base);
  const edge=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(r.w-.6,2.4,r.h-.6)),new T.LineBasicMaterial({color:0x39ff88,transparent:true,opacity:.6}));edge.position.y=1.2;g.add(edge);
  let core=null;if(r.id!=='bots'){const geo={brain:new T.IcosahedronGeometry(2.6,1),pulse:new T.TorusKnotGeometry(1.7,.5,64,8),research:new T.OctahedronGeometry(2.4),risk:new T.CylinderGeometry(1.8,2.4,3,6),desk:new T.BoxGeometry(4,1.6,2.4),guard:new T.ConeGeometry(2,3.4,6),heartbeat:new T.SphereGeometry(1.8,16,12)}[r.id];
   core=new T.Mesh(geo,new T.MeshStandardMaterial({color:0x39ff88,emissive:0x39ff88,emissiveIntensity:.5,flatShading:true,roughness:.4}));core.position.y=3.4;core.userData.id=r.id;g.add(core);pick.push(core);}
  const d=document.createElement('div');d.className='of2-lb';d.dataset.st=r.id;labels.appendChild(d);lab[r.id]=d;rooms[r.id]={g,edge,core,base};}
 labels.onclick=e=>{const b=e.target.closest('[data-st]');if(b)card(b.dataset.st);};
 let pods=[];function mkPods(){pods.forEach(p=>S.remove(p));pods=[];const B=G?.S.bots;if(!B)return;const r=RID.bots;
  B.pods.forEach((p,i)=>{const m=new T.Mesh(new T.BoxGeometry(3.6,2.2,3.4),new T.MeshStandardMaterial({color:COL[p.st],emissive:COL[p.st],emissiveIntensity:.35,flatShading:true}));m.position.copy(W(r.x+4.4+(i%7)*5.6,r.y+7+Math.floor(i/7)*6.4));m.position.y=1.5;m.userData.id='bot:'+p.id;m.userData.ph=i;S.add(m);pods.push(m);pick.push(m);});
  B.rp.forEach((p,i)=>{const m=new T.Mesh(new T.BoxGeometry(3,1.2,3),new T.MeshStandardMaterial({color:0x2a3532,flatShading:true}));m.position.copy(W(r.x+r.w-11+i*4.2,r.y+r.h-4.5));m.position.y=.9;m.userData.id='bot:'+p.id;S.add(m);pods.push(m);pick.push(m);});
  for(const k in lab)if(k.startsWith('bot:')){lab[k].remove();delete lab[k];}[...B.pods,...B.rp].forEach(p=>{const d=document.createElement('div');d.className='of2-lb of2-pod'+(p.ret?' r':'');d.dataset.st='bot:'+p.id;d.textContent=p.id;labels.appendChild(d);lab['bot:'+p.id]=d;});}
 // strands + spider
 const strands={};for(const c of CRAWL){const A=W(...ctr(RID[c.a])),B=W(...ctr(RID[c.b]));A.y=B.y=6;const mid=A.clone().lerp(B,.5);mid.y=10;const cur=new T.QuadraticBezierCurve3(A,mid,B),pts=cur.getPoints(40);const g=new T.BufferGeometry().setFromPoints(pts);
  const l=new T.Line(g,new T.LineBasicMaterial({color:0x7fe8ff,transparent:true,opacity:.1}));S.add(l);strands[c.k]={l,cur};}
 const sp=spiderSim(),spider=new T.Group(),bm=new T.MeshStandardMaterial({color:0x10151c,emissive:0x3ad7ff,emissiveIntensity:.3,roughness:.3});spider.add(new T.Mesh(new T.SphereGeometry(.9,12,10),bm));const head=new T.Mesh(new T.SphereGeometry(.55,10,8),bm);head.position.set(0,0,-1.1);spider.add(head);
 const legs=[];const lm=new T.LineBasicMaterial({color:0xe8f1ff});for(let i=0;i<8;i++){const g=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(),new T.Vector3()]);const l=new T.Line(g,lm);spider.add(l);legs.push(l);}S.add(spider);
 const spl=document.createElement('div');spl.className='of2-lb of2-sp';labels.appendChild(spl);
 // camera
 let yaw=.0,pitch=.95,dist=95;const place=()=>{C.position.set(Math.sin(yaw)*Math.cos(pitch)*dist,Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist);C.lookAt(0,0,2);};place();
 let drag=null;const el=R.domElement;el.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,m:0};el.setPointerCapture(e.pointerId);});
 el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.m+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;yaw-=dx*.006;pitch=Math.max(.35,Math.min(1.45,pitch+dy*.005));place();if(RM.matches||!running())frame(0);});
 el.addEventListener('pointerup',e=>{const d=drag;drag=null;if(d&&d.m<6){const r=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),C);const h=ray.intersectObjects(pick,false)[0];if(h){card(h.object.userData.id);frame(0);}}});
 el.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(45,Math.min(150,dist+e.deltaY*.05));place();if(RM.matches||!running())frame(0);},{passive:false});
 const v=new T.Vector3();
 function frame(dt,tm=performance.now()){if(dt)sp.step(dt);const t=tm/1000,mv=!RM.matches;
  for(const r of ROOMS){const o=rooms[r.id],s=G?.S[r.id]||{st:'none'},c=col(s.st);o.edge.material.color.copy(c);o.edge.material.opacity=sel===r.id?1:.55;if(o.core){o.core.material.color.copy(c);o.core.material.emissive.copy(c);
   if(mv&&s.st!=='none'){o.core.rotation.y=t*.4;const k=r.id==='heartbeat'&&s.bpm?1+.18*Math.max(0,Math.sin(t*Math.PI*2*s.bpm/60))**8:1;o.core.scale.setScalar(k);o.core.position.y=3.4+Math.sin(t+r.x)*.25;}}}
  pods.forEach(m=>{if(mv&&m.userData.ph!=null)m.position.y=1.5+Math.sin(t*2+m.userData.ph)*.12;});
  for(const c of G?.crawl||[]){const s=strands[c.k],f=sp.spun()[c.k]||0;s.l.material.opacity=c.live?.85:.08;s.l.geometry.setDrawRange(0,c.live?Math.max(2,Math.round(41*f)):41);}
  const[px,py]=sp.pos(),moving=sp.moving()&&mv;spider.position.copy(W(px,py));spider.position.y=sp.moving()?6:4;spider.rotation.y=-sp.heading()-Math.PI/2;bm.emissive.set(moving?0x3ad7ff:0x334);
  legs.forEach((l,i)=>{const s=i<4?-1:1,j=i%4,w=moving?Math.sin(t*10+j*1.7+(s>0?Math.PI:0))*.35:0,a=l.geometry.attributes.position;a.setXYZ(1,s*1.4,.7,(j-1.5)*.7);a.setXYZ(2,s*2.4,-1,(j-1.5)*1.1+w);a.needsUpdate=true;});
  R.render(S,C);const w=el.clientWidth,h=el.clientHeight,pos=(p,d,dy=0)=>{v.copy(p);v.project(C);d.style.transform=`translate(${(v.x*.5+.5)*w}px,${(-v.y*.5+.5)*h+dy}px) translate(-50%,-100%)`;d.style.display=v.z<1?'':'none';};
  for(const r of ROOMS){const s=G?.S[r.id]||{st:'none',big:'—',sub:''},d=lab[r.id],c=r.id==='bots'?W(r.x+r.w/2,r.y+1.5):W(...ctr(r));c.y=r.id==='bots'?2.6:6.4;const html=`<i style="background:${COL[s.st]}"></i><b>${r.name}</b> <span>${esc(s.big)}</span><em>${esc(s.sub)}</em>`;if(d.dataset.h!==html){d.dataset.h=html;d.innerHTML=html;}d.classList.toggle('on',sel===r.id);pos(c,d);}
  pods.forEach(m=>{const d=lab[m.userData.id];if(d){const p=m.position.clone();p.y+=1.4;pos(p,d);}});
  spl.textContent=moving?'🕷 crawling':'🕷 resting';spl.classList.toggle('g',moving);const sp3=spider.position.clone();sp3.y+=2;pos(sp3,spl);}
 const Lp=looper((dt,t)=>frame(dt,t));
 return{size(){const w=st.clientWidth,h=st.clientHeight;R.setSize(w,h,false);R.domElement.style.width=w+'px';R.domElement.style.height=h+'px';C.aspect=w/h;C.updateProjectionMatrix();dist=w/h<1.2?130:95;place();frame(0);},
  data(){mkPods();frame(0);},frame,loop:Lp.loop,halt:Lp.halt,dispose(){Lp.halt();R.dispose();R.domElement.remove();labels.innerHTML='';}};}
// ---------- entry ----------
export async function show(){const box=$('#office');if(!box)return;if(!document.querySelector('link[href="/shell/office.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/shell/office.css';document.head.appendChild(l);}
 if(!box.dataset.v2){box.dataset.v2=1;box.innerHTML=shell();wire();await start();}
 await load();(mode==='3d'?R3:R2)?.size();kick();}
