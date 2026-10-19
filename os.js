// SUPER TRADING OS modules (lazy). PAPER/DEMO ONLY.
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(v,d=2)=>v==null||!isFinite(v)?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const M=(v,d)=>window.M(v,d),dp=p=>p>=1000?1:p>=10?2:p>=1?4:5,sast=ts=>ts?new Date((ts+7200)*1000).toISOString().slice(0,16).replace('T',' '):'—';
const L={};let labSum=null;
const pct=v=>v==null?'—':(v>=0?'+':'')+fmt(v)+'%';
export async function show(t){if(t==='markets')await markets();if(t==='proof')proof(true);if(t==='engine')learn(true);}
export function update(t,force){if(t==='proof')proof(force);if(t==='engine')learn(force);if(t==='markets'&&force)markets(true);}
// ---------------- MARKETS & LAB
async function markets(force){if(!labSum||force){try{labSum=await (await fetch('/api/lab?key=summary')).json();}catch(e){labSum=null;}}
 const s=labSum;if(!s||s.error||!Array.isArray(s.symbols)){$('#lab').innerHTML=`<div class="panel"><div class="ph"><b>MARKETS</b></div><p class="dim small">${s&&s.error?'Market list not published yet.':'Market list unavailable (sign in, or try again shortly).'}</p></div>`;return;}
 const row=x=>x.error?`<tr><td>${esc(x.name)}</td><td colspan=2 class="dim">data error</td></tr>`:`<tr><td><b>${esc(x.name)}</b></td><td>${fmt(x.last,dp(x.last))}</td><td class="${x.chg_24h_pct>=0?'up':'dn'}">${pct(x.chg_24h_pct)}</td></tr>`;
 const tbl=k=>`<div class="tw"><table><tr><th scope="col">SYMBOL</th><th scope="col">LAST</th><th scope="col">24H</th></tr>${s.symbols.filter(x=>x.kind===k).map(row).join('')}</table></div>`;
 $('#lab').innerHTML=`<div class="panel"><div class="ph"><b>MARKETS</b><span class="dim small">snapshot ${sast(s.generated_at)} SAST · refreshed every 4h by the bot box · strategy research lives in <a href="/rnd" data-go="rnd">R&amp;D →</a></span></div>
 <h4 class="dim">CRYPTO · Kraken (live)</h4>${tbl('crypto')}<h4 class="dim">FOREX &amp; GOLD · Yahoo (unofficial, delayed)</h4>${tbl('fx')}</div>`;}
// ---------------- ENGINE LEARNING LOOP + GUARDS
let cal=null;
async function learn(force){const s=window.S.d?.state;if(!s){$('#learn').innerHTML='';return;}const k=JSON.stringify([s.generated_at,window.CUR]);if(!force&&L.learn===k)return;L.learn=k;
 if(!cal)try{cal=await (await fetch('/api/calendar')).json();}catch{cal={events:[]};}
 const h=s.bot_health||{},fuel=h.risk_fuel,g=h.guard,now=Date.now()/1000;const up=(cal.events||[]).filter(e=>e.impact==='High'&&Date.parse(e.date)/1000>now-3600).slice(0,6);
 const vers=s.proof?.versions||[];const fp=fuel?Math.max(0,Math.min(100,fuel.remaining_pct)):100;
 $('#learn').innerHTML=`<div class="row2"><div class="panel"><div class="ph"><b>LEARNING LOOP</b><span class="dim small">${vers.length} version(s) · ${s.challenge.deaths} death(s) · full version history in <a href="/bot" data-go="bot" data-sec="botVers">Bot › Version leaderboard →</a></span></div>
 <div class="ph"><b>LESSONS</b></div><ol class="feed">${(s.lessons||[]).slice().reverse().map(l=>`<li><span class="t">${esc(l.ts)} ${esc(l.version)}</span><span>${esc(l.lesson)}</span></li>`).join('')}</ol>
 <div class="ph" style="margin-top:10px"><b>REBUILD CANDIDATES (from strategy lab)</b></div><p class="small">${s.rebuild_candidates?.candidates?.length?s.rebuild_candidates.candidates.map(c=>`${esc(c.symbol)}: ${esc(c.family)} (${c.params.join(', ')}) grade ${c.grade}`).join('<br>'):'None qualify yet: no crypto strategy passed out-of-sample after fees. On the next death the bot respawns on the pulse-engine baseline.'}</p></div>
 <div class="panel"><div class="ph"><b>RISK FUEL · DAILY LOSS BUDGET</b><span class="dim small">10% of start-of-day equity</span></div>
 <svg viewBox="0 0 200 110" style="width:100%;max-width:280px"><path d="M20 100 A80 80 0 0 1 180 100" stroke="#13261c" stroke-width="14" fill="none"/><path d="M20 100 A80 80 0 0 1 180 100" stroke="${fp>50?'#39ff88':fp>20?'#ffd23f':'#ff3b5c'}" stroke-width="14" fill="none" stroke-dasharray="${(fp/100*251).toFixed(1)} 400"/><text x="100" y="92" text-anchor="middle" style="fill:#effff5;font-size:22px;font-weight:800">${fmt(fp,0)}%</text></svg>
 <p class="small">${fuel?`Budget ${M(fuel.budget_usd)} today · realized ${M(fuel.realized_today_usd)}. When the tank hits 0 the bot stops opening trades until tomorrow (SAST).`:'Fuel data appears after the next bot tick.'}</p>
 <div class="ph" style="margin-top:10px"><b>NEWS GUARD</b><span class="${g?.paused?'dn':'up'} small">${g?.paused?'PAUSED: '+esc(g.reasons.join('; ')):'clear, bot may trade'}</span></div>
 <p class="dim small">Pauses new entries ±30 min around High-impact USD events. Source: ${esc(cal.source||'ForexFactory weekly feed')}.</p>
 <ol class="feed">${up.map(e=>`<li><span class="t">${sast(Math.floor(Date.parse(e.date)/1000))}</span><span><b>${esc(e.country)}</b> ${esc(e.title)} <span class="dn">HIGH</span></span></li>`).join('')||'<li class="dim">No high-impact events ahead this week.</li>'}</ol></div></div>`;}
// ---------------- PROOF
function proof(force){const s=window.S.d?.state;if(!s){$('#proof').innerHTML='<div class="panel">No bot state yet.</div>';return;}const k=JSON.stringify([s.generated_at,window.CUR]);if(!force&&L.proof===k)return;L.proof=k;
 const P=s.proof||{},tr=P.all_trades||[],eq=P.equity_curve||[],st=s.stats,sells=tr.filter(t=>t.action==='SELL');
 const pnl=sells.map(t=>+t.pnl_usd||0),gw=pnl.filter(x=>x>0).reduce((a,b)=>a+b,0),gl=-pnl.filter(x=>x<0).reduce((a,b)=>a+b,0);
 let pk=0,dd=0;for(const e of eq){pk=Math.max(pk,e.equity_usd);dd=Math.max(dd,pk?1-e.equity_usd/pk:0);}
 const notes=JSON.parse(localStorage.getItem('nl_journal')||'{}');
 $('#proof').innerHTML=`<div class="panel"><div class="ph"><b>PROOF · TRACK RECORD (PAPER)</b><span class="dim small">chain head #${esc((P.chain_head||'').slice(0,16))} · ${tr.length} fills</span></div>
 <p class="headline">Every paper fill the bot has ever made, linked in a SHA-256 hash chain (each row's hash includes the previous one), so editing history would break the chain. Nothing is cherry-picked, and dead versions stay on the record.</p>
 <div class="kpis"><div class="kpi"><div class="l">CLOSED TRADES</div><div class="v">${sells.length}</div></div><div class="kpi"><div class="l">WIN RATE</div><div class="v">${sells.length?fmt(pnl.filter(x=>x>0).length/sells.length*100,0)+'%':'—'}</div></div>
 <div class="kpi"><div class="l">PROFIT FACTOR</div><div class="v">${gl?fmt(gw/gl):'—'}</div></div><div class="kpi"><div class="l">NET REALIZED</div><div class="v">${M(st.realized_pnl_usd)}</div></div>
 <div class="kpi"><div class="l">MAX DRAWDOWN (equity log)</div><div class="v">${fmt(dd*100,1)}%</div></div><div class="kpi"><div class="l">VERSIONS / DEATHS</div><div class="v">${(P.versions||[]).length} / ${s.challenge.deaths}</div></div></div>
 ${sells.length<30?'<p class="small" style="color:#ffd23f">Fewer than 30 closed trades, so these stats prove nothing yet.</p>':''}
 <canvas id="eqc" style="width:100%;height:200px"></canvas><p class="dim small">Equity per bot tick (paper). ${eq.length} points.</p>
 <div class="row"><button id="csv" class="ibtn wide">⬇ Export trades CSV</button><button id="csv2" class="ibtn wide">⬇ Export versions CSV</button></div></div>
 <details class="adv panel" open><summary>All fills (${tr.length}) with hash chain</summary><div class="tw"><table><tr><th>TIME SAST</th><th>VER</th><th>PAIR</th><th>SIDE</th><th>PRICE</th><th>P&amp;L</th><th>REASON / PULSE</th><th>ENGINE</th><th>HASH</th></tr>${tr.slice().reverse().map(t=>`<tr><td>${esc(t.time_SAST)}</td><td>${esc(t.version)}</td><td>${esc(t.pair)}</td><td>${esc(t.action)}</td><td>${esc(t.price)}</td><td>${t.pnl_usd?M(+t.pnl_usd):''}</td><td class="dim">${esc(t.reason)}</td><td class="dim">${esc(t.engine_hash||'')}</td><td class="dim">${esc(t.chain_hash.slice(0,10))}</td></tr>`).join('')||'<tr><td colspan=9 class="dim">No fills yet. The bot has stayed flat because no coin passed all checks.</td></tr>'}</table></div></details>
 <details class="adv panel"><summary>Trade journal (private notes, stored in this browser only)</summary><textarea id="jn" style="width:100%;height:120px;background:#06110b;color:#d4ffe6;border:1px solid #143a26;font:inherit" placeholder="What did you learn today?">${esc(notes[new Date().toISOString().slice(0,10)]||'')}</textarea><button id="jsave" class="ibtn wide">Save note</button> <span class="dim small">${Object.keys(notes).length} day(s) noted</span></details>`;
 const c=$('#eqc'),x=c.getContext('2d'),W=c.width=c.clientWidth*devicePixelRatio,H=c.height=c.clientHeight*devicePixelRatio;if(eq.length>1){const v=eq.map(e=>e.equity_usd),lo=Math.min(...v,s.challenge.start_usd),hi=Math.max(...v,s.challenge.start_usd);
  const Y=y=>H-8-(y-lo)/(hi-lo||1)*(H-16);x.strokeStyle='#ffd23f';x.setLineDash([6,6]);x.beginPath();x.moveTo(0,Y(s.challenge.start_usd));x.lineTo(W,Y(s.challenge.start_usd));x.stroke();x.setLineDash([]);
  x.strokeStyle='#39ff88';x.lineWidth=2*devicePixelRatio;x.shadowColor='#39ff88';x.shadowBlur=8;x.beginPath();v.forEach((y,i)=>{const X=i/(v.length-1)*W;i?x.lineTo(X,Y(y)):x.moveTo(X,Y(y));});x.stroke();}
 else{x.fillStyle='#5f8f75';x.font=`${12*devicePixelRatio}px monospace`;x.fillText('Equity curve starts filling from the next ticks.',10,30*devicePixelRatio);}
 const dl=(name,rows)=>{const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=name;a.click();};
 $('#csv').onclick=()=>{const k=['time_SAST','version','workspace','pair','action','qty','price','cost_usd','fee_usd','sl','tp','pnl_usd','reason','engine_version','engine_hash','prev_hash','chain_hash'];dl('northline_paper_trades.csv',[k,...tr.map(t=>k.map(c=>t[c]))]);};
 $('#csv2').onclick=()=>{const v=P.versions||[],k=v[0]?Object.keys(v[0]):[];dl('northline_versions.csv',[k,...v.map(r=>k.map(c=>r[c]))]);};
 $('#jsave').onclick=()=>{notes[new Date().toISOString().slice(0,10)]=$('#jn').value;localStorage.setItem('nl_journal',JSON.stringify(notes));L.proof=null;proof(true);};}
