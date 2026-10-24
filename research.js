// RESEARCH tab (PAPER ONLY, display + job requests). Reads bot_state rows 'research' (miner+scanner), 'intel' (Market Intel) and
// 'research_engine' (box worker, local 3B model, zero Grok) every 10s while open. The Research box and refresh button insert a
// run_requests row with idea_ref 'rq:<type>' (owner insert); the box worker picks it up within ~10s. Nothing here trades.
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pc=(v,d=2)=>v==null||!isFinite(v)?'—':(v*100).toFixed(d)+'%',num=v=>v==null?'—':Number(v).toLocaleString('en-US');
let R={},T=null,lastEv='',busy=false;
function tok(){try{const a=JSON.parse(localStorage.getItem('nl_auth')||'null');return a&&a.mode==='supabase'&&a.exp>Date.now()/1000+30?a.token:null}catch{return null}}
async function sb(path,o={}){const s=window.NL_SB,t=tok();if(!s||!t)throw new Error('sign in to load research data');
 const r=await fetch(s.url+'/rest/v1/'+path,{...o,cache:'no-store',headers:{apikey:s.key,authorization:'Bearer '+t,'content-type':'application/json',...(o.headers||{})}});
 if(!r.ok)throw new Error(path.split('?')[0]+' HTTP '+r.status);const x=await r.text();return x?JSON.parse(x):null;}
async function load(){try{const j=await sb('bot_state?select=id,data&id=in.(research,intel,research_engine)');const o={};for(const x of j||[])if(x&&x.id)o[x.id]=x.data;R=o;R.err='';}
 catch(e){if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){try{const r=await fetch('/research_demo.json',{cache:'no-store'});if(r.ok){R=await r.json();R.err='';return;}}catch{}}R.err=String(e.message||e);}}
const STG=['MINED','OUT-OF-SAMPLE','48H PAPER','GATE','PROVEN'];
function minerLanes(m){const C=m?.candidates||[];const lane=s=>C.filter(c=>c.stage===s);
 return `<div class="rs-lanes">${STG.map(s=>`<div class="rs-lane"><div class="rs-lh">${s}</div>${s==='MINED'?`<div class="rs-card mined"><b>${num(m?.variants_tried)}</b> variants mined<br><span class="dim">2024–2025 · Bonferroni z &gt; ${esc(m?.z_threshold)}</span><br><b class="${m?.in_sample_pass?'up':'dn'}">${num(m?.in_sample_pass)} passed</b></div>`:''}
 ${lane(s).map(c=>`<div class="rs-card ${c.status==='PASSED'?'ok':'dead'}"><span class="badge ${c.status==='PASSED'?'live':'off'}">${c.status==='PASSED'?'PASSED':'FAILED'} ${esc(s)}</span>
 <div class="small"><b>${esc(c.id.split('|').slice(0,1)[0])}</b> ${esc(c.id.split('|').slice(2).join(' · '))}</div>
 <div class="small dim">in-sample n ${esc(c.in_sample?.n)} · ${pc(c.in_sample?.mean,3)}/trade · t ${(+c.in_sample?.t||0).toFixed(2)}</div>
 <div class="small">2026 OOS n <b>${esc(c.oos?.n)}</b> · win ${pc(c.oos?.win,0)} · PF ${(+c.oos?.pf||0).toFixed(2)} · net <b class="${(c.oos?.net||0)>0?'up':'dn'}">${pc(c.oos?.net)}</b> · −3SE ${pc(c.oos?.m3se)} · maxDD ${pc(c.oos?.maxdd)}</div></div>`).join('')||(s!=='MINED'?'<div class="dim small rs-empty">none</div>':'')}</div>`).join('')}</div>`;}
function scanner(s){if(!s)return '<div class="dim small">scanner not published yet</div>';const F=s.forecast||{};
 return `<div class="rs-sc">${Object.entries(F).map(([c,f])=>{const w=Math.min(100,f.exp_3h_move/0.025*100);return `<div class="rs-co"><div class="row"><b>${esc(c)}</b><span class="rs-reg ${esc(f.regime)}">${esc(f.regime)}</span></div>
 <div class="rs-vbar"><span style="width:${w.toFixed(1)}%"></span><i style="left:${(0.0096/0.025*100).toFixed(1)}%" title="3x maker fee"></i><i style="left:${(0.0186/0.025*100).toFixed(1)}%" title="3x taker fee"></i></div>
 <div class="small">expected 3h move <b>${pc(f.exp_3h_move)}</b> · paper ${f.paper_allowed?'<b class="up">allowed</b>':'<b class="dn">blocked</b>'}</div></div>`}).join('')}</div>
 <div class="small dim">Forecasts size only, never direction. BIG ≥ 1.86% (3× taker fee) · MAKER_OK ≥ 0.96% (3× maker) · model trained ${esc(s.model_trained)} SAST, weekly retrain only · accuracy: ${s.accuracy?.scored?`${s.accuracy.scored} scored, regime hit ${pc(s.accuracy.regime_hit,0)}, corr ${esc(s.accuracy.log_corr??'—')}`:'scoring starts 3h after the first forecast'}</div>
 <div class="small">${(s.alerts||[]).slice(0,4).map(a=>`<div class="rs-al">⚑ ${esc(a.ts)} ${esc(a.coin)} ${esc(a.cond)} <span class="dim">${esc(a.note)}</span></div>`).join('')||'<span class="dim">no pattern alerts</span>'}</div>`;}
function dial(v,label){const f=Math.max(0,Math.min(1,(v??0)/100)),a=-120+240*f,col=v<25?'var(--r)':v<45?'#ff9f43':v<55?'var(--a)':v<75?'#9be15d':'var(--g)';
 return `<svg viewBox="0 0 120 80" class="rs-dial"><path d="M15 70 A50 50 0 1 1 105 70" stroke="#143a26" stroke-width="9" fill="none"/><path d="M15 70 A50 50 0 1 1 105 70" stroke="${col}" stroke-width="9" fill="none" pathLength="100" stroke-dasharray="${(f*100).toFixed(1)} 100"/><line x1="60" y1="62" x2="60" y2="22" stroke="${col}" stroke-width="3" transform="rotate(${a} 60 62)"/><text x="60" y="78" text-anchor="middle" fill="currentColor" font-size="13">${esc(v??'—')} ${esc(label||'')}</text></svg>`;}
function gauge(fr){const v=(fr??0)*8*100,f=Math.max(-1,Math.min(1,v/0.05));return `<div class="rs-fg"><span style="left:${(50+f*50).toFixed(1)}%"></span></div><div class="small">${fr==null?'—':(v>=0?'+':'')+v.toFixed(4)+'% / 8h'}</div>`;}
function cd(n){if(!n)return '<span class="dim">no high-impact USD event this week</span>';const s=Math.max(0,(Date.parse(n.utc)-Date.now())/1000);
 return `<b>${esc(n.title)}</b> in <b class="rs-cd" data-t="${esc(n.utc)}">${Math.floor(s/86400)}d ${String(Math.floor(s%86400/3600)).padStart(2,'0')}h ${String(Math.floor(s%3600/60)).padStart(2,'0')}m</b>`;}
function intel(i){if(!i)return '<div class="dim small">Market Intel not published yet</div>';const M=i.market||{},age=i.updated_epoch?Math.round(Date.now()/1000-i.updated_epoch):null;
 const ev=(i.events||[]).slice(0,10);
 return `<div class="row"><span class="ban">■ MARKET INTEL</span><button id="rsRef" class="rs-btn">⟳ refresh</button><span class="dim small" id="rsAge" data-e="${esc(i.updated_epoch)}">updated ${age==null?'—':age+'s'} ago</span>
 ${i.no_trade?.active?`<span class="badge off">NO-TRADE · ${esc((i.no_trade.why||[]).join(', '))}</span>`:'<span class="badge live">TRADE WINDOW OPEN</span>'}</div>
 <div class="rs-ig">${Object.entries(M).map(([c,m])=>`<div class="rs-co"><div class="row"><b>${esc(c)}</b><span>$${num(m.price)}</span></div>
  <div class="small dim">order book ±0.5% · bid ${num(m.depth_bid_usd)} / ask ${num(m.depth_ask_usd)}</div>
  <div class="rs-heat"><span style="width:${(50+50*(m.imbalance||0)).toFixed(1)}%"></span></div><div class="small">imbalance ${(m.imbalance>=0?'+':'')+(+m.imbalance||0).toFixed(2)} · OI ${num(m.open_interest)} · liquidations <span class="dim">n/a</span></div>
  <div class="small dim">funding</div>${gauge(m.funding_rel_1h)}</div>`).join('')}
 <div class="rs-co"><div class="small dim">Fear &amp; Greed</div>${dial(i.fng?.value,i.fng?.label)}<div class="small">BTC dominance ${esc(i.global?.btc_dominance??'—')}% · stablecoins $${i.global?.stablecoin_mcap_usd?(i.global.stablecoin_mcap_usd/1e9).toFixed(1)+'B':'—'}</div><div class="small">next: ${cd(i.next_event)}</div></div></div>
 <div class="rs-feed">${ev.map(e=>`<div class="rs-ev ${esc(e.kind)}${e.shock?' shock':''}">${e.shock?'<i class="rs-ring"></i>':''}<span class="dim">${esc(String(e.ts).slice(11,16))}</span> <b>${esc(e.kind.toUpperCase())}</b> ${e.link?`<a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.text)}</a>`:esc(e.text)}</div>`).join('')||'<div class="dim small">no events yet</div>'}</div>`;}
const LN=['IDEA','BACKTEST','OUT-OF-SAMPLE','48H PAPER','GATE','PROVEN'];
function engine(e){const q=e?.queue||[],b=e?.brain||{},L=e?.lanes||{},c=e?.counts||{},dg=e?.digest;
 return `<div class="row"><span class="ban">■ RESEARCH ENGINE</span><span class="dim small">box worker · local 3B model · zero Grok · paper only</span></div>
 <div class="rs-box"><input id="rsIn" placeholder="type a topic, or paste a reel / YouTube / article link" maxlength="300"><button id="rsGo" class="rs-btn">run</button><span id="rsMsg" class="dim small"></span></div>
 <div class="rs-eg"><div class="rs-brain ${b.step?'on':''}"><div class="rs-core"></div><div class="small"><b>brain</b><br>${b.step?esc(b.step):'idle · waiting for jobs'}</div></div>
 <div class="small"><b>queue</b>${q.slice(0,5).map(j=>`<div class="rs-q ${esc(j.status)}"><b>#${esc(j.id)}</b> ${esc(j.type)} · ${esc(j.status)} <span class="dim">${esc(String(j.input||'').slice(0,60))}</span>${j.status==='running'?`<div class="dim">${esc((j.log||[]).slice(-1)[0]||'')}</div>`:j.result?`<div class="dim">${esc(j.result)}</div>`:''}</div>`).join('')||'<div class="dim">empty</div>'}</div>
 <div class="small"><b>record</b><br>${num(c.total)} ideas · ${num(c.died)} died · ${num(c.not_testable)} not testable · ${num(c.duplicate)} duplicate · ${num(c.advanced)} advanced<br><span class="dim">research penalty family: ${num(e?.penalty?.variants)} variants over ${num(e?.penalty?.ideas)} ideas (separate from the miner's 1,416)</span>${dg?`<br><b>digest ${esc(dg.date)}</b>: ${num(dg.new)} new · ${(dg.died||[]).length} died · ${(dg.advanced||[]).length} advanced`:''}</div></div>
 <div class="rs-lanes six">${LN.map(s=>`<div class="rs-lane"><div class="rs-lh">${s}</div>${(L[s]||[]).slice(0,6).map(i=>`<div class="rs-card ${i.status==='DIED'?'dead':i.status==='NOT TESTABLE'||i.status==='DUPLICATE'?'na':'ok'} slide"><span class="badge ${i.status==='DIED'?'off':'warn'}">${esc(i.status)}</span> <span class="dim">${esc(i.src)}</span>
 <div class="small">${i.link?`<a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title)}</a>`:esc(i.title)}</div>${i.why?`<div class="small dim">${esc(i.why)}</div>`:''}</div>`).join('')||'<div class="dim small rs-empty">—</div>'}</div>`).join('')}</div>`;}
function render(){const el=document.getElementById('research');if(!el)return;const m=R.research?.miner;
 el.innerHTML=`<div class="panel"><div class="row"><span class="ban">■ RESEARCH · PRE-MOVE MINER · PAPER ONLY</span><span class="dim small">${R.err?esc(R.err):`updated ${esc(R.research?.updated_sast||'—')} SAST`}</span></div>
 <p class="small">${m?`<b>${num(m.variants_tried)}</b> variants mined on 2024–2025, <b class="dn">${num(m.in_sample_pass)} passed</b> the multiple-testing penalty. The top 3 were preregistered (sha <code>${esc(String(m.prereg_sha||'').slice(0,16))}</code>) and tested once on 2026: <b class="dn">${num(m.survivors)} survived</b>. Nothing goes to paper.`:'miner results not published yet'}</p>${minerLanes(m)}</div>
 <div class="panel"><div class="row"><span class="ban">■ 24/7 VOLATILITY SCANNER</span></div>${scanner(R.research?.scanner)}</div>
 <div class="panel" id="rsIntel">${intel(R.intel)}</div><div class="panel">${engine(R.research_engine)}</div>`;
 const sh=(R.intel?.events||[]).find(e=>e.shock);if(sh&&sh.ts+sh.text!==lastEv){lastEv=sh.ts+sh.text;document.getElementById('rsIntel')?.classList.add('rs-pulse');setTimeout(()=>document.getElementById('rsIntel')?.classList.remove('rs-pulse'),2500);}
 wire();}
async function job(type,input){const m=document.getElementById('rsMsg');try{await sb('run_requests',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({idea_ref:'rq:'+type,title:String(input).slice(0,300)})});if(m)m.textContent='queued: the box picks it up within ~10s';setTimeout(tick,1500);}
 catch(e){if(m)m.textContent='could not queue: '+(e.message||e);}}
function wire(){const g=document.getElementById('rsGo'),i=document.getElementById('rsIn');if(g)g.onclick=()=>{const v=(i.value||'').trim();if(!v)return;job(/^https?:\/\//.test(v)?'link':'topic',v);i.value='';};
 if(i)i.onkeydown=e=>{if(e.key==='Enter')g.click();};
 const r=document.getElementById('rsRef');if(r)r.onclick=()=>{r.classList.remove('sweep');void r.offsetWidth;r.classList.add('sweep');job('refresh','app');};}
function ages(){const a=document.getElementById('rsAge');if(a&&a.dataset.e)a.textContent=`updated ${Math.max(0,Math.round(Date.now()/1000-+a.dataset.e))}s ago`;
 document.querySelectorAll('.rs-cd').forEach(c=>{const s=Math.max(0,(Date.parse(c.dataset.t)-Date.now())/1000);c.textContent=`${Math.floor(s/86400)}d ${String(Math.floor(s%86400/3600)).padStart(2,'0')}h ${String(Math.floor(s%3600/60)).padStart(2,'0')}m ${String(Math.floor(s%60)).padStart(2,'0')}s`;});}
async function tick(){if(document.hidden||document.getElementById('t-research')?.classList.contains('hidden'))return;
 if(busy)return;busy=true;try{await load();const f=document.activeElement?.id==='rsIn'?document.getElementById('rsIn').value:null;render();if(f!=null){const i=document.getElementById('rsIn');i.value=f;i.focus();}}finally{busy=false;}}
export async function show(){const el=document.getElementById('research');if(!el)return;if(!el.innerHTML)el.innerHTML='<div class="panel"><div class="dim small">loading research…</div></div>';
 await tick();if(!T){T=setInterval(tick,10000);setInterval(ages,1000);}}
