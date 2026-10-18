// NORTHLINE OFFICE: 3D (Three.js r160, self-hosted, lazy) view of the bot team. PAPER ONLY. Read-only.
// Data: existing state export (/api/state) + inbox verdicts (/api/lab?key=inbox_status), loaded when the tab opens. No polling.
// Never runs the engine, never changes sizing/risk. Falls back to a 2D floor plan without WebGL, on weak devices or slow frames.
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RM=matchMedia('(prefers-reduced-motion: reduce)'),sast=ts=>ts?new Date((ts+7200)*1000).toISOString().slice(0,16).replace('T',' '):'—';
let forced=false,ST=null,INB=null,loadedAt=0,T=null,G=null,mode=null,pinned=null;
const DESKS=[
 {id:'alex',name:'Alex Trades',role:'LEADER',pos:[0,-3.4],col:0x39ff88,tab:'overview',job:'Leads the team: sets priorities, relays Luan\'s approvals, owns the bot rules and Supabase, signs off every deploy.'},
 {id:'research',name:'Research',role:'RESEARCH',pos:[-4.6,-1.2],col:0x3ad7ff,tab:'rnd',job:'Writes testable hypotheses (slab/inbox specs) with a reason they should beat costs. Kills ideas that fail.'},
 {id:'lab',name:'Lab / R&D machine',role:'LAB',pos:[-4.6,2.6],col:0xc9a2ff,tab:'rnd',job:'Box compute: scores every spec with in-sample, 3 walk-forward folds, 20% holdout, costs and BH over the whole family.',machine:1},
 {id:'risk',name:'Risk',role:'RISK',pos:[0,1.1],col:0xffb347,tab:'bot',job:'The gate: nothing reaches the bot without Risk sign-off. Owns the daily loss budget, death rule and risk labels.'},
 {id:'booked',name:'Booked strategies',role:'BOOKED',pos:[2.3,3.4],col:0xffd23f,tab:'rnd',job:'Shelf for lab-promoted strategies that Risk signed off and the bot adopted. Their PAPER results are never pooled with the baseline.',shelf:1},
 {id:'exec',name:'Execution',role:'EXECUTION',pos:[4.6,-1.2],col:0x39ff88,tab:'bot',job:'Runs the paper bot each tick: pulse engine verdicts, entries, SL/TP. Kraken spot paper for longs, simulated ledger for shorts.'},
 {id:'kraken',name:'Kraken paper account',role:'KRAKEN',pos:[7.2,1.2],col:0x7f6cff,tab:'bot',job:'The paper account the bot trades against (Kraken public prices, no real money).',vault:1},
 {id:'desk',name:'Desk',role:'DESK',pos:[4.6,2.6],col:0x3ad7ff,tab:'proof',job:'Books every trade into the hash-chained proof ledger and writes the daily report.'},
 {id:'squad',pod:1,name:'Paper squad S1–S6',role:'SQUAD',pos:[-7.4,0.7],col:0xff8a3d,tab:'rnd',job:'Six PAPER bots trading unproven lab specs on purpose, $1,000 each, die below $500 and respawn with the next specs. Forward evidence only; nothing here books for the bot.'},
 {id:'luan',name:'Luan',role:'LUAN',pos:[-2.8,-4.3],col:0xf4efe2,tab:'overview',job:'The owner. Gets the daily report, approves every change. Reads PAPER results only; nothing reaches live money without him.'},
 {id:'wall',board:1,name:'Influencer watch wall',role:'WATCH WALL',pos:[-8.4,-2.6],ly:3.4,col:0xffb347,tab:'rnd',job:'The watching board: the people who move markets, from the Lulu Research map. A tile lights up when that person has spoken recently (WATCH) or a news alert matches them (HIGH). Statements fly to Research as files. PAPER research only.'},
 {id:'dev',name:'Lulu Dev',role:'DEV',pos:[-2.3,4.6],col:0xff5ec8,tab:'brain',job:'Builds the OS: look and workflow only. Never touches the engine, sizing, risk or tick.'}];
const FLOWS=[['research','lab','ideas'],['lab','risk','lab results'],['risk','booked','sign-off'],['booked','exec','booked strategies'],['exec','kraken','orders'],['kraken','desk','fills / trades'],['desk','luan','daily report','luan'],['lab','squad','unproven specs · paper, skips the gates','squad'],['wall','research','statements','wall']];
const FON=i=>G?.flows[FLOWS[i][3]||FLOWS[i][0]];
let SQD=null,INF=null,IM=null;
export async function show(){const box=$('#office');if(!box.dataset.init){box.dataset.init=1;box.innerHTML=shell();wire();}
 if(Date.now()-loadedAt>60000){loadedAt=Date.now();try{const r=await fetch('/api/state',{cache:'no-store'});ST=r.ok?await r.json():null;}catch{ST=null;}
  try{const r=await fetch('/api/lab?key=inbox_status');INB=r.ok?await r.json():null;}catch{INB=null;}
  try{const r=await fetch('/api/lab?key=squad');SQD=r.ok?await r.json():null;}catch{SQD=null;}
  try{IM=await import('/influence.js');INF=await IM.loadInfluence();}catch{INF=null;}derive();}
 if(!mode)await start();else{refresh();kick();}}
function shell(){return`<div class="of"><div class="panel of-hero"><div id="ofStage" class="of-stage"></div><div class="of-ov"><div class="br-t">NORTHLINE//<b>OFFICE</b></div><div class="br-honest">PAPER ONLY · LIVE FROM THE PUBLISHED STATE</div><div id="ofStat" class="dim small">opening the office…</div></div>
 <div id="ofCard" class="of-card" hidden></div><div id="ofTip" class="of-tip" hidden></div><div id="ofClk" class="of-clk"></div><div class="br-ctl of-ctl"><span class="dim" id="ofHint">tap a desk · drag to turn · pinch or scroll to zoom</span><button id="of2d" type="button">2D</button></div><div id="ofLabels" class="of-labels"></div></div>
 <div class="panel"><div class="ph"><b class="c">WORK FLOW</b><span class="dim small">derived from the latest state · gates shown honestly</span></div><div id="ofFlow" class="of-flow"></div></div></div>`;}
function wire(){$('#of2d').onclick=()=>{if(mode==='3d'){stop3d();mode2d('switched by you');}else start(true);};
 $('#ofCard').onclick=e=>{const a=e.target.closest('[data-go]');if(a){window.go&&window.go(a.dataset.go);const sec=a.dataset.sec;if(sec){let k=0;const t=setInterval(()=>{const el=document.getElementById(sec);if(el&&el.offsetHeight){el.scrollIntoView({block:'start',behavior:'smooth'});clearInterval(t);}else if(++k>40)clearInterval(t);},100);}}if(e.target.closest('.of-x')){pinned=null;$('#ofCard').hidden=true;}};}
// ---------- data -> desk status (honest) ----------
function derive(){const s=ST&&!ST.error?ST:null,sl=s?.strategy_lab||{},b=s?.brain||{},ch=s?.challenge||{},h=s?.bot_health||{},st=s?.stats||{},tr=s?.proof?.all_trades||[],last=tr[tr.length-1],rf=h.risk_fuel||{};
 const specs=Object.entries(INB?.specs||{}),gen=INB?.generator,lastV=specs.filter(([,v])=>v.verdict_sast).sort((a,b)=>b[1].verdict_sast.localeCompare(a[1].verdict_sast))[0];
 const booked=[...((sl.lab_rules||{}).trusted||[]),...((s?.rebuild_candidates||{}).candidates||[])],lrun=sl.last_run_sast?Date.parse(sl.last_run_sast.replace(' ','T')+':00+02:00'):0,running=Date.now()-lrun<45*60000;
 const verd=Object.values(s?.last_bot_pulse?.verdicts||{}),aside=verd.filter(v=>v==='STAND_ASIDE').length,lastTs=last?Date.parse(last.time_SAST.replace(' ','T')+':00+02:00'):0;
 const none='<span class="dim">nothing in the published data for this</span>';
 G={s,running,booked,flows:{research:specs.length>0||!!gen,lab:(sl.trusted||[]).length>0,risk:booked.length>0,booked:booked.length>0,exec:(ch.open_positions||[]).length>0||Date.now()-lastTs<6*3600e3,kraken:Date.now()-lastTs<24*3600e3,desk:false,luan:false,wall:!!(INF&&IM&&IM.speaking(INF).length),squad:!!(SQD?.bots||[]).some(b=>(b.strats||[]).length)},
 st:{alex:s?[`bot ${esc(ch.version||'—')} · ${s.mode||'PAPER'} · live money ${s.live_money?'<b class="r">ON</b>':'off'}`,`last tick ${sast(h.last_tick_ts)} SAST · publish: ${esc(h.last_publish_status||'—')} · engine ${h.engine_check?.match?'<b class="g">match</b>':'<b class="r">check</b>'}`,'No per-agent activity log is published; this shows the bot run Alex leads.']:null,
  research:specs.length||gen?[`${specs.length} hand-written specs · ${gen?gen.total.toLocaleString()+' generated':'no generator data'}`,lastV?`last verdict: <b>${esc(lastV[0])}</b> ${esc(lastV[1].verdict||lastV[1].status)} (${esc(lastV[1].verdict_sast)} SAST)`:none,`${specs.filter(([,v])=>/^FAIL/.test(v.verdict||'')).length} FAIL · ${specs.filter(([,v])=>/^PASS/.test(v.verdict||'')).length} PASS`]:null,
  lab:sl.variants_tested!=null?[`${sl.variants_tested.toLocaleString()} / ${(sl.family_size||0).toLocaleString()} variants tested (${sl.coverage_pct}%)`,`last batch ${esc(sl.last_run_sast)} SAST · ${running?'<b class="g">sweep running</b>':'idle'}`,`${(sl.trusted||[]).length} promoted${(sl.trusted||[]).length?'':' · <b class="a">no edge yet</b>'}${gen?` · generator ${gen.tested.toLocaleString()} tested, ${gen.passed} PASS`:''}`]:null,
  risk:s?[`daily loss budget $${rf.budget_usd??'—'} · ${rf.remaining_pct??'—'}% left · death below $${ch.death_below_usd??'—'}`,`<span class="small">${esc(ch.risk_label||'')}</span>`,`last sign-off: ${none} (risk_review.md is not published)`]:null,
  booked:s?[booked.length?`${booked.length} booked`:'<b class="a">none booked yet</b>','gate: lab promotion + Risk sign-off + engine parity',`bot runs its own baseline rules ${esc(ch.version||'')}, not a graduated strategy`]:null,
  exec:s?[`pulse ${esc(s.last_bot_pulse?.time_sast||'—')} SAST: ${aside}/${verd.length} pairs STAND ASIDE`,`${(ch.open_positions||[]).length} open positions · rules: ${esc(s.bot?.entry||'')}`.slice(0,220),last?`last action: <b>${esc(last.action)}</b> ${esc(last.pair)} @ ${esc(last.price)} (${esc(last.time_SAST)} SAST, ${esc(last.version)})`:none]:null,
  kraken:s?[`equity $${(ch.kraken_equity_usd??ch.equity_usd??0).toFixed(2)} (paper) · start $${ch.start_usd??'—'}`,`${(ch.open_positions||[]).length} open · ${st.closed_trades||0} closed this version`,`prices: Kraken public REST · no real orders`]:null,
  desk:s?[`${s.proof?.trade_count??tr.length} trades in the proof ledger · chain head ${esc(String(s.proof?.chain_head||'').slice(0,10))}…`,last?`last booked: ${esc(last.action)} ${esc(last.pair)} pnl ${esc(last.pnl_usd||'open')} (${esc(last.time_SAST)} SAST)`:none,`daily report: ${none}`]:null,
  squad:sqCard(),
  wall:wallCard(),
  luan:[`daily report: <span class="dim">none published yet. The Desk has no report job in the published data, so this flow is idle.</span>`,`approvals happen in chat with Alex; they are not in the published data`],
  dev:null}};
 const n=FLOWS.filter(([a])=>G.flows[a]).length;$('#ofStat').innerHTML=s?`state ${sast(s.generated_at)} SAST · ${n}/${FLOWS.length} flows moving · ${booked.length?booked.length+' booked':'none booked yet'}`:'<span class="r">No data: sign in to load the office.</span>';
 flowPanel();}
function flowPanel(){const name=id=>DESKS.find(d=>d.id===id).name;$('#ofFlow').innerHTML=FLOWS.map(([a,b,w],i)=>{const on=FON(i);return`<div class="of-f ${on?'on':''}"><span>${esc(name(a))}</span><i><em></em></i><span>${esc(name(b))}</span><small>${esc(w)} · ${on?'moving':a==='lab'?'gate closed: 0 promoted':a==='risk'||a==='booked'?'nothing to pass yet':a==='desk'?'no report published':'idle'}</small></div>`;}).join('');}
function cardHtml(d){const L=d.lines?d.lines():G&&G.st[d.id];return`<button class="of-x" aria-label="close">✕</button><div class="of-cr" style="color:#${d.col.toString(16).padStart(6,'0')}">${d.role}</div><h4>${esc(d.name)}</h4><p class="dim small">${esc(d.job)}</p>
 <div class="of-cs">${L?L.map(x=>`<div>${x}</div>`).join(''):'<div class="dim">The published data has nothing for this bot yet: no status or last action to show.</div>'}</div><button class="rn-btn" data-go="${d.tab}"${d.id==='squad'?' data-sec="rnSq"':d.id==='wall'?' data-sec="rn-infl"':''}>Open ${esc({overview:'Overview',rnd:'R&D',bot:'Bot',proof:'Proof',brain:'Brain'}[d.tab])} →</button>`;}
const DESC={spec:'A strategy spec file: a written, testable hypothesis on its way to the lab.',verdict:'A verdict file: the lab result for one spec, sent to Risk. FAIL means no variant passed every gate.',booked:'A booked strategy on its way to Execution.',order:'An order ticket for an open paper position.',trade:'A trade ticket from the hash-chained proof ledger, filed by the Desk.',sqspec:'An unproven lab spec dealt to the PAPER squad on purpose.',statement:'A recent statement by a watched person, sent to Research as evidence. PAPER research only.'};
function openCard(d,x,y){const c=$('#ofCard');pinned=d;c.innerHTML=cardHtml(d);c.hidden=false;const st=$('#ofStage').getBoundingClientRect(),w=c.offsetWidth,h=c.offsetHeight;
 if(st.width<600){c.style.left='8px';c.style.right='8px';c.style.top='auto';c.style.bottom='44px';}else{c.style.right='auto';c.style.bottom='auto';c.style.left=Math.max(8,Math.min(st.width-w-8,x+16))+'px';c.style.top=Math.max(8,Math.min(st.height-h-8,y-h/2))+'px';}}
// ---------- 2D fallback ----------
function mode2d(why){mode='2d';const el=$('#ofStage');el.innerHTML=`<div class="of-2d has-o">${DESKS.map(d=>`<button class="of-d2" data-id="${d.id}" style="left:${Math.max(5,Math.min(95,(d.pos[0]+8)/16.4*100))}%;top:${Math.max(4,Math.min(96,(d.pos[1]+4.6)/10.6*100))}%;--c:#${d.col.toString(16).padStart(6,'0')}"><b>${d.role}</b><span>${esc(d.name)}</span></button>`).join('')}</div><div class="of-why dim small">2D view · ${esc(why)}</div>${objs2d()}`;$('#ofClk').textContent=clkShort();
 $('#ofLabels').innerHTML='';$('#of2d').textContent='3D';const OD=objDefs();el.onclick=e=>{const b=e.target.closest('.of-d2,.of-o2');if(!b)return;const r=b.getBoundingClientRect(),s=el.getBoundingClientRect();openCard(DESKS.find(d=>d.id===b.dataset.id)||OD.find(d=>d.id===b.dataset.id)||Object.values(decorDefs()).find(d=>d&&d.id===b.dataset.id),r.right-s.left,r.top-s.top+r.height/2);};}
// ---------- 3D ----------
function webgl(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}}
async function start(force){if(force)forced=true;if(!webgl())return mode2d('WebGL is not available on this device');if(!force&&(navigator.hardwareConcurrency||4)<=2)return mode2d('weak device detected');
 let THREE;try{THREE=await import('/vendor/three.module.min.js');}catch{return mode2d('3D engine failed to load');}
 $('#ofStage').innerHTML='';$('#ofStage').onclick=null;$('#of2d').textContent='2D';mode='3d';build(THREE);}
function glowTex(THREE){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
function build(THREE){const el=$('#ofStage'),mob=el.clientWidth<600,dpr=Math.min(devicePixelRatio||1,mob?1.5:1.75);
 const R=new THREE.WebGLRenderer({antialias:dpr<1.5,powerPreference:'high-performance',alpha:false});R.setPixelRatio(dpr);R.setClearColor(0x030605);el.appendChild(R.domElement);R.domElement.style.touchAction='none';
 const S=new THREE.Scene();S.fog=new THREE.Fog(0x030605,14,30);const C=new THREE.PerspectiveCamera(mob?52:40,1,0.1,80);
 S.add(new THREE.HemisphereLight(0x9fffd0,0x081410,0.9));const dl=new THREE.DirectionalLight(0xffffff,0.9);dl.position.set(4,9,6);S.add(dl);
 const flat=(c,e=0)=>new THREE.MeshLambertMaterial({color:c,flatShading:true,emissive:e});
 const floor=new THREE.Mesh(new THREE.CircleGeometry(13,48),flat(0x07120d));floor.rotation.x=-Math.PI/2;S.add(floor);
 const grid=new THREE.GridHelper(26,26,0x1c6b44,0x0e2a1d);grid.position.y=0.002;grid.material.transparent=true;grid.material.opacity=.55;S.add(grid);
 const tex=glowTex(THREE),pick=[],labels=[],screens=[];
 const halo=(col,s)=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,color:col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.55}));m.scale.set(s,s,1);return m;};
 DESKS.forEach(d=>{const g=new THREE.Group();g.position.set(d.pos[0],0,d.pos[1]);g.userData.d=d;
  if(d.machine){const rack=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.2,1),flat(0x101c18));rack.position.y=1.1;g.add(rack);for(let i=0;i<6;i++){const l=new THREE.Mesh(new THREE.BoxGeometry(1.1,.08,.02),new THREE.MeshBasicMaterial({color:d.col}));l.position.set(0,.35+i*.3,.51);g.add(l);screens.push(l);}}
  else if(d.vault){const v=new THREE.Mesh(new THREE.CylinderGeometry(.6,.7,1.6,8),flat(0x141026));v.position.y=.9;g.add(v);const r=new THREE.Mesh(new THREE.TorusGeometry(.72,.045,6,24),new THREE.MeshBasicMaterial({color:d.col}));r.rotation.x=Math.PI/2;r.position.y=1.65;g.add(r);screens.push(r);}
  else if(d.shelf){const p=new THREE.Mesh(new THREE.CylinderGeometry(.9,1,.4,6),flat(0x1a1608));p.position.y=.2;g.add(p);const cnt=Math.min(6,G?.booked.length||0);
   for(let i=0;i<Math.max(1,cnt);i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),cnt?new THREE.MeshBasicMaterial({color:d.col}):new THREE.MeshBasicMaterial({color:0x3a3420,wireframe:true}));c.position.set(Math.cos(i*1.05)*.45,.75,Math.sin(i*1.05)*.45);g.add(c);c.userData.spin=1;screens.push(c);}}
  else if(d.pod){}
  else if(d.board){const tx=wallTex(THREE);const b=new THREE.Mesh(new THREE.BoxGeometry(4.2,2.3,.14),new THREE.MeshBasicMaterial({map:tx}));b.position.y=1.85;g.rotation.y=2.12;g.add(b);const f=new THREE.Mesh(new THREE.BoxGeometry(4.4,.12,.3),flat(0x1c1408));f.position.y=.64;g.add(f);[-1.9,1.9].forEach(x=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.1,.7,.1),flat(0x0c0a08));l.position.set(x,.33,0);g.add(l);});}
  else{g.rotation.y=2.12;const big=d.id==='alex'?1.25:1;const top=new THREE.Mesh(new THREE.BoxGeometry(2*big,.12,1*big),flat(0x14231c));top.position.y=.75;g.add(top);
   [[-.85,-.4],[.85,-.4],[-.85,.4],[.85,.4]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.08,.75,.08),flat(0x0c1611));l.position.set(x*big,.37,z*big);g.add(l);});
   const mon=new THREE.Mesh(new THREE.BoxGeometry(1.1*big,.65,.06),flat(0x0a0f0d));mon.position.set(0,1.2,-.3*big);g.add(mon);const stx=screenTex(THREE,d);const scr=new THREE.Mesh(new THREE.PlaneGeometry(1*big,.55),new THREE.MeshBasicMaterial(stx?{map:stx}:{color:d.col}));scr.position.set(0,1.2,-.26*big);g.add(scr);screens.push(scr);
   const ch=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.5),flat(0x1b2a24));ch.position.set(0,.45,.75*big);g.add(ch);
   const body=new THREE.Mesh(new THREE.CylinderGeometry(.18,.26,.6,6),flat(d.col,new THREE.Color(d.col).multiplyScalar(.15)));body.position.set(0,.85,.78*big);g.add(body);
   const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.17,0),flat(0xdfeee6));head.position.set(0,1.3,.78*big);g.add(head);g.userData.head=head;}
  const h=halo(d.col,3.2);h.position.y=1.2;g.add(h);g.userData.halo=h;
  const hit=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.2),new THREE.MeshBasicMaterial({visible:false}));if(d.pod)hit.scale.set(.5,1,.5);hit.position.y=1;hit.userData.d=d;g.add(hit);pick.push(hit);S.add(g);d.g=g;
  const lb=document.createElement('div');lb.className='of-lb';lb.innerHTML=`<b>${d.role}</b>`;$('#ofLabels').appendChild(lb);labels.push([lb,d]);});
 // flows: arcs + packets (one InstancedMesh)
 const X={objs:[]};
 const curves=FLOWS.map(([a,b])=>{const A=DESKS.find(d=>d.id===a),B=DESKS.find(d=>d.id===b),p0=new THREE.Vector3(A.pos[0],1.4,A.pos[1]),p2=new THREE.Vector3(B.pos[0],1.4,B.pos[1]),m=p0.clone().lerp(p2,.5);m.y=2.6+p0.distanceTo(p2)*.12;return new THREE.QuadraticBezierCurve3(p0,m,p2);});
 const lines=curves.map((c,i)=>{const on=FON(i);const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(40)),new THREE.LineDashedMaterial({color:on?0x39ff88:0xff3b5c,dashSize:on?.35:.12,gapSize:on?.12:.22,transparent:true,opacity:on?.75:.35}));l.computeLineDistances();S.add(l);return l;});
 const NP=0,pk=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07,0),new THREE.MeshBasicMaterial({color:0xffffff}),NP);pk.instanceMatrix.setUsage(THREE.DynamicDrawUsage);S.add(pk);
 const P=Array.from({length:NP},(_,i)=>({f:i%FLOWS.length,t:Math.random(),s:.12+Math.random()*.1}));const M=new THREE.Matrix4(),V=new THREE.Vector3(),Q=new THREE.Quaternion(),SC=new THREE.Vector3(),col=new THREE.Color();
 extras(THREE,S,X,curves,pick,labels,flat,halo,mob);decor(THREE,S,X,pick,flat,halo,mob,labels);
 const pcol=[0x3ad7ff,0xc9a2ff,0xffb347,0xffd23f,0x39ff88,0x7f6cff,0x3ad7ff];
 // camera orbit
 const LK=mob?[-1.1,.2,.5]:[-.5,.2,.6];const cam={az:-.55,el:mob?.95:.78,r:mob?21:20,auto:!RM.matches};const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let W=1,H=1;
 function size(){W=el.clientWidth||1;H=el.clientHeight||1;R.setSize(W,H,false);R.domElement.style.width=W+'px';R.domElement.style.height=H+'px';C.aspect=W/H;C.updateProjectionMatrix();dirty=true;kick();}
 const ptr=new Map();let drag=null,dirty=true;
 R.domElement.addEventListener('pointerdown',e=>{R.domElement.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);cam.auto=false;
  drag=ptr.size===2?{pinch:dist(),r:cam.r}:{x:e.clientX,y:e.clientY,az:cam.az,el:cam.el,moved:false};});
 const dist=()=>{const[a,b]=[...ptr.values()];return Math.hypot(a[0]-b[0],a[1]-b[1])||1;};
 R.domElement.addEventListener('pointermove',e=>{if(ptr.has(e.pointerId))ptr.set(e.pointerId,[e.clientX,e.clientY]);if(!drag){hover(e);return;}
  if(drag.pinch){if(ptr.size===2){cam.r=Math.max(8,Math.min(24,drag.r*drag.pinch/dist()));dirty=true;kick();}return;}
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>(e.pointerType==='touch'?8:4))drag.moved=true;if(drag.moved){cam.az=drag.az-dx*.006;cam.el=Math.max(.35,Math.min(1.25,drag.el+dy*.004));dirty=true;kick();}});
 const up=e=>{ptr.delete(e.pointerId);if(!drag)return;if(drag.pinch){if(!ptr.size)drag=null;return;}if(!drag.moved){const d=hitAt(e);if(d){const r=R.domElement.getBoundingClientRect();openCard(d,e.clientX-r.left,e.clientY-r.top);}else{pinned=null;$('#ofCard').hidden=true;}}drag=null;dirty=true;kick();};
 R.domElement.addEventListener('pointerup',up);R.domElement.addEventListener('pointercancel',up);
 R.domElement.addEventListener('wheel',e=>{e.preventDefault();cam.r=Math.max(8,Math.min(24,cam.r*Math.exp(e.deltaY*.001)));cam.auto=false;dirty=true;kick();},{passive:false});
 function hitAt(e){const r=R.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,C);const hs=ray.intersectObjects(pick,false);if(!hs.length)return null;const tx=(e.clientX-r.left),ty=(e.clientY-r.top);let best=null,bd=1e9;for(const h of hs){const d=h.object.userData.d;(d.wp?V.copy(d.wp):V.set(d.pos[0],1,d.pos[1])).project(C);const dx=(V.x*.5+.5)*r.width-tx,dy=(-V.y*.5+.5)*r.height-ty,q=(dx*dx+dy*dy)*(d.kind==='file'?.4:1);if(q<bd){bd=q;best=d;}}return best;}
 let hov=null;function hover(e){if(e.pointerType==='touch')return;const d=hitAt(e);const tp=$('#ofTip');if(tp){if(d){const r=$('#ofStage').getBoundingClientRect();tp.innerHTML=`<b>${esc(d.role)}</b> ${esc(d.name)}${d.tip?'<br><span class="dim">'+esc(d.tip)+'</span>':''}<br><span class="dim">click to open</span>`;tp.style.transform=`translate(${e.clientX-r.left+14}px,${e.clientY-r.top+12}px)`;tp.hidden=false;}else tp.hidden=true;}if(d!==hov){hov=d;R.domElement.style.cursor=d?'pointer':'grab';dirty=true;kick();}}
 let t=0,last=0,running=false,fps={n:0,t0:0,v:60,low:0,warm:0};const vis=()=>!document.hidden&&!$('#t-office').classList.contains('hidden')&&mode==='3d';
 kick=()=>{if(!running&&vis()){running=true;last=0;requestAnimationFrame(frame);}};
 function frame(now){if(!vis()){running=false;return;}const still=RM.matches;
  if(last){const dt=Math.min(.05,(now-last)/1000);t+=dt;if(cam.auto)cam.az+=dt*.06;fps.n++;if(!fps.t0)fps.t0=now;if(now-fps.t0>1000){fps.v=Math.round(fps.n*1000/(now-fps.t0));fps.n=0;fps.t0=now;
    if(++fps.warm>2&&!still&&!forced){if(fps.v<30){if(++fps.low>=3){stop3d();mode2d('frame rate too low for 3D ('+fps.v+' fps)');return;}}else fps.low=0;}}
   for(let i=0;i<NP;i++){const p=P[i],on=FON(p.f);if(still){p.t=(i*.137)%1;}else p.t+=dt*p.s*(on?1:.5);
    if(p.t>1){p.t=0;}const lim=on?1:.42,tt=Math.min(p.t,lim);curves[p.f].getPoint(tt,V);const fade=on?1:Math.max(0,1-(p.t-lim)*3);SC.setScalar(p.t>lim?fade*.8:1);M.compose(V,Q,SC);pk.setMatrixAt(i,M);pk.setColorAt(i,col.setHex(on?pcol[p.f]:0xff3b5c));}
   X.tick(dt,t,still,now);pk.instanceMatrix.needsUpdate=true;if(pk.instanceColor)pk.instanceColor.needsUpdate=true;
   screens.forEach((s,i)=>{if(s.userData.spin)s.rotation.y+=dt*.8;else s.material.color&&(s.material.opacity=1);});
   DESKS.forEach((d,i)=>{const g=d.g,on=pinned===d||hov===d;g.userData.halo.material.opacity=(on?.95:.45)+(still?0:.12*Math.sin(t*2+i));if(g.userData.head&&!still)g.userData.head.position.y=1.3+.03*Math.sin(t*3+i);});}
  last=now;C.position.set(Math.cos(cam.az)*Math.cos(cam.el)*cam.r+LK[0],Math.sin(cam.el)*cam.r,Math.sin(cam.az)*Math.cos(cam.el)*cam.r+LK[2]);C.lookAt(LK[0],LK[1],LK[2]);
  if(still&&!dirty){running=false;return;}dirty=false;R.render(S,C);
  if(still)X.tick(0,t,true,now);labels.forEach(([lb,d])=>{V.set(d.pos[0],d.ly??2.3,d.pos[1]).project(C);lb.style.transform=`translate(${(V.x*.5+.5)*W}px,${(-V.y*.5+.5)*H}px) translate(-50%,-100%)`;lb.style.opacity=V.z<1?1:0;lb.classList.toggle('on',pinned===d||hov===d);});
  if(still){running=false;return;}requestAnimationFrame(frame);}
 T={R,S,lines,size,stop:()=>{R.dispose();R.forceContextLoss?.();}};window.__office={fps:()=>fps.v,mode:()=>mode,dpr,objs:()=>X.objs.map(o=>o.id),pick:id=>{const d=DESKS.find(x=>x.id===id)||X.objs.find(x=>x.id===id);(d.wp?V.copy(d.wp):V.set(d.pos[0],1,d.pos[1])).project(C);const r=R.domElement.getBoundingClientRect();return[r.left+(V.x*.5+.5)*W,r.top+(-V.y*.5+.5)*H];}};
 addEventListener('resize',size);document.addEventListener('visibilitychange',()=>kick());new MutationObserver(()=>kick()).observe($('#t-office'),{attributes:true,attributeFilter:['class']});RM.addEventListener?.('change',()=>{cam.auto=!RM.matches;dirty=true;kick();});
 size();kick();}
let kick=()=>{};
function stop3d(){if(T){T.stop();T=null;}$('#ofStage').innerHTML='';$('#ofLabels').innerHTML='';}
function refresh(){if(mode==='3d'&&T){T.lines.forEach((l,i)=>{const on=FON(i);l.material.color.setHex(on?0x39ff88:0xff3b5c);l.material.opacity=on?.75:.35;});}if(pinned&&!$('#ofCard').hidden)$('#ofCard').innerHTML=cardHtml(pinned);}

function sqCard(){const q=SQD&&Array.isArray(SQD.bots)?SQD:null;if(!q)return null;const st=q.stats||{},S0=q.start||1000,eq=b=>b.equity??b.cash;
 const tot=q.bots.reduce((a,b)=>a+eq(b),0),n=Object.values(st).reduce((a,t)=>a+(t.n||0),0),op=q.bots.reduce((a,b)=>a+(b.open||[]).length,0),best=[...q.bots].sort((a,b)=>eq(b)-eq(a))[0];
 return[`<b class="a">PAPER</b> · ${q.bots.length} bots · equity $${tot.toFixed(2)} of $${(S0*q.bots.length).toFixed(0)} · updated ${esc(q.updated_sast||'—')} SAST`,
  q.bots.map(b=>`${esc(b.id)} $${eq(b).toFixed(0)}${(b.open||[]).length?' · '+b.open.length+' open':''}${(b.life||1)>1?' · life '+b.life:''}`).join(' &nbsp;·&nbsp; '),
  `${op} open · ${n?n+' closed paper trades':'no trades yet'} · ${(q.deaths||[]).length} deaths${n&&best?` · leader ${esc(best.id)}`:''}`];}

// ---------- v3: real-data objects (files, cabinets, squad pod, racks, clock, screens) ----------
const hex=c=>'#'+c.toString(16).padStart(6,'0'),ts2ms=t=>t?Date.parse(String(t).replace(' ','T').slice(0,16)+':00+02:00'):0,ago=ms=>{const m=Math.round(ms/60000);return m<1?'just now':m<90?m+' min ago':Math.round(m/60)+' h ago';};
function tickInfo(){const s=G&&G.s;if(!s)return null;const last=(s.bot_health?.last_tick_ts||0)*1000,ph=(s.pulse_history||[]).map(x=>ts2ms(x.time_sast)).filter(Boolean).slice(-11);
 const gaps=ph.slice(1).map((v,i)=>v-ph[i]).filter(g=>g>0).sort((a,b)=>a-b),med=gaps.length?gaps[gaps.length>>1]:0;return{last,med,next:last&&med?last+med:0};}
function clockText(){const k=tickInfo();if(!k||!k.last)return['no tick data','sign in to load'];const now=Date.now(),l='last tick '+ago(now-k.last);
 if(!k.next)return[l,'next tick: no schedule published'];const d=k.next-now;return[l,d>0?`next tick ~${Math.floor(d/60000)}:${String(Math.floor(d/1000)%60).padStart(2,'0')} (est. from typical ${Math.round(k.med/60000)} min gap)`:`next tick due (typical gap ${Math.round(k.med/60000)} min, ticks are triggered, not timed)`];}
function canvasTex(THREE,w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.userData={c,x,draw};return t;}
function spark(x,v,w,h,col){if(v.length<2){x.fillStyle='#6a8';x.fillText('no history yet',8,h-12);return;}const lo=Math.min(...v),hi=Math.max(...v),r=hi-lo||1;x.strokeStyle=col;x.lineWidth=3;x.beginPath();v.forEach((y,i)=>{const px=8+i/(v.length-1)*(w-16),py=h-14-(y-lo)/r*(h-50);i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();}
function screenTex(THREE,d){const s=G&&G.s;const col=hex(d.col);return canvasTex(THREE,192,108,(x,w,h)=>{x.fillStyle='#020806';x.fillRect(0,0,w,h);x.fillStyle=col;x.font='bold 15px monospace';x.fillText(d.role,8,18);x.font='13px monospace';x.fillStyle='#cfe';
 if(!s){x.fillText('no data',8,44);return;}const ch=s.challenge||{},h2=s.bot_health||{},sl=s.strategy_lab||{};
 if(d.id==='alex'){const sc=Object.values(s.last_bot_pulse?.scores||{});x.fillText('pulse scores',8,36);sc.forEach((v,i)=>{x.fillStyle=v>=50?'#39ff88':'#2a6b4a';const bh=v/100*(h-50);x.fillRect(10+i*17,h-8-bh,12,bh);});x.strokeStyle='#ffb347';x.beginPath();x.moveTo(8,h-8-.5*(h-50));x.lineTo(w-8,h-8-.5*(h-50));x.stroke();}
 else if(d.id==='exec'||d.id==='desk'){const v=(s.proof?.equity_curve||[]).filter(p=>p.version===ch.version).map(p=>p.equity_usd);x.fillText(d.id==='exec'?`$${(ch.equity_usd??0).toFixed(2)} ${ch.version||''}`:`${s.proof?.trade_count??0} trades`,8,36);spark(x,v,w,h,col);}
 else if(d.id==='research'){const n=Object.keys(INB?.specs||{}).length,g=INB?.generator;x.fillText(`${n} specs`,8,40);x.fillText(g?`${g.total.toLocaleString()} generated`:'no generator',8,60);x.fillText(g?`${g.untested.toLocaleString()} untested`:'',8,80);}
 else if(d.id==='risk'){const rf=h2.risk_fuel||{},p=(rf.remaining_pct??0)/100;x.fillText(`fuel $${rf.budget_usd??'—'}/day`,8,40);x.fillStyle='#1c2a24';x.fillRect(8,58,w-16,16);x.fillStyle=p>.5?'#39ff88':p>.2?'#ffb347':'#ff3b5c';x.fillRect(8,58,(w-16)*p,16);x.fillStyle='#cfe';x.fillText(`${rf.remaining_pct??'—'}% left`,8,96);}
 else if(d.id==='luan'){x.fillText('daily report',8,40);x.fillStyle='#8a9';x.fillText('none published',8,62);}
 else if(d.id==='dev'){x.fillStyle='#8a9';x.fillText('no published data',8,44);}
 else{x.fillText(String(sl.variants_tested??''),8,44);}});}
function flowItems(i){const s=G&&G.s;if(!s)return[];const ch=s.challenge||{},sp=Object.entries(INB?.specs||{}),top=(INB?.generator?.top||[]).map(v=>[v.id,v]);
 const verd=v=>v.verdict||v.status||'—',spec=([id,v])=>({kind:'spec',title:id,tab:'rnd',lines:[`status: <b>${esc(v.status||'—')}</b>${v.time_sast?' · filed '+esc(v.time_sast)+' SAST':''}`,`verdict: ${esc(verd(v))}`,v.coded_by?`coded by ${esc(v.coded_by)}`:'']});
 const vf=([id,v])=>({kind:'verdict',title:id,tab:'rnd',lines:[`<b class="${/^PASS/.test(v.verdict)?'g':'r'}">${esc(v.verdict)}</b> · ${esc(v.verdict_sast)} SAST`,`${v.variants??'—'} variants · best ${esc(v.best_variant||'—')} · OOS n ${v.best_oos_n??'—'} · z=3 lower ${v.best_oos_lo_R??'—'}R`,(v.best_why_not||[]).length?'why not: '+esc(v.best_why_not.join('; ')):'']});
 const tr=(s.proof?.all_trades||[]).slice(-3).reverse().map(t=>({kind:'trade',title:`${t.action} ${t.pair}`,tab:'proof',lines:[`${esc(t.time_SAST)} SAST · ${esc(t.version)} · qty ${esc(t.qty)} @ ${esc(t.price)}`,`pnl ${esc(t.pnl_usd||'open')} · fee $${esc(t.fee_usd)} · ${esc(t.reason||'')}`.slice(0,240),`chain ${esc(String(t.chain_hash).slice(0,12))}… engine ${esc(t.engine_hash)}`]}));
 if(i===0)return sp.sort((a,b)=>String(b[1].time_sast).localeCompare(a[1].time_sast)).slice(0,3).map(spec);
 if(i===1)return[...sp,...top].filter(([,v])=>v.verdict_sast).sort((a,b)=>b[1].verdict_sast.localeCompare(a[1].verdict_sast)).slice(0,3).map(vf);
 if(i===2||i===3)return(G.booked||[]).slice(0,3).map(b=>({kind:'booked',title:b.setup||b.id||'strategy',tab:'rnd',lines:[esc(JSON.stringify(b).slice(0,200))]}));
 if(i===4)return(ch.open_positions||[]).slice(0,3).map(p=>({kind:'order',title:`${p.side||''} ${p.pair||p.symbol||''}`.trim()||'open position',tab:'bot',lines:[esc(JSON.stringify(p).slice(0,220))]}));
 if(i===5)return tr;
 if(FLOWS[i][0]==='wall'){return(INF&&IM?IM.speaking(INF):[]).slice(0,4).map(p=>({kind:'statement',title:`${p.name}: ${p.status==='HIGH'?'HIGH pulse':'spoke'}`,tab:'rnd',lines:[`${p.recent[0]?esc(p.recent[0].text):'(no text captured)'}`,`${p.ts?sast(p.ts)+' SAST':''} · markets: ${p.markets.length?esc(p.markets.join(', ')):'not measured yet (map building)'}`,'to S7: <span class="dim">no S7 bot exists in the published squad yet, so this file only goes to Research</span>']}));}
 if(i===7){const seen=new Set(),o=[];for(const b of SQD?.bots||[])for(const x of b.strats||[])if(!seen.has(x.id)&&o.length<3){seen.add(x.id);o.push({kind:'sqspec',title:`${x.id} → ${b.id}`,tab:'rnd',lines:[`${esc(x.family)} · ${esc(x.tf)} · ${x.tested?`lab OOS n ${x.oos_n} · ΣR ${x.oos_total_R} · z=3 lower ${x.oos_lo}`:'untested in lab'}`,`params ${esc(JSON.stringify(x.params))}`,'PAPER only · forward evidence, never books']});}return o;}
 return[];}
const KCOL={statement:0xffb347,spec:0x3ad7ff,verdict:0xff6b7d,booked:0xffd23f,order:0x39ff88,trade:0x7f6cff,sqspec:0xff8a3d};
// plain object definitions shared by the 3D scene and the 2D fallback (real data only)
function objDefs(){const D=[];
 FLOWS.forEach((f,i)=>{const it=flowItems(i),on=FON(i);it.forEach((x,k)=>D.push({kind:'file',f:i,k,n:it.length,on,id:`file-${i}-${k}`,role:x.kind==='sqspec'?'SPEC → SQUAD':x.kind.toUpperCase()+' FILE',name:x.title,job:DESC[x.kind],tip:DESC[x.kind],col:KCOL[x.kind],tab:x.tab,
  lines:()=>[...x.lines.filter(Boolean),on?'<span class="g">this flow is moving</span>':'<span class="dim">parked: this flow is idle right now, the file sits where it was delivered</span>']}));});
 const specs=Object.entries(INB?.specs||{}),fails=specs.filter(([,v])=>/^FAIL/.test(v.verdict||'')),g=INB?.generator,nRej=fails.length+(g?.failed||0),nBook=(G?.booked||[]).length;
 D.push({kind:'cab',id:'cab-rej',role:'FAIL ARCHIVE',name:'fail archive cabinet',pos:[-6.4,4.0],ly:1.9,col:0xff3b5c,n:nRej,tab:'rnd',tip:`${nRej.toLocaleString()} files`,job:'The FAIL archive. Every spec the lab rejected is filed here with its reasons. Rejection is the normal outcome.',
  lines:()=>[`<b>${nRej.toLocaleString()}</b> rejected · ${fails.length} hand-written + ${(g?.failed||0).toLocaleString()} generated`,...fails.slice(0,3).map(([id,v])=>`${esc(id)} · ${esc(v.verdict_sast||'')} SAST`),g?'':'<span class="dim">no generator data</span>']});
 D.push({kind:'cab',id:'cab-book',role:'BOOKED FILES',name:'booked files cabinet',pos:[2.6,1.2],ly:1.9,col:0xffd23f,n:nBook,tab:'rnd',tip:`${nBook} files`,job:'Strategies that passed every lab gate and Risk sign-off. The drawers light up as it fills.',
  lines:()=>[nBook?`${nBook} booked`:'<b class="a">empty: nothing has passed every gate yet</b>','gate: lab promotion + Risk sign-off + engine parity']});
 const bots=SQD?.bots||[],S0=SQD?.start||1000,DL=SQD?.death_line||500,now=Date.now(),st=SQD?.stats||{};
 for(let i=0;i<6;i++){const b=bots[i],eq=b?(b.equity??b.cash):0,bc=!b?0x2a2a2a:eq<DL*1.2?0xff3b5c:eq<S0?0xffb347:0x39ff88,dth=b?(SQD.deaths||[]).filter(x=>(x.bot||x.id)===b.id):[],recent=dth.find(x=>now-ts2ms(x.time_sast)<6*3600e3),id=b?b.id:'S'+(i+1);
  D.push({kind:'bot',i,id,role:id,name:b?`PAPER bot ${id} · life ${b.life||1}`:`${id}: no data`,col:bc,tab:'rnd',ratio:b?Math.max(.05,Math.min(2,eq/S0)):0,dead:!!recent,tip:b?`$${eq.toFixed(2)} paper equity`:'not in the published squad row',
   job:'One PAPER squad bot: $1,000 start, dies below $'+DL+' and respawns with the next specs from the queue.',
   lines:()=>!b?['<span class="dim">no squad data published yet</span>']:[`<b class="a">PAPER</b> equity <b>$${eq.toFixed(2)}</b> vs $${S0} start · death below $${DL}`,`${(b.open||[]).length?b.open.length+' open: '+b.open.map(p=>esc(p.m)).join(', '):'no open positions'} · ${b.closed||0} closed this life`,`deaths: ${Math.max(dth.length,(b.life||1)-1)}${recent?` · <b class="r">died ${esc(recent.time_sast)} SAST at $${recent.equity}, respawned</b>`:''}`,
    ...(b.strats||[]).map(x=>{const t=st[x.id];return `${esc(x.family)} ${esc(x.tf)}: ${t&&t.n?`${t.n} fwd · win ${Math.round(100*t.wins/t.n)}% · avg R ${(t.R/t.n).toFixed(2)}`:'no trades yet'}`;})]});}
 D.push({kind:'clock',id:'clock',role:'CLOCK',name:'Tick clock',col:0x39ff88,tab:'overview',tip:'last tick and estimated next tick',job:'Shows when the box last ran the tick, and an estimate of the next one from the typical gap between recent pulses. Ticks are triggered, not on a fixed timer, so the countdown is an estimate.',
  lines:()=>{const k2=tickInfo(),c2=clockText();return[c2[0],c2[1],k2&&k2.last?`last tick ${sast(k2.last/1000)} SAST · engine check ${G.s.bot_health?.engine_check?.match?'<b class="g">match</b>':'<b class="r">mismatch</b>'}`:''];}});
 return D;}
function extras(THREE,S,X,curves,pick,labels,flat,halo,mob){const s=G&&G.s,O=X.objs,anim=[];const add=(o,mesh,r=.4)=>{const h=new THREE.Mesh(new THREE.SphereGeometry(r,6,4),new THREE.MeshBasicMaterial({visible:false}));mesh.add(h);h.userData.d=o;pick.push(h);o.wp=new THREE.Vector3();mesh.getWorldPosition(o.wp);o.mesh=mesh;O.push(o);return o;};
 const lbl=o=>{const lb=document.createElement('div');lb.className='of-lb sm';lb.innerHTML=`<b>${o.role}</b>`;$('#ofLabels').appendChild(lb);labels.push([lb,o]);};
 const sheet=new THREE.BoxGeometry(.34,.03,.44),sq=DESKS.find(d=>d.id==='squad');
 for(const o of objDefs()){
  if(o.kind==='file'){const m=new THREE.Mesh(sheet,new THREE.MeshBasicMaterial({color:o.col}));S.add(m);add(o,m,.32);anim.push(o);}
  else if(o.kind==='cab'){const gr=new THREE.Group();gr.position.set(o.pos[0],0,o.pos[1]);S.add(gr);const b=new THREE.Mesh(new THREE.BoxGeometry(.9,1.5,.7),flat(0x101a16));b.position.y=.75;gr.add(b);
   const lit=o.n?Math.min(4,1+Math.floor(Math.log10(o.n+1))):0;for(let j=0;j<4;j++){const dr=new THREE.Mesh(new THREE.BoxGeometry(.78,.28,.04),new THREE.MeshBasicMaterial({color:j<lit?o.col:0x1d2a25}));dr.position.set(0,.25+j*.34,.36);gr.add(dr);}
   const hl=halo(o.col,1.8);hl.position.y=.9;hl.material.opacity=o.n?.35:.08;gr.add(hl);add(o,b,.75);lbl(o);}
  else if(o.kind==='bot'){const a=o.i/6*Math.PI*2,gr=new THREE.Group();gr.position.set(sq.pos[0]+Math.cos(a)*1.25,0,sq.pos[1]+Math.sin(a)*1.25);gr.rotation.y=-a;S.add(gr);
   const top=new THREE.Mesh(new THREE.BoxGeometry(.7,.06,.45),flat(0x1a1410));top.position.y=.5;gr.add(top);const leg=new THREE.Mesh(new THREE.BoxGeometry(.06,.5,.06),flat(0x0c0a08));leg.position.y=.25;gr.add(leg);
   const bar=new THREE.Mesh(new THREE.BoxGeometry(.16,1,.16),new THREE.MeshBasicMaterial({color:o.col}));bar.scale.y=.01+o.ratio*.8;bar.position.set(.22,.53+bar.scale.y/2,0);gr.add(bar);o.bar=bar;add(o,top,.5);anim.push(o);}
  else if(o.kind==='clock'){var ct=canvasTex(THREE,256,128,(x,w,h)=>{x.fillStyle='#04100b';x.fillRect(0,0,w,h);x.strokeStyle='#39ff88';x.lineWidth=4;x.strokeRect(3,3,w-6,h-6);const [a,b2]=clockText();x.fillStyle='#39ff88';x.font='bold 22px monospace';x.fillText('TICK CLOCK',14,32);x.fillStyle='#dfe';x.font='17px monospace';x.fillText(a,14,66);x.font='14px monospace';x.fillStyle='#9bb';const w2=b2.match(/.{1,30}(\s|$)/g)||[b2];w2.slice(0,2).forEach((l,j)=>x.fillText(l.trim(),14,92+j*18));});
   const clk=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.1,.08),new THREE.MeshBasicMaterial({map:ct}));clk.position.set(-3.9,2.4,-3.2);clk.rotation.y=2.12;S.add(clk);const post=new THREE.Mesh(new THREE.BoxGeometry(.08,1.9,.08),flat(0x0c1611));post.position.set(-3.9,.95,-3.22);S.add(post);add(o,clk,.9);}}
 const lab=DESKS.find(d=>d.id==='lab').g,leds=lab?lab.children.filter(c=>c.geometry?.type==='BoxGeometry'&&c.material?.isMeshBasicMaterial):[],cov=(s?.bot_health?.strategy_lab?.coverage_pct??s?.strategy_lab?.coverage_pct??0),k=tickInfo();
 let blinkUntil=0;try{const seen=+localStorage.getItem('of_tick')||0;if(k&&k.last&&k.last!==seen){blinkUntil=performance.now()+3000;localStorage.setItem('of_tick',k.last);}}catch{}
 let lastClk=0;$('#ofClk').textContent=clkShort();
 X.tick=(dt,t,still,now2)=>{for(const o of anim){if(o.kind==='file'){const c=curves[o.f];let u;if(o.on&&!still){u=((t*.05)+o.k/o.n)%1;}else u=.78-o.k*.1;c.getPoint(u,o.mesh.position);o.mesh.position.y=o.on?.62:o.mesh.position.y+.08;o.mesh.rotation.y=still?0:t*.6+o.k;o.mesh.getWorldPosition(o.wp);}
   else if(o.bar){const life=Math.min(1,t/2.5),grow=o.dead&&!still?(life<.4?(1-life/.4):(life-.4)/.6):1;const sy=.01+o.ratio*.8*Math.max(.02,grow);o.bar.scale.y=sy;o.bar.position.y=.53+sy/2;if(o.dead&&!still&&life<.4)o.bar.material.color.setHex(Math.floor(t*8)%2?0xff3b5c:0x330000);else if(o.dead&&life>=1)o.bar.material.color.setHex(0x39ff88);}}
  const bl=performance.now()<blinkUntil&&!still;leds.forEach((l,j)=>{const lit=j<Math.max(1,Math.round(cov/100*leds.length));l.material.color.setHex(bl?((Math.floor(t*10)+j)%2?0xffffff:0x3a2f55):lit?0xc9a2ff:0x2a2440);});
  X.walk&&X.walk(t,still);X.tape&&X.tape(dt,still);
  if(ct&&now2-lastClk>1000){lastClk=now2;ct.userData.draw(ct.userData.x,256,128);ct.needsUpdate=true;$('#ofClk').textContent=clkShort();}};}

function clkShort(){const k=tickInfo();if(!k||!k.last)return 'no tick data';const l='last tick '+ago(Date.now()-k.last);if(!k.next)return l;const d=k.next-Date.now();return l+' · '+(d>0?`next ~${Math.floor(d/60000)}:${String(Math.floor(d/1000)%60).padStart(2,'0')} (est.)`:'next tick due (est.)')+' · tap the clock';}

function objs2d(){const D=objDefs(),grp=[['FILES IN TRANSIT',D.filter(o=>o.kind==='file')],['CABINETS',D.filter(o=>o.kind==='cab')],['PAPER SQUAD POD',D.filter(o=>o.kind==='bot')],['CLOCK',D.filter(o=>o.kind==='clock')],['OFFICE',(()=>{const d=decorDefs();return[d.window,d.coffee,d.ticker,d.worldmap];})()]];
 return `<div class="of-objs">${grp.map(([t,L])=>`<div class="of-og"><b class="dim small">${t}</b>${L.length?L.map(o=>`<button class="of-o2" data-id="${o.id}" style="--c:${hex(o.col)}" title="${esc(o.tip||'')}"><b>${esc(o.role)}</b> ${esc(o.name)}${o.kind==='bot'?` <i style="width:${Math.round(Math.min(1,o.ratio/1.5)*100)}%"></i>`:''}</button>`).join(''):'<span class="dim small">none in the published data</span>'}</div>`).join('')}</div>`;}

function wallCard(){if(!INF||!IM)return['<span class="dim">building: no influence row published yet (or not signed in)</span>'];const P=IM.people(INF),sp=P.filter(p=>p.status!=='quiet');
 return[`${INF.status==='ready'?'map ready':'<b class="a">map BUILDING</b>: markets and impact scores not measured yet'} · ${P.length} people watched`,sp.length?'speaking: '+sp.map(p=>`<b class="${p.status==='HIGH'?'r':'a'}">${esc(p.name)}</b> ${p.status}`).join(', '):'<span class="dim">everyone quiet right now</span>',
  `S7: <span class="dim">no S7 bot exists in the published squad yet, so statements go to Research only</span>`];}
function wallTex(THREE){const P=INF&&IM?IM.people(INF):[];return canvasTex(THREE,512,280,(x,w,h)=>{x.fillStyle='#070502';x.fillRect(0,0,w,h);x.strokeStyle='#ffb347';x.lineWidth=5;x.strokeRect(3,3,w-6,h-6);
 x.fillStyle='#ffb347';x.font='bold 24px monospace';x.fillText('WATCHING BOARD',16,34);x.font='13px monospace';x.fillStyle='#a98';x.fillText(!INF?'building: no data':INF.status==='ready'?'PAPER research':'map building · stats not measured yet',16,54);
 if(!P.length)return;const cols=4,cw=(w-24)/cols,ch=50;P.slice(0,16).forEach((p,i)=>{const cx=12+(i%cols)*cw,cy=66+Math.floor(i/cols)*ch,c=p.status==='HIGH'?'#ff3b5c':p.status==='WATCH'?'#ffb347':'#2c3a34';
  x.fillStyle=p.status==='quiet'?'#0d1512':c+'33';x.fillRect(cx+2,cy+2,cw-6,ch-6);x.strokeStyle=c;x.lineWidth=2;x.strokeRect(cx+2,cy+2,cw-6,ch-6);x.fillStyle=c==='#2c3a34'?'#6a7d75':c;x.beginPath();x.arc(cx+22,cy+ch/2,13,0,7);x.fill();
  x.fillStyle='#000';x.font='bold 12px monospace';x.textAlign='center';x.fillText(IM.initials(p.name),cx+22,cy+ch/2+4);x.textAlign='left';x.fillStyle='#e8eee9';x.font='13px monospace';x.fillText(p.name.slice(0,11),cx+40,cy+22);x.fillStyle=p.status==='quiet'?'#6a7d75':c;x.font='11px monospace';x.fillText(p.status==='HIGH'?'HIGH':p.status.toUpperCase(),cx+40,cy+38);});});}

// ---------- v4 decor (functional where the data allows) ----------
const sastHour=()=>{const d=new Date(Date.now()+7200e3);return d.getUTCHours()+d.getUTCMinutes()/60;};
function pxList(){const d=window.S&&S.d,P=d?.pulse?.pairs||{},o=[];for(const k of Object.keys(P)){const p=P[k];if(p&&p.last!=null)o.push({id:(p.label||k).replace('/USD',''),px:p.last,ch:p.metrics?.roc6h_pct,src:'Kraken 6h'});}
 for(const q of d?.indices?.quotes||[])if(q.price!=null)o.push({id:q.id,px:q.price,ch:q.change_pct,src:'day'});return o;}
function decor(THREE,S,X,pick,flat,halo,mob,labels){const O=X.objs,add=(o,mesh,r)=>{const h=new THREE.Mesh(new THREE.SphereGeometry(r,6,4),new THREE.MeshBasicMaterial({visible:false}));mesh.add(h);h.userData.d=o;pick.push(h);o.wp=new THREE.Vector3();mesh.getWorldPosition(o.wp);o.mesh=mesh;O.push(o);return o;};
 const DD=decorDefs(),s=G&&G.s,hr=sastHour(),day=hr>=6.5&&hr<18.5,dusk=(hr>=5.5&&hr<6.5)||(hr>=18.5&&hr<19.5),R2=2.12;
 // ambient lighting follows SAST time of day
 S.add(new THREE.AmbientLight(day?0x9fc8ff:0x2a3550,day?.35:.25));const warm=new THREE.PointLight(0xffb070,day?.6:1.2,14,2);warm.position.set(1,4,1);S.add(warm);
 // back walls with windows (day/night from SAST clock)
 const wallM=flat(0x0a1612),wall=new THREE.Mesh(new THREE.BoxGeometry(.2,2.8,20),wallM);wall.position.set(-9.6,1.4,1);S.add(wall);
 const skyC=day?0x7fc4ff:dusk?0xff8a5c:0x0a1430;const winT=canvasTex(THREE,128,128,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#'+skyC.toString(16).padStart(6,'0'));g.addColorStop(1,day?'#d8f0ff':dusk?'#40204a':'#02040c');x.fillStyle=g;x.fillRect(0,0,w,h);
  if(!day&&!dusk){x.fillStyle='#fff';for(let i=0;i<26;i++){const a=(i*97)%w,b=(i*53)%(h*.7);x.fillRect(a,b,1.5,1.5);}x.fillStyle='#f4efd0';x.beginPath();x.arc(96,28,10,0,7);x.fill();}else if(day){x.fillStyle='#fff8d0';x.beginPath();x.arc(30,30,12,0,7);x.fill();}
  x.fillStyle='#0b1a2a';for(let i=0;i<8;i++){const bw=10+(i*7)%12,bh=30+(i*29)%50;x.fillRect(i*16,h-bh,bw,bh);}x.strokeStyle='#1a2a24';x.lineWidth=6;x.strokeRect(0,0,w,h);x.beginPath();x.moveTo(w/2,0);x.lineTo(w/2,h);x.stroke();});
 const winG=new THREE.PlaneGeometry(2,1.3),winM=new THREE.MeshBasicMaterial({map:winT}),wins=new THREE.InstancedMesh(winG,winM,3),M4=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.PI/2,0));
 [-5.5,-2,1.5].forEach((z,i)=>{M4.compose(new THREE.Vector3(-9.48,1.25,z),Q,new THREE.Vector3(1,1,1));wins.setMatrixAt(i,M4);});S.add(wins);
 const wo=add(DD.window,new THREE.Object3D(),1.2);wo.mesh.position.set(-9.4,1.25,-2);S.add(wo.mesh);wo.mesh.getWorldPosition(wo.wp);
 // plants (instanced, low poly)
 const PL=[[-8.8,-6.2],[-8.8,8.4],[8.2,-1.4],[8.6,4.2],[-1,6.8],[2.2,-6.4]],pot=new THREE.InstancedMesh(new THREE.CylinderGeometry(.28,.22,.42,6),flat(0x3a2a1c),PL.length),leaf=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.48,0),flat(0x1f7a46,new THREE.Color(0x0a2a16)),PL.length);
 PL.forEach(([x,z],i)=>{M4.makeTranslation(x,.21,z);pot.setMatrixAt(i,M4);M4.compose(new THREE.Vector3(x,.85,z),new THREE.Quaternion(),new THREE.Vector3(1,1.4,1));leaf.setMatrixAt(i,M4);});S.add(pot,leaf);
 // coffee machine: cups = ticks run today (real, from pulse history)
 const today=new Date(Date.now()+7200e3).toISOString().slice(0,10),cups=(s?.pulse_history||[]).filter(p=>String(p.time_sast).startsWith(today)).length;
 const cg=new THREE.Group();cg.position.set(6.6,0,-2.6);cg.rotation.y=2.12;S.add(cg);const ctab=new THREE.Mesh(new THREE.BoxGeometry(1.2,.8,.6),flat(0x1b1410));ctab.position.y=.4;cg.add(ctab);const cm=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,.4),flat(0x2a2a2a));cm.position.set(-.2,1.1,0);cg.add(cm);
 const cl=new THREE.Mesh(new THREE.BoxGeometry(.12,.06,.02),new THREE.MeshBasicMaterial({color:cups?0x39ff88:0xff3b5c}));cl.position.set(-.2,1.25,.21);cg.add(cl);
 const cupI=new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.05,.12,6),flat(0xeeeeee),Math.max(1,Math.min(12,cups)));for(let i=0;i<Math.min(12,cups);i++){M4.makeTranslation(.15+(i%4)*.11,.86,-.15+Math.floor(i/4)*.12);cupI.setMatrixAt(i,M4);}cupI.count=Math.min(12,cups);cg.add(cupI);
 add(DD.coffee,cm,.6);
 // cable trays: every desk to the Lab racks (instanced tray segments on the floor)
 const lab=DESKS.find(d=>d.id==='lab'),segs=[];DESKS.filter(d=>d.id!=='lab'&&!d.board).forEach(d=>{const a=new THREE.Vector3(d.pos[0],.03,d.pos[1]),b=new THREE.Vector3(lab.pos[0],.03,lab.pos[1]);segs.push([a,b]);});
 const tray=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.03,.1),new THREE.MeshBasicMaterial({color:0x10261c}),segs.length);segs.forEach(([a,b],i)=>{const m=a.clone().lerp(b,.5),L=a.distanceTo(b),ang=Math.atan2(-(b.z-a.z),b.x-a.x);M4.compose(m,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ang,0)),new THREE.Vector3(L,1,1));tray.setMatrixAt(i,M4);});S.add(tray);
 // ticker tape wall: real prices already loaded by the app (Kraken pulse + indices), no new requests
 let PX=pxList();const tt=canvasTex(THREE,1024,64,(x,w,h)=>{x.fillStyle='#020604';x.fillRect(0,0,w,h);x.font='bold 26px monospace';let cx=10;if(!PX.length){x.fillStyle='#6a8';x.fillText('no prices loaded yet: open Overview once, or sign in',10,42);return;}
  for(const p of PX){const c=p.ch==null?'#9bb':p.ch>=0?'#39ff88':'#ff3b5c';x.fillStyle='#dfe';const t1=`${p.id} ${p.px<10?p.px.toFixed(4):p.px.toLocaleString(undefined,{maximumFractionDigits:2})}`;x.fillText(t1,cx,42);cx+=x.measureText(t1).width+8;x.fillStyle=c;const t2=p.ch==null?'':`${p.ch>=0?'▲':'▼'}${Math.abs(p.ch).toFixed(2)}%`;x.fillText(t2,cx,42);cx+=x.measureText(t2).width+28;if(cx>w)break;}});
 tt.wrapS=THREE.RepeatWrapping;tt.repeat.set(1,1);const tape=new THREE.Mesh(new THREE.BoxGeometry(.1,.55,12),new THREE.MeshBasicMaterial({map:tt}));tape.position.set(-9.45,2.45,1);
 tt.center.set(.5,.5);tt.rotation=0;S.add(tape);
 add(DD.ticker,tape,1.4);
 // world map wall: markets glow by real activity (|change| of the loaded prices)
 const SPOT=spots(()=>PX);
 const wm=canvasTex(THREE,512,256,(x,w,h)=>{x.fillStyle='#03100a';x.fillRect(0,0,w,h);x.fillStyle='#123526';[[.18,.32,.13,.12],[.27,.66,.06,.16],[.5,.3,.07,.08],[.53,.58,.07,.16],[.7,.34,.17,.13],[.83,.72,.06,.06]].forEach(([a,b,c,d])=>{x.beginPath();x.ellipse(a*w,b*h,c*w,d*h,0,0,7);x.fill();});
  x.strokeStyle='#1d4a36';for(let i=1;i<8;i++){x.beginPath();x.moveTo(i*w/8,0);x.lineTo(i*w/8,h);x.stroke();}x.fillStyle='#39ff88';x.font='bold 16px monospace';x.fillText('MARKETS · glow = real move size',10,20);
  for(const [n,a,b,f] of SPOT){const v=f(),r=v==null?4:6+Math.min(30,v*12);const g=x.createRadialGradient(a*w,b*h,0,a*w,b*h,r);g.addColorStop(0,v==null?'#445':'#ffd23f');g.addColorStop(1,'rgba(255,210,63,0)');x.fillStyle=g;x.beginPath();x.arc(a*w,b*h,r,0,7);x.fill();x.fillStyle='#cfe';x.font='11px monospace';x.fillText(v==null?n+': no data':`${n.split(' · ')[0]} ${v.toFixed(2)}%`,a*w+8,b*h+r/2+12);}});
 const map=new THREE.Mesh(new THREE.BoxGeometry(.1,1.6,3.2),new THREE.MeshBasicMaterial({map:wm}));map.position.set(-9.45,1.3,6);map.rotation.y=Math.PI;S.add(map);
 add(DD.worldmap,map,1.4);
 // walking bots carry the moving files (one per moving file, instanced)
 const mov=O.filter(o=>o.kind==='file'&&o.on),NB=mov.length,bb=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.12,.22,2,6),flat(0x9fe8c4,new THREE.Color(0x0a2a1c)),Math.max(1,NB));bb.count=NB;S.add(bb);
 const eye=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,.04,.02),new THREE.MeshBasicMaterial({color:0x39ff88}),Math.max(1,NB));eye.count=NB;S.add(eye);
 X.walk=(t,still)=>{for(let i=0;i<NB;i++){const o=mov[i],p=o.mesh.position;const bob=still?0:Math.abs(Math.sin(t*9+i))*.05;M4.makeTranslation(p.x,.26+bob,p.z);bb.setMatrixAt(i,M4);M4.makeTranslation(p.x,.4+bob,p.z+.12);eye.setMatrixAt(i,M4);}bb.instanceMatrix.needsUpdate=true;eye.instanceMatrix.needsUpdate=true;};
 X.tape=(dt,still)=>{if(!still)tt.offset.x=(tt.offset.x+dt*.02)%1;};}

function decorDefs(){const s=G&&G.s,hr=sastHour(),day=hr>=6.5&&hr<18.5,dusk=(hr>=5.5&&hr<6.5)||(hr>=18.5&&hr<19.5),skyC=day?0x7fc4ff:dusk?0xff8a5c:0x0a1430;
 const today=new Date(Date.now()+7200e3).toISOString().slice(0,10),cups=(s?.pulse_history||[]).filter(p=>String(p.time_sast).startsWith(today)).length;let PX=pxList();const SPOT=spots(()=>PX);
 return{window:{id:'window',role:'WINDOW',name:`${day?'Day':dusk?'Dusk':'Night'} in Johannesburg`,col:skyC,tab:'overview',tip:`SAST ${String(Math.floor(hr)).padStart(2,'0')}:${String(Math.round(hr%1*60)).padStart(2,'0')}`,job:'The windows follow the real time of day in South Africa (SAST): day 06:30–18:30, dusk around sunrise and sunset, night otherwise. Crypto never closes, so the office never sleeps.',lines:()=>[`it is ${String(Math.floor(sastHour())).padStart(2,'0')}:${String(Math.round(sastHour()%1*60)).padStart(2,'0')} SAST`,'markets: crypto 24/7 · US indices trade 15:30–22:00 SAST']},coffee:{id:'coffee',role:'COFFEE',name:'Coffee machine',col:0xc48a5a,tab:'overview',tip:`${cups} cups today = ${cups} ticks`,job:'One cup per tick the box ran today (SAST), counted from the published pulse history. Green light: the box has ticked today.',lines:()=>[`<b>${cups}</b> cups today · one per tick in the published pulse history`,cups?'':'<span class="dim">no tick recorded today yet</span>']},ticker:{id:'ticker',role:'TICKER',name:'Ticker tape',col:0x39ff88,tab:'charts',tip:'real prices from the loaded state',job:'Live prices the app has already loaded (Kraken pulse prices with the 6 h change, and the indices with the day change). It never fetches anything by itself.',lines:()=>{PX=pxList();return PX.length?PX.map(p=>`${esc(p.id)} ${p.px} · ${p.ch==null?'—':(p.ch>=0?'+':'')+p.ch.toFixed(2)+'%'} <span class="dim">(${p.src})</span>`):['<span class="dim">no prices loaded yet</span>'];}},worldmap:{id:'worldmap',role:'WORLD MAP',name:'Markets world map',col:0xffd23f,tab:'charts',tip:'glow = size of the real move',job:'Each market glows by the size of its latest real move in the data the app already loaded: crypto by the average 6 h change across the bot pairs, US indices and gold by the day change.',lines:()=>SPOT.map(([n,,,f])=>{const v=f();return `${esc(n)}: ${v==null?'<span class="dim">no data loaded</span>':v.toFixed(2)+'% average move'}`;})},cups,skyC,day,dusk,hr,SPOT,getPX:()=>PX};}
function spots(gp){const PX0=()=>gp();return [['BTC/crypto',.5,.42,()=>{const p=PX0().filter(p=>p.src==='Kraken 6h'&&p.ch!=null);return p.length?p.reduce((a,b)=>a+Math.abs(b.ch),0)/p.length:null;}],['New York · SPX/NDX/DJI',.27,.36,()=>{const p=PX0().filter(p=>['SPX','NDX','DJI'].includes(p.id));return p.length?p.reduce((a,b)=>a+Math.abs(b.ch||0),0)/p.length:null;}],['London · Gold',.48,.3,()=>{const p=PX0().find(p=>p.id==='XAU');return p?Math.abs(p.ch||0):null;}]];}
