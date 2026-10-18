// PAPER squad reader (lab row 'squad', written by the box tick). Read-only. Shared by R&D and the Bot tab.
// Fetched once per tab visit at most every 60 s; no polling.
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let C=null,at=0,inflight=null;
export async function loadSquad(){if(at&&Date.now()-at<60000)return C;if(inflight)return inflight;
 inflight=(async()=>{try{const r=await fetch('/api/lab?key=squad');const j=r.ok?await r.json():null;C=j&&Array.isArray(j.bots)?j:null;}catch{C=null;}at=Date.now();inflight=null;return C;})();return inflight;}
const ts2ms=t=>t?Date.parse(String(t).replace(' ','T').slice(0,16)+':00+02:00'):0,$m=v=>v==null?'—':'$'+Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
export function botView(q,b){const st=q.stats||{},S0=q.start||1000,DL=q.death_line||500,eq=b.equity??b.cash,dth=(q.deaths||[]).filter(x=>(x.bot||x.id)===b.id),deaths=Math.max(dth.length,(b.life||1)-1),
 recent=dth.find(x=>Date.now()-ts2ms(x.time_sast)<6*3600e3),open=b.open||[],n=(b.strats||[]).reduce((a,x)=>a+(st[x.id]?.n||0),0);
 const status=recent?['r',`respawned ${recent.time_sast} SAST`]:eq<DL*1.2?['r','near the death line']:open.length?['g',`in ${open.length} position${open.length>1?'s':''}`]:n?['dim','flat, waiting for setups']:['dim','waiting for first setup'];
 return{eq,ch:eq-S0,S0,DL,deaths,recent,open,n,status,strats:(b.strats||[]).map(x=>{const t=st[x.id];return{x,t,txt:t&&t.n?`${t.n} fwd · win ${Math.round(100*(t.win_rate??t.wins/t.n))}% · avg R ${(t.R/t.n).toFixed(2)}`:'no trades yet'};})};}
export async function showBots(sel='#botSquad'){const el=document.querySelector(sel);if(!el)return;if(!el.innerHTML)el.innerHTML='<div class="panel bs"><div class="dim small">loading the PAPER squad…</div></div>';
 const q=await loadSquad();
 if(!q){el.innerHTML=`<div class="panel bs"><div class="row"><span class="ban">■ PAPER SQUAD</span></div><div class="dim small">No squad data published yet (lab row 'squad' missing, or you are not signed in). Nothing is shown rather than made up.</div></div>`;return;}
 const V=q.bots.map(b=>[b,botView(q,b)]),tot=V.reduce((a,[,v])=>a+v.eq,0),S0=q.start||1000;
 el.innerHTML=`<div class="panel bs"><div class="row"><span class="ban">■ PAPER SQUAD · ${esc(q.bots.map(b=>b.id).join(' '))} · NO LIVE MONEY</span><span class="dim small">updated ${esc(q.updated_sast||'—')} SAST · <a href="/rnd" data-go="rnd">details in R&amp;D →</a></span></div>
 <p class="dim small">${V.length} PAPER bots trading unproven strategies on purpose (pinned bots keep their strategy; S7 trades confirmed news alerts), beside the v5 bot above. Forward evidence only: nothing here sets the v5 bot's rules, sizing or risk. Squad equity ${$m(tot)} of ${$m(S0*V.length)}.</p>
 <div class="bs-g">${V.map(([b,v])=>`<details class="bs-c"><summary><div class="bs-h"><b>${esc(b.id)}</b><span class="bs-p">PAPER</span>${b.pinned?'<span class="bs-p" style="color:#ffd23f;border-color:#ffd23f">PINNED</span>':''}${b.kind?`<span class="bs-p">${esc(b.kind)}</span>`:''}<span class="small ${v.status[0]}">${esc(v.status[1])}</span></div>
  <div class="bs-v">${$m(v.eq)}</div><div class="small ${v.ch>0?'up':v.ch<0?'dn':'dim'}">${v.ch>=0?'+':'−'}${$m(Math.abs(v.ch))} · life ${b.life||1} · ${v.deaths} death${v.deaths===1?'':'s'}</div>
  <div class="bs-bar"><i style="width:${Math.max(2,Math.min(100,v.eq/(S0*1.5)*100))}%;background:${v.eq<v.DL*1.2?'#ff3b5c':v.eq<S0?'#ffb347':'#39ff88'}"></i><em style="left:${v.DL/(S0*1.5)*100}%"></em></div>
  <div class="dim small">${(b.strats||[]).length} strategies · ${v.open.length} open · ${v.n?v.n+' closed':'no trades yet'} <span class="bs-more">tap for details</span></div></summary>
  <div class="bs-d"><div class="small">start ${$m(v.S0)} · death below ${$m(v.DL)} · born ${esc(b.born_sast||'—')} SAST${b.pinned?' · <b>pinned</b>: strategy fixed, no respawn swap':''}${b.note?' · '+esc(b.note):''}${v.recent?` · <b class="dn">died ${esc(v.recent.time_sast)} SAST at ${$m(v.recent.equity)}, respawned with new strategies</b>`:''}</div>
  <div class="small">${v.open.length?'open: '+v.open.map(p=>`${esc(p.m)} @ ${esc(p.entry)} (SL ${esc(p.sl??'—')})`).join(', '):'no open positions'} · ${b.closed||0} closed this life</div>
  <ul>${v.strats.map(s=>`<li><b>${esc(s.x.family||'?')} ${esc(s.x.tf||'')}</b> <span class="${s.t&&s.t.n?'':'dim'}">${esc(s.txt)}</span><br><span class="dim">${esc(s.x.id)} · ${s.x.tested?`lab OOS n ${s.x.oos_n??'—'} · ΣR ${s.x.oos_total_R??'—'}`:'untested in lab'}</span></li>`).join('')}</ul></div></details>`).join('')}</div></div>`;
 el.querySelector('[data-go]')?.addEventListener('click',e=>{e.preventDefault();window.go&&window.go('rnd');});}
