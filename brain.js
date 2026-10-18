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
<div class="br-hero panel"><canvas id="brNet"></canvas><div class="br-ov">
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
 grow(B.size);
 if(net)net.heat=Math.min(1,0.25+(c.trusted||0)*0.1+(B.setups_seen||0)/400);}
function fire(n,col){if(!net)return;for(let i=0;i<n;i++){const e=net.E[Math.random()*net.E.length|0];pulses.push({e,t:0,col,s:0.012+Math.random()*0.02});}net.flash=1;}
function initNet(){const cv=$('#brNet'),x=cv.getContext('2d');const N=[],E=[];const lay=[5,8,10,8,4];
 lay.forEach((n,li)=>{for(let i=0;i<n;i++)N.push({l:li,i,n,ph:Math.random()*6.28});});
 N.forEach(a=>N.forEach(b=>{if(b.l===a.l+1&&Math.random()<0.55)E.push([a,b]);}));
 net={N,E,lay,heat:0.3,flash:0};const dpr=Math.min(2,devicePixelRatio||1);
 function size(){cv.width=cv.clientWidth*dpr;cv.height=cv.clientHeight*dpr;}size();addEventListener('resize',size);
 const pos=a=>{const w=cv.width,h=cv.height;return[w*(0.08+0.84*a.l/(net.lay.length-1)),h*((a.i+1)/(a.n+1))];};
 let t=0;function draw(){raf=requestAnimationFrame(draw);if(document.hidden||$('#t-brain').classList.contains('hidden'))return;t+=0.016;
  const w=cv.width,h=cv.height;if(net.factory){factory(x,w,h,t,dpr);return;}const E=net.E,N=net.N;x.fillStyle='rgba(3,6,5,0.35)';x.fillRect(0,0,w,h);
  x.lineWidth=dpr*0.6;E.forEach(([a,b])=>{const[p,q]=[pos(a),pos(b)];x.strokeStyle=`rgba(57,255,136,${0.06+0.08*net.heat})`;x.beginPath();x.moveTo(...p);x.lineTo(...q);x.stroke();});
  if(Math.random()<0.08*net.heat)pulses.push({e:E[Math.random()*E.length|0],t:0,col:'#3ad7ff',s:0.01});
  pulses=pulses.filter(p=>p.t<=1);pulses.forEach(p=>{p.t+=p.s;const[a,b]=p.e,[x1,y1]=pos(a),[x2,y2]=pos(b);const px=x1+(x2-x1)*p.t,py=y1+(y2-y1)*p.t;
   x.fillStyle=p.col;x.shadowColor=p.col;x.shadowBlur=12*dpr;x.beginPath();x.arc(px,py,2.2*dpr,0,6.28);x.fill();x.shadowBlur=0;});
  N.forEach(a=>{const[p,q]=pos(a),g=0.5+0.5*Math.sin(t*2+a.ph);x.fillStyle=`rgba(57,255,136,${0.35+0.5*g*net.heat+net.flash*0.5})`;x.beginPath();x.arc(p,q,(2+2*g+net.flash*3)*dpr,0,6.28);x.fill();});
  net.flash*=0.94;}
 draw();setTimeout(()=>fire(20,'#39ff88'),300);}

// Brain grows with its size: lines = setups + forecasts + trusted. >2000 lines -> FACTORY mode (assembly lines per market & indicator family).
const MAXL=2000;let curL=-1;
function grow(sz){if(!sz||!net)return;const L=sz.lines||0;net.size=sz;const fm=L>MAXL;net.factory=fm;$('#brStat').innerHTML+=` · <b class="c">${L.toLocaleString()} brain lines</b>${fm?' · FACTORY MODE':''}`;
 if(L===curL)return;curL=L;
 if(fm)return;const want=Math.max(40,L),cols=7,per=Math.max(4,Math.min(40,Math.round(Math.sqrt(want/ (cols-1)/0.55)))) ;
 const N=[],E=[],lay=Array.from({length:cols},(_,i)=>i===0||i===cols-1?Math.max(3,per>>1):per);
 lay.forEach((n,li)=>{for(let i=0;i<n;i++)N.push({l:li,i,n,ph:Math.random()*6.28});});
 const pr=Math.min(1,want/lay.slice(1).reduce((a,n,i)=>a+n*lay[i],0));
 N.forEach(a=>N.forEach(b=>{if(b.l===a.l+1&&Math.random()<pr)E.push([a,b]);}));net.N=N;net.E=E;net.lay=lay;pulses=[];}
function factory(x,w,h,t,dpr){const sz=net.size||{},fam=Object.entries(sz.families||{}).sort((a,b)=>b[1]-a[1]),mk=Object.entries(sz.markets||{});
 x.fillStyle='rgba(3,6,5,0.6)';x.fillRect(0,0,w,h);x.font=`${11*dpr}px ui-monospace,monospace`;
 const rows=Math.max(1,fam.length),rh=h/(rows+1);fam.forEach(([f,c],i)=>{const y=rh*(i+0.7);
  x.strokeStyle='rgba(57,255,136,0.25)';x.strokeRect(w*0.04,y,w*0.92,rh*0.7);x.fillStyle='#39ff88';x.fillText(`${f} line · ${c}`,w*0.05,y+rh*0.45);
  const k=Math.min(30,Math.ceil(c/40));for(let j=0;j<k;j++){const px=w*0.3+((t*40*dpr+j*w*0.7/k)%(w*0.65));x.fillStyle='rgba(58,215,255,0.8)';x.fillRect(px,y+rh*0.25,6*dpr,rh*0.2);}});
 x.fillStyle='#ffd23f';x.fillText('MARKETS: '+(mk.map(([p,c])=>`${p} ${c}`).join(' · ')||'—'),w*0.05,h-rh*0.2);}
