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
 {id:'squad',name:'Paper squad S1–S6',role:'SQUAD',pos:[-7.4,0.7],col:0xff8a3d,tab:'rnd',job:'Six PAPER bots trading unproven lab specs on purpose, $1,000 each, die below $500 and respawn with the next specs. Forward evidence only; nothing here books for the bot.'},
 {id:'dev',name:'Lulu Dev',role:'DEV',pos:[-2.3,4.6],col:0xff5ec8,tab:'brain',job:'Builds the OS: look and workflow only. Never touches the engine, sizing, risk or tick.'}];
const FLOWS=[['research','lab','ideas'],['lab','risk','lab results'],['risk','booked','sign-off'],['booked','exec','booked strategies'],['exec','kraken','orders'],['kraken','desk','fills / trades'],['desk','alex','daily report'],['lab','squad','unproven specs · paper, skips the gates','squad']];
const FON=i=>G?.flows[FLOWS[i][3]||FLOWS[i][0]];
let SQD=null;
export async function show(){const box=$('#office');if(!box.dataset.init){box.dataset.init=1;box.innerHTML=shell();wire();}
 if(Date.now()-loadedAt>60000){loadedAt=Date.now();try{const r=await fetch('/api/state',{cache:'no-store'});ST=r.ok?await r.json():null;}catch{ST=null;}
  try{const r=await fetch('/api/lab?key=inbox_status');INB=r.ok?await r.json():null;}catch{INB=null;}
  try{const r=await fetch('/api/lab?key=squad');SQD=r.ok?await r.json():null;}catch{SQD=null;}derive();}
 if(!mode)await start();else{refresh();kick();}}
function shell(){return`<div class="of"><div class="panel of-hero"><div id="ofStage" class="of-stage"></div><div class="of-ov"><div class="br-t">NORTHLINE//<b>OFFICE</b></div><div class="br-honest">PAPER ONLY · LIVE FROM THE PUBLISHED STATE</div><div id="ofStat" class="dim small">opening the office…</div></div>
 <div id="ofCard" class="of-card" hidden></div><div class="br-ctl of-ctl"><span class="dim" id="ofHint">tap a desk · drag to turn · pinch or scroll to zoom</span><button id="of2d" type="button">2D</button></div><div id="ofLabels" class="of-labels"></div></div>
 <div class="panel"><div class="ph"><b class="c">WORK FLOW</b><span class="dim small">derived from the latest state · gates shown honestly</span></div><div id="ofFlow" class="of-flow"></div></div></div>`;}
function wire(){$('#of2d').onclick=()=>{if(mode==='3d'){stop3d();mode2d('switched by you');}else start(true);};
 $('#ofCard').onclick=e=>{const a=e.target.closest('[data-go]');if(a){window.go&&window.go(a.dataset.go);const sec=a.dataset.sec;if(sec){let k=0;const t=setInterval(()=>{const el=document.getElementById(sec);if(el&&el.offsetHeight){el.scrollIntoView({block:'start',behavior:'smooth'});clearInterval(t);}else if(++k>40)clearInterval(t);},100);}}if(e.target.closest('.of-x')){pinned=null;$('#ofCard').hidden=true;}};}
// ---------- data -> desk status (honest) ----------
function derive(){const s=ST&&!ST.error?ST:null,sl=s?.strategy_lab||{},b=s?.brain||{},ch=s?.challenge||{},h=s?.bot_health||{},st=s?.stats||{},tr=s?.proof?.all_trades||[],last=tr[tr.length-1],rf=h.risk_fuel||{};
 const specs=Object.entries(INB?.specs||{}),gen=INB?.generator,lastV=specs.filter(([,v])=>v.verdict_sast).sort((a,b)=>b[1].verdict_sast.localeCompare(a[1].verdict_sast))[0];
 const booked=[...((sl.lab_rules||{}).trusted||[]),...((s?.rebuild_candidates||{}).candidates||[])],lrun=sl.last_run_sast?Date.parse(sl.last_run_sast.replace(' ','T')+':00+02:00'):0,running=Date.now()-lrun<45*60000;
 const verd=Object.values(s?.last_bot_pulse?.verdicts||{}),aside=verd.filter(v=>v==='STAND_ASIDE').length,lastTs=last?Date.parse(last.time_SAST.replace(' ','T')+':00+02:00'):0;
 const none='<span class="dim">nothing in the published data for this</span>';
 G={s,running,booked,flows:{research:specs.length>0||!!gen,lab:(sl.trusted||[]).length>0,risk:booked.length>0,booked:booked.length>0,exec:(ch.open_positions||[]).length>0||Date.now()-lastTs<6*3600e3,kraken:Date.now()-lastTs<24*3600e3,desk:false,squad:!!(SQD?.bots||[]).some(b=>(b.strats||[]).length)},
 st:{alex:s?[`bot ${esc(ch.version||'—')} · ${s.mode||'PAPER'} · live money ${s.live_money?'<b class="r">ON</b>':'off'}`,`last tick ${sast(h.last_tick_ts)} SAST · publish: ${esc(h.last_publish_status||'—')} · engine ${h.engine_check?.match?'<b class="g">match</b>':'<b class="r">check</b>'}`,'No per-agent activity log is published; this shows the bot run Alex leads.']:null,
  research:specs.length||gen?[`${specs.length} hand-written specs · ${gen?gen.total.toLocaleString()+' generated':'no generator data'}`,lastV?`last verdict: <b>${esc(lastV[0])}</b> ${esc(lastV[1].verdict||lastV[1].status)} (${esc(lastV[1].verdict_sast)} SAST)`:none,`${specs.filter(([,v])=>/^FAIL/.test(v.verdict||'')).length} FAIL · ${specs.filter(([,v])=>/^PASS/.test(v.verdict||'')).length} PASS`]:null,
  lab:sl.variants_tested!=null?[`${sl.variants_tested.toLocaleString()} / ${(sl.family_size||0).toLocaleString()} variants tested (${sl.coverage_pct}%)`,`last batch ${esc(sl.last_run_sast)} SAST · ${running?'<b class="g">sweep running</b>':'idle'}`,`${(sl.trusted||[]).length} promoted${(sl.trusted||[]).length?'':' · <b class="a">no edge yet</b>'}${gen?` · generator ${gen.tested.toLocaleString()} tested, ${gen.passed} PASS`:''}`]:null,
  risk:s?[`daily loss budget $${rf.budget_usd??'—'} · ${rf.remaining_pct??'—'}% left · death below $${ch.death_below_usd??'—'}`,`<span class="small">${esc(ch.risk_label||'')}</span>`,`last sign-off: ${none} (risk_review.md is not published)`]:null,
  booked:s?[booked.length?`${booked.length} booked`:'<b class="a">none booked yet</b>','gate: lab promotion + Risk sign-off + engine parity',`bot runs its own baseline rules ${esc(ch.version||'')}, not a graduated strategy`]:null,
  exec:s?[`pulse ${esc(s.last_bot_pulse?.time_sast||'—')} SAST: ${aside}/${verd.length} pairs STAND ASIDE`,`${(ch.open_positions||[]).length} open positions · rules: ${esc(s.bot?.entry||'')}`.slice(0,220),last?`last action: <b>${esc(last.action)}</b> ${esc(last.pair)} @ ${esc(last.price)} (${esc(last.time_SAST)} SAST, ${esc(last.version)})`:none]:null,
  kraken:s?[`equity $${(ch.kraken_equity_usd??ch.equity_usd??0).toFixed(2)} (paper) · start $${ch.start_usd??'—'}`,`${(ch.open_positions||[]).length} open · ${st.closed_trades||0} closed this version`,`prices: Kraken public REST · no real orders`]:null,
  desk:s?[`${s.proof?.trade_count??tr.length} trades in the proof ledger · chain head ${esc(String(s.proof?.chain_head||'').slice(0,10))}…`,last?`last booked: ${esc(last.action)} ${esc(last.pair)} pnl ${esc(last.pnl_usd||'open')} (${esc(last.time_SAST)} SAST)`:none,`daily report: ${none}`]:null,
  squad:sqCard(),
  dev:null}};
 const n=FLOWS.filter(([a])=>G.flows[a]).length;$('#ofStat').innerHTML=s?`state ${sast(s.generated_at)} SAST · ${n}/${FLOWS.length} flows moving · ${booked.length?booked.length+' booked':'none booked yet'}`:'<span class="r">No data: sign in to load the office.</span>';
 flowPanel();}
function flowPanel(){const name=id=>DESKS.find(d=>d.id===id).name;$('#ofFlow').innerHTML=FLOWS.map(([a,b,w],i)=>{const on=FON(i);return`<div class="of-f ${on?'on':''}"><span>${esc(name(a))}</span><i><em></em></i><span>${esc(name(b))}</span><small>${esc(w)} · ${on?'moving':a==='lab'?'gate closed: 0 promoted':a==='risk'||a==='booked'?'nothing to pass yet':a==='desk'?'no report published':'idle'}</small></div>`;}).join('');}
function cardHtml(d){const L=G&&G.st[d.id];return`<button class="of-x" aria-label="close">✕</button><div class="of-cr" style="color:#${d.col.toString(16).padStart(6,'0')}">${d.role}</div><h4>${esc(d.name)}</h4><p class="dim small">${esc(d.job)}</p>
 <div class="of-cs">${L?L.map(x=>`<div>${x}</div>`).join(''):'<div class="dim">The published data has nothing for this bot yet: no status or last action to show.</div>'}</div><button class="rn-btn" data-go="${d.tab}"${d.id==='squad'?' data-sec="rnSq"':''}>Open ${esc({overview:'Overview',rnd:'R&D',bot:'Bot',proof:'Proof',brain:'Brain'}[d.tab])} →</button>`;}
function openCard(d,x,y){const c=$('#ofCard');pinned=d;c.innerHTML=cardHtml(d);c.hidden=false;const st=$('#ofStage').getBoundingClientRect(),w=c.offsetWidth,h=c.offsetHeight;
 if(st.width<600){c.style.left='8px';c.style.right='8px';c.style.top='auto';c.style.bottom='44px';}else{c.style.right='auto';c.style.bottom='auto';c.style.left=Math.max(8,Math.min(st.width-w-8,x+16))+'px';c.style.top=Math.max(8,Math.min(st.height-h-8,y-h/2))+'px';}}
// ---------- 2D fallback ----------
function mode2d(why){mode='2d';const el=$('#ofStage');el.innerHTML=`<div class="of-2d">${DESKS.map(d=>`<button class="of-d2" data-id="${d.id}" style="left:${(d.pos[0]+8)/16.4*100}%;top:${(d.pos[1]+4.6)/10.6*100}%;--c:#${d.col.toString(16).padStart(6,'0')}"><b>${d.role}</b><span>${esc(d.name)}</span></button>`).join('')}</div><div class="of-why dim small">2D view · ${esc(why)}</div>`;
 $('#ofLabels').innerHTML='';$('#of2d').textContent='3D';el.onclick=e=>{const b=e.target.closest('.of-d2');if(!b)return;const r=b.getBoundingClientRect(),s=el.getBoundingClientRect();openCard(DESKS.find(d=>d.id===b.dataset.id),r.right-s.left,r.top-s.top+r.height/2);};}
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
  else{const big=d.id==='alex'?1.25:1;const top=new THREE.Mesh(new THREE.BoxGeometry(2*big,.12,1*big),flat(0x14231c));top.position.y=.75;g.add(top);
   [[-.85,-.4],[.85,-.4],[-.85,.4],[.85,.4]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.08,.75,.08),flat(0x0c1611));l.position.set(x*big,.37,z*big);g.add(l);});
   const mon=new THREE.Mesh(new THREE.BoxGeometry(1.1*big,.65,.06),flat(0x0a0f0d));mon.position.set(0,1.2,-.3*big);g.add(mon);const scr=new THREE.Mesh(new THREE.PlaneGeometry(1*big,.55),new THREE.MeshBasicMaterial({color:d.col}));scr.position.set(0,1.2,-.26*big);g.add(scr);screens.push(scr);
   const ch=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.5),flat(0x1b2a24));ch.position.set(0,.45,.75*big);g.add(ch);
   const body=new THREE.Mesh(new THREE.CylinderGeometry(.18,.26,.6,6),flat(d.col,new THREE.Color(d.col).multiplyScalar(.15)));body.position.set(0,.85,.78*big);g.add(body);
   const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.17,0),flat(0xdfeee6));head.position.set(0,1.3,.78*big);g.add(head);g.userData.head=head;}
  const h=halo(d.col,3.2);h.position.y=1.2;g.add(h);g.userData.halo=h;
  const hit=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.2),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=1;hit.userData.d=d;g.add(hit);pick.push(hit);S.add(g);d.g=g;
  const lb=document.createElement('div');lb.className='of-lb';lb.innerHTML=`<b>${d.role}</b>`;$('#ofLabels').appendChild(lb);labels.push([lb,d]);});
 // flows: arcs + packets (one InstancedMesh)
 const curves=FLOWS.map(([a,b])=>{const A=DESKS.find(d=>d.id===a),B=DESKS.find(d=>d.id===b),p0=new THREE.Vector3(A.pos[0],1.4,A.pos[1]),p2=new THREE.Vector3(B.pos[0],1.4,B.pos[1]),m=p0.clone().lerp(p2,.5);m.y=2.6+p0.distanceTo(p2)*.12;return new THREE.QuadraticBezierCurve3(p0,m,p2);});
 const lines=curves.map((c,i)=>{const on=FON(i);const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(40)),new THREE.LineDashedMaterial({color:on?0x39ff88:0xff3b5c,dashSize:on?.35:.12,gapSize:on?.12:.22,transparent:true,opacity:on?.75:.35}));l.computeLineDistances();S.add(l);return l;});
 const NP=mob?60:110,pk=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07,0),new THREE.MeshBasicMaterial({color:0xffffff}),NP);pk.instanceMatrix.setUsage(THREE.DynamicDrawUsage);S.add(pk);
 const P=Array.from({length:NP},(_,i)=>({f:i%FLOWS.length,t:Math.random(),s:.12+Math.random()*.1}));const M=new THREE.Matrix4(),V=new THREE.Vector3(),Q=new THREE.Quaternion(),SC=new THREE.Vector3(),col=new THREE.Color();
 const pcol=[0x3ad7ff,0xc9a2ff,0xffb347,0xffd23f,0x39ff88,0x7f6cff,0x3ad7ff];
 // camera orbit
 const cam={az:-.55,el:mob?.95:.78,r:mob?19:17,auto:!RM.matches};const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let W=1,H=1;
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
 function hitAt(e){const r=R.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,C);const hs=ray.intersectObjects(pick,false);if(!hs.length)return null;const tx=(e.clientX-r.left),ty=(e.clientY-r.top);let best=null,bd=1e9;for(const h of hs){const d=h.object.userData.d;V.set(d.pos[0],1,d.pos[1]).project(C);const dx=(V.x*.5+.5)*r.width-tx,dy=(-V.y*.5+.5)*r.height-ty,q=dx*dx+dy*dy;if(q<bd){bd=q;best=d;}}return best;}
 let hov=null;function hover(e){if(e.pointerType==='touch')return;const d=hitAt(e);if(d!==hov){hov=d;R.domElement.style.cursor=d?'pointer':'grab';dirty=true;kick();}}
 let t=0,last=0,running=false,fps={n:0,t0:0,v:60,low:0,warm:0};const vis=()=>!document.hidden&&!$('#t-office').classList.contains('hidden')&&mode==='3d';
 kick=()=>{if(!running&&vis()){running=true;last=0;requestAnimationFrame(frame);}};
 function frame(now){if(!vis()){running=false;return;}const still=RM.matches;
  if(last){const dt=Math.min(.05,(now-last)/1000);t+=dt;if(cam.auto)cam.az+=dt*.06;fps.n++;if(!fps.t0)fps.t0=now;if(now-fps.t0>1000){fps.v=Math.round(fps.n*1000/(now-fps.t0));fps.n=0;fps.t0=now;
    if(++fps.warm>2&&!still&&!forced){if(fps.v<30){if(++fps.low>=3){stop3d();mode2d('frame rate too low for 3D ('+fps.v+' fps)');return;}}else fps.low=0;}}
   for(let i=0;i<NP;i++){const p=P[i],on=FON(p.f);if(still){p.t=(i*.137)%1;}else p.t+=dt*p.s*(on?1:.5);
    if(p.t>1){p.t=0;}const lim=on?1:.42,tt=Math.min(p.t,lim);curves[p.f].getPoint(tt,V);const fade=on?1:Math.max(0,1-(p.t-lim)*3);SC.setScalar(p.t>lim?fade*.8:1);M.compose(V,Q,SC);pk.setMatrixAt(i,M);pk.setColorAt(i,col.setHex(on?pcol[p.f]:0xff3b5c));}
   pk.instanceMatrix.needsUpdate=true;if(pk.instanceColor)pk.instanceColor.needsUpdate=true;
   screens.forEach((s,i)=>{if(s.userData.spin)s.rotation.y+=dt*.8;else s.material.color&&(s.material.opacity=1);});
   DESKS.forEach((d,i)=>{const g=d.g,on=pinned===d||hov===d;g.userData.halo.material.opacity=(on?.95:.45)+(still?0:.12*Math.sin(t*2+i));if(g.userData.head&&!still)g.userData.head.position.y=1.3+.03*Math.sin(t*3+i);});}
  last=now;C.position.set(Math.cos(cam.az)*Math.cos(cam.el)*cam.r+1.2,Math.sin(cam.el)*cam.r,Math.sin(cam.az)*Math.cos(cam.el)*cam.r+.9);C.lookAt(1.2,0.4,.9);
  if(still&&!dirty){running=false;return;}dirty=false;R.render(S,C);
  labels.forEach(([lb,d])=>{V.set(d.pos[0],2.3,d.pos[1]).project(C);lb.style.transform=`translate(${(V.x*.5+.5)*W}px,${(-V.y*.5+.5)*H}px) translate(-50%,-100%)`;lb.style.opacity=V.z<1?1:0;lb.classList.toggle('on',pinned===d||hov===d);});
  if(still){running=false;return;}requestAnimationFrame(frame);}
 T={R,S,lines,size,stop:()=>{R.dispose();R.forceContextLoss?.();}};window.__office={fps:()=>fps.v,mode:()=>mode,dpr,pick:id=>{const d=DESKS.find(x=>x.id===id);V.set(d.pos[0],1,d.pos[1]).project(C);const r=R.domElement.getBoundingClientRect();return[r.left+(V.x*.5+.5)*W,r.top+(-V.y*.5+.5)*H];}};
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
