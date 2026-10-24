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
 let st,why;if(open.length){st=window.NL_HB?.scoreboard?.bots?.v5?.status==='RETIRED'?`⏹ v5 RETIRED · closing ${open.length} paper trade${open.length>1?'s':''}`:`🟢 IN ${open.length} PAPER TRADE${open.length>1?'S':''}`;why=open.map(o=>`${NAME[o.pair]||o.pair} ${o.side==='short'?'shorted (SIMULATED)':'bought'} ${o.tier==='probation'?'[$10 probation] ':''}${fmt(o.entry,dp(o.entry))}, stop ${fmt(o.sl,dp(o.sl))}, target ${fmt(o.tp,dp(o.tp))}`).join(' · ');}
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
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&S.on('engine'))ecgRAF=requestAnimationFrame(ecgLoop);}
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
async function initCh(){await loadLW();if(!chart){$('#chart').innerHTML='';chart=LightweightCharts.createChart($('#chart'),CH);cs=chart.addCandlestickSeries({upColor:'#39ff88',downColor:'#ff3b5c',borderVisible:false,wickUpColor:'#39ff88',wickDownColor:'#ff3b5c'});
  vs=chart.addHistogramSeries({priceScaleId:'v',priceFormat:{type:'volume'}});chart.priceScale('v').applyOptions({scaleMargins:{top:.82,bottom:0}});l1=chart.addLineSeries({color:'#3ad7ff',lineWidth:1.5,priceLineVisible:false,lastValueVisible:false});l2=chart.addLineSeries({color:'#c77dff',lineWidth:1.5,priceLineVisible:false,lastValueVisible:false});
  hc=LightweightCharts.createChart($('#hist'),CH);const HC={XBTUSD:'#f7931a',ETHUSD:'#8c8cff',SOLUSD:'#14f195'};for(const p in HC)hs[p]=hc.addLineSeries({color:HC[p],lineWidth:2,title:NAME[p]});hs.XBTUSD.createPriceLine({price:70,color:'#39ff88',lineStyle:2,title:'TAKE'});}}
let CGEN=0;async function charts(fit){cxUI();import('/pulseview.js').then(m=>m.show(S.cm,KR[S.cm])).catch(()=>{});const gen=++CGEN;if(!isMain())return chartsX(fit,gen);S.pair=KR[S.cm];await initCh();$('#chNo')?.classList.add('hidden');
 try{const j=await (await fetch(`/api/market?pair=${S.pair}&tf=${S.tf}`)).json();if(gen!==CGEN)return;const T=x=>x+SAST;
  cs.setData(j.candles.map(b=>({time:T(b.time),open:b.open,high:b.high,low:b.low,close:b.close})));vs.setData(j.candles.map(b=>({time:T(b.time),value:b.volume,color:b.close>=b.open?'rgba(57,255,136,.35)':'rgba(255,59,92,.35)'})));
  l1.setData(j.ema_fast.map(x=>({time:T(x.time),value:x.value})));l2.setData(j.ema_slow.map(x=>({time:T(x.time),value:x.value})));
  const t0=j.candles[0].time,tr=(S.d?.state?.recent_trades||[]).filter(t=>t.pair===S.pair&&t.ts>=t0);
  cs.setMarkers(mkrs(S.tf,t0));void tr;
  pls.forEach(p=>cs.removePriceLine(p));pls=[];const u=S.d?.pulse?.pairs?.[S.pair];if(u&&u.direction!=='none')pls.push(cs.createPriceLine({price:u.stop,color:'#ff3b5c',lineStyle:2,title:'stop'}),cs.createPriceLine({price:u.t1,color:'#39ff88',lineStyle:2,title:'target'}));
  for(const p of S.d?.state?.challenge?.open_positions||[])if(p.pair===S.pair)pls.push(cs.createPriceLine({price:p.sl,color:'#ff7a90',title:'bot SL'}),cs.createPriceLine({price:p.tp,color:'#7dffb5',title:'bot TP'}));
  if(fit)chart.timeScale().fitContent();$('#chartInfo').textContent=`${S.tf===15?'15m':'1h'} candles · times SAST · last bar still forming`;depth(j.depth);
  const H=S.d?.state?.pulse_history||[];for(const p in hs){const m=new Map(H.map(h=>[Math.floor(Date.parse(h.time_sast.replace(' ','T')+':00+02:00')/1000)+SAST,h.scores[p]]).filter(x=>x[1]!=null));const u=S.d?.pulse?.pairs?.[p];if(u)m.set(S.d.pulse.fetched_at+SAST,u.score);hs[p].setData([...m].sort((a,b)=>a[0]-b[0]).map(([time,value])=>({time,value})));}
 }catch(e){$('#chartInfo').textContent='chart feed error: '+e.message;}}
// ---- Charts upgrade 2026-10-19: every market any bot trades, 5m/15m/1h/1d, bot markers, on-demand Kraken OHLC (cached, no polling) ----
// Futures list = S23 scan list, prereg 2663f39d (slab/rnd/prereg_coins_kf30d_20261019.json, coins_kf). Charted from the Kraken SPOT pair of the same coin.
const CX=[['main','Main bot',['BTC','ETH','SOL']],['squad','Squad coins',['ADA','AVAX','BTC','DOGE','DOT','ETH','LINK','LTC','SOL','XRP']],['fut','Futures (S23 KF perps)',['BTC','ETH','SOL','ZEC','XRP','NEAR','HYPE','DOGE','SUI','TAO']],['metal','Metals (S15/S16)',['GOLD','SILVER']]];
const KR={BTC:'XBTUSD',ETH:'ETHUSD',SOL:'SOLUSD',ADA:'ADAUSD',AVAX:'AVAXUSD',DOGE:'XDGUSD',DOT:'DOTUSD',LINK:'LINKUSD',LTC:'LTCUSD',XRP:'XRPUSD',ZEC:'ZECUSD',NEAR:'NEARUSD',HYPE:'HYPEUSD',SUI:'SUIUSD',TAO:'TAOUSD'};   // GOLD/SILVER: Kraken spot has no XAU/XAG pair (checked 2026-10-19) -> no free chart source
const CNAME={GOLD:'Gold (XAU)',SILVER:'Silver (XAG)'},TFN={5:'5m',15:'15m',60:'1h',1440:'1d'};
const coinOf=m=>{let s=String(m||'').toUpperCase().replace(/^(PF_|PI_|Y:)/,'').replace(/[-_/ ]/g,'').replace(/(USDT|USDC|ZUSD|USD)$/,'');if(s==='XBT'||s==='XXBT')return'BTC';if(s==='XDG'||s==='XXDG')return'DOGE';if(s==='XAU'||s==='GOLD')return'GOLD';if(s==='XAG'||s==='SILVER')return'SILVER';return s;};
S.cm=S.cm||'BTC';S.mkOff=S.mkOff||new Set();let SQM=null,SQB=null,cxBuilt=false;const OC=new Map();
const isMain=()=>ORD.includes(KR[S.cm])&&(S.tf===15||S.tf===60);
function sqLoad(){if(SQM)return;import('/squad.js').then(async m=>{SQM=m;const q=await m.loadSquad();SQB=q&&Array.isArray(q.bots)?q.bots:[];cxWho();if(S.on('charts'))charts(false);}).catch(()=>{SQB=[];});}
function cxUI(){sqLoad();if(cxBuilt)return;cxBuilt=true;const pt=$('#pairTabs');pt.classList.add('cx-pick');
 pt.innerHTML=`<input id="cxQ" class="cx-q" type="search" placeholder="search market…" aria-label="Search markets">`+CX.map(([g,n,L])=>`<div class="cx-g" data-g="${g}"><span class="dim small">${n}</span>${L.map(c=>`<button data-c="${c}" class="${c===S.cm?'on':''}">${esc(CNAME[c]||c)}</button>`).join('')}</div>`).join('');
 pt.onclick=e=>{const c=e.target.closest('button')?.dataset.c;if(!c)return;S.cm=c;pt.querySelectorAll('button[data-c]').forEach(b=>b.classList.toggle('on',b.dataset.c===c));cxWho();charts(true);};
 $('#cxQ').oninput=e=>{const q=e.target.value.trim().toUpperCase();pt.querySelectorAll('.cx-g').forEach(g=>{let n=0;g.querySelectorAll('button').forEach(b=>{const ok=!q||b.dataset.c.includes(q)||b.textContent.toUpperCase().includes(q);b.classList.toggle('hidden',!ok);n+=ok;});g.classList.toggle('hidden',!n);});};
 const tt=$('#tfTabs');tt.innerHTML=[5,15,60,1440].map(f=>`<button data-tf="${f}" class="${f===S.tf?'on':''}">${TFN[f]}</button>`).join('');
 tt.onclick=e=>{const f=+e.target.dataset.tf;if(!f)return;S.tf=f;[...tt.children].forEach(b=>b.classList.toggle('on',+b.dataset.tf===f));charts(true);};
 const ph=$('#chart').parentNode;const w=document.createElement('div');w.id='chWho';w.className='small cx-who';ph.insertBefore(w,$('#chart'));const no=document.createElement('div');no.id='chNo';no.className='cx-no hidden';ph.insertBefore(no,$('#chart'));
 w.onclick=e=>{const g=e.target.closest('button')?.dataset.mg;if(!g)return;S.mkOff.has(g)?S.mkOff.delete(g):S.mkOff.add(g);cxWho();charts(false);};cxWho();}
function botsOn(c){const o=[];if(['BTC','ETH','SOL'].includes(c))o.push(['main','v5 main bot']);for(const b of SQB||[]){const ms=new Set([...(b.strats||[]).flatMap(s=>Array.isArray(s.markets)?s.markets:[]),...(b.open||[]).map(p=>p.m)].map(coinOf));if(ms.has(c))o.push([SQM?SQM.groupOf(b):'other',b.id]);}return o;}
function cxWho(){const w=$('#chWho');if(!w)return;const c=S.cm,on=botsOn(c),fut=CX[2][2].includes(c),G=new Map(SQM?SQM.GROUPS.map(g=>[g.k,g.name]):[]);G.set('main','MAIN BOT');
 const grps=[...new Set(on.map(x=>x[0]))];
 w.innerHTML=`<b>Who trades ${esc(CNAME[c]||c)}:</b> ${on.length?on.map(x=>esc(x[1])).join(', '):!SQB?'loading…':CX[3][2].includes(c)?'S15/S16 per the brief (the published fwdw row does not name their market, so none is confirmed from data)':'no bot in the published state'}${fut?' · on the S23 scan list (prereg 2663f39d, Kraken Futures perp; chart = Kraken spot)':''}${grps.length?` · <span class="dim">markers:</span> ${grps.map(g=>`<button class="cx-mt${S.mkOff.has(g)?'':' on'}" data-mg="${esc(g)}">${esc(G.get(g)||g)}</button>`).join(' ')}`:''}`;}
function mkrs(tf,t0){const c=S.cm,o=[],step=tf*60,B=t=>Math.floor(t/step)*step+SAST;
 if(!S.mkOff.has('main'))for(const t of S.d?.state?.recent_trades||[])if(coinOf(t.pair)===c&&t.ts>=t0)o.push({time:B(t.ts),position:t.side==='BUY'?'belowBar':'aboveBar',color:t.side==='BUY'?'#39ff88':'#ff3b5c',shape:t.side==='BUY'?'arrowUp':'arrowDown',text:'v5 '+t.side});
 for(const b of SQB||[]){const g=SQM?SQM.groupOf(b):'other';if(S.mkOff.has(g))continue;for(const p of b.open||[]){if(coinOf(p.m)!==c)continue;const ts=p.opened_sast?Date.parse(String(p.opened_sast).replace(' ','T').slice(0,16)+':00+02:00')/1000:null;if(!ts||ts<t0)continue;const sh=p.side===-1||/short|sell/i.test(String(p.side||''));o.push({time:B(ts),position:sh?'aboveBar':'belowBar',color:'#ffd23f',shape:sh?'arrowDown':'arrowUp',text:b.id+' entry'});}}
 return o.sort((a,b)=>a.time-b.time);}
async function ohlc(kp,tf){const k=kp+'|'+tf,c=OC.get(k),ttl={5:60e3,15:120e3,60:300e3,1440:900e3}[tf];if(c&&Date.now()-c.t<ttl)return c.v;
 const j=await (await fetch(`https://api.kraken.com/0/public/OHLC?pair=${kp}&interval=${tf}`)).json();if(j.error&&j.error.length)throw new Error(String(j.error[0]));const key=Object.keys(j.result||{}).find(x=>x!=='last');if(!key)throw new Error('no data');
 const v=j.result[key].map(b=>({time:+b[0],open:+b[1],high:+b[2],low:+b[3],close:+b[4],volume:+b[6]}));OC.set(k,{t:Date.now(),v});return v;}
const emaX=(a,n)=>{const k=2/(n+1);let e=null;return a.map(b=>(e=e==null?b.close:b.close*k+e*(1-k),{time:b.time+SAST,value:e})).slice(n-1);};
async function chartsX(fit,gen){await initCh();if(gen!==CGEN)return;const c=S.cm,kp=KR[c],no=$('#chNo');pls.forEach(p=>cs.removePriceLine(p));pls=[];
 const ob=()=>{$('#depthInfo').textContent='order book: shown for the 3 engine coins (BTC/ETH/SOL) on 15m/1h';$('#ob').innerHTML='';const cv=$('#depth');cv.getContext('2d').clearRect(0,0,cv.width,cv.height);};
 if(!kp){cs.setData([]);vs.setData([]);l1.setData([]);l2.setData([]);cs.setMarkers([]);no.innerHTML=`<b>No free chart source</b> for ${esc(CNAME[c]||c)}: Kraken has no ${c==='GOLD'?'XAU':'XAG'}/USD spot pair, and the bots' metal prices come from a source we can't chart for free. Nothing is drawn rather than faked.`;no.classList.remove('hidden');$('#chartInfo').textContent='no free chart source';ob();return;}
 no.classList.add('hidden');$('#chartInfo').textContent='loading…';
 try{const v=await ohlc(kp,S.tf);if(gen!==CGEN||S.cm!==c)return;const T=x=>x+SAST;cs.setData(v.map(b=>({time:T(b.time),open:b.open,high:b.high,low:b.low,close:b.close})));vs.setData(v.map(b=>({time:T(b.time),value:b.volume,color:b.close>=b.open?'rgba(57,255,136,.35)':'rgba(255,59,92,.35)'})));
  l1.setData(emaX(v,20));l2.setData(emaX(v,50));cs.setMarkers(v.length?mkrs(S.tf,v[0].time):[]);if(fit)chart.timeScale().fitContent();
  $('#chartInfo').textContent=`${esc(c)} · ${TFN[S.tf]} candles · Kraken spot ${kp} · times SAST · fetched on demand, cached ${({5:1,15:2,60:5,1440:15})[S.tf]} min`;ob();
 }catch(e){$('#chartInfo').textContent='chart feed error: '+e.message;}}
function depth(d){const c=$('#depth'),x=c.getContext('2d'),W=c.width=c.clientWidth*devicePixelRatio,H=c.height=c.clientHeight*devicePixelRatio;let cb=0,ca=0;const B=d.bids.map(b=>({p:b.price,c:cb+=b.volume})),A=d.asks.map(a=>({p:a.price,c:ca+=a.volume}));
 const lo=B.at(-1).p,hi=A.at(-1).p,mx=Math.max(cb,ca),X=p=>(p-lo)/(hi-lo)*W,Y=v=>H-v/mx*H*.92;const area=(a,col,f)=>{x.beginPath();x.moveTo(X(a[0].p),H);a.forEach(o=>x.lineTo(X(o.p),Y(o.c)));x.lineTo(X(a.at(-1).p),H);x.fillStyle=f;x.fill();x.strokeStyle=col;x.lineWidth=2;x.stroke();};
 area(B,'#39ff88','rgba(57,255,136,.18)');area(A,'#ff3b5c','rgba(255,59,92,.18)');const bb=d.bids[0].price,ba=d.asks[0].price,dd=dp(bb);
 $('#depthInfo').textContent=`spread ${fmt(ba-bb,dd)} (${((ba-bb)/((ba+bb)/2)*1e4).toFixed(2)} bp) · green = buyers waiting, red = sellers waiting`;
 $('#ob').innerHTML=d.bids.slice(0,6).map((b,i)=>`<div><span class="up">${fmt(b.price,dd)}</span><span>${fmt(b.volume,4)}</span></div><div><span class="dn">${fmt(d.asks[i].price,dd)}</span><span>${fmt(d.asks[i].volume,4)}</span></div>`).join('');}
// ---------- markets
function renderIdx(j){if(!j||!once('idx',j.fetched_at))return;$('#idx').innerHTML=j.quotes.map(q=>q.status!=='DELAYED'?`<div class="ix"><div class="n">${esc(q.name)}</div><div class="dim">unavailable</div></div>`:
 `<div class="ix"><div class="row"><span class="n">${esc(q.name)}</span><span class="delayed">DELAYED</span></div><div class="p">${fmt(q.price)}</div><div class="${q.change_pct>=0?'up':'dn'} small">${q.change_pct>=0?'+':''}${fmt(q.change_pct)}% vs previous close</div>${spark(q.spark)}<div class="dim small">as of ${sast(q.market_time)} SAST</div></div>`).join('');}
let OSP;function loadOS(){return OSP??=import('/os.js').then(m=>(window.OS=m,m));}
// ---------- main loop
function demo(d){if(!DEMO)return d;const m={take:['TAKE',82,'long',true],watch:['WATCH',61,'long',null],aside:['STAND_ASIDE',18,'none',false]}[DEMO];if(!m)return d;
 $('#demo').classList.remove('hidden');$('#demo').textContent=`DEMO MODE (${DEMO.toUpperCase()}) · SIMULATED ENGINE STATE · NOT REAL DATA`;
 for(const u of Object.values(d.pulse.pairs)){u.verdict=m[0];u.score=m[1]+(u.pair==='ETHUSD'?-3:u.pair==='SOLUSD'?2:0);u.direction=m[2];const ks=Object.keys(u.layers);ks.forEach((k,i)=>u.layers[k]=m[3]===null?i<5:m[3]?true:i%2===0);}return d;}
async function tick(){if(document.hidden)return;try{const r=await fetch('/api/all'+(S.on('markets')&&Date.now()-S.idxAt>60000?'?idx=1':''),{cache:'no-store'});const d=demo(await r.json());if(d.indices){S.idxAt=Date.now();renderIdx(d.indices);}
 if(d.pulse.error)throw new Error(d.pulse.error);S.d=d;S.lastOk=d.pulse.fetched_at*1000;render();}catch(e){if(!S.d)$('#strip').innerHTML=`<div class="st">⚠ FEED ERROR</div><div class="why">${esc(e.message)}. No numbers are shown rather than fake ones.</div>`;}}
// last tick age: heartbeat row (bot_state id=heartbeat, owner-only; read at most every 5 min inside the existing tick) else the published state age
let HBx=null,ALx=null,HBat=0;function hbLoad(){if(Date.now()-HBat<300000)return;HBat=Date.now();try{window.NL_UPD&&window.NL_UPD()}catch{}try{const s=window.NL_SB,a=JSON.parse(localStorage.getItem('nl_auth')||'null'),t=a&&a.mode==='supabase'&&a.exp>Date.now()/1000+30?a.token:null;if(!s||!t)return;
 fetch(s.url+'/rest/v1/bot_state?select=id,data&id=in.(heartbeat,alerts,rnd_workers,coach_board,indie,indie_intel,scoreboard,lab,challenge_check)',{cache:'no-store',headers:{apikey:s.key,Authorization:'Bearer '+t}}).then(r=>r.ok?r.json():null).then(j=>{if(!Array.isArray(j))return;const o={};for(const x of j)if(x&&x.id&&x.data&&typeof x.data==='object')o[x.id]=x.data;HBx=o.heartbeat&&Number.isFinite(+o.heartbeat.epoch)?o.heartbeat:null;ALx=o.alerts||null;window.NL_HB={heartbeat:HBx,alerts:ALx,rnd_workers:o.rnd_workers||null,coach_board:o.coach_board||null,indie:o.indie||null,indie_intel:o.indie_intel||null,scoreboard:o.scoreboard||null,lab:o.lab||null,challenge_check:o.challenge_check||null,at:Date.now()};try{window.dispatchEvent(new Event('nl-hb'))}catch{}}).catch(()=>{});}catch{}}
function tickAge(h){hbLoad();const now=Date.now()/1000,hb=HBx&&HBx.epoch?now-HBx.epoch:null,st=h&&h.last_publish_received_at!=null?h.last_tick_age_s:null;return hb!=null?(st!=null?Math.min(hb,st):hb):st;}
function render(){const d=S.d,P=d.pulse.pairs;const h=d.health;const tAge=tickAge(h),isDown=tAge!=null&&tAge>75*60;$('#down').classList.toggle('hidden',!isDown);   // no data (signed out) = no banner, never 'BOT DOWN'
 if(isDown)$('#down').textContent=`⚠ BOT DOWN · no bot tick for ${Math.round(tAge/60)} min (limit 75). Prices are still live; the bot panel is stale.`;
 $('#eng').textContent=`engine ${d.pulse.engine_version} #${d.pulse.engine_hash}`;strip(d);detect(d);
 if(S.on('overview'))window.rsKpis?.(d); if(S.on('overview')&&once('cards',ORD.map(p=>[P[p].last,P[p].score,P[p].verdict,P[p].layers]))){$('#cards').innerHTML=ORD.map(p=>card(P[p])).join('');}
 if(S.on('settings')&&$('#raw').closest('details').open)$('#raw').innerHTML=`<table><tr><th>COIN</th><th>RSI15</th><th>ROC6h</th><th>ATR15</th><th>VOL×</th><th>BOOK</th><th>SPREAD</th><th>TREND</th><th>MOM</th><th>STOP</th><th>T1</th></tr>${ORD.map(p=>{const u=P[p],m=u.metrics;return `<tr><td>${NAME[p]}</td><td>${m.rsi15}</td><td>${m.roc6h_pct}%</td><td>${m.atr15_pct}%</td><td>${m.vol_ratio}</td><td>${m.book_imb}</td><td>${m.spread_bps}bp</td><td>${m.trend}</td><td>${m.momentum}</td><td>${fmt(u.stop,dp(u.stop))}</td><td>${fmt(u.t1,dp(u.t1))}</td></tr>`}).join('')}</table>`;
 if(S.on('engine'))renderEngine();if(window.OS){(S.subs||[]).forEach(x=>OS.update(x));if(!S.on('engine')&&(S.on('guards')||S.on('rebuild')))OS.update('engine');}if(S.on('bot'))renderBot(d);
 const tape=ORD.map(p=>{const u=P[p];return `<span>${NAME[p]} <b class="${u.change24_pct>=0?'up':'dn'}">${fmt(u.last,dp(u.last))} ${u.change24_pct>=0?'+':''}${fmt(u.change24_pct)}%</b> · pulse ${u.score.toFixed(1)} ${u.verdict.replace('_',' ')}</span>`}).join('');
 if(once('tape',tape))$('#tape').innerHTML=tape+tape;}
function clock(){$('#clock').textContent=new Date(Date.now()+SAST*1000).toISOString().slice(11,19)+' SAST';const a=S.lastOk?Math.round((Date.now()-S.lastOk)/1000):null,b=$('#badge'),st=a==null||a>300?'off':a>60?'stale':'live';
 b.className='badge '+st;b.textContent=st==='live'?'● LIVE · Kraken':st==='stale'?'● STALE':'● OFFLINE';$('#age').textContent=a==null?'':`${a}s old`;}
// DECLUTTER (staging 2026-10-24): 5 top-level tabs, each a group of the old sections (renderers unchanged). Old routes redirect.
// PLACEMENT (staging 2026-10-24): each panel on the tab where it is used. Brain+guards+retired -> Machines; rebuild candidates -> Research Lab; market view -> Markets.
const GROUPS={money:['overview','proof'],machines:['bot','guards','brain','retired'],office:['office'],research:['rhome','research','lab','rebuild','rnd'],markets:['charts','engine','markets','mview'],settings:['settings']};
const ALIAS={overview:'money',proof:'money',bot:'machines',rnd:'research',lab:'research',brain:'machines',charts:'markets',engine:'markets'};
S.on=x=>(S.subs||[]).includes(x);S.floor=false;S.brainOn=false;
function go(t){if(t==='office')S.floor=true;if(t==='brain')S.brainOn=true;const g=GROUPS[t]?t:(ALIAS[t]||'money');S.tab=g;
 S.subs=GROUPS[g].slice();
 document.querySelectorAll('#tabs a').forEach(a=>{const on=a.dataset.t===g;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.querySelectorAll('main>.tab').forEach(s=>{const k=s.id.slice(2),i=S.subs.indexOf(k);s.classList.toggle('hidden',i<0&&!false);s.style.order=k==='toggles'?50:i;});
 toggles(g);history.replaceState(null,'',(g==='money'?'/':'/'+g+(g==='research'&&window.RS&&window.RS!=='home'?'/'+window.RS:''))+location.search);S.keys={tape:S.keys.tape,strip:S.keys.strip};
 const on=S.on;if(on('charts'))charts(true);['markets','proof','engine'].filter(on).forEach(x=>loadOS().then(m=>m.show(x)));if(on('guards')||on('rebuild'))loadOS().then(m=>m.show('engine'));if(on('brain'))LZ('t-brain',()=>import('/brain.js').then(m=>m.show()));if(on('bot'))import('/squad.js').then(m=>m.showBots());if(on('rnd'))import('/rnd.js').then(m=>m.show());if(on('office'))import('/office.js').then(m=>m.show());if(on('lab'))import('/lab.js').then(m=>m.show());if(on('research'))import('/research.js').then(m=>m.show());if(on('markets'))S.idxAt=0;if(on('settings'))settingsMove();if(S.tab==='research')setTimeout(()=>window.RSapply&&window.RSapply(),0);if(S.d){render();if(on('markets'))tick();}}
function toggles(g){const el=$('#t-toggles');el.innerHTML='';return;if(g==='machines')el.innerHTML=`<div class="panel"><button class="ibtn wide" id="tgFloor">${S.floor?'Hide':'Show'} 3D floor view (heavier)</button> <span class="dim small">same bots as the board above, drawn as an office</span> <button class="ibtn wide" id="tgBrain">${S.brainOn?'Hide':'Show'} brain map &amp; lessons (heavier)</button> <span class="dim small">the bots' brain: verdicts, lessons, neural log</span></div>`;else el.innerHTML='';
 const f=$('#tgFloor'),b=$('#tgBrain');if(f)f.onclick=()=>{S.floor=!S.floor;go('machines');};if(b)b.onclick=()=>{S.brainOn=!S.brainOn;go('machines');};}
function settingsMove(){const c=$('#setCtl');if(c&&!c.dataset.m){c.dataset.m=1;['snd','notify'].forEach(id=>{const e=document.getElementById(id);if(e)c.append(e);});const d=$('#raw')?.closest('details');if(d){$('#setRaw').append(d);d.open=true;}}}
$('#tabs').onclick=e=>{const a=e.target.closest('a[data-t]');if(!a)return;e.preventDefault();if(a.dataset.t==='research')window.RS='home';go(a.dataset.t);};
$('#help').onclick=()=>$('#guide').showModal();$('#gclose').onclick=()=>{$('#guide').close();localStorage.setItem('nl_seen','1');};
$('#snd').onclick=()=>{S.sound=!S.sound;$('#snd').textContent=S.sound?'🔊 Sound on':'🔇 Sound off';beep(520);};
$('#notify').onclick=async()=>{if(!('Notification'in window))return toast('Notifications not supported here. In-page alerts stay on.');S.notify=(await Notification.requestPermission())==='granted';toast(S.notify?'🔔 Alerts on (paper signals only)':'Notifications blocked. In-page alerts stay on.');};
function toast(t){const e=document.createElement('div');e.className='toast';e.innerHTML=t;$('#toasts').appendChild(e);setTimeout(()=>e.remove(),8000);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
window.S=S;window.go=go;const PP=location.pathname.split('/').filter(Boolean);const start=(location.hash==='#office'?'office':PP[0])||'overview';addEventListener('hashchange',()=>{if(location.hash==='#office')go('office');});window.RS=(PP[0]==='research'&&PP[1])||'home';settingsMove();go(start);
// shared in-app links: <a data-go=tab data-sec=id> (Office card and squad have their own handlers)
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[data-go]');if(!a||a.closest('#ofCard,#botSquad'))return;e.preventDefault();go(a.dataset.go);const sec=a.dataset.sec;if(sec){let k=0;const iv=setInterval(()=>{const el=document.getElementById(sec);if(el&&el.offsetHeight){if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({block:'start',behavior:'smooth'});el.focus?.({preventScroll:true});clearInterval(iv);}else if(++k>40)clearInterval(iv);},100);}});
if(!localStorage.getItem('nl_seen')&&!Q.has('noguide')&&!DEMO)setTimeout(()=>$('#guide').showModal(),1200);
clock();setInterval(clock,1000);tick();setInterval(tick,30000);setInterval(()=>{if(S.on('charts')&&!document.hidden&&isMain())charts(false);},20000);
if(Q.get('events')){let i=0;const ev=[['XBTUSD','🟢','DEMO: bot opened paper BTC'],['XBTUSD','🏆','DEMO: take-profit on BTC'],['ETHUSD','🟥','DEMO: stop-loss on ETH'],['SOLUSD','💨','DEMO: bot closed SOL (trend_flip)']];setInterval(()=>{if(S.d){const e=ev[i++%ev.length];event(...e);}},2500);}
// currency toggle (USD / ZAR via Frankfurter ECB daily rate)
fetch('/api/lab?key=summary').then(r=>r.ok?r.json():null).then(j=>{if(j?.usdzar?.rates?.ZAR){ZAR=j.usdzar.rates.ZAR;window.ZAR_DATE=j.usdzar.date;}curBtn();});
function curBtn(){$('#cur').textContent=CUR==='ZAR'?(ZAR?'ZAR R':'ZAR (no rate)'):'USD $';$('#cur').title=ZAR?`USD/ZAR ${ZAR} (ECB via Frankfurter, ${window.ZAR_DATE})`:'ZAR rate unavailable';}
$('#cur').onclick=()=>{CUR=CUR==='USD'?'ZAR':'USD';localStorage.setItem('nl_cur',CUR);curBtn();S.keys={};if(S.d)render();if(window.OS)(S.subs||[]).forEach(x=>OS.update(x,true));};

// PLACEMENT mirror (staging): #learn stays the single renderer (hidden); its blocks are shown where they are used. Market View moves from R&D to Markets; R&D's duplicate Paper Squad is hidden (it lives on Machines).
(function(){const cut=(el)=>{const out=[];let cur=null;[...el.children].forEach(n=>{if(n.classList&&n.classList.contains('ph')){cur={t:(n.innerText||n.textContent).trim().toUpperCase(),n:[]};out.push(cur);}if(cur)cur.n.push(n.outerHTML);});return out;};
 const pl=()=>{const L=document.getElementById('learn');if(!L||!L.innerHTML)return;const P=[...L.querySelectorAll('.panel')];let g='',r='',rb='';
  P.forEach(p=>cut(p).forEach(b=>{const h=b.n.join('');if(/^NEWS GUARD/.test(b.t))g+=h;else if(/^REBUILD/.test(b.t))rb+=h;else if(/^LEARNING LOOP|^LESSONS|^RISK FUEL/.test(b.t))r+=h;}));
  const fuelSvg=L.querySelector('svg');
  const set=(id,h)=>{const e=document.getElementById(id);if(e&&e.dataset.h!==h){e.dataset.h=h;e.innerHTML=h;}};
  set('plGuards',g?`<div class="panel"><div class="dim small" style="margin-bottom:6px">BOT GUARDS · news pauses for the bots</div>${g}</div>`:'');
  set('plRetired',r?`<div class="panel">${r}</div>`:'');set('plRebuild',rb?`<div class="panel">${rb}</div>`:'');};
 const mv=()=>{const R=document.getElementById('rnd'),M=document.getElementById('plMview');if(!R||!M)return;R.querySelectorAll('.panel').forEach(p=>{const h=p.querySelector('.ph');const t=h?(h.innerText||h.textContent).trim().toUpperCase():'';if(t.startsWith('MARKET VIEW')&&!M.contains(p)){M.innerHTML='';M.append(p);}if(t.startsWith('PAPER SQUAD'))p.style.display='none';});};
 const ob=new MutationObserver(()=>{pl();mv();});const st=()=>{['learn','rnd'].forEach(id=>{const e=document.getElementById(id);if(e)ob.observe(e,{childList:true,subtree:true});});pl();mv();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',st);else st();})();

// ALWAYS-OPEN (staging 2026-10-24): every panel visible and open; heavy panels (Brain, 3D office) load when scrolled near (IntersectionObserver), never hidden.
function LZ(id,fn){const el=document.getElementById(id);if(!el)return fn();if(el.dataset.lz==='1')return fn();if(!('IntersectionObserver' in window)){el.dataset.lz='1';return fn();}
 if(!el.firstElementChild||!el.firstElementChild.innerHTML)el.firstElementChild&&(el.firstElementChild.innerHTML='<div class="panel dim small">loading when you scroll here…</div>');
 const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();el.dataset.lz='1';fn();}},{rootMargin:'400px 0px'});io.observe(el);}
(function(){const KEEP=d=>{const s=d.querySelector('summary');const t=s?(s.textContent||''):'';return /raw/i.test(t)||d.classList.contains('bs-c')||d.closest('.bs-c')||d.classList.contains('lb-i')||d.classList.contains('rn-tg');};
 const op=root=>{(root.matches&&root.matches('details')?[root]:[]).concat([...(root.querySelectorAll?root.querySelectorAll('details'):[])]).forEach(d=>{if(!d.dataset.ao){d.dataset.ao=1;if(!KEEP(d))d.open=true;}});};
 const st=()=>{const m=document.querySelector('main');if(!m)return;op(m);new MutationObserver(ms=>ms.forEach(x=>x.addedNodes.forEach(n=>n.nodeType===1&&op(n)))).observe(m,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',st);else st();})();

// RESEARCH SECTIONS (staging 2026-10-24): Research Lab home = tiles; each tile opens one section view (/research/<slug>, pushState, Back + breadcrumb). Display only; renderers unchanged.
(function(){const SEC=[
 {k:'pipeline',n:'Pipeline',d:'IDEA → LAB → BRAIN → BOT → PROVEN',sel:['#rnd .rn-hero','#rn-grad']},
 {k:'research-engine',n:'Research Engine + Reel Check',d:'sweeps, extracted rules, reel verdicts',sel:['#t-research']},
 {k:'idea-lab',n:'Idea Lab',d:'ideas, idea board, verdicts',sel:['#t-lab','#rn-ideas']},
 {k:'test-bench',n:'Test Bench',d:'strict backtests, run requests, tools',sel:['#rn-bench','#rn-tools']},
 {k:'workers',n:'Workers',d:'R&D worker bots and what they are doing',sel:['#rn-workers']},
 {k:'intel',n:'Intel + Influencer Watch',d:'independent intel bots, influencer claims',sel:['#rnIntel','#rn-infl']},
 {k:'rebuild',n:'Rebuild Candidates',d:'strategy-lab winners for a v5 rebuild',sel:['#t-rebuild']}];
 const CH={};const $$=s=>[...document.querySelectorAll(s)];const tm=t=>t?new Date(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Johannesburg'}):'—';
 const els=s=>s.sel.flatMap(q=>$$(q));
 const fix=()=>{const w=document.getElementById('rnW'),g=document.getElementById('rn-grad');if(w&&g&&!document.getElementById('rn-workers')){const p=document.createElement('div');p.id='rn-workers';p.className='panel';g.after(p);p.append(w);}const sq=document.getElementById('rnSq');if(sq)sq.style.display='none';};
 const RCs=s=>{const c=(window.NL_RC||{})[s.k];if(!c||c.n==null)return null;const n=Number(c.n);return n.toLocaleString('en-US')+' '+(n===1?c.u:c.u.replace(/^variant tested$/,'variants tested').replace(/^(?!variants tested$)(.*\w)$/,'$1s'));};
 const pub=s=>{const c=(window.NL_RC||{})[s.k];return c&&c.ts?String(c.ts).replace('T',' ').slice(0,16):null;};
 const stat=s=>{const x=RCs(s);if(x)return x;const E=els(s);const txt=E.map(e=>e.textContent||'').join(' ');if(!E.length||!txt.trim())return 'loading…';
  if(s.k==='idea-lab'){const n=$$('#idealab .lb-i').length;return n+' idea'+(n===1?'':'s');}
  const n=E.reduce((a,e)=>a+e.querySelectorAll('tr:not(:first-child),li,.rn-card,.bs-c,.lb-i').length,0);
  if(n)return n+' item'+(n===1?'':'s');return /building:|not published|no .* yet|sign in/i.test(txt)?'waiting for data':'ready · open to read';};
 const home=()=>{const h=document.getElementById('rhome');if(!h)return;const q=(document.getElementById('rsQ')||{}).value||'';
  const tiles=SEC.filter(s=>!q||(s.n+' '+s.d+' '+els(s).map(e=>e.textContent).join(' ')).toLowerCase().includes(q.toLowerCase())).map(s=>`<a class="rs-tile panel" href="/research/${s.k}" data-rs="${s.k}"><b>${s.n}</b><span class="dim small">${s.d}</span><span class="rs-c">${stat(s)}</span><span class="dim small">${pub(s)?'data published '+pub(s)+' SAST':'changed '+tm(CH[s.k])+' SAST'}</span></a>`).join('')||'<p class="dim small">No section matches.</p>';
  const lp=SEC.map(pub).filter(Boolean).sort().pop();const pe=document.getElementById('rsPub');if(pe)pe.textContent=lp?'data published '+lp+' SAST':'';
  const g=document.getElementById('rsGrid');if(g&&g.dataset.h!==tiles){g.dataset.h=tiles;g.innerHTML=tiles;}};
 const apply=()=>{fix();const rs=window.RS||'home',cur=SEC.find(s=>s.k===rs);const h=document.getElementById('rhome');if(!h)return;
  if(!h.dataset.init){h.dataset.init=1;h.innerHTML=`<div id="rsHead"></div><div id="rsHome"><div class="panel"><div class="ph"><b>RESEARCH LAB</b><span class="dim small">tap a section · paper only · <span id="rsPub"></span></span></div><input id="rsQ" type="search" placeholder="Filter sections…" aria-label="Filter sections" style="width:100%;max-width:360px"></div><div id="rsGrid" class="rs-grid"></div></div>`;
   document.getElementById('rsQ').oninput=home;h.addEventListener('click',e=>{if(e.target.closest('[data-rsback]')){e.preventDefault();if(history.state&&history.state.rs)history.back();else open('home');return;}const t=e.target.closest('[data-rs]');if(!t)return;e.preventDefault();open(t.dataset.rs);});}
  const all=SEC.flatMap(els);all.forEach(e=>e.style.display='none');
  if(cur){els(cur).forEach(e=>e.style.display='');if(cur.k==='pipeline'||cur.k==='workers'){const r=document.getElementById('t-rnd');if(r)r.style.display='';}
   if(['pipeline','idea-lab','test-bench','workers','intel'].includes(cur.k)){const r=document.getElementById('t-rnd');if(r)r.style.display='';}
   const hh=`<div class="panel rs-crumb"><button class="ibtn" data-rsback>← Back</button> <nav aria-label="Breadcrumb" class="small"><a href="/research" data-rs="home">Research Lab</a> › <b>${cur.n}</b></nav></div>`;const H=document.getElementById('rsHead');if(H.dataset.h!==hh){H.dataset.h=hh;H.innerHTML=hh;}document.getElementById('rsHome').style.display='none';}
  else{const r=document.getElementById('t-rnd');if(r)r.style.display='';const H2=document.getElementById('rsHead');H2.innerHTML='';H2.dataset.h='';document.getElementById('rsHome').style.display='';home();}
  };
 function open(k){window.RS=k;history.pushState({rs:k},'',k==='home'?'/research':'/research/'+k);apply();scrollTo(0,0);}
 window.RSapply=apply;addEventListener('nl-rc',()=>{if(window.S&&window.S.tab==='research'&&(window.RS||'home')==='home')home();});
 addEventListener('popstate',()=>{const pp=location.pathname.split('/').filter(Boolean);if(pp[0]==='research'){window.RS=pp[1]||'home';if(window.S&&window.S.tab!=='research')go('research');else apply();}else go(pp[0]||'overview');});
 const ob=new MutationObserver(ms=>{let hit=false;for(const m of ms){const n=m.target.nodeType===1?m.target:m.target.parentElement;if(!n||n.closest('#rhome'))continue;hit=true;for(const s of SEC)if(s.sel.some(q=>n.closest(q)))CH[s.k]=Date.now();}if(hit&&window.S&&window.S.tab==='research')apply();});
 const st=()=>{['t-rnd','t-research','t-lab','t-rebuild'].forEach(i=>{const e=document.getElementById(i);if(e)ob.observe(e,{childList:true,subtree:true,characterData:true});});if(window.S&&window.S.tab==='research')apply();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',st);else st();})();

// CHALLENGE CHECK (staging 2026-10-24): 3-hourly box check row bot_state 'challenge_check' (box_jobs.py, no AI) as one strip on Money. Display only.
(function(){const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const r=()=>{const c=window.NL_HB&&window.NL_HB.challenge_check,o=document.getElementById('t-overview');if(!c||!o)return;let el=document.getElementById('chalChk');
  if(!el){el=document.createElement('div');el.id='chalChk';el.className='panel small';o.prepend(el);}
  const P=Object.entries(c.processes||{}),bad=P.filter(([,v])=>!v).map(([k])=>k);
  const h=`<b>$1k → $100k CHECK</b> · ${e(c.updated_sast)} SAST · equity <b>$${e(c.equity_usd)}</b> (${e(c.progress_pct)}% of goal) · processes ${bad.length?'<b class="dn">down: '+e(bad.join(', '))+'</b>':'<b class="up">'+P.length+'/'+P.length+' alive</b>'} · ${(c.attention||[]).length?'<span class="'+(c.needs_attention?'dn':'dim')+'">'+e(c.attention.join(' · '))+'</span>':'<span class="up">no flags</span>'}`;
  if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h;}};
 addEventListener('nl-hb',r);})();
