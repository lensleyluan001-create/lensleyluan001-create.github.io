// SUPER TRADING OS · TERMINAL tab (2026-10-24). PAPER ONLY, display only, no betting/order features.
// Real data only: bot_state (heartbeat incl. paper_equity_usd / paper_pnl_today_usd, challenge_check, scoreboard, alerts, intel, research),
// published bot state (proof ledger fills + equity curve, pulse verdicts) and Kraken public REST (Ticker + OHLC, allowed by the CSP).
// Refresh: Kraken every 30 s ONLY while this tab is visible and the page is shown; bot rows on entry (max once a minute) + the app's existing 'nl-hb'.
// Centrepiece: Three.js (vendor/) network ring; 2D canvas fallback without WebGL. ~30fps cap (phones: fewer particles), paused off screen/hidden, reduced motion = still.
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RM=matchMedia('(prefers-reduced-motion: reduce)'),PHONE=()=>innerWidth<700;
const ms=t=>{if(t==null||t==='')return 0;if(typeof t==='number')return t<1e11?t*1000:t;const s=String(t).trim();return Date.parse(s.replace(' ','T').slice(0,19)+(s.length<=16?':00':'')+'+02:00')||0;};
const ago=m=>{if(!m)return 'no data';const a=(Date.now()-m)/1000;return a<90?Math.round(a)+'s':a<5400?Math.round(a/60)+'m':a<172800?(a/3600).toFixed(1)+'h':Math.round(a/86400)+'d';};
const hm=m=>m?new Date(m+7200e3).toISOString().slice(11,19):'—';
const usd=(v,d=2)=>v==null||!isFinite(+v)?'—':(+v<0?'−$':'$')+Math.abs(+v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const sgn=v=>v==null||!isFinite(+v)?'':+v>0?'up':+v<0?'dn':'';
const ND='<span class="tm-nd">NO DATA</span>';
const PAIRS=[['XXBTZUSD','XBTUSD','BTC'],['XETHZUSD','ETHUSD','ETH'],['SOLUSD','SOLUSD','SOL'],['XXRPZUSD','XRPUSD','XRP'],['XDGUSD','XDGUSD','DOGE'],['ADAUSD','ADAUSD','ADA'],['LINKUSD','LINKUSD','LINK'],['AVAXUSD','AVAXUSD','AVAX']];
let D={},K={tick:null,ohlc:null,rtt:[],err:''},KAt=0,OAt=0,timer=0,loadedAt=0,ring=null,io=null,vis=true,sel='XBTUSD';
const shown=()=>vis&&!document.hidden&&!$('#t-terminal')?.classList.contains('hidden');
function tok(){try{const a=JSON.parse(localStorage.getItem('nl_auth')||'null');return a&&a.mode==='supabase'&&a.exp>Date.now()/1000+30?a.token:null;}catch{return null;}}
async function rows(){const s=window.NL_SB,t=tok();if(!s||!t)return null;try{const r=await fetch(s.url+'/rest/v1/bot_state?select=id,data&id=in.(heartbeat,alerts,challenge_check,scoreboard,intel,research,research_engine,rnd_workers)',{cache:'no-store',headers:{apikey:s.key,Authorization:'Bearer '+t}});if(!r.ok)return null;const o={};for(const x of await r.json()||[])if(x&&x.id&&x.data)o[x.id]=x.data;return o;}catch{return null;}}
async function load(force){if(!force&&Date.now()-loadedAt<60000)return;loadedAt=Date.now();let st=window.S?.d?.state||null;if(!st){try{const r=await fetch('/api/state',{cache:'no-store'});st=r.ok?await r.json():null;}catch{}}if(st&&st.error)st=null;
 const o=await rows(),H=window.NL_HB||{};let slots=null;try{slots=await (await import('/shell/slots.js')).slotStatus(o?.scoreboard||H.scoreboard,H.indie);}catch{}
 D={st,signed:!!tok(),slots,pulse:window.S?.d?.pulse||null,...Object.fromEntries(['heartbeat','alerts','challenge_check','scoreboard','intel','research','research_engine','rnd_workers'].map(k=>[k,o?.[k]??H[k]??null]))};render();}
async function kraken(){if(!shown())return;const now=Date.now();
 if(now-KAt>=29000){KAt=now;const t0=performance.now();try{const r=await fetch('https://api.kraken.com/0/public/Ticker?pair='+PAIRS.map(p=>p[1]).join(','),{cache:'no-store'});const j=await r.json();const rt=Math.round(performance.now()-t0);if((j.error||[]).length)throw new Error(j.error.join(', '));K.tick={r:j.result,at:Date.now()};K.rtt.push({at:Date.now(),ms:rt});K.rtt=K.rtt.slice(-40);K.err='';}catch(e){K.err=String(e.message||e);K.rtt.push({at:Date.now(),ms:null});}}
 if(now-OAt>=59000||K.ohlc?.pair!==sel){OAt=now;try{const r=await fetch(`https://api.kraken.com/0/public/OHLC?pair=${sel}&interval=15`,{cache:'no-store'});const j=await r.json();if((j.error||[]).length)throw new Error(j.error.join(', '));const k=Object.keys(j.result).find(x=>x!=='last');K.ohlc={pair:sel,c:j.result[k].slice(-96),at:Date.now()};}catch(e){K.err=K.err||String(e.message||e);}}
 render();}
function arm(){clearInterval(timer);timer=0;if(shown()){kraken();timer=setInterval(kraken,30000);}ring&&(shown()&&!RM.matches?ring.loop():(ring.halt(),ring.frame(0)));}
// ---------- panels ----------
const tk=code=>{const p=PAIRS.find(x=>x[1]===code);const r=K.tick?.r;if(!r||!p)return null;return r[p[0]]||r[p[1]]||null;};
function wallet(){const hb=D.heartbeat,cc=D.challenge_check,ch=D.st?.challenge||{},S=D.slots,sb=D.scoreboard?.bots||{};const live=Object.values(sb).filter(b=>b&&b.status!=='RETIRED'&&b.balance!=null),tot=live.reduce((a,b)=>a+ +b.balance,0);
 const eq=hb?.paper_equity_usd??null,pnl=hb?.paper_pnl_today_usd??null;
 return`<div class="tm-h"><b>WALLET · PAPER</b><span>${D.signed?'signed in':'signed out'}</span></div>
 <div class="tm-lbl">PAPER EQUITY (heartbeat)</div><div class="tm-big ${sgn(pnl)}">${eq!=null?usd(eq):ND}</div>
 <div class="tm-kv"><div><i>P&amp;L TODAY</i><b class="${sgn(pnl)}">${pnl!=null?(pnl>0?'+':'')+usd(pnl):'—'}</b></div><div><i>CHALLENGE</i><b>${cc?esc(cc.progress_pct)+'%':'—'}</b></div><div><i>GOAL</i><b>${cc?usd(cc.goal_usd,0):'—'}</b></div>
 <div><i>START</i><b>${usd(cc?.start_usd??ch.start_usd,0)}</b></div><div><i>DEATH LINE</i><b>${usd(cc?.death_below_usd??ch.death_below_usd,0)}</b></div><div><i>DEATHS</i><b>${cc?.deaths??'—'}</b></div></div>
 <div class="tm-lbl">SQUAD (scoreboard)</div><div class="tm-kv"><div><i>ACTIVE</i><b class="up">${S?S.active.length:'—'}</b></div><div><i>PAUSED</i><b>${S?S.idle.length:'—'}</b></div><div><i>RETIRED</i><b class="dim">${S?S.retired.length:'—'}</b></div><div class="w2"><i>NON-RETIRED BALANCE</i><b>${live.length?usd(tot):'—'}</b></div><div><i>START</i><b>${live.length?usd(live.length*1000,0):'—'}</b></div></div>
 <div class="tm-src">heartbeat ${hb?esc(hb.ts)+' SAST':'—'} · challenge_check ${esc(cc?.updated_sast||'—')}</div>`;}
function spot(){const t=tk(sel),o=K.ohlc?.pair===sel?K.ohlc:null,name=PAIRS.find(p=>p[1]===sel)[2];const last=t?+t.c[0]:null,open=t?+t.o:null,ch=last&&open?(last/open-1)*100:null;
 return`<div class="tm-h"><b>${name} SPOT · KRAKEN</b><span>${K.tick?'updated '+hm(K.tick.at)+' SAST':K.err?'<span class="dn">feed error</span>':'loading…'}</span></div>
 <div class="tm-spot"><div><div class="tm-big ${sgn(ch)}">${last!=null?usd(last,last<10?4:2):ND}</div><div class="tm-kv tm-kv3"><div><i>24H OPEN</i><b>${open?usd(open,open<10?4:2):'—'}</b></div><div><i>CHG</i><b class="${sgn(ch)}">${ch!=null?(ch>0?'+':'')+ch.toFixed(2)+'%':'—'}</b></div><div><i>BID/ASK</i><b>${t?(+t.b[0]).toPrecision(6)+' / '+(+t.a[0]).toPrecision(6):'—'}</b></div></div></div>
 <canvas id="tmChart" class="tm-cv"></canvas></div>
 <div class="tm-tick">${PAIRS.map(p=>{const x=tk(p[1]),l=x?+x.c[0]:null,c=x?(l/+x.o-1)*100:null;return`<button data-pair="${p[1]}" class="${p[1]===sel?'on':''}"><b>${p[2]}</b><span>${l!=null?l.toPrecision(6):'—'}</span><em class="${sgn(c)}">${c!=null?(c>0?'+':'')+c.toFixed(2)+'%':''}</em></button>`;}).join('')}</div>
 <div class="tm-src">Kraken public Ticker + OHLC 15m · refreshed every 30 s while this tab is open</div>`;}
function feeds(){const hb=D.heartbeat,cc=D.challenge_check,P=D.pulse,st=D.st,lr=K.rtt.filter(r=>r.ms!=null),avg=lr.length?Math.round(lr.reduce((a,r)=>a+r.ms,0)/lr.length):null,lastR=K.rtt[K.rtt.length-1];
 const F=[['Kraken REST round trip',lastR?.ms!=null?lastR.ms+' ms':lastR?'FAIL':'—',lastR?.ms!=null?(lastR.ms<600?'ok':'warn'):lastR?'bad':'none'],
  ['bot tick (heartbeat)',hb?ago(ms(hb.epoch)):'—',hb?((Date.now()-ms(hb.epoch))<45*60e3?'ok':(Date.now()-ms(hb.epoch))<75*60e3?'warn':'bad'):'none'],
  ['challenge check',cc?ago(ms(cc.updated_epoch)):'—',cc?((Date.now()-ms(cc.updated_epoch))<4*3600e3?'ok':'warn'):'none'],
  ['pulse feed',P?ago(ms(P.fetched_at)):'—',P?((Date.now()-ms(P.fetched_at))<120e3?'ok':'warn'):'none'],
  ['published state',st?ago(ms(st.generated_at)):'—',st?((Date.now()-ms(st.generated_at))<90*60e3?'ok':'warn'):'none'],
  ['market intel',D.intel?ago(ms(D.intel.updated_epoch)):'—',D.intel?((Date.now()-ms(D.intel.updated_epoch))<3*3600e3?'ok':'warn'):'none'],
  ['research engine',D.research_engine?ago(ms(D.research_engine.updated_epoch)):'—',D.research_engine?'ok':'none'],
  ['R&D workers',D.rnd_workers?ago(ms(D.rnd_workers.updated_sast)):'—',D.rnd_workers?((Date.now()-ms(D.rnd_workers.updated_sast))<2*3600e3?'ok':'warn'):'none']];
 return`<div class="tm-h"><b>FEED LATENCY &amp; HEALTH</b><span>${avg!=null?'avg RTT '+avg+' ms ('+lr.length+')':'measuring…'}</span></div><canvas id="tmLat" class="tm-cv tm-lat"></canvas>
 <div class="tm-feeds">${F.map(f=>`<div class="tm-f ${f[2]}"><i></i><span>${f[0]}</span><b>${f[1]}</b></div>`).join('')}</div>
 <div class="tm-src">ages = now minus each source's own timestamp · ${D.alerts?.needs_attention?`<b class="dn">${(D.alerts.events||[]).length} alert(s) open</b>`:D.alerts?'no alerts open':'alerts: no data'}${K.err?` · <span class="dn">Kraken: ${esc(K.err)}</span>`:''}</div>`;}
function sideL(){const sb=D.scoreboard?.bots,S=D.slots;if(!sb)return`<div class="tm-h"><b>NODES · SQUAD</b></div>${ND} <span class="dim small">${D.signed?'scoreboard not published':'sign in to read'}</span>`;
 const g=id=>S?(S.active.find(x=>x.id===id)?'A':S.retired.find(x=>x.id===id)?'R':'P'):'?';const L=Object.entries(sb).sort((a,b)=>(b[1].net_pnl_after_fees??-1e9)-(a[1].net_pnl_after_fees??-1e9));
 return`<div class="tm-h"><b>NODES · SQUAD</b><span>net after fees</span></div><div class="tm-nodes">${L.map(([id,v])=>`<div class="tm-n ${g(id)}"><b>${esc(id)}</b><span>${g(id)==='A'?'ACTIVE':g(id)==='R'?'RETIRED':'PAUSED'}</span><em class="${sgn(v.net_pnl_after_fees)}">${v.net_pnl_after_fees!=null?usd(v.net_pnl_after_fees):'—'}</em></div>`).join('')}</div>`;}
function sideR(){const P=D.pulse?.pairs;if(!P)return`<div class="tm-h"><b>PULSE · ENGINE</b></div>${ND}`;const L=Object.entries(P).sort((a,b)=>b[1].score-a[1].score);
 return`<div class="tm-h"><b>PULSE · ENGINE</b><span>${hm(ms(D.pulse.fetched_at))}</span></div><div class="tm-nodes">${L.map(([k,u])=>`<div class="tm-n ${u.verdict==='TAKE'?'A':'P'}"><b>${esc(k.replace(/USD$/,'').replace('XBT','BTC').replace('XDG','DOGE'))}</b><span>${esc(String(u.verdict).replace('_',' '))}</span><em>${u.score.toFixed(1)}</em><s style="width:${Math.max(0,Math.min(100,u.score))}%"></s></div>`).join('')}</div>`;}
function tape(){const tr=D.st?.proof?.all_trades||[];if(!tr.length)return`<div class="tm-h"><b>EXECUTION TAPE</b></div>${ND} <span class="dim small">proof ledger not published</span>`;const L=tr.slice(-40).reverse();
 return`<div class="tm-h"><b>EXECUTION TAPE · PROOF LEDGER</b><span>${D.st.proof.trade_count??tr.length} fills · head ${esc(String(D.st.proof.chain_head||'').slice(0,8))}</span></div>
 <div class="tm-tape"><div class="tm-tr th"><span>TIME SAST</span><span>SIDE</span><span>PAIR</span><span>PRICE</span><span>P&amp;L</span><span>VER</span></div>${L.map(t=>`<div class="tm-tr"><span>${esc(String(t.time_SAST||'').slice(5,16))}</span><span class="${/BUY|LONG/i.test(t.action)?'up':'dn'}">${esc(t.action)}</span><span>${esc(t.pair)}</span><span>${esc(t.price)}</span><span class="${sgn(t.pnl_usd)}">${t.pnl_usd!=null&&t.pnl_usd!==''?usd(t.pnl_usd):'open'}</span><span class="dim">${esc(t.version||'')}</span></div>`).join('')}</div>`;}
function conv(){const eq=D.st?.proof?.equity_curve||[],ch=D.st?.challenge||{};return`<div class="tm-h"><b>CONVERGENCE · PAPER EQUITY CURVE</b><span>${eq.length?eq.length+' points · start '+usd(ch.start_usd,0):'—'}</span></div>${eq.length>1?'<canvas id="tmEq" class="tm-cv tm-eq"></canvas>':ND}
 <div class="tm-src">proof.equity_curve (published state) · dashed = start, red = death line</div>`;}
function render(){const el=$('#terminal');if(!el||!el.dataset.v)return;const set=(id,h)=>{const e=document.getElementById(id);if(e&&e.dataset.h!==h){e.dataset.h=h;e.innerHTML=h;return true;}};
 set('tmWallet',wallet());set('tmSpot',spot());set('tmFeeds',feeds());set('tmL',sideL());set('tmR',sideR());set('tmTape',tape());set('tmConv',conv());
 const hb=D.heartbeat;$('#tmBar').innerHTML=`<span>SUPER TRADING OS // TERMINAL</span><span>PAPER ONLY · NO ORDERS · DISPLAY</span><span>engine ${esc(D.st?.engine?.version||'—')} ${esc(D.st?.engine?.hash||'')}</span><span>fills ${D.st?.proof?.trade_count??'—'}</span><span>last tick ${hb?esc(hb.ts):'—'}</span><span>${hm(Date.now())} SAST</span>`;
 draw();ring&&ring.data();}
// ---------- canvases ----------
function cv(id){const c=document.getElementById(id);if(!c)return null;const d=Math.min(devicePixelRatio||1,2),w=c.clientWidth,h=c.clientHeight;if(!w||!h)return null;if(c.width!==w*d||c.height!==h*d){c.width=w*d;c.height=h*d;}const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);return{x,w,h};}
function grid(x,w,h){x.strokeStyle='rgba(58,215,255,.07)';x.lineWidth=1;for(let i=0;i<w;i+=24){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();}for(let j=0;j<h;j+=18){x.beginPath();x.moveTo(0,j);x.lineTo(w,j);x.stroke();}}
function draw(){let g=cv('tmChart');if(g){const{x,w,h}=g;grid(x,w,h);const C=K.ohlc?.pair===sel?K.ohlc.c:null;if(C&&C.length){const hi=Math.max(...C.map(c=>+c[2])),lo=Math.min(...C.map(c=>+c[3])),bw=w/C.length,Y=v=>4+(hi-v)/(hi-lo||1)*(h-8);
  C.forEach((c,i)=>{const o=+c[1],cl=+c[4],up=cl>=o;x.strokeStyle=x.fillStyle=up?'#39ff88':'#ff4d6d';x.beginPath();x.moveTo(i*bw+bw/2,Y(+c[2]));x.lineTo(i*bw+bw/2,Y(+c[3]));x.stroke();x.fillRect(i*bw+1,Math.min(Y(o),Y(cl)),Math.max(1,bw-2),Math.max(1,Math.abs(Y(o)-Y(cl))));});
  x.fillStyle='#8aa199';x.font='10px Inter';x.fillText(hi.toPrecision(6),4,11);x.fillText(lo.toPrecision(6),4,h-4);x.fillText('15m · last 24h',w-80,11);}else{x.fillStyle='#6f8a80';x.font='11px Inter';x.fillText(K.err?'Kraken OHLC unavailable':'loading Kraken OHLC…',8,h/2);}}
 g=cv('tmLat');if(g){const{x,w,h}=g;grid(x,w,h);const R=K.rtt;if(R.length){const mx=Math.max(400,...R.map(r=>r.ms||0));x.strokeStyle='#3ad7ff';x.lineWidth=1.5;x.beginPath();R.forEach((r,i)=>{const X=R.length<2?w:i/(R.length-1)*w,Yv=r.ms==null?h:h-4-(r.ms/mx)*(h-8);i?x.lineTo(X,Yv):x.moveTo(X,Yv);});x.stroke();R.forEach((r,i)=>{if(r.ms==null){x.fillStyle='#ff4d6d';x.fillRect((R.length<2?w:i/(R.length-1)*w)-2,h-6,4,6);}});x.fillStyle='#8aa199';x.font='10px Inter';x.fillText(mx+' ms',4,11);x.fillText('Kraken RTT, this session',w-130,11);}else{x.fillStyle='#6f8a80';x.font='11px Inter';x.fillText('first Kraken round trip pending…',8,h/2);}}
 g=cv('tmEq');if(g){const{x,w,h}=g;grid(x,w,h);const eq=D.st.proof.equity_curve.map(e=>+e.equity_usd).filter(isFinite),ch=D.st.challenge||{},s0=+ch.start_usd||eq[0],dl=+ch.death_below_usd;const hi=Math.max(...eq,s0),lo=Math.min(...eq,s0,isFinite(dl)?Math.max(dl,Math.min(...eq)-50):s0),Y=v=>6+(hi-v)/(hi-lo||1)*(h-12),X=i=>i/(eq.length-1)*w;
  x.setLineDash([4,4]);x.strokeStyle='rgba(255,255,255,.35)';x.beginPath();x.moveTo(0,Y(s0));x.lineTo(w,Y(s0));x.stroke();if(isFinite(dl)&&dl>=lo){x.strokeStyle='#ff4d6d';x.beginPath();x.moveTo(0,Y(dl));x.lineTo(w,Y(dl));x.stroke();}x.setLineDash([]);
  const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(57,255,136,.35)');gr.addColorStop(1,'rgba(57,255,136,0)');x.beginPath();eq.forEach((v,i)=>i?x.lineTo(X(i),Y(v)):x.moveTo(0,Y(v)));x.lineTo(w,h);x.lineTo(0,h);x.fillStyle=gr;x.fill();
  x.beginPath();eq.forEach((v,i)=>i?x.lineTo(X(i),Y(v)):x.moveTo(0,Y(v)));x.strokeStyle=eq[eq.length-1]>=s0?'#39ff88':'#ff4d6d';x.lineWidth=1.8;x.shadowColor=x.strokeStyle;x.shadowBlur=8;x.stroke();x.shadowBlur=0;
  x.fillStyle='#e9fff4';x.font='11px Inter';x.fillText(usd(eq[eq.length-1]),w-70,Y(eq[eq.length-1])-6);x.fillStyle='#8aa199';x.font='10px Inter';x.fillText(usd(hi,0),4,11);x.fillText(usd(lo,0),4,h-4);}}
// ---------- ring ----------
function nodes(){const sb=D.scoreboard?.bots||{},S=D.slots;return Object.entries(sb).map(([id,v])=>({id,v,g:S?(S.active.find(x=>x.id===id)?'A':S.retired.find(x=>x.id===id)?'R':'P'):'P'}));}
const NC={A:0x39ff88,P:0xffb347,R:0x3a4743},NCs={A:'#39ff88',P:'#ffb347',R:'#3a4743'};
function looper(f){let raf=0,last=0;const s=t=>{raf=requestAnimationFrame(s);if(t-last<33)return;const dt=last?Math.min(.1,(t-last)/1000):.033;last=t;f(dt,t);};return{loop(){if(!raf){last=0;raf=requestAnimationFrame(s);}},halt(){cancelAnimationFrame(raf);raf=0;}};}
function ring3(T,host){const R=new T.WebGLRenderer({antialias:!PHONE(),alpha:true,powerPreference:'low-power'});R.setPixelRatio(Math.min(devicePixelRatio||1,PHONE()?1.25:1.5));host.appendChild(R.domElement);
 const S=new T.Scene(),C=new T.PerspectiveCamera(42,1,.1,200);C.position.set(0,9,26);C.lookAt(0,0,0);const N=PHONE()?1400:5200;
 const pg=new T.BufferGeometry(),pp=new Float32Array(N*3),pc=new Float32Array(N*3),seed=new Float32Array(N*2);for(let i=0;i<N;i++){seed[i*2]=Math.random()*Math.PI*2;seed[i*2+1]=Math.random()*Math.PI*2;const c=new T.Color().setHSL(.5+Math.random()*.08,1,.45+Math.random()*.25);pc.set([c.r,c.g,c.b],i*3);}
 pg.setAttribute('position',new T.BufferAttribute(pp,3));pg.setAttribute('color',new T.BufferAttribute(pc,3));const pts=new T.Points(pg,new T.PointsMaterial({size:PHONE()?.14:.11,vertexColors:true,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));S.add(pts);
 const grp=new T.Group();S.add(grp);let links=[],flow=0;
 function build(){grp.clear();links=[];const L=nodes(),n=L.length;L.forEach((b,i)=>{const a=i/n*Math.PI*2,r=15+(i%3)*1.4,p=new T.Vector3(Math.cos(a)*r,(i%5-2)*1.2,Math.sin(a)*r);const m=new T.Mesh(new T.OctahedronGeometry(b.g==='A'?.45:.32),new T.MeshBasicMaterial({color:NC[b.g]}));m.position.copy(p);grp.add(m);
  const q=new T.Vector3(Math.cos(a)*8,0,Math.sin(a)*8),geo=new T.BufferGeometry().setFromPoints([q,p]);const l=new T.Line(geo,new T.LineBasicMaterial({color:NC[b.g],transparent:true,opacity:b.g==='R'?.15:.45,blending:T.AdditiveBlending}));grp.add(l);
  const dot=new T.Mesh(new T.SphereGeometry(.12,6,6),new T.MeshBasicMaterial({color:0xffffff}));dot.visible=b.g==='A';grp.add(dot);links.push({q,p,dot,off:Math.random()});});}
 function frame(dt,tm=performance.now()){const t=tm/1000;if(dt)flow+=dt;const a=pg.attributes.position.array;for(let i=0;i<N;i++){const u=seed[i*2]+t*.12*(1+(i%7)*.05),v=seed[i*2+1]+t*.3;const rr=8+2.2*Math.cos(v);a[i*3]=Math.cos(u)*rr;a[i*3+1]=2.2*Math.sin(v)*(1+.15*Math.sin(u*3+t));a[i*3+2]=Math.sin(u)*rr;}pg.attributes.position.needsUpdate=true;
  pts.rotation.y=t*.05;grp.rotation.y=t*.05;links.forEach(k=>{if(k.dot.visible){const f=(flow*.35+k.off)%1;k.dot.position.lerpVectors(k.q,k.p,f);}});R.render(S,C);}
 const L=looper(frame);return{size(){const w=host.clientWidth,h=host.clientHeight;R.setSize(w,h,false);R.domElement.style.width=w+'px';R.domElement.style.height=h+'px';C.aspect=w/h;C.position.set(0,w<700?14:9,w<700?40:26);C.lookAt(0,0,0);C.updateProjectionMatrix();frame(0);},data(){build();frame(0);},frame,loop:L.loop,halt:L.halt};}
function ring2(host){const c=document.createElement('canvas');host.appendChild(c);const x=c.getContext('2d'),N=PHONE()?500:1600,sd=[...Array(N)].map(()=>[Math.random()*6.283,Math.random()*6.283]);let W=0,H=0,flow=0;
 function size(){const d=Math.min(devicePixelRatio||1,2);W=host.clientWidth;H=host.clientHeight;c.width=W*d;c.height=H*d;c.style.width=W+'px';c.style.height=H+'px';x.setTransform(d,0,0,d,0,0);frame(0);}
 function frame(dt,tm=performance.now()){const t=tm/1000;flow+=dt||0;x.clearRect(0,0,W,H);const cx=W/2,cy=H/2,R=Math.min(W*.3,H*.9),k=.32;const L=nodes();
  L.forEach((b,i)=>{const a=i/L.length*6.283+t*.05,ox=cx+Math.cos(a)*R*1.6,oy=cy+Math.sin(a)*R*1.6*k*1.6,ix=cx+Math.cos(a)*R*.85,iy=cy+Math.sin(a)*R*.85*k;x.strokeStyle=NCs[b.g];x.globalAlpha=b.g==='R'?.2:.5;x.beginPath();x.moveTo(ix,iy);x.lineTo(ox,oy);x.stroke();x.globalAlpha=1;x.fillStyle=NCs[b.g];x.fillRect(ox-3,oy-3,6,6);
   if(b.g==='A'){const f=(flow*.35+i*.13)%1;x.fillStyle='#fff';x.fillRect(ix+(ox-ix)*f-1.5,iy+(oy-iy)*f-1.5,3,3);}x.fillStyle='#8aa199';x.font='9px Inter';x.fillText(b.id,ox+5,oy+3);});
  for(const[s1,s2]of sd){const u=s1+t*.12,v=s2+t*.3,rr=R*(.75+.2*Math.cos(v));x.fillStyle=`hsla(${185+Math.sin(v)*10},100%,${55+20*Math.sin(v)}%,.75)`;x.fillRect(cx+Math.cos(u)*rr,cy+Math.sin(u)*rr*k+Math.sin(v)*R*.18,1.4,1.4);}}
 const L=looper(frame);return{size,data(){frame(0);},frame,loop:L.loop,halt:L.halt};}
function webgl(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}}
// ---------- shell ----------
function shell(){return`<div class="tm"><div class="tm-top"><span class="tm-logo">ST</span><b>SUPER TRADING OS // TERMINAL</b><span class="tm-pill">PAPER ONLY</span><span class="dim small" id="tmMode"></span></div>
 <div class="tm-row1"><section class="tm-p" id="tmWallet"></section><section class="tm-p" id="tmSpot"></section><section class="tm-p" id="tmFeeds"></section></div>
 <div class="tm-row2"><section class="tm-p tm-side" id="tmL"></section><section class="tm-p tm-ringp"><div class="tm-h"><b>NETWORK · SQUAD NODES</b><span>green active · amber paused · grey retired · white = live flow</span></div><div id="tmRing" class="tm-ring"></div></section><section class="tm-p tm-side" id="tmR"></section></div>
 <div class="tm-row3"><section class="tm-p" id="tmTape"></section><section class="tm-p" id="tmConv"></section></div><div class="tm-bar" id="tmBar"></div></div>`;}
async function startRing(){const h=$('#tmRing');h.innerHTML='';let m='2D canvas (no WebGL)';if(webgl()){try{const T=await import('/vendor/three.module.min.js');ring=ring3(T,h);m='3D WebGL';}catch{ring=null;m='2D canvas (3D failed to load)';}}if(!ring)ring=ring2(h);
 $('#tmMode').textContent=`ring: ${m}${PHONE()?' · phone: fewer particles':''}${RM.matches?' · reduced motion: still':''}`;ring.size();ring.data();}
export async function show(){const el=$('#terminal');if(!el)return;if(!document.querySelector('link[href="/shell/terminal.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/shell/terminal.css';document.head.appendChild(l);}
 if(!el.dataset.v){el.dataset.v=1;el.innerHTML=shell();
  el.addEventListener('click',e=>{const b=e.target.closest('[data-pair]');if(b){sel=b.dataset.pair;OAt=0;render();kraken();}});
  io=new IntersectionObserver(es=>{vis=es.some(e=>e.isIntersecting);arm();});io.observe(el);document.addEventListener('visibilitychange',arm);
  addEventListener('nl-hb',()=>{if(shown()){loadedAt=0;load();}});addEventListener('resize',()=>{ring&&ring.size();draw();});
  new MutationObserver(arm).observe($('#t-terminal'),{attributes:true,attributeFilter:['class']});
  await startRing();}
 await load();arm();}
