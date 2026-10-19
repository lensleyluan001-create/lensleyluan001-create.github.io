'use strict';
// ---------- ONE data loader: every same-origin GET /api/* (except the live /api/all tick and write endpoints) shares one in-flight
// request and a short cache per URL, so tabs/modules asking for the same payload never fire duplicate requests.
(()=>{const F=window.fetch.bind(window),C=new Map(),TTL=u=>/\/api\/state/.test(u)?30000:/\/api\/lab/.test(u)?60000:/\/api\/(calendar|indices)/.test(u)?300000:0;
 window.fetch=(input,o={})=>{const u=typeof input==='string'?input:input&&input.url||'';const m=(o.method||'GET').toUpperCase(),ttl=m==='GET'&&u.startsWith('/api/')?TTL(u):0;if(!ttl)return F(input,o);
  const c=C.get(u);if(c&&Date.now()-c.t<ttl)return c.p.then(r=>new Response(r.b,{status:r.s,headers:{'content-type':'application/json'}}));
  const p=F(input,o).then(async r=>({b:await r.text(),s:r.status}));C.set(u,{t:Date.now(),p});p.then(r=>{if(r.s>=500)C.delete(u);},()=>C.delete(u));
  return p.then(r=>new Response(r.b,{status:r.s,headers:{'content-type':'application/json'}}));};
 window.NL_DATA={stats:()=>({cached:C.size,urls:[...C.keys()]}),clear:()=>C.clear()};})();
const $=s=>document.querySelector(s),SAST=7200,ORD=['XBTUSD','ETHUSD','SOLUSD'],NAME=new Proxy({XBTUSD:'BTC',ETHUSD:'ETH',SOLUSD:'SOL',XDGUSD:'DOGE'},{get:(o,k)=>typeof k!=='string'?o[k]:o[k]??k.replace(/^X(?=[A-Z]{3}USD$)/,'').replace(/USD$/,'')});   // any pair the bot trades gets a readable name
const Q=new URLSearchParams(location.search),DEMO=Q.get('demo');
const S={d:null,tab:'overview',pair:'XBTUSD',tf:15,eng:'XBTUSD',lastOk:0,keys:{},prevScore:{},prevVerdict:{},tradeKeys:null,sound:false,notify:false,idxAt:0};
window.ZAR=null;window.CUR=localStorage.getItem('nl_cur')||'USD';
const M=(v,d=2)=>v==null||!isFinite(v)?'—':(CUR==='ZAR'&&ZAR?'R'+fmt(v*ZAR,d):'$'+fmt(v,d));window.M=M;
const fmt=(v,d=2)=>v==null||!isFinite(v)?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const dp=p=>p>=1000?1:p>=10?2:4, esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sast=ts=>ts?new Date((ts+SAST)*1000).toISOString().slice(0,19).replace('T',' '):'—';
const VC={TAKE:'#39ff88',WATCH:'#ffd23f',STAND_ASIDE:'#3ad7ff'};
const CHECK={bias:['Trend','The bigger 1-hour trend points the same way as the trade (fast average above slow for a buy).'],
 momentum:['Momentum','Price is actually pushing in that direction right now (RSI and 6-hour change), without being overbought.'],
 location:['Entry spot','Price sits on the right side of its short-term 15-minute average, so we are not buying into weakness.'],
 flow:['Buyers vs sellers','The order book is not stacked against us and enough coins are trading (volume is not dead).'],
 volatility:['Movement','The market moves enough to make a trade worth it, but is not in a crazy, dangerous swing.'],
 spread:['Cost to trade','The gap between buy and sell price is tiny, so fees and slippage don\'t eat the trade.']};
const once=(k,v)=>{const j=JSON.stringify(v);if(S.keys[k]===j)return false;S.keys[k]=j;return true;};
// ---------- plain English
function headline(u){const n=NAME[u.pair],ok=Object.values(u.layers).filter(Boolean).length;
 const mood=u.regime==='trend_up'?'trending up':u.regime==='trend_down'?'trending down':u.regime==='high_vol'?'swinging wildly':u.regime==='dead'?'very quiet':'moving sideways';
 const str=u.score>=70?'strong':u.score>=55?'building':u.score>=35?'mixed':'weak';
 const act=u.verdict==='TAKE'?(u.direction==='long'?'the engine says BUY':'the engine sees a SELL setup (the bot only buys, so it skips this)'):u.verdict==='WATCH'?'getting close, so the bot is watching':'the bot is waiting';
 return `${n}: ${str} and ${mood} (${ok}/6 checks pass), ${act}.`;}
function strip(d){const P=d.pulse.pairs,s=d.state,thr=s?.bot?.pulse_min??d.pulse.verdict_rules.take_min;
 const open=s?.challenge?.open_positions||[];const ps=ORD.map(p=>P[p]).filter(Boolean);
 const best=ps.slice().sort((a,b)=>Object.values(b.layers).filter(Boolean).length-Object.values(a.layers).filter(Boolean).length||b.score-a.score)[0];
 const takes=ps.filter(u=>u.verdict==='TAKE'&&u.direction==='long'&&u.score>=thr);
 let st,why;if(open.length){st=`🟢 IN ${open.length} PAPER TRADE${open.length>1?'S':''}`;why=open.map(o=>`${NAME[o.pair]||o.pair} ${o.side==='short'?'shorted (SIMULATED)':'bought'} ${o.tier==='probation'?'[$10 probation] ':''}${fmt(o.entry,dp(o.entry))}, stop ${fmt(o.sl,dp(o.sl))}, target ${fmt(o.tp,dp(o.tp))}`).join(' · ');}
 else if(takes.length){st='⚡ BUY SIGNAL';why=`${takes.map(u=>NAME[u.pair]).join(', ')} passes every check. The bot will buy on its next 30-minute tick.`;}
 else{st='⏸ WAITING · FLAT';why=`No coin passes all 6 checks right now, so the ${M(s?.challenge?.equity_usd??s?.challenge?.start_capital??1000)} paper account sits in cash. Waiting is a position.`;}
 const fail=best?Object.entries(best.layers).filter(([,v])=>!v).map(([k])=>CHECK[k][0].toLowerCase()):[];
 const need=best?`<b>What makes it buy:</b> a coin must score ≥ ${thr} with all 6 checks green and an upward direction. Closest: <b>${NAME[best.pair]}</b> (${best.score.toFixed(1)}, ${6-fail.length}/6)${fail.length?`, which still needs ${fail.join(', ')}`:''}${best.direction!=='long'?', and the direction has to turn up':''}.`:'';
 if(once('strip',[st,why,need]))$('#strip').innerHTML=`<div class="st">${st}</div><div class="why">${why}</div><div class="need">${need}</div>`;}
// ---------- tooltips
document.addEventListener('click',e=>{const c=e.target.closest('[data-chk]'),tip=$('#tip');if(!c){tip.classList.add('hidden');return;}
 const [t,x]=CHECK[c.dataset.chk];tip.innerHTML=`<b>${t}</b> ${c.dataset.ok==='1'?'✅ passing':'❌ failing'}<br>${x}`;const r=c.getBoundingClientRect();
 tip.style.left=Math.min(innerWidth-310,Math.max(6,r.left))+'px';tip.style.top=(r.bottom+6)+'px';tip.classList.remove('hidden');});
const chips=u=>`<div class="chips">${Object.entries(u.layers).map(([k,v])=>`<button class="chip ${v?'ok':'no'}" data-chk="${k}" data-ok="${v?1:0}">${v?'✓':'✗'} ${CHECK[k][0]}</button>`).join('')}</div>`;
function gauge(score,col){const len=163.4,off=len*(1-Math.min(100,Math.max(0,score))/100),ang=-90+180*score/100;
 return `<svg viewBox="0 0 120 80" class="gauge"><path d="M8 62 A52 52 0 0 1 112 62" stroke="#13261c" stroke-width="9" fill="none" stroke-linecap="round"/><path class="arc" d="M8 62 A52 52 0 0 1 112 62" stroke="${col}" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${off}" style="filter:drop-shadow(0 0 5px ${col})"/><g class="needle" style="transform:rotate(${ang}deg)"><line x1="60" y1="62" x2="60" y2="18" stroke="${col}" stroke-width="2"/></g><circle cx="60" cy="62" r="3" fill="${col}"/><text x="60" y="78" text-anchor="middle" class="val">${score.toFixed(1)}</text><text x="60" y="10" text-anchor="middle" class="lab">PULSE</text></svg>`;}
function spark(a){if(!a||a.length<2)return'';const lo=Math.min(...a),hi=Math.max(...a),up=a.at(-1)>=a[0],c=up?'#39ff88':'#ff3b5c';const pts=a.map((v,i)=>`${(i*300/(a.length-1)).toFixed(1)},${(54-(v-lo)/(hi-lo||1)*50).toFixed(1)}`).join(' ');
 return `<svg viewBox="0 0 300 56" preserveAspectRatio="none" class="spark"><polyline fill="none" stroke="${c}" stroke-width="1.6" points="${pts}"/></svg>`;}
function card(u){const col=VC[u.verdict],d=dp(u.last),ch=u.change24_pct;
 return `<article class="card ${u.verdict==='TAKE'?'take':''}"><div class="row"><div><div class="sym">${u.label}</div><div class="px">${fmt(u.last,d)}</div><div class="chg ${ch>=0?'up':'dn'}">${ch>=0?'+':''}${fmt(ch)}% 24h</div></div>${gauge(u.score,col)}</div>
 <div class="headline">${esc(headline(u))}</div>${spark(u.spark)}<div class="row"><span class="vbadge vb-${u.verdict}">${u.verdict.replace('_',' ')}</span><span class="dim small">${u.regime.replace('_',' ')} · ${u.bias}</span></div>${chips(u)}</article>`;}
// ---------- engine
function engineSVG(u,id){const cyl=Object.entries(u.layers),rp=(2.0-1.6*u.score/100).toFixed(2)+'s';
 return `<svg class="core" viewBox="0 0 360 170" style="--rp:${rp}"><defs><linearGradient id="pg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8ffe9"/><stop offset="1" stop-color="#3b5a4a"/></linearGradient></defs>
 <rect x="8" y="14" width="344" height="104" rx="10" fill="#040a07" stroke="var(--c)" stroke-opacity=".35"/>
 ${cyl.map(([k,v],i)=>{const x=22+i*56;return `<g class="cyl ${v?'':'fail'}" style="--dl:${(-i*0.37).toFixed(2)}s"><rect class="bore" x="${x}" y="22" width="40" height="88" rx="4"/>
  <circle class="spark" cx="${x+20}" cy="30" r="5"/><rect class="pist" x="${x+4}" y="36" width="32" height="30" rx="3" style="fill:url(#pg${id})"/><text class="lbl" x="${x+20}" y="132">${CHECK[k][0].split(' ')[0].toUpperCase()}</text></g>`}).join('')}
 <g class="crank"><line x1="20" y1="150" x2="340" y2="150"/><g class="rotor"><circle cx="180" cy="150" r="10"/><line x1="180" y1="140" x2="180" y2="160"/></g></g></svg>`;}
function dial(label,val,max,unit,col){const f=Math.max(0,Math.min(1,(val??0)/max)),ang=-120+240*f;
 return `<div class="dial"><svg viewBox="0 0 100 70"><path d="M15 62 A40 40 0 1 1 85 62" fill="none" stroke="#13261c" stroke-width="7"/><path d="M15 62 A40 40 0 1 1 85 62" fill="none" stroke="${col}" stroke-width="7" stroke-dasharray="${(f*188).toFixed(1)} 400" style="filter:drop-shadow(0 0 4px ${col})"/>
 <g class="nd" style="transform:rotate(${ang}deg)"><line x1="50" y1="50" x2="50" y2="18" stroke="#effff5" stroke-width="1.6"/></g><circle cx="50" cy="50" r="3" fill="#effff5"/><text x="50" y="68" text-anchor="middle" class="dv">${val==null?'—':val+unit}</text></svg>${label}</div>`;}
function engineCard(u,big){const m=u.metrics,col=VC[u.verdict],rpm=Math.round(u.score*80);
 const say=u.verdict==='TAKE'?'REDLINE. Every cylinder is firing. This is a buy setup.':u.verdict==='WATCH'?'Revving. Most checks pass. Watching for the last ones to fire.':`Idling. ${6-Object.values(u.layers).filter(Boolean).length} cylinder(s) misfire, so the engine won't engage.`;
 return `<div class="engine v-${u.verdict}" id="eng-${u.pair}"><div class="eh"><span class="en">${NAME[u.pair]} ENGINE</span><span class="ev">${u.verdict.replace('_',' ')}</span></div>
 <div class="row"><div class="bign">${u.score.toFixed(1)}</div><div class="dim small" style="text-align:right">${fmt(u.last,dp(u.last))}<br>${u.regime.replace('_',' ')} · ${u.direction}</div></div>
 ${engineSVG(u,u.pair)}<div class="dials">${dial('RPM (score)',rpm,8000,'',col)}${dial('TEMP (movement)',m.atr15_pct,1.5,'%','#ff8a3a')}${dial('PRESSURE (volume)',m.vol_ratio,3,'×','#3ad7ff')}</div>
 <canvas class="ecg" data-p="${u.pair}"></canvas><div class="say">${say}</div>${big?chips(u):''}</div>`;}
let ecgRAF;
function ecgLoop(){const cv=[...document.querySelectorAll('canvas.ecg')];const P=S.d?.pulse?.pairs||{};const t=performance.now()/1000;
 for(const c of cv){const u=P[c.dataset.p];if(!u)continue;const w=c.width=c.clientWidth*devicePixelRatio,h=c.height=c.clientHeight*devicePixelRatio,x=c.getContext('2d');
  const per=2.4-1.9*u.score/100,amp=.15+.75*u.score/100,col=VC[u.verdict];x.strokeStyle=col;x.lineWidth=2*devicePixelRatio;x.shadowColor=col;x.shadowBlur=10;x.beginPath();
  for(let i=0;i<=w;i+=2){const tt=t-(w-i)/w*4,ph=((tt%per)+per)%per/per;let y=0;
   if(ph<.06)y=Math.sin(ph/.06*Math.PI)*.12;else if(ph>.1&&ph<.13)y=-(ph-.1)/.03*.2;else if(ph>=.13&&ph<.17)y=-.2+(ph-.13)/.04*1.2;else if(ph>=.17&&ph<.21)y=1-(ph-.17)/.04*1.35;else if(ph>=.21&&ph<.25)y=-.35+(ph-.21)/.04*.35;else if(ph>.35&&ph<.5)y=Math.sin((ph-.35)/.15*Math.PI)*.25;
   if(u.verdict==='STAND_ASIDE')y*=.8;const Y=h/2-y*amp*h*.45;i?x.lineTo(i,Y):x.moveTo(i,Y);}x.stroke();}
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&S.tab==='engine')ecgRAF=requestAnimationFrame(ecgLoop);}
function renderEngine(){const P=S.d.pulse.pairs;$('#engSel').innerHTML=[...ORD,'ALL'].map(p=>`<button data-e="${p}" class="${S.eng===p?'on':''}">${p==='ALL'?'All 3 engines':NAME[p]}</button>`).join('');
 const k=S.eng==='ALL'?ORD.map(p=>[P[p].score,P[p].verdict,P[p].layers,P[p].metrics]):[P[S.eng].score,P[S.eng].verdict,P[S.eng].layers,P[S.eng].metrics,P[S.eng].last];
 if(once('eng'+S.eng,k)){$('#engWrap').innerHTML=`<div class="engines ${S.eng==='ALL'?'three':''}">${(S.eng==='ALL'?ORD:[S.eng]).map(p=>engineCard(P[p],S.eng!=='ALL')).join('')}</div>`;}
 cancelAnimationFrame(ecgRAF);ecgLoop();}
$('#engSel').onclick=e=>{const p=e.target.dataset.e;if(!p)return;S.eng=p;renderEngine();};
// ---------- events
let actx;function beep(f,d=.15){if(!S.sound)return;actx??=new AudioContext();const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f;o.type='sawtooth';g.gain.setValueAtTime(.06,actx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+d);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+d);}
function fx(pair,cls){const el=document.getElementById('eng-'+pair);if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),1500);}
function event(pair,kind,text){const f=$('#feed');if(f.firstElementChild?.classList.contains('dim'))f.innerHTML='';const li=document.createElement('li');li.className='new';
 li.innerHTML=`<span class="t">${sast(Math.floor(Date.now()/1000)).slice(11)}</span><span>${kind} ${esc(text)}</span>`;f.prepend(li);while(f.children.length>60)f.lastChild.remove();
 const map={'⚡':'fx-cross','🔄':'fx-cross','🟢':'fx-rev','💨':'fx-puff','🟥':'fx-shudder','🏆':'fx-gold'};fx(pair,map[kind]||'fx-cross');
 beep({'🟢':660,'💨':220,'🟥':110,'🏆':880}[kind]||440);if(kind==='🟢'||kind==='⚡')toast(`${kind} ${esc(text)}`);
 if(S.notify&&(kind==='⚡'||kind==='🟢')&&Notification.permission==='granted')new Notification('NORTHLINE PULSE',{body:text});}
function detect(d){const P=d.pulse.pairs;for(const p of ORD){const u=P[p];if(!u)continue;const ps=S.prevScore[p],pv=S.prevVerdict[p];
  if(ps!=null)for(const th of [55,70,d.state?.bot?.pulse_min].filter(x=>x!=null))if((ps<th)!==(u.score<th))event(p,'⚡',`${NAME[p]} pulse ${u.score>=th?'rose above':'fell below'} ${th} (${ps.toFixed(1)} → ${u.score.toFixed(1)})`);
  if(pv&&pv!==u.verdict)event(p,'🔄',`${NAME[p]} verdict ${pv.replace('_',' ')} → ${u.verdict.replace('_',' ')}`);S.prevScore[p]=u.score;S.prevVerdict[p]=u.verdict;}
 const tr=d.state?.recent_trades||[],keys=tr.map(t=>t.time_sast+t.pair+t.side+t.qty);
 if(S.tradeKeys){tr.forEach((t,i)=>{if(S.tradeKeys.has(keys[i]))return;const r=(t.reason||'').split(' ')[0];
  if(t.side==='BUY')event(t.pair,'🟢',`Bot opened paper ${NAME[t.pair]} @ ${fmt(t.price,dp(t.price))}`);else if(r==='SL')event(t.pair,'🟥',`Stop-loss hit on ${NAME[t.pair]}: ${fmt(t.pnl_usd)} USD`);
  else if(r==='TP')event(t.pair,'🏆',`Take-profit on ${NAME[t.pair]}: +${fmt(t.pnl_usd)} USD`);else event(t.pair,'💨',`Bot closed ${NAME[t.pair]} (${r}): ${fmt(t.pnl_usd)} USD`);});}
 S.tradeKeys=new Set(keys);}
// ---------- bot
function renderBot(d){const s=d.state,h=d.health;if(!once('bot',[s?.generated_at,h?.bot_down,d.pulse.engine_hash,d.pulse.pairs?.XBTUSD?.bid]))return;
 if(!s){$('#bot').innerHTML='<div class="panel">No bot state published yet. Nothing is shown rather than made up.</div>';return;}
 const c=s.challenge,st=s.stats,eq=c.equity_usd,pct=(eq/c.start_usd-1)*100,prog=Math.max(0,Math.min(100,Math.log(eq/c.start_usd)/Math.log(c.goal_usd/c.start_usd)*100));
 const match=s.engine?.hash===d.pulse.engine_hash,age=h.last_tick_age_s;
 $('#bot').innerHTML=`<div class="panel botp"><div class="row"><span class="ban">■ PAPER CHALLENGE · NO LIVE MONEY</span><span class="small ${(x=>x==null?'dim':x>4500?'dn':'up')(tickAge(h))}">${(x=>x==null?'bot status unknown':x>4500?'BOT DOWN':'bot alive')(tickAge(h))} · last tick ${(x=>x==null?'—':Math.round(x/60)+' min ago')(tickAge(h))}</span></div>
 <p class="headline">The bot started with ${M(c.start_usd,0)} of paper money and is trying to reach ${M(c.goal_usd,0)}. It is on version <b>${esc(c.version)}</b> with ${c.deaths} death(s) so far, and has closed ${st.closed_trades} trade(s).</p>
 <div class="kpis"><div class="kpi"><div class="l">PAPER BALANCE</div><div class="v">${M(eq)}</div><div class="small ${pct>=0?'up':'dn'}">${pct>=0?'+':''}${fmt(pct)}% vs ${M(c.start_usd,0)}</div></div>
 <div class="kpi"><div class="l">PROGRESS TO $100K</div><div class="v">${fmt(prog,1)}%</div><div class="bar"><i style="width:${prog}%"></i></div></div>
 <div class="kpi"><div class="l">WIN RATE</div><div class="v">${st.win_rate==null?'—':fmt(st.win_rate*100,0)+'%'}</div><div class="dim small">${st.closed_trades} closed · realized ${M(st.realized_pnl_usd)}</div></div>
 <div class="kpi"><div class="l">BUYS WHEN</div><div class="v">≥ ${s.bot?.pulse_min} + 6/6</div><div class="dim small">bot setting · size ${(s.bot?.size_frac??0)*100}% of cash, max $${s.bot?.max_usd_per_trade}/trade · total ≤ ${(s.bot?.max_total_collateral_frac??0)*100}% of equity · ${s.bot?.max_open} open max · SL ${s.bot?.sl_pct*100}% / TP ${s.bot?.tp_pct*100}% · daily loss ${(s.bot?.daily_loss_frac??0)*100}% incl. open P&L · news ${(s.bot?.news_currencies||[]).join('/')} · dead below ${M(s.challenge?.death_below_usd??0,0)}</div></div>
 <div class="kpi"><div class="l">ENGINE</div><div class="v small ${match?'up':'dn'}">${match?'✓ same engine':'✗ mismatch'}</div><div class="dim small">bot and app engine compared each tick · hash in the footer</div></div></div>
 <div class="ph"><b>OPEN PAPER POSITIONS</b></div><div class="tw"><table><tr><th>COIN</th><th>QTY</th><th>BOUGHT</th><th>STOP</th><th>TARGET</th><th>NOW</th><th>P&amp;L $</th></tr>${(c.open_positions||[]).map(p=>{const l=d.pulse.pairs[p.pair]?.bid,u=l?l*p.qty-p.cost-p.fee:null;return `<tr><td>${NAME[p.pair]}</td><td>${p.qty}</td><td>${fmt(p.entry,dp(p.entry))}</td><td>${fmt(p.sl,dp(p.sl))}</td><td>${fmt(p.tp,dp(p.tp))}</td><td>${fmt(l,dp(p.entry))}</td><td class="${u>=0?'up':'dn'}">${fmt(u)}</td></tr>`}).join('')||'<tr><td colspan=7 class="dim">None. The bot is in cash.</td></tr>'}</table></div></div>
 <div class="panel small">Trade history (${(s.proof?.all_trades||s.recent_trades||[]).length} fills, hash-chained) lives in <a href="/proof" data-go="proof">Proof › All fills →</a></div>
 <details class="adv panel" id="botVers"><summary>Version leaderboard (every bot "life")</summary><div class="tw"><table><tr><th>VER</th><th>STATUS</th><th>TRADES</th><th>P&amp;L $</th><th>WIN</th><th>STARTED</th><th>SETTINGS / ENGINE</th></tr>${s.leaderboard.map(r=>`<tr><td>${esc(r.version)}</td><td>${esc(r.status)}</td><td>${r.trades}</td><td>${fmt(r.pnl_usd)}</td><td>${r.win_rate??'—'}</td><td>${esc(r.started_sast)}</td><td class="dim">${esc(r.params)}</td></tr>`).join('')}</table></div></details>
 <details class="adv panel" id="botHealth"><summary>Health &amp; heartbeat</summary>${healthHtml(h)}<details class="adv"><summary>raw health JSON</summary><pre class="small dim">${esc(JSON.stringify(h,null,1))}</pre></details></details>`;}
function healthHtml(h){const a=tickAge(h),hb=HBx,al=ALx,m=x=>x==null?'—':Math.round(x/60)+' min ago';
 return `<ul class="small hl"><li>last bot tick: <b class="${a==null?'dim':a>4500?'dn':'up'}">${a==null?'unknown (no heartbeat readable)':m(a)}</b>${hb?` · rc <b class="${hb.last_tick_rc===0?'up':'dn'}">${esc(hb.last_tick_rc??'—')}</b> · ${hb.tick_done?'tick done':hb.skipped_lock?'skipped (lock)':'<b class="dn">tick not done</b>'} · consecutive fails <b class="${hb.consecutive_fails?'dn':'up'}">${esc(hb.consecutive_fails??'—')}</b>`:''}</li><li>alerts: ${al?al.needs_attention?`<b class="dn">⚠ ${(al.events||[]).length} need attention</b> · `+(al.events||[]).slice(-3).map(e=>esc((e.kind||'')+': '+String(e.msg||'').slice(0,80))).join(' · '):'<b class="up">none open</b>':'<span class="dim">not readable (sign in)</span>'}</li><li>engine: ${h.engine_match?'<b class="up">bot and app match</b>':'<b class="dn">mismatch</b>'} · last publish ${esc(h.last_publish_status??'—')}</li></ul>`;}
// ---------- charts (lazy)
let LW,chart,cs,vs,l1,l2,hc,hs={},pls=[];
function loadLW(){return LW??=new Promise((ok,no)=>{const s=document.createElement('script');s.src='/vendor/lightweight-charts.standalone.production.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
const CH={layout:{background:{color:'transparent'},textColor:'#8fd6ae'},grid:{vertLines:{color:'#0e2418'},horzLines:{color:'#0e2418'}},rightPriceScale:{borderColor:'#143a26'},timeScale:{borderColor:'#143a26',timeVisible:true},autoSize:true};
async function charts(fit){await loadLW();if(!chart){$('#chart').innerHTML='';chart=LightweightCharts.createChart($('#chart'),CH);cs=chart.addCandlestickSeries({upColor:'#39ff88',downColor:'#ff3b5c',borderVisible:false,wickUpColor:'#39ff88',wickDownColor:'#ff3b5c'});
  vs=chart.addHistogramSeries({priceScaleId:'v',priceFormat:{type:'volume'}});chart.priceScale('v').applyOptions({scaleMargins:{top:.82,bottom:0}});l1=chart.addLineSeries({color:'#3ad7ff',lineWidth:1.5,priceLineVisible:false,lastValueVisible:false});l2=chart.addLineSeries({color:'#c77dff',lineWidth:1.5,priceLineVisible:false,lastValueVisible:false});
  hc=LightweightCharts.createChart($('#hist'),CH);const HC={XBTUSD:'#f7931a',ETHUSD:'#8c8cff',SOLUSD:'#14f195'};for(const p in HC)hs[p]=hc.addLineSeries({color:HC[p],lineWidth:2,title:NAME[p]});hs.XBTUSD.createPriceLine({price:70,color:'#39ff88',lineStyle:2,title:'TAKE'});}
 try{const j=await (await fetch(`/api/market?pair=${S.pair}&tf=${S.tf}`)).json();const T=x=>x+SAST;
  cs.setData(j.candles.map(b=>({time:T(b.time),open:b.open,high:b.high,low:b.low,close:b.close})));vs.setData(j.candles.map(b=>({time:T(b.time),value:b.volume,color:b.close>=b.open?'rgba(57,255,136,.35)':'rgba(255,59,92,.35)'})));
  l1.setData(j.ema_fast.map(x=>({time:T(x.time),value:x.value})));l2.setData(j.ema_slow.map(x=>({time:T(x.time),value:x.value})));
  const t0=j.candles[0].time,tr=(S.d?.state?.recent_trades||[]).filter(t=>t.pair===S.pair&&t.ts>=t0);
  cs.setMarkers(tr.map(t=>({time:T(Math.floor(t.ts/(S.tf*60))*S.tf*60),position:t.side==='BUY'?'belowBar':'aboveBar',color:t.side==='BUY'?'#39ff88':'#ff3b5c',shape:t.side==='BUY'?'arrowUp':'arrowDown',text:t.side})).sort((a,b)=>a.time-b.time));
  pls.forEach(p=>cs.removePriceLine(p));pls=[];const u=S.d?.pulse?.pairs?.[S.pair];if(u&&u.direction!=='none')pls.push(cs.createPriceLine({price:u.stop,color:'#ff3b5c',lineStyle:2,title:'stop'}),cs.createPriceLine({price:u.t1,color:'#39ff88',lineStyle:2,title:'target'}));
  for(const p of S.d?.state?.challenge?.open_positions||[])if(p.pair===S.pair)pls.push(cs.createPriceLine({price:p.sl,color:'#ff7a90',title:'bot SL'}),cs.createPriceLine({price:p.tp,color:'#7dffb5',title:'bot TP'}));
  if(fit)chart.timeScale().fitContent();$('#chartInfo').textContent=`${S.tf===15?'15m':'1h'} candles · times SAST · last bar still forming`;depth(j.depth);
  const H=S.d?.state?.pulse_history||[];for(const p in hs){const m=new Map(H.map(h=>[Math.floor(Date.parse(h.time_sast.replace(' ','T')+':00+02:00')/1000)+SAST,h.scores[p]]).filter(x=>x[1]!=null));const u=S.d?.pulse?.pairs?.[p];if(u)m.set(S.d.pulse.fetched_at+SAST,u.score);hs[p].setData([...m].sort((a,b)=>a[0]-b[0]).map(([time,value])=>({time,value})));}
 }catch(e){$('#chartInfo').textContent='chart feed error: '+e.message;}}
function depth(d){const c=$('#depth'),x=c.getContext('2d'),W=c.width=c.clientWidth*devicePixelRatio,H=c.height=c.clientHeight*devicePixelRatio;let cb=0,ca=0;const B=d.bids.map(b=>({p:b.price,c:cb+=b.volume})),A=d.asks.map(a=>({p:a.price,c:ca+=a.volume}));
 const lo=B.at(-1).p,hi=A.at(-1).p,mx=Math.max(cb,ca),X=p=>(p-lo)/(hi-lo)*W,Y=v=>H-v/mx*H*.92;const area=(a,col,f)=>{x.beginPath();x.moveTo(X(a[0].p),H);a.forEach(o=>x.lineTo(X(o.p),Y(o.c)));x.lineTo(X(a.at(-1).p),H);x.fillStyle=f;x.fill();x.strokeStyle=col;x.lineWidth=2;x.stroke();};
 area(B,'#39ff88','rgba(57,255,136,.18)');area(A,'#ff3b5c','rgba(255,59,92,.18)');const bb=d.bids[0].price,ba=d.asks[0].price,dd=dp(bb);
 $('#depthInfo').textContent=`spread ${fmt(ba-bb,dd)} (${((ba-bb)/((ba+bb)/2)*1e4).toFixed(2)} bp) · green = buyers waiting, red = sellers waiting`;
 $('#ob').innerHTML=d.bids.slice(0,6).map((b,i)=>`<div><span class="up">${fmt(b.price,dd)}</span><span>${fmt(b.volume,4)}</span></div><div><span class="dn">${fmt(d.asks[i].price,dd)}</span><span>${fmt(d.asks[i].volume,4)}</span></div>`).join('');}
['pairTabs'].forEach(()=>{$('#pairTabs').innerHTML=ORD.map(p=>`<button data-p="${p}" class="${p===S.pair?'on':''}">${NAME[p]}</button>`).join('');});
$('#pairTabs').onclick=e=>{const p=e.target.dataset.p;if(!p)return;S.pair=p;[...$('#pairTabs').children].forEach(b=>b.classList.toggle('on',b.dataset.p===p));charts(true);};
$('#tfTabs').onclick=e=>{const t=+e.target.dataset.tf;if(!t)return;S.tf=t;[...$('#tfTabs').children].forEach(b=>b.classList.toggle('on',+b.dataset.tf===t));charts(true);};
// ---------- markets
function renderIdx(j){if(!j||!once('idx',j.fetched_at))return;$('#idx').innerHTML=j.quotes.map(q=>q.status!=='DELAYED'?`<div class="ix"><div class="n">${esc(q.name)}</div><div class="dim">unavailable</div></div>`:
 `<div class="ix"><div class="row"><span class="n">${esc(q.name)}</span><span class="delayed">DELAYED</span></div><div class="p">${fmt(q.price)}</div><div class="${q.change_pct>=0?'up':'dn'} small">${q.change_pct>=0?'+':''}${fmt(q.change_pct)}% vs previous close</div>${spark(q.spark)}<div class="dim small">as of ${sast(q.market_time)} SAST</div></div>`).join('');}
let OSP;function loadOS(){return OSP??=import('/os.js').then(m=>(window.OS=m,m));}
// ---------- main loop
function demo(d){if(!DEMO)return d;const m={take:['TAKE',82,'long',true],watch:['WATCH',61,'long',null],aside:['STAND_ASIDE',18,'none',false]}[DEMO];if(!m)return d;
 $('#demo').classList.remove('hidden');$('#demo').textContent=`DEMO MODE (${DEMO.toUpperCase()}) · SIMULATED ENGINE STATE · NOT REAL DATA`;
 for(const u of Object.values(d.pulse.pairs)){u.verdict=m[0];u.score=m[1]+(u.pair==='ETHUSD'?-3:u.pair==='SOLUSD'?2:0);u.direction=m[2];const ks=Object.keys(u.layers);ks.forEach((k,i)=>u.layers[k]=m[3]===null?i<5:m[3]?true:i%2===0);}return d;}
async function tick(){if(document.hidden)return;try{const r=await fetch('/api/all'+(S.tab==='markets'&&Date.now()-S.idxAt>60000?'?idx=1':''),{cache:'no-store'});const d=demo(await r.json());if(d.indices){S.idxAt=Date.now();renderIdx(d.indices);}
 if(d.pulse.error)throw new Error(d.pulse.error);S.d=d;S.lastOk=d.pulse.fetched_at*1000;render();}catch(e){if(!S.d)$('#strip').innerHTML=`<div class="st">⚠ FEED ERROR</div><div class="why">${esc(e.message)}. No numbers are shown rather than fake ones.</div>`;}}
// last tick age: heartbeat row (bot_state id=heartbeat, owner-only; read at most every 5 min inside the existing tick) else the published state age
let HBx=null,ALx=null,HBat=0;function hbLoad(){if(Date.now()-HBat<300000)return;HBat=Date.now();try{window.NL_UPD&&window.NL_UPD()}catch{}try{const s=window.NL_SB,a=JSON.parse(localStorage.getItem('nl_auth')||'null'),t=a&&a.mode==='supabase'&&a.exp>Date.now()/1000+30?a.token:null;if(!s||!t)return;
 fetch(s.url+'/rest/v1/bot_state?select=id,data&id=in.(heartbeat,alerts)',{cache:'no-store',headers:{apikey:s.key,Authorization:'Bearer '+t}}).then(r=>r.ok?r.json():null).then(j=>{if(!Array.isArray(j))return;const o={};for(const x of j)if(x&&x.id&&x.data&&typeof x.data==='object')o[x.id]=x.data;HBx=o.heartbeat&&Number.isFinite(+o.heartbeat.epoch)?o.heartbeat:null;ALx=o.alerts||null;window.NL_HB={heartbeat:HBx,alerts:ALx,at:Date.now()};}).catch(()=>{});}catch{}}
function tickAge(h){hbLoad();const now=Date.now()/1000,hb=HBx&&HBx.epoch?now-HBx.epoch:null,st=h&&h.last_publish_received_at!=null?h.last_tick_age_s:null;return hb!=null?(st!=null?Math.min(hb,st):hb):st;}
function render(){const d=S.d,P=d.pulse.pairs;const h=d.health;const tAge=tickAge(h),isDown=tAge!=null&&tAge>75*60;$('#down').classList.toggle('hidden',!isDown);   // no data (signed out) = no banner, never 'BOT DOWN'
 if(isDown)$('#down').textContent=`⚠ BOT DOWN · no bot tick for ${Math.round(tAge/60)} min (limit 75). Prices are still live; the bot panel is stale.`;
 $('#eng').textContent=`engine ${d.pulse.engine_version} #${d.pulse.engine_hash}`;strip(d);detect(d);
 if(S.tab==='overview'&&once('cards',ORD.map(p=>[P[p].last,P[p].score,P[p].verdict,P[p].layers]))){$('#cards').innerHTML=ORD.map(p=>card(P[p])).join('');}
 if(S.tab==='overview'&&$('#raw').closest('details').open)$('#raw').innerHTML=`<table><tr><th>COIN</th><th>RSI15</th><th>ROC6h</th><th>ATR15</th><th>VOL×</th><th>BOOK</th><th>SPREAD</th><th>TREND</th><th>MOM</th><th>STOP</th><th>T1</th></tr>${ORD.map(p=>{const u=P[p],m=u.metrics;return `<tr><td>${NAME[p]}</td><td>${m.rsi15}</td><td>${m.roc6h_pct}%</td><td>${m.atr15_pct}%</td><td>${m.vol_ratio}</td><td>${m.book_imb}</td><td>${m.spread_bps}bp</td><td>${m.trend}</td><td>${m.momentum}</td><td>${fmt(u.stop,dp(u.stop))}</td><td>${fmt(u.t1,dp(u.t1))}</td></tr>`}).join('')}</table>`;
 if(S.tab==='engine')renderEngine();if(window.OS)OS.update(S.tab);if(S.tab==='bot')renderBot(d);
 const tape=ORD.map(p=>{const u=P[p];return `<span>${NAME[p]} <b class="${u.change24_pct>=0?'up':'dn'}">${fmt(u.last,dp(u.last))} ${u.change24_pct>=0?'+':''}${fmt(u.change24_pct)}%</b> · pulse ${u.score.toFixed(1)} ${u.verdict.replace('_',' ')}</span>`}).join('');
 if(once('tape',tape))$('#tape').innerHTML=tape+tape;}
function clock(){$('#clock').textContent=new Date(Date.now()+SAST*1000).toISOString().slice(11,19)+' SAST';const a=S.lastOk?Math.round((Date.now()-S.lastOk)/1000):null,b=$('#badge'),st=a==null||a>300?'off':a>60?'stale':'live';
 b.className='badge '+st;b.textContent=st==='live'?'● LIVE · Kraken':st==='stale'?'● STALE':'● OFFLINE';$('#age').textContent=a==null?'':`${a}s old`;}
function go(t){S.tab=t;document.querySelectorAll('#tabs a').forEach(a=>{const on=a.dataset.t===t;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});document.querySelectorAll('.tab').forEach(s=>s.classList.toggle('hidden',s.id!=='t-'+t));
 history.replaceState(null,'',(t==='overview'?'/':'/'+t)+location.search);S.keys={tape:S.keys.tape,strip:S.keys.strip};if(t==='charts')charts(true);if(['markets','proof','engine'].includes(t))loadOS().then(m=>m.show(t));if(t==='brain')import('/brain.js').then(m=>m.show());if(t==='bot')import('/squad.js').then(m=>m.showBots());if(t==='rnd')import('/rnd.js').then(m=>m.show());if(t==='office')import('/office.js').then(m=>m.show());if(t==='markets')S.idxAt=0;if(S.d){render();if(t==='markets')tick();}}
$('#tabs').onclick=e=>{const a=e.target.closest('a[data-t]');if(!a)return;e.preventDefault();go(a.dataset.t);};
$('#help').onclick=()=>$('#guide').showModal();$('#gclose').onclick=()=>{$('#guide').close();localStorage.setItem('nl_seen','1');};
$('#snd').onclick=()=>{S.sound=!S.sound;$('#snd').textContent=S.sound?'🔊 Sound on':'🔇 Sound off';beep(520);};
$('#notify').onclick=async()=>{if(!('Notification'in window))return toast('Notifications not supported here. In-page alerts stay on.');S.notify=(await Notification.requestPermission())==='granted';toast(S.notify?'🔔 Alerts on (paper signals only)':'Notifications blocked. In-page alerts stay on.');};
function toast(t){const e=document.createElement('div');e.className='toast';e.innerHTML=t;$('#toasts').appendChild(e);setTimeout(()=>e.remove(),8000);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
window.S=S;window.go=go;const start=location.pathname.replace(/\//g,'')||'overview';go(['overview','engine','charts','bot','markets','proof','brain','rnd','office'].includes(start)?start:'overview');
// shared in-app links: <a data-go=tab data-sec=id> (Office card and squad have their own handlers)
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[data-go]');if(!a||a.closest('#ofCard,#botSquad'))return;e.preventDefault();go(a.dataset.go);const sec=a.dataset.sec;if(sec){let k=0;const iv=setInterval(()=>{const el=document.getElementById(sec);if(el&&el.offsetHeight){if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({block:'start',behavior:'smooth'});el.focus?.({preventScroll:true});clearInterval(iv);}else if(++k>40)clearInterval(iv);},100);}});
if(!localStorage.getItem('nl_seen')&&!Q.has('noguide')&&!DEMO)setTimeout(()=>$('#guide').showModal(),1200);
clock();setInterval(clock,1000);tick();setInterval(tick,30000);setInterval(()=>{if(S.tab==='charts'&&!document.hidden)charts(false);},20000);
if(Q.get('events')){let i=0;const ev=[['XBTUSD','🟢','DEMO: bot opened paper BTC'],['XBTUSD','🏆','DEMO: take-profit on BTC'],['ETHUSD','🟥','DEMO: stop-loss on ETH'],['SOLUSD','💨','DEMO: bot closed SOL (trend_flip)']];setInterval(()=>{if(S.d){const e=ev[i++%ev.length];event(...e);}},2500);}
// currency toggle (USD / ZAR via Frankfurter ECB daily rate)
fetch('/api/lab?key=summary').then(r=>r.ok?r.json():null).then(j=>{if(j?.usdzar?.rates?.ZAR){ZAR=j.usdzar.rates.ZAR;window.ZAR_DATE=j.usdzar.date;}curBtn();});
function curBtn(){$('#cur').textContent=CUR==='ZAR'?(ZAR?'ZAR R':'ZAR (no rate)'):'USD $';$('#cur').title=ZAR?`USD/ZAR ${ZAR} (ECB via Frankfurter, ${window.ZAR_DATE})`:'ZAR rate unavailable';}
$('#cur').onclick=()=>{CUR=CUR==='USD'?'ZAR':'USD';localStorage.setItem('nl_cur',CUR);curBtn();S.keys={};if(S.d)render();if(window.OS)OS.update(S.tab,true);};
