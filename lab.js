// Idea Lab (display only, PAPER ONLY). Reads bot_state row 'lab' (written by the box lab_runner.py, no AI) via the shared
// heartbeat request window.NL_HB. The spec builder only produces JSON to download/copy; the static site never writes to the box.
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pc=v=>v==null||!isFinite(v)?'—':(v*100).toFixed(3)+'%',wr=v=>v==null?'—':Math.round(v*100)+'%';
const BL_DEF={ema_trend:{defaults:{n:50},desc:'filter: long above EMA(n), short below'},ema_cross:{defaults:{fast:9,slow:21},desc:'trigger: fast EMA crosses slow EMA'},rsi:{defaults:{n:14,lo:30,hi:70,mode:'reversal'},desc:'reversal | momentum | no_chase'},roc:{defaults:{n:12,thr:1.5,mode:'momentum'},desc:'rate of change, thr in %'},breakout:{defaults:{n:20},desc:'close beyond n-bar high/low'},wickless:{defaults:{wick_pct:0.05,body_atr:0.2},desc:'candle with no wick on the open side'},sweep:{defaults:{n:3,max_atr:1.5},desc:'liquidity sweep of last fractal'},atr_regime:{defaults:{min_pct:0.2,max_pct:5},desc:'ATR % of price band'}};
let D=null,blocks=[];
async function load(){let d=window.NL_HB?.lab||null;
 if(!d&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){try{const r=await fetch('/lab_demo.json',{cache:'no-store'});if(r.ok)d=await r.json();}catch{}}
 return d;}
function idea(x){const v=x.verdict==='PASS'?'up':x.verdict==='FAIL'?'dn':'a';
 return `<details class="panel lb-i"><summary><div class="row"><b>${esc(x.title||x.id)}</b><span class="badge ${x.verdict==='PASS'?'live':'off'}">${esc(x.verdict)}</span>${x.slot?`<span class="paper-tag">${esc(x.slot)} PAPER-TESTING</span>`:''}</div>
 <div class="small"><span class="${v}">${esc(x.why||'')}</span></div>
 <div class="small dim">prereg sha <b>${esc(x.prereg_sha||'—')}</b> · tested ${esc(x.tested_sast||'—')} SAST · ${esc(x.variants??'—')} variants · best ${esc(x.best_tf||'—')} ${esc(JSON.stringify(x.best_params||{}))} · OOS n ${esc(x.oos_n??'—')} · mean ${pc(x.oos_mean)} · win ${wr(x.oos_wr)} · ${esc(x.source||'')}</div></summary>
 <div class="lb-t"><table class="small"><thead><tr><th>tf</th><th>params</th><th>IS n</th><th>IS mean</th><th>IS −3SE</th><th>OOS n</th><th>OOS mean</th><th>OOS −3SE</th><th>OOS win</th></tr></thead><tbody>
 ${(x.rows||[]).map(r=>`<tr><td>${esc(r.tf)}</td><td>${esc(Object.entries(r.params||{}).map(([k,v])=>k+'='+v).join(' '))}</td><td>${esc(r.is_n)}</td><td>${pc(r.is_mean)}</td><td>${pc(r.is_lb)}</td><td>${esc(r.oos_n)}</td><td class="${r.oos_mean>0?'up':'dn'}">${pc(r.oos_mean)}</td><td class="${r.oos_lb>0?'up':'dn'}">${pc(r.oos_lb)}</td><td>${wr(r.oos_wr)}</td></tr>`).join('')}</tbody></table></div></details>`;}
function builder(d){const BL=d?.blocks||BL_DEF,coins=d?.coins||['XBT','ETH','SOL','XRP','ADA','DOGE','LINK','AVAX','LTC','DOT'],tfs=d?.tfs||['5m','15m','1h','4h'];
 return `<div class="panel"><div class="row"><span class="ban">■ SPEC BUILDER</span><span class="dim small">builds a JSON spec · drop it into /workspace/challenge/lab/queue/ on the box · nothing is sent from here</span></div>
 <div class="lb-f small"><label>id <input id="lbId" value="my-idea-1" pattern="[A-Za-z0-9_-]+"></label><label>title <input id="lbTitle" value="My idea"></label><label>source <input id="lbSrc" placeholder="reel link / note"></label>
 <label>sides <select id="lbSides"><option>both</option><option>long</option><option>short</option></select></label>
 <label>timeframes ${tfs.map(t=>`<span><input type="checkbox" class="lbTf" value="${esc(t)}" ${t==='1h'?'checked':''}>${esc(t)}</span>`).join(' ')}</label>
 <label>coins ${coins.map(c=>`<span><input type="checkbox" class="lbCoin" value="${esc(c)}" checked>${esc(c)}</span>`).join(' ')}</label></div>
 <div class="lb-f small"><label>add block <select id="lbBlk">${Object.keys(BL).map(k=>`<option value="${esc(k)}">${esc(k)} — ${esc(BL[k].desc)}</option>`).join('')}</select></label><button id="lbAdd" class="lb-b">+ add</button></div>
 <div id="lbBlocks" class="small"></div>
 <div class="lb-f small"><label>stop (× ATR) <select id="lbStop">${[1,1.5,2,3].map(v=>`<option ${v===1.5?'selected':''}>${v}</option>`).join('')}</select></label><label>target (R) <select id="lbTp">${[1,1.5,2,3].map(v=>`<option ${v===2?'selected':''}>${v}</option>`).join('')}</select></label><label>time stop (bars) <select id="lbHold">${[12,24,48,96].map(v=>`<option ${v===48?'selected':''}>${v}</option>`).join('')}</select></label>
 <label>grid: target R also <input id="lbGrid" placeholder="e.g. 1.5,3"></label></div>
 <pre id="lbOut" class="lb-o"></pre><div class="lb-f"><button id="lbCopy" class="lb-b">copy JSON</button><button id="lbDl" class="lb-b">download .json</button><span id="lbMsg" class="dim small"></span></div>
 <div class="dim small">Gates applied on the box (cannot be lowered here): 0.62% cost per trade, 70/30 split, OOS n ≥ 30 and mean − 3SE &gt; 0. Preregistration sha is written before the run.</div></div>`;}
function spec(){const v=id=>document.getElementById(id)?.value,ch=c=>[...document.querySelectorAll(c+':checked')].map(x=>x.value),tp=+v('lbTp');
 const g=(v('lbGrid')||'').split(',').map(Number).filter(x=>x>0),s={id:(v('lbId')||'idea').replace(/[^A-Za-z0-9_-]/g,'-'),title:v('lbTitle')||'',source:v('lbSrc')||'',coins:ch('.lbCoin'),tfs:ch('.lbTf'),sides:v('lbSides'),
  blocks:blocks.map(b=>({type:b.type,params:{...b.params}})),exit:{atr_stop:+v('lbStop'),target_R:tp,hold_bars:+v('lbHold')}};
 if(g.length)s.grid={'exit.target_R':[...new Set([tp,...g])]};return s;}
function draw(){const el=document.getElementById('lbBlocks');if(!el)return;
 el.innerHTML=blocks.length?blocks.map((b,i)=>`<div class="lb-blk"><b>${i}. ${esc(b.type)}</b> ${Object.entries(b.params).map(([k,v])=>`<label>${esc(k)} ${k==='mode'?`<select data-i="${i}" data-k="${esc(k)}">${['reversal','momentum','no_chase'].map(m=>`<option ${m===v?'selected':''}>${m}</option>`).join('')}</select>`:`<input data-i="${i}" data-k="${esc(k)}" value="${esc(v)}" size="5">`}</label>`).join(' ')} <button class="lb-b" data-rm="${i}">✕</button></div>`).join(''):'<span class="dim">no blocks yet: add at least one trigger (sweep, wickless, breakout, ema_cross, rsi, roc)</span>';
 document.getElementById('lbOut').textContent=JSON.stringify(spec(),null,1);}
function wire(d){const BL=d?.blocks||BL_DEF,root=document.getElementById('idealab');
 root.querySelector('#lbAdd').onclick=()=>{const t=root.querySelector('#lbBlk').value;blocks.push({type:t,params:{...BL[t].defaults}});draw();};
 root.addEventListener('input',e=>{const t=e.target;if(t.dataset.i!=null){const v=t.value;blocks[+t.dataset.i].params[t.dataset.k]=t.dataset.k==='mode'||isNaN(+v)?v:+v;}document.getElementById('lbOut').textContent=JSON.stringify(spec(),null,1);});
 root.addEventListener('change',e=>{const t=e.target;if(t.dataset.i!=null)blocks[+t.dataset.i].params[t.dataset.k]=t.value;document.getElementById('lbOut').textContent=JSON.stringify(spec(),null,1);});
 root.addEventListener('click',e=>{const r=e.target.dataset?.rm;if(r!=null){blocks.splice(+r,1);draw();}});
 root.querySelector('#lbCopy').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(spec(),null,1));root.querySelector('#lbMsg').textContent='copied';}catch{root.querySelector('#lbMsg').textContent='copy blocked: select the JSON above';}};
 root.querySelector('#lbDl').onclick=()=>{const s=spec(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(s,null,1)],{type:'application/json'}));a.download=s.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
 draw();}
export async function show(){const el=document.getElementById('idealab');if(!el)return;if(!el.innerHTML)el.innerHTML='<div class="panel"><div class="dim small">loading the Idea Lab…</div></div>';
 D=await load();const d=D,I=d?.ideas||[],S=d?.slots||{},F=d?.forward||{};
 if(!blocks.length)blocks=[{type:'ema_trend',params:{n:50}},{type:'rsi',params:{n:14,lo:30,hi:70,mode:'reversal'}}];
 el.innerHTML=`<div class="panel"><div class="row"><span class="ban">■ IDEA LAB · PAPER ONLY · NO AI CALLS</span><span class="dim small">${d?`updated ${esc(d.updated_sast)} SAST`:'no lab data yet (sign in, or the box has not published the lab row)'}</span></div>
 <p class="dim small">Ideas are backtested on the box by a plain script on Kraken Futures candles. Gate: ${esc(d?.gates||'OOS n ≥ 30 and mean − 3SE > 0 after 0.62% costs')}. A PASS gets one idle bot slot for forward paper testing; a FAIL is just recorded.</p>
 <div class="lb-g small"><div><b>Queue</b><br>${(d?.queue||[]).length?d.queue.map(esc).join('<br>'):'<span class="dim">empty: the box runs new specs every 10 min</span>'}</div>
 <div><b>Bot slots</b><br>${['S2','S18'].map(s=>{const a=S[s],f=F[s];return `${s}: ${a?`testing <b>${esc(a.idea)}</b> since ${esc(a.assigned_sast)}${f?` · ${f.closed} fwd closed · mean ${pc(f.mean)}`:''}`:'<span class="dim">idle</span>'}`;}).join('<br>')}</div>
 <div><b>Record</b><br>${I.filter(x=>x.verdict==='PASS').length} pass · ${I.filter(x=>x.verdict==='FAIL').length} fail · ${I.length} total</div></div></div>
 ${I.map(idea).join('')||''}${builder(d)}`;
 wire(d);}
