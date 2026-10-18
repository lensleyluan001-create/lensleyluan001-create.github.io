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
<div class="br-two"><div class="panel"><div class="ph"><b class="g">TRUSTED</b><span class="dim small">earned normal paper size</span></div><div id="brT"></div></div>
<div class="panel"><div class="ph"><b class="r">RETIRED</b><span class="dim small">dropped: lost money after fees</span></div><div id="brX"></div></div></div>
<div class="panel"><div class="ph"><b class="a">LESSONS FROM DEATHS</b><span class="dim small">a dead version halves the weight of its setups</span></div><div id="brD"></div></div>
<div class="panel"><div class="ph"><b>NEURAL LOG</b><span class="dim small">newest first</span></div><ol id="brG" class="br-log"></ol></div>
<details class="adv panel"><summary>How the brain learns (method + honest limits)</summary><div id="brM" class="small"></div></details>
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
 grow(B.size);rebuild();
 if(net)net.heat=Math.min(1,0.25+(c.trusted||0)*0.1+(B.setups_seen||0)/400);}
// ---- Interactive neural map (canvas + rAF). Real neurons = conditions -> setups -> LONG/SHORT from the state export;
// filler synapses make the line count match brain.size.lines. No extra fetches: rebuilds only when render() gets new state.
const MAXL=2000,RM=matchMedia('(prefers-reduced-motion: reduce)');
let curL=-1,sig='',V={k:1,tx:0,ty:0},hov=null,pin=null,drag=null,dirty=true,fps={f:0,t0:0,v:60,low:0};
const stCol={trusted:'#39ff88',retired:'#ff4d6d',probation:'#3ad7ff',learning:'#3ad7ff'};
function fire(n,col){if(!net||!net.E.length||RM.matches)return;for(let i=0;i<n;i++){const e=net.E[Math.random()*net.E.length|0];pulses.push({e,t:0,col,s:0.012+Math.random()*0.02});}net.flash=1;}
function grow(sz){if(!sz||!net)return;const L=sz.lines||0;net.size=sz;net.L=L;
 const fm=net.forced!=null?net.forced:(L>MAXL||net.autoFac);net.factory=fm;
 $('#brStat').innerHTML+=` · <b class="c">${L.toLocaleString()} brain lines</b>${fm?' · FACTORY MODE'+(net.autoFac&&net.forced==null?' (auto: low frame rate)':''):''}`;
 $('#brFac').textContent=fm?'NETWORK':'FACTORY';$('#brFac').classList.toggle('on',fm);}
function setups(){const m=new Map(),add=(r,st)=>{if(!r||!r.setup)return;const o=m.get(r.setup)||{setup:r.setup,fc:[]};Object.assign(o,r,{fc:o.fc});if(st)o.status=st;m.set(r.setup,o);};
 (B.learning||[]).forEach(r=>add(r));(B.trusted||[]).forEach(r=>add(r,'trusted'));(B.retired||[]).forEach(r=>add(r,'retired'));
 ((B.forecast||{}).current||[]).forEach(f=>{if(!m.has(f.setup))add({setup:f.setup,n:f.n,status:f.status});m.get(f.setup).fc.push(f);});return[...m.values()];}
function rebuild(){if(!net||!B)return;const S=setups(),L=Math.max(net.L||0,0),key=S.map(s=>s.setup+s.n+s.status+s.fc.length).join()+'|'+L;if(key===sig)return;sig=key;
 const old=new Map(net.N.filter(a=>a.id).map(a=>[a.id,a])),N=[],E=[],rnd=(a,b)=>a+Math.random()*(b-a);
 const conds=[...new Set(S.flatMap(s=>s.setup.split('|')[0].split('+')))],cn=new Map();
 const keep=(o,x,y)=>{const p=old.get(o.id);o.x=p?p.x:x;o.y=p?p.y:y;o.ph=Math.random()*6.28;N.push(o);return o;};
 conds.forEach((c,i)=>cn.set(c,keep({id:'c:'+c,kind:'cond',c,uses:0},0.07,(i+1)/(conds.length+1))));
 const dirs={long:keep({id:'d:long',kind:'dir',d:'long'},0.93,0.33),short:keep({id:'d:short',kind:'dir',d:'short'},0.93,0.67)};
 S.sort((a,b)=>(b.n||0)-(a.n||0));S.forEach((s,i)=>{const nc=Math.max(1,Math.min(4,Math.ceil(S.length/9))),col=i%nc,rows=Math.ceil(S.length/nc),o=keep({id:'s:'+s.setup,kind:'setup',s},0.5+(col-(nc-1)/2)*0.07,(Math.floor(i/nc)+1)/(rows+1)+(col%2)*0.4/(rows+1));
  const[cs,d]=s.setup.split('|');cs.split('+').forEach(c=>{const a=cn.get(c);a.uses++;E.push([a,o,1]);});if(dirs[d])E.push([o,dirs[d],1]);});
 const fill=Math.min(MAXL,L)-E.length;if(fill>0){const per=Math.max(5,Math.min(18,Math.round(Math.sqrt(fill/3)))),F1=[],F2=[];
  for(let i=0;i<per;i++){F1.push(keep({id:'f1:'+i,kind:'f'},0.25+rnd(-.02,.02),(i+1)/(per+1)));F2.push(keep({id:'f2:'+i,kind:'f'},0.75+rnd(-.02,.02),(i+1)/(per+1)));}
  const C=[...cn.values()],SN=N.filter(a=>a.kind==='setup'),D=[dirs.long,dirs.short],pick=a=>a[Math.random()*a.length|0];
  for(let i=0;i<fill;i++){const r=i%4;E.push(r===0?[pick(C)||pick(F1),pick(F1),0]:r===1?[pick(F1),pick(SN)||pick(F2),0]:r===2?[pick(SN)||pick(F1),pick(F2),0]:[pick(F2),pick(D),0]);}}
 net.N=N;net.E=E;pulses=[];if(pin&&!N.includes(pin))pin=null;dirty=true;kick();}
function initNet(){const cv=$('#brNet'),x=cv.getContext('2d'),hero=cv.parentElement,tip=$('#brTip');
 net={N:[],E:[],heat:0.3,flash:0,factory:false,forced:null,autoFac:false,L:0};let dpr=Math.min(2,devicePixelRatio||1),W=1,H=1;
 function size(){W=cv.clientWidth||1;H=cv.clientHeight||1;cv.width=W*dpr;cv.height=H*dpr;dirty=true;kick();}size();addEventListener('resize',size);
 const P=a=>[(a.x*W)*V.k+V.tx,(a.y*H)*V.k+V.ty],rad=a=>a.kind==='setup'?3+Math.min(5,(a.s.n||0)/6):a.kind==='dir'?7:a.kind==='cond'?4:2;
 const hit=(mx,my)=>{let b=null,bd=1e9;for(const a of net.N){if(a.kind==='f')continue;const[p,q]=P(a),d=Math.hypot(p-mx,q-my);if(d<Math.max(10,rad(a)*V.k+4)&&d<bd){bd=d;b=a;}}return b;};
 const rel=a=>pin===a||hov===a,lit=e=>{const f=pin||hov;return f&&e[2]&&(e[0]===f||e[1]===f);};
 function tipHtml(a){if(a.kind==='cond')return`<b class="c">CONDITION</b><div>${esc(C()[a.c]||a.c)}</div><div class="dim">used by ${a.uses} setup${a.uses===1?'':'s'}</div>`;
  if(a.kind==='dir')return`<b class="${a.d==='long'?'g':'r'}">${a.d==='long'?'▲ LONG':'▼ SHORT'} OUTPUT</b><div class="dim">${net.E.filter(e=>e[2]&&e[1]===a).length} setups feed this side</div>`;
  const s=a.s,st=s.status||'probation',fc=s.fc||[];
  return`<div class="br-sn">${nice(s.setup)}</div><div class="br-tg"><b style="color:${stCol[st]||'#3ad7ff'}">${esc(st.toUpperCase())}</b>${s.weight!=null&&s.weight<1?` · <span class="r">death wt ${s.weight}</span>`:''}</div>
  <table><tr><td>n (out-of-sample)</td><td><b>${s.n??'—'}/${B.n_trust}</b>${s.queued?` +${s.queued} waiting`:''}</td></tr>
  <tr><td>avg 4h</td><td>${R(s.mean)}${s.lo!=null?` <span class="dim">[${R(s.lo)} … ${R(s.hi)}]</span>`:''}</td></tr>
  <tr><td>win rate</td><td>${s.win!=null?Math.round(s.win*100)+'%':'—'}</td></tr><tr><td>avg 1h</td><td>${R(s.h1)}</td></tr></table>
  <div class="br-tf">${fc.length?fc.map(f=>`<div>◆ <b>${esc(f.pair)}</b> ${f.state==='TRIGGERED'?'<b class="g">TRIGGERED</b>':'<b class="a">NEAR</b>'} · conf ${Math.round((f.confidence||0)*100)}% · 4h ${R(f.exp_R_4h)}</div>`).join(''):'<span class="dim">no live forecast for this setup</span>'}</div>
  ${s.reason?`<div class="dim small">${esc(s.reason)}</div>`:''}`;}
 function showTip(a,mx,my){if(!a){tip.hidden=true;return;}tip.innerHTML=tipHtml(a)+(pin===a?'<div class="dim small">📌 pinned · click empty space to release</div>':'');tip.hidden=false;
  const tw=tip.offsetWidth,th=tip.offsetHeight;tip.style.left=Math.max(6,Math.min(W-tw-6,mx+14))+'px';tip.style.top=Math.max(6,Math.min(H-th-6,my+14))+'px';}
 const xy=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top];};const ptr=new Map();
 cv.addEventListener('pointerdown',e=>{if(net.factory)return;cv.setPointerCapture(e.pointerId);const[mx,my]=xy(e);ptr.set(e.pointerId,[mx,my]);
  if(ptr.size===2){const[a,b]=[...ptr.values()];drag={pinch:Math.hypot(a[0]-b[0],a[1]-b[1]),k:V.k};return;}
  const a=hit(mx,my);drag={a,mx,my,tx:V.tx,ty:V.ty,moved:false};cv.style.cursor=a?'grabbing':'move';});
 cv.addEventListener('pointermove',e=>{if(net.factory)return;const[mx,my]=xy(e);if(ptr.has(e.pointerId))ptr.set(e.pointerId,[mx,my]);
  if(drag&&drag.pinch&&ptr.size===2){const[a,b]=[...ptr.values()],cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;zoomAt(cx,cy,drag.k*Math.hypot(a[0]-b[0],a[1]-b[1])/drag.pinch/V.k);return;}
  if(drag){const dx=mx-drag.mx,dy=my-drag.my;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
   if(drag.moved){if(drag.a){drag.a.x=((mx-V.tx)/V.k)/W;drag.a.y=((my-V.ty)/V.k)/H;}else{V.tx=drag.tx+dx;V.ty=drag.ty+dy;}dirty=true;kick();}
   if(drag.a)showTip(drag.a,mx,my);return;}
  const a=hit(mx,my);if(a!==hov){hov=a;dirty=true;kick();}cv.style.cursor=a?'pointer':'grab';if(a)showTip(a,mx,my);else if(pin){const[p,q]=P(pin);showTip(pin,p,q);}else showTip(null);});
 const up=e=>{ptr.delete(e.pointerId);if(!drag)return;if(drag.pinch){drag=null;return;}const[mx,my]=xy(e);
  if(!drag.moved){pin=drag.a&&pin!==drag.a?drag.a:null;hov=drag.a;if(pin)showTip(pin,mx,my);else if(!drag.a)showTip(null);}drag=null;cv.style.cursor='grab';dirty=true;kick();};
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('pointerleave',()=>{if(drag)return;hov=null;if(!pin)showTip(null);dirty=true;kick();});
 function zoomAt(mx,my,f){const k=Math.max(0.5,Math.min(5,V.k*f));f=k/V.k;V.tx=mx-(mx-V.tx)*f;V.ty=my-(my-V.ty)*f;V.k=k;dirty=true;kick();}
 cv.addEventListener('wheel',e=>{if(net.factory)return;e.preventDefault();const[mx,my]=xy(e);zoomAt(mx,my,Math.exp(-e.deltaY*0.0015));},{passive:false});
 cv.addEventListener('dblclick',()=>{V={k:1,tx:0,ty:0};dirty=true;kick();});
 $('#brReset').onclick=()=>{V={k:1,tx:0,ty:0};pin=null;showTip(null);sig='';rebuild();};
 $('#brFac').onclick=()=>{net.forced=!net.factory;net.factory=net.forced;if(!net.factory)net.autoFac=false;fps.low=0;fps.v=60;showTip(null);pin=null;$('#brFac').textContent=net.factory?'NETWORK':'FACTORY';$('#brFac').classList.toggle('on',net.factory);dirty=true;kick();};
 let t=0,last=0,running=false;const vis=()=>!document.hidden&&!$('#t-brain').classList.contains('hidden');
 window.__brain={fps:()=>fps.v,net:()=>({nodes:net.N.length,lines:net.E.length,factory:net.factory,autoFac:net.autoFac,view:V}),P:a=>P(a)};
 kick=function(){if(!running&&vis()){running=true;last=0;raf=requestAnimationFrame(draw);}};
 document.addEventListener('visibilitychange',kick);new MutationObserver(kick).observe($('#t-brain'),{attributes:true,attributeFilter:['class']});RM.addEventListener?.('change',()=>{dirty=true;kick();});
 function draw(now){if(!vis()){running=false;return;}const still=RM.matches;
  if(last){const dt=now-last;fps.f++;if(!fps.t0)fps.t0=now;if(now-fps.t0>1000){fps.v=Math.round(fps.f*1000/(now-fps.t0));fps.f=0;fps.t0=now;
   if(!net.factory&&!still&&net.forced==null&&fps.v<24){if(++fps.low>=3){net.autoFac=true;net.factory=true;$('#brFac').textContent='NETWORK';$('#brFac').classList.add('on');}}else fps.low=0;}t+=Math.min(dt,50)/1000;}last=now;
  const w=cv.width,h=cv.height;x.setTransform(1,0,0,1,0,0);
  if(net.factory){factory(x,w,h,still?0:t,dpr);if(still){running=false;return;}raf=requestAnimationFrame(draw);return;}
  if(still&&!dirty){running=false;return;}dirty=false;
  x.fillStyle=still||drag?'rgb(3,6,5)':'rgba(3,6,5,0.38)';x.fillRect(0,0,w,h);x.setTransform(dpr,0,0,dpr,0,0);
  const E=net.E,N=net.N,f=pin||hov,ha=0.06+0.08*net.heat;x.lineWidth=0.6;
  x.strokeStyle=`rgba(57,255,136,${f?ha*0.45:ha})`;x.beginPath();for(const e of E){if(e[2]||lit(e))continue;const[p,q]=P(e[0]),[r,s]=P(e[1]);x.moveTo(p,q);x.lineTo(r,s);}x.stroke();
  x.strokeStyle=`rgba(57,255,136,${f?0.12:0.22+0.15*net.heat})`;x.lineWidth=0.9;x.beginPath();for(const e of E){if(!e[2]||lit(e))continue;const[p,q]=P(e[0]),[r,s]=P(e[1]);x.moveTo(p,q);x.lineTo(r,s);}x.stroke();
  if(f){x.strokeStyle='rgba(255,210,63,0.85)';x.lineWidth=1.4;x.beginPath();for(const e of E){if(!lit(e))continue;const[p,q]=P(e[0]),[r,s]=P(e[1]);x.moveTo(p,q);x.lineTo(r,s);}x.stroke();}
  if(!still&&E.length){if(Math.random()<0.08+0.12*net.heat)pulses.push({e:E[Math.random()*E.length|0],t:0,col:'#3ad7ff',s:0.008+Math.random()*0.01});
   if(f&&Math.random()<0.25){const le=E.filter(lit);if(le.length)pulses.push({e:le[Math.random()*le.length|0],t:0,col:'#ffd23f',s:0.02});}
   pulses=pulses.filter(p=>p.t<=1&&N.includes(p.e[0]));if(pulses.length>250)pulses.splice(0,pulses.length-250);
   x.shadowBlur=10;for(const p of pulses){p.t+=p.s;const[x1,y1]=P(p.e[0]),[x2,y2]=P(p.e[1]);x.fillStyle=x.shadowColor=p.col;x.beginPath();x.arc(x1+(x2-x1)*p.t,y1+(y2-y1)*p.t,2.2,0,6.28);x.fill();}x.shadowBlur=0;}
  for(const a of N){const[p,q]=P(a),g=still?0.6:0.5+0.5*Math.sin(t*2+a.ph),r=rad(a)*Math.sqrt(V.k);
   if(a.kind==='f'){x.fillStyle=`rgba(57,255,136,${(0.35+0.5*g*net.heat+net.flash*0.4)*(f?0.45:1)})`;x.beginPath();x.arc(p,q,(2+2*g+net.flash*2)*Math.sqrt(V.k),0,6.28);x.fill();continue;}
   const col=a.kind==='setup'?stCol[a.s.status]||'#3ad7ff':a.kind==='dir'?(a.d==='long'?'#39ff88':'#ff4d6d'):'#39ff88',on=rel(a)||(f&&net.E.some(e=>e[2]&&lit(e)&&(e[0]===a||e[1]===a)));
   x.globalAlpha=f&&!on?0.35:0.55+0.4*g+net.flash*0.3;x.fillStyle=x.shadowColor=col;x.shadowBlur=on?16:6;x.beginPath();x.arc(p,q,r+(on?2:0)+net.flash*2,0,6.28);x.fill();
   if(a.kind==='setup'&&a.s.fc.length){x.strokeStyle='#ffd23f';x.lineWidth=1.2;x.beginPath();x.arc(p,q,r+4,0,6.28);x.stroke();}
   x.shadowBlur=0;x.globalAlpha=1;if(rel(a)){x.strokeStyle='#fff';x.lineWidth=1;x.beginPath();x.arc(p,q,r+3,0,6.28);x.stroke();}
   if(a.kind!=='setup'&&V.k>=1.6||a.kind==='dir'){x.fillStyle='rgba(200,255,220,.75)';x.font='10px ui-monospace,monospace';x.textAlign=a.kind==='dir'?'right':'left';x.fillText(a.kind==='dir'?(a.d==='long'?'LONG ▲':'SHORT ▼'):(C()[a.c]||a.c),p+(a.kind==='dir'?-12:8),q+3);}}
  net.flash*=0.94;if(still){running=false;return;}raf=requestAnimationFrame(draw);}
 cv.style.cursor='grab';kick();setTimeout(()=>fire(20,'#39ff88'),300);}
let kick=()=>{};
function factory(x,w,h,t,dpr){const sz=net.size||{},fam=Object.entries(sz.families||{}).sort((a,b)=>b[1]-a[1]),mk=Object.entries(sz.markets||{});
 x.fillStyle='rgba(3,6,5,0.6)';x.fillRect(0,0,w,h);x.font=`${11*dpr}px ui-monospace,monospace`;x.textAlign='left';
 const rows=Math.max(1,fam.length),rh=h/(rows+1);fam.forEach(([f,c],i)=>{const y=rh*(i+0.7);
  x.strokeStyle='rgba(57,255,136,0.25)';x.strokeRect(w*0.04,y,w*0.92,rh*0.7);x.fillStyle='#39ff88';x.fillText(`${f} line · ${c}`,w*0.05,y+rh*0.45);
  const k=Math.min(30,Math.ceil(c/40));for(let j=0;j<k;j++){const px=w*0.3+((t*40*dpr+j*w*0.7/k)%(w*0.65));x.fillStyle='rgba(58,215,255,0.8)';x.fillRect(px,y+rh*0.25,6*dpr,rh*0.2);}});
 x.fillStyle='#ffd23f';x.fillText('MARKETS: '+(mk.map(([p,c])=>`${p} ${c}`).join(' · ')||'—'),w*0.05,h-rh*0.2);}
