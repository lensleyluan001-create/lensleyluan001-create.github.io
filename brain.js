// NORTHLINE BRAIN tab. PAPER ONLY. Learning, not proven yet.
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sast=ts=>ts?new Date((ts+7200)*1000).toISOString().slice(11,16):'--:--';
const R=v=>v==null?'—':(v>=0?'+':'')+Number(v).toFixed(2)+'R';
let B=null,ST=null,lastGen=0,lastLog=0,timer=null,raf=null,net=null,pulses=[];
const C=()=>B&&B.conditions||{};
function nice(k){const[cs,d]=k.split('|');return cs.split('+').map(c=>`<i>${esc(C()[c]||c)}</i>`).join('<b>+</b>')+` <em class="${d}">${d==='long'?'▲ LONG':'▼ SHORT'}</em>`;}
export async function show(){const box=$('#brain');if(!box.dataset.init){box.dataset.init=1;box.innerHTML=shell();initNet();}
 await load();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden&&!$('#t-brain').classList.contains('hidden'))load();},30000);}
async function load(){try{ST=await (await fetch('/api/state',{cache:'no-store'})).json();B=ST.brain;}catch(e){$('#brStat').textContent='LINK LOST · retrying';return;}
 if(!B){$('#brStat').textContent='Brain not published yet';return;} render();}
function shell(){return `<div class="br">
<div class="br-hero panel"><canvas id="brNet" aria-label="Interactive brain network: hover or tap a neuron for its stats, drag to move, scroll to zoom"></canvas><div id="brTip" class="br-tip" hidden></div><div class="br-ctl"><span id="brHint" class="dim">hover · click to pin · drag · scroll to zoom</span><button id="brReset" type="button" title="Reset view">⟲ VIEW</button><button id="brFac" type="button" title="Switch network / factory view">FACTORY</button></div><div class="br-ov">
 <div class="br-t">NORTHLINE//<b>BRAIN</b> <span class="br-blink">●</span></div><div class="br-honest">LEARNING, NOT PROVEN YET.</div>
 <div id="brStat" class="dim small">booting cortex…</div></div></div>
<div class="br-kpis" id="brK"></div>
<div class="panel"><div class="ph"><b class="c">FORECASTER</b><span class="dim small" id="brFm">read-only projections · never places trades or sets size</span></div><div id="brF"></div></div>
<div class="panel"><div class="ph"><b>SYNAPSES IN TRAINING</b><span class="dim small">setups earning trust · 30 forward samples needed</span></div><div id="brL"></div></div>
<div class="panel"><div class="ph"><b>VERDICTS &amp; LESSONS</b><span class="dim small">trusted · retired · deaths, in one place</span></div><div class="br-three">
 <div><h5 class="g br-h">TRUSTED <span class="dim">earned normal paper size</span></h5><div id="brT"></div></div>
 <div><h5 class="r br-h">RETIRED <span class="dim">lost money after fees</span></h5><div id="brX"></div></div>
 <div><h5 class="a br-h">LESSONS FROM DEATHS <span class="dim">a death halves its setups' weight</span></h5><div id="brD"></div></div></div></div>
<div class="panel"><div class="ph"><b>NEURAL LOG</b><span class="dim small">newest first</span></div><ol id="brG" class="br-log"></ol>
 <details class="adv"><summary>How the brain learns (method + honest limits)</summary><div id="brM" class="small"></div></details></div>
</div><div class="br-tick"><div id="brTk" class="br-tick-in"></div></div>`;}
function render(){const c=B.counts||{},ch=ST.challenge||{},sn=ST.sentiment||{};
 if(ST.generated_at!==lastGen){if(lastGen)fire(14,'#39ff88');lastGen=ST.generated_at;}
 const nl=(B.log||[]).filter(l=>l.ts>lastLog&&l.kind==='trade').length;if(lastLog&&nl)fire(30,'#ffd23f');lastLog=Math.max(lastLog,...(B.log||[]).map(l=>l.ts));
 $('#brStat').innerHTML=`tick #${B.ticks} · ${B.obs_total} observations · ${B.resolved_total} outcomes scored · last sync ${sast(ST.generated_at)} SAST`;
 const k=[['TRUSTED',c.trusted||0,'g'],['IN TRAINING',(B.setups_seen||0)+'+'+(B.setups_queued||0)+'q','c'],['RETIRED',c.retired||0,'r'],['PENDING OBS',B.pending_obs,'t'],
  ['FEAR&GREED',sn.fng!=null?sn.fng+' '+(sn.fng_label||''):'—','a'],['PAPER EQUITY','$'+(ch.equity_usd??0).toFixed(2),'t']];
 $('#brK').innerHTML=k.map(([a,b,cl])=>`<div class="br-k"><span>${a}</span><b class="${cl}">${esc(b)}</b></div>`).join('');
 const L=(B.learning||[]).slice(0,18);
 $('#brL').innerHTML=L.length?L.map(r=>{const p=Math.min(100,r.n/B.n_trust*100),q=Math.min(100-p,(r.queued||0)/B.n_trust*100);
  return `<div class="br-s"><div class="br-sn">${nice(r.setup)}</div><div class="br-bar"><span style="width:${p}%"></span><u style="width:${q}%"></u></div>
  <div class="br-sm"><b>${r.n}/${B.n_trust}</b>${r.queued?` · ${r.queued} waiting`:''} · avg ${R(r.mean)} · win ${r.win!=null?Math.round(r.win*100)+'%':'—'}${r.weight<1?` · <span class="r">death wt ${r.weight}</span>`:''}</div></div>`}).join(''):'<p class="dim">No setups yet. Snapshots are recorded every tick and scored 1h/4h/24h later.</p>';
 const row=r=>`<div class="br-s"><div class="br-sn">${nice(r.setup)}</div><div class="br-why">${esc(r.reason)}</div></div>`;
 $('#brT').innerHTML=(B.trusted||[]).length?B.trusted.map(row).join(''):'<p class="dim">None yet. Nothing has earned trust: it needs 30 independent 4h results and a worst-case band above zero. Until then every paper trade uses the $10 probation size.</p>';
 $('#brX').innerHTML=(B.retired||[]).length?B.retired.map(row).join(''):'<p class="dim">None yet. A setup is retired once it has 30 results and its average is below zero after fees.</p>';
 $('#brD').innerHTML=(B.lessons||[]).length?B.lessons.slice().reverse().map(l=>`<div class="br-s"><b class="a">${esc(l.version)} ✝</b> ${esc(l.text)}</div>`).join(''):`<p class="dim">No deaths since the brain went live (${ch.deaths||0} earlier deaths happened before it existed). When a version drops below $${ch.death_below_usd||500}, every setup it traded loses half its weight and must re-earn trust.</p>`;
 const lg=(B.log||[]).slice().reverse();
 $('#brG').innerHTML=lg.slice(0,40).map(l=>`<li class="k-${l.kind}"><span>${sast(l.ts)}</span>${esc(l.msg)}</li>`).join('');
 $('#brTk').innerHTML=(lg.slice(0,12).map(l=>`<span class="k-${l.kind}">◆ ${sast(l.ts)} ${esc(l.msg)}</span>`).join('')||'<span>◆ awaiting first tick</span>').repeat(2);
 $('#brM').innerHTML=`<p>${esc(B.method)}</p><p>Costs: ${(B.cost_round_trip*100).toFixed(2)}% round trip. 1R = ${(B.risk_unit*100)}% stop. Shorts are <b>simulated</b> in the bot ledger (Kraken spot paper cannot short). Sentiment: ${esc(sn.note||'')}</p><p class="dim">Conditions tracked: ${Object.values(C()).map(esc).join(' · ')}</p>`;
 const F=B.forecast||{},cur=F.current||[];
 $('#brF').innerHTML=(cur.length?cur.slice(0,12).map(f=>`<div class="br-s"><div class="br-sn"><b>${esc(f.pair)}</b> · ${f.state==='TRIGGERED'?'<b class="g">TRIGGERED</b>':'<b class="a">NEAR</b> (needs '+esc(C()[f.missing]||f.missing)+')'} · ${nice(f.setup)}</div><div class="br-sm">${esc(f.status)} · conf ${Math.round(f.confidence*100)}% · exp 1h ${R(f.exp_R_1h)} · 4h ${R(f.exp_R_4h)} · n=${f.n}</div></div>`).join(''):'<p class="dim">No setup with positive out-of-sample expectancy is close to triggering right now.</p>')
  +`<p class="dim small">${F.total||0} forecasts logged · ${F.scored||0} scored vs real 4h outcome${Object.entries(F.by_status||{}).map(([k,v])=>` · ${esc(k)} hit ${v.hit!=null?Math.round(v.hit*100)+'%':'—'} (n=${v.n})`).join('')}</p>`;
 grow(B.size);rebuild();{const sl=SL(),bt=sl.by_timeframe?Object.values(sl.by_timeframe).reduce((a,v)=>a+(v.lo_above_0||0),0):0;$('#brStat').innerHTML+=` · <b class="c">${(net.L||0).toLocaleString()} brain lines</b> · ${net.realN} neurons${sl.variants_tested!=null?` · lab ${sl.variants_tested.toLocaleString()} tested · ${(sl.trusted||[]).length} promoted${(sl.trusted||[]).length||bt?'':' · <b class="a">no edge yet</b>'}${net.running?' · ⚡ sweep running':''}`:''}${net.factory?' · FACTORY MODE'+(net.autoFac&&net.forced==null?' (auto: low frame rate)':(net.realN>MAXN?' (auto: '+net.realN+' neurons)':'')):''}`;}
 if(net)net.heat=Math.min(1,0.25+(c.trusted||0)*0.1+(B.setups_seen||0)/400);}
// ---- Interactive neural map v2 (canvas + rAF). Neurons = brain setups + strategy-lab rows + research inbox ideas,
// clustered BRAIN / LAB 1h / LAB 4h / LAB 1d / RESEARCH, wired hub -> neuron -> verdict. Data only from the state export
// already loaded by load() (ST.brain, ST.strategy_lab). No extra fetches. Filler synapses make the line count match brain.size.lines.
const MAXL=2000,MAXN=300,RM=matchMedia('(prefers-reduced-motion: reduce)');
let curL=-1,sig='',V={k:1,tx:0,ty:0},hov=null,pin=null,drag=null,dirty=true,fps={f:0,t0:0,v:60,low:0};
const VC={promoted:'#39ff88',watchlist:'#ffb347',noedge:'#3ad7ff',retired:'#ff4d6d',needs_code:'#c9a2ff'};
const VL={promoted:'PROMOTED',watchlist:'WATCHLIST',noedge:'NO EDGE YET',retired:'RETIRED',needs_code:'NEEDS CODE'};
const SL=()=>ST&&ST.strategy_lab||{};
function labRunning(){const s=SL().last_run_sast;if(!s)return false;const t=Date.parse(s.replace(' ','T')+':00+02:00');return isFinite(t)&&Date.now()-t<45*60*1000;}
function fire(n,col){if(!net||!net.E.length||RM.matches)return;for(let i=0;i<n;i++){const e=net.E[Math.random()*net.E.length|0];pulses.push({e,t:0,col,s:0.012+Math.random()*0.02});}net.flash=1;}
function mode(){if(!net)return;const fm=net.forced!=null?net.forced:(net.L>MAXL||(net.realN||0)>MAXN||net.autoFac);net.factory=fm;const b=$('#brFac');if(b){b.textContent=fm?'NETWORK':'FACTORY';b.classList.toggle('on',fm);}}
function grow(sz){if(!net)return;sz=sz||{};const L=sz.lines||0;net.size=sz;net.L=L;}
function labVerdict(r){if(r.status==='trusted')return'promoted';if(r.status==='retired')return'retired';return r.oos_lo_R!=null&&r.oos_lo_R>0?'watchlist':'noedge';}
function members(){const out=[],sl=SL(),seen=new Set();
 const bs=new Map();(B.learning||[]).forEach(r=>bs.set(r.setup,{...r,fc:[]}));(B.trusted||[]).forEach(r=>bs.set(r.setup,{...(bs.get(r.setup)||{fc:[]}),...r,status:'trusted'}));(B.retired||[]).forEach(r=>bs.set(r.setup,{...(bs.get(r.setup)||{fc:[]}),...r,status:'retired'}));
 ((B.forecast||{}).current||[]).forEach(f=>{if(!bs.has(f.setup))bs.set(f.setup,{setup:f.setup,n:f.n,status:f.status,fc:[]});bs.get(f.setup).fc.push(f);});
 bs.forEach(s=>out.push({id:'b:'+s.setup,kind:'setup',cl:'BRAIN',s,v:s.status==='trusted'?'promoted':s.status==='retired'?'retired':'noedge'}));
 const rows=[...(sl.leaderboard||[]),...(sl.trusted||[]).filter(r=>r&&r.setup)];
 rows.forEach(r=>{if(seen.has(r.setup))return;seen.add(r.setup);out.push({id:'l:'+r.setup,kind:'lab',cl:r.source==='research'?'RESEARCH':'LAB '+(r.tf||'?'),r,v:labVerdict(r)});});
 ((sl.research||{}).needs_code||[]).forEach(id=>out.push({id:'i:'+id,kind:'idea',cl:'RESEARCH',idea:id,v:'needs_code'}));return out;}
function rebuild(){if(!net||!B)return;const M=members(),L=net.L||0,key=M.map(m=>m.id+m.v+(m.s?m.s.n:m.r?m.r.oos_n:'')).join()+'|'+L;net.running=labRunning();if(key===sig){mode();return;}sig=key;
 const old=new Map(net.N.filter(a=>a.id).map(a=>[a.id,a])),N=[],E=[],rnd=(a,b)=>a+Math.random()*(b-a);
 const cvh=$('#brNet'),top=cvh&&cvh.clientWidth<600?0.27:0.32,keep=(o,x,y)=>{const p=old.get(o.id);y=top+(0.97-top)*y;o.x=p?p.x:x;o.y=p?p.y:y;o.ph=Math.random()*6.28;N.push(o);return o;};
 const order=['BRAIN','LAB 1h','LAB 4h','LAB 1d','RESEARCH'],cls=[...new Set([...order.filter(c=>c==='BRAIN'||c==='RESEARCH'||(SL().by_timeframe||{})[c.slice(4)]||M.some(m=>m.cl===c)),...M.map(m=>m.cl)])];
 const hubs=new Map();cls.forEach((c,i)=>hubs.set(c,keep({id:'h:'+c,kind:'hub',cl:c},0.05,(i+1)/(cls.length+1))));
 const vs=['promoted','watchlist','noedge','retired','needs_code'],vn=new Map();vs.forEach((v,i)=>vn.set(v,keep({id:'v:'+v,kind:'verdict',v},0.95,(i+1)/(vs.length+1))));
 const per=c=>M.filter(m=>m.cl===c),ROWS=12,cols=cls.map(c=>Math.max(1,Math.ceil(per(c).length/ROWS))),tot=cols.reduce((a,b)=>a+b,0)+cls.length-1;let ci=0;
 cls.forEach((c,k)=>{const ms=per(c);ms.sort((a,b)=>(b.s?b.s.n:b.r?b.r.oos_n||0:-1)-(a.s?a.s.n:a.r?a.r.oos_n||0:-1));const nc=cols[k],rows=Math.ceil(ms.length/nc)||1;
  ms.forEach((m,i)=>{const col=ci+(i%nc),x=0.22+0.56*(tot>1?col/(tot-1):0.5),y=(Math.floor(i/nc)+1)/(rows+1)+((i%nc)%2)*0.35/(rows+1);const o=keep(m,x,y);E.push([hubs.get(c),o,1]);E.push([o,vn.get(m.v),1]);});ci+=nc+1;});
 net.realN=N.length;
 const fill=Math.min(MAXL,L)-E.length;if(fill>0&&net.realN<=MAXN){const pf=Math.max(5,Math.min(16,Math.round(Math.sqrt(fill/3)))),F1=[],F2=[];
  for(let i=0;i<pf;i++){F1.push(keep({id:'f1:'+i,kind:'f'},0.13+rnd(-.015,.015),(i+1)/(pf+1)));F2.push(keep({id:'f2:'+i,kind:'f'},0.87+rnd(-.015,.015),(i+1)/(pf+1)));}
  const H=[...hubs.values()],SN=N.filter(a=>a.kind==='setup'||a.kind==='lab'),Vn=[...vn.values()],pick=a=>a[Math.random()*a.length|0];
  for(let i=0;i<fill;i++){const r=i%4;E.push(r===0?[pick(H),pick(F1),0]:r===1?[pick(F1),pick(SN)||pick(F2),0]:r===2?[pick(SN)||pick(F1),pick(F2),0]:[pick(F2),pick(Vn),0]);}}
 net.N=N;net.E=E;net.labE=E.filter(e=>e[2]&&e[0].kind==='hub'&&e[0].cl!=='BRAIN'&&e[1].kind==='lab');pulses=[];if(pin&&!N.includes(pin))pin=null;dirty=true;mode();kick();}
function initNet(){const cv=$('#brNet'),x=cv.getContext('2d'),tip=$('#brTip');
 net={N:[],E:[],labE:[],heat:0.3,flash:0,factory:false,forced:null,autoFac:false,L:0,realN:0,running:false};let dpr=Math.min(2,devicePixelRatio||1),W=1,H=1;
 function size(){W=cv.clientWidth||1;H=cv.clientHeight||1;cv.width=W*dpr;cv.height=H*dpr;dirty=true;kick();}size();addEventListener('resize',size);
 const P=a=>[(a.x*W)*V.k+V.tx,(a.y*H)*V.k+V.ty],sm=()=>W<600?0.7:1;
 const rad=a=>a.kind==='setup'?3+Math.min(5,(a.s.n||0)/6):a.kind==='lab'?3+Math.min(5,(a.r.oos_n||0)/6):a.kind==='idea'?4:a.kind==='verdict'?6:a.kind==='hub'?7:2;
 const hit=(mx,my)=>{let b=null,bd=1e9;const tol=matchMedia('(pointer:coarse)').matches?18:10;for(const a of net.N){if(a.kind==='f')continue;const[p,q]=P(a),d=Math.hypot(p-mx,q-my);if(d<Math.max(tol,rad(a)*V.k+4)&&d<bd){bd=d;b=a;}}return b;};
 const rel=a=>pin===a||hov===a,lit=e=>{const f=pin||hov;return f&&e[2]&&(e[0]===f||e[1]===f);};
 const nR=v=>v==null?'—':R(v),badge=v=>`<b style="color:${VC[v]}">${VL[v]}</b>`;
 function tipHtml(a){const sl=SL();
  if(a.kind==='hub'){if(a.cl==='BRAIN'){const c=B.counts||{};return`<b class="c">BRAIN · live setups</b><div>${net.N.filter(m=>m.cl==='BRAIN'&&m.kind==='setup').length} setups · ${c.trusted||0} trusted · ${c.retired||0} retired</div><div class="dim">needs ${B.n_trust} forward results to earn trust</div>`;}
   if(a.cl==='RESEARCH'){const r=sl.research||{};return`<b class="c">RESEARCH</b><div>${r.specs??'—'} specs · ${r.variants??'—'} variants tested · ${(r.needs_code||[]).length} waiting for code</div><div>${(r.trusted||[]).length?badge('promoted'):badge('noedge')}</div>`;}
   const t=(sl.by_timeframe||{})[a.cl.slice(4)]||{};return`<b class="c">${esc(a.cl)} pipeline</b><table><tr><td>variants tested</td><td><b>${(t.tested??0).toLocaleString()}</b></td></tr><tr><td>with OOS n≥30</td><td>${t.with_oos30??'—'}</td></tr><tr><td>median OOS</td><td>${nR(t.median_oos_R)}</td></tr><tr><td>best OOS lower bound</td><td>${nR(t.best_oos_lo)}</td></tr><tr><td>lower bound &gt; 0</td><td>${t.lo_above_0??0}</td></tr></table><div>${t.lo_above_0?badge('watchlist'):badge('noedge')}</div><div class="dim small">${net.running?'⚡ sweep running · last batch '+esc(sl.last_run_sast)+' SAST':'sweep idle · last batch '+esc(sl.last_run_sast||'—')}</div>`;}
  if(a.kind==='verdict'){const n=net.N.filter(m=>m.v===a.v&&m.kind!=='verdict').length;return`${badge(a.v)}<div>${n} neuron${n===1?'':'s'}</div>`;}
  if(a.kind==='idea')return`<b style="color:${VC.needs_code}">RESEARCH IDEA</b><div><b>${esc(a.idea)}</b></div><div>${badge('needs_code')} · not tested yet, so no numbers</div><div class="dim small">from slab/inbox; queued for a research module</div>`;
  if(a.kind==='lab'){const r=a.r,wn=r.why_not||[],fold=wn.some(w=>/fold/i.test(w));
   return`<div class="br-sn"><b>${esc(r.setup)}</b></div><div class="br-tg">${badge(a.v)} · ${esc(a.cl)}${r.spec_id?' · '+esc(r.spec_id):''}${r.rank?' · rank #'+r.rank:''}</div>
   <table><tr><td>OOS n</td><td><b>${r.oos_n??'—'}</b>/30</td></tr><tr><td>OOS avg</td><td>${nR(r.oos_mean_R)} <span class="dim">lo ${nR(r.oos_lo_R)}</span></td></tr>
   <tr><td>in-sample</td><td>n ${r.pre_n??'—'} · ${nR(r.pre_mean_R)}${r.pre_p!=null?' · p '+Number(r.pre_p).toFixed(3):''}</td></tr><tr><td>holdout</td><td>n ${r.holdout_n??'—'} · ${nR(r.holdout_mean_R)}</td></tr>
   <tr><td>recent</td><td>n ${r.recent_n??'—'} · ${nR(r.recent_mean_R)}</td></tr><tr><td>walk-forward folds</td><td>${fold?'<span class="r">not all positive</span>':'<span class="g">all positive</span>'}</td></tr></table>
   ${wn.length?`<div class="dim small">why not promoted: ${wn.map(esc).join(' · ')}</div>`:''}`;}
  const s=a.s,fc=s.fc||[];
  return`<div class="br-sn">${nice(s.setup)}</div><div class="br-tg">${badge(a.v)} · BRAIN · ${esc((s.status||'probation').toUpperCase())}${s.weight!=null&&s.weight<1?` · <span class="r">death wt ${s.weight}</span>`:''}</div>
  <table><tr><td>n (out-of-sample)</td><td><b>${s.n??'—'}/${B.n_trust}</b>${s.queued?` +${s.queued} waiting`:''}</td></tr>
  <tr><td>avg 4h</td><td>${R(s.mean)}${s.lo!=null?` <span class="dim">[${R(s.lo)} … ${R(s.hi)}]</span>`:''}</td></tr>
  <tr><td>win rate</td><td>${s.win!=null?Math.round(s.win*100)+'%':'—'}</td></tr><tr><td>avg 1h</td><td>${R(s.h1)}</td></tr><tr><td>folds</td><td class="dim">n/a (forward samples)</td></tr></table>
  <div class="br-tf">${fc.length?fc.map(f=>`<div>◆ <b>${esc(f.pair)}</b> ${f.state==='TRIGGERED'?'<b class="g">TRIGGERED</b>':'<b class="a">NEAR</b>'} · conf ${Math.round((f.confidence||0)*100)}% · 4h ${R(f.exp_R_4h)}</div>`).join(''):'<span class="dim">no live forecast for this setup</span>'}</div>`;}
 function showTip(a,mx,my){if(!a){tip.hidden=true;return;}tip.innerHTML=tipHtml(a)+(pin===a?'<div class="dim small">📌 pinned · tap empty space to release</div>':'');tip.hidden=false;
  const tw=tip.offsetWidth,th=tip.offsetHeight;tip.style.left=Math.max(6,Math.min(W-tw-6,mx+14))+'px';tip.style.top=Math.max(6,Math.min(H-th-6,my+14))+'px';}
 const xy=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top];};const ptr=new Map();
 cv.addEventListener('pointerdown',e=>{if(net.factory)return;cv.setPointerCapture(e.pointerId);const[mx,my]=xy(e);ptr.set(e.pointerId,[mx,my]);
  if(ptr.size===2){const[a,b]=[...ptr.values()];drag={pinch:Math.hypot(a[0]-b[0],a[1]-b[1])||1,k:V.k};return;}
  const a=hit(mx,my);drag={a,mx,my,tx:V.tx,ty:V.ty,moved:false};cv.style.cursor=a?'grabbing':'move';});
 cv.addEventListener('pointermove',e=>{if(net.factory)return;const[mx,my]=xy(e);if(ptr.has(e.pointerId))ptr.set(e.pointerId,[mx,my]);
  if(drag&&drag.pinch){if(ptr.size===2){const[a,b]=[...ptr.values()];zoomAt((a[0]+b[0])/2,(a[1]+b[1])/2,drag.k*Math.hypot(a[0]-b[0],a[1]-b[1])/drag.pinch/V.k);}return;}
  if(drag){const dx=mx-drag.mx,dy=my-drag.my;if(Math.abs(dx)+Math.abs(dy)>(e.pointerType==='touch'?8:3))drag.moved=true;
   if(drag.moved){if(drag.a){drag.a.x=((mx-V.tx)/V.k)/W;drag.a.y=((my-V.ty)/V.k)/H;}else{V.tx=drag.tx+dx;V.ty=drag.ty+dy;}dirty=true;kick();}
   if(drag.a)showTip(drag.a,mx,my);return;}
  if(e.pointerType==='touch')return;const a=hit(mx,my);if(a!==hov){hov=a;dirty=true;kick();}cv.style.cursor=a?'pointer':'grab';if(a)showTip(a,mx,my);else if(pin){const[p,q]=P(pin);showTip(pin,p,q);}else showTip(null);});
 const up=e=>{ptr.delete(e.pointerId);if(!drag)return;if(drag.pinch){if(!ptr.size)drag=null;return;}const[mx,my]=xy(e);
  if(!drag.moved){pin=drag.a&&pin!==drag.a?drag.a:null;hov=e.pointerType==='touch'?null:drag.a;if(pin)showTip(pin,mx,my);else showTip(null);}drag=null;cv.style.cursor='grab';dirty=true;kick();};
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('pointerleave',e=>{if(drag||e.pointerType==='touch')return;hov=null;if(!pin)showTip(null);dirty=true;kick();});
 function zoomAt(mx,my,f){const k=Math.max(0.5,Math.min(5,V.k*f));f=k/V.k;V.tx=mx-(mx-V.tx)*f;V.ty=my-(my-V.ty)*f;V.k=k;dirty=true;kick();}
 cv.addEventListener('wheel',e=>{if(net.factory)return;e.preventDefault();const[mx,my]=xy(e);zoomAt(mx,my,Math.exp(-e.deltaY*0.0015));},{passive:false});
 cv.addEventListener('dblclick',()=>{V={k:1,tx:0,ty:0};dirty=true;kick();});
 $('#brReset').onclick=()=>{V={k:1,tx:0,ty:0};pin=null;showTip(null);sig='';rebuild();};
 $('#brFac').onclick=()=>{net.forced=!net.factory;if(!net.forced)net.autoFac=false;fps.low=0;fps.v=60;showTip(null);pin=null;mode();dirty=true;kick();};
 let t=0,last=0,running=false;const vis=()=>!document.hidden&&!$('#t-brain').classList.contains('hidden');
 window.__brain={fps:()=>fps.v,net:()=>({nodes:net.N.length,real:net.realN,lines:net.E.length,factory:net.factory,autoFac:net.autoFac,running:net.running,view:V}),pos:id=>{const a=net.N.find(n=>n.id===id||n.kind===id);if(!a)return null;const r=cv.getBoundingClientRect(),[p,q]=P(a);return[r.left+p,r.top+q];}};
 kick=function(){if(!running&&vis()){running=true;last=0;raf=requestAnimationFrame(draw);}};
 document.addEventListener('visibilitychange',kick);new MutationObserver(kick).observe($('#t-brain'),{attributes:true,attributeFilter:['class']});RM.addEventListener?.('change',()=>{dirty=true;kick();});
 function draw(now){if(!vis()){running=false;return;}const still=RM.matches;
  if(last){const dt=now-last;fps.f++;if(!fps.t0)fps.t0=now;if(now-fps.t0>1000){fps.v=Math.round(fps.f*1000/(now-fps.t0));fps.f=0;fps.t0=now;
   if(!net.factory&&!still&&net.forced==null&&fps.v<24){if(++fps.low>=3){net.autoFac=true;mode();}}else fps.low=0;}t+=Math.min(dt,50)/1000;}last=now;
  const w=cv.width,h=cv.height;x.setTransform(1,0,0,1,0,0);
  if(net.factory){factory(x,w,h,still?0:t,dpr);if(still){running=false;return;}raf=requestAnimationFrame(draw);return;}
  if(still&&!dirty){running=false;return;}dirty=false;
  x.fillStyle=still||drag?'rgb(3,6,5)':'rgba(3,6,5,0.38)';x.fillRect(0,0,w,h);x.setTransform(dpr,0,0,dpr,0,0);
  const E=net.E,N=net.N,f=pin||hov,ha=0.06+0.08*net.heat;x.lineWidth=0.6;
  x.strokeStyle=`rgba(57,255,136,${f?ha*0.45:ha})`;x.beginPath();for(const e of E){if(e[2]||lit(e))continue;const[p,q]=P(e[0]),[r,s]=P(e[1]);x.moveTo(p,q);x.lineTo(r,s);}x.stroke();
  x.strokeStyle=`rgba(57,255,136,${f?0.12:0.22+0.15*net.heat})`;x.lineWidth=0.9;x.beginPath();for(const e of E){if(!e[2]||lit(e))continue;const[p,q]=P(e[0]),[r,s]=P(e[1]);x.moveTo(p,q);x.lineTo(r,s);}x.stroke();
  if(f){x.strokeStyle='rgba(255,210,63,0.85)';x.lineWidth=1.4;x.beginPath();for(const e of E){if(!lit(e))continue;const[p,q]=P(e[0]),[r,s]=P(e[1]);x.moveTo(p,q);x.lineTo(r,s);}x.stroke();}
  if(!still&&E.length){if(Math.random()<0.1+0.12*net.heat)pulses.push({e:E[Math.random()*E.length|0],t:0,col:'#3ad7ff',s:0.008+Math.random()*0.01});
   if(net.running&&net.labE.length&&Math.random()<0.35)pulses.push({e:net.labE[Math.random()*net.labE.length|0],t:0,col:'#ffd23f',s:0.012+Math.random()*0.01,big:1});
   if(f&&Math.random()<0.25){const le=E.filter(lit);if(le.length)pulses.push({e:le[Math.random()*le.length|0],t:0,col:'#ffd23f',s:0.02});}
   pulses=pulses.filter(p=>p.t<=1);if(pulses.length>250)pulses.splice(0,pulses.length-250);
   x.shadowBlur=10;for(const p of pulses){p.t+=p.s;const[x1,y1]=P(p.e[0]),[x2,y2]=P(p.e[1]);x.fillStyle=x.shadowColor=p.col;x.beginPath();x.arc(x1+(x2-x1)*p.t,y1+(y2-y1)*p.t,p.big?2.8:2.2,0,6.28);x.fill();}x.shadowBlur=0;}
  const sk=Math.sqrt(V.k)*sm();x.font='10px ui-monospace,monospace';
  for(const a of N){const[p,q]=P(a),g=still?0.6:0.5+0.5*Math.sin(t*2+a.ph),r=rad(a)*sk;
   if(a.kind==='f'){x.fillStyle=`rgba(57,255,136,${(0.35+0.5*g*net.heat+net.flash*0.4)*(f?0.45:1)})`;x.beginPath();x.arc(p,q,(2+2*g+net.flash*2)*sk,0,6.28);x.fill();continue;}
   const v=a.v,col=a.kind==='hub'?'#39ff88':VC[v]||'#3ad7ff',glow=v==='promoted'||v==='watchlist',dim=v==='retired',on=rel(a)||(f&&E.some(e=>e[2]&&lit(e)&&(e[0]===a||e[1]===a)));
   x.globalAlpha=f&&!on?0.3:dim?0.28:0.55+0.4*g+net.flash*0.3;x.fillStyle=x.shadowColor=col;x.shadowBlur=on?16:glow?14+8*g:dim?0:6;
   if(glow&&!still&&a.kind!=='verdict'){x.save();x.globalAlpha*=0.25;x.beginPath();x.arc(p,q,r*2.4+2*g,0,6.28);x.fill();x.restore();}
   x.beginPath();x.arc(p,q,r+(on?2:0)+net.flash*2,0,6.28);x.fill();
   if(a.kind==='idea'){x.setLineDash([2,2]);x.strokeStyle=col;x.lineWidth=1;x.beginPath();x.arc(p,q,r+4,0,6.28);x.stroke();x.setLineDash([]);}
   if(a.kind==='setup'&&a.s.fc.length){x.strokeStyle='#ffd23f';x.lineWidth=1.2;x.beginPath();x.arc(p,q,r+4,0,6.28);x.stroke();}
   x.shadowBlur=0;x.globalAlpha=1;if(rel(a)){x.strokeStyle='#fff';x.lineWidth=1;x.beginPath();x.arc(p,q,r+3,0,6.28);x.stroke();}
   if(a.kind==='hub'||a.kind==='verdict'){x.fillStyle='rgba(200,255,220,.8)';x.textAlign=a.kind==='verdict'?'right':'left';x.fillText(a.kind==='hub'?a.cl:VL[v],p+(a.kind==='verdict'?-11:10),q+3);}
   else if(a.kind==='idea'&&V.k>=1.4){x.fillStyle='rgba(201,162,255,.85)';x.textAlign='left';x.fillText(a.idea.split('-').slice(0,2).join('-'),p+8,q+3);}}
  net.flash*=0.94;if(still){running=false;return;}raf=requestAnimationFrame(draw);}
 cv.style.cursor='grab';kick();setTimeout(()=>fire(20,'#39ff88'),300);}
let kick=()=>{};
function factory(x,w,h,t,dpr){const sz=net.size||{},sl=SL(),fam=Object.entries(sz.families||{}).sort((a,b)=>b[1]-a[1]),mk=Object.entries(sz.markets||{});
 const lab=Object.entries(sl.by_timeframe||{}).map(([tf,v])=>['LAB '+tf+' pipeline · '+(v.tested||0).toLocaleString()+' tested · '+(v.lo_above_0?v.lo_above_0+' watch':'no edge yet'),v.tested||0,1]);
 const rs=sl.research;if(rs)lab.push(['RESEARCH module · '+(rs.variants||0)+' variants · '+(rs.needs_code||[]).length+' ideas need code',rs.variants||0,1]);
 const rowsA=[...lab,...fam.map(([f,c])=>[`${f} line · ${c}`,c,0])];
 x.fillStyle='rgba(3,6,5,0.6)';x.fillRect(0,0,w,h);x.font=`${(h/dpr<420?10:11)*dpr}px ui-monospace,monospace`;x.textAlign='left';
 const top=h*0.3,rows=Math.max(1,rowsA.length),rh=(h-top)/(rows+0.6);rowsA.forEach(([label,c,isLab],i)=>{const y=top+rh*i;
  x.strokeStyle=isLab?'rgba(255,210,63,0.3)':'rgba(57,255,136,0.25)';x.strokeRect(w*0.04,y,w*0.92,rh*0.7);x.fillStyle=isLab?'#ffd23f':'#39ff88';x.fillText(label,w*0.05,y+rh*0.45);
  const move=!isLab||net.running,k=Math.min(30,Math.ceil(c/(isLab?600:40)));for(let j=0;j<k;j++){const px=w*0.45+(((move?t:0)*40*dpr+j*w*0.5/k)%(w*0.5));x.fillStyle=isLab?'rgba(255,210,63,0.85)':'rgba(58,215,255,0.8)';x.fillRect(px,y+rh*0.25,6*dpr,rh*0.2);}});
 x.fillStyle='#ffd23f';x.fillText('MARKETS: '+(mk.map(([p,c])=>`${p} ${c}`).join(' · ')||'—')+` · neurons ${net.realN}`,w*0.05,h-rh*0.15);}
